<script lang="ts">
	import { X } from 'phosphor-svelte';
	import { fade, fly } from 'svelte/transition';

	let { visible = $bindable() } = $props();

	function close() {
		visible = false;
	}

	function handleKey(e: KeyboardEvent) {
		if (!visible) return;
		if (e.key === "Escape") close();
	}
</script>

<svelte:window onkeydown={handleKey} />

{#if visible}
	<div
		class="fixed inset-0 z-1000 flex items-center justify-center"
		role="dialog"
		aria-modal="true"
		transition:fade
	>
		<button
			type="button"
			class="absolute inset-0 bg-[#33336688] cursor-default"
			aria-label="Sluit venster"
			onclick={close}
		></button>

		<div
			class="
				relative z-10 flex
				w-[90vw] max-w-120
				flex-col items-center overflow-auto rounded-[8px]
				border border-gray-200 bg-white px-4 py-8 shadow-lg
			"
			transition:fly={{ y: -20, duration: 250 }}
		>
			<button
				onclick={close}
				type="button"
				class="absolute top-4 right-4 rounded-[8px] bg-[#ff44aa22] p-2 opacity-50 transition-opacity hover:opacity-100"
				aria-label="Sluit venster"
			>
				<X size="24" color="#f4a" weight="bold" />
			</button>

			<h1 class="text-[22px] font-[700] text-[#336]">Over Watertijdreis</h1>

			<div class="mt-2 p-8 text-[#336]">
				Lorem ipsum dolor sit amet…
			</div>
		</div>
	</div>
{/if}