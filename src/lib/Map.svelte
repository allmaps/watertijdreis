<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@3.4.0/dist/maplibre-gl.css" />
<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { WarpedMapLayer } from '@allmaps/maplibre';
	import { WarpedMap, WarpedMapEventType } from '@allmaps/render';
	import * as turf from '@turf/turf';

	import { SvelteMap } from 'svelte/reactivity';
	import type { GeojsonPolygon } from './types/geojson';
	import Minimap from './Minimap.svelte';
	import Search from './Search.svelte';
	import Header from './Header.svelte';
	import Minimap2 from './Minimap2.svelte';
	import { apply } from 'ol/transform';
	import Timeline from './Timeline.svelte';
	import { getUserLocation } from '$lib/UserLocation.svelte';
	import MapInfo from './MapInfo.svelte';

	type HistoricMap = {
		id: string;
		manifestId: string;
		warpedMap: WarpedMap;
		polygon: GeojsonPolygon;
		yearStart: number;
		yearEnd: number;
		edition: number;
		bis: boolean;
		number: number;
		position: string;
		x: number;
		y: number;
		type: string | undefined;
	};

	type Filter = {
		yearStart: number;
		yearEnd: number;
		edition: 'All' | 1 | 2 | 3 | 4 | 5;
		bis: boolean;
		type: undefined | 'WVE' | 'HWP';
	};

	const containerId = 'map-container';
	const ANNOTATION_URL = 'maps.json';
	const MANIFEST_URL = 'https://tu-delft-heritage.github.io/watertijdreis-data/collection.json';
	let manifestCollection: any | null = $state(null);

	$effect(() => {
		fetch(MANIFEST_URL)
			.then((res) => res.json())
			.then((data) => (manifestCollection = data));
	});

	async function getHistoricMapManifest(id) {
		const historicMap = historicMapsById.get(id);
		if (!historicMap) return;
		const { manifestId, edition, bis } = historicMap;

		const label = `Editie ${edition}${bis ? ' BIS' : ''}`;
		const manifestUrl = manifestCollection.items.find((i) => i.label.nl[0] === label).id;

		const response = await fetch(manifestUrl);
		const result = await response.json();
		return result.items.find((i) => i.id == manifestId);
	}

	let map: maplibregl.Map | null = $state(null);
	let warpedMapLayer: WarpedMapLayer | null = $state(null);
	let maplibreLoaded: boolean = $state(false);

	$effect(() => {
		if (maplibreLoaded) console.log('maplibre loaded');
	});

	let historicMapsLoaded: boolean = $state(false);
	$effect(() => {
		if (historicMapsLoaded) console.log('historicMaps loaded', historicMapsById);
	});

	let historicMapsById: Map<string, HistoricMap> = $state(new Map());
	let historicMapsByNumber: Map<number, HistoricMap[]> | undefined = $derived.by(() => {
		if (!historicMapsLoaded) return;
		const grouped = new Map<number, HistoricMap[]>();
		for (const { number, ...rest } of historicMapsById.values())
			(grouped.get(number) ?? grouped.set(number, []).get(number))!.push({ number, ...rest });
		return grouped;
	});

	let hoveredFeature: string | null = $state(null);
	let hoveredHistoricMap: HistoricMap | null = $derived.by(() => {
		if (!hoveredFeature) return null;
		return historicMapsById.get(hoveredFeature.properties.id) || null;
	});
	let selectedHistoricMap: HistoricMap | null = $state(null);

	$effect(() => {
		if (!map) return;

		const polygons = visibleHistoricMaps
			.values()
			.map((o, i) => ({
				id: i,
				type: 'Feature',
				geometry: structuredClone(o.polygon),
				properties: { id: o.id, year: o.yearStart }
			}))
			.toArray();

		const points = visibleHistoricMaps
			.values()
			.map((o, i) => ({
				id: i,
				type: 'Feature',
				geometry: turf.centerOfMass(structuredClone(o.polygon)).geometry,
				properties: { year: o.yearStart }
			}))
			.toArray();

		if (map.getSource('map-outlines'))
			map.getSource('map-outlines').setData({
				type: 'FeatureCollection',
				features: polygons
			});
		if (map.getSource('map-labels'))
			map.getSource('map-labels').setData({
				type: 'FeatureCollection',
				features: points
			});
	});

	let viewportPolygon: GeojsonPolygon | null = $state(null);

	let filter: Filter = $state({
		yearStart: 1900,
		yearEnd: 1980,
		edition: 'All',
		bis: false,
		type: undefined
	});

	$effect(() => {
		if (!map) initMaplibre();
	});

	let visibleHistoricMaps: SvelteMap<string, HistoricMap> = $state(new SvelteMap());
	let visibleHistoricMapsInViewport = $derived.by(() => {
		if (!viewportPolygon || !warpedMapLayer) return new Map();

		const result = new Map();
		for (const id of warpedMapLayer.renderer?.mapsInViewport ?? []) {
			const map = historicMapsById.get(id);
			if (map && map.warpedMap.visible) {
				result.set(map.id, map);
			}
		}

		return result;
	});

	$effect(() => { // To make sure that warpedMaps that were still loading are added to visibleHistoricMapsInViewport when the viewport isn't moving 
		if(warpedMapLayer) {
			warpedMapLayer.renderer?.tileCache?.addEventListener(
				WarpedMapEventType.MAPTILELOADED,
				(e) => {
					const id = e.data.mapId;
					const historicMap = historicMapsById.get(id);
					if(historicMap) visibleHistoricMapsInViewport.set(id, historicMap);
				}
			)
		}
	})

	let gridVisible: boolean = $state(false);

	function showHistoricMap(id) {
		const historicMap = historicMapsById.get(id);
		if (!historicMap) return;
		historicMap.warpedMap.visible = true;
		visibleHistoricMaps.set(id, historicMap);
	}

	function hideHistoricMap(id) {
		const historicMap = historicMapsById.get(id);
		if (!historicMap) return;
		historicMap.warpedMap.visible = false;
		visibleHistoricMaps.delete(id);
	}

	function getHistoricMapThumbnail(id, size = 128) {
		const map = historicMapsById.get(id);
		if (!map) return '';
		return map.warpedMap?.georeferencedMap.resource.id + `/full/${size},/0/default.jpg`;
	}

	function applyFilter(filter: Filter) {
		if (!historicMapsByNumber) return;

		const visibleSheets: HistoricMap[] = [];
		const grayedOutSheets: HistoricMap[] = [];

		historicMapsByNumber.forEach((sheets, number) => {
			let x1, y1, x2, y2;
			let steps = 0;
			const firstEdYearEnd = 1894;

			for (const sheet of sheets.toReversed()) {
				// TODO: remove reversed
				steps++;

				const { x, y, yearEnd: year, edition, bis, type } = sheet;
				const maxYearFilter = filter.yearEnd > firstEdYearEnd ? filter.yearEnd : firstEdYearEnd;
				const periodFilter = filter.edition !== 'All' || year <= maxYearFilter;
				const editionFilter = filter.edition === 'All' || edition === filter.edition;
				const typeFilter = filter.type ? type === filter.type : !type;
				const bisFilter = filter.bis === true || !bis;
				const inScope = periodFilter && editionFilter && typeFilter && bisFilter;
				if (!inScope) continue;

				const stack =
					year >= filter.yearStart && year <= filter.yearEnd ? visibleSheets : grayedOutSheets;

				if (x1 === undefined) {
					// Get first sheet
					stack.push(sheet);
					[x1, y1] = [x, y];
					// Stop if no other sheets
					if (!x1 && !y1) break;
				} else if (y1 && x === x1 && y === -y1) {
					// Get optional North or South sheet
					stack.push(sheet);
					y1 = 0;
					// Stop if no East or West sheets
					if (!x1) break;
				} else if (x1 && !x2 && x === -x1) {
					// Get first East or West sheet
					stack.push(sheet);
					[x2, y2] = [x, y];
					// Stop if no more North or South sheets
					if (!y1 && !y) break;
				} else if (y2 && x === x2 && y === -y2) {
					// Get optional second East or West sheet
					stack.push(sheet);
					y2 = 0;
					// Stop if no more North or South sheet
					if (!y1) break;
				}
			}
		});

		for (const sheet of historicMapsById.values()) {
			// TODO: beter
			if (visibleSheets.find((i) => i.id == sheet.id)) showHistoricMap(sheet.id);
			else if (grayedOutSheets.find((i) => i.id == sheet.id)) {
				showHistoricMap(sheet.id);
				warpedMapLayer?.setMapSaturation(sheet.id, 0);
			} else hideHistoricMap(sheet.id);
		}
	}

	function initMaplibre() {
		const urlView = getViewFromUrl();
		const initialCenter: LngLatLike = urlView ? [urlView.lng, urlView.lat] : [5, 51.75];
		const initialZoom = urlView ? urlView.zoom : 7;

		map = new maplibregl.Map({
			container: containerId,
			style: {
				version: 8,
				sources: {},
				glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
				layers: [
					{
						id: 'background',
						type: 'background',
						paint: { 'background-color': '#ffffff00' }
					}
				]
			},
			center: initialCenter,
			zoom: initialZoom,
			minZoom: 6.5,
			maxZoom: 16,
			maxPitch: 0,
			minPitch: 0,
			maxBounds: [
				[-4, 49],
				[15, 56]
			],
			bearing: 0,
			dragRotate: false,
			touchPitch: false,
			preserveDrawingBuffer: true
		});
		map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");


		// map.on('idle', () => map?.triggerRepaint()); // TODO: weghalen!!
		map.on('load', async () => {
			maplibreLoaded = true;
			warpedMapLayer = new WarpedMapLayer();
			map.addLayer(warpedMapLayer);

			await loadHistoricMaps(ANNOTATION_URL);
			addOutlineLayers();

			map.on('move', updateViewport);
			updateViewport();
			map.on('moveend', updateUrl);
			map.on('click', 'map-outlines-fill', handleMapClick);
			map.on('mousemove', 'map-outlines-fill', handleMapMouseMove);
			map.on('mouseleave', 'map-outlines-fill', handleMapMouseLeave);
		});
	}

	async function loadHistoricMaps(url) {
		if (!map || !warpedMapLayer) return;

		const res = await fetch(url);
		const data = await res.json();

		const loadPromises = data.map(async (item) => {
			const id = await warpedMapLayer.addGeoreferencedMap(item);
			const warpedMap = warpedMapLayer.getWarpedMapList().warpedMapsById.get(id);
			const historicMap: HistoricMap = {
				id,
				manifestId: item.resource.partOf[0].id,
				warpedMap,
				polygon: warpedMap.geoMask,
				...item._meta
			};
			warpedMap.visible = false;
			historicMapsById.set(id, historicMap);
		});

		await Promise.all(loadPromises);

		historicMapsLoaded = true;
		applyFilter(filter);

		map.addSource('map-outlines', {
			type: 'geojson',
			data: { type: 'FeatureCollection', features: [] }
		});

		map.addSource('map-labels', {
			type: 'geojson',
			data: { type: 'FeatureCollection', features: [] }
		});
	}

	function addOutlineLayers() {
		if (!map) return;

		map.addLayer({
			id: 'map-outlines-labels',
			type: 'symbol',
			source: 'map-labels',
			layout: {
				'text-font': ['Open Sans Bold'],
				'text-field': ['to-string', ['get', 'year']],
				'text-size': 15,
				'text-allow-overlap': true
			},
			paint: {
				'text-color': '#333366aa',
				'text-halo-color': '#ffffff88',
				'text-halo-width': 1,
				'text-opacity': 0
			}
		});

		map.addLayer({
			id: 'map-outlines-fill',
			type: 'fill',
			source: 'map-outlines',
			paint: {
				'fill-color': '#ff44aa',
				'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0, 0]
			}
			// layout: { visibility: 'none' }
		});

		map.addLayer({
			id: 'map-outlines-stroke',
			type: 'line',
			source: 'map-outlines',
			paint: {
				'line-color': '#f4a',
				'line-width': 2,
				'line-opacity': 0
			}
		});
	}

	function flyToFeature(feature) {
		const { geometry, bbox } = feature;
		if(bbox) {
			const [minLng, minLat, maxLng, maxLat] = bbox;
			map?.fitBounds(
				[
					[minLng,minLat],
					[maxLng,maxLat]
				],
				{ padding: 40, maxZoom: 15, duration: 250 }
			)
		} else if(geometry?.type === "Point") {
			const [lng, lat] = geometry.coordinates;

			map?.flyTo({
				center: [lng, lat],
				zoom: 13,
				speed: 0.8,
				curve: 1.4,
				essential: true,
				duration: 250
			})
		}
	}

	async function flyToUserLocation() {
		try {
			const { lat, lng } = await getUserLocation();

			// create a pseudo-feature for your existing flyToFeature()
			const feature = {
				geometry: {
					type: "Point",
					coordinates: [lng, lat]
				},
				properties: {
					label: "Your location"
				}
			};

			flyToFeature(feature);
		} catch (err) {
			console.error("Could not get user location:", err);
			alert("Locatie kon niet worden opgehaald. Heb je toestemming gegeven?");
		}
}

	function setGridVisibility(visible = true) {
		gridVisible = visible;
		if (!maplibreLoaded) return;

		const hoverFillOpacity = visible ? 0.3 : 0;

		map.setPaintProperty('map-outlines-fill', 'fill-opacity', [
			'case',
			['boolean', ['feature-state', 'hover'], false],
			hoverFillOpacity,
			0
		]);
		map.setPaintProperty('map-outlines-stroke', 'line-opacity-transition', { duration: 300 });
		map.setPaintProperty('map-outlines-stroke', 'line-opacity', visible ? 1 : 0);
	}

	function setLabelVisibility(visible = true) {
		if (!maplibreLoaded) return;

		map.setPaintProperty('map-outlines-labels', 'text-opacity-transition', { duration: 300 });
		map.setPaintProperty('map-outlines-labels', 'text-opacity', visible ? 1 : 0);
	}

	type MapView = {
		center: [number, number],
		zoom: number,
		bearing: number,
		pitch: number
	}
	let savedMapViews: MapView[] = $state([]);

	function saveMapView() {
		savedMapViews.push({
			center: map.getCenter(),
			zoom: map.getZoom(),
			bearing: map.getBearing(),
			pitch: map.getPitch()
		});
	}

	function restoreView(options = { duration: 500 }) {
		if(savedMapViews.length === 0) return;
		const { center, zoom, bearing, pitch } = savedMapViews.pop()!;
		map.easeTo({ center, zoom, bearing, pitch, ...options });
	}

	function handleMapClick(e: any) {
		if (!map || !warpedMapLayer || !gridVisible) return;

		const feature = e.features?.[0];
		const id = feature?.properties?.id;
		selectedHistoricMap = historicMapsById.get(id) || null;
		if (!selectedHistoricMap) return;

		historicMapsById.values().forEach((m) => (m.warpedMap.visible = m.id === id));
		warpedMapLayer.bringMapsToFront([id]);
		warpedMapLayer.setMapSaturation(id, 1);
		selectedHistoricMap.warpedMap.setTransformationType('straight');
		const { width, height } = selectedHistoricMap?.warpedMap.georeferencedMap.resource;
		warpedMapLayer.setMapResourceMask(id, [
			[0, height],
			[width, height],
			[width, 0],
			[0, 0]
		]);

		setGridVisibility(false);

		saveMapView();
		const [minX, minY, maxX, maxY] = turf.bbox(selectedHistoricMap.polygon);
		map.fitBounds(
			[
				[minX, minY],
				[maxX, maxY]
			],
			{ padding: 50, speed: 2, curve: 1.8 }
		);
	}

	function handleMapMouseMove(e: any) {
		if (!map) return;
		const feature = e.features?.[0];
		if (!feature) return;

		if (hoveredFeature && hoveredFeature !== feature) {
			map.setFeatureState({ source: 'map-outlines', id: hoveredFeature.id }, { hover: false });
		}
		hoveredFeature = feature;
		map.setFeatureState({ source: 'map-outlines', id: hoveredFeature.id }, { hover: true });
	}

	function handleMapMouseLeave() {
		if (!map || !hoveredFeature) return;
		map.setFeatureState({ source: 'map-outlines', id: hoveredFeature.id }, { hover: false });
		hoveredFeature = null;
	}

	function updateViewport() {
		if (!map) return;
		const bounds = map.getBounds();
		viewportPolygon = {
			type: 'Feature',
			geometry: {
				type: 'Polygon',
				coordinates: [
					[
						[bounds.getWest(), bounds.getNorth()],
						[bounds.getEast(), bounds.getNorth()],
						[bounds.getEast(), bounds.getSouth()],
						[bounds.getWest(), bounds.getSouth()],
						[bounds.getWest(), bounds.getNorth()]
					]
				]
			},
			properties: {}
		};
	}

	function updateUrl() {
		if (!map) return;
		const center = map.getCenter();
		const zoom = map.getZoom().toFixed(2);
		const lat = center.lat.toFixed(4);
		const lon = center.lng.toFixed(4);
		const bearing = map.getBearing().toFixed(1);
		window.history.replaceState(null, '', `#/${zoom}/${lat}/${lon}/${bearing}`);
	}

	function getViewFromUrl() {
		if (window.location.hash.length < 2) return null;
		const parts = window.location.hash.substring(2).split('/');
		if (parts.length === 4) {
			return {
				zoom: parseFloat(parts[0]),
				lat: parseFloat(parts[1]),
				lng: parseFloat(parts[2]),
				bearing: parseFloat(parts[3])
			};
		}
		return null;
	}
</script>

<style>
	.polka {
		background-image:
		radial-gradient(#eef 2.5px, transparent 2.5px);
		background-size: 25px 25px; /* spacing */
		background-color: white;    /* optional */
	}
</style>

<div id={containerId} class="relative h-full w-full overflow-hidden polka"></div>

<Header {flyToFeature} {flyToUserLocation} {setGridVisibility}/>
<!-- <Search {flyToFeature}></Search> -->

<Timeline
	bind:filter
	{applyFilter}
	{historicMapsLoaded}
	{historicMapsById}
	{selectedHistoricMap}
	{setLabelVisibility}
	{getHistoricMapThumbnail}
	{map}
></Timeline>

<Minimap2
	{historicMapsById}
	{visibleHistoricMaps}
	{visibleHistoricMapsInViewport}
	{viewportPolygon}
	{hoveredHistoricMap}
	{selectedHistoricMap}
	{historicMapsLoaded}
	{getHistoricMapThumbnail}
	{getHistoricMapManifest}
></Minimap2>
<MapInfo
	{historicMapsById}
	{visibleHistoricMaps}
	{visibleHistoricMapsInViewport}
	{viewportPolygon}
	{hoveredHistoricMap}
	{selectedHistoricMap}
	{historicMapsLoaded}
	{getHistoricMapThumbnail}
	{getHistoricMapManifest}
></MapInfo>

<svelte:window
	onkeydown={(e) => {
		if (e.key == ' ') setGridVisibility(true);
	}}
	onkeyup={(e) => {
		if (e.key == ' ') setGridVisibility(false);
	}}
/>
