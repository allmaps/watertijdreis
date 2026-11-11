import { afterEach, expect, it, vi } from "vitest";
import type { CustomRenderMethodInput, Map as LibreMap } from "maplibre-gl";
import { DynamicAhnLayer, type BlendMode, type DynamicAhnLayerOptions, type HeightScale } from "./DynamicAhnLayer";
import { defaultScale, viewportScale, type Result, type View } from "./terrain";
import { defaults } from "./options";
import { heightAtPosition } from "./scale";
import { heightStatistics } from "./statistics";

const { draw } = vi.hoisted(() => ({ draw: vi.fn() }));
vi.mock("./renderer", () => ({
	ReliefRenderer: class {
		draw = draw;
		destroy() {}
	},
}));
afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllMocks();
	vi.restoreAllMocks();
});

function mount(options: DynamicAhnLayerOptions = {}) {
	class GL {}
	class TileWorker {
		postMessage = vi.fn<(view: View) => void>();
		terminate = vi.fn();
		onmessage?: (event: { data: Result }) => void;
	}
	const worker = new TileWorker();
	vi.stubGlobal("WebGL2RenderingContext", GL);
	vi.stubGlobal(
		"Worker",
		class {
			constructor() {
				return worker;
			}
		}
	);
	vi.stubGlobal("matchMedia", () => ({ matches: true }));
	const gl = new GL() as WebGL2RenderingContext;
	const map = {
		on: vi.fn().mockReturnThis(),
		off: vi.fn().mockReturnThis(),
		getZoom: () => 13,
		getBounds: () => ({ getWest: () => 4.6, getEast: () => 4.7, getNorth: () => 52.7, getSouth: () => 52.6 }),
		triggerRepaint: vi.fn(),
	};
	const layer = new DynamicAhnLayer(options);
	const add = () => layer.onAdd(map as unknown as LibreMap, gl);
	const reply = (patch: Partial<Result> = {}) =>
		worker.onmessage?.({
			data: {
				id: worker.postMessage.mock.lastCall![0].id,
				scale: defaultScale,
				statistics: null,
				atlas: { key: "1", x: 0, y: 0, spanX: 1, spanY: 1, width: 1, height: 1, heights: new Float32Array([0]) },
				...patch,
			},
		});
	const render = () => layer.render(gl, {} as CustomRenderMethodInput);
	add();
	return { layer, worker, map, reply, render, add };
}

it("changes blending immediately without invalidating a pending terrain response", () => {
	const { layer, worker, map, reply, render } = mount();
	layer.setOptions({ blendMode: "screen" });
	expect(worker.postMessage).toHaveBeenCalledTimes(1);
	expect(map.triggerRepaint).toHaveBeenCalledTimes(1);
	reply();
	render();
	expect(draw.mock.lastCall?.at(-1)).toBe("screen");
	expect(draw.mock.lastCall?.[2]).toEqual(defaultScale);
	layer.onRemove();
});

it("merges terrain and blend options, rejects invalid modes and retains the choice when re-added", () => {
	const { layer, worker, reply, render, add } = mount({ blendMode: "normal" });
	layer.setOptions({ fillGaps: false, blendMode: "plus-lighter" });
	expect(worker.postMessage).toHaveBeenCalledTimes(2);
	expect(worker.postMessage.mock.lastCall![0]).toMatchObject({ preview: true, options: { fillGaps: false } });
	expect(() => layer.setOptions({ blendMode: "overlay" as BlendMode })).toThrow("Unknown AHN blend mode");
	expect(worker.postMessage).toHaveBeenCalledTimes(2);
	reply();
	render();
	expect(draw.mock.lastCall?.at(-1)).toBe("plus-lighter");
	layer.onRemove();
	layer.setOptions({ blendMode: "multiply" });
	add();
	reply();
	render();
	expect(draw.mock.lastCall?.at(-1)).toBe("multiply");
	expect(worker.postMessage.mock.lastCall![0].options?.fillGaps).toBe(false);
	layer.onRemove();
});

it("applies fixed metre anchors immediately, keeps updating tiles and restores the latest automatic scale on unlock", () => {
	const onScale = vi.fn();
	const { layer, worker, map, reply, render } = mount({ onScale });
	const manual: HeightScale = { low: -10, center: 0, high: 50, tails: [-5, 20] };
	layer.setScale(manual); // A pending response must not replace these heights.
	expect(layer.isScaleLocked()).toBe(true);
	expect(onScale).toHaveBeenLastCalledWith(manual);
	expect(worker.postMessage).toHaveBeenCalledTimes(1);
	reply();
	render();
	expect(draw.mock.lastCall?.[2]).toEqual(manual);
	const moveEnd = map.on.mock.calls.find(([event]) => event === "moveend")![1];
	moveEnd();
	const next: HeightScale = { low: 50, center: 60, high: 80 };
	reply({
		scale: next,
		atlas: { key: "2", x: 1, y: 0, spanX: 1, spanY: 1, width: 1, height: 1, heights: new Float32Array([60]) },
	});
	render();
	expect(draw.mock.lastCall?.[1].key).toBe("2");
	expect(draw.mock.lastCall?.[2]).toEqual(manual);
	layer.unlockScale();
	expect(layer.isScaleLocked()).toBe(false);
	expect(layer.getScale()).toEqual(next);
	expect(onScale).toHaveBeenLastCalledWith(next);
	expect(worker.postMessage).toHaveBeenCalledTimes(2); // Only the initial view and camera move.
	layer.onRemove();
});

it("locks the displayed interpolation without a jump and resumes smoothly, even if the target has not changed", () => {
	let now = 0;
	vi.spyOn(performance, "now").mockImplementation(() => now);
	const { layer, reply, render } = mount();
	vi.stubGlobal("matchMedia", () => ({ matches: false }));
	reply({ scale: { low: -10, center: 0, high: 10, tails: [-5, 5] } });
	const target: HeightScale = { low: 10, center: 20, high: 30, tails: [15, 25] };
	reply({ scale: target, atlas: undefined });
	now = 325;
	render();
	const displayed = layer.getScale();
	expect(displayed).toEqual({ low: 0, center: 10, high: 20, tails: [5, 15] });
	layer.lockScale();
	now = 1000;
	reply({ scale: target, atlas: undefined });
	render();
	expect(layer.getScale()).toEqual(displayed);
	layer.unlockScale();
	render();
	expect(layer.getScale()).toEqual(displayed);
	now = 1650;
	render();
	expect(layer.getScale()).toEqual(target);
	layer.onRemove();
});

it("can lock before loading, survives NoData and re-adding, and updates mapping settings while locked", () => {
	const { layer, worker, reply, add } = mount();
	const pendingId = worker.postMessage.mock.lastCall![0].id;
	layer.lockScale();
	expect(layer.getScale()).toBeNull();
	reply({ scale: null, atlas: null });
	expect(layer.getScale()).toBeNull();
	reply();
	expect(layer.getScale()).toEqual(defaultScale);
	layer.setOptions({ mappingMode: "linear" });
	expect(worker.postMessage.mock.lastCall![0]).toMatchObject({ preview: true, options: { mappingMode: "linear" } });
	const midpoint = { low: -5, center: 15, high: 35 };
	reply({ scale: midpoint });
	expect(layer.getScale()).toEqual(defaultScale);
	reply({ id: pendingId, scale: { low: 0, center: 1, high: 2 } }); // Stale responses must stay ignored.
	layer.unlockScale();
	expect(layer.getScale()).toEqual(midpoint);
	layer.lockScale();
	reply({ scale: null, atlas: null });
	expect(layer.getScale()).toEqual(midpoint);
	layer.onRemove();
	add();
	reply();
	expect(layer.isScaleLocked()).toBe(true);
	expect(layer.getScale()).toEqual(midpoint);
	layer.unlockScale();
	expect(layer.getScale()).toEqual(defaultScale);
	layer.onRemove();
});

it("validates manual scales before changing state and isolates caller-owned inputs, snapshots and callback values", () => {
	const layer = new DynamicAhnLayer({
		onScale: (scale) => {
			if (scale) scale.center = 999;
		},
	});
	const manual: HeightScale = { low: -10, center: 0, high: 50, tails: [-5, 20] };
	layer.setScale(manual); // Also works before onAdd.
	manual.low = -100;
	manual.tails![0] = -99;
	const snapshot = layer.getScale()!;
	snapshot.center = 100;
	snapshot.tails![1] = 200;
	expect(layer.getScale()).toEqual({ low: -10, center: 0, high: 50, tails: [-5, 20] });
	for (const invalid of [
		{ low: 0, center: 0, high: 1 },
		{ low: 2, center: 1, high: 0 },
		{ low: -1, center: NaN, high: 1 },
		{ low: -Infinity, center: 0, high: 1 },
		{ low: -1, center: 0, high: 1, tails: [-1, 0.5] },
		{ low: -1, center: 0, high: 1, tails: [0.5, -0.5] },
	] as HeightScale[])
		expect(() => layer.setScale(invalid)).toThrow(RangeError);
	expect(layer.getScale()).toEqual({ low: -10, center: 0, high: 50, tails: [-5, 20] });
	expect(layer.isScaleLocked()).toBe(true);
	layer.unlockScale();
	expect(layer.getScale()).toBeNull();
	expect(layer.isScaleLocked()).toBe(false);
	expect(() => layer.setOptions({ mappingMode: "invalid" as "mean" })).toThrow("Unknown AHN mapping mode");
});

it("freezes the full distribution and detects changes even when the low/center/high are unchanged", () => {
	const { layer, worker, reply } = mount({ mappingMode: "equalized" });
	const first: HeightScale = {
		low: 0,
		center: 10,
		high: 100,
		knots: [
			[0, 0],
			[2, 25],
			[10, 50],
			[40, 75],
			[100, 100],
		],
	};
	const second: HeightScale = {
		...first,
		knots: [
			[0, 0],
			[5, 25],
			[10, 50],
			[80, 75],
			[100, 100],
		],
	};
	reply({ scale: first });
	const snapshot = layer.getScale()!;
	snapshot.knots![1][0] = 999;
	expect(layer.getScale()).toEqual(first);
	layer.lockScale();
	reply({ scale: second, atlas: undefined });
	expect(layer.getScale()).toEqual(first);
	layer.unlockScale();
	expect(layer.getScale()).toEqual(second);
	layer.setRange(-10, 190);
	expect(layer.isScaleLocked()).toBe(true);
	expect(heightAtPosition(75, layer.getScale()!)).toBe(150);
	layer.setOptions({ mappingMode: "linear" });
	expect(worker.postMessage.mock.lastCall![0]).toMatchObject({ preview: true, options: { mappingMode: "linear" } });
	expect(heightAtPosition(75, layer.getScale()!)).toBe(150);
	layer.onRemove();
});

it("locks midway through an equalized transition and resumes without losing the curve", () => {
	let now = 0;
	vi.spyOn(performance, "now").mockImplementation(() => now);
	const { layer, reply, render } = mount({ mappingMode: "equalized" });
	vi.stubGlobal("matchMedia", () => ({ matches: false }));
	const make = (power: number) =>
		viewportScale(
			Float32Array.from({ length: 100 }, (_, i) => i ** power),
			10,
			10,
			[0, 0, 1, 1],
			{ ...defaults, mappingMode: "equalized" }
		)!;
	reply({ scale: make(1) });
	const target = make(2);
	reply({ scale: target, atlas: undefined });
	now = 325;
	render();
	const midway = layer.getScale();
	layer.lockScale();
	now = 1000;
	render();
	expect(layer.getScale()).toEqual(midway);
	layer.unlockScale();
	render();
	expect(layer.getScale()).toEqual(midway);
	now = 1650;
	render();
	expect(layer.getScale()).toEqual(target);
	layer.onRemove();
});

it("publishes detached live statistics while the scale is locked, ignoring stale results and clearing on NoData", () => {
	const onStatistics = vi.fn();
	const { layer, worker, reply, map } = mount({ onStatistics });
	expect(layer.getStatistics()).toBeNull();
	const first = heightStatistics([-10, 0, 10], 4, [-8, 8]);
	reply({ statistics: first });
	layer.lockScale();
	const locked = layer.getScale();
	const snapshot = layer.getStatistics()!;
	snapshot.histogram[0] = 999;
	snapshot.range[0] = -999;
	onStatistics.mock.lastCall![0].outliers[0] = 999;
	expect(layer.getStatistics()).toEqual(first);
	const previousId = worker.postMessage.mock.lastCall![0].id;
	map.on.mock.calls.find(([event]) => event === "moveend")![1]();
	const next = heightStatistics([20, 30, 40], 3, [22, 38]);
	reply({ scale: { low: 20, center: 30, high: 40 }, statistics: next });
	expect(layer.getStatistics()).toEqual(next);
	expect(layer.getScale()).toEqual(locked);
	reply({ id: previousId, statistics: first });
	expect(layer.getStatistics()).toEqual(next);
	reply({ scale: null, statistics: null, atlas: null });
	expect(layer.getStatistics()).toBeNull();
	expect(layer.getScale()).toEqual(locked);
	reply({ statistics: first });
	layer.onRemove();
	expect(layer.getStatistics()).toBeNull();
	expect(onStatistics).toHaveBeenLastCalledWith(null);
});

it("reads cursor heights from the current atlas without requests and clears the sample on removal", () => {
	const { layer, worker, reply } = mount();
	expect(layer.getHeight(0, 0)).toBeNull();
	reply();
	expect(layer.getHeight(0, 0)).toBe(0);
	layer.lockScale();
	reply({
		atlas: { key: "next", x: 0, y: 0, spanX: 1, spanY: 1, width: 1, height: 1, heights: new Float32Array([-2.75]) },
	});
	expect(layer.getHeight(0, 0)).toBe(-2.75);
	expect(worker.postMessage).toHaveBeenCalledTimes(1);
	reply({ atlas: null });
	expect(layer.getHeight(0, 0)).toBeNull();
	layer.onRemove();
	expect(layer.getHeight(0, 0)).toBeNull();
});
