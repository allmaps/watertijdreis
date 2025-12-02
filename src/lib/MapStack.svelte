<script lang="ts">
	import { flip } from 'svelte/animate';
	import { fade, fly, scale } from 'svelte/transition';

	type HistoricMap = { id: string; year: number; thumbnailUrl: string };

	let { maps, x, pixelsPerYear, mapsInViewport, getHistoricMapThumbnail, selectedYear } = $props<{
		maps: HistoricMap[];
		x: number;
		pixelsPerYear: number;
		mapsInViewport: Map<string, HistoricMap>;
	}>();

	function rand(range = 10) {
		return Math.round((Math.random() - 0.5) * range);
	}

	const mapWidth = 40;
	const mapImages = maps.map((i) => getHistoricMapThumbnail(i.id, 64));
	const mapRotations = maps.map((i) => rand());
	const mapColors = maps.map((i) => `hsl(${44}deg,${46 + rand()}%,${80 + rand()}%)`);
	const Z_DEPTH = 2;

	const containerStyle = $derived(`
        transform: 
            translateX(${x - mapWidth / 2}px) 
            translateY(${80}px)
            rotateX(60deg);
        transform-style: preserve-3d;
    `);
</script>

<div class="absolute" style={containerStyle}>
	{#each maps as map, index (map.id)}
		<!-- {@const isVisible = visibleMapIds.has(map.id)} -->
		{@const isVisible = true}

		<div
			class="absolute h-10 w-10 origin-bottom shadow-[0_6px_6px_rgba(0,0,0,0.1)]"
			style:background-color={mapColors[index]}
			style="
                transform: 
                    translateZ({index * Z_DEPTH}px)
                    rotateZ({mapRotations[index]}deg);
                transition: opacity 0.5s;
            "
			transition:scale={{ duration: 200 }}
		>
			{#if selectedYear + 0.5 > map.yearEnd}
				<img src={mapImages[index]} alt="" class="h-full w-full object-cover object-center" />
			{/if}
		</div>
	{/each}
</div>
