export { heightAtPosition as elevationAt } from "./scale";

// Editor coordinates are relative to the two halves of the elevation scale.
// 0, 50 and 100 are anchored to low, center and high respectively.
export type GradientStop = { id: string; position: number; color: string; alpha?: number };
export type PremultipliedColor = [number, number, number, number];
export const maxStops = 9;
export const defaultStops: readonly GradientStop[] = [
	{ id: "low", position: 0, color: "#00ffff" },
	{ id: "center", position: 50, color: "#ffffff", alpha: 0 },
	{ id: "high", position: 100, color: "#ff00ff" },
];

export function rgb(hex: string): number[] {
	return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
}

/** Normalized, premultiplied sRGB: shared by the shader upload and legend. */
export function premultipliedColor(stop: Pick<GradientStop, "color" | "alpha">): PremultipliedColor {
	const alpha = stop.alpha ?? 1;
	return [...rgb(stop.color).map((channel) => (channel / 255) * alpha), alpha] as PremultipliedColor;
}

export function colorAt(stops: readonly GradientStop[], position: number): PremultipliedColor {
	for (let i = 1; i < stops.length; i++) {
		if (position > stops[i].position && i < stops.length - 1) continue;
		const a = premultipliedColor(stops[i - 1]),
			b = premultipliedColor(stops[i]);
		const t = Math.max(
			0,
			Math.min(1, (position - stops[i - 1].position) / (stops[i].position - stops[i - 1].position))
		);
		return a.map((v, j) => v + (b[j] - v) * t) as PremultipliedColor;
	}
	return premultipliedColor(stops[0]);
}

export function colorCss([r, g, b, alpha]: PremultipliedColor) {
	return `rgb(${[r, g, b].map((v) => (alpha ? (255 * v) / alpha : 0)).join(" ")} / ${alpha})`;
}

/** An editable stop sampled from the ramp; transparent RGB cannot affect its neighbours. */
export function sampleStop(stops: readonly GradientStop[], position: number, id: string): GradientStop {
	const [r, g, b, alpha] = colorAt(stops, position);
	const color =
		"#" +
		[r, g, b]
			.map((v) =>
				Math.round(alpha ? (255 * v) / alpha : 0)
					.toString(16)
					.padStart(2, "0")
			)
			.join("");
	return { id, position, color, alpha };
}

export function reverseGradient(stops: readonly GradientStop[]): GradientStop[] {
	return stops.map((stop) => ({ ...stop, position: 100 - stop.position })).reverse();
}

export function validateStops(stops: readonly GradientStop[]) {
	if (
		stops.length < 2 ||
		stops.length > maxStops ||
		stops[0].position !== 0 ||
		stops.at(-1)!.position !== 100 ||
		!stops.every(
			(stop, i) =>
				/^#[0-9a-f]{6}$/i.test(stop.color) &&
				Number.isFinite(stop.position) &&
				(i === 0 || stop.position > stops[i - 1].position) &&
				Number.isFinite(stop.alpha ?? 1) &&
				(stop.alpha ?? 1) >= 0 &&
				(stop.alpha ?? 1) <= 1
		)
	)
		throw new RangeError(
			`AHN gradients need 2–${maxStops} ordered stops from 0 to 100, #rrggbb colors and alpha from 0 to 1`
		);
}
