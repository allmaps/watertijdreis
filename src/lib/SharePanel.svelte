<script lang="ts">
	import {
		Check,
		ClipboardText,
		EnvelopeSimple,
		ImagesSquare,
		InstagramLogo,
		LinkedinLogo,
		RedditLogo,
		X
	} from 'phosphor-svelte';
	import { fly, fade } from 'svelte/transition';
	let { visible = $bindable() } = $props();

	async function setClipboard(text) {
		const type = 'text/plain';
		const clipboardItemData = {
			[type]: text
		};
		const clipboardItem = new ClipboardItem(clipboardItemData);
		await navigator.clipboard.write([clipboardItem]);
		copySuccess = true;
	}

	let copySuccess: boolean = $state(false);
	$effect(() => {
		if (copySuccess) {
			const timeout = setTimeout(() => {
				copySuccess = false;
			}, 1000);
			return () => clearTimeout(timeout);
		}
	});
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key == 'Escape') visible = false;
	}}
/>

{#if visible}
	<div
		class="fixed top-0 left-0 z-1000 h-full w-full bg-[#33336688]"
		onclick={() => (visible = false)}
		transition:fade
	></div>
	<div
		class="
            max-h-90vh fixed top-1/2 left-1/2
            z-1001 flex
            w-[90vw] max-w-120 -translate-x-1/2 -translate-y-1/2
            flex-col items-center overflow-auto rounded-[8px] border border-gray-200
            bg-white px-4 py-8 shadow-lg sm:px-6 md:px-8
        "
		transition:fly={{ y: -20, duration: 250 }}
	>
		<button
			onclick={() => (visible = false)}
			class="absolute top-4 right-4 cursor-pointer rounded-[8px] bg-[#ff44aa22] p-2 opacity-50 transition-opacity hover:opacity-100"
		>
			<X size="24" color="#f4a" weight="bold" class="opacity-67"></X>
		</button>

		<h1 class="text-[22px] font-[700] text-[#336]">Delen</h1>

		<div class="mt-2 p-2">
			<p>Deel Watertijdreis met iemand die ook terug in de tijd wil.</p>

			<div class="mt-4 flex items-center">
				<input
					type="text"
					readonly
					value={window.location.href}
					class="h-12 w-2/3 rounded-[6px] border-2 border-[#eef] bg-[#ff44aa11] px-2 py-1 text-[16px] font-[500] text-[#336]"
				/>
				<button
					onclick={() => setClipboard(window.location.href)}
					class="ml-4 h-12 w-42 cursor-pointer rounded-[6px] bg-[#336] px-4 py-1 font-[600] text-white transition-colors hover:bg-[#558]"
				>
					{#if copySuccess}
						<Check size="22" color="#fff" class="relative -top-2 mt-4 mr-2 inline"></Check>
						Gekopieerd
					{:else}
						<ClipboardText size="22" color="#fff" class="relative -top-2 mt-4 mr-2 inline"
						></ClipboardText>
						Kopieer
					{/if}
				</button>
			</div>

			<div class="mt-4 text-center">
				<a
					class="mx-2"
					href="mailto:?subject=Bekijk%20Watertijdreis%20en%20reis%20terug%20in%20de%20tijd&body=Ik%20wil%20je%20uitnodigen%20om%20de%20Watertijdreis%20te%20bekijken.%20Klik%20op%20deze%20link%20om%20te%20beginnen:%0A%0A{window
						.location.href}"
				>
					<EnvelopeSimple size="32" color="#f4a" class="relative -top-1 mt-6 inline"
					></EnvelopeSimple>
				</a>
				<a class="mx-4">
					<LinkedinLogo size="32" color="#f4a" class="relative -top-1 mt-6 mr-2 inline"
					></LinkedinLogo>
				</a>
				<a>
					<InstagramLogo size="32" color="#f4a" class="relative -top-1 mt-6 mr-2 inline"
					></InstagramLogo>
				</a>
				<a class="mx-4">
					<RedditLogo size="32" color="#f4a" class="relative -top-1 mt-6 mr-2 inline"></RedditLogo>
				</a>
			</div>
		</div>
	</div>
{/if}
