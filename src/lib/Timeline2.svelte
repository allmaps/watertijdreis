<script lang="ts">
	import { Tween, Spring } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import MapThumbnail from './MapThumbnail.svelte';
	import MapThumbnailStack from './MapThumbnailStack.svelte';
	import TimelinePointer from './TimelinePointer.svelte';

	let { mapViewer } = $props();

	$effect(() => {
		if (!mapViewer) return;
		mapViewer.filterHistoricMapsByYear(Math.floor(selectedYear));
	});

	const MIN_YEAR: number = 1800;
	const MAX_YEAR: number = 2023;

	let width: number = $state(0);
	let height: number = $state(0);

	let view = $state(new Spring({ start: 1950, end: 2000 }, { stiffness: 0.1, damping: 0.25 }));
	let selectedYear = $derived((view.target.end + view.target.start) / 2);

	let timelineTickColor = $state('#336');

	let isPanning: boolean = $state(false);
	let lastX: number = $state(0);

	let editions = [
		{ name: 'Editie 4', yearStart: 1960, yearEnd: 1971 },
		{ name: 'Editie 5', yearStart: 1969, yearEnd: 1980 }
	];

	function yearToX(year: number): number {
		return ((year - view.current.start) / (view.current.end - view.current.start)) * width;
	}

	function xToYear(x: number): number {
		return (x / width) * (view.current.end - view.current.start) + view.current.start;
	}

	function onwheel(e: WheelEvent) {
		e.preventDefault();

		const zoom = 1 + Math.min(Math.max(e.deltaY / 100, -0.2), 0.2);
		const cursor = selectedYear;
		// const cursor = xToYear(e.offsetX);
		const { start, end } = view.current;

		const newStart = cursor - (cursor - start) * zoom;
		const newEnd = cursor + (end - cursor) * zoom;

		view.target = { start: Math.max(newStart, MIN_YEAR), end: Math.min(newEnd, MAX_YEAR) };
	}

	function onpointerdown(e: PointerEvent) {
		isPanning = true;
		lastX = e.clientX;

		mapViewer.setLabelVisibility(true);

		window.addEventListener('pointermove', onpointermove);
		window.addEventListener('pointerup', onpointerup);
		window.addEventListener('blur', onpointerup);
	}

	function onpointermove(e: PointerEvent) {
		if (!isPanning) return;

		const maxDeltaLeft = view.current.start - MIN_YEAR;
		const maxDeltaRight = view.current.end - MAX_YEAR;

		const dx = e.clientX - lastX;
		let yearDelta = (dx / width) * (view.current.end - view.current.start);
		if (yearDelta > maxDeltaLeft) yearDelta = maxDeltaLeft;
		if (yearDelta < maxDeltaRight) yearDelta = maxDeltaRight;

		view.target = {
			start: Math.max(view.target.start - yearDelta, MIN_YEAR),
			end: Math.min(view.target.end - yearDelta, MAX_YEAR)
		};
		lastX = e.clientX;
	}

	function onpointerup() {
		isPanning = false;

		mapViewer.setLabelVisibility(false);

		view.target = {
			start: Math.round(view.target.start),
			end: Math.round(view.target.end)
		};

		window.removeEventListener('pointermove', onpointermove);
		window.removeEventListener('pointerup', onpointerup);
	}
</script>

<div
	class="timeline-container touch-action-none relative h-[120px] touch-none"
	style:background={//'linear-gradient(0deg, #333366, #2d2d5a)'
	'linear-gradient(0deg, #eef, #fff)'}
	bind:clientWidth={width}
	bind:clientHeight={height}
	{onwheel}
	{onpointerdown}
	{onpointermove}
	{onpointerup}
>
	<TimelinePointer year={Math.ceil(selectedYear)}></TimelinePointer>
	<div
		class="map-markers"
		style="position: absolute; inset: 0; perspective: 600px; transform-style: preserve-3d; z-index: 1; overflow: hidden"
	>
		{#each mapViewer?.historicMaps as map, i}
			{@const height =
				mapViewer?.historicMaps.slice(0, i).filter((m) => m.yearStart == map.yearStart).length *
					-5 +
				40 +
				(map.yearStart % 2) * 1}
			{@const visible = mapViewer.historicMapsInViewport.has(map.id)}

			<MapThumbnail x={yearToX(map.yearStart) - 25} y={height} src={map.imageUrl}></MapThumbnail>
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

		{#each editions as ed, i}
			{@const height = i % 2 == 0 ? 89 : 86}
			{@const start = yearToX(ed.yearStart)}
			{@const middle = yearToX((ed.yearStart + ed.yearEnd) / 2)}
			{@const end = yearToX(ed.yearEnd)}
			<line x1={start} y1={height} x2={start} y2={height - 8} stroke="#336" stroke-width="1"></line>
			<line x1={start} y1={height} x2={middle - 25} y2={height} stroke="#336" stroke-width="1"
			></line>
			<line x1={middle + 25} y1={height} x2={end} y2={height} stroke="#336" stroke-width="1"></line>
			<text
				x={middle}
				y={height + 3}
				font-size="12"
				font-weight="600"
				fill="#336"
				text-anchor="middle"
			>
				{ed.name}</text
			>
			<line x1={end} y1={height} x2={end} y2={height - 8} stroke="#336" stroke-width="1"></line>
		{/each}
	</svg>
</div>
