<script>
	import { Eye } from 'phosphor-svelte';
	import { fly } from 'svelte/transition';

	let { options = [], value = null, onchange = () => {}, Icon = null } = $props();
	let open = $state(false);

	let buttonEl;
	let dropdownPos = $state({ top: 0, left: 0, width: 0 });

	if (value === null) value = options[0].value;

	let selectedOption = $derived(options.find((i) => i.value == value));

	function toggle() {
		if (!open && buttonEl) {
			const rect = buttonEl.getBoundingClientRect();
			dropdownPos = {
				top: rect.bottom + 4,
				left: rect.left,
				width: rect.width
			};
		}
		open = !open;
	}

	function choose(opt) {
		value = opt.value;
		onchange(opt);
		open = false;
	}

	function onDocClick(e) {
		if (open && buttonEl && !buttonEl.contains(e.target)) {
			open = false;
		}
	}

	$effect(() => {
		if (open) document.addEventListener('click', onDocClick);
		else document.removeEventListener('click', onDocClick);
	});
</script>

<div class="relative inline-block text-left" bind:this={buttonEl}>
	<button
		class="
			group relative cursor-pointer rounded-[9px]
			bg-linear-to-bl from-[#33336622] to-[#ffffff8]
			font-[500] text-[#336] backdrop-blur-sm
			transition-all duration-300 ease-out active:scale-95
		"
		onclick={toggle}
	>
		<div class="m-0.5 flex items-center gap-2 rounded-[8px] bg-white px-2.5 py-2 shadow-lg">
			{#if selectedOption.icon}
				<selectedOption.icon
					color="#ff44aa"
					weight="regular"
					class="inline h-5.5 w-5.5 drop-shadow-[1px_1px_0_#33336622]"
				></selectedOption.icon>
			{:else if Icon}
				<Icon
					color="#ff44aa"
					weight="regular"
					class="inline h-5.5 w-5.5 drop-shadow-[1px_1px_0_#33336622]"
				/>
			{/if}

			<div class="max-w-45 min-w-45 break-words">
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
	>
		{#each options as opt}
			{@const I = opt.icon}
			<button
				class="
					w-full cursor-pointer px-3 py-2 text-left
					text-[16px] font-[500] text-[#336]
					transition-colors hover:bg-[#f5f5ff]
				"
				onclick={() => choose(opt)}
			>
				{#if I}<I class="mr-1 inline" color="#ff44aa" />{/if}
				{opt.label}
			</button>
		{/each}
	</div>
{/if}
