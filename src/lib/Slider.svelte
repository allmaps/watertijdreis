<script>
	import { Gradient } from 'phosphor-svelte';

	let { value = 50, onchange = () => {} } = $props();

	let trackEl = $state(null);
	let dragging = $state(false);

	function percentToX(p) {
		if (!trackEl) return 0;
		return (p / 100) * trackEl.clientWidth;
	}

	function onPointerDown(e) {
		dragging = true;
		updateFromEvent(e);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
	}

	function onPointerMove(e) {
		if (dragging) updateFromEvent(e);
	}

	function onPointerUp() {
		dragging = false;
		onchange(value);
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
	}

	function updateFromEvent(e) {
		const rect = trackEl.getBoundingClientRect();
		const px = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
		value = Math.round((px / rect.width) * 100);
		onchange(value);
	}

	let sliderElement = $state();
	let hasFocus = $state(false);

	function handleKeyDown(e) {
		if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
			e.preventDefault();
			e.stopImmediatePropagation();
			value = Math.max(0, value - 5);
			onchange(value);
		} else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
			e.preventDefault();
			e.stopImmediatePropagation();
			value = Math.min(100, value + 5);
			onchange(value);
		} else if (e.key === 'Tab') {
			hasFocus = false;
			return;
		} else if (e.key !== 'Escape') {
			e.stopPropagation();
		}
	}

	function handleFocus() {
		hasFocus = true;
	}

	function handleBlur() {
		hasFocus = false;
	}

	$effect(() => {
		if (hasFocus && sliderElement && document.activeElement !== sliderElement) {
			sliderElement.focus();
		}
	});
</script>

<div class="flex flex-col gap-0 select-none">
	<div class="text-sm font-[600] text-[#336]">
		<Gradient color="#f4a" size="20" class="mr-1 inline"></Gradient>
		{value}%
	</div>

	<div
		bind:this={sliderElement}
		class="
			group rounded-[12px]px-2 relative flex
			h-6 cursor-pointer items-center
			active:scale-[0.99]
		"
		onpointerdown={onPointerDown}
		onkeydown={handleKeyDown}
		onfocus={handleFocus}
		onblur={handleBlur}
		tabindex="-1"
		role="slider"
		aria-valuenow={value}
		aria-valuemin="0"
		aria-valuemax="100"
		aria-label="Doorzichtigheid"
	>
		<div bind:this={trackEl} class="relative h-2 w-full rounded-full bg-[#00000022]">
			<div
				class="absolute top-0 left-0 h-full rounded-full bg-linear-to-r from-[#336] from-[67%] to-[#336]"
				style:width={`${value}%`}
			></div>

			<div
				class="
					absolute top-1/2 h-4.5 w-4.5 -translate-y-1/2
					rounded-full bg-[#336] shadow-[2px_2px_8px_#33336655] outline-3 outline-[#fff]
					transition-transform duration-300
					{dragging ? 'scale-90' : ''}
				"
				style:left={`calc(${value * 0.95}% - 0.3rem)`}
			></div>
		</div>
	</div>
</div>
