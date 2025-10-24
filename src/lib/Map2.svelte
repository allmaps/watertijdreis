<script lang="ts">
    import maplibregl from 'maplibre-gl';
    import { WarpedMapLayer } from '@allmaps/maplibre'
	import { WarpedMapEventType } from '@allmaps/render';
    import { Dot, Hand, HandGrabbing } from "phosphor-svelte";
	import type { init } from 'maplibre-transition';

    $effect(() => {
        
    });


    class MapViewer {
        map: maplibregl.Map | null = null
        warpedMapLayer: WarpedMapLayer | null = null
        containerId: string

        constructor(containerId: string) {
            this.containerId = containerId;
        }

        init() {
            this.map = new maplibregl.Map({
                container: this.containerId,
                style: 'https://demotiles.maplibre.org/globe.json',
                center: [5, 52.5],
                zoom: 7,
                maxPitch: 0,
                preserveDrawingBuffer: true
            })

            this.warpedMapLayer = new WarpedMapLayer();

            fetch('filteredMaps.json')
                .then(res => res.json())
                .then(data => {
                    console.log("Loaded filtered maps:", data);
                    data.forEach((map: any) => {
                        this.warpedMapLayer?.addGeoreferencedMap(map)
                    });
                });
        }
    }
</script>

<div id="map-container"></div>