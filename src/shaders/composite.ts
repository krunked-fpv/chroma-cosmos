/**
 * Composite pass (full screen, native resolution): Layer 0 paper & parallax space, Layer 1 region masking,
 * Layer 2 pigment materials, Layer 3 ink / sel-out / ripple / actors. GLSL ES 3.00, texelFetch + NEAREST for
 * every pixel-art lookup.
 */
import { PAGE_H, PAGE_W, STROKE_SCALE, INK_HEX, PAPER_HEX, BG_HEX } from '../contracts/constants';
import { REGION_FLAG, SYSTEM_REGIONS } from '../contracts/regions';
import { GLSL_HEADER, f, vec3Hex } from './glsl-util';
import { MATERIAL_FUNCS_GLSL, buildMaterialTables } from './materials';
import { NOISE_GLSL } from './noise';

export const STROKE_RT_W = PAGE_W * STROKE_SCALE;
export const STROKE_RT_H = PAGE_H * STROKE_SCALE;
/** Sparkle sources uploaded per frame (extras are ignored). */
export const MAX_SPARKLES = 8;

export { QUAD_VERT } from './glsl-util';

function systemFixedGlsl(): string {
  const lines = SYSTEM_REGIONS.map((r) => {
    const v = typeof r.fixed === 'number' ? r.fixed : r.fixed === 'eyeShine' ? -1 : r.fixed === 'blush' ? -2 : -3;
    return `  if (id == ${r.id}) return ${v};`;
  });
  return `int sysFixed(int id) {\n${lines.join('\n')}\n  return 0;\n}`;
}

export function buildCompositeFrag(): string {
  return `${GLSL_HEADER}
uniform sampler2D uRegionTex;
uniform sampler2D uActorTex;
uniform sampler2D uRegionStateTex;
uniform sampler2D uStrokeTex;

uniform vec2 uRes;        // output size in pixels
uniform vec2 uOffset;     // page rect top-left in output pixels (y down)
uniform float uScale;     // output pixels per internal pixel
uniform float uTime;      // seconds
uniform float uBeat;
uniform float uAwakening;
uniform float uClean;     // 1 = keepsake capture (no mist, no wiggle)
uniform float uFlipY;     // 1 when rendering into a RenderTexture
uniform int uSelected;
uniform int uLiveSlots;   // bit s set => actor slot s is drawn live (static pixels replaced by base map)
uniform vec3 uSkyTop;
uniform vec3 uSkyBot;
uniform vec3 uMist;
uniform vec4 uFlashlight; // x, y, r, active
uniform vec2 uSparkle[${MAX_SPARKLES}];
uniform int uSparkleN;

out vec4 fragColor;

const vec3 INK = ${vec3Hex(INK_HEX)};
const vec3 PAPER = ${vec3Hex(PAPER_HEX)};
const vec3 BG = ${vec3Hex(BG_HEX)};
const vec3 GOLD_WHITE = vec3(1.0, 0.965, 0.78);
const int FLAG_COMPLETE = ${REGION_FLAG.complete};
const int FLAG_REVEALED = ${REGION_FLAG.ghostRevealed};
const int FLAG_WIGGLE = ${REGION_FLAG.wiggle};
const int FLAG_FLASH = ${REGION_FLAG.flash};
const int FLAG_HIDDEN = ${REGION_FLAG.hidden};
const float STROKE_S = ${f(STROKE_SCALE)};
const float RIPPLE_MAX = 300.0;

float gFxVar = 0.0;
${buildMaterialTables()}
${NOISE_GLSL}
${MATERIAL_FUNCS_GLSL}
${systemFixedGlsl()}

int decodeId(float v) { return int(floor(v * 255.0 + 0.5)); }

// resolved id (actor/FX pixel > base map under a live actor > static map), 255 outside the page
int rid(ivec2 q) {
  if (q.x < 0 || q.y < 0 || q.x >= ${PAGE_W} || q.y >= ${PAGE_H}) return 255;
  vec4 a = texelFetch(uActorTex, q, 0);
  if (a.a > 0.0) return decodeId(a.r);
  vec4 r = texelFetch(uRegionTex, q, 0);
  int slot = decodeId(r.b);
  if (slot > 0 && ((uLiveSlots >> slot) & 1) == 1) return decodeId(r.g);
  return decodeId(r.r);
}

ivec4 regionRow0(int id) { return ivec4(floor(texelFetch(uRegionStateTex, ivec2(id, 0), 0) * 255.0 + 0.5)); }
ivec4 regionRow1(int id) { return ivec4(floor(texelFetch(uRegionStateTex, ivec2(id, 1), 0) * 255.0 + 0.5)); }
bool hasFlag(int flags, int bit) { return (flags & bit) != 0; }

float edgeAmount(ivec2 ip, int id) {
  float e = 0.0;
  e += (rid(ip + ivec2(1, 0)) != id) ? 1.0 : 0.0;
  e += (rid(ip + ivec2(-1, 0)) != id) ? 1.0 : 0.0;
  e += (rid(ip + ivec2(0, 1)) != id) ? 1.0 : 0.0;
  e += (rid(ip + ivec2(0, -1)) != id) ? 1.0 : 0.0;
  e += (rid(ip + ivec2(2, 0)) != id) ? 0.5 : 0.0;
  e += (rid(ip + ivec2(-2, 0)) != id) ? 0.5 : 0.0;
  e += (rid(ip + ivec2(0, 2)) != id) ? 0.5 : 0.0;
  e += (rid(ip + ivec2(0, -2)) != id) ? 0.5 : 0.0;
  return clamp(e / 4.0, 0.0, 1.0);
}

// ---- Layer 0: cotton paper + faint compass / grid ----
vec3 paperColor(vec2 pp) {
  float tooth = 0.55 * vnoise(pp * 2.3) + 0.45 * hash12(floor(pp * 3.0));
  vec3 c = PAPER * (0.955 + 0.05 * tooth);
  c += vec3(0.012, 0.006, -0.004) * (vnoise(pp * 0.05) - 0.5);
  vec2 g = fract(pp / 30.0);
  vec2 line = step(g, vec2(1.0 / 30.0));
  float grid = max(line.x, line.y);
  c = mix(c, vec3(0.55, 0.58, 0.78), grid * 0.07);
  vec2 cc = abs(pp - 60.0 * floor(pp / 60.0 + 0.5));
  float cross = (cc.x < 3.5 && cc.y < 0.6 ? 1.0 : 0.0) + (cc.y < 3.5 && cc.x < 0.6 ? 1.0 : 0.0);
  c = mix(c, vec3(0.55, 0.5, 0.72), clamp(cross, 0.0, 1.0) * 0.14);
  return c;
}

// ---- Layer 0: open space (id 255) ----
vec3 skyColor(vec2 pp, ivec2 ip) {
  vec3 c = mix(uSkyTop, uSkyBot, clamp(pp.y / ${f(PAGE_H)}, 0.0, 1.0));
  for (int k = 0; k < 3; k++) {
    float cs = (k == 0) ? 26.0 : ((k == 1) ? 15.0 : 9.0);
    float spd = (k == 0) ? 1.2 : ((k == 1) ? 2.6 : 4.5);
    vec2 offs = vec2(floor(uTime * spd), floor(uTime * spd * 0.2)) + float(k) * 41.0;
    vec2 q = vec2(ip) + offs;
    vec2 cell = floor(q / cs);
    vec2 spos = floor(hash22(cell + float(k) * 7.0) * cs);
    vec2 lp = floor(q - cell * cs);
    vec2 dd = abs(lp - spos);
    float on = (dd.x + dd.y < 0.5) ? 1.0 : 0.0;
    if (k == 0) on = max(on, (dd.x + dd.y < 1.5 && dd.x + dd.y > 0.5) ? 0.35 : 0.0);
    float tw = 0.6 + 0.4 * sin(uTime * (1.2 + hash12(cell) * 2.0) + hash12(cell + 3.0) * 20.0);
    vec3 sc = mix(vec3(1.0, 0.96, 0.82), vec3(0.78, 0.9, 1.0), hash12(cell + 9.0));
    c = mix(c, sc, on * tw * (0.95 - 0.18 * float(k)));
  }
  if (uClean < 0.5) {
    float al = (1.0 - uAwakening) * 0.55;
    vec2 q = pp * 0.017 + vec2(uTime * 0.012, uTime * 0.004);
    float w = vnoise(q) * 0.65 + vnoise(q * 2.1 + 9.0) * 0.35;
    float wisp = smoothstep(0.42 + 0.3 * uAwakening, 0.8 + 0.15 * uAwakening, w);
    c = mix(c, uMist, al * wisp);
  }
  return c;
}

vec3 ghostShimmer(vec2 pp) {
  float s = 0.5 + 0.5 * sin(dot(pp, vec2(0.12, 0.08)) + uTime * 1.6);
  return mix(vec3(0.62, 0.95, 1.0), vec3(1.0, 0.82, 0.98), s);
}

vec3 fixedColor(int fx, vec2 pp, ivec2 ip) {
  if (fx == -1) return ${vec3Hex('#fffaf0')} * (0.94 + 0.06 * sin(uTime * 3.0 + pp.x * 0.3));
  if (fx == -2) return ${vec3Hex('#ffb3c7')};
  int m = (fx == -3) ? uSelected : fx;
  return shadeMaterial(clamp(m, 1, MAT_COUNT - 1), pp, ip, vec2(0.0), 0.0, vec2(3.0, 7.0));
}

void main() {
  vec2 sp = vec2(gl_FragCoord.x, uFlipY > 0.5 ? gl_FragCoord.y : uRes.y - gl_FragCoord.y);
  vec2 pp = (sp - uOffset) / uScale;
  if (pp.x < 0.0 || pp.y < 0.0 || pp.x >= ${f(PAGE_W)} || pp.y >= ${f(PAGE_H)}) {
    fragColor = vec4(BG, 1.0);
    return;
  }
  ivec2 ip = ivec2(floor(pp));

  int id = rid(ip);
  vec4 actorPx = texelFetch(uActorTex, ip, 0);
  bool isActor = actorPx.a > 0.0;
  gFxVar = isActor ? floor(actorPx.g * 255.0 + 0.5) : 0.0;

  // 4-neighbour ids (ink sel-out, wiggle)
  int nE = rid(ip + ivec2(1, 0));
  int nW = rid(ip + ivec2(-1, 0));
  int nS = rid(ip + ivec2(0, 1));
  int nN = rid(ip + ivec2(0, -1));

  // stage-1 wiggle: +/-1px jitter (6 Hz) on ink and on the wiggling region itself
  if (uClean < 0.5) {
    bool wig = false;
    if (id == 0) {
      wig = hasFlag(regionRow0(nE).a, FLAG_WIGGLE) || hasFlag(regionRow0(nW).a, FLAG_WIGGLE)
         || hasFlag(regionRow0(nS).a, FLAG_WIGGLE) || hasFlag(regionRow0(nN).a, FLAG_WIGGLE);
    } else if (id < 212) {
      wig = hasFlag(regionRow0(id).a, FLAG_WIGGLE);
    }
    if (wig) {
      float tick = floor(uTime * 6.0);
      ivec2 j = ivec2(int(floor(hash12(vec2(tick, 1.0)) * 3.0)) - 1, int(floor(hash12(vec2(tick, 2.0)) * 3.0)) - 1);
      int idq = rid(ip + j);
      if (idq == 0 || (idq < 212 && hasFlag(regionRow0(idq).a, FLAG_WIGGLE))) id = idq;
    }
  }

  vec3 col;
  // ---- Layer 3: ink (and sel-out) ----
  if (id == 0) {
    col = INK;
    int ids4[4] = int[4](nE, nW, nS, nN);
    for (int k = 0; k < 4; k++) {
      int nid = ids4[k];
      if ((nid > 0 && nid < 212) || (nid >= 234 && nid <= 254)) {
        ivec4 s0 = regionRow0(nid);
        if (hasFlag(s0.a, FLAG_COMPLETE) && s0.r > 0) {
          vec3 tint = PALAVG[clamp(s0.r, 1, MAT_COUNT - 1)];
          col = mix(INK, tint * 0.52, 0.72);
          if (hasFlag(s0.a, FLAG_FLASH)) col = mix(col, GOLD_WHITE, 0.55 + 0.25 * sin(uTime * 22.0));
          break;
        }
      }
    }
    fragColor = vec4(col, 1.0);
    return;
  }

  // ---- Layer 0 base by id class ----
  bool paintable = (id < 212) || (id >= 234 && id <= 254);
  ivec4 s0 = regionRow0(id);
  vec3 base;
  if (id == 255) {
    base = skyColor(pp, ip);
  } else if (id >= 234 && id <= 254) {
    bool visible = hasFlag(s0.a, FLAG_REVEALED);
    if (!visible && uFlashlight.w > 0.5) visible = distance(pp, uFlashlight.xy) <= uFlashlight.z;
    if (!visible) {
      fragColor = vec4(skyColor(pp, ip), 1.0);
      return;
    }
    base = mix(skyColor(pp, ip), ghostShimmer(pp), 0.5);
  } else if (id >= 212 && id <= 233) {
    int fx = sysFixed(id);
    vec3 sc = fixedColor(fx, pp, ip);
    fragColor = vec4(sc, 1.0);
    return;
  } else {
    base = paperColor(pp);
  }

  // ---- Layers 1 + 2: region mask, stroke coverage, pigment ----
  int mat = 0;
  float a = 0.0;
  vec2 flow = vec2(0.0);
  float ripple = 0.0;
  bool complete = paintable && hasFlag(s0.a, FLAG_COMPLETE);
  if (isActor && paintable) {
    mat = s0.r;
    a = mat > 0 ? 1.0 : 0.0;
  } else {
    ivec2 stp = ivec2(int(floor(pp.x * STROKE_S)), ${STROKE_RT_H - 1} - int(floor(pp.y * STROKE_S)));
    vec4 sv = texelFetch(uStrokeTex, stp, 0);
    float c = sv.r;
    if (c > 0.0) {
      mat = decodeId(sv.g);
      a = smoothstep(0.12, 0.5, c);
      flow = vec2(sv.b, sv.a) * 2.0 - 1.0;
    }
    if (complete) {
      ivec4 s1 = regionRow1(id);
      vec2 origin = vec2(float(s1.r), float(s1.g)) / 255.0 * vec2(${f(PAGE_W)}, ${f(PAGE_H)});
      float prog = float(s0.b) / 255.0;
      bool flashing = hasFlag(s0.a, FLAG_FLASH);
      float dist = distance(pp, origin);
      float front = prog * RIPPLE_MAX;
      float rc = ((s0.b == 0 && !flashing) || s0.b >= 250) ? 1.0 : smoothstep(front, front - 1.5, dist);
      if (rc > a) {
        a = rc;
        if (!(c > 0.5)) mat = (s0.r > 0) ? s0.r : 1;
      }
      if (s0.b > 0 && s0.b < 250) ripple = 1.0;
    }
  }

  col = base;
  if (mat > 0 && a > 0.0) {
    float edge = (PROG[clamp(mat, 1, MAT_COUNT - 1)] == 3) ? edgeAmount(ip, id) : 0.0;
    vec2 off = vec2(float(id) * 17.3, float(id) * 9.1);
    vec3 pig = shadeMaterial(clamp(mat, 1, MAT_COUNT - 1), pp, ip, flow, edge, off);
    pig *= 0.965 + 0.05 * hash12(floor(pp * 3.0));
    col = mix(base, pig, a);
  }
  if (ripple > 0.5) {
    ivec4 s1 = regionRow1(id);
    vec2 origin = vec2(float(s1.r), float(s1.g)) / 255.0 * vec2(${f(PAGE_W)}, ${f(PAGE_H)});
    float front = float(s0.b) / 255.0 * RIPPLE_MAX;
    float dist = distance(pp, origin);
    vec3 ringc = vec3(smoothstep(5.0, 0.0, abs(dist - front + 2.0)),
                      smoothstep(5.0, 0.0, abs(dist - front)),
                      smoothstep(5.0, 0.0, abs(dist - front - 2.0)));
    col += ringc * 0.35;
  }
  if (complete && hasFlag(s0.a, FLAG_FLASH)) {
    col = mix(col, GOLD_WHITE, clamp(0.5 + 0.25 * sin(uTime * 22.0), 0.0, 0.8));
  }
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;
}
