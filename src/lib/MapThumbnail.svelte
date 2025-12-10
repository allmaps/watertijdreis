<script lang="ts">
	import { spriteStore } from './SpriteSheet.svelte';

	let { id, className = '' }: { id: string; className?: string } = $props();

	let sprite = $derived.by(() => {
		if (spriteStore.loading) return null;
		return spriteStore.getSprite(id);
	});

	let styleString = $derived.by(() => {
		if (!sprite) return '';

		return [
			`width: ${sprite.width}px`,
			`height: ${sprite.height}px`,
			`background-image: url('${sprite.sourceImageUrl}')`,
			`background-position: -${sprite.x}px -${sprite.y}px`
		].join(';');
	});
</script>

<div class="thumbnail-wrapper {className}">
	{#if spriteStore.loading}
		<div class="placeholder loading"></div>
	{:else if sprite}
		<div class="sprite-image" style={styleString} role="img" aria-label="Kaart thumbnail"></div>
	{:else}
		<div class="placeholder error" title="Kaart niet gevonden">?</div>
	{/if}
</div>

<style>
	.thumbnail-wrapper {
		display: inline-block;
		overflow: hidden;
		background-color: #f0f0f0;
	}

	.sprite-image {
		display: block;
		background-repeat: no-repeat;
		image-rendering: -webkit-optimize-contrast;
	}

	.placeholder {
		width: 128px;
		height: 104px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #999;
	}

	.loading {
		background-color: #e0e0e0;
		animation: pulse 1.5s infinite ease-in-out;
	}

	@keyframes pulse {
		0% {
			opacity: 0.6;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.6;
		}
	}
</style>
