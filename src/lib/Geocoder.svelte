<script lang="ts">
	import { MagnifyingGlass } from 'phosphor-svelte';
	import { throttle } from 'lodash-es';
	import type { GeocoderProvider } from '$lib/geocoder/provider';
	import type { GeojsonPoint } from '@allmaps/types';

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

	let { providers } = $props();

	let inputEl: HTMLElement;
	let inputValue = $state('');
	let featuresByProviderIndex: GeocoderGeoJsonFeature[][] = $state([[]]);
	let features: GeocoderGeoJsonFeature[] = $derived(featuresByProviderIndex.flat(1));
	let featuresItems: Item<GeocoderGeoJsonFeature>[] = $derived(
		features.map((feature) => ({
			value: feature,
			label: feature.properties.label
		}))
	);
	let selectedFeature: GeocoderGeoJsonFeature | undefined;

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
</script>

<input
	bind:this={inputEl}
	bind:value={inputValue}
	class="focus:ring-pink absolute top-8 left-20 h-9 rounded-lg border border-gray-200 bg-white pr-2 pl-10 text-sm focus:z-10 focus:ring-2 focus:outline-none"
	type="search"
	spellcheck="false"
	autocomplete="off"
	autofocus
	placeholder="Zoek een locatie..."
/>

{#if inputValue !== ''}
	<ul
		class="absolute top-20 left-20 z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white py-1 shadow-md"
		transition:fade
	>
		{#if features.length > 0}
			{#each features as feature, i}
				<li
					class="flex h-10 w-full cursor-pointer items-center justify-between truncate rounded px-3 text-sm capitalize hover:bg-gray-100"
				>
					<div>
						{feature.properties.label}
						{#if feature.properties.alt}
							<span class="text-gray-500 before:mx-1 before:content-['〜']">
								{feature.properties.alt}
							</span>
						{/if}
					</div>
					{#if feature.properties.provider === 'World Historical Gazetteer' && feature.properties.index_id}
						<a
							href="https://whgazetteer.org/places/{feature.properties.index_id}/portal/"
							target="_blank"
							class="rounded-lg bg-gray-200 px-2 py-0.5 text-xs text-gray-700 uppercase"
							on:click|stopPropagation>whg</a
						>
					{/if}
				</li>
			{/each}
		{:else}
			<li class="flex h-10 items-center px-3 text-sm text-gray-400">No results found</li>
		{/if}
	</ul>
{/if}

<!-- <Combobox.Root
	type="single"
	bind:value={inputValue}
	loop
	onSelectedChange={(itemFeature) => {
		selectedFeature = itemFeature?.value;
	}}
	items={featuresItems}
>
	<div class="relative w-full">
		<MagnifyingGlass size="18"></MagnifyingGlass>
		<Combobox.Input
			class="focus:ring-pink h-9 w-full truncate rounded-lg border border-gray-200 bg-white pr-2
        pl-10 text-sm
        focus:z-10 focus:ring-2 focus:outline-none"
			placeholder="Search location"
			aria-label="Search location"
			spellcheck="false"
			autocomplete="off"
			type="search"
			autofocus
		/>
	</div>

	{#if inputValue !== ''}
		<Combobox.Content
			class="w-full rounded-xl border border-gray-200 bg-white px-1 py-2 shadow-md outline-none"
			sideOffset={8}
		>
			{#each features as feature}
				<Combobox.Item
					class="flex h-10 w-full items-center justify-between truncate rounded px-2 py-2 text-sm capitalize outline-none select-none data-[highlighted]:bg-gray-100"
					value={feature}
					label={feature.properties.label}
				>
					<div>
						{feature.properties.label}
						{#if feature.properties.alt}
							<span class="text-gray before:mr-1 before:ml-1 before:content-['〜']"
								>{feature.properties.alt}</span
							>
						{/if}
					</div>
					<div>
						{#if feature.properties.provider === 'World Historical Gazetteer' && 'index_id' in feature.properties}
							<a
								href="https://whgazetteer.org/places/{feature.properties.index_id}/portal/"
								class="rounded-lg bg-gray-200 px-2 py-0.5 text-xs text-white uppercase">whg</a
							>
						{/if}
					</div>
				</Combobox.Item>
			{:else}
				<span class="flex items-center h-10 px-2 py-2 text-sm text-muted-foreground text-gray">
					No results found
				</span>
			{/each}
		</Combobox.Content>
	{/if}
</Combobox.Root> -->
