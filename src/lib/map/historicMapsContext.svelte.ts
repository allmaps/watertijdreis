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
		themeColor: "#8888ff",
		source: {
			kind: "annotation",
			url: "./von-frijtag-drabbe.json",
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

	// ------------------------------------------------------------------
	// Interactie-state: doorgeefluik naar de series
	// ------------------------------------------------------------------
	get hoveredHistoricMap() {
		return this.series.find((s) => s.hoveredHistoricMap)?.hoveredHistoricMap ?? null;
	}

	get clickedHistoricMap() {
		return this.series.find((s) => s.clickedHistoricMap)?.clickedHistoricMap ?? null;
	}

	get gridVisible() {
		return this.series.some((s) => s.gridVisible);
	}

	// ------------------------------------------------------------------
	// Backwards compatibility voor een UI die nog niet met series werkt.
	// `filter` en `mapsByNumber` komen van de primaire serie; `mapsById` en
	// `visibleMaps` zijn geaggregeerd over alle series (kaart-ids zijn unieke hashes).
	// ------------------------------------------------------------------
	get filter(): Filter {
		return this.primarySeries?.filter ?? DEFAULT_FILTER;
	}

	/** Bladnummers botsen tussen series, daarom alleen de primaire serie */
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

	// ------------------------------------------------------------------
	// Viewport
	// ------------------------------------------------------------------
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

	// ------------------------------------------------------------------
	// Selectie. Eén bron van waarheid: de ID's. selectedMap/pinnedMap zijn daarvan afgeleid
	// en de $effect in de constructor roept setHistoricMapView aan.
	// ------------------------------------------------------------------
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
			const selectedMap = this.selectedMap; // de enige echte dependency naast mapsLoaded

			// Alles hieronder leest en schrijft veel state (savedMapViews, filters, ...).
			// Zonder untrack wordt dat allemaal een dependency en kan de effect zichzelf opnieuw triggeren.
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

		// Series met `added: true` laden zichzelf bij het mounten; hier wachten we alleen op ze
		await Promise.all(this.activeSeries.map((s) => s.load()));

		this.mapContext.activeMap.on("moveend", () => this.updateViewportMaps());
		this.updateViewportMaps();
	}

	/** TIJDELIJK: test-instellingen, weghalen zodra de UI dit zelf regelt */
	#applyDevDefaults() {
		const wsk = this.series.find((s) => s.id === "wsk");
		const rk = this.series.find((s) => s.id === "rk");

		setTimeout(() => {
			rk?.warpedMapLayer.setMapOptions("bccf023752ff6f99", { colorize: true, colorizeColor: "#00ff44" });
			rk?.warpedMapLayer.setMapOptions("fb8c7f459549c582", { colorize: true, colorizeColor: "#00ff44" });
			if (wsk) {
				wsk.filter.edition = 5;
				wsk.filter.yearEnd = 2000;
			}
		}, 1000);
	}

	// ------------------------------------------------------------------
	// Series
	// ------------------------------------------------------------------
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

	// ------------------------------------------------------------------
	// Kaartblad openen
	// ------------------------------------------------------------------
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
		// Alle andere lagen (en de gebruikerslocatie) tijdelijk verbergen
		this.mapContext.isolate(series);
		series.warpedMapLayer.setLayerOptions({ opacity: 1 });

		const mapsToHide = Array.from(series.visibleMaps.keys()).filter((id) => id !== selectedId);

		// Het vorige blad kan uit een andere serie komen
		const prevId = this.previousSelectedMapId;
		if (prevId && prevId !== selectedId) {
			const prevSeries = this.seriesOf(prevId);
			if (prevSeries === series) mapsToHide.push(prevId);
			else prevSeries?.warpedMapLayer.setMapsOptions([prevId], { visible: false });
		}

		series.warpedMapLayer.setMapsOptions(mapsToHide, { visible: false });

		series.warpedMapLayer.setMapsOptions(mapsToHide, { visible: false });

		// Het gekozen blad: ongemaskeerd en zonder vervorming, ook als het door het filter
		// verborgen of ontkleurd was
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
