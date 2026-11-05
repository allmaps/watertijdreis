<script lang="ts">
	import { cubicOut } from "svelte/easing";
	import { fly, slide } from "svelte/transition";
	import { CaretRight, Info } from "phosphor-svelte";
	import type { SheetInfo } from "$lib/map/sheetInfo.svelte";
	import MapThumbnail from "./HistoricMapThumbnail.svelte";

	let { info, onOpenInfo }: { info: SheetInfo; onOpenInfo: () => void } = $props();

	/** De thumbnail "klapt" omhoog: schuin gekanteld en klein naar vlak en op ware grootte */
	function thumbPop(_node: Element, { duration = 400 } = {}) {
		return {
			duration,
			easing: cubicOut,
			css: (t: number, u: number) =>
				`transform: translate(${-30 * u}px, 0) rotateX(${60 * u}deg) scale(${1 - 0.75 * u}); opacity: ${t};`,
		};
	}
</script>

{#if info.map}
	{@const map = info.map}
	<div transition:slide={{ duration: 200 }} class="pb-2">
		<div class="flex items-stretch gap-3 rounded-lg border border-white/10 bg-white/5 p-2">
			<div class="shrink-0" style="transform-style: preserve-3d; perspective: 100px">
				<button
					type="button"
					in:thumbPop|global
					out:thumbPop|global
					onclick={() => info.open()}
					disabled={info.isSelected}
					aria-label="Blad openen"
					class="relative block h-22 w-fit origin-[10%_100%] overflow-hidden rounded-sm shadow-md will-change-transform enabled:cursor-pointer"
				>
					{#if info.currentIsBackside && info.canvasImage}
						<img alt="" class="block h-full w-auto object-cover" src="{info.canvasImage}/full/,256/0/default.jpg" />
					{:else}
						<MapThumbnail id={map.id} height={88} />
					{/if}

					{#if info.viewportRect}
						{@const r = info.viewportRect}
						<div
							class="border-wtr-blue/40 pointer-events-none absolute rounded-sm border-4"
							style="left: {r.left}%; top: {r.top}%; width: {r.width}%; height: {r.height}%;"
						></div>
					{/if}
				</button>
			</div>

			{#key map.id}
				<div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5" in:fly={{ x: -12, duration: 200 }}>
					<button
						type="button"
						onclick={() => info.open()}
						disabled={info.isSelected}
						class="line-clamp-2 text-left text-sm font-bold text-white enabled:cursor-pointer enabled:hover:underline"
					>
						{info.title}
					</button>
					{#if info.subtitle}
						<p class="text-xs font-medium text-white/70">{info.subtitle}</p>
					{/if}
				</div>
			{/key}

			{#if info.isSelected}
				<button
					type="button"
					onclick={onOpenInfo}
					aria-label="Bladinformatie"
					class="group flex cursor-pointer items-center gap-1 self-center rounded-md bg-white/5 px-2 py-1 text-xs text-white/80 transition-colors hover:bg-white/15 hover:text-white"
				>
					<Info size="16" />
					<span>Info</span>
					<CaretRight size="12" class="text-white/60 transition-transform group-hover:translate-x-0.5" />
				</button>
			{/if}
		</div>
	</div>
{/if}
