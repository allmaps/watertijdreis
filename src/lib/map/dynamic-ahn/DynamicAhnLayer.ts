import { defaults, withOptions, type AhnOptions } from "./options";
export type { AhnOptions } from "./options";
import type { CustomLayerInterface, CustomRenderMethodInput, Map as LibreMap } from "maplibre-gl";
import { defaultStops, type GradientStop } from "./gradient";
import { ReliefRenderer } from "./renderer";
import {
	defaultScale,
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
	private stops = defaultStops;
	private opacity = 0.6;

	private settings: AhnOptions;

	constructor(private options: DynamicAhnLayerOptions = {}) {
		this.settings = withOptions(defaults, options);
		this.id = options.id ?? "dynamic-ahn";
	}

	setOptions(patch: Partial<AhnOptions>) {
		this.settings = withOptions(this.settings, patch);
		// Reprocess resident data, including while a camera flight is in progress.
		if (this.map) this.worker?.postMessage({ ...this.view(this.map), preview: true } satisfies View);
	}

	setStyle(stops: readonly GradientStop[], opacity: number) {
		this.stops = stops;
		this.opacity = Math.min(1, Math.max(0, opacity));
		this.map?.triggerRepaint();
	}

	onAdd(map: LibreMap, gl: WebGLRenderingContext | WebGL2RenderingContext) {
		if (typeof WebGL2RenderingContext === "undefined" || !(gl instanceof WebGL2RenderingContext)) {
			this.options.onError?.("De dynamische hoogtekaart vereist WebGL 2.");
			return;
		}
		this.map = map;
		this.renderer = new ReliefRenderer(gl);
		this.worker = new Worker(new URL("./tiles.worker.ts", import.meta.url), { type: "module" });
		this.worker.onmessage = ({ data }: MessageEvent<Result>) => {
			if (data.id !== this.idOfView) return;
			if (data.atlas !== undefined) this.atlas = data.atlas;
			this.options.onError?.(data.error);
			if (data.scale) {
				if (
					this.hasScale &&
					data.scale.low === this.target.low &&
					data.scale.mean === this.target.mean &&
					data.scale.high === this.target.high &&
					data.scale.tails?.[0] === this.target.tails?.[0] &&
					data.scale.tails?.[1] === this.target.tails?.[1]
				) {
					map.triggerRepaint();
					return;
				}
				this.from = this.scale;
				this.target = data.scale;
				this.start =
					this.hasScale && !matchMedia("(prefers-reduced-motion: reduce)").matches ? performance.now() : undefined;
				if (this.start === undefined) {
					this.scale = data.scale;
					this.options.onScale?.(this.scale);
				}
			} else {
				this.start = undefined;
				this.options.onScale?.(null);
			}
			this.hasScale = !!data.scale;
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
			this.options.onScale?.(this.scale);
			if (t < 1) this.map?.triggerRepaint();
			else this.start = undefined;
		}
		if (this.atlas && this.opacity > 0) this.renderer?.draw(frame, this.atlas, this.scale, this.stops, this.opacity);
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
		this.hasScale = false;
		this.options.onScale?.(null);
		this.options.onError?.();
	};
}
