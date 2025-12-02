<script lang="ts">
	import {
		ArrowBendDownLeft,
		ArrowElbowDownLeft,
		ArrowUDownLeft,
		MagnifyingGlass,
		MapPinSimple
	} from 'phosphor-svelte';
	import { throttle } from 'lodash-es';
	import type { GeocoderProvider } from '$lib/geocoder/provider';
	import type { GeojsonPoint } from '@allmaps/types';
	import { fade, scale, slide, fly } from 'svelte/transition';

	type Item<T> = {
		value: T;
		label?: string;
	};

	type GeocoderGeoJsonFeature = {
		geometry: GeojsonPoint;
		properties: {
			provider: string;
			label: string;
			alt?: string;
		};
	};

	let { providers, visible = $bindable(), flyToFeature } = $props();

	let inputEl: HTMLElement;
	let inputValue = $state('');
	let featuresByProviderIndex: GeocoderGeoJsonFeature[][] = $state([[]]);
	let features: GeocoderGeoJsonFeature[] = $derived(featuresByProviderIndex.flat(1));
	let selectedFeature: number = $state(0);

	const THROTTLE_WAIT_MS = 200;
	const THROTTLE_OPTIONS = {
		leading: true,
		trailing: true
	};

	const throttledGetFeatures = throttle(getFeatures, THROTTLE_WAIT_MS, THROTTLE_OPTIONS);

	$effect(() => {
		throttledGetFeatures(inputValue);
	});

	function getFeatures(text: string): void {
		selectedFeature = 0;
		for (let [index, provider] of providers.entries()) {
			provider.getFeatures(text).then((features) => {
				featuresByProviderIndex[index] = features.slice(0, 5).map((feature) => ({
					...feature,
					properties: {
						...feature.properties,
						provider: provider.name
					}
				}));
			});
		}
	}

	$effect(() => {
		if (visible) inputEl.focus();
		else inputValue = '';
	});
</script>

{#if visible}
	<div
		class="fixed top-0 left-0 z-1000 h-full w-full bg-[#33336688]"
		onclick={() => (visible = false)}
		transition:fade
	></div>
	<div
		class="
			fixed top-1/4 left-1/2 z-1001
			w-[90vw] max-w-120 -translate-x-1/2
			overflow-hidden rounded-[8px] border-gray-200 bg-white shadow-lg"
		transition:fly={{ y: -20, duration: 250 }}
	>
		<div class="relative w-full">
			<input
				bind:this={inputEl}
				bind:value={inputValue}
				onkeydown={(e) => {
					e.stopPropagation();
					if (e.key == 'Escape') visible = false;
					else if (e.key == 'Enter' && features) {
						flyToFeature(features[selectedFeature]);
						visible = false;
					} else if (e.key == 'ArrowDown')
						selectedFeature = Math.min(++selectedFeature, features.length - 1);
					else if (e.key == 'ArrowUp') selectedFeature = Math.max(--selectedFeature, 0);
				}}
				class="w-full rounded-[16px] px-4 py-4 pr-2 pl-10 pl-14 text-[20px] font-[500] focus:z-10 focus:outline-none"
				type="search"
				spellcheck="false"
				autocomplete="off"
				autofocus
				placeholder="Zoek een locatie..."
			/>

			<div class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gray-400">
				<MagnifyingGlass size="24" color="#f4a"></MagnifyingGlass>
			</div>
		</div>

		{#if inputValue !== ''}
			<ul transition:slide class="relative top-full left-0 z-20 w-full overflow-hidden text-[#336]">
				{#if features.length > 0}
					{#each features as feature, i}
						<li
							class="flex cursor-pointer items-center justify-between px-4 py-3 text-[16px] font-[500] hover:bg-[#eef]"
							style:background={i == selectedFeature ? '#eef' : 'transparent'}
						>
							<!-- <MapPinSimple size="20" class="inline"></MapPinSimple> -->
							<div class="truncate">
								{feature.properties.label}
								{#if feature.properties.alt}
									<span class="text-gray-500 before:mx-1 before:content-['·']">
										{feature.properties.alt}
									</span>
								{/if}
							</div>

							{#if i == selectedFeature}
								<kbd
									class="bg-background-alt text-xxs pointer-events-none flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium opacity-50 shadow-[0px_2px_0px_0px_#59595b] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
								>
									<span class="text-foreground-alt text-[12px]">Enter</span>
									<ArrowElbowDownLeft size="16" class="inline"></ArrowElbowDownLeft>
								</kbd>
							{/if}
						</li>
					{/each}
				{:else}
					<li class="px-4 py-3 text-sm text-[#33336688]">Geen resultaten gevonden</li>
				{/if}
			</ul>
		{/if}
	</div>
{/if}
