// src/lib/map/mapLayers.svelte.ts
import type { Map as MaplibreMap } from "maplibre-gl";
import type { MapContext } from "./mapContext.svelte";
import { RasterMapLayer } from "./RasterMapLayer.svelte";
import type { MapLayer } from "$lib/state/MapLayer.svelte";

/**
 * Retourneert de catalogus van alle beschikbare lagen in de applicatie.
 * Wordt aangeroepen vanuit MapContext zodra de MapLibre map-instantie klaar is.
 */
export function createAvailableLayers(map: MaplibreMap): MapLayer[] {
	return [
		new RasterMapLayer({
			id: "waterschapsgrenzen",
			name: "Waterschapsgrenzen",
			themeColor: "#f4a",
			type: "pdok-wms",
			sourceId: "pdok-waterschapsgrenzen",
			layerId: "overlay-waterschapsgrenzen",
			tiles: [
				"https://service.pdok.nl/hwh/waterschappen-waterschapsgrenzen-imso/wms/v2_0?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=waterschap&STYLES=&FORMAT=image/png&TRANSPARENT=true&CRS=EPSG:3857&WIDTH=256&HEIGHT=256&BBOX={bbox-epsg-3857}",
			],
			added: true, // Standaard zichtbaar in het paneel
		}),
		new RasterMapLayer({
			id: "satelliet",
			name: "Actuele Satelliet / Ortho",
			themeColor: "#4a4",
			type: "pdok-wms",
			sourceId: "satelliet",
			layerId: "satelliet-layer",
			tiles: [
				"https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0?service=WMS&version=1.1.1&request=GetMap&layers=Actueel_ortho25&styles=&format=image/jpeg&transparent=true&height=256&width=256&srs=EPSG:3857&bbox={bbox-epsg-3857}",
			],
			minzoom: 6,
			maxzoom: 20,
			added: false, // Moet via 'Laag toevoegen' gekozen worden
		}),
		new RasterMapLayer({
			id: "ahn",
			name: "AHN Hoogtebestand (DSM 0.5m)",
			themeColor: "#44a",
			type: "pdok-wms",
			sourceId: "dsm-05",
			layerId: "dsm-05-layer",
			tiles: [
				"https://service.pdok.nl/rws/ahn/wms/v1_0?REQUEST=GetMap&SERVICE=WMS&VERSION=1.3.0&FORMAT=image/png&STYLES=&TRANSPARENT=TRUE&LAYERS=dsm_05m&TILED=true&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&BBOX={bbox-epsg-3857}",
			],
			added: false, // Moet via 'Laag toevoegen' gekozen worden
		}),
	];
}

// --- Systeem- en Vectorlagen (blijven onveranderd) ---

export function addUserLocationCircle(map: MaplibreMap) {
	if (map.getSource("user-location")) return;

	map.addSource("user-location", {
		type: "geojson",
		data: { type: "FeatureCollection", features: [] },
	});

	map.addLayer({
		id: "user-location",
		type: "circle",
		source: "user-location",
		paint: {
			"circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 6, 22, 20],
			"circle-color": "#f4a",
			"circle-opacity": 0,
			"circle-stroke-color": "#ffffff",
			"circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 0, 0, 22, 6],
			"circle-stroke-opacity": 0,
			"circle-opacity-transition": { duration: 400 },
			"circle-radius-transition": { duration: 400 },
			"circle-stroke-width-transition": { duration: 700 },
			"circle-stroke-opacity-transition": { duration: 400 },
		},
	});
}

export function addOutlineLayers(mapContext: MapContext) {
	// ... (je bestaande addOutlineLayers code)
}
