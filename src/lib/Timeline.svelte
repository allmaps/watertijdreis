<script lang="ts">
	import { Tween, Spring } from 'svelte/motion';
	import { fly, fade, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import MapThumbnail from './MapThumbnail.svelte';
	import TimelinePointer from './TimelinePointer.svelte';
	import PlayPauseButton from './PlayPauseButton.svelte';
	import MapThumbnailStack from './MapThumbnailStack.svelte';
	import { Eye, ImagesSquare, Gear } from 'phosphor-svelte';
	import { Label, Switch } from 'bits-ui';
	import TimelineSettings from './TimelineSettings.svelte';

	let {
		filter = $bindable(),
		applyFilter,
		historicMapsLoaded,
		historicMapsById,
		mapsInViewport,
		selectedHistoricMap,
		setLabelVisibility,
		getHistoricMapThumbnail,
		map
	} = $props();

	type HistoricMap = {
		id: string;
		warpedMap: WarpedMap;
		polygon: GeojsonPolygon;
		yearStart: number;
		yearEnd: number;
		edition: number;
		bis: boolean;
		number: number;
		position: string;
		x: number;
		y: number;
		type: string | undefined;
	};

	type Edition = { name: string; edition: number; bis: false; yearStart: number; yearEnd: number };

	$effect(() => {
		if (filter.yearEnd - Math.floor(selectedYear)) {
			filter.yearEnd = Math.floor(selectedYear);
			applyFilter(filter);
		}
	});

	let historicMapsByEdition: Map<number, HistoricMap[]> | undefined = $derived.by(() => {
		if (!historicMapsLoaded) return;
		const grouped = new Map<number, HistoricMap[]>();
		for (const { edition, ...rest } of historicMapsById.values())
			(grouped.get(edition) ?? grouped.set(edition, []).get(edition))!.push({ edition, ...rest });
		return grouped;
	});

	let editions = $derived.by(() => {
		if (!historicMapsLoaded) return;
		const editionMap = new Map<string, Edition>();
		for (const map of historicMapsById.values()) {
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

	let historicMapsByYear = $derived.by(() => {
		if (!historicMapsLoaded) return {};
		const mapsByYear: Record<number, HistoricMap[]> = {};
		for (const map of historicMapsById.values().filter((map) => !map.type && !map.bis))
			(mapsByYear[map.yearEnd] ??= []).push(map); // TODO: bis filter in timeline
		return mapsByYear;
	});

	let minHistoricMapYear = $derived.by(() => {
		if (!historicMapsByYear) return 1800;
		return Math.min(...Object.keys(historicMapsByYear).map((y) => +y));
	});
	let maxHistoricMapYear = $derived.by(() => {
		if (!historicMapsByYear) return 2025;
		return Math.max(...Object.keys(historicMapsByYear).map((y) => +y));
	});

	const MIN_YEAR: number = 1800;
	const MAX_YEAR: number = 2023;

	let width: number = $state(0);
	let height: number = $state(0);

	let view = $state(
		new Spring({ start: 1965 + 8, end: 2010 - 8 }, { stiffness: 0.1, damping: 0.33 })
	);
	let selectedYear = $derived((view.target.end + view.target.start) / 2);

	let timelineTickColor = $state('#eef');

	let isPanning: boolean = $state(false);
	let lastX: number = $state(0);

	function yearToX(year: number): number {
		return ((year - view.current.start) / (view.current.end - view.current.start)) * width;
	}

	function onwheel(e: WheelEvent) {
		e.preventDefault();

		const zoom = 1 + Math.min(Math.max(e.deltaY / 100, -0.2), 0.2);
		const cursor = selectedYear;
		const { start, end } = view.current;

		const newStart = cursor - (cursor - start) * zoom;
		const newEnd = cursor + (end - cursor) * zoom;

		view.target = { start: Math.max(newStart, MIN_YEAR), end: Math.min(newEnd, MAX_YEAR) };
	}

	function onpointerdown(e: PointerEvent) {
		isPanning = true;
		lastX = e.clientX;

		setLabelVisibility(true);

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

		map.triggerRepaint(); // TODO: remove
	}

	function onpointerup() {
		isPanning = false;

		setLabelVisibility(false);

		const range = view.target.end - view.target.start;
		const middle = (view.target.start + view.target.end) / 2;
		view.target = {
			start: Math.round(middle) - range / 2,
			end: Math.round(middle) + range / 2
		};

		window.removeEventListener('pointermove', onpointermove);
		window.removeEventListener('pointerup', onpointerup);
	}

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
		if (v) {
			clearAll();
			selectedRegulier = true;
		} else {
			selectedRegulier = false;
			selectedBIS = false;
		}
	}

	function toggleBIS(v: boolean) {
		if (!selectedRegulier) return;
		selectedBIS = v;
	}

	function toggleHWP(v: boolean) {
		if (v) {
			clearAll();
			selectedHWP = true;
		} else {
			selectedHWP = false;
		}
	}

	function toggleWVE(v: boolean) {
		if (v) {
			clearAll();
			selectedWVE = true;
		} else {
			selectedWVE = false;
		}
	}

	let ticksTop = true;
</script>

{#if !selectedHistoricMap}
	<div
		transition:fly={{ y: 100, duration: 250 }}
		class="touch-action-none absolute bottom-[15px] left-[10px] z-998 h-[120px] w-[calc(100%-20px)] touch-none overflow-visible rounded-[8px] shadow-md"
		style:background={'#336'}
		bind:clientWidth={width}
		bind:clientHeight={height}
		{onwheel}
		{onpointerdown}
		{onpointermove}
		{onpointerup}
	>
		<TimelinePointer year={Math.ceil(selectedYear)}></TimelinePointer>

		<div class="absolute bottom-0.5 left-1/2 z-[20000] -translate-x-1/2">
			<PlayPauseButton />
		</div>

		<!-- <div
			class="map-markers"
			style="position: absolute; inset: 0; perspective: 600px; transform-style: preserve-3d; z-index: 1; overflow-x: hidden; overflow-y: visible"
		>
			{#each mapViewer?.historicMaps as map, i}
				{@const height =
					mapViewer?.historicMaps.slice(0, i).filter((m) => m.yearStart == map.yearStart).length *
						-3 +
					40 +
					(map.yearStart % 2) * 1}
				{@const visible = mapViewer.historicMapsInViewport.has(map.id)}

				<MapThumbnail x={yearToX(map.yearStart) - 25} y={height} src={map.thumbnailUrl}
				></MapThumbnail>
			{/each}
		</div> -->
		<div
			class="absolute inset-0 z-1 h-[200px] w-full overflow-y-visible"
			style="perspective: 1000px; transform-style: preserve-3d;"
		>
			{#each Object.entries(historicMapsByYear) as [year, maps]}
				{#if +year + 1 >= view.current.start && +year - 1 <= view.current.end}
					<MapThumbnailStack
						x={yearToX(+year)}
						{maps}
						{year}
						{selectedYear}
						{getHistoricMapThumbnail}
					></MapThumbnailStack>
				{/if}
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
						y1={ticksTop ? 0 : height}
						x2={yearToX(year)}
						y2={ticksTop ? 10 : height - 10}
						stroke={timelineTickColor}
						stroke-width="1"
					/>
					<text
						x={yearToX(year) - 15}
						y={ticksTop ? 22 : height - 12}
						font-size="12"
						font-weight="700"
						fill={timelineTickColor}>{year}</text
					>
				{:else if year % 5 === 0 && pixelsPerYear > 7}
					<line
						x1={yearToX(year)}
						y1={ticksTop ? 0 : height}
						x2={yearToX(year)}
						y2={ticksTop
							? 10 - 5 * Math.max(0, (9 - pixelsPerYear) / 2)
							: height - 10 + 5 * Math.max(0, (9 - pixelsPerYear) / 2)}
						stroke={timelineTickColor}
						stroke-width="1"
					/>
					<text
						x={yearToX(year) - 15}
						y={ticksTop ? 22 : height - 12}
						font-size="12"
						fill={timelineTickColor}
						opacity={1 - (9 - pixelsPerYear) / 2}
					>
						{year}
					</text>
				{:else if pixelsPerYear > 35}
					<text
						x={yearToX(year) - 15}
						y={ticksTop ? 22 : height - 12}
						font-size="12"
						fill={timelineTickColor}
						opacity={1 - (38 - pixelsPerYear) / 3}
					>
						{year}
					</text>
				{/if}
				{#if pixelsPerYear > 3}
					<line
						x1={yearToX(year)}
						y1={ticksTop ? 0 : height}
						x2={yearToX(year)}
						y2={ticksTop ? 5 : height - 5}
						stroke={timelineTickColor}
						stroke-width="1"
						opacity={1 - (5 - pixelsPerYear) / 2}
					/>
				{/if}
			{/each}
			<rect
				x={yearToX((view.current.end + view.current.start) / 2)}
				y={0}
				width={width / 2}
				{height}
				fill="url(#gradient-left)"
			></rect>
			<defs>
				<linearGradient id="gradient-left" x1="0%" y1="0%" x2="100%" y2="0%">
					<stop offset="0%" style="stop-color:#336; stop-opacity:.9" />
					<stop offset="100%" style="stop-color:#336; stop-opacity:0" />
				</linearGradient>
			</defs>

			{#if editions}
				{#each editions.filter((i) => !i.bis) as ed, i}
					{@const height = i % 2 == 0 ? (false ? 30 : 90) : false ? 35 : 85}
					{@const start = yearToX(ed.yearStart)}
					{@const middle = yearToX((ed.yearStart + ed.yearEnd) / 2)}
					{@const end = yearToX(ed.yearEnd)}
					<line
						x1={start}
						y1={height}
						x2={start}
						y2={height + (ticksTop ? 8 : -8)}
						stroke="#eeeeff88"
						stroke-width="1"
					></line>
					<line
						x1={start}
						y1={height}
						x2={middle - 25}
						y2={height}
						stroke="#eeeeff88"
						stroke-width="1"
					></line>
					<line
						x1={middle + 25}
						y1={height}
						x2={end}
						y2={height}
						stroke="#eeeeff88"
						stroke-width="1"
					></line>
					<text
						x={middle}
						y={height + 3}
						font-size="12"
						font-weight="600"
						fill="#eeeeff88"
						text-anchor="middle"
					>
						{ed.name}</text
					>
					<line
						x1={end}
						y1={height}
						x2={end}
						y2={height + (ticksTop ? 8 : -8)}
						stroke="#eeeeff88"
						stroke-width="1"
					></line>
				{/each}
			{/if}
		</svg>

		<TimelineSettings {showSettings} {toggleSettings}>
			<ul class="flex flex-col gap-2 text-sm text-[#333366]">
				<li
					class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-gray-50"
				>
					Ondergrens jaar:
					<input
						type="number"
						min={MIN_YEAR}
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
{/if}
