<script lang="ts">
	import { scale } from 'svelte/transition';

	const { year, x, maps, selectedYear, getHistoricMapThumbnail } = $props();
	const zRotations = maps.map((i) => (Math.random() - 0.5) * 10);

	const loaded = $state(new Set<string>());

	function preload(map) {
		const img = new Image();
		img.src = map.imageUrl;
		img.onload = () => loaded.add(map.id);
	}

	// $effect(() => {
	// 	for (const map of maps) preload(map);
	// });

	function yOffset(i: number, map: any) {
		return 60 - i * 2 + (map.yearStart % 2) * 1;
	}
</script>

{#each maps as map, i}
	<!-- {#if loaded.has(map.id)} -->
	<div
		class="absolute h-[42px] w-[42px] origin-bottom overflow-hidden bg-[rgb(243,238,218)] shadow-[0_6px_6px_rgba(0,0,0,0.1)]"
		style="
				left:{x - 25}px;
				top:{yOffset(i, map)}px;
				transform: rotateX(60deg) rotateZ({zRotations[i]}deg);
				z-index:{100 - yOffset(i, map)};
			"
	>
		{#if i == maps.length - 1}
			<img
				src={getHistoricMapThumbnail(map.id, 32)}
				alt={map.name}
				class="h-full w-full object-cover object-center"
			/>
		{/if}
	</div>
	<!-- {/if} -->
{/each}
