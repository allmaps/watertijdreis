<script lang="ts">
	import type { HistoricMapSeries } from "$lib/map/HistoricMapSeries.svelte";
	import type { Filter } from "$lib/types/historicmap";

	let { series }: { series: HistoricMapSeries } = $props();

	/** Totale tijdspanne, voor de schaal van de tijdlijn */
	const span = $derived.by(() => {
		const years = series.editions.flatMap((e) => [e.yearStart, e.yearEnd]).filter((y): y is number => y !== undefined);
		return years.length ? { min: Math.min(...years), max: Math.max(...years) } : null;
	});

	const totalCount = $derived(series.editions.reduce((sum, e) => sum + e.count, 0));

	const options = $derived([
		{ value: "All" as Filter["edition"], label: "Alle" },
		...series.editions.map((e) => ({ value: e.edition as Filter["edition"], label: String(e.edition) })),
	]);

	/** De gekozen optie: titel, bereik en aantal bladen */
	const active = $derived.by(() => {
		const value = series.filter.edition;
		if (value === "All") return { title: "Alle edities", start: span?.min, end: span?.max, count: totalCount };

		const e = series.editions.find((e) => e.edition === value);
		return { title: `Editie ${value}`, start: e?.yearStart, end: e?.yearEnd, count: e?.count ?? 0 };
	});

	const years = $derived.by(() => {
		const { start, end } = active;
		if (start === undefined || end === undefined) return "";
		return start === end ? `${start}` : `${start} – ${end}`;
	});

	/** Positie van het gekozen bereik op de tijdlijn, in procenten */
	const bar = $derived.by(() => {
		if (!span || active.start === undefined || active.end === undefined) return null;
		const total = span.max - span.min || 1;
		return {
			left: ((active.start - span.min) / total) * 100,
			width: Math.max(((active.end - active.start) / total) * 100, 2),
		};
	});

	const bisCount = $derived(Array.from(series.mapsById.values()).filter((m) => m.bis).length);
</script>

<section class="flex flex-col gap-1.5">
	<div class="flex items-baseline justify-between gap-2">
		<span class="font-semibold text-white/90">{active.title}</span>
		<span class="truncate font-mono text-[11px] text-white/70 tabular-nums">
			{years}{years ? " · " : ""}{active.count} bladen
		</span>
	</div>

	<!-- Radio's: pijltjestoetsen en schermlezers werken zo vanzelf -->
	<div role="radiogroup" aria-label="Editie" class="flex gap-0.5 rounded-lg border border-white/20 bg-white/10 p-0.5">
		{#each options as option (option.value)}
			{@const checked = series.filter.edition === option.value}
			<label
				class="flex h-7 flex-1 cursor-pointer items-center justify-center rounded-md text-xs font-semibold transition-colors has-focus-visible:outline-2 has-focus-visible:outline-white/70 {checked
					? 'text-wtr-blue bg-white'
					: 'text-white/70 hover:bg-white/10 hover:text-white'}"
			>
				<input
					type="radio"
					class="sr-only"
					name="edition-{series.id}"
					{checked}
					onchange={() => series.selectEdition(option.value)}
				/>
				{option.label}
			</label>
		{/each}
	</div>

	{#if bisCount > 0}
		<label class="flex w-fit cursor-pointer items-center gap-2 text-xs text-white/80 hover:text-white">
			<input type="checkbox" class="accent-wtr-pink cursor-pointer" bind:checked={series.filter.bis} />
			BIS-bladen
			<span class="text-white/50 tabular-nums">({bisCount})</span>
		</label>
	{/if}

	{#if span}
		<div class="flex items-center gap-2 text-[10px] text-white/50 tabular-nums">
			<span>{span.min}</span>
			<span class="relative h-1 flex-1 rounded-full bg-white/10">
				{#if bar}
					<span
						class="absolute inset-y-0 rounded-full bg-white transition-[left,width] duration-300 ease-out"
						style="left: {bar.left}%; width: {bar.width}%"
					></span>
				{/if}
			</span>
			<span>{span.max}</span>
		</div>
	{/if}
</section>
