<script lang="ts">
	import { X } from 'phosphor-svelte';
	import { fade, fly } from 'svelte/transition';

	let { visible = $bindable(), title, children, opacity = 100 } = $props();

	function close() {
		visible = false;
	}

	function handleKey(e: KeyboardEvent) {
		if (!visible) return;
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={handleKey} />

{#if visible}
	<div
		class="fixed inset-0 z-1000 flex items-center justify-center"
		style:opacity={opacity + '%'}
		role="dialog"
		aria-modal="true"
	>
		<button
			type="button"
			class="absolute inset-0 cursor-default bg-[#333366aa] bg-[url('wave_pattern.png')] bg-size-[32px]"
			aria-label="Sluit venster"
			onclick={close}
			transition:fly={{ y: -5, duration: 250 }}
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

			{#if title}
				<h1 class="text-[22px] font-[700] text-[#336]">{title}</h1>
			{/if}

			<div class="mt-2 p-8 text-[#336]">
				{@render children?.()}
			</div>
		</div>
	</div>
{/if}
