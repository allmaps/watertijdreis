<script lang="ts">
	import * as turf from '@turf/turf';
	import { fly, scale } from 'svelte/transition';

	let { filteredHistoricMaps, viewportPolygon } = $props();

	let polygons = $derived.by(() =>
		filteredHistoricMaps
			.values()
			.toArray()
			.map((i) => turf.toMercator(i.polygon))
	);

	let width: number = $state(160);
	let height: number = $state(200);

	let viewBox: [number, number, number, number] = $state([0, 0, 160, 160]);

	let projectedPolygons = $state<GeoJSON.Feature<GeoJSON.Polygon>[]>([]);
	let projectedViewportPolygon = $state<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);
	let projectedPolygonsInViewport = $state<GeoJSON.Feature<GeoJSON.Polygon>[]>([]);

	let dynamicStrokeWidth = $state(1);

	$effect(() => {
		if (filteredHistoricMaps) {
			const mercatorPolygons: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
			for (const map of filteredHistoricMaps.values()) {
				const projected = turf.toMercator(map.polygon);
				projected.properties.id = map.id;
				mercatorPolygons.push(projected);
			}

			projectedPolygons = mercatorPolygons;

			const bbox = turf.bbox({
				type: 'FeatureCollection',
				features: mercatorPolygons
			});

			const viewWidth = bbox[2] - bbox[0];
			const viewHeight = bbox[3] - bbox[1];
			const paddingX = viewWidth * 0.05;
			const paddingY = viewHeight * 0.05;

			viewBox = [
				bbox[0] - paddingX,
				bbox[1] - paddingY,
				viewWidth + paddingX * 2,
				viewHeight + paddingY * 2
			];

			const scale = (viewWidth + paddingX * 2) / width;
			dynamicStrokeWidth = scale * 1;
		}
	});

	$effect(() => {
		if (viewportPolygon) {
			const viewportCopy = JSON.parse(JSON.stringify(viewport));
			projectedViewportPolygon = turf.toMercator(viewportCopy) as GeoJSON.Feature<GeoJSON.Polygon>;
			// projectedPolygonsInViewport = projectedPolygons.filter((poly) => {
			// 	return turf.booleanIntersects(poly, projectedViewportPolygon);
			// });
		} else {
			projectedViewportPolygon = null;
		}
	});

	function getProjectedPoints(coordinates: [number, number][]): string {
		return coordinates.map((coord) => coord.join(',')).join(' ');
	}
</script>

<!-- <svg {width} {height} viewBox={viewBox.join(' ')} class="absolute top-10 right-15">
	<g transform="scale(1, -1) translate(0, -{viewBox[1] * 2 + viewBox[3]})"> -->
<!-- {#each projectedPolygons.filter( (p) => mapViewer.historicMapsInViewport.has(p.properties.id) ) as poly}
			<polygon points={getProjectedPoints(poly.geometry.coordinates[0])} fill="#ff44aa33" />
		{/each} -->

<!-- {#each projectedPolygons as poly (poly.properties.id)}
			<polygon
				points={getProjectedPoints(poly.geometry.coordinates[0])}
				fill="#ff44aa11"
				stroke="#f4a"
				stroke-width={dynamicStrokeWidth}
			/>
		{/each} -->

<!-- {#if projectedViewportPolygon}
			<polygon
				points={getProjectedPoints(projectedViewportPolygon.geometry.coordinates[0])}
				fill="none"
				stroke="#336"
				stroke-width={dynamicStrokeWidth * 2}
			/>
		{/if}

		{#if mapViewer && mapViewer.historicMapSelected}
			{@const selectedPolygon = projectedPolygons.find(
				(p) => p.properties.id == mapViewer.historicMapSelected.id
			)}

			{@const centerPoint = selectedPolygon
				? turf.centerOfMass(selectedPolygon).geometry.coordinates
				: [0, 0]}

			{@const endX = viewBox[0] + viewBox[2] / 2}
			{@const endY = viewBox[1]}

			<line
				x1={centerPoint[0]}
				y1={centerPoint[1]}
				x2={endX}
				y2={endY}
				stroke="#336"
				stroke-width={dynamicStrokeWidth * 2}
			/>
		{/if} -->
<!-- </g>
</svg> -->

<!-- <div
	onmousedown={() => mapViewer.setGridVisibility(true)}
	class="
        top-58 w-30
        absolute right-20 flex
        h-24 flex-col items-center
        justify-center gap-1 rounded-[4px] border-2 border-dashed
        border-[#ff44aa44]
        bg-[#ff44aa22]"
>
	{#if mapViewer && mapViewer.historicMapSelected}
		<img
			transition:scale
			class="z-100 absolute left-0 top-0"
			src={mapViewer.historicMapSelected.imageUrl}
			width="100%"
			height="100%"
			alt=""
		/>
		<button class="absolute -right-8" transition:fly={{ x: 10, duration: 500, delay: 100 }}>
			<PushPin size="20" color="#336"></PushPin>
		</button>
	{/if}
	<FileMagnifyingGlass size="26" class="opacity-67 pt-1"></FileMagnifyingGlass>
	<span class="opacity-67 text-center text-xs">Klik hier om een kaartblad bekijken</span>

	<div class="-pt-4 flex items-center justify-center gap-1">
		<kbd
			class="bg-background-alt text-xxs pointer-events-none flex h-4 select-none items-center gap-1 rounded-sm border px-1 font-sans font-medium opacity-50 shadow-[0px_2px_0px_0px_#59595b] dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
			><span class="text-foreground-alt text-[10px]">Spatie</span></kbd
		>
		<span class="opacity-33">+</span>
		<MouseLeftClick size="16" class="opacity-50"></MouseLeftClick>
	</div>
</div> -->
