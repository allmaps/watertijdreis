<script lang="ts">
	import * as turf from '@turf/turf';
	import { ImagesSquare, ArrowSquareOut, Copy, Check, CaretCircleDown, CaretDown } from 'phosphor-svelte';
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
		const mainVariant = variants.find(i => !getMetadata(i).flat().includes('Type')); 
		if (!mainVariant) return null;
		return historicMapsById.values().find(i => i.manifestId == mainVariant.id);
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
		const scaleHorizontal = (mainWarpedMap.geoFullMaskBbox[2] - mainWarpedMap.geoFullMaskBbox[0]) / mainWarpedMap.georeferencedMap.resource.width;
		const scaleVertical = (mainWarpedMap.geoFullMaskBbox[3] - mainWarpedMap.geoFullMaskBbox[1]) / mainWarpedMap.georeferencedMap.resource.height;
		const annotation = {
			"@context": "https://schemas.allmaps.org/map/2/context.json",
			"type": "GeoreferencedMap",
			"id": id,
			"resource": {
				"id": canvasManifest.items[0]?.items[0]?.body?.service[0]?.id,
				"width": width,
				"height": height,
				"type": "ImageService2",
				"tiles": [
					{
						"width": 256,
						"height": 256,
						"scaleFactors": [1, 2, 4, 8, 16, 32]
					}
				]
			},
			"gcps": [
				{
					"resource": [0,0],
					"geo": [
						mainWarpedMap.geoFullMaskBbox[0], 
						mainWarpedMap.geoFullMaskBbox[1]  - height * scaleVertical
					]
				},
				{
					"resource": [width,0],
					"geo": [
						mainWarpedMap.geoFullMaskBbox[0] + width * scaleHorizontal, 
						mainWarpedMap.geoFullMaskBbox[1] - height * scaleVertical
					]
				},
				{
					"resource": [width,height],
					"geo": [
						mainWarpedMap.geoFullMaskBbox[0] + width * scaleHorizontal, 
						mainWarpedMap.geoFullMaskBbox[1]
					]
				}
			],
			"resourceMask": [
				[0, height],
				[width, height],
				[width, 0], 
				[0,0]
			],
			"transformation": {
				"type": "straight"
			}
		}

		console.log(id);
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
			type: "Achterkant",
			geoFullMaskBbox: warpedMap?.geoFullMaskBbox,
		};
		historicMapsById.set(id, historicMap);

		changeHistoricMapView(historicMap);
	}

	let closed = $state(false);
</script>

<!-- <button
	onclick={() => (closed = !closed)}
	class="
		fixed left-1/2 bottom-[calc(.5rem+160px)] md:bottom-[calc(.5rem+200px)]
		-translate-x-1/2
		cursor-pointer h-6 w-auto rounded-t-[8px]
		bg-white/90 backdrop-blur-sm py-4 z-[1001]
		flex items-center justify-center
		transition-all duration-300
	"
	style:bottom={(closed ? '.5rem' : 'calc(.5rem + 160px)')}
>
	<div
		class="inline px-2 transition-transform duration-300"
		style:transform={closed ? 'rotate(180deg)' : 'rotate(0deg)'}
	>
		<CaretDown size="25" color="#f4a" />
	</div>
	<div
		class="inline pr-2 text-[#336] text-[14px] font-[700]"
		transition:slide={{ axis: "x" }}
	>Bladinformatie</div>
</button> -->

{#if false}
<div
	class="
		fixed right-2 bottom-2 left-2 z-[1000]
		bg-[#336]/90 backdrop-blur-sm rounded-[8px] shadow-lg
		overflow-hidden transition-all duration-300
	"
	style:height={(closed ? 0 : 200) + 'px'}
>
	<!-- <h1 class="font-bold pt-4 text-[#eef] w-full text-center mb-2">Eindhoven Oost</h1> -->
	<div class="flex gap-2 justify-start px-4 transition-opacity duration-300" style:opacity={closed ? 0 : 1}>

		<div class="relative inline-block shadow-md overflow-hidden rounded-[4px] h-16">
			<img
				alt=""
				class="block h-full w-auto object-cover scale-[1.04]"
				src="https://objects.library.uu.nl/fcgi-bin/iipsrv.fcgi?IIIF=/manifestation/viewer/11/18/38/111838154470798873696440689860241541701.jp2/full/256,/0/default.jpg"
			/>
			<div
				class="pointer-events-none absolute border-[3px] border-[#33336666] rounded-[4px]"
				style="
					left: 57.8229%;
					top: 48.0804%;
					width: 1.36974%;
					height: 2.31579%;
				"
			></div>
		</div>

		{#if canvasManifest}
			{@const metadata = getMetadata(canvasManifest)}
			{@const editionMetadata = getMetadata(editionManifest)}
			{@const collectionId = 'https://tu-delft-heritage.github.io/watertijdreis-data/collection.json'}
			<div class="inline h-20">
				{#each metadata as [label, value]}
					<div class="">
						<p class="text-[12px] font-semibold text-[#eeeeffaa]">{label}</p>
						<span class="max-w-30 text-[14px] text-[#eef]">{value}</span>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
{/if}

{#if historicMap}
	<!-- TODO: get from spritesheet -->
	{@const thumbnailHeight = 64}
	{@const imageSrc = getHistoricMapThumbnail(historicMap.id, thumbnailHeight)}
	<div
		class="select-text absolute top-55 right-5
			z-998 rounded-[8px] bg-white/90 p-3 text-[15px] font-[500] text-[#336]
			shadow-lg backdrop-blur-md transition-opacity duration-150"
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
