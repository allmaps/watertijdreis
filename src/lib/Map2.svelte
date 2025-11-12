<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { WarpedMapLayer } from '@allmaps/maplibre';
	import { WarpedMap, WarpedMapEventType } from '@allmaps/render';
	import * as turf from '@turf/turf';
	import { cubicOut } from 'svelte/easing';
	import Minimap from './Minimap.svelte';
	import ManifestViewer from './MetadataPanel.svelte';
	import Timeline2 from './Timeline2.svelte';

	import { HistoricMap } from './HistoricMap.svelte';

	let { mapViewer = $bindable<MapViewer | null>(null) } = $props();

	let historicMapPolygons: GeoJSON.Feature<GeoJSON.Polygon>[] = $state([]);
	let viewportPolygon: GeoJSON.Feature<GeoJSON.Polygon> | null = $state(null);

	// const ANNOTATION_URL = 'filteredMaps.json';
	const ANNOTATION_URL = 'mapsSortedByEdition.json';

	$effect(() => {
		if (!mapViewer) {
			mapViewer = new MapViewer('map-container2');
			mapViewer.init();
			console.log(mapViewer); // TODO: remove
		}
	});

	class MapViewer {
		containerId: string;
		map: maplibregl.Map | null = null;
		warpedMapLayer: WarpedMapLayer | null = null;
		historicMaps: HistoricMap[] = $state([]);
		historicMapsInViewport = $state(new Set());
		historicMapSelected: HistoricMap | null = $state(null);
		filterYearRange: [number, number] = $state([0, new Date().getFullYear()]);

		maplibreLoaded: boolean = $state(false);
		historicMapsLoaded: boolean = $state(false);

		constructor(containerId: string) {
			this.containerId = containerId;
		}

		init() {
			const urlView = this.getViewFromUrl();

			const initialCenter = urlView ? [urlView.lng, urlView.lat] : [5, 51.75];
			const initialZoom = urlView ? urlView.zoom : 7;

			this.map = new maplibregl.Map({
				container: this.containerId,
				style: {
					version: 8,
					sources: {},
					glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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

			setTimeout(
				() => (this.historicMapsInViewport = this.warpedMapLayer.renderer.mapsInViewport),
				500
			); // TODO: load event
			this.map.on('move', () => {
				const bounds = this.map.getBounds();
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
				this.historicMapsInViewport = this.warpedMapLayer.renderer.mapsInViewport;
			});

			this.map.on('moveend', () => {
				// Werk de URL bij nadat de beweging is gestopt
				this.updateUrl();
			});

			this.map.on('load', async () => {
				this.maplibreLoaded = true;

				this.warpedMapLayer = new WarpedMapLayer();
				this.map.addLayer(this.warpedMapLayer);

				this.loadAnnotation(ANNOTATION_URL).then(() => {
					this.historicMapsLoaded = true;

					let polygons = this.historicMaps.map((o, i) => ({
						id: i,
						type: 'Feature',
						geometry: o.warpedMap.geoMask,
						properties: { year: o.yearStart, id: o.id }
					}));

					historicMapPolygons = polygons;

					let points = this.historicMaps.map((o, i) => ({
						id: i,
						type: 'Feature',
						geometry: turf.centerOfMass(o.warpedMap.geoMask).geometry,
						properties: { year: o.yearStart }
					}));

					this.map.addSource('map-outlines', {
						type: 'geojson',
						data: { type: 'FeatureCollection', features: polygons }
					});

					this.map.addSource('map-labels', {
						type: 'geojson',
						data: { type: 'FeatureCollection', features: points }
					});

					this.map.addLayer({
						id: 'map-outlines-fill',
						type: 'fill',
						source: 'map-outlines',
						paint: {
							'fill-color': '#ff44aa',
							'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0]
						},
						layout: { visibility: 'none' }
					});

					this.map.addLayer({
						id: 'map-outlines-layer',
						type: 'line',
						source: 'map-outlines',
						paint: {
							'line-color': '#fff',
							'line-width': 4,
							'line-blur': 4,
							'line-opacity': 0,
							'line-opacity-transition': { duration: 300 }
						}
					});
					this.map.addLayer({
						id: 'map-outlines-layer-2',
						type: 'line',
						source: 'map-outlines',
						paint: {
							'line-color': '#f4a',
							'line-width': 1,
							'line-opacity': 0,
							'line-opacity-transition': { duration: 300 }
						}
					});

					this.map.addLayer({
						id: 'map-outlines-labels',
						type: 'symbol',
						source: 'map-labels',
						layout: {
							'text-field': ['to-string', ['get', 'year']],
							'text-font': ['Noto Sans Bold'],
							'text-size': 15,
							'text-allow-overlap': true,
							'symbol-placement': 'point'
						},
						paint: {
							'text-color': '#33336688',
							'text-halo-color': '#ffffff',
							'text-halo-width': 1,
							'text-opacity': 0,
							'text-opacity-transition': { duration: 300 }
						}
					});

					let hoveredPolygonId = null;

					this.map.on('click', 'map-outlines-fill', (e) => {
						if (e.features.length > 0) {
							this.saveView();

							addEventListener('keydown', (e) => {
								if (e.key == 'Escape') {
									this.restoreView();
									this.filterHistoricMapsByYear(1975);
									this.map.setPaintProperty('background', 'background-color', '#fff');
									this.historicMapSelected = null;
								}
							});

							const map = this.getHistoricMapById(e.features[0].properties.id);
							this.historicMapSelected = this.historicMaps.find((i) => i.id == map.mapId);

							this.setGridVisibility(false);
							this.warpedMapLayer?.setMapOpacity(map?.mapId, 1);
							this.warpedMapLayer?.setMapSaturation(map?.mapId, 1);

							this.historicMaps.forEach((m) => {
								m.warpedMap.visible = m.id == map?.mapId;
							});

							map?.setTransformationType('straight');
							this.warpedMapLayer.bringMapsToFront([map.mapId]);
							const { width, height } = map?.georeferencedMap.resource;
							this.warpedMapLayer?.setMapResourceMask(map?.mapId, [
								[0, height],
								[width, height],
								[width, 0],
								[0, 0]
							]);
							map.updateTriangulation(true); // TODO: kan dit anders?

							const bounds = new maplibregl.LngLatBounds();
							map?.geoMask.coordinates[0].forEach((coord) => bounds.extend(coord));
							this.map.fitBounds(bounds, {
								padding: 50,
								speed: 2,
								curve: 2,
								offset: [0, -50],
								linear: true
							});

							// this.map.setPaintProperty('background', 'background-color-transition', {
							// 	duration: 500,
							// 	delay: 0
							// });

							// this.map.setPaintProperty('background', 'background-color', '#336');
						}
					});

					this.map.on('mousemove', 'map-outlines-fill', (e) => {
						if (e.features.length > 0) {
							if (hoveredPolygonId !== null) {
								this.map.setFeatureState(
									{ source: 'map-outlines', id: hoveredPolygonId },
									{ hover: false }
								);
							}
							hoveredPolygonId = e.features[0].id;
							this.map.setFeatureState(
								{ source: 'map-outlines', id: hoveredPolygonId },
								{ hover: true }
							);
						}
					});

					this.map.on('mouseleave', 'map-outlines-fill', () => {
						if (hoveredPolygonId !== null) {
							this.map.setFeatureState(
								{ source: 'map-outlines', id: hoveredPolygonId },
								{ hover: false }
							);
						}
						hoveredPolygonId = null;
					});
				});
			});

			this.map.on('idle', () => {
				// this.map?.triggerRepaint();
			});
		}

		loadAnnotation(annotationUrl: string) {
			if (!this.warpedMapLayer) return;
			return fetch(annotationUrl)
				.then((res) => res.json())
				.then((data: GeoreferencedMap[]) =>
					Promise.all(
						data.map(async (map) => {
							await this.warpedMapLayer.addGeoreferencedMap(map);
							this.warpedMapLayer.getWarpedMapList().warpedMapsById.get(map.id).visible = false;
							this.historicMaps.push(new HistoricMap(this, map.id, map._meta));
						})
					)
				);
		}

		saveView() {
			this.previousView = {
				center: this.map.getCenter(),
				zoom: this.map.getZoom(),
				bearing: this.map.getBearing(),
				pitch: this.map.getPitch()
			};
		}

		// Restore the saved view
		restoreView(options = { duration: 500 }) {
			if (!this.previousView) return;
			const { center, zoom, bearing, pitch } = this.previousView;
			this.map.easeTo({ center, zoom, bearing, pitch, ...options });
		}

		updateUrl() {
			if (!this.map) return;

			const center = this.map.getCenter();
			const zoom = this.map.getZoom().toFixed(2);
			const lat = center.lat.toFixed(4);
			const lon = center.lng.toFixed(4);
			const bearing = this.map.getBearing().toFixed(1);

			const hash = `${zoom}/${lat}/${lon}/${bearing}`;

			window.history.replaceState(null, '', `#/${hash}`);
		}

		getViewFromUrl() {
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

		setGridVisibility(visible = true) {
			const map = this.map;
			if (!map) return;

			map.setLayoutProperty('map-outlines-fill', 'visibility', visible ? 'visible' : 'none');
			map.setPaintProperty('map-outlines-layer', 'line-opacity-transition', { duration: 300 });
			map.setPaintProperty('map-outlines-layer', 'line-opacity', visible ? 1 : 0);
			map.setPaintProperty('map-outlines-layer-2', 'line-opacity-transition', { duration: 300 });
			map.setPaintProperty('map-outlines-layer-2', 'line-opacity', visible ? 1 : 0);
		}

		setLabelVisibility(visible) {
			const map = this.map;
			if (!map) return;

			map.setPaintProperty('map-outlines-labels', 'text-opacity-transition', { duration: 300 });
			map.setPaintProperty('map-outlines-labels', 'text-opacity', visible ? 1 : 0);
		}

		getHistoricMapById(id: string) {
			return this.warpedMapLayer?.getWarpedMapList().warpedMapsById.get(id);
		}

		setFilterYearRange(yearStart = this.filterYearRange[0], yearEnd = this.filterYearRange[1]) {
			this.filterYearRange = [yearStart, yearEnd];
		}

		filterHistoricMaps() {
			const [yearStart, yearEnd] = this.filterYearRange;
			const visibleSheets = [];
			const greyedOutSheets = [];

			// Loop over numbers
			// mapsGroupedByNumber.forEach((sheets, number) => {
			// 	let x1, y1, x2, y2;
			// 	let steps = 0;
			// 	const firstEdYearEnd = 1894;

			// 	// Loop over sheets and back (latest are on top)
			// 	for (const sheet of sheets) {
			// 		steps++;
			// 		// Get sheet metadata
			// 		const { x, y, yearEnd: year, edition, bis, type } = sheet._meta;

			// 		// Check if in scope
			// 		const [minYear, maxYear] = rangeInput;
			// 		const maxYearFilter = maxYear > firstEdYearEnd ? maxYear : firstEdYearEnd;
			// 		const periodFilter = editionInput !== 'All' || year <= maxYearFilter;
			// 		const editionFilter = editionInput === 'All' || edition === editionInput;
			// 		const typeFilter = typeInput ? type === typeInput : !type;
			// 		const bisFilter = bisInput === true || !bis;
			// 		const inScope = periodFilter && editionFilter && typeFilter && bisFilter;
			// 		if (!inScope) continue;

			// 		// Add out of scope sheets to a seperate stack of greyed out sheets
			// 		const stack = year >= minYear && year <= maxYear ? visibleSheets : greyedOutSheets;

			// 		// Get all the available sheets
			// 		if (x1 === undefined) {
			// 			// Get first sheet
			// 			stack.push(sheet);
			// 			[x1, y1] = [x, y];
			// 			// Stop if no other sheets
			// 			if (!x1 && !y1) break;
			// 		} else if (y1 && x === x1 && y === -y1) {
			// 			// Get optional North or South sheet
			// 			stack.push(sheet);
			// 			y1 = 0;
			// 			// Stop if no East or West sheets
			// 			if (!x1) break;
			// 		} else if (x1 && !x2 && x === -x1) {
			// 			// Get first East or West sheet
			// 			stack.push(sheet);
			// 			[x2, y2] = [x, y];
			// 			// Stop if no more North or South sheets
			// 			if (!y1 && !y) break;
			// 		} else if (y2 && x === x2 && y === -y2) {
			// 			// Get optional second East or West sheet
			// 			stack.push(sheet);
			// 			y2 = 0;
			// 			// Stop if no more North or South sheet
			// 			if (!y1) break;
			// 		}
			// 	}
			// 	const msg = `For number ${number}: ${steps} of ${sheets.length} sheets`;
			// 	if (steps >= sheets.length) {
			// 		console.warn(msg);
			// 	} else {
			// 		console.log(msg);
			// 	}
			// });

			return [visibleSheets, greyedOutSheets];
		}

		filterHistoricMapsByYear(year: number) {
			// this.historicMaps.forEach((historicMap) => {
			// 	const warpedMap = historicMap.warpedMap;
			// 	if (!warpedMap) return;
			// 	warpedMap.visible = false;
			// this.warpedMapLayer?.renderer?.setMapSaturation(
			// 	historicMap.id,
			// 	year >= historicMap.yearStart ? 1 : 0
			// );
			// this.warpedMapLayer?.renderer?.setMapOpacity(
			// 	historicMap.id,
			// 	year >= historicMap.yearStart ? 1 : 0.5
			// );
			// });

			this.updateYearLabels(year);
		}

		updateYearLabels(year: number) {
			if (!this.map) return;

			const source = this.map.getSource('map-labels') as maplibregl.GeoJSONSource;
			if (!source) return;

			// const newTextField = [
			// 	'format',
			// 	['get', 'year'],
			// 	{},
			// 	'\n (',
			// 	{},
			// 	['to-string', ['-', ['get', 'year'], 1900]],
			// 	{},
			// 	')',
			// 	{}
			// ];

			// this.map.setLayoutProperty('map-outlines-labels', 'text-field', newTextField);
		}
	}
</script>

<div id="map-container2" class="width-100 height-[100vh] relative overflow-hidden"></div>
<Minimap {mapViewer} polygons={historicMapPolygons} viewport={viewportPolygon}></Minimap>

<ManifestViewer {mapViewer}></ManifestViewer>

<Timeline2 {mapViewer}></Timeline2>

<svelte:window
	onkeydown={(e) => {
		if (e.key == ' ') mapViewer.setGridVisibility(true);
	}}
	onkeyup={(e) => {
		if (e.key == ' ') mapViewer.setGridVisibility(false);
	}}
/>

<style>
	#map-container2 {
		height: 100vh;
	}
</style>
