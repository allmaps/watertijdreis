import * as turf from "@turf/turf";
import type { HistoricMap } from "$lib/types/historicmap";
import { registerBacksideMap } from "$lib/utils/allmaps";
import type { HistoricMapsContext } from "$lib/map/historicMapsContext.svelte";
import type { MapContext } from "$lib/map/mapContext.svelte";

export const MANIFEST_URL = "https://tu-delft-heritage.github.io/watertijdreis-data/collection.json";

// Minimale typering van de IIIF-onderdelen die we gebruiken
type LanguageMap = Record<string, string[] | undefined>;
type IiifMetadata = { label: LanguageMap; value: LanguageMap };
type IiifCanvas = {
	id: string;
	metadata?: IiifMetadata[];
	items?: { items?: { body?: { id?: string; service?: { id: string }[] } }[] }[];
	annotations?: { id: string }[];
};
type IiifManifest = {
	id: string;
	items?: IiifCanvas[];
	structures?: { items?: { id: string }[] }[];
	rendering?: { id: string }[];
};
type IiifCollection = { items?: { id?: string; label?: LanguageMap }[] };

export type SheetVariant = {
	canvas: IiifCanvas;
	title: string;
	imageService: string;
	isBackside: boolean;
	isCurrent: boolean;
	/** Alleen als dit blad al als kaart geregistreerd is (voorkanten wel, achterkanten pas na klikken) */
	map: HistoricMap | undefined;
};

export type SheetLinks = {
	links: { label: string; href: string }[];
	xyzUrl: string | null;
};

type Status = "idle" | "loading" | "ready" | "error";

// ------------------------------------------------------------------
// Hulpfuncties
// ------------------------------------------------------------------

/** Eén keer ophalen per URL; mislukte requests blijven niet in de cache */
const jsonCache = new Map<string, Promise<unknown>>();
function loadJson<T>(url: string): Promise<T> {
	let promise = jsonCache.get(url);
	if (!promise) {
		promise = fetch(url).then((r) => {
			if (!r.ok) throw new Error(`${r.status} ${url}`);
			return r.json();
		});
		promise.catch(() => jsonCache.delete(url));
		jsonCache.set(url, promise);
	}
	return promise as Promise<T>;
}

function pick(map: LanguageMap, lang = "nl") {
	return (map[lang] ?? map.en ?? map.none)?.[0];
}

export function metadataOf(canvas: IiifCanvas | null | undefined): [string | undefined, string | undefined][] {
	return (canvas?.metadata ?? []).map((m) => [pick(m.label), pick(m.value)]);
}

function hasText(canvas: IiifCanvas, text: string) {
	return metadataOf(canvas).some(([label, value]) => label === text || value === text);
}

export function imageServiceOf(canvas: IiifCanvas | null | undefined) {
	const body = canvas?.items?.[0]?.items?.[0]?.body;
	return body?.service?.[0]?.id ?? body?.id ?? null;
}

// ------------------------------------------------------------------
// SheetInfo
// ------------------------------------------------------------------

/** Maak aan tijdens het initialiseren van een component: de effects hieronder hebben dat nodig */
export class SheetInfo {
	readonly #mapContext: MapContext;
	readonly #historic: HistoricMapsContext;

	visible = $state(false);
	hold = $state(false);
	infoRequested = $state(false);

	detail = $derived(this.editionLabel ?? this.#historic.seriesOf(this.map?.id ?? null)?.name ?? "");

	requestInfo() {
		if (this.isSelected) this.infoRequested = true;
	}

	collection = $state.raw<IiifCollection | null>(null);
	editionManifest = $state.raw<IiifManifest | null>(null);
	status = $state<Status>("idle");

	/** De kaart die nu bekeken of geselecteerd wordt */
	live = $derived(this.#historic.previewMap ?? this.#historic.selectedMap);

	/** Zoals `live`, maar blijft 600 ms hangen: tijd om van de kaart naar het paneel te bewegen */
	#shown = $state.raw<HistoricMap | null>(null);
	get map() {
		return this.#shown;
	}

	isSelected = $derived(this.#historic.selectedMap !== null);

	/** "Editie 2 BIS"; ontbreekt voor series zonder edities */
	editionLabel = $derived.by(() => {
		const m = this.map;
		if (!m || m.edition === undefined) return null;
		return `Editie ${m.edition}${m.bis ? " BIS" : ""}`;
	});

	#editionManifestUrl = $derived.by(() => {
		if (!this.editionLabel) return null;
		return this.collection?.items?.find((i) => i.label?.nl?.[0] === this.editionLabel)?.id ?? null;
	});

	canvas = $derived.by(() => {
		const m = this.map;
		if (!m || !this.editionManifest) return null;
		return this.editionManifest.items?.find((c) => c.id === m.manifestId) ?? null;
	});

	metadata = $derived(metadataOf(this.canvas));
	canvasImage = $derived(imageServiceOf(this.canvas));
	currentIsBackside = $derived(this.canvas ? hasText(this.canvas, "Achterkant") : false);

	#variantCanvases = $derived.by((): IiifCanvas[] => {
		const { canvas, editionManifest } = this;
		if (!canvas || !editionManifest) return [];

		const structure = editionManifest.structures?.find((s) => s.items?.some((i) => i.id === canvas.id));
		return (structure?.items ?? [])
			.map((i) => editionManifest.items?.find((c) => c.id === i.id))
			.filter((c): c is IiifCanvas => !!c);
	});

	/** Het hoofdblad (voorkant) waar de bijbladen en de achterkant bij horen */
	mainSheet = $derived.by(() => {
		const main = this.#variantCanvases.find((c) => !hasText(c, "Type"));
		if (!main) return null;
		for (const m of this.#historic.mapsById.values()) if (m.manifestId === main.id) return m;
		return null;
	});

	variants = $derived.by((): SheetVariant[] => {
		const maps = Array.from(this.#historic.mapsById.values());

		return this.#variantCanvases.flatMap((canvas) => {
			const imageService = imageServiceOf(canvas);
			if (!imageService) return [];

			const type = metadataOf(canvas).find(([label]) => label === "Type")?.[1] || "Hoofdblad (voorkant)";
			const title = type.replace("Achterkant", "Hoofdblad (achterkant)");

			return [
				{
					canvas,
					title,
					imageService,
					isBackside: title.toLowerCase().includes("achterkant"),
					isCurrent: canvas.id === this.canvas?.id,
					map: maps.find((m) => m.manifestId === canvas.id),
				},
			];
		});
	});

	title = $derived(this.mainSheet?.label || this.map?.label || "…");
	subtitle = $derived([this.map?.yearEnd, this.editionLabel].filter(Boolean).join(" · "));

	links = $derived.by((): SheetLinks | null => {
		const { canvas, editionManifest } = this;
		if (!canvas || !editionManifest) return null;

		const canvasIndex = canvas.id.match(/\/p(\d*)$/)?.[1] || "1";
		const image = imageServiceOf(canvas);
		const annotation = canvas.annotations?.[0]?.id;
		const home = editionManifest.rendering?.[0]?.id;

		const links: SheetLinks["links"] = [];
		if (home) links.push({ label: "Universiteitsbibliotheek Utrecht", href: `${home}?page=${canvasIndex}` });
		links.push({
			label: "Open in Theseus",
			href: `https://theseus-viewer.netlify.app/embed?iiif-content=${editionManifest.id}&canvas=${canvas.id}&collection=${MANIFEST_URL}&panel=navPlace`,
		});
		if (annotation) {
			links.push({ label: "Open in Allmaps Viewer", href: `https://viewer.allmaps.org/?url=${annotation}` });
			links.push({
				label: "Open in geojson.io",
				href: `https://geojson.io/#data=data:text/x-url,${annotation}.geojson`,
			});
		}
		if (image) {
			links.push({ label: "Download beeld (1024px)", href: `${image}/full/1024,/0/default.png` });
			links.push({ label: "Download beeld (origineel formaat)", href: `${image}/full/max/0/default.png` });
		}

		return {
			links,
			xyzUrl: annotation
				? `https://allmaps.xyz/{z}/{x}/{y}.png?url=${annotation}&transformation.type=thin-plate-spline`
				: null,
		};
	});

	/** Positie van het kaartvenster op de thumbnail, in procenten */
	viewportRect = $derived.by(() => {
		const bbox = this.map?.geoFullMaskBbox;
		const viewport = this.#mapContext.viewportPolygon;
		if (!bbox || !viewport) return null;

		const [minX, minY, maxX, maxY] = bbox;
		const [vMinX, vMinY, vMaxX, vMaxY] = turf.bbox(viewport);
		const width = maxX - minX || 1;
		const height = maxY - minY || 1;

		const left = (vMinX - minX) / width;
		const top = (maxY - vMaxY) / height;
		const right = (vMaxX - minX) / width;
		const bottom = (maxY - vMinY) / height;

		return { left: left * 100, top: top * 100, width: (right - left) * 100, height: (bottom - top) * 100 };
	});

	constructor(historic: HistoricMapsContext) {
		this.#historic = historic;
		this.#mapContext = historic.mapContext;

		// Collectie één keer ophalen
		$effect(() => {
			loadJson<IiifCollection>(MANIFEST_URL)
				.then((data) => (this.collection = data))
				.catch(console.error);
		});

		// Blad laten nahangen
		$effect(() => {
			const live = this.live;
			if (live) {
				this.#shown = live;
				this.visible = true;
				return;
			}
			if (this.hold) return; // muis staat op het paneel

			const hide = setTimeout(() => (this.visible = false), 600);
			const clear = setTimeout(() => (this.#shown = null), 600 + 450);
			return () => {
				clearTimeout(hide);
				clearTimeout(clear);
			};
		});

		// Editie-manifest laden; `cancelled` voorkomt dat een trage response een nieuwere overschrijft
		$effect(() => {
			const url = this.#editionManifestUrl;
			this.editionManifest = null;

			if (!url) {
				this.status = "idle";
				return;
			}

			let cancelled = false;
			this.status = "loading";
			loadJson<IiifManifest>(url)
				.then((data) => {
					if (cancelled) return;
					this.editionManifest = data;
					this.status = "ready";
				})
				.catch(() => {
					if (!cancelled) this.status = "error";
				});

			return () => {
				cancelled = true;
			};
		});
	}

	// ------------------------------------------------------------------
	// Acties
	// ------------------------------------------------------------------

	/** Het getoonde blad openen (alleen als er nog geen blad open staat) */
	open() {
		if (this.map && !this.#historic.selectedMap) this.#historic.selectedMapId = this.map.id;
	}

	async selectVariant(variant: SheetVariant) {
		if (variant.map) {
			this.#historic.selectedMapId = variant.map.id;
			return;
		}

		// Achterkanten zijn nog geen kaart: eerst registreren
		if (!this.mainSheet) return;
		const backside = await registerBacksideMap(variant.canvas, this.mainSheet, this.#mapContext);
		if (backside) this.#historic.selectedMapId = backside.id;
	}
}
