import { defaults, type AhnOptions } from "./options";

export type HeightScale = { low: number; mean: number; high: number; tails?: [number, number] };
export type Rect = [number, number, number, number]; // [west, north, east, south] in atlas UV
export const defaultScale: HeightScale = { low: -5, mean: 0, high: 35 };

export const coverage: Rect = [3.20030320333955, 50.728765211722, 7.273444085294, 53.555958411015]; // W,S,E,N
export const size = 256;
export type Grid = { z: number; x: number; y: number; columns: number; rows: number };
export type Atlas = {
	key: string;
	x: number;
	y: number;
	spanX: number;
	spanY: number;
	width: number;
	height: number;
	heights: Float32Array<ArrayBuffer>;
};
export function mercator(lng: number, lat: number): [number, number] {
	return [(lng + 180) / 360, (1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2];
}
const domain: Rect = [...mercator(coverage[0], coverage[3]), ...mercator(coverage[2], coverage[1])];
// Clip to AHN before budgeting memory, including when a wide screen shows countries around it.
export function plan(view: Rect, desired: number): Grid | null {
	const l = Math.max(domain[0], view[0]),
		t = Math.max(domain[1], view[1]),
		r = Math.min(domain[2], view[2]),
		b = Math.min(domain[3], view[3]);
	if (r <= l || b <= t) return null;
	for (let z = Math.max(5, Math.min(18, Math.round(desired))); z >= 5; z--) {
		const n = 2 ** z,
			x = Math.floor(l * n),
			y = Math.floor(t * n),
			columns = Math.ceil(r * n) - x,
			rows = Math.ceil(b * n) - y;
		if (columns * rows <= 24 && Math.max(columns, rows) <= 8) return { z, x, y, columns, rows };
	}
	return null;
}
export function localRect(view: Rect, g: Grid): Rect {
	const n = 2 ** g.z;
	return [
		(view[0] * n - g.x) / g.columns,
		(view[1] * n - g.y) / g.rows,
		(view[2] * n - g.x) / g.columns,
		(view[3] * n - g.y) / g.rows,
	];
}
export function gridKey(g: Grid) {
	return [g.z, g.x, g.y, g.columns, g.rows].join("/");
}
export type Tile = { z: number; x: number; y: number };
export function bbox({ z, x, y }: Tile): Rect {
	const half = Math.PI * 6378137,
		span = (2 * half) / 2 ** z;
	return [x * span - half, half - (y + 1) * span, (x + 1) * span - half, half - y * span];
}

export function viewportScale(
	heights: Float32Array,
	width: number,
	height: number,
	rect: Rect,
	options: Pick<AhnOptions, "scaleMode" | "outlierPercentile"> = defaults
): HeightScale | null {
	const [l, t, r, b] = rect.map((v) => Math.min(1, Math.max(0, v)));
	if (r <= l || b <= t) return null;
	const cols = Math.min(100, Math.ceil((r - l) * width)),
		rows = Math.min(100, Math.ceil((b - t) * height));
	const values: number[] = [];
	for (let j = 0; j < rows; j++) {
		const y = Math.floor(height * (t + ((j + 0.5) / rows) * (b - t)));
		for (let i = 0; i < cols; i++) {
			const x = Math.floor(width * (l + ((i + 0.5) / cols) * (r - l)));
			const h = heights[y * width + x];
			if (Number.isFinite(h)) values.push(h);
		}
	}
	if (!values.length) return null;
	const mean = values.reduce((sum, height) => sum + height, 0) / values.length;
	values.sort((a, b) => a - b);
	const p = (q: number) => {
		const i = (values.length - 1) * q,
			k = Math.floor(i);
		return values[k] + (values[Math.ceil(i)] - values[k]) * (i - k);
	};
	const q = options.outlierPercentile / 100;
	const [lo, hi] = options.scaleMode === "percentile" ? [p(q), p(1 - q)] : [values[0], values[values.length - 1]];
	const scale: HeightScale = { low: Math.min(lo, mean - 0.05), mean, high: Math.max(hi, mean + 0.05) };
	if (options.scaleMode === "trim") {
		const lower = p(q),
			upper = p(1 - q);
		const [linearLow, linearHigh] = tailHeights(scale);
		// Keep the mean at 50%. Compress a tail only when it would otherwise
		// take up more than 5% of the whole palette, as in Relief.
		if (lower < upper) {
			const a = lower < mean ? Math.max(lower, linearLow) : linearLow;
			const b = upper > mean ? Math.min(upper, linearHigh) : linearHigh;
			if (a !== linearLow || b !== linearHigh) scale.tails = [a, b];
		}
	}
	return scale;
}

// Elevations at 5% and 95% of the color ramp.
export function tailHeights(scale: HeightScale): [number, number] {
	return scale.tails ?? [scale.low + 0.1 * (scale.mean - scale.low), scale.high - 0.1 * (scale.high - scale.mean)];
}

export function interpolateScale(a: HeightScale, b: HeightScale, t: number): HeightScale {
	const u = Math.max(0, Math.min(t, 1));
	const k = u * u * (3 - 2 * u);
	const mix = (from: number, to: number) => from + (to - from) * k;
	const scale: HeightScale = { low: mix(a.low, b.low), mean: mix(a.mean, b.mean), high: mix(a.high, b.high) };
	if (a.tails || b.tails) {
		const left = tailHeights(a),
			right = tailHeights(b);
		scale.tails = [mix(left[0], right[0]), mix(left[1], right[1])];
	}
	return scale;
}

export type View = { id: number; rect: Rect; zoom: number; shownKey?: string; preview?: boolean; options?: AhnOptions };
export type Result = { id: number; atlas?: Atlas | null; scale: HeightScale | null; error?: string };
