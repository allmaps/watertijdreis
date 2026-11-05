import { tailHeights, type HeightScale } from "./terrain";

// Editor coordinates are relative to the two halves of the elevation scale.
// 0, 50 and 100 are anchored to low, arithmetic mean and high respectively.
export type GradientStop = { id: string; position: number; color: string };
export const maxStops = 9;
export const defaultStops: readonly GradientStop[] = [
	{ id: "low", position: 0, color: "#00ffff" },
	{ id: "mean", position: 50, color: "#ffffff" },
	{ id: "high", position: 100, color: "#ff00ff" },
];

export function elevationAt(position: number, scale: HeightScale) {
	const [lower, upper] = tailHeights(scale);
	if (position < 5) return scale.low + (position / 5) * (lower - scale.low);
	if (position < 50) return lower + ((position - 5) / 45) * (scale.mean - lower);
	if (position < 95) return scale.mean + ((position - 50) / 45) * (upper - scale.mean);
	return upper + ((position - 95) / 5) * (scale.high - upper);
}

export function rgb(hex: string): number[] {
	return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}
