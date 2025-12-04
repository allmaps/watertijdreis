<script>
	let {
		Icon,
		kbd = undefined,
		children,
		onclick,
		collapsed = false,
		collapseAfterRender = true,
		collapseAfterRenderDelay = 2000,
		openOnHover = true
	} = $props();

	let slotEl;
	let expandedWidth = $state(0);

	$effect(() => {
		if (slotEl) expandedWidth = slotEl.offsetWidth;
		if (collapseAfterRender) setTimeout(() => (collapsed = true), collapseAfterRenderDelay);
	});

	$effect(() => {
		if (collapsed && slotEl) slotEl.style.width = '0px';
		else if (slotEl) slotEl.style.width = expandedWidth + 'px';
	});

	let dark = $state(true);
</script>

{#if dark}
	<button
		{onclick}
		onmouseleave={() => (collapsed = collapsed || openOnHover)}
		onmouseenter={() => (collapsed = collapsed && !openOnHover)}
		class="
		group relative cursor-pointer
		rounded-[9px] bg-linear-to-bl from-[#eeeeff88] to-[#ffffff8] font-[500]
		text-[#336] backdrop-blur-sm transition-all
		duration-500 ease-out active:scale-95 active:outline-3
		"
	>
		<div class="m-0.5 flex items-center rounded-[8px] bg-[#fff] px-2.25 py-2 shadow-lg">
			<Icon
				color="#ff44aa"
				weight="regular"
				class="inline h-5.5 w-5.5 transition-opacity duration-300 group-hover:opacity-100"
			></Icon>
			<div
				bind:this={slotEl}
				class="ease-[cubic-bezier(0.3, 0.8, 0.3, 2.3)] overflow-hidden whitespace-nowrap transition-[width] duration-500"
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
{:else}
	<button
		{onclick}
		onmouseleave={() => (collapsed = collapsed || openOnHover)}
		onmouseenter={() => (collapsed = collapsed && !openOnHover)}
		class="
    group relative flex cursor-pointer
    items-center rounded-lg bg-white px-2.25 py-2
    font-[500] text-[#336] shadow-lg
    outline-2 outline-[#33336611] transition-all
    duration-500 ease-out hover:bg-[#f5f5fa] hover:outline-[#ff44aa22] active:scale-95 active:outline-3
    "
	>
		<Icon
			color="#f4a"
			weight="bold"
			class="inline h-5.5 w-5.5 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
		></Icon>
		<div
			bind:this={slotEl}
			class="ease-[cubic-bezier(0.3, 0.8, 0.3, 2.3)] overflow-hidden whitespace-nowrap transition-[width] duration-500"
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
	</button>
{/if}
