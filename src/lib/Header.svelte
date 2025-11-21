<script lang="ts">
	import { ShareFat, Info } from 'phosphor-svelte'
	import AboutPanel from './AboutPanel.svelte';
	import SharePanel from './SharePanel.svelte';

	let aboutPanelVisible = $state(false);
	let sharePanelVisible = $state(false);

	let buttonCollapse: boolean = $state(false);
	setTimeout(() => buttonCollapse = true, 2000);
</script>

<AboutPanel bind:visible={aboutPanelVisible}></AboutPanel>

<SharePanel bind:visible={sharePanelVisible}></SharePanel>

<div 
	class="absolute top-5 left-5 shadow-lg px-3 py-3 text-[#336] rounded-[8px] bg-white z-999"
	onmouseenter={() => buttonCollapse = false}
	onmouseleave={() => buttonCollapse = true}
	role="button"
  	tabindex="0"
>
	<!-- <Waves
		size={20}
		weight="bold"
		color="#33336688"
		class={`relative -top-2 mx-1 inline-block transform ${wavesFlipped ? '-scale-x-100' : ''}`}
	></Waves> -->
	<h1 class="inline relative -top-1 font-[700] text-[20px] flex gap-[1px]">
		{#each "Watertijdreis".split("") as letter, i}
			<span
				class="inline-block wave-letter"
				style="animation-delay: {i * 60}ms"
			>
				{letter}
			</span>
		{/each}
	</h1>

	<div class="inline ml-2">
		<button
			onclick={() => aboutPanelVisible = !aboutPanelVisible}
			class={`
				group inline-flex items-center justify-center 
				bg-white border-2 border-[#33336611] font-[500]
				shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
				flex-shrink-0 cursor-pointer 
				hover:bg-[#eef]
				
				transition-all duration-500
				${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg py-2 px-2.5'}
			`}
			>
			<Info color="#f4a" 
				class={`
				h-[22px] w-[22px] opacity-70 group-hover:opacity-100
				relative -top-px inline flex-shrink-0
				`}
			/>
			
			<span class={`
				overflow-hidden whitespace-nowrap
				transition-[max-width,margin,opacity] duration-500 ease-in-out
				${buttonCollapse ? 'max-w-0 opacity-0 ml-0' : 'max-w-40 opacity-100 ml-1.5'}
			`}>
				Over
			</span>
		</button>
		<button
			onclick={() => sharePanelVisible = !sharePanelVisible}
			class={`
				group inline-flex items-center justify-center 
				bg-white border-2 border-[#33336611] font-[500]
				shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
				flex-shrink-0 cursor-pointer 
				hover:bg-[#eef]
				
				transition-all duration-500
				${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg py-2 px-2.5'}
			`}
			>
			<ShareFat color="#f4a" 
				class={`
				h-[22px] w-[22px] opacity-70 group-hover:opacity-100
				relative -top-px inline flex-shrink-0
				`}
			/>
			
			<span class={`
				overflow-hidden whitespace-nowrap
				transition-[max-width,margin,opacity] duration-500 ease-in-out
				${buttonCollapse ? 'max-w-0 opacity-0 ml-0' : 'max-w-40 opacity-100 ml-1.5'}
			`}>
				Delen
			</span>
		</button>
	</div>
</div>

<style>
	h1 {
		/* font-family: "ivypresto-display"; */
	}

	.wave-letter {
		display: inline-block;
		animation: wave 600ms ease-in-out infinite alternate;
	}

	@keyframes wave {
		0%   { transform: translateY(0px); color: #33a }
		100% { transform: translateY(-2px); color: #336 }
	}
</style>