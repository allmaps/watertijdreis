// src/lib/state/layersManager.svelte.ts
import type { Map as MaplibreMap } from "maplibre-gl";
import type { MapLayer } from "./MapLayer.svelte";
import { RasterMapLayer } from "./RasterMapLayer.svelte";
import { HistoricMapSeries } from "./HistoricMapSeries.svelte";

export class LayersManager {
	// 1. De catalogus van ALLE beschikbare lagen in de applicatie
	availableLayers: MapLayer[] = $state([]);

	// 2. De subset van lagen die de gebruiker heeft toegevoegd aan diens paneel
	activeLayers: MapLayer[] = $derived.by(() => {
		return this.availableLayers.filter((layer) => layer.added);
	});

	private map: MaplibreMap | null = null;

	constructor() {}

	/**
	 * Initialiseer de manager met de MapLibre instantie en registreer alle basislagen
	 */
	init(map: MaplibreMap) {
		this.map = map;

		// Registreer alle bekende lagen in de catalogus
		// Sommige starten direct als 'added: true' (zoals de waterschapsgrenzen en historische series)
		// Andere starten als 'added: false' (zoals satelliet en AHN), zodat ze via 'Laag toevoegen' gekozen kunnen worden.
	}

	registerLayer(layer: MapLayer, initialAdded = false) {
		layer.added = initialAdded;
		this.availableLayers.push(layer);

		// Als hij meteen bij start actief moet zijn en het is een RasterLayer, direct toevoegen aan MapLibre
		if (initialAdded && this.map && layer instanceof RasterMapLayer) {
			layer.addToMap(this.map);
		}
	}

	/**
	 * Voeg een laag toe vanuit de catalogus aan het actieve paneel/kaart
	 */
	addLayerToActive(layerId: string) {
		const layer = this.availableLayers.find((l) => l.id === layerId);
		if (!layer || layer.added) return;

		layer.added = true;
		layer.visible = true;

		// Als het een rasterlaag is en de map is er, direct inladen in MapLibre
		if (this.map && layer instanceof RasterMapLayer) {
			layer.addToMap(this.map);
		}
	}

	/**
	 * Verwijder/verberg een laag uit het actieve paneel
	 */
	removeLayerFromActive(layerId: string) {
		const layer = this.availableLayers.find((l) => l.id === layerId);
		if (!layer || !layer.added) return;

		layer.added = false;
		layer.setVisibility(false);
		// Eventueel kun je hier ook layer.removeFromMap(this.map) aanroepen als je de MapLibre bron ook echt wilt opruimen.
	}
}
