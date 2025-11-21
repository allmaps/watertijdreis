<script lang="ts">
    import { Check, ClipboardText, EnvelopeSimple, ImagesSquare, InstagramLogo, LinkedinLogo, RedditLogo, X } from 'phosphor-svelte';
    import { fly, fade } from 'svelte/transition';
    let { visible = $bindable() } = $props();


    async function setClipboard(text) {
        const type = "text/plain";
        const clipboardItemData = {
            [type]: text,
        };
        const clipboardItem = new ClipboardItem(clipboardItemData);
        await navigator.clipboard.write([clipboardItem]);
        copySuccess = true;
    }

    let copySuccess: boolean = $state(false);
    $effect(() => {
        if (copySuccess) {
            const timeout = setTimeout(() => { copySuccess = false }, 1000);
            return () => clearTimeout(timeout);
        }
    });
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

        <h1 class="text-[#336] font-[700] text-[22px]">Delen</h1>

        <div class="p-8 mt-2">
            <p>Deel Watertijdreis met iemand die ook terug in de tijd wil.</p>
            
            <div class="mt-4 flex items-center">
                <input 
                    type="text" 
                    readonly 
                    value={window.location.href}
                    class="px-2 py-1 h-12 w-[2/3] border-2 border-[#eef] bg-[#ff44aa11] rounded-[6px] text-[#336] text-[16px] font-[500]"
                >
                <button 
                onclick={() => setClipboard(window.location.href)}
                class="w-42 rounded-[6px] bg-[#336] text-white font-[600] px-4 py-1 h-12 ml-4 hover:bg-[#558] transition-colors cursor-pointer">
                    {#if copySuccess}
                        <Check size="22" color="#fff" class="relative -top-2 inline mt-4 mr-2"></Check>
                        Gekopieerd
                    {:else}
                        <ClipboardText size="22" color="#fff" class="relative -top-2 inline mt-4 mr-2"></ClipboardText>
                        Kopieer
                    {/if}
                </button>
            </div>

            <div class="mt-4 text-center">
                <a class="mx-2" href="mailto:?subject=Bekijk%20Watertijdreis%20en%20reis%20terug%20in%20de%20tijd&body=Ik%20wil%20je%20uitnodigen%20om%20de%20Watertijdreis%20te%20bekijken.%20Klik%20op%20deze%20link%20om%20te%20beginnen:%0A%0A{window.location.href}" >
                    <EnvelopeSimple size="32" color="#f4a" class="relative -top-1 inline mt-6"></EnvelopeSimple>
                </a>
                <a class="mx-4">
                   <LinkedinLogo size="32" color="#f4a" class="relative -top-1 inline mt-6 mr-2"></LinkedinLogo> 
                </a>
                <a>
                    <InstagramLogo size="32" color="#f4a" class="relative -top-1 inline mt-6 mr-2"></InstagramLogo>
                </a>
                <a class="mx-4">
                    <RedditLogo size="32" color="#f4a" class="relative -top-1 inline mt-6 mr-2"></RedditLogo>
                </a>
            </div>
        </div>
    </div>
{/if}