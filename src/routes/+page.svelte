<script>
    import Header from '$lib/components/Header.svelte';
    import Map from '$lib/components/Map.svelte';
    import Timeline from '$lib/components/Timeline.svelte';
    
</script>

<main>
    <div class="map-container">
        <Map/>
        <Header/>
    </div>
    <Timeline/>
</main>

<style>
    * {
        user-select: none;
    }

    .map-container {
        width: 100vw;
        position: relative;
    }
</style>