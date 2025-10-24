<script>
    import { fade } from "svelte/transition";

    let { map, warpedMapDots, dotsVisible, resizePercent, color = "#f4a", isComparing } = $props();

    setInterval(() => {
         // TODO: tijdelijk!
    }, 17);

    $effect(() => {
        // setInterval(() => {
        //     console.log(map && map.warpedMapLayer.hoveredMapId, warpedMapDots.map(i => i.id));
        // }, 500);
    })
</script>

<style>
    svg {
        position: fixed;
        top: 0;
        left: 0;
        pointer-events: none;
    }

    svg g g {
        pointer-events: all;
        cursor: pointer;
    }

    svg g g #outer-circle {
        transition: r .2s, opacity .2s;
        opacity: .8;
    }   

    svg .hovered #outer-circle {
        opacity: 1;
        r: 6;
    }

    svg g g:hover #outer-circle {
        r: 6;
        opacity: 1;
    }

    svg g g text {
        opacity: 0;
        pointer-events: none;
        background: #fff;
    }

    svg g g:hover text {
        opacity: 1;
    }

    svg g g #inner-circle {
        opacity: 0;
        transition: opacity .2s;
    }
    
    svg g g:hover #inner-circle {
        opacity: 1
    }
</style>

{#if dotsVisible}
    <svg 
    class="behind w-full h-full" 
    transition:fade={{ duration: 330 }}>
        <defs>
            <clipPath id="clip">
            <rect x="0" y="0" width={`${isComparing ? resizePercent : 100}%`} height="100%" />
            </clipPath>
        </defs>
        <g clip-path="url(#clip)">
        {#each warpedMapDots as dot}
            <g 
                onmouseenter={() => {
                    map.warpedMapLayer.fadeInBBoxOutline(map.maplibreInstance, map.warpedMapLayer.getWarpedMapByID(dot.id), 800);
                }}
                onmouseleave={() => {
                    map.warpedMapLayer.fadeOutBBoxOutline(map.maplibreInstance, map.warpedMapLayer.getWarpedMapByID(dot.id), 800);
                }}
                class={(dot.id == map.warpedMapLayer.hoveredMapId) ? "hovered" : ""}>
                <circle id="outer-circle" cx={dot.pos.x} cy={dot.pos.y} r={4} fill={color} stroke="#fff" stroke-width="2"></circle>
                <circle id="inner-circle" cx={dot.pos.x} cy={dot.pos.y} r={2} fill="#fff"></circle>
                <!-- <text font-size="12px" x={dot.pos.x - 65} y={dot.pos.y + 25} class="hover-label">Rotterdam West, 1890</text> -->
            </g>
        {/each}
        </g>
    </svg>
{/if}