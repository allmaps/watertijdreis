<script lang="ts">
	import { getContext } from "svelte";
	import * as turf from "@turf/turf";
	import { draw, fade, fly } from "svelte/transition";
	import NumberFlow from "@number-flow/svelte";
	import type { MapContext } from "$lib/map/mapContext.svelte";
	import MapThumbnail from "./HistoricMapThumbnail.svelte";
	import { CaretRight, Info } from "phosphor-svelte";

	const mapContext = getContext<MapContext>("mapContext");
	const historicCtx = mapContext.historic;
	const info = historicCtx.info;

	let activeHistoricMap = $derived(historicCtx.selectedMap || historicCtx.previewMap);

	let expanded = $derived(info.visible && !historicCtx.selectedMap);

	// Scaled down by 0.8 from 160x200 to match your previous size without CSS scale hacks
	let width: number = $state(128);
	let height: number = $state(160);
	let svgElement: SVGSVGElement | null = $state(null);

	let polygons = $derived.by(() => {
		if (!historicCtx.mapsLoaded) return [];

		return historicCtx.series.flatMap((s) =>
			Array.from(s.visibleMaps.values(), (map) => ({
				id: map.id,
				type: "Feature" as const,
				color: s.themeColor,
				geometry: turf.toMercator(structuredClone(map.polygon)),
				properties: {},
			}))
		);
	});

	let viewBox = $derived.by(() => {
		if (!polygons.length) return [0, 0, 160, 200];

		const bbox = turf.bbox({ type: "FeatureCollection", features: polygons });

		const viewWidth = bbox[2] - bbox[0] || 1;
		const viewHeight = bbox[3] - bbox[1] || 1;
		const paddingX = viewWidth * 0.075;
		const paddingY = viewHeight * 0.075;

		return [bbox[0] - paddingX, bbox[1] - paddingY, viewWidth + paddingX * 2, viewHeight + paddingY * 2];
	});

	let scaleFactor = $derived(viewBox[2] / width || 1);

	function fillOpacity(polyId: string): number {
		if (activeHistoricMap?.id === polyId) return 0.67;
		const inViewport = !historicCtx.selectedMap && historicCtx.visibleMapsInViewport.has(polyId);
		return inViewport ? 0.27 : 0.07;
	}

	let viewport = $derived.by(() => {
		if (!mapContext.viewportPolygon) return null;
		return turf.toMercator(mapContext.viewportPolygon);
	});

	let viewportRect = $derived.by(() => {
		if (!viewport || historicCtx.selectedMap) return null;

		const minXClamp = viewBox[0] + scaleFactor * 2;
		const minYClamp = viewBox[1] + scaleFactor * 2;
		const maxXClamp = viewBox[0] + viewBox[2] - 4 * scaleFactor;
		const maxYClamp = viewBox[1] + viewBox[3] - 4 * scaleFactor;

		const clipped = (viewport.geometry.coordinates[0] as [number, number][]).map(([x, y]) => [
			Math.min(Math.max(x, minXClamp), maxXClamp),
			Math.min(Math.max(y, minYClamp), maxYClamp),
		]);

		const xs = clipped.map((c) => c[0]);
		const ys = clipped.map((c) => c[1]);

		const x = Math.min(...xs);
		const y = Math.min(...ys);

		return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
	});

	let anchor = $derived.by(() => {
		if (viewportRect) {
			return { x: viewportRect.x + viewportRect.width, y: viewportRect.y + viewportRect.height / 2 };
		}

		const target = activeHistoricMap && polygons.find((p) => p.id === activeHistoricMap.id);
		if (!target) return null;

		const [, minY, maxX, maxY] = turf.bbox(target);
		return { x: maxX, y: (minY + maxY) / 2 };
	});

	let panelPosition = $derived.by(() => {
		if (!anchor || !svgElement) return null;

		const svgRect = svgElement.getBoundingClientRect();
		const pxPerUnitX = svgRect.width / viewBox[2];
		const pxPerUnitY = svgRect.height / viewBox[3];

		return {
			left: `${(anchor.x - viewBox[0]) * pxPerUnitX + 20}px`,
			top: `${(viewBox[1] + viewBox[3] - anchor.y) * pxPerUnitY}px`,
		};
	});

	let viewportPeriod = $derived.by((): [number, number] | null => {
		const years = Array.from(historicCtx.visibleMapsInViewport.values(), (m) => m.yearEnd).filter(
			(y): y is number => y !== undefined
		);
		return years.length ? [Math.min(...years), Math.max(...years)] : null;
	});

	let period = $derived.by((): [number, number] | null => {
		const sheetYear = info.visible ? info.map?.yearEnd : undefined;
		return sheetYear !== undefined ? [sheetYear, sheetYear] : viewportPeriod;
	});

	let single = $derived(!!period && period[0] === period[1]);

	let arrowPaths = $derived.by(() => {
		if (!activeHistoricMap || !anchor) return null;

		const targetPoly = polygons.find((p) => p.id === activeHistoricMap.id);
		const centerPoint = targetPoly ? turf.centerOfMass(targetPoly).geometry.coordinates : [0, 0];

		const x1 = centerPoint[0];
		const y1 = centerPoint[1];

		const x2 = anchor.x + 20000;
		const y2 = anchor.y;

		const strokeWidth = scaleFactor * 2;
		const angle = Math.atan2(y2 - y1, x2 - x1);
		const ah = strokeWidth * 5;

		const leftX = x2 - ah * Math.cos(angle) + ah * 0.5 * Math.sin(angle);
		const leftY = y2 - ah * Math.sin(angle) - ah * 0.5 * Math.cos(angle);

		const rightX = x2 - ah * Math.cos(angle) - ah * 0.5 * Math.sin(angle);
		const rightY = y2 - ah * Math.sin(angle) + ah * 0.5 * Math.cos(angle);

		return {
			strokeWidth,
			leftArm: `M ${x1} ${y1} L ${x2} ${y2} L ${leftX} ${leftY}`,
			rightArm: `M ${x1} ${y1} L ${x2} ${y2} L ${rightX} ${rightY}`,
		};
	});

	function getProjectedPoints(coordinates: [number, number][]): string {
		return coordinates.map((coord) => coord.join(",")).join(" ");
	}
</script>

<div class="pointer-events-none z-[999] block touch-none">
	{#if mapContext.maplibreLoaded && panelPosition && (period || info.map)}
		<div class="absolute z-10000 -translate-y-1/2" style="left: {panelPosition.left}; top: {panelPosition.top};">
			<div
				class="bg-wtr-blue flex items-center overflow-hidden rounded-xl whitespace-nowrap text-white shadow-lg ring-1 ring-white/10 {expanded
					? 'pointer-events-auto'
					: ''}"
				onpointerenter={() => (info.hold = true)}
				onpointerleave={() => (info.hold = false)}
			>
				{#if period}
					<div class="flex flex-col px-3 py-2">
						<span class="text-[10px] leading-none font-medium text-white/60">
							{single ? "Jaar" : "Periode"}
						</span>
						<span class="mt-1 flex text-base leading-none font-semibold tabular-nums">
							<NumberFlow format={{ useGrouping: false }} value={period[0]} spinTiming={{ duration: 200 }} />
							<!-- Tweede jaartal klapt dicht zodra begin en eind gelijk zijn -->
							<span
								class="grid transition-[grid-template-columns] duration-300 ease-out"
								style:grid-template-columns={single ? "0fr" : "1fr"}
							>
								<span class="flex overflow-hidden">
									–<NumberFlow format={{ useGrouping: false }} value={period[1]} />
								</span>
							</span>
						</span>
					</div>
				{/if}

				<div
					class="grid transition-[grid-template-columns,grid-template-rows] duration-400 ease-out"
					style:grid-template-columns={expanded ? "1fr" : "0fr"}
					style:grid-template-rows={expanded ? "1fr" : "0fr"}
					inert={!expanded}
				>
					<div class="min-h-0 min-w-0 overflow-hidden">
						{#if info.map}
							{@const map = info.map}
							<div class="flex items-center gap-3 py-2 pr-3 pl-3 {period ? 'border-l border-white/10' : ''}">
								<button
									type="button"
									onclick={() => info.open()}
									disabled={info.isSelected}
									aria-label="Blad openen"
									class="relative block h-[72px] shrink-0 overflow-hidden rounded-sm shadow-md enabled:cursor-pointer"
								>
									{#if info.currentIsBackside && info.canvasImage}
										<img
											alt=""
											class="block h-full w-auto object-cover"
											src="{info.canvasImage}/full/,256/0/default.jpg"
										/>
									{:else}
										<MapThumbnail id={map.id} height={72} />
									{/if}

									{#if info.viewportRect}
										{@const r = info.viewportRect}
										<div
											class="border-wtr-blue/50 pointer-events-none absolute rounded-sm border-[3px]"
											style="left: {r.left}%; top: {r.top}%; width: {r.width}%; height: {r.height}%;"
										></div>
									{/if}
								</button>

								{#key map.id}
									<div class="flex min-w-0 flex-col items-start gap-0.5" in:fly={{ x: -10, duration: 200 }}>
										<button
											type="button"
											onclick={() => info.open()}
											disabled={info.isSelected}
											class="max-w-44 truncate text-left text-sm font-bold text-white enabled:cursor-pointer enabled:hover:underline"
										>
											{info.title}
										</button>

										{#if info.detail}
											<p class="max-w-44 truncate text-xs text-white/70">{info.detail}</p>
										{/if}

										{#if info.isSelected}
											<button
												type="button"
												onclick={() => info.requestInfo()}
												class="group mt-1 flex cursor-pointer items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/90 transition-colors hover:bg-white/20 hover:text-white"
											>
												<Info size="14" />
												Info
												<CaretRight size="10" class="text-white/60 transition-transform group-hover:translate-x-0.5" />
											</button>
										{/if}
									</div>
								{/key}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if historicCtx.visibleMaps && historicCtx.visibleMaps.size}
		<svg
			bind:this={svgElement}
			{width}
			{height}
			viewBox={viewBox.join(" ")}
			class="drop-shadow-wtr-blue/50 pointer-events-none drop-shadow-[1px_1px_0px]"
		>
			<g transform="scale(1, -1) translate(0, -{viewBox[1] * 2 + viewBox[3]})">
				<!-- POLYGONS -->
				{#each polygons as poly (poly.id)}
					<polygon
						points={getProjectedPoints(poly.geometry.coordinates[0])}
						fill={poly.color}
						fill-opacity={fillOpacity(poly.id)}
						stroke={poly.color}
						stroke-width={scaleFactor * 1.33}
						class="transition-[fill-opacity] duration-250"
					/>
				{/each}

				<!-- VIEWPORT RECTANGLE -->
				{#if viewportRect}
					<rect
						x={viewportRect.x}
						y={viewportRect.y}
						width={viewportRect.width}
						height={viewportRect.height}
						fill="none"
						class="stroke-wtr-blue"
						stroke-width={scaleFactor * 4}
						rx={scaleFactor * 2}
						ry={scaleFactor * 2}
					/>
				{/if}

				<!-- ARROW POINTING TO ACTIVE MAP -->
				{#if arrowPaths}
					<g out:fade={{ duration: 250 }}>
						{#key activeHistoricMap?.id}
							<path
								in:draw={{ duration: 250 }}
								fill="none"
								stroke="#fff"
								stroke-width={arrowPaths.strokeWidth * 1}
								d={arrowPaths.leftArm}
							/>
							<path
								in:draw={{ duration: 250 }}
								fill="none"
								stroke="#fff"
								stroke-width={arrowPaths.strokeWidth * 1}
								d={arrowPaths.rightArm}
							/>
						{/key}
					</g>
				{/if}
			</g>
		</svg>
	{/if}
</div>
