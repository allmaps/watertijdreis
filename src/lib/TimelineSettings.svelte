<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { Gear } from 'phosphor-svelte';

	let showSettings = false;

	function toggleSettings() {
		showSettings = !showSettings;
	}

	function handleWindowClick() {
		showSettings = false;
	}
</script>

<svelte:window onclick={handleWindowClick} />

<div class="pointer-events-auto absolute top-2 right-2 z-[50000] select-none">
	<button
		onclick={(e) => {
			e.stopPropagation();
			toggleSettings();
		}}
		title="Instellingen"
		class="
			flex h-8 w-8 cursor-pointer items-center justify-center
			rounded-full bg-[#eef] text-[#444]
			shadow-md transition-all
			hover:scale-105 hover:shadow-lg
            active:scale-95
		"
	>
		<Gear size={18} />
	</button>

	{#if showSettings}
		<div
			id="settings-menu"
			class="absolute w-80 rounded-lg border border-gray-200 bg-white px-3 py-3 shadow-lg transition-all duration-200"
			style="right: 3.0rem; top: -130px;"
			onclick={(e) => e.stopPropagation()}
		>
			<slot />
		</div>
	{/if}
</div>
