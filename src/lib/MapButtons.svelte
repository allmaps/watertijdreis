<script lang="ts">
	import {
		MagnifyingGlass,
		MagnifyingGlassMinus,
		MagnifyingGlassPlus,
		NavigationArrow,
		GridFour,
		SelectionSlash,
		Stack,
		GpsFix
	} from 'phosphor-svelte';
	import { slide, fly, scale } from 'svelte/transition';
	import Geocoder from './Geocoder.svelte';
	import { GeocodeEarth } from '$lib/geocoder/providers/geocode-earth';
	import { PUBLIC_GEOCODE_EARTH_API_KEY } from '$env/static/public';
	import LayersPanel from './LayersPanel.svelte';
	import { onMount } from 'svelte';
	import Button from './Button.svelte';
	import LayersPanel2 from './LayersPanel2.svelte';

	let {
		selectedHistoricMap,
		flyToFeature,
		flyToUserLocation,
		setGridVisibility,
		zoomIn,
		zoomOut,
		layerOptions = $bindable(),
		userLocationActive = $bindable()
	} = $props();

	let isApplePlatform = /Mac|iPhone|iPad/.test(navigator.userAgent);
	let kbdVisible = $state(false);
	$effect(() => {
		kbdVisible = true;
	});

	let searchBarVisible = $state(false);
	let layersPanelVisible = $state(false);
	let layersPanelVisible2 = $state(false);
	let gridVisible = $state(false);

	let buttonCollapse: boolean = $state(false);
	setTimeout(() => (buttonCollapse = true), 2000);

	const scaleEl = document.querySelector('.maplibregl-ctrl-scale');
	let scaleWidth = $state(scaleEl.clientWidth);
	let scaleText = $state(scaleEl.innerText);
	setInterval(() => {
		scaleWidth = scaleEl.clientWidth;
		scaleText = scaleEl.innerText;
	}, 250);
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key.toLowerCase() === 'k' && (isApplePlatform ? e.metaKey : e.ctrlKey)) {
			e.preventDefault();
			searchBarVisible = true;
		}

		if (e.key.toLowerCase() === 'l') {
			layersPanelVisible2 = !layersPanelVisible2;
		}
	}}
/>

<Geocoder
	{flyToFeature}
	bind:visible={searchBarVisible}
	providers={[new GeocodeEarth(PUBLIC_GEOCODE_EARTH_API_KEY)]}
></Geocoder>

<LayersPanel2 bind:visible={layersPanelVisible2} bind:layerOptions></LayersPanel2>

<!-- <div class="fixed top-25 right-2 flex flex-col items-end gap-4">
	<Button Icon={MagnifyingGlass} kbd="⌘K" onclick={() => (searchBarVisible = true)}>
		Zoek plaats ...
	</Button>
</div> -->

<div class="fixed right-2 bottom-36 flex flex-col items-end gap-2">
	{#if !selectedHistoricMap}
		<div transition:fly={{ x: 100, duration: 250 }}>
			<Button Icon={MagnifyingGlass} kbd="⌘K" onclick={() => (searchBarVisible = true)}>
				Zoek plaats ...
			</Button>
		</div>

		<div transition:fly={{ x: 100, duration: 250 }}>
			<Button Icon={NavigationArrow} onclick={flyToUserLocation}>Mijn locatie tonen</Button>
		</div>

		<div transition:fly={{ x: 100, duration: 250 }}>
			<Button Icon={Stack} kbd="L" onclick={() => (layersPanelVisible2 = !layersPanelVisible2)}
				>Lagen</Button
			>
		</div>
	{/if}

	<div
		class={`
			flex w-fit flex-col items-center
			justify-center overflow-hidden rounded-lg
			bg-white
			shadow-[0_2px_2px_rgba(0,0,0,0.05)] outline-2 outline-[#33336611]
		`}
	>
		<button
			onclick={zoomIn}
			class={`
			group flex cursor-pointer
			items-center justify-center border-b-2
			border-[#33336611] px-2.25 py-2
			transition-colors duration-200 hover:bg-[#eeeeff88]
			`}
			title="Zoom In"
		>
			<MagnifyingGlassPlus
				color="#f4a"
				class="h-[22px] w-[22px] opacity-70 transition-opacity group-hover:opacity-100"
			/>
		</button>

		<button
			onclick={zoomOut}
			class={`
			group flex cursor-pointer
			items-center justify-center p-2
			transition-colors duration-200 hover:bg-[#eeeeff88]
			`}
			title="Zoom Out"
		>
			<MagnifyingGlassMinus
				color="#f4a"
				class="h-[22px] w-[22px] opacity-70 transition-opacity group-hover:opacity-100"
			/>
		</button>
	</div>

	<div
		style:width={scaleWidth + 'px'}
		class="mt-4 h-2 rounded-b-[4px] border-2 border-t-0 border-[#333366aa] text-right shadow-[1px_1px_0_#eef] transition-all duration-250 text-shadow-[1px_1px_0_#eef]"
	>
		<span class="relative -top-4 p-2 text-[12px] font-[600] text-[#336]">{scaleText}</span>
	</div>
</div>
