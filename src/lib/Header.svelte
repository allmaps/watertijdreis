<script lang="ts">
	import { ShareFat, Info } from 'phosphor-svelte';
	import AboutPanel from './AboutPanel.svelte';
	import SharePanel from './SharePanel.svelte';

	let aboutPanelVisible = $state(false);
	let sharePanelVisible = $state(false);

	let buttonCollapse: boolean = $state(false);
	setTimeout(() => (buttonCollapse = true), 2000);
</script>

<AboutPanel bind:visible={aboutPanelVisible}></AboutPanel>

<SharePanel bind:visible={sharePanelVisible}></SharePanel>

<div
	class="absolute top-5 left-5 z-999 rounded-[8px] bg-white px-3 py-3 text-[#336] shadow-lg"
	onmouseenter={() => (buttonCollapse = false)}
	onmouseleave={() => (buttonCollapse = true)}
	role="button"
	tabindex="0"
>
	<!-- <Waves
		size={20}
		weight="bold"
		color="#33336688"
		class={`relative -top-2 mx-1 inline-block transform ${wavesFlipped ? '-scale-x-100' : ''}`}
	></Waves> -->
	<h1
		class="display-inline-block relative -top-1 flex inline cursor-pointer gap-[1px] text-[16px] font-[700] sm:text-[16px] md:text-[20px]"
	>
		{#each 'Watertijdreis'.split('') as letter, i}
			<span class="wave-letter inline-block" style="animation-delay: {i * 60}ms">
				{letter}
			</span>
		{/each}
	</h1>

	<div class="ml-2 inline">
		<button
			onclick={() => (aboutPanelVisible = !aboutPanelVisible)}
			class={`
				group inline-flex flex-shrink-0 cursor-pointer 
				items-center justify-center border-2 border-[#33336611]
				bg-white 
				font-[500] shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
				transition-all
				
				duration-500 hover:bg-[#eef]
				${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg px-2.5 py-2'}
			`}
		>
			<Info
				color="#f4a"
				class={`
				relative -top-px inline h-[22px]
				w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
				`}
			/>

			<span
				class={`
				overflow-hidden whitespace-nowrap
				transition-[max-width,margin,opacity] duration-500 ease-in-out
				${buttonCollapse ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 max-w-40 opacity-100'}
			`}
			>
				Over
			</span>
		</button>
		<button
			onclick={() => (sharePanelVisible = !sharePanelVisible)}
			class={`
				group inline-flex flex-shrink-0 cursor-pointer 
				items-center justify-center border-2 border-[#33336611]
				bg-white 
				font-[500] shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
				transition-all
				
				duration-500 hover:bg-[#eef]
				${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg px-2.5 py-2'}
			`}
		>
			<ShareFat
				color="#f4a"
				class={`
				relative -top-px inline h-[22px]
				w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
				`}
			/>

			<span
				class={`
				overflow-hidden whitespace-nowrap
				transition-[max-width,margin,opacity] duration-500 ease-in-out
				${buttonCollapse ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 max-w-40 opacity-100'}
			`}
			>
				Delen
			</span>
		</button>
	</div>
</div>

<style>
	.wave-letter {
		display: inline-block;
		animation: wave 600ms ease-in-out infinite alternate;
	}

	@keyframes wave {
		0% {
			transform: translateY(0px);
			color: #33a;
		}
		100% {
			transform: translateY(-2px);
			color: #336;
		}
	}
</style>
