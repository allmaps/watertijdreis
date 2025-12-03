<script lang="ts">
	import { fly } from 'svelte/transition';
	import { Spring } from 'svelte/motion';
	import TimelinePointer from './TimelinePointer.svelte';
	import MapStack from './MapStack.svelte';
	import { Label, Switch } from 'bits-ui';
	import TimelineSettings from './TimelineSettings.svelte';

	let {
		historicMapsLoaded,
		historicMapsById,
		mapsInViewport,
		getHistoricMapThumbnail,
		filter = $bindable(),
		applyFilter
	} = $props();

	$effect(() => {
		if (filter.yearEnd - Math.floor(selectedYear)) {
			filter.yearEnd = Math.floor(selectedYear);
			applyFilter(filter);
		}
	});

	let width = $state(0);
	let height = $state(120);
	let selectedYear = $state(1980);
	let pixelsPerYear = $state(50);

	let pointerCache = new Map<number, PointerEvent>();
	let prevDiff = -1;
    let lastX = 0;

	const MIN_ZOOM = 5;
	const MAX_ZOOM = 200;
	const timelineTickColor = '#eef';
	const ticksOnTop = true;

	let view = new Spring(
		{
			start: 1977,
			end: 1983
		},
		{ stiffness: 0.1, damping: 0.25 }
	);

	$effect(() => {
		if (width > 0 && pixelsPerYear > 0) {
			const halfRange = width / 2 / pixelsPerYear;
			view.set({
				start: selectedYear - halfRange,
				end: selectedYear + halfRange
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
        }
        
        else if (pointerCache.size === 1) {
            const dx = lastX - e.clientX;
            const currentRange = view.current.end - view.current.start;
            const yearDelta = (dx / width) * currentRange;

            selectedYear = Math.min(
                Math.max(selectedYear + yearDelta, minHistoricMapYear - 1),
                maxHistoricMapYear + 1
            );
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
		    selectedYear = Math.round(selectedYear);
        }
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
		const filteredMaps = historicMapsById.values()
			.filter(map => filter.bis || !map.bis)
			.filter(map => filter.type == map.type)
		for (const map of filteredMaps) (mapsByYear[map.yearEnd] ??= []).push(map);
		return mapsByYear;
	});

	let yearsWithMaps = $derived([...Object.keys(mapsByYear)].map((i) => +i).sort((a, b) => a - b));
	let minHistoricMapYear = $derived(yearsWithMaps ? Math.min(...yearsWithMaps) : selectedYear);
	let maxHistoricMapYear = $derived(yearsWithMaps ? Math.max(...yearsWithMaps) : selectedYear);

	let selectedRegulier = $state(true);
	let selectedBIS = $state(false);
	let selectedHWP = $state(false);
	let selectedWVE = $state(false);
	let selectedOption = $state('');
	let showSettings = $state(false);
	function toggleSettings() {
		showSettings = !showSettings;
	}

	function clearAll() {
		selectedRegulier = false;
		selectedBIS = false;
		selectedHWP = false;
		selectedWVE = false;
	}

	function toggleRegulier(v: boolean) {
		if(selectedRegulier !== v) {
			filter.type = undefined;
			applyFilter(filter);
		}
		if (v) {
			clearAll();
			selectedRegulier = true;
		} else {
			selectedRegulier = false;
			if(selectedBIS) {
				filter.bis = false;
				applyFilter(filter);
			}
			selectedBIS = false;
		}
	}

	function toggleBIS(v: boolean) {
		if (!selectedRegulier) return;
		if(selectedBIS !== v) {
			filter.bis = v;
			applyFilter(filter);
		}
		selectedBIS = v;
	}

	function toggleHWP(v: boolean) {
		if(selectedHWP !== v) {
			filter.type = "HWP";
			applyFilter(filter);
		}
		if (v) {
			clearAll();
			selectedHWP = true;
		} else {
			selectedHWP = false;
		}
	}

	function toggleWVE(v: boolean) {
		if(selectedWVE !== v) {
			filter.type = "WVE";
			applyFilter(filter);
		}
		if (v) {
			clearAll();
			selectedWVE = true;
		} else {
			selectedWVE = false;
		}
	}
</script>

<svelte:window
	onpointermove={onWindowPointerMove}
	onpointerup={onWindowPointerUp}
	onpointercancel={onWindowPointerUp}
/>

<div 
class="fixed right-2 bottom-2 left-2 z-999 h-30 w-auto touch-none select-none"
transition:fly={{ y: 200, duration: 250 }}
>
	<TimelinePointer year={Math.ceil(selectedYear)}></TimelinePointer>
	<div
		{onpointerdown}
		{onwheel}
		bind:clientWidth={width}
		bind:clientHeight={height}
		class="absolute h-full w-full overflow-hidden rounded-[8px] bg-[#336]"
	>
		<div class="absolute top-0 left-1/2 z-998 h-full w-1/2 bg-black/33 backdrop-blur-xs"></div>
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
						{selectedYear}
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
		<svg class="absolute inset-0 z-999 h-full w-full cursor-grab">
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
						fill={timelineTickColor}>{year}</text
					>
				{:else if year % 5 === 0 && pixelsPerYear > 7}
					<text
						x={x - 15}
						y={ticksOnTop ? 22 : height - 12}
						font-size="12"
						fill={timelineTickColor}
						opacity={1 - (9 - pixelsPerYear) / 2}>{year}</text
					>
				{:else if pixelsPerYear > 35}
					<text
						x={x - 15}
						y={ticksOnTop ? 22 : height - 12}
						font-size="12"
						fill={timelineTickColor}
						opacity={1 - (38 - pixelsPerYear) / 3}>{year}</text
					>
				{/if}
			{/each}
		</svg>
	</div>

	<TimelineSettings {showSettings} {toggleSettings}>
		<ul class="flex flex-col gap-2 text-sm text-[#333366]">
			<li
				class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-gray-50"
			>
				Ondergrens jaar:
				<input
					type="number"
					min={minHistoricMapYear - 1}
					max={Math.floor(selectedYear)}
					bind:value={filter.yearStart}
					onchange={() => {
						applyFilter(filter);
					}}
					class="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
				/>
			</li>
			<li class="flex items-center justify-between rounded-md px-2 py-1 hover:bg-gray-50">
				Reguliere Waterstaatskaarten

				<Switch.Root
					checked={selectedRegulier}
					onCheckedChange={toggleRegulier}
					class="
	relative inline-flex h-[22px]
	w-[40px] cursor-pointer
	items-center rounded-full
	bg-gray-300 px-[2px]
	transition-colors data-[state=checked]:bg-[#ff66aa]
"
				>
					<Switch.Thumb
						class="
		block
		h-[18px] w-[18px]
		translate-x-0 cursor-pointer
		rounded-full bg-white
		transition-transform
		duration-200 data-[state=checked]:translate-x-[18px]
	"
					/>
				</Switch.Root>
			</li>

			<li
				class="
	flex cursor-pointer items-center justify-between rounded-md px-2 py-1
	pl-5 transition
	{selectedRegulier
					? 'text-[#333366] hover:bg-gray-100'
					: 'cursor-not-allowed text-gray-300 opacity-80'}
"
			>
				BIS-edities

				<label
					class="
		flex items-center gap-2
		{selectedRegulier ? 'cursor-pointer' : 'pointer-events-none cursor-not-allowed'}
	"
				>
					<input
						type="checkbox"
						checked={selectedBIS}
						onchange={(e) => toggleBIS(e.target.checked)}
						disabled={!selectedRegulier}
						class="
			h-4 w-4 rounded border-gray-300 text-[#fff]
			{selectedRegulier ? 'cursor-pointer' : 'opacity-80'}

			accent-[#f4a]
		"
					/>
				</label>
			</li>

			<li
				class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-gray-50"
			>
				Hydrologische Waarnemingspunten

				<Switch.Root
					checked={selectedHWP}
					onCheckedChange={toggleHWP}
					class="
	relative inline-flex h-[22px]
	w-[40px] cursor-pointer
	items-center rounded-full
	bg-gray-300 px-[2px]
	transition-colors data-[state=checked]:bg-[#ff66aa]
"
				>
					<Switch.Thumb
						class="
		block
		h-[18px] w-[18px]
		translate-x-0 cursor-pointer
		rounded-full bg-white
		transition-transform
		duration-200 data-[state=checked]:translate-x-[18px] 
	"
					/>
				</Switch.Root>
			</li>

			<li
				class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-gray-50"
			>
				Watervoorzieningseenheden

				<Switch.Root
					checked={selectedWVE}
					onCheckedChange={toggleWVE}
					class="
	relative inline-flex h-[22px]
	w-[40px] cursor-pointer
	items-center rounded-full
	bg-gray-300 px-[2px]
	transition-colors  data-[state=checked]:bg-[#ff66aa]
"
				>
					<Switch.Thumb
						class="
		block
		h-[18px] w-[18px]
		translate-x-0 cursor-pointer
		rounded-full bg-white
		transition-transform
		duration-200 data-[state=checked]:translate-x-[18px]
	"
					/>
				</Switch.Root>
			</li>
		</ul>
	</TimelineSettings>
</div>
