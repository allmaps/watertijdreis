import { expect, it } from "vitest";
import { histogramAxis, histogramBars } from "./ahnHistogram";
import { heightStatistics } from "$lib/map/dynamic-ahn/statistics";

it("aligns metre bins with the gradient and clips bins outside manual endpoints", () => {
	const stats = {
		...heightStatistics([-10, 0, 10, 20], 4, [-5, 15]),
		histogram: [1, 2, 1],
		range: [-10, 20] as [number, number],
	};
	const full = histogramBars(stats, { low: -10, center: 0, high: 20 });
	expect(full.map((b) => b.height)).toEqual([0.5, 1, 0.5]);
	expect(full[1].x).toBeCloseTo(100 / 3);
	expect(full.reduce((sum, b) => sum + b.width, 0)).toBe(100);
	const clipped = histogramBars(stats, { low: 5, center: 10, high: 15 });
	expect(clipped.map((b) => [b.x, b.width])).toEqual([
		[0, 0],
		[0, 50],
		[50, 50],
	]);
	const outside = histogramBars(stats, { low: 30, center: 40, high: 50 });
	expect(outside.every((b) => b.width === 0)).toBe(true);
});

it("uses scale bounds even when measured extremes change, with a measured fallback before a scale arrives", () => {
	const stats = heightStatistics([-10, 0, 20], 3, [-9, 19]);
	expect(histogramAxis({ low: 0, center: 5, high: 10 }, stats)).toEqual({ low: 0, center: 5, high: 10 });
	expect(histogramAxis({ low: -20, center: 5, high: 30 }, stats)).toEqual({ low: -20, center: 5, high: 30 });
	expect(histogramAxis(null, stats)).toEqual({ low: -10, center: 5, high: 20 });
	expect(histogramAxis({ low: 0, center: 2, high: 10 }, heightStatistics([-500, 100, 900], 3, [-400, 800]))).toEqual({
		low: 0,
		center: 5,
		high: 10,
	});
	expect(histogramAxis(null, null)).toBeNull();
});
