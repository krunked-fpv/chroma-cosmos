/**
 * Page-turn curl: a cylinder fold sweeping across a snapshot. The snapshot is the front side; the cylinder's
 * far side shows shaded cream paper. Below the sheet the cream underlay is revealed.
 * uFold is the fold line in output pixels (x grows to the right), uR the cylinder radius.
 */
import { GLSL_HEADER, vec3Hex } from './glsl-util';
import { PAPER_HEX } from '../contracts/constants';

export function buildCurlFrag(): string {
  return `${GLSL_HEADER}
uniform sampler2D uSnap;
uniform vec2 uRes;
uniform float uFold;
uniform float uR;
uniform float uSnapFlip; // 1: snapshot rows are stored top-down (rendered with uFlipY)
out vec4 fragColor;

const vec3 PAPER = ${vec3Hex(PAPER_HEX)};
const float PI = 3.14159265;

vec3 snap(float x, float y) {
  ivec2 q = ivec2(int(clamp(floor(x), 0.0, uRes.x - 1.0)), int(clamp(floor(y), 0.0, uRes.y - 1.0)));
  if (uSnapFlip < 0.5) q.y = int(uRes.y) - 1 - q.y;
  return texelFetch(uSnap, q, 0).rgb;
}

float tooth(vec2 p) {
  return fract(sin(dot(floor(p / 2.0), vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 sp = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  float x = sp.x;
  vec3 under = PAPER * (0.96 + 0.04 * tooth(sp));
  float dx = x - uFold;
  // shadow of the rolled sheet cast on the paper below
  float sh = (dx > 0.0) ? exp(-max(dx - uR, 0.0) / (uR * 0.9)) : 0.0;
  under *= 1.0 - 0.3 * sh;
  vec3 col = under;
  if (dx < 0.0) {
    col = snap(x, sp.y);
    col *= 1.0 - 0.22 * exp(dx / (uR * 0.6)); // fold crease darkening
  } else if (dx <= uR) {
    float phi1 = asin(clamp(dx / uR, 0.0, 1.0));
    float phi2 = PI - phi1;
    float u2 = uFold + uR * phi2;
    float u1 = uFold + uR * phi1;
    if (u2 <= uRes.x) {
      // cream back side on top of the roll
      float lit = 0.74 + 0.26 * cos(phi2 - PI * 0.5 - 0.5);
      col = PAPER * lit * (0.97 + 0.03 * tooth(sp));
    } else if (u1 <= uRes.x) {
      float lit = 0.55 + 0.45 * cos(phi1);
      col = snap(u1, sp.y) * lit;
    }
  }
  fragColor = vec4(col, 1.0);
}
`;
}
