<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { WarpedMapLayer } from '@allmaps/maplibre';
	import { WarpedMap, WarpedMapEventType } from '@allmaps/render';
	import * as turf from '@turf/turf';
	import { cubicOut } from 'svelte/easing';
	import Minimap from './Minimap.svelte';

	let { mapViewer = $bindable<MapViewer | null>(null) } = $props();

	let historicMapPolygons: GeoJSON.Feature<GeoJSON.Polygon>[] = $state([]);
	let viewportPolygon: GeoJSON.Feature<GeoJSON.Polygon> | null = $state(null);

	const ANNOTATION_URL = 'filteredMaps.json';

	$effect(() => {
		if (!mapViewer) {
			mapViewer = new MapViewer('map-container2');
			mapViewer.init();
			console.log(mapViewer);
		}
	});

	class HistoricMap {
		mapViewer: MapViewer;
		id: string;
		bis: boolean;
		edition: number;
		number: number;
		position: string;
		x: number;
		y: number;
		yearStart: number;
		yearEnd: number;

		get warpedMap(): WarpedMap | undefined {
			return this.mapViewer.warpedMapLayer?.getWarpedMapList().warpedMapsById.get(this.id);
		}

		get imageUrl(): string {
			// TODO: not hardcoded
			if (this.warpedMap?.georeferencedMap)
				return this.warpedMap?.georeferencedMap.resource.id + '/full/50,/0/default.jpg';
		}

		constructor(mapViewer: MapViewer, id: string, meta: any) {
			this.mapViewer = mapViewer;
			this.id = id;
			this.bis = meta.bis;
			this.edition = meta.edition;
			this.number = meta.number;
			this.position = meta.position;
			this.x = meta.x;
			this.y = meta.y;
			this.yearStart = meta.yearStart;
			this.yearEnd = meta.yearEnd;
		}
	}

	class MapViewer {
		containerId: string;
		map: maplibregl.Map | null = null;
		warpedMapLayer: WarpedMapLayer | null = null;
		historicMaps: HistoricMap[] = $state([]);
		historicMapsInViewport = $state(new Set());

		maplibreLoaded: boolean = $state(false);
		historicMapsLoaded: boolean = $state(false);

		constructor(containerId: string) {
			this.containerId = containerId;

			$effect(() => {
				this.updateGridVisibility();
				this.updateLabelVisibility();
			});
		}

		init() {
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
				center: [5, 51.75],
				zoom: 6.5,
				maxPitch: 0,
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
							'line-color': '#f4a',
							'line-width': 4,
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
							'text-field': [
								'format',
								['get', 'year']
								// {}, // normale tekststijl
								// ' ',
								// {},
								// ['concat', '(', ['to-string', ['get', 'diff']], ')'],
								// {}
							],
							'text-font': ['Noto Sans Bold'],
							'text-size': 14,
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
								}
							});

							const map = this.getHistoricMapById(e.features[0].properties.id);

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

							this.map.setPaintProperty('background', 'background-color-transition', {
								duration: 500,
								delay: 0
							});

							this.map.setPaintProperty('background', 'background-color', '#336');
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
			return fetch(annotationUrl)
				.then((res) => res.json())
				.then((data: GeoreferencedMap[]) =>
					Promise.all(
						data.map(async (map) => {
							await this.warpedMapLayer?.addGeoreferencedMap(map);
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

		filterHistoricMapsByYear(year: number) {
			this.historicMaps.forEach((historicMap) => {
				const warpedMap = historicMap.warpedMap;
				if (!warpedMap) return;
				warpedMap.visible = true;
				this.warpedMapLayer?.renderer?.setMapSaturation(
					historicMap.id,
					year >= historicMap.yearStart ? 1 : 0
				);
				this.warpedMapLayer?.renderer?.setMapOpacity(
					historicMap.id,
					year >= historicMap.yearStart ? 1 : 0.5
				);
			});

			this.updateYearLabels(year);
		}

		updateYearLabels(year: number) {
			if (!this.map) return;

			const source = this.map.getSource('map-labels') as maplibregl.GeoJSONSource;
			if (!source) return;

			this.historicMaps.forEach((map, i) => {
				const diff = map.yearStart - year;

				this.map!.setFeatureState({ source: 'map-labels', id: i }, { diff });
			});
		}
	}
</script>

<div id="map-container2" class="width-100 height-[100vh] relative overflow-hidden"></div>
<Minimap {mapViewer} polygons={historicMapPolygons} viewport={viewportPolygon}></Minimap>

<style>
	#map-container2 {
		height: 100vh;
	}
</style>
