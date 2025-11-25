<script lang="ts">
	import { Play, Pause, SkipBack, SkipForward } from 'phosphor-svelte';

	let isPlaying = false;
	const toggle = () => (isPlaying = !isPlaying);

	const stop = (e: Event) => e.stopPropagation();
</script>

<div class="absolute bottom-4 left-1/2 z-[2000] flex -translate-x-1/2 select-none">
	<div
		class="flex items-center gap-4 rounded-full bg-[#334]/80 px-4 py-2 shadow-lg backdrop-blur-sm"
	>
		<button
			onclick={stop}
			class="rounded-full p-2 text-white transition hover:bg-[#445] active:scale-95"
			title="Vorige"
		>
			<SkipBack size={22} />
		</button>

		<button
			onclick={(e) => {
				stop(e);
				toggle();
			}}
			class="rounded-full bg-white p-3 text-[#334] shadow-md transition hover:scale-105 active:scale-95"
			title={isPlaying ? 'Pauzeer' : 'Speel af'}
		>
			{#if isPlaying}
				<Pause size={24} />
			{:else}
				<Play size={24} />
			{/if}
		</button>

		<button
			onclick={stop}
			class="rounded-full p-2 text-white transition hover:bg-[#445] active:scale-95"
			title="Volgende"
		>
			<SkipForward size={22} />
		</button>
	</div>
</div>
