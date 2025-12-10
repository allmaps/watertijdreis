<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();

	let i = 0;

	onMount(() => {
		const icons = ['waves.png', 'waves_flipped.png'];

		setInterval(() => {
			const link = document.querySelector("link[rel='icon']");
			if (link) {
				link.href = icons[i % icons.length]; //+ '?v=' + Date.now();
				i++;
			}
		}, 1000);
	});
</script>

{@render children()}
