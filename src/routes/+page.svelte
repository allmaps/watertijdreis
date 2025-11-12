<script lang="ts">
	import Map from '$lib/Map.svelte';
	import Header from '$lib/Header.svelte';
	import Search from '$lib/Search.svelte';

	type ComparingState = {
		enabled: boolean;
		mode: 'vertical' | 'horizontal' | 'circle' | 'opacity';
		splitPercent: number;
	};
	let comparing = $state<ComparingState>({
		enabled: false,
		mode: 'vertical',
		splitPercent: 50
	});
</script>

<link rel="stylesheet" href="https://use.typekit.net/bis1pqi.css" />

<Header></Header>

<!-- <Map bind:map={map} bind:compareMap={compareMap} isComparing={isComparing}></Map> -->
<Map></Map>
<!-- <Map2></Map2> -->

<!-- <Tabs2 {mapViewer}></Tabs2> -->

<Search></Search>

<style>
	:global(body, html, #svelte) {
		height: 100%;
		user-select: none;
		overflow: hidden;
	}
</style>
