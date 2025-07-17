
import { WebGL2WarpedMap } from '@allmaps/render';
import type { GeoJSONPolygon } from 'ol/format/GeoJSON';
import type Bbox from 'ol/format/filter/Bbox';

export type WSKMap = {
	id: string;
	warpedMap?: WebGL2WarpedMap;
	mask?: GeoJSONPolygon;
	maskBbox?: Bbox;
	year?: number;
	edition?: string;
	metadata?: {
		bijgewerkt?: string;
		bewerkt?: string;
		verkend?: string;
		herzien?: string;
		uitgave?: string;
		basis?: string;
		titel?: string;
	}
}