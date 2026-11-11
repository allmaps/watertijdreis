<script lang="ts">
	import { getContext, onDestroy, tick, untrack } from "svelte";
	import { flip } from "svelte/animate";
	import { fly, slide } from "svelte/transition";
	import { ArrowLeft, CaretRight, Info, Plus, Stack, Trash } from "phosphor-svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import type { MapLayer } from "$lib/map/MapLayer.svelte";
	import LayerRow from "./LayerRow.svelte";
	import AddLayerButton from "./AddLayerButton.svelte";
	import AhnLayerSettings from "./AhnLayerSettings.svelte";
	import { AhnMapLayer } from "$lib/map/AhnMapLayer.svelte";
	import SheetInfoView from "$lib/components/map/SheetInfoView.svelte";
	import { HistoricMapSeries } from "$lib/map/HistoricMapSeries.svelte";
	import EditionPicker from "./EditionPicker.svelte";

	const mapContext = getContext<MapContext>("mapContext");

	type ViewState = "list" | "add" | "settings" | "sheet";
	let currentView = $state<ViewState>("list");
	let selectedLayer = $state<MapLayer | null>(null);
	let contentHeight = $state(0);

	const displayLayers = $derived(mapContext.layers.toReversed());
	const addableLayers = $derived(mapContext.availableLayers.filter((l) => !l.added));

	const sheetInfo = mapContext.historic.info;
	const openSheetId = $derived(mapContext.historic.selectedMap?.id ?? null);

	$effect(() => {
		const id = openSheetId;
		untrack(() => {
			if (id) currentView = "sheet";
			else if (currentView === "sheet") currentView = "list";
		});
	});

	const viewTitle = $derived(
		currentView === "add" ? "Laag toevoegen" : currentView === "sheet" ? sheetInfo.title : selectedLayer?.name
	);

	function openSettings(layer: MapLayer) {
		selectedLayer = layer;
		currentView = "settings";
	}

	function goBack() {
		mapContext.historic.selectedMap = null;
		mapContext.historic.setSheetIndexVisibility(false);
		currentView = "list";
		selectedLayer = null;
	}

	function addLayer(layer: MapLayer) {
		layer.visible = true;
		mapContext.addLayer(layer);
		currentView = "list";
	}

	function removeLayer(layer: MapLayer) {
		mapContext.removeLayer(layer);
		goBack();
	}

	let listEl = $state<HTMLUListElement>();
	let draggingId = $state<string | null>(null);

	function startDrag(e: PointerEvent, layer: MapLayer) {
		if (!layer.movable || e.button !== 0) return;
		e.preventDefault();
		draggingId = layer.id;
		window.addEventListener("pointermove", onDragMove);
		window.addEventListener("pointerup", endDrag);
		window.addEventListener("pointercancel", endDrag);
	}

	function onDragMove(e: PointerEvent) {
		if (!draggingId || !listEl) return;

		const y = e.clientY - listEl.getBoundingClientRect().top;
		const rows = Array.from(listEl.children) as HTMLElement[];
		if (rows.length === 0) return;

		let displayIndex = rows.findIndex((li) => y >= li.offsetTop && y < li.offsetTop + li.offsetHeight);
		if (displayIndex === -1) {
			const last = rows[rows.length - 1];
			if (y < rows[0].offsetTop) displayIndex = 0;
			else if (y >= last.offsetTop + last.offsetHeight) displayIndex = rows.length - 1;
			else return;
		}

		const to = mapContext.layers.length - 1 - displayIndex;
		const from = mapContext.layers.findIndex((l) => l.id === draggingId);
		if (from !== -1 && from !== to) mapContext.moveLayer(from, to);
	}

	function endDrag() {
		draggingId = null;
		if (typeof window !== "undefined") {
			window.removeEventListener("pointermove", onDragMove);
			window.removeEventListener("pointerup", endDrag);
			window.removeEventListener("pointercancel", endDrag);
		}
	}

	onDestroy(endDrag);

	async function nudge(layer: MapLayer, direction: 1 | -1) {
		const from = mapContext.layers.indexOf(layer);
		mapContext.moveLayer(from, from + direction);

		await tick();
		listEl?.querySelector<HTMLElement>(`[data-layer-id="${layer.id}"] [data-grip]`)?.focus();
	}
</script>

<div
	role="region"
	aria-label="Kaartlagen"
	class="bg-wtr-blue/95 pointer-events-auto relative z-[1001] max-h-[calc(100dvh-12rem)] w-100 max-w-[calc(100vw-1rem)] overflow-x-hidden overflow-y-auto rounded-xl text-white shadow-2xl ring-1 ring-white/10 backdrop-blur-md transition-[height] duration-200 ease-out motion-reduce:transition-none"
	style:height={contentHeight ? `${contentHeight}px` : undefined}
>
	<div class="relative p-2" bind:offsetHeight={contentHeight}>
		{#if currentView !== "list"}
			<div class="mb-2 flex items-center gap-2 border-b border-white/10 px-1 pb-2">
				<button
					onclick={goBack}
					class="flex cursor-pointer items-center gap-1.5 rounded-md p-1 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
				>
					<ArrowLeft size={16} />
					<span class="font-medium">Terug</span>
				</button>
				<span class="truncate text-xs font-semibold tracking-wide text-white/90">{viewTitle}</span>
			</div>
		{/if}

		<div class="flex flex-col gap-1">
			{#if currentView === "list"}
				{#if mapContext.historic.selectedMap}
					<button
						type="button"
						transition:slide={{ duration: 200 }}
						onclick={() => (currentView = "sheet")}
						class="group mb-1 flex w-full cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs transition-colors hover:bg-white/15"
					>
						<Info size="16" class="text-wtr-pink shrink-0" />
						<span class="min-w-0 flex-1 truncate font-medium">Bladinformatie · {sheetInfo.title}</span>
						<CaretRight size="12" class="shrink-0 text-white/60 transition-transform group-hover:translate-x-0.5" />
					</button>
				{/if}
				<div class="flex items-center gap-1">
					<button class="shrink-0 px-1 opacity-50"><Stack size="18" /></button>
					<button onclick={() => (currentView = "add")} class="min-w-0 flex-1 text-left">
						<AddLayerButton />
					</button>
				</div>

				<ul
					bind:this={listEl}
					class="relative mt-1 flex flex-col divide-y divide-white/10"
					class:select-none={draggingId}
					in:fly={{ x: -20, duration: 200 }}
				>
					{#each displayLayers as layer (layer.id)}
						<li class="py-1" data-layer-id={layer.id} animate:flip={{ duration: 200 }}>
							<LayerRow
								{layer}
								dragging={draggingId === layer.id}
								onSettingsClick={() => openSettings(layer)}
								onGripDown={(e) => startDrag(e, layer)}
								onNudge={(dir) => nudge(layer, dir)}
							/>
						</li>
					{/each}
				</ul>
			{:else if currentView === "sheet"}
				<div in:fly={{ x: 20, duration: 200 }}>
					<SheetInfoView info={sheetInfo} />
				</div>
			{:else if currentView === "add"}
				<div class="flex flex-col gap-1.5 px-1 py-1" in:fly={{ y: 20, duration: 200 }}>
					<p class="px-1 text-[11px] text-white/70">Kies een laag om toe te voegen aan de kaart:</p>
					{#each addableLayers as layer (layer.id)}
						<button
							onclick={() => addLayer(layer)}
							class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium transition-colors hover:bg-white/15"
						>
							<span class="truncate">{layer.name}</span>
							<span class="ml-auto shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
								{layer.type === "historic-series" ? "Historisch" : "Actueel"}
							</span>
							<Plus size={16} class="shrink-0 text-white/70" />
						</button>
					{:else}
						<p class="px-1 py-4 text-center text-xs text-white/50">Alle beschikbare lagen zijn al toegevoegd.</p>
					{/each}
				</div>
			{:else if currentView === "settings" && selectedLayer}
				<div class="flex flex-col gap-4 px-1 py-2 text-xs" in:fly={{ x: 20, duration: 200 }}>
					{#if selectedLayer instanceof AhnMapLayer}
						<AhnLayerSettings layer={selectedLayer} />
					{/if}
					{#if selectedLayer instanceof HistoricMapSeries && selectedLayer.hasEditions}
						<EditionPicker series={selectedLayer}></EditionPicker>
					{/if}
					{#if !(selectedLayer instanceof AhnMapLayer) && !(selectedLayer instanceof HistoricMapSeries && selectedLayer.id === "wsk")}
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
					{/if}

					<div class="flex items-center justify-center border-t border-white/10 pt-2">
						<button
							onclick={() => removeLayer(selectedLayer!)}
							class="cursor-pointer rounded border-1 border-white/10 bg-red-500/20 px-2.5 py-1 text-red-300 transition-colors hover:bg-red-500/30"
						>
							<Trash class="inline"></Trash>
							Laag verwijderen
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
