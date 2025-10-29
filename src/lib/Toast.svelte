<script lang="ts">
	import { fade } from 'svelte/transition';

	let { content = '', visible = $bindable(true) } = $props();
	let timeout: ReturnType<typeof setTimeout>;

	$effect(() => {
		// if (visible) {
		clearTimeout(timeout);
		timeout = setTimeout(() => (visible = false), 1000);
		// }
	});
</script>

{#if visible}
	<div transition:fade>
		{content}
	</div>
{/if}

<style>
	div {
		position: fixed;
		bottom: 200px;
		left: 50%;
		transform: translateX(-50%);
		background: #333366cc;
		color: #fff;
		padding: 10px 20px;
		border-radius: 4px;
		font-size: 16px;
		z-index: 10;
	}
</style>
