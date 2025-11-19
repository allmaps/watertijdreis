<script lang="ts">
    import * as turf from '@turf/turf';
    import { ArrowArcLeft, ArrowBendRightUp, ArrowLineRight, ArrowUUpLeft, Binoculars, ImagesSquare, MapTrifold, MouseLeftClick, PictureInPicture, PushPin } from 'phosphor-svelte';
	import { fly, scale, draw, fade } from 'svelte/transition';

	let {
		historicMapsById,
		visibleHistoricMaps,
		visibleHistoricMapsInViewport,
		viewportPolygon,
		hoveredHistoricMap,
		selectedHistoricMap,
		historicMapsLoaded,
		getHistoricMapThumbnail,
		getHistoricMapManifest
	} = $props();

    // function getItemFromManifestById(id) {
	// 	return manifest.items.find((i) => i.id == id);
	// }

	// $effect(async () => {
	// 	manifest = await fetch(MANIFEST_URL_ED3).then((res) => res.json());

	// 	voorbeeldBlad = getItemFromManifestById(VOORBEELD_ID);

	// 	const structure = manifest.structures.find((i) => i.items.find((j) => j.id == VOORBEELD_ID));
	// 	const otherPages = structure.items.map((i) => getItemFromManifestById(i.id));
	// 	andereBladen = otherPages.map(
	// 		(i) => i.items[0].items[0].body.service[0].id + '/full/100,/0/default.jpg'
	// 	);
	// });


	let previewHistoricMap = $derived.by(() => {
		if(visibleHistoricMapsInViewport.size == 1) return visibleHistoricMapsInViewport.values().next().value;
		else return hoveredHistoricMap;
	})

    let manifest = $state(null);
    let manifestLoading = $state(null);

    $effect(() => {
        manifestLoading = getHistoricMapManifest(previewHistoricMap?.id).then(data => {
            manifestLoading = null;
            manifest = data || null;
        });
    })

    function getLabelFromManifest(m = manifest, lang = 'nl') {
        return (m.label[lang] ?? m.label.en ?? [])[0] ?? '';
    }

    function getMetadataFromManifest(m = manifest, lang = 'nl') {
        return m.metadata.map(i => {
                const label = i.label[lang] ?? i.label.en;
                const value = i.value[lang] ?? i.value.en;

                return [label?.[0], value?.[0]];
            })
    }

    function getViewportRectWithinHistoricMap(historicMap) {
		if(!viewportPolygon) return;

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
</script>

{#if previewHistoricMap}
	{#key previewHistoricMap}
		<div
			class="absolute top-55 right-5 text-[15px] transition-opacity duration-150 z-998
				bg-white/90 backdrop-blur-md shadow-lg rounded-[8px] p-3 
				flex flex-col gap-2"
			style="box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);"
			transition:fly={{ y: -10, duration: 500 }}
		>

            <!-- <div class="text-[#f4a]">
                <ArrowUUpLeft size="20" class="inline"/>
                Terug naar de kaart
                <kbd
                    class="bg-background-alt text-[#336] pointer-events-none flex inline h-4 items-center gap-1 rounded-sm border px-1 font-sans font-medium opacity-75 shadow-[0px_2px_0px_0px_#59595b] select-none dark:border-[#336] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
                ><span class="text-foreground-alt text-[10px]">Esc</span></kbd>
            </div> -->
			<div class="flex items-center gap-3">
				<div class="flex flex-col leading-tight p-1" transition:fade>
					{#await getHistoricMapManifest(previewHistoricMap.id)}
						{:then data}
                            <h1 
                                class="text-[14px] text-[#336] font-[700] truncate"
                                style:transition={"font-size .2s"}
                                style={selectedHistoricMap ? "max-width: 160px; font-size: 20px" : "max-width: 120px"}
                            >{data.label.nl[0]}</h1>
							{#if selectedHistoricMap}
								<div>
								<ArrowLineRight size="20" color="#f4a" class="inline relative" />
								<PushPin size="20" color="#f4a" class="inline relative ml-3" />
								</div>
							{:else}
								<!-- <h1 class="font-[700] text-[#336] max-w-[120px] truncate">{data.label.nl[0]}</h1> -->
								<p class="text-gray-500">
									Editie {previewHistoricMap.edition}{previewHistoricMap.bis ? " BIS" : ""}
								</p>
								<p class="text-gray-500">{previewHistoricMap.yearEnd}</p>
							{/if}
						{:catch error}
							<p class="text-red-600">Kan geen informatie ophalen</p>
					{/await}
					</div>     

				{#await getHistoricMapThumbnail(previewHistoricMap.id, 80)}
					{:then src}
						<div class="relative inline-block overflow-hidden bg-red-500 shadow-md">
							<img 
								{src} 
								alt="" 
								class="block scale-103"
								style="width: calc(100% + 2px); height: calc(100% + 2px);" 
							/>

							{#if viewportPolygon}
								{@const { leftPct,topPct,widthPct,heightPct } = getViewportRectWithinHistoricMap(previewHistoricMap)}

								<div 
									class="absolute border-[4px] border-[#33336666] rounded-[4px] pointer-events-none"
									style="
										left: {leftPct}%;
										top: {topPct}%;
										width: {widthPct}%;
										height: {heightPct}%;
									"	
								></div>
							{/if}
						</div>
					{:catch error}
						<p class="text-red-600">{error}</p>
				{/await}
			</div>

			{#if selectedHistoricMap}
                {@const metadata = getMetadataFromManifest()}
				<div>
                    {#each metadata as [label,value]}
                        <div class="mt-2">
                            <h3 class="text-[14px] font-semibold text-[#33336666]">{label}</h3>
                            <div class="text-[#336]">{value}</div>
                        </div>
                    {/each}
				</div>

				<div id="select-container" class="with-icon relative">
					<label for="eenheid">Andere bladen</label>
					<ImagesSquare size="18" color="#f4a" class="inline absolute top-[31px] left-4"/>
					<span class="absolute top-[28px] right-8 rounded-[8px] bg-[#eef] w-8 text-[#336] font-[600] text-center">+3</span>
					<select name="eenheid" style:width="250px">
						<option value="m">Hoofdblad</option>
						<option value="km">Hydrologische Waarnemingspunten</option>
						<option value="ft">Watervoorzieningseenheden</option>
						<option value="mi">Achterkant</option>
					</select>
				</div>
			{:else} 
				<div class="w-full rounded-[4px] text-[12px] text-gray-500">
					<kbd
					class="bg-background-alt text-[#336] pointer-events-none flex inline h-4 items-center gap-1 rounded-sm border px-1 font-sans font-medium opacity-75 shadow-[0px_2px_0px_0px_#59595b] select-none dark:border-[#336] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
					><span class="text-foreground-alt text-[10px]">Spatie</span></kbd
					>
					en 
					<MouseLeftClick size="18" class="inline opacity-75" color="#336"></MouseLeftClick>
					om blad te bekijken
				</div>
			{/if}

		</div>
	{/key}
{/if}


<style>
	#button-container {
		background: #fff;
		border: 2px solid rgb(255, 234, 246);
		border-radius: 8px;
		display: inline-flex;
		margin: 0 5px;
		margin-top: 18px;
		box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);
		overflow: hidden;
		flex-shrink: 0;
	}

	#button-container button {
		margin: 0;
		padding: 8px 10px;
		border-left: 1px solid #33336611;
		cursor: pointer;
	}

	#button-container button:hover {
		background: #eef;
		/* color: #2222ff; */
	}

	label {
        font-size: 12px;
        opacity: .5;
		margin-left: 10px;
    }
	#select-container {
		display: inline-flex;
		flex-direction: column;
	}
	#select-container label {
		margin-left: 10px;
	}
	#select-container select {
		background: #fff;
		border: 2px solid #33336611;
		border-radius: 8px;
		display: inline-block;
		margin: 0 5px;
		padding: 8px 10px;
		font-size: 16px;
		font-weight: 500;
		width: 100px;
		box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	#select-container select {
		width: 120px;
		padding-top: 9px;
		padding-bottom: 10px;
	}

	#select-container.with-icon select {
		padding-left: 30px;
		width: 200px;
	}
</style>