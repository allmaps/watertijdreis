<script>
    let loaded = $state(false);

    let padding = $state(30);
    let actualWidth = $state(0);
    let width = $derived(actualWidth - padding * 2);
    
    let yearStart = 1800;
    let yearEnd = 2000;
    let yearStep = 50;
    

    let steps = (yearEnd - yearStart) / yearStep;
    let stepWidth = $derived(width / steps);
    

    let dots = $state([]);
    for(let i = 0; i < 70; ++i) {
        dots.push(Math.random() * ((yearEnd-150) - yearStart) + yearStart + 25 | 0);
    }

    let dots2 = $state([]);
    for(let i = 0; i < 60; ++i) {
        dots2.push(Math.random() * ((yearEnd-110) - yearStart) + yearStart + 100 | 0);
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

     <rect x="0" y="0" width={actualWidth} height="50" fill="#f3f3ffcc" opacity="30%"/>


    <!-- Elk jaar -->
    {#each { length: steps*50} as _, m}
            {#if (yearStart + yearStep * m/50) % 50 == 0}    
                <line x1={m * (stepWidth / 50) + padding} y1="0" x2={m * (stepWidth / 50) + padding} y2="50" stroke="#000000" stroke-width="0" />
            {:else}
            <line x1={m * (stepWidth / 50) + padding} y1="0" x2={m * (stepWidth / 50) + padding} y2="50" stroke="grey" stroke-width="0.1" />
            {/if}    
            {/each}
    
    <!-- Elke 5 jaar -->
    {#each { length: steps*10} as _, l}
            {#if (yearStart + yearStep * l/10) % 10 == 0}    
                <line x1={l * (stepWidth / 10) + padding} y1="0" x2={l * (stepWidth / 10) + padding} y2="15" stroke="#000000" stroke-width="0" />
            {:else}
            <line x1={l * (stepWidth / 10) + padding} y1="0" x2={l * (stepWidth / 10) + padding} y2="15" stroke="#000000" stroke-width="1" />
            {/if}    
            {/each}


    <!--  Elke 10 jaar -->
    {#each {length: steps*5} as _, j}
          {#if (yearStart + yearStep * j/5) % 50 == 0}
            <text style:font="normal 0px sans-serif" class="bg-fuchsia-500" x={j/5 * stepWidth + padding - 13} y={35}>{yearStart + yearStep * j/5}</text>
            {:else}
             <text style:font="normal 12px sans-serif" class="bg-fuchsia-500" x={j/5 * stepWidth + padding - 13} y={35}>{yearStart + yearStep * j/5}</text>
             <line x1={j * stepWidth/5 + padding} y1="0" x2={j * stepWidth/5 + padding} y2="25" stroke="#222" stroke-width="1" />
            {/if}
            {/each}

    <!-- Elke 50 jaar -->
    {#each {length: steps} as _, i}
            <text style:font="normal 15px sans-serif" x={i * stepWidth + padding - 18} y={43}>{yearStart + yearStep * i}</text>
            <line x1={i * stepWidth + padding} y1="0" x2={i * stepWidth + padding} y2="30" stroke="#222" stroke-width="1.5" />
            {/each}
        

        <text style:font="normal 15px sans-serif" x={steps * stepWidth + padding - 17} y={43}>{yearStart + yearStep * steps}</text>
        <line x1={steps * stepWidth + padding} y1="0" x2={steps * stepWidth + padding} y2="31" stroke="#222" stroke-width="1.5" />

            
<!-- Interne schaduw bovenaan -->
    <!-- <rect x="0" y="0" width={actualWidth} height="8" fill="url(#topShadow)" />

    <defs>
      <linearGradient id="topShadow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="black" stop-opacity="0.1"/>
        <stop offset="50%" stop-color="black" stop-opacity="0"/>
      </linearGradient>
    </defs> -->

      {#each dots as dot} 
            <circle cx={yearToScreen(dot)} cy={18} r="4" fill="#fff" stroke="#f4a" stroke-width="1"></circle>
        {/each}

        {#each dots2 as dot2}
         <circle cx={yearToScreen(dot2)} cy={18} r="4" fill="#fff" stroke="#aa44ff" stroke-width="1"></circle>
         {/each}

    {/if}
</svg>