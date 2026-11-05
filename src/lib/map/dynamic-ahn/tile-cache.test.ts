import { expect, it } from "vitest";
import { composeHeights, tilesInGrid, tileKey, trimCache, type HeightTile } from "./tile-cache";
import { size, type Rect } from "./terrain";

it("uses the correct part of a cached parent and lets finer NoData erase it on zoom-out", () => {
	const heights = Float32Array.from({ length: size * size }, (_, i) => 1000 * Math.floor(i / size) + (i % size));
	const parent = { z: 7, x: 65, y: 42, heights };
	const child = { z: 8, x: 131, y: 85, heights: new Float32Array(size * size).fill(NaN) };
	const grid = { ...child, columns: 1, rows: 1 };
	const fallback = composeHeights(grid, [parent])!;
	expect(fallback[0]).toBe(128128);
	expect(fallback.at(-1)).toBe(255255);
	const zoomedOut = composeHeights(
		{ ...parent, columns: 1, rows: 1 },
		tilesInGrid({ ...parent, columns: 1, rows: 1 }, [child, parent])
	)!;
	expect(zoomedOut[128 * size + 128]).toBeNaN();
	expect(zoomedOut[128 * size + 127]).toBe(128127);
});

it("retains visible fallbacks under cache pressure with a hard ceiling", () => {
	const cache = new Map<string, HeightTile>();
	const heights = new Float32Array(0);
	function add(z: number, x: number, y: number) {
		const key = tileKey(z, x, y);
		cache.set(key, { z, x, y, heights });
		return key;
	}
	const overview = add(6, 32, 21);
	const redundant = add(7, 64, 42);
	const wantedKey = add(8, 128, 84);
	const wanted = new Map([[wantedKey, cache.get(wantedKey)!]]);
	for (let i = 0; i < 80; i++) add(12, i, 0);
	const view: Rect = [0.5, 21 / 64, 33 / 64, 22 / 64];
	trimCache(cache, wanted, view);
	expect(cache.size).toBe(80);
	expect(cache.has(overview)).toBe(true);
	expect(cache.has(wantedKey)).toBe(true);
	expect(cache.has(redundant)).toBe(false);
	cache.clear();
	for (let i = 0; i < 100; i++) add(14, 8192 + i, 5400);
	const first = [...cache][0];
	trimCache(cache, new Map([first]), [0, 0, 1, 1]);
	expect(cache.size).toBe(96);
	expect(cache.has(first[0])).toBe(true);
});
