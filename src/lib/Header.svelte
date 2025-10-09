<script lang="ts">
	import { Waves, ShareNetwork, Question } from "phosphor-svelte";

    let wavesFlipped: boolean = $state(true);
    setInterval(() => wavesFlipped = !wavesFlipped, 500);
</script>

<div>
    <Waves size={20} weight="bold" class={`inline-block relative top-[-2px] mx-1 transform ${wavesFlipped ? '-scale-x-100' : ''}`}></Waves>
    Watertijdreis
    <span class="opacity-50 relative top-[-2x] mx-1">|</span>
    <Question size={20} class="inline-block relative top-[-2px] mx-1" />
    <ShareNetwork size={20} class="inline-block relative top-[-2px] mx-1" />
</div>

<style>
    div {
        position: fixed;
        top: 0;
        right: 20px;
        font-size: 16px;
        font-weight: 500;
        background: #336;
        border-radius: 0 0 4px 4px;
        color: #f3f3ffff;
        padding: 2px 6px;
        text-align: center;
        z-index: 10;
    }
</style>