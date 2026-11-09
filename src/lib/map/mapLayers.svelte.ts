// src/lib/map/mapLayers.svelte.ts
import type { Map as MaplibreMap } from "maplibre-gl";
import type { MapLayer } from "./MapLayer.svelte";
import { RasterMapLayer } from "./RasterMapLayer.svelte";
import { VectorMapLayer } from "./VectorMapLayer.svelte";
import { AhnMapLayer } from "./AhnMapLayer.svelte";
import type { MapContext } from "./mapContext.svelte";

export function createAvailableLayers(mapContext: MapContext): MapLayer[] {
	return [
		...mapContext.historic.createSeries(),

		new VectorMapLayer({
			id: "waterschapsgrenzen",
			name: "Waterschapsgrenzen",
			themeColor: "#75f",
			sourceId: "waterschapsgrenzen",
			data: "./waterschapsgrenzen.geojson",
			labelField: "naam",
			added: true,
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
			added: false,
		}),
		new AhnMapLayer({ id: "ahn", name: "AHN Hoogtekaart", themeColor: "#44a" }),
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
