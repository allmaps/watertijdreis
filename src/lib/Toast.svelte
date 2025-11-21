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
			class="bg-[#fff] px-4 py-3 fixed bottom-42 left-1/2 -translate-x-1/2 text-center text-[#336] rounded-[8px] text-[16px] z-999 shadow-lg" 
			transition:fly={{ y: 20, duration: 250 }}
		>
			{@html content}
		</div>
	<!-- {/key} -->
{/if}

<!-- <style>
	@property --angle {
		syntax: '<angle>';
		initial-value: 0deg;
		inherits: false;
	}

	@keyframes rotate-gradient {
		from { --angle: 0deg; }
		to   { --angle: 360deg; }
	}

	.rotating-border {
		background: linear-gradient(var(--angle), #fef, #fff);
		animation: rotate-gradient 5s linear infinite;
	}
</style> -->
