/** GPU helpers: data textures, programs, validation. Only file (with index.ts / turn.ts) that touches pixi.js. */
import { BufferImageSource, GlProgram, MeshGeometry, Shader, UniformGroup } from 'pixi.js';
import type { WebGLRenderer } from 'pixi.js';
import { QUAD_VERT } from '../shaders';

/** RGBA8 data texture backed by a CPU Uint8Array (NEAREST, no premultiply). `update()` re-uploads. */
export class DataTexture {
  readonly data: Uint8Array;
  readonly source: BufferImageSource;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    this.data = new Uint8Array(width * height * 4);
    this.source = new BufferImageSource({
      resource: this.data,
      width,
      height,
      format: 'rgba8unorm',
      scaleMode: 'nearest',
      alphaMode: 'no-premultiply-alpha',
      autoGenerateMipmaps: false,
    });
  }

  update(): void {
    this.source.update();
  }

  destroy(): void {
    this.source.destroy();
  }
}

export function createQuadGeometry(): MeshGeometry {
  return new MeshGeometry({
    positions: new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]),
    uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
  });
}

export type UniformDef = ConstructorParameters<typeof UniformGroup>[0];

export function createShader(
  fragment: string,
  name: string,
  uniforms: UniformDef,
  uniformGroupName: string,
  textures: Record<string, BufferImageSource | object>,
): Shader {
  const glProgram = new GlProgram({ vertex: QUAD_VERT, fragment, name });
  const group = new UniformGroup(uniforms);
  const resources: Record<string, unknown> = { ...textures, [uniformGroupName]: group };
  return new Shader({ glProgram, resources });
}

/** Compiles + links a program on the raw context; returns an error string or null. Never throws. */
export function validateProgram(gl: WebGL2RenderingContext, name: string, fragment: string): string | null {
  const compile = (type: number, src: string): { shader: WebGLShader | null; log: string } => {
    const sh = gl.createShader(type);
    if (!sh) return { shader: null, log: 'createShader failed' };
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh) ?? 'unknown compile error';
      gl.deleteShader(sh);
      return { shader: null, log };
    }
    return { shader: sh, log: '' };
  };
  const v = compile(gl.VERTEX_SHADER, QUAD_VERT);
  if (!v.shader) return `${name} vertex: ${v.log}`;
  const fr = compile(gl.FRAGMENT_SHADER, fragment);
  if (!fr.shader) {
    gl.deleteShader(v.shader);
    return `${name} fragment: ${fr.log}`;
  }
  const prog = gl.createProgram();
  if (!prog) return `${name}: createProgram failed`;
  gl.attachShader(prog, v.shader);
  gl.attachShader(prog, fr.shader);
  gl.linkProgram(prog);
  const ok = gl.getProgramParameter(prog, gl.LINK_STATUS) as boolean;
  const log = gl.getProgramInfoLog(prog) ?? '';
  gl.deleteProgram(prog);
  gl.deleteShader(v.shader);
  gl.deleteShader(fr.shader);
  return ok ? null : `${name} link: ${log}`;
}

export function glOf(renderer: WebGLRenderer): WebGL2RenderingContext {
  return renderer.gl as WebGL2RenderingContext;
}
