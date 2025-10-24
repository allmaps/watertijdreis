<script lang="ts">
	import Toast from "./Toast.svelte";
    import { Tween, Spring } from "svelte/motion";
    import { cubicOut } from "svelte/easing";
	import { Eye, ImagesSquare } from "phosphor-svelte";

    let width : number = $state(0);
    let height : number = $state(0);

    // let view = $state(new Tween({ start: 1800, end: 1900 }, { duration: 250, easing: cubicOut }));
    let view = $state(new Spring({ start: 1850, end: 1950 }, { stiffness: 0.1, damping: 0.33 }));

    let timelineTickColor = $state("#336");

    const MIN_YEAR : number = 1750;
    const MAX_YEAR : number = 2023;

    let dots = $state([]);
    // for(let i = 0; i < 50; ++i) {
    //     dots.push({
    //         year: Math.random() * 75 + 1850,
    //         rotation: Math.random() * 10 - 5
    //     })
    // }

    let editions = {
        'editie_1': {
            name: "Eerste editie",
            start: 1865,
            end: 1895,
            maps: Array.from({ length: 168 }, _ => Math.random() * 30 + 1865)
        },
        'editie_2': {
            name: "Tweede editie",
            start: 1885,
            end: 1925,
            maps: Array.from({ length: 159 }, _ => Math.random() * 40 + 1885)
        },
        'editie_3': {
            name: "Derde editie",
            start: 1910,
            end: 1950,
            maps: Array.from({ length: 134 }, _ => Math.random() * 40 + 1910)
        },
        'editie_4': {
            name: "Vierde editie",
            start: 1940,
            end: 1980,
            maps: Array.from({ length: 136 }, _ => Math.random() * 40 + 1940)
        },
        'editie_5': {
            name: "Vijfde editie",
            start: 1970,
            end: 2000, 
            maps: Array.from({ length: 129 }, _ => Math.random() * 30 + 1970)
        }
    }

    let selectionStart : number = $state(1850);
    let selectionEnd : number = $state(1900);

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
        const zoomFactor = 1 + Math.min(Math.max(e.deltaY / 100, -0.2), 0.2);
        const cursorYear = xToYear(e.offsetX);
        if (e.deltaY < 0) {
            const newSpan = (view.current.end - view.current.start) * zoomFactor;
            view.target = {
                start: cursorYear - (cursorYear - view.current.start) * zoomFactor,
                end: view.current.start + newSpan
            }
        } else {
            const newSpan = (view.current.end - view.current.start) * zoomFactor;
            view.target = {
                start: cursorYear - (cursorYear - view.current.start) * zoomFactor,
                end: view.current.start + newSpan
            }
        }
    }

    function onpointerdown(e: PointerEvent) {
        isPanning = true;
        lastX = e.clientX;
    }

    function onpointermove(e: PointerEvent) {
        if (!isPanning) return;
        const dx = e.clientX - lastX;
        const yearDelta = (dx / width) * (view.current.end - view.current.start);
        // view.target.start -= yearDelta;
        // view.target.end -= yearDelta;
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
    </svg>

    <div class="editions-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden">
        {#each Object.values(editions) as edition, i}
            {@const drawHeight = i % 2 == 0 ? 36 : 68}
            {@const left = yearToX(edition.start)}
            {@const right = yearToX(edition.end)}
            {@const widthPx = right - left}
            
            <div
                class="edition"
                style="
                    position: absolute;
                    left: {left}px;
                    top: {drawHeight}px;
                    width: {widthPx}px;
                    height: 28px;
                    border-radius: 4px;
                    padding: 1px 15px;
                    font-size: 14px;
                    font-weight: 400;
                    color: #336;
                    background: #33336611;
                    box-shadow: 0 4px 8px #00000011;
                    border: 2px solid #33336611;
                "
            >
                <!-- Hier kun je icons of rich text plaatsen -->
                {@html edition.name} 

                <span class="text-[#333366ff] opacity-50">
                    <!-- <Eye size="16" class="inline ml-1 relative top-[-1px]" /> -->
                    {edition.maps.filter(m => m <= (view.current.end + view.current.start) / 2).length}
                </span>
                /
                <span class="text-[#333366ff] opacity-50">
                    <!-- <ImagesSquare size="16" class="inline ml-1 relative top-[-1px]" /> -->
                    {edition.maps.length}
                 </span>
            </div>
        {/each}
    </div>
</div>

<Toast content={`Je ziet de kaarten gemaakt tussen ${Math.round(selectionStart)} en ${Math.round(selectionEnd)}`}></Toast>