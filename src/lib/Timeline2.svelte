<script lang="ts">
    import { Tween, Spring } from "svelte/motion";
    import { cubicOut } from "svelte/easing";
	import { Eye, ImagesSquare } from "phosphor-svelte";

    let { mapViewer } = $props();


    $effect(() => {
        if(!mapViewer) return;
        mapViewer.filterHistoricMapsByYear(Math.floor(selectedYear));
    });

    let width : number = $state(0);
    let height : number = $state(0);

    let view = $state(new Spring({ start: 1950, end: 2000 }, { stiffness: 0.1, damping: 0.33 }));
    let selectedYear = $derived((view.current.end + view.current.start) / 2);

    let timelineTickColor = $state("#336");

    const MIN_YEAR : number = 1800;
    const MAX_YEAR : number = 2023;

    let isPanning : boolean = $state(false);
    let lastX : number = $state(0);

    function yearToX(year: number) : number {
        return ((year - view.current.start) / (view.current.end - view.current.start)) * width;
    }

    function xToYear(x: number) : number {
        return (x / width) * (view.current.end - view.current.start) + view.current.start;
    }

    function onwheel(e: WheelEvent) {
        e.preventDefault();

        const zoom = 1 + Math.min(Math.max(e.deltaY / 100, -0.2), 0.2);
        const cursor = xToYear(e.offsetX);
        const { start, end } = view.current;

        const newStart = cursor - (cursor - start) * zoom;
        const newEnd   = cursor + (end - cursor) * zoom;

        view.target = { start: newStart, end: newEnd };
    }

    function onpointerdown(e: PointerEvent) {
        isPanning = true;
        lastX = e.clientX;
    }

    function onpointermove(e: PointerEvent) {
        if (!isPanning) return;
        const dx = e.clientX - lastX;
        const yearDelta = (dx / width) * (view.current.end - view.current.start);
        view.target = {
            start: view.target.start - yearDelta,
            end: view.target.end - yearDelta
        }
        lastX = e.clientX;
    }

    function onpointerup(e: PointerEvent) {
        isPanning = false;
    }
</script>

<div 
    class="timeline-container" style="position: relative;"
    bind:clientWidth={width}
    bind:clientHeight={height}
    {onwheel}
    {onpointerdown}
    {onpointermove}
    {onpointerup}
>
    <svg 
        width={width} 
        height={100} 
        style="overflow: visible;"
    >

        {#each Array.from({ length: Math.ceil(view.current.end) - Math.floor(view.current.start) + 1 }, (_, i) => Math.floor(view.current.start) + i) as year}
            {@const pixelsPerYear = width / (view.current.end - view.current.start)}
            {#if year % 25 === 0}
                <line
                    x1={yearToX(year)}
                    y1={0}
                    x2={yearToX(year)}
                    y2={10}
                    stroke={timelineTickColor}
                    stroke-width="1"
                />
                <text 
                    x={yearToX(year) - 15} 
                    y={30} 
                    font-size="14" 
                    font-weight="500"
                    fill={timelineTickColor}
                >{year}</text>
            {:else if year % 5 === 0 && pixelsPerYear > 7}
                <line
                    x1={yearToX(year)}
                    y1={0}
                    x2={yearToX(year)}
                    y2={10 - 5 * Math.max(0, (9 - pixelsPerYear) / 2)}
                    stroke={timelineTickColor}
                    stroke-width="1"
                />
                <text 
                    x={yearToX(year) - 13} 
                    y={30} 
                    font-size="12"
                    fill={timelineTickColor}
                    opacity={1 - (9 - pixelsPerYear) / 2}
                >
                    {year}
                </text>
            {/if}
            {#if pixelsPerYear > 3}
                <line
                    x1={yearToX(year)}
                    y1={0}
                    x2={yearToX(year)}
                    y2={5}
                    stroke={timelineTickColor}
                    stroke-width="1"
                    opacity={1 - (5 - pixelsPerYear) / 2}
                />
            {/if}
        {/each}

        <!-- <rect
            x={yearToX(view.current.start)} 
            y={0} 
            width={yearToX(view.current.start + (view.current.end - view.current.start) / 2) - yearToX(view.current.start)} 
            height={100} 
            fill="url(#gradient-left)"
        ></rect> -->
        <rect
            x={yearToX((view.current.end + view.current.start) / 2)} 
            y={0} 
            width={width/2} 
            height={100} 
            fill="url(#gradient-left)" 
        ></rect>
        <defs>
            <linearGradient id="gradient-left" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#336; stop-opacity:.2" />
                <stop offset="100%" style="stop-color:#336; stop-opacity:0" />
            </linearGradient>
        </defs>
        <g transform="translate(0, -4)">
            <rect
                x={yearToX(view.current.start + (view.current.end - view.current.start) / 2) - 1} 
                y={0} 
                width={2} 
                height={100} 
                fill="#33336688" 
            ></rect>
            <rect
                x={yearToX(view.current.start + (view.current.end - view.current.start) / 2) - 25} 
                y={0} 
                width={50} 
                height={20} 
                fill="#333366"
                rx="2"
                ry="2"
            ></rect>
            <polygon
                points={`
                    ${yearToX(view.current.start + (view.current.end - view.current.start) / 2) - 7},20 
                    ${yearToX(view.current.start + (view.current.end - view.current.start) / 2) + 7},20 
                    ${yearToX(view.current.start + (view.current.end - view.current.start) / 2)},30
                `}
                fill="#333366"
            ></polygon>
            <!-- Gradient left of the bar -->
            <text
                x={yearToX((view.current.end + view.current.start) / 2)} 
                y={15} 
                font-size="14" 
                font-weight="600" 
                fill="#fff" 
                text-anchor="middle"
            >{Math.round((view.current.end + view.current.start) / 2)}</text>
        </g>

        <g>
            {#if true}
                {@const start = 1960}
                {@const end = 1971}
                {@const height = 80}
                {@const color = "#333366"}
            <line 
                x1={yearToX(start)} 
                y1={height} 
                x2={yearToX(end)} 
                y2={height} 
                stroke={color + "88"} 
                stroke-width="1"></line>
            <line 
                x1={yearToX(start)} 
                y1={height} 
                x2={yearToX(start)} 
                y2={height - 8} 
                stroke={color + "88"} 
                stroke-width="1"></line>
            <line 
                x1={yearToX(end)} 
                y1={height} 
                x2={yearToX(end)} 
                y2={height - 8} 
                stroke={color + "88"} 
                stroke-width="1"></line>
            <text 
                x={yearToX((start + end) / 2)} 
                y={height + 14} 
                font-size="12" 
                font-weight="600" 
                fill={color}
                text-anchor="middle">Editie 4</text>
            {/if}
        </g>
        <g>
            {#if true}
                {@const start = 1969}
                {@const end = 1980}
                {@const height = 83}
                {@const color = "#333366"}
            <line 
                x1={yearToX(start)} 
                y1={height} 
                x2={yearToX(end)} 
                y2={height} 
                stroke={color + "88"} 
                stroke-width="1"></line>
            <line 
                x1={yearToX(start)} 
                y1={height} 
                x2={yearToX(start)} 
                y2={height - 8} 
                stroke={color + "88"} 
                stroke-width="1"></line>
            <line 
                x1={yearToX(end)} 
                y1={height} 
                x2={yearToX(end)} 
                y2={height - 8} 
                stroke={color + "88"} 
                stroke-width="1"></line>
            <text 
                x={yearToX((start + end) / 2)} 
                y={height + 14} 
                font-size="12" 
                font-weight="600" 
                fill={color}
                text-anchor="middle">Editie 5</text>
            <!-- <image 
                x={yearToX((start + end) / 2) - 16} 
                y={height - 40} 
                width={42} 
                height={32} 
                transform="rotate({Math.random() * 10 - 5}, {yearToX((start + end) / 2)}, 62.5)"
                href={mapViewer?.historicMaps[0]?.imageUrl || ''}></image>
            <image 
                x={yearToX((start + end) / 2) - 16} 
                y={height - 40} 
                width={42} 
                height={32} 
                transform="rotate({Math.random() * 10 - 5}, {yearToX((start + end) / 2)}, 62.5)"
                href={mapViewer?.historicMaps[0]?.imageUrl || ''}></image>
            <image 
                x={yearToX((start + end) / 2) - 16} 
                y={height - 40} 
                width={42} 
                height={32} 
                transform="rotate({Math.random() * 10 - 5}, {yearToX((start + end) / 2)}, 62.5)"
                href={mapViewer?.historicMaps[0]?.imageUrl || ''}></image> -->
            {/if}

            {#each mapViewer?.historicMaps as map, i}
                {@const height = mapViewer?.historicMaps.slice(0,i).filter(m => m.yearStart == map.yearStart).length * -5 + 65}
                <rect
                    x={yearToX(map.yearStart) } 
                    y={height} 
                    width={6} 
                    height={6} 
                    fill="#3366cc88"
                    transform={"rotate(" + (Math.random() * 10 - 5) + ", " + (yearToX(map.yearStart) + 3) + ", " + (height + 3) + ")"}
                ></rect>
            {/each}
        </g>
    </svg>
</div>