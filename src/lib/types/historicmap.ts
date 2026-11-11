import type { WarpedMap } from "@allmaps/render";
import type { Polygon } from "geojson";

export type HistoricMap = {
	id: string;

	label: string;
	polygon: Polygon;
	geoFullMaskBbox?: [number, number, number, number];
	warpedMap?: WarpedMap;
	manifestId?: string;

	edition?: number;
	bis?: boolean;
	number?: number;
	position?: string;
	x?: number;
	y?: number;
	yearStart?: number;
	yearEnd?: number;
	type?: string;
};

export type Filter = {
	yearStart: number;
	yearEnd: number;
	edition: "All" | 1 | 2 | 3 | 4 | 5;
	bis: boolean;
	type: undefined | "WVE" | "HWP";
};

export type SpriteConfig = {
	json: string;
	image: string;
	size: [number, number];
};

export type SeriesSource =
	| { kind: "georeferenced-maps"; url: string; sprites?: SpriteConfig }
	| { kind: "annotation"; url: string };

export type HistoricMapSeriesOptions = {
	id: string;
	name: string;
	themeColor: string;
	source: SeriesSource;
	added?: boolean;
	movable?: boolean;
};

export type EditionRange = {
	edition: number;
	yearStart?: number;
	yearEnd?: number;
	count: number;
};
