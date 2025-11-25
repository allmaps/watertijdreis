<script lang="ts">
	import {
		MagnifyingGlass,
		MagnifyingGlassMinus,
		MagnifyingGlassPlus,
		NavigationArrow,
		GridFour,
		SelectionSlash,
		Stack
	} from 'phosphor-svelte';
	import { slide, fly, scale } from 'svelte/transition';
	import Geocoder from './Geocoder.svelte';
	import { GeocodeEarth } from '$lib/geocoder/providers/geocode-earth';
	import { PUBLIC_GEOCODE_EARTH_API_KEY } from '$env/static/public';
	import LayersPanel from './LayersPanel.svelte';
	import { onMount } from 'svelte';

	let {
		visible = true,
		flyToFeature,
		flyToUserLocation,
		setGridVisibility,
		zoomIn,
		zoomOut,
		layerOptions
	} = $props();

	let isMac = $state(false);
	let isIOS = $state(false);
	let isAndroid = $state(false);

	onMount(() => {
		const ua = navigator.userAgent.toLowerCase();
		const platform = navigator.platform.toLowerCase();

		isMac = platform.includes('mac');

		isIOS =
			/iPad|iPhone|iPod/.test(navigator.userAgent) ||
			(ua.includes('mac') && 'ontouchend' in document);

		isAndroid = ua.includes('android');
	});

	let searchBarVisible = $state(false);
	let layersPanelVisible = $state(false);
	let gridVisible = $state(false);

	let buttonCollapse: boolean = $state(false);
	setTimeout(() => (buttonCollapse = true), 2000);
</script>

<svelte:window
	onkeydown={(e) => {
		if (isIOS || isAndroid) return;

		if (e.key.toLowerCase() === 'k' && ((isMac && e.metaKey) || (!isMac && e.ctrlKey))) {
			e.preventDefault();
			searchBarVisible = true;
		}

		if (e.key.toLowerCase() === 'l') {
			layersPanelVisible = !layersPanelVisible;
		}
	}}
/>

<Geocoder
	{flyToFeature}
	bind:visible={searchBarVisible}
	providers={[new GeocodeEarth(PUBLIC_GEOCODE_EARTH_API_KEY)]}
></Geocoder>

<LayersPanel bind:visible={layersPanelVisible} {layerOptions}></LayersPanel>

{#if visible}
	<div
		transition:fly={{ x: -80, duration: 500 }}
		role="button"
		tabindex="1"
		onmouseenter={() => (buttonCollapse = false)}
		onmouseleave={() => (buttonCollapse = true)}
		class="absolute top-1/4 left-5 z-999 w-20 text-[#336]"
	>
		<button
			onclick={() => (searchBarVisible = !searchBarVisible)}
			class={`
			group my-3 flex flex-shrink-0 cursor-pointer 
			items-center justify-center border-2 border-[#33336611]
			bg-white 
			font-[500] shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
			transition-all
			
			duration-500 hover:bg-[#eef]
			${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg px-2.5 py-2'}
		`}
		>
			<MagnifyingGlass
				color="#f4a"
				class={`
			relative -top-px inline h-[22px]
			w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
			`}
			/>

			<span
				class={`
			overflow-hidden whitespace-nowrap
			transition-[max-width,margin,opacity] duration-500 ease-in-out
			${buttonCollapse ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 max-w-41 opacity-100'}
		`}
			>
				Locatie zoeken...
				<kbd
					class="bg-background-alt text-xxs pointer-events-none ml-1 flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium text-[#cce] shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
					><span class="text-foreground-alt text-[12px]"
						>{#if isMac}⌘K{:else}Ctrl K{/if}</span
					></kbd
				>
			</span>
		</button>
		<button
			onclick={flyToUserLocation}
			class={`
			group my-3 flex flex-shrink-0 cursor-pointer 
			items-center justify-center border-2 border-[#33336611]
			bg-white 
			font-[500] shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
			transition-all
			
			duration-500 hover:bg-[#eef]
			${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg px-2.5 py-2'}
		`}
		>
			<NavigationArrow
				color="#f4a"
				class={`
			relative -top-px inline h-[22px]
			w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
			`}
			/>

			<span
				class={`
			overflow-hidden whitespace-nowrap
			transition-[max-width,margin,opacity] duration-500 ease-in-out
			${buttonCollapse ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 max-w-40 opacity-100'}
		`}
			>
				Naar mijn locatie
			</span>
		</button>

		<br />
		<button
			onclick={() => (layersPanelVisible = !layersPanelVisible)}
			class={`
			group my-3 flex flex-shrink-0 cursor-pointer 
			items-center justify-center border-2 border-[#33336611]
			bg-white 
			font-[500] shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
			transition-all
			
			duration-500 hover:bg-[#eef]
			${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg px-2.5 py-2'}
		`}
		>
			<Stack
				color="#f4a"
				class={`
			relative -top-px inline h-[22px]
			w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
			`}
			/>

			<span
				class={`
			overflow-hidden whitespace-nowrap
			transition-[max-width,margin,opacity] duration-500 ease-in-out
			${buttonCollapse ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 max-w-40 opacity-100'}
		`}
			>
				Lagen
				<kbd
					class="bg-background-alt text-xxs pointer-events-none ml-1 flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium text-[#cce] shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
					><span class="text-foreground-alt text-[12px]">L</span></kbd
				>
			</span>
		</button>
		<button
			onclick={() => setGridVisibility((gridVisible = !gridVisible))}
			class={`
			group my-3 flex flex-shrink-0 cursor-pointer 
			items-center justify-center border-2 border-[#33336611]
			bg-white 
			font-[500] shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
			transition-all
			
			duration-500 hover:bg-[#eef]
			${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg px-2.5 py-2'}
		`}
		>
			{#if gridVisible}
				<SelectionSlash
					color="#f4a"
					class={`
				relative -top-px inline h-[22px]
				w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
				`}
				/>
			{:else}
				<GridFour
					color="#f4a"
					class={`
				relative -top-px inline h-[22px]
				w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
				`}
				/>
			{/if}

			<span
				class={`
			overflow-hidden whitespace-nowrap
			transition-[max-width,margin,opacity] duration-500 ease-in-out
			${buttonCollapse ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 max-w-40 opacity-100'}
		`}
			>
				Grid tonen
				<kbd
					class="bg-background-alt text-xxs pointer-events-none ml-1 flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium text-[#cce] shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
					><span class="text-foreground-alt text-[12px]">Spatie</span></kbd
				>
			</span>
		</button>

		<div
			class={`
			my-3 mt-20 flex w-fit flex-col items-center
			justify-center overflow-hidden rounded-lg
			border-2
			border-[#33336611] bg-white shadow-[0_2px_2px_rgba(0,0,0,0.05)]
		`}
		>
			<button
				onclick={zoomIn}
				class={`
			group flex cursor-pointer
			items-center justify-center border-b-2
			border-[#33336611] p-2
			transition-colors duration-200 hover:bg-[#eef]
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
			transition-colors duration-200 hover:bg-[#eef]
			`}
				title="Zoom Out"
			>
				<MagnifyingGlassMinus
					color="#f4a"
					class="h-[22px] w-[22px] opacity-70 transition-opacity group-hover:opacity-100"
				/>
			</button>
		</div>
	</div>
{/if}
