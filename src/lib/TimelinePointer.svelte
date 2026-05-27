<script>
	let { year } = $props();
</script>

<div
	class="timeline-pointer touch-action-none pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2"
	style:left="50%"
	style="z-index: 1000"
>
	<div class="bg-wtr-subtle-blue absolute top-0 left-[-1px] h-100 w-[2px]"></div>
	<div class="bg-wtr-subtle-blue absolute top-0 left-[-20px] h-[20px] w-[50px] rounded-sm"></div>

	<div
		class="bg-wtr-subtle-blue absolute top-[0px] left-[-33px] h-[20px] w-[15px] shadow-md"
		style="clip-path: polygon(0% 50%, 100% 0%, 100% 100%);"
	></div>

	<div
		class="bg-wtr-subtle-blue absolute top-[20px] left-[-7px] h-[8px] w-[14px]"
		style="clip-path: polygon(0% 0%, 100% 0%, 50% 100%);"
	></div>

	<!-- <span class="absolute -top-0.75 -left-8">&lt;</span> -->

	<div
		style="
    position: absolute;
    top: 0;
    left: 0;
    height: 20px;
    color: var(--color-wtr-blue);
	font-family: 'ivypresto-display';
    font-size: 18px;
    font-weight: 600;
    pointer-events: none;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 4px;
    "
	>
		{year}
	</div>
</div>
