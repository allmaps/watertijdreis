import type { BlendMode } from "./options";

// The shader supplies premultiplied RGBA. Blend with the existing map image;
// only multiply needs two passes to also cover a transparent backdrop.
export function drawBlendedQuad(gl: WebGL2RenderingContext, mode: BlendMode) {
	gl.enable(gl.BLEND);
	gl.blendEquation(gl.FUNC_ADD);
	switch (mode) {
		case "normal":
			gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			break;
		case "multiply":
			gl.blendFuncSeparate(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
			break;
		case "screen":
			// Cs + Cb - Cs * Cb, with source-over alpha.
			gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_COLOR, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			break;
		case "plus-lighter":
			// Add premultiplied colors and alpha; the framebuffer clamps to [0, 1].
			gl.blendFunc(gl.ONE, gl.ONE);
			break;
	}
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	if (mode === "multiply") {
		// The first pass preserves destination alpha, so this fills only its
		// uncovered fraction (including outside a faded historic sheet).
		gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	}
	// Return to MapLibre's premultiplied source-over convention.
	gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
}
