<script lang="ts">
	import { ArrowLeft } from 'phosphor-svelte';
	import { fly } from 'svelte/transition';

	const { selectedHistoricMap } = $props();

	let panelHidden = $state(false);

	const MANIFEST_URL_ED3 =
		'https://tu-delft-heritage.github.io/watertijdreis-data/manifests/1874-456827/manifest.json';
	const VOORBEELD_ID = 'https://objects.library.uu.nl/iiif_manifest/1874-456827/canvas/p9';

	let manifest = $state();
	let voorbeeldBlad = $state();
	let andereBladen = $state([]);

	function getItemFromManifestById(id) {
		return manifest.items.find((i) => i.id == id);
	}

	$effect(async () => {
		manifest = await fetch(MANIFEST_URL_ED3).then((res) => res.json());

		voorbeeldBlad = getItemFromManifestById(VOORBEELD_ID);

		const structure = manifest.structures.find((i) => i.items.find((j) => j.id == VOORBEELD_ID));
		const otherPages = structure.items.map((i) => getItemFromManifestById(i.id));
		andereBladen = otherPages.map(
			(i) => i.items[0].items[0].body.service[0].id + '/full/100,/0/default.jpg'
		);
	});
</script>

<!-- {#if selectedHistoricMap && voorbeeldBlad}
	<div
		style="font-family: Inter"
		transition:fly={{ x: -280, duration: 500 }}
		class="absolute top-20 left-20 z-100 h-full w-70 bg-white p-2 shadow-lg"
	>
		{voorbeeldBlad.metadata[0].label.nl[0]}: {voorbeeldBlad.metadata[0].value.nl[0]}

		<h3>Label</h3>
		<p>{voorbeeldBlad.label.nl}</p>

		<div>
			{#each andereBladen as blad}
				<img src={blad} class="m-1 inline h-18 shadow-md" />
			{/each}
		</div>
	</div>
{/if} -->

{#if !panelHidden && selectedHistoricMap}
	<div
		transition:fly={{ x: -300, duration: 250 }}
		class="absolute top-0 left-0 z-100 h-200 w-80 px-5 py-20"
		style="font-family: Inter"
	>
		<div class="relative h-full w-full rounded-lg bg-white p-5 shadow-lg">
			<ArrowLeft size="20px" class="absolute right-5" onclick={() => (panelHidden = true)}
			></ArrowLeft>
			<div class="mt-4">
				<h1 class="text-[22px] font-semibold" style="font-family: 'ivypresto-display'">
					Ameland West
				</h1>
			</div>
			<div class="mt-4">
				<h3 class="text-[14px] font-semibold text-[#888]">Bladnummer</h3>
				<div>1</div>
			</div>
			<div class="mt-4">
				<h3 class="text-[14px] font-semibold text-[#888]">Positie</h3>
				<div>West</div>
			</div>
			<div class="mt-4">
				<h3 class="text-[14px] font-semibold text-[#888]">Herzien</h3>
				<div>1964</div>
			</div>
			<div class="mt-4">
				<h3 class="text-[14px] font-semibold text-[#888]">Uitgave</h3>
				<div>1965</div>
			</div>

			<div class="absolute bottom-4 rounded-md bg-[#f8f8ff] p-2">
				<h2 class="font-semibold">Andere bladen</h2>
				<ul class="list-style-none">
					{#each andereBladen.slice(1) as blad, i}
						<li>
							<div>
								{#if i == 0}
									<i class="text-[14px] opacity-67">Watervoorzieningseenheden</i>
								{:else}
									<i class="text-[14px] opacity-67">Hydrologische Waarnemingspunten</i>
								{/if}
							</div>
							<img src={blad} class="m-1 inline h-16 shadow-md" />
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
{/if}
