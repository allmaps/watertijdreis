<script lang="ts">
	import { defaultStops, elevationAt, maxStops, type GradientStop } from "$lib/map/dynamic-ahn/gradient";
	import { gradientCss, insertStop } from "./ahnGradientEditor";
	import type { HeightScale } from "$lib/map/dynamic-ahn/terrain";

	let {
		stops,
		scale,
		onchange,
	}: { stops: readonly GradientStop[]; scale: HeightScale; onchange: (stops: readonly GradientStop[]) => void } =
		$props();
	const meters = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
	function label(stop: GradientStop) {
		if (stop.position === 0) return "Laag";
		if (stop.position === 50) return "Gemiddeld";
		if (stop.position === 100) return "Hoog";
		return stop.position < 50 ? "Lage tussenkleur" : "Hoge tussenkleur";
	}
	function edit(id: string, change: Partial<Pick<GradientStop, "position" | "color">>) {
		onchange(stops.map((stop) => (stop.id === id ? { ...stop, ...change } : stop)));
	}
	function add(side: "low" | "high") {
		let n = 1;
		while (stops.some((stop) => stop.id === "extra-" + n)) n++;
		onchange(insertStop(stops, side, "extra-" + n));
	}
</script>

<details class="editor">
	<summary
		><span>Kleurverloop bewerken</span><i aria-hidden="true" style:background={gradientCss(stops, scale)}></i></summary
	>
	<p>Kies een kleur voor elke hoogte. Wit bij de gemiddelde hoogte houdt de kaartinkt zichtbaar.</p>
	{#each stops as stop, i (stop.id)}
		{@const fixed = stop.position % 50 === 0}
		<div class="stop">
			<label>
				<input
					type="color"
					aria-label={"Kleur " + label(stop)}
					value={stop.color}
					oninput={(e) => edit(stop.id, { color: e.currentTarget.value })}
				/>
				<span>{label(stop)}</span>
			</label>
			<small>{meters.format(elevationAt(stop.position, scale))} m</small>
			{#if !fixed}
				<button
					class="remove"
					aria-label={"Verwijder " + label(stop)}
					onclick={() => onchange(stops.filter((s) => s.id !== stop.id))}>×</button
				>
				<input
					class="position"
					type="range"
					aria-label={"Positie " + label(stop)}
					aria-valuetext={meters.format(elevationAt(stop.position, scale)) + " m NAP"}
					min={stops[i - 1].position + 1}
					max={stops[i + 1].position - 1}
					step="1"
					value={stop.position}
					oninput={(e) => edit(stop.id, { position: e.currentTarget.valueAsNumber })}
				/>
			{/if}
		</div>
	{/each}
	<div class="actions">
		<button disabled={stops.length >= maxStops} onclick={() => add("low")}>+ Lage kleur</button>
		<button disabled={stops.length >= maxStops} onclick={() => add("high")}>+ Hoge kleur</button>
		<button class="reset" onclick={() => onchange(defaultStops)}>Herstel</button>
	</div>
</details>

<style>
	.editor {
		margin-top: 12px;
		padding: 12px 0 0;
		border-top: 1px solid var(--color-gray-200);
		font-size: 13px;
	}
	summary {
		cursor: pointer;
		font-weight: 650;
	}
	summary span {
		margin-left: 3px;
	}
	summary i {
		float: right;
		width: 43px;
		height: 9px;
		margin-top: 5px;
		border: 1px solid #c2c8bb;
		border-radius: 6px;
	}
	p {
		margin: 10px 0 5px;
		font-size: 12px;
		line-height: 1.4;
		color: #555578;
	}
	.stop {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		margin: 8px 0;
	}
	label {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}
	input[type="color"] {
		width: 31px;
		height: 26px;
		padding: 2px;
		border: 1px solid #aeb9a8;
		border-radius: 4px;
		cursor: pointer;
		background: white;
	}
	small {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
		color: #555578;
	}
	.position {
		width: 100%;
		accent-color: var(--color-wtr-pink);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
		margin-top: 8px;
	}
	button {
		cursor: pointer;
		background: transparent;
		border: 1px solid #bcc5b5;
		border-radius: 4px;
		padding: 4px 6px;
		font-size: 12px;
		color: var(--color-wtr-blue);
	}
	.remove {
		padding: 0 5px;
		font-size: 16px;
	}
	.reset {
		margin-left: auto;
	}
	button:disabled {
		opacity: 0.45;
		cursor: default;
	}
	button:focus-visible,
	input:focus-visible,
	summary:focus-visible {
		outline: 2px solid #bf5929;
		outline-offset: 2px;
	}
</style>
