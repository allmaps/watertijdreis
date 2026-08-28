<script lang="ts">
	import { onMount } from "svelte";

	import AppHeader from "../AppHeader.svelte";
	import Minimap from "./Minimap.svelte";
	import HistoricMapInfo from "./HistoricMapInfo.svelte";
	import Toast from "../ui/Toast.svelte";
	import Timeline from "../timeline/Timeline.svelte";
	import MapSheetToggle from "./MapSheetToggle.svelte";
	import MapControls from "./MapControls.svelte";

	import { MapContext } from "../../map/mapContext.svelte";
	import { mousePosition } from "../../state/mousePosition.svelte";
	import { spriteStore } from "../../utils/spriteSheet.svelte";
	import { addGemeentegrenzenLayer, addWaterschapsgrenzenLayer } from "../../map/mapLayers.svelte";

	const containerId = "map-container";
	const mapContext = new MapContext();

	onMount(() => {
		if (!mapContext.map) mapContext.init(containerId);
		spriteStore.init();
	});

	onMount(() => {
		document.addEventListener("pointermove", (e) => {
			mousePosition.x = e.x;
			mousePosition.y = e.y;
		});
	});

	$effect(() => {
		if (!mapContext.maplibreLoaded || mapContext.historic.selectedMap) return;

		mapContext.setProtomapsVisiblity(mapContext.layerOptions.baseMap === "protomaps");
		if (mapContext.layerOptions.baseMap === "protomaps")
			mapContext.setProtomapsWaterInFront(mapContext.layerOptions.protoMapsWaterInFront);
		if (mapContext.layerOptions.baseMap === "protomaps")
			mapContext.setProtoMapsLabelsInFront(mapContext.layerOptions.protoMapsLabelsInFront);

		mapContext.setAHNVisibility(mapContext.layerOptions.baseMap === "ahn");
		mapContext.setSatellietVisibility(mapContext.layerOptions.baseMap === "satelliet");

		if (mapContext.historic.warpedMapLayer)
			mapContext.historic.warpedMapLayer.setLayerOptions({
				opacity: mapContext.layerOptions.historicMapsOpacity / 100,
			});
	});

	$effect(() => {
		if (!mapContext.maplibreLoaded) return;

		if (mapContext.layerOptions.overlay !== "waterschapsgrenzen") {
			if (mapContext.map.getLayer("overlay-waterschapsgrenzen")) {
				mapContext.map.removeLayer("overlay-waterschapsgrenzen");
			}
			if (mapContext.map.getSource("pdok-waterschapsgrenzen")) {
				mapContext.map.removeSource("pdok-waterschapsgrenzen");
			}
		}

		if (mapContext.layerOptions.overlay !== "gemeentegrenzen") {
			if (mapContext.map.getLayer("overlay-gemeentegrenzen")) {
				mapContext.map.removeLayer("overlay-gemeentegrenzen");
			}
			if (mapContext.map.getSource("pdok-gemeentegrenzen")) {
				mapContext.map.removeSource("pdok-gemeentegrenzen");
			}
		}

		if (mapContext.layerOptions.overlay === "waterschapsgrenzen") {
			if (!mapContext.map.getSource("pdok-waterschapsgrenzen")) {
				addWaterschapsgrenzenLayer(mapContext.map);
			}
		}
		if (mapContext.layerOptions.overlay === "gemeentegrenzen") {
			if (!mapContext.map.getSource("pdok-gemeentegrenzen")) {
				addGemeentegrenzenLayer(mapContext.map);
			}
		}
	});

	let clickedMapTimeout = null;

	function extendClickedMapTimeout(delay = 2500) {
		if (!clickedMapTimeout) return;
		clearTimeout(clickedMapTimeout);
		clickedMapTimeout = setTimeout(() => (mapContext.historic.clickedFeature = null), delay);
	}
</script>

<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@3.4.0/dist/maplibre-gl.css" />

<div
	id={containerId}
	class="polka fixed inset-0 h-full w-full bg-size-[25px_25px]"
	style={`
		touch-action: auto; 
		background-color: ${mapContext.historic.selectedMap ? "#fffaff" : "#fafaff"}; 
		background-image: radial-gradient(${mapContext.historic.selectedMap ? "#fef" : "#eef"} 2.5px, transparent 2.5px)
	`}
></div>

{#if !mapContext.historic.selectedMap}
	<Toast content={mapContext.toastContent}></Toast>
{/if}

<MapSheetToggle {mapContext} {extendClickedMapTimeout}></MapSheetToggle>

{#if mapContext.maplibreLoaded}
	<MapControls {mapContext} />
{/if}

<AppHeader {mapContext} />

<Timeline {mapContext} visible={mapContext.historic.mapsLoaded && !mapContext.historic.selectedMap}></Timeline>

<Minimap {mapContext}></Minimap>
<HistoricMapInfo {mapContext}></HistoricMapInfo>

<svelte:window
	onkeydown={(e) => {
		if (e.key.toLowerCase() == "=") mapContext.zoomIn();
		if (e.key.toLowerCase() == "-") mapContext.zoomOut();

		if (e.key.toLowerCase() == "w" && mapContext.layerOptions.baseMap == "protomaps") {
			mapContext.layerOptions.protoMapsWaterInFront = !mapContext.layerOptions.protoMapsWaterInFront;
		}

		if (e.key.toLowerCase() == "t" && mapContext.layerOptions.baseMap == "protomaps") {
			mapContext.layerOptions.protoMapsLabelsInFront = !mapContext.layerOptions.protoMapsLabelsInFront;
		}

		if (e.key == "Escape") {
			mapContext.historic.clickedFeature = null;
			mapContext.historic.setSheetIndexVisibility(false);
		}
	}}
	onpopstate={() => {
		mapContext.applyStateFromURL();

		const q = new URLSearchParams(window.location.search);
		const bladId = q.get("blad");
		if (bladId) {
			const historicMap = mapContext.historic.mapsById.get(bladId);
			if (historicMap) mapContext.historic.setHistoricMapView(historicMap);
		}
	}}
/>

<style>
	#map-container canvas {
		outline: none !important;
	}
	#map-container canvas:focus {
		outline: none !important;
	}
</style>
