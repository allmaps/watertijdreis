<script lang="ts">
	import * as turf from '@turf/turf';
	import { PhonePlus } from 'phosphor-svelte';

	let width: number = $state(160);
	let height: number = $state(160);

	let viewBox: [number, number, number, number] = $state([0, 0, 200, 200]);

	let projectedPolygons = $state<GeoJSON.Feature<GeoJSON.Polygon>[]>([]);
	let projectedViewportPolygon = $state<GeoJSON.Feature<GeoJSON.Polygon> | null>(null);

	let dynamicStrokeWidth = $state(1);

	let { mapViewer, polygons, viewport } = $props();

	$effect(() => {
		if (polygons && polygons.length) {
			const mercatorPolygons = polygons.map((poly) => {
				const polyCopy = JSON.parse(JSON.stringify(poly));
				return turf.toMercator(polyCopy) as GeoJSON.Feature<GeoJSON.Polygon>;
			});

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
		if (viewport) {
			const viewportCopy = JSON.parse(JSON.stringify(viewport));
			projectedViewportPolygon = turf.toMercator(viewportCopy) as GeoJSON.Feature<GeoJSON.Polygon>;
		} else {
			projectedViewportPolygon = null;
		}
	});

	function getProjectedPoints(coordinates: [number, number][]): string {
		return coordinates.map((coord) => coord.join(',')).join(' ');
	}
</script>

<svg {width} {height} viewBox={viewBox.join(' ')} class="absolute top-15 right-15">
	<g transform="scale(1, -1) translate(0, -{viewBox[1] * 2 + viewBox[3]})">
		{#each projectedPolygons.filter( (p) => mapViewer.historicMapsInViewport.has(p.properties.id) ) as poly}
			<polygon points={getProjectedPoints(poly.geometry.coordinates[0])} fill="#ff44aa55" />
		{/each}

		{#each projectedPolygons as poly (poly.properties.id)}
			<polygon
				points={getProjectedPoints(poly.geometry.coordinates[0])}
				fill="#ff44aa11"
				stroke="#f4a"
				stroke-width={dynamicStrokeWidth}
			/>
		{/each}

		{#if projectedViewportPolygon}
			<polygon
				points={getProjectedPoints(projectedViewportPolygon.geometry.coordinates[0])}
				fill="#33336622"
				stroke="#336"
				stroke-width={dynamicStrokeWidth * 2}
			/>
		{/if}
	</g>
</svg>
