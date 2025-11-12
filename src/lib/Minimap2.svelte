<script lang="ts">
	import * as turf from '@turf/turf';
	import { ArrowUUpLeft, Binoculars, MouseLeftClick } from 'phosphor-svelte';
	import { fly, scale, fade } from 'svelte/transition';

	let { visibleHistoricMaps, viewportPolygon, selectedHistoricMap, historicMapsLoaded } = $props();

	let gridVisible = $state(false);

	let polygons = $derived.by(() => {
		if (!historicMapsLoaded) return [];
		return visibleHistoricMaps
			.values()
			.toArray()
			.map((i) => ({
				type: 'Feature',
				geometry: turf.toMercator(structuredClone(i.polygon)),
				properties: {
					id: i.id
				}
			}));
	});

	let width: number = $state(160);
	let height: number = $state(200);

	let viewBox = $derived.by(() => {
		const bbox = turf.bbox({
			type: 'FeatureCollection',
			features: polygons
		});

		const viewWidth = bbox[2] - bbox[0];
		const viewHeight = bbox[3] - bbox[1];
		const paddingX = viewWidth * 0.05;
		const paddingY = viewHeight * 0.05;

		return [
			bbox[0] - paddingX,
			bbox[1] - paddingY,
			viewWidth + paddingX * 2,
			viewHeight + paddingY * 2
		];
	});

	let viewport = $derived.by(() => {
		if (!viewportPolygon) return;
		return turf.toMercator(viewportPolygon);
	});

	function getProjectedPoints(coordinates: [number, number][]): string {
		return coordinates.map((coord) => coord.join(',')).join(' ');
	}

	function getClippedProjectedPoints(coordinates: [number, number][]): string {
		const minX = viewBox[0] + viewBox[2] / width;
		const minY = viewBox[1] + viewBox[2] / width;
		const maxX = viewBox[0] + viewBox[2] - 2 * (viewBox[2] / width);
		const maxY = viewBox[1] + viewBox[3] - 2 * (viewBox[2] / width);

		return coordinates
			.map((coords) => [
				Math.min(Math.max(coords[0], minX), maxX),
				Math.min(Math.max(coords[1], minY), maxY)
			])
			.map((coord) => coord.join(','))
			.join(' ');
	}
</script>

{#if visibleHistoricMaps.size}
	<svg {width} {height} viewBox={viewBox.join(' ')} class="absolute top-5 right-8">
		<g transform="scale(1, -1) translate(0, -{viewBox[1] * 2 + viewBox[3]})">
			{#each polygons as poly}
				{@const selected = selectedHistoricMap && poly.properties.id == selectedHistoricMap.id}
				<polygon
					points={getProjectedPoints(poly.geometry.coordinates[0])}
					fill={selected ? '#ff44aa' : '#ff44aa11'}
					stroke="#ff44aa"
					stroke-width={(viewBox[2] / width) * 1.33}
				/>
			{/each}
			{#if viewport && !selectedHistoricMap}
				<polygon
					transition:fade
					points={getClippedProjectedPoints(viewport.geometry.coordinates[0])}
					fill="none"
					stroke="#33336688"
					stroke-width={viewBox[2] / width}
				/>
			{/if}
		</g>
	</svg>
{/if}

{#if selectedHistoricMap}
	<div id="button-container" class="absolute top-55 right-10 text-[14px]" transition:fade>
		<button>
			<ArrowUUpLeft size="20" class="inline"></ArrowUUpLeft>
			Blad sluiten
			<kbd
				class="bg-background-alt text-xxs pointer-events-none flex inline h-4 items-center gap-1 rounded-sm border px-1 font-sans font-medium opacity-33 shadow-[0px_2px_0px_0px_#59595b] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
				><span class="text-foreground-alt text-[10px]">Esc</span></kbd
			>
		</button>
	</div>
{:else if gridVisible}
	<div id="button-container" class="absolute top-55 right-10 text-[14px]" transition:fade>
		<button>
			<Binoculars size="20" class="inline"></Binoculars>
			Blad bekijken
			<MouseLeftClick size="20" class="inline"></MouseLeftClick>
		</button>
	</div>
{:else}
	<div id="button-container" class="absolute top-55 right-10 text-[14px]" transition:fade>
		<button>
			<Binoculars size="20" class="inline"></Binoculars>
			Bladen ontdekken
			<kbd
				class="bg-background-alt text-xxs pointer-events-none flex inline h-4 items-center gap-1 rounded-sm border px-1 font-sans font-medium opacity-33 shadow-[0px_2px_0px_0px_#59595b] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
				><span class="text-foreground-alt text-[10px]">Spatie</span></kbd
			>
		</button>
	</div>
{/if}

<svelte:window
	onkeydown={(e) => {
		if (e.key == ' ') gridVisible = true;
	}}
	onkeyup={(e) => {
		if (e.key == ' ') gridVisible = false;
	}}
/>

<style>
	#button-container {
		background: #fff;
		border: 2px solid rgb(255, 234, 246);
		border-radius: 8px;
		display: inline-flex;
		margin: 0 5px;
		margin-top: 18px;
		box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);
		overflow: hidden;
		flex-shrink: 0;
	}

	#button-container button {
		margin: 0;
		padding: 8px 10px;
		border-left: 1px solid var(--foreground-highlight);
		cursor: pointer;
	}

	#button-container button:hover {
		background: var(--inactive-tab-color);
		/* color: #2222ff; */
	}
</style>
