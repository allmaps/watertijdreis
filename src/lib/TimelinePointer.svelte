<script>
	import {
		Eye,
		ImagesSquare,
		SkipBack,
		SkipForward,
		Rewind,
		FastForward,
		Play
	} from 'phosphor-svelte';

	let { year } = $props();
</script>

<div
	class="timeline-pointer height-[30px] absolute top-[-4px]"
	style:left="50%"
	style="z-index: 10000"
>
	<div class="absolute top-0 left-[-1px] h-100 w-[2px] bg-[#fff]"></div>
	<div class="absolute top-0 left-[-30px] h-[20px] w-[60px] rounded-sm bg-[#fff]"></div>

	<div
		class="absolute top-[20px] left-[-7px] h-[8px] w-[14px] bg-[#fff]"
		style="clip-path: polygon(0% 0%, 100% 0%, 50% 100%);"
	></div>

	<div
		style="
    position: absolute;
    top: 0;
    left: 0;
    height: 20px;
    color: #336;
    font-size: 14px;
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
	<div
		style="
    position: absolute;
    top: 125px;
    left: 0;
    height: 20px;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    pointer-events: none;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 4px;
    "
	>
		<Rewind size="16" class="relative top-0 mx-1 inline cursor-pointer opacity-70"></Rewind>
		<SkipBack size="16" class="relative top-0 mx-1 inline cursor-pointer opacity-70"></SkipBack>
		<Play size="16" class="relativeopacity-70  top-0 mx-1 inline cursor-pointer"></Play>
		<SkipForward size="16" class="relative top-0 mx-1 inline cursor-pointer opacity-70"
		></SkipForward>
		<FastForward size="16" class="relativeopacity-70  top-0 mx-1 inline cursor-pointer"
		></FastForward>
	</div>
</div>
