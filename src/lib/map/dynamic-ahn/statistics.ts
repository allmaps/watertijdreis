/** Measured viewport samples only; the histogram remains live when the scale is locked. */
export type HeightStatistics = {
	min: number;
	max: number;
	count: number;
	total: number;
	range: [number, number];
	histogram: number[];
	outliers: [number, number];
};

export function heightStatistics(
	values: readonly number[],
	total: number,
	outliers: [number, number]
): HeightStatistics {
	const min = values[0],
		max = values[values.length - 1];
	const range: [number, number] = min === max ? [min - 0.05, max + 0.05] : [min, max];
	const histogram = Array<number>(48).fill(0);
	for (const h of values) histogram[Math.min(47, Math.floor((48 * (h - range[0])) / (range[1] - range[0])))]++;
	return { min, max, count: values.length, total, range, histogram, outliers };
}

export function copyStatistics(stats: HeightStatistics): HeightStatistics {
	return { ...stats, range: [...stats.range], histogram: [...stats.histogram], outliers: [...stats.outliers] };
}
