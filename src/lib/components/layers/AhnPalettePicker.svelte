<script lang="ts">
	import { reverseGradient, type GradientStop } from "$lib/map/dynamic-ahn/gradient";
	import { matchesPalette, palettes } from "$lib/map/dynamic-ahn/palettes";
	import { gradientCss } from "./ahnGradientStops";

	let { stops, onchange }: { stops: readonly GradientStop[]; onchange: (stops: readonly GradientStop[]) => void } =
		$props();
	let paletteOpen = $state(false);
	let paletteSummary: HTMLElement;
	const selected = $derived(palettes.find((palette) => matchesPalette(stops, palette.stops)));
	const reversed = $derived(palettes.find((palette) => matchesPalette(stops, reverseGradient(palette.stops))));
	const paletteName = $derived(selected?.name ?? (reversed ? `${reversed.name} (omgekeerd)` : "Aangepast"));
</script>

<div class="palette">
	<div class="palette-heading">
		<span>Kleurenpalet</span>
		<button type="button" onclick={() => onchange(reverseGradient(stops))}>Omkeren</button>
	</div>
	<details class="palette-picker" bind:open={paletteOpen}>
		<summary bind:this={paletteSummary}>
			<span>{paletteName}</span>
			<span class="swatch" aria-hidden="true" style:--ramp={gradientCss(stops)}></span>
		</summary>
		<div class="palettes" role="group" aria-label="Kleurpaletten">
			{#each palettes as palette (palette.id)}
				<button
					type="button"
					aria-pressed={selected?.id === palette.id}
					onclick={() => {
						onchange(palette.stops.map((stop) => ({ ...stop })));
						paletteOpen = false;
						paletteSummary.focus();
					}}
				>
					<span>{palette.name}</span>
					<span class="swatch" aria-hidden="true" style:--ramp={gradientCss(palette.stops)}></span>
				</button>
			{/each}
		</div>
	</details>
</div>

<style>
	.palette {
		font-size: 13px;
		color: white;
	}
	summary {
		cursor: pointer;
		font-weight: 650;
	}
	.swatch {
		display: block;
		height: 12px;
		border: 1px solid rgb(255 255 255 / 0.3);
		border-radius: 3px;
		background-image: var(--ramp), conic-gradient(#ddd 25%, #999 0 50%, #ddd 0 75%, #999 0);
		background-repeat: no-repeat, repeat;
		background-clip: padding-box;
		background-size:
			100% 100%,
			10px 10px;
	}
	.palette-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin: 0 0 6px;
	}
	.palette-picker {
		border: 1px solid rgb(255 255 255 / 0.2);
		border-radius: 4px;
		padding: 8px;
	}
	.palette-picker summary {
		font-size: 12px;
		font-weight: 400;
	}
	.palette-picker summary .swatch {
		margin-top: 6px;
	}
	.palettes {
		display: grid;
		gap: 4px;
		margin-top: 8px;
	}
	.palettes button {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 72px;
		align-items: center;
		gap: 8px;
		text-align: left;
	}
	.palettes button[aria-pressed="true"] {
		border-color: var(--color-wtr-pink);
		background: rgb(255 255 255 / 0.15);
	}
	button {
		cursor: pointer;
		background: rgb(255 255 255 / 0.1);
		border: 1px solid rgb(255 255 255 / 0.2);
		border-radius: 4px;
		padding: 4px 6px;
		font-size: 12px;
		color: white;
		transition: background-color 0.15s;
	}
	button:hover:not(:disabled) {
		background: rgb(255 255 255 / 0.2);
	}
	button:focus-visible,
	summary:focus-visible {
		outline: 2px solid rgb(255 255 255 / 0.7);
		outline-offset: 2px;
	}
</style>
