<script lang="ts">
	import { EyeClosed, ImagesSquare, MapTrifold, X, MapPin, CaretDown } from 'phosphor-svelte';
	import { fly, fade } from 'svelte/transition';

	let { visible = $bindable(), layerOptions = $bindable() } = $props();

	if (layerOptions) {
		if (layerOptions.historicMap === undefined || layerOptions.historicMap === null) {
			layerOptions.historicMap = 'm';
		}
		if (
			layerOptions.historicMapsOpacity === undefined ||
			layerOptions.historicMapsOpacity === null
		) {
			layerOptions.historicMapsOpacity = 100;
		}

		if (layerOptions.overlayMap === undefined || layerOptions.overlayMap === null) {
			layerOptions.overlayMap = 'none';
		}
	}

	const baseMapOptions = [
		{ label: 'Geen', value: 'none', icon: EyeClosed },
		{ label: 'Basis achtergrondkaart', value: 'protomaps', icon: MapTrifold },
		{ label: 'AHN', value: 'ahn', icon: MapPin },
		{ label: 'Luchtfoto Actueel Ortho 25cm RGB', value: 'satelliet', icon: ImagesSquare }
	];

	const historicMapOptions = [
		{ label: 'Waterstaatskaarten', value: 'm', icon: ImagesSquare },
		{ label: 'Geen', value: 'none', icon: EyeClosed }
	];

	const overlayMapOptions = [
		{ label: 'Geen', value: 'none', icon: EyeClosed },
		{ label: 'Hydrologische Waarnemingspunten', value: 'km', icon: MapPin },
		{ label: 'Watervoorzieningseenheden', value: 'ft', icon: MapPin },
		{ label: 'Achterkant', value: 'mi', icon: MapTrifold }
	];

	let openDropdown: null | 'baseMap' | 'historicMap' | 'overlayMap' = $state(null);

	function selectOption(type: string, value: string) {
		if (type === 'baseMap') layerOptions.baseMap = value;
		if (type === 'historicMap') layerOptions.historicMap = value;
		if (type === 'overlayMap') layerOptions.overlayMap = value;
		openDropdown = null;
	}

	function getSelectedIcon(type: string) {
		if (type === 'baseMap')
			return baseMapOptions.find((o) => o.value === layerOptions.baseMap)?.icon;
		if (type === 'historicMap')
			return historicMapOptions.find((o) => o.value === layerOptions.historicMap)?.icon;
		if (type === 'overlayMap')
			return overlayMapOptions.find((o) => o.value === layerOptions.overlayMap)?.icon;
	}
</script>

{#if visible}
	<div
		class="fixed top-0 left-0 z-1000 h-full w-full bg-[#33336688]"
		onclick={() => (visible = false)}
		transition:fade
	></div>

	<div
		class="absolute top-20 left-1/2 z-1001 flex -translate-x-1/2 flex-col items-center overflow-visible rounded-[8px] border-gray-200 bg-white p-6 shadow-lg"
		transition:fly={{ y: -20, duration: 250 }}
	>
		<button
			onclick={() => (visible = false)}
			class="absolute top-4 right-4 cursor-pointer rounded-[8px] bg-[#ff44aa22] p-2 opacity-50 transition-opacity hover:opacity-100"
		>
			<X size="24" color="#f4a" weight="bold" class="opacity-67"></X>
		</button>

		<h1 class="text-[22px] font-[700] text-[#336]">Lagen</h1>

		<div class="relative mt-4 w-60">
			<label class="text-[12px] opacity-50">Achtergrondkaart</label>
			<button
				class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-[8px] border-2 border-[#33336611] bg-white px-3 py-2 shadow-sm hover:bg-[#eef]"
				onclick={() => (openDropdown = openDropdown === 'baseMap' ? null : 'baseMap')}
			>
				<div class="flex items-center gap-2">
					<svelte:component this={getSelectedIcon('baseMap')} size={18} color="#f4a" />
					<span>{baseMapOptions.find((o) => o.value === layerOptions.baseMap)?.label}</span>
				</div>
				<span class="text-gray-400"><CaretDown></CaretDown></span>
			</button>

			{#if openDropdown === 'baseMap'}
				<ul
					class="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-[8px] border-2 border-[#33336611] bg-white shadow-lg"
				>
					{#each baseMapOptions as option}
						<li
							class="cursor-pointer px-3 py-2 hover:bg-[#eef]"
							onclick={() => selectOption('baseMap', option.value)}
						>
							{option.label}
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		{#if layerOptions.baseMap == 'protomaps'}
			<div class="mt-4 text-[14px] font-[500] text-[#336]">
				<input
					type="checkbox"
					bind:checked={layerOptions.protoMapsWaterInFront}
					id="water-in-front-checkbox"
					class="mr-2 accent-[#f4a]"
				/>
				Waterlagen vóór historische kaarten
				<kbd
					class="bg-background-alt text-xxs pointer-events-none ml-1 flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium text-[#cce] shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
					><span class="text-foreground-alt text-[12px]">W</span></kbd
				>
			</div>
			<div class="mt-4 text-[14px] font-[500] text-[#336]">
				<input
					type="checkbox"
					bind:checked={layerOptions.protomapsLabelsInFront}
					id="labels-in-front-checkbox"
					class="mr-2 accent-[#f4a]"
				/>
				Plaatsnamen vóór historische kaarten
				<kbd
					class="bg-background-alt text-xxs pointer-events-none ml-1 flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium text-[#cce] shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
					><span class="text-foreground-alt text-[12px]">T</span></kbd
				>
			</div>
		{/if} <br />

		<div class="relative mt-4 w-60">
			<label class="text-[12px] opacity-50">Historische kaarten</label>
			<button
				class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-[8px] border-2 border-[#33336611] bg-white px-3 py-2 shadow-sm hover:bg-[#eef]"
				onclick={() => (openDropdown = openDropdown === 'historicMap' ? null : 'historicMap')}
			>
				<div class="flex items-center gap-2">
					<svelte:component this={getSelectedIcon('historicMap')} size={18} color="#f4a" />
					<span>{historicMapOptions.find((o) => o.value === layerOptions.historicMap)?.label}</span>
				</div>
				<span class="text-gray-400"><CaretDown></CaretDown></span>
			</button>

			{#if openDropdown === 'historicMap'}
				<ul
					class="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-[8px] border-2 border-[#33336611] bg-white shadow-lg"
				>
					{#each historicMapOptions as option}
						<li
							class="cursor-pointer px-3 py-2 hover:bg-[#eef]"
							onclick={() => selectOption('historicMap', option.value)}
						>
							{option.label}
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<label for="historic-maps-opacity-slider">Doorzichtigheid</label>
		<input
			name="historic-maps-opacity-slider"
			class="w-1/2 cursor-pointer accent-[#f4a]"
			type="range"
			min="0"
			max="100"
			bind:value={layerOptions.historicMapsOpacity}
		/> <span class="text-[14px] font-[500] text-[#336]">{layerOptions.historicMapsOpacity}%</span>
		<br />

		<div class="relative mt-4 mb-4 w-60">
			<label class="text-[12px] opacity-50">Overleg-kaart</label>
			<button
				class="flex w-full cursor-pointer items-center justify-between gap-2 rounded-[8px] border-2 border-[#33336611] bg-white px-3 py-2 shadow-sm hover:bg-[#eef]"
				onclick={() => (openDropdown = openDropdown === 'overlayMap' ? null : 'overlayMap')}
			>
				<div class="flex items-center gap-2">
					<svelte:component this={getSelectedIcon('overlayMap')} size={18} color="#f4a" />
					<span>{overlayMapOptions.find((o) => o.value === layerOptions.overlayMap)?.label}</span>
				</div>
				<span class="text-gray-400"><CaretDown></CaretDown></span>
			</button>

			{#if openDropdown === 'overlayMap'}
				<ul
					class="absolute z-50 mt-1 max-h-40 w-full overflow-auto rounded-[8px] border-2 border-[#33336611] bg-white shadow-lg"
				>
					{#each overlayMapOptions as option}
						<li
							class="cursor-pointer px-3 py-2 hover:bg-[#eef]"
							onclick={() => selectOption('overlayMap', option.value)}
						>
							{option.label}
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}

<style>
	ul::-webkit-scrollbar {
		width: 6px;
	}
	ul::-webkit-scrollbar-thumb {
		background-color: #f4a;
		border-radius: 3px;
	}
</style>
