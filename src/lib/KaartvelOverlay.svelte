<script lang="ts">
    import { createEventDispatcher, onMount } from 'svelte';
    import feather from 'feather-icons';
    import { Menubar } from"bits-ui";
    import { ScrollArea } from"bits-ui";
    import ArrowArcRight from"phosphor-svelte/lib/ArrowArcRight";
    import CopySimple from"phosphor-svelte/lib/CopySimple";
    import ListNumbers from"phosphor-svelte/lib/ListNumbers";
    import XSquare from"phosphor-svelte/lib/XSquare";
    import CaretUp from"phosphor-svelte/lib/CaretUp";
    import CaretDown from"phosphor-svelte/lib/CaretDown";
    import CaretRight from"phosphor-svelte/lib/CaretRight";
    import CaretLeft from"phosphor-svelte/lib/CaretLeft";
    import Check from"phosphor-svelte/lib/Check";
    import Cat from"phosphor-svelte/lib/Cat";
    import { Select } from"bits-ui";
    import Palette from"phosphor-svelte/lib/Palette";
    import CaretUpDown from"phosphor-svelte/lib/CaretUpDown";
    import CaretDoubleUp from"phosphor-svelte/lib/CaretDoubleUp";
    import CaretDoubleDown from"phosphor-svelte/lib/CaretDoubleDown";

    const dispatch = createEventDispatcher();
  
    onMount(() => {
      feather.replace();
    });

  </script>
  
  <style>
   .kaartvel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);

  display: flex;
  justify-content:center;  
  align-items: flex-start;     
  z-index: 100;
}
  
   .kaartvel {
    display: flex;
    flex-direction: row;
    width: 80vw;       
    height: 65vh;      
    background: rgba(255, 255, 255, 0);
    gap: 1rem;   
    margin-top: 2rem;     
  }

    .left-rect {
    position: relative;
    flex: 1;         
    display: flex;
    justify-content: center;
    align-items: center;
    background: white;
    z-index: 1000;
    border-radius: 9px;
  }

  .left-rect img {
    max-width: 90%;
    max-height: 90%;
  }


.right-rect {
  flex: 1;
  background: transparent;
  display: flex;
  flex-direction: column;
  gap: 1rem;   
  justify-content: flex-start;
  align-items: flex-start;
  z-index: 1000;
  position: relative;
  height: 60vh;
}
  </style>
  
  <div class="kaartvel-overlay">
  <div class="kaartvel">
    
 
    <div class="left-rect relative">
  <img src="map.png" alt="map" class="max-w-[90%] max-h-[90%]" />


<XSquare 
          size="22"
          class="absolute top-5 left-3 cursor-pointer text-pink-500 hover:text-pink-500 transition-colors"
        title="Kaartvel sluiten"
      />
        
   
  <!-- <ArrowArcRight 
    size="22"
    class="absolute bottom-5 right-3 cursor-pointer text-pink-500 hover:text-pink-500 transition-colors"
    title="Achterkant vel bekijken"
  /> -->
    </div>

 
    <div class="right-rect">
      
      


 
    </div>

  </div>
</div>
