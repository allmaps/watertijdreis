<script lang="ts">
	import { Play, Pause, SkipBack, SkipForward } from 'phosphor-svelte';

	let isPlaying = false;
	const toggle = () => (isPlaying = !isPlaying);

	const stop = (e: Event) => e.stopPropagation();
</script>

<div
	class="absolute bottom-0 left-1/2 flex h-8
    -translate-x-1/2 translate-y-3 items-center
    rounded-xl border-1 border-[#6c70b7] bg-[#336] px-1 shadow-md select-none"
>
	<button
		onclick={stop}
		class="group flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg
                p-1 transition-all hover:bg-[#6c70b7] active:scale-95"
		title="Eén jaar terug"
	>
		<SkipBack weight="duotone" color="#fee" class="h-[13px] w-[13px]" />
	</button>

	<button
		onclick={(e) => {
			stop(e);
			toggle();
		}}
		class="group mx-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg
               p-1 transition-all hover:bg-[#6c70b7] active:scale-95"
		title={isPlaying ? 'Stop met tijdreizen' : 'Reis door de tijd!'}
	>
		{#if isPlaying}
			<Pause color="#fee" weight="fill" class="h-[20px] w-[20px]" />
		{:else}
			<Play color="#fee" weight="fill" class="h-[20px] w-[20px]" />
		{/if}
	</button>

	<button
		onclick={stop}
		class="group flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg
               p-1 transition-all hover:bg-[#6c70b7] active:scale-95"
		title="Eén jaar verder"
	>
		<SkipForward weight="duotone" color="#fee" class="h-[13px] w-[13px]" />
	</button>
</div>
