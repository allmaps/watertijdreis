/** Ordered [height in metres NAP, palette position from 0 to 100]. */
export type ScaleKnot = [number, number];
export type HeightScale = {
	low: number;
	center: number;
	high: number;
	tails?: [number, number];
	knots?: ScaleKnot[];
};

// Shared palette positions preserve monotonicity during view/mode transitions.
// Include the old tail anchors so legacy mappings remain exact.
export const scalePositions = [...Array.from({ length: 129 }, (_, i) => (100 * i) / 128), 5, 95].sort((a, b) => a - b);
export const maxScaleKnots = scalePositions.length;

export function copyScale(scale: HeightScale): HeightScale {
	return {
		...scale,
		...(scale.tails && { tails: [...scale.tails] as [number, number] }),
		...(scale.knots && { knots: scale.knots.map(([h, p]): ScaleKnot => [h, p]) }),
	};
}

export function tailHeights(scale: HeightScale): [number, number] {
	return scale.tails ?? [scale.low + 0.1 * (scale.center - scale.low), scale.high - 0.1 * (scale.high - scale.center)];
}

export function scaleKnots(scale: HeightScale): ScaleKnot[] {
	const [a, b] = tailHeights(scale);
	return (
		scale.knots ?? [
			[scale.low, 0],
			[a, 5],
			[scale.center, 50],
			[b, 95],
			[scale.high, 100],
		]
	);
}

export function heightAtPosition(position: number, scale: HeightScale): number {
	const knots = scaleKnots(scale);
	for (let i = 1; i < knots.length; i++) {
		const [a, x] = knots[i - 1],
			[b, y] = knots[i];
		if (position === y) return b;
		if (position <= y) return a + (b - a) * Math.max(0, (position - x) / (y - x));
	}
	return scale.high;
}

/** Invert the distribution curve; equal heights share a color, with the center at 50. */
export function positionAtHeight(height: number, scale: HeightScale): number {
	if (height === scale.center) return 50;
	const knots = scaleKnots(scale);
	if (height < scale.low) return 0;
	for (let i = 0; i < knots.length; i++) {
		const [h, p] = knots[i];
		if (height === h) {
			let end = i;
			while (end + 1 < knots.length && knots[end + 1][0] === h) end++;
			return (p + knots[end][1]) / 2;
		}
		if (height < h) {
			const [a, x] = knots[i - 1];
			return x + ((p - x) * (height - a)) / (h - a);
		}
	}
	return 100;
}

export function validateScale(scale: HeightScale): HeightScale {
	const { low, center, high, tails, knots } = scale;
	const values = tails ? [low, tails[0], center, tails[1], high] : [low, center, high];
	if ((tails && tails.length !== 2) || !values.every((v, i) => Number.isFinite(v) && (i === 0 || v > values[i - 1])))
		throw new RangeError(
			"AHN scale heights must be finite and ordered: low < [lower tail <] center < [upper tail <] high"
		);
	if (
		knots &&
		(tails ||
			knots.length < 2 ||
			knots.length > maxScaleKnots ||
			knots[0][0] !== low ||
			knots[0][1] !== 0 ||
			knots.at(-1)![0] !== high ||
			knots.at(-1)![1] !== 100 ||
			!knots.every(
				(k, i) =>
					k.length === 2 && k.every(Number.isFinite) && (i === 0 || (k[0] >= knots[i - 1][0] && k[1] > knots[i - 1][1]))
			) ||
			Math.abs(heightAtPosition(50, scale) - center) > 1e-7)
	)
		throw new RangeError("Invalid AHN distribution curve");
	return copyScale(scale);
}

export function sameScale(a: HeightScale, b: HeightScale): boolean {
	return (
		a.low === b.low &&
		a.center === b.center &&
		a.high === b.high &&
		a.tails?.[0] === b.tails?.[0] &&
		a.tails?.[1] === b.tails?.[1] &&
		a.knots?.length === b.knots?.length &&
		(!a.knots || a.knots.every(([h, p], i) => h === b.knots![i][0] && p === b.knots![i][1]))
	);
}

export function interpolateScale(a: HeightScale, b: HeightScale, t: number): HeightScale {
	if (t <= 0) return copyScale(a);
	if (t >= 1) return copyScale(b);
	const k = t * t * (3 - 2 * t);
	const mix = (from: number, to: number) => from + (to - from) * k;
	const scale: HeightScale = { low: mix(a.low, b.low), center: mix(a.center, b.center), high: mix(a.high, b.high) };
	if (a.knots || b.knots)
		scale.knots = scalePositions.map((p) => [mix(heightAtPosition(p, a), heightAtPosition(p, b)), p]);
	else if (a.tails || b.tails) {
		const left = tailHeights(a),
			right = tailHeights(b);
		scale.tails = [mix(left[0], right[0]), mix(left[1], right[1])];
	}
	return scale;
}

/** Stretch a frozen mapping to manual endpoints, keeping its relative color distribution. */
export function rescaleRange(scale: HeightScale, low: number, high: number): HeightScale {
	if (!Number.isFinite(low) || !Number.isFinite(high) || low >= high)
		throw new RangeError("AHN range must be finite and ordered: low < high");
	// Repeated extreme quantiles must land on the exact endpoints. Floating-point
	// rounding during a drag can otherwise put a duplicate maximum beyond high.
	const move = (h: number) =>
		h === scale.low
			? low
			: h === scale.high
				? high
				: Math.max(low, Math.min(high, low + ((h - scale.low) * (high - low)) / (scale.high - scale.low)));
	return validateScale({
		low,
		high,
		center: move(scale.center),
		...(scale.tails && { tails: scale.tails.map(move) as [number, number] }),
		...(scale.knots && {
			knots: scale.knots.map(([h, p]): ScaleKnot => [p === 0 ? low : p === 100 ? high : move(h), p]),
		}),
	});
}

/** Move the neutral (50%) height, keeping endpoints and each half of the mapping's shape. */
export function recenterScale(scale: HeightScale, center: number): HeightScale {
	if (!Number.isFinite(center) || center <= scale.low || center >= scale.high)
		throw new RangeError("AHN center must be between low and high");
	const move = (h: number) =>
		h === scale.low
			? scale.low
			: h === scale.high
				? scale.high
				: h === scale.center
					? center
					: h < scale.center
						? Math.max(
								scale.low,
								Math.min(center, scale.low + ((h - scale.low) / (scale.center - scale.low)) * (center - scale.low))
							)
						: Math.max(
								center,
								Math.min(
									scale.high,
									center + ((h - scale.center) / (scale.high - scale.center)) * (scale.high - center)
								)
							);
	// Automatic curves already include 50%; resample external curves that omit it.
	const knots =
		scale.knots &&
		(scale.knots.some(([, p]) => p === 50)
			? scale.knots
			: scalePositions.map((p): ScaleKnot => [heightAtPosition(p, scale), p]));
	return validateScale({
		low: scale.low,
		center,
		high: scale.high,
		...(scale.tails && { tails: scale.tails.map(move) as [number, number] }),
		...(knots && { knots: knots.map(([h, p]): ScaleKnot => [move(h), p]) }),
	});
}
