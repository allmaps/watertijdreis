<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Spring } from 'svelte/motion';
	import TimelinePointer from './TimelinePointer.svelte';
	import MapStack from './MapStack.svelte';
	import TimelineSettings from './TimelineSettings.svelte';

	let {
		visible,
		historicMapsLoaded,
		historicMapsById,
		mapsInViewport,
		getHistoricMapThumbnail,
		filter = $bindable(),
		applyFilter,
		setLabelVisibility,
		setGridVisibility
	} = $props();

	// $effect(() => {
	// 	if (filter.yearEnd - Math.floor(selectedYear)) {
	// 		filter.yearEnd = Math.floor(selectedYear);
	// 		applyFilter(filter);
	// 	}
	// });

	let width = $state(0);
	let height = $state(120);
	let pixelsPerYear = $state(50);
	let backgroundOffsetX = $state(0);
	let backgroundVelocity = $state(0);
	let backgroundOpacity = $state(0.6);
	let momentumTimeout: ReturnType<typeof setTimeout> | null = null;
	let opacityTimeout: ReturnType<typeof setTimeout> | null = null;

	let pointerCache = new Map<number, PointerEvent>();
	let prevDiff = -1;
	let lastX = 0;

	const MIN_ZOOM = 5;
	const MAX_ZOOM = 200;
	const MIN_YEAR = 1600;
	const MAX_YEAR = 2300;
	const timelineTickColor = '#eef';
	const ticksOnTop = true;

	let view = new Spring(
		{
			start: filter.yearEnd - 10,
			end: filter.yearEnd + 10
		},
		{ stiffness: 0.1, damping: 0.5 }
	);

	// $effect(() => setSelectedYear(filter.yearEnd));

	$effect(() => {
		if (width > 0 && pixelsPerYear > 0) {
			const halfRange = width / 2 / pixelsPerYear;
			const newStart = filter.yearEnd - halfRange;
			const newEnd = filter.yearEnd + halfRange;

			// Clamp to min/max year range
			const clampedStart = Math.max(newStart, MIN_YEAR);
			const clampedEnd = Math.min(newEnd, MAX_YEAR);

			view.set({
				start: clampedStart,
				end: clampedEnd
			});
		}
	});

	function getX(year: number) {
		return ((year - view.current.start) / (view.current.end - view.current.start)) * width;
	}

	let startYearInt = $derived(Math.floor(view.current.start));
	let endYearInt = $derived(Math.ceil(view.current.end));

	function getCacheDiff() {
		const pointers = Array.from(pointerCache.values());
		if (pointers.length !== 2) return -1;

		const dx = Math.abs(pointers[0].clientX - pointers[1].clientX);
		const dy = Math.abs(pointers[0].clientY - pointers[1].clientY);

		return Math.hypot(dx, dy);
	}

	function onpointerdown(e: PointerEvent) {
		e.preventDefault();

		pointerCache.set(e.pointerId, e);

		if (pointerCache.size === 1) {
			lastX = e.clientX;
		} else if (pointerCache.size === 2) {
			prevDiff = getCacheDiff();
		}

		setLabelVisibility(true);
		setGridVisibility(true);
	}

	function onWindowPointerMove(e: PointerEvent) {
		if (!pointerCache.has(e.pointerId)) return;

		e.preventDefault();
		pointerCache.set(e.pointerId, e);

		if (pointerCache.size === 2) {
			const curDiff = getCacheDiff();

			if (prevDiff > 0 && curDiff > 0) {
				const scale = curDiff / prevDiff;
				let newPixelsPerYear = pixelsPerYear * scale;
				newPixelsPerYear = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newPixelsPerYear));
				pixelsPerYear = newPixelsPerYear;
			}

			prevDiff = curDiff;
		} else if (pointerCache.size === 1) {
			const dx = lastX - e.clientX;
			const currentRange = view.current.end - view.current.start;
			const yearDelta = (dx / width) * currentRange;

			const selectedYear = Math.min(
				Math.max(filter.yearEnd + yearDelta, minHistoricMapYear - 1),
				maxHistoricMapYear + 1
			);
			if (Math.floor(selectedYear) - filter.yearEnd) {
				// applyFilter(filter);
			}
			filter.yearEnd = selectedYear;

			backgroundOffsetX += dx * -0.5;
			backgroundVelocity = dx * -0.2;

			backgroundOpacity = 0.9;
			if (opacityTimeout) clearTimeout(opacityTimeout);
			lastX = e.clientX;
		}
	}

	function onWindowPointerUp(e: PointerEvent) {
		pointerCache.delete(e.pointerId);

		if (pointerCache.size < 2) prevDiff = -1;
		if (pointerCache.size === 1) {
			const remainingPointer = pointerCache.values().next().value;
			if (remainingPointer) lastX = remainingPointer.clientX;
		}
		if (pointerCache.size === 0) {
			const selectedYear = Math.round(filter.yearEnd);
			if (Math.floor(selectedYear) - filter.yearEnd) {
				applyFilter(filter);
			}
			filter.yearEnd = selectedYear;

			if (momentumTimeout) clearTimeout(momentumTimeout);
			let elapsed = 0;
			const duration = 1000;
			const startVelocity = backgroundVelocity;

			const animate = () => {
				elapsed += 16;
				const progress = Math.min(elapsed / duration, 1);
				const easeOut = 1 - (1 - progress) * (1 - progress);
				backgroundVelocity = startVelocity * (1 - easeOut);
				backgroundOffsetX += backgroundVelocity;

				if (progress < 1) {
					momentumTimeout = setTimeout(animate, 16);
				} else {
					backgroundVelocity = 0;
					momentumTimeout = null;
				}
			};
			animate();

			if (opacityTimeout) clearTimeout(opacityTimeout);
			let opacityElapsed = 0;
			const opacityDuration = 400;
			const startOpacity = backgroundOpacity;

			const fadeOpacity = () => {
				opacityElapsed += 16;
				const progress = Math.min(opacityElapsed / opacityDuration, 1);
				backgroundOpacity = startOpacity + (0.3 - startOpacity) * progress;

				if (progress < 1) {
					opacityTimeout = setTimeout(fadeOpacity, 16);
				} else {
					backgroundOpacity = 0.3;
					opacityTimeout = null;
				}
			};
			fadeOpacity();
		}

		setLabelVisibility(false);
		setGridVisibility(false);
	}

	function onwheel(e: WheelEvent) {
		e.preventDefault();
		const zoom = 1 + Math.min(Math.max(e.deltaY / 100, -0.02), 0.02);
		let newPixelsPerYear = pixelsPerYear / zoom;
		newPixelsPerYear = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newPixelsPerYear));
		pixelsPerYear = newPixelsPerYear;
	}

	let ticks = $derived.by(() => {
		let major = ''; // Elke 25 jaar
		let medium = ''; // Elke 5 jaar
		let minor = ''; // Elk jaar

		const topY = ticksOnTop ? 0 : height;
		const bottomBase = ticksOnTop ? 0 : height;

		const hMajor = 10;
		const hMedium = 10 - 5 * Math.max(0, (9 - pixelsPerYear) / 2);
		const hMinor = 5;

		for (let year = startYearInt; year <= endYearInt; year++) {
			const x = getX(year);

			if (year % 25 === 0) {
				const y2 = ticksOnTop ? hMajor : height - hMajor;
				major += `M${x},${topY} L${x},${y2} `;
			} else if (year % 5 === 0 && pixelsPerYear > 7) {
				const length = hMedium;
				const y2 = ticksOnTop ? length : height - length;
				medium += `M${x},${topY} L${x},${y2} `;
			} else if (pixelsPerYear > 3) {
				const length = hMinor;
				const y2 = ticksOnTop ? length : height - length;
				minor += `M${x},${topY} L${x},${y2} `;
			}
		}

		return { major, medium, minor };
	});

	let mapsByYear = $derived.by(() => {
		if (!historicMapsLoaded) return {};
		const mapsByYear: Record<number, HistoricMap[]> = {};
		const filteredMaps = historicMapsById
			.values()
			// .toArray()
			// .toSorted((a,b) => a.bis - b.bis)
			.filter((map) => filter.bis || !map.bis)
			.filter((map) => filter.type == map.type);
		for (const map of filteredMaps) (mapsByYear[map.yearEnd] ??= []).push(map);
		return mapsByYear;
	});

	let yearsWithMaps = $derived([...Object.keys(mapsByYear)].map((i) => +i).sort((a, b) => a - b));
	let minHistoricMapYear = $derived(yearsWithMaps ? Math.min(...yearsWithMaps) : filter.yearEnd);
	let maxHistoricMapYear = $derived(yearsWithMaps ? Math.max(...yearsWithMaps) : filter.yearEnd);
</script>

<svelte:window
	onpointermove={onWindowPointerMove}
	onpointerup={onWindowPointerUp}
	onpointercancel={onWindowPointerUp}
/>

{#if visible}
	<div
		class="fixed right-2 bottom-2 left-2 z-999 h-30 w-auto touch-none select-none"
		transition:fly={{ y: 200, duration: 250 }}
	>
		<TimelinePointer year={Math.ceil(filter.yearEnd)}></TimelinePointer>
		<div
			{onpointerdown}
			{onwheel}
			bind:clientWidth={width}
			bind:clientHeight={height}
			class="absolute h-full w-full overflow-hidden rounded-[8px] bg-[#336] bg-size-[32px]"
		>
			<div
				class="absolute inset-0 bg-[url(wave_pattern8.png)] bg-size-[auto_11px]"
				style="background-position: {backgroundOffsetX}px 0; opacity: {backgroundOpacity}; pointer-events: none;"
			></div>
			<div class="absolute top-0 left-1/2 z-998 h-full w-1/2 bg-black/33 backdrop-blur-xs"></div>
			<div
				class="absolute inset-0 z-1 h-[200px] w-full"
				style="perspective: 1000px; transform-style: preserve-3d;"
			>
				{#each yearsWithMaps as year}
					{#if year >= startYearInt && year <= endYearInt}
						{@const x = getX(year)}
						<div
							class="absolute"
							style={`left: ${x - pixelsPerYear / 2}px; top: 40px; width: ${pixelsPerYear}px; height: 120px; cursor: pointer;`}
							onclick={() => {
								if (year >= minHistoricMapYear && year <= maxHistoricMapYear) {
									filter.yearEnd = year;
								}
							}}
						></div>
						<div
							onclick={() => {
								if (year >= minHistoricMapYear && year <= maxHistoricMapYear) {
									filter.yearEnd = year;
								}
							}}
							style="cursor: pointer;"
						>
							<MapStack
								{x}
								maps={mapsByYear[year]}
								{pixelsPerYear}
								{mapsInViewport}
								{getHistoricMapThumbnail}
								selectedYear={filter.yearEnd}
							></MapStack>
						</div>
						<!-- <div
						class="absolute h-10 w-10 bg-[#f00]"
						style="
							transform: translateX({x}px) translateY({60}px) rotateX(60deg) rotateZ({0}deg);
						"
					></div> -->
					{/if}
				{/each}
			</div>
			<svg class="pointer-events-none absolute inset-0 z-999 h-full w-full cursor-grab">
				{#if pixelsPerYear > 3}
					<path
						d={ticks.minor}
						stroke={timelineTickColor}
						stroke-width="1"
						opacity={1 - (5 - pixelsPerYear) / 2}
					/>
				{/if}

				{#if pixelsPerYear > 7}
					<path
						d={ticks.medium}
						stroke={timelineTickColor}
						stroke-width="1"
						opacity={1 - (9 - pixelsPerYear) / 2}
					/>
				{/if}

				<path d={ticks.major} stroke={timelineTickColor} stroke-width="1" />

				{#each { length: endYearInt - startYearInt + 1 } as _, i}
					{@const year = startYearInt + i}
					{@const x = getX(year)}

					{#if year % 25 === 0}
						<text
							x={x - 15}
							y={ticksOnTop ? 22 : height - 12}
							font-size="12"
							font-weight="700"
							fill={timelineTickColor}
							onclick={() => {
								if (year >= minHistoricMapYear && year <= maxHistoricMapYear) {
									filter.yearEnd = year;
								}
							}}
							style="cursor: pointer; pointer-events: auto;">{year}</text
						>
					{:else if year % 5 === 0 && pixelsPerYear > 7}
						<text
							x={x - 15}
							y={ticksOnTop ? 22 : height - 12}
							font-size="12"
							fill={timelineTickColor}
							opacity={1 - (9 - pixelsPerYear) / 2}
							onclick={() => {
								if (year >= minHistoricMapYear && year <= maxHistoricMapYear) {
									filter.yearEnd = year;
								}
							}}
							style="cursor: pointer; pointer-events: auto;">{year}</text
						>
					{:else if pixelsPerYear > 35}
						<text
							x={x - 15}
							y={ticksOnTop ? 22 : height - 12}
							font-size="12"
							fill={timelineTickColor}
							opacity={1 - (38 - pixelsPerYear) / 3}
							onclick={() => {
								if (year >= minHistoricMapYear && year <= maxHistoricMapYear) {
									filter.yearEnd = year;
								}
							}}
							style="cursor: pointer; pointer-events: auto;">{year}</text
						>
					{/if}
				{/each}
			</svg>
		</div>

		<TimelineSettings
			bind:filter
			{applyFilter}
			minYear={minHistoricMapYear}
			maxYear={maxHistoricMapYear}
		></TimelineSettings>
	</div>
{/if}
