import { size, type Grid, type Rect, type Tile } from "./terrain";

export type HeightTile = Tile & { heights: Float32Array };
export const tileKey = (z: number, x: number, y: number) => [z, x, y].join("/");

function intersects(tile: Tile, rect: Rect) {
	const n = 2 ** tile.z;
	return tile.x < rect[2] * n && tile.x + 1 > rect[0] * n && tile.y < rect[3] * n && tile.y + 1 > rect[1] * n;
}

// Requested tiles stay resident. Under pressure, prefer to discard offscreen
// tiles and detail for which another cached tile still covers its footprint.
export function trimCache(cache: Map<string, HeightTile>, wanted: ReadonlyMap<string, Tile>, view: Rect) {
	for (const [key, tile] of cache) {
		if (cache.size <= 80) return;
		if (wanted.has(key)) continue;
		if (intersects(tile, view)) {
			let covered = false;
			for (let z = tile.z - 1; z >= 5 && !covered; z--) {
				const factor = 2 ** (tile.z - z);
				covered = cache.has(tileKey(z, Math.floor(tile.x / factor), Math.floor(tile.y / factor)));
			}
			if (!covered) continue;
		}
		cache.delete(key);
	}
	for (const key of cache.keys()) {
		if (cache.size <= 96) return;
		if (!wanted.has(key)) cache.delete(key);
	}
}

export function tilesInGrid(grid: Grid, cache: Iterable<HeightTile>) {
	const { z, x, y, columns, rows } = grid;
	const n = 2 ** z;
	const rect: Rect = [x / n, y / n, (x + columns) / n, (y + rows) / n];
	return Array.from(cache)
		.filter((tile) => intersects(tile, rect))
		.sort((a, b) => a.z - b.z);
}

// One non-overlapping height surface. A finer tile owns every sample in its
// footprint, even when that sample is NaN. Input tiles are ordered coarse to fine.
export function composeHeights(grid: Grid, tiles: readonly HeightTile[]) {
	const { z, x, y, columns, rows } = grid;
	if (!tiles.length) return null;
	const width = columns * size,
		height = rows * size;
	const heights = new Float32Array(width * height).fill(NaN);
	for (const tile of tiles) {
		const factor = 2 ** (z - tile.z);
		const left = (tile.x * factor - x) * size,
			top = (tile.y * factor - y) * size;
		if (factor === 1) {
			for (let row = 0; row < size; row++)
				heights.set(tile.heights.subarray(row * size, (row + 1) * size), (top + row) * width + left);
			continue;
		}
		// Sample at destination pixel centers, for both magnification and minification.
		const span = size * factor;
		const x0 = Math.max(0, Math.ceil(left - 0.5)),
			x1 = Math.min(width, Math.ceil(left + span - 0.5));
		const y0 = Math.max(0, Math.ceil(top - 0.5)),
			y1 = Math.min(height, Math.ceil(top + span - 0.5));
		for (let row = y0; row < y1; row++) {
			const sourceRow = Math.floor((row + 0.5 - top) / factor) * size;
			for (let col = x0; col < x1; col++) {
				heights[row * width + col] = tile.heights[sourceRow + Math.floor((col + 0.5 - left) / factor)];
			}
		}
	}
	return heights;
}
