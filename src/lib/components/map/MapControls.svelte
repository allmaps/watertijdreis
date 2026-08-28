<script lang="ts">
	import { MagnifyingGlass, MagnifyingGlassMinus, MagnifyingGlassPlus, NavigationArrow, Stack } from "phosphor-svelte";
	import { fly } from "svelte/transition";
	import Geocoder from "../geocoder/Geocoder.svelte";
	import { GeocodeEarth } from "$lib/components/geocoder/providers/geocode-earth";
	import { env } from "$env/dynamic/public";
	import Button from "../ui/Button.svelte";
	import LayersModal from "../modals/LayersModal.svelte";

	let { mapContext, layerOptions = $bindable() } = $props();

	const geocodeEarthApiKey = env.PUBLIC_GEOCODE_EARTH_API_KEY;

	let isApplePlatform = /Mac|iPhone|iPad/.test(navigator.userAgent);
	let kbdVisible = $state(false);
	$effect(() => {
		kbdVisible = true;
	});

	let searchBarVisible = $state(false);
	let layersPanelVisible2 = $state(false);

	let buttonCollapse: boolean = $state(false);
	setTimeout(() => (buttonCollapse = true), 2000);

	const scaleEl = document.querySelector(".maplibregl-ctrl-scale");
	let scaleWidth = $state(scaleEl.clientWidth);
	let scaleText = $state(scaleEl.innerText);
	setInterval(() => {
		scaleWidth = scaleEl.clientWidth;
		scaleText = scaleEl.innerText;
	}, 250);
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key.toLowerCase() === "k" && (isApplePlatform ? e.metaKey : e.ctrlKey)) {
			e.preventDefault();
			searchBarVisible = true;
		}

		if (e.key.toLowerCase() === "l") {
			layersPanelVisible2 = !layersPanelVisible2;
		}
	}}
/>

<Geocoder {mapContext} bind:visible={searchBarVisible} providers={[new GeocodeEarth(geocodeEarthApiKey)]}></Geocoder>

<LayersModal bind:visible={layersPanelVisible2} {mapContext}></LayersModal>

<!-- <div class="fixed top-25 right-2 flex flex-col items-end gap-4">
	<Button Icon={MagnifyingGlass} kbd="⌘K" onclick={() => (searchBarVisible = true)}>
		Zoek plaats ...
	</Button>
</div> -->

<div
	class="
	fixed right-2 flex flex-col items-end gap-2 transition-all duration-300
	{mapContext.historic.selectedMap ? 'bottom-36 sm:bottom-2' : 'bottom-36'}
	"
>
	{#if !mapContext.historic.selectedMap}
		<div transition:fly={{ x: 100, duration: 250 }}>
			<Button tabindex="5" Icon={MagnifyingGlass} kbd="⌘K" onclick={() => (searchBarVisible = true)}>
				Zoek plaats ...
			</Button>
		</div>

		<div transition:fly={{ x: 100, duration: 250 }}>
			<Button tabindex="6" Icon={NavigationArrow} onclick={() => mapContext.flyToUserLocation()}
				>Mijn locatie tonen</Button
			>
		</div>

		<div transition:fly={{ x: 100, duration: 250 }}>
			<Button tabindex="7" Icon={Stack} kbd="L" onclick={() => (layersPanelVisible2 = !layersPanelVisible2)}
				>Lagen</Button
			>
		</div>
	{/if}

	<div
		class={`
			flex w-fit flex-col items-end
			justify-center overflow-hidden rounded-lg
		`}
	>
		<Button Icon={MagnifyingGlassPlus} onclick={() => mapContext.zoomIn()} kbd="+">Inzoomen&nbsp;</Button>
		<div class="relative -top-[2px]">
			<Button Icon={MagnifyingGlassMinus} onclick={() => mapContext.zoomOut()} kbd="-">Uitzoomen</Button>
		</div>
	</div>

	<div
		style:width={scaleWidth + "px"}
		class="border-wtr-blue/66 mt-4 h-2 rounded-b-[4px] border-2 border-t-0 text-right shadow-[1px_1px_0_#eef] transition-all duration-250 text-shadow-[1px_1px_0_#eef]"
	>
		<span class="text-wtr-blue relative -top-4 p-2 text-[12px] font-[600]">{scaleText}</span>
	</div>
</div>
