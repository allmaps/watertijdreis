import type { GeoJSON } from "geojson";
import type { Map as MaplibreMap } from "maplibre-gl";
import { MapLayer, type MapLayerOptions } from "./MapLayer.svelte";

export interface VectorMapLayerOptions extends Omit<MapLayerOptions, "type"> {
	sourceId: string;
	/** URL naar een GeoJSON-bestand, of het object zelf */
	data: string | GeoJSON;
	/** Property met de naam voor de labels; weglaten = geen labels */
	labelField?: string;
	minzoom?: number;
	maxzoom?: number;
}

// Basis-opaciteiten; de opacity-slider van de laag schaalt hier overheen
const GLOW_OPACITY = 0.25;
const LINE_OPACITY = 0.9;

export class VectorMapLayer extends MapLayer {
	readonly sourceId: string;
	readonly data: string | GeoJSON;
	readonly labelField?: string;
	readonly minzoom?: number;
	readonly maxzoom?: number;

	readonly #ids: { glow: string; line: string; labels: string };

	opacity = $state(1);

	constructor({ sourceId, data, labelField, minzoom, maxzoom, ...base }: VectorMapLayerOptions) {
		super({ ...base, type: "vector" });
		this.sourceId = sourceId;
		this.data = data;
		this.labelField = labelField;
		this.minzoom = minzoom;
		this.maxzoom = maxzoom;
		this.#ids = {
			glow: `${base.id}-glow`,
			line: `${base.id}-line`,
			labels: `${base.id}-labels`,
		};
	}

	get mapLayerIds() {
		// onderste eerst
		return [this.#ids.glow, this.#ids.line, ...(this.labelField ? [this.#ids.labels] : [])];
	}

	mount(map: MaplibreMap) {
		this.map = map;

		if (!map.getSource(this.sourceId)) {
			map.addSource(this.sourceId, { type: "geojson", data: this.data });
		}

		const layout = { visibility: this.effectiveVisible ? ("visible" as const) : ("none" as const) };
		const zoomRange = {
			...(this.minzoom !== undefined && { minzoom: this.minzoom }),
			...(this.maxzoom !== undefined && { maxzoom: this.maxzoom }),
		};

		// Zachte gloed onder de lijn, zodat de grens ook op drukke kaarten opvalt
		if (!map.getLayer(this.#ids.glow)) {
			map.addLayer({
				id: this.#ids.glow,
				type: "line",
				source: this.sourceId,
				layout: { ...layout, "line-join": "round" },
				paint: {
					"line-color": this.themeColor,
					"line-width": ["interpolate", ["linear"], ["zoom"], 6, 3, 12, 8, 16, 14],
					"line-blur": ["interpolate", ["linear"], ["zoom"], 6, 3, 12, 6, 16, 10],
					"line-opacity": GLOW_OPACITY * this.opacity,
				},
				...zoomRange,
			});
		}

		if (!map.getLayer(this.#ids.line)) {
			map.addLayer({
				id: this.#ids.line,
				type: "line",
				source: this.sourceId,
				layout: { ...layout, "line-join": "round", "line-cap": "round" },
				paint: {
					"line-color": this.themeColor,
					"line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.75, 12, 1.5, 16, 2.5],
					"line-dasharray": [4, 2],
					"line-opacity": LINE_OPACITY * this.opacity,
				},
				...zoomRange,
			});
		}

		if (this.labelField && !map.getLayer(this.#ids.labels)) {
			map.addLayer({
				id: this.#ids.labels,
				type: "symbol",
				source: this.sourceId,
				layout: {
					...layout,
					"text-font": ["literal", ["Metropolis Bold"]] as any,
					"text-field": ["to-string", ["get", this.labelField]],
					"text-size": ["interpolate", ["linear"], ["zoom"], 6, 10, 12, 13],
					"text-letter-spacing": 0.08,
					"text-transform": "uppercase",
					"text-max-width": 8,
				},
				paint: {
					"text-color": this.themeColor,
					"text-halo-color": "#ffffff",
					"text-halo-width": 1.5,
					"text-opacity": this.opacity,
				},
				...zoomRange,
			});
		}
	}

	unmount() {
		const map = this.map;
		if (!map) return;

		for (const id of [this.#ids.labels, this.#ids.line, this.#ids.glow]) {
			if (map.getLayer(id)) map.removeLayer(id);
		}
		if (map.getSource(this.sourceId)) map.removeSource(this.sourceId);
		this.map = null;
	}

	protected applyVisibility(visible: boolean) {
		if (!this.map) return;
		for (const id of this.mapLayerIds) {
			if (this.map.getLayer(id)) this.map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
		}
	}

	protected applyOpacity(opacity: number) {
		const map = this.map;
		if (!map) return;

		const set = (id: string, prop: string, value: number) => {
			if (map.getLayer(id)) map.setPaintProperty(id, prop, value);
		};
		set(this.#ids.glow, "line-opacity", GLOW_OPACITY * opacity);
		set(this.#ids.line, "line-opacity", LINE_OPACITY * opacity);
		set(this.#ids.labels, "text-opacity", opacity);
	}
}
