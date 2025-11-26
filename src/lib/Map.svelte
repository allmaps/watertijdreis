<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { WarpedMapLayer } from '@allmaps/maplibre';
	import { WarpedMap, WarpedMapEvent, WarpedMapEventType } from '@allmaps/render';
	import * as turf from '@turf/turf';

	import { SvelteMap } from 'svelte/reactivity';
	import type { GeojsonPolygon } from './types/geojson';
	import Header from './Header.svelte';
	import Minimap from './Minimap.svelte';
	import Timeline from './Timeline.svelte';
	import { getUserLocation } from '$lib/UserLocation.svelte';
	import MapInfo from './MapInfo.svelte';
	import Toast from './Toast.svelte';

	import * as pmtiles from 'pmtiles';
	import { basemapStyle } from './basemap';
	import MapButtons from './MapButtons.svelte';
	import SheetControls from './SheetControls.svelte';
	import type { GeoJsonProperties, Geometry, Feature } from 'geojson';

	type HistoricMap = {
		id: string;
		manifestId: string;
		warpedMap: WarpedMap;
		label: string;
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
	const ANNOTATION_URL = 'maps-sorted-by-edition.json';
	const MANIFEST_URL = 'https://tu-delft-heritage.github.io/watertijdreis-data/collection.json';
	let manifestCollection: any | null = $state(null);

	$effect(() => {
		fetch(MANIFEST_URL)
			.then((res) => res.json())
			.then((data) => (manifestCollection = data));
	});

	async function getEditionManifest(edition: number, bis: boolean) {
		if (!manifestCollection) return null;

		const label = `Editie ${edition}${bis ? ' BIS' : ''}`;
		const manifestUrl = manifestCollection.items.find((i: any) => i?.label?.nl?.[0] === label)?.id;

		const response = await fetch(manifestUrl);
		const result = await response.json();
		return result;
	}

	let map: maplibregl.Map | null = $state(null);
	let warpedMapLayer: WarpedMapLayer | null = $state(null);
	let maplibreLoaded: boolean = $state(false);

	$effect(() => {
		if (maplibreLoaded) console.log('maplibre loaded');
	});

	let historicMapsLoaded: boolean = $state(false);

	$effect(() => {
		if (historicMapsLoaded)
			toastContent = `<b>${historicMapsById.size}</b> historische kaarten geladen`;
	});

	let historicMapsById: Map<string, HistoricMap> = $state(new Map());
	let historicMapsByNumber: Map<number, HistoricMap[]> | undefined = $derived.by(() => {
		if (!historicMapsLoaded) return;
		const grouped = new Map<number, HistoricMap[]>();
		for (const { number, ...rest } of historicMapsById.values())
			(grouped.get(number) ?? grouped.set(number, []).get(number))!.unshift({ number, ...rest });
		return grouped;
	});

	let hoveredFeature: Feature<Geometry, GeoJsonProperties> | null = $state(null);
	let hoveredHistoricMap: HistoricMap | null = $derived.by(() => {
		if (!hoveredFeature) return null;
		return historicMapsById.get(hoveredFeature.properties?.id) || null;
	});
	let selectedHistoricMap: HistoricMap | null = $state(null);

	$effect(() => {
		if (!map) return;

		const polygons: Feature<Geometry, GeoJsonProperties>[] = visibleHistoricMaps
			.values()
			.map(
				(o, i): Feature<Geometry, GeoJsonProperties> => ({
					id: i,
					type: 'Feature',
					geometry: structuredClone(o.polygon),
					properties: { id: o.id, year: o.yearEnd }
				})
			)
			.toArray();

		const points: Feature<Geometry, GeoJsonProperties>[] = visibleHistoricMaps
			.values()
			.map(
				(o, i): Feature<Geometry, GeoJsonProperties> => ({
					id: i,
					type: 'Feature',
					geometry: turf.centerOfMass(structuredClone(o.polygon)).geometry,
					properties: { year: o.yearEnd }
				})
			)
			.toArray();

		(map.getSource('map-outlines') as maplibregl.GeoJSONSource | undefined)?.setData({
			type: 'FeatureCollection',
			features: polygons
		});

		(map.getSource('map-labels') as maplibregl.GeoJSONSource | undefined)?.setData({
			type: 'FeatureCollection',
			features: points
		});
	});

	let viewportPolygon: GeojsonPolygon | null = $state(null);

	let filter: Filter = $state({
		yearStart: 1865,
		yearEnd: 1991,
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

	let mapsInViewport = $derived.by(() => {
		if (!viewportPolygon || !warpedMapLayer) return new Map();

		const result = new Map();
		for (const id of warpedMapLayer.renderer?.mapsInViewport ?? []) {
			const map = historicMapsById.get(id);
			if (map) {
				result.set(map.id, map);
			}
		}

		return result;
	});

	$effect(() => {
		// To make sure that warpedMaps that were still loading are added to visibleHistoricMapsInViewport when the viewport isn't moving
		if (warpedMapLayer) {
			warpedMapLayer.renderer?.tileCache?.addEventListener(
				WarpedMapEventType.MAPTILELOADED,
				(e: WarpedMapEvent) => {
					const id = e.data?.mapId;
					const historicMap = historicMapsById.get(id);
					if (historicMap) visibleHistoricMapsInViewport.set(id, historicMap);
				}
			);
		}
	});

	let gridVisible: boolean = $state(false);

	function showHistoricMap(id: string) {
		const historicMap = historicMapsById.get(id);
		if (!historicMap) return;
		historicMap.warpedMap.visible = true;
		visibleHistoricMaps.set(id, historicMap);
		warpedMapLayer?.setMapSaturation(id, 1);
	}

	function hideHistoricMap(id: string) {
		const historicMap = historicMapsById.get(id);
		if (!historicMap) return;
		historicMap.warpedMap.visible = false;
		visibleHistoricMaps.delete(id);
	}

	function getHistoricMapThumbnail(id: string, size: number = 128) {
		const map = historicMapsById.get(id);
		if (!map) return '';
		return map.warpedMap?.georeferencedMap.resource.id + `/full/${size},/0/default.jpg`;
	}

	let toastContent: string = $state('');

	function applyFilter(filter: Filter) {
		if (!historicMapsByNumber) return;

		const visibleSheets: HistoricMap[] = [];
		const grayedOutSheets: HistoricMap[] = [];

		toastContent = `${filter.yearStart} - ${filter.yearEnd}`;

		historicMapsByNumber.forEach((sheets, number) => {
			let x1, y1, x2, y2;
			const firstEdYearEnd = 1894;

			for (const sheet of sheets) {
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

		toastContent = `Ingestelde periode: <b>${filter.yearStart} - ${filter.yearEnd}</b><br><b>${visibleSheets.length}</b> kaarten${grayedOutSheets.length ? `, <b>${grayedOutSheets.length}</b> kaarten buiten periode` : ''}`;
	}

	$effect(() => {
		if (maplibreLoaded) console.log(map);
	});

	type LayerOptions = {
		baseMap: 'none' | 'protomaps' | 'ahn' | 'satelliet';
		protoMapsWaterInFront: boolean;
		protomapsLabelsInFront: boolean;
	};
	let layerOptions = $state<LayerOptions>({
		baseMap: 'none',
		protoMapsWaterInFront: false,
		protomapsLabelsInFront: false
	});

	const EMPTY_STYLE = {
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
	};

	$effect(() => {
		if (!maplibreLoaded) return;

		setProtomapsVisiblity(layerOptions.baseMap === 'protomaps');
		if (layerOptions.baseMap === 'protomaps')
			setProtomapsWaterInFront(layerOptions.protoMapsWaterInFront);
		if (layerOptions.baseMap === 'protomaps')
			setProtomapsLabelsInFront(layerOptions.protomapsLabelsInFront);

		setAHNVisibility(layerOptions.baseMap === 'ahn');
		setSatellietVisibility(layerOptions.baseMap === 'satelliet');
	});

	function setProtomapsVisiblity(visible: boolean) {
		if (!maplibreLoaded) return;

		const { layers } = basemapStyle('nl');
		layers.forEach((layer) => {
			if (map!.getLayer(layer.id)) {
				map!.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none');
			}
		});
	}

	function setProtomapsWaterInFront(visible: boolean) {
		if (!maplibreLoaded) return;

		const waterLayers = ['water', 'water_stream', 'water_river'];

		waterLayers.forEach((layerId) => {
			if (map!.getLayer(layerId)) {
				map!.moveLayer(layerId, visible ? 'map-outlines-labels' : 'landuse_pedestrian');
			}
		});
	}

	function setProtomapsLabelsInFront(visible: boolean) {
		if (!maplibreLoaded) return;

		const labelLayers = [
			'address_label',
			'water_waterway_label',
			'roads_oneway',
			'roads_labels_minor',
			'water_label_ocean',
			'earth_label_islands',
			'water_label_lakes',
			'roads_shields',
			'roads_labels_major',
			'places_subplace',
			'places_region',
			'places_locality',
			'places_country'
		];

		labelLayers.forEach((layerId) => {
			if (map!.getLayer(layerId)) {
				map!.moveLayer(layerId, visible ? 'map-outlines-labels' : 'map-outlines-skeleton');
			}
		});
	}

	function setAHNVisibility(visible: boolean) {
		if (!maplibreLoaded) return;
		if (!map?.getLayer('dsm-05-layer')) return;
		map?.setLayoutProperty('dsm-05-layer', 'visibility', visible ? 'visible' : 'none');
	}

	function setSatellietVisibility(visible: boolean) {
		if (!maplibreLoaded) return;
		if (!map?.getLayer('satelliet-layer')) return;
		map.setLayoutProperty('satelliet-layer', 'visibility', visible ? 'visible' : 'none');
	}

	function initMaplibre() {
		const urlView = getViewFromUrl();
		const initialCenter = urlView ? [urlView.lng, urlView.lat] : [5, 51.75];
		const initialZoom = urlView ? urlView.zoom : 7;

		const protocol = new pmtiles.Protocol();
		maplibregl.addProtocol('pmtiles', protocol.tile);

		const style = basemapStyle('nl');
		style.layers.forEach((layer) => {
			(layer as maplibregl.LayerSpecification).layout = { visibility: 'none' };
		});

		map = new maplibregl.Map({
			container: containerId,
			style,
			center: initialCenter,
			zoom: initialZoom,
			minZoom: 5.5,
			maxZoom: 16,
			maxPitch: 0,
			minPitch: 0,
			maxBounds: [
				[-12, 47],
				[22, 57]
			],
			bearing: 0,
			dragRotate: false,
			touchPitch: false,
			preserveDrawingBuffer: true
		});
		map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

		// map.on('idle', () => map?.triggerRepaint()); // TODO: weghalen!!
		map.on('load', async () => {
			maplibreLoaded = true;

			addBackgroundLayers();
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

		map.addLayer(
			{
				id: 'map-outlines-skeleton',
				type: 'fill',
				source: 'map-outlines',
				paint: { 'fill-color': '#eef' }
			},
			'warped-map-layer'
		);

		map.addLayer({
			id: 'map-outlines-labels',
			type: 'symbol',
			source: 'map-labels',
			layout: {
				'text-font': ['literal', ['Roboto Regular']],
				'text-field': ['to-string', ['get', 'year']],
				'text-size': 15,
				'text-allow-overlap': true
			},
			paint: {
				'text-color': '#333366aa',
				'text-halo-color': '#ff44aa44',
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
				'line-width': 1.5,
				'line-opacity': 0
			}
		});
	}

	function addBackgroundLayers() {
		if (!map) return;

		map.addSource('dsm-05', {
			type: 'raster',
			tiles: [
				'https://service.pdok.nl/rws/ahn/wms/v1_0?REQUEST=GetMap&SERVICE=WMS&VERSION=1.3.0&FORMAT=image/png&STYLES=&TRANSPARENT=TRUE&LAYERS=dsm_05m&TILED=true&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}'
			],
			tileSize: 256
		});
		map.addLayer({
			id: 'dsm-05-layer',
			type: 'raster',
			source: 'dsm-05',
			layout: {
				visibility: 'none'
			},
			paint: {}
		});

		map.addSource('satelliet', {
			type: 'raster',
			tiles: [
				'https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0?service=WMS&version=1.1.1&request=GetMap&layers=Actueel_ortho25&styles=&format=image/jpeg&transparent=true&height=256&width=256&srs=EPSG:3857&bbox={bbox-epsg-3857}'
			],
			tileSize: 256,
			scheme: 'tms',
			minzoom: 6,
			maxzoom: 20,
			attribution: 'PDOK'
		});

		map.addLayer({
			id: 'satelliet-layer',
			type: 'raster',
			source: 'satelliet',
			layout: {
				visibility: 'none'
			},
			paint: {}
		});
	}

	function flyToFeature(feature) {
		const { geometry, bbox } = feature;
		if (bbox) {
			const [minLng, minLat, maxLng, maxLat] = bbox;
			map?.fitBounds(
				[
					[minLng, minLat],
					[maxLng, maxLat]
				],
				{ padding: 40, maxZoom: 15, duration: 250 }
			);
		} else if (geometry?.type === 'Point') {
			const [lng, lat] = geometry.coordinates;

			map?.flyTo({
				center: [lng, lat],
				zoom: 13,
				speed: 0.8,
				curve: 1.4,
				essential: true,
				duration: 250
			});
		}
	}

	async function flyToUserLocation() {
		try {
			const { lat, lng } = await getUserLocation();

			// create a pseudo-feature for your existing flyToFeature()
			const feature = {
				geometry: {
					type: 'Point',
					coordinates: [lng, lat]
				},
				properties: {
					label: 'Your location'
				}
			};

			flyToFeature(feature);
		} catch (err) {
			console.error('Could not get user location:', err);
			alert('Locatie kon niet worden opgehaald. Heb je toestemming gegeven?');
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
		center: [number, number];
		zoom: number;
		bearing: number;
		pitch: number;
	};
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
		if (savedMapViews.length === 0 || !map) return;
		const { center, zoom, bearing, pitch } = savedMapViews.pop()!;
		map.easeTo({ center, zoom, bearing, pitch, ...options });

		map.setLayoutProperty('map-outlines-skeleton', 'visibility', 'visible');

		applyFilter(filter);

		if (selectedHistoricMap) {
			selectedHistoricMap.warpedMap.setTransformationType('thinPlateSpline');
			warpedMapLayer?.setMapResourceMask(
				selectedHistoricMap?.id,
				selectedHistoricMap?.warpedMap.resourcePreviousMask
			);
			selectedHistoricMap = null;
		}
	}

	function changeHistoricMapView(historicMap: HistoricMap) {
		if (!selectedHistoricMap || !warpedMapLayer || !map) return;

		selectedHistoricMap.warpedMap.visible = false;
		selectedHistoricMap.warpedMap.setTransformationType('thinPlateSpline');
		warpedMapLayer?.setMapResourceMask(
			selectedHistoricMap?.id,
			selectedHistoricMap?.warpedMap.resourcePreviousMask
		);

		historicMap.warpedMap.visible = true;
		historicMap.warpedMap.setTransformationType('straight');
		warpedMapLayer.setMapSaturation(historicMap.id, 1);

		const { width, height } = historicMap.warpedMap.georeferencedMap.resource;
		warpedMapLayer.setMapResourceMask(historicMap.id, [
			[0, height],
			[width, height],
			[width, 0],
			[0, 0]
		]);

		const [minX, minY, maxX, maxY] = turf.bbox(historicMap.warpedMap.geoFullMask);
		map.fitBounds(
			[
				[minX, minY],
				[maxX, maxY]
			],
			{ padding: 50, animate: false }
		);

		selectedHistoricMap = historicMap;
	}

	function setHistoricMapView(historicMap: HistoricMap) {
		if (!map || !warpedMapLayer) return;
		const { id } = historicMap;
		historicMap.warpedMap.visible = true;
		console.log('setHistoricMapView', historicMap);
		historicMap.warpedMap.setTransformationType('straight');
		historicMapsById.values().forEach((m) => (m.warpedMap.visible = m.id == id));
		warpedMapLayer.setMapSaturation(id, 1);

		map.setLayoutProperty('map-outlines-skeleton', 'visibility', 'none');

		const { width, height } = historicMap.warpedMap.georeferencedMap.resource;
		warpedMapLayer.setMapResourceMask(id, [
			[0, height],
			[width, height],
			[width, 0],
			[0, 0]
		]);

		saveMapView();
		const [minX, minY, maxX, maxY] = turf.bbox(historicMap.warpedMap.geoFullMask);
		map.fitBounds(
			[
				[minX, minY],
				[maxX, maxY]
			],
			{ padding: 50, speed: 2, curve: 1.8 }
		);
	}

	function handleMapClick(e: any) {
		if (!map || !warpedMapLayer) return;

		const feature = e.features?.[0];
		const id = feature?.properties?.id;
		if (gridVisible) {
			selectedHistoricMap = historicMapsById.get(id) || null;
			if (!selectedHistoricMap) return;
			setHistoricMapView(selectedHistoricMap);

			addEventListener('keydown', (e) => {
				if (e.key == 'Escape') restoreView();
			});
		}
	}

	function handleMapMouseMove(e: any) {
		if (!map) return;
		const feature = e.features?.[0];
		if (!feature) return;

		if (hoveredFeature && hoveredFeature !== feature) {
			map.setFeatureState({ source: 'map-outlines', id: hoveredFeature?.id }, { hover: false });
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

		const period = `${filter.yearStart}-${filter.yearEnd}`;
		const center = map.getCenter();
		const zoom = map.getZoom().toFixed(2);
		const lat = center.lat.toFixed(4);
		const lon = center.lng.toFixed(4);
		window.history.replaceState(null, '', `#/${zoom}/${lat}/${lon}/${period}`);
	}

	function getViewFromUrl() {
		if (window.location.hash.length < 2) return null;
		const parts = window.location.hash.substring(2).split('/');
		if (parts.length === 4) {
			return {
				zoom: parseFloat(parts[0]),
				lat: parseFloat(parts[1]),
				lng: parseFloat(parts[2]),
				period: parseFloat(parts[3])
			};
		}
		return null;
	}

	function zoomIn() {
		if (!map) return;
		map.zoomIn({ duration: 250 });
	}

	function zoomOut() {
		if (!map) return;
		map.zoomOut({ duration: 250 });
	}

	$effect(() => {
		// TODO: moet anders kunnen
		if (!maplibreLoaded) return;
		const offset = selectedHistoricMap ? 20 : 140;
		const bottomLeft = document.querySelector('.maplibregl-ctrl-bottom-left');
		const bottomRight = document.querySelector('.maplibregl-ctrl-bottom-right');
		if (bottomLeft) bottomLeft.style.setProperty('bottom', offset + 'px', 'important');
		if (bottomRight) bottomRight.style.setProperty('bottom', offset + 'px', 'important');
	});

	$effect(() => {
		if (selectedHistoricMap) {
			map?.triggerRepaint();
		}
	});
</script>

<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@3.4.0/dist/maplibre-gl.css" />

<div
	id={containerId}
	class="polka relative h-full w-full overflow-hidden bg-size-[25px_25px]"
	style={`background-color: ${selectedHistoricMap ? '#fffaff' : '#fafaff'}; background-image: radial-gradient(${selectedHistoricMap ? '#fef' : '#eef'} 2.5px, transparent 2.5px)`}
></div>

<Toast content={toastContent}></Toast>

<MapButtons
	visible={!selectedHistoricMap}
	{flyToFeature}
	{flyToUserLocation}
	{setGridVisibility}
	{zoomIn}
	{zoomOut}
	{layerOptions}
/>
<Header />

<Timeline
	bind:filter
	{applyFilter}
	{historicMapsLoaded}
	{historicMapsById}
	{selectedHistoricMap}
	{mapsInViewport}
	{setLabelVisibility}
	{getHistoricMapThumbnail}
	{map}
></Timeline>

<SheetControls {visibleHistoricMaps} {selectedHistoricMap} {changeHistoricMapView}></SheetControls>

<Minimap
	{historicMapsById}
	{visibleHistoricMaps}
	{visibleHistoricMapsInViewport}
	{viewportPolygon}
	{hoveredHistoricMap}
	{selectedHistoricMap}
	{historicMapsLoaded}
	{getHistoricMapThumbnail}
	{restoreView}
></Minimap>
<MapInfo
	{historicMapsById}
	{visibleHistoricMaps}
	{visibleHistoricMapsInViewport}
	{viewportPolygon}
	{hoveredHistoricMap}
	{selectedHistoricMap}
	{historicMapsLoaded}
	{changeHistoricMapView}
	{getHistoricMapThumbnail}
	{getEditionManifest}
></MapInfo>

<svelte:window
	onkeydown={(e) => {
		if (e.key == ' ') setGridVisibility(true);
	}}
	onkeyup={(e) => {
		if (e.key == ' ') setGridVisibility(false);
	}}
	onkeypress={(e) => {
		if (e.key.toLowerCase() == 'w' && layerOptions.baseMap == 'protomaps') {
			layerOptions.protoMapsWaterInFront = !layerOptions.protoMapsWaterInFront;
		}
	}}
/>
