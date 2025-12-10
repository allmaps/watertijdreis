<script lang="ts">
	import * as turf from '@turf/turf';
	import {
		ImagesSquare,
		ArrowSquareOut,
		Copy,
		Check,
		CaretCircleDown,
		CaretDown,
		Info,
		ShareFat,
		ArrowBendDownRight,
		ArrowBendDownLeft,
		X
	} from 'phosphor-svelte';
	import { fly, scale, draw, fade, slide } from 'svelte/transition';
	import type { HistoricMap } from './types/historicmap';

	const MANIFEST_URL = 'https://tu-delft-heritage.github.io/watertijdreis-data/collection.json';
	let manifestCollection: any | null = $state(null);

	$effect(() => {
		fetch(MANIFEST_URL)
			.then((res) => res.json())
			.then((data) => (manifestCollection = data));
	});

	async function getEditionManifest(edition: number, bis: boolean) {
		if (!manifestCollection) return null;

		const label = `Editie ${edition}${bis ? ' BIS' : ''}`;
		const manifestUrl = manifestCollection.items.find((i: any) => i?.label?.nl?.[0] === label)?.id;

		const response = await fetch(manifestUrl);
		const result = await response.json();
		return result;
	}

	let {
		warpedMapLayer,
		historicMapsById,
		visibleHistoricMapsInViewport,
		viewportPolygon,
		clickedHistoricMap,
		selectedHistoricMap,
		changeHistoricMapView,
		getHistoricMapThumbnail
	} = $props();

	let historicMap = $derived.by(() => {
		return (
			selectedHistoricMap ||
			clickedHistoricMap ||
			(visibleHistoricMapsInViewport.size == 1
				? visibleHistoricMapsInViewport.values().next().value
				: null)
		);
	});

	let preview = $derived(!selectedHistoricMap);

	let prevEdition: number | null = null;
	let prevBis: boolean | null = null;

	let editionManifest = $state(null);
	let editionManifestLoading = $state(null);

	let canvasManifest = $derived(
		historicMap && editionManifest
			? editionManifest.items.find((i) => i.id == historicMap.manifestId)
			: null
	);

	let variants = $derived.by(() => {
		if (!canvasManifest || !editionManifest) return [];
		const structure = editionManifest.structures.find((s) =>
			s.items.find((i) => i.id == canvasManifest.id)
		);
		return structure.items.map((i) => editionManifest.items.find((j) => j.id == i.id));
	});

	// TODO: dit kan makkelijker?
	let mainSheet = $derived.by(() => {
		if (!variants) return null;
		const mainVariant = variants.find((i) => !getMetadata(i).flat().includes('Type'));
		if (!mainVariant) return null;
		return historicMapsById.values().find((i) => i.manifestId == mainVariant.id);
	});

	$effect(() => {
		if (!historicMap) return;
		if (historicMap.edition !== prevEdition || historicMap.bis !== prevBis) {
			prevEdition = historicMap.edition;
			prevBis = historicMap.bis;

			editionManifestLoading = getEditionManifest(historicMap.edition).then((data) => {
				editionManifestLoading = null;
				editionManifest = data || null;
			});
		}
	});

	function getMetadata(m = canvasManifest, lang = 'nl') {
		return m.metadata.map((i) => {
			const label = i.label[lang] ?? i.label.en ?? i.label.none;
			const value = i.value[lang] ?? i.value.en ?? i.value.none;

			return [label?.[0], value?.[0]];
		});
	}

	function getViewportRectWithinHistoricMap(historicMap) {
		if (!viewportPolygon) return;

		const [minX, minY, maxX, maxY] = historicMap.geoFullMaskBbox;

		const vpBbox = turf.bbox(viewportPolygon);
		const [vMinX, vMinY, vMaxX, vMaxY] = vpBbox;

		const width = maxX - minX;
		const height = maxY - minY;

		const left = (vMinX - minX) / width;
		const top = (maxY - vMaxY) / height;
		const right = (vMaxX - minX) / width;
		const bottom = (maxY - vMinY) / height;

		return {
			leftPct: left * 100,
			topPct: top * 100,
			widthPct: (right - left) * 100,
			heightPct: (bottom - top) * 100
		};
	}

	async function setClipboard(text) {
		const type = 'text/plain';
		const clipboardItemData = {
			[type]: text
		};
		const clipboardItem = new ClipboardItem(clipboardItemData);
		await navigator.clipboard.write([clipboardItem]);
		copySuccess = true;
	}

	let copySuccess: boolean = $state(false);
	$effect(() => {
		if (copySuccess) {
			const timeout = setTimeout(() => {
				copySuccess = false;
			}, 1000);
			return () => clearTimeout(timeout);
		}
	});

	async function addFakeGeoreferencedMap(canvasManifest) {
		const { id, height, width } = canvasManifest;

		const mainWarpedMap = warpedMapLayer.getWarpedMap(mainSheet.id);
		const [minLng, minLat, maxLng, maxLat] = mainWarpedMap.geoFullMaskBbox;
		const annotation = {
			'@context': 'https://schemas.allmaps.org/map/2/context.json',
			type: 'GeoreferencedMap',
			id: id,
			resource: {
				id: canvasManifest.items[0]?.items[0]?.body?.service[0]?.id,
				width: width,
				height: height,
				type: 'ImageService2',
				tiles: [
					{
						width: 256,
						height: 256,
						scaleFactors: [1, 2, 4, 8, 16, 32]
					}
				]
			},
			gcps: [
				{
					resource: [0, 0],
					geo: [minLng + 0.5, maxLat]
				},
				{
					resource: [width, 0],
					geo: [maxLng + 0.5, maxLat]
				},
				{
					resource: [width, height],
					geo: [maxLng + 0.5, minLat]
				},
				{
					resource: [0, height],
					geo: [minLng + 0.5, minLat]
				}
			],
			resourceMask: [
				[0, height],
				[width, height],
				[width, 0],
				[0, 0]
			],
			transformation: {
				type: 'straight'
			}
		};

		await warpedMapLayer.addGeoreferencedMap(annotation);
		const warpedMap = warpedMapLayer.getWarpedMap(id);
		const coordinates = [warpedMap?.geoMask.concat([warpedMap?.geoMask[0]])];
		const historicMap: HistoricMap = {
			...mainSheet,
			id,
			manifestId: id,
			polygon: {
				type: 'Polygon',
				coordinates
			},
			type: 'Achterkant',
			geoFullMaskBbox: warpedMap?.geoFullMaskBbox
		};
		historicMapsById.set(id, historicMap);

		changeHistoricMapView(historicMap);
	}

	let closed = $state(false);

	let visible = $derived(clickedHistoricMap || selectedHistoricMap);

	let thumbnailEl = $state(null);
	$effect(() => {
		if (historicMap && thumbnailEl) {
			thumbnailEl.style.transform = `scale(${historicMap ? 100 : 25}%) translate(${historicMap ? 0 : -30}px,0px) rotateX(${historicMap ? 0 : 60}deg) rotateY(${historicMap ? 0 : 0}deg)`;
			thumbnailEl.style.opacity = 1;
		}
	});

	let sheetInformationVisible = $state(true);

	function toggleSheetInformation() {
		sheetInformationVisible = !sheetInformationVisible;
	}

	let isMobile = $state(false);
	$effect(() => {
		isMobile = window.innerWidth < 768;
		const handleResize = () => {
			isMobile = window.innerWidth < 768;
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	$effect(() => {
		if (!selectedHistoricMap) {
			sheetInformationVisible = false;
		} else {
			sheetInformationVisible = !isMobile;
		}
	});
</script>

{#if historicMap}
	{@const imageSrc = getHistoricMapThumbnail(historicMap.id, 256)}

	<div
		class="
			fixed right-2 bottom-2 left-2 z-[1000] h-30 overflow-hidden rounded-[8px] shadow-lg
			md:right-auto md:w-auto md:max-w-[400px] md:min-w-[330px]
		"
		class:bg-[#336]={selectedHistoricMap}
		class:bg-gradient-to-r={!selectedHistoricMap}
		class:from-[#336]={!selectedHistoricMap}
		class:from-70%={!selectedHistoricMap}
		class:to-transparent={!selectedHistoricMap}
		transition:fade={{ duration: 500 }}
	>
		<div class="flex h-full items-stretch gap-3">
			{#key historicMap}
				<div
					class="pointer-events-none flex-shrink-0 p-4 pr-1"
					style="transform-style: preserve-3d; perspective: 100px"
				>
					<div
						bind:this={thumbnailEl}
						class="aspect-[1.2426791958/1] h-full w-fit origin-[10%_100%] overflow-hidden opacity-0 shadow-md transition-all delay-300 duration-500 will-change-transform"
						style:transform={`translate(${-30}px,0px) rotateX(${60}deg) scale(25%)`}
					>
						{#await getHistoricMapThumbnail(historicMap.id, 256)}
							<div class="scale block h-full w-auto bg-[hsl(44deg,46%,90%)]"></div>
						{:then src}
							<img alt="" class="block h-full w-auto scale-[1.04] object-cover" {src} />
						{/await}
						{#if historicMap && viewportPolygon}
							{@const { leftPct, topPct, widthPct, heightPct } =
								getViewportRectWithinHistoricMap(historicMap)}

							<div
								class="pointer-events-none absolute rounded-[4px] border-[4px] border-[#33336666]"
								style="left: {leftPct}%; top: {topPct}%; width: {widthPct}%; height: {heightPct}%;"
							></div>
						{/if}
					</div>
				</div>
			{/key}

			{#key historicMap}
				<div
					class="flex w-max flex-shrink-0 flex-col items-start justify-center gap-1"
					in:fly|global={{ x: -20 }}
				>
					<h1 class="text-[16px] font-bold text-[#eef]">
						{historicMap ? historicMap.label : '...'}
					</h1>
					<p class="text-[14px] font-[500] text-[#eeeeff]">
						{historicMap?.yearEnd} &middot; Editie {historicMap?.edition}{historicMap?.bis
							? ' BIS'
							: ''}
					</p>

					{#if selectedHistoricMap}
						<button
							onclick={toggleSheetInformation}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									toggleSheetInformation();
								}
							}}
							class="mt-2 flex items-center gap-2 rounded-lg border-[#eef] bg-[#3a3a6a] px-4 py-2 text-[14px] font-[600] text-[#eef] shadow-md transition-colors hover:cursor-pointer hover:bg-[#4a4a7a]"
						>
							<Info color="#eef" size={18} />
							<span>Bladinformatie</span>
						</button>
					{/if}
				</div>
			{/key}
		</div>
	</div>

	{#if selectedHistoricMap && canvasManifest && editionManifest}
		{@const metadata = getMetadata(canvasManifest)}
		{@const editionMetadata = getMetadata(editionManifest)}
		{@const collectionId = 'https://tu-delft-heritage.github.io/watertijdreis-data/collection.json'}
		{@const manifestId = editionManifest.id}
		{@const homepageUrl = editionManifest.rendering[0].id}

		<div
			class="fixed z-[1001] flex flex-col gap-4 overflow-y-auto rounded-lg bg-[#333366] shadow-lg transition-all duration-300"
			class:top-20={!isMobile}
			class:bottom-40={!isMobile}
			class:w-80={!isMobile}
			style={isMobile
				? sheetInformationVisible
					? 'top: 100px; left: 50%; transform: translateX(-50%); bottom: 160px; width: 400px; opacity: 1; pointer-events: auto;'
					: 'top: 100px; left: 50%; transform: translateX(-50%); bottom: 160px; width: 400px; opacity: 0; pointer-events: none;'
				: `right: ${sheetInformationVisible ? '8px' : '-272px'}; width: 20rem;`}
			out:fly={{ x: isMobile ? 0 : 400, y: isMobile ? 20 : 0, duration: 100 }}
		>
			{#if !isMobile}
				<button
					onclick={toggleSheetInformation}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							toggleSheetInformation();
						}
					}}
					class="absolute top-1/2 bottom-50 -left-12 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-l-lg bg-[#3a3a6a] shadow-lg transition-colors hover:bg-[#4a4a7a]"
				>
					{#if sheetInformationVisible}
						<ArrowBendDownRight color="#eef" size={24} class="hover:cursor-pointer" />
					{:else}
						<ArrowBendDownLeft color="#eef" size={24} class="hover:cursor-pointer" />
					{/if}
				</button>
			{/if}
			<div class="p-4">
				<button
					onclick={toggleSheetInformation}
					class="mb-2 flex w-full items-center gap-2 text-left transition-opacity hover:opacity-80"
				>
					{#if isMobile}
						<X color="#eef" size={24} class="hover:cursor-pointer" />
					{:else if sheetInformationVisible}
						<ArrowBendDownRight color="#eef" size={18} class="opacity-70 hover:cursor-pointer" />
					{:else}
						<ArrowBendDownLeft color="#eef" size={18} class="opacity-70 hover:cursor-pointer" />
					{/if}
					<h3 class="text-[18px] font-[600] text-[#eef] hover:cursor-pointer">Bladinformatie</h3>
				</button>
				<div class="h-[100px] overflow-y-auto">
					<ul class="text-[12px] text-[#eef]">
						<li class="rounded-[4px] px-2 py-1 odd:bg-[#eeeeff11]">
							<i class="font-[600] opacity-50">Bladtitel:</i>
							<span class="font-[500]">{historicMap.label}</span>
						</li>
						{#each metadata as [label, value]}
							<li class="rounded-[4px] px-2 py-1 odd:bg-[#eeeeff11]">
								<i class="font-[600] opacity-50">{label}:</i>
								<span class="font-[500]">{value}</span>
							</li>
						{/each}
					</ul>
				</div>
			</div>

			{#if variants && variants.length > 1}
				<div class="px-4">
					<div>
						<h3 class="mb-2 text-[16px] font-[600] text-[#eef]">Bijbladen</h3>
						<div class="flex flex-col gap-2">
							{#each variants as variant}
								{@const metadata = getMetadata(variant)}
								{@const type =
									metadata.find((i) => i[0] === 'Type')?.[1] ||
									(canvasManifest.id == variant.id ? 'Voorkant' : 'Achterkant')}
								{@const imageService =
									variant.items?.[0]?.items?.[0]?.body?.service?.[0]?.id ||
									variant.items?.[0]?.items?.[0]?.body?.id}
								{@const src = imageService ? `${imageService}/full/,256/0/default.jpg` : ''}
								{@const isCurrentSheet = canvasManifest.id === variant.id}
								{#if src}
									<button
										onclick={() => {
											const historicMap = historicMapsById
												.values()
												.find((m) => m.manifestId == variant.id);
											if (historicMap) changeHistoricMapView(historicMap);
											else addFakeGeoreferencedMap(variant);
										}}
										onkeydown={(e) => {
											if (e.key === 'Enter' || e.key === ' ') {
												e.preventDefault();
												const historicMap = historicMapsById
													.values()
													.find((m) => m.manifestId == variant.id);
												if (historicMap) changeHistoricMapView(historicMap);
												else addFakeGeoreferencedMap(variant);
											}
										}}
										tabindex="15"
										class="flex cursor-pointer items-center gap-3 rounded-[4px] p-2 transition-colors hover:bg-[#eeeeff11] {isCurrentSheet
											? 'text-color-[#f4a] rounded-[4px] border-1 border-[#f4a] bg-[#eeeeff11]'
											: ''}"
									>
										<div
											class="h-14 w-20 flex-shrink-0 overflow-hidden rounded bg-[#eeeeff11] shadow-md"
										>
											<img {src} alt={type} class="block h-full w-full object-cover" />
										</div>
										<div class="flex flex-1 items-center text-left">
											<p class="text-[12px] font-[600] text-[#eef]">
												{type}
											</p>
										</div>
									</button>
								{/if}
							{/each}
						</div>
					</div>
				</div>
			{/if}

			<div class="px-4 pb-4">
				<h3 class="mb-2 text-[16px] font-[600] text-[#eef]">Externe links</h3>
				<div class="flex flex-col gap-2 rounded-[4px] bg-[#eeeeff11] p-2 text-[13px]">
					<a
						href={homepageUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[#f4a] hover:underline"
					>
						<ArrowSquareOut size="15" color="#f4a" class="relative inline" />
						Utrecht Universiteit Library
					</a>

					<a
						href={`https://theseus-viewer.netlify.app/?iiif-content=${manifestId}&collection=${collectionId}`}
						target="_blank"
						rel="noopener noreferrer"
						class="text-[#f4a] hover:underline"
					>
						<ArrowSquareOut size="15" color="#f4a" class="relative inline" />
						Open in Theseus
					</a>

					{#if canvasManifest.annotations}
						{@const annotationUrl = canvasManifest.annotations[0].id}

						<a
							href="https://viewer.allmaps.org/?url={annotationUrl}"
							target="_blank"
							rel="noopener noreferrer"
							class="text-[#f4a] hover:underline"
						>
							<ArrowSquareOut size="15" color="#f4a" class="relative inline" />
							Open in Allmaps Viewer
						</a>

						<button
							onclick={() =>
								setClipboard(
									`https://allmaps.xyz/{z}/{x}/{y}.png?url=${annotationUrl}&transformation.type=thin-plate-spline`
								)}
							class="cursor-pointer text-left text-[#f4a] hover:underline"
						>
							{#if copySuccess}
								<Check size="15" color="#f4a" class="relative inline" />
								XYZ tile URL gekopieerd
							{:else}
								<Copy size="15" color="#f4a" class="relative inline" />
								Kopiëer XYZ tile URL
							{/if}
						</button>

						<a
							href={`https://geojson.io/#data=data:text/x-url,${annotationUrl}.geojson`}
							target="_blank"
							rel="noopener noreferrer"
							class="text-[#f4a] hover:underline"
						>
							<ArrowSquareOut size="15" color="#f4a" class="relative inline" />
							Open in geojson.io
						</a>
					{/if}
				</div>
			</div>
		</div>
	{/if}
{/if}

{#if false}
	<!-- TODO: get from spritesheet -->
	{@const thumbnailHeight = 64}
	{@const imageSrc = getHistoricMapThumbnail(historicMap.id, thumbnailHeight)}
	<div
		class="absolute top-45 right-5 z-998
			rounded-[8px] bg-white/90 p-3 text-[15px] font-[500] text-[#336] shadow-lg
			backdrop-blur-md transition-opacity duration-150 select-text"
		style="box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);"
		transition:fly={{ y: -10, duration: 500, delay: 200 }}
	>
		<h1
			class="w-full text-center font-bold text-[#336] transition-all duration-200
    					{preview ? 'truncate text-[14px]' : 'text-[18px] leading-tight whitespace-normal'}"
		>
			{historicMap.label}
		</h1>
		<div class="mt-1 flex items-center gap-4">
			<div>
				{#if preview}
					<p class="text-gray-500">{historicMap.yearEnd}</p>
					<p class="opacity-67">
						Editie {historicMap.edition}{historicMap.bis ? ' BIS' : ''}
					</p>
				{/if}
			</div>
			<div class="ml-auto">
				<div
					class="transition-height relative inline-block overflow-hidden shadow-md duration-200"
					style:height={(preview ? thumbnailHeight : thumbnailHeight * 0.67) + 'px'}
				>
					<img src={imageSrc} alt="" class="block h-full w-full scale-104" />

					{#if viewportPolygon}
						{@const { leftPct, topPct, widthPct, heightPct } =
							getViewportRectWithinHistoricMap(historicMap)}

						<div
							class="pointer-events-none absolute rounded-[4px] border-[4px] border-[#33336666]"
							style="left: {leftPct}%; top: {topPct}%; width: {widthPct}%; height: {heightPct}%;"
						></div>
					{/if}
				</div>
			</div>
		</div>

		<!-- {#if preview}
			<div class="absolute -bottom-6 w-full rounded-[4px] text-[12px] text-[#336]">
				<kbd
					class="bg-background-alt pointer-events-none flex inline h-4 items-center gap-1 rounded-sm border border-[#336] px-1 font-sans font-medium opacity-75 shadow-[0px_1px_0px_0px_#336] select-none"
					><span class="text-foreground-alt text-[10px]">Spatie</span></kbd
				>
				en
				<MouseLeftClick size="18" class="inline opacity-75" color="#336"></MouseLeftClick>
				om blad te bekijken
			</div>
		{/if} -->

		{#if !preview && editionManifest && canvasManifest}
			{@const metadata = getMetadata(canvasManifest)}
			{@const editionMetadata = getMetadata(editionManifest)}
			{@const collectionId =
				'https://tu-delft-heritage.github.io/watertijdreis-data/collection.json'}
			{@const manifestId = editionManifest.id}
			{@const homepageUrl = editionManifest.rendering[0].id}

			<div class="flex flex-col gap-1 p-2" transition:slide>
				<div class="flex gap-2">
					<h3 class="inline text-[14px] font-semibold text-[#33336666]">Editie</h3>
					<span class="max-w-30 font-mono text-[#336]"
						>{historicMap.edition}{historicMap.bis ? ' BIS' : ''}</span
					>
				</div>
				{#each metadata as [label, value]}
					<div class="flex gap-2">
						<h3 class="inline text-[14px] font-semibold text-[#33336666]">{label}</h3>
						<span class="max-w-30 font-mono text-[#336]"
							>{value === 'Watervoorzieningseenheden' ? 'Watervoorzienings- eenheden' : value}</span
						>
					</div>
				{/each}

				<!-- {#each editionMetadata as [label, value]}
					<div class="flex gap-2">
						<h3 class="inline text-[14px] font-semibold text-[#33336666]">{label}</h3>
						<span class="max-w-30 font-mono text-[#336]"
							>{value === 'Watervoorzieningseenheden' ? 'Watervoorzienings- eenheden' : value}</span
						>
					</div>
				{/each} -->

				<h3 class="mt-1 text-[14px] font-semibold text-[#33336666]">Links</h3>
				<div class="">
					<a
						href={`https://theseus-viewer.netlify.app/?iiif-content=${manifestId}&collection=${collectionId}`}
						class="text-[#f4a] hover:underline"
					>
						<ArrowSquareOut size="15" color="#f4a" class="relative inline" /> Open in Theseus
					</a>
				</div>

				<div class="">
					<a href={homepageUrl} class="text-[#f4a] hover:underline">
						<ArrowSquareOut size="15" color="#f4a" class="relative inline" /> Utrecht Universiteit Library
					</a>
				</div>

				{#if canvasManifest.annotations}
					{@const annotationUrl = canvasManifest.annotations[0].id}
					<div class="">
						<a
							href="https://viewer.allmaps.org/?url={annotationUrl}"
							class="text-[#f4a] hover:underline"
						>
							<ArrowSquareOut size="15" color="#f4a" class="relative inline" /> Open in Allmaps Viewer
						</a>
					</div>

					<div class="">
						<button
							onclick={() =>
								setClipboard(
									`https://allmaps.xyz/{z}/{x}/{y}.png?url=${annotationUrl}&transformation.type=thin-plate-spline`
								)}
							class="cursor-pointer text-[#f4a] hover:underline"
						>
							{#if copySuccess}
								<Check size="15" color="#f4a" class="relative inline" /> XYZ tile URL gekopieerd
							{:else}
								<Copy size="15" color="#f4a" class="relative inline" /> Kopiëer XYZ tile URL
							{/if}
						</button>
					</div>

					<div class="">
						<a
							href={`https://geojson.io/#data=data:text/x-url,${annotationUrl}.geojson}`}
							class="text-[#f4a] hover:underline"
						>
							<ArrowSquareOut size="15" color="#f4a" class="relative inline" /> Open in geojson.io
						</a>
					</div>
				{/if}

				<div class="mt-1 inline-flex flex-col">
					<h3 class="text-[14px] font-semibold text-[#33336666]">
						Varianten ({variants.length})
					</h3>
					<div class="relative">
						<div class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#f4a]">
							<ImagesSquare size="18" />
						</div>

						<select
							onchange={(e) => {
								const id = e.target.value;
								const historicMap = historicMapsById.values().find((m) => m.manifestId == id);
								if (historicMap) {
									changeHistoricMapView(historicMap);
								} else {
									const backCanvasManifest = variants.find((m) => m.id == id);
									addFakeGeoreferencedMap(backCanvasManifest);
								}
							}}
							name="variant"
							class="w-55 truncate rounded-lg border-2 border-[#33336611] bg-white py-2.5 pr-16 pl-10 text-base font-medium shadow-[0_2px_2px_rgba(0,0,0,0.05)] focus:outline-none"
						>
							{#each variants as variant}
								{@const name = Object.fromEntries(getMetadata(variant)).Type || 'Voorkant'}
								<option
									value={variant && variant.id}
									selected={historicMap.manifestId == variant.id}>{name}</option
								>
							{/each}
						</select>

						<!-- <span
							class="pointer-events-none absolute top-1/2 right-8 flex h-6 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-[#eef] text-center text-sm font-semibold text-[#336]"
						>
							+{variants.length}
						</span> -->
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}
