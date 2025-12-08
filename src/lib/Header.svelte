<script lang="ts">
	import { ShareFat, Info, MagnifyingGlass, Waves } from 'phosphor-svelte';
	import SharePanel from './SharePanel.svelte';
	import Button from './Button.svelte';
	import Modal from './Modal.svelte';

	let { historicMapsLoaded } = $props();

	let aboutPanelVisible = $state(false);
	let sharePanelVisible = $state(false);

	let buttonCollapse: boolean = $state(false);
	setTimeout(() => (buttonCollapse = true), 2000);

	let searchBarVisible = $state(false);
</script>

<Modal title="Over Watertijdreis" bind:visible={aboutPanelVisible}>
	<p>Lorem ipsum dolor sit amet…</p>
</Modal>

<SharePanel bind:visible={sharePanelVisible}></SharePanel>

<div
	class="absolute top-5 left-2 z-999 flex items-center gap-1 rounded-[8px] bg-[#33336611] p-4 text-[#336] shadow-lg backdrop-blur-md sm:left-5"
	onmouseenter={() => (buttonCollapse = false)}
	onmouseleave={() => (buttonCollapse = true)}
	role="button"
	tabindex="0"
>
	<h1
		class="mr-1 flex inline cursor-pointer gap-[1px] text-[16px] font-[700] text-shadow-[2px_2px_0_#eef] sm:text-[16px] md:text-[20px]"
	>
		{#each 'Watertijdreis'.split('') as letter, i}
			<span
				class="inline-block will-change-[transform,text-shadow,color]"
				class:wave={historicMapsLoaded}
				class:wave-loading={!historicMapsLoaded}
				style:animation=""
				style:animation-delay={i * 60 + 'ms'}
			>
				{letter}
			</span>
		{/each}
	</h1>

	<!-- <div class="ml-2 inline"> -->
	<Button onclick={() => (aboutPanelVisible = !aboutPanelVisible)} Icon={Info}>Over</Button>
	<Button onclick={() => (sharePanelVisible = !sharePanelVisible)} Icon={ShareFat}>Delen</Button>
	<!-- <button
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
		</button> -->
	<!-- </div> -->
</div>

<style>
	.wave {
		animation: wave 600ms ease-in-out infinite alternate;
	}

	.wave-loading {
		animation: wave-loading 600ms ease-in-out infinite alternate;
	}

	@keyframes wave-loading {
		0% {
			color: #33a;
			opacity: 0;
		}
		100% {
			color: #336;
			opacity: 1;
		}
	}

	@keyframes wave {
		0% {
			transform: translateY(0px);
			color: #33a;
			text-shadow: 1px 1px 0 #aaf;
		}
		100% {
			transform: translateY(-2.1px);
			color: #336;
		}
	}
</style>
