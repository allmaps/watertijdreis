import { expect, it } from "vitest";
import { colorAt, colorCss } from "$lib/map/dynamic-ahn/gradient";
import { palettes } from "$lib/map/dynamic-ahn/palettes";
import { elevationAt } from "$lib/map/dynamic-ahn/gradient";
import { gradientCss } from "./ahnGradientStops";

it("keeps the legend aligned with the shader at both trimmed tails and the center", () => {
	const stops = palettes[0].stops;
	const scale = { low: -20, center: 0, high: 100, tails: [-5, 20] as [number, number] };
	const css = gradientCss(stops, scale);
	for (const p of [0, 5, 50, 95, 100]) {
		const percent = (100 * (elevationAt(p, scale) - scale.low)) / (scale.high - scale.low);
		expect(css).toContain(`${colorCss(colorAt(stops, p))} ${percent}%`);
	}
	expect(css).toContain("rgb(0 255 255 / 0.9)");
	expect(css).toContain("rgb(0 0 0 / 0)");
});

it("uses the full equalized curve in the meter legend", () => {
	const scale = {
		low: 0,
		center: 2,
		high: 100,
		knots: [
			[0, 0],
			[1, 25],
			[2, 50],
			[5, 75],
			[100, 100],
		] as [number, number][],
	};
	const css = gradientCss(palettes[0].stops, scale);
	expect(css).toContain("rgb(0 255 255 / 0.5) 1%");
	expect(css).toContain("rgb(0 0 0 / 0) 2%");
	expect(css).toContain("rgb(255 0 255 / 0.5) 5%");
});

it("places manual endpoints on the complete histogram axis, extending end colors outside them", () => {
	const css = gradientCss(palettes[0].stops, { low: 0, center: 5, high: 10 }, { low: -10, center: 5, high: 20 });
	expect(css).toContain("rgb(0 255 255 / 1) 33.333333333333336%");
	expect(css).toContain("rgb(0 0 0 / 0) 50%");
	expect(css).toContain("rgb(255 0 255 / 1) 66.66666666666667%");
});
