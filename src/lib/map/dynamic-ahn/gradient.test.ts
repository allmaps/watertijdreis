import { expect, it } from "vitest";
import { colorAt, defaultStops, premultipliedColor, reverseGradient, sampleStop, validateStops } from "./gradient";
import { matchesPalette, palettes } from "./palettes";

const transparent = palettes[0].stops;

it("fades to transparent without mixing in the transparent stop's white RGB", () => {
	expect(colorAt(transparent, 25)).toEqual([0, 0.5, 0.5, 0.5]);
	expect(colorAt(transparent, 50)).toEqual([0, 0, 0, 0]);
	expect(colorAt(transparent, 75)).toEqual([0.5, 0, 0.5, 0.5]);
	expect(premultipliedColor({ color: "#ff00ff" })).toEqual([1, 0, 1, 1]);
	expect(colorAt(defaultStops, 25)).toEqual([0, 0.5, 0.5, 0.5]);
});

it("weights both color and alpha, and inserting a sampled stop preserves a transparent fade", () => {
	expect(
		colorAt(
			[
				{ id: "a", position: 0, color: "#ff0000", alpha: 0.25 },
				{ id: "b", position: 100, color: "#0000ff", alpha: 0.75 },
			],
			50
		)
	).toEqual([0.125, 0, 0.375, 0.5]);
	const inserted = [...transparent, sampleStop(transparent, 25, "extra")].sort((a, b) => a.position - b.position);
	for (const p of [0, 12.5, 25, 37.5, 50, 75, 100]) expect(colorAt(inserted, p)).toEqual(colorAt(transparent, p));
});

it("provides editable presets and reverses their full color and alpha curves without mutating them", () => {
	for (const palette of palettes) {
		expect(() => validateStops(palette.stops)).not.toThrow();
		expect(palette.stops.some((stop) => stop.position === 50)).toBe(true);
		const before = structuredClone(palette.stops);
		const reversed = reverseGradient(palette.stops);
		for (const p of [0, 13, 37, 50, 75, 100]) {
			colorAt(reversed, p).forEach((v, i) => expect(v).toBeCloseTo(colorAt(palette.stops, 100 - p)[i]));
		}
		expect(matchesPalette(reverseGradient(reversed), palette.stops)).toBe(true);
		expect(palette.stops).toEqual(before);
	}
});

it("rejects invalid alpha and zero-width intervals before uploading a gradient", () => {
	for (const alpha of [-0.1, 1.1, NaN, Infinity])
		expect(() => validateStops(defaultStops.map((stop) => ({ ...stop, alpha })))).toThrow(RangeError);
	expect(() => validateStops(defaultStops.map((stop) => ({ ...stop, position: 50 })))).toThrow(RangeError);
});

it("places cool–warm directly after blue/orange and removes the transparent Terrain/Viridis variants", () => {
	expect(palettes.slice(0, 3).map((p) => p.id)).toEqual(["cyan-magenta", "blue-orange", "cool-warm-transparent"]);
	expect(palettes.some((p) => ["original", "terrain-transparent", "viridis-transparent"].includes(p.id))).toBe(false);
	expect(palettes.some((p) => p.id === "terrain")).toBe(true);
	expect(palettes.some((p) => p.id === "viridis")).toBe(true);
	const stops = palettes[2].stops;
	expect(stops.filter((s) => s.alpha !== 0)).toHaveLength(4);
	expect(colorAt(stops, 50)).toEqual([0, 0, 0, 0]);
});
