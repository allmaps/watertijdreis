<script lang="ts">
	import { scale } from 'svelte/transition';

	const { year, x, maps } = $props();

	const loaded = $state(new Set<string>());

	function preload(map) {
		const img = new Image();
		img.src = map.imageUrl;
		img.onload = () => loaded.add(map.id);
	}

	$effect(() => {
		for (const map of maps) preload(map);
	});

	function yOffset(i: number, map: any) {
		return 40 - i * 5 + (map.yearStart % 2) * 1;
	}
</script>

{#each maps as map, i}
	{#if loaded.has(map.id)}
		<div
			transition:scale
			class="absolute h-[42px] w-[42px] origin-bottom overflow-hidden"
			style="
				left:{x - 25}px;
				top:{yOffset(i, map)}px;
				transform: rotateX(60deg) rotateZ({(Math.random() - 0.5) * 10}deg);
				z-index:{100 - yOffset(i, map)};
			"
		>
			<img
				src={map.imageUrl}
				alt={map.name}
				class="h-full w-full object-cover object-center shadow-[0_6px_6px_rgba(0,0,0,0.1)]"
			/>
		</div>
	{/if}
{/each}
