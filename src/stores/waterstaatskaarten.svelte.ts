import { WarpedMapLayer } from '@allmaps/maplibre';
import { WarpedMapEvent, WarpedMapEventType } from '@allmaps/render';
import { mapStore } from './mapStore.svelte'
import { timelineStore } from './timelineStore.svelte';
import maplibre from 'maplibre-gl';
import {type WSKMap} from '../types';


const IIIF_MANIFEST_URLS = [
	'iiif-manifests/modified_01-1874-389916.json',
	'iiif-manifests/modified_02-1874-456650.json',
	'iiif-manifests/modified_03-1874-455650.json',
	'iiif-manifests/modified_04-1874-456550.json',
	'iiif-manifests/modified_05-1874-456551.json',
	'iiif-manifests/modified_06-1874-456552.json',
	'iiif-manifests/modified_07-1874-456588.json',
	'iiif-manifests/modified_08-1874-456553.json',
	'iiif-manifests/modified_09-1874-456827.json'
]


export const WATERSTAATSKAART_EDITIES = Array(9)
        .fill(0)
        .map((_,i) => 'editie_'+(i/2+1|0)+(i%2?'bis':'')); // excuses

// export const WATERSTAATSKAART_URLS = WATERSTAATSKAART_EDITIES
    // .map(i => `https://raw.githubusercontent.com/bmmeijers/iiif-annotations/refs/heads/develop/series/waterstaatskaart/uu/${i}/latest.json`)

const WATERSTAATSKAART_BASE_URL = 'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations'

export const WATERSTAATSKAART_URLS = [
    `${WATERSTAATSKAART_BASE_URL}/01-1874-389916-georef.json`,
    `${WATERSTAATSKAART_BASE_URL}/02-1874-456650-georef.json`,
    `${WATERSTAATSKAART_BASE_URL}/03-1874-455650-georef.json`,
    `${WATERSTAATSKAART_BASE_URL}/04-1874-456550-georef.json`,
    `${WATERSTAATSKAART_BASE_URL}/05-1874-456551-georef.json`,
    `${WATERSTAATSKAART_BASE_URL}/06-1874-456552-georef.json`,
    `${WATERSTAATSKAART_BASE_URL}/07-1874-456588-georef.json`,
    `${WATERSTAATSKAART_BASE_URL}/08-1874-456553-georef.json`,
    `${WATERSTAATSKAART_BASE_URL}/09-1874-456827-georef.json`,

]


export const MANIFEST_FILEPATHS = [
    'metadata-editie_1.json',
    'metadata-editie_2.json',
    'metadata-editie_3.json',
    'metadata-editie_4.json',
    'metadata-editie_5.json',
]


export class WSK {

		layer: WarpedMapLayer;
		loaded: boolean;
		loadingProgress: number;
		maps: WSKMap[];

		constructor(maplibreInstance: maplibre.Map) {
        this.layer = new WarpedMapLayer('waterstaatskaarten');
        maplibreInstance.addLayer(this.layer as any as maplibre.AddLayerObject);

        this.maps = [];

        this.loaded = false;
        this.loadingProgress = 0;

        setTimeout(() => console.log(this.maps, this.layer), 1000);

        fetch('/iiif-manifests/modified_01-1874-389916.json')
            .then(response => response.json())
            .then(i => console.log(i));

        const getOrCreateMap = (id: string) => {
					const map = this.getMapByID(id);
					if(map) return map;
					this.maps.push({ id: id });
					return this.maps[this.maps.length - 1];
				}

        const warpedMapsById = this.layer.renderer?.warpedMapList.warpedMapsById;
        const tileCache = this.layer.renderer?.tileCache;

        this.layer.renderer?.warpedMapList.addEventListener(
            WarpedMapEventType.WARPEDMAPADDED,
					(event: WarpedMapEvent) => {
                const map = getOrCreateMap(event?.data as string);
                const warpedMap = warpedMapsById?.get(event?.data as string);
                map.warpedMap = warpedMap;
                map.mask = warpedMap?.geoMask;
							// eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
							map.maskBbox = warpedMap?.geoMaskBbox;

                if((warpedMapsById?.size || 0) >= this.maps.length) { // TODO: werkt dit altijd?
                    mapStore.loaded = true;
                    setInterval(() => {
                        this.updateVisibleMaps();
                        maplibreInstance.triggerRepaint();
                    }, 250);
                }

                // if(this.getMapByID(warpedMap.mapId).edition != 'editie_1')
                //     warpedMap.visible = false;
            }
        )

        tileCache?.addEventListener(
            WarpedMapEventType.MAPTILELOADED,
					() => {
                // const map = warpedMapsById?.get(event?.data?.mapId);
                this.loadingProgress = 1 - (tileCache?.tilesFetchingCount / warpedMapsById?.size);
                // console.log(this.loadingProgress * 100, tileCache.tilesFetchingCount);
            }
        )

        this.layer.renderer?.tileCache.addEventListener(WarpedMapEventType.ALLREQUESTEDTILESLOADED, () => {this.loaded = true;})

        loadMetadata2()
            .then(metadata => {
                metadata.forEach((data, index) => {
                    const edition = WATERSTAATSKAART_EDITIES[index];

                    console.log(edition, data.items.length);

                    for (const item of data.items) {
                        const sourceId = item.items[0].items[0].body.service[0].id;
                        if (sourceId == "https://objects.library.uu.nl/fcgi-bin/iipsrv.fcgi?IIIF=/manifestation/viewer/39/29/42/39294249383937169156628404605415851040.jp2") continue;
                        if (sourceId == "https://objects.library.uu.nl/fcgi-bin/iipsrv.fcgi?IIIF=/manifestation/viewer/91/40/41/91404157775464304833428299750087167267.jp2") continue;
                        if(!item.metadata) continue;

                        const map = getOrCreateMap(sourceId);
                        map.edition = edition;
                        map.metadata = {};
                        map.metadata.label = item.label.none;
                        for (let i of item.metadata) {
                            const label = i.label.en;
                            const value = i.value.en || i.value.cy; // TODO: waarom is er een item met cy?
                            if(!Array.isArray(value)) console.log(i);
                            map.metadata[label] = value[0];
                        }
                        map.year = 
                                +map.metadata.bijgewerkt ||
                                +map.metadata.bewerkt || // TODO: welke volgorde?
                                +map.metadata.verkend ||
                                +map.metadata.herzien ||
                                +map.metadata.uitgave ||
                                +map.metadata.basis;
                    }
                })
            })
            .then(() => {
                loadAnnotations()
                    .then(annotations => {
                        annotations.forEach((ann, i) => {
                            this.layer.addGeoreferenceAnnotation(ann);

                            for (const item of ann.items) {
                                const map = this.getMapByID(item.target.source.id);
                                if(!map) continue;
                                this.getMapByID(item.target.source.id).id = item.id;
                            }
                        });
                    })
                    .then(async () => {
                        const res = await fetch('/bladtitels.json');
                        const bladtitels = await res.json();
                        for(let map of this.maps) {
                            if(!map.metadata || !map.metadata.label) continue;
                            const mapLabel = +map.metadata.label[0].split('.')[0];
                            const titel = bladtitels.find(i => i['map_label'] == mapLabel);
                            if(titel) map.metadata.titel = titel.name;
                        }
                    })
            });

        //     .then(() => {
        //         loadAnnotations()
        //             .then(annotations => this.annotations = annotations)
        //             .then(() => this.annotations.forEach((ann, i) => {
        //                 this.layer.addGeoreferenceAnnotation(ann);

        //                 for (let item of ann.items) {
        //                     const map = getOrCreateMap(item.id);
        //                     map.edition = WATERSTAATSKAART_EDITIES[i];
        //                 }
        //             }))
        //             .then(() => {

        //             })
        //     })
    }

    updateVisibleMaps() {
        const inRange = (map: WSKMap) =>
					!!(map.year && map.year >= timelineStore.startYear && map.year <= timelineStore.endYear);
        
        const mapsInRange = this.maps
            .filter(inRange)
            .sort((a, b) => b.year - a.year);

        this.maps.forEach(map => {if (map && map.warpedMap) map.warpedMap.visible = inRange(map)});

        for (const map of mapsInRange) {
            const rtree = this.layer.renderer.warpedMapList.rtree;
            const bbox = rtree.bboxesById.get(map.id);
            rtree?.searchFromBbox([
                bbox[0] + .05,
                bbox[1] + .05,
                bbox[2] - .05,
                bbox[3] - .05
            ])
            .map(i => this.getMapByID(i))
            .filter(i => i.year < map.year)
            .forEach(i => i.warpedMap.visible = false);
        }

        if (mapStore.selectedMap) {
            mapStore.selectedMap.warpedMap.visible = true;
        }
    }

    // updateVisibleMaps() {
    //     this.maps.forEach(map => map.warpedMap.visible = true);

    //     const mapsInRange = this.maps
    //         .filter(map => map.year >= timelineStore.startYear && map.year <= timelineStore.endYear)
    //         .sort((a,b) => b.year - a.year) // new > old!

    //     for(const map of mapsInRange) {
    //         const rtree = this.layer.renderer.warpedMapList.rtree;
    //         const bbox = rtree.bboxesById.get(map.id);

    //         const currentFeature = {
    //             type: 'Feature',
    //             properties: {},
    //             geometry: rtree?.polygonsById.get(map.id)
    //         }

    //         const candidates = rtree.searchFromBbox(bbox)
    //             .filter(id => this.getMapByID(id).year > map.year)
    //             .map(id => ({
    //                 type: 'Feature',
    //                 properties: {},
    //                 geometry: rtree?.polygonsById.get(id)
    //             }))

    //         console.log(candidates.length)
            
    //         let totalOverlapArea = 0;
    //         const currentArea = area(currentFeature);
                
    //         for(const candidateFeature of candidates) {
    //             const overlap = intersect({
    //                 type: "FeatureCollection",
    //                 features: [currentFeature, candidateFeature]
    //             })

    //             if(overlap) {
    //                 totalOverlapArea += area(overlap);

    //                 if (totalOverlapArea / currentArea > 0.95) {
    //                     map.warpedMap.visible = false;
    //                     break; 
    //                 }
    //             }
    //         }
    //     }

    //     console.log(this.maps.filter(map => map.warpedMap.visible));
    // }

    getMapByID(id: string) {
        return this.maps.find(m => m.id === id);
    }

    getMapsByEdition(edition: string) {
        return this.maps.filter(m => m.edition === edition);
    }

    getMapsByGeoPosition(longitude: number, latitude: number) {
        const warpedMapList = this.layer.renderer?.warpedMapList;
        if (!warpedMapList) return [];
        const results = warpedMapList.rtree?.searchFromPoint([longitude, latitude], true);
        return results
            ?.filter(i => warpedMapList.warpedMapsById.get(i)?.visible)
            ?.map(i => this.getMapByID(i));
    }

    // getMapsByScreenPosition(x, y) {
    //     const map = mapStore.getMap();
    //     if (!map) return [];
    //     const lngLat = map.unproject([x, y]);
    //     return this.getMapsByGeoPosition(lngLat.lat, lngLat.lng);
    // }
} 

export async function loadAnnotations() {
    return  Promise.all(
        WATERSTAATSKAART_URLS.map(async (url) => {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
            }
            return await response.json();
        })
    );
}

export async function loadMetadata2() {
    return Promise.all(
        IIIF_MANIFEST_URLS.map(async (path) => {
            const response = await fetch(path);
            if (!response.ok) 
                throw new Error(`Failed to fetch ${path}: ${response.statusText}`);

            return await response.json();
        })
    );
}

export async function loadMetadata() {
    return  Promise.all(
        MANIFEST_FILEPATHS.map(async (path) => {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
            }
            return await response.json();
        })
    );
}

