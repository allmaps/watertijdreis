<script lang="ts">
	import * as turf from '@turf/turf';
	import {
		ArrowLineRight,
		ArrowUUpLeft,
		Binoculars,
		ImagesSquare,
		MapTrifold,
		MouseLeftClick,
		PictureInPicture,
		PushPin
	} from 'phosphor-svelte';
	import { fly, scale, draw, fade } from 'svelte/transition';

	let {
		historicMapsById,
		visibleHistoricMaps,
		visibleHistoricMapsInViewport,
		viewportPolygon,
		hoveredHistoricMap,
		selectedHistoricMap,
		historicMapsLoaded,
		restoreView,
		getHistoricMapThumbnai
	} = $props();

	let previewHistoricMap = $derived.by(() => {
		if (visibleHistoricMapsInViewport.size == 1)
			return visibleHistoricMapsInViewport.values().next().value;
		else return hoveredHistoricMap;
	});

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
		const paddingX = viewWidth * 0.075;
		const paddingY = viewHeight * 0.075;

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

	function getClippedProjectedRect(coordinates: [number, number][]): {
		x: number;
		y: number;
		width: number;
		height: number;
	} {
		const minXClamp = viewBox[0] + (viewBox[2] / width) * 2;
		const minYClamp = viewBox[1] + (viewBox[2] / width) * 2;
		const maxXClamp = viewBox[0] + viewBox[2] - 4 * (viewBox[2] / width);
		const maxYClamp = viewBox[1] + viewBox[3] - 4 * (viewBox[2] / width);

		const clipped = coordinates.map(([x, y]) => [
			Math.min(Math.max(x, minXClamp), maxXClamp),
			Math.min(Math.max(y, minYClamp), maxYClamp)
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

{#if selectedHistoricMap}
	<div class="absolute top-22 right-8 z-998">
		<button
			onclick={restoreView}
			class={`
				group inline-flex flex-shrink-0 cursor-pointer 
				items-center justify-center border-2 border-[#33336611]
				bg-white/90 
				font-[500] shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
				transition-all
				
				duration-500 hover:bg-[#eef]
				${false ? 'rounded-lg p-2' : 'rounded-lg px-2.5 py-2'}
			`}
		>
			<ArrowUUpLeft
				color="#f4a"
				class={`
				relative -top-px inline h-[22px]
				w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
				`}
			/>

			<span
				class={`
				overflow-hidden whitespace-nowrap
				transition-[max-width,margin,opacity] duration-500 ease-in-out
				${false ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 max-w-40 opacity-100'}
			`}
			>
				Terug naar kaart
			</span>
		</button>
	</div>
{/if}

{#if visibleHistoricMaps.size}
	<svg {width} {height} viewBox={viewBox.join(' ')} class="absolute top-5 right-8 z-998">
		<g transform="scale(1, -1) translate(0, -{viewBox[1] * 2 + viewBox[3]})">
			{#if previewHistoricMap}
				{@const hovered = polygons.find((p) => p.properties.id == previewHistoricMap.id)}
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
					stroke="#33a"
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
					stroke="#33a"
					stroke-width={strokeWidth}
					d={`
						M ${x1} ${y1}
						L ${x2} ${y2}
						L ${rightX} ${rightY}
					`}
				/>
			{/if}
			{#each polygons as poly}
				{@const previewed = previewHistoricMap && poly.properties.id == previewHistoricMap.id}
				{@const visible = visibleHistoricMapsInViewport.has(poly.properties.id)}
				{@const fill = previewed ? '#ff44aa' : visible ? '#ff44aa44' : '#ff44aa11'}
				<polygon
					points={getProjectedPoints(poly.geometry.coordinates[0])}
					{fill}
					stroke="#ff44aa"
					stroke-width={(viewBox[2] / width) * 1.33}
				/>
			{/each}
			{#if viewport && !selectedHistoricMap}
				<!-- <polygon
					points={getClippedProjectedPoints(viewport.geometry.coordinates[0])}
					fill="none"
					stroke="#33336666"
					stroke-width={(viewBox[2] / width) * 4}
					rx="4"
					ry="4"
				/> -->
				{@const {
					x,
					y,
					width: w,
					height: h
				} = getClippedProjectedRect(viewport.geometry.coordinates[0])}
				<rect
					{x}
					{y}
					width={w}
					height={h}
					fill="none"
					stroke="#33336666"
					stroke-width={(viewBox[2] / width) * 4}
					rx={(viewBox[2] / width) * 4}
					ry={(viewBox[2] / width) * 4}
				></rect>
			{/if}
		</g>
	</svg>
{/if}
