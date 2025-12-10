<script lang="ts">
	import {
		EyeClosed,
		ImagesSquare,
		MapTrifold,
		X,
		MapPin,
		CaretDown,
		Eye,
		Aperture,
		Mountains,
		Camera,
		EyeSlash
	} from 'phosphor-svelte';
	import { fly, fade, scale } from 'svelte/transition';
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';
	import Select from './Select.svelte';
	import Slider from './Slider.svelte';

	let { visible = $bindable(), layerOptions = $bindable() } = $props();

	let opacityUpdateInterval;
	let opacity = $state(layerOptions.historicMapsOpacity);
	$effect(() => {
		if (visible) {
			opacity = layerOptions.historicMapsOpacity;
			opacityUpdateInterval = setInterval(() => {
				layerOptions.historicMapsOpacity = opacity;
			}, 200);
		} else clearInterval(opacityUpdateInterval);
	});

	let sliderEl;
	let sliderPos = $state({ top: 0, left: 0, width: 0 });
	let backgroundVisible = $state(false);

	$effect(() => {
		if (visible) {
			setTimeout(() => {}, 250);
		}
	});

	function showBackground() {
		if (!sliderEl) return;

		backgroundVisible = true;
		const rect = sliderEl.getBoundingClientRect();
		sliderPos = {
			top: rect.top,
			left: rect.left,
			width: rect.width
		};

		document.addEventListener('pointerup', hideBackground);
	}

	function hideBackground() {
		backgroundVisible = false;
		document.removeEventListener('pointerup', hideBackground);
	}

	let baseMapOptions = [
		{ value: 'none', label: 'Geen achtergrond', icon: EyeSlash },
		{ value: 'protomaps', label: 'OpenStreetMap', icon: MapTrifold },
		{ value: 'satelliet', label: 'Sattelietbeeld', icon: Camera },
		{ value: 'ahn', label: 'Hoogtekaart (AHN)', icon: Mountains }
	];
</script>

<Modal bind:visible title="Lagen" opacity={backgroundVisible ? 0 : 100}>
	<p class="text-[12px] opacity-50">Achtergrondkaart</p>
	<Select
		Icon={MapTrifold}
		options={baseMapOptions}
		value={layerOptions.baseMap}
		onchange={(opt) => (layerOptions.baseMap = opt.value)}
	/>

	{#if layerOptions.baseMap === 'protomaps'}
		<div class="mt-4 max-w-60 text-[15px] font-[500] text-[#336]">
			<input
				type="checkbox"
				bind:checked={layerOptions.protoMapsWaterInFront}
				class="mr-2 accent-[#f4a]"
			/>
			Waterlagen vóór historische kaarten
			<kbd
				class="bg-background-alt text-xxs pointer-events-none ml-1 flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium text-[#cce] shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
				><span class="text-foreground-alt text-[12px]">W</span></kbd
			>
			<br />
			<input
				type="checkbox"
				bind:checked={layerOptions.protomapsLabelsInFront}
				class="mr-2 accent-[#f4a]"
			/>
			Plaatsnamen vóór historische kaarten
			<kbd
				class="bg-background-alt text-xxs pointer-events-none ml-1 flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium text-[#cce] shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
				><span class="text-foreground-alt text-[12px]">T</span></kbd
			>
		</div>
	{/if}

	<div onpointerdown={showBackground} bind:this={sliderEl}>
		<p class="mt-4 text-[12px] opacity-50">Zichtbaarheid waterstaatskaarten</p>
		<Slider
			value={opacity}
			onchange={(val) => {
				opacity = val;
			}}
		></Slider>
	</div>
</Modal>

{#if backgroundVisible}
	<div
		class="fixed z-1100 box-content -translate-x-4 -translate-y-4 rounded-[8px] bg-white p-4 shadow-lg"
		style="
			position: fixed;
			top: {sliderPos.top - 16}px;
			left: {sliderPos.left}px;
			width: {sliderPos.width}px;
		"
	>
		<p class="mt-4 text-[12px] text-[#558]">Zichtbaarheid waterstaatskaarten</p>
		<Slider value={opacity}></Slider>
	</div>
{/if}
