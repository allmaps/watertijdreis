<script lang="ts">
	import { MagnifyingGlass, MapTrifold, NavigationArrow } from 'phosphor-svelte';
	import Geocoder from './Geocoder.svelte';
	import { GeocodeEarth } from '$lib/geocoder/providers/geocode-earth';
	import { WorldHistoricalGazetteer } from '$lib/geocoder/providers/world-historical-gazetteer';
	import { PUBLIC_GEOCODE_EARTH_API_KEY } from '$env/static/public';
	import { scale } from 'svelte/transition';

	let { flyToFeature } = $props();

	let searchBarVisible = $state(false);

	function toggleSearchBar() { searchBarVisible = !searchBarVisible }
</script>

<button
	class="absolute top-60 left-5 rounded-full p-[4px] shadow-lg cursor-pointer"
	style:background={`linear-gradient(${- Math.PI / 2}rad, #336, 50%, #00f)`}
	onclick={toggleSearchBar}
>
	<div class="rounded-full bg-[#fff] p-3 hover:bg-[#eef] active:translate-y-[1px] active:scale-95 transition-transform">
		<MagnifyingGlass size="18" color="#f4a" weight="bold"></MagnifyingGlass>
	</div>
</button>
<!-- <div
	class="absolute top-20 left-5 rounded-full p-[4px] shadow-lg cursor-pointer"
	style:background={`linear-gradient(${- Math.PI / 2}rad, #ff44aa88, #88f)`}
>
	<div class="rounded-full bg-[#336] p-3">
		<MapTrifold size="18" color="white" weight="bold"></MapTrifold>
	</div>
</div> -->

<svelte:window 
	onkeydown={(e) => { if(e.metaKey && e.key == "k") searchBarVisible = true }}
></svelte:window>

<Geocoder {flyToFeature} bind:visible={searchBarVisible} providers={[new GeocodeEarth(PUBLIC_GEOCODE_EARTH_API_KEY)]}></Geocoder>
