import type maplibregl from 'maplibre-gl';

export function addBackgroundLayers(map: maplibregl.Map) {
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

export function addWaterschapsgrenzenLayer(map: maplibregl.Map) {
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

export function addGemeentegrenzenLayer(map: maplibregl.Map) {
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