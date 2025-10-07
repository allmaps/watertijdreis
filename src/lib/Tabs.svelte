<script lang="ts">
    import Timeline from "./Timeline.svelte";
    import Thumbnails from "./Thumbnails.svelte";
    import { Select } from"bits-ui";
    import { createEventDispatcher, onMount } from 'svelte';
    
    import { Images, CopySimple, CaretDoubleDown, ArrowArcRight, ListNumbers, XSquare, CaretUpDown, CaretUp, CaretDown, CaretRight, CaretLeft, Check, CaretDoubleUp, ShareFat, Stack, MapTrifold, ArrowsOutCardinal, ArrowsOutLineHorizontal, MagnifyingGlass, MagnifyingGlassPlus, MagnifyingGlassMinus, NavigationArrow} from "phosphor-svelte";

    let { map, mapCompare, showCompareMap, hideCompareMap, setAnnotationUrl } = $props();
    let mapInitialized = $state(false);
    let mapRotation = $state('');
    let mapScale = $state('');

    setTimeout(() => console.log(map), 500);

    let selectedTab = $state('tab1');
    let isHidden = $state(false);
    let timelineHidden = $state(false);
    let tabsWithTimeline = ['tab1', 'tab2', 'tab3', 'tab4'];

    function selectTab(tab) {
        if(tab == selectedTab) isHidden = !isHidden;
        if(tab == 'tab3') showCompareMap();
        else hideCompareMap();

        timelineHidden = !tabsWithTimeline.includes(tab);
        selectedTab = tab;
    }

    $effect(() => {
        if(map && !mapInitialized) {
            mapInitialized = true;
            map.on('move', () => {
                mapScale = '1:' + (40075016.686 / (256 * 2**map.getZoom())).toFixed(0);
                mapRotation = `${map.getBearing()}°`;
            });
            map.setBearing(0); // Just to update on('move')
        }
        if(map && mapRotation) map.setBearing(parseInt(mapRotation));
    })

    const typekaarten = [
    { typeValue: "WSK", label: "Waterstaatskaart" },
    { typeValue: "HWP", label: "Hydrologische Waarnemingspunten" },
    { typeValue: "WVE", label: "Watervoorzieningsenheden" }
  ];
 
  let typeValue: string = $state("");
  const selectedLabel1 = $derived(
    typeValue
      ? typekaarten.find((typekaart) => typekaart.typeValue === typeValue)?.label
      : "Kies een type kaartvel"
  );

  const edities = [
    { value2: "1e", label: "1e Editie" },
    { value2: "2e", label: "2e Editie" },
    { value2: "3e", label: "3e Editie" }
  ];
 
  let value2 = $state<string>("");
  const selectedLabel2 = $derived(
    value2
      ? edities.find((editie) => editie.value2 === value2)?.label
      : "Bekijk een andere editie"
  );

   const achtergrondkaarten = [
    { value: "ahn", label: "Actueel Hoogtebestand" },
    { value: "km", label: "Kilometer (km)" },
    { value: "ft", label: "Voet (ft)" },
    { value: "mi", label: "Mijl (mi)" }
  ];

  let achtergrondValue = $state<string>("");
  const selectedAchtergrond = $derived(() =>
    achtergrondValue
      ? achtergrondkaarten.find((a) => a.value === achtergrondValue)?.label
      : "Kies een achtergrondkaart"
  );

  const dispatch = createEventDispatcher();

</script>

<div id="tabs-container" class:is-hidden={isHidden}>
    <div id="tabs">
        <button onclick={() => selectTab('tab1')} class:selected={selectedTab === 'tab1'}>
            <ArrowsOutCardinal size="18" class="inline mr-1 relative top-[-1px]" />    
            <span>Navigatie</span>
        </button>
        <button onclick={() => selectTab('tab2')} class:selected={selectedTab === 'tab2'}>
            <Stack size="18" class="inline mr-1 relative top-[-1px]" />    
            <span>Lagen</span>
        </button>
        <button onclick={() => selectTab('tab3')} class:selected={selectedTab === 'tab3'}>
            <ArrowsOutLineHorizontal size="18" class="inline mr-1 relative top-[-1px]" />    
            <span>Vergelijken</span>
        </button>
        <button onclick={() => selectTab('tab4')} class:selected={selectedTab === 'tab4'}>
            <Images size="18" class="inline mr-1 relative top-[-1px]" />    
            <span>In Beeld</span>
            <span id="counter2">46</span>
            <span id="counter1">39</span>
        </button>
        <button onclick={() => selectTab('tab5')} class:selected={selectedTab === 'tab5'}>
            <ShareFat size="18" class="inline mr-1 relative top-[-1px]" />    
            <span>Exporteren</span>
        </button>
    </div>

    <div id="content">
        {#if selectedTab === 'tab1'}
            <div id="button-container">
                <button onclick={() => map.zoomIn()}>
                    <MagnifyingGlassPlus size="18" class="inline relative top-[-1px]" />
                </button>
                <button onclick={() => map.zoomOut()}>
                    <MagnifyingGlassMinus size="18" class="inline relative top-[-1px]" />
                </button>
            </div>

            <div id="input-container">
                <label for="schaal">Schaal</label>
                <input name="schaal" type="text" bind:value={mapScale}>
            </div>

            <div id="input-container">
                <label for="rotatie">Rotatie</label>
                <input name="rotatie" type="text" bind:value={mapRotation}>
            </div>

            <div id="button-container">
                <button style:width="165px">
                    <MagnifyingGlass size="18" class="inline relative top-[-1px]" />
                    Locatie zoeken...
                </button>
            </div>

            <div id="button-container">
                <button>
                    <NavigationArrow size="18" class="inline relative top-[-1px]" />
                    Naar mijn locatie
                </button>
            </div>
        {:else if selectedTab === 'tab2'}
            <div id="select-container" class="with-icon relative">
                <label for="eenheid">Achtergrondkaart</label>
                <MapTrifold size="18" class="inline absolute top-[31px] left-4"></MapTrifold>
                <select name="eenheid" style:width="220px">
                    <option value="m">Actueel Hoogtebestand</option>
                    <option value="km">Kilometer (km)</option>
                    <option value="ft">Voet (ft)</option>
                    <option value="mi">Mijl (mi)</option>
                </select>
            </div>
            <div id="select-container" class="with-icon relative">
                <label for="eenheid">Historische kaart</label>
                <MapTrifold size="18" class="inline absolute top-[31px] left-4"></MapTrifold>
                <select 
                    name="eenheid" 
                    style:width="220px"
                    onchange={(e) => setAnnotationUrl(map, e.target.value - 1)}    
                >
                    <option value="1">1e editie - Waterstaatskaart</option>
                    <option value="2">2e editie - Waterstaatskaart</option>
                    <option value="3" selected>3e editie - Waterstaatskaart</option>
                    <option value="4">4e editie - Waterstaatskaart</option>
                    <option value="5">5e editie - Waterstaatskaart</option>
                </select>
            </div>
            <div id="select-container" class="with-icon relative">
                <label for="eenheid">Overlegger</label>
                <MapTrifold size="18" class="inline absolute top-[31px] left-4"></MapTrifold>
                <select name="eenheid" style:width="220px">
                    <option value="m">Geen</option>
                    <option value="km">Kilometer (km)</option>
                    <option value="ft">Voet (ft)</option>
                    <option value="mi">Mijl (mi)</option>
                </select>
            </div>
        {:else if selectedTab === 'tab3'}
            <div id="select-container" class="with-icon relative">
                <label for="eenheid">Achtergrondkaart</label>
                <MapTrifold size="18" class="inline absolute top-[31px] left-4"></MapTrifold>
                <select name="eenheid" style:width="220px">
                    <option value="m">Actueel Hoogtebestand</option>
                    <option value="km">Kilometer (km)</option>
                    <option value="ft">Voet (ft)</option>
                    <option value="mi">Mijl (mi)</option>
                </select>
            </div>
            <div id="select-container" class="with-icon relative">
                <label for="eenheid">Historische kaart</label>
                <MapTrifold size="18" class="inline absolute top-[31px] left-4"></MapTrifold>
                <select 
                    name="eenheid" 
                    style:width="220px"
                    onchange={(e) => setAnnotationUrl(mapCompare, e.target.value - 1)}
                    >
                    <option value="1" selected>1e editie - Waterstaatskaart</option>
                    <option value="2">2e editie - Waterstaatskaart</option>
                    <option value="3">3e editie - Waterstaatskaart</option>
                    <option value="4">4e editie - Waterstaatskaart</option>
                    <option value="5">5e editie - Waterstaatskaart</option>
                </select>
            </div>
            <div id="select-container" class="with-icon relative">
                <label for="eenheid">Overlegger</label>
                <MapTrifold size="18" class="inline absolute top-[31px] left-4"></MapTrifold>
                <select name="eenheid" style:width="220px">
                    <option value="m">Geen</option>
                    <option value="km">Kilometer (km)</option>
                    <option value="ft">Voet (ft)</option>
                    <option value="mi">Mijl (mi)</option>
                </select>
            </div>
            <div id="select-container" class="with-icon relative">
                <label for="eenheid">Vergelijkingsmodus</label>
                <MapTrifold size="18" class="inline absolute top-[31px] left-4"></MapTrifold>
                <select name="eenheid" style:width="220px">
                    <option value="swipe">Swipe (veeg)</option>
                    <option value="opacity" selected>Doorzichtigheid</option>
                    <option value="spyglass">Loep</option>
                </select>
            </div>
        {:else if selectedTab === 'tab4'}

            <!-- <Thumbnails></Thumbnails> -->
           <!-- <div class="w-10 h-11  pl-4 pt-2 justify-center text-neutral-500 text-s font-light font-['Inter']">
            Klik op een kaart in de lijst of op het scherm om hem te openen!</div> -->
       <div id="select-container" class="with-icon relative">
                <label for="eenheid">Type Kaartvel</label>
       <Select.Root
  type="single"
  onValueChange={(v) => (typeValue = v)}
  items={typekaarten}
  allowDeselect={true}
>
  <Select.Trigger
    class="h-input rounded-9px border-border-input bg-background data-placeholder:text-foreground-alt/50 inline-flex w-[220px] touch-none select-none items-center border px-[11px] text-sm transition-colors px-4px"
    aria-label="Kies een type kaartvel"
  >
    <CopySimple class="text-muted-foreground mr-[9px] size-6" />
    {selectedLabel1}
    <CaretUpDown class="text-muted-foreground ml-auto size-6" />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content
      class="focus-override z-[9999] border-muted bg-background shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 outline-hidden z-50 max-h-[var(--bits-select-content-available-height)] w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] select-none rounded-xl border px-1 py-3 data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1"
      sideOffset={10}
    >
      <Select.ScrollUpButton class="flex w-full items-center justify-center">
        <CaretDoubleUp class="size-3" />
      </Select.ScrollUpButton>
      <Select.Viewport class="p-1">
        {#each typekaarten as typekaart, i (i + typekaart.typeValue)}
          <Select.Item
            class="rounded-button data-highlighted:bg-muted outline-hidden data-disabled:opacity-50 flex h-10 w-full select-none items-center py-3 pl-5 pr-1.5 text-sm capitalize"
            value={typekaart.typeValue}
            label={typekaart.label}
            disabled={typekaart.disabled}
          >
            {#snippet children({ selected })}
              {typekaart.label}
              {#if selected}
                <div class="ml-auto">
                  <Check aria-label="check" />
                </div>
              {/if}
            {/snippet}
          </Select.Item>
        {/each}
      </Select.Viewport>
      <Select.ScrollDownButton class="flex w-full items-center justify-center">
        <CaretDoubleDown class="size-3" />
      </Select.ScrollDownButton>
    </Select.Content>
  </Select.Portal>
</Select.Root>
</div>

<div id="select-container" class="with-icon relative">
                <label for="eenheid">Editie</label>
<Select.Root
  type="single"
  onValueChange={(v) => (value2 = v)}
  items={edities}
  allowDeselect={true}
>
  <Select.Trigger
    class="h-input rounded-9px border-border-input bg-background data-placeholder:text-foreground-alt/50 inline-flex w-[220px] touch-none select-none items-center border px-[11px] text-sm transition-colors p-5px"
    aria-label="Kies een type kaartvel"
  >
    <CopySimple class="text-muted-foreground mr-[9px] size-6" />
    {selectedLabel2}
    <CaretUpDown class="text-muted-foreground ml-auto size-6" />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content
      class="focus-override z-[9999] border-muted bg-background shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 outline-hidden z-50 max-h-[var(--bits-select-content-available-height)] w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] select-none rounded-xl border px-1 py-3 data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1"
      sideOffset={10}
    >
      <Select.ScrollUpButton class="flex w-full items-center justify-center">
        <CaretDoubleUp class="size-3" />
      </Select.ScrollUpButton>
      <Select.Viewport class="p-1">
        {#each edities as editie, i (i + editie.value2)}
          <Select.Item
            class="rounded-button data-highlighted:bg-muted outline-hidden data-disabled:opacity-50 flex h-10 w-full select-none items-center py-3 pl-5 pr-1.5 text-sm capitalize"
            value={editie.value2}
            label={editie.label}
            disabled={editie.disabled}
          >
            {#snippet children({ selected })}
              {editie.label}
              {#if selected}
                <div class="ml-auto">
                  <Check aria-label="check" />
                </div>
              {/if}
            {/snippet}
          </Select.Item>
        {/each}
      </Select.Viewport>
      <Select.ScrollDownButton class="flex w-full items-center justify-center">
        <CaretDoubleDown class="size-3" />
      </Select.ScrollDownButton>
    </Select.Content>
  </Select.Portal>
</Select.Root>
</div>

<div id="button-container">
                <button style:width="260px">
                    <MagnifyingGlass size="18" class="inline relative top-[-1px]" />
                    Kaartvel op een andere locatie...
                </button>
            </div>
            {:else if selectedTab === 'tab5'}
            <p>Exporteren content...</p>
        {/if}
    </div>
    <div id="timeline" class="bg-[#f3f3ffcc]" class:hidden={timelineHidden}>
        <Timeline></Timeline>
    </div>
</div>

<style>
    :root {
        --background-color: #005;
        --foreground-highlight: #ffffff33;
        --foreground-color: #fff;
        --background-color: #fff;
        --foreground-highlight: #eee;
        --foreground-color: #000;
        --inactive-tab-color: #f3f3ffcc;
        --tabs-side-margin: 10px;
    }

    #tabs-container {
        position: absolute;
        left: 10px;
        right: 10px;
        bottom: 0px;
        width: calc(100% - --tabs-side-margin * 2);
        transition: transform 0.3s ease;
        color: var(--foreground-color);
        z-index: 1000;
        user-select: none;
    }

    @media only screen and (max-width: 512px) {
        #tabs-container button span {
            font-size: 12px;
        }
    }

    @media only screen and (max-width: 750px) {
        #tabs-container {
            left: 0;
            right: 0;
        }
    }

    #tabs-container.is-hidden {
        transform: translateY(calc(100% - 44px));
    }

    #content {
        background: var(--background-color);
        padding: 12px 20px;
        padding-top: 6px;
        box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
        display: flex;
        vertical-align: bottom;
        min-height: 80px;
        border-radius: 0 8px 0 0;
    }

    #tabs {
        display: flex;
        justify-content: left;
    }

    #tabs button {
        background: var(--inactive-tab-color);
        border: none;
        padding: 10px 12px;
        margin: 0 2px;
        cursor: pointer;
        border-radius: 8px 8px 0 0;
        font-size: 16px;
        font-weight: 500;
    }

    #tabs button:first-child {
        margin-left: 0;
    }

    #tabs button.selected {
        background: var(--background-color);
        opacity: 1;
    }

    #tabs button #counter1 {
        background: #aa44ff;
        color: white;
        border-radius: 8px;
        padding: 2px 5px;
    }

    #tabs button #counter2 {
        background: #f4a;
        color: white;
        border-radius: 8px;
        padding: 2px 5px;
    }

    label {
        font-size: 12px;
        opacity: .5;
    }

    #input-container, #select-container {
        display: inline-flex;
        flex-direction: column;
        padding-left: 5px; 
    }

    #input-container label, #select-container label {
        margin-left: 10px;
    }

    #input-container input, #select-container select {
        background: var(--background-color);
        border: 2px solid var(--foreground-highlight);
        border-radius: 8px;
        display: inline-block;
        margin: 0 5px;
        padding: 8px 10px;
        font-size: 16px;
        font-weight: 500;
        width: 100px;
        box-shadow: 0 2px 2px rgba(0,0,0,0.05);
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

    #button-container {
        background: var(--background-color);
        border: 2px solid var(--foreground-highlight);
        border-radius: 8px;
        display: inline-flex;
        margin: 0 5px;
        margin-top: 18px;
        box-shadow: 0 2px 2px rgba(0,0,0,0.05);
        overflow: hidden;
        flex-shrink: 0;
    }

    #button-container button {
        margin: 0;
        padding: 8px 10px;
        border-left: 1px solid var(--foreground-highlight);
        cursor: pointer;
    }

    #button-container button:hover {
        background: var(--inactive-tab-color);
        /* color: #2222ff; */
    }

    #button-container button:first-child {
        border-left: none;
    }
</style>