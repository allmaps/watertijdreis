<script lang="ts">
	import { DotsSixVertical, Eye, EyeSlash, Info } from "phosphor-svelte";
	import type { MapLayer } from "$lib/state/MapLayer.svelte";

	let { layer, onSettingsClick }: { layer: MapLayer; onSettingsClick: () => void } = $props();
</script>

<div class="group flex items-center justify-between gap-2 px-1 text-xs transition-colors">
	<div class="flex items-center gap-2.5">
		<!-- Drag handle -->
		<button
			type="button"
			aria-label="Volgorde wijzigen"
			class="cursor-grab text-white/40 hover:text-white active:cursor-grabbing"
		>
			<DotsSixVertical size="18" />
		</button>

		<!-- Zichtbaarheid Toggle (Oogje) -->
		<button
			onclick={() => layer.setVisibility(!layer.visible)}
			class="cursor-pointer rounded-md border border-white/20 bg-white/10 p-1 transition-colors hover:bg-white/20"
			aria-label="Zichtbaarheid wisselen"
		>
			{#if layer.visible}
				<Eye size="16" class="text-white" />
			{:else}
				<EyeSlash size="16" class="text-white/50" />
			{/if}
		</button>

		<!-- Titel -->
		<span class="max-w-[130px] truncate font-semibold tracking-wide text-white">{layer.name}</span>
	</div>

	<!-- Rechterkant: Instellingen knop (pijltje / info) -->
	<button
		type="button"
		onclick={onSettingsClick}
		class="flex cursor-pointer items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-white/80 transition-all hover:bg-white/15 hover:text-white"
	>
		<span class="text-[10px]">Opties</span>
		<svg
			class="h-3 w-3 text-white/60 transition-transform group-hover:translate-x-0.5"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2.5"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
		</svg>
	</button>
</div>
