// src/lib/state/RasterMapLayer.svelte.ts

import type { Map as MaplibreMap, RasterSourceSpecification } from "maplibre-gl";
import { MapLayer, type MapLayerOptions } from "./MapLayer.svelte";

export interface RasterMapLayerOptions extends MapLayerOptions {
	sourceId: string;
	layerId: string;
	tiles: string[];
	tileSize?: number;
	minzoom?: number;
	maxzoom?: number;
	attribution?: string;
}

export class RasterMapLayer extends MapLayer {
	sourceId: string;
	layerId: string;
	tiles: string[];
	tileSize: number;
	minzoom?: number;
	maxzoom?: number;
	attribution?: string;

	private map: MaplibreMap | null = null;

	constructor(options: RasterMapLayerOptions) {
		super(options);
		this.sourceId = options.sourceId;
		this.layerId = options.layerId;
		this.tiles = options.tiles;
		this.tileSize = options.tileSize ?? 256;
		this.minzoom = options.minzoom;
		this.maxzoom = options.maxzoom;
		this.attribution = options.attribution;
	}

	addToMap(map: MaplibreMap) {
		this.map = map;

		if (!map.getSource(this.sourceId)) {
			const sourceSpec: RasterSourceSpecification = {
				type: "raster",
				tiles: this.tiles,
				tileSize: this.tileSize,
			};
			if (this.minzoom !== undefined) sourceSpec.minzoom = this.minzoom;
			if (this.maxzoom !== undefined) sourceSpec.maxzoom = this.maxzoom;
			if (this.attribution) sourceSpec.attribution = this.attribution;

			map.addSource(this.sourceId, sourceSpec);
		}

		if (!map.getLayer(this.layerId)) {
			map.addLayer({
				id: this.layerId,
				type: "raster",
				source: this.sourceId,
				layout: {
					visibility: this.visible ? "visible" : "none",
				},
				paint: {
					"raster-opacity": this.opacity,
				},
			});
		}
	}

	setVisibility(visible: boolean) {
		this.visible = visible;
		if (this.map && this.map.getLayer(this.layerId)) {
			this.map.setLayoutProperty(this.layerId, "visibility", visible ? "visible" : "none");
		}
	}

	setOpacity(opacity: number) {
		this.opacity = opacity;
		if (this.map && this.map.getLayer(this.layerId)) {
			this.map.setPaintProperty(this.layerId, "raster-opacity", opacity);
		}
	}
}
