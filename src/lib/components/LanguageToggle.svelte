<script lang="ts">
	import { state as i18nState, locales, } from '../../stores/i18n/i18n.svelte';

	let isDropdownShown = $state(false);

	function setLocale(value: string) {
		i18nState.locale = value;
		isDropdownShown = false;
	}
</script>

<div class="toggle-container">
	<button class="button" onclick={() => isDropdownShown = !isDropdownShown}>{i18nState.locale}</button>

	{#if isDropdownShown}
	<ul class="menu">
		{#each locales as l (l)}
			<li class="locale-item"><button class={['locale-btn',{'locale-btn--active': i18nState.locale === l}]} onclick={() => setLocale(l)}>{l}</button></li>
			{/each}
	</ul>
		{/if}
</div>

<style>
		.toggle-container {
				position: relative;
		}

    .button {
        padding: 8px 15px;
        /* border: none; */
        /* box-shadow: 3px 3px 9px rgba(0,0,0,.15); */
        /* border: 1px solid rgb(233, 233, 255); */
        /* border-bottom: 2px solid rgb(233, 233, 255); */
        border-radius: 4px;
        background: #ffffffff;
        outline: 2px solid #4466ff22;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;

    &:hover{
        background: #ddd;
		}
    }

		.menu{
        --size: 8px;
        position: absolute;
        border: 2px solid #00000000;
				border-radius: 4px;
				background: #fff;
				padding-block-start: calc(var(--size) / 2);
				top: calc(100% + 8px);

				&::before {
						content: "";
						position: absolute;
						width: var(--size);
						height: var(--size);
						bottom: calc(100% - 3px);
						left: calc(50% - var(--size) / 2);
						transform: rotate(45deg);
						background: #fff;
        }
		}


		.locale-btn{
				display: block;
        padding: 15px;
				cursor: pointer;
				border-radius: 4px;
				width: 100%;
		}

		.locale-btn--active{
				color: #fff;
				background: #000;
		}

</style>