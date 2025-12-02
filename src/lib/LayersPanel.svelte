<script lang="ts">
	import { EyeClosed, ImagesSquare, MapTrifold, X } from 'phosphor-svelte';
	import { fly, fade } from 'svelte/transition';
	let { visible = $bindable(), layerOptions = $bindable() } = $props();
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key == 'Escape') visible = false;
	}}
/>

{#if visible}
	<div
		class="fixed top-0 left-0 z-1000 h-full w-full bg-[#33336688]"
		onclick={() => (visible = false)}
		transition:fade
	></div>
	<div
		class="absolute top-50 left-1/2 z-1001 flex -translate-x-1/2 flex-col items-center overflow-hidden rounded-[8px] border-gray-200 bg-white p-6 shadow-lg"
		transition:fly={{ y: -20, duration: 250 }}
	>
		<button
			onclick={() => (visible = false)}
			class="absolute top-4 right-4 cursor-pointer rounded-[8px] bg-[#ff44aa22] p-2 opacity-50 transition-opacity hover:opacity-100"
		>
			<X size="24" color="#f4a" weight="bold" class="opacity-67"></X>
		</button>
		<h1 class="text-[22px] font-[700] text-[#336]">Lagen</h1>
		<div id="select-container" class="with-icon relative mt-4">
			<label for="eenheid">Achtergrondkaart</label>
			{#if layerOptions.baseMap == 'none'}
				<EyeClosed size="18" color="#f4a" class="absolute top-[31px] left-4 inline" />
			{:else}
				<MapTrifold size="18" color="#f4a" class="absolute top-[31px] left-4 inline" />
			{/if}
			<select name="basemap" style:width="250px" bind:value={layerOptions.baseMap}>
				<option value="none" selected>Geen</option>
				<option value="protomaps">Basis achtergrondkaart</option>
				<option value="ahn">AHN</option>
				<option value="satelliet">Luchtfoto Actueel Ortho 25cm RGB</option>
			</select>
		</div>
		{#if layerOptions.baseMap == 'protomaps'}
			<div class="mt-4 text-[14px] font-[500] text-[#336]">
				<input
					type="checkbox"
					bind:checked={layerOptions.protoMapsWaterInFront}
					id="water-in-front-checkbox"
					class="mr-2 accent-[#f4a]"
				/>
				Waterlagen vóór historische kaarten
				<kbd
					class="bg-background-alt text-xxs pointer-events-none ml-1 flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium text-[#cce] shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
					><span class="text-foreground-alt text-[12px]">W</span></kbd
				>
			</div>
			<div class="mt-4 text-[14px] font-[500] text-[#336]">
				<input
					type="checkbox"
					bind:checked={layerOptions.protomapsLabelsInFront}
					id="labels-in-front-checkbox"
					class="mr-2 accent-[#f4a]"
				/>
				Plaatsnamen vóór historische kaarten
				<kbd
					class="bg-background-alt text-xxs pointer-events-none ml-1 flex inline items-center gap-1 rounded-sm border px-1 font-sans font-medium text-[#cce] shadow-[0px_2px_0px_0px_#cce] select-none dark:border-[rgba(0,_0,_0,_0.10)] dark:bg-white dark:shadow-[0px_2px_0px_0px_#B8B8B8]"
					><span class="text-foreground-alt text-[12px]">T</span></kbd
				>
			</div>
		{/if}
		<br />
		<div id="select-container" class="with-icon relative cursor-pointer">
			<label for="eenheid">Historische kaarten</label>
			<ImagesSquare size="18" color="#f4a" class="absolute top-[31px] left-4 inline" />
			<select name="historicmaps" style:width="250px">
				<option value="m" selected>Waterstaatskaarten</option>
				<option value="none">Geen</option>
			</select>
		</div>
		<label for="historic-maps-opacity-slider">Doorzichtigheid</label>
		<input
			name="historic-maps-opacity-slider"
			class="w-1/2 cursor-pointer accent-[#f4a]"
			type="range"
			min="0"
			max="100"
			bind:value={layerOptions.historicMapsOpacity}
		/>
		<span class="text-[14px] font-[500] text-[#336]">{layerOptions.historicMapsOpacity}%</span>
		<br />
		<div id="select-container" class="with-icon relative mb-4">
			<label for="eenheid">Overleg-kaart</label>
			<ImagesSquare size="18" color="#f4a" class="absolute top-[31px] left-4 inline" />
			<select name="eenheid" style:width="250px">
				<option value="m">Geen</option>
				<option value="km">Hydrologische Waarnemingspunten</option>
				<option value="ft">Watervoorzieningseenheden</option>
				<option value="mi">Achterkant</option>
			</select>
		</div>
	</div>
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
		opacity: 0.5;
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
