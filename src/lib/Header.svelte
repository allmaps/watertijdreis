<script lang="ts">
	import { ShareFat, Info, MagnifyingGlass, Waves } from 'phosphor-svelte';
	import SharePanel from './SharePanel.svelte';
	import Button from './Button.svelte';
	import Modal from './Modal.svelte';
	import MapThumbnail from './MapThumbnail.svelte';

	let { historicMapsLoaded, resetState } = $props();

	let aboutPanelVisible = $state(false);
	let sharePanelVisible = $state(false);

	let buttonCollapse: boolean = $state(false);
	setTimeout(() => (buttonCollapse = true), 2000);

	let searchBarVisible = $state(false);
</script>

<Modal title="Over Watertijdreis" bind:visible={aboutPanelVisible}>
	<div class="prose">
		<p>
			Watertijdreis maakt het mogelijk om ruim 150 jaar aan Nederlandse watergeschiedenis te
			ontdekken. Vanaf de negentiende eeuw is er veel veranderd in de manier waarop we water beheren
			en afwateren. De Waterstaatskaarten, vervaardigd door Rijkswaterstaat tussen 1865 en 1992,
			brengen die veranderingen landsdekkend in beeld. Je ziet hoe Nederland zich in korte tijd snel
			heeft ontwikkeld: afwateringsgebieden verschoven, beek- en rivierlopen zijn verlegd, nieuwe
			waterbouwkundige kunstwerken zijn gebouwd en grotere wateren zijn ingepolderd. Deze
			cultuurhistorische tijdreis geeft inzicht in de keuzes die hebben geleid tot het landschap van
			nu, en kan inspireren om historische kennis opnieuw te benutten.
		</p>
		<p>
			Geïnspireerd op <a href="https://www.topotijdreis.nl/">Topotijdreis</a> vormt de tijdlijn het startpunt
			van je reis. In een aantal sprongen reis je voor elk gebied in Nederland door twee eeuwen watergeschiedenis.
			Het hele land is opgedeeld in zo’n 160 kaartbladen, die elk voorzien zijn van een legenda boordevol
			informatie. Deze informatie kan op verschillende manieren worden gedeeld en gedownload. De URL
			past zich tijdens je reis aan je locatie en tijdstip aan, zodat je jouw kaartbeeld kunt opslaan
			en delen. Daarnaast is het mogelijk de historische kaarten met verschillende achtergrondkaarten
			te combineren. Door bijvoorbeeld de waterlaag aan of uit te zetten kun je huidige waterlopen en
			-lichamen vergelijken met die van vroeger.
		</p>
		<p>
			Tot nu toe was een landsdekkende verbeelding van twee eeuwen aan waterstaatsgeschiedenis niet
			eerder overzichtelijk gepresenteerd. Om die reden hebben de <a
				href="https://www.cultureelerfgoed.nl/">Rijksdienst voor het Cultureel Erfgoed</a
			>
			(RCE) en <a href="https://www.stowa.nl/">STOWA</a> het initiatief genomen voor Watertijdreis.
			Samen met <a href="https://allmaps.org/">Allmaps</a>,
			<a href="https://www.tudelft.nl/">TU Delft</a>,
			<a href="https://www.uu.nl/universiteitsbibliotheek">Universiteitsbliotheek Utrecht</a> en
			<a href="https://www.linkedin.com/company/de-geomaten/">De Geomaten</a>
			kon deze applicatie worden gemaakt. Watertijdreis zal in de toekomst worden uitgebreid met meer
			historische kaarten die onze watergeschiedenis verbeelden.
		</p>
		<p>Voor vragen, feedback en suggesties neem contact op met:</p>
		<blockquote>
			<a href="mailto:waterenklimaat@cultureelerfgoed.nl">waterenklimaat@cultureelerfgoed.nl</a>.
		</blockquote>
		<hr />
		<i>Meer informatie:</i>
		<ul>
			<li>
				<a
					href="https://publicaties.stowa.nl/stowa-ter-info-94/samenwerking-tussen-stowa-en-rijksdienst-voor-het-cultureel-erfgoed-erfgoedspecialisten-bieden-waterschappen-inzicht-in-het-water-en-bodemgestuurde-verleden"
					>Erfgoedspecialisten bieden waterschappen inzicht in het water-en-bodemgestuurde verleden</a
				> (STOWA)
			</li>
			<li>
				<a
					href="https://www.cultureelerfgoed.nl/onderwerpen/bronnen-en-kaarten/overzicht/leven-met-water-kaart"
					>Leven met water</a
				> (RCE)
			</li>
			<li>
				<a href="https://rce.webgis.nl/nl/map/erfgoedatlas">Erfgoedatlas</a> (RCE)
			</li>
			<li>
				<a href="https://open.rijkswaterstaat.nl/@28836/waterstaat-kaart-geschiedenis/"
					>Waterstaat in kaart. Geschiedenis van de waterstaatskaart van Nederland 1865-1992</a
				> (Rijkswaterstaat)
			</li>
		</ul>
		<i>Gebruikte techniek:</i>
		<ul>
			<li>
				<a href="https://repository.tudelft.nl/record/a39e2c3e-640c-4fa5-8abf-1e376d75ae5f"
					>Georeferencing Historic Map Series: An Automated Approach</a
				> (TU Delft)
			</li>
			<li>
				<a href="https://www.e-perimetron.org/Vol_20_1/Meijers_et_al.pdf"
					>Mapping the Edge: A Novel Approach to Georeferencing Historical Map Series</a
				> (PDF)
			</li>
			<li>
				<a href="https://iiif.io/api/extension/georef/">Georeference Extension</a> (IIIF Consortium)
			</li>
		</ul>
		<i>Broncode en data:</i>
		<ul>
			<li><a href="https://github.com/allmaps/watertijdreis">Broncode applicatie</a> (GitHub)</li>
			<li>
				<a href="https://github.com/tu-delft-heritage/watertijdreis-data"
					>Georeference Annotations</a
				> (GitHub)
			</li>
			<li>
				Scans (Universiteitsbliotheek Utrecht)
				<ul>
					<li><a href="https://objects.library.uu.nl/reader/1874-389916">Editie 1</a></li>
					<li><a href="https://objects.library.uu.nl/reader/1874-456650">Editie 1 BIS</a></li>
					<li><a href="https://objects.library.uu.nl/reader/1874-455650">Editie 2</a></li>
					<li><a href="https://objects.library.uu.nl/reader/1874-456550">Editie 2 BIS</a></li>
					<li><a href="https://objects.library.uu.nl/reader/1874-456551">Editie 3</a></li>
					<li><a href="https://objects.library.uu.nl/reader/1874-456552">Editie 3 BIS</a></li>
					<li><a href="https://objects.library.uu.nl/reader/1874-456588">Editie 4</a></li>
					<li><a href="https://objects.library.uu.nl/reader/1874-456553">Editie 4 BIS</a></li>
					<li><a href="https://objects.library.uu.nl/reader/1874-456827">Editie 5</a></li>
				</ul>
			</li>
		</ul>
		<hr />
		<div class="flex flex-wrap">
			<div class="basis-2/2 p-2">
				<a href="https://www.cultureelerfgoed.nl/"
					><img class="mx-auto h-20" alt="RCE Logo" src="/img/svg/rce-logo.svg" /></a
				>
			</div>
			<div class="basis-2/2 p-2">
				<a href="https://www.stowa.nl/"
					><img class="mx-auto h-10" alt="STOWA Logo" src="/img/svg/stowa-logo.svg" /></a
				>
			</div>
			<div class="basis-1/2 p-2">
				<a href="https://allmaps.org/"
					><img class="mx-auto h-15" alt="Allmaps Logo" src="/img/svg/allmaps-logo.svg" /></a
				>
			</div>
			<div class="basis-1/2 p-2">
				<a href="https://www.tudelft.nl/"
					><img class="mx-auto h-20" alt="TU Delft Logo" src="/img/svg/tu-logo.svg" /></a
				>
			</div>
			<div class="basis-2/2 p-2">
				<a href="https://www.linkedin.com/company/de-geomaten/"
					><img class="mx-auto h-10" alt="De Geomaten Logo" src="/img/svg/geomaten-logo.svg" /></a
				>
			</div>
		</div>
	</div>
</Modal>

<SharePanel bind:visible={sharePanelVisible}></SharePanel>

<div
	class="absolute top-2 left-2 z-999 flex items-center gap-1 rounded-[8px] bg-[#ffffff] p-4 text-[#336] shadow-lg sm:top-5 sm:left-5"
	onmouseenter={() => (buttonCollapse = false)}
	onmouseleave={() => (buttonCollapse = true)}
	role="group"
>
	<button onclick={resetState}>
		<h1
			class="mr-1 flex inline cursor-pointer gap-[1px] text-[20px] font-[700] text-shadow-[2px_2px_0_#eef]"
		>
			{#each 'Watertijdreis'.split('') as letter, i}
				<span
					class="inline-block will-change-[transform,text-shadow,color]"
					class:wave={historicMapsLoaded}
					class:wave-loading={!historicMapsLoaded}
					style:animation=""
					style:animation-delay={i * 60 + 'ms'}
				>
					{letter}
				</span>
			{/each}
		</h1>
	</button>

	<!-- <div class="ml-2 inline"> -->
	<Button tabindex="1" onclick={() => (aboutPanelVisible = !aboutPanelVisible)} Icon={Info}
		>Over</Button
	>
	<Button tabindex="2" onclick={() => (sharePanelVisible = !sharePanelVisible)} Icon={ShareFat}
		>Delen</Button
	>
	<!-- <button
			onclick={() => (aboutPanelVisible = !aboutPanelVisible)}
			class={`
				group inline-flex flex-shrink-0 cursor-pointer 
				items-center justify-center border-2 border-[#33336611]
				bg-white 
				font-[500] shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
				transition-all
				
				duration-500 hover:bg-[#eef]
				${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg px-2.5 py-2'}
			`}
		>
			<Info
				color="#f4a"
				class={`
				relative -top-px inline h-[22px]
				w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
				`}
			/>

			<span
				class={`
				overflow-hidden whitespace-nowrap
				transition-[max-width,margin,opacity] duration-500 ease-in-out
				${buttonCollapse ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 max-w-40 opacity-100'}
			`}
			>
				Over
			</span>
		</button>
		<button
			onclick={() => (sharePanelVisible = !sharePanelVisible)}
			class={`
				group inline-flex flex-shrink-0 cursor-pointer 
				items-center justify-center border-2 border-[#33336611]
				bg-white 
				font-[500] shadow-[0_2px_2px_rgba(0,0,0,0.05)] 
				transition-all
				
				duration-500 hover:bg-[#eef]
				${buttonCollapse ? 'rounded-lg p-2' : 'rounded-lg px-2.5 py-2'}
			`}
		>
			<ShareFat
				color="#f4a"
				class={`
				relative -top-px inline h-[22px]
				w-[22px] flex-shrink-0 opacity-70 group-hover:opacity-100
				`}
			/>

			<span
				class={`
				overflow-hidden whitespace-nowrap
				transition-[max-width,margin,opacity] duration-500 ease-in-out
				${buttonCollapse ? 'ml-0 max-w-0 opacity-0' : 'ml-1.5 max-w-40 opacity-100'}
			`}
			>
				Delen
			</span>
		</button> -->
	<!-- </div> -->
</div>

<style>
	.wave {
		animation: wave 600ms ease-in-out infinite alternate;
	}

	.wave-loading {
		animation: wave-loading 600ms ease-in-out infinite alternate;
	}

	@keyframes wave-loading {
		0% {
			color: #33a;
			opacity: 0;
		}
		100% {
			color: #336;
			opacity: 1;
		}
	}

	@keyframes wave {
		0% {
			transform: translateY(0px);
			color: #33a;
			text-shadow: 1px 1px 0 #aaf;
		}
		100% {
			transform: translateY(-2.1px);
			color: #336;
		}
	}
</style>
