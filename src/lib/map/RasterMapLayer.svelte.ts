// RasterMapLayer.svelte.ts
import type { Map as MaplibreMap } from "maplibre-gl";
import { MapLayer, type MapLayerOptions } from "./MapLayer.svelte";

export interface RasterMapLayerOptions extends Omit<MapLayerOptions, "type"> {
	type?: MapLayerOptions["type"]; // default "pdok-wms"
	sourceId: string;
	layerId: string;
	tiles: string[];
	tileSize?: number;
	minzoom?: number;
	maxzoom?: number;
}

export class RasterMapLayer extends MapLayer {
	readonly sourceId: string;
	readonly layerId: string;
	readonly tiles: string[];
	readonly tileSize: number;
	readonly minzoom?: number;
	readonly maxzoom?: number;

	constructor({
		sourceId,
		layerId,
		tiles,
		tileSize = 256,
		minzoom,
		maxzoom,
		type = "pdok-wms",
		...base
	}: RasterMapLayerOptions) {
		super({ ...base, type });
		this.sourceId = sourceId;
		this.layerId = layerId;
		this.tiles = tiles;
		this.tileSize = tileSize;
		this.minzoom = minzoom;
		this.maxzoom = maxzoom;
	}

	get mapLayerIds() {
		return [this.layerId];
	}

	mount(map: MaplibreMap) {
		this.map = map;

		if (!map.getSource(this.sourceId)) {
			map.addSource(this.sourceId, {
				type: "raster",
				tiles: this.tiles,
				tileSize: this.tileSize,
				...(this.minzoom !== undefined && { minzoom: this.minzoom }),
				...(this.maxzoom !== undefined && { maxzoom: this.maxzoom }),
			});
		}

		if (!map.getLayer(this.layerId)) {
			map.addLayer({
				id: this.layerId,
				type: "raster",
				source: this.sourceId,
				layout: { visibility: this.effectiveVisible ? "visible" : "none" },
				paint: { "raster-opacity": this.opacity },
			});
		}
	}

	unmount() {
		const map = this.map;
		if (!map) return;

		if (map.getLayer(this.layerId)) map.removeLayer(this.layerId);
		if (map.getSource(this.sourceId)) map.removeSource(this.sourceId);
		this.map = null;
	}

	protected applyVisibility(visible: boolean) {
		if (!this.map?.getLayer(this.layerId)) return;
		this.map.setLayoutProperty(this.layerId, "visibility", visible ? "visible" : "none");
	}

	protected applyOpacity(opacity: number) {
		if (!this.map?.getLayer(this.layerId)) return;
		this.map.setPaintProperty(this.layerId, "raster-opacity", opacity);
	}
}
