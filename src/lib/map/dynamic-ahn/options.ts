export interface AhnOptions {
	scaleMode: "trim" | "percentile" | "extent";
	outlierPercentile: 0.5 | 1 | 2 | 5 | 10;
	fillGaps: boolean;
	maxGapMeters: number;
}

export const defaults: Readonly<AhnOptions> = {
	scaleMode: "trim",
	outlierPercentile: 2,
	fillGaps: true,
	maxGapMeters: 500,
};

export function withOptions(current: AhnOptions, patch: Partial<AhnOptions>): AhnOptions {
	const {
		scaleMode = current.scaleMode,
		outlierPercentile = current.outlierPercentile,
		fillGaps = current.fillGaps,
		maxGapMeters = current.maxGapMeters,
	} = patch;
	if (!["trim", "percentile", "extent"].includes(scaleMode)) throw new RangeError("Unknown AHN scale mode");
	if (![0.5, 1, 2, 5, 10].includes(outlierPercentile)) throw new RangeError("Invalid AHN outlier percentile");
	if (typeof fillGaps !== "boolean") throw new TypeError("fillGaps must be a boolean");
	if (!Number.isInteger(maxGapMeters) || maxGapMeters < 1 || maxGapMeters > 1000)
		throw new RangeError("maxGapMeters must be an integer from 1 to 1000");
	return { scaleMode, outlierPercentile, fillGaps, maxGapMeters };
}
