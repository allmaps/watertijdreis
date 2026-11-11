# Dynamic AHN layer

A flat Mercator, WebGL 2 custom layer for MapLibre GL JS. It reads PDOK's national `dtm_05m` coverage as georeferenced Float32 GeoTIFFs in a module worker. The layer depends on `geotiff` and uses relative imports. With Vite, set `worker.format` to `"es"`.

```ts
import { DynamicAhnLayer } from "./dynamic-ahn/DynamicAhnLayer";
import { defaultStops } from "./dynamic-ahn/gradient";

const ahn = new DynamicAhnLayer({
	onScale: (scale) => updateLegend(scale),
	onStatistics: (stats) => updateHistogram(stats),
	onError: showError,
});
map.addLayer(ahn, "map-outlines-labels"); // above Allmaps
ahn.setStyle(defaultStops, 0.75);
ahn.setOptions({ blendMode: "screen" }); // repaint without reprocessing or fetching heights
ahn.setOptions({ fillGaps: false }); // show measured terrain only
map.removeLayer(ahn.id); // stops the worker and releases GPU resources
```

The constructor and `setOptions(patch)` accept the same options. A patch keeps unspecified settings and can be applied before or after adding the layer. Changing a terrain setting reuses resident tiles; changing only the blend mode repaints immediately without worker processing or texture uploads.

```ts
ahn.setOptions({ mappingMode: "linear" }); // equal metres get equal palette space
ahn.setOptions({ mappingMode: "mean" }); // half the palette on each side of the average
ahn.setOptions({ mappingMode: "equalized" }); // default: adaptive contrast, percentile-based coloring

ahn.lockScale(); // freeze the currently displayed heights, including during an animation
const snapshot = ahn.getScale(); // { low, center, high, tails?, knots? }, or null
ahn.isScaleLocked(); // true
ahn.unlockScale(); // resume automatic scaling for the current view

ahn.setScale({ low: -5, center: 0, high: 20 }); // apply immediately and lock
// Optional heights at 5% and 95% reproduce a trimmed scale exactly:
ahn.setScale({ low: -20, center: 0, high: 100, tails: [-5, 20] });
ahn.setRange(-10, 80); // stretch the displayed mapping to these endpoints and lock
ahn.unlockScale(); // return to the selected automatic mapping and outlier settings
```

The three mappings share the same measured viewport samples. Linear places the center halfway between the bounds and does not compress tails. Mean uses the arithmetic average as its center and retains the existing trim option. Equalized uses an inverse empirical CDF sampled at 131 palette positions (including the median and legacy tail positions), giving common height ranges more color space. Its center is the median, and it does not apply extra tail compression. `scaleMode: "percentile"` optionally clips the endpoint range in all three modes; in equalized mode the remaining percentile interval is stretched over the palette. In clipped mean mode, the average is calculated from samples inside the retained range so excluded outliers cannot pull the center outside it. NoData and gap-filled estimates do not enter the distribution.

Equalized snapshots include `knots`, ordered `[height, palettePosition]` pairs. Positions increase strictly from 0 to 100; heights may repeat for flat terrain. Tied heights share one color, and the median maps to 50. Degenerate ranges are padded by at least 5 cm on either side of the center. CPU legend conversion and the GPU use the same curve. A small RG32F lookup texture holds the curve; switching mappings reuses the DEM and resident tiles. Interpolation blends corresponding percentile heights, preserving ordering and the neutral center, including across mapping modes.

`setRange(low, high)` keeps the displayed mapping's relative shape, including its center, tails and percentile anchors, and stretches it to the new endpoints. It freezes that mapping just like `setScale`; before the first scale arrives it uses a linear midpoint. Invalid or numerically degenerate ranges throw without changing state. The helper `recenterScale(scale, center)` returns a transformed snapshot for use with `setScale`: it keeps the endpoints and stretches each half of the mapping, including its percentile curve.

`getHeight(lng, lat)` returns a height in metres NAP from the current cached surface, or null outside the loaded atlas and in NoData. It uses the shader's nearest-pixel validity mask and bilinear interpolation over valid neighbors, including gap-filled heights when enabled. It makes no network request and is independent of colors, scale locking and blending.

`getStatistics()` and `onStatistics(stats)` expose the live viewport distribution independently of scale locking. `HeightStatistics` includes measured `min`/`max`, valid sample `count`, attempted sample `total`, 48 equal-width metre bins in `histogram`, their `[low, high]` bounds in `range`, and the selected percentile cutoffs in `outliers`. It uses the same at-most-100×100 measured viewport samples as the scale, before outlier clipping; filled gaps and NoData are excluded. A flat histogram spans ±5 cm. Snapshots are detached, and no measurements or removal reports null. These updates reuse worker sampling and cached tiles, with no extra requests or DEM uploads.

`setStyle(stops, opacity)` controls colors and their palette positions. `setScale(scale)` controls their metre values: low, center and high anchor 0%, 50% and 100%. Without `tails`, interpolation is linear on each side of the center; with tails, 5% and 95% are anchored too. Heights must be finite and strictly ordered (`low < center < high`, or `low < tails[0] < center < tails[1] < high`). Invalid values throw before changing the scale. The public `HeightScale` type is exported from `DynamicAhnLayer`; its neutral anchor is now named `center` (previously `mean`), because it can also be a midpoint or a manual value.

Each `GradientStop` is `{ id, position, color, alpha? }`: positions run from 0 to 100, colors are six-digit `#rrggbb`, and optional alpha runs from 0 (transparent) to 1 (opaque, the default). `setStyle` accepts 2–9 strictly ordered stops including both endpoints and rejects invalid stops before changing the style. Colors interpolate in premultiplied sRGB; stop alpha is multiplied by layer opacity. A transparent stop leaves the backdrop unchanged in every blend mode. RGB at zero alpha does not tint neighbouring colors. The default is cyan–transparent–magenta, adaptive contrast, multiply blending and 75% opacity.

```ts
import { palettes } from "./dynamic-ahn/palettes";
import { reverseGradient } from "./dynamic-ahn/gradient";

const overlay = palettes.find((palette) => palette.id === "cyan-magenta")!;
ahn.setStyle(overlay.stops, 0.75); // cyan → transparent → magenta
ahn.setStyle(reverseGradient(overlay.stops), 0.75);
```

Ten presets include transparent overlays, low/high-only overlays, Terrain, Atlas, Lagoon, Viridis and Magma. The four-color cool–warm palette with a transparent center follows blue–transparent–orange. Transparent-center variants of Terrain and Viridis are omitted. The opaque cyan–white–magenta preset has been removed. Terrain/Atlas/Lagoon follow Relief; Viridis/Magma use samples of the [public-domain BIDS colormaps](https://github.com/BIDS/colormap), as distributed by D3. These are editable piecewise-linear approximations. Presets and reversing change only style: they do not unlock or rescale heights, fetch tiles, or upload the DEM again. Replace the stops array when editing. The preview and renderer use the same premultiplied interpolation, including at compressed tail boundaries.

Locking preserves all anchors, including trimmed tails and the full distribution curve, without changing colors or opacity. Tiles keep loading, gap filling and caching normally. Automatic scales are still calculated in the worker so unlocking can resume from the latest result, using the normal 650 ms transition (or immediately with reduced motion). Changing mapping or outlier options while locked takes effect on unlock. Locking before data arrives captures the first valid scale; `getScale()` returns null until then. A manual scale can be set before adding the layer. Locked and manual scales survive NoData views and removal/re-adding; an unlocked scale with no visible measurements reports null. `getScale()` and `onScale` return detached snapshots, including nested curve arrays; changing them cannot change the layer. `onScale` reports displayed values during transitions and null when the layer is removed.

| Option              | Default       | Effect                                                                                                                                                                                                                                    |
| ------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blendMode`         | `"multiply"`  | `"normal"` (source-over), `"multiply"` (darken), `"screen"` (lighten), or `"plus-lighter"` (add colors and alpha, clamped to 1).                                                                                                          |
| `mappingMode`       | `"equalized"` | `"linear"` for equal height intervals, `"mean"` for a centered scale, or `"equalized"` for adaptive contrast.                                                                                                                             |
| `scaleMode`         | `"extent"`    | Use `"trim"` in mean mapping to compress long tails into the outer 5% on each side. Use `"percentile"` to clip at the selected percentiles in any mapping, or `"extent"` for full bounds. Linear/equalized treat `"trim"` as full bounds. |
| `outlierPercentile` | `2`           | Percentage of samples in each tail: `0.5`, `1`, `2`, `5`, or `10`. Ignored in extent mode.                                                                                                                                                |
| `fillGaps`          | `true`        | Interpolate enclosed holes in the DTM from surrounding measured heights.                                                                                                                                                                  |
| `maxGapMeters`      | `500`         | Maximum width **and** height of an eligible hole, in ground metres (integer from 1 to 1000).                                                                                                                                              |

Only measured heights sampled in the viewport determine the automatic color scale. The transparent center (50) follows their median by default; each side spans at least 5 cm. As the camera moves, the renderer interpolates the scale over 650 ms and honors reduced motion. White preserves opaque map ink under multiply.

Blending applies to the combined map beneath the layer. Labels drawn above it remain unaffected, and NoData pixels leave the backdrop unchanged. All four modes handle transparent backgrounds and faded sheets. Multiply uses two draws; the other modes use one, with no framebuffer copying. On an opaque map, white is neutral for multiply and black is neutral for screen and plus-lighter. Changing the mode keeps the chosen gradient intact.

Gap filling can cross tile boundaries when adjacent tiles at the same resolution are cached. Open water connected to the coverage edge, gaps extending into unloaded tiles, and gaps over the limit stay transparent. A small enclosed pond can be filled: the color estimates the surrounding terrain, not the pond bed. Estimates are cached in memory separately from measurements and are reconsidered when neighbouring tiles or the distance limit change.

The worker samples cached tiles during a pan, then fetches missing tiles when the camera settles (up to four requests concurrently). While detail is loading it uses cached parent heights and publishes arriving tiles in batches up to 100 ms apart. Cached finer heights take precedence when zooming out, including their NoData mask.

The memory cache targets 80 measured tiles (20 MiB). It protects requested tiles and prefers to keep visible tiles without a cached parent, up to 96 measured tiles (24 MiB), plus any derived surfaces. The optional disk cache stores up to 192 validated, unmodified height tiles for seven days. A failed request can retry on the next settled view or when the layer is re-enabled.
