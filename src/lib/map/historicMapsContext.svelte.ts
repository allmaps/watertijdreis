import type { HistoricMap } from '$lib/types/historicmap';
import { SvelteMap } from 'svelte/reactivity';
import type { MapContext } from './mapContext.svelte';
import { WarpedMapLayer } from '@allmaps/maplibre';
import { addOutlineLayers } from './mapLayers.svelte';

const ANNOTATION_URL = 'maps-sorted-by-edition.json';

export type Filter = {
    yearStart: number;
    yearEnd: number;
    edition: 'All' | 1 | 2 | 3 | 4 | 5;
    bis: boolean;
    type: undefined | 'WVE' | 'HWP';
};

function transformToIIIFInfoJson(item: any) {
    const { id, width, height, tiles } = item.resource;
    return {
        '@context': 'http://iiif.io/api/image/2/context.json',
        '@id': id,
        profile: 'http://iiif.io/api/image/2/level2.json',
        protocol: 'http://iiif.io/api/image',
        width,
        height,
        tiles
    };
}

export class HistoricMapsContext {
    private mapContext: MapContext;

    warpedMapLayer: WarpedMapLayer | null = $state(null);

    historicMapsLoaded = $state(false);
    historicMapsById = new SvelteMap<string, HistoricMap>();
    historicMapsByNumber: Map<number, HistoricMap[]> | undefined = $derived.by(() => {
        if (!this.historicMapsLoaded) return;
        const grouped = new Map<number, HistoricMap[]>();
        for (const { number, ...rest } of this.historicMapsById.values())
            (grouped.get(number) ?? grouped.set(number, []).get(number))!.unshift({ number, ...rest });
        return grouped;
    });

    visibleHistoricMaps: SvelteMap<string, HistoricMap> = new SvelteMap();
    mapsInViewport: SvelteMap<string, HistoricMap> = new SvelteMap();
    visibleHistoricMapsInViewport: SvelteMap<string, HistoricMap> = new SvelteMap();

    selectedHistoricMap: HistoricMap | null = $state(null);
    pinnedHistoricMap: HistoricMap | null = $state(null);

    filter: Filter = $state({
        yearStart: 1865,
        yearEnd: 1983,
        edition: 'All',
        bis: false,
        type: undefined
    });

    constructor(mapContext: MapContext) {
        this.mapContext = mapContext;
    }

    async init() {
        this.warpedMapLayer = new WarpedMapLayer();
        this.mapContext.map?.addLayer(this.warpedMapLayer);

        this.warpedMapLayer.setLayerOptions({ visible: false });
        this.warpedMapLayer.getWarpedMapList().options.animatedOptions.push('opacity');

        await this.load(ANNOTATION_URL);

        // addOutlineLayers(this.mapContext);
    }

    async load(url: string) {
        if (!this.mapContext.map || !this.warpedMapLayer) return;

        try {
            const res = await fetch(url);
            const data = await res.json();

            this.mapContext.map.on('maptilesloadedfromsprites', () => {
                this.historicMapsLoaded = true;
                this.mapContext.applyFilter(this.mapContext.filter);
            });

            const imageInfos = data.map(transformToIIIFInfoJson);
            this.warpedMapLayer.addImageInfos(imageInfos);

            const loadPromises = data.map(async (item: any) => {
                const id = await this.warpedMapLayer.addGeoreferencedMap(item);
                const warpedMap = this.warpedMapLayer.getWarpedMap(id);

                const coordinates = [warpedMap?.geoMask.concat([warpedMap?.geoMask[0]])];

                const historicMap: HistoricMap = {
                    id,
                    manifestId: item.resource.partOf[0].id,
                    polygon: {
                        type: 'Polygon',
                        coordinates
                    },
                    geoFullMaskBbox: warpedMap?.geoFullMaskBbox,
                    ...item._meta
                };

                this.historicMapsById.set(id, historicMap);
            });

            await Promise.all(loadPromises);

            const spriteJson = await fetch('/sprites/regular-sheets-128.json').then((r) => r.json());
            this.warpedMapLayer.addSprites(
                spriteJson,
                `${window.location.origin}/sprites/regular-sheets-128.jpg`,
                [3072, 3078]
            );


            const emptyFeatureCollection = { type: 'FeatureCollection', features: [] };

            this.mapContext.map.addSource('map-outlines', {
                type: 'geojson',
                data: emptyFeatureCollection
            });

            this.mapContext.map.addSource('map-labels', {
                type: 'geojson',
                data: emptyFeatureCollection
            });

            addOutlineLayers(this.mapContext);
        } catch (error) {
            console.error('HistoricMapsContext: Fout tijdens het laden van de kaarten of sprites:', error);
        }
    }

    applyFilter(filter: Filter) {
        if (!this.historicMapsByNumber || this.selectedHistoricMap) return;


        let maxYear = 0;
        filter.yearStart = Math.min(filter.yearEnd - 1, filter.yearStart);

        const mapsToColor: string[] = [];
        const mapsToDesaturate: string[] = [];

        this.historicMapsByNumber.forEach((sheets) => {
            let x1, y1, x2, y2;
            const firstEdYearEnd = 1894;

            for (const sheet of sheets) {
                const { x, y, yearEnd: year, edition, bis, type, id } = sheet;
                maxYear = Math.max(maxYear, year);
                const maxYearFilter = filter.yearEnd > firstEdYearEnd ? filter.yearEnd : firstEdYearEnd;
                const periodFilter = filter.edition !== 'All' || year <= maxYearFilter;
                const editionFilter = filter.edition === 'All' || edition === filter.edition;
                const typeFilter = filter.type ? type === filter.type : !type;
                const bisFilter = filter.bis === true || !bis;
                const inScope = periodFilter && editionFilter && typeFilter && bisFilter;
                if (!inScope) continue;

                const stack =
                    year >= filter.yearStart && year <= filter.yearEnd ? mapsToColor : mapsToDesaturate;

                if (x1 === undefined) {
                    stack.push(id);
                    [x1, y1] = [x, y];

                    if (!x1 && !y1) break;
                } else if (y1 && x === x1 && y === -y1) {
                    stack.push(id);
                    y1 = 0;

                    if (!x1) break;
                } else if (x1 && !x2 && x === -x1) {
                    stack.push(id);
                    [x2, y2] = [x, y];

                    if (!y1 && !y) break;
                } else if (y2 && x === x2 && y === -y2) {
                    stack.push(id);
                    y2 = 0;

                    if (!y1) break;
                }
            }
        });

        filter.yearEnd = Math.min(maxYear, filter.yearEnd);

        const mapsToShow = mapsToColor.concat(mapsToDesaturate);
        const visibleHistoricMapIds = this.visibleHistoricMaps.keys().toArray();

        const mapsToHide = visibleHistoricMapIds.filter((id) => !mapsToShow.includes(id));
        const mapsToAdd = mapsToShow.filter((id) => !visibleHistoricMapIds.includes(id));

        const mapOptionsByMapId = new Map();

        const defaultOptions = {
            applyMask: true,
            transformationType: 'thinPlateSpline',
            saturation: 1
        };

        mapsToColor.forEach((id) =>
            mapOptionsByMapId.set(id, {
                ...defaultOptions,
                visible: true
            })
        );
        mapsToHide.forEach((id) =>
            mapOptionsByMapId.set(id, {
                ...defaultOptions,
                visible: false
            })
        );
        mapsToDesaturate.forEach((id) =>
            mapOptionsByMapId.set(id, {
                ...defaultOptions,
                visible: true,
                saturation: 0
            })
        );

        this.warpedMapLayer?.setMapsOptionsByMapId(mapOptionsByMapId);

        mapsToHide.forEach((id) => this.visibleHistoricMaps.delete(id));
        mapsToAdd.forEach((id) => {
            const historicMap = this.historicMapsById.get(id);
            if (historicMap) {
                this.visibleHistoricMaps.set(id, historicMap);
            }
        });

        this.toastContent = `Je ziet nu kaarten van ${Math.round(filter.yearEnd)} en ouder`;
    }

    setHistoricMapView(historicMap: HistoricMap, view: MapView | undefined) {
        if (!this.historicMapsLoaded) return;

        this.mapContext.clickedFeature = null;
        this.mapContext.setSheetIndexVisibility(false);

        this.mapContext.savedLayerVisibility = {};
        const layers = this.mapContext.activeMap.getStyle().layers;

        for (const layer of layers) {
            if (!layer.id.includes('warped-map-layer-')) {
                const visibility = this.mapContext.activeMap.getLayoutProperty(layer.id, 'visibility') as
                    | 'visible'
                    | 'none';
                this.mapContext.savedLayerVisibility[layer.id] = visibility || 'visible';

                if (visibility !== 'none') {
                    this.mapContext.activeMap.setLayoutProperty(layer.id, 'visibility', 'none');
                }
            }
        }

        this.warpedMapLayer.setLayerOptions({ opacity: 1 });

        const { id } = historicMap;
        const mapsToHide = this.visibleHistoricMaps
            .keys()
            .filter((i) => i != id)
            .toArray();
        this.warpedMapLayer.setMapsOptions(mapsToHide, {
            visible: false
        });
        this.warpedMapLayer.setMapOptions(id, {
            visible: true,
            transformationType: 'straight',
            saturation: 1,
            opacity: 1,
            applyMask: false
        });

        this.selectedHistoricMap = historicMap;

        this.mapContext.saveMapView();

        if (view) {
            this.mapContext.activeMap.easeTo(view);
        } else {
            const bbox = this.warpedMapLayer.getMapsBbox([historicMap.id], {
                projection: {
                    definition: 'EPSG:4326'
                }
            });
            if (bbox) {
                const [minX, minY, maxX, maxY] = bbox;
                setTimeout(
                    () =>
                        this.mapContext.activeMap.fitBounds(
                            [
                                [minX, minY],
                                [maxX, maxY]
                            ],
                            { padding: 88, speed: 2, curve: 1.8, essential: true }
                        ),
                    250
                );
            }
        }
    }

    changeHistoricMapView(historicMap: HistoricMap) {
        if (!this.historicMapsLoaded) return;

        const optionsByMapId = new Map();

        optionsByMapId.set(this.selectedHistoricMap?.id, {
            visible: false,
            transformationType: 'thinPlateSpline',
            applyMask: true
        });

        optionsByMapId.set(historicMap?.id, {
            visible: true,
            transformationType: 'straight',
            saturation: 1,
            applyMask: false
        });

        this.warpedMapLayer.setMapsOptionsByMapId(optionsByMapId, undefined, { animate: false });

        const bbox = this.warpedMapLayer?.getMapsBbox([historicMap.id], {
            projection: {
                definition: 'EPSG:4326'
            }
        });

        if (bbox) {
            const [minX, minY, maxX, maxY] = bbox;
            this.mapContext.activeMap.fitBounds(
                [
                    [minX, minY],
                    [maxX, maxY]
                ],
                { padding: 50, animate: false }
            );
        }

        this.selectedHistoricMap = historicMap;
    }
}