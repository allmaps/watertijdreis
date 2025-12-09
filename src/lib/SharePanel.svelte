<script lang="ts">
	import {
		Check,
		ClipboardText,
		EnvelopeSimple,
		InstagramLogo,
		LinkedinLogo,
		RedditLogo,
		WhatsappLogo,
		ChatCircle
	} from 'phosphor-svelte';
	import Modal from './Modal.svelte';
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
	let currentUrl = $state('');

	$effect(() => {
		if (visible && typeof window !== 'undefined') {
			currentUrl = window.location.href;
			console.log('SharePanel URL updated:', currentUrl);
		}
	});

	$effect(() => {
		if (copySuccess) {
			const timeout = setTimeout(() => {
				copySuccess = false;
			}, 1000);
			return () => clearTimeout(timeout);
		}
	});
</script>

<Modal title="Deel jouw tijdreis" bind:visible>
	<p class="w-full text-center">Deel het kaartgedeelte dat jij nu bekijkt.</p>
	<div class="mt-4 flex items-center">
		<input
			type="text"
			readonly
			value={currentUrl}
			class="h-12 w-2/3 rounded-[6px] border-2 border-[#eef] bg-[#ff44aa11] px-2 py-1 text-[16px] font-[500] text-[#336]"
		/>
		<button
			onclick={() => setClipboard(currentUrl)}
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
			href={`mailto:?subject=Bekijk%20Watertijdreis%20en%20reis%20terug%20in%20de%20tijd&body=Ik%20wil%20je%20uitnodigen%20om%20de%20Watertijdreis%20te%20bekijken.%20Klik%20op%20deze%20link%20om%20te%20beginnen:%0A%0A${currentUrl}`}
		>
			<EnvelopeSimple size="30" color="#f4a" class="relative -top-1 mt-6 inline"></EnvelopeSimple>
		</a>
		<a
			class="mx-4"
			href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`}
			target="_blank"
			rel="noopener noreferrer"
		>
			<LinkedinLogo size="30" color="#f4a" class="relative -top-1 mt-6 mr-1 inline"></LinkedinLogo>
		</a>

		<!-- <a class="mx-2" href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">
			<InstagramLogo size="30" color="#f4a" class="relative -top-1 mt-6 mr-1 inline"
			></InstagramLogo>
		</a> -->

		<a class="mx-4" href="https://www.reddit.com/" target="_blank" rel="noopener noreferrer">
			<RedditLogo size="30" color="#f4a" class="relative -top-1 mt-6 mr-1 inline"></RedditLogo>
		</a>

		<a
			class="mx-2"
			href={`https://wa.me/?text=${encodeURIComponent(
				'Watertijdreis - Reis door de tijd!\nKlik op de link om door de tijd te reizen!\n' +
					currentUrl
			)}`}
			target="_blank"
			rel="noopener noreferrer"
		>
			<WhatsappLogo size="30" color="#f4a" class="relative -top-1 mt-6 mr-1 inline" />
		</a>

		<a
			class="mx-4"
			href={`signal://send?text=${encodeURIComponent(
				'Watertijdreis - Reis door de tijd!\nKlik op de link om door de tijd te reizen!\n' +
					currentUrl
			)}`}
		>
			<ChatCircle size="30" color="#f4a" class="relative -top-1 mt-6 mr-1 inline" />
		</a>
	</div>
</Modal>
