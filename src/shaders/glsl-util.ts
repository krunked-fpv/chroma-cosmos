/** Small helpers for generating GLSL ES 3.00 source text from contract data. Pure, no GL. */

/** '#rrggbb' -> [r,g,b] in 0..1 */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** GLSL float literal (always contains a decimal point). */
export function f(n: number): string {
  const s = Number(n.toFixed(5)).toString();
  return s.includes('.') || s.includes('e') ? s : `${s}.0`;
}

/** '#rrggbb' -> `vec3(r,g,b)` */
export function vec3Hex(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return `vec3(${f(r)},${f(g)},${f(b)})`;
}

export const GLSL_HEADER = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
`;

/** Full-screen clip-space quad vertex shader shared by every renderer pass. */
export const QUAD_VERT = `${GLSL_HEADER}
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;
