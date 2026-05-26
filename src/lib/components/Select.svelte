<script lang="ts">
	import { fly } from 'svelte/transition';
	import type { Component } from 'svelte';

	interface SelectOption {
		value: any;
		label: string;
		icon?: Component<any>;
	}

	interface Props {
		options: SelectOption[];
		value?: any;
		onchange?: (opt: SelectOption) => void;
		Icon?: Component<any> | null;
	}

	let { options = [], value = $bindable(null), onchange, Icon = null }: Props = $props();

	let open = $state(false);
	let buttonEl = $state<HTMLDivElement | null>(null);
	let dropdownPos = $state({ top: 0, left: 0, width: 0 });

	if (value === null && options.length > 0) {
		value = options[0].value;
	}

	let selectedOption = $derived(
		options.find((i) => i.value == value) || { label: '', value: null, icon: undefined }
	);

	function toggle() {
		if (!open && buttonEl) {
			const rect = buttonEl.getBoundingClientRect();
			dropdownPos = {
				top: rect.bottom + window.scrollY + 4,
				left: rect.left + window.scrollX,
				width: rect.width
			};
		}
		open = !open;
	}

	function choose(opt: SelectOption) {
		value = opt.value;
		if (onchange) onchange(opt);
		open = false;
	}

	function onDocClick(e: MouseEvent) {
		if (open && buttonEl && !buttonEl.contains(e.target as Node)) {
			open = false;
		}
	}

	$effect(() => {
		if (open) {
			document.addEventListener('click', onDocClick);
			return () => document.removeEventListener('click', onDocClick);
		}
	});
</script>

<div class="relative inline-block text-left" bind:this={buttonEl}>
	<button
		type="button"
		class="
            group relative cursor-pointer rounded-[9px]
            bg-linear-to-bl from-[#33336622] to-[#ffffff88]
            font-[500] text-[#336] backdrop-blur-sm
            transition-all duration-300 ease-out active:scale-95
        "
		onclick={toggle}
		aria-haspopup="listbox"
		aria-expanded={open}
	>
		<div class="m-0.5 flex items-center gap-2 rounded-[8px] bg-white px-2.5 py-2 shadow-lg">
			{#if selectedOption.icon}
				{@const SelectedIcon = selectedOption.icon}
				<SelectedIcon
					color="#ff44aa"
					weight="regular"
					class="inline h-5.5 w-5.5 drop-shadow-[1px_1px_0_#33336622]"
				/>
			{:else if Icon}
				<Icon
					color="#ff44aa"
					weight="regular"
					class="inline h-5.5 w-5.5 drop-shadow-[1px_1px_0_#33336622]"
				/>
			{/if}

			<div class="max-w-45 min-w-45 text-left break-words">
				<span class="ml-1">{selectedOption.label}</span>
			</div>

			<svg
				class="ml-auto h-4 w-4 transition-transform duration-300 ease-out {open
					? 'rotate-180'
					: ''}"
				fill="none"
				stroke="#336"
				stroke-width="2"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	</button>
</div>

{#if open}
	<div
		class="
            z-[9999] overflow-hidden rounded-[9px] border border-[#eef]
            bg-white shadow-lg
        "
		style="
            position: fixed;
            top: {dropdownPos.top}px;
            left: {dropdownPos.left}px;
            width: {dropdownPos.width}px;
        "
		transition:fly={{ y: -5, duration: 150 }}
		role="listbox"
	>
		{#each options as opt}
			{@const OptIcon = opt.icon}
			<button
				type="button"
				class="
                    w-full cursor-pointer px-3 py-2 text-left
                    text-[16px] font-[500] text-[#336]
                    transition-colors hover:bg-[#f5f5ff]
                    {opt.value === value ? 'bg-[#f5f5ff]' : ''}
                "
				onclick={() => choose(opt)}
				role="option"
				aria-selected={opt.value === value}
			>
				{#if OptIcon}
					<OptIcon class="mr-1 inline h-5 w-5" color="#ff44aa" />
				{/if}
				{opt.label}
			</button>
		{/each}
	</div>
{/if}
