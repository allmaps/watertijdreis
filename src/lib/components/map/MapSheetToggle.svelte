<script lang="ts">
	import { getContext } from "svelte";
	import { fade, slide, type FadeParams, type SlideParams } from "svelte/transition";
	import { MapTrifold, FileText, PushPin } from "phosphor-svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";

	const mapContext = getContext<MapContext>("mapContext");
	const historic = mapContext.historic;

	const selectedMap = $derived(historic.selectedMap);
	const pinnedMap = $derived(historic.pinnedMap);
	const clickedMap = $derived(historic.clickedHistoricMap);

	const sheetMode = $derived(!!selectedMap || mapContext.sheetIndexVisible);

	const isSelectedPinned = $derived(!!selectedMap && historic.pinnedMapId === selectedMap.id);

	const showPin = $derived(!!selectedMap || (!!pinnedMap && !clickedMap));
	const pinFilled = $derived(selectedMap ? isSelectedPinned : true);

	const rightLabel = $derived(
		selectedMap?.label ?? (pinnedMap && !clickedMap ? pinnedMap.label : (clickedMap?.label ?? "Individueel blad"))
	);

	let hintVisible = $state(true);
	const showShortcutHint = false;

	$effect(() => {
		const timer = setTimeout(() => (hintVisible = false), 2000);
		return () => clearTimeout(timer);
	});

	function showMap() {
		if (selectedMap && isSelectedPinned) historic.pinnedMapView = mapContext.saveMapView(false);
		historic.selectedMapId = null;
		historic.setSheetIndexVisibility(false);
	}

	function showSheets() {
		const id = selectedMap ? null : (clickedMap?.id ?? pinnedMap?.id ?? null);
		if (id) {
			historic.selectedMapId = id;
			return;
		}
		if (!historic.setSheetIndexVisibility()) showMap();
	}

	function togglePin() {
		if (selectedMap && !isSelectedPinned) {
			historic.pinnedMapView = mapContext.saveMapView(false);
			historic.pinnedMapId = selectedMap.id;
		} else {
			historic.pinnedMapId = null;
		}
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;

		if (e.key === "Escape") {
			showMap();
			return;
		}

		if (e.key === " " && !e.repeat) {
			const target = e.target;
			if (
				target instanceof HTMLElement &&
				target.closest("input, textarea, select, button, a, [contenteditable='true']")
			)
				return;

			e.preventDefault();
			showSheets();
		}
	}

	let leftWidth = $state(0);
	let rightWidth = $state(0);
	const measured = $derived(leftWidth > 0 && rightWidth > 0);

	function slideFade(node: Element, params: SlideParams & FadeParams = {}) {
		const s = slide(node, params);
		const f = fade(node, params);

		return {
			delay: Math.min(s.delay ?? 0, f.delay ?? 0),
			duration: Math.max(s.duration ?? 300, f.duration ?? 300),
			css: (t: number, u: number) => `${s.css?.(t, u) ?? ""};${f.css?.(t, u) ?? ""}`,
		};
	}
</script>

<svelte:document onkeydown={onKeydown} />

<div role="group" aria-label="Weergave" class="text-[12px] text-white">
	<div class="rounded-lg border border-white/20 bg-white/10 p-0.5">
		<div class="relative flex h-7 items-stretch">
			<span
				aria-hidden="true"
				class="absolute inset-y-0 left-0 rounded-md bg-white shadow-sm {measured
					? 'transition-[transform,width] duration-200 ease-in-out'
					: 'opacity-0'}"
				style:transform="translateX({sheetMode ? leftWidth : 0}px)"
				style:width="{sheetMode ? rightWidth : leftWidth}px"
			></span>

			<button
				type="button"
				bind:clientWidth={leftWidth}
				onclick={showMap}
				aria-pressed={!sheetMode}
				class="relative z-10 flex h-full cursor-pointer items-center gap-1.5 rounded-md px-3 font-medium transition-colors {sheetMode
					? 'text-white/70 hover:text-white'
					: 'text-wtr-blue'}"
			>
				<MapTrifold size="18" class="shrink-0 transition-colors {sheetMode ? '' : 'text-wtr-blue'}" />
				Kaart
			</button>

			<div
				bind:clientWidth={rightWidth}
				class="relative z-10 flex h-full max-w-50 items-center rounded-md transition-colors {sheetMode
					? 'text-wtr-blue'
					: 'text-white/70 hover:text-white'}"
			>
				<button
					type="button"
					onclick={showSheets}
					aria-pressed={sheetMode}
					class="flex h-full min-w-0 cursor-pointer items-center gap-1.5 rounded-md pl-3 font-medium {showPin
						? 'pr-1'
						: 'pr-3'}"
				>
					<FileText size="18" class="shrink-0 transition-colors {sheetMode ? 'text-wtr-blue' : ''}" />
					<span class="truncate">{rightLabel}</span>

					{#if showShortcutHint}
						<kbd
							transition:slideFade={{ axis: "x", duration: 300 }}
							class="ml-0.5 shrink-0 rounded border px-1.5 font-sans text-[11px] leading-4 select-none {sheetMode
								? 'border-wtr-blue/20 bg-wtr-blue/5 text-wtr-blue/60'
								: 'border-white/25 bg-white/10 text-white/80'}"
						>
							Spatie
						</kbd>
					{/if}
				</button>

				{#if showPin}
					<button
						type="button"
						onclick={togglePin}
						aria-pressed={pinFilled}
						aria-label={pinFilled ? "Blad losmaken" : "Blad vastpinnen"}
						title={pinFilled ? "Blad losmaken" : "Blad vastpinnen"}
						class="mr-1.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded transition-colors {sheetMode
							? 'hover:bg-wtr-blue/10'
							: 'hover:bg-white/15'}"
					>
						<PushPin size="16" weight={pinFilled ? "fill" : "regular"} />
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
