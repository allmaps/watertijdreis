<script lang="ts">
	import { Tween, Spring } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import { Eye, ImagesSquare } from 'phosphor-svelte';

	let { mapViewer } = $props();

	$effect(() => {
		if (!mapViewer) return;
		mapViewer.filterHistoricMapsByYear(Math.floor(selectedYear));
	});

	let width: number = $state(0);
	let height: number = $state(0);

	let view = $state(new Spring({ start: 1950, end: 2000 }, { stiffness: 0.1, damping: 0.33 }));
	let selectedYear = $derived((view.current.end + view.current.start) / 2);

	let timelineTickColor = $state('#336');

	const MIN_YEAR: number = 1800;
	const MAX_YEAR: number = 2023;

	let isPanning: boolean = $state(false);
	let lastX: number = $state(0);

	function yearToX(year: number): number {
		return ((year - view.current.start) / (view.current.end - view.current.start)) * width;
	}

	function xToYear(x: number): number {
		return (x / width) * (view.current.end - view.current.start) + view.current.start;
	}

	function onwheel(e: WheelEvent) {
		e.preventDefault();

		const zoom = 1 + Math.min(Math.max(e.deltaY / 100, -0.2), 0.2);
		const cursor = xToYear(e.offsetX);
		const { start, end } = view.current;

		const newStart = cursor - (cursor - start) * zoom;
		const newEnd = cursor + (end - cursor) * zoom;

		view.target = { start: newStart, end: newEnd };
	}

	function onpointerdown(e: PointerEvent) {
		isPanning = true;
		lastX = e.clientX;

		mapViewer.setLabelVisibility(true);
	}

	function onpointermove(e: PointerEvent) {
		if (!isPanning) return;
		const dx = e.clientX - lastX;
		const yearDelta = (dx / width) * (view.current.end - view.current.start);
		view.target = {
			start: view.target.start - yearDelta,
			end: view.target.end - yearDelta
		};
		lastX = e.clientX;
	}

	function onpointerup(e: PointerEvent) {
		isPanning = false;

		mapViewer.setLabelVisibility(false);
	}
</script>

<div
	class="timeline-container"
	style="position: relative; height: 120px;"
	bind:clientWidth={width}
	bind:clientHeight={height}
	{onwheel}
	{onpointerdown}
	{onpointermove}
	{onpointerup}
>
	<div
		class="map-markers"
		style="position: absolute; inset: 0; perspective: 600px; transform-style: preserve-3d; z-index: 1; overflow: hidden"
	>
		{#each mapViewer?.historicMaps as map, i}
			{@const height =
				mapViewer?.historicMaps.slice(0, i).filter((m) => m.yearStart == map.yearStart).length *
					-5 +
				40}
			<div
				class="map-marker"
				style={`
				position: absolute;
				left: ${yearToX(map.yearStart) - 25}px;
				top: ${height}px;
				width: 40px;
				transform: rotateX(60deg);
				transform-origin: bottom center;
                box-shadow: 0 6px 6px rgba(0,0,0,0.1);
			`}
			>
				<img
					src={map.imageUrl}
					alt=""
					loading="lazy"
					style="width:100%; height:100%; object-fit: cover; transition: filter .3s"
					style:filter={map.yearStart <= selectedYear ? 'none' : 'grayscale(100)'}
				/>
			</div>
		{/each}
	</div>
	<svg
		{width}
		height={120}
		style="overflow: visible; position: absolute; top: 0; left: 0; z-index: 999;"
	>
		{#each Array.from({ length: Math.ceil(view.current.end) - Math.floor(view.current.start) + 1 }, (_, i) => Math.floor(view.current.start) + i) as year}
			{@const pixelsPerYear = width / (view.current.end - view.current.start)}
			{#if year % 25 === 0}
				<line
					x1={yearToX(year)}
					y1={height}
					x2={yearToX(year)}
					y2={height - 10}
					stroke={timelineTickColor}
					stroke-width="1"
				/>
				<text
					x={yearToX(year) - 15}
					y={height - 15}
					font-size="14"
					font-weight="500"
					fill={timelineTickColor}>{year}</text
				>
			{:else if year % 5 === 0 && pixelsPerYear > 7}
				<line
					x1={yearToX(year)}
					y1={height}
					x2={yearToX(year)}
					y2={height - 10 + 5 * Math.max(0, (9 - pixelsPerYear) / 2)}
					stroke={timelineTickColor}
					stroke-width="1"
				/>
				<text
					x={yearToX(year) - 13}
					y={height - 15}
					font-size="12"
					fill={timelineTickColor}
					opacity={1 - (9 - pixelsPerYear) / 2}
				>
					{year}
				</text>
			{/if}
			{#if pixelsPerYear > 3}
				<line
					x1={yearToX(year)}
					y1={height}
					x2={yearToX(year)}
					y2={height - 5}
					stroke={timelineTickColor}
					stroke-width="1"
					opacity={1 - (5 - pixelsPerYear) / 2}
				/>
			{/if}
		{/each}

		<!-- <rect
            x={yearToX(view.current.start)} 
            y={0} 
            width={yearToX(view.current.start + (view.current.end - view.current.start) / 2) - yearToX(view.current.start)} 
            height={100} 
            fill="url(#gradient-left)"
        ></rect> -->
		<rect
			x={yearToX((view.current.end + view.current.start) / 2)}
			y={0}
			width={width / 2}
			{height}
			fill="url(#gradient-left)"
		></rect>
		<defs>
			<linearGradient id="gradient-left" x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" style="stop-color:#336; stop-opacity:.2" />
				<stop offset="100%" style="stop-color:#336; stop-opacity:0" />
			</linearGradient>
		</defs>
		<g transform="translate(0, -4)">
			<rect
				x={yearToX(view.current.start + (view.current.end - view.current.start) / 2) - 1}
				y={0}
				width={2}
				{height}
				fill="#33336688"
			></rect>
			<rect
				x={yearToX(view.current.start + (view.current.end - view.current.start) / 2) - 35}
				y={0}
				width={70}
				height={20}
				fill="#333366"
				rx="2"
				ry="2"
			></rect>
			<polygon
				points={`
                    ${yearToX(view.current.start + (view.current.end - view.current.start) / 2) - 7},20 
                    ${yearToX(view.current.start + (view.current.end - view.current.start) / 2) + 7},20 
                    ${yearToX(view.current.start + (view.current.end - view.current.start) / 2)},30
                `}
				fill="#333366"
			></polygon>
			<!-- Gradient left of the bar -->
			<text
				x={yearToX((view.current.end + view.current.start) / 2)}
				y={15}
				font-size="14"
				font-weight="600"
				fill="#fff"
				text-anchor="middle"
				>&lt; {Math.ceil((view.current.end + view.current.start) / 2)} &gt;</text
			>
		</g>

		<g>
			{#if true}
				{@const start = 1960}
				{@const end = 1971}
				{@const height = 80}
				{@const color = '#333366'}
				<line
					x1={yearToX(start)}
					y1={height}
					x2={yearToX(end)}
					y2={height}
					stroke={color + '88'}
					stroke-width="1"
				></line>
				<line
					x1={yearToX(start)}
					y1={height}
					x2={yearToX(start)}
					y2={height - 8}
					stroke={color + '88'}
					stroke-width="1"
				></line>
				<line
					x1={yearToX(end)}
					y1={height}
					x2={yearToX(end)}
					y2={height - 8}
					stroke={color + '88'}
					stroke-width="1"
				></line>
				<text
					x={yearToX((start + end) / 2)}
					y={height + 14}
					font-size="12"
					font-weight="600"
					fill={color}
					text-anchor="middle">Editie 4</text
				>
			{/if}
		</g>
		<g>
			{#if true}
				{@const start = 1969}
				{@const end = 1980}
				{@const height = 77}
				{@const color = '#333366'}
				<line
					x1={yearToX(start)}
					y1={height}
					x2={yearToX(end)}
					y2={height}
					stroke={color + '88'}
					stroke-width="1"
				></line>
				<line
					x1={yearToX(start)}
					y1={height}
					x2={yearToX(start)}
					y2={height - 8}
					stroke={color + '88'}
					stroke-width="1"
				></line>
				<line
					x1={yearToX(end)}
					y1={height}
					x2={yearToX(end)}
					y2={height - 8}
					stroke={color + '88'}
					stroke-width="1"
				></line>
				<text
					x={yearToX((start + end) / 2)}
					y={height + 14}
					font-size="12"
					font-weight="600"
					fill={color}
					text-anchor="middle">Editie 5</text
				>
				<!-- <image 
                x={yearToX((start + end) / 2) - 16} 
                y={height - 40} 
                width={42} 
                height={32} 
                transform="rotate({Math.random() * 10 - 5}, {yearToX((start + end) / 2)}, 62.5)"
                href={mapViewer?.historicMaps[0]?.imageUrl || ''}></image>
            <image 
                x={yearToX((start + end) / 2) - 16} 
                y={height - 40} 
                width={42} 
                height={32} 
                transform="rotate({Math.random() * 10 - 5}, {yearToX((start + end) / 2)}, 62.5)"
                href={mapViewer?.historicMaps[0]?.imageUrl || ''}></image>
            <image 
                x={yearToX((start + end) / 2) - 16} 
                y={height - 40} 
                width={42} 
                height={32} 
                transform="rotate({Math.random() * 10 - 5}, {yearToX((start + end) / 2)}, 62.5)"
                href={mapViewer?.historicMaps[0]?.imageUrl || ''}></image> -->
			{/if}

			<!-- {#each mapViewer?.historicMaps as map, i}
				{@const height =
					mapViewer?.historicMaps.slice(0, i).filter((m) => m.yearStart == map.yearStart).length *
						-5 +
					65}
				<rect
					x={yearToX(map.yearStart) - 5}
					y={height}
					width={10}
					height={3}
					fill={selectedYear > map.yearStart ? '#3366cc88' : '#888888'}
					transform={'rotate(' +
						(Math.random() * 12 - 6) +
						', ' +
						(yearToX(map.yearStart) + 3) +
						', ' +
						(height + 3) +
						')'}
				></rect>
			{/each} -->
		</g>
	</svg>
</div>
