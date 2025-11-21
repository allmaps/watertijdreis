<script lang="ts">
    import { ImagesSquare, X } from 'phosphor-svelte';
    import { fly, fade } from 'svelte/transition';
    let { visible = $bindable() } = $props();

</script>

<svelte:window 
	onkeydown={(e) => { if(e.key == "Escape") visible = false }}
></svelte:window>

{#if visible}
    <div 
        class="fixed top-0 left-0 w-full h-full bg-[#33336688] z-1000" 
        onclick={() => visible = false}
        transition:fade
    ></div>
    <div 
        class="z-1001 absolute top-50 left-1/2 w-120 -translate-x-1/2 overflow-hidden flex flex-col items-center p-6 shadow-lg rounded-[8px] border-gray-200 bg-white"
        transition:fly={{ y: -20, duration: 250 }}
    >

        <button 
            onclick={() => visible = false}
            class="absolute top-4 right-4 bg-[#ff44aa22] opacity-50 rounded-[8px] p-2 cursor-pointer hover:opacity-100 transition-opacity"
        >
            <X size="24" color="#f4a" weight="bold" class="opacity-67"></X>
        </button>

        <h1 class="text-[#336] font-[700] text-[22px]">Over Watertijdreis</h1>
        
        <div class="p-8 mt-2 text-[#336]">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </div>
    </div>
{/if}