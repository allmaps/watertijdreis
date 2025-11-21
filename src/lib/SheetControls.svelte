<script>
	import { ArrowLeft, ArrowRight, ArrowUUpLeft, ImagesSquare, MapTrifold } from 'phosphor-svelte';

	let { visibleHistoricMaps, selectedHistoricMap, changeHistoricMapView } = $props();

	let sortedMaps = $derived.by(() => {
		const values = visibleHistoricMaps.values().toArray();
		values.sort((a, b) => a.number - b.number);
		return values;
	});

	let selectedHistoricMapIndex = $derived.by(() => {
		if (sortedMaps) return sortedMaps.findIndex((i) => i.id == selectedHistoricMap.id);
		else return 0;
	});

	let buttonCollapse = $state(false);
</script>

{#if selectedHistoricMap}
	<div class="fixed bottom-5 left-1/2 -translate-x-1/2">
		<div class="flex items-end gap-3">
			<button
				onclick={() => changeHistoricMapView(sortedMaps[selectedHistoricMapIndex - 1])}
				class={`
                    group inline-flex flex-shrink-0 cursor-pointer 
                    items-center justify-center border-2 border-[#33336611]
                    bg-[#333366aa] 
                    font-[500] 
                    text-[#eef]
                    shadow-[0_2px_2px_rgba(0,0,0,0.05)] transition-all
                    
                    duration-500 hover:bg-[#eef]
                    ${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg px-2.5 py-2'}
                `}
			>
				<ArrowLeft
					color="#fff"
					class={`
                    relative -top-px inline h-[22px]
                    w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
                    `}
				/>
			</button>
			<div class="inline-flex flex-col text-[#336]">
				<label for="eenheid" class="ml-2.5 text-[14px] font-[600] opacity-50">
					Blad {selectedHistoricMapIndex + 1} / {sortedMaps.length}
				</label>
				<div class="relative">
					<div class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[#f4a]">
						<MapTrifold size="18" color="#fff" />
					</div>

					<select
						onchange={(e) => {
							const id = e.target.value;
							const historicMap = visibleHistoricMaps.get(id);
							if (historicMap) {
								changeHistoricMapView(historicMap);
							}
						}}
						name="sheets"
						class="w-55 truncate rounded-lg border-2 border-[#33336611] bg-[#333366aa] py-2.5 pr-16 pl-10 text-base font-medium text-[#eef] shadow-[0_2px_2px_rgba(0,0,0,0.05)] focus:outline-none"
					>
						{#each sortedMaps as historicMap}
							<option value={historicMap.id} selected={historicMap.id == selectedHistoricMap.id}
								>{historicMap.label}</option
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
			<button
				onclick={() => changeHistoricMapView(sortedMaps[selectedHistoricMapIndex + 1])}
				class={`
                    group inline-flex flex-shrink-0 cursor-pointer 
                    items-center justify-center border-2 border-[#33336611]
                    bg-[#333366aa] 
                    font-[500] 
                    text-[#eef]
                    shadow-[0_2px_2px_rgba(0,0,0,0.05)] transition-all
                    
                    duration-500 hover:bg-[#eef]
                    ${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg px-2.5 py-2'}
                `}
			>
				<ArrowRight
					color="#fff"
					class={`
                    relative -top-px inline h-[22px]
                    w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
                    `}
				/>
			</button>
		</div>
	</div>
{/if}
