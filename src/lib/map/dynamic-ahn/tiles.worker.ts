import { GapFiller } from "./fill-gaps";
import { defaults } from "./options";
import { readTile } from "./pdok";
import { composeHeights, tilesInGrid, tileKey, trimCache, type HeightTile } from "./tile-cache";
import { gridKey, localRect, plan, size, viewportScale, type Grid, type Result, type Tile, type View } from "./terrain";

const memory = new Map<string, HeightTile>();
const filler = new GapFiller(memory);
let settings = defaults;
const running = new Map<string, AbortController>();
const wanted = new Map<string, Tile>();
const failed = new Set<string>();
let error: string | undefined;
let view: View;
let grid: Grid | null;
type Surface = Float32Array<ArrayBuffer> | null;
let atlas: { grid: string; measured: Surface; display: Surface } | undefined;
let dirty = false;
let revision = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

function publish() {
	clearTimeout(timer);
	timer = undefined;
	if (!grid) {
		atlas = undefined;
		self.postMessage({ id: view.id, atlas: null, scale: null } satisfies Result);
		return;
	}
	const key = gridKey(grid);
	if (dirty || atlas?.grid !== key) {
		const tiles = tilesInGrid(grid, memory.values());
		const measured = composeHeights(grid, tiles);
		let display = measured;
		if (settings.fillGaps && measured) {
			const filled = tiles.map((tile) => {
				const heights = filler.heightsFor(tile, settings.maxGapMeters);
				return heights === tile.heights ? tile : { ...tile, heights };
			});
			if (filled.some((tile, i) => tile !== tiles[i])) display = composeHeights(grid, filled);
		}
		atlas = { grid: key, measured, display };
		revision++;
		dirty = false;
	}
	const heights = atlas.display;
	const width = grid.columns * size,
		height = grid.rows * size;
	const result: Result = {
		id: view.id,
		scale: atlas.measured && viewportScale(atlas.measured, width, height, localRect(view.rect, grid), settings),
		error,
	};
	if (!heights) result.atlas = null;
	else if (view.shownKey !== String(revision)) {
		const n = 2 ** grid.z;
		result.atlas = {
			key: String(revision),
			x: grid.x / n,
			y: grid.y / n,
			spanX: grid.columns / n,
			spanY: grid.rows / n,
			width,
			height,
			heights: heights.slice(),
		};
	}
	self.postMessage(result, { transfer: result.atlas ? [result.atlas.heights.buffer] : [] });
}

function pump() {
	for (const [key, tile] of wanted) {
		if (memory.has(key) || failed.has(key) || running.has(key)) continue;
		if (running.size >= 4) break;
		const job = new AbortController();
		running.set(key, job);
		readTile(tile, AbortSignal.any([job.signal, AbortSignal.timeout(30000)]))
			.then((heights) => {
				if (job.signal.aborted) return;
				memory.set(key, { ...tile, heights });
				trimCache(memory, wanted, view.rect);
				dirty = true;
			})
			.catch((e: unknown) => {
				if (!job.signal.aborted) {
					failed.add(key);
					error = e instanceof Error ? e.message : String(e);
				}
			})
			.finally(() => {
				running.delete(key);
				pump();
				if (job.signal.aborted) return;
				if ([...wanted.keys()].every((k) => memory.has(k) || failed.has(k))) publish();
				else timer ??= setTimeout(publish, 100);
			});
	}
}

self.onmessage = ({ data }: MessageEvent<View>) => {
	const next = data.options ?? defaults;
	if (next.fillGaps !== settings.fillGaps || (next.fillGaps && next.maxGapMeters !== settings.maxGapMeters))
		dirty = true;
	settings = next;
	view = data;
	grid = plan(view.rect, view.zoom + 1);
	if (!view.preview) {
		wanted.clear();
		if (grid) {
			for (let y = grid.y; y < grid.y + grid.rows; y++) {
				for (let x = grid.x; x < grid.x + grid.columns; x++) {
					const key = tileKey(grid.z, x, y);
					wanted.set(key, { z: grid.z, x, y });
					const hit = memory.get(key);
					if (hit) {
						memory.delete(key);
						memory.set(key, hit);
					}
				}
			}
		}
		for (const [key, job] of running) if (!wanted.has(key)) job.abort();
		failed.clear();
		error = undefined;
		const before = memory.size;
		trimCache(memory, wanted, view.rect);
		if (before !== memory.size) dirty = true;
		pump();
	}
	// A moving camera can reuse tiles anywhere in memory without starting I/O.
	publish();
};
