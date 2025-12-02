import { WarpedMap, WarpedMapEvent, WarpedMapEventType } from '@allmaps/render';
import type { GeoJsonProperties, Geometry, Feature, Polygon } from 'geojson';

export type HistoricMap = {
    id: string;
    manifestId: string;
    warpedMap?: WarpedMap;
    label: string;
    polygon: Polygon;
    yearStart: number;
    yearEnd: number;
    edition: number;
    bis: boolean;
    number: number;
    position: string;
    x: number;
    y: number;
    type: string | undefined;
};