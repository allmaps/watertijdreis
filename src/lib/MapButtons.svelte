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
	import Button from './Button.svelte';

	let {
		visible = true,
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
	let gridVisible = $state(false);

	let buttonCollapse: boolean = $state(false);
	setTimeout(() => (buttonCollapse = true), 2000);

	let locationBtnWidth = $state(0);
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key.toLowerCase() === 'k' && (isApplePlatform ? e.metaKey : e.ctrlKey)) {
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

<LayersPanel bind:visible={layersPanelVisible} bind:layerOptions></LayersPanel>

{#if visible}
	<div
		transition:fly={{ x: -80, duration: 500 }}
		role="button"
		tabindex="1"
		onmouseenter={() => (buttonCollapse = false)}
		onmouseleave={() => (buttonCollapse = true)}
		class="absolute top-1/4 left-5 z-999 w-20 text-[#336]"
	>
		<!-- <button
			class="
			group fixed top-40 left-5 z-1000 my-3 flex flex-shrink-0 cursor-pointer
			items-center justify-center rounded-[8px] border-2 border-[#33336611]
			bg-[#33336611] font-[500]
			text-[#336] shadow-[0_2px_2px_rgba(0,0,0,0.05)]
			backdrop-blur-md duration-500
		"
		>
			<div class="flex flex-shrink items-center justify-center h-10 rounded-[8px] bg-white p-2 group-active:scale-95">
				<MagnifyingGlass
					color="#f4a"
					class={`
						relative inline -top-px inline h-[22px]
						w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
						`}
				/>
				<div class="px-2 overflow-hidden whitespace-nowrap w-0 transition:w duration-500 group-hover:w-full">
					Locatie zoeken...
				</div>
			</div>
		</button> -->

		<Button Icon={MagnifyingGlass} kbd="⌘K" onclick={() => (searchBarVisible = true)}>
			Locatie zoeken...
		</Button>

		<div class="mt-3">
			<Button Icon={NavigationArrow} onclick={flyToUserLocation}>Naar mijn locatie</Button>
		</div>

		<div class="mt-5">
			<Button Icon={Stack} kbd="L" onclick={() => (layersPanelVisible = !layersPanelVisible)}
				>Lagen</Button
			>
		</div>

		<!-- <button
			onclick={() => (searchBarVisible = !searchBarVisible)}
			class={`
			group my-3 flex flex-shrink-0 cursor-pointer 
			items-center justify-center
			bg-white font-[500]
			shadow-lg
			outline-2 outline-[#33336622]
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
				bind:clientWidth={locationBtnWidth}
				class={`
			overflow-hidden whitespace-nowrap
			transition-[max-w,margin,opacity] duration-500 ease-in-out
			${buttonCollapse ? 'ml-0 max-w-0 opacity-0' : `ml-1.5 max-w-[${locationBtnWidth}px] opacity-100`}
		`}
			>
				Locatie zoeken...
				<kbd
					hidden={!kbdVisible}
					class="
					bg-background-alt text-xxs
					pointer-events-none ml-1 flex inline
					items-center gap-1 rounded-sm border px-1 font-sans font-medium
					text-[#cce] shadow-[0px_2px_0px_0px_#cce] transition-[opacity] duration-200
					select-none dark:border-[rgba(0,_0,_0,_0.10)]
					dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]
					"><span class="text-foreground-alt text-[12px]">{isApplePlatform ? '⌘' : 'Ctrl '}K</span></kbd
				>
			</span>
		</button> -->
		<!-- <button
			onclick={flyToUserLocation}
			class={`
		group my-3 flex flex-shrink-0 cursor-pointer 
		items-center justify-center font-[500]
		shadow-[0_2px_2px_rgba(0,0,0,0.05)]
		outline-2 outline-[#33336622]
		transition-all duration-300

		${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg px-2.5 py-2'}

		${userLocationActive ? 'bg-[#f4a]' : 'bg-white'}
		hover:bg-[#eef]
	`}
		>
			<NavigationArrow
				class={`
		h-[22px] w-[22px] flex-shrink-0
		transition-colors duration-300
		${userLocationActive ? 'text-white' : 'text-[#f4a]'}
		group-hover:text-[#f4a]
	`}
			/>

			<span
				class={`
		overflow-hidden whitespace-nowrap
		transition-[max-width,margin,opacity,color] duration-500 ease-in-out
		${buttonCollapse ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 opacity-100'}

		${userLocationActive ? 'text-[#f4a]' : 'text-[#333]'}
		
	`}
			>
				{userLocationActive ? 'Mijn locatie niet meer tonen' : 'Mijn locatie tonen'}
			</span>
		</button> -->

		<br />
		<!-- <button
			onclick={() => (layersPanelVisible = !layersPanelVisible)}
			class={`
			group my-3 flex flex-shrink-0 cursor-pointer 
			items-center justify-center bg-white font-[500]
			shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
			outline-2 outline-[#33336622] 
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
			${buttonCollapse ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 opacity-100'}
		`}
			>
				Lagen
				<kbd
					hidden={!kbdVisible}
					class="bg-background-alt text-xxs pointer-events-none ml-1 flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium text-[#cce] shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
					><span class="text-foreground-alt text-[12px]">L</span></kbd
				>
			</span>
		</button> -->
		<!-- <button
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
			${buttonCollapse ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 opacity-100'}
		`}
			>
				Grid tonen
				<kbd
					hidden={!kbdVisible}
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
		</div> -->
	</div>
{/if}
