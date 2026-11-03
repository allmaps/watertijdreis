import { fromArrayBuffer } from "geotiff";
import { bbox, size, type Tile } from "./terrain";

// Store validated Float32 ground heights, independent of the current style.
// Cache Storage is optional (private browsing, storage quotas, insecure origins).
const cacheName = "dynamic-ahn-dtm-05m-v1";
const lifetime = 7 * 24 * 60 * 60 * 1000;
let disk: Promise<Cache | undefined> | undefined;

export async function readTile(tile: Tile, signal: AbortSignal): Promise<Float32Array> {
	const bounds = bbox(tile);
	const query = new URLSearchParams({
		SERVICE: "WCS",
		VERSION: "1.0.0",
		REQUEST: "GetCoverage",
		COVERAGE: "dtm_05m",
		CRS: "EPSG:3857",
		RESPONSE_CRS: "EPSG:3857",
		BBOX: bounds.join(","),
		WIDTH: String(size),
		HEIGHT: String(size),
		FORMAT: "GEOTIFF",
	});
	const url = "https://service.pdok.nl/rws/ahn/wcs/v1_0?" + query;
	disk ??= globalThis.caches?.open(cacheName).catch(() => undefined);
	const cache = await disk;
	const hit = await cache?.match(url).catch(() => undefined);
	if (hit && Number(hit.headers.get("expires-at")) > Date.now()) {
		const bytes = await hit.arrayBuffer().catch(() => undefined);
		if (bytes?.byteLength === size * size * 4) return new Float32Array(bytes);
	}
	signal.throwIfAborted();
	const response = await fetch(url, { signal });
	const buffer = await response.arrayBuffer();
	let heights: Float32Array<ArrayBuffer>;
	if (/tiff|octet-stream/i.test(response.headers.get("content-type") ?? "") && response.ok) {
		const image = await (await fromArrayBuffer(buffer)).getImage();
		if (
			image.getGeoKeys().ProjectedCSTypeGeoKey !== 3857 ||
			image.getWidth() !== size ||
			image.getHeight() !== size ||
			image.getSamplesPerPixel() !== 1 ||
			image.getSampleFormat() !== 3 ||
			image.getBitsPerSample() !== 32 ||
			image.getBoundingBox().some((value, i) => Math.abs(value - bounds[i]) > (bounds[2] - bounds[0]) / size / 100)
		)
			throw new Error("Onverwachte projectie of rasterindeling van PDOK.");
		heights = (await image.readRasters({ samples: [0], interleave: true, signal })) as Float32Array<ArrayBuffer>;
		const noData = image.getGDALNoData();
		for (let i = 0; i < heights.length; i++) {
			if (!Number.isFinite(heights[i]) || heights[i] === noData || Math.abs(heights[i]) > 10000) heights[i] = NaN;
		}
	} else if (/Requested BBOX[^<]*is outside requested coverage BBOX/i.test(new TextDecoder().decode(buffer))) {
		heights = new Float32Array(size * size).fill(NaN);
	} else {
		throw new Error("AHN-hoogtes bij PDOK konden niet worden geladen (HTTP " + response.status + ").");
	}
	signal.throwIfAborted();
	if (cache) {
		try {
			await cache.put(url, new Response(heights.buffer, { headers: { "expires-at": String(Date.now() + lifetime) } }));
			const entries = await cache.keys();
			// In insertion order. At most 48 MiB of decoded heights on disk.
			await Promise.all(entries.slice(0, Math.max(0, entries.length - 192)).map((key) => cache.delete(key)));
		} catch {
			/* A failed disk write does not invalidate the measured heights. */
		}
	}
	return heights;
}
