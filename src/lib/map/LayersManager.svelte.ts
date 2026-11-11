import type { Map as MaplibreMap } from "maplibre-gl";
import type { MapLayer } from "./MapLayer.svelte";
import { RasterMapLayer } from "./RasterMapLayer.svelte";
import { HistoricMapSeries } from "./HistoricMapSeries.svelte";

export class LayersManager {
	availableLayers: MapLayer[] = $state([]);

	activeLayers: MapLayer[] = $derived.by(() => {
		return this.availableLayers.filter((layer) => layer.added);
	});

	private map: MaplibreMap | null = null;

	constructor() {}

	init(map: MaplibreMap) {
		this.map = map;
	}

	registerLayer(layer: MapLayer, initialAdded = false) {
		layer.added = initialAdded;
		this.availableLayers.push(layer);

		if (initialAdded && this.map && layer instanceof RasterMapLayer) {
			layer.addToMap(this.map);
		}
	}

	addLayerToActive(layerId: string) {
		const layer = this.availableLayers.find((l) => l.id === layerId);
		if (!layer || layer.added) return;

		layer.added = true;
		layer.visible = true;

		if (this.map && layer instanceof RasterMapLayer) {
			layer.addToMap(this.map);
		}
	}

	removeLayerFromActive(layerId: string) {
		const layer = this.availableLayers.find((l) => l.id === layerId);
		if (!layer || !layer.added) return;

		layer.added = false;
		layer.setVisibility(false);
	}
}
