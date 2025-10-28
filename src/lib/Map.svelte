<script>
    import maplibregl from 'maplibre-gl';
    import { WarpedMapLayer } from '@allmaps/maplibre'
	import { WarpedMapEventType } from '@allmaps/render';
    import { Dot, Hand, HandGrabbing } from "phosphor-svelte";
	import DotOverlay from './DotOverlay.svelte';

    let { map = $bindable(), compareMap = $bindable(), isComparing } = $props();

    let dotsVisible = $state(false);
    let hideTimeout;

    function showDots() {
        if (!dotsVisible) {
            dotsVisible = true;
        }

        clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            dotsVisible = false;
        }, 1000);
    }

    let clientWidth = $state(0);
    let clientHeight = $state(0);

    let warpedMapDots = $state([]);

    let isResizingCompareMap = $state(false);
    let resizePercentX = $state(50);
    let resizePercentY = $state(50);

    $effect(() => {
        if(!map) {
            map = new Map('map', { dotColor: '#f4a' });
            compareMap = new Map('map-compare', {parentMap: map, dotColor : '#a4f'});
            setTimeout(() => compareMap.warpedMapLayer.setEditionByIndex(0), 500) // TODO: anders!;
            setTimeout(() => map.warpedMapLayer.setEditionByIndex(3), 500) // TODO: anders!;
        }

        if(isComparing) showCompareMap();
        else hideCompareMap();
    })

    function showCompareMap() {
        document.getElementById('map-compare').style.display = 'block';
        document.getElementById('divider').style.display = 'block';
        compareMap.maplibreInstance.resize();
        compareMap.maplibreInstance.triggerRepaint();
    }

    function hideCompareMap() {
        document.getElementById('map-compare').style.display = 'none';
        document.getElementById('divider').style.display = 'none';
        compareMap.maplibreInstance.stop();
    }

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

    export class Map {
        constructor(containerId = 'map', props = {}) {
            this.maplibreInstance = new maplibregl.Map({
                container: containerId,
                style: {
                    version: 8,
                    sources: {},
                    layers: [
                        {
                            id: "background",
                            type: "background",
                            paint: {
                                "background-color": "#ffffff00"
                            }
                        }
                    ]
                },
                center: [5, 51.75],
                zoom: 6.5,
                maxPitch: 0,
                preserveDrawingBuffer: true
            });

            this.warpedMapLayer = new WaterStaatsKaartLayer(this.maplibreInstance, props);
            // this.dotLayer = new DotLayer(this);

            if(props.parentMap) {
                let isSyncing = false;
                const sync = (source, target) => {
                    if (isSyncing) return;
                    isSyncing = true;

                    target.jumpTo({ 
                        center: source.getCenter(), 
                        zoom: source.getZoom(), 
                        bearing: source.getBearing(), 
                        pitch: source.getPitch() 
                    });

                    isSyncing = false;
                }

                this.maplibreInstance.on('move', () => sync(this.maplibreInstance, props.parentMap.maplibreInstance));
                props.parentMap.maplibreInstance.on('move', () => sync(props.parentMap.maplibreInstance, this.maplibreInstance));
            }
        }

        getScale() {

        }

        getRotation() {
            return this.maplibreInstance.getBearing();
        }
    }

    class WaterStaatsKaartLayer {
        constructor(map, props = {}) {
            this.id = self.crypto.randomUUID();
            this.layer = new WarpedMapLayer(this.id);
            this.annotationUrls = [];

            map.on('load', () => {
                map.addLayer(this.layer);
            });

            this.warpedMapCenters = [];
            setTimeout(() => { // TODO: anders!
                this.warpedMapCenters = this.warpedMapList.map(m => { return {
                    id: m.mapId,
                    coordinates: [(m.geoMaskBbox[0] + m.geoMaskBbox[2]) / 2, (m.geoMaskBbox[1] + m.geoMaskBbox[3]) / 2]
                }});

                console.log(this, map);
            }, 1500);
            if(!props.parentMap) map.on('render', () => {
                warpedMapDots = this.warpedMapCenters.map(m => { return { id: m.id, pos: map.project(m.coordinates) }})
            })

            map.on('mousemove', e => {
                const hoveredMaps = this.getWarpedMapsByGeoPosition(e.lngLat.lng, e.lngLat.lat);
                this.hoveredMap = hoveredMaps[0];
            });

        }

        get warpedMapList() {
            return Array.from(this.layer.renderer.warpedMapList.warpedMapsById.values())
        }

        get hoveredMapId() {
            return this.hoveredMap && this.hoveredMap.mapId;
        }

        getWarpedMapByID(id) {
            return this.layer.renderer?.warpedMapList.warpedMapsById.get(id);
        }

        getWarpedMapsByGeoPosition(lon, lat) {
            const warpedMapList = this.layer.renderer?.warpedMapList;
            if (!warpedMapList) return [];
            const results = warpedMapList.rtree.searchFromPoint([lon, lat], true);
            return results
                .filter(i => warpedMapList.warpedMapsById.get(i).visible)
                .map(i => this.getWarpedMapByID(i));
        }

        addEditionByUrl(url) {
            this.annotationUrls.push(url);
            this.layer.addGeoreferenceAnnotationByUrl(url);
        }

        setEditionByUrl(url) {
            this.clearEditions();
            this.addEditionByUrl(url);
        }
        
        setEditionByIndex(index) {
            if(index < 0 || index >= WATERSTAATSKAART_URLS.length) return;
            this.setEditionByUrl(WATERSTAATSKAART_URLS[index]);
        }

        removeEditionByUrl(url) {
            this.annotationUrls = this.annotationUrls.filter(u => u !== url);
            this.layer.removeGeoreferenceAnnotationByUrl(url);
        }

        clearEditions() {
            for(let url of this.annotationUrls) {
                this.layer.removeGeoreferenceAnnotationByUrl(url);
            }
            this.annotationUrls = [];
        }

        fadeInBBoxOutline(map, warpedMap, duration = 500) {
            const id = `bbox-outline-${warpedMap.mapId}`;
            const bbox = warpedMap.geoMaskBbox; // [minX, minY, maxX, maxY]

            // Maak polygon van bbox
            const geojson = {
                type: "FeatureCollection",
                features: [{
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [[
                            [bbox[0], bbox[1]],
                            [bbox[2], bbox[1]],
                            [bbox[2], bbox[3]],
                            [bbox[0], bbox[3]],
                            [bbox[0], bbox[1]]
                        ]]
                    },
                    properties: {}
                }]
            };

            // Voeg bron en laag toe als ze nog niet bestaan
            if (!map.getSource(id)) {
                map.addSource(id, { type: 'geojson', data: geojson });
            }
            if (!map.getLayer(id)) {
                map.addLayer({
                    id,
                    type: 'line',
                    source: id,
                    paint: {
                        'line-color': '#fff',
                        'line-width': 2,
                        'line-opacity': 0
                    }
                });
            }

            // Fade-in animatie
            const start = performance.now();
            const tick = (now) => {
                const t = Math.min(1, (now - start) / duration);
                map.setPaintProperty(id, 'line-opacity', Math.min(1,Math.max(0,t)));
                if (t < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }

        fadeOutBBoxOutline(map, warpedMap, duration = 500, removeAfter = true) {
            const id = `bbox-outline-${warpedMap.mapId}`;
            if (!map.getLayer(id)) return;

            // Fade-out animatie
            const start = performance.now();
            const tick = (now) => {
                const t = Math.min(1, (now - start) / duration);
                map.setPaintProperty(id, 'line-opacity', 1 - t);
                if (t < 1) requestAnimationFrame(tick);
                else if (removeAfter) {
                    map.removeLayer(id);
                    map.removeSource(id);
                }
            };
            requestAnimationFrame(tick);
        }
    }

    class DotLayer {
        constructor(map) {
            this.id = self.crypto.randomUUID();
            const warpedMapLayer = map.warpedMapLayer;

            setTimeout(() => {
                const centers = warpedMapLayer.warpedMapList.map(m => [
                    (m.geoMaskBbox[0] + m.geoMaskBbox[2]) / 2,
                    (m.geoMaskBbox[1] + m.geoMaskBbox[3]) / 2
                ]);

                map.maplibreInstance.addSource(this.id, {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: centers.map((c, i) => ({
                            type: 'Feature',
                            id: i,
                            geometry: { type: 'Point', coordinates: c },
                            properties: {}
                        }))
                    }
                });

                map.maplibreInstance.addLayer({
                    id: `${this.id}-outer`,
                    type: 'circle',
                    source: this.id,
                    paint: {
                        'circle-radius': 3,
                        'circle-color': '#f4a',
                        'circle-stroke-color': '#fff',
                        'circle-stroke-width': 2,
                        'circle-opacity': 0.8
                    }
                });

                map.maplibreInstance.on('mouseenter', `${this.id}-outer`, e => {
                    map.maplibreInstance.getCanvas().style.cursor = 'pointer';
                    // map.maplibreInstance.setPaintProperty(`${this.id}-outer`, 'circle-radius', 10);
                });

                map.maplibreInstance.on('mouseleave', `${this.id}-outer`, e => {
                    map.maplibreInstance.getCanvas().style.cursor = '';
                });
            }, 1000);
        }
    }
</script>

<style>
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

<svelte:window
    onmouseup={() => isResizingCompareMap = false}
    onmousemove={(e) => {
        showDots();

        if (!isResizingCompareMap) return;
        const x = Math.max(0, Math.min(e.clientX, clientWidth));
        const y = Math.max(0, Math.min(e.clientY, clientHeight));
        resizePercentX = (x / clientWidth) * 100;
        resizePercentY = (y / clientHeight) * 100;
    }}
    onmousewheel={showDots}
></svelte:window>

<div hidden id='map-container' bind:clientWidth={clientWidth} bind:clientHeight={clientHeight}>
    <div 
        id='map'
        style={`clip-path: ${isComparing ? `inset(0 ${100 - resizePercentX}%) 0 0` : 'none'}`}
    ></div>
    <div 
        id='map-compare'
        style={`clip-path: inset(0 0 0 ${resizePercentX}%)`}
    ></div>
    <!-- <DotOverlay 
    {map} {warpedMapDots} {dotsVisible} {isComparing} resizePercent={resizePercentX}
    /> -->
    <div 
        id="divider"
        onmousedown={() => isResizingCompareMap = true}
        onmouseup={() => isResizingCompareMap = false}
        style:left={`${resizePercentX}%`}
        style:cursor={isResizingCompareMap ? 'none' : 'ew-resize'}
    >
        <div 
            id='handle'
            style:top={`${resizePercentY}%`}    
        >
            {#if isResizingCompareMap}
            <HandGrabbing size={22} class="relative top-[2px] left-[5px]" style="display: inline-block; color: white;" />
            {:else}
            <Hand size={22} class="relative top-[2px] left-[5px]" style="display: inline-block; color: white;" />
            {/if}
        </div>
    </div>
</div>