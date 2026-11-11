import { defaultStops, sampleStop, type GradientStop } from "./gradient";

export type Palette = { id: string; name: string; stops: readonly GradientStop[] };

// Keep compact preset definitions with explicit low/center/high color anchors.
function ramp(colors: string[], transparentCenter = false): GradientStop[] {
	const stops = colors.map((color, i) => ({ id: `color-${i}`, position: (100 * i) / (colors.length - 1), color }));
	if (!stops.some((stop) => stop.position === 50)) stops.push(sampleStop(stops, 50, "center"));
	if (transparentCenter) Object.assign(stops.find((stop) => stop.position === 50)!, { alpha: 0 });
	return stops.sort((a, b) => a.position - b.position);
}
function overlay(low: string, high: string, lowAlpha = 1, highAlpha = 1): GradientStop[] {
	return [
		{ id: "low", position: 0, color: low, alpha: lowAlpha },
		{ id: "center", position: 50, color: "#ffffff", alpha: 0 },
		{ id: "high", position: 100, color: high, alpha: highAlpha },
	];
}

// Terrain, Atlas and Lagoon follow Relief. Viridis/Magma are nine samples of
// the public-domain BIDS colormaps, as distributed by d3-scale-chromatic.
export const palettes: readonly Palette[] = [
	{ id: "cyan-magenta", name: "Cyaan–transparant–magenta", stops: defaultStops },
	{ id: "blue-orange", name: "Blauw–transparant–oranje", stops: overlay("#247da8", "#ed8269") },
	{
		id: "cool-warm-transparent",
		name: "Koel–warm · 4 kleuren · transparant",
		stops: ramp(["#3b4cc0", "#80b1d3", "#f4a582", "#b40426"], true),
	},
	{ id: "low", name: "Alleen laag", stops: overlay("#00ffff", "#ff00ff", 1, 0) },
	{ id: "high", name: "Alleen hoog", stops: overlay("#00ffff", "#ff00ff", 0, 1) },
	{ id: "terrain", name: "Terrein", stops: ramp(["#293980", "#247da8", "#44b99b", "#b4db8b", "#fce58c", "#ed8269"]) },
	{ id: "atlas", name: "Atlas", stops: ramp(["#65ad57", "#f5e58a", "#bb8957", "#ae92c0", "#ffffff"]) },
	{
		id: "lagoon",
		name: "Lagoon",
		stops: ramp(["#52245d", "#845090", "#b88cbd", "#dbc7df", "#f4f1ee", "#c1ddd4", "#7ab8ad", "#378880", "#155650"]),
	},
	{
		id: "viridis",
		name: "Viridis",
		stops: ramp(["#440154", "#472d7b", "#3b528b", "#2c728e", "#21918c", "#28ae80", "#5ec962", "#addc30", "#fde725"]),
	},
	{
		id: "magma",
		name: "Magma",
		stops: ramp(["#000004", "#1d1147", "#51127c", "#832681", "#b73779", "#e75263", "#fc8961", "#fec488", "#fcfdbf"]),
	},
];

export function matchesPalette(stops: readonly GradientStop[], palette: readonly GradientStop[]) {
	return (
		stops.length === palette.length &&
		stops.every(
			(stop, i) =>
				Math.abs(stop.position - palette[i].position) < 1e-9 &&
				stop.color.toLowerCase() === palette[i].color.toLowerCase() &&
				(stop.alpha ?? 1) === (palette[i].alpha ?? 1)
		)
	);
}
