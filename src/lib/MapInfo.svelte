<script lang="ts">
	import * as turf from '@turf/turf';
	import {
		ArrowArcLeft,
		ArrowBendRightUp,
		ArrowLineRight,
		ArrowUUpLeft,
		Binoculars,
		ImagesSquare,
		MapTrifold,
		MouseLeftClick,
		PictureInPicture,
		PushPin,
		ArrowSquareOut,
		Copy,
		Check
	} from 'phosphor-svelte';
	import { fly, scale, draw, fade, slide } from 'svelte/transition';

	let {
		historicMapsById,
		visibleHistoricMaps,
		visibleHistoricMapsInViewport,
		viewportPolygon,
		hoveredHistoricMap,
		selectedHistoricMap,
		historicMapsLoaded,
		changeHistoricMapView,
		getHistoricMapThumbnail,
		getHistoricMapManifest,
		getEditionManifest
	} = $props();

	let historicMap = $derived.by(() => {
		return (
			selectedHistoricMap ||
			hoveredHistoricMap ||
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

		const [minX, minY, maxX, maxY] = historicMap.warpedMap.geoFullMaskBbox;

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
</script>

{#if historicMap}
	<!-- TODO: get from spritesheet -->
	{@const thumbnailHeight = 80}
	{@const imageSrc = getHistoricMapThumbnail(historicMap.id, thumbnailHeight)}
	<div
		class="absolute top-55 right-5
			z-998 rounded-[8px] bg-white/90 p-3 text-[15px] font-[500] text-[#336]
			shadow-lg backdrop-blur-md transition-opacity duration-150"
		style="box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);"
		transition:fly={{ y: -10, duration: 500, delay: 200 }}
	>
		<div class="flex items-center gap-4 p-1">
			<div>
				<h1
					class="font-bold text-[#336] transition-all duration-200
    					{preview
						? 'max-w-[120px] truncate text-[14px]'
						: 'max-w-[160px] text-[18px] leading-tight whitespace-normal'}"
				>
					{historicMap.label}
				</h1>

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

		{#if preview}
			<div class="absolute -bottom-6 w-full rounded-[4px] text-[12px] text-[#336]">
				<kbd
					class="bg-background-alt pointer-events-none flex inline h-4 items-center gap-1 rounded-sm border border-[#336] px-1 font-sans font-medium opacity-75 shadow-[0px_1px_0px_0px_#336] select-none"
					><span class="text-foreground-alt text-[10px]">Spatie</span></kbd
				>
				en
				<MouseLeftClick size="18" class="inline opacity-75" color="#336"></MouseLeftClick>
				om blad te bekijken
			</div>
		{/if}

		{#if !preview && editionManifest && canvasManifest}
			{@const metadata = getMetadata(canvasManifest)}
			{@const editionMetadata = getMetadata(editionManifest)}
			{@const annotationUrl = canvasManifest.annotations[0].id}
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

				<div class="">
					<h3 class="mt-1 text-[14px] font-semibold text-[#33336666]">Links</h3>
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

				<div class="">
					<a
						href={`https://geojson.io/#data=data:text/x-url,${annotationUrl}.geojson}`}
						class="text-[#f4a] hover:underline"
					>
						<ArrowSquareOut size="15" color="#f4a" class="relative inline" /> Open in geojson.io
					</a>
				</div>

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
									console.log(variants.find((m) => m.id == id));
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
