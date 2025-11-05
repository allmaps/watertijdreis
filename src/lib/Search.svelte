<script lang="ts">
	import { MagnifyingGlass, NavigationArrow } from 'phosphor-svelte';

	let mouseAngle = $state(0);

	let loaded = $state(false);
</script>

<div
	class="absolute top-5 left-5 rounded-full p-[2px] shadow-sm"
	style:background={`linear-gradient(${mouseAngle - Math.PI / 2}rad, #55a, #fff)`}
>
	<div class="rounded-full bg-white p-3">
		<!-- <MagnifyingGlass size="18" weight="bold"></MagnifyingGlass> -->
		<NavigationArrow size="18" weight="bold"></NavigationArrow>
	</div>
</div>

<svelte:body onmousemove={(e) => (mouseAngle = Math.atan2(e.clientY, e.clientX))} />
