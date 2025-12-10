<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import * as turf from '@turf/turf';
	import * as pmtiles from 'pmtiles';
	import { WarpedMapLayer, WarpedMapEvent, WarpedMapEventType } from '@allmaps/maplibre';

	import { SvelteMap } from 'svelte/reactivity';

	import Header from './Header.svelte';
	import Minimap from './Minimap.svelte';
	import Timeline from './Timeline.svelte';
	import MapInfo from './MapInfo.svelte';
	import Toast from './Toast.svelte';
	import Timeline2 from './Timeline2.svelte';
	import MapSheetToggle from './MapSheetToggle.svelte';
	import MapButtons from './MapButtons.svelte';
	// import SheetControls from './SheetControls.svelte';
	import { getUserLocation } from '$lib/UserLocation.svelte';
	import { basemapStyle } from './basemap';

	import { mousePosition } from './mousePosition.svelte';

	import type { GeoJsonProperties, Geometry, Feature } from 'geojson';
	import type { HistoricMap } from './types/historicmap';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	import { SpriteSheet } from './getMapThumbnailFromSpriteSheet.svelte';

	let spriteSheet = null;
	let spriteSheetLoaded = false;
	let specialSpriteSheet = null;
	let specialSpriteSheetLoaded = false;
	$effect(() => {
		spriteSheet = new SpriteSheet(
			'./sprites/regular-sheets-128.json',
			'./sprites/regular-sheets-128.jpg'
		);
		spriteSheet.init().then(() => (spriteSheetLoaded = true));
		specialSpriteSheet = new SpriteSheet(
			'./sprites/special-sheets-128.json',
			'./sprites/special-sheets-128.jpg'
		);
		specialSpriteSheet.init().then(() => (specialSpriteSheetLoaded = true));
	});

	const containerId = 'map-container';
	const ANNOTATION_URL = 'maps-sorted-by-edition.json';

	let map: maplibregl.Map | null = $state(null);
	let warpedMapLayer: WarpedMapLayer | null = $state(null);
	let maplibreLoaded: boolean = $state(false);
	let userLocationActive: boolean = $state(false);
	let userLocationTimeout: ReturnType<typeof setTimeout> | null = null;

	onMount(() => {
		if (!map) initMaplibre();
	});

	onMount(() => {
		document.addEventListener('pointermove', (e) => {
			mousePosition.x = e.x;
			mousePosition.y = e.y;
		});
	});

	$effect(() => {
		if (maplibreLoaded) console.log('maplibre geladen: ', map);
	});

	$effect(() => {
		if (historicMapsLoaded) console.log('historische kaarten geladen: ', warpedMapLayer);
	});

	let historicMapsLoaded: boolean = $state(false);
	let historicMapsById: Map<string, HistoricMap> = $state(new SvelteMap());
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
	let clickedFeature: Feature<Geometry, GeoJsonProperties> | null = $state(null);
	let clickedHistoricMap = $derived.by(() => {
		if (!clickedFeature) return null;
		return historicMapsById.get(clickedFeature.properties?.id) || null;
	});
	let pinnedHistoricMap: HistoricMap | null = $state(null);
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
					properties: { id: o.id }
				})
			)
			.map((f) => {
				const h = 44;
				const s = 46 + Math.floor(Math.random() * 10);
				const l = 90 + Math.floor(Math.random() * 5);

				f.properties!.skeletonColor = `hsl(${h}, ${s}%, ${l}%)`;
				return f;
			})
			.toArray();

		const points: Feature<Geometry, GeoJsonProperties>[] = visibleHistoricMaps
			.values()
			.map(
				(o, i): Feature<Geometry, GeoJsonProperties> => ({
					id: i,
					type: 'Feature',
					geometry: turf.centerOfMass(structuredClone(o.polygon)).geometry,
					properties: { year: o.yearEnd, num: o.number + '.' + o.position }
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

	type Filter = {
		yearStart: number;
		yearEnd: number;
		edition: 'All' | 1 | 2 | 3 | 4 | 5;
		bis: boolean;
		type: undefined | 'WVE' | 'HWP';
	};

	let filter: Filter = $state({
		yearStart: 1865,
		yearEnd: 1983,
		edition: 'All',
		bis: false,
		type: undefined
	});

	let visibleHistoricMaps: SvelteMap<string, HistoricMap> = new SvelteMap();
	let mapsInViewport: SvelteMap<string, HistoricMap> = new SvelteMap();
	let visibleHistoricMapsInViewport: SvelteMap<string, HistoricMap> = new SvelteMap();

	setInterval(() => {
		if (!historicMapsLoaded) return;

		const reference = warpedMapLayer?.renderer?.mapsInViewport;
		if (!reference) return;

		for (const id of mapsInViewport.keys()) {
			if (!reference.has(id)) mapsInViewport.delete(id);
		}

		for (const id of visibleHistoricMapsInViewport.keys()) {
			if (!reference.has(id) || !visibleHistoricMaps.has(id)) {
				visibleHistoricMapsInViewport.delete(id);
			}
		}

		for (const id of reference) {
			if (!mapsInViewport.has(id)) mapsInViewport.set(id, historicMapsById.get(id));

			if (!visibleHistoricMapsInViewport.has(id) && visibleHistoricMaps.has(id))
				visibleHistoricMapsInViewport.set(id, historicMapsById.get(id));
		}
	}, 100);

	$effect(() => {
		// To make sure that warpedMaps that were still loading are added to visibleHistoricMapsInViewport when the viewport isn't moving
		if (warpedMapLayer) {
			warpedMapLayer.renderer?.tileCache?.addEventListener(
				WarpedMapEventType.MAPTILELOADED,
				(e: WarpedMapEvent) => {
					const id = e.data?.mapId;
					const historicMap = historicMapsById.get(id);
					if (historicMap && warpedMapLayer?.renderer?.mapsInViewport.has(historicMap.id))
						visibleHistoricMapsInViewport.set(id, historicMap);
				}
			);
		}
	});

	let gridVisible: boolean = $state(false);

	async function getHistoricMapThumbnail(id) {
		id = id.replace('-b', '');
		if (specialSpriteSheet.has(id)) return specialSpriteSheet.getThumbnailUrl(id);
		return spriteSheet.getThumbnailUrl(id);

		const warpedMap = warpedMapLayer?.getWarpedMap(id);
		if (!map) return '';
		return warpedMap?.georeferencedMap.resource.id + `/full/${size},/0/default.jpg`;
	}

	let toastContent: string = $state('');

	function applyFilter(filter: Filter) {
		if (!historicMapsByNumber) return;

		const mapsToColor: string[] = [];
		const mapsToDesaturate: string[] = [];

		historicMapsByNumber.forEach((sheets) => {
			let x1, y1, x2, y2;
			const firstEdYearEnd = 1894;

			for (const sheet of sheets) {
				const { x, y, yearEnd: year, edition, bis, type, id } = sheet;
				const maxYearFilter = filter.yearEnd > firstEdYearEnd ? filter.yearEnd : firstEdYearEnd;
				const periodFilter = filter.edition !== 'All' || year <= maxYearFilter;
				const editionFilter = filter.edition === 'All' || edition === filter.edition;
				const typeFilter = filter.type ? type === filter.type : !type;
				const bisFilter = filter.bis === true || !bis;
				const inScope = periodFilter && editionFilter && typeFilter && bisFilter;
				if (!inScope) continue;

				const stack =
					year >= filter.yearStart && year <= filter.yearEnd ? mapsToColor : mapsToDesaturate;

				if (x1 === undefined) {
					// Get first sheet
					stack.push(id);
					[x1, y1] = [x, y];
					// Stop if no other sheets
					if (!x1 && !y1) break;
				} else if (y1 && x === x1 && y === -y1) {
					// Get optional North or South sheet
					stack.push(id);
					y1 = 0;
					// Stop if no East or West sheets
					if (!x1) break;
				} else if (x1 && !x2 && x === -x1) {
					// Get first East or West sheet
					stack.push(id);
					[x2, y2] = [x, y];
					// Stop if no more North or South sheets
					if (!y1 && !y) break;
				} else if (y2 && x === x2 && y === -y2) {
					// Get optional second East or West sheet
					stack.push(id);
					y2 = 0;
					// Stop if no more North or South sheet
					if (!y1) break;
				}
			}
		});

		const mapsToShow = mapsToColor.concat(mapsToDesaturate);
		const visibleHistoricMapIds = visibleHistoricMaps.keys().toArray();

		const mapsToHide = visibleHistoricMapIds.filter((id) => !mapsToShow.includes(id));
		const mapsToAdd = mapsToShow.filter((id) => !visibleHistoricMapIds.includes(id));

		const mapOptionsByMapId = new Map();

		const defaultOptions = {
			applyMask: true,
			transformationType: 'thinPlateSpline',
			saturation: 1
		};

		mapsToColor.forEach((id) =>
			mapOptionsByMapId.set(id, {
				...defaultOptions,
				visible: true
			})
		);
		mapsToHide.forEach((id) =>
			mapOptionsByMapId.set(id, {
				...defaultOptions,
				visible: false
			})
		);
		mapsToDesaturate.forEach((id) =>
			mapOptionsByMapId.set(id, {
				...defaultOptions,
				visible: true,
				saturation: 0
			})
		);

		warpedMapLayer?.setMapsOptionsByMapId(mapOptionsByMapId);

		mapsToHide.forEach((id) => visibleHistoricMaps.delete(id));
		mapsToAdd.forEach((id) => {
			const historicMap = historicMapsById.get(id);
			if (historicMap) {
				visibleHistoricMaps.set(id, historicMap);
			}
		});

		toastContent = `Je ziet nu kaarten van <i class="font-[700]">${Math.round(filter.yearEnd)}</i> en ouder`;
	}

	type LayerOptions = {
		baseMap: 'none' | 'protomaps' | 'ahn' | 'satelliet';
		protoMapsWaterInFront: boolean;
		protomapsLabelsInFront: boolean;
		historicMapsOpacity: number;
		overlay: 'none' | 'waterschapsgrenzen' | 'gemeentegrenzen';
	};
	let layerOptions = $state<LayerOptions>({
		baseMap: 'none',
		protoMapsWaterInFront: false,
		protomapsLabelsInFront: false,
		historicMapsOpacity: 100,
		overlay: 'none'
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
		if (!maplibreLoaded || selectedHistoricMap) return;

		setProtomapsVisiblity(layerOptions.baseMap === 'protomaps');
		if (layerOptions.baseMap === 'protomaps')
			setProtomapsWaterInFront(layerOptions.protoMapsWaterInFront);
		if (layerOptions.baseMap === 'protomaps')
			setProtomapsLabelsInFront(layerOptions.protomapsLabelsInFront);

		setAHNVisibility(layerOptions.baseMap === 'ahn');
		setSatellietVisibility(layerOptions.baseMap === 'satelliet');

		if (warpedMapLayer)
			warpedMapLayer.setLayerOptions({
				opacity: layerOptions.historicMapsOpacity / 100
			});

		if (map && map.getLayer('map-outlines-skeleton')) {
			const visibility = layerOptions.historicMapsOpacity < 100 ? 'none' : 'visible';
			map.setLayoutProperty('map-outlines-skeleton', 'visibility', visibility);
		}
	});

	$effect(() => {
		if (!maplibreLoaded) return;

		const all = ['overlay-waterschapsgrenzen', 'overlay-gemeentegrenzen'];
		all.forEach((id) => {
			if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
		});

		if (layerOptions.overlay === 'waterschapsgrenzen') {
			map.setLayoutProperty('overlay-waterschapsgrenzen', 'visibility', 'visible');
		}
		if (layerOptions.overlay === 'gemeentegrenzen') {
			map.setLayoutProperty('overlay-gemeentegrenzen', 'visibility', 'visible');
		}
		// if (layerOptions.overlay === 'dijken') {
		// 	map.setLayoutProperty('overlay-dijken', 'visibility', 'visible');
	});

	function setProtomapsVisiblity(visible: boolean) {
		if (!maplibreLoaded) return;

		const layers = map?.getStyle().layers || [];
		layers.forEach((layer) => {
			// Todo: fix ts error
			if (layer.source === 'protomaps' || layer.type === 'background') {
				map?.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none');
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
			'waterway_label',
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
			'places_country',
			'city_label'
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
		const urlParams = parseURL();

		const initialCenter = [urlParams.lng, urlParams.lat];
		const initialZoom = urlParams.zoom;

		filter.yearStart = urlParams.yearStart;
		filter.yearEnd = urlParams.yearEnd;
		filter.edition = urlParams.edition;
		filter.bis = urlParams.bis;
		filter.type = urlParams.type;

		const protocol = new pmtiles.Protocol();
		maplibregl.addProtocol('pmtiles', protocol.tile);

		const style = basemapStyle('nl');
		style.layers.forEach((layer) => {
			layer.layout = {
				...layer.layout,
				visibility: 'none'
			};
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
			touchRotate: false,
			attributionControl: false,
			preserveDrawingBuffer: true
		});
		map.dragRotate.disable();
		map.keyboard.disable();
		map.touchZoomRotate.disableRotation();
		map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

		const canvas = map.getCanvas();
		if (canvas) {
			canvas.removeAttribute('tabindex');
		}

		map.on('load', async () => {
			maplibreLoaded = true;

			addBackgroundLayers();
			warpedMapLayer = new WarpedMapLayer();
			map.addLayer(warpedMapLayer);
			addOverlayLayers();
			warpedMapLayer.setLayerOptions({ visible: false });
			warpedMapLayer.getWarpedMapList().options.animatedOptions.push('opacity');

			map.addSource('user-location', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			map.addLayer({
				id: 'user-location',
				type: 'circle',
				source: 'user-location',
				paint: {
					'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 6, 22, 20],
					'circle-color': '#f4a',
					'circle-opacity': 0,
					'circle-stroke-color': '#ffffff',
					'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 0, 0, 22, 6],
					'circle-stroke-opacity': 0,

					'circle-opacity-transition': { duration: 400 },
					'circle-radius-transition': { duration: 400 },
					'circle-stroke-width-transition': { duration: 700 },
					'circle-stroke-opacity-transition': { duration: 400 }
				}
			});
			await loadHistoricMaps(ANNOTATION_URL);
			addOutlineLayers();

			map.on('move', updateViewport);
			updateViewport();
			map.on('moveend', updateURL);
			map.on('mousemove', 'map-outlines-fill', handleMapMouseMove);
			map.on('mouseleave', 'map-outlines-fill', handleMapMouseLeave);

			if (urlParams && urlParams.baseMap) layerOptions.baseMap = urlParams.baseMap;
			if (urlParams && urlParams.protoMapsWaterInFront)
				layerOptions.protoMapsWaterInFront = urlParams.protoMapsWaterInFront;
			if (urlParams && urlParams.protoMapsLabelsInFront)
				layerOptions.protoMapsLabelsInFront = urlParams.protoMapsLabelsInFront;
			layerOptions.historicMapsOpacity = urlParams.historicMapsOpacity;

			setTimeout(() => {
				if (urlParams.selectedSheetId) {
					const historicMap = historicMapsById.get(urlParams.selectedSheetId);
					if (historicMap) setHistoricMapView(historicMap);
				}

				if (urlParams.pinnedSheetId) {
					const historicMap = historicMapsById.get(urlParams.pinnedSheetId);
					if (historicMap) pinnedHistoricMap = historicMap;
				}
			}, 500);
		});
	}

	function getInfoJson(map) {
		const { id, width, height, tiles } = map.resource;
		return {
			'@context': 'http://iiif.io/api/image/2/context.json',
			'@id': id,
			profile: 'http://iiif.io/api/image/2/level2.json',
			protocol: 'http://iiif.io/api/image',
			width,
			height,
			tiles
		};
	}

	async function loadHistoricMaps(url) {
		if (!map || !warpedMapLayer) return;

		const res = await fetch(url);
		const data = await res.json();

		map.on('maptilesloadedfromsprites', () => {
			historicMapsLoaded = true;
			applyFilter(filter);
		});

		const imageInfos = data.map(getInfoJson);
		warpedMapLayer.addImageInfos(imageInfos);

		const loadPromises = data.map(async (item) => {
			const id = await warpedMapLayer.addGeoreferencedMap(item);
			const warpedMap = warpedMapLayer.getWarpedMap(id);
			const coordinates = [warpedMap?.geoMask.concat([warpedMap?.geoMask[0]])];
			const historicMap: HistoricMap = {
				id,
				manifestId: item.resource.partOf[0].id,
				polygon: {
					type: 'Polygon',
					coordinates
				},
				geoFullMaskBbox: warpedMap?.geoFullMaskBbox,
				...item._meta
			};
			historicMapsById.set(id, historicMap);
		});

		await Promise.all(loadPromises);

		const spriteJson = await fetch('/sprites/regular-sheets-128.json').then((resp) => resp.json());
		warpedMapLayer.addSprites(
			spriteJson,
			window.location.origin + '/sprites/regular-sheets-128.jpg',
			[3072, 3078]
		);

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
				paint: { 'fill-color': ['get', 'skeletonColor'] }
			},
			'warped-map-layer'
		);

		map.addLayer({
			id: 'map-outlines-labels',
			type: 'symbol',
			source: 'map-labels',
			layout: {
				'text-font': ['literal', ['Metropolis Bold']],
				'text-field': ['to-string', ['get', 'year']],
				'text-size': [
					'interpolate',
					['exponential', 1.2],
					['zoom'],
					5,
					6,
					6,
					9,
					7,
					12,
					8,
					15,
					9,
					17,
					10,
					18,
					12,
					22,
					14,
					26,
					15,
					28,
					20,
					28
				],
				'text-allow-overlap': true
			},
			paint: {
				'text-color': '#65e',
				'text-halo-color': '#eeeeff',
				'text-halo-width': 1,
				'text-opacity': 0
			}
		});

		map.addLayer({
			id: 'map-outlines-numbers',
			type: 'symbol',
			source: 'map-labels',
			layout: {
				'text-font': ['literal', ['Metropolis Bold']],
				'text-field': ['to-string', ['get', 'num']],
				'text-size': [
					'interpolate',
					['exponential', 1.2],
					['zoom'],
					5,
					6,
					6,
					9,
					7,
					12,
					8,
					15,
					9,
					17,
					10,
					18,
					12,
					22,
					14,
					26,
					15,
					28,
					20,
					28
				],
				'text-allow-overlap': true
			},
			paint: {
				'text-color': '#65e',
				'text-halo-color': '#eeeeff',
				'text-halo-width': 1,
				'text-opacity-transition': { duration: 1000 },
				'text-opacity': 0
			}
		});

		map.addLayer({
			id: 'map-outlines-fill',
			type: 'fill',
			source: 'map-outlines',
			paint: {
				'fill-color': '#f4a',
				'fill-opacity': ['coalesce', ['feature-state', 'animated-fill-opacity'], 0]
			}
		});

		map.addLayer({
			id: 'map-outlines-stroke',
			type: 'line',
			source: 'map-outlines',
			paint: {
				'line-color': '#f4a',
				'line-width': 1.5,
				'line-opacity': ['coalesce', ['feature-state', 'animated-stroke-opacity'], 0]
			}
		});

		let gridResetTimer = null;
		let currentFillId = null;
		let fillFadeOutTimer = null;
		const activeAnimations = {};
		const featureTimeouts = {};

		map.doubleClickZoom.disable();

		map.on('click', 'map-outlines-fill', (e) => {
			const clickedLngLat = e.lngLat;
			const feature = e.features?.[0];
			const featureId = feature?.id;
			const mapId = feature?.properties?.id;

			setGridVisibility(true, clickedLngLat);

			if (gridResetTimer) clearTimeout(gridResetTimer);
			gridResetTimer = setTimeout(() => {
				setGridVisibility(false, clickedLngLat);
			}, 1500);

			if (feature) {
				map!.flyTo({
					center: clickedLngLat,
					speed: 0.5,
					curve: 1,
					essential: true
				});
			}

			if (clickedFeature && clickedFeature.properties?.id === mapId) {
				if (mapId) setHistoricMapView(historicMapsById.get(mapId));
			}

			clickedFeature = feature;

			if (featureId !== undefined) {
				// A: Clicked a NEW polygon while an OLD one was still active
				if (currentFillId !== null && currentFillId !== featureId) {
					if (fillFadeOutTimer) clearTimeout(fillFadeOutTimer);
					animateFeatureOpacity(currentFillId, 'animated-fill-opacity', 0, 50);
				}

				// B: NEW polygon
				if (currentFillId !== featureId) {
					currentFillId = featureId;

					animateFeatureOpacity(featureId, 'animated-fill-opacity', 0.25, 300, () => {
						fillFadeOutTimer = setTimeout(() => {
							if (currentFillId === featureId) {
								animateFeatureOpacity(featureId, 'animated-fill-opacity', 0, 500);
								currentFillId = null;
							}
						}, 1000);
					});

					if (clickedMapTimeout) clearTimeout(clickedMapTimeout);
					clickedMapTimeout = setTimeout(() => (clickedFeature = null), 2500);
				}
			}
		});
	}

	const activeAnimations = {};
	const featureTimeouts = {};
	let gridResetTimer = null;
	let currentFillId = null;
	let clickedMapTimeout = null;

	function extendClickedMapTimeout(delay = 2500) {
		if (!clickedMapTimeout) return;
		clearTimeout(clickedMapTimeout);
		clickedMapTimeout = setTimeout(() => (clickedFeature = null), delay);
	}

	function setGridVisibility(
		isVisible,
		centerLngLat = { lng: 5.63, lat: 52.16 },
		rippleScale = 3,
		speed = 300
	) {
		const source = map.getSource('map-outlines');
		if (!source || !source._data) return;
		const allFeatures = source._data.features;

		setTimeout(() => (gridVisible = isVisible), 100);

		if (isVisible && gridResetTimer) {
			clearTimeout(gridResetTimer);
			gridResetTimer = null;
		}

		const hoverFillOpacity = isVisible ? 0.1 : 0;

		map.setPaintProperty('map-outlines-fill', 'fill-opacity', [
			'max',
			['coalesce', ['feature-state', 'animated-fill-opacity'], 0],
			['case', ['boolean', ['feature-state', 'hover'], false], hoverFillOpacity, 0]
		]);

		allFeatures.forEach((feature) => {
			const id = feature.id;
			if (id === undefined) return;

			if (featureTimeouts[id]) {
				clearTimeout(featureTimeouts[id]);
				delete featureTimeouts[id];
			}

			if (!isVisible) {
				animateFeatureOpacity(id, 'animated-stroke-opacity', 0, 500);
				return;
			}

			const [x, y] = feature.geometry.coordinates[0][0];
			const dx = centerLngLat.lng - x;
			const dy = centerLngLat.lat - y;
			const distance = Math.sqrt(dx ** 2 + dy ** 2);

			const delay = distance * speed;
			const targetOpacity = Math.max(0, 0.5 - distance / rippleScale);

			featureTimeouts[id] = setTimeout(() => {
				animateFeatureOpacity(id, 'animated-stroke-opacity', targetOpacity, 500);
				delete featureTimeouts[id];
			}, delay);
		});
	}

	function animateFeatureOpacity(id, prop, endVal, duration, callback) {
		const animKey = `${id}-${prop}`;

		if (activeAnimations[animKey]) {
			cancelAnimationFrame(activeAnimations[animKey]);
		}

		const startTime = performance.now();

		const currentState = map.getFeatureState({ source: 'map-outlines', id: id });
		const startVal = currentState?.[prop] !== undefined ? currentState[prop] : 0;

		if (Math.abs(startVal - endVal) < 0.01) {
			delete activeAnimations[animKey];
			if (callback) callback();
			return;
		}

		function frame(currentTime) {
			const elapsed = currentTime - startTime;
			let progress = elapsed / duration;
			if (progress > 1) progress = 1;

			const currentVal = startVal + (endVal - startVal) * progress;

			map.setFeatureState({ source: 'map-outlines', id }, { [prop]: currentVal });

			if (progress < 1) {
				activeAnimations[animKey] = requestAnimationFrame(frame);
			} else {
				delete activeAnimations[animKey];
				if (callback) callback();
			}
		}

		activeAnimations[animKey] = requestAnimationFrame(frame);
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

	function addOverlayLayers() {
		if (!map) return;

		map.addSource('pdok-waterschapsgrenzen', {
			type: 'raster',
			tiles: [
				'https://service.pdok.nl/hwh/waterschappen-waterschapsgrenzen-imso/wms/v2_0?' +
					'SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0' +
					'&LAYERS=waterschap' +
					'&STYLES=' +
					'&FORMAT=image/png' +
					'&TRANSPARENT=true' +
					'&CRS=EPSG:3857' +
					'&WIDTH=256&HEIGHT=256' +
					'&BBOX={bbox-epsg-3857}'
			],
			tileSize: 256
		});

		map.addSource('pdok-gemeentegrenzen', {
			type: 'geojson',
			data: 'https://service.pdok.nl/kadaster/bestuurlijkegebieden/wfs/v1_0?service=WFS&version=2.0.0&request=GetFeature&typeName=Gemeentegebied&outputFormat=application/json&srsName=EPSG:4326'
		});

		map.addLayer({
			id: 'overlay-waterschapsgrenzen',
			type: 'raster',
			source: 'pdok-waterschapsgrenzen',
			layout: { visibility: 'none' }
		});

		map.addLayer({
			id: 'overlay-gemeentegrenzen',
			type: 'line',
			source: 'pdok-gemeentegrenzen',
			layout: { visibility: 'none' },
			paint: {
				'line-color': '#336',
				'line-width': 2,
				'line-opacity': 0.8
			}
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

	async function getFallbackIPLocation() {
		const res = await fetch('https://ipapi.co/json/');
		const data = await res.json();
		return { lat: data.latitude, lng: data.longitude };
	}

	function isInNL(lat, lng) {
		const NL_BBOX = {
			minLat: 50.5,
			maxLat: 53.7,
			minLng: 3.0,
			maxLng: 7.5
		};

		return (
			lat >= NL_BBOX.minLat &&
			lat <= NL_BBOX.maxLat &&
			lng >= NL_BBOX.minLng &&
			lng <= NL_BBOX.maxLng
		);
	}

	async function flyToUserLocation() {
		try {
			const loc = await getUserLocation().catch(async () => {
				return await getFallbackIPLocation();
			});

			const { lat, lng } = loc;

			if (!isInNL(lat, lng)) {
				alert('Je bent te ver buiten Nederland!');
				return;
			}

			if (map) {
				const source = map.getSource('user-location') as maplibregl.GeoJSONSource;
				if (source) {
					source.setData({
						type: 'FeatureCollection',
						features: [
							{
								type: 'Feature',
								geometry: {
									type: 'Point',
									coordinates: [lng, lat]
								},
								properties: {}
							}
						]
					});

					map.setPaintProperty('user-location', 'circle-opacity', 1);
					map.setPaintProperty('user-location', 'circle-stroke-opacity', 1);
					map.setPaintProperty('user-location', 'circle-radius', 10);
				}
			}

			userLocationActive = true;
			flyToFeature({
				geometry: {
					type: 'Point',
					coordinates: [lng, lat]
				},
				properties: {
					label: 'Your location'
				}
			});

			if (userLocationTimeout) clearTimeout(userLocationTimeout);
			userLocationTimeout = setTimeout(() => {
				map.setPaintProperty('user-location', 'circle-opacity', 0);
				map.setPaintProperty('user-location', 'circle-stroke-opacity', 0);
				map.setPaintProperty('user-location', 'circle-radius', 6);

				setTimeout(() => {
					const source = map?.getSource('user-location');
					if (source) {
						source.setData({ type: 'FeatureCollection', features: [] });
					}
					userLocationActive = false;
					userLocationTimeout = null;
				}, 400);
			}, 2500);
		} catch (err) {
			console.error(err);
			alert('Kon locatie niet bepalen.');
		}
	}

	function setSheetIndexVisibility(visible = true) {
		setGridVisibility(visible, { lng: 5.63, lat: 52.16 }, 100, 150);
		map?.setPaintProperty('map-outlines-numbers', 'text-opacity', +visible);
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
	let savedLayerVisibility: Record<string, 'visible' | 'none'> | null = null;

	function saveMapView(push = true) {
		const view = {
			center: map.getCenter(),
			zoom: map.getZoom(),
			bearing: map.getBearing(),
			pitch: map.getPitch()
		};
		if (push) savedMapViews.push(view);
		return view;
	}

	function restoreView(view = savedMapViews.pop(), options = { duration: 500 }) {
		if (!map || !view || !warpedMapLayer) return;
		const { center, zoom, bearing, pitch } = view;
		map.easeTo({ center, zoom, bearing, pitch, ...options });

		const optionsByMapId = new Map();
		optionsByMapId.set(selectedHistoricMap?.id, {
			visible: false,
			transformationType: 'thinPlateSpline',
			applyMask: true
		});
		warpedMapLayer.setMapsOptionsByMapId(optionsByMapId);

		if (savedLayerVisibility) {
			for (const layerId in savedLayerVisibility) {
				map.setLayoutProperty(layerId, 'visibility', savedLayerVisibility[layerId]);
			}
			savedLayerVisibility = null;
		}

		map.setLayoutProperty('map-outlines-skeleton', 'visibility', 'visible');

		applyFilter(filter);

		if (selectedHistoricMap) {
			warpedMapLayer?.setMapOptions(selectedHistoricMap?.id, {
				transformationType: 'thinPlateSpline',
				applyMask: true
			});
			selectedHistoricMap = null;
		}
	}

	function changeHistoricMapView(historicMap: HistoricMap) {
		if (!selectedHistoricMap || !warpedMapLayer || !map) return;

		const optionsByMapId = new Map();

		optionsByMapId.set(selectedHistoricMap?.id, {
			visible: false,
			transformationType: 'thinPlateSpline',
			applyMask: true
		});

		optionsByMapId.set(historicMap?.id, {
			visible: true,
			transformationType: 'straight',
			saturation: 1,
			applyMask: false
		});

		warpedMapLayer.setMapsOptionsByMapId(optionsByMapId);

		const bbox = warpedMapLayer?.getMapsBbox([historicMap.id], {
			projection: {
				definition: 'EPSG:4326'
			}
		});

		if (bbox) {
			const [minX, minY, maxX, maxY] = bbox;
			map.fitBounds(
				[
					[minX, minY],
					[maxX, maxY]
				],
				{ padding: 50, animate: false }
			);
		}

		selectedHistoricMap = historicMap;
	}

	function setHistoricMapView(historicMap: HistoricMap, view: MapView | undefined) {
		if (!map || !warpedMapLayer) return;

		clickedFeature = null;

		savedLayerVisibility = {};
		const layers = map.getStyle().layers;

		for (const layer of layers) {
			if (!layer.id.includes('warped-map-layer-')) {
				const visibility = map.getLayoutProperty(layer.id, 'visibility') as 'visible' | 'none';
				savedLayerVisibility[layer.id] = visibility || 'visible';

				if (visibility !== 'none') {
					map.setLayoutProperty(layer.id, 'visibility', 'none');
				}
			}
		}

		warpedMapLayer.setLayerOptions({ opacity: 1 });

		const { id } = historicMap;
		const mapsToHide = visibleHistoricMaps
			.keys()
			.filter((i) => i != id)
			.toArray();
		warpedMapLayer?.setMapsOptions(mapsToHide, {
			visible: false
		});
		warpedMapLayer?.setMapOptions(id, {
			visible: true,
			transformationType: 'straight',
			saturation: 1,
			opacity: 1,
			applyMask: false
		});

		selectedHistoricMap = historicMap;

		saveMapView();

		if (view) {
			map.easeTo(view);
		} else {
			const bbox = warpedMapLayer?.getMapsBbox([historicMap.id], {
				projection: {
					definition: 'EPSG:4326'
				}
			});
			if (bbox) {
				const [minX, minY, maxX, maxY] = bbox;
				map.fitBounds(
					[
						[minX, minY],
						[maxX, maxY]
					],
					{ padding: 50, speed: 2, curve: 1.8 }
				);
			}
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

	$effect(() => {
		if (selectedHistoricMap) updateURL();
		else updateURL();
	});

	const defaultState = {
		zoom: 6.5,
		lat: 51.75,
		lng: 5.5,
		yearStart: 1865,
		yearEnd: 1983,
		edition: 'All',
		bis: false,
		type: undefined,
		selectedSheetId: null,
		pinnedSheetId: null,
		baseMap: 'none',
		protoMapsWaterInFront: false,
		protoMapsLabelsInFront: false,
		historicMapsOpacity: 100
	};

	function resetState() {
		if (!maplibreLoaded || !historicMapsLoaded) return;

		map!.easeTo({
			center: [defaultState.lng, defaultState.lat],
			zoom: defaultState.zoom,
			pitch: 0,
			bearing: 0
		});

		layerOptions.historicMapsOpacity = defaultState.historicMapsOpacity;
	}

	function updateURL() {
		if (!maplibreLoaded || !historicMapsLoaded) return;
		const params = new URLSearchParams();
		const center = map!.getCenter();

		const setIfChanged = (key: string, currentValue: any, defaultValue: any) => {
			if (currentValue !== defaultValue) {
				params.set(key, String(currentValue));
			}
		};

		const currentZoom = map!.getZoom();
		const currentLat = center.lat;
		const currentLng = center.lng;

		const currentLatFixed = currentLat.toFixed(3);
		const currentLngFixed = currentLng.toFixed(3);
		const defaultLatFixed = defaultState.lat.toFixed(3);
		const defaultLngFixed = defaultState.lng.toFixed(3);

		const isLatDefault = currentLatFixed === defaultLatFixed;
		const isLngDefault = currentLngFixed === defaultLngFixed;

		if (!isLatDefault || !isLngDefault) {
			const latPart = isLatDefault ? '' : currentLatFixed;
			const lngPart = isLngDefault ? '' : currentLngFixed;

			const centerParam = `${latPart}_${lngPart}`;
			params.set('c', centerParam);
		}

		setIfChanged('zoom', currentZoom.toFixed(2), defaultState.zoom.toFixed(2));

		const yearStartStr = String(filter.yearStart);
		const yearEndStr = String(Math.round(filter.yearEnd));

		const isYearStartDefault = filter.yearStart === defaultState.yearStart;
		const isYearEndDefault = Math.round(filter.yearEnd) === defaultState.yearEnd;

		if (!isYearStartDefault || !isYearEndDefault) {
			let yearParam: string;
			if (isYearStartDefault) {
				yearParam = `_${yearEndStr}`;
			} else if (isYearEndDefault) {
				yearParam = `${yearStartStr}_`;
			} else {
				yearParam = `${yearStartStr}_${yearEndStr}`;
			}
			params.set('period', yearParam);
		}

		setIfChanged('editie', String(filter.edition), String(defaultState.edition));

		const bisValue = filter.bis ? '1' : '0';
		setIfChanged('bis', bisValue, defaultState.bis ? '1' : '0');

		if (filter.type) params.set('type', filter.type);
		if (selectedHistoricMap) params.set('blad', selectedHistoricMap.id);
		if (pinnedHistoricMap) params.set('pinned', pinnedHistoricMap.id);

		setIfChanged('achtergrondkaart', String(layerOptions.baseMap), String(defaultState.baseMap));

		const pwfValue = layerOptions.protoMapsWaterInFront ? '1' : '0';
		setIfChanged('pwf', pwfValue, defaultState.protoMapsWaterInFront ? '1' : '0');

		const plfValue = layerOptions.protomapsLabelsInFront ? '1' : '0';
		setIfChanged('plf', plfValue, defaultState.protoMapsLabelsInFront ? '1' : '0');

		setIfChanged(
			'opacity',
			String(layerOptions.historicMapsOpacity),
			String(defaultState.historicMapsOpacity)
		);

		goto(`?${params.toString()}`, {
			replaceState: true,
			noScroll: true
		});
	}

	function parseURL() {
		const q = new URLSearchParams(window.location.search);

		const num = (v: string | null, fallback: number) => {
			const n = parseFloat(v ?? '');
			return Number.isFinite(n) ? n : fallback;
		};

		const int = (v: string | null, fallback: number) => {
			const n = parseInt(v ?? '');
			return Number.isFinite(n) ? n : fallback;
		};

		const getOrDefault = <T,>(key: string, converter: (v: string) => T, defaultValue: T): T => {
			const v = q.get(key);
			return v === null ? defaultValue : converter(v);
		};

		if (window.location.hash.startsWith('#/')) {
			return defaultState;
		}

		let lat: number = defaultState.lat;
		let lng: number = defaultState.lng;

		const centerParam = q.get('c');
		if (centerParam) {
			const [latStr, lngStr] = centerParam.split('_');

			const parsedLat = parseFloat(latStr);
			if (latStr && Number.isFinite(parsedLat)) {
				lat = parsedLat;
			}

			const parsedLng = parseFloat(lngStr);
			if (lngStr && Number.isFinite(parsedLng)) {
				lng = parsedLng;
			}
		}

		let yearStart: number = defaultState.yearStart;
		let yearEnd: number = defaultState.yearEnd;

		const yearParam = q.get('period');
		if (yearParam) {
			const [ys, ye] = yearParam.split('_');

			const parsedYearStart = parseInt(ys);
			if (ys && Number.isFinite(parsedYearStart)) {
				yearStart = parsedYearStart;
			}

			const parsedYearEnd = parseInt(ye);
			if (ye && Number.isFinite(parsedYearEnd)) {
				yearEnd = parsedYearEnd;
			}
		}

		const parseNumOrDefault = (key: string, def: number) => num(q.get(key), def);
		const parseIntOrDefault = (key: string, def: number) => int(q.get(key), def);

		const ed = q.get('editie');
		const edition = ed === 'All' || ed === null ? 'All' : Number(ed);

		return {
			zoom: parseNumOrDefault('zoom', defaultState.zoom),
			lat: lat,
			lng: lng,

			yearStart: yearStart,
			yearEnd: yearEnd,

			edition: edition,
			bis: getOrDefault('bis', (v) => v === '1', defaultState.bis),

			type: q.get('type') ?? defaultState.type,
			selectedSheetId: q.get('blad') ?? defaultState.selectedSheetId,
			pinnedSheetId: q.get('pinned') ?? defaultState.pinnedSheetId,

			baseMap: q.get('achtergrondkaart') ?? defaultState.baseMap,
			protoMapsWaterInFront: getOrDefault(
				'pwf',
				(v) => v === '1',
				defaultState.protoMapsWaterInFront
			),
			protoMapsLabelsInFront: getOrDefault(
				'plf',
				(v) => v === '1',
				defaultState.protoMapsLabelsInFront
			),
			historicMapsOpacity: parseIntOrDefault('opacity', defaultState.historicMapsOpacity)
		};
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
		const offset = selectedHistoricMap ? 10 : 140;
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
		background-color: ${selectedHistoricMap ? '#fffaff' : '#fafaff'}; 
		background-image: radial-gradient(${selectedHistoricMap ? '#fef' : '#eef'} 2.5px, transparent 2.5px)
	`}
></div>

<Toast content={toastContent}></Toast>

<MapSheetToggle
	bind:pinnedHistoricMap
	{clickedHistoricMap}
	{selectedHistoricMap}
	{setHistoricMapView}
	{setSheetIndexVisibility}
	{extendClickedMapTimeout}
	{saveMapView}
	{restoreView}
></MapSheetToggle>

{#if maplibreLoaded}
	<MapButtons
		{selectedHistoricMap}
		{flyToFeature}
		{flyToUserLocation}
		{setGridVisibility}
		{zoomIn}
		{zoomOut}
		bind:layerOptions
		bind:userLocationActive
	/>
{/if}

<Header {historicMapsLoaded} {resetState} />

<!-- <Timeline
	bind:filter
	{applyFilter}
	{historicMapsLoaded}
	{historicMapsById}
	{selectedHistoricMap}
	{mapsInViewport}
	{setLabelVisibility}
	{getHistoricMapThumbnail}
	{map}
></Timeline> -->

<Timeline2
	visible={historicMapsLoaded && !selectedHistoricMap}
	{historicMapsLoaded}
	{historicMapsById}
	{hoveredHistoricMap}
	{mapsInViewport}
	bind:filter
	{applyFilter}
	{getHistoricMapThumbnail}
	{setLabelVisibility}
	{setGridVisibility}
></Timeline2>

<!-- <SheetControls {visibleHistoricMaps} {selectedHistoricMap} {changeHistoricMapView}></SheetControls> -->

<Minimap
	{visibleHistoricMaps}
	{visibleHistoricMapsInViewport}
	{viewportPolygon}
	{hoveredHistoricMap}
	{clickedHistoricMap}
	{selectedHistoricMap}
	{historicMapsLoaded}
	{getHistoricMapThumbnail}
	{restoreView}
></Minimap>
<MapInfo
	{warpedMapLayer}
	{historicMapsById}
	{visibleHistoricMapsInViewport}
	{viewportPolygon}
	{clickedHistoricMap}
	{selectedHistoricMap}
	{changeHistoricMapView}
	{getHistoricMapThumbnail}
></MapInfo>

<svelte:window
	onkeydown={(e) => {
		if (e.key.toLowerCase() == '=') {
			zoomIn();
		}
		if (e.key.toLowerCase() == '-') {
			zoomOut();
		}
		if (e.key.toLowerCase() == 'w' && layerOptions.baseMap == 'protomaps') {
			layerOptions.protoMapsWaterInFront = !layerOptions.protoMapsWaterInFront;
		}
		if (e.key.toLowerCase() == 't' && layerOptions.baseMap == 'protomaps') {
			layerOptions.protomapsLabelsInFront = !layerOptions.protomapsLabelsInFront;
		}
	}}
	onpopstate={() => {
		const urlParams = parseURL();
		if (urlParams.selectedSheetId) {
			const historicMap = historicMapsById.get(urlParams.selectedSheetId);
			if (historicMap) setHistoricMapView(historicMap);
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
