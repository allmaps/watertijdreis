<script lang="ts">
	import { getContext } from "svelte";
	import { ui } from "$lib/state/ui.svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import { ShareFat, Info, Plus, Minus, Crosshair, MagnifyingGlass } from "phosphor-svelte";
	import { env } from "$env/dynamic/public";
	import ShareModal from "./modals/ShareModal.svelte";
	import AboutModal from "./modals/AboutModal.svelte";
	import MapSheetToggle from "$lib/components/map/MapSheetToggle.svelte"; // pas het pad aan naar waar hij staat
	import Geocoder from "./geocoder/Geocoder.svelte";
	import { GeocodeEarth } from "./geocoder/providers/geocode-earth";

	const mapContext = getContext<MapContext>("mapContext");

	const geocodeEarthApiKey = env.PUBLIC_GEOCODE_EARTH_API_KEY;

	const cardClass = "flex flex-col gap-1 rounded-lg bg-wtr-blue p-1 shadow-lg ring-1 ring-white/10";
</script>

{#snippet iconButton(Icon: typeof Info, label: string, onclick: () => void, active = false, compact = false)}
	<button
		type="button"
		{onclick}
		title={label}
		aria-label={label}
		class="flex cursor-pointer items-center justify-center rounded-md border transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/60 active:scale-95 {compact
			? 'h-8 w-8'
			: 'h-9 w-9'} {active
			? 'text-wtr-pink border-white bg-white'
			: 'border-white/20 bg-white/10 text-white hover:bg-white/20 active:bg-white/30'}"
	>
		<Icon size="16" />
	</button>
{/snippet}

<AboutModal bind:visible={ui.aboutModalVisible}></AboutModal>
<ShareModal bind:visible={ui.shareModalVisible}></ShareModal>
<Geocoder providers={[new GeocodeEarth(geocodeEarthApiKey)]} bind:visible={ui.searchVisible}></Geocoder>

<div class="fixed top-2 left-2 z-1000 flex flex-col items-start gap-2">
	<header class="bg-wtr-blue flex flex-col gap-4 rounded-xl p-2 text-white shadow-lg ring-1 ring-white/10">
		<div class="flex items-center gap-2 p-1">
			<img src="./watertijdreis_logo.svg" alt="" class="size-5" />

			<h1 class="mr-1 font-bold">Watertijdreis</h1>

			{@render iconButton(Info, "Over Watertijdreis", () => (ui.aboutModalVisible = true), false, true)}
			{@render iconButton(ShareFat, "Delen", () => (ui.shareModalVisible = true), false, true)}
		</div>

		<MapSheetToggle />
	</header>
</div>

<nav aria-label="Kaartbediening" class="fixed top-1/2 right-2 z-1000 flex -translate-y-1/2 flex-col gap-1">
	<div class={cardClass}>
		{@render iconButton(Plus, "Inzoomen", () => mapContext.zoomIn())}
		{@render iconButton(Minus, "Uitzoomen", () => mapContext.zoomOut())}
	</div>

	<div class={cardClass}>
		{@render iconButton(
			Crosshair,
			"Naar mijn locatie",
			() => mapContext.flyToUserLocation(),
			mapContext.userLocationActive
		)}
		{@render iconButton(MagnifyingGlass, "Zoeken", () => {
			ui.searchVisible = true;
		})}
	</div>
</nav>
