// Relief's bounded DTM interpolation, adapted to the layer's XYZ tile coordinates.
import type { HeightTile } from "./tile-cache";
import { size as TILE_SIZE } from "./terrain";

// Supports 1 km at the finest AHN tile zoom throughout the Netherlands.
// Bound memory if a future caller supplies substantially finer tiles.
const MAX_GAP_CELLS = 16 * TILE_SIZE - 1;
const SMOOTH_PASSES = 8;

// Use the southern edge for a conservative metres-per-cell estimate.
function gapCellLimit(tile: HeightTile, maxGapMeters: number) {
	const tilesPerWorld = 2 ** tile.z;
	const mercatorY = Math.PI * (1 - (2 * (tile.y + 1)) / tilesPerWorld);
	const cellMeters = (2 * Math.PI * 6378137) / (tilesPerWorld * TILE_SIZE * Math.cosh(mercatorY));
	return Math.min(MAX_GAP_CELLS, Math.floor(maxGapMeters / cellMeters));
}

/** Only fully enclosed 8-connected NoData components are eligible.
 * A ground-distance limit keeps overview pixels from bridging entire lakes.
 * Missing neighbours and components continuing outside the halo stay empty.
 */
function fillTileGaps(tile: HeightTile, neighbours: HeightTile[], maxGap: number): Float32Array {
	// An empty overview tile already exceeds the limit, regardless of its neighbours.
	if (maxGap < TILE_SIZE && !tile.heights.some(Number.isFinite)) return tile.heights;
	// Reuse the target's missing-cell index across halo retries and final copying.
	const missing: number[] = [];
	for (let i = 0; i < tile.heights.length; i++) if (!Number.isFinite(tile.heights[i])) missing.push(i);
	if (!missing.length) return tile.heights;
	const neighboursByPosition = new Map<string, HeightTile>();
	for (const neighbour of neighbours) neighboursByPosition.set(`${neighbour.x}/${neighbour.y}`, neighbour);
	neighboursByPosition.set(`${tile.x}/${tile.y}`, tile);
	const hasData = (x: number, y: number) =>
		neighboursByPosition.has(`${tile.x + Math.floor(x / TILE_SIZE)}/${tile.y + Math.floor(y / TILE_SIZE)}`);
	// Most holes are small even when the allowed maximum is large. Grow the
	// working window only when a component touching this tile needs more context.
	for (let halo = 1; ; halo = Math.min(maxGap + 1, halo * 2)) {
		const filled = attempt(halo);
		if (filled) return filled;
	}

	function attempt(HALO: number): Float32Array | null {
		// Crop the halo to available data instead of allocating a large empty square.
		const available = [...neighboursByPosition.values()].filter(
			(t) =>
				Math.abs(t.x - tile.x) * TILE_SIZE < TILE_SIZE + HALO && Math.abs(t.y - tile.y) * TILE_SIZE < TILE_SIZE + HALO
		);
		const leftEdge = Math.max(-HALO, Math.min(...available.map((t) => (t.x - tile.x) * TILE_SIZE)));
		const topEdge = Math.max(-HALO, Math.min(...available.map((t) => (t.y - tile.y) * TILE_SIZE)));
		const rightEdge = Math.min(TILE_SIZE + HALO, Math.max(...available.map((t) => (t.x - tile.x + 1) * TILE_SIZE)));
		const bottomEdge = Math.min(TILE_SIZE + HALO, Math.max(...available.map((t) => (t.y - tile.y + 1) * TILE_SIZE)));
		const SIZE = rightEdge - leftEdge,
			HEIGHT = bottomEdge - topEdge;
		const OFFSETS = [-1, 1, -SIZE, SIZE];
		const original = new Float32Array(SIZE * HEIGHT).fill(NaN);
		// 0 = available/unvisited, 1 = visited, 2 = unavailable, 3 = eligible.
		// An unloaded tile is unknown, even when loaded tiles surround it.
		const visited = new Uint8Array(original.length).fill(2);
		for (const neighbour of available) {
			const left = (neighbour.x - tile.x) * TILE_SIZE - leftEdge;
			const top = (neighbour.y - tile.y) * TILE_SIZE - topEdge;
			const x0 = Math.max(0, left),
				x1 = Math.min(SIZE, left + TILE_SIZE);
			if (x0 >= x1) continue;
			for (let y = Math.max(0, top); y < Math.min(HEIGHT, top + TILE_SIZE); y++) {
				const start = (y - top) * TILE_SIZE + x0 - left;
				original.set(neighbour.heights.subarray(start, start + x1 - x0), y * SIZE + x0);
				visited.fill(0, y * SIZE + x0, y * SIZE + x1);
			}
		}
		// Classify complete components before interpolation. A narrow river must not
		// qualify merely because a short scan can reach its opposite bank.
		const queue = new Int32Array(original.length);
		let eligibleCount = 0;
		let fillMinX = SIZE,
			fillMinY = HEIGHT,
			fillMaxX = 0,
			fillMaxY = 0;
		let needsLargerHalo = false;
		// Only classify components that touch this tile; neighbouring-only gaps do
		// not contribute to its result and are handled when their own tile is filled.
		for (const cell of missing) {
			const seed = (Math.floor(cell / TILE_SIZE) - topEdge) * SIZE + (cell % TILE_SIZE) - leftEdge;
			if (visited[seed] || Number.isFinite(original[seed])) continue;
			let head = 0,
				tail = 1;
			queue[0] = seed;
			visited[seed] = 1;
			let minX = SIZE,
				minY = HEIGHT,
				maxX = 0,
				maxY = 0;
			let enclosed = true;
			let supported = true;
			while (head < tail) {
				const index = queue[head++];
				const x = index % SIZE,
					y = Math.floor(index / SIZE);
				minX = Math.min(minX, x);
				maxX = Math.max(maxX, x);
				minY = Math.min(minY, y);
				maxY = Math.max(maxY, y);
				for (let dy = -1; dy <= 1; dy++)
					for (let dx = -1; dx <= 1; dx++) {
						const nx = x + dx,
							ny = y + dy;
						if (nx < 0 || nx >= SIZE || ny < 0 || ny >= HEIGHT) {
							enclosed = false;
							// Grow only at an artificial window edge, never into absent data.
							if (!hasData(nx + leftEdge, ny + topEdge)) supported = false;
							continue;
						}
						const next = ny * SIZE + nx;
						if (visited[next] === 2) supported = false;
						if (!visited[next] && !Number.isFinite(original[next])) {
							visited[next] = 1;
							queue[tail++] = next;
						}
					}
			}
			if (!supported || maxX - minX + 1 > maxGap || maxY - minY + 1 > maxGap) continue;
			if (!enclosed) {
				needsLargerHalo ||= HALO < maxGap + 1;
				continue;
			}
			for (let i = 0; i < tail; i++) visited[queue[i]] = 3;
			eligibleCount += tail;
			fillMinX = Math.min(fillMinX, minX - 1);
			fillMinY = Math.min(fillMinY, minY - 1);
			fillMaxX = Math.max(fillMaxX, maxX + 1);
			fillMaxY = Math.max(fillMaxY, maxY + 1);
		}
		if (needsLargerHalo) return null;
		if (!eligibleCount) return tile.heights;
		const sums = new Float32Array(original.length),
			weights = new Float32Array(original.length);
		const scan = (x: number, y: number, dx: number, dy: number) => {
			let previous = NaN,
				gap = 0;
			const step = dy * SIZE + dx;
			// Every eligible run has its finite endpoints within this rectangle.
			// Keep the original line order for identical Float32 accumulation, but
			// skip measured terrain that cannot contribute to any estimate.
			const skip = Math.max(0, dy ? fillMinY - y : 0, dx > 0 ? fillMinX - x : dx < 0 ? x - fillMaxX : 0);
			x += skip * dx;
			y += skip * dy;
			for (; x >= fillMinX && x <= fillMaxX && y >= fillMinY && y <= fillMaxY; x += dx, y += dy) {
				const index = y * SIZE + x,
					value = original[index];
				if (!Number.isFinite(value)) {
					gap++;
					continue;
				}
				if (Number.isFinite(previous) && gap > 0 && gap <= maxGap) {
					const span = gap + 1,
						weight = 1 / (span * span * (dx && dy ? 2 : 1));
					for (let i = 1; i <= gap; i++) {
						const p = index - i * step;
						sums[p] += (value + ((previous - value) * i) / span) * weight;
						weights[p] += weight;
					}
				}
				previous = value;
				gap = 0;
			}
		};
		for (let x = 0; x < SIZE; x++) {
			scan(x, 0, 0, 1);
			scan(x, 0, 1, 1);
			scan(x, 0, -1, 1);
		}
		for (let y = 0; y < HEIGHT; y++) {
			scan(0, y, 1, 0);
			if (y) {
				scan(0, y, 1, 1);
				scan(SIZE - 1, y, -1, 1);
			}
		}
		let values = original,
			next = original.slice();
		// Eight Jacobi passes can carry information at most eight cells. Only
		// initialize the target and that dependency border, even for a huge gap.
		const targetLeft = -leftEdge,
			targetTop = -topEdge,
			targetRight = targetLeft + TILE_SIZE - 1,
			targetBottom = targetTop + TILE_SIZE - 1;
		const estimateLeft = Math.max(fillMinX + 1, targetLeft - SMOOTH_PASSES),
			estimateTop = Math.max(fillMinY + 1, targetTop - SMOOTH_PASSES),
			estimateRight = Math.min(fillMaxX - 1, targetRight + SMOOTH_PASSES),
			estimateBottom = Math.min(fillMaxY - 1, targetBottom + SMOOTH_PASSES);
		const estimated = new Int32Array(
			Math.min(eligibleCount, (estimateRight - estimateLeft + 1) * (estimateBottom - estimateTop + 1))
		);
		const distances = new Uint8Array(estimated.length);
		let count = 0;
		let allFinite = true;
		// Row-major order keeps relaxation reads local, even for broad components.
		for (let y = estimateTop; y <= estimateBottom; y++)
			for (let x = estimateLeft; x <= estimateRight; x++) {
				const i = y * SIZE + x;
				if (visited[i] !== 3) continue;
				// With four measured cardinal neighbors, the first relaxation pass
				// already gives the final value. Diagonal gap connections do not
				// participate in the four-neighbor smoother.
				if (visited[i - 1] === 0 && visited[i + 1] === 0 && visited[i - SIZE] === 0 && visited[i + SIZE] === 0) {
					values[i] = (0 + values[i - 1] + values[i + 1] + values[i - SIZE] + values[i + SIZE]) / 4;
					next[i] = values[i];
					continue;
				}
				values[i] = sums[i] / weights[i];
				next[i] = values[i];
				allFinite &&= Number.isFinite(values[i]);
				distances[count] = Math.max(0, targetLeft - x, x - targetRight, targetTop - y, y - targetBottom);
				estimated[count++] = i;
			}
		for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
			for (let j = 0; j < count; j++) {
				// Shrink the border each pass so every read uses a fully computed
				// previous pass. Cells outside it cannot affect this target's result.
				if (distances[j] >= SMOOTH_PASSES - pass) continue;
				const i = estimated[j];
				// Enclosed components cannot touch the working window's boundary.
				// Every cardinal neighbor is measured or belongs to the same component.
				if (allFinite) {
					next[i] = (0 + values[i - 1] + values[i + 1] + values[i - SIZE] + values[i + SIZE]) / 4;
					continue;
				}
				// Preserve the finite-neighbor behavior even for overflowing inputs.
				let sum = 0,
					count = 0;
				for (const offset of OFFSETS)
					if (Number.isFinite(values[i + offset])) {
						sum += values[i + offset];
						count++;
					}
				if (count) next[i] = sum / count;
			}
			[values, next] = [next, values];
		}
		const result = tile.heights.slice();
		for (const cell of missing)
			result[cell] = values[(Math.floor(cell / TILE_SIZE) - topEdge) * SIZE + (cell % TILE_SIZE) - leftEdge];
		return result;
	}
}

// Estimates have the same lifetime as their source tile. A different set of
// same-resolution neighbours may enclose a previously open gap.
export class GapFiller {
	private measuredOnly = new WeakSet<HeightTile>();
	private fills = new WeakMap<
		HeightTile,
		{ limit: number; neighbours: WeakSet<HeightTile>; count: number; heights: Float32Array }
	>();

	constructor(private tiles: ReadonlyMap<string, HeightTile>) {}

	heightsFor(tile: HeightTile, limit: number): Float32Array {
		const maxGap = gapCellLimit(tile, limit);
		if (this.measuredOnly.has(tile) || maxGap < 1) return tile.heights;
		const saved = this.fills.get(tile);
		if (!saved && !tile.heights.includes(NaN)) {
			this.measuredOnly.add(tile);
			return tile.heights;
		}
		const radius = Math.ceil((maxGap + 1) / TILE_SIZE);
		const neighbours = Array.from(this.tiles.values()).filter(
			(t) => t.z === tile.z && Math.abs(t.x - tile.x) <= radius && Math.abs(t.y - tile.y) <= radius
		);
		if (
			saved &&
			saved.limit === limit &&
			saved.count === neighbours.length &&
			neighbours.every((t) => saved.neighbours.has(t))
		)
			return saved.heights;
		const heights = fillTileGaps(tile, neighbours, maxGap);
		this.fills.set(tile, { limit, neighbours: new WeakSet(neighbours), count: neighbours.length, heights });
		return heights;
	}
}
