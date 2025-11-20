<script lang="ts">
	import { fly } from 'svelte/transition';

	let { content = '' } = $props();

	let visible: boolean = $state(false);
	let timeout: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (content) {
			clearTimeout(timeout);
			visible = true;
			timeout = setTimeout(() => (visible = false), 1000);
		}
	})
</script>

{#if visible}
	<!-- {#key content} -->
		<div class="fixed bottom-42 left-1/2 -translate-x-1/2 bg-white text-center text-[#336] px-4 py-2 rounded-[8px] text-[16px] z-999 shadow-lg" transition:fly={{ y: 20, duration: 250 }}>
			{@html content}
		</div>
	<!-- {/key} -->
{/if}
