<script lang="ts">
	import { getContext } from "svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import type { MapLayer } from "$lib/state/MapLayer.svelte";
	import LayerRow from "./LayerRow.svelte";
	import AddLayerButton from "./AddLayerButton.svelte";
	import { ArrowLeft, Plus } from "phosphor-svelte";

	const mapContext = getContext<MapContext>("mapContext");

	// Schakelt tussen: 'list' (hoofdlijst), 'add' (laag toevoegen menu), 'settings' (laag opties)
	type ViewState = "list" | "add" | "settings";
	let currentView = $state<ViewState>("list");
	let selectedLayer = $state<MapLayer | null>(null);

	function openSettings(layer: MapLayer) {
		selectedLayer = layer;
		currentView = "settings";
	}

	function goBack() {
		currentView = "list";
		selectedLayer = null;
	}
</script>

<div
	class="bg-wtr-blue/95 w-80 overflow-hidden rounded-xl border border-white/10 p-2 text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-in-out"
>
	<!-- HEADER / NAVIGATIE (Alleen zichtbaar in sub-views voor de terugknop) -->
	{#if currentView !== "list"}
		<div class="mb-2 flex items-center gap-2 border-b border-white/10 px-1 pb-2">
			<button
				onclick={goBack}
				class="flex cursor-pointer items-center gap-1.5 rounded-md p-1 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
			>
				<ArrowLeft size={16} />
				<span class="font-medium">Terug</span>
			</button>
			<span class="truncate text-xs font-semibold tracking-wide text-white/90">
				{currentView === "add" ? "Laag toevoegen" : selectedLayer?.name}
			</span>
		</div>
	{/if}

	<!-- CONTENT OP BASIS VAN HUIDIGE VIEW -->
	<div class="flex flex-col gap-1">
		{#if currentView === "list"}
			<!-- HOOFDLIJST: Knop 'Laag toevoegen' + Actieve Lagen -->
			<button onclick={() => (currentView = "add")} class="w-full text-left">
				<AddLayerButton />
			</button>

			<ul class="mt-1 flex flex-col divide-y divide-white/10">
				{#each mapContext.activeLayers as layer (layer.id)}
					<li class="py-2">
						<LayerRow {layer} onSettingsClick={() => openSettings(layer)} />
					</li>
				{/each}

				<!-- Indien je ook de historische series hier dynamisch in wilt tonen -->
				{#each mapContext.historic.series as series, index}
					<!-- Eventueel historische series hier mappen -->
				{/each}
			</ul>
		{:else if currentView === "add"}
			<!-- LAAG TOEVOEGEN SCHERM -->
			<div class="flex flex-col gap-1.5 px-1 py-1">
				<p class="px-1 text-[11px] text-white/70">Kies een laag om toe te voegen aan de kaart:</p>
				{#each mapContext.availableLayers.filter((l) => !l.added) as layer (layer.id)}
					<button
						onclick={() => {
							mapContext.addLayerToActive(layer.id);
							currentView = "list";
						}}
						class="flex w-full cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium transition-colors hover:bg-white/15"
					>
						<span>{layer.name}</span>
						<Plus size={16} class="text-white/70" />
					</button>
				{:else}
					<p class="text-xs text-white/50 px-1 py-4 text-center">Alle beschikbare lagen zijn al toegevoegd.</p>
				{/each}
			</div>
		{:else if currentView === "settings" && selectedLayer}
			<!-- INSTELLINGEN / OPTIES VOOR SPECIFIEKE LAAG -->
			<div class="flex flex-col gap-4 px-1 py-2 text-xs">
				<!-- Zichtbaarheid & Opaciteit -->
				<div class="flex flex-col gap-2">
					<span class="font-semibold text-white/90">Transparantie / Opaciteit</span>
					<div class="flex items-center gap-3">
						<input
							type="range"
							min="0"
							max="1"
							step="0.05"
							bind:value={selectedLayer.opacity}
							class="w-full cursor-pointer accent-white"
						/>
						<span class="w-8 text-right font-mono text-[11px]">
							{Math.round(selectedLayer.opacity * 100)}%
						</span>
					</div>
				</div>

				<!-- Actie om laag uit het paneel te verwijderen -->
				<div class="flex items-center justify-between border-t border-white/10 pt-2">
					<span class="text-white/60">Verwijder uit paneel</span>
					<button
						onclick={() => {
							mapContext.removeLayerFromActive(selectedLayer!.id);
							currentView = "list";
						}}
						class="cursor-pointer rounded bg-red-500/20 px-2.5 py-1 text-red-300 transition-colors hover:bg-red-500/30"
					>
						Verwijderen
					</button>
				</div>
			</div>
		{/if}
	</div>
</div>
