<script lang="ts">
	import { onMount, setContext } from "svelte";

	import AppHeader from "../AppHeader.svelte";
	import Timeline from "../timeline/Timeline.svelte";
	import Toast from "../ui/Toast.svelte";
	import HistoricMapInfo from "./HistoricMapInfo.svelte";
	import MapControls from "./MapControls.svelte";
	import MapSheetToggle from "./MapSheetToggle.svelte";
	import Minimap from "./Minimap.svelte";

	import "maplibre-gl/dist/maplibre-gl.css";
	import { MapContext } from "../../map/mapContext.svelte";
	import { updateMousePosition } from "../../state/mousePosition.svelte";
	import { spriteStore } from "../../utils/spriteSheet.svelte";

	import NumberFlow from "@number-flow/svelte";
	import MapSeriesSelector from "../layers/LayerPanel.svelte";
	import PassiveTimeline from "./PassiveTimeline.svelte";

	const containerId = "map-container";
	const mapContext = new MapContext();

	setContext("mapContext", mapContext);

	onMount(() => {
		if (!mapContext.map) mapContext.init(containerId);
		spriteStore.init();
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;

		const key = e.key.toLowerCase();

		if (key === "=") mapContext.zoomIn();
		if (key === "-") mapContext.zoomOut();

		if (mapContext.layerOptions.baseMap === "protomaps") {
			if (key === "w") {
				mapContext.layerOptions.protoMapsWaterInFront = !mapContext.layerOptions.protoMapsWaterInFront;
			}
			if (key === "t") {
				mapContext.layerOptions.protoMapsLabelsInFront = !mapContext.layerOptions.protoMapsLabelsInFront;
			}
		}

		if (e.key === "Escape") {
			mapContext.historic.clickedFeature = null;
			mapContext.historic.setSheetIndexVisibility(false);
		}
	}

	function handlePopState() {
		mapContext.applyStateFromURL();

		const q = new URLSearchParams(window.location.search);
		mapContext.historic.selectedMapId = q.get("blad") ?? null;
	}

	let distributions = $derived(
		mapContext.historic.series.map((s) => {
			const years: Record<number, number> = {};
			for (const [, map] of s.visibleMaps) years[map.yearEnd] = (years[map.yearEnd] ?? 0) + 1;
			return { name: s.id, color: s.id === "wsk" ? "#ff44aa" : "#44aa44", years };
		})
	);
</script>

<div
	id={containerId}
	class="polka fixed inset-0 h-full w-full bg-[length:25px_25px]"
	style:touch-action="auto"
	style:background-color={mapContext.historic.selectedMap ? "#fffaff" : "#fafaff"}
	style:background-image={`radial-gradient(${mapContext.historic.selectedMap ? "#fef" : "#eef"} 2.5px, transparent 2.5px)`}
></div>

{#if !mapContext.historic.selectedMap}
	<Toast content={mapContext.toastContent}></Toast>
{/if}

<MapSheetToggle></MapSheetToggle>

{#if mapContext.maplibreLoaded}
	<MapControls />
{/if}

<AppHeader />

<!-- <Timeline visible={mapContext.maplibreLoaded && mapContext.historic.mapsLoaded && !mapContext.historic.selectedMap}
></Timeline> -->

<div class="absolute bottom-0 left-0 flex-col p-2">
	<div class="flex items-baseline gap-10">
		<Minimap></Minimap>
		<PassiveTimeline {distributions}></PassiveTimeline>
	</div>
	<HistoricMapInfo></HistoricMapInfo>
	<MapSeriesSelector></MapSeriesSelector>
</div>

<svelte:window onpointermove={updateMousePosition} onkeydown={handleKeyDown} onpopstate={handlePopState} />

<style>
	#map-container :global(canvas) {
		outline: none !important;
	}
</style>
