<script lang="ts">
    import { ImagesSquare, X } from 'phosphor-svelte';
    import { fly, fade } from 'svelte/transition';
    let { visible = $bindable() } = $props();


</script>

{#if visible}
<div 
	class="fixed top-0 left-0 w-full h-full bg-[#33336688] z-1000" 
	onclick={() => visible = false}
	transition:fade
></div>
<div 
	class="z-1001 absolute top-50 left-1/2 w-120 -translate-x-1/2 overflow-hidden flex flex-col items-center p-4 shadow-lg rounded-[8px] border-gray-200 bg-white"
	transition:fly={{ y: -20, duration: 250 }}
>
    <h1 class="text-[#336] font-[700] text-[22px]">Lagen</h1>
    <div id="select-container" class="with-icon relative mt-4">
        <label for="eenheid">Achtergrondkaart</label>
        <ImagesSquare size="18" color="#f4a" class="inline absolute top-[31px] left-4"/>
        <select name="eenheid" style:width="250px">
            <option value="m">Geen</option>
            <option value="km">Basiskaart</option>
            <option value="ft">AHN</option>
            <option value="mi">...</option>
        </select>
    </div>
    <br>
    <div id="select-container" class="with-icon relative">
        <label for="eenheid">Historische kaarten</label>
        <ImagesSquare size="18" color="#f4a" class="inline absolute top-[31px] left-4"/>
        <select name="eenheid" style:width="250px">
            <option value="m">Zichtbaar</option>
            <option value="km">Hydrologische Waarnemingspunten</option>
            <option value="ft">Watervoorzieningseenheden</option>
            <option value="mi">Achterkant</option>
        </select>
    </div>
    <br>
    <div id="select-container" class="with-icon relative mb-4">
        <label for="eenheid">Overleg-kaart</label>
        <ImagesSquare size="18" color="#f4a" class="inline absolute top-[31px] left-4"/>
        <select name="eenheid" style:width="250px">
            <option value="m">Geen</option>
            <option value="km">Hydrologische Waarnemingspunten</option>
            <option value="ft">Watervoorzieningseenheden</option>
            <option value="mi">Achterkant</option>
        </select>
    </div>

    <button
		onclick={() => visible = false}
		class={`
			group flex my-3 items-center justify-center 
			bg-white border-2 border-[#33336611] font-[500]
			shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
			flex-shrink-0 cursor-pointer 
			hover:bg-[#eef]
			
			transition-all duration-500
			rounded-lg py-2 px-2.5
		`}
		>
		<!-- <X color="#f4a" 
			class={`
			h-[22px] w-[22px] opacity-70 group-hover:opacity-100
			relative -top-px inline flex-shrink-0
			`}
		/> -->
		
		<span class={`
			overflow-hidden whitespace-nowrap
			transition-[max-width,margin,opacity] duration-500 ease-in-out
			max-w-40 opacity-100 ml-1.5
		`}>
			Sluiten
		</span>
	</button>
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