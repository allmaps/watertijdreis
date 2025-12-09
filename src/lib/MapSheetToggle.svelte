<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { MapTrifold, FileText, PushPin } from 'phosphor-svelte';
	import Toast from './Toast.svelte';

	let {
		hoveredHistoricMap,
		clickedHistoricMap,
		selectedHistoricMap,
		setHistoricMapView,
		setSheetIndexVisibility,
		extendClickedMapTimeout,
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
		setSheetIndexVisibility(false);
		restoreView();
		if (pinnedHistoricMap) pinnedView = saveMapView();
	}

	function rightBtnClick() {
		rightBtnSelected = true;
		if (pinnedHistoricMap && !selectedHistoricMap) {
			extendClickedMapTimeout();
			setHistoricMapView(pinnedHistoricMap, pinnedView);
		} else if (clickedHistoricMap && !selectedHistoricMap) {
			extendClickedMapTimeout();
			setHistoricMapView(clickedHistoricMap);
		} else {
			setSheetIndexVisibility(true);
		}
	}

	$effect(() => {
		if (selectedHistoricMap) rightBtnSelected = true;
		else rightBtnSelected = false;
	});

	let toastMessage = $state('');

	let spaceKeyDown = $state(false);
	let keyboardShortcutVisible = $state(true);

	setTimeout(() => {
		keyboardShortcutVisible = false;
	}, 2000);

	function slideFade(node, params) {
		const s = slide(node, params);
		const f = fade(node, params);

		return {
			duration: Math.max(s.duration, f.duration),
			delay: Math.min(s.delay, f.delay),
			css: (t) => `
				${s.css ? s.css(t) + ';' : ''}
				${f.css ? f.css(t) + ';' : ''}
			`
		};
	}
</script>

<svelte:document
	onkeydown={(e) => {
		if (e.key == ' ' && !spaceKeyDown) {
			rightBtnClick();
		}
		if (e.key == 'Escape' && selectedHistoricMap) restoreView();
	}}
	onkeyup={(e) => {
		if (e.key == ' ') {
			leftBtnClick();
		}
	}}
/>

<div
	class="
        group fixed top-21 left-2 z-1000 my-3 flex flex-shrink-0 cursor-pointer items-center justify-center
        rounded-[9px] border-2 border-[#33336611] bg-[#33336611] font-[500]
        text-[#336] shadow-[0_2px_2px_rgba(0,0,0,0.05)]
        backdrop-blur-md duration-500
        sm:top-24 sm:left-5
    "
>
	<span
		class="absolute left-0 h-full w-1/2 rounded-[8px] bg-white shadow-md transition-[left,width] duration-300 ease-out"
		style:left={(!rightBtnSelected ? 0 : leftBtnWidth) + 'px'}
		style:width={(!rightBtnSelected ? leftBtnWidth : rightBtnWidth) + 'px'}
	></span>
	<button
		bind:clientWidth={leftBtnWidth}
		class="z-2 flex cursor-pointer items-center gap-1 rounded-[7px] px-3 py-1.5 transition-[background] duration-300"
		onclick={leftBtnClick}
		tabindex="3"
	>
		<MapTrifold
			size="18"
			color={!rightBtnSelected ? '#f4a' : '#336'}
			class="shrink-0 transition-[fill] duration-500"
		/>
		Kaart
	</button>
	<button
		bind:clientWidth={rightBtnWidth}
		class="z-2 flex max-w-50 cursor-pointer items-center gap-1 rounded-[7px] px-3 py-1.5 transition-[background] duration-300"
		onclick={rightBtnClick}
		tabindex="4"
	>
		<FileText
			size="18"
			color={rightBtnSelected ? '#f4a' : '#336'}
			class="shrink-0 transition-[fill] duration-500"
		/>
		{#if pinnedHistoricMap}
			<span class="truncate">{pinnedHistoricMap.label}</span>
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
			<span class="truncate">{selectedHistoricMap.label}</span>
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
			<span class="truncate">
				{clickedHistoricMap ? clickedHistoricMap.label : 'Bladindex'}
			</span>

			{#if keyboardShortcutVisible}
				<kbd
					class="
					ml-1 flex inline items-center rounded-[4px] border border-[#eef] bg-white
					px-1 font-sans text-[12px] text-[#cce]
					shadow-[0px_2px_0px_0px_#cce] select-none
					"
					transition:slideFade={{ axis: 'x', duration: 300 }}
				>
					<span>Spatie</span>
				</kbd>
			{/if}
		{/if}
	</button>
</div>

<Toast content={toastMessage}></Toast>
