import { SvelteMap } from "svelte/reactivity";
import { WarpedMapLayer } from "@allmaps/maplibre";
import * as turf from "@turf/turf";
import type { GeoJSONSource, Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import { transformToIIIFInfoJson } from "$lib/utils/allmaps";
import { calculateFilteredMapIds } from "./HistoricMapFilter";
import type { HistoricMapsContext } from "./historicMapsContext.svelte";
import { MapLayer } from "./MapLayer.svelte";
import type {
	EditionRange,
	Filter,
	HistoricMap,
	HistoricMapSeriesOptions,
	SeriesSource,
	SpriteConfig,
} from "$lib/types/historicmap";

const LABEL_ZOOM_VALUES = [5, 6, 6, 9, 7, 12, 8, 15, 9, 17, 10, 18, 12, 22, 14, 26, 15, 28, 20, 28];
const EMPTY = { type: "FeatureCollection" as const, features: [] };
const DEFAULT_GRID_CENTER = { lng: 5.63, lat: 52.16 };

function sheetLabel(m: HistoricMap) {
	if (m.number === undefined) return m.label;
	return m.position ? `${m.number}.${m.position}` : `${m.number}`;
}

export class HistoricMapSeries extends MapLayer {
	context: HistoricMapsContext;
	readonly source: SeriesSource;
	hasEditions = $state(false);

	opacity = $state(1);

	warpedMapLayer: WarpedMapLayer;

	#loadPromise: Promise<void> | null = null;

	readonly ids = {
		outlinesSource: `${this.id}-outlines`,
		labelsSource: `${this.id}-labels`,
		labels: `${this.id}-outlines-labels`,
		numbers: `${this.id}-outlines-numbers`,
		fill: `${this.id}-outlines-fill`,
		stroke: `${this.id}-outlines-stroke`,
	};

	mapsLoaded = $state(false);

	mapsById = new SvelteMap<string, HistoricMap>();
	visibleMaps = new SvelteMap<string, HistoricMap>();

	mapsByNumber: Map<number, HistoricMap[]> = $derived.by(() => {
		if (!this.mapsLoaded) return new Map<number, HistoricMap[]>();
		const grouped = new Map<number, HistoricMap[]>();
		for (const sheet of this.mapsById.values()) {
			if (sheet.number === undefined) continue;
			const list = grouped.get(sheet.number) ?? [];
			list.unshift(sheet);
			grouped.set(sheet.number, list);
		}
		return grouped;
	});

	editions: EditionRange[] = $derived.by(() => {
		const byEdition = new Map<number, EditionRange>();

		for (const m of this.mapsById.values()) {
			if (m.edition === undefined) continue;

			const range = byEdition.get(m.edition) ?? { edition: m.edition, count: 0 };
			range.count++;

			const start = m.yearStart ?? m.yearEnd;
			const end = m.yearEnd ?? m.yearStart;
			if (start !== undefined) range.yearStart = Math.min(range.yearStart ?? start, start);
			if (end !== undefined) range.yearEnd = Math.max(range.yearEnd ?? end, end);

			byEdition.set(m.edition, range);
		}

		return Array.from(byEdition.values()).sort((a, b) => a.edition - b.edition);
	});

	filter: Filter = $state({
		yearStart: 1865,
		yearEnd: 1983,
		edition: "All",
		bis: false,
		type: undefined,
	});

	hoveredHistoricMap = $state<HistoricMap | null>(null);
	clickedHistoricMap = $state<HistoricMap | null>(null);
	gridVisible = $state(false);

	#hoveredFeatureId: number | null = null;
	#clickedFeatureId: number | null = null;
	#gridResetTimer: ReturnType<typeof setTimeout> | null = null;
	#gridVisibilityTimer: ReturnType<typeof setTimeout> | null = null;
	#rippleResetTimer: ReturnType<typeof setTimeout> | null = null;
	#featureTimeouts: Record<number | string, ReturnType<typeof setTimeout>> = {};
	#fillTimers = new Map<number, ReturnType<typeof setTimeout>>();

	constructor(
		context: HistoricMapsContext,
		{ id, name, themeColor, source, added, movable }: HistoricMapSeriesOptions
	) {
		super({ id, name, themeColor, type: "historic-series", visible: true, added, movable });

		this.context = context;
		this.source = source;
		this.warpedMapLayer = this.#createWarpedMapLayer();

		$effect.root(() => {
			$effect(() => {
				if (!this.mapsLoaded || !this.map) return;
				if (this.effectiveVisible) this.applyFilter();
				else this.#hideAll();
			});
		});
	}

	#createWarpedMapLayer() {
		return new WarpedMapLayer({ layerId: `warped-map-layer-${this.id}` });
	}

	mount(map: MaplibreMap) {
		this.map = map;

		map.addLayer(this.warpedMapLayer);
		this.warpedMapLayer.setLayerOptions({ visible: false });
		this.warpedMapLayer.getWarpedMapList().options.animatedOptions.push("opacity");

		this.#addOutlineLayers(map);
		map.on("maptilesloadedfromsprites", this.#onSpritesLoaded);

		void this.load();
	}

	unmount() {
		const map = this.map;
		if (!map) return;

		map.off("maptilesloadedfromsprites", this.#onSpritesLoaded);

		for (const id of [this.ids.stroke, this.ids.fill, this.ids.numbers, this.ids.labels, this.warpedMapLayer.id]) {
			if (map.getLayer(id)) map.removeLayer(id);
		}
		for (const id of [this.ids.outlinesSource, this.ids.labelsSource]) {
			if (map.getSource(id)) map.removeSource(id);
		}
		this.map = null;

		const { selectedMapId, pinnedMapId } = this.context;
		if (selectedMapId && this.mapsById.has(selectedMapId)) this.context.selectedMapId = null;
		if (pinnedMapId && this.mapsById.has(pinnedMapId)) this.context.pinnedMapId = null;

		this.#clearTimers();
		this.hoveredHistoricMap = null;
		this.clickedHistoricMap = null;
		this.gridVisible = false;
		this.#hoveredFeatureId = null;
		this.#clickedFeatureId = null;

		this.mapsById.clear();
		this.visibleMaps.clear();
		this.mapsLoaded = false;
		this.hasEditions = false;
		this.#loadPromise = null;

		this.warpedMapLayer = this.#createWarpedMapLayer();
		this.context.updateViewportMaps();
	}

	#clearTimers() {
		for (const t of [this.#gridResetTimer, this.#gridVisibilityTimer, this.#rippleResetTimer]) {
			if (t) clearTimeout(t);
		}
		this.#gridResetTimer = this.#gridVisibilityTimer = this.#rippleResetTimer = null;

		Object.values(this.#featureTimeouts).forEach(clearTimeout);
		this.#featureTimeouts = {};

		this.#fillTimers.forEach(clearTimeout);
		this.#fillTimers.clear();
	}

	selectEdition(edition: Filter["edition"]) {
		this.filter.edition = edition;

		const ends = (edition === "All" ? this.editions : this.editions.filter((e) => e.edition === edition))
			.map((e) => e.yearEnd)
			.filter((y): y is number => y !== undefined);
		if (ends.length) this.filter.yearEnd = Math.max(...ends);
	}

	get mapLayerIds() {
		return [this.warpedMapLayer.id, this.ids.labels, this.ids.numbers, this.ids.fill, this.ids.stroke];
	}

	readonly #onSpritesLoaded = () => this.applyFilter();

	protected applyVisibility(_visible: boolean) {
		this.#syncOutlineVisibility();
	}

	protected applyOpacity(opacity: number) {
		this.warpedMapLayer.setLayerOptions({ opacity });
	}

	#syncOutlineVisibility() {
		const map = this.map;
		if (!map) return;

		const show = this.effectiveVisible;
		const showIndex = show && (!this.context.selectedMap || this.context.mapContext.sheetIndexVisible);

		const set = (id: string, visible: boolean) => {
			if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
		};
		set(this.ids.labels, show);
		set(this.ids.numbers, showIndex);
		set(this.ids.fill, showIndex);
		set(this.ids.stroke, showIndex);
	}

	#addOutlineLayers(map: MaplibreMap) {
		map.addSource(this.ids.outlinesSource, { type: "geojson", data: EMPTY });
		map.addSource(this.ids.labelsSource, { type: "geojson", data: EMPTY });

		const textSize = ["interpolate", ["exponential", 1.2], ["zoom"], ...LABEL_ZOOM_VALUES] as any;

		map.addLayer({
			id: this.ids.labels,
			type: "symbol",
			source: this.ids.labelsSource,
			layout: {
				"text-font": ["literal", ["Metropolis Bold"]] as any,
				"text-field": ["to-string", ["get", "year"]],
				"text-size": textSize,
				"text-allow-overlap": true,
			},
			paint: {
				"text-color": "#f4a",
				"text-halo-color": "#eeeeff",
				"text-halo-width": 1,
				"text-opacity": 0,
			},
		});

		map.addLayer({
			id: this.ids.numbers,
			type: "symbol",
			source: this.ids.labelsSource,
			layout: {
				"text-font": ["literal", ["Metropolis Bold"]] as any,
				"text-field": ["to-string", ["get", "num"]],
				"text-size": textSize,
				"text-allow-overlap": true,
			},
			paint: {
				"text-color": "#65e",
				"text-halo-color": "#eeeeff",
				"text-halo-width": 1,
				"text-opacity-transition": { duration: 1000 },
				"text-opacity": 0,
			},
		});

		map.addLayer({
			id: this.ids.fill,
			type: "fill",
			source: this.ids.outlinesSource,
			paint: {
				"fill-color": this.themeColor,
				"fill-opacity": ["coalesce", ["feature-state", "animated-fill-opacity"], 0],
			},
		});

		map.addLayer({
			id: this.ids.stroke,
			type: "line",
			source: this.ids.outlinesSource,
			paint: {
				"line-color": this.themeColor,
				"line-width": 1,
				"line-opacity": ["coalesce", ["feature-state", "animated-stroke-opacity"], 0],
			},
		});
	}

	updateOutlines() {
		const map = this.map;
		if (!map) return;

		const maps = Array.from(this.visibleMaps.values());

		const polygons = maps.map((m, index) => ({
			type: "Feature" as const,
			id: index,
			geometry: m.polygon,
			properties: { id: m.id },
		}));

		const points = maps.map((m, index) => ({
			type: "Feature" as const,
			id: index,
			geometry: turf.centerOfMass(m.polygon).geometry,
			properties: { year: m.yearEnd ?? "", num: sheetLabel(m) },
		}));

		(map.getSource(this.ids.outlinesSource) as GeoJSONSource | undefined)?.setData({
			type: "FeatureCollection",
			features: polygons,
		});
		(map.getSource(this.ids.labelsSource) as GeoJSONSource | undefined)?.setData({
			type: "FeatureCollection",
			features: points,
		});
	}

	setLabelVisibility(visible = true) {
		const map = this.map;
		if (!map || !map.getLayer(this.ids.labels)) return;

		map.setPaintProperty(this.ids.numbers, "text-opacity", !visible ? +this.context.mapContext.sheetIndexVisible : 0);
		map.setPaintProperty(this.ids.labels, "text-opacity-transition", { duration: 300 });
		map.setPaintProperty(this.ids.labels, "text-opacity", visible ? 1 : 0);
	}

	setSheetIndexVisible(visible: boolean) {
		this.setGridVisibility(visible, DEFAULT_GRID_CENTER, 100, 150);
		if (this.map?.getLayer(this.ids.numbers)) {
			this.map.setPaintProperty(this.ids.labels, "text-opacity", visible ? 1 : 0);
		}
	}

	setGrayscale(on: boolean) {
		this.warpedMapLayer.setLayerOptions({ saturation: on ? 0 : 1 });
	}

	load(): Promise<void> {
		return (this.#loadPromise ??= this.#load());
	}

	async #load() {
		const layer = this.warpedMapLayer;
		if (!this.map) {
			this.#loadPromise = null;
			return;
		}

		try {
			const { source } = this;
			if (source.kind === "annotation") await this.#loadAnnotation(layer, source.url);
			else await this.#loadGeoreferencedMaps(layer, source.url, source.sprites);

			if (layer !== this.warpedMapLayer) return;

			this.hasEditions = Array.from(this.mapsById.values()).some((m) => m.edition !== undefined);
			this.mapsLoaded = true;

			this.map?.once("idle", () => this.context.updateViewportMaps());
		} catch (error) {
			this.#loadPromise = null;
			console.error(`HistoricMapSeries (${this.name}): Fout tijdens het laden:`, error);
		}
	}

	async #loadGeoreferencedMaps(layer: WarpedMapLayer, url: string, sprites?: SpriteConfig) {
		const data = await fetch(url).then((r) => r.json());

		layer.addImageInfos(data.map(transformToIIIFInfoJson));

		await Promise.all(
			data.map(async (item: any) => {
				const id = await layer.addGeoreferencedMap(item);
				this.#registerMap(layer, id, { manifestId: item.resource.partOf[0].id, ...item._meta });
			})
		);

		if (sprites) await this.#loadSprites(layer, sprites);
	}

	async #loadAnnotation(layer: WarpedMapLayer, url: string) {
		const annotation = await fetch(url).then((r) => r.json());
		const results = await layer.addGeoreferenceAnnotation(annotation);

		for (const result of results) {
			if (result.ok) this.#registerMap(layer, result.mapId);
			else console.warn(`HistoricMapSeries (${this.name}): kaart ${result.index} kon niet geladen worden`, result);
		}
	}

	#registerMap(layer: WarpedMapLayer, id: string, extra: Partial<HistoricMap> = {}) {
		if (layer !== this.warpedMapLayer) return; // verouderd

		const warpedMap = layer.getWarpedMap(id);
		if (!warpedMap) {
			console.warn(`HistoricMapSeries (${this.name}): geen WarpedMap voor id`, id);
			return;
		}

		const ring = warpedMap.geoMask;
		this.mapsById.set(id, {
			label: id,
			...extra,
			id,
			polygon: { type: "Polygon", coordinates: [[...ring, ring[0]]] },
			geoFullMaskBbox: warpedMap.geoFullMaskBbox,
		});
	}

	async #loadSprites(layer: WarpedMapLayer, { json, image, size }: SpriteConfig) {
		try {
			const spriteJson = await fetch(json).then((r) => r.json());
			const fullImageUrl = image.startsWith("http") ? image : `${window.location.origin}${image}`;
			layer.addSprites(spriteJson, fullImageUrl, size);
		} catch (error) {
			console.error(`HistoricMapSeries (${this.name}): Fout tijdens laden sprites:`, error);
		}
	}

	applyFilter(filter: Filter = this.filter) {
		if (!this.mapsLoaded || !this.effectiveVisible) return;

		if (!this.mapsLoaded || !this.effectiveVisible) return;

		const defaultOptions = { applyMask: true, transformationType: "thinPlateSpline", saturation: 1 };

		if (!this.hasEditions) {
			this.warpedMapLayer.setMapsOptions(Array.from(this.mapsById.keys()), { ...defaultOptions, visible: true });
			for (const [id, historicMap] of this.mapsById) this.visibleMaps.set(id, historicMap);
			this.updateOutlines();
			return;
		}

		const { mapsToColor, mapsToDesaturate, mapsToHide, adjustedYearEnd } = calculateFilteredMapIds(
			this.mapsByNumber,
			filter
		);

		this.filter.yearEnd = adjustedYearEnd;

		if (mapsToColor.length > 0) {
			this.warpedMapLayer.setMapsOptions(mapsToColor, { ...defaultOptions, visible: true });
		}
		if (mapsToHide.length > 0) {
			this.warpedMapLayer.setMapsOptions(mapsToHide, { ...defaultOptions, visible: false });
		}
		if (mapsToDesaturate.length > 0) {
			this.warpedMapLayer.setMapsOptions(mapsToDesaturate, { ...defaultOptions, visible: true, saturation: 0 });
		}

		mapsToHide.forEach((id) => this.visibleMaps.delete(id));
		[...mapsToColor, ...mapsToDesaturate].forEach((id) => {
			const historicMap = this.mapsById.get(id);
			if (historicMap) this.visibleMaps.set(id, historicMap);
		});

		this.updateOutlines();
		this.context.mapContext.toastContent = `Je ziet nu kaarten van ${Math.round(filter.yearEnd)} en ouder`;
	}

	#hideAll() {
		const allMapIds = Array.from(this.mapsById.keys());
		this.warpedMapLayer.setMapsOptions(allMapIds, { visible: false });
		this.visibleMaps.clear();
		this.updateOutlines();
	}

	getMapIdsInViewport(): string[] {
		return Array.from(this.warpedMapLayer.renderer?.mapsInViewport ?? []);
	}

	resetClicked() {
		this.#clickedFeatureId = null;
	}

	#featureAt(e: MapMouseEvent): MapGeoJSONFeature | undefined {
		const map = this.map;
		if (!map?.getLayer(this.ids.fill)) return undefined;
		return map.queryRenderedFeatures(e.point, { layers: [this.ids.fill] })[0];
	}

	onClick(e: MapMouseEvent): boolean {
		const feature = this.#featureAt(e);
		if (!feature) return false;

		const historicMap = this.mapsById.get(feature.properties?.id) ?? null;

		if (this.#shouldOpenImmediately(historicMap)) {
			this.context.selectedMapId = historicMap?.id ?? null;
			return true;
		}

		this.setGridVisibility(true, e.lngLat);

		if (this.#rippleResetTimer) clearTimeout(this.#rippleResetTimer);
		this.#rippleResetTimer = setTimeout(() => this.setGridVisibility(false, e.lngLat), 1500);

		this.#handleMapSelection(historicMap, Number(feature.id));
		this.#triggerFillFlashAnimation(Number(feature.id));
		return true;
	}

	onPointerMove(e: MapMouseEvent): boolean {
		const feature = this.#featureAt(e);
		if (!feature) return false;

		const map = this.map!;
		const featureId = Number(feature.id);

		if (this.#hoveredFeatureId !== null && this.#hoveredFeatureId !== featureId) {
			map.setFeatureState({ source: this.ids.outlinesSource, id: this.#hoveredFeatureId }, { hover: false });
		}

		this.#hoveredFeatureId = featureId;
		map.setFeatureState({ source: this.ids.outlinesSource, id: featureId }, { hover: true });
		this.hoveredHistoricMap = this.mapsById.get(feature.properties?.id) ?? null;
		return true;
	}

	onPointerLeave() {
		if (this.#hoveredFeatureId !== null && this.map?.getSource(this.ids.outlinesSource)) {
			this.map.setFeatureState({ source: this.ids.outlinesSource, id: this.#hoveredFeatureId }, { hover: false });
		}
		this.#hoveredFeatureId = null;
		this.hoveredHistoricMap = null;
	}

	#handleMapSelection(historicMap: HistoricMap | null, featureId: number) {
		this.clickedHistoricMap = historicMap;
		this.#clickedFeatureId = featureId;

		if (this.#gridResetTimer) clearTimeout(this.#gridResetTimer);
		this.#gridResetTimer = setTimeout(() => {
			this.clickedHistoricMap = null;
			this.#clickedFeatureId = null;
		}, 2500);
	}

	#shouldOpenImmediately(historicMap: HistoricMap | null): boolean {
		if (!historicMap) return false;
		if (this.context.mapContext.sheetIndexVisible) return true;
		return this.clickedHistoricMap?.id === historicMap.id;
	}

	setGridVisibility(isVisible: boolean, centerLngLat = DEFAULT_GRID_CENTER, rippleScale = 3, speed = 300) {
		const map = this.map;
		if (!map || !map.getSource(this.ids.outlinesSource)) return;
		if (this.context.mapContext.sheetIndexVisible && !isVisible) return;

		const allFeatures = map.querySourceFeatures(this.ids.outlinesSource);

		if (this.#gridVisibilityTimer) clearTimeout(this.#gridVisibilityTimer);
		this.#gridVisibilityTimer = setTimeout(() => (this.gridVisible = isVisible), 100);

		if (isVisible && this.#gridResetTimer) {
			clearTimeout(this.#gridResetTimer);
			this.#gridResetTimer = null;
		}

		const hoverFillOpacity = isVisible ? 0.1 : 0;

		map.setPaintProperty(this.ids.fill, "fill-opacity", [
			"max",
			["coalesce", ["feature-state", "animated-fill-opacity"], 0],
			["case", ["boolean", ["feature-state", "hover"], false], hoverFillOpacity, 0],
		]);

		allFeatures.forEach((feature: any) => {
			const id = feature.id;
			if (id === undefined) return;

			if (this.#featureTimeouts[id]) {
				clearTimeout(this.#featureTimeouts[id]);
				delete this.#featureTimeouts[id];
			}

			if (!isVisible) {
				this.#animateFeatureOpacity(id, "animated-stroke-opacity", 0, 500);
				return;
			}

			const [x, y] = feature.geometry.coordinates[0][0];
			const distance = Math.sqrt((centerLngLat.lng - x) ** 2 + (centerLngLat.lat - y) ** 2);

			const delay = distance * speed;
			const targetOpacity = Math.max(0, 0.5 - distance / rippleScale);

			this.#featureTimeouts[id] = setTimeout(() => {
				this.#animateFeatureOpacity(id, "animated-stroke-opacity", targetOpacity, 500);
				delete this.#featureTimeouts[id];
			}, delay);
		});
	}

	#animateFeatureOpacity(
		featureId: number | string,
		stateKey: string,
		targetOpacity: number,
		duration: number,
		callback?: () => void
	) {
		const map = this.map;
		if (!map) return;

		const source = this.ids.outlinesSource;
		const startOpacity = (map.getFeatureState({ source, id: featureId })[stateKey] as number) || 0;
		const startTime = performance.now();

		const animate = (now: number) => {
			const progress = Math.min((now - startTime) / duration, 1);
			const current = startOpacity + (targetOpacity - startOpacity) * progress;

			this.map?.setFeatureState({ source, id: featureId }, { [stateKey]: current });

			if (progress < 1) requestAnimationFrame(animate);
			else callback?.();
		};

		requestAnimationFrame(animate);
	}

	#triggerFillFlashAnimation(featureId: number) {
		if (this.#clickedFeatureId !== null && this.#clickedFeatureId !== featureId) {
			clearTimeout(this.#fillTimers.get(this.#clickedFeatureId));
			this.#animateFeatureOpacity(this.#clickedFeatureId, "animated-fill-opacity", 0, 300);
		}

		clearTimeout(this.#fillTimers.get(featureId));
		this.#clickedFeatureId = featureId;

		this.#animateFeatureOpacity(featureId, "animated-fill-opacity", 0.15, 200, () => {
			if (this.#clickedFeatureId !== featureId) {
				this.#animateFeatureOpacity(featureId, "animated-fill-opacity", 0, 300);
				return;
			}

			this.#fillTimers.set(
				featureId,
				setTimeout(() => {
					this.#animateFeatureOpacity(featureId, "animated-fill-opacity", 0, 500);
					this.#fillTimers.delete(featureId);
				}, 1000)
			);
		});
	}
}
