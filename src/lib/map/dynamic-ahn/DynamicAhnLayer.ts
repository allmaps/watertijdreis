import { defaults, withOptions, type AhnOptions } from "./options";
export type { AhnOptions, BlendMode, MappingMode } from "./options";
export type { HeightScale } from "./terrain";
import { sampleHeight } from "./sample";
import { rescaleRange, sameScale } from "./scale";
import { copyStatistics, type HeightStatistics } from "./statistics";
export type { HeightStatistics } from "./statistics";
import type { CustomLayerInterface, CustomRenderMethodInput, Map as LibreMap } from "maplibre-gl";
import { defaultStops, validateStops, type GradientStop } from "./gradient";
import { ReliefRenderer } from "./renderer";
import {
	defaultScale,
	copyScale,
	validateScale,
	interpolateScale,
	mercator,
	type Atlas,
	type HeightScale,
	type View,
	type Result,
} from "./terrain";

export interface DynamicAhnLayerOptions extends Partial<AhnOptions> {
	id?: string;
	onScale?: (scale: HeightScale | null) => void;
	onStatistics?: (statistics: HeightStatistics | null) => void;
	onError?: (error?: string) => void;
}

/** Flat Mercator AHN overlay. Add above the historic sheets and below labels. */
export class DynamicAhnLayer implements CustomLayerInterface {
	readonly id: string;
	readonly type = "custom" as const;
	readonly renderingMode = "2d" as const;
	private map?: LibreMap;
	private worker?: Worker;
	private renderer?: ReliefRenderer;
	private atlas?: Atlas | null;
	private idOfView = 0;
	private lastPreview = 0;
	private scale = defaultScale;
	private from = defaultScale;
	private target = defaultScale;
	private start?: number;
	private hasScale = false;
	private scaleLocked = false;
	private automaticScale: HeightScale | null = null;
	private statistics: HeightStatistics | null = null;
	private stops = defaultStops;
	private opacity = 0.75;

	private settings: AhnOptions;

	constructor(private options: DynamicAhnLayerOptions = {}) {
		this.settings = withOptions(defaults, options);
		this.id = options.id ?? "dynamic-ahn";
	}

	setOptions(patch: Partial<AhnOptions>) {
		const previous = this.settings;
		this.settings = withOptions(this.settings, patch);
		const terrainChanged =
			this.settings.mappingMode !== previous.mappingMode ||
			this.settings.scaleMode !== previous.scaleMode ||
			this.settings.outlierPercentile !== previous.outlierPercentile ||
			this.settings.fillGaps !== previous.fillGaps ||
			this.settings.maxGapMeters !== previous.maxGapMeters;
		// Blend changes only repaint; they leave pending terrain work and its view ID intact.
		if (this.map && terrainChanged) this.worker?.postMessage({ ...this.view(this.map), preview: true } satisfies View);
		if (this.settings.blendMode !== previous.blendMode) this.map?.triggerRepaint();
	}

	setStyle(stops: readonly GradientStop[], opacity: number) {
		validateStops(stops);
		this.stops = stops;
		this.opacity = Math.min(1, Math.max(0, opacity));
		this.map?.triggerRepaint();
	}

	/** Set fixed heights in metres NAP. Unlock to resume automatic scaling. */
	setScale(scale: HeightScale) {
		const next = validateScale(scale);
		this.scale = this.target = next;
		this.start = undefined;
		this.hasScale = true;
		this.scaleLocked = true;
		this.options.onScale?.(this.getScale());
		this.map?.triggerRepaint();
	}

	/** Set manual endpoints and lock, preserving the displayed mapping's shape. */
	setRange(low: number, high: number) {
		const base = this.getScale() ?? { low: 0, center: 0.5, high: 1 };
		this.setScale(rescaleRange(base, low, high));
	}

	/** A detached snapshot of the displayed scale, or null before data is available. */
	getScale(): HeightScale | null {
		return this.hasScale ? copyScale(this.scale) : null;
	}

	/** Measured viewport distribution, independent of a locked scale. Returns a detached snapshot. */
	getStatistics(): HeightStatistics | null {
		return this.statistics ? copyStatistics(this.statistics) : null;
	}

	/** Height in metres NAP from the displayed cached surface; null outside coverage or in NoData. */
	getHeight(lng: number, lat: number): number | null {
		return sampleHeight(this.atlas, lng, lat);
	}

	isScaleLocked() {
		return this.scaleLocked;
	}

	/** Freeze the displayed scale, or the first valid scale if tiles have not arrived yet. */
	lockScale() {
		this.scaleLocked = true;
		this.start = undefined;
		this.target = this.scale;
	}

	unlockScale() {
		if (!this.scaleLocked) return;
		this.scaleLocked = false;
		this.updateScale(this.automaticScale);
		this.map?.triggerRepaint();
	}

	private updateScale(next: HeightScale | null) {
		if (!next) {
			this.start = undefined;
			this.hasScale = false;
			this.options.onScale?.(null);
			return;
		}
		if (this.hasScale && sameScale(next, this.target)) return;
		this.from = this.scale;
		this.target = next;
		this.start =
			this.hasScale && !matchMedia("(prefers-reduced-motion: reduce)").matches ? performance.now() : undefined;
		this.hasScale = true;
		if (this.start === undefined) {
			this.scale = next;
			this.options.onScale?.(this.getScale());
		}
	}

	onAdd(map: LibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
		if (typeof WebGL2RenderingContext === "undefined" || !(gl instanceof WebGL2RenderingContext)) {
			this.options.onError?.("De dynamische hoogtekaart vereist WebGL 2.");
			return;
		}
		this.map = map;
		if (this.scaleLocked && this.hasScale) this.options.onScale?.(this.getScale());
		this.renderer = new ReliefRenderer(gl);
		this.worker = new Worker(new URL("./tiles.worker.ts", import.meta.url), { type: "module" });
		this.worker.onmessage = ({ data }: MessageEvent<Result>) => {
			if (data.id !== this.idOfView) return;
			this.statistics = data.statistics ?? null;
			this.options.onStatistics?.(this.getStatistics());
			if (data.atlas !== undefined) this.atlas = data.atlas;
			this.options.onError?.(data.error);
			this.automaticScale = data.scale;
			if (!this.scaleLocked || !this.hasScale) this.updateScale(data.scale);
			map.triggerRepaint();
		};
		this.worker.onerror = (e) => this.options.onError?.(e.message);
		map.on("move", this.preview);
		map.on("moveend", this.requestView);
		map.on("resize", this.requestView);
		map.on("remove", this.onRemove);
		map.on("webglcontextrestored", this.restore);
		this.requestView();
	}

	private view(map: LibreMap): View {
		const bounds = map.getBounds();
		return {
			id: ++this.idOfView,
			zoom: map.getZoom(),
			options: this.settings,
			rect: [...mercator(bounds.getWest(), bounds.getNorth()), ...mercator(bounds.getEast(), bounds.getSouth())],
			shownKey: this.atlas?.key,
		};
	}
	private requestView = () => {
		if (!this.map) return;
		this.worker?.postMessage(this.view(this.map));
	};
	// Resample the resident terrain while panning. Request new tiles when the camera settles.
	private preview = () => {
		const now = performance.now();
		if (!this.map || now - this.lastPreview < 120) return;
		this.lastPreview = now;
		this.worker?.postMessage({ ...this.view(this.map), preview: true } satisfies View);
	};

	private restore = () => {
		const gl = this.map?.getCanvas().getContext("webgl2");
		if (gl) this.renderer = new ReliefRenderer(gl);
		this.map?.triggerRepaint();
	};

	render(_gl: WebGLRenderingContext | WebGL2RenderingContext, frame: CustomRenderMethodInput) {
		if (this.start !== undefined) {
			const t = (performance.now() - this.start) / 650;
			this.scale = interpolateScale(this.from, this.target, t);
			this.options.onScale?.(this.getScale());
			if (t < 1) this.map?.triggerRepaint();
			else this.start = undefined;
		}
		if (this.atlas && this.opacity > 0)
			this.renderer?.draw(frame, this.atlas, this.scale, this.stops, this.opacity, this.settings.blendMode);
	}

	onRemove = () => {
		this.map
			?.off("move", this.preview)
			.off("moveend", this.requestView)
			.off("resize", this.requestView)
			.off("remove", this.onRemove)
			.off("webglcontextrestored", this.restore);
		this.worker?.terminate();
		this.renderer?.destroy();
		this.worker = undefined;
		this.renderer = undefined;
		this.atlas = undefined;
		this.map = undefined;
		this.start = undefined;
		this.automaticScale = null;
		this.statistics = null;
		this.options.onStatistics?.(null);
		if (!this.scaleLocked) this.hasScale = false;
		this.options.onScale?.(null);
		this.options.onError?.();
	};
}
