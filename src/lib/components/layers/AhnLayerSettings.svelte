<script lang="ts">
	import type { AhnMapLayer } from "$lib/map/AhnMapLayer.svelte";
	import type { AhnOptions, MappingMode } from "$lib/map/dynamic-ahn/options";
	import AhnPalettePicker from "./AhnPalettePicker.svelte";
	import AhnRangeLegend from "./AhnRangeLegend.svelte";

	let { layer }: { layer: AhnMapLayer } = $props();
	let advanced = $state(false);
	function setMapping(mode: MappingMode) {
		layer.mappingMode = mode;
		if (mode === "linear" || mode === "mean") {
			layer.scaleMode = "percentile";
			layer.outlierPercentile = 2;
		}
	}

	function setOutliers(value: string) {
		layer.scaleMode = value === "0" ? "extent" : "percentile";
		if (value !== "0") layer.outlierPercentile = Number(value) as AhnOptions["outlierPercentile"];
	}
</script>

<div class="ahn-settings flex flex-col gap-4 text-xs">
	<label class="flex flex-col gap-2">
		<span class="flex justify-between font-semibold">Zichtbaarheid <span>{Math.round(layer.opacity * 100)}%</span></span
		>
		<input
			type="range"
			min="0"
			max="1"
			step="0.05"
			bind:value={layer.opacity}
			aria-label="Zichtbaarheid"
			class="w-full cursor-pointer accent-white"
		/>
	</label>
	<label class="flex cursor-pointer items-center gap-2">
		<input type="checkbox" class="accent-wtr-pink" bind:checked={layer.grayscale} />
		Historische kaarten in grijstinten
	</label>
	<AhnPalettePicker stops={layer.stops} onchange={(stops) => (layer.stops = stops)} />
	<label class="flex cursor-pointer items-center gap-2">
		<input type="checkbox" class="accent-wtr-pink" bind:checked={layer.showCursorHeight} />
		Hoogte bij cursor
	</label>
	<p class="text-white/65">
		Bron: AHN-maaiveld via <a
			class="underline hover:text-white"
			href="https://www.pdok.nl/introductie/-/article/actueel-hoogtebestand-nederland-ahn"
			target="_blank"
			rel="noreferrer">PDOK</a
		> · m NAP
	</p>
	{#if layer.error}<p role="status" class="text-red-300">{layer.error}</p>{/if}
	<details class="border-t border-white/15 pt-3" bind:open={advanced}>
		<summary class="cursor-pointer font-semibold">Geavanceerde opties</summary>
		{#if advanced}
			<div class="mt-4 flex flex-col gap-4">
				<AhnRangeLegend
					scale={layer.scale}
					legendAxis={layer.legendAxis}
					statistics={layer.statistics}
					stops={layer.stops}
					locked={layer.scaleLocked}
					onscale={(scale, axis) => {
						layer.setScale(scale);
						layer.legendAxis = axis;
					}}
					onlock={() => (layer.scaleLocked ? layer.unlockScale() : layer.lockScale())}
				/>
				<div class="flex flex-col gap-2">
					<label class="flex items-center justify-between gap-3">
						<span>Schaalverdeling</span>
						<select
							class="control min-w-0 flex-1"
							value={layer.mappingMode}
							onchange={(e) => setMapping(e.currentTarget.value as MappingMode)}
							disabled={layer.scaleLocked}
						>
							<option value="linear">Lineair</option><option value="mean">Rond het gemiddelde</option><option
								value="equalized">Adaptief contrast</option
							>
							<option value="extremes">Extremen benadrukken</option>
						</select>
					</label>
					<p class="text-[11px] text-white/65">
						{#if layer.scaleLocked}De kleuren volgen de vastgezette hoogtes. Maak de schaal los om automatisch te
							schalen.
						{:else if layer.mappingMode === "linear"}Gelijke hoogteverschillen krijgen evenveel kleurruimte.
						{:else if layer.mappingMode === "mean"}Elke kant van de gemiddelde hoogte krijgt de helft van het
							kleurverloop.
						{:else if layer.mappingMode === "extremes"}Hoogtes rond de mediaan blijven dicht bij de middenkleur. Lage en
							hoge uitersten krijgen meer contrast.
						{:else}Veelvoorkomende hoogtes krijgen meer kleurverschil. De middenkleur volgt de mediaan.{/if}
					</p>
				</div>
				<div class="flex flex-col gap-2">
					{#if layer.mappingMode === "equalized"}
						<p class="text-[11px] text-white/65">
							<span class="font-semibold text-white/90">Uitschieters</span> krijgen bij adaptief contrast vanzelf weinig
							kleurruimte.
						</p>
					{:else if layer.mappingMode === "extremes"}
						<p class="text-[11px] text-white/65">
							<span class="font-semibold text-white/90">Uitschieters</span> blijven behouden om de uitersten zichtbaar te
							maken.
						</p>
					{:else}
						<label class="flex items-center justify-between gap-3"
							><span>Uitschieters</span>
							<select
								class="control min-w-0 flex-1"
								value={layer.scaleMode === "percentile" ? layer.outlierPercentile : 0}
								onchange={(e) => setOutliers(e.currentTarget.value)}
								disabled={layer.scaleLocked}
							>
								<option value={0}>Niet afkappen</option>
								{#each [0.5, 1, 2, 5, 10] as p (p)}<option value={p}
										>{p.toLocaleString("nl-NL")}% per kant afkappen</option
									>{/each}
							</select>
						</label>
						<p class="text-[11px] text-white/65">
							Afkappen geeft de overige hoogtes meer kleurruimte; uitschieters krijgen de eindkleuren.
						</p>
					{/if}
				</div>
				<div class="flex flex-col gap-2">
					<label class="flex items-center justify-between gap-3"
						><span>Mengmodus</span>
						<select bind:value={layer.blendMode} class="control min-w-0 flex-1">
							<option value="normal">Normaal</option><option value="multiply">Vermenigvuldigen (multiply)</option
							><option value="screen">Bleken (screen)</option><option value="plus-lighter"
								>Optellen (plus-lighter)</option
							>
						</select>
					</label>
					<p class="text-[11px] text-white/65">Transparante kleuren laten de kaart eronder zichtbaar.</p>
				</div>
			</div>
		{/if}
	</details>
</div>

<style>
	.control {
		border: 1px solid rgb(255 255 255 / 0.2);
		border-radius: 4px;
		padding: 6px 8px;
		background: rgb(255 255 255 / 0.05);
		color: white;
		color-scheme: dark;
	}
	option {
		background: var(--color-wtr-blue);
	}
	:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.control:focus-visible,
	summary:focus-visible {
		outline: 2px solid rgb(255 255 255 / 0.7);
		outline-offset: 2px;
	}
</style>
