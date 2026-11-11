import type { Map as MaplibreMap, MapMouseEvent } from "maplibre-gl";

export type MapLayerType = "pdok-wms" | "historic-series" | "ahn";

export interface MapLayerOptions {
	id: string;
	name: string;
	themeColor: string;
	type: MapLayerType;
	visible?: boolean;
	added?: boolean;
	movable?: boolean;
}

export abstract class MapLayer {
	readonly id: string;
	name: string;
	themeColor: string;
	readonly type: MapLayerType;
	movable: boolean;

	added = $state(false);
	visible = $state(true);
	opacity = $state(0.7);
	suppressed = $state(false);

	effectiveVisible = $derived(this.added && this.visible && !this.suppressed);

	protected map = $state<MaplibreMap | null>(null);

	#disposeEffects: () => void;

	constructor({ id, name, themeColor, type, visible = true, added = false, movable = true }: MapLayerOptions) {
		this.id = id;
		this.name = name;
		this.themeColor = themeColor;
		this.type = type;
		this.visible = visible;
		this.added = added;
		this.movable = movable;

		this.#disposeEffects = $effect.root(() => {
			$effect(() => {
				if (!this.map) return; // nog niet gemount
				this.applyVisibility(this.effectiveVisible);
			});

			$effect(() => {
				if (!this.map) return;
				this.applyOpacity(this.opacity);
			});
		});
	}

	destroy() {
		this.#disposeEffects();
	}

	abstract get mapLayerIds(): string[];
	abstract mount(map: MaplibreMap): void | Promise<void>;
	abstract unmount(): void;
	protected abstract applyVisibility(visible: boolean): void;
	protected applyOpacity(opacity: number): void {}

	onClick(e: MapMouseEvent): boolean {
		return false;
	}
	onPointerMove(e: MapMouseEvent): boolean {
		return false;
	}
	onPointerLeave(): void {}
}
