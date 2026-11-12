import type { Map as MaplibreMap } from "maplibre-gl";
import { MapLayer, type MapLayerOptions } from "./MapLayer.svelte";
import {
	DynamicAhnLayer,
	type AhnOptions,
	type BlendMode,
	type MappingMode,
	type HeightStatistics,
} from "./dynamic-ahn/DynamicAhnLayer";
import { defaultStops, type GradientStop } from "./dynamic-ahn/gradient";
import { attachAhnCursor } from "./ahnCursor";
import { defaults } from "./dynamic-ahn/options";
import type { HeightScale } from "./dynamic-ahn/terrain";

export class AhnMapLayer extends MapLayer {
	stops = $state.raw<readonly GradientStop[]>(defaultStops);

	grayscale = $state(true);
	showCursorHeight = $state(false);
	blendMode = $state<BlendMode>(defaults.blendMode);
	mappingMode = $state<MappingMode>(defaults.mappingMode);
	scaleMode = $state<AhnOptions["scaleMode"]>(defaults.scaleMode);
	outlierPercentile = $state<AhnOptions["outlierPercentile"]>(defaults.outlierPercentile);
	statistics = $state.raw<HeightStatistics | null>(null);
	scale = $state.raw<HeightScale | null>(null);
	/** Keep manual handles on their original metre axis, including when reopening settings. */
	legendAxis = $state.raw<HeightScale | null>(null);
	error = $state<string>();
	#scaleLocked = $state(false);

	readonly #ahn: DynamicAhnLayer;
	readonly #disposeStyleEffect: () => void;

	constructor(options: Omit<MapLayerOptions, "type">) {
		super({ ...options, type: "ahn" });
		this.opacity = 0.75;

		this.#ahn = new DynamicAhnLayer({
			onStatistics: (statistics) => (this.statistics = statistics),
			onScale: (scale) => {
				this.scale = scale;
				this.#scaleLocked = this.#ahn.isScaleLocked();
			},
			onError: (error) => (this.error = error),
		});

		this.#disposeStyleEffect = $effect.root(() => {
			$effect(() => {
				if (this.map && this.effectiveVisible && this.showCursorHeight)
					return attachAhnCursor(this.map, (lng, lat) => this.#ahn.getHeight(lng, lat));
			});
			$effect(() => {
				this.#ahn.setStyle(this.stops, this.opacity);
			});
			$effect(() => {
				this.#ahn.setOptions({
					blendMode: this.blendMode,
					mappingMode: this.mappingMode,
					scaleMode: ["equalized", "extremes"].includes(this.mappingMode) ? "extent" : this.scaleMode,
					outlierPercentile: this.outlierPercentile,
				});
			});
		});
	}

	get scaleLocked() {
		return this.#scaleLocked;
	}

	setScale(scale: HeightScale) {
		this.#ahn.setScale(scale);
		this.#scaleLocked = this.#ahn.isScaleLocked();
	}

	setRange(low: number, high: number) {
		this.#ahn.setRange(low, high);
		this.#scaleLocked = this.#ahn.isScaleLocked();
	}

	lockScale() {
		this.#ahn.lockScale();
		this.#scaleLocked = this.#ahn.isScaleLocked();
	}

	unlockScale() {
		this.#ahn.unlockScale();
		this.#scaleLocked = this.#ahn.isScaleLocked();
		this.legendAxis = null;
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

	destroy() {
		this.#disposeStyleEffect();
		super.destroy();
	}
}
