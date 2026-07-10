import maplibregl from 'maplibre-gl';
import type { LngLatLike, Map as MaplibreMap } from 'maplibre-gl';
import * as pmtiles from 'pmtiles';
import { WarpedMapLayer } from '@allmaps/maplibre';
import type { HistoricMap } from '$lib/types/historicmap';
import { addBackgroundLayers, addOutlineLayers, addUserLocationCircle } from './mapLayers.svelte';
import { basemapStyle } from '$lib/basemap';
import { SvelteMap } from 'svelte/reactivity';
import { animateFeatureOpacity } from '$lib/utils/mapAnimations.svelte';
import { goto } from '$app/navigation';
import { HistoricMapsContext } from './historicMapsContext.svelte';
import { getUserLocation, isInNL } from '$lib/utils/UserLocation.svelte';


const defaultState = {
    zoom: 6.5,
    lat: 51.75,
    lng: 5.5,
    yearStart: 1865,
    yearEnd: 1983,
    edition: 'All',
    bis: false,
    type: undefined,
    selectedSheetId: null,
    pinnedSheetId: null,
    baseMap: 'none',
    protoMapsWaterInFront: false,
    protoMapsLabelsInFront: false,
    historicMapsOpacity: 100
};

type Filter = {
    yearStart: number;
    yearEnd: number;
    edition: 'All' | 1 | 2 | 3 | 4 | 5;
    bis: boolean;
    type: undefined | 'WVE' | 'HWP';
};

type LayerOptions = {
    baseMap: 'none' | 'protomaps' | 'ahn' | 'satelliet';
    protoMapsWaterInFront: boolean;
    protoMapsLabelsInFront: boolean;
    historicMapsOpacity: number;
    overlay: 'none' | 'waterschapsgrenzen' | 'gemeentegrenzen';
};

export class MapContext {
    // Maplibre instantie
    map: MaplibreMap | null = $state(null);
    maplibreLoaded: boolean = $state(false);

    historic: HistoricMapsContext = new HistoricMapsContext(this);

    hoveredFeature: Feature<Geometry, GeoJsonProperties> | null = $state(null);
    hoveredHistoricMap: HistoricMap | null = $derived.by(() => {
        if (!this.hoveredFeature) return null;
        return this.historic.historicMapsById.get(this.hoveredFeature.properties?.id) || null;
    });
    clickedFeature: Feature<Geometry, GeoJsonProperties> | null = $state(null);
    clickedHistoricMap = $derived.by(() => {
        if (!this.clickedFeature) return null;
        return this.historic.historicMapsById.get(this.clickedFeature.properties?.id) || null;
    });

    viewportPolygon: GeojsonPolygon | null = $state(null);

    savedMapViews: MapView[] = $state([]);
    savedLayerVisibility: Record<string, 'visible' | 'none'> | null = null;

    userLocationActive: boolean = $state(false);
    userLocationTimeout: ReturnType<typeof setTimeout> | null = null;

    gridVisible: boolean = $state(false);
    sheetIndexVisible: boolean = $state(false);
    gridResetTimer: ReturnType<typeof setTimeout> | null = null;
    featureTimeouts = {};

    filter: Filter = $state({
        yearStart: 1865,
        yearEnd: 1983,
        edition: 'All',
        bis: false,
        type: undefined
    });

    layerOptions = $state<LayerOptions>({
        baseMap: 'none',
        protoMapsWaterInFront: false,
        protoMapsLabelsInFront: false,
        historicMapsOpacity: 100,
        overlay: 'none'
    });

    toastContent: string = $state("");

    constructor() {
        $effect(() => {
            this.filter.yearStart;
            this.filter.yearEnd;
            this.filter.edition;
            this.filter.bis;
            this.filter.type;
            this.layerOptions.baseMap;
            this.layerOptions.protoMapsWaterInFront;
            this.layerOptions.protoMapsLabelsInFront;
            this.layerOptions.historicMapsOpacity;
            this.historic.selectedHistoricMap;
            this.historic.pinnedHistoricMap;

            this.syncStateToURL();
        });
    }

    get activeMap(): maplibregl.Map {
        if (!this.map) {
            throw new Error('MapContext: Poging om kaartactie uit te voeren voordat MapLibre is geladen.');
        }
        return this.map;
    }

    resetState() {
        if (!this.maplibreLoaded || !this.historic.historicMapsLoaded) return;
        this.restoreView();

        this.activeMap.easeTo({
            center: [defaultState.lng, defaultState.lat],
            zoom: defaultState.zoom,
            pitch: 0,
            bearing: 0
        });

        this.layerOptions.historicMapsOpacity = defaultState.historicMapsOpacity;
    }

    init(containerId: string) {
        const protocol = new pmtiles.Protocol();
        maplibregl.addProtocol('pmtiles', protocol.tile);

        const style = basemapStyle('nl');
        style.layers.forEach((layer) => {
            layer.layout = {
                ...layer.layout,
                visibility: 'none'
            };
        });

        this.map = new maplibregl.Map({
            container: containerId,
            style,
            center: [defaultState.lng, defaultState.lat],
            zoom: defaultState.zoom,
            minZoom: 5.5,
            maxZoom: 16,
            maxPitch: 0,
            minPitch: 0,
            maxBounds: [
                [-12, 47],
                [22, 57]
            ],
            bearing: 0,
            dragRotate: false,
            touchPitch: false,
            touchRotate: false,
            attributionControl: false,
            preserveDrawingBuffer: true
        });
        this.map.dragRotate.disable();
        this.map.keyboard.disable();
        this.map.touchZoomRotate.disableRotation();
        this.map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

        this.map.on('load', async () => {
            addBackgroundLayers(this.activeMap);
            addUserLocationCircle(this.activeMap);

            await this.historic.init();

            this.updateViewport();
            this.activeMap.on('move', () => this.updateViewport());
            this.activeMap.on('moveend', () => this.syncStateToURL());
            this.activeMap.on('mousemove', 'map-outlines-fill', e => this.handleMapMouseMove(e));
            this.activeMap.on('mouseleave', 'map-outlines-fill', e => this.handleMapMouseLeave(e));

            this.applyStateFromURL();

            this.maplibreLoaded = true;
        })
    }

    syncStateToURL() {
        if (!this.maplibreLoaded) return;

        const params = new URLSearchParams();
        const center = this.activeMap.getCenter();
        const zoom = this.activeMap.getZoom();

        const setIfChanged = (key: string, value: any, defaultValue: any) => {
            if (value !== defaultValue) params.set(key, String(value));
        };

        if (center.lat.toFixed(3) !== defaultState.lat.toFixed(3) || center.lng.toFixed(3) !== defaultState.lng.toFixed(3)) {
            params.set('c', `${center.lat.toFixed(3)}_${center.lng.toFixed(3)}`);
        }
        setIfChanged('zoom', zoom.toFixed(2), defaultState.zoom.toFixed(2));

        if (this.filter.yearStart !== defaultState.yearStart || Math.round(this.filter.yearEnd) !== defaultState.yearEnd) {
            params.set('period', `${this.filter.yearStart}_${Math.round(this.filter.yearEnd)}`);
        }
        setIfChanged('editie', this.filter.edition, defaultState.edition);
        setIfChanged('bis', this.filter.bis ? '1' : '0', defaultState.bis ? '1' : '0');
        if (this.filter.type) params.set('type', this.filter.type);

        if (this.historic.selectedHistoricMap) params.set('blad', this.historic.selectedHistoricMap.id);
        if (this.historic.pinnedHistoricMap) params.set('pinned', this.historic.pinnedHistoricMap.id);

        setIfChanged('achtergrondkaart', this.layerOptions.baseMap, defaultState.baseMap);
        setIfChanged('pwf', this.layerOptions.protoMapsWaterInFront ? '1' : '0', defaultState.protoMapsWaterInFront ? '1' : '0');
        setIfChanged('plf', this.layerOptions.protoMapsLabelsInFront ? '1' : '0', defaultState.protoMapsLabelsInFront ? '1' : '0');
        setIfChanged('opacity', this.layerOptions.historicMapsOpacity, defaultState.historicMapsOpacity);

        goto(`?${params.toString()}`, {
            replaceState: true,
            noScroll: true,
            keepFocus: true
        });
    }

    applyStateFromURL() {
        const q = new URLSearchParams(window.location.search);
        if (window.location.hash.startsWith('#/')) return;

        let lat = defaultState.lat;
        let lng = defaultState.lng;
        const centerParam = q.get('c');
        if (centerParam) {
            const [latStr, lngStr] = centerParam.split('_');
            if (latStr && lngStr) {
                lat = parseFloat(latStr) || defaultState.lat;
                lng = parseFloat(lngStr) || defaultState.lng;
            }
        }
        const zoom = parseFloat(q.get('zoom') ?? '') || defaultState.zoom;
        this.activeMap.jumpTo({ center: [lng, lat], zoom });

        const yearParam = q.get('period');
        if (yearParam) {
            const [ys, ye] = yearParam.split('_');
            this.filter.yearStart = parseInt(ys) || defaultState.yearStart;
            this.filter.yearEnd = parseInt(ye) || defaultState.yearEnd;
        }

        const ed = q.get('editie');
        this.filter.edition = ed === 'All' || ed === null ? 'All' : (Number(ed) as any);
        this.filter.bis = q.get('bis') === '1';
        this.filter.type = (q.get('type') as any) || defaultState.type;

        this.layerOptions.baseMap = (q.get('achtergrondkaart') as any) || defaultState.baseMap;
        this.layerOptions.protoMapsWaterInFront = q.get('pwf') === '1';
        this.layerOptions.protoMapsLabelsInFront = q.get('plf') === '1';
        this.layerOptions.historicMapsOpacity = parseInt(q.get('opacity') ?? '') || defaultState.historicMapsOpacity;

        const bladId = q.get('blad');
        const pinnedId = q.get('pinned');

        if (!this.historic.historicMapsLoaded && bladId) {
            this.historic.onload = () => {
                this.historic.selectedHistoricMap = this.historic.historicMapsById.get(bladId) || null;
                console.log("aha")
            }
            return;
        }

        // TODO: watch for when maps are loaded!!
        if (bladId) setTimeout(() => this.historic.selectedHistoricMap = this.historic.historicMapsById.get(bladId) || null, 500);
        if (pinnedId) setTimeout(() => this.historic.pinnedHistoricMap = this.historic.historicMapsById.get(pinnedId) || null, 500);
    }

    zoomIn() {
        if (!this.activeMap) return;
        this.activeMap.zoomIn({ duration: 250 });
    }

    zoomOut() {
        if (!this.activeMap) return;
        this.activeMap.zoomOut({ duration: 250 });
    }

    flyToFeature(feature) {
        const { geometry, bbox } = feature;
        if (bbox) {
            const [minLng, minLat, maxLng, maxLat] = bbox;
            this.activeMap.fitBounds(
                [
                    [minLng, minLat],
                    [maxLng, maxLat]
                ],
                { padding: 40, maxZoom: 12, duration: 250 }
            );
        } else if (geometry?.type === 'Point') {
            const [lng, lat] = geometry.coordinates;

            this.activeMap.flyTo({
                center: [lng, lat],
                zoom: 12,
                speed: 0.8,
                curve: 1.4,
                essential: true,
                duration: 250
            });
        }
    }

    setAHNVisibility(visible: boolean) {
        if (!this.maplibreLoaded) return;
        if (!this.activeMap.getLayer('dsm-05-layer')) return;
        this.activeMap.setLayoutProperty('dsm-05-layer', 'visibility', visible ? 'visible' : 'none');
    }

    setSatellietVisibility(visible: boolean) {
        if (!this.maplibreLoaded) return;
        if (!this.activeMap.getLayer('satelliet-layer')) return;
        this.activeMap.setLayoutProperty('satelliet-layer', 'visibility', visible ? 'visible' : 'none');
    }

    setProtomapsVisiblity(visible: boolean) {
        if (!this.maplibreLoaded) return;

        const layers = this.activeMap.getStyle().layers || [];
        layers.forEach((layer) => {
            // Todo: fix ts error
            if (layer.source === 'protomaps' || layer.type === 'background') {
                this.activeMap.setLayoutProperty(layer.id, 'visibility', visible ? 'visible' : 'none');
            }
        });
    }

    setProtomapsWaterInFront(visible: boolean) {
        if (!this.maplibreLoaded) return;

        const waterLayers = ['water', 'water_stream', 'water_river'];

        waterLayers.forEach((layerId) => {
            if (this.activeMap.getLayer(layerId)) {
                this.activeMap.moveLayer(layerId, visible ? 'map-outlines-labels' : 'landuse_pedestrian');
            }
        });
    }

    setProtoMapsLabelsInFront(visible: boolean) {
        if (!this.maplibreLoaded) return;

        const labelLayers = [
            'address_label',
            'waterway_label',
            'roads_oneway',
            'roads_labels_minor',
            'water_label_ocean',
            'earth_label_islands',
            'water_label_lakes',
            'roads_shields',
            'roads_labels_major',
            'places_subplace',
            'places_region',
            'places_locality',
            'places_country',
            'city_label'
        ];

        labelLayers.forEach((layerId) => {
            if (this.activeMap.getLayer(layerId)) {
                this.activeMap.moveLayer(
                    layerId,
                    visible ? 'map-outlines-labels' : 'map-outlines-skeleton'
                );
            }
        });
    }

    saveMapView(push = true) {
        const view = {
            center: this.activeMap.getCenter(),
            zoom: this.activeMap.getZoom(),
            bearing: this.activeMap.getBearing(),
            pitch: this.activeMap.getPitch()
        };
        if (push) this.savedMapViews.push(view);
        return view;
    }

    restoreView(view = this.savedMapViews.pop(), options = { duration: 500 }) {
        if (!this.activeMap || !view || !this.historic.warpedMapLayer) return;
        const { center, zoom, bearing, pitch } = view;
        this.activeMap.easeTo({ center, zoom, bearing, pitch, ...options });

        const optionsByMapId = new Map();
        optionsByMapId.set(this.historic.selectedHistoricMap?.id, {
            visible: false,
            transformationType: 'thinPlateSpline',
            applyMask: true
        });
        this.historic.warpedMapLayer.setMapsOptionsByMapId(optionsByMapId);

        if (this.savedLayerVisibility) {
            for (const layerId in this.savedLayerVisibility) {
                this.activeMap.setLayoutProperty(
                    layerId,
                    'visibility',
                    this.savedLayerVisibility[layerId]
                );
            }
            this.savedLayerVisibility = null;
        }

        this.activeMap.setLayoutProperty('map-outlines-skeleton', 'visibility', 'visible');
        this.setSheetIndexVisibility(false);

        if (this.historic.selectedHistoricMap) {
            this.historic.warpedMapLayer?.setMapOptions(this.historic.selectedHistoricMap?.id, {
                transformationType: 'thinPlateSpline',
                applyMask: true
            });
            this.historic.selectedHistoricMap = null;
        }

        this.applyFilter(this.filter);
    }

    applyFilter(filter: Filter) {
        if (!this.historic.historicMapsByNumber || this.historic.selectedHistoricMap) return;


        let maxYear = 0;
        filter.yearStart = Math.min(filter.yearEnd - 1, filter.yearStart);

        const mapsToColor: string[] = [];
        const mapsToDesaturate: string[] = [];

        this.historic.historicMapsByNumber.forEach((sheets) => {
            let x1, y1, x2, y2;
            const firstEdYearEnd = 1894;

            for (const sheet of sheets) {
                const { x, y, yearEnd: year, edition, bis, type, id } = sheet;
                maxYear = Math.max(maxYear, year);
                const maxYearFilter = filter.yearEnd > firstEdYearEnd ? filter.yearEnd : firstEdYearEnd;
                const periodFilter = filter.edition !== 'All' || year <= maxYearFilter;
                const editionFilter = filter.edition === 'All' || edition === filter.edition;
                const typeFilter = filter.type ? type === filter.type : !type;
                const bisFilter = filter.bis === true || !bis;
                const inScope = periodFilter && editionFilter && typeFilter && bisFilter;
                if (!inScope) continue;

                const stack =
                    year >= filter.yearStart && year <= filter.yearEnd ? mapsToColor : mapsToDesaturate;

                if (x1 === undefined) {
                    stack.push(id);
                    [x1, y1] = [x, y];

                    if (!x1 && !y1) break;
                } else if (y1 && x === x1 && y === -y1) {
                    stack.push(id);
                    y1 = 0;

                    if (!x1) break;
                } else if (x1 && !x2 && x === -x1) {
                    stack.push(id);
                    [x2, y2] = [x, y];

                    if (!y1 && !y) break;
                } else if (y2 && x === x2 && y === -y2) {
                    stack.push(id);
                    y2 = 0;

                    if (!y1) break;
                }
            }
        });

        filter.yearEnd = Math.min(maxYear, filter.yearEnd);

        const mapsToShow = mapsToColor.concat(mapsToDesaturate);
        const visibleHistoricMapIds = this.historic.visibleHistoricMaps.keys().toArray();

        const mapsToHide = visibleHistoricMapIds.filter((id) => !mapsToShow.includes(id));
        const mapsToAdd = mapsToShow.filter((id) => !visibleHistoricMapIds.includes(id));

        const mapOptionsByMapId = new Map();

        const defaultOptions = {
            applyMask: true,
            transformationType: 'thinPlateSpline',
            saturation: 1
        };

        mapsToColor.forEach((id) =>
            mapOptionsByMapId.set(id, {
                ...defaultOptions,
                visible: true
            })
        );
        mapsToHide.forEach((id) =>
            mapOptionsByMapId.set(id, {
                ...defaultOptions,
                visible: false
            })
        );
        mapsToDesaturate.forEach((id) =>
            mapOptionsByMapId.set(id, {
                ...defaultOptions,
                visible: true,
                saturation: 0
            })
        );

        this.historic.warpedMapLayer?.setMapsOptionsByMapId(mapOptionsByMapId);

        mapsToHide.forEach((id) => this.historic.visibleHistoricMaps.delete(id));
        mapsToAdd.forEach((id) => {
            const historicMap = this.historic.historicMapsById.get(id);
            if (historicMap) {
                this.historic.visibleHistoricMaps.set(id, historicMap);
            }
        });

        this.toastContent = `Je ziet nu kaarten van ${Math.round(filter.yearEnd)} en ouder`;
    }

    setLabelVisibility(visible = true) {
        if (!this.maplibreLoaded) return;

        this.activeMap.setPaintProperty('map-outlines-labels', 'text-opacity-transition', {
            duration: 300
        });
        this.activeMap.setPaintProperty('map-outlines-labels', 'text-opacity', visible ? 1 : 0);
    }

    updateViewport() {
        if (!this.activeMap) return;
        const bounds = this.activeMap.getBounds();
        this.viewportPolygon = {
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [
                    [
                        [bounds.getWest(), bounds.getNorth()],
                        [bounds.getEast(), bounds.getNorth()],
                        [bounds.getEast(), bounds.getSouth()],
                        [bounds.getWest(), bounds.getSouth()],
                        [bounds.getWest(), bounds.getNorth()]
                    ]
                ]
            },
            properties: {}
        };
    }

    handleMapMouseMove(e: any) {
        const feature = e.features?.[0];
        if (!feature) return;

        if (this.hoveredFeature && this.hoveredFeature !== feature) {
            this.activeMap.setFeatureState(
                { source: 'map-outlines', id: this.hoveredFeature?.id },
                { hover: false }
            );
        }
        this.hoveredFeature = feature;
        this.activeMap.setFeatureState(
            { source: 'map-outlines', id: this.hoveredFeature.id },
            { hover: true }
        );
    }

    handleMapMouseLeave() {
        if (!this.activeMap || !this.hoveredFeature) return;
        this.activeMap.setFeatureState(
            { source: 'map-outlines', id: this.hoveredFeature.id },
            { hover: false }
        );
        this.hoveredFeature = null;
    }

    setSheetIndexVisibility(visible = !this.sheetIndexVisible) {
        this.sheetIndexVisible = visible;
        this.setGridVisibility(visible, { lng: 5.63, lat: 52.16 }, 100, 150);
        if (visible && this.historic.selectedHistoricMap) {
            this.activeMap.setLayoutProperty(
                'map-outlines-numbers',
                'visibility',
                visible ? 'visible' : 'none'
            );
            this.activeMap.setLayoutProperty(
                'map-outlines-stroke',
                'visibility',
                visible ? 'visible' : 'none'
            );
            this.activeMap.setLayoutProperty(
                'map-outlines-fill',
                'visibility',
                visible ? 'visible' : 'none'
            );
        }
        this.activeMap.setPaintProperty('map-outlines-numbers', 'text-opacity', +visible);
        return visible;
    }

    setGridVisibility(
        isVisible: boolean,
        centerLngLat = { lng: 5.63, lat: 52.16 },
        rippleScale = 3,
        speed = 300
    ) {
        if (this.sheetIndexVisible && !isVisible) return;
        const source = this.activeMap.getSource('map-outlines');
        if (!source || !source._data) return;
        const allFeatures = source._data.features;

        setTimeout(() => (this.gridVisible = isVisible), 100);

        if (isVisible && this.gridResetTimer) {
            clearTimeout(this.gridResetTimer);
            this.gridResetTimer = null;
        }

        const hoverFillOpacity = isVisible ? 0.1 : 0;

        this.activeMap.setPaintProperty('map-outlines-fill', 'fill-opacity', [
            'max',
            ['coalesce', ['feature-state', 'animated-fill-opacity'], 0],
            ['case', ['boolean', ['feature-state', 'hover'], false], hoverFillOpacity, 0]
        ]);

        allFeatures.forEach((feature) => {
            const id = feature.id;
            if (id === undefined) return;

            if (this.featureTimeouts[id]) {
                clearTimeout(this.featureTimeouts[id]);
                delete this.featureTimeouts[id];
            }

            if (!isVisible) {
                animateFeatureOpacity(this.activeMap, id, 'animated-stroke-opacity', 0, 500);
                return;
            }

            const [x, y] = feature.geometry.coordinates[0][0];
            const dx = centerLngLat.lng - x;
            const dy = centerLngLat.lat - y;
            const distance = Math.sqrt(dx ** 2 + dy ** 2);

            const delay = distance * speed;
            const targetOpacity = Math.max(0, 0.5 - distance / rippleScale);

            this.featureTimeouts[id] = setTimeout(() => {
                animateFeatureOpacity(this.activeMap, id, 'animated-stroke-opacity', targetOpacity, 500);
                delete this.featureTimeouts[id];
            }, delay);
        });
    }

    async getFallbackIPLocation() {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        return { lat: data.latitude, lng: data.longitude };
    }

    async flyToUserLocation() {
        try {
            const loc = await getUserLocation().catch(async () => {
                return await this.getFallbackIPLocation();
            });

            const { lat, lng } = loc;

            if (!isInNL(lat, lng)) {
                alert('Je bent te ver buiten Nederland!');
                return;
            }

            if (this.activeMap) {
                const source = this.activeMap.getSource(
                    'user-location'
                ) as maplibregl.GeoJSONSource;
                if (source) {
                    source.setData({
                        type: 'FeatureCollection',
                        features: [
                            {
                                type: 'Feature',
                                geometry: {
                                    type: 'Point',
                                    coordinates: [lng, lat]
                                },
                                properties: {}
                            }
                        ]
                    });

                    this.activeMap.setPaintProperty('user-location', 'circle-opacity', 1);
                    this.activeMap.setPaintProperty('user-location', 'circle-stroke-opacity', 1);
                    this.activeMap.setPaintProperty('user-location', 'circle-radius', 10);
                }
            }

            this.userLocationActive = true;
            this.flyToFeature({
                geometry: {
                    type: 'Point',
                    coordinates: [lng, lat]
                },
                properties: {
                    label: 'Your location'
                }
            });

            if (this.userLocationTimeout) clearTimeout(this.userLocationTimeout);
            this.userLocationTimeout = setTimeout(() => {
                this.activeMap.setPaintProperty('user-location', 'circle-opacity', 0);
                this.activeMap.setPaintProperty('user-location', 'circle-stroke-opacity', 0);
                this.activeMap.setPaintProperty('user-location', 'circle-radius', 6);

                setTimeout(() => {
                    const source = this.activeMap.getSource('user-location');
                    if (source) {
                        source.setData({ type: 'FeatureCollection', features: [] });
                    }
                    this.userLocationActive = false;
                    this.userLocationTimeout = null;
                }, 400);
            }, 2500);
        } catch (err) {
            console.error(err);
            alert('Kon locatie niet bepalen.');
        }
    }
}
