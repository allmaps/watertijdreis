import { expect, it } from "vitest";
import { sampleHeight } from "./sample";
import type { Atlas } from "./terrain";

const field = (heights: number[]): Atlas => ({
	key: "test",
	x: 0,
	y: 0,
	spanX: 1,
	spanY: 1,
	width: 2,
	height: 2,
	heights: Float32Array.from(heights),
});
const at = (a: Atlas, u: number, v: number) =>
	sampleHeight(a, u * 360 - 180, (Math.atan(Math.sinh(Math.PI * (1 - 2 * v))) * 180) / Math.PI);

it("matches the shader's bilinear surface at pixel centers, between pixels and at atlas edges", () => {
	const a = field([-2, 0, 2, 4]);
	expect(at(a, 0.25, 0.25)).toBeCloseTo(-2);
	expect(at(a, 0.75, 0.25)).toBeCloseTo(0);
	expect(at(a, 0.5, 0.5)).toBeCloseTo(1);
	expect(at(a, 0, 0.25)).toBeCloseTo(-2);
	expect(at(a, 1, 0.75)).toBeCloseTo(4);
	expect(at(a, -0.01, 0.5)).toBeNull();
	expect(sampleHeight(a, 0, 90)).toBeNull();
	expect(sampleHeight(a, NaN, 0)).toBeNull();
	expect(sampleHeight(null, 0, 0)).toBeNull();
});

it("keeps NoData transparent and renormalizes valid neighbors instead of inventing a zero height", () => {
	const a = field([NaN, 0, 2, 4]);
	expect(at(a, 0.25, 0.25)).toBeNull();
	expect(at(a, 0.5, 0.5)).toBeCloseTo(2);
	expect(at(field([NaN, NaN, NaN, NaN]), 0.5, 0.5)).toBeNull();
});
