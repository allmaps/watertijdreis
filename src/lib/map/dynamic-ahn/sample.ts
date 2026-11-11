import { mercator, type Atlas } from "./terrain";

/** Sample the displayed, cached DTM with the same interpolation and NoData mask as the shader. */
export function sampleHeight(atlas: Atlas | null | undefined, lng: number, lat: number): number | null {
	if (!atlas || !Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lat) >= 90) return null;
	const [mx, my] = mercator(lng, lat);
	const u = (mx - atlas.x) / atlas.spanX,
		v = (my - atlas.y) / atlas.spanY;
	if (u < 0 || v < 0 || u > 1 || v > 1) return null;
	const at = (x: number, y: number) =>
		atlas.heights[Math.max(0, Math.min(atlas.height - 1, y)) * atlas.width + Math.max(0, Math.min(atlas.width - 1, x))];
	const x = u * atlas.width - 0.5,
		y = v * atlas.height - 0.5;
	if (!Number.isFinite(at(Math.floor(x + 0.5), Math.floor(y + 0.5)))) return null;
	const left = Math.floor(x),
		top = Math.floor(y),
		fx = x - left,
		fy = y - top;
	let value = 0,
		weight = 0;
	for (let dy = 0; dy < 2; dy++)
		for (let dx = 0; dx < 2; dx++) {
			const h = at(left + dx, top + dy);
			const w = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy);
			if (Number.isFinite(h)) {
				value += w * h;
				weight += w;
			}
		}
	return weight ? value / weight : null;
}
