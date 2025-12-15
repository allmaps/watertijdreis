<script lang="ts">
	import * as turf from '@turf/turf';

	import {
		ImagesSquare,
		ArrowSquareOut,
		Copy,
		Check,
		CaretCircleDown,
		CaretDown,
		CaretUp, // Added CaretUp
		Info,
		ShareFat,
		ArrowBendDownRight,
		ArrowBendDownLeft,
		X
	} from 'phosphor-svelte';

	import { fly, scale, draw, fade, slide } from 'svelte/transition';

	import { cubicInOut } from 'svelte/easing';

	import type { HistoricMap } from './types/historicmap';
	import MapThumbnail from './MapThumbnail.svelte';

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
		sheetIndexVisible,
		hoveredHistoricMap,
		clickedHistoricMap,
		selectedHistoricMap,
		changeHistoricMapView,
		setHistoricMapView,
		getHistoricMapThumbnail
	} = $props();

	let historicMap = $derived.by(() => {
		return (
			selectedHistoricMap ||
			clickedHistoricMap ||
			(sheetIndexVisible && hoveredHistoricMap) ||
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

	let sheetInformationVisible = $state(false);

	let thumbnailEl = $state(null);

	$effect(() => {
		if (historicMap && thumbnailEl) {
			thumbnailEl.style.transform = `scale(${historicMap ? 100 : 25}%) translate(${historicMap ? 0 : -30}px,0px) rotateX(${historicMap ? 0 : 60}deg) rotateY(${historicMap ? 0 : 0}deg)`;

			thumbnailEl.style.opacity = 1;
		}
	});

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
		}
	});

	let sheetInformationEl = $state(null);
</script>

{#if historicMap}
	<div
		class="
			fixed right-2 bottom-2 left-2 z-[1000] overflow-hidden rounded-[8px] bg-gradient-to-r from-[#33336688] from-[270px]
			to-[#33336688] shadow-lg transition-[width] duration-300 sm:top-auto sm:from-[#336] sm:to-transparent sm:to-[calc(50%-30px)]
			{sheetInformationVisible || selectedHistoricMap ? 'bg-[#336]' : ''}
			{sheetInformationVisible || selectedHistoricMap
			? 'w-auto sm:w-87'
			: 'w-auto sm:w-[calc(100vh-16px)]'}
		"
		style:background-color={selectedHistoricMap ? '#336' : ''}
		style:max-height={sheetInformationVisible ? (isMobile ? '50vh' : '60vh') : '120px'}
		transition:fade={{ duration: 500 }}
		style:pointer-events={selectedHistoricMap ? 'auto' : 'none'}
	>
		<div class="relative z-20 flex h-30 items-stretch gap-3 bg-inherit">
			{#key historicMap.id}
				<div
					class="pointer-events-none flex-shrink-0 p-4 pr-1"
					style="transform-style: preserve-3d; perspective: 100px"
				>
					<div
						onclick={() => {
							if (historicMap && !selectedHistoricMap) setHistoricMapView(historicMap);
						}}
						bind:this={thumbnailEl}
						class="pointer-events-auto h-22 w-fit origin-[10%_100%] cursor-pointer overflow-hidden opacity-0 shadow-md transition-all delay-300 duration-500 will-change-transform"
						style:transform={`translate(${-30}px,0px) rotateX(${60}deg) scale(25%)`}
					>
						{#if canvasManifest && getMetadata(canvasManifest).flat().includes('Achterkant')}
							{@const imageService =
								canvasManifest.items?.[0]?.items?.[0]?.body?.service?.[0]?.id ||
								canvasManifest.items?.[0]?.items?.[0]?.body?.id}

							{@const src = imageService ? `${imageService}/full/,256/0/default.jpg` : ''}

							<img alt="" class="block h-full w-auto object-cover" {src} />
						{:else}
							<MapThumbnail id={historicMap.id} height={88}></MapThumbnail>
						{/if}

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

			{#key historicMap.id}
				<div
					class="flex w-full flex-shrink-1 flex-col items-start justify-center gap-1 pr-4"
					in:fly|global={{ x: -20 }}
				>
					<h1
						onclick={() => {
							if (historicMap && !selectedHistoricMap) setHistoricMapView(historicMap);
						}}
						class="pointer-events-auto line-clamp-2 max-w-50 cursor-pointer truncate text-[16px] font-bold text-[#eef]"
					>
						{mainSheet ? mainSheet.label : historicMap ? historicMap.label : '...'}
					</h1>

					<p class="text-[14px] font-[500] text-[#eeeeff]">
						{historicMap?.yearEnd} &middot; Editie {historicMap?.edition}{historicMap?.bis
							? ' BIS'
							: ''}
					</p>

					{#if selectedHistoricMap}
						<button
							transition:slide={{ duration: 300 }}
							onclick={toggleSheetInformation}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();

									toggleSheetInformation();
								}
							}}
							class="mt-2 flex items-center gap-1.5 rounded-lg border-2 border-[#eeeeff22] bg-[#eeeeff11] px-3 py-1.5 text-[12px] font-[600] text-[#eef] shadow-md transition-colors hover:cursor-pointer hover:bg-[#4a4a7a]"
						>
							{#if sheetInformationVisible}
								<Info class="inline" size="18" />
								<span class="whitespace-nowrap">Sluiten</span>
								<CaretDown color="#eef" size={18} weight="bold" />
							{:else}
								<Info class="inline" size="18" />
								<span class="whitespace-nowrap">Openen</span>
								<CaretUp color="#eef" size={18} />
							{/if}
						</button>
					{/if}
				</div>
			{/key}
		</div>

		{#if sheetInformationVisible}
			{@const metadata = getMetadata(canvasManifest)}

			{@const collectionId =
				'https://tu-delft-heritage.github.io/watertijdreis-data/collection.json'}

			{@const manifestId = editionManifest.id}

			{@const canvasId = canvasManifest.id}

			{@const canvasIndex = canvasId.match(/\/p(\d*)$/)?.[1]}

			{@const imageId = canvasManifest.items[0]?.items[0]?.body?.service[0]?.id}

			{@const homepageUrl = editionManifest.rendering[0].id}

			<div
				bind:this={sheetInformationEl}
				transition:slide={{ duration: 300 }}
				class="scrollable flex flex-col gap-4 overflow-x-hidden overflow-y-auto border-t border-[#eeeeff10]"
				style="max-height: calc({isMobile ? '50vh' : '60vh'} - 120px);"
			>
				<div class="pt-2">
					<!-- <h3 class="mb-1 text-[16px] font-[600] text-[#eef]">Bladinformatie</h3> -->
					<div class="px-4 pb-0">
						<ul class="text-[14px] text-[#eef]">
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
					<div class="px-4 pb-0">
						<h3 class="mb-1 text-[16px] font-[600] text-[#eef]">Bijbladen</h3>

						<div class="flex flex-col">
							{#each variants as variant}
								{@const metadata = getMetadata(variant)}

								{@const type =
									metadata
										.find((i) => i[0] === 'Type')?.[1]
										.replace('Achterkant', 'Hoofdblad (achterkant)')
										.replace('Watervoorzieningseenheden', 'Watervoorzienings-<br>eenheden') ||
									'Hoofdblad (voorkant)'}

								{@const historicMap = historicMapsById
									.values()
									.find((m) => m.manifestId == variant.id)}

								{@const imageService =
									variant.items?.[0]?.items?.[0]?.body?.service?.[0]?.id ||
									variant.items?.[0]?.items?.[0]?.body?.id}

								{@const src = imageService ? `${imageService}/full/,256/0/default.jpg` : ''}

								{@const isCurrentSheet = canvasManifest.id === variant.id}

								{#if src}
									<button
										onclick={() => {
											if (historicMap) changeHistoricMapView(historicMap);
											else addFakeGeoreferencedMap(variant);

											if (sheetInformationEl) sheetInformationEl.scrollTop = 0;
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
										class="flex cursor-pointer items-center gap-1 rounded-[4px] p-1.5 transition-colors hover:bg-[#eeeeff11] {isCurrentSheet
											? 'text-color-[#f4a] rounded-[6px] bg-[#eeeeff30]'
											: ''}"
									>
										<div
											class="h-14 flex-shrink-0 overflow-hidden rounded-[2px] bg-[#eeeeff11] shadow-md"
										>
											{#if !type.toLowerCase().includes('achterkant')}
												<MapThumbnail id={historicMap.id} height={56}></MapThumbnail>
											{:else}
												<img {src} alt={type} class="block h-full w-auto object-cover" />
											{/if}
										</div>

										<div class="flex flex-1 items-center text-left">
											<p class="px-2 text-[12px] font-[600] text-[#eef]">
												{@html type}
											</p>
										</div>
									</button>
								{/if}
							{/each}
						</div>
					</div>
				{/if}

				<div class="px-4 pb-6">
					<h3 class="mb-2 text-[16px] font-[600] text-[#eef]">Externe links</h3>

					<div class="flex flex-col gap-2 rounded-[4px] bg-[#eeeeff11] p-2 text-[13px]">
						<a
							href={`${homepageUrl}?page=${canvasIndex}`}
							target="_blank"
							rel="noopener noreferrer"
							class="text-[#f4a] hover:underline"
						>
							<ArrowSquareOut size="15" color="#f4a" class="relative inline" />

							Universiteitsbibliotheek Utrecht
						</a>

						<a
							href={`https://theseus-viewer.netlify.app/embed?iiif-content=${manifestId}&canvas=${canvasId}&collection=${collectionId}&panel=navPlace`}
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

							<a
								href={annotationUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="text-[#f4a] hover:underline"
							>
								<ArrowSquareOut size="15" color="#f4a" class="relative inline" />

								Open Georeference Annotation
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
						<a
							href={`${imageId}/full/1024,/0/default.png`}
							target="_blank"
							rel="noopener noreferrer"
							class="text-[#f4a] hover:underline"
						>
							<ArrowSquareOut size="15" color="#f4a" class="relative inline" />

							Download beeld (1024px)
						</a>
						<a
							href={`${imageId}/full/max/0/default.png`}
							target="_blank"
							rel="noopener noreferrer"
							class="text-[#f4a] hover:underline"
						>
							<ArrowSquareOut size="15" color="#f4a" class="relative inline" />

							Download beeld (5000px)
						</a>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.scrollable::-webkit-scrollbar {
		width: 8px;
		height: 8px;
	}

	.scrollable::-webkit-scrollbar-track {
		background: transparent;
	}
	.scrollable::-webkit-scrollbar-thumb {
		background-color: #eeeeff88;
		border-radius: 10px;
	}
	.scrollable::-webkit-scrollbar-thumb:hover {
		background-color: #eeeeff;
	}
	.scrollable {
		scrollbar-color: #eeeeff88 transparent;
		scrollbar-width: thin;
	}
</style>
