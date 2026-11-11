<script lang="ts">
	import { DotsSixVertical, Eye, EyeSlash, Info } from "phosphor-svelte";
	import type { MapLayer } from "$lib/map/MapLayer.svelte";
	import { HistoricMapSeries } from "$lib/map/HistoricMapSeries.svelte";

	let {
		layer,
		dragging = false,
		onSettingsClick,
		onGripDown,
		onNudge,
	}: {
		layer: MapLayer;
		dragging?: boolean;
		onSettingsClick: () => void;
		onGripDown: (e: PointerEvent) => void;
		onNudge: (direction: 1 | -1) => void;
	} = $props();

	function onGripKeydown(e: KeyboardEvent) {
		if (!layer.movable) return;
		if (e.key === "ArrowUp") {
			e.preventDefault();
			onNudge(1);
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			onNudge(-1);
		}
	}
</script>

<div
	class="group flex items-center justify-between gap-2 rounded-md p-1 text-xs transition-colors {dragging
		? 'bg-white/10 ring-1 ring-white/25'
		: ''}"
>
	<div class="flex items-center gap-2.5">
		<button
			type="button"
			data-grip
			disabled={!layer.movable}
			aria-label={layer.movable
				? "Volgorde wijzigen (sleep, of gebruik pijltje omhoog/omlaag)"
				: "Deze laag staat vast"}
			onpointerdown={onGripDown}
			onkeydown={onGripKeydown}
			class="touch-none text-white/40 transition-colors {layer.movable
				? 'cursor-grab hover:text-white active:cursor-grabbing'
				: 'cursor-not-allowed opacity-30'}"
		>
			<DotsSixVertical size="18" />
		</button>

		<button
			onclick={() => (layer.visible = !layer.visible)}
			class="cursor-pointer rounded-md border border-white/20 bg-white/10 p-1 transition-colors hover:bg-white/20"
			aria-label="Zichtbaarheid wisselen"
		>
			{#if layer.visible}
				<Eye size="16" class="text-white" />
			{:else}
				<EyeSlash size="16" class="text-white/50" />
			{/if}
		</button>

		<span class="max-w-[130px] truncate font-semibold tracking-wide text-white">{layer.name}</span>
		<span><Info size="12" class="inline"></Info></span>
	</div>

	<div class="flex items-center gap-2">
		{#if layer instanceof HistoricMapSeries && !layer.mapsLoaded}
			<span class="text-white/50">Laden…</span>
		{:else}
			{@const isHistoric = layer instanceof HistoricMapSeries}
			{@const years = isHistoric
				? Array.from(layer.visibleMaps.values(), (m) => m.yearEnd).filter((y): y is number => y !== undefined)
				: []}
			<div
				class="rounded-md border px-1 py-0.5"
				style:background="color-mix(in srgb, {layer.themeColor} 20%, transparent)"
				style:border-color="color-mix(in srgb, {layer.themeColor} 50%, transparent)"
				style:color="color-mix(in srgb, {layer.themeColor} 50%, #ffffff)"
			>
				{#if isHistoric}
					{#if years.length}
						Hist. <span class="font-mono text-[11px]">{Math.min(...years)}-{Math.max(...years)}</span>
					{:else}
						Historisch
					{/if}
				{:else}
					Actueel
				{/if}
			</div>
		{/if}

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
</div>
