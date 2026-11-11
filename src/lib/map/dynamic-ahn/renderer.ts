import { maxStops, rgb, type GradientStop } from "./gradient";
import type { CustomRenderMethodInput } from "maplibre-gl";
import { tailHeights, type Atlas, type HeightScale } from "./terrain";

type GL = WebGL2RenderingContext;
const vertex = `#version 300 es
precision highp float;
uniform mat4 matrix;
uniform vec4 bounds;
out vec2 uv;
void main() {
	uv = vec2(gl_VertexID & 1, gl_VertexID >> 1);
	gl_Position = matrix * vec4(bounds.xy + uv * bounds.zw, 0., 1.);
}`;
// Interpolate valid ground samples at coasts and gaps.
const fragment = `#version 300 es
precision highp float;
uniform highp sampler2D dem;
uniform vec3 scale;
uniform vec2 tails;
uniform int stopCount;
uniform vec4 stops[${maxStops}]; // RGB and editor position
uniform float opacity;
in vec2 uv;
out vec4 frag;
float heightAt(ivec2 p, ivec2 size) {
	return texelFetch(dem, clamp(p, ivec2(0), size-1), 0).r;
}
void main() {
	ivec2 size = textureSize(dem, 0);
	vec2 p = uv * vec2(size) - .5;
	ivec2 i = ivec2(floor(p));
	if (isnan(heightAt(ivec2(floor(p+.5)), size))) discard;
	vec2 f = fract(p);
	vec4 h = vec4(heightAt(i,size), heightAt(i+ivec2(1,0),size), heightAt(i+ivec2(0,1),size), heightAt(i+1,size));
	vec4 weights = vec4((1.-f.x)*(1.-f.y), f.x*(1.-f.y), (1.-f.x)*f.y, f.x*f.y) * vec4(not(isnan(h)));
	float v = dot(weights,mix(h,vec4(0.),isnan(h)))/max(.00001,dot(weights, vec4(1.)));
	float position;
	if (v == scale.y) position = 50.;
	else if (v < tails.x) position = 5. * (v - scale.x) / (tails.x - scale.x);
	else if (v < scale.y) position = 5. + 45. * (v - tails.x) / (scale.y - tails.x);
	else if (v < tails.y) position = 50. + 45. * (v - scale.y) / (tails.y - scale.y);
	else position = 95. + 5. * (v - tails.y) / (scale.z - tails.y);
	vec3 c = stops[0].rgb;
	for(int i=1; i<${maxStops}; i++) {
		if(i>=stopCount) break;
		vec4 left=stops[i-1], right=stops[i];
		c=mix(left.rgb,right.rgb,clamp((position-left.w)/(right.w-left.w),0.,1.));
		if(position<=right.w) break;
	}
	frag = vec4(c * opacity, opacity);
}`;

function compile(gl: GL, type: number, source: string) {
	const s = gl.createShader(type)!;
	gl.shaderSource(s, source);
	gl.compileShader(s);
	if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
		const log = gl.getShaderInfoLog(s);
		gl.deleteShader(s);
		throw new Error(String(log));
	}
	return s;
}

export class ReliefRenderer {
	private program: WebGLProgram;
	private texture: WebGLTexture;
	private units: Record<string, WebGLUniformLocation | null> = {};
	private uploadedAtlas?: Atlas;
	private uploadedStops?: readonly GradientStop[];

	constructor(private gl: GL) {
		const prog = gl.createProgram()!;
		const vs = compile(gl, gl.VERTEX_SHADER, vertex),
			fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
		gl.attachShader(prog, vs);
		gl.attachShader(prog, fs);
		gl.linkProgram(prog);
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
			const log = gl.getProgramInfoLog(prog);
			gl.deleteProgram(prog);
			throw new Error(String(log));
		}
		this.program = prog;

		for (const name of ["matrix", "bounds", "dem", "scale", "tails", "opacity", "stopCount", "stops[0]"])
			this.units[name] = gl.getUniformLocation(prog, name);
		this.texture = gl.createTexture()!;
		const previous = gl.getParameter(gl.TEXTURE_BINDING_2D);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		gl.bindTexture(gl.TEXTURE_2D, previous);
	}

	draw(frame: CustomRenderMethodInput, a: Atlas, scale: HeightScale, stops: readonly GradientStop[], opacity: number) {
		const gl = this.gl,
			u = this.units;
		gl.useProgram(this.program);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		if (this.uploadedAtlas !== a) {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, a.width, a.height, 0, gl.RED, gl.FLOAT, a.heights);
			this.uploadedAtlas = a;
		}
		gl.uniform1i(u.dem, 0);
		gl.uniformMatrix4fv(u.matrix, false, frame.defaultProjectionData.mainMatrix);
		gl.uniform4f(u.bounds, a.x, a.y, a.spanX, a.spanY);
		gl.uniform3f(u.scale, scale.low, scale.mean, scale.high);
		gl.uniform2f(u.tails, ...tailHeights(scale));
		if (this.uploadedStops !== stops) {
			const colors = stops.flatMap((stop) => [...rgb(stop.color).map((channel) => channel / 255), stop.position]);
			gl.uniform4fv(u["stops[0]"], colors);
			gl.uniform1i(u.stopCount, stops.length);
			this.uploadedStops = stops;
		}
		gl.uniform1f(u.opacity, opacity);
		gl.enable(gl.BLEND);
		// Multiply the premultiplied sheet RGB, keeping its original coverage.
		gl.blendFuncSeparate(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		// Fill the uncovered fraction with relief. This also makes AHN usable
		// by itself on a transparent MapLibre canvas (including a faded sheet).
		gl.blendFunc(gl.ONE_MINUS_DST_ALPHA, gl.ONE);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		// Return to MapLibre's premultiplied source-over convention.
		gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	}
	destroy() {
		this.gl.deleteTexture(this.texture);
		this.gl.deleteProgram(this.program);
	}
}
