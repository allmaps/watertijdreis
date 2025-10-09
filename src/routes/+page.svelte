<script lang="ts">
    import Map  from '$lib/Map.svelte'
    import Header from '$lib/Header.svelte';
    import Tabs from '$lib/Tabs.svelte';
    import maplibregl from 'maplibre-gl';

    let map = $state<maplibregl.Map | null>(null);

    let compareMap = $state();
    let isComparing = $state(false);

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
  :global(body, html, #svelte) { 
    height: 100%; 
    user-select: none; 
    overflow: hidden;
  }
</style>

<Header></Header>

<Map bind:map={map} bind:compareMap={compareMap} isComparing={isComparing}></Map>

<Tabs {map} {compareMap} bind:isComparing={isComparing}></Tabs>