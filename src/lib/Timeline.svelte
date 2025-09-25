<script>
    let loaded = $state(false);

    let padding = $state(30);
    let actualWidth = $state(0);
    let width = $derived(actualWidth - padding * 2);
    
    let yearStart = 1850;
    let yearEnd = 1975;
    let yearStep = 25;

    let steps = (yearEnd - yearStart) / yearStep;
    let stepWidth = $derived(width / steps);

    let dots = $state([]);
    for(let i = 0; i < 80; ++i) {
        dots.push(Math.random() * (yearEnd - yearStart) + yearStart | 0);
    }

    function yearToScreen(year) {
        return (year - yearStart) / (yearEnd - yearStart) * width + padding;
    }

    $effect(() => {
        loaded = true;
    });
</script>


<svg height="50" width="100%" bind:clientWidth={actualWidth}>
    {#if loaded}
        {#each {length: steps} as _, i}
            <text style:font="normal 14px sans-serif" x={i * stepWidth + padding - 17} y={35}>{yearStart + yearStep * i}</text>
            <line x1={i * stepWidth + padding} y1="40" x2={i * stepWidth + padding} y2="50" stroke="#222" stroke-width="1" />
            {#each { length: 25} as _, j}
                <line x1={i * stepWidth + j * (stepWidth / 25) + padding} y1="45" x2={i * stepWidth + j * (stepWidth / 25) + padding} y2="50" stroke="#222" stroke-width="1" />
            {/each}
        {/each}
        <text style:font="normal 14px sans-serif" x={steps * stepWidth + padding - 17} y={35}>{yearStart + yearStep * steps}</text>
        <line x1={steps * stepWidth + padding} y1="40" x2={steps * stepWidth + padding} y2="50" stroke="#222" stroke-width="1" />

        {#each dots as dot} 
            <circle cx={yearToScreen(dot)} cy={Math.random() * 10 + 20} r="4" fill="#f4a" stroke="#fff" stroke-width="1"></circle>
        {/each}

        <!-- {#each [1850,1875,1900,1925,1950,1975] as year, i}
            <text style:font="normal 14px sans-serif" x={i * 200 + 5} y={30}>{year}</text>
            <line x1={i * 200 + 25} y1="40" x2={i * 200 + 25} y2="50" stroke="#222" stroke-width="2" />
            {#each { length: 25} as _, j}
            <line x1={i * 200 + j * 8 + 25} y1="45" x2={i * 200 + j * 8 + 25} y2="50" stroke="#222" stroke-width="2" />
            {/each}
        {/each} -->
    {/if}
</svg>