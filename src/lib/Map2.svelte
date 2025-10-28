<script lang="ts">
	import maplibregl from 'maplibre-gl';
	import { WarpedMapLayer } from '@allmaps/maplibre';
	import { WarpedMap, WarpedMapEventType } from '@allmaps/render';
	import Map from './Map.svelte';
	import type { Image } from 'phosphor-svelte';
	import { polygon } from '@turf/turf';

	let { mapViewer = $bindable<MapViewer | null>(null) } = $props();

	$effect(() => {
		if (!mapViewer) {
			mapViewer = new MapViewer('map-container2');
			mapViewer.init();
			console.log(mapViewer);
		}
	});

	function calculateSimpleCentroid(polygonGeometry) {
		// Polygon coördinaten zijn [ [ring1], [ring2, ...] ]
		const coordinates = polygonGeometry.coordinates[0];
		let x = 0;
		let y = 0;

		// De laatste coördinaat is vaak hetzelfde als de eerste (gesloten ring),
		// dus we tellen tot de een-na-laatste.
		const count = coordinates.length - 1;

		for (let i = 0; i < count; i++) {
			x += coordinates[i][0]; // Longitude
			y += coordinates[i][1]; // Latitude
		}

		return {
			type: 'Point',
			coordinates: [x / count, y / count]
		};
	}

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
			return this.warpedMap?.georeferencedMap.resource.id + '/full/128,/0/default.jpg';
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

		constructor(containerId: string) {
			this.containerId = containerId;
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
								properties: { year: '2025' }
							}));

							this.map.addSource('map-outlines', {
								type: 'geojson',
								data: { type: 'FeatureCollection', features: polygons }
							});

							this.map.addSource('map-labels', {
								type: 'geojson',
								data: {
									type: 'FeatureCollection',
									features: polygons.map((p, i) => ({
										id: p.id, // Gebruik de ID van de polygoon (i)
										type: 'Feature',
										geometry: calculateSimpleCentroid(p.geometry), // <--- FUNCTIE RETOURNEERT NU HET VOLLEDIGE OBJECT
										properties: { year: p.properties.year } // Haal de year van de polygon feature
									}))
								}
							});

							this.map.addLayer({
								id: 'map-outlines-fill',
								type: 'fill',
								source: 'map-outlines',
								paint: {
									'fill-color': '#ff44aa',
									'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.3, 0]
								}
							});

							this.map.addLayer({
								id: 'map-outlines-layer',
								type: 'line',
								source: 'map-outlines',
								paint: {
									'line-color': '#ff44aa',
									'line-width': 1
								}
							});

							this.map.addLayer({
								id: 'map-outlines-labels',
								type: 'symbol',
								source: 'map-labels',
								minzoom: 0,
								maxzoom: 24,
								layout: {
									'text-field': ['get', 'year'],
									'text-font': ['Open Sans Regular', 'Arial Unicode MS Regular'],
									'text-size': 16,
									'text-allow-overlap': true,
									'symbol-placement': 'point', // belangrijk!
									'text-anchor': 'center',
									'text-ignore-placement': true
								},
								paint: {
									'text-color': '#333366',
									'text-halo-color': '#ffffff',
									'text-halo-width': 1
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
			console.log(year);
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
		}
	}
</script>

<div id="map-container2" class="width-100 height-[100vh] relative overflow-hidden"></div>

<style>
	#map-container2 {
		height: 100vh;
	}
</style>
