<script lang="ts">
	import { tick } from "svelte";
	import { LockSimple, LockSimpleOpen } from "phosphor-svelte";
	import { copyScale, recenterScale, rescaleRange, type HeightScale } from "$lib/map/dynamic-ahn/scale";
	import type { HeightStatistics } from "$lib/map/dynamic-ahn/statistics";
	import type { GradientStop } from "$lib/map/dynamic-ahn/gradient";
	import { gradientCss } from "./ahnGradientStops";
	import { heightPercent, histogramBars, histogramAxis } from "./ahnHistogram";

	let {
		scale,
		legendAxis,
		statistics,
		stops,
		locked,
		onscale,
		onlock,
	}: {
		scale: HeightScale | null;
		legendAxis: HeightScale | null;
		statistics: HeightStatistics | null;
		stops: readonly GradientStop[];
		locked: boolean;
		onscale: (scale: HeightScale, axis: HeightScale) => void;
		onlock: () => void;
	} = $props();
	type Side = "low" | "center" | "high";
	const labels: Record<Side, string> = { low: "Laag", center: "Midden", high: "Hoog" };
	const sliderLabels: Record<Side, string> = { low: "Lage hoogte", center: "Middelste hoogte", high: "Hoge hoogte" };
	const round = (value: number) => Number(value.toFixed(2));
	let editing = $state<Side | null>(null);
	let snapshot = $state.raw<HeightScale | null>(null);
	let frozenAxis = $state.raw<HeightScale | null>(null);
	let draft = $state<number>();
	let error = $state("");
	let input = $state<HTMLInputElement>();
	let track: HTMLDivElement;
	let lowButton: HTMLButtonElement;
	let highButton: HTMLButtonElement;
	let centerButton: HTMLButtonElement;
	let gesture: {
		side: Side;
		base: HeightScale;
		axis: HeightScale;
		left: number;
		width: number;
		start: number;
		moved: boolean;
	} | null = null;
	let suppressClick = false;
	const shown = $derived(snapshot ?? scale);
	const axis = $derived(frozenAxis ?? legendAxis ?? histogramAxis(shown, statistics));
	const bars = $derived(statistics && axis ? histogramBars(statistics, axis) : []);
	const peakPercent = $derived(statistics ? (100 * Math.max(...statistics.histogram)) / statistics.count : 0);
	const meters = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	const number = (height?: number) => (height === undefined ? "—" : meters.format(height));
	const minimumGap = (bounds: HeightScale) =>
		Math.min((bounds.high - bounds.low) / 2, Math.max(0.01, (bounds.high - bounds.low) / 10000));

	async function edit(side: Side) {
		if (!scale || !axis) return;
		frozenAxis = copyScale(axis);
		snapshot = copyScale(scale);
		editing = side;
		draft = round(scale[side]);
		error = "";
		await tick();
		input?.focus();
		input?.select();
	}
	function close() {
		const button = editing === "low" ? lowButton : editing === "center" ? centerButton : highButton;
		editing = null;
		snapshot = frozenAxis = null;
		error = "";
		button?.focus();
	}
	function commit(next: HeightScale, bounds: HeightScale) {
		// Preserve the plotting range after editing; only expand it for typed values outside it.
		const low = Math.min(bounds.low, next.low);
		const high = Math.max(bounds.high, next.high);
		onscale(next, { low, center: (low + high) / 2, high });
	}
	function apply(event: SubmitEvent) {
		event.preventDefault();
		if (!snapshot || !editing || !axis) return;
		const value = typeof draft === "number" && Number.isFinite(draft) ? round(draft) : undefined;
		const low = editing === "low" ? value : snapshot.low;
		const high = editing === "high" ? value : snapshot.high;
		if (low === undefined || high === undefined || !Number.isFinite(low) || !Number.isFinite(high) || low >= high) {
			error = "Vul een geldige hoogte in: laag < hoog.";
			return;
		}
		if (editing === "center" && (value === undefined || !Number.isFinite(value) || value <= low || value >= high)) {
			error = "Vul een geldige hoogte in: laag < midden < hoog.";
			return;
		}
		try {
			commit(editing === "center" ? recenterScale(snapshot, value!) : rescaleRange(snapshot, low, high), axis);
			close();
		} catch (e) {
			if (!(e instanceof RangeError)) throw e;
			error = "Kies hoogtes met voldoende verschil.";
		}
	}
	function limits(side: Side, base: HeightScale, bounds: HeightScale) {
		const gap = minimumGap(bounds);
		return [side === "low" ? bounds.low : base.low + gap, side === "high" ? bounds.high : base.high - gap];
	}
	function move(side: Side, height: number, base: HeightScale, bounds: HeightScale) {
		const [min, max] = limits(side, base, bounds);
		const low = Math.ceil(min * 100) / 100,
			high = Math.floor(max * 100) / 100;
		if (low > high) return; // No whole centimetre fits in this very narrow range.
		const value = Math.max(low, Math.min(high, round(height)));
		const next =
			side === "center"
				? recenterScale(base, value)
				: rescaleRange(base, side === "low" ? value : base.low, side === "high" ? value : base.high);
		commit(next, bounds);
		if (editing) {
			// The form stays open: its snapshot, input and handles must follow the live change.
			snapshot = copyScale(next);
			editing = side;
			draft = round(next[side]);
			error = "";
		}
	}
	function startDrag(e: PointerEvent, side: Side) {
		if (e.button !== 0 || !shown || !axis) return;
		const rect = track.getBoundingClientRect();
		frozenAxis = copyScale(axis);
		gesture = {
			side,
			base: copyScale(shown),
			axis: frozenAxis,
			left: rect.left,
			width: rect.width,
			start: e.clientX,
			moved: false,
		};
		const button = e.currentTarget as HTMLButtonElement;
		button.focus();
		button.setPointerCapture(e.pointerId);
	}
	function drag(e: PointerEvent) {
		if (!gesture) return;
		if (Math.abs(e.clientX - gesture.start) > 3) gesture.moved = true;
		if (!gesture.moved) return;
		const { side, base, axis, left, width } = gesture;
		move(side, axis.low + ((e.clientX - left) / width) * (axis.high - axis.low), base, axis);
	}
	function endDrag(e: PointerEvent) {
		suppressClick = e.type === "pointerup" && !!gesture?.moved;
		gesture = null;
		if (!editing) frozenAxis = null;
	}
	function handleKey(e: KeyboardEvent, side: Side) {
		if (!shown || !axis || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
		e.preventDefault();
		e.stopPropagation();
		const step = Math.max(0.01, (axis.high - axis.low) / (e.shiftKey ? 100 : 1000));
		const value =
			e.key === "Home"
				? axis.low
				: e.key === "End"
					? axis.high
					: shown[side] + (["ArrowRight", "ArrowUp"].includes(e.key) ? step : -step);
		move(side, value, shown, axis);
	}
</script>

<div class="range-legend">
	<div class="heading">
		<span>Hoogteverdeling <span class="muted">· m NAP</span></span>
		<span class="muted" role="status">{locked ? "Vastgezet" : "Automatisch"}</span>
		<button
			type="button"
			class="lock"
			disabled={!scale && !locked}
			aria-label={locked ? "Kleurschaal losmaken" : "Kleurschaal vastzetten"}
			title={locked ? "Kleurschaal losmaken" : "Kleurschaal vastzetten"}
			aria-pressed={locked}
			onclick={(e) => {
				if (editing) close();
				e.currentTarget.focus();
				onlock();
			}}
		>
			{#if locked}<LockSimple size={18} weight="fill" />{:else}<LockSimpleOpen size={18} />{/if}
		</button>
	</div>
	<div class="histogram">
		<span class="frequency">{number(peakPercent)}%</span>
		<span class="distribution-label muted">Aandeel meetpunten</span>
		<svg viewBox="0 0 100 60" preserveAspectRatio="none" role="img" aria-label="Hoogteverdeling in beeld">
			{#each [15, 30, 45, 60] as y (y)}<line class="grid" x1="0" x2="100" y1={y} y2={y} />{/each}
			{#each bars as bar, i (i)}
				{#if bar.width > 0 && bar.count > 0}
					<rect
						class="bar"
						x={bar.x}
						y={60 - 60 * bar.height}
						width={Math.max(0.05, bar.width - 0.25)}
						height={60 * bar.height}
					>
						<title>{number(bar.low)}–{number(bar.high)} m NAP: {bar.count} meetpunten</title>
					</rect>
				{/if}
			{/each}
			{#if axis && shown}
				<rect class="outside" x="0" y="0" width={heightPercent(shown.low, axis)} height="60" />
				<rect
					class="outside"
					x={heightPercent(shown.high, axis)}
					y="0"
					width={100 - heightPercent(shown.high, axis)}
					height="60"
				/>
			{/if}
		</svg>
	</div>
	<div class="axis muted">
		<span>{number(axis?.low)}</span><span>{number(axis?.center)}</span><span>{number(axis?.high)}</span>
	</div>
	<div class="gradient-track" bind:this={track}>
		<div
			class="gradient"
			role="img"
			aria-label="Kleurverloop in meters NAP"
			style:--ramp={gradientCss(stops, shown ?? undefined, axis ?? undefined)}
		></div>
		{#each ["low", "center", "high"] as side (side)}
			{@const bound = side as Side}
			<button
				type="button"
				class="handle"
				class:center={bound === "center"}
				role="slider"
				disabled={!scale}
				aria-label={sliderLabels[bound]}
				aria-valuemin={axis && shown ? limits(bound, shown, axis)[0] : 0}
				aria-valuemax={axis && shown ? limits(bound, shown, axis)[1] : 1}
				aria-valuenow={shown?.[bound] ?? 0}
				aria-valuetext={`${number(shown?.[bound])} meter NAP`}
				style:left={`${axis && shown ? heightPercent(shown[bound], axis) : bound === "low" ? 0 : bound === "center" ? 50 : 100}%`}
				onpointerdown={(e) => startDrag(e, bound)}
				onpointermove={drag}
				onpointerup={endDrag}
				onpointercancel={endDrag}
				onlostpointercapture={() => {
					if (gesture) {
						gesture = null;
						if (!editing) frozenAxis = null;
					}
				}}
				onkeydown={(e) => handleKey(e, bound)}
				onclick={() => {
					if (suppressClick) suppressClick = false;
					else edit(bound);
				}}
				title="Sleep om de hoogte aan te passen; klik om een waarde in te voeren"
			></button>
		{/each}
	</div>
	<div class="endpoints">
		<button
			type="button"
			bind:this={lowButton}
			disabled={!scale}
			onclick={() => edit("low")}
			aria-label="Laag aanpassen">Laag <strong>{number(shown?.low)}</strong></button
		>
		<button
			type="button"
			bind:this={centerButton}
			disabled={!scale}
			onclick={() => edit("center")}
			aria-label="Midden aanpassen">Midden <strong>{number(shown?.center)}</strong></button
		>
		<button
			type="button"
			bind:this={highButton}
			disabled={!scale}
			onclick={() => edit("high")}
			aria-label="Hoog aanpassen">Hoog <strong>{number(shown?.high)}</strong></button
		>
	</div>
	{#if editing}
		<form onsubmit={apply} novalidate>
			<label
				>{labels[editing]} (m NAP)
				<input
					bind:this={input}
					type="number"
					step="0.01"
					bind:value={draft}
					aria-invalid={!!error}
					oninput={() => (error = "")}
					onkeydown={(e) => {
						if (e.key === "Escape") {
							e.preventDefault();
							e.stopPropagation();
							close();
						}
					}}
				/>
			</label>
			{#if error}<p role="alert">{error}</p>{/if}
			<div class="actions">
				<button type="button" onclick={close}>Annuleren</button><button type="submit">Toepassen en vastzetten</button>
			</div>
		</form>
	{/if}
	<p class="muted">Sleep de driehoekjes of klik op een hoogte om de schaal vast te zetten.</p>
	{#if !statistics}<p class="muted">Geen hoogtemetingen in beeld.</p>
	{:else if locked}<p class="muted">Verdeling in het huidige beeld; de kleurschaal staat vast.</p>{/if}
</div>

<style>
	.range-legend {
		font-size: 12px;
	}
	.heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		margin-bottom: 8px;
	}
	.heading > span:first-child {
		margin-right: auto;
	}
	.lock {
		display: grid;
		place-items: center;
		padding: 4px;
	}
	.lock[aria-pressed="true"] {
		color: #ff8dca;
	}
	.distribution-label {
		position: absolute;
		top: 3px;
		right: 5px;
	}
	.muted {
		color: rgb(255 255 255 / 0.7);
		font-size: 11px;
	}
	.histogram {
		position: relative;
		padding-top: 20px;
		border-radius: 4px;
		background: rgb(0 0 0 / 0.15);
	}
	.frequency {
		position: absolute;
		top: 3px;
		left: 5px;
		color: rgb(255 255 255 / 0.75);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
	}
	svg {
		display: block;
		width: 100%;
		height: 84px;
		overflow: hidden;
	}
	.bar {
		fill: #ff8dca;
	}
	.grid {
		stroke: rgb(255 255 255 / 0.15);
		stroke-width: 1;
		vector-effect: non-scaling-stroke;
	}
	.outside {
		fill: var(--color-wtr-blue);
		opacity: 0.6;
	}
	.axis {
		display: flex;
		justify-content: space-between;
		margin-top: 4px;
		font-variant-numeric: tabular-nums;
	}
	.gradient-track {
		position: relative;
		margin-top: 14px;
		padding-bottom: 24px;
	}
	.gradient {
		height: 18px;
		border-radius: 3px;
		background-image: var(--ramp), conic-gradient(#ddd 25%, #999 0 50%, #ddd 0 75%, #999 0);
		background-size:
			100% 100%,
			10px 10px;
		background-repeat: no-repeat, repeat;
		background-clip: padding-box;
	}
	.handle {
		position: absolute;
		top: 15px;
		width: 24px;
		height: 28px;
		transform: translateX(-50%);
		padding: 0;
		border: 0;
		background: transparent;
		touch-action: none;
		cursor: ew-resize;
	}
	.handle::before {
		content: "";
		position: absolute;
		inset: 4px 4px 10px;
		background: white;
		clip-path: polygon(50% 0, 100% 100%, 0 100%);
	}
	.handle:hover:not(:disabled)::before,
	.handle:focus-visible::before {
		background: #ff8dca;
	}
	.handle:hover:not(:disabled) {
		background: transparent;
	}
	.endpoints {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 6px;
	}
	.endpoints button:first-child {
		text-align: left;
	}
	.endpoints button:last-child {
		text-align: right;
	}
	.handle.center::before {
		background: #ff8dca;
	}
	.handle:focus-visible {
		z-index: 1;
	}
	.endpoints button {
		border: 0;
		background: transparent;
		padding: 2px 0;
		font-variant-numeric: tabular-nums;
		text-decoration: underline dotted;
		text-underline-offset: 4px;
	}
	.endpoints strong {
		margin-left: 4px;
	}
	button,
	input {
		border: 1px solid rgb(255 255 255 / 0.2);
		border-radius: 4px;
		color: white;
		background: rgb(255 255 255 / 0.05);
		padding: 5px 7px;
	}
	button {
		cursor: pointer;
	}
	button:hover:not(:disabled) {
		background: rgb(255 255 255 / 0.15);
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	form {
		margin-top: 4px;
		padding: 8px;
		border: 1px solid rgb(255 255 255 / 0.15);
		border-radius: 4px;
	}
	label {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	input {
		min-width: 0;
		flex: 1;
		width: 100%;
		color-scheme: dark;
	}
	.actions {
		display: flex;
		justify-content: end;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 8px;
	}
	p {
		margin: 7px 0 0;
	}
	[role="alert"] {
		color: var(--color-red-300);
	}
	button:focus-visible,
	input:focus-visible {
		outline: 2px solid rgb(255 255 255 / 0.7);
		outline-offset: 2px;
	}
</style>
