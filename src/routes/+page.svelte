<script>
    import maplibregl from 'maplibre-gl';
    import { WarpedMapLayer } from '@allmaps/maplibre'

    import { Hand } from 'phosphor-svelte';

    import Header from '$lib/Header.svelte';
    import Tabs from '$lib/Tabs.svelte';


    let map = $state();
    let mapCompare = $state();

    const WATERSTAATSKAART_URLS = [
        'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/01-1874-389916-georef.json',
        // 'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/02-1874-456650-georef.json',
        'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/03-1874-455650-georef.json',
        // 'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/04-1874-456550-georef.json',
        'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/05-1874-456551-georef.json',
        // 'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/06-1874-456552-georef.json',
        'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/07-1874-456588-georef.json',
        // 'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/08-1874-456553-georef.json',
        'https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/09-1874-456827-georef.json',

    ]

    function hideCompareMap() {
        document.getElementById('map-compare').style.display = 'none';
        document.getElementById('divider').style.display = 'none';
        mapCompare.stop();  // pause rendering loop
    }

    function showCompareMap() {
        document.getElementById('map-compare').style.display = 'block';
        document.getElementById('divider').style.display = 'block';
        mapCompare.resize(); // fix viewport
        mapCompare.triggerRepaint(); // redraw once
    }

    function setAnnotationUrl(map, index) {
        const url = WATERSTAATSKAART_URLS[index % WATERSTAATSKAART_URLS.length];
        const warpedMapLayer = map.getLayer(map == mapCompare ? 'warpedmaplayer-compare' : 'warpedmaplayer-main').implementation;
        for(let i of WATERSTAATSKAART_URLS) warpedMapLayer.removeGeoreferenceAnnotationByUrl(i);
        warpedMapLayer.addGeoreferenceAnnotationByUrl(url);
    }

    $effect(() => {
        if (!map) {
            map = new maplibregl.Map({
                container: 'map',
                style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
                center: [5, 52.5],
                zoom: 7,
                maxPitch: 0,
                preserveDrawingBuffer: true
            })

            const warpedMapLayer = new WarpedMapLayer('warpedmaplayer-main');
            
            map.on('load', () => {
                map.addLayer(warpedMapLayer)
                warpedMapLayer.addGeoreferenceAnnotationByUrl('https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/03-1874-455650-georef.json');
            })
        }
        if (!mapCompare) {
            mapCompare = new maplibregl.Map({
                container: 'map-compare',
                style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
                center: [5, 52.5],
                zoom: 7,
                maxPitch: 0,
                preserveDrawingBuffer: true
            })

            const warpedMapLayer = new WarpedMapLayer('warpedmaplayer-compare');
            
            mapCompare.on('load', () => {
                mapCompare.addLayer(warpedMapLayer)
                warpedMapLayer.addGeoreferenceAnnotationByUrl('https://raw.githubusercontent.com/tu-delft-heritage/watertijdreis-data/refs/heads/main/content/annotations/01-1874-389916-georef.json');
            })

            let isSyncing = false;
            function sync(source, target) {
                if (isSyncing) return;
                isSyncing = true;
                const center = source.getCenter();
                const zoom = source.getZoom();
                const bearing = source.getBearing();
                const pitch = source.getPitch();

                target.jumpTo({
                    center,
                    zoom,
                    bearing,
                    pitch
                });

                isSyncing = false;
            }

            map.on('move', () => sync(map, mapCompare));
            mapCompare.on('move', () => sync(mapCompare, map));
        }

        hideCompareMap();
        const divider = document.getElementById('divider');
        const compare = document.getElementById('map-compare');
        let isDragging = false;

        divider.addEventListener('mousedown', () => isDragging = true);
        window.addEventListener('mouseup', () => isDragging = false);
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const container = document.getElementById('map-container');
            const rect = container.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));
            const percentX = (x / rect.width) * 100;
            const percentY = (y / rect.height) * 100;

            document.querySelector('#divider #handle').style.top = `${percentY}%`;

            divider.style.left = `${percentX}%`;
            compare.style.clipPath = `inset(0 0 0 ${percentX}%)`;
        });

        setTimeout(() => {
            console.log(map.getLayer('warpedmaplayer-main'));
            addDots(map, map.getLayer('warpedmaplayer-main').implementation, '#f4a');
            addDots(mapCompare, mapCompare.getLayer('warpedmaplayer-compare').implementation, '#a4f');
        }, 1000)
    });

function addDots(map, warpedMapLayer, color = 'red') {
    setTimeout(() => {
        const warpedMaps = Array.from(
            warpedMapLayer.renderer.warpedMapList.warpedMapsById.values()
        );

        // Alle centra uit de warped maps pakken
        const coordinates = warpedMaps.map(m => [
            (m.geoMaskBbox[0] + m.geoMaskBbox[2]) / 2,
            (m.geoMaskBbox[1] + m.geoMaskBbox[3]) / 2
        ]);

        // GeoJSON opbouwen
        const featureCollection = {
            type: 'FeatureCollection',
            features: coordinates.map((c, i) => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: c },
                properties: { id: i, kleur: color }
            }))
        };

        const sourceId = 'warped-centers-' + color;

        // Source toevoegen of updaten
        if (map.getSource(sourceId)) {
            map.getSource(sourceId).setData(featureCollection);
        } else {
            map.addSource(sourceId, { type: 'geojson', data: featureCollection });

            // Circle layer tekenen
            map.addLayer({
                id: 'warped-centers-halo-' + color,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        5, 1.25,   // zoom 5 → radius 2
                        10, 1.5,  // zoom 10 → radius 6
                        15, 6  // zoom 15 → radius 12
                    ],            
                    'circle-color': 'transparent',
                    'circle-stroke-width': 4,
                    'circle-stroke-color': 'white',
                    'circle-opacity': 0
                }
            });
            map.addLayer({
                id: 'warped-centers-outer-' + color,
                type: 'circle',
                source: sourceId,
                paint: {
                    'circle-radius': [
                        'interpolate', ['linear'], ['zoom'],
                        5, 1.5,
                        10, 3,
                        15, 6
                    ],
                    'circle-color': 'transparent',
                    'circle-stroke-width': 2,
                    'circle-stroke-color': ['get', 'kleur']
                }
            });

        }

        // Hover layer voor geomask
        const hoverSourceId = 'warped-hover-mask';
        if (!map.getSource(hoverSourceId)) {
            map.addSource(hoverSourceId, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
            map.addLayer({
                id: 'warped-hover-mask-layer',
                type: 'line',
                source: hoverSourceId,
                paint: {
                    'line-color': 'white',
                    'line-width': 2,
                    'line-opacity': 1
                }
            });
        }

        // Hover events
        map.on('mouseenter', 'warped-centers-outer-' + color, () => {
            map.getCanvas().style.cursor = 'pointer';

        });
        map.on('mouseleave', 'warped-centers-outer-' + color, () => {
            map.getCanvas().style.cursor = '';
            map.getSource(hoverSourceId).setData({ type: 'FeatureCollection', features: [] });
        });

        map.on('mousemove', 'warped-centers-outer-' + color, (e) => {
            if (!e.features.length) return;
            const feature = e.features[0];
            const idx = feature.properties.id;
            const warpedMap = warpedMaps[idx];

            // Bouw een GeoJSON voor de originele geomask van dit punt
            const maskFeature = {
                type: 'Feature',
                geometry: warpedMap.geoMask, // dit is je originele geomask polygon
                properties: {}
            };
            map.getSource(hoverSourceId).setData({
                type: 'FeatureCollection',
                features: [maskFeature]
            });
        });

        // Idle-fade logica blijft hetzelfde
        function fadeOutMarkers() {
            map.setPaintProperty('warped-centers-outer-' + color, 'circle-opacity', 0);
            map.setPaintProperty('warped-centers-outer-' + color, 'circle-stroke-opacity', 0);
            map.setPaintProperty('warped-centers-halo-' + color, 'circle-stroke-opacity', 0);
        }

        function fadeInMarkers() {
            map.setPaintProperty('warped-centers-outer-' + color, 'circle-opacity', 1);
            map.setPaintProperty('warped-centers-outer-' + color, 'circle-stroke-opacity', 1);
            map.setPaintProperty('warped-centers-halo-' + color, 'circle-stroke-opacity', 1);
        }

        let idleTimer;
        function resetIdleTimer() {
            clearTimeout(idleTimer);
            fadeInMarkers();
            idleTimer = setTimeout(() => { fadeOutMarkers(); }, 1000);
        }

        document.addEventListener('mousemove', resetIdleTimer);
        document.addEventListener('mousewheel', resetIdleTimer);

        // ['movestart', 'dragstart', 'zoomstart', 'pitchstart', 'rotatestart', 'mousemove'].forEach(evt => {
        //     map.on(evt, resetIdleTimer);
        // });

        map.on('idle', () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => { fadeOutMarkers(); }, 1000);
        });

        resetIdleTimer();
    }, 500);
}
</script>

<style>
  :global(body, html, #svelte) { height: 100%; user-select: none; }

    #map-container {
        position: relative;
        width: 100%;
        height: 100vh;
        overflow: hidden;
    }

    #map, #map-compare {
        position: absolute;
        top: 0; left: 0;
        width: 100%;
        height: 100%;
    }

    #map-compare {
        clip-path: inset(0 0 0 50%);
        pointer-events: none; /* so divider can be dragged */
    }

    #divider {
        display: none;
        position: absolute;
        top: 0;
        left: 50%; /* initial middle position */
        width: 3px;
        height: 100%;
        background: #336;
        cursor: ew-resize;
        border: 1px solid #f3f3ffcc;
    }

    #divider #handle {
        position: absolute;
        top: 50%;
        left: -16px;
        width: 32px;
        height: 32px;
        background: #336;
        border-radius: 100%;
        transform: translateY(-50%);
        box-shadow: 0 3px 8px rgba(0,0,0,0.5);
    }
</style>

<Header></Header>

<div id='map-container'>
    <div id='map'></div>
    <div id='map-compare'></div>
    <div id="divider">
        <div id='handle'>
            <Hand size={22} class="relative top-[2px] left-[5px]" style="display: inline-block; color: white;" />
        </div>
    </div>
</div>
<Tabs {map} {mapCompare} {showCompareMap} {hideCompareMap} {setAnnotationUrl}></Tabs>