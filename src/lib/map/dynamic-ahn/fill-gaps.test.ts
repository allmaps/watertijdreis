import { expect, it } from "vitest";
import { GapFiller } from "./fill-gaps";
import { mercator, size } from "./terrain";
import { tileKey, type HeightTile } from "./tile-cache";

function tileAt(z: number, dx = 0): HeightTile {
	const [x, y] = mercator(4.65, 52.66).map((v) => Math.floor(v * 2 ** z));
	return {
		z,
		x: x + dx,
		y,
		heights: Float32Array.from({ length: size * size }, (_, i) => dx * size + (i % size) + Math.floor(i / size) / 2),
	};
}

it("uses measured neighbours on both sides of a seam and rechecks when coverage or the limit changes", () => {
	const left = tileAt(14),
		right = tileAt(14, 1);
	for (let row = 125; row <= 129; row++) {
		left.heights.fill(NaN, row * size + size - 2, (row + 1) * size);
		right.heights.fill(NaN, row * size, row * size + 2);
	}
	const cache = new Map([[tileKey(left.z, left.x, left.y), left]]);
	const filler = new GapFiller(cache);
	const a = 127 * size + size - 1,
		b = 127 * size;
	expect(filler.heightsFor(left, 500)[a]).toBeNaN();
	const key = tileKey(right.z, right.x, right.y);
	cache.set(key, right);
	expect(filler.heightsFor(left, 10)[a]).toBeNaN();
	expect(filler.heightsFor(left, 500)[a]).toBeCloseTo(255 + 127 / 2);
	expect(filler.heightsFor(right, 500)[b]).toBeCloseTo(256 + 127 / 2);
	expect(left.heights[a]).toBeNaN();
	cache.delete(key);
	expect(filler.heightsFor(left, 500)[a]).toBeNaN();
});

it("leaves open water, long narrow gaps and overview cells larger than the limit transparent", () => {
	for (const z of [7, 14]) {
		const tile = tileAt(z);
		for (let i = 0; i < 10; i++) tile.heights[i * size + i] = NaN; // diagonal route to open water
		tile.heights.fill(NaN, 100 * size + 20, 100 * size + 120);
		const pit = 180 * size + 120;
		tile.heights[pit] = NaN;
		const display = new GapFiller(new Map([[tileKey(z, tile.x, tile.y), tile]])).heightsFor(tile, 500);
		expect(display[9 * size + 9]).toBeNaN();
		expect(display[100 * size + 70]).toBeNaN();
		if (z === 7) expect(display[pit]).toBeNaN();
		else expect(display[pit]).toBe(210);
	}
});
