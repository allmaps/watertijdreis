<script lang="ts">
	import { getContext } from "svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import * as turf from "@turf/turf";
	import { draw, fade } from "svelte/transition";
	import NumberFlow from "@number-flow/svelte";

	const mapContext = getContext<MapContext>("mapContext");
	const historicCtx = mapContext.historic;

	let activeHistoricMap = $derived(historicCtx.selectedMap || historicCtx.previewMap);

	// Scaled down by 0.8 from 160x200 to match your previous size without CSS scale hacks
	let width: number = $state(128);
	let height: number = $state(160);
	let svgElement: SVGSVGElement | null = $state(null);

	let polygons = $derived.by(() => {
		if (!historicCtx.mapsLoaded || !historicCtx.visibleMaps) return [];

		const mapsArray = [];
		for (const s of mapContext.historic.series) {
			for (const [id, map] of s.visibleMaps) {
				mapsArray.push(map);
			}
		}
		return mapsArray.map((i) => ({
			id: i.id,
			type: "Feature" as const,
			geometry: turf.toMercator(structuredClone(i.polygon)),
			properties: {
				series: mapContext.historic.series.find((s) => s.visibleMaps.has(i.id))?.id,
			},
		}));
	});

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

	let scaleFactor = $derived(viewBox[2] / width || 1);

	function getPolygonFill(polyId: string): string {
		const isActive = activeHistoricMap?.id === polyId;
		if (isActive) return "#ff44aaaa";

		const isVisibleInViewport = !historicCtx.selectedMap && historicCtx.visibleMapsInViewport?.has(polyId);

		return isVisibleInViewport ? "#ff44aa44" : "#ff44aa11";
	}

	let viewport = $derived.by(() => {
		if (!mapContext.viewportPolygon) return null;
		return turf.toMercator(mapContext.viewportPolygon);
	});

	let viewportRect = $derived.by(() => {
		if (!viewport || historicCtx.selectedMap) return null;

		const minXClamp = viewBox[0] + scaleFactor * 2;
		const minYClamp = viewBox[1] + scaleFactor * 2;
		const maxXClamp = viewBox[0] + viewBox[2] - 4 * scaleFactor;
		const maxYClamp = viewBox[1] + viewBox[3] - 4 * scaleFactor;

		const clipped = (viewport.geometry.coordinates[0] as [number, number][]).map(([x, y]) => [
			Math.min(Math.max(x, minXClamp), maxXClamp),
			Math.min(Math.max(y, minYClamp), maxYClamp),
		]);

		const xs = clipped.map((c) => c[0]);
		const ys = clipped.map((c) => c[1]);

		const x = Math.min(...xs);
		const y = Math.min(...ys);

		return {
			x,
			y,
			width: Math.max(...xs) - x,
			height: Math.max(...ys) - y,
		};
	});

	// Precise coordinate mapping without CSS transform distortion
	let titlePosition = $derived.by(() => {
		if (!viewportRect || !svgElement) return null;

		const svgRect = svgElement.getBoundingClientRect();

		const pxPerUnitX = svgRect.width / viewBox[2];
		const pxPerUnitY = svgRect.height / viewBox[3];

		const rightEdgeSvgX = viewportRect.x + viewportRect.width;
		const centerYSvgY = viewportRect.y + viewportRect.height / 2;

		const screenX = (rightEdgeSvgX - viewBox[0]) * pxPerUnitX;
		const screenY = (viewBox[1] + viewBox[3] - centerYSvgY) * pxPerUnitY;

		return {
			left: `${screenX + 20}px`,
			top: `${screenY}px`,
		};
	});

	let arrowPaths = $derived.by(() => {
		if (!activeHistoricMap) return null;

		const targetPoly = polygons.find((p) => p.id === activeHistoricMap.id);
		const centerPoint = targetPoly ? turf.centerOfMass(targetPoly).geometry.coordinates : [0, 0];

		const x1 = centerPoint[0];
		const y1 = centerPoint[1];
		const x2 = viewBox[0] + viewBox[2] / 2;
		const y2 = viewBox[1] - viewBox[3] * 0.03;

		const strokeWidth = scaleFactor * 2;
		const angle = Math.atan2(y2 - y1, x2 - x1);
		const ah = strokeWidth * 5;

		const leftX = x2 - ah * Math.cos(angle) + ah * 0.5 * Math.sin(angle);
		const leftY = y2 - ah * Math.sin(angle) - ah * 0.5 * Math.cos(angle);

		const rightX = x2 - ah * Math.cos(angle) - ah * 0.5 * Math.sin(angle);
		const rightY = y2 - ah * Math.sin(angle) + ah * 0.5 * Math.cos(angle);

		return {
			strokeWidth,
			leftArm: `M ${x1} ${y1} L ${x2} ${y2} L ${leftX} ${leftY}`,
			rightArm: `M ${x1} ${y1} L ${x2} ${y2} L ${rightX} ${rightY}`,
		};
	});

	function getProjectedPoints(coordinates: [number, number][]): string {
		return coordinates.map((coord) => coord.join(",")).join(" ");
	}

	let range = $state([]);

	$effect(() => {
		const a = mapContext.historic.visibleMapsInViewport
			.values()
			.map((i) => i.yearEnd)
			.toArray();
		const min = Math.min(...a);
		const max = Math.max(...a);
		range = [min, max];
	});
</script>

<div class="pointer-events-none z-[999] block touch-none">
	{#if mapContext.maplibreLoaded && titlePosition && viewportRect}
		<h1
			class="text-wtr-blue absolute z-10000 -translate-y-1/2 rounded-lg bg-white p-2 text-xl text-[16px] font-[500] whitespace-nowrap text-white shadow-lg"
			style="left: {titlePosition.left}; top: {titlePosition.top};"
		>
			<NumberFlow format={{ useGrouping: false }} value={range[0]} />-<NumberFlow
				format={{ useGrouping: false }}
				value={range[1]}
			/>
		</h1>
	{/if}

	{#if historicCtx.visibleMaps && historicCtx.visibleMaps.size}
		<svg
			bind:this={svgElement}
			{width}
			{height}
			viewBox={viewBox.join(" ")}
			class="drop-shadow-wtr-blue/50 pointer-events-none drop-shadow-[1px_1px_0px]"
		>
			<g transform="scale(1, -1) translate(0, -{viewBox[1] * 2 + viewBox[3]})">
				<!-- POLYGONS -->
				{#each polygons as poly (poly.id)}
					<polygon
						points={getProjectedPoints(poly.geometry.coordinates[0])}
						fill={getPolygonFill(poly)}
						stroke={poly.properties.series === "wsk" ? "#ff44aa" : "#44aa44"}
						stroke-width={scaleFactor * 1.33}
						class="transition-fill duration-250"
					/>
				{/each}

				<!-- VIEWPORT RECTANGLE -->
				{#if viewportRect}
					<rect
						x={viewportRect.x}
						y={viewportRect.y}
						width={viewportRect.width}
						height={viewportRect.height}
						fill="none"
						class="stroke-wtr-blue"
						stroke-width={scaleFactor * 4}
						rx={scaleFactor * 2}
						ry={scaleFactor * 2}
					/>
				{/if}

				<!-- ARROW POINTING TO ACTIVE MAP -->
				{#if arrowPaths}
					<g out:fade={{ duration: 250 }}>
						{#key activeHistoricMap?.id}
							<path
								in:draw={{ duration: 250 }}
								fill="none"
								stroke="var(--color-wtr-blue)"
								stroke-width={arrowPaths.strokeWidth * 1.5}
								d={arrowPaths.leftArm}
							/>
							<path
								in:draw={{ duration: 250 }}
								fill="none"
								stroke="var(--color-wtr-blue)"
								stroke-width={arrowPaths.strokeWidth * 1.5}
								d={arrowPaths.rightArm}
							/>
						{/key}
					</g>
				{/if}
			</g>
		</svg>
	{/if}
</div>
