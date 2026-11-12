import { untrack } from "svelte";
import type { Filter, HistoricMap, HistoricMapSeriesOptions } from "$lib/types/historicmap";
import type { MapView } from "$lib/types/map";
import type { MapContext } from "./mapContext.svelte";
import { HistoricMapSeries } from "./HistoricMapSeries.svelte";
import { SheetInfo } from "./sheetInfo.svelte";

const SPRITE_JSON = "/sprites/regular-sheets-128.json";
const SPRITE_IMAGE = "/sprites/regular-sheets-128.jpg";

const SERIES_CONFIG: HistoricMapSeriesOptions[] = [
	{
		id: "wsk",
		name: "Waterstaatkaarten",
		themeColor: "#ff44aa",
		added: true,
		source: {
			kind: "georeferenced-maps",
			url: "maps-sorted-by-edition.json",
			sprites: { json: SPRITE_JSON, image: SPRITE_IMAGE, size: [3072, 3078] },
		},
	},
	{
		id: "vfd",
		name: "Von Frijtag Drabbe",
		themeColor: "#44aa44",
		source: {
			kind: "annotation",
			url: "./von-frijtag-drabbe.json",
		},
	},
	{
		id: "rk",
		name: "Rivierkaart",
		themeColor: "#44aaff",
		source: {
			kind: "annotation",
			url: "./rivierkaart-tweede-herziening.json",
		},
	},
];

const DEFAULT_FILTER: Filter = {
	yearStart: 1865,
	yearEnd: 1983,
	edition: "All",
	bis: false,
	type: undefined,
};

export class HistoricMapsContext {
	mapContext: MapContext;

	series = $state<HistoricMapSeries[]>([]);

	readonly info: SheetInfo;

	get primarySeries(): HistoricMapSeries | undefined {
		return this.series[0];
	}

	get activeSeries() {
		return this.series.filter((s) => s.added);
	}

	get mapsLoaded(): boolean {
		return this.series.some((s) => s.mapsLoaded);
	}

	createSeries(): HistoricMapSeries[] {
		this.series = SERIES_CONFIG.map((config) => new HistoricMapSeries(this, config));
		return this.series;
	}

	get hoveredHistoricMap() {
		return this.series.find((s) => s.hoveredHistoricMap)?.hoveredHistoricMap ?? null;
	}

	get clickedHistoricMap() {
		return this.series.find((s) => s.clickedHistoricMap)?.clickedHistoricMap ?? null;
	}

	get gridVisible() {
		return this.series.some((s) => s.gridVisible);
	}

	get filter(): Filter {
		return this.primarySeries?.filter ?? DEFAULT_FILTER;
	}

	get mapsByNumber(): Map<number, HistoricMap[]> {
		return this.primarySeries?.mapsByNumber ?? new Map();
	}

	mapsById: Map<string, HistoricMap> = $derived.by(() => {
		const aggregated = new Map<string, HistoricMap>();
		for (const s of this.series) for (const [id, map] of s.mapsById) aggregated.set(id, map);
		return aggregated;
	});

	visibleMaps: Map<string, HistoricMap> = $derived.by(() => {
		const aggregated = new Map<string, HistoricMap>();
		for (const s of this.series) for (const [id, map] of s.visibleMaps) aggregated.set(id, map);
		return aggregated;
	});

	#mapIdsInViewport = $state<string[]>([]);

	mapsInViewport = $derived.by(() => {
		const maps = new Map<string, HistoricMap>();
		for (const id of this.#mapIdsInViewport) {
			const mapData = this.mapsById.get(id);
			if (mapData) maps.set(id, mapData);
		}
		return maps;
	});

	visibleMapsInViewport = $derived.by(() => {
		const maps = new Map<string, HistoricMap>();
		for (const id of this.#mapIdsInViewport) {
			if (!this.visibleMaps.has(id)) continue;
			const mapData = this.mapsById.get(id);
			if (mapData) maps.set(id, mapData);
		}
		return maps;
	});

	selectedMapId: string | null = $state(null);
	previousSelectedMapId: string | null = null;
	pinnedMapId: string | null = $state(null);
	pinnedMapView: MapView | null = $state(null);

	selectedMap: HistoricMap | null = $derived(
		this.selectedMapId ? (this.mapsById.get(this.selectedMapId) ?? null) : null
	);
	pinnedMap: HistoricMap | null = $derived(this.pinnedMapId ? (this.mapsById.get(this.pinnedMapId) ?? null) : null);

	previewMap: HistoricMap | null = $derived.by(() => {
		if (this.clickedHistoricMap) return this.clickedHistoricMap;
		if (this.mapContext.sheetIndexVisible) return this.hoveredHistoricMap;
		return null;
	});

	constructor(mapContext: MapContext) {
		this.mapContext = mapContext;
		this.info = new SheetInfo(this);

		$effect(() => {
			if (!this.mapsLoaded) return;
			const selectedMap = this.selectedMap;

			untrack(() => {
				if (selectedMap) {
					const view = selectedMap.id === this.pinnedMapId ? this.pinnedMapView : null;
					this.setHistoricMapView(selectedMap, view);
					this.previousSelectedMapId = selectedMap.id;
				} else {
					this.mapContext.restoreView();
					this.#restoreSeriesOpacity();
					this.previousSelectedMapId = null;
				}
			});
		});
	}

	async init() {
		this.#applyDevDefaults();

		await Promise.all(this.activeSeries.map((s) => s.load()));

		this.mapContext.activeMap.on("moveend", () => this.updateViewportMaps());
		this.updateViewportMaps();
	}

	#applyDevDefaults() {
		const wsk = this.series.find((s) => s.id === "wsk");

		setTimeout(() => {
			if (wsk) {
				wsk.filter.edition = 5;
				wsk.filter.yearEnd = 2000;
			}
		}, 1000);
	}

	seriesOf(mapId: string | null): HistoricMapSeries | undefined {
		return mapId ? this.series.find((s) => s.mapsById.has(mapId)) : undefined;
	}

	updateViewportMaps() {
		this.#mapIdsInViewport = this.activeSeries.flatMap((s) => s.getMapIdsInViewport());
	}

	applyFilter() {
		this.activeSeries.forEach((s) => s.applyFilter());
	}

	setSheetIndexVisibility(visible = !this.mapContext.sheetIndexVisible) {
		this.mapContext.sheetIndexVisible = visible;
		this.activeSeries.forEach((s) => s.setSheetIndexVisible(visible));
		return visible;
	}

	setHistoricMapView(historicMap: HistoricMap, view?: MapView | null) {
		if (!this.mapsLoaded) return;

		const series = this.seriesOf(historicMap.id);
		if (!series) return;

		this.series.forEach((s) => s.resetClicked());
		this.setSheetIndexVisibility(false);

		if (!this.previousSelectedMapId) this.mapContext.saveMapView();
		this.#isolateHistoricMapLayer(series, historicMap.id);
		this.#zoomToHistoricMap(series, historicMap, view);
	}

	#isolateHistoricMapLayer(series: HistoricMapSeries, selectedId: string) {
		this.mapContext.isolate(series);
		series.warpedMapLayer.setLayerOptions({ opacity: 1 });

		const mapsToHide = Array.from(series.visibleMaps.keys()).filter((id) => id !== selectedId);

		const prevId = this.previousSelectedMapId;
		if (prevId && prevId !== selectedId) {
			const prevSeries = this.seriesOf(prevId);
			if (prevSeries === series) mapsToHide.push(prevId);
			else prevSeries?.warpedMapLayer.setMapsOptions([prevId], { visible: false });
		}

		series.warpedMapLayer.setMapsOptions(mapsToHide, { visible: false });

		series.warpedMapLayer.setMapsOptions(mapsToHide, { visible: false });

		series.warpedMapLayer.setMapOptions(selectedId, {
			visible: true,
			transformationType: "straight",
			saturation: 1,
			opacity: 1,
			applyMask: false,
		});
	}

	#zoomToHistoricMap(series: HistoricMapSeries, historicMap: HistoricMap, view?: MapView | null) {
		if (view) {
			this.mapContext.activeMap.easeTo(view);
			return;
		}

		const bbox = series.warpedMapLayer.getMapsBbox([historicMap.id], {
			projection: { definition: "EPSG:4326" },
		});
		if (!bbox) return;

		const [minX, minY, maxX, maxY] = bbox;
		this.mapContext.activeMap.fitBounds(
			[
				[minX, minY],
				[maxX, maxY],
			],
			{ padding: 88, speed: 2, curve: 1.8, essential: true, animate: this.previousSelectedMapId === null }
		);
	}

	#restoreSeriesOpacity() {
		for (const s of this.activeSeries) s.warpedMapLayer.setLayerOptions({ opacity: s.opacity });
	}
}
