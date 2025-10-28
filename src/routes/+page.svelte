<script lang="ts">
    // import Map  from '$lib/Map.svelte'
    import maplibregl from 'maplibre-gl';
    import Map2  from '$lib/Map2.svelte'
    import Header from '$lib/Header.svelte';
    import Tabs2 from '$lib/Tabs2.svelte';
    import Toast from '$lib/Toast.svelte';

    let mapViewer : MapViewer | null = $state(null);

    type ComparingState = {
      enabled: boolean,
      mode: "vertical" | "horizontal" | "circle" | "opacity",
      splitPercent: number
    }
    let comparing = $state<ComparingState>({
      enabled: false,
      mode: "vertical",
      splitPercent: 50
    })
</script>

<style>
  :gloal(body, html, #svelte) { 
    height: 100%; 
    user-select: none; 
    overflow: hidden;
  }
</style>

<Header></Header>

<!-- <Map bind:map={map} bind:compareMap={compareMap} isComparing={isComparing}></Map> -->
<Map2 bind:mapViewer={mapViewer}></Map2>

<Tabs2 {mapViewer}></Tabs2>