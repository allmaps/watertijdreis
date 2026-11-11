import { expect, it } from "vitest";
import { viewportScale } from "./terrain";
import { defaults, withOptions, type MappingMode } from "./options";
import {
	copyScale,
	recenterScale,
	heightAtPosition,
	interpolateScale,
	positionAtHeight,
	rescaleRange,
	sameScale,
	validateScale,
} from "./scale";

const values = Float32Array.from({ length: 100 }, (_, i) => i * i);
const measure = (data: Float32Array, mode: MappingMode) =>
	viewportScale(data, 10, 10, [0, 0, 1, 1], { ...defaults, mappingMode: mode })!;

it("distinguishes numerical midpoint, arithmetic mean and distribution median", () => {
	const linear = measure(values, "linear"),
		mean = measure(values, "mean"),
		equalized = measure(values, "equalized");
	expect(linear.center).toBe(9801 / 2);
	expect(linear.tails).toBeUndefined();
	expect(positionAtHeight(2450.25, linear)).toBeCloseTo(25);
	expect(mean.center).toBe(values.reduce((a, b) => a + b) / values.length);
	expect(equalized.center).toBe((49 * 49 + 50 * 50) / 2);
	// Type-7 sample quantiles: P25 falls a quarter of the way from sample 24 to 25.
	const q25 = 24 * 24 + 0.75 * (25 * 25 - 24 * 24);
	expect(heightAtPosition(25, equalized)).toBe(q25);
	expect(positionAtHeight(q25, equalized)).toBeCloseTo(25);
	expect(positionAtHeight(q25, linear)).toBeLessThan(7);
	expect(() => validateScale(equalized)).not.toThrow();
});

it("keeps flat and repeated heights finite and deterministic, without treating missing samples as zero", () => {
	for (const data of [
		new Float32Array(100).fill(-3),
		Float32Array.from({ length: 100 }, (_, i) => (i < 80 ? 0 : i < 90 ? -5 : 20)),
	]) {
		const scale = measure(data, "equalized");
		expect(positionAtHeight(scale.center, scale)).toBe(50);
		expect(() => validateScale(scale)).not.toThrow();
		let previous = -Infinity;
		for (let i = 0; i <= 200; i++) {
			const p = positionAtHeight(scale.low + ((scale.high - scale.low) * i) / 200, scale);
			expect(Number.isFinite(p)).toBe(true);
			expect(p).toBeGreaterThanOrEqual(previous);
			previous = p;
		}
	}
	expect(
		measure(
			Float32Array.from({ length: 100 }, (_, i) => (i < 50 ? NaN : 8)),
			"equalized"
		).center
	).toBe(8);
	expect(measure(new Float32Array(100).fill(NaN), "equalized")).toBeNull();
});

it("preserves monotone mappings and the median while animating across modes and distributions", () => {
	const a = measure(values, "linear"),
		b = measure(values, "equalized");
	for (const t of [0, 0.1, 0.5, 0.9, 1]) {
		const scale = interpolateScale(a, b, t);
		expect(() => validateScale(scale)).not.toThrow();
		expect(positionAtHeight(scale.center, scale)).toBe(50);
		for (const p of [0, 25, 50, 75, 100]) {
			const k = t * t * (3 - 2 * t);
			expect(heightAtPosition(p, scale)).toBeCloseTo(heightAtPosition(p, a) * (1 - k) + heightAtPosition(p, b) * k);
		}
	}
	expect(interpolateScale(b, a, 1)).toEqual(a);
});

it("stretches every percentile to manual endpoints and deep-copies curve snapshots", () => {
	const original = measure(values, "equalized"),
		scale = rescaleRange(original, -10, 90);
	for (const p of [0, 10, 50, 90, 100])
		expect(heightAtPosition(p, scale)).toBeCloseTo(-10 + (100 * heightAtPosition(p, original)) / original.high);
	const copy = copyScale(scale);
	copy.knots![10][0] += 0.1;
	expect(sameScale(copy, scale)).toBe(false);
	expect(() => rescaleRange(original, 10, 10)).toThrow(RangeError);
	expect(() => validateScale({ ...scale, knots: [...scale.knots!].reverse() })).toThrow(RangeError);
});

it("defaults to adaptive contrast and validates explicit mapping modes", () => {
	expect(defaults.mappingMode).toBe("equalized");
	expect(withOptions(defaults, { mappingMode: "linear" }).mappingMode).toBe("linear");
	expect(() => withOptions(defaults, { mappingMode: "invalid" as MappingMode })).toThrow(RangeError);
});

it("keeps repeated extreme quantiles ordered while dragging decimal endpoints", () => {
	for (const offset of [0.1, 5.343, 6.32]) {
		const source = measure(
			Float32Array.from({ length: 100 }, (_, i) => (i < 3 ? -10 : i > 96 ? 60 : i / 10) + offset),
			"equalized"
		);
		for (let step = 1; step < 40; step++) {
			const low = source.low + ((source.high - source.low) * step) / 100;
			expect(() => rescaleRange(source, low, source.high)).not.toThrow();
		}
	}
});

it("moves the center while preserving the bounds and relative shape of both halves", () => {
	const original = measure(values, "equalized");
	const shifted = recenterScale(original, 100);
	expect([shifted.low, shifted.center, shifted.high]).toEqual([original.low, 100, original.high]);
	for (const p of [10, 25, 50, 75, 90]) {
		const h = heightAtPosition(p, original);
		const expected =
			h <= original.center
				? (h / original.center) * 100
				: 100 + ((h - original.center) / (original.high - original.center)) * (original.high - 100);
		expect(heightAtPosition(p, shifted)).toBeCloseTo(expected);
	}
	expect(positionAtHeight(100, shifted)).toBe(50);
	expect(original.center).not.toBe(100);
	expect(recenterScale({ low: -10, center: 0, high: 50, tails: [-5, 20] }, 10)).toEqual({
		low: -10,
		center: 10,
		high: 50,
		tails: [0, 26],
	});
	for (const center of [original.low, original.high, NaN, Infinity])
		expect(() => recenterScale(original, center)).toThrow(RangeError);
});

it("handles tied heights and external curves without a center knot", () => {
	const source = measure(
		Float32Array.from({ length: 100 }, (_, i) => (i < 3 ? -10 : i > 96 ? 60 : i < 80 ? 0 : 10)),
		"equalized"
	);
	for (const center of [-9.99, 4.33, 59.99]) {
		const result = recenterScale(source, center);
		expect(() => validateScale(result)).not.toThrow();
		expect(heightAtPosition(50, result)).toBe(center);
	}
	const external = recenterScale(
		{
			low: 0,
			center: 5,
			high: 10,
			knots: [
				[0, 0],
				[10, 100],
			],
		},
		3
	);
	expect(heightAtPosition(50, external)).toBe(3);
});
