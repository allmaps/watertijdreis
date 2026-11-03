# Dynamic AHN layer

A flat Mercator, WebGL 2 custom layer for MapLibre GL JS 5. It reads PDOK's national `dtm_05m` coverage as georeferenced Float32 GeoTIFFs in a module worker. The layer depends on `geotiff` and uses relative imports. With Vite, set `worker.format` to `"es"`.

```ts
import { DynamicAhnLayer } from "./dynamic-ahn/DynamicAhnLayer";
import { defaultStops } from "./dynamic-ahn/gradient";

const ahn = new DynamicAhnLayer({ onScale: (scale) => updateLegend(scale), onError: showError });
map.addLayer(ahn, "map-outlines-labels"); // above Allmaps
ahn.setStyle(defaultStops, 0.6);
ahn.setOptions({ fillGaps: false }); // show measured terrain only
map.removeLayer(ahn.id); // stops the worker and releases GPU resources
```

The constructor and `setOptions(patch)` accept the same terrain options. A patch keeps unspecified settings and can be applied before or after adding the layer. Changing a setting reuses resident tiles.

| Option              | Default  | Effect                                                                                                                                                                                                 |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scaleMode`         | `"trim"` | Compress long tails into the outer 5% of the palette on each side, keeping visible extrema. Use `"percentile"` to clip at the selected percentiles, or `"extent"` for the full range without trimming. |
| `outlierPercentile` | `2`      | Percentage of samples in each tail: `0.5`, `1`, `2`, `5`, or `10`. Ignored in extent mode.                                                                                                             |
| `fillGaps`          | `true`   | Interpolate enclosed holes in the DTM from surrounding measured heights.                                                                                                                               |
| `maxGapMeters`      | `500`    | Maximum width **and** height of an eligible hole, in ground metres (integer from 1 to 1000).                                                                                                           |

Only measured heights sampled in the viewport determine the color scale. The neutral stop (50) follows their arithmetic mean; each side spans at least 5 cm. As the camera moves, the renderer interpolates the scale over 650 ms and honors reduced motion. White preserves opaque map ink under multiply.

Gap filling can cross tile boundaries when adjacent tiles at the same resolution are cached. Open water connected to the coverage edge, gaps extending into unloaded tiles, and gaps over the limit stay transparent. A small enclosed pond can be filled: the color estimates the surrounding terrain, not the pond bed. Estimates are cached in memory separately from measurements and are reconsidered when neighbouring tiles or the distance limit change.

The worker samples cached tiles during a pan, then fetches missing tiles when the camera settles (up to four requests concurrently). While detail is loading it uses cached parent heights and publishes arriving tiles in batches up to 100 ms apart. Cached finer heights take precedence when zooming out, including their NoData mask.

The memory cache targets 80 measured tiles (20 MiB). It protects requested tiles and prefers to keep visible tiles without a cached parent, up to 96 measured tiles (24 MiB), plus any derived surfaces. The optional disk cache stores up to 192 validated, unmodified height tiles for seven days. A failed request can retry on the next settled view or when the layer is re-enabled.
