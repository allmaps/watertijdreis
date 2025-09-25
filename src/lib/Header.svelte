<script>
	import { ShareNetwork, Question } from "phosphor-svelte";
</script>

<div>
    Watertijdreis
    <Question size={20} class="relative top-[-2px] mx-1" style="display: inline-block" />
    <ShareNetwork size={20} class="relative top-[-2px] mx-1" style="display: inline-block" />
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