<script lang="ts">
	import { Plus } from "phosphor-svelte";
</script>

<button
	type="button"
	class="group flex w-full cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-medium text-white/80 transition-all hover:bg-white/15 hover:text-white"
>
	<div class="flex items-center gap-2">
		<div
			class="flex h-5 w-5 items-center justify-center rounded-md bg-white/10 transition-colors group-hover:bg-white/20"
		>
			<Plus size={14} class="text-white" />
		</div>
		<span class="tracking-wide">Nieuwe laag toevoegen...</span>
	</div>
</button>
