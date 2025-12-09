<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { Spring } from 'svelte/motion';
	import { HandSwipeRight, HandGrabbing } from 'phosphor-svelte';
	import TimelinePointer from './TimelinePointer.svelte';
	import MapStack from './MapStack.svelte';
	import TimelineSettings from './TimelineSettings.svelte';

	let {
		visible,
		historicMapsLoaded,
		historicMapsById,
		mapsInViewport,
		hoveredHistoricMap,
		getHistoricMapThumbnail,
		filter = $bindable(),
		applyFilter,
		setLabelVisibility
	} = $props();

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
	let pointerDownX = 0;
	let pointerDownY = 0;
	let hasMoved = false;

	let showHint = $state(false);
	let isDismissing = $state(false);
	let hintTimeout: ReturnType<typeof setTimeout> | null = null;
	let handIconType = $state<'swipe' | 'grab'>('swipe');
	let handAnimationState = $state<'still' | 'oscillate' | 'slide'>('still');

	$effect(() => {
		if (typeof window !== 'undefined') {
			showHint = true;
			handIconType = 'swipe';
			handAnimationState = 'still';

			const grabTimeout = setTimeout(() => {
				handIconType = 'grab';
				handAnimationState = 'oscillate';
			}, 3000);

			const slideTimeout = setTimeout(() => {
				handAnimationState = 'slide';
			}, 5000);

			hintTimeout = setTimeout(() => {
				dismissHint();
			}, 8000);

			return () => {
				clearTimeout(grabTimeout);
				clearTimeout(slideTimeout);
				if (hintTimeout) clearTimeout(hintTimeout);
			};
		}
	});

	function dismissHint() {
		if (hintTimeout) {
			clearTimeout(hintTimeout);
			hintTimeout = null;
		}
		isDismissing = true;
		setTimeout(() => {
			showHint = false;
			isDismissing = false;
		}, 500);
	}

	const FILTER_UPDATES_PER_SEC = 4;
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

	$effect(() => {
		if (width > 0 && pixelsPerYear > 0) {
			const halfRange = width / 2 / pixelsPerYear;
			const newStart = filter.yearEnd - halfRange;
			const newEnd = filter.yearEnd + halfRange;

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

	let filterUpdateInterval = null;
	let scheduledFilterUpdate = null;

	function onpointerdown(e: PointerEvent) {
		e.preventDefault();

		if (showHint) {
			dismissHint();
		}

		pointerCache.set(e.pointerId, e);

		if (pointerCache.size === 1) {
			lastX = e.clientX;
			pointerDownX = e.clientX;
			pointerDownY = e.clientY;
			hasMoved = false;
		} else if (pointerCache.size === 2) {
			prevDiff = getCacheDiff();
		}

		filterUpdateInterval = setInterval(() => {
			if (scheduledFilterUpdate) scheduledFilterUpdate();
		}, 1000 / FILTER_UPDATES_PER_SEC);

		setLabelVisibility(true);
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
			const dy = pointerDownY - e.clientY;

			if (Math.abs(e.clientX - pointerDownX) > 5 || Math.abs(dy) > 5) {
				hasMoved = true;
				setLabelVisibility(true);
			}

			const currentRange = view.current.end - view.current.start;
			const yearDelta = (dx / width) * currentRange;

			const selectedYear = Math.min(
				Math.max(filter.yearEnd + yearDelta, minHistoricMapYear - 1),
				maxHistoricMapYear + 1
			);
			if (Math.floor(selectedYear) - filter.yearEnd) {
				scheduledFilterUpdate = applyFilter.bind(this, filter);
			}
			filter.yearEnd = selectedYear;
			// if (hasMoved) {
			// 	applyFilter(filter);
			// }

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
				scheduledFilterUpdate = applyFilter.bind(this, filter);
			}
			filter.yearEnd = selectedYear;

			if (scheduledFilterUpdate) scheduledFilterUpdate();
			if (filterUpdateInterval) clearInterval(filterUpdateInterval);

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
	}

	function onwheel(e: WheelEvent) {
		e.preventDefault();
		const zoom = 1 + Math.min(Math.max(e.deltaY / 100, -0.08), 0.08);
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

	let filteredMaps = $derived(
		historicMapsById
			.values()
			// .toArray()
			// .toSorted((a,b) => a.bis - b.bis)
			.filter((map) => filter.edition === 'All' || filter.edition === map.edition)
			.filter((map) => filter.bis || !map.bis)
			.filter((map) => filter.type == map.type)
			.toArray()
	);

	let mapsByYear = $derived.by(() => {
		if (!historicMapsLoaded) return {};
		const mapsByYear: Record<number, HistoricMap[]> = {};
		for (const map of filteredMaps) (mapsByYear[map.yearEnd] ??= []).push(map);
		return mapsByYear;
	});

	let editions = $derived.by(() => {
		if (!historicMapsLoaded) return;
		const editionMap = new Map<string, Edition>();
		for (const map of filteredMaps) {
			const key = `${map.edition}-${map.bis}`;
			let ed = editionMap.get(key);
			if (!ed) {
				ed = {
					name: `Editie ${map.edition}` + (map.bis ? ' (bis)' : ''),
					edition: map.edition,
					bis: map.bis,
					yearStart: map.yearEnd,
					yearEnd: map.yearEnd
				};
				editionMap.set(key, ed);
			} else {
				ed.yearStart = Math.min(map.yearEnd, ed.yearStart);
				ed.yearEnd = Math.max(map.yearEnd, ed.yearEnd);
			}
		}
		return Array.from(editionMap.values());
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
		class="fixed right-2 bottom-2 left-2 z-999 h-30 w-auto cursor-pointer touch-none select-none"
	>
		<TimelinePointer year={Math.ceil(filter.yearEnd)}></TimelinePointer>

		{#if showHint}
			<div class="pointer-events-none absolute inset-0 z-[10001] flex items-center justify-center">
				<div
					class="absolute top-1/2 left-0 -translate-y-1/2"
					in:fly={{ y: 20, duration: 200 }}
					out:fade={{ duration: 190 }}
				>
					<div
						class="text-[#336]"
						style="animation: {handAnimationState === 'oscillate'
							? 'oscillate 4s ease-in-out forwards'
							: handAnimationState === 'slide'
								? 'slideAcross 3s ease-in-out forwards'
								: 'none'};"
					>
						{#if handIconType === 'swipe'}
							<HandSwipeRight size={32} color="#eef" weight="duotone" />
						{:else}
							<HandGrabbing size={32} color="#eef" weight="duotone" />
						{/if}
					</div>
				</div>

				<div
					class="translate-y-8 rounded-[8px] border-2 border-[#33336611] bg-[#eef]/70 px-4 py-2 text-center text-[14px] font-[500] text-[#336] shadow-[0_2px_2px_rgba(0,0,0,0.05)] shadow-lg backdrop-blur-md"
					in:fly={{ y: 20, duration: 250 }}
					out:fly={{ y: 20, duration: 250 }}
				>
					<span>Sleep de tijdlijn om door de tijd te reizen!</span>
				</div>
			</div>
		{/if}

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
				class="pointer-events-none absolute top-0 left-0 z-1000 h-full w-1/6 bg-gradient-to-r from-[#225] to-transparent"
			></div>
			<div
				class="pointer-events-none absolute top-0 right-0 z-1000 h-full w-1/6 bg-gradient-to-l from-[#225] to-transparent"
			></div>

			<div
				class="absolute inset-0 z-1 h-[200px] w-full"
				style="perspective: 1000px; transform-style: preserve-3d;"
			>
				{#each yearsWithMaps as year}
					{#if year >= startYearInt && year <= endYearInt}
						{@const x = getX(year)}
						<MapStack
							{x}
							maps={mapsByYear[year]}
							{pixelsPerYear}
							{mapsInViewport}
							{getHistoricMapThumbnail}
							{hoveredHistoricMap}
							selectedYear={filter.yearEnd}
						></MapStack>
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
				<defs>
					<filter id="hardShadow" x="-50%" y="-50%" width="200%" height="200%">
						<feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="1" />
					</filter>
				</defs>

				<rect
					x="0"
					y="0"
					{width}
					{height}
					fill="transparent"
					style="cursor: pointer; pointer-events: auto;"
					onclick={(e) => {
						if (hasMoved) return;

						const rect = e.currentTarget.getBoundingClientRect();
						const clickX = e.clientX - rect.left;
						const clickedYear =
							view.current.start + (clickX / width) * (view.current.end - view.current.start);
						const roundedYear = Math.round(clickedYear);
						if (roundedYear >= minHistoricMapYear && roundedYear <= maxHistoricMapYear) {
							filter.yearEnd = roundedYear;
						}
					}}
				/>
				{#if pixelsPerYear > 3}
					<path
						d={ticks.minor}
						stroke="#eeeeff88"
						stroke-width="1.5"
						opacity={1 - (5 - pixelsPerYear) / 2}
					/>
				{/if}

				{#if pixelsPerYear > 7}
					<path
						d={ticks.medium}
						stroke="#eeeeff88"
						stroke-width="1.5"
						opacity={1 - (9 - pixelsPerYear) / 2}
					/>
				{/if}

				<path d={ticks.major} stroke="#eeeeff88" stroke-width="1.5" />

				{#each { length: endYearInt - startYearInt + 1 } as _, i}
					{@const year = startYearInt + i}
					{@const x = getX(year)}

					{#if year % 25 === 0}
						<text
							x={x - 12}
							y={ticksOnTop ? 22 : height - 12}
							font-family="ivypresto-display"
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
							x={x - 12}
							y={ticksOnTop ? 22 : height - 12}
							font-family="ivypresto-display"
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
							x={x - 12}
							y={ticksOnTop ? 22 : height - 12}
							font-family="ivypresto-display"
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

				{#if editions}
					{#each editions as ed, i}
						{@const height = i % 2 == 0 ? 110 : 108}
						{@const start = getX(ed.yearStart)}
						{@const middle = getX((ed.yearStart + ed.yearEnd) / 2)}
						{@const end = getX(ed.yearEnd)}
						<g filter="url(#hardShadow)">
							<line
								x1={start}
								y1={height}
								x2={start}
								y2={height - 5}
								stroke="#eeeeff88"
								stroke-width="1"
								opacity="0.4"
							></line>
							<line
								x1={start}
								y1={height}
								x2={middle - 25}
								y2={height}
								stroke="#eeeeff88"
								stroke-width="1"
								opacity="0.4"
							></line>
							<line
								x1={middle + 25}
								y1={height}
								x2={end}
								y2={height}
								stroke="#eeeeff88"
								stroke-width="1"
								opacity="0.4"
							></line>
							<text
								x={middle}
								y={height + 4}
								font-size="12"
								font-weight="600"
								fill="#eeeeff88"
								text-anchor="middle"
								style="text-shadow: black; pointer-events: none; "
							>
								{ed.name}</text
							>
							<line
								x1={end}
								y1={height}
								x2={end}
								y2={height - 5}
								stroke="#eeeeff88"
								stroke-width="1"
								opacity="0.4"
							></line>
						</g>
					{/each}
				{/if}
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

<style>
	:global {
		@keyframes oscillate {
			0% {
				transform: translateX(0);
			}
			25% {
				transform: translateX(80px);
			}
			50% {
				transform: translateX(0);
			}
			75% {
				transform: translateX(80px);
			}
			100% {
				transform: translateX(0);
			}
		}

		@keyframes slideAcross {
			0% {
				transform: translateX(0);
				opacity: 1;
			}
			90% {
				opacity: 1;
			}
			100% {
				transform: translateX(100vw);
				opacity: 0;
			}
		}
	}
</style>
