<script lang="ts">
	import { scale } from 'svelte/transition';
	import { Switch } from 'bits-ui';
	import { ArrowElbowDownRight, Gear } from 'phosphor-svelte';

	let { mapContext, minYear, maxYear } = $props();

	let showSettings = $state(false);
	let settingsPanel: HTMLDivElement | undefined = $state();

	function toggleSettings() {
		showSettings = !showSettings;
	}

	function handleWindowClick() {
		showSettings = false;
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (!showSettings) return;

		if (e.key === 'Tab') {
			const focusableElements = settingsPanel?.querySelectorAll(
				'button, input, [tabindex]:not([tabindex="-1"])'
			);
			if (!focusableElements || focusableElements.length === 0) return;

			const firstElement = focusableElements[0] as HTMLElement;
			const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

			if (e.shiftKey) {
				if (document.activeElement === firstElement) {
					e.preventDefault();
					lastElement.focus();
				}
			} else {
				if (document.activeElement === lastElement) {
					e.preventDefault();
					firstElement.focus();
				}
			}
		} else if (e.key === 'Escape') {
			showSettings = false;
		}
	}

	let selectedRegulier = $state(!mapContext.filter.type);
	let selectedEdition = $state(mapContext.filter.edition);
	let selectedBIS = $state(mapContext.filter.bis);
	let selectedHWP = $state(mapContext.filter.type === 'HWP');
	let selectedWVE = $state(mapContext.filter.type === 'WVE');
	let selectedOption = $state('');

	function clearAll() {
		selectedRegulier = false;
		selectedBIS = false;
		selectedHWP = false;
		selectedWVE = false;
		setEdition('All');
	}

	function toggleRegulier(v: boolean) {
		if (selectedRegulier && !v) return false;

		if (selectedRegulier !== v) {
			mapContext.filter.type = undefined;
			mapContext.applyFilter(mapContext.filter);
		}
		if (v) {
			clearAll();
			selectedRegulier = true;
		} else {
			selectedRegulier = false;
			if (selectedBIS) {
				mapContext.filter.bis = false;
				mapContext.applyFilter(mapContext.filter);
			}
			selectedBIS = false;
		}
	}

	function toggleBIS(v: boolean) {
		if (!selectedRegulier) return;
		if (selectedBIS !== v) {
			mapContext.filter.bis = v;
			mapContext.applyFilter(mapContext.filter);
		}
		selectedBIS = v;
	}

	function toggleHWP(v: boolean) {
		if (selectedHWP !== v) {
			setEdition('All');
			mapContext.filter.type = 'HWP';
			mapContext.filter.yearEnd = maxYear;
			mapContext.applyFilter(mapContext.filter);
		}
		if (v) {
			clearAll();
			selectedHWP = true;
		} else {
			selectedHWP = false;
			toggleRegulier(true);
		}
	}
	function toggleWVE(v: boolean) {
		if (selectedWVE !== v) {
			setEdition('All');
			mapContext.filter.type = 'WVE';
			mapContext.filter.yearEnd = maxYear;
			mapContext.applyFilter(mapContext.filter);
		}
		if (v) {
			clearAll();
			selectedWVE = true;
		} else {
			selectedWVE = false;
			toggleRegulier(true);
		}
	}

	function setEdition(v: 'All' | 1 | 2 | 3 | 4 | 5) {
		if (!selectedRegulier) return;

		if (selectedEdition !== v) {
			mapContext.filter.edition = v;

			mapContext.filter.yearEnd = maxYear;
			mapContext.applyFilter(mapContext.filter);
		}
		selectedEdition = v;
	}

	let yearStart = $derived(mapContext.filter.yearStart);
	let yearEnd = $derived(mapContext.filter.yearEnd);
</script>

<svelte:window onpointerdown={handleWindowClick} onkeydown={handleKeyDown} />

<div class="pointer-events-auto absolute top-2 right-2 z-[50000] select-none">
	<button
		onpointerdown={(e) => {
			e.stopPropagation();
			toggleSettings();
		}}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				e.stopPropagation();
				toggleSettings();
			}
		}}
		title="Instellingen"
		class="
			bg-wtr-subtle-blue flex h-8 w-8 cursor-pointer items-center
			justify-center rounded-full text-[#444]
			shadow-md transition-all
			hover:scale-105 hover:shadow-lg
            active:scale-95
		"
	>
		<Gear size={18} />
	</button>

	{#if showSettings}
		<div
			bind:this={settingsPanel}
			onpointerdown={(e) => {
				e.stopImmediatePropagation();
			}}
			class="fixed right-2 bottom-34 w-80 rounded-lg bg-white px-3 py-3 shadow-lg transition-all duration-200"
			transition:scale={{ duration: 250, y: 10 }}
		>
			<ul class="text-wtr-blue flex flex-col gap-2 text-sm font-[500]">
				<li
					class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-gray-50"
				>
					Periode:
					<input
						type="number"
						min={minYear - 1}
						max={mapContext.filter.yearEnd}
						bind:value={yearStart}
						onchange={() => {
							yearStart = Math.max(minYear, Math.min(mapContext.filter.yearEnd - 1, yearStart));
							mapContext.filter.yearStart = yearStart;
							mapContext.applyFilter(mapContext.filter);
						}}
						oninput={() => {
							if (yearStart >= minYear && yearStart < mapContext.filter.yearEnd)
								mapContext.filter.yearStart = yearStart;
						}}
						class="text-wtr-lighter-blue border-wtr-subtle-blue w-20 rounded border px-2 py-1 text-[16px] font-[600]"
					/>
					tot
					<input
						type="number"
						min={mapContext.filter.yearStart}
						max={maxYear + 1}
						bind:value={yearEnd}
						onchange={() => {
							yearEnd = Math.max(minYear, Math.min(maxYear, yearEnd));
							mapContext.filter.yearEnd = yearEnd;
							mapContext.applyFilter(mapContext.filter);
						}}
						oninput={() => {
							if (yearEnd >= minYear && yearEnd <= maxYear) mapContext.filter.yearEnd = yearEnd;
						}}
						class="text-wtr-lighter-blue border-wtr-subtle-blue w-20 rounded border px-2 py-1 text-[16px] font-[600]"
					/>
				</li>
				<li class="flex items-center justify-between rounded-md px-2 py-1 hover:bg-gray-50">
					Reguliere Waterstaatskaarten

					<Switch.Root
						checked={selectedRegulier}
						onCheckedChange={toggleRegulier}
						disabled={selectedRegulier}
						class="
		relative inline-flex h-[22px]
		w-[40px] cursor-pointer
		items-center rounded-full
		bg-gray-300 px-[2px]
		transition-colors data-[state=checked]:bg-[#ff66aa]
	"
					>
						<Switch.Thumb
							class="
			block
			h-[18px] w-[18px]
			translate-x-0 cursor-pointer
			rounded-full bg-white
			transition-transform
			duration-200 data-[state=checked]:translate-x-[18px]
		"
						/>
					</Switch.Root>
				</li>

				<li
					class="flex items-center justify-between rounded-md px-2 py-1 hover:bg-gray-50"
					style:opacity={selectedRegulier ? '100%' : '50%'}
					style:pointer-events={selectedRegulier ? 'auto' : 'none'}
				>
					Edities:
					<button
						class="border-wtr-subtle-blue hover:bg-wtr-subtle-blue cursor-pointer rounded-[4px] border-1 p-2 px-2.5"
						style={selectedEdition == 'All'
							? 'background: var(--color-wtr-blue); color: var(--color-wtr-subtle-blue);'
							: ''}
						onclick={() => setEdition('All')}>Alle</button
					>
					<button
						class="border-wtr-subtle-blue hover:bg-wtr-subtle-blue cursor-pointer rounded-[4px] border-1 p-2 px-2.5"
						style={selectedEdition == 1
							? 'background: var(--color-wtr-blue); color: var(--color-wtr-subtle-blue)'
							: ''}
						onclick={() => setEdition(1)}>1</button
					>
					<button
						class="border-wtr-subtle-blue hover:bg-wtr-subtle-blue cursor-pointer rounded-[4px] border-1 p-2 px-2.5"
						style={selectedEdition == 2
							? 'background: var(--color-wtr-blue); color: var(--color-wtr-subtle-blue)'
							: ''}
						onclick={() => setEdition(2)}>2</button
					>
					<button
						class="border-wtr-subtle-blue hover:bg-wtr-subtle-blue cursor-pointer rounded-[4px] border-1 p-2 px-2.5"
						style={selectedEdition == 3
							? 'background: var(--color-wtr-blue); color: var(--color-wtr-subtle-blue)'
							: ''}
						onclick={() => setEdition(3)}>3</button
					>
					<button
						class="border-wtr-subtle-blue hover:bg-wtr-subtle-blue cursor-pointer rounded-[4px] border-1 p-2 px-2.5"
						style={selectedEdition == 4
							? 'background: var(--color-wtr-blue); color: var(--color-wtr-subtle-blue)'
							: ''}
						onclick={() => setEdition(4)}>4</button
					>
					<button
						class="border-wtr-subtle-blue hover:bg-wtr-subtle-blue cursor-pointer rounded-[4px] border-1 p-2 px-2.5"
						style={selectedEdition == 5
							? 'background: var(--color-wtr-blue); color: var(--color-wtr-subtle-blue)'
							: ''}
						onclick={() => setEdition(5)}>5</button
					>
				</li>

				<li
					class="
		flex cursor-pointer items-center justify-start gap-2 rounded-md px-2 py-1
		pl-5 transition
		{selectedRegulier
						? 'text-wtr-blue hover:bg-gray-100'
						: 'cursor-not-allowed text-gray-300 opacity-80'}
	"
				>
					<ArrowElbowDownRight></ArrowElbowDownRight>
					<label
						class="
			flex items-center gap-2
			{selectedRegulier ? 'cursor-pointer' : 'pointer-events-none cursor-not-allowed'}
		"
					>
						<input
							type="checkbox"
							checked={selectedBIS}
							onchange={(e) => toggleBIS(e.target.checked)}
							disabled={!selectedRegulier}
							class="
								h-4 w-4 rounded border-gray-300 text-white
								{selectedRegulier ? 'cursor-pointer' : 'opacity-80'}
								accent-wtr-pink
							"
						/>
					</label>
					BIS-edities tonen
				</li>

				<li
					class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-gray-50"
				>
					Hydrologische Waarnemingspunten

					<Switch.Root
						checked={selectedHWP}
						onCheckedChange={toggleHWP}
						class="
		relative inline-flex h-[22px]
		w-[40px] cursor-pointer
		items-center rounded-full
		bg-gray-300 px-[2px]
		transition-colors data-[state=checked]:bg-[#ff66aa]
	"
					>
						<Switch.Thumb
							class="
			block
			h-[18px] w-[18px]
			translate-x-0 cursor-pointer
			rounded-full bg-white
			transition-transform
			duration-200 data-[state=checked]:translate-x-[18px] 
		"
						/>
					</Switch.Root>
				</li>

				<li
					class="flex cursor-pointer items-center justify-between rounded-md px-2 py-1 hover:bg-gray-50"
				>
					Watervoorzieningseenheden

					<Switch.Root
						checked={selectedWVE}
						onCheckedChange={toggleWVE}
						class="
		relative inline-flex h-[22px]
		w-[40px] cursor-pointer
		items-center rounded-full
		bg-gray-300 px-[2px]
		transition-colors  data-[state=checked]:bg-[#ff66aa]
	"
					>
						<Switch.Thumb
							class="
			block
			h-[18px] w-[18px]
			translate-x-0 cursor-pointer
			rounded-full bg-white
			transition-transform
			duration-200 data-[state=checked]:translate-x-[18px]
		"
						/>
					</Switch.Root>
				</li>
			</ul>
		</div>
	{/if}
</div>
