import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mercator, size, type Result, type View } from "./terrain";
import { readTile } from "./pdok";
import { defaults as defaultOptions, withOptions } from "./options";

const defaults = { ...defaultOptions, mappingMode: "mean", scaleMode: "trim" } as const;

vi.mock("./pdok", () => ({ readTile: vi.fn() }));
beforeEach(() => {
	vi.resetModules();
	vi.mocked(readTile).mockReset();
});
afterEach(() => vi.unstubAllGlobals());

it("toggles gap estimates on resident tiles without including them in scale statistics or requesting data", async () => {
	const replies: Result[] = [];
	const worker = {
		onmessage: vi.fn<(msg: { data: View }) => void>(),
		postMessage: (reply: Result) => replies.push(reply),
	};
	vi.stubGlobal("self", worker);
	await import("./tiles.worker");
	const n = 2 ** 14,
		[x, y] = mercator(4.65, 52.66).map((v) => Math.floor(v * n));
	const rect: View["rect"] = [(x + 0.25) / n, (y + 0.25) / n, (x + 0.75) / n, (y + 0.75) / n];
	const raw = new Float32Array(size * size).fill(0);
	for (let y = 105; y < 140; y++) {
		raw.fill(100, y * size + 105, y * size + 140);
		if (y > 105 && y < 139) raw.fill(NaN, y * size + 106, y * size + 139);
	}
	vi.mocked(readTile).mockResolvedValue(raw);
	worker.onmessage({ data: { id: 1, zoom: 13, rect, options: defaults } });
	const middle = 120 * size + 120;
	await vi.waitFor(() => expect(replies.at(-1)?.atlas?.heights[middle]).toBe(100));
	const first = replies.at(-1)!;
	expect(first.scale!.center).toBeGreaterThan(0);
	expect(first.scale!.center).toBeLessThan(2); // much of the 100 m plateau is estimated
	worker.onmessage({
		data: {
			id: 2,
			zoom: 13,
			rect,
			preview: true,
			shownKey: first.atlas!.key,
			options: { ...defaults, fillGaps: false },
		},
	});
	const unfilled = replies.at(-1)!;
	expect(unfilled.atlas!.heights[middle]).toBeNaN();
	expect(unfilled.scale).toEqual(first.scale);
	expect(unfilled.statistics).toEqual(first.statistics);
	expect(first.statistics!.count).toBeLessThan(first.statistics!.total);
	expect(first.statistics!.histogram.reduce((a, b) => a + b)).toBe(first.statistics!.count);
	worker.onmessage({
		data: {
			id: 3,
			zoom: 13,
			rect,
			preview: true,
			shownKey: unfilled.atlas!.key,
			options: { ...defaults, fillGaps: false, scaleMode: "percentile" },
		},
	});
	expect(replies.at(-1)!.atlas).toBeUndefined();
	expect(replies.at(-1)!.scale!.high).toBeLessThan(first.scale!.high);
	worker.onmessage({
		data: {
			id: 4,
			zoom: 13,
			rect,
			preview: true,
			shownKey: unfilled.atlas!.key,
			options: withOptions(defaults, { fillGaps: false, mappingMode: "linear" }),
		},
	});
	expect(replies.at(-1)!.scale!.center).toBe(50);
	expect(replies.at(-1)!.atlas).toBeUndefined();
	worker.onmessage({
		data: {
			id: 5,
			zoom: 13,
			rect,
			preview: true,
			shownKey: unfilled.atlas!.key,
			options: withOptions(defaults, { fillGaps: false, mappingMode: "equalized" }),
		},
	});
	const distribution = replies.at(-1)!.scale;
	expect(distribution!.knots).toHaveLength(131);
	expect(distribution!.center).toBe(0);
	expect(replies.at(-1)!.atlas).toBeUndefined();
	worker.onmessage({
		data: {
			id: 6,
			zoom: 13,
			rect,
			preview: true,
			shownKey: unfilled.atlas!.key,
			options: withOptions(defaults, { fillGaps: true, mappingMode: "equalized" }),
		},
	});
	expect(replies.at(-1)!.atlas!.heights[middle]).toBe(100);
	expect(replies.at(-1)!.scale).toEqual(distribution);
	expect(replies.at(-1)!.statistics).toEqual(first.statistics);
	expect(readTile).toHaveBeenCalledTimes(1);
});

it("shares in-flight tiles, resamples a resident atlas and reuses previously visited tiles", async () => {
	const replies: Result[] = [];
	const worker = {
		onmessage: vi.fn<(message: { data: View }) => void>(),
		postMessage: (result: Result) => replies.push(result),
	};
	vi.stubGlobal("self", worker);
	await import("./tiles.worker");

	const n = 2 ** 14;
	const [x, y] = mercator(4.65, 52.66).map((v) => Math.floor(v * n));
	function visit(id: number, dx = 0, shownKey?: string) {
		worker.onmessage({
			data: { id, zoom: 13, shownKey, rect: [(x + dx + 0.1) / n, (y + 0.1) / n, (x + dx + 0.9) / n, (y + 0.9) / n] },
		});
	}
	let finish!: (data: Float32Array) => void;
	const heights = new Float32Array(size * size).fill(-2);
	vi.mocked(readTile)
		.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)))
		.mockResolvedValue(heights);
	visit(1);
	visit(2);
	expect(readTile).toHaveBeenCalledTimes(1);
	finish(heights);
	await vi.waitFor(() => expect(replies.at(-1)).toMatchObject({ id: 2, scale: { center: -2 } }));
	visit(3, 0, replies.at(-1)!.atlas!.key);
	expect(replies.at(-1)?.atlas).toBeUndefined();
	visit(4, 1);
	await vi.waitFor(() => expect(replies.at(-1)).toMatchObject({ id: 4, scale: { center: -2 } }));
	visit(5);
	expect(replies.at(-1)).toMatchObject({ id: 5, scale: { center: -2 } });
	expect(readTile).toHaveBeenCalledTimes(2);
});

it("shows cached parents during a gesture and replaces only the children that have arrived", async () => {
	let latest: Result | undefined;
	const worker = {
		onmessage: vi.fn<(msg: { data: View }) => void>(),
		postMessage: (r: Result) => {
			latest = r;
		},
	};
	vi.stubGlobal("self", worker);
	await import("./tiles.worker");
	const n = 2 ** 13,
		[x, y] = mercator(4.65, 52.66).map((v) => Math.floor(v * n));
	const rect: View["rect"] = [(x + 0.01) / n, (y + 0.01) / n, (x + 0.99) / n, (y + 0.49) / n];
	let resolveLeft!: (h: Float32Array) => void, rejectRight!: (error: Error) => void;
	const field = (value: number) => new Float32Array(size * size).fill(value);
	vi.mocked(readTile)
		.mockResolvedValueOnce(field(10))
		.mockImplementationOnce(
			() =>
				new Promise((resolve) => {
					resolveLeft = resolve;
				})
		)
		.mockImplementationOnce(
			() =>
				new Promise((_, reject) => {
					rejectRight = reject;
				})
		);
	const visit = (id: number, zoom: number, preview = false) =>
		worker.onmessage({ data: { id, zoom, rect, preview, shownKey: latest?.atlas?.key } });
	visit(1, 12);
	await vi.waitFor(() => expect(latest?.scale?.center).toBe(10));
	visit(2, 13, true);
	expect(latest?.scale?.center).toBe(10);
	expect(readTile).toHaveBeenCalledTimes(1);
	visit(3, 13);
	expect(latest?.scale?.center).toBe(10);
	expect(readTile).toHaveBeenCalledTimes(3);
	const child = field(30);
	child[0] = NaN;
	resolveLeft(child);
	await vi.waitFor(() => expect(latest?.scale?.center).toBe(20));
	expect(latest!.atlas!.heights[0]).toBeNaN();
	expect(latest!.atlas!.heights[size]).toBe(10);
	rejectRight(new Error("PDOK timeout"));
	await vi.waitFor(() => expect(latest?.error).toBe("PDOK timeout"));
	expect(latest?.scale?.center).toBe(20);
	visit(4, 12);
	expect(latest?.scale?.center).toBe(20);
	expect(readTile).toHaveBeenCalledTimes(3);
});
