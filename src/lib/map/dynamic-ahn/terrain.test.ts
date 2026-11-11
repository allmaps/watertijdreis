import { describe, expect, it } from "vitest";
import {
	analyzeViewport,
	interpolateScale,
	localRect,
	mercator,
	plan,
	viewportScale as measure,
	type Rect,
} from "./terrain";
import { elevationAt } from "./gradient";
import { defaults, withOptions } from "./options";
// Exercise the mean/trim behavior explicitly; the public default is adaptive contrast.
const viewportScale = (...args: Parameters<typeof measure>) =>
	measure(args[0], args[1], args[2], args[3], {
		...defaults,
		mappingMode: "mean",
		scaleMode: "trim",
		...args[4],
	});

describe("AHN viewport", () => {
	it("plans a bounded Dutch tile grid at national and local zoom", () => {
		const national = plan([0, 0, 1, 1], 16)!;
		expect(national.columns * national.rows).toBeLessThanOrEqual(24);
		expect(plan([0, 0, 0.1, 0.1], 9)).toBeNull();
		const view: Rect = [...mercator(5.88, 50.86), ...mercator(5.92, 50.82)];
		const local = plan(view, 14)!;
		expect(local.z).toBe(14);
		expect(localRect(view, local).every((v) => v >= 0 && v <= 1)).toBe(true);
	});
	it("samples only visible ground, including zero and negative heights", () => {
		const heights = new Float32Array([NaN, -2, 0, 125, NaN, -2, 0, 175]);
		expect(viewportScale(heights, 4, 2, [-1, 0, 0.75, 1])).toEqual({ low: -2, center: -1, high: 0 });
		expect(viewportScale(heights, 4, 2, [0, 0, 0.25, 1])).toBeNull();
	});
	it("keeps a neutral mean on flat or heavily skewed ground, even during a transition", () => {
		const heights = new Float32Array(100).fill(-3.75);
		const flat = viewportScale(heights, 10, 10, [0, 0, 1, 1])!;
		expect(flat.high - flat.low).toBeCloseTo(0.1);
		heights[99] = 100;
		const skewed = viewportScale(heights, 10, 10, [0, 0, 1, 1])!;
		expect(skewed.center).toBeCloseTo(-2.7125);
		const middle = interpolateScale(flat, skewed, 0.5);
		expect(elevationAt(50, middle)).toBe((flat.center + skewed.center) / 2);
		expect(elevationAt(0, middle)).toBeLessThan(middle.center);
		expect(elevationAt(100, middle)).toBeGreaterThan(middle.center);
	});
	it("compresses long tails without clipping the extremes or moving white away from the mean", () => {
		const heights = Float32Array.from([-1000, ...Array.from({ length: 98 }, (_, i) => i - 48.5), 1000]);
		const rect: Rect = [0, 0, 1, 1];
		const trimmed = viewportScale(heights, 100, 1, rect)!;
		const clipped = viewportScale(heights, 100, 1, rect, { scaleMode: "percentile", outlierPercentile: 2 })!;
		const extent = viewportScale(heights, 100, 1, rect, { scaleMode: "extent", outlierPercentile: 2 })!;
		expect([trimmed.low, trimmed.center, trimmed.high]).toEqual([-1000, 0, 1000]);
		expect(clipped.low).toBeCloseTo(-47.52);
		expect(clipped.high).toBeCloseTo(47.52);
		expect(elevationAt(5, trimmed)).toBe(clipped.low);
		expect(elevationAt(95, trimmed)).toBe(clipped.high);
		expect(elevationAt(5, extent)).toBe(-900);
		const halfway = interpolateScale(trimmed, extent, 0.5);
		expect(elevationAt(5, halfway)).toBeCloseTo((clipped.low - 900) / 2);
		expect(elevationAt(50, halfway)).toBe(0);
	});
	it("centers on the selected range midpoint instead of the mean, including trimmed and flat terrain", () => {
		const heights = Float32Array.from([-10, ...Array(98).fill(0), 100]);
		const rect: Rect = [0, 0, 1, 1];
		const mean = viewportScale(heights, 100, 1, rect)!;
		expect(mean.center).toBeCloseTo(0.9);
		for (const scaleMode of ["extent", "trim", "percentile"] as const) {
			const midpoint = viewportScale(
				heights,
				100,
				1,
				rect,
				withOptions(defaults, { mappingMode: "linear", scaleMode })
			)!;
			expect(midpoint.center).toBe((midpoint.low + midpoint.high) / 2);
			expect(midpoint.center).toBe(scaleMode === "percentile" ? 0 : 45);
			expect(elevationAt(50, midpoint)).toBe(midpoint.center);
			const stops = [0, 5, 50, 95, 100].map((p) => elevationAt(p, midpoint));
			expect(stops.every((value, i) => i === 0 || value > stops[i - 1])).toBe(true);
		}
		const flat = viewportScale(
			new Float32Array([-3, -3]),
			2,
			1,
			rect,
			withOptions(defaults, { mappingMode: "linear" })
		)!;
		expect(flat.center).toBe(-3);
		expect(flat.high - flat.low).toBeCloseTo(0.1);
	});
});

it("returns a measured histogram independently of clipping, and excludes NoData", () => {
	const heights = Float32Array.from([-1000, ...Array.from({ length: 96 }, (_, i) => i), 1000, NaN, Infinity]);
	const extent = analyzeViewport(heights, 100, 1, [0, 0, 1, 1], { ...defaults, scaleMode: "extent" });
	const clipped = analyzeViewport(heights, 100, 1, [0, 0, 1, 1], {
		...defaults,
		mappingMode: "mean",
		scaleMode: "percentile",
	});
	expect(extent.statistics).toEqual(clipped.statistics);
	expect(extent.statistics).toMatchObject({ min: -1000, max: 1000, count: 98, total: 100, range: [-1000, 1000] });
	expect(extent.statistics!.histogram).toHaveLength(48);
	expect(extent.statistics!.histogram.reduce((a, b) => a + b)).toBe(98);
	expect(extent.statistics!.histogram[0]).toBe(1);
	expect(extent.statistics!.histogram[47]).toBe(1);
	expect(clipped.statistics!.outliers).toEqual([clipped.scale!.low, clipped.scale!.high]);
	expect(analyzeViewport(heights, 100, 1, [0.98, 0, 1, 1])).toEqual({ scale: null, statistics: null });
});

it("handles flat measured histograms and keeps excluded outliers from pulling the clipped mean", () => {
	const heights = Float32Array.from([...Array(99).fill(0), 10000]);
	const result = analyzeViewport(heights, 100, 1, [0, 0, 1, 1], {
		...defaults,
		mappingMode: "mean",
		scaleMode: "percentile",
	});
	expect(result.scale).toEqual({ low: -0.05, center: 0, high: 0.05 });
	expect(result.statistics!.max).toBe(10000);
	const flat = analyzeViewport(new Float32Array(100).fill(-3), 10, 10, [0, 0, 1, 1]);
	expect(flat.statistics!.range).toEqual([-3.05, -2.95]);
	expect(flat.statistics!.histogram.reduce((a, b) => a + b)).toBe(100);
	expect(flat.statistics!.histogram.every(Number.isFinite)).toBe(true);
});
