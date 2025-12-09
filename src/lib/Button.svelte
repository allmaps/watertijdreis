<script>
	let {
		Icon,
		kbd = undefined,
		children = '',
		onclick,
		collapsed = true,
		collapseAfterRender = false,
		collapseAfterRenderDelay = 2000,
		openOnHover = true
	} = $props();

	let slotEl = $state(null);
	let expandedWidth = $state(0);

	$effect(() => {
		if (slotEl) expandedWidth = slotEl.offsetWidth;
		if (collapseAfterRender) setTimeout(() => (collapsed = true), collapseAfterRenderDelay);
	});

	$effect(() => {
		if (collapsed && slotEl) slotEl.style.width = '0px';
		else if (slotEl) slotEl.style.width = expandedWidth + 'px';
	});

	let isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

	let buttonEl = $state();
	let mousePos = $state({ x: -1000, y: -1000 });
</script>

<svelte:body
	onpointermove={(e) => {
		const rect = buttonEl.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		if (x >= -100 && x <= rect.width + 100 && y >= -100 && y <= rect.height + 100) {
			mousePos = { x, y };
		} else {
			mousePos = { x: -1000, y: -1000 };
		}
	}}
/>

<button
	bind:this={buttonEl}
	{onclick}
	class="
		group relative cursor-pointer
		rounded-[9px] font-[500]
		text-[#336] backdrop-blur-sm transition-all
		duration-500 ease-out active:scale-95 active:outline-3
		"
	style:background={`radial-gradient(circle at ${mousePos.x}px ${mousePos.y}px, #33f 0%,#ffffff08 80%)`}
>
	<div class="m-0.5 flex items-center rounded-[8px] bg-[#fff] px-2.25 py-2 shadow-lg">
		<Icon
			color="#ff44aa"
			weight="regular"
			class="inline h-5.5 w-5.5 drop-shadow-[1px_1px_0_#33336622] transition-opacity duration-300 group-hover:opacity-100"
		></Icon>
		<div
			bind:this={slotEl}
			class="ease-[cubic-bezier(0.3, 0.8, 0.3, 2.3)] overflow-hidden whitespace-nowrap transition-[width] duration-300"
		>
			<div
				class="origin-left transition-all delay-100 duration-300 ease-out"
				style:transform={`translateX(${collapsed ? -6 : 0}px) scaleX(${collapsed ? 85 : 100}%)`}
				style:opacity={collapsed ? 0 : 100}
				style:padding={collapsed ? '0px' : '0 4px'}
			>
				<span class="ml-1">
					{@render children?.()}
				</span>

				{#if kbd}
					<kbd
						class="
					ml-1 flex inline items-center rounded-[4px] border border-[#eef] bg-white
					px-1 font-sans text-[12px] text-[#cce]
					shadow-[0px_2px_0px_0px_#cce] select-none
					"
					>
						<span>{kbd}</span>
					</kbd>
				{/if}
			</div>
		</div>
	</div>
</button>

<!-- </div> -->
