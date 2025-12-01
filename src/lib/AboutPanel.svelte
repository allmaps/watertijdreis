<script lang="ts">
	import { ImagesSquare, X } from 'phosphor-svelte';
	import { fly, fade } from 'svelte/transition';
	let { visible = $bindable() } = $props();
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key == 'Escape') visible = false;
	}}
/>

{#if visible}
	<div
		class="fixed top-0 left-0 z-1000 h-full w-full bg-[#33336688]"
		onclick={() => (visible = false)}
		transition:fade
	></div>
	<div
		class="
            fixed top-1/2 left-1/2
            z-1001 flex
            w-[90vw] max-w-120 -translate-x-1/2 -translate-y-1/2
            flex-col items-center overflow-auto rounded-[8px] border border-gray-200
            bg-white px-4 py-8 shadow-lg shadow-lg sm:px-6 md:px-8
        "
		transition:fly={{ y: -20, duration: 250 }}
	>
		<button
			onclick={() => (visible = false)}
			class="absolute top-4 right-4 cursor-pointer rounded-[8px] bg-[#ff44aa22] p-2 opacity-50 transition-opacity hover:opacity-100"
		>
			<X size="24" color="#f4a" weight="bold" class="opacity-67"></X>
		</button>

		<h1 class="text-[22px] font-[700] text-[#336]">Over Watertijdreis</h1>

		<div class="mt-2 p-8 text-[#336]">
			Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut
			labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco
			laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in
			voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat
			non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
		</div>
	</div>
{/if}
