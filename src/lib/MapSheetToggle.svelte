<script lang="ts">
	import { MapTrifold, FileText, PushPin } from 'phosphor-svelte';
	import Toast from './Toast.svelte';

	let {
		hoveredHistoricMap,
		clickedHistoricMap,
		selectedHistoricMap,
		setHistoricMapView,
		setGridVisibility,
		saveMapView,
		restoreView
	} = $props();

	let rightBtnSelected = $state(false);
	let leftBtnWidth = $state(86);
	let rightBtnWidth = $state(0);

	let pinnedHistoricMap = $state(null);
	let pinnedView = $state(null);

	function leftBtnClick() {
		rightBtnSelected = false;
		setGridVisibility(false);
		restoreView();
		if (pinnedHistoricMap) pinnedView = saveMapView();
	}

	function rightBtnClick() {
		rightBtnSelected = true;
		if (pinnedHistoricMap) {
			setHistoricMapView(pinnedHistoricMap, pinnedView);
		} else if (clickedHistoricMap && !selectedHistoricMap) {
			setHistoricMapView(clickedHistoricMap);
		}
	}

	$effect(() => {
		if (selectedHistoricMap) rightBtnSelected = true;
		else rightBtnSelected = false;
	});

	let toastMessage = $state('');
</script>

<div
	class="
        group fixed top-24 left-2 sm:left-5 z-1000 my-3 flex flex-shrink-0 cursor-pointer
        items-center justify-center rounded-[9px] border-2 border-[#33336611]
        bg-[#33336611] font-[500]
        text-[#336] shadow-[0_2px_2px_rgba(0,0,0,0.05)]
        backdrop-blur-md duration-500
    "
>
	<span
		class="absolute left-0 h-full w-1/2 rounded-[8px] bg-white shadow-md transition-[left,width] duration-300 ease-out"
		style:left={(!rightBtnSelected ? 0 : leftBtnWidth) + 'px'}
		style:width={(!rightBtnSelected ? leftBtnWidth : rightBtnWidth) + 'px'}
	></span>
	<button
		bind:clientWidth={leftBtnWidth}
		class="z-2 cursor-pointer rounded-[7px] px-3 py-1 transition-[background] duration-300"
		onclick={leftBtnClick}
	>
		<MapTrifold
			size="18"
			color={!rightBtnSelected ? '#f4a' : '#336'}
			class="relative -top-[2px] inline transition-[fill] duration-500"
		/>
		Kaart
	</button>
	<button
		bind:clientWidth={rightBtnWidth}
		class="z-2 max-w-50 cursor-pointer truncate rounded-[7px] px-3 py-1 transition-[background] duration-300"
		onclick={rightBtnClick}
	>
		<FileText
			size="18"
			color={rightBtnSelected ? '#f4a' : '#336'}
			class="relative -top-[2px] inline transition-[fill] duration-500"
		/>
		{#if pinnedHistoricMap}
			{pinnedHistoricMap.label}
			<span
				role="button"
				tabindex="0"
				class="cursor-pointer"
				onclick={(e) => {
					e.stopPropagation();
					pinnedHistoricMap = null;
				}}
			>
				<PushPin size="18" class="relative -top-[2px] ml-1 inline" weight="fill"></PushPin>
			</span>
		{:else if selectedHistoricMap}
			{selectedHistoricMap.label}
			<span
				role="button"
				tabindex="0"
				class="cursor-pointer"
				onclick={(e) => {
					e.stopPropagation();
					pinnedHistoricMap = selectedHistoricMap;
				}}
			>
				<PushPin size="18" class="relative -top-[2px] ml-1 inline" weight="regular"></PushPin>
			</span>
		{:else}
			{clickedHistoricMap ? clickedHistoricMap.label : 'Bladindex'}
		{/if}
	</button>
</div>

<Toast content={toastMessage}></Toast>
