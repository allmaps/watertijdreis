import { elevationAt, maxStops, rgb, type GradientStop } from "$lib/map/dynamic-ahn/gradient";
import type { HeightScale } from "$lib/map/dynamic-ahn/terrain";

function mixColor(left: GradientStop, right: GradientStop, position: number) {
	const t = (position - left.position) / (right.position - left.position);
	const end = rgb(right.color);
	return (
		"#" +
		rgb(left.color)
			.map((v, i) =>
				Math.round(v + (end[i] - v) * t)
					.toString(16)
					.padStart(2, "0")
			)
			.join("")
	);
}

export function gradientCss(stops: readonly GradientStop[], scale: HeightScale) {
	const points = [...stops];
	if (scale.tails)
		for (const position of [5, 95]) {
			const right = stops.findIndex((s) => s.position >= position);
			if (stops[right].position !== position)
				points.push({ id: "tail", position, color: mixColor(stops[right - 1], stops[right], position) });
		}
	const colors = points
		.sort((a, b) => a.position - b.position)
		.map((stop) => {
			const fraction = (elevationAt(stop.position, scale) - scale.low) / (scale.high - scale.low);
			return stop.color + " " + fraction * 100 + "%";
		});
	return "linear-gradient(90deg in srgb, " + colors.join(", ") + ")";
}

// Split the largest available interval on the chosen side of the mean. Start
// on the existing ramp so merely inserting a stop preserves the map colors.
export function insertStop(stops: readonly GradientStop[], side: "low" | "high", id: string): readonly GradientStop[] {
	if (stops.length >= maxStops) return stops;
	const half = stops.filter((s) => (side === "low" ? s.position <= 50 : s.position >= 50));
	let left = half[0],
		right = half[1];
	for (let i = 2; i < half.length; i++) {
		if (half[i].position - half[i - 1].position > right.position - left.position) {
			left = half[i - 1];
			right = half[i];
		}
	}
	const position = Math.round((left.position + right.position) / 2);
	const color = mixColor(left, right, position);
	return [...stops, { id, position, color }].sort((a, b) => a.position - b.position);
}
