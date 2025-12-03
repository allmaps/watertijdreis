<script lang="ts">
	import { fly } from 'svelte/transition';

	let { content = '' } = $props();

	const VISIBLE_TIME = 2500; 
	let visible: boolean = $state(false);
	let timeout: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (content) {
			clearTimeout(timeout);
			visible = true;
			timeout = setTimeout(() => (visible = false), VISIBLE_TIME);
		}
	})
</script>

{#if visible}
	<!-- {#key content} -->
		<div 
			class="
			border-2 border-[#33336611] bg-[#3333aa22] font-[500] text-[14px]
			shadow-[0_2px_2px_rgba(0,0,0,0.05)] backdrop-blur-md
			px-4 py-2 fixed bottom-42 left-1/2 -translate-x-1/2 text-center text-[#336] rounded-[8px] z-999 shadow-lg" 
			transition:fly={{ y: 20, duration: 250 }}
		>
			{@html content}
		</div>
	<!-- {/key} -->
{/if}
