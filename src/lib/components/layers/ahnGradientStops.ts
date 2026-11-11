import { colorAt, colorCss, elevationAt, type GradientStop } from "$lib/map/dynamic-ahn/gradient";
import { scaleKnots, type HeightScale } from "$lib/map/dynamic-ahn/scale";

export function gradientCss(stops: readonly GradientStop[], scale?: HeightScale, axis = scale) {
	// Include every bend in the height mapping, even when no color stop is there.
	const points = new Set([
		...stops.map((stop) => stop.position),
		...(scale ? scaleKnots(scale).map(([, p]) => p) : []),
	]);
	const colors = [...points]
		.sort((a, b) => a - b)
		.map((position) => {
			const percent =
				scale && axis ? (100 * (elevationAt(position, scale) - axis.low)) / (axis.high - axis.low) : position;
			return colorCss(colorAt(stops, position)) + " " + percent + "%";
		});
	return "linear-gradient(90deg in srgb, " + colors.join(", ") + ")";
}
