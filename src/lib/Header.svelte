<script lang="ts">
	import { Waves, ShareNetwork, Question, Plus, FilePlus, Info, ShareFat, MagnifyingGlass, MagnifyingGlassMinus, MagnifyingGlassPlus, NavigationArrow, GridFour, SelectionSlash, Stack, Share } from 'phosphor-svelte';
	import { slide, fly, scale } from 'svelte/transition';
	import Geocoder from './Geocoder.svelte';
	import { GeocodeEarth } from '$lib/geocoder/providers/geocode-earth';
	import { WorldHistoricalGazetteer } from '$lib/geocoder/providers/world-historical-gazetteer';
	import { PUBLIC_GEOCODE_EARTH_API_KEY } from '$env/static/public';
	import LayersPanel from './LayersPanel.svelte';
	import AboutPanel from './AboutPanel.svelte';
	import SharePanel from './SharePanel.svelte';

	let { flyToFeature, flyToUserLocation, setGridVisibility, zoomIn, zoomOut } = $props();

	let searchBarVisible = $state(false);
	let layersPanelVisible = $state(false);
	let aboutPanelVisible = $state(false);
	let sharePanelVisible = $state(false);
	function toggleSearchBar() { searchBarVisible = !searchBarVisible }
	function toggleLayersPanel() { layersPanelVisible = !layersPanelVisible }
	function toggleAboutPanel() { aboutPanelVisible = !aboutPanelVisible }
	function toggleSharePanel() { sharePanelVisible = !sharePanelVisible }

	let gridVisible = $state(false);

	let buttonCollapse: boolean = $state(false);
	setTimeout(() => buttonCollapse = true, 2000);
	let wavesFlipped: boolean = $state(true);
	setInterval(() => (wavesFlipped = !wavesFlipped), 600);

	
</script>

<svelte:window 
	onkeydown={(e) => { if(e.metaKey && e.key == "k") searchBarVisible = true }}
></svelte:window>

<AboutPanel bind:visible={aboutPanelVisible}></AboutPanel>

<SharePanel bind:visible={sharePanelVisible}></SharePanel>

<Geocoder {flyToFeature} bind:visible={searchBarVisible} providers={[new GeocodeEarth(PUBLIC_GEOCODE_EARTH_API_KEY)]}></Geocoder>

<LayersPanel bind:visible={layersPanelVisible}></LayersPanel>

<div 
	class="absolute top-5 left-5 shadow-lg px-3 py-3 text-[#336] rounded-[8px] bg-white z-999"
	onmouseenter={() => buttonCollapse = false}
	onmouseleave={() => buttonCollapse = true}
	role="button"
  	tabindex="0"
>
	<!-- <Waves
		size={20}
		weight="bold"
		color="#33336688"
		class={`relative -top-2 mx-1 inline-block transform ${wavesFlipped ? '-scale-x-100' : ''}`}
	></Waves> -->
	<h1 class="inline relative -top-1 font-[700] text-[20px] flex gap-[1px]">
		{#each "Watertijdreis".split("") as letter, i}
			<span
				class="inline-block wave-letter"
				style="animation-delay: {i * 60}ms"
			>
				{letter}
			</span>
		{/each}
	</h1>

	<div class="inline ml-2">
		<button
			onclick={toggleAboutPanel}
			class={`
				group inline-flex items-center justify-center 
				bg-white border-2 border-[#33336611] font-[500]
				shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
				flex-shrink-0 cursor-pointer 
				hover:bg-[#eef]
				
				transition-all duration-500
				${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg py-2 px-2.5'}
			`}
			>
			<Info color="#f4a" 
				class={`
				h-[22px] w-[22px] opacity-70 group-hover:opacity-100
				relative -top-px inline flex-shrink-0
				`}
			/>
			
			<span class={`
				overflow-hidden whitespace-nowrap
				transition-[max-width,margin,opacity] duration-500 ease-in-out
				${buttonCollapse ? 'max-w-0 opacity-0 ml-0' : 'max-w-40 opacity-100 ml-1.5'}
			`}>
				Over
			</span>
		</button>
		<button
			onclick={toggleSharePanel}
			class={`
				group inline-flex items-center justify-center 
				bg-white border-2 border-[#33336611] font-[500]
				shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
				flex-shrink-0 cursor-pointer 
				hover:bg-[#eef]
				
				transition-all duration-500
				${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg py-2 px-2.5'}
			`}
			>
			<ShareFat color="#f4a" 
				class={`
				h-[22px] w-[22px] opacity-70 group-hover:opacity-100
				relative -top-px inline flex-shrink-0
				`}
			/>
			
			<span class={`
				overflow-hidden whitespace-nowrap
				transition-[max-width,margin,opacity] duration-500 ease-in-out
				${buttonCollapse ? 'max-w-0 opacity-0 ml-0' : 'max-w-40 opacity-100 ml-1.5'}
			`}>
				Delen
			</span>
		</button>
	</div>
</div>

<div 
	role="button"
	tabindex="1"
	onmouseenter={() => buttonCollapse = false}
	onmouseleave={() => buttonCollapse = true}
	class="absolute top-1/4 left-5 z-999 w-20 text-[#336]"
>
	<button
		onclick={toggleSearchBar}
		class={`
			group flex my-3 items-center justify-center 
			bg-white border-2 border-[#33336611] font-[500]
			shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
			flex-shrink-0 cursor-pointer 
			hover:bg-[#eef]
			
			transition-all duration-500
			${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg py-2 px-2.5'}
		`}
		>
		<MagnifyingGlass color="#f4a" 
			class={`
			h-[22px] w-[22px] opacity-70 group-hover:opacity-100
			relative -top-px inline flex-shrink-0
			`}
		/>
		
		<span class={`
			overflow-hidden whitespace-nowrap
			transition-[max-width,margin,opacity] duration-500 ease-in-out
			${buttonCollapse ? 'max-w-0 opacity-0 ml-0' : 'max-w-41 opacity-100 ml-1.5'}
		`}>
			Locatie zoeken...
			<kbd
				class="ml-1 bg-background-alt text-xxs text-[#cce] pointer-events-none flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
			><span class="text-foreground-alt text-[12px]">⌘K</span></kbd>
		</span>

	</button>
	<button
		onclick={flyToUserLocation}
		class={`
			group flex my-3 items-center justify-center 
			bg-white border-2 border-[#33336611] font-[500]
			shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
			flex-shrink-0 cursor-pointer 
			hover:bg-[#eef]
			
			transition-all duration-500
			${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg py-2 px-2.5'}
		`}
		>
		<NavigationArrow color="#f4a" 
			class={`
			h-[22px] w-[22px] opacity-70 group-hover:opacity-100
			relative -top-px inline flex-shrink-0
			`}
		/>
		
		<span class={`
			overflow-hidden whitespace-nowrap
			transition-[max-width,margin,opacity] duration-500 ease-in-out
			${buttonCollapse ? 'max-w-0 opacity-0 ml-0' : 'max-w-40 opacity-100 ml-1.5'}
		`}>
			Naar mijn locatie
		</span>
	</button>

	<br> 
	<button
		onclick={toggleLayersPanel}
		class={`
			group flex my-3 items-center justify-center 
			bg-white border-2 border-[#33336611] font-[500]
			shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
			flex-shrink-0 cursor-pointer 
			hover:bg-[#eef]
			
			transition-all duration-500
			${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg py-2 px-2.5'}
		`}
		>
		<Stack color="#f4a" 
			class={`
			h-[22px] w-[22px] opacity-70 group-hover:opacity-100
			relative -top-px inline flex-shrink-0
			`}
		/>
		
		<span class={`
			overflow-hidden whitespace-nowrap
			transition-[max-width,margin,opacity] duration-500 ease-in-out
			${buttonCollapse ? 'max-w-0 opacity-0 ml-0' : 'max-w-40 opacity-100 ml-1.5'}
		`}>
			Lagen
			<kbd
				class="ml-1 bg-background-alt text-xxs text-[#cce] pointer-events-none flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
			><span class="text-foreground-alt text-[12px]">L</span></kbd>
		</span>
	</button>
	<button
		onclick={() => setGridVisibility(gridVisible = !gridVisible)}
		class={`
			group flex my-3 items-center justify-center 
			bg-white border-2 border-[#33336611] font-[500]
			shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
			flex-shrink-0 cursor-pointer 
			hover:bg-[#eef]
			
			transition-all duration-500
			${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg py-2 px-2.5'}
		`}
		>
		{#if gridVisible}
			<SelectionSlash color="#f4a" 
				class={`
				h-[22px] w-[22px] opacity-70 group-hover:opacity-100
				relative -top-px inline flex-shrink-0
				`}
			/>
		{:else}
			<GridFour color="#f4a" 
				class={`
				h-[22px] w-[22px] opacity-70 group-hover:opacity-100
				relative -top-px inline flex-shrink-0
				`}
			/>
		{/if}
		
		<span class={`
			overflow-hidden whitespace-nowrap
			transition-[max-width,margin,opacity] duration-500 ease-in-out
			${buttonCollapse ? 'max-w-0 opacity-0 ml-0' : 'max-w-40 opacity-100 ml-1.5'}
		`}>
			Grid tonen
			<kbd
				class="ml-1 bg-background-alt text-xxs text-[#cce] pointer-events-none flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
			><span class="text-foreground-alt text-[12px]">Spatie</span></kbd>
		</span>
	</button>

	<div
		class={`
			flex flex-col my-3 items-center justify-center mt-20
			bg-white border-2 border-[#33336611]
			shadow-[0_2px_2px_rgba(0,0,0,0.05)]
			rounded-lg overflow-hidden w-fit
		`}
	>
		<button
			onclick={zoomIn}
			class={`
			group p-2 cursor-pointer
			hover:bg-[#eef] transition-colors duration-200
			border-b-2 border-[#33336611]
			flex items-center justify-center
			`}
			title="Zoom In"
		>
			<MagnifyingGlassPlus
				color="#f4a"
				class="h-[22px] w-[22px] opacity-70 group-hover:opacity-100 transition-opacity"
			/>
		</button>

		<button
			onclick={zoomOut}
			class={`
			group p-2 cursor-pointer
			hover:bg-[#eef] transition-colors duration-200
			flex items-center justify-center
			`}
			title="Zoom Out"
		>
			<MagnifyingGlassMinus
				color="#f4a"
				class="h-[22px] w-[22px] opacity-70 group-hover:opacity-100 transition-opacity"
			/>
		</button>
	</div>
</div>

<style>
	h1 {
		/* font-family: "ivypresto-display"; */
	}

	.wave-letter {
		display: inline-block;
		animation: wave 600ms ease-in-out infinite alternate;
	}

	@keyframes wave {
		0%   { transform: translateY(0px); color: #33a }
		100% { transform: translateY(-2px); color: #336 }
	}
</style>