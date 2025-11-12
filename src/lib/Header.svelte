<script lang="ts">
	import { Waves, ShareNetwork, Question, Plus } from 'phosphor-svelte';

	let wavesFlipped: boolean = $state(true);
	setInterval(() => (wavesFlipped = !wavesFlipped), 500);
</script>

<div class="absolute top-0 left-5 bg-white shadow-lg">
	<Waves
		size={20}
		weight="bold"
		class={`relative top-[-2px] mx-1 inline-block transform ${wavesFlipped ? '-scale-x-100' : ''}`}
	></Waves>
	Watertijdreis
	<span class="relative top-[-2x] mx-1 opacity-50">|</span>
	<Plus
		size={20}
		class="relative top-[-2px] mx-1 inline-block"
		onclick={() => window.open(window.location.href, '_blank')}
	></Plus>
	<Question size={20} class="relative top-[-2px] mx-1 inline-block" />
	<ShareNetwork size={20} class="relative top-[-2px] mx-1 inline-block" />
</div>

<style>
	div {
		font-family: 'ivypresto-display' !important;
		font-weight: 600 !important;
		font-size: 18px;
		font-weight: 500;
		background: #fff;
		border-radius: 0 0 4px 4px;
		color: #333366;
		padding: 2px 6px;
		text-align: center;
		z-index: 10;
	}
</style>
