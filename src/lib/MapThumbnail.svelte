<script lang="ts">
	import { scale } from 'svelte/transition';

	const { x, y, src } = $props();

	let imageLoaded = $state(false);

	let rotation = (Math.random() - 0.5) * 10;
</script>

<!-- {#if imageLoaded} -->
<div
	transition:scale
	class="absolute h-[42px] w-[42px] origin-bottom
        overflow-hidden
    "
	style="
        left: {x}px;
        top: {y}px;
        transform: rotateX(60deg) rotateZ({rotation}deg);
        z-index: {100 - y}
    "
>
	<img
		{src}
		alt=""
		class="
            h-[calc(100%)] w-[calc(100%)]
            -translate-x-[4px] -translate-y-[4px]
            object-cover object-center shadow-[0_6px_6px_rgba(0,0,0,0.1)] transition-[filter]
            duration-300
        "
		style:filter={`grayscale(0%)`}
	/>
</div>
<!-- {/if} -->

<img style:opacity={0} {src} loading="eager" alt="" onload={() => (imageLoaded = true)} />
