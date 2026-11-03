<script lang="ts">
	type Distribution = {
		name: string; // not shown for now
		color: string;
		years: Record<number, number>;
	};

	let {
		distributions,
		width = 256,
		height = 72,
		sigma = 1.5, // how far a year's "sand" spreads, in years
		tickEvery = undefined, // force a tick interval; otherwise chosen automatically
		axisColor = "#333366",
	}: {
		distributions: Distribution[];
		width?: number;
		height?: number;
		sigma?: number;
		tickEvery?: number;
		axisColor?: string;
	} = $props();

	const LABEL_H = 18; // space under the axis for the year labels
	const TICK_H = 4;
	const SAMPLE = 0.25; // sampling resolution in years

	let baseline = $derived(height - LABEL_H);
	let maxPileHeight = $derived(baseline - 1);

	// let domain = $derived.by(() => {
	// 	const years = distributions.flatMap((d) => Object.keys(d.years).map(Number));
	// 	if (!years.length) return null;
	// 	const min = Math.min(...years);
	// 	const max = Math.max(...years);
	// 	return { min, max: max === min ? min + 1 : max };
	// });
	let domain = { min: 1860, max: 2000 };

	const x = (year: number) => (domain ? ((year - domain.min) / (domain.max - domain.min)) * width : 0);

	let step = $derived.by(() => {
		if (tickEvery) return tickEvery;
		if (!domain) return 10;
		const span = domain.max - domain.min;
		// pick the smallest "nice" step that keeps ticks at least ~10px apart
		for (const s of [1, 2, 5, 10, 20, 25, 50, 100]) {
			if ((span / s) * 10 <= width) return s;
		}
		return 100;
	});

	let ticks = $derived.by(() => {
		if (!domain) return [];
		const out: number[] = [];
		for (let y = Math.ceil(domain.min / step) * step; y <= domain.max; y += step) out.push(y);
		return out;
	});

	let piles = $derived.by(() => {
		if (!domain) return [];
		const { min, max } = domain;
		const n = Math.ceil((max - min) / SAMPLE);

		const sampled = distributions.map((d) => {
			const entries = Object.entries(d.years).map(([y, c]) => [Number(y), c] as const);
			const values = Array.from({ length: n + 1 }, (_, i) => {
				const t = min + i * SAMPLE;
				let sum = 0;
				for (const [year, count] of entries) {
					const z = (t - year) / sigma;
					if (z > -4 && z < 4) sum += count * Math.exp(-0.5 * z * z);
				}
				return sum;
			});
			return { color: d.color, values };
		});

		// shared peak so series stay comparable to each other
		const peak = Math.max(1e-9, ...sampled.flatMap((s) => s.values));

		return sampled.map(({ color, values }) => {
			let line = "";
			values.forEach((v, i) => {
				const px = x(min + i * SAMPLE);
				const py = baseline - (v / peak) * maxPileHeight;
				line += `${i === 0 ? "M" : "L"}${px.toFixed(2)},${py.toFixed(2)} `;
			});
			return {
				color,
				outline: line,
				area: `${line}L${width},${baseline} L0,${baseline} Z`,
			};
		});
	});
</script>

{#if domain}
	<svg {width} {height} viewBox="0 0 {width} {height}" class="pointer-events-none overflow-visible">
		<!-- PILES -->
		{#each piles as pile}
			<path d={pile.area} fill={pile.color} fill-opacity="0.35" />
			<path d={pile.outline} fill="none" stroke={pile.color} stroke-width="1.5" stroke-linejoin="round" />
		{/each}

		<!-- AXIS -->
		<line x1="0" y1={baseline} x2={width} y2={baseline} stroke={axisColor} stroke-width="2" stroke-linecap="round" />

		{#each ticks as year (year)}
			<line x1={x(year)} y1={baseline} x2={x(year)} y2={baseline + TICK_H} stroke={axisColor} stroke-width="1.5" />
		{/each}

		<!-- START / END LABELS -->
		<g fill={axisColor} font-size="11" font-weight="500" style="font-variant-numeric: tabular-nums">
			<text x="0" y={height - 3} text-anchor="start">{domain.min}</text>
			<text x={width} y={height - 3} text-anchor="end">{domain.max}</text>
		</g>
	</svg>
{/if}
