import type { Map as MaplibreMap } from 'maplibre-gl';
import type { MapContext } from './mapContext.svelte';
import { animateFeatureOpacity } from '$lib/utils/mapAnimations.svelte';

export function addBackgroundLayers(map: MaplibreMap) {
    map.addSource('dsm-05', {
        type: 'raster',
        tiles: [
            'https://service.pdok.nl/rws/ahn/wms/v1_0?REQUEST=GetMap&SERVICE=WMS&VERSION=1.3.0&FORMAT=image/png&STYLES=&TRANSPARENT=TRUE&LAYERS=dsm_05m&TILED=true&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}'
        ],
        tileSize: 256
    });
    map.addLayer({
        id: 'dsm-05-layer',
        type: 'raster',
        source: 'dsm-05',
        layout: { visibility: 'none' }
    });

    map.addSource('satelliet', {
        type: 'raster',
        tiles: [
            'https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0?service=WMS&version=1.1.1&request=GetMap&layers=Actueel_ortho25&styles=&format=image/jpeg&transparent=true&height=256&width=256&srs=EPSG:3857&bbox={bbox-epsg-3857}'
        ],
        tileSize: 256,
        scheme: 'tms',
        minzoom: 6,
        maxzoom: 20,
        attribution: 'PDOK'
    });
    map.addLayer({
        id: 'satelliet-layer',
        type: 'raster',
        source: 'satelliet',
        layout: { visibility: 'none' }
    });
}

export function addWaterschapsgrenzenLayer(map: MaplibreMap) {
    if (map.getSource('pdok-waterschapsgrenzen')) return;

    map.addSource('pdok-waterschapsgrenzen', {
        type: 'raster',
        tiles: [
            'https://service.pdok.nl/hwh/waterschappen-waterschapsgrenzen-imso/wms/v2_0?' +
            'SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0' +
            '&LAYERS=waterschap' +
            '&STYLES=' +
            '&FORMAT=image/png' +
            '&TRANSPARENT=true' +
            '&CRS=EPSG:3857' +
            '&WIDTH=256&HEIGHT=256' +
            '&BBOX={bbox-epsg-3857}'
        ],
        tileSize: 256
    });
    map.addLayer({
        id: 'overlay-waterschapsgrenzen',
        type: 'raster',
        source: 'pdok-waterschapsgrenzen',
        layout: { visibility: 'visible' }
    });
}

export function addGemeentegrenzenLayer(map: MaplibreMap) {
    if (map.getSource('pdok-gemeentegrenzen')) return;

    map.addSource('pdok-gemeentegrenzen', {
        type: 'raster',
        tiles: [
            'https://service.pdok.nl/kadaster/bestuurlijkegebieden/wms/v1_0?' +
            'SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0' +
            '&LAYERS=Gemeentegebied' +
            '&STYLES=' +
            '&FORMAT=image/png' +
            '&TRANSPARENT=true' +
            '&CRS=EPSG:3857' +
            '&WIDTH=256&HEIGHT=256' +
            '&BBOX={bbox-epsg-3857}'
        ],
        tileSize: 256
    });
    map.addLayer({
        id: 'overlay-gemeentegrenzen',
        type: 'raster',
        source: 'pdok-gemeentegrenzen',
        layout: { visibility: 'visible' }
    });
}

export function addUserLocationCircle(map: MaplibreMap) {
    map.addSource('user-location', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    map.addLayer({
        id: 'user-location',
        type: 'circle',
        source: 'user-location',
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 6, 22, 20],
            'circle-color': '#f4a',
            'circle-opacity': 0,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 0, 0, 22, 6],
            'circle-stroke-opacity': 0,

            'circle-opacity-transition': { duration: 400 },
            'circle-radius-transition': { duration: 400 },
            'circle-stroke-width-transition': { duration: 700 },
            'circle-stroke-opacity-transition': { duration: 400 }
        }
    });
}

let clickedMapTimeout = null;

export function addOutlineLayers(mapContext: MapContext) {
    if (!mapContext.map) return;

    mapContext.map.addLayer(
        {
            id: 'map-outlines-skeleton',
            type: 'fill',
            source: 'map-outlines',
            paint: { 'fill-color': ['get', 'skeletonColor'] }
        },
        'warped-map-layer'
    );

    mapContext.map.addLayer({
        id: 'map-outlines-labels',
        type: 'symbol',
        source: 'map-labels',
        layout: {
            'text-font': ['literal', ['Metropolis Bold']],
            'text-field': ['to-string', ['get', 'year']],
            'text-size': [
                'interpolate',
                ['exponential', 1.2],
                ['zoom'],
                5,
                6,
                6,
                9,
                7,
                12,
                8,
                15,
                9,
                17,
                10,
                18,
                12,
                22,
                14,
                26,
                15,
                28,
                20,
                28
            ],
            'text-allow-overlap': true
        },
        paint: {
            'text-color': '#65e',
            'text-halo-color': '#eeeeff',
            'text-halo-width': 1,
            'text-opacity': 0
        }
    });

    mapContext.map.addLayer({
        id: 'map-outlines-numbers',
        type: 'symbol',
        source: 'map-labels',
        layout: {
            'text-font': ['literal', ['Metropolis Bold']],
            'text-field': ['to-string', ['get', 'num']],
            'text-size': [
                'interpolate',
                ['exponential', 1.2],
                ['zoom'],
                5,
                6,
                6,
                9,
                7,
                12,
                8,
                15,
                9,
                17,
                10,
                18,
                12,
                22,
                14,
                26,
                15,
                28,
                20,
                28
            ],
            'text-allow-overlap': true
        },
        paint: {
            'text-color': '#65e',
            'text-halo-color': '#eeeeff',
            'text-halo-width': 1,
            'text-opacity-transition': { duration: 1000 },
            'text-opacity': 0
        }
    });

    mapContext.map.addLayer({
        id: 'map-outlines-fill',
        type: 'fill',
        source: 'map-outlines',
        paint: {
            'fill-color': '#f4a',
            'fill-opacity': ['coalesce', ['feature-state', 'animated-fill-opacity'], 0]
        }
    });

    mapContext.map.addLayer({
        id: 'map-outlines-stroke',
        type: 'line',
        source: 'map-outlines',
        paint: {
            'line-color': '#f4a',
            'line-width': 1,
            'line-opacity': ['coalesce', ['feature-state', 'animated-stroke-opacity'], 0]
        }
    });

    let gridResetTimer = null;
    let currentFillId = null;
    let fillFadeOutTimer = null;
    const activeAnimations = {};
    const featureTimeouts = {};

    mapContext.map.doubleClickZoom.disable();

    mapContext.map.on('click', 'map-outlines-fill', (e) => {
        const clickedLngLat = e.lngLat;
        const feature = e.features?.[0];
        const featureId = feature?.id;
        const mapId = feature?.properties?.id;

        if (mapContext.sheetIndexVisible && mapId) {
            mapContext.historic.setHistoricMapView(mapContext.historic.historicMapsById.get(mapId));
            return;
        }

        mapContext.setGridVisibility(true, clickedLngLat);

        if (gridResetTimer) clearTimeout(gridResetTimer);
        gridResetTimer = setTimeout(() => {
            mapContext.setGridVisibility(false, clickedLngLat);
        }, 1500);

        // if (feature) {
        // 	setTimeout(
        // 		() =>
        // 			map!.flyTo({
        // 				center: clickedLngLat,
        // 				speed: 0.5,
        // 				curve: 1,
        // 				essential: true
        // 			}),
        // 		250
        // 	);
        // }

        if (mapContext.clickedFeature && mapContext.clickedFeature.properties?.id === mapId) {
            if (mapId) mapContext.historic.setHistoricMapView(mapContext.historic.historicMapsById.get(mapId));
        }

        mapContext.clickedFeature = feature;

        if (featureId !== undefined) {
            if (currentFillId !== null && currentFillId !== featureId) {
                if (fillFadeOutTimer) clearTimeout(fillFadeOutTimer);
                animateFeatureOpacity(mapContext.map, currentFillId, 'animated-fill-opacity', 0, 50);
            }

            if (currentFillId !== featureId) {
                currentFillId = featureId;

                animateFeatureOpacity(
                    mapContext.map,
                    featureId,
                    'animated-fill-opacity',
                    0.25,
                    300,
                    () => {
                        fillFadeOutTimer = setTimeout(() => {
                            if (currentFillId === featureId) {
                                animateFeatureOpacity(mapContext.map, featureId, 'animated-fill-opacity', 0, 500);
                                currentFillId = null;
                            }
                        }, 1000);
                    }
                );

                if (clickedMapTimeout) clearTimeout(clickedMapTimeout);
                clickedMapTimeout = setTimeout(() => (mapContext.clickedFeature = null), 2500);
            }
        }
    });
}
