<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { UmamiAnalytics, trackPageView } from '@lukulent/svelte-umami';
	import { env } from '$env/dynamic/public';

	let { children } = $props();

	const websiteID = env.PUBLIC_UMAMI_WEBSITE_ID;
	const srcURL = env.PUBLIC_UMAMI_SRC;

	let i = 0;

	onMount(() => {
		trackPageView();
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

{#if websiteID && srcURL}
	<UmamiAnalytics
		{websiteID}
		{srcURL}
		configuration={{
			'data-auto-track': false
		}}
	/>
{/if}
