<script lang="ts">
    import maplibregl from 'maplibre-gl';
    import { WarpedMapLayer } from '@allmaps/maplibre'
	import { WarpedMapEventType } from '@allmaps/render';
    import { Dot, Hand, HandGrabbing } from "phosphor-svelte";
	import type { init } from 'maplibre-transition';


    class MapViewer {
        map: maplibregl.Map
        warpedMapLayer: WarpedMapLayer | null = null
        container: HTMLElement

        constructor(container: HTMLElement) {

        }

        init() {
            this.map = new maplibregl.Map()
        }
    }
</script>