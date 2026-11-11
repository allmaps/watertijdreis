import * as maplibregl from "maplibre-gl";
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
if (typeof window !== "undefined") {
	setWorkerUrl(workerUrl);
}

import type { GeoJSONSource, Map as MaplibreMap, MapMouseEvent } from "maplibre-gl";
import * as pmtiles from "pmtiles";
import type { Feature } from "geojson";

import { createAvailableLayers, addUserLocationCircle } from "$lib/map/mapLayers.svelte";
import { basemapStyle } from "$lib/map/basemap";
import { getValidUserLocation } from "$lib/utils/userLocation";
import { type LayerOptions, type MapView } from "$lib/types/map";
import { HistoricMapsContext } from "./historicMapsContext.svelte";
import { applyStateFromURL, syncStateToURL, defaultState } from "./urlStateManager";
import type { MapLayer } from "./MapLayer.svelte";
import { HistoricMapSeries } from "./HistoricMapSeries.svelte";
import { AhnMapLayer } from "./AhnMapLayer.svelte";

const PINNED_TOP_IDS = ["user-location"];

export class MapContext {
	map: MaplibreMap | null = $state(null);
	maplibreLoaded = $state(false);
	viewportPolygon: Feature | null = $state(null);
	savedMapViews: MapView[] = $state([]);

	historic: HistoricMapsContext = new HistoricMapsContext(this);

	availableLayers = $state<MapLayer[]>([]);
	layers = $state<MapLayer[]>([]);

	#hovered: MapLayer | null = null;

	sheetIndexVisible = $state(false);
	toastContent = $state("");

	userLocationActive = $state(false);
	userLocationTimeout: ReturnType<typeof setTimeout> | null = null;

	layerOptions = $state<LayerOptions>({
		baseMap: "none",
		protoMapsWaterInFront: false,
		protoMapsLabelsInFront: false,
		historicMapsOpacity: 100,
		overlay: "none",
	});

	get gridVisible() {
		return this.historic.gridVisible;
	}

	get activeMap(): MaplibreMap {
		if (!this.map) {
			throw new Error("MapContext: Maplibre is not initialized yet. Call init() first.");
		}
		return this.map;
	}

	constructor() {
		$effect(() => {
			syncStateToURL(this);
		});

		$effect(() => {
			if (!this.maplibreLoaded) return;
			const layers = this.layers;

			layers.forEach((layer, index) => {
				if (!(layer instanceof HistoricMapSeries)) return;
				const covered = layers.some(
					(other, i) => i > index && other instanceof AhnMapLayer && other.effectiveVisible && other.grayscale
				);
				layer.setGrayscale(covered);
			});
		});
	}

	init(containerId: string) {
		maplibregl.addProtocol("pmtiles", new pmtiles.Protocol().tile);

		const protoStyle = basemapStyle("nl");

		this.map = new maplibregl.Map({
			container: containerId,
			style: {
				version: 8,
				glyphs: protoStyle.glyphs,
				sprite: protoStyle.sprite,
				sources: {},
				layers: [],
			},
			center: [defaultState.lng, defaultState.lat],
			zoom: defaultState.zoom,
			minZoom: 5.5,
			maxZoom: 16,
			maxPitch: 0,
			minPitch: 0,
			maxBounds: [
				[-12, 47],
				[22, 57],
			],
			bearing: 0,
			dragRotate: false,
			touchPitch: false,
			attributionControl: false,
		});

		this.map.dragRotate.disable();
		this.map.keyboard.disable();
		this.map.touchZoomRotate.disableRotation();
		this.map.doubleClickZoom.disable();

		this.#initEventRouting(this.map);

		this.map.on("load", async () => {
			this.availableLayers = createAvailableLayers(this);
			await this.#mountDefaultLayers();
			await this.historic.init();

			addUserLocationCircle(this.activeMap);

			this.updateViewport();
			this.activeMap.on("move", () => this.updateViewport());
			this.activeMap.on("moveend", () => syncStateToURL(this));

			applyStateFromURL(this);

			this.maplibreLoaded = true;
		});
	}

	async #mountDefaultLayers() {
		for (const layer of [...this.availableLayers]) {
			if (layer.added) await this.addLayer(layer);
		}
	}

	#initEventRouting(map: MaplibreMap) {
		map.on("click", (e) => {
			for (let i = this.layers.length - 1; i >= 0; i--) {
				const layer = this.layers[i];
				if (layer.effectiveVisible && layer.onClick(e)) return;
			}
		});

		map.on("mousemove", (e) => this.#setHovered(this.#findHoverTarget(e), map));
		map.on("mouseleave", () => this.#setHovered(null, map));
	}

	#findHoverTarget(e: MapMouseEvent): MapLayer | null {
		for (let i = this.layers.length - 1; i >= 0; i--) {
			const layer = this.layers[i];
			if (layer.effectiveVisible && layer.onPointerMove(e)) return layer;
		}
		return null;
	}

	#setHovered(layer: MapLayer | null, map: MaplibreMap) {
		if (layer !== this.#hovered) this.#hovered?.onPointerLeave();
		this.#hovered = layer;
		map.getCanvas().style.cursor = layer ? "pointer" : "";
	}

	async addLayer(layer: MapLayer, index = this.layers.length) {
		if (this.layers.includes(layer)) return;
		if (!this.availableLayers.includes(layer)) this.availableLayers.push(layer);

		layer.added = true;
		this.layers.splice(index, 0, layer);

		try {
			await layer.mount(this.activeMap);
		} catch (err) {
			layer.added = false;
			this.layers.splice(this.layers.indexOf(layer), 1);
			throw err;
		}

		this.applyOrder();
	}

	removeLayer(layer: MapLayer) {
		const i = this.layers.indexOf(layer);
		if (i === -1) return;

		if (this.#hovered === layer) this.#setHovered(null, this.activeMap);

		layer.unmount();
		layer.added = false;
		this.layers.splice(i, 1);
	}

	moveLayer(from: number, to: number) {
		if (from === to || from < 0 || to < 0 || from >= this.layers.length || to >= this.layers.length) return;

		const layer = this.layers[from];
		if (!layer.movable) return;

		const [lo, hi] = from < to ? [from + 1, to] : [to, from - 1];
		if (this.layers.slice(lo, hi + 1).some((l) => !l.movable)) return;

		this.layers.splice(from, 1);
		this.layers.splice(to, 0, layer);
		this.applyOrder();
	}

	applyOrder() {
		const map = this.activeMap;
		for (const layer of this.layers) {
			for (const id of layer.mapLayerIds) if (map.getLayer(id)) map.moveLayer(id);
		}
		for (const id of PINNED_TOP_IDS) if (map.getLayer(id)) map.moveLayer(id);
	}

	isolate(keep: MapLayer) {
		for (const layer of this.layers) layer.suppressed = layer !== keep;
		this.#setPinnedVisibility(false);
	}

	releaseIsolation() {
		for (const layer of this.layers) layer.suppressed = false;
		this.#setPinnedVisibility(true);
	}

	#setPinnedVisibility(visible: boolean) {
		for (const id of PINNED_TOP_IDS) {
			if (this.activeMap.getLayer(id)) {
				this.activeMap.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
			}
		}
	}

	saveMapView(push = true) {
		const view = {
			center: this.activeMap.getCenter(),
			zoom: this.activeMap.getZoom(),
			bearing: this.activeMap.getBearing(),
			pitch: this.activeMap.getPitch(),
		};
		if (push) this.savedMapViews.push(view);
		return view;
	}

	restoreView(view = this.savedMapViews.pop(), options = { duration: 500 }) {
		if (!view || !this.historic.mapsLoaded) return;

		const { center, zoom, bearing, pitch } = view;
		this.activeMap.easeTo({ center, zoom, bearing, pitch, ...options });

		this.releaseIsolation();
		this.historic.setSheetIndexVisibility(false);

		const prevId = this.historic.previousSelectedMapId;
		if (prevId) {
			this.historic.seriesOf(prevId)?.warpedMapLayer.setMapOptions(prevId, {
				visible: false,
				transformationType: "thinPlateSpline",
				applyMask: true,
			});
		}
		this.historic.applyFilter();
	}

	resetState() {
		if (!this.maplibreLoaded || !this.historic.mapsLoaded) return;

		this.historic.selectedMapId = null;
		this.restoreView();

		this.activeMap.easeTo({
			center: [defaultState.lng, defaultState.lat],
			zoom: defaultState.zoom,
			pitch: 0,
			bearing: 0,
		});

		const opacity = defaultState.historicMapsOpacity / 100;
		this.historic.series.forEach((s) => (s.opacity = opacity));
		this.layerOptions.historicMapsOpacity = defaultState.historicMapsOpacity;
	}

	updateViewport() {
		const bounds = this.activeMap.getBounds();
		this.viewportPolygon = {
			type: "Feature",
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[bounds.getWest(), bounds.getNorth()],
						[bounds.getEast(), bounds.getNorth()],
						[bounds.getEast(), bounds.getSouth()],
						[bounds.getWest(), bounds.getSouth()],
						[bounds.getWest(), bounds.getNorth()],
					],
				],
			},
			properties: {},
		};
	}

	zoomIn() {
		this.activeMap.zoomIn({ duration: 250 });
	}

	zoomOut() {
		this.activeMap.zoomOut({ duration: 250 });
	}

	flyToFeature(feature: Feature) {
		const { geometry, bbox } = feature;

		if (bbox) {
			const [minLng, minLat, maxLng, maxLat] = bbox;
			this.activeMap.fitBounds(
				[
					[minLng, minLat],
					[maxLng, maxLat],
				],
				{ padding: 40, maxZoom: 12, duration: 250 }
			);
		} else if (geometry?.type === "Point") {
			const [lng, lat] = geometry.coordinates;
			this.activeMap.flyTo({
				center: [lng, lat],
				zoom: 12,
				speed: 0.8,
				curve: 1.4,
				essential: true,
				duration: 250,
			});
		}
	}

	setLabelVisibility(visible = true) {
		if (!this.maplibreLoaded) return;
		this.historic.series.forEach((s) => s.setLabelVisibility(visible));
	}

	async flyToUserLocation() {
		try {
			const { lat, lng } = await getValidUserLocation();

			this.#setUserLocationMarker(lat, lng);
			this.userLocationActive = true;

			this.flyToFeature({
				type: "Feature",
				geometry: { type: "Point", coordinates: [lng, lat] },
				properties: { label: "Your location" },
			});

			if (this.userLocationTimeout) clearTimeout(this.userLocationTimeout);
			this.userLocationTimeout = setTimeout(() => {
				this.#animateUserLocationMarker(0, 6);

				setTimeout(() => {
					this.#clearUserLocationMarker();
					this.userLocationActive = false;
					this.userLocationTimeout = null;
				}, 400);
			}, 2500);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			if (errorMessage === "OUT_OF_BOUNDS") {
				alert("Je bent te ver buiten Nederland!");
			} else {
				console.error(err);
				alert("Kon locatie niet bepalen.");
			}
		}
	}

	#setUserLocationMarker(lat: number, lng: number) {
		const source = this.activeMap.getSource("user-location") as GeoJSONSource | undefined;
		if (!source) return;

		source.setData({
			type: "FeatureCollection",
			features: [{ type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {} }],
		});

		this.#animateUserLocationMarker(1, 10);
	}

	#animateUserLocationMarker(opacity: number, radius: number) {
		this.activeMap.setPaintProperty("user-location", "circle-opacity", opacity);
		this.activeMap.setPaintProperty("user-location", "circle-stroke-opacity", opacity);
		this.activeMap.setPaintProperty("user-location", "circle-radius", radius);
	}

	#clearUserLocationMarker() {
		const source = this.activeMap.getSource("user-location") as GeoJSONSource | undefined;
		source?.setData({ type: "FeatureCollection", features: [] });
	}
}
