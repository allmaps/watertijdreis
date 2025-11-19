<script lang="ts">
	import Map from '$lib/Map.svelte';
	import NavigationButtons from '$lib/NavigationButtons.svelte';


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

<!-- <NavigationButtons></NavigationButtons> -->

<!-- <Map bind:map={map} bind:compareMap={compareMap} isComparing={isComparing}></Map> -->
<Map></Map>
<!-- <Map2></Map2> -->

<!-- <Tabs2 {mapViewer}></Tabs2> -->

<style>
	:global(body, html, #svelte) {
		height: 100%;
		user-select: none;
		overflow: hidden;
	}
</style>
