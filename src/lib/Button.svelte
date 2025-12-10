<script>
	import { mousePosition } from './mousePosition.svelte';
	let {
		Icon,
		kbd = undefined,
		children = '',
		onclick,
		collapsed = false,
		collapseAfterRender = true,
		collapseAfterRenderDelay = 2000,
		openOnHover = true,
		tabindex = undefined
	} = $props();

	let buttonEl = $state();
	let slotEl = $state(null);

	let expandedWidth = $state(0);
	let buttonRect = $state({ left: 0, top: 0, width: 0, height: 0 });

	$effect(() => {
		if (collapseAfterRender) {
			const timer = setTimeout(() => (collapsed = true), collapseAfterRenderDelay);
			return () => clearTimeout(timer);
		}
	});

	$effect(() => {
		if (!slotEl) return;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) {
				expandedWidth = entry.borderBoxSize[0].inlineSize;
			}
		});
		ro.observe(slotEl);
		return () => ro.disconnect();
	});

	function updateRect() {
		if (buttonEl) buttonRect = buttonEl.getBoundingClientRect();
	}

	$effect(() => {
		if (!buttonEl) return;

		const ro = new ResizeObserver(updateRect);
		ro.observe(buttonEl);

		window.addEventListener('scroll', updateRect, { capture: true, passive: true });
		window.addEventListener('resize', updateRect, { passive: true });

		return () => {
			ro.disconnect();
			window.removeEventListener('scroll', updateRect, { capture: true });
			window.removeEventListener('resize', updateRect);
		};
	});

	$effect(() => {
		if (!buttonEl) return;

		const x = mousePosition.x;
		const y = mousePosition.y;

		const centerX = buttonRect.left + buttonRect.width / 2;
		const centerY = buttonRect.top + buttonRect.height / 2;

		const dist = Math.hypot(x - centerX, y - centerY);
		const threshold = 300;

		if (dist < threshold) {
			buttonEl.style.setProperty('--x', `${x - buttonRect.left}px`);
			buttonEl.style.setProperty('--y', `${y - buttonRect.top}px`);
			buttonEl.style.setProperty('--grad-opacity', '1');
		} else {
			buttonEl.style.setProperty('--grad-opacity', '0');
		}
	});
</script>

<button
	bind:this={buttonEl}
	{onclick}
	onmouseenter={() => openOnHover && (collapsed = false)}
	onmouseleave={() => openOnHover && (collapsed = true)}
	{tabindex}
	class="
        group relative cursor-pointer
        rounded-[9px] font-[500]
        text-[#336] backdrop-blur-sm transition-all
        duration-500 ease-out active:scale-95 active:outline-3
    "
	style:--grad-opacity="0"
>
	<div
		class="pointer-events-none absolute inset-0 rounded-[9px] transition-opacity duration-500"
		style:opacity="var(--grad-opacity)"
		style:background="radial-gradient(circle at var(--x, 50%) var(--y, 50%), #66f 0%, #eeeeff88 70%)"
	></div>

	<div class="relative z-10 m-0.5 flex items-center rounded-[8px] bg-[#fff] px-2.25 py-2 shadow-lg">
		<Icon
			color="#ff44aa"
			weight="regular"
			class="inline h-5.5 w-5.5 drop-shadow-[1px_1px_0_#33336622] transition-opacity duration-300 group-hover:opacity-100"
		></Icon>

		<div
			class="ease-[cubic-bezier(0.3, 0.8, 0.3, 2.3)] overflow-hidden transition-[width] duration-300"
			style:width="{collapsed ? 0 : expandedWidth}px"
		>
			<div
				bind:this={slotEl}
				class="flex origin-left items-center whitespace-nowrap transition-all delay-100 duration-300 ease-out"
				style:width="max-content"
				style:transform={`translateX(${collapsed ? -6 : 0}px) scaleX(${collapsed ? 85 : 100}%)`}
				style:opacity={collapsed ? 0 : 1}
				style:padding={collapsed ? '0px' : '0 4px'}
			>
				<span class="ml-1">
					{@render children?.()}
				</span>

				{#if kbd}
					<kbd
						class="
                    ml-1 flex items-center rounded-[4px] border border-[#eef] bg-white
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
