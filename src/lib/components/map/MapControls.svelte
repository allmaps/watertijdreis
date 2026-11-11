<script lang="ts">
	import { getContext } from "svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import { ui } from "$lib/state/ui.svelte";
	import { fly } from "svelte/transition";
	import { MagnifyingGlass, MagnifyingGlassMinus, MagnifyingGlassPlus, NavigationArrow, Stack } from "phosphor-svelte";

	import { env } from "$env/dynamic/public";
	import { isApplePlatform } from "$lib/utils/platform";
	import Geocoder from "../geocoder/Geocoder.svelte";
	import { GeocodeEarth } from "$lib/components/geocoder/providers/geocode-earth";
	import LayersModal from "$lib/components/modals/LayersModal.svelte";
	import Button from "$lib/components/ui/Button.svelte";

	const mapContext = getContext<MapContext>("mapContext");

	const geocodeEarthApiKey = env.PUBLIC_GEOCODE_EARTH_API_KEY;

	let scaleWidth = $state(60);
	let scaleText = $state("100 m");

	$effect(() => {
		const map = mapContext.activeMap;
		if (!map) return;

		const updateScale = () => {
			const y = map.getContainer().clientHeight / 2;
			const maxMeters = map.unproject([0, y]).distanceTo(map.unproject([100, y]));

			const pow10 = Math.pow(10, Math.floor(Math.log10(maxMeters)));
			let displayMeters = Math.round(maxMeters / pow10) * pow10;
			if (displayMeters === 0) displayMeters = 1;

			scaleWidth = Math.round((displayMeters / maxMeters) * 100);
			scaleText = displayMeters >= 1000 ? `${displayMeters / 1000} km` : `${displayMeters} m`;
		};

		updateScale();
		map.on("move", updateScale);

		return () => {
			map.off("move", updateScale);
		};
	});

	function handleKeyDown(e: KeyboardEvent) {
		const isApple = isApplePlatform();
		const isModifierPressed = isApple ? e.metaKey : e.ctrlKey;

		const target = e.target as HTMLElement;
		if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
			return;
		}

		if (e.key.toLowerCase() === "k" && isModifierPressed) {
			e.preventDefault();
			ui.openSearch();
		}

		if (e.key.toLowerCase() === "l") {
			ui.toggleLayers();
		}
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<Geocoder bind:visible={ui.searchVisible} providers={[new GeocodeEarth(geocodeEarthApiKey)]}></Geocoder>

<LayersModal bind:visible={ui.layersModalVisible}></LayersModal>

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
