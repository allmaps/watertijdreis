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
	import SheetControls from './SheetControls.svelte';
	import { getUserLocation } from '$lib/UserLocation.svelte';
	import { basemapStyle } from './basemap';

	import type { GeoJsonProperties, Geometry, Feature } from 'geojson';
	import type { HistoricMap } from './types/historicmap';
	import { MapPinSimple } from 'phosphor-svelte';

	const containerId = 'map-container';
	const ANNOTATION_URL = 'maps-sorted-by-edition.json';

	let map: maplibregl.Map | null = $state(null);
	let warpedMapLayer: WarpedMapLayer | null = $state(null);
	let maplibreLoaded: boolean = $state(false);
	let userLocationActive: boolean = $state(false);

	$effect(() => {
		if (!map) initMaplibre();
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

	type Filter = {
		yearStart: number;
		yearEnd: number;
		edition: 'All' | 1 | 2 | 3 | 4 | 5;
		bis: boolean;
		type: undefined | 'WVE' | 'HWP';
	};

	let filter: Filter = $state({
		yearStart: 1865,
		yearEnd: 1991,
		edition: 'All',
		bis: false,
		type: undefined
	});

	let visibleHistoricMaps: SvelteMap<string, HistoricMap> = $state(new SvelteMap());
	// let mapsInViewport = $derived.by(() => {
	// 	const result = new SvelteMap();
	// });
	let visibleHistoricMapsInViewport = $derived.by(() => {
		const result = new SvelteMap();
		if (!viewportPolygon) return result;
		for (const map of visibleHistoricMaps.values()) {
			if (warpedMapLayer?.renderer?.mapsInViewport.has(map.id)) result.set(map.id, map);
		}
		return result;
	});

	let mapsInViewport = $derived.by(() => {
		if (!viewportPolygon || !warpedMapLayer) return new Map();

		const result = new Map();
		for (const id of warpedMapLayer.renderer?.mapsInViewport ?? []) {
			const map = historicMapsById.get(id);
			if (map && map.warpedMap?.options.visible) {
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
					if (historicMap && warpedMapLayer?.renderer?.mapsInViewport.has(historicMap.id))
						visibleHistoricMapsInViewport.set(id, historicMap);
				}
			);
		}
	});

	let gridVisible: boolean = $state(false);

	function getHistoricMapThumbnail(id, size = 128) {
		const warpedMap = warpedMapLayer?.getWarpedMap(id);
		if (!map) return '';
		return warpedMap?.georeferencedMap.resource.id + `/full/${size},/0/default.jpg`;
	}

	let toastContent: string = $state('');

	function applyFilter(filter: Filter) {
		if (!historicMapsByNumber) return;

		const mapsToColor: string[] = [];
		const mapsToDesaturate: string[] = [];

		toastContent = `${filter.yearStart} - ${filter.yearEnd}`;

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

		toastContent = `Je ziet nu kaarten uit de periode <code style="font-weight: 600">${filter.yearStart}</code> en <code style="font-weight: 600">${filter.yearEnd}</code>`;

		console.log('Applied filter');
	}

	type LayerOptions = {
		baseMap: 'none' | 'protomaps' | 'ahn' | 'satelliet';
		protoMapsWaterInFront: boolean;
		protomapsLabelsInFront: boolean;
		historicMapsOpacity: number;
	};
	let layerOptions = $state<LayerOptions>({
		baseMap: 'none',
		protoMapsWaterInFront: false,
		protomapsLabelsInFront: false,
		historicMapsOpacity: 100
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

		if (warpedMapLayer)
			warpedMapLayer.setLayerOptions({
				opacity: layerOptions.historicMapsOpacity / 100
			});

		if (map && map.getLayer('map-outlines-skeleton')) {
			const visibility = layerOptions.historicMapsOpacity < 100 ? 'none' : 'visible';
			map.setLayoutProperty('map-outlines-skeleton', 'visibility', visibility);
		}
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
		const urlView = getViewFromUrl();
		const initialCenter = urlView ? [urlView.lng, urlView.lat] : [5, 51.75];
		const initialZoom = urlView ? urlView.zoom : 7;

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
		map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

		map.on('load', async () => {
			maplibreLoaded = true;

			addBackgroundLayers();
			warpedMapLayer = new WarpedMapLayer();
			map.addLayer(warpedMapLayer);
			warpedMapLayer.setLayerOptions({ visible: false });

			// Add user location source and layer
			map.addSource('user-location', {
				type: 'geojson',
				data: {
					type: 'FeatureCollection',
					features: []
				}
			});

			map.addLayer({
				id: 'user-location-layer',
				type: 'circle',
				source: 'user-location',
				paint: {
					'circle-radius': 10,
					'circle-color': '#f4a',
					'circle-stroke-width': 4,
					'circle-stroke-color': '#fff',
					'circle-opacity': 0.8
				}
			});

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
				paint: { 'fill-color': ['get', 'skeletonColor'] }
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
				'text-color': '#00a',
				'text-halo-color': '#eeeeff',
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
			id: 'map-outlines-fill-2',
			type: 'fill',
			source: 'map-outlines',
			paint: {
				'fill-color': '#ff44aa',
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
				'line-opacity': 0
			}
		});

		map.addLayer({
			id: 'map-outlines-stroke-2',
			type: 'line',
			source: 'map-outlines',
			paint: {
				'line-color': '#f4a',
				'line-width': 1.5,
				'line-opacity': ['coalesce', ['feature-state', 'animated-stroke-opacity'], 0]
			}
		});

		map.on('click', 'map-outlines-fill', (e) => {
			console.log(e.lngLat);
			setGridVisibility(true, e.lngLat);

			gridResetTimer = setTimeout(() => {
				setGridVisibility(false, e.lngLat);
			}, 1500);

			clickedFeature = e.features?.[0];
			const newId = clickedFeature?.id;

			if (newId !== undefined && newId !== currentFillId) {
				if (currentFillId !== null) {
					animateFeatureOpacity(currentFillId, 'animated-fill-opacity', 0, 300);
				}

				currentFillId = newId;
				animateFeatureOpacity(newId, 'animated-fill-opacity', 0.3, 300, () => {
					setTimeout(() => {
						if (currentFillId === newId) {
							animateFeatureOpacity(newId, 'animated-fill-opacity', 0, 500);
							currentFillId = null;
							clickedFeature = null;
						}
					}, 1000);
				});
			}
		});
	}

	const activeAnimations = {};
	const featureTimeouts = {};
	let gridResetTimer = null;
	let currentFillId = null;

	function setGridVisibility(isVisible, centerLngLat = { lng: 5.63, lat: 52.16 }) {
		const source = map.getSource('map-outlines');
		if (!source || !source._data) return;
		const allFeatures = source._data.features;
		const speed = 300;

		setTimeout(() => (gridVisible = isVisible), 100);

		if (isVisible && gridResetTimer) {
			clearTimeout(gridResetTimer);
			gridResetTimer = null;
		}

		const hoverFillOpacity = isVisible ? 0.3 : 0;

		map.setPaintProperty('map-outlines-fill', 'fill-opacity', [
			'case',
			['boolean', ['feature-state', 'hover'], false],
			hoverFillOpacity,
			0
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
			const targetOpacity = Math.max(0, 0.5 - distance / 7);

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

			map.setFeatureState({ source: 'map-outlines', id: id }, { [prop]: currentVal });

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
			if (userLocationActive) {
				userLocationActive = false;
				if (map) {
					const source = map.getSource('user-location') as maplibregl.GeoJSONSource;
					if (source) {
						source.setData({
							type: 'FeatureCollection',
							features: []
						});
					}
				}
				return;
			}

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
		} catch (err) {
			console.error(err);
			alert('Kon locatie niet bepalen.');
		}
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
		const view = {
			center: map.getCenter(),
			zoom: map.getZoom(),
			bearing: map.getBearing(),
			pitch: map.getPitch()
		};
		savedMapViews.push(view);
		return view;
	}

	function restoreView(view = savedMapViews.pop(), options = { duration: 500 }) {
		if (!map || !view) return;
		const { center, zoom, bearing, pitch } = view;
		map.easeTo({ center, zoom, bearing, pitch, ...options });

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

		warpedMapLayer?.setMapOptions(selectedHistoricMap?.id, {
			visible: false,
			transformationType: 'thinPlateSpline',
			applyMask: true
		});

		warpedMapLayer?.setMapOptions(historicMap?.id, {
			visible: true,
			transformationType: 'straight',
			saturation: 1,
			applyMask: false
		});

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
			applyMask: false
		});

		selectedHistoricMap = historicMap;

		map.setLayoutProperty('map-outlines-skeleton', 'visibility', 'none');

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

	function handleMapClick(e: any) {
		if (!map || !warpedMapLayer) return;

		const feature = e.features?.[0];
		const id = feature?.properties?.id;
		if (gridVisible) {
			if (!historicMapsById.has(id)) return;
			setHistoricMapView(historicMapsById.get(id));

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

	let spaceKeyDown = $state(false);
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
	{hoveredHistoricMap}
	{clickedHistoricMap}
	{selectedHistoricMap}
	{setHistoricMapView}
	{setGridVisibility}
	{saveMapView}
	{restoreView}
></MapSheetToggle>

<MapButtons
	visible={!selectedHistoricMap}
	{flyToFeature}
	{flyToUserLocation}
	{setGridVisibility}
	{zoomIn}
	{zoomOut}
	bind:layerOptions
	bind:userLocationActive
/>
<Header />

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

{#if historicMapsLoaded && !selectedHistoricMap}
	<Timeline2
		{historicMapsLoaded}
		{historicMapsById}
		{mapsInViewport}
		bind:filter
		{applyFilter}
		{getHistoricMapThumbnail}
		{setLabelVisibility}
		{setGridVisibility}
	></Timeline2>
{/if}

<SheetControls {visibleHistoricMaps} {selectedHistoricMap} {changeHistoricMapView}></SheetControls>

<Minimap
	{historicMapsById}
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
		if (e.key == ' ' && !spaceKeyDown) {
			setGridVisibility(true);
			spaceKeyDown = true;
		}
	}}
	onkeyup={(e) => {
		if (e.key == ' ') {
			setGridVisibility(false);
			spaceKeyDown = false;
		}
	}}
	onkeypress={(e) => {
		if (e.key.toLowerCase() == 'w' && layerOptions.baseMap == 'protomaps') {
			layerOptions.protoMapsWaterInFront = !layerOptions.protoMapsWaterInFront;
		}
	}}
/>
