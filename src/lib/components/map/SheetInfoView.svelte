<script lang="ts">
	import { ArrowSquareOut, Check, Copy } from "phosphor-svelte";
	import type { SheetInfo, SheetVariant } from "$lib/map/sheetInfo.svelte";
	import MapThumbnail from "./HistoricMapThumbnail.svelte";

	let { info }: { info: SheetInfo } = $props();

	let scroller = $state<HTMLElement>();
	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout>;

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 1500);
		} catch (e) {
			console.error("Kopiëren mislukt", e);
		}
	}

	async function selectVariant(variant: SheetVariant) {
		await info.selectVariant(variant);
		scroller?.scrollTo({ top: 0 });
	}
</script>

{#snippet row(label: string | undefined, value: string | undefined)}
	<li class="rounded-md bg-white/10 px-3 py-1.5">
		<span class="font-semibold text-white/60">{label ?? ""}: </span>
		<span class="font-medium text-white">{value ?? ""}</span>
	</li>
{/snippet}

{#if info.map}
	<div bind:this={scroller} class="scrollable flex max-h-[25vh] flex-col gap-4 overflow-y-auto px-1 py-1 text-xs">
		<!-- Metadata -->
		<ul class="space-y-1">
			{@render row("Bladtitel", info.map.label)}
			{#each info.metadata as [label, value], i (i)}
				{@render row(label, value)}
			{/each}
		</ul>

		{#if info.status === "loading"}
			<p class="text-white/50">Bladinformatie laden…</p>
		{:else if !info.canvas}
			<p class="text-white/50">Geen aanvullende bladinformatie beschikbaar.</p>
		{/if}

		<!-- Bijbladen -->
		{#if info.variants.length > 1}
			<section>
				<h3 class="mb-2 text-sm font-semibold text-white">Bijbladen</h3>
				<div class="flex flex-col gap-1">
					{#each info.variants as variant (variant.canvas.id)}
						<button
							type="button"
							onclick={() => selectVariant(variant)}
							class="flex cursor-pointer items-center gap-2 rounded-md p-2 text-left transition-colors hover:bg-white/10 {variant.isCurrent
								? 'ring-wtr-pink bg-white/15 ring-1'
								: ''}"
						>
							<div class="h-14 w-fit shrink-0 overflow-hidden rounded-sm bg-white/10 shadow-md">
								{#if !variant.isBackside && variant.map}
									<MapThumbnail id={variant.map.id} height={56} />
								{:else}
									<img
										src="{variant.imageService}/full/,256/0/default.jpg"
										alt={variant.title}
										class="block h-full w-auto object-cover"
									/>
								{/if}
							</div>
							<span class="font-semibold text-white">{variant.title}</span>
						</button>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Externe links -->
		{#if info.links}
			{@const { links, xyzUrl } = info.links}
			<section>
				<h3 class="mb-2 text-sm font-semibold text-white">Externe links</h3>
				<div class="flex flex-col gap-2 rounded-md bg-white/10 p-3">
					{#each links as link (link.href)}
						<a
							href={link.href}
							target="_blank"
							rel="noopener noreferrer"
							class="flex items-center gap-1.5 text-white hover:underline"
						>
							<ArrowSquareOut size={16} class="text-wtr-pink shrink-0" />
							{link.label}
						</a>
					{/each}

					{#if xyzUrl}
						<button
							type="button"
							onclick={() => copy(xyzUrl)}
							class="flex cursor-pointer items-center gap-1.5 text-left text-white hover:underline"
						>
							{#if copied}
								<Check size={16} class="text-wtr-pink shrink-0" /> XYZ tile URL gekopieerd
							{:else}
								<Copy size={16} class="text-wtr-pink shrink-0" /> Kopieer XYZ tile URL
							{/if}
						</button>
					{/if}
				</div>
			</section>
		{/if}
	</div>
{/if}
