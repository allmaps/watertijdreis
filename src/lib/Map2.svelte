<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { WarpedMapLayer } from '@allmaps/maplibre';
	import { WarpedMap, WarpedMapEventType } from '@allmaps/render';
	import * as turf from '@turf/turf';

	let { mapViewer = $bindable<MapViewer | null>(null) } = $props();

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
			return this.warpedMap?.georeferencedMap.resource.id + '/full/50,/0/default.jpg';
		}

		constructor(
			mapViewer: MapViewer,
			id: string,
			bis: boolean,
			edition: number,
			number: number,
			position: string,
			x: number,
			y: number,
			yearStart: number,
			yearEnd: number
		) {
			this.mapViewer = mapViewer;
			this.id = id;
			this.bis = bis;
			this.edition = edition;
			this.number = number;
			this.position = position;
			this.x = x;
			this.y = y;
			this.yearStart = yearStart;
			this.yearEnd = yearEnd;
		}
	}

	class MapViewer {
		containerId: string;
		map: maplibregl.Map | null = null;
		warpedMapLayer: WarpedMapLayer | null = null;
		historicMaps: HistoricMap[] = $state([]);
		historicMapsInViewpot: Set<string>;

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

			this.warpedMapLayer = new WarpedMapLayer();

			this.map.on('load', async () => {
				if (!this.warpedMapLayer) return;
				this.map.addLayer(this.warpedMapLayer);

				const res = await fetch('filteredMaps.json'); // TODO: niet hardcoden
				const data: GeoreferencedMap[] = await res.json();
				data.forEach((map) => this.addHistoricMap(map));

				this.warpedMapLayer.renderer?.warpedMapList.addEventListener(
					WarpedMapEventType.WARPEDMAPADDED,
					(event) => {
						// TODO: kan beter?
						if (data.length == event.target.warpedMapsById.size) {
							let polygons = this.historicMaps.map((o, i) => ({
								id: i,
								type: 'Feature',
								geometry: o.warpedMap.geoMask,
								properties: { year: o.yearStart }
							}));

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
									'line-color': '#ff44aa',
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
									'text-size': 13,
									'text-allow-overlap': true,
									'symbol-placement': 'point'
								},
								paint: {
									'text-color': '#33336688',
									'text-halo-color': '#ffffff',
									'text-halo-width': 0.5,
									'text-opacity': 0,
									'text-opacity-transition': { duration: 300 }
								}
							});

							let hoveredPolygonId = null;

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
						}
					}
				);
			});

			this.map.on('idle', () => {
				this.map?.triggerRepaint();
			});
		}

		setGridVisibility(visible = true) {
			const map = this.map;
			if (!map) return;

			map.setLayoutProperty('map-outlines-fill', 'visibility', visible ? 'visible' : 'none');
			map.setPaintProperty('map-outlines-layer', 'line-opacity-transition', { duration: 300 });
			map.setPaintProperty('map-outlines-layer', 'line-opacity', visible ? 1 : 0);
		}

		setLabelVisibility(visible) {
			const map = this.map;
			if (!map) return;

			map.setPaintProperty('map-outlines-labels', 'text-opacity-transition', { duration: 300 });
			map.setPaintProperty('map-outlines-labels', 'text-opacity', visible ? 1 : 0);
		}

		addHistoricMap(map: GeoreferencedMap) {
			this.warpedMapLayer?.addGeoreferencedMap(map);
			this.historicMaps.push(
				new HistoricMap(
					this,
					map.id,
					map._meta.bis,
					map._meta.edition,
					map._meta.number,
					map._meta.position,
					map._meta.x,
					map._meta.y,
					map._meta.yearStart,
					map._meta.yearEnd
				)
			);
		}

		filterHistoricMapsByYear(year: number) {
			this.historicMaps.forEach((historicMap) => {
				const warpedMap = historicMap.warpedMap;
				if (!warpedMap) return;
				// warpedMap.visible = year >= historicMap.yearStart;
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

<style>
	#map-container2 {
		height: 100vh;
	}
</style>
