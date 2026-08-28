<script lang="ts">
	import * as turf from "@turf/turf";
	import { draw, fade } from "svelte/transition";

	let { mapContext } = $props();

	let previewHistoricMap = $derived.by(() => {
		const visibleMaps = mapContext.historic.visibleMapsInViewport;
		if (visibleMaps && visibleMaps.size === 1) {
			return visibleMaps.values().next().value;
		}
		return null;
	});

	let polygons = $derived.by(() => {
		if (!mapContext.historic.mapsLoaded || !mapContext.historic.visibleMaps) return [];
		const mapArray = Array.from(mapContext.historic.visibleMaps.values());
		return mapArray.map((i) => ({
			type: "Feature" as const,
			geometry: turf.toMercator(structuredClone(i.polygon)),
			properties: {
				id: i.id,
			},
		}));
	});

	let width: number = $state(160);
	let height: number = $state(200);

	let viewBox = $derived.by(() => {
		if (!polygons.length) return [0, 0, 160, 200];

		const bbox = turf.bbox({
			type: "FeatureCollection",
			features: polygons,
		});

		const viewWidth = bbox[2] - bbox[0] || 1;
		const viewHeight = bbox[3] - bbox[1] || 1;
		const paddingX = viewWidth * 0.075;
		const paddingY = viewHeight * 0.075;

		return [bbox[0] - paddingX, bbox[1] - paddingY, viewWidth + paddingX * 2, viewHeight + paddingY * 2];
	});

	let viewport = $derived.by(() => {
		if (!mapContext.viewportPolygon) return null;
		return turf.toMercator(mapContext.viewportPolygon);
	});

	function getProjectedPoints(coordinates: [number, number][]): string {
		return coordinates.map((coord) => coord.join(",")).join(" ");
	}

	function getClippedProjectedRect(coordinates: [number, number][]): {
		x: number;
		y: number;
		width: number;
		height: number;
	} {
		const scaleFactor = viewBox[2] / width || 1;
		const minXClamp = viewBox[0] + scaleFactor * 2;
		const minYClamp = viewBox[1] + scaleFactor * 2;
		const maxXClamp = viewBox[0] + viewBox[2] - 4 * scaleFactor;
		const maxYClamp = viewBox[1] + viewBox[3] - 4 * scaleFactor;

		const clipped = coordinates.map(([x, y]) => [
			Math.min(Math.max(x, minXClamp), maxXClamp),
			Math.min(Math.max(y, minYClamp), maxYClamp),
		]);

		const xs = clipped.map((c) => c[0]);
		const ys = clipped.map((c) => c[1]);

		const x = Math.min(...xs);
		const y = Math.min(...ys);
		const widthRect = Math.max(...xs) - x;
		const heightRect = Math.max(...ys) - y;

		return { x, y, width: widthRect, height: heightRect };
	}
</script>

{#if mapContext.historic.visibleMaps && mapContext.historic.visibleMaps.size}
	<svg
		{width}
		{height}
		viewBox={viewBox.join(" ")}
		class="drop-shadow-wtr-blue/50 pointer-events-none absolute bottom-32 left-2 z-[998] origin-bottom-left scale-80 touch-none drop-shadow-[1px_1px_0px] transition-transform duration-300 hover:scale-100 sm:right-8"
	>
		<!-- ARROW POINTING FROM SELECTED MAP TO MAP-PREVIEW-BOX -->
		<g transform="scale(1, -1) translate(0, -{viewBox[1] * 2 + viewBox[3]})">
			{#each polygons as poly (poly.properties.id)}
				{@const previewed =
					!mapContext.historic.clickedHistoricMap && previewHistoricMap && poly.properties.id === previewHistoricMap.id}
				{@const selected = mapContext.historic.selectedMap && poly.properties.id === mapContext.historic.selectedMap.id}
				{@const clicked =
					mapContext.historic.clickedHistoricMap && poly.properties.id === mapContext.historic.clickedHistoricMap.id}
				{@const visible =
					!mapContext.historic.selectedMap && mapContext.historic.visibleMapsInViewport.has(poly.properties.id)}
				{@const fill = previewed || clicked || selected ? "#ff44aaaa" : visible ? "#ff44aa44" : "#ff44aa11"}
				<polygon
					points={getProjectedPoints(poly.geometry.coordinates[0])}
					{fill}
					stroke="#ff44aa"
					stroke-width={(viewBox[2] / width) * 1.33}
				/>
			{/each}

			{#if viewport && !mapContext.historic.selectedMap}
				{@const { x, y, width: w, height: h } = getClippedProjectedRect(viewport.geometry.coordinates[0])}
				<rect
					{x}
					{y}
					width={w}
					height={h}
					fill="none"
					class="stroke-wtr-blue/30"
					stroke-width={(viewBox[2] / width) * 4}
					rx={(viewBox[2] / width) * 2}
					ry={(viewBox[2] / width) * 2}
				/>
			{/if}

			{#if previewHistoricMap || mapContext.historic.clickedHistoricMap || mapContext.historic.selectedMap || (mapContext.sheetIndexVisible && mapContext.historic.hoveredHistoricMap)}
				<g out:fade={{ duration: 250 }}>
					{#key previewHistoricMap || mapContext.historic.clickedHistoricMap || mapContext.historic.selectedMap || (mapContext.sheetIndexVisible && mapContext.historic.hoveredHistoricMap)}
						{@const historicMap =
							previewHistoricMap ||
							mapContext.historic.clickedHistoricMap ||
							mapContext.historic.selectedMap ||
							(mapContext.sheetIndexVisible && mapContext.historic.hoveredHistoricMap)}
						{@const hovered = polygons.find((p) => p.properties.id === historicMap.id)}
						{@const centerPoint = hovered ? turf.centerOfMass(hovered).geometry.coordinates : [0, 0]}

						{@const x1 = centerPoint[0]}
						{@const y1 = centerPoint[1]}
						{@const x2 = viewBox[0] + viewBox[2] / 2}
						{@const y2 = viewBox[1] - viewBox[3] * 0.03}

						{@const strokeWidth = (viewBox[2] / width) * 2}

						{@const angle = Math.atan2(y2 - y1, x2 - x1)}
						{@const ah = strokeWidth * 5}

						{@const leftX = x2 - ah * Math.cos(angle) + ah * 0.5 * Math.sin(angle)}
						{@const leftY = y2 - ah * Math.sin(angle) - ah * 0.5 * Math.cos(angle)}

						{@const rightX = x2 - ah * Math.cos(angle) - ah * 0.5 * Math.sin(angle)}
						{@const rightY = y2 - ah * Math.sin(angle) + ah * 0.5 * Math.cos(angle)}

						<path
							in:draw={{ duration: 250 }}
							fill="none"
							stroke="var(--color-wtr-lighter-blue)"
							stroke-width={strokeWidth}
							d={`
								M ${x1} ${y1}
								L ${x2} ${y2}
								L ${leftX} ${leftY}
							`}
						/>
						<path
							in:draw={{ duration: 250 }}
							fill="none"
							stroke="var(--color-wtr-lighter-blue)"
							stroke-width={strokeWidth}
							d={`
								M ${x1} ${y1}
								L ${x2} ${y2}
								L ${rightX} ${rightY}
							`}
						/>
					{/key}
				</g>
			{/if}
		</g>
	</svg>
{/if}
