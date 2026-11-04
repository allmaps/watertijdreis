<script lang="ts">
	import { getContext } from "svelte";
	import { ui } from "$lib/state/ui.svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import { ShareFat, Info, Drop, Plus, Minus, Crosshair, MagnifyingGlass } from "phosphor-svelte";
	import ShareModal from "./modals/ShareModal.svelte";
	import AboutModal from "./modals/AboutModal.svelte";
	import MapSheetToggle from "$lib/components/map/MapSheetToggle.svelte"; // pas het pad aan naar waar hij staat

	const mapContext = getContext<MapContext>("mapContext");

	const cardClass = "flex flex-col gap-1 rounded-xl bg-wtr-blue p-1.5 shadow-lg ring-1 ring-white/10";
</script>

{#snippet iconButton(Icon: typeof Info, label: string, onclick: () => void, active = false, compact = false)}
	<button
		type="button"
		{onclick}
		title={label}
		aria-label={label}
		class="flex cursor-pointer items-center justify-center rounded-md border transition-all focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/60 active:scale-95 {compact
			? 'h-7 w-7'
			: 'h-8 w-8'} {active
			? 'text-wtr-pink border-white bg-white'
			: 'border-white/20 bg-white/10 text-white hover:bg-white/20 active:bg-white/30'}"
	>
		<Icon size="16" />
	</button>
{/snippet}

<AboutModal bind:visible={ui.aboutModalVisible}></AboutModal>
<ShareModal bind:visible={ui.shareModalVisible}></ShareModal>

<!-- Linksboven: titel + weergave-toggle -->
<div class="fixed top-2 left-2 z-1000 flex flex-col items-start gap-2">
	<header class="bg-wtr-blue flex flex-col gap-4 rounded-xl p-2 text-white shadow-lg ring-1 ring-white/10">
		<div class="flex items-center gap-2 p-1">
			<svg
				width="18px"
				viewBox="0 0 134 134"
				version="1.1"
				xmlns="http://www.w3.org/2000/svg"
				xmlns:xlink="http://www.w3.org/1999/xlink"
				xml:space="preserve"
				xmlns:affinity="https://www.affinity.studio/"
				style="fill-rule:evenodd;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:1.5;"
			>
				<g transform="matrix(1,0,0,1,-1128.162185,-1861.777007)">
					<g transform="matrix(1,0,0,1,1194.828852,1928.443673)" style="fill:#88f;">
						<g transform="matrix(1,0,0,1,-66.666667,-66.666667)">
							<g transform="matrix(0.520833,0,0,0.520833,0,0)">
								<path
									d="M174,47.75C161.648,33.484 147.745,20.639 132.55,9.45C129.801,7.524 126.119,7.524 123.37,9.45C108.203,20.643 94.327,33.489 82,47.75C54.51,79.32 40,112.6 40,144C40,192.275 79.725,232 128,232C176.275,232 216,192.275 216,144C216,112.6 201.49,79.32 174,47.75ZM128,216C88.519,215.956 56.044,183.481 56,144C56,86.77 111.47,39 128,26C144.53,39 200,86.75 200,144C199.956,183.481 167.481,215.956 128,216ZM183.89,153.34C179.651,177.017 161.008,195.656 137.33,199.89C136.89,199.96 136.445,199.997 136,200C131.612,199.999 128.002,196.388 128.002,192C128.002,188.108 130.842,184.753 134.68,184.11C151.25,181.32 165.31,167.26 168.12,150.66C168.771,146.828 172.123,143.997 176.01,143.997C180.4,143.997 184.013,147.61 184.013,152C184.013,152.449 183.975,152.897 183.9,153.34L183.89,153.34Z"
									style="fill-rule:nonzero;"
								/>
							</g>
						</g>
					</g>
					<path d="M1194.829,1934L1199,1961" style="fill:none;stroke:#88f;stroke-width:8.33px;" />
					<g transform="matrix(0.969097,0.22363,0.020222,0.348629,-4.230671,1010.57731)" style="fill:#88f;">
						<path
							d="M1192.141,1964.46C1191.379,1971.317 1188.905,1976.678 1186.62,1976.424C1184.334,1976.17 1183.097,1970.397 1183.859,1963.54L1184.859,1954.54C1185.621,1947.683 1188.095,1942.322 1190.38,1942.576C1192.666,1942.83 1193.903,1948.603 1193.141,1955.46L1192.141,1964.46Z"
						/>
					</g>
					<g transform="matrix(0.794779,0.597902,-0.123095,0.326801,474.547081,602.85651)" style="fill:#88f;">
						<path
							d="M1192.141,1964.46C1191.379,1971.317 1188.905,1976.678 1186.62,1976.424C1184.334,1976.17 1183.097,1970.397 1183.859,1963.54L1184.859,1954.54C1185.621,1947.683 1188.095,1942.322 1190.38,1942.576C1192.666,1942.83 1193.903,1948.603 1193.141,1955.46L1192.141,1964.46Z"
						/>
					</g>
					<g transform="matrix(1,0,0,1,5.050688,3.778163)">
						<circle cx="1189.778" cy="1930.222" r="1.778" style="stroke:#88f;stroke-width:8.33px;" />
					</g>
				</g>
			</svg>

			<h1 class="mr-1 font-bold">Watertijdreis</h1>

			{@render iconButton(Info, "Over Watertijdreis", () => (ui.aboutModalVisible = true), false, true)}
			{@render iconButton(ShareFat, "Delen", () => (ui.shareModalVisible = true), false, true)}
		</div>

		<MapSheetToggle />
	</header>
</div>

<!-- Rechts: kaartbediening -->
<nav aria-label="Kaartbediening" class="fixed top-1/2 right-2 z-1000 flex -translate-y-1/2 flex-col gap-2">
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
			// TODO: koppel aan je zoek-UI
		})}
	</div>
</nav>
