import type { Map as MaplibreMap } from "maplibre-gl";
import { MapLayer, type MapLayerOptions } from "./MapLayer.svelte";
import { DynamicAhnLayer } from "./dynamic-ahn/DynamicAhnLayer";
import { defaultStops, type GradientStop } from "./dynamic-ahn/gradient";
import type { HeightScale } from "./dynamic-ahn/terrain";

export class AhnMapLayer extends MapLayer {
	stops = $state.raw<readonly GradientStop[]>(defaultStops);
	/** Historische kaarten onder deze laag zwart-wit tonen */
	grayscale = $state(true);
	scale = $state.raw<HeightScale | null>(null);
	error = $state<string>();

	readonly #ahn: DynamicAhnLayer;
	readonly #disposeStyleEffect: () => void;

	constructor(options: Omit<MapLayerOptions, "type">) {
		super({ ...options, type: "ahn" });
		this.opacity = 0.6; // was ahnOpacity = 60

		this.#ahn = new DynamicAhnLayer({
			onScale: (scale) => (this.scale = scale),
			onError: (error) => (this.error = error),
		});

		this.#disposeStyleEffect = $effect.root(() => {
			$effect(() => {
				this.#ahn.setStyle(this.stops, this.opacity);
			});
		});
	}

	get mapLayerIds() {
		return [this.#ahn.id];
	}

	mount(map: MaplibreMap) {
		this.map = map;
		if (!map.getLayer(this.#ahn.id)) map.addLayer(this.#ahn);
		this.applyVisibility(this.effectiveVisible);
	}

	unmount() {
		if (this.map?.getLayer(this.#ahn.id)) this.map.removeLayer(this.#ahn.id);
		this.map = null;
	}

	protected applyVisibility(visible: boolean) {
		if (!this.map?.getLayer(this.#ahn.id)) return;
		this.map.setLayoutProperty(this.#ahn.id, "visibility", visible ? "visible" : "none");
	}

	// Opacity loopt via de effect in de constructor: setStyle wil stops én opacity tegelijk

	destroy() {
		this.#disposeStyleEffect();
		super.destroy();
	}
}
