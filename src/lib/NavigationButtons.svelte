<script lang="ts">
	import {
		MagnifyingGlass,
		MagnifyingGlassPlus,
		MagnifyingGlassMinus,
		NavigationArrow,
		Compass,
		MapTrifold,
		Gear,
	} from "phosphor-svelte";

	import { fade } from 'svelte/transition';
	import { onMount, onDestroy } from 'svelte';

	let layersOpen = false;
	let closeTimeout: ReturnType<typeof setTimeout> | null = null;
	let basemap = "AHN";
	let historical = "Aan";
	let overlay = "Water";

	const basemapOptions = ["AHN", "OSM", "Satelliet"];
	const historicalOptions = ["Aan", "Uit"];
	const overlayOptions = ["Waterwegen (2025)", "Gemeentegrenzen", "Plaatsnamen"];

	function setBasemap(option) { basemap = option; }
	function setHistorical(option) { historical = option; }
	function setOverlay(option) { overlay = option; }

	export let map: maplibregl.Map | null = null;

	let searchQuery = "";
	let expanded = false;
	let inputEl: HTMLInputElement | null = null;

	function zoomIn() { map?.zoomIn(); }
	function zoomOut() { map?.zoomOut(); }
	function resetRotation() { map?.setBearing(0); }


	function handleSearch(e: Event) {
		e.preventDefault();
		alert(`Search for: ${searchQuery}`);
		inputEl?.blur(); 
	}

	function openPanel() {
		if (closeTimeout) clearTimeout(closeTimeout);
		layersOpen = true;
	}
	function closePanel() {
		closeTimeout = setTimeout(() => {
			layersOpen = false;
		}, 250);
	}

	let scale = "10000";

  function handleScaleInput(e: Event) {
    const target = e.target as HTMLSpanElement;
    scale = target.innerText.replace(/[^\d,.]/g, "");
  }

  
</script>



<div id="top-controls-right">
	<!-- Wrapper voor gradient-rand -->
<div class="rounded-full p-[2px] bg-gradient-to-br from-pink-400 to-pink-200 shadow-2xl">
  <!-- Knop zelf -->
  <button
    class="w-9 h-9 rounded-full bg-[#336] flex items-center justify-center text-white transition-transform duration-300 hover:scale-105 active:scale-95"
    title="Lagen"
    onclick={() => layersOpen = !layersOpen}
  >
    <MapTrifold size={16} />
  </button>
    {#if layersOpen}
  <div class="layers-panel" 
       onmouseenter={openPanel} 
       onmouseleave={closePanel}
       transition:fade={{ duration: 200 }}>
	   <div id="select-container" class="with-icon"> 
		<label>Basemap</label> <MapTrifold size="18" class="inline absolute top-[31px] left-4" /> 
		<select bind:value={basemap} onchange={(e) => setBasemap(e.target.value)}> 
			{#each basemapOptions as option} 
			<option value={option}>{option}</option> {/each} 
		</select> 
	</div> 
	<div id="select-container" class="with-icon"> 
				<label>Historical map</label> 
				<MapTrifold size="18" class="inline absolute top-[31px] left-4" /> 
				<select bind:value={historical} onchange={(e) => setHistorical(e.target.value)}> 
					{#each historicalOptions as option} 
					<option value={option}>{option}</option> 
					{/each} 
				</select> 
			</div> 
			<div id="select-container" class="with-icon"> 
						<label>Overlay</label> 
						<MapTrifold size="18" class="inline absolute top-[31px] left-4" /> 
						<select bind:value={overlay} onchange={(e) => setOverlay(e.target.value)}> 
							{#each overlayOptions as option} 
							<option value={option}>{option}</option> {/each} </select> </div>
    </div>
	{/if}
  </div>
  <div class="rounded-full p-[2px] bg-gradient-to-br from-pink-400 to-pink-200 shadow-2xl">
  <button
    class="w-9 h-9 rounded-full bg-[#336] flex items-center justify-center text-white transition-transform duration-300 hover:scale-105 active:scale-95"
    title="Reset rotatie"
    onclick={resetRotation}
  >
    <Compass size={18} />
  </button>
</div>

<div class="rounded-full p-[2px] bg-gradient-to-br from-pink-400 to-pink-200 shadow-2xl">
  <div class="flex flex-col rounded-full overflow-hidden bg-[#336] w-9">
    <button class="zoom-btn h-9 flex items-center justify-center text-white" title="Inzoomen" onclick={zoomIn}>
      <MagnifyingGlassPlus size={16} />
    </button>
    <div class="divider"></div>
    <button class="zoom-btn h-9 flex items-center justify-center text-white" title="Uitzoomen" onclick={zoomOut}>
      <MagnifyingGlassMinus size={16} />
    </button>
  </div>
</div>

<div id="scalebar-container" class="rounded-full p-[2px] bg-gradient-to-br from-pink-400 to-pink-200 shadow-2xl">

  <div class="flex items-center justify-center w-32 h-8 rounded-full bg-[#336] text-white px-3">
    <span class="prefix mr-1 select-none">1:</span>
    <span 
      class="scale-value outline-none min-w-[40px]" 
      contenteditable="true" 
      oninput={handleScaleInput} 
      spellcheck="false">{scale}</span>
  </div>
</div>
</div>



<style>

	.circle-btn,
.zoom-btn {
	cursor: pointer;
}

button[title] {
	position: relative;
}

button[title]:hover::after {
	content: attr(title);
	position: absolute;
	bottom: 110%;
	left: 50%;
	transform: translateX(-50%);
	background: #333;
	color: white;
	font-size: 11px;
	padding: 4px 6px;
	border-radius: 4px;
	white-space: nowrap;
	pointer-events: none;
	opacity: 0;
	animation: quickTooltip 0.1s forwards; /* supersnel zichtbaar */
}
#top-controls-left {
  position: absolute;
  top: 15px;
  left: 15px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 5;
}

#top-controls-right {
  position: absolute;
  bottom: 150px; 
  right: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
  z-index: 25;
  align-self: stretch;
}

#top-controls-right .circle-btn,
#top-controls-right .zoom-group-vertical,
#top-controls-right #scalebar-container,
#top-controls-right .layers-container {
  width: 36px; 
}

#top-controls-right .layers-container .layers-panel {
  right: 45px;
}


.zoom-group-vertical {
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 9999px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

.zoom-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
}

.zoom-btn:hover {
  background: #f3f3ff;
}

.divider {
  width: 100%;
  height: 1px;
  background: #ccc;
}
	#top-controls button,
	#search-bar { background: white; border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15); cursor: pointer; transition: all 0.3s ease; }


	#scalebar-container {
  border-radius: 9999px;
  padding: 0 12px;
  min-width: 60px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  background: white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  cursor: text;
}

#scalebar-container:hover {
  background: #f3f3ff;
}

.prefix {
  margin-right: 4px;
  user-select: none; /* niet selecteerbaar */
}

.scale-value {
  outline: none;
  min-width: 40px;
}

	#top-controls button:hover,
	#search-bar:hover,

	.zoom-group:hover {
		background: #f3f3ff;
	}


	#search-bar {
		border-radius: 9999px;
		padding: 0 12px;
		overflow: hidden;
		position: relative;
		width: 36px;
		height: 36px;
        border: #333366
        border-width: 2px;
	}

	#search-bar input {
		border: none;
		outline: none;
		font-size: 14px;
		margin-left: 8px;
		width: 0;
		opacity: 0;
		transition: width 0.3s ease, opacity 0.3s ease;
	}

	#search-bar.expanded {
		width: 200px;
		justify-content: flex-start;
        
	}

	#search-bar.expanded input {
		width: 100%;
		opacity: 1;
	}

	#search-bar .icon {
		width: 20px;
		height: 20px;
	}


	.circle-btn {
		width: 36px;
		height: 36px;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: white;
		box-shadow: 0 2px 6px rgba(0,0,0,0.15);
	}

	.circle-btn:hover {
		background: #f3f3ff;
	}



	.zoom-group {
		display: flex;
		background: white;
		border-radius: 9999px;
		overflow: hidden;
		box-shadow: 0 2px 6px rgba(0,0,0,0.15);
	}

	.zoom-btn {
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		cursor: pointer;
	}

	.zoom-btn:hover {
		background: #f3f3ff;
	}

	.divider {
		width: 1px;
	}

	#scalebar {
		border-radius: 9999px;
		padding: 0 12px;
		min-width: 60px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
	}

	.layers-container {
	position: relative;
	display: inline-block;
}

.layers-panel {
    position: absolute;
    bottom: 0;
    right: 3.5rem; /* afstand tot knopje */
    width: 220px;
    height: 300px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    padding: 1rem;
    transition: opacity 0.2s ease, transform 0.2s ease;
}

#select-container, #input-container {
	display: inline-flex;
	flex-direction: column;
	position: relative;
}

#select-container label {
	margin-left: 10px;
	margin-bottom: 4px;
	font-weight: 500;
	font-size: 14px;
}

#select-container select {
	background: white;
	border: 2px solid #333366;
	border-radius: 8px;
	padding: 8px 10px 8px 30px;
	width: 200px;
	font-size: 14px;
	box-shadow: 0 2px 2px rgba(0,0,0,0.05);
	appearance: none;
}


@keyframes quickTooltip {
	to {
		opacity: 1;
	}
}

.circle-btn[title="Reset rotatie"] svg {
	transition: transform 0.4s ease;
}

.circle-btn[title="Reset rotatie"]:hover svg {
	animation: wiggle 0.6s ease;
}

@keyframes wiggle {
	0% { transform: rotate(0deg); }
	20% { transform: rotate(-10deg); }
	40% { transform: rotate(8deg); }
	60% { transform: rotate(-5deg); }
	80% { transform: rotate(3deg); }
	100% { transform: rotate(0deg); }
}
</style>
