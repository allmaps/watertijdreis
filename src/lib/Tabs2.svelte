<script>
    import Timeline2 from "./Timeline2.svelte";
    import { 
        Stack, 
        FilePlus,
        MapTrifold, 
        ArrowsOutLineHorizontal, 
        MagnifyingGlass, 
        MagnifyingGlassPlus, 
        MagnifyingGlassMinus, 
        NavigationArrow, 
		ClockCounterClockwise

    } from "phosphor-svelte";

    let { mapViewer } = $props();

    let selectedTab = $state('tab1');
    let isHidden = $state(false);

    function selectTab(tab) {
        if(tab == selectedTab) isHidden = !isHidden;
        else isHidden = false;
        isComparing = tab == 'tab3';

        selectedTab = tab;
    }
</script>

<div id="tabs-container" class:is-hidden={isHidden}>
    <div id="tabs">
        <button onclick={() => selectTab('tab1')} class:selected={selectedTab === 'tab1'}>
            <ClockCounterClockwise size="18" weight="bold" class="inline mr-1 relative top-[-1px]" />    
            <span>Tijdreizen</span>
        </button>
        <button onclick={() => selectTab('tab2')} class:selected={selectedTab === 'tab2'}>
            <FilePlus size="18" weight="regular" class="inline mr-1 relative top-[-1px]" />    
            <span>Blad selecteren...</span>
        </button>
    </div>
    <div id="content">
        {#if selectedTab === 'tab1'}
            <div id="timeline" class="bg-[#f3f3ffcc]" style="width: 100%;">
                <Timeline2 {mapViewer}></Timeline2>
            </div>
        {:else if selectedTab === 'tab2'}
            <div>
                
            </div>
        {/if}
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
        border: 2px solid var(--foreground-highlight);
        border-bottom: none;
    }

    #tabs button #counter {
        background: #336;
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