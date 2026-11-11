<script lang="ts">
	import type { AhnMapLayer } from "$lib/map/AhnMapLayer.svelte";
	import AhnGradientEditor from "./AhnGradientEditor.svelte";

	let { layer }: { layer: AhnMapLayer } = $props();
</script>

<div class="flex flex-col gap-3 border-t border-white/10 pt-3 text-xs">
	<p class="text-white/60">
		AHN-maaiveld ·
		<a
			class="underline hover:text-white"
			href="https://www.pdok.nl/introductie/-/article/actueel-hoogtebestand-nederland-ahn"
			target="_blank"
			rel="noreferrer">PDOK</a
		>
		· m NAP
	</p>

	<label class="flex cursor-pointer items-center gap-2">
		<input type="checkbox" class="accent-wtr-pink" bind:checked={layer.grayscale} />
		Historische kaarten eronder zwart-wit
	</label>

	{#if layer.error}
		<p role="status" class="text-red-300">{layer.error}</p>
	{/if}

	{#if layer.scale}
		<AhnGradientEditor scale={layer.scale} stops={layer.stops} onchange={(stops) => (layer.stops = stops)} />
	{:else}
		<p class="text-white/50">Nog geen hoogtemetingen in beeld.</p>
	{/if}
</div>
