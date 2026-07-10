<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import * as turf from '@turf/turf';
	import * as pmtiles from 'pmtiles';
	import { WarpedMapLayer, WarpedMapEvent, WarpedMapEventType } from '@allmaps/maplibre';

	import { SvelteMap } from 'svelte/reactivity';

	import { animateFeatureOpacity } from '$lib/utils/mapAnimations.svelte';

	import Header from './Header.svelte';
	import Minimap from './Minimap.svelte';
	import MapInfo from './MapInfo.svelte';
	import Toast from './components/Toast.svelte';
	import Timeline from './Timeline.svelte';
	import MapSheetToggle from './MapSheetToggle.svelte';
	import MapButtons from './MapButtons.svelte';
	import { getUserLocation, isInNL } from '$lib/utils/UserLocation.svelte';
	import { basemapStyle } from './basemap';

	import { mousePosition } from './state/mousePosition.svelte';

	import type { GeoJsonProperties, Geometry, Feature } from 'geojson';
	import type { HistoricMap } from './types/historicmap';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	import { spriteStore } from './state/SpriteSheet.svelte';
	import {
		addBackgroundLayers,
		addGemeentegrenzenLayer,
		addOutlineLayers,
		addUserLocationCircle,
		addWaterschapsgrenzenLayer
	} from './map/mapLayers.svelte';

	$effect(() => {
		spriteStore.init();
	});

	import { MapContext } from './map/mapContext.svelte';

	const mapContext = new MapContext();

	const containerId = 'map-container';
	const ANNOTATION_URL = 'maps-sorted-by-edition.json';

	onMount(() => {
		if (!mapContext.map) mapContext.init(containerId);
	});

	onMount(() => {
		document.addEventListener('pointermove', (e) => {
			mousePosition.x = e.x;
			mousePosition.y = e.y;
		});
	});

	$effect(() => {
		if (!mapContext.map) return;

		const mapsArray = Array.from(mapContext.historic.visibleHistoricMaps.values());

		const polygons = mapsArray.map((map, index) => {
			const seed = map.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
			const lightness = 90 + (seed % 5);
			const saturation = 46 + (seed % 10);

			return {
				id: index,
				type: 'Feature' as const,
				geometry: map.polygon,
				properties: {
					id: map.id,
					skeletonColor: `hsl(44, ${saturation}%, ${lightness}%)`
				}
			};
		});

		const points = mapsArray.map((map, index) => ({
			id: index,
			type: 'Feature' as const,
			geometry: turf.centerOfMass(map.polygon).geometry,
			properties: {
				year: map.yearEnd,
				num: `${map.number}.${map.position}`
			}
		}));

		const outlinesSource = mapContext.map.getSource('map-outlines') as
			| maplibregl.GeoJSONSource
			| undefined;
		outlinesSource?.setData({
			type: 'FeatureCollection',
			features: polygons
		});

		const labelsSource = mapContext.map.getSource('map-labels') as
			| maplibregl.GeoJSONSource
			| undefined;
		labelsSource?.setData({
			type: 'FeatureCollection',
			features: points
		});
	});

	setInterval(() => {
		if (!mapContext.historicMapsLoaded) return;

		const reference = mapContext.historic.warpedMapLayer?.renderer?.mapsInViewport;
		if (!reference) return;

		for (const id of mapContext.historic.mapsInViewport.keys()) {
			if (!reference.has(id)) mapContext.historic.mapsInViewport.delete(id);
		}

		for (const id of mapContext.historic.visibleHistoricMapsInViewport.keys()) {
			if (!reference.has(id) || !mapContext.historic.visibleHistoricMaps.has(id)) {
				mapContext.historic.visibleHistoricMapsInViewport.delete(id);
			}
		}

		for (const id of reference) {
			if (!mapContext.historic.mapsInViewport.has(id))
				mapContext.historic.mapsInViewport.set(id, mapContext.historic.historicMapsById.get(id));

			if (
				!mapContext.historic.visibleHistoricMapsInViewport.has(id) &&
				mapContext.historic.visibleHistoricMaps.has(id)
			)
				mapContext.historic.visibleHistoricMapsInViewport.set(
					id,
					mapContext.historic.historicMapsById.get(id)
				);
		}
	}, 300);

	$effect(() => {
		if (mapContext.historic.warpedMapLayer) {
			mapContext.historic.warpedMapLayer.renderer?.tileCache?.addEventListener(
				WarpedMapEventType.MAPTILELOADED,
				(e: WarpedMapEvent) => {
					const id = e.data?.mapId;
					const historicMap = mapContext.historic.historicMapsById.get(id);
					if (
						historicMap &&
						mapContext.historic.warpedMapLayer?.renderer?.mapsInViewport.has(historicMap.id)
					)
						mapContext.historic.visibleHistoricMapsInViewport.set(id, historicMap);
				}
			);
		}
	});

	$effect(() => {
		if (!mapContext.maplibreLoaded || mapContext.historic.selectedHistoricMap) return;

		mapContext.setProtomapsVisiblity(mapContext.layerOptions.baseMap === 'protomaps');
		if (mapContext.layerOptions.baseMap === 'protomaps')
			mapContext.setProtomapsWaterInFront(mapContext.layerOptions.protoMapsWaterInFront);
		if (mapContext.layerOptions.baseMap === 'protomaps')
			mapContext.setProtoMapsLabelsInFront(mapContext.layerOptions.protoMapsLabelsInFront);

		mapContext.setAHNVisibility(mapContext.layerOptions.baseMap === 'ahn');
		mapContext.setSatellietVisibility(mapContext.layerOptions.baseMap === 'satelliet');

		if (mapContext.historic.warpedMapLayer)
			mapContext.historic.warpedMapLayer.setLayerOptions({
				opacity: mapContext.layerOptions.historicMapsOpacity / 100
			});

		if (mapContext.map && mapContext.map.getLayer('map-outlines-skeleton')) {
			const visibility = mapContext.layerOptions.historicMapsOpacity < 100 ? 'none' : 'visible';
			mapContext.map.setLayoutProperty('map-outlines-skeleton', 'visibility', visibility);
		}
	});

	$effect(() => {
		if (!mapContext.maplibreLoaded) return;

		if (mapContext.layerOptions.overlay !== 'waterschapsgrenzen') {
			if (mapContext.map.getLayer('overlay-waterschapsgrenzen')) {
				mapContext.map.removeLayer('overlay-waterschapsgrenzen');
			}
			if (mapContext.map.getSource('pdok-waterschapsgrenzen')) {
				mapContext.map.removeSource('pdok-waterschapsgrenzen');
			}
		}

		if (mapContext.layerOptions.overlay !== 'gemeentegrenzen') {
			if (mapContext.map.getLayer('overlay-gemeentegrenzen')) {
				mapContext.map.removeLayer('overlay-gemeentegrenzen');
			}
			if (mapContext.map.getSource('pdok-gemeentegrenzen')) {
				mapContext.map.removeSource('pdok-gemeentegrenzen');
			}
		}

		if (mapContext.layerOptions.overlay === 'waterschapsgrenzen') {
			if (!mapContext.map.getSource('pdok-waterschapsgrenzen')) {
				addWaterschapsgrenzenLayer(mapContext.map);
			}
		}
		if (mapContext.layerOptions.overlay === 'gemeentegrenzen') {
			if (!mapContext.map.getSource('pdok-gemeentegrenzen')) {
				addGemeentegrenzenLayer(mapContext.map);
			}
		}
	});

	let clickedMapTimeout = null;

	function extendClickedMapTimeout(delay = 2500) {
		if (!clickedMapTimeout) return;
		clearTimeout(clickedMapTimeout);
		clickedMapTimeout = setTimeout(() => (mapContext.clickedFeature = null), delay);
	}

	$effect(() => {
		if (!mapContext.maplibreLoaded) return;
		const offset = mapContext.historic.selectedHistoricMap ? 10 : 140;
		const bottomLeft = document.querySelector('.maplibregl-ctrl-bottom-left');
		const bottomRight = document.querySelector('.maplibregl-ctrl-bottom-right');
		if (bottomLeft) bottomLeft.style.setProperty('bottom', offset + 'px', 'important');
		if (bottomRight) bottomRight.style.setProperty('bottom', offset + 'px', 'important');
	});
</script>

<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@3.4.0/dist/maplibre-gl.css" />

<div
	id={containerId}
	class="polka fixed inset-0 h-full w-full bg-size-[25px_25px]"
	style={`
		touch-action: auto; 
		background-color: ${mapContext.historic.selectedHistoricMap ? '#fffaff' : '#fafaff'}; 
		background-image: radial-gradient(${mapContext.historic.selectedHistoricMap ? '#fef' : '#eef'} 2.5px, transparent 2.5px)
	`}
></div>

{#if !mapContext.historic.selectedHistoricMap}
	<Toast content={mapContext.toastContent}></Toast>
{/if}

<MapSheetToggle {mapContext} {extendClickedMapTimeout}></MapSheetToggle>

{#if mapContext.maplibreLoaded}
	<MapButtons {mapContext} {flyToUserLocation} />
{/if}

<Header {mapContext} />

<Timeline
	{mapContext}
	visible={mapContext.historic.historicMapsLoaded && !mapContext.historic.selectedHistoricMap}
></Timeline>

<Minimap {mapContext}></Minimap>
<MapInfo {mapContext}></MapInfo>

<svelte:window
	onkeydown={(e) => {
		if (e.key.toLowerCase() == '=') mapContext.zoomIn();
		if (e.key.toLowerCase() == '-') mapContext.zoomOut();

		if (e.key.toLowerCase() == 'w' && mapContext.layerOptions.baseMap == 'protomaps') {
			mapContext.layerOptions.protoMapsWaterInFront =
				!mapContext.layerOptions.protoMapsWaterInFront;
		}

		if (e.key.toLowerCase() == 't' && mapContext.layerOptions.baseMap == 'protomaps') {
			mapContext.layerOptions.protoMapsLabelsInFront =
				!mapContext.layerOptions.protoMapsLabelsInFront;
		}

		if (e.key == 'Escape') {
			mapContext.clickedFeature = null;
			mapContext.setGridVisibility(false);
			mapContext.setSheetIndexVisibility(false);
		}
	}}
	onpopstate={() => {
		mapContext.applyStateFromURL();

		const q = new URLSearchParams(window.location.search);
		const bladId = q.get('blad');
		if (bladId) {
			const historicMap = mapContext.historic.historicMapsById.get(bladId);
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
