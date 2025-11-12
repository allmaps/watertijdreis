<script lang="ts">
	import { MagnifyingGlass, MapTrifold, NavigationArrow } from 'phosphor-svelte';
	// import Geocoder from './Geocoder.svelte';
	// import { GeocodeEarth } from '$lib/geocoder/providers/geocode-earth';
	// import { WorldHistoricalGazetteer } from '$lib/geocoder/providers/world-historical-gazetteer';
	// // import { PUBLIC_GEOCODE_EARTH_API_KEY } from '$env/static/public';

	let mouseAngle = $state(0);

	let loaded = $state(false);
</script>

<div
	class="absolute top-20 left-5 rounded-full p-[3px] shadow-lg"
	style:background={`linear-gradient(${mouseAngle - Math.PI / 2}rad, #ff44aaaa, transparent)`}
>
	<div class="rounded-full bg-[#336] p-3 hover:bg-[#447]">
		<MagnifyingGlass size="18" color="#fff" weight="bold"></MagnifyingGlass>
	</div>
</div>
<div
	class="absolute top-35 left-5 rounded-full p-[3px] shadow-lg"
	style:background={`linear-gradient(${mouseAngle - Math.PI / 2}rad, #ff44aaaa, transparent)`}
>
	<div class="rounded-full bg-[#336] p-3">
		<MapTrifold size="18" color="white" weight="bold"></MapTrifold>
	</div>
</div>

<!-- <Geocoder providers={[new WorldHistoricalGazetteer()]}></Geocoder> -->

<svelte:body onmousemove={(e) => (mouseAngle = Math.atan2(e.clientY, e.clientX))} />
