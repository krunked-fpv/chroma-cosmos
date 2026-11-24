/** Layer 1 stamp pass: ping-pong into the 1920x1080 stroke RT, masked by the NEAREST region id. */
import { GLSL_HEADER, f } from './glsl-util';
import { MAX_STAMPS_PER_BATCH, PAGE_H, PAGE_W, STROKE_SCALE } from '../contracts/constants';

export function buildStampFrag(): string {
  return `${GLSL_HEADER}
uniform sampler2D uPrev;
uniform sampler2D uRegionTex;
uniform sampler2D uAllowedTex;
uniform int uCount;
uniform vec4 uStampA[${MAX_STAMPS_PER_BATCH}]; // x, y (internal px), radius, strength
uniform vec4 uStampB[${MAX_STAMPS_PER_BATCH}]; // materialId/255, flow dx, flow dy, unused
out vec4 fragColor;

void main() {
  ivec2 fc = ivec2(gl_FragCoord.xy);
  vec4 prev = texelFetch(uPrev, fc, 0);
  vec2 ip = vec2(gl_FragCoord.x, ${f(PAGE_H * STROKE_SCALE)} - gl_FragCoord.y) / ${f(STROKE_SCALE)};
  ivec2 pi = clamp(ivec2(floor(ip)), ivec2(0), ivec2(${PAGE_W - 1}, ${PAGE_H - 1}));
  int id = int(floor(texelFetch(uRegionTex, pi, 0).r * 255.0 + 0.5));
  float allowed = texelFetch(uAllowedTex, ivec2(id, 0), 0).r;
  float best = 0.0;
  int bi = -1;
  if (allowed > 0.5) {
    for (int i = 0; i < ${MAX_STAMPS_PER_BATCH}; i++) {
      if (i >= uCount) break;
      vec4 a = uStampA[i];
      float d = distance(ip, a.xy) / max(a.z, 0.0001);
      float c = a.w * (1.0 - smoothstep(0.62, 1.0, d));
      if (c > best) { best = c; bi = i; }
    }
  }
  vec4 o = prev;
  o.r = max(prev.r, best);
  if (bi >= 0 && (best > prev.r || best > 0.5)) {
    vec4 b = uStampB[bi];
    o.g = b.x;
    o.b = clamp(b.y, -1.0, 1.0) * 0.5 + 0.5;
    o.a = clamp(b.z, -1.0, 1.0) * 0.5 + 0.5;
  }
  fragColor = o;
}
`;
}
