<script lang="ts">
	import { Play, Pause, SkipBack, SkipForward } from 'phosphor-svelte';

	let isPlaying = false;
	const toggle = () => (isPlaying = !isPlaying);

	const stop = (e: Event) => e.stopPropagation();
</script>

<div class="absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-2.5 gap-2 select-none">
	<button
		onclick={stop}
		class="flex h-6 w-6 translate-y-1/6 cursor-pointer
			items-center justify-center rounded-sm border-2 border-[#6c70b7] bg-[#336] opacity-100 shadow-[0_2px_2px_rgba(0,0,0,0.05)] transition transition-all hover:scale-105 hover:bg-[#336]
			hover:opacity-100 active:scale-98"
		title="Eén jaar terug"
	>
		<SkipBack
			weight="duotone"
			color="#fee"
			class={`
			relative -top-px inline h-[13px]
			w-[13px] flex-shrink-0
			`}
		/>
	</button>

	<button
		onclick={(e) => {
			stop(e);
			toggle();
		}}
		class="flex h-8 w-8 cursor-pointer
			items-center justify-center rounded-sm border-2 border-[#6c70b7] bg-[#336] text-[#336] opacity-100 shadow-sm transition transition-all hover:scale-105 hover:bg-[#336] hover:opacity-100 hover:shadow-xl
			active:scale-98"
		title={isPlaying ? 'Stop met tijdreizen' : 'Reis door de tijd!'}
	>
		{#if isPlaying}
			<Pause
				color="#fee"
				weight="fill"
				class={`
			relative -top-px inline h-[20px]
			w-[20px] flex-shrink-0
			`}
			/>
		{:else}
			<Play
				weight="fill"
				color="#fee"
				class={` relative -top-px inline
			h-[20px] w-[20px] flex-shrink-0
			`}
			/>
		{/if}
	</button>

	<button
		onclick={stop}
		class="flex h-6 w-6 translate-y-1/6 cursor-pointer
			items-center justify-center rounded-sm border-2 border-[#6c70b7] bg-[#336] text-[#336] opacity-100 shadow-sm transition transition-all hover:scale-105 hover:bg-[#336]
			hover:opacity-100 active:scale-98"
		title="Eén jaar verder"
	>
		<SkipForward
			weight="duotone"
			color="#fee"
			class={`
		 relative -top-px inline
			h-[13px] w-[13px] flex-shrink-0 opacity-100
			`}
		/>
	</button>
</div>
