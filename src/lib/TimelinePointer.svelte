<script>
	let { year } = $props();
</script>

<div
	class="timeline-pointer touch-action-none pointer-events-none absolute -top-1.5 left-1/2 -translate-x-1/2"
	style:left="50%"
	style="z-index: 1000"
>
	<div class="absolute top-0 left-[-1px] h-100 w-[2px] bg-[#eef]"></div>
	<div class="absolute top-0 left-[-20px] h-[20px] w-[50px] rounded-sm bg-[#eef]"></div>

	<div
		class="absolute top-[0px] left-[-33px] h-[20px] w-[15px] bg-[#eef] shadow-md"
		style="clip-path: polygon(0% 50%, 100% 0%, 100% 100%);"
	></div>

	<div
		class="absolute top-[20px] left-[-7px] h-[8px] w-[14px] bg-[#eef]"
		style="clip-path: polygon(0% 0%, 100% 0%, 50% 100%);"
	></div>

	<!-- <span class="absolute -top-0.75 -left-8">&lt;</span> -->

	<div
		style="
    position: absolute;
    top: 0;
    left: 0;
    height: 20px;
    color: #336;
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
