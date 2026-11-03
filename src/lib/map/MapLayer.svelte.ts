// src/lib/state/MapLayer.svelte.ts

export type MapLayerType = "historic-series" | "pdok-wms" | "pdok-wmts" | "vector-overlay";

export interface MapLayerOptions {
	id: string;
	name: string;
	themeColor?: string;
	type: MapLayerType;
	visible?: boolean;
	opacity?: number;
	added?: boolean; // Nieuw: of de laag actief in het paneel staat
}

export abstract class MapLayer {
	id: string;
	name: string;
	themeColor: string;
	type: MapLayerType;

	// Reactieve runes
	visible = $state(true);
	opacity = $state(1);
	added = $state(false); // Standaard niet in het actieve paneel, tenzij expliciet aangezet

	constructor(options: MapLayerOptions) {
		this.id = options.id;
		this.name = options.name;
		this.themeColor = options.themeColor ?? "#65e";
		this.type = options.type;
		this.visible = options.visible ?? true;
		this.opacity = options.opacity ?? 1;
		this.added = options.added ?? false;
	}

	abstract setVisibility(visible: boolean): void;
	abstract setOpacity(opacity: number): void;
}
