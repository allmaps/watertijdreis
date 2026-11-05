import { describe, expect, it } from "vitest";
import { interpolateScale, localRect, mercator, plan, viewportScale, type Rect } from "./terrain";
import { elevationAt } from "./gradient";

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
		expect(viewportScale(heights, 4, 2, [-1, 0, 0.75, 1])).toEqual({ low: -2, mean: -1, high: 0 });
		expect(viewportScale(heights, 4, 2, [0, 0, 0.25, 1])).toBeNull();
	});
	it("keeps a neutral mean on flat or heavily skewed ground, even during a transition", () => {
		const heights = new Float32Array(100).fill(-3.75);
		const flat = viewportScale(heights, 10, 10, [0, 0, 1, 1])!;
		expect(flat.high - flat.low).toBeCloseTo(0.1);
		heights[99] = 100;
		const skewed = viewportScale(heights, 10, 10, [0, 0, 1, 1])!;
		expect(skewed.mean).toBeCloseTo(-2.7125);
		const middle = interpolateScale(flat, skewed, 0.5);
		expect(elevationAt(50, middle)).toBe((flat.mean + skewed.mean) / 2);
		expect(elevationAt(0, middle)).toBeLessThan(middle.mean);
		expect(elevationAt(100, middle)).toBeGreaterThan(middle.mean);
	});
	it("compresses long tails without clipping the extremes or moving white away from the mean", () => {
		const heights = Float32Array.from([-1000, ...Array.from({ length: 98 }, (_, i) => i - 48.5), 1000]);
		const rect: Rect = [0, 0, 1, 1];
		const trimmed = viewportScale(heights, 100, 1, rect)!;
		const clipped = viewportScale(heights, 100, 1, rect, { scaleMode: "percentile", outlierPercentile: 2 })!;
		const extent = viewportScale(heights, 100, 1, rect, { scaleMode: "extent", outlierPercentile: 2 })!;
		expect([trimmed.low, trimmed.mean, trimmed.high]).toEqual([-1000, 0, 1000]);
		expect(clipped.low).toBeCloseTo(-47.52);
		expect(clipped.high).toBeCloseTo(47.52);
		expect(elevationAt(5, trimmed)).toBe(clipped.low);
		expect(elevationAt(95, trimmed)).toBe(clipped.high);
		expect(elevationAt(5, extent)).toBe(-900);
		const halfway = interpolateScale(trimmed, extent, 0.5);
		expect(elevationAt(5, halfway)).toBeCloseTo((clipped.low - 900) / 2);
		expect(elevationAt(50, halfway)).toBe(0);
	});
});
