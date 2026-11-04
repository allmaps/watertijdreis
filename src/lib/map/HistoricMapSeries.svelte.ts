// src/lib/state/HistoricMapSeries.svelte.ts
import { SvelteMap } from "svelte/reactivity";
import { WarpedMapLayer } from "@allmaps/maplibre";
import * as turf from "@turf/turf";
import type { GeoJSONSource, Map as MaplibreMap, MapGeoJSONFeature, MapMouseEvent } from "maplibre-gl";
import type { Filter, HistoricMap } from "$lib/types/historicmap";
import { transformToIIIFInfoJson } from "$lib/utils/allmaps";
import { calculateFilteredMapIds } from "./HistoricMapFilter";
import type { HistoricMapsContext } from "./historicMapsContext.svelte";
import { MapLayer } from "./MapLayer.svelte";

const LABEL_ZOOM_VALUES = [5, 6, 6, 9, 7, 12, 8, 15, 9, 17, 10, 18, 12, 22, 14, 26, 15, 28, 20, 28];
const EMPTY = { type: "FeatureCollection" as const, features: [] };
const DEFAULT_GRID_CENTER = { lng: 5.63, lat: 52.16 };

export class HistoricMapSeries extends MapLayer {
	url: string;
	spriteJsonUrl: string;
	spriteImageUrl: string;
	context: HistoricMapsContext;

	// Elke serie heeft zijn eigen WarpedMapLayer, zodat de z-volgorde tussen series klopt.
	readonly warpedMapLayer: WarpedMapLayer;

	// Alle maplibre-ids van deze serie, geprefixt met de serie-id
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
			const list = grouped.get(sheet.number) ?? [];
			list.unshift(sheet);
			grouped.set(sheet.number, list);
		}
		return grouped;
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
		id: string,
		name: string,
		themeColor: string,
		url: string,
		spriteJsonUrl: string,
		spriteImageUrl: string
	) {
		super({ id, name, themeColor, type: "historic-series", visible: true });

		this.url = url;
		this.context = context;
		this.spriteJsonUrl = spriteJsonUrl;
		this.spriteImageUrl = spriteImageUrl;

		this.warpedMapLayer = new WarpedMapLayer({ layerId: `warped-map-layer-${id}` });

		$effect.root(() => {
			// Filter toepassen (of alles verbergen) zodra zichtbaarheid of filter verandert
			$effect(() => {
				if (!this.mapsLoaded || !this.map) return;
				if (this.effectiveVisible) this.applyFilter();
				else this.#hideAll();
			});
		});
	}

	// ------------------------------------------------------------------
	// MapLayer-contract
	// ------------------------------------------------------------------

	get mapLayerIds() {
		// onderste eerst
		return [this.warpedMapLayer.id, this.ids.labels, this.ids.numbers, this.ids.fill, this.ids.stroke];
	}

	readonly #onSpritesLoaded = () => this.applyFilter();

	mount(map: MaplibreMap) {
		this.map = map;

		map.addLayer(this.warpedMapLayer);
		this.warpedMapLayer.setLayerOptions({ visible: false });
		this.warpedMapLayer.getWarpedMapList().options.animatedOptions.push("opacity");

		this.#addOutlineLayers(map);
		map.on("maptilesloadedfromsprites", this.#onSpritesLoaded);
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
	}

	// De kaartjes zelf (warped maps) worden door de $effect in de constructor aan/uit gezet;
	// hier gaat het om de outline-lagen van maplibre.
	// (Wordt aangeroepen vanuit de effect in MapLayer, dus de reads hieronder worden getrackt.)
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
		// Als er een kaart geselecteerd is, zijn de outlines verborgen, tenzij de bladwijzer open staat
		const showIndex = show && (!this.context.selectedMap || this.context.mapContext.sheetIndexVisible);

		const set = (id: string, visible: boolean) => {
			if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
		};
		set(this.ids.labels, show);
		set(this.ids.numbers, showIndex);
		set(this.ids.fill, showIndex);
		set(this.ids.stroke, showIndex);
	}

	// ------------------------------------------------------------------
	// Outlines
	// ------------------------------------------------------------------

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
				"text-color": "#65e",
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
			properties: { year: m.yearEnd, num: `${m.number}.${m.position}` },
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
			this.map.setPaintProperty(this.ids.numbers, "text-opacity", visible ? 1 : 0);
		}
	}

	// ------------------------------------------------------------------
	// Laden & filteren
	// ------------------------------------------------------------------

	async load() {
		if (!this.map) return;

		try {
			const res = await fetch(this.url);
			const data = await res.json();

			const imageInfos = data.map(transformToIIIFInfoJson);
			this.warpedMapLayer.addImageInfos(imageInfos);

			const loadPromises = data.map(async (item: any) => {
				const id = await this.warpedMapLayer.addGeoreferencedMap(item);
				const warpedMap = this.warpedMapLayer.getWarpedMap(id);

				this.mapsById.set(id, {
					id,
					manifestId: item.resource.partOf[0].id,
					polygon: {
						type: "Polygon",
						coordinates: [warpedMap?.geoMask.concat([warpedMap?.geoMask[0]])],
					},
					geoFullMaskBbox: warpedMap?.geoFullMaskBbox,
					...item._meta,
				});
			});

			await Promise.all(loadPromises);
			await this.#loadSprites();

			this.mapsLoaded = true;
		} catch (error) {
			console.error(`HistoricMapSeries (${this.name}): Fout tijdens het laden:`, error);
		}
	}

	async #loadSprites() {
		try {
			const spriteJson = await fetch(this.spriteJsonUrl).then((r) => r.json());
			const fullImageUrl = this.spriteImageUrl.startsWith("http")
				? this.spriteImageUrl
				: `${window.location.origin}${this.spriteImageUrl}`;

			this.warpedMapLayer.addSprites(spriteJson, fullImageUrl, [3072, 3078]);
		} catch (error) {
			console.error(`HistoricMapSeries (${this.name}): Fout tijdens laden sprites:`, error);
		}
	}

	applyFilter(filter: Filter = this.filter) {
		if (!this.mapsLoaded || !this.effectiveVisible) return;

		const { mapsToColor, mapsToDesaturate, mapsToHide, adjustedYearEnd } = calculateFilteredMapIds(
			this.mapsByNumber,
			filter
		);

		this.filter.yearEnd = adjustedYearEnd;

		const defaultOptions = { applyMask: true, transformationType: "thinPlateSpline", saturation: 1 };

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

	// ------------------------------------------------------------------
	// Events: de MapContext-router roept deze aan, van bovenste laag naar onderste
	// ------------------------------------------------------------------

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

	// ------------------------------------------------------------------
	// Grid / ripple / animaties
	// ------------------------------------------------------------------

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
