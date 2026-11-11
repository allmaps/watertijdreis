import { maxStops, premultipliedColor, type GradientStop } from "./gradient";
import { drawBlendedQuad } from "./blending";
import type { BlendMode } from "./options";
import type { CustomRenderMethodInput } from "maplibre-gl";
import { tailHeights, type Atlas, type HeightScale } from "./terrain";
import { maxScaleKnots } from "./scale";

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
uniform highp sampler2D curve;
uniform int knotCount;
uniform vec3 scale;
uniform vec2 tails;
uniform int stopCount;
uniform vec4 colors[${maxStops}]; // Premultiplied RGBA
uniform float positions[${maxStops}];
uniform float opacity;
in vec2 uv;
out vec4 frag;
float heightAt(ivec2 p, ivec2 size) {
	return texelFetch(dem, clamp(p, ivec2(0), size-1), 0).r;
}
vec2 knot(int i) { return texelFetch(curve, ivec2(i,0),0).rg; }
float distributionPosition(float v) {
	if(v < scale.x) return 0.;
	if(v > scale.z) return 100.;
	int lo=0, hi=knotCount;
	// Lower bound, then upper bound when samples share an exact height.
	for(int j=0;j<${Math.ceil(Math.log2(maxScaleKnots + 1))};j++) {
		if(lo>=hi) break;
		int m=(lo+hi)/2;
		if(knot(m).x<v) lo=m+1; else hi=m;
	}
	int first=min(lo,knotCount-1);
	vec2 b=knot(first);
	if(b.x==v) {
		hi=knotCount;
		for(int j=0;j<${Math.ceil(Math.log2(maxScaleKnots + 1))};j++) {
			if(lo>=hi) break;
			int m=(lo+hi)/2;
			if(knot(m).x<=v) lo=m+1; else hi=m;
		}
		return (b.y+knot(lo-1).y)*.5;
	}
	vec2 a=knot(max(0,first-1));
	return mix(a.y,b.y,clamp((v-a.x)/max(b.x-a.x,1e-20),0.,1.));
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
	else if(knotCount>0) position = distributionPosition(v);
	else if (v < tails.x) position = 5. * (v - scale.x) / (tails.x - scale.x);
	else if (v < scale.y) position = 5. + 45. * (v - tails.x) / (scale.y - tails.x);
	else if (v < tails.y) position = 50. + 45. * (v - scale.y) / (tails.y - scale.y);
	else position = 95. + 5. * (v - tails.y) / (scale.z - tails.y);
	vec4 c = colors[0];
	for(int i=1; i<${maxStops}; i++) {
		if(i>=stopCount) break;
		float left=positions[i-1], right=positions[i];
		c=mix(colors[i-1],colors[i],clamp((position-left)/(right-left),0.,1.));
		if(position<=right) break;
	}
	frag = c * opacity;
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
	private curve: WebGLTexture;
	private units: Record<string, WebGLUniformLocation | null> = {};
	private uploadedAtlas?: Atlas;
	private uploadedStops?: readonly GradientStop[];
	private uploadedScale?: HeightScale;

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

		for (const name of [
			"matrix",
			"bounds",
			"dem",
			"curve",
			"knotCount",
			"scale",
			"tails",
			"opacity",
			"stopCount",
			"colors[0]",
			"positions[0]",
		])
			this.units[name] = gl.getUniformLocation(prog, name);
		this.texture = gl.createTexture()!;
		const previous = gl.getParameter(gl.TEXTURE_BINDING_2D);
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		this.curve = gl.createTexture()!;
		gl.bindTexture(gl.TEXTURE_2D, this.curve);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		// A complete texture is required even when the shader takes the linear path.
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, 1, 1, 0, gl.RG, gl.FLOAT, new Float32Array(2));

		gl.bindTexture(gl.TEXTURE_2D, previous);
	}

	draw(
		frame: CustomRenderMethodInput,
		a: Atlas,
		scale: HeightScale,
		stops: readonly GradientStop[],
		opacity: number,
		blendMode: BlendMode
	) {
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
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.curve);
		if (scale.knots && this.uploadedScale !== scale)
			gl.texImage2D(
				gl.TEXTURE_2D,
				0,
				gl.RG32F,
				scale.knots.length,
				1,
				0,
				gl.RG,
				gl.FLOAT,
				new Float32Array(scale.knots.flat())
			);
		this.uploadedScale = scale;
		gl.uniform1i(u.curve, 1);
		gl.uniform1i(u.knotCount, scale.knots?.length ?? 0);
		gl.activeTexture(gl.TEXTURE0);
		gl.uniformMatrix4fv(u.matrix, false, frame.defaultProjectionData.mainMatrix);
		gl.uniform4f(u.bounds, a.x, a.y, a.spanX, a.spanY);
		gl.uniform3f(u.scale, scale.low, scale.center, scale.high);
		gl.uniform2f(u.tails, ...tailHeights(scale));
		if (this.uploadedStops !== stops) {
			gl.uniform4fv(u["colors[0]"], stops.flatMap(premultipliedColor));
			gl.uniform1fv(
				u["positions[0]"],
				stops.map((stop) => stop.position)
			);
			gl.uniform1i(u.stopCount, stops.length);
			this.uploadedStops = stops;
		}
		gl.uniform1f(u.opacity, opacity);
		drawBlendedQuad(gl, blendMode);
	}
	destroy() {
		this.gl.deleteTexture(this.texture);
		this.gl.deleteTexture(this.curve);
		this.gl.deleteProgram(this.program);
	}
}
