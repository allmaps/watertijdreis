import type { HeightStatistics } from "$lib/map/dynamic-ahn/statistics";
import type { HeightScale } from "$lib/map/dynamic-ahn/scale";

export function heightPercent(height: number, scale: Pick<HeightScale, "low" | "high">) {
	return Math.max(0, Math.min(100, (100 * (height - scale.low)) / (scale.high - scale.low)));
}

/** Equal-width metre bins, positioned on exactly the same axis as the gradient. */
export function histogramBars(stats: HeightStatistics, scale: HeightScale) {
	const width = (stats.range[1] - stats.range[0]) / stats.histogram.length;
	const peak = Math.max(1, ...stats.histogram);
	return stats.histogram.map((count, i) => {
		const low = stats.range[0] + i * width,
			high = low + width;
		const x = heightPercent(low, scale),
			end = heightPercent(high, scale);
		return { x, width: Math.max(0, end - x), height: count / peak, count, low, high };
	});
}

/** Follow the displayed color scale, so live histogram extrema cannot shift the handles. */
export function histogramAxis(scale: HeightScale | null, stats: HeightStatistics | null): HeightScale | null {
	if (!scale && !stats) return null;
	const low = scale?.low ?? stats!.range[0];
	const high = scale?.high ?? stats!.range[1];
	return { low, center: (low + high) / 2, high };
}
