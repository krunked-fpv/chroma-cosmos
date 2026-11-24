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
    let v: number;
    if (typeof r.fixed === 'number') v = r.fixed;
    else if (r.fixed === 'eyeShine') v = -1;
    else if (r.fixed === 'blush') v = -2;
    else if (r.fixed === 'selected') v = -3;
    else if (r.fixed === 'wispCore') v = -4;
    else if (r.fixed === 'wispAura') v = -5;
    else v = -6; // 'wonderChalk'
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
uniform sampler2D uPalTex;

uniform vec2 uRes;        // output size in pixels
uniform vec2 uOffset;     // page rect top-left in output pixels (y down)
uniform float uScale;     // output pixels per internal pixel
uniform float uTime;      // seconds
uniform float uBeat;
uniform float uAwakening;
uniform float uClean;     // 1 = keepsake capture (no mist, no wiggle, no guide overlays)
uniform float uFlipY;     // 1 when rendering into a RenderTexture
uniform int uSelected;
uniform int uLiveSlots;   // bit s set => actor slot s is drawn live (static pixels replaced by base map)
uniform int uHoverRegion; // 0 = none (uncompleted region hovered in Enchanted Pencil mode)
uniform int uToolMode;    // 0 = pencil, 1 = wand
uniform vec3 uSkyTop;
uniform vec3 uSkyBot;
uniform vec3 uMist;
uniform vec4 uFlashlight; // x, y, r, active
uniform vec4 uWandGlow;   // x, y, r, active
uniform float uPrologueMist; // 0..1 Sleepy Hush lavender mist veil
uniform float uDogEarGlow;   // 0..1 bottom-right curled corner Star-Door light
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
const int FLAG_GUIDE_GLOW = ${REGION_FLAG.guideGlow};
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
  if (a.a > 0.0) {
    int aid = decodeId(a.r);
    if (uClean < 0.5 || aid < 231 || aid > 233) return aid;
  }
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
    if (uToolMode == 1) {
      // Subtle sky-wide celestial dust shimmer signalling open night sky is drawable
      vec2 wq = vec2(ip) + vec2(floor(uTime * 1.6), 0.0);
      vec2 wCell = floor(wq / 12.0);
      vec2 wPos = floor(hash22(wCell + 13.7) * 12.0);
      vec2 wLp = floor(wq - wCell * 12.0);
      float wDot = (abs(wLp.x - wPos.x) + abs(wLp.y - wPos.y) < 0.5) ? 1.0 : 0.0;
      float wTw = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * 2.8 + hash12(wCell) * 24.0), 2.0);
      vec3 wStarCol = mix(vec3(0.86, 0.94, 1.0), vec3(1.0, 0.92, 0.72), hash12(wCell + 5.1));
      c = mix(c, wStarCol, wDot * wTw * 0.42);
      c += vec3(0.025, 0.02, 0.05) * (0.5 + 0.5 * sin(uTime * 1.8 + pp.x * 0.025 + pp.y * 0.02));
      if (uWandGlow.w > 0.5) {
        float wd = distance(pp, uWandGlow.xy);
        float wr = max(uWandGlow.z, 1.0);
        if (wd < wr * 1.45) {
          float fall = 1.0 - smoothstep(0.0, wr * 1.45, wd);
          c += vec3(0.11, 0.09, 0.22) * (fall * fall);
          vec2 nCell = floor(vec2(ip) / 5.0);
          float nh = hash12(nCell + 31.4);
          if (nh > 0.68) {
            vec2 nCp = (nCell + 0.5) * 5.0;
            float nd = abs(pp.x - nCp.x) + abs(pp.y - nCp.y);
            float nTw = 0.4 + 0.6 * sin(uTime * 5.2 + nh * 47.0);
            float mote = (1.0 - smoothstep(0.2, 1.6, nd)) * nTw * fall;
            c = mix(c, mix(vec3(1.0, 0.95, 0.78), vec3(0.75, 0.95, 1.0), fract(nh * 7.3)), mote * 0.75);
          }
          float ring = (1.0 - smoothstep(0.0, 1.8, abs(wd - wr))) * (0.2 + 0.1 * sin(uTime * 4.0 + (pp.x + pp.y) * 0.16));
          c = mix(c, vec3(0.95, 0.9, 1.0), ring);
        }
      }
    }
  }
  return c;
}

vec3 ghostShimmer(vec2 pp) {
  float s = 0.5 + 0.5 * sin(dot(pp, vec2(0.12, 0.08)) + uTime * 1.6);
  return mix(vec3(0.62, 0.95, 1.0), vec3(1.0, 0.82, 0.98), s);
}

vec3 fixedColor(int fx, vec2 pp) {
  if (fx == -1) return ${vec3Hex('#fffaf0')} * (0.94 + 0.06 * sin(uTime * 3.0 + pp.x * 0.3));
  if (fx == -2) return ${vec3Hex('#ffb3c7')};
  if (fx == -4) {
    float p = 0.5 + 0.5 * sin(uTime * 5.0 + (pp.x + pp.y) * 0.25);
    return mix(${vec3Hex('#fff7d6')}, ${vec3Hex('#ffd56b')}, 0.15 + 0.85 * p);
  }
  if (fx == -5) {
    float shimmer = 0.5 + 0.5 * sin(uTime * 4.2 + dot(pp, vec2(0.18, 0.24)));
    float spark = 0.5 + 0.5 * sin(uTime * 6.4 - pp.x * 0.3 + pp.y * 0.2);
    vec3 aura = mix(${vec3Hex('#a87eff')}, ${vec3Hex('#ffbe55')}, shimmer);
    return mix(aura, ${vec3Hex('#ffe89e')}, spark * 0.18);
  }
  if (fx == -6) {
    float breathe = 0.5 + 0.5 * sin(uTime * 3.4 + (pp.x - pp.y) * 0.12);
    if (gFxVar > 1.5) {
      return mix(${vec3Hex('#ddd0ff')}, ${vec3Hex('#b5e8ff')}, breathe);
    }
    return mix(${vec3Hex('#fff3c4')}, ${vec3Hex('#ffe082')}, breathe);
  }
  return PAPER;
}

// Sleepy Hush prologue lavender mist veil + bottom-right Star-Door curled dog-ear glow
vec3 applyPageOverlays(vec3 c, vec2 pp, bool aboveMist) {
  if (uClean >= 0.5) return clamp(c, 0.0, 1.0);
  if (uPrologueMist > 0.001 && !aboveMist) {
    float pm = clamp(uPrologueMist, 0.0, 1.0);
    vec2 mq = pp * 0.014 + vec2(uTime * 0.032, -uTime * 0.014);
    float n1 = vnoise(mq);
    float n2 = vnoise(mq * 2.3 + vec2(-uTime * 0.025, 5.7));
    float fbm = n1 * 0.62 + n2 * 0.38;
    float veil = smoothstep(0.18 + (1.0 - pm) * 0.58, 0.88, fbm + pm * 0.45) * pm;
    vec3 hushCol = mix(${vec3Hex('#8d78b8')}, ${vec3Hex('#c8b4f0')}, smoothstep(0.25, 0.85, n2));
    c = mix(c, hushCol, veil * 0.56);
    vec2 drift = vec2(uTime * 5.0, -uTime * 2.5);
    vec2 sc = floor((pp + drift) / 10.0);
    float sh = hash12(sc + 23.1);
    if (sh > 0.78) {
      vec2 sp = (sc + 0.5) * 10.0 - drift;
      float sd = length(pp - sp);
      float tw = 0.4 + 0.6 * sin(uTime * 4.5 + sh * 52.0);
      float mote = (1.0 - smoothstep(0.2, 1.8, sd)) * tw * pm;
      c = mix(c, mix(${vec3Hex('#c8b4f0')}, vec3(1.0, 0.96, 0.82), fract(sh * 13.0)), mote * 0.75);
    }
  }
  if (uDogEarGlow > 0.001 && pp.x > 426.0 && pp.y > 224.0) {
    float dg = clamp(uDogEarGlow, 0.0, 1.0);
    vec2 br = max(vec2(${f(PAGE_W)}, ${f(PAGE_H)}), (uRes - uOffset) / max(uScale, 0.001));
    float tx = clamp((pp.x - 426.0) / (${f(PAGE_W)} - 426.0), 0.0, 1.0);
    float ty = clamp((pp.y - 224.0) / (${f(PAGE_H)} - 224.0), 0.0, 1.0);
    float tri = tx + ty - 1.0;
    float marginFade = smoothstep(486.0, 474.0, pp.x) * smoothstep(276.0, 264.0, pp.y)
      * smoothstep(0.0, 8.0, br.x - pp.x) * smoothstep(0.0, 8.0, br.y - pp.y);
    if (tri > -0.18 && marginFade > 0.001) {
      float breathe = 0.84 + 0.16 * sin(uTime * 3.0);
      float edgeGlow = smoothstep(-0.18, 0.45, tri);
      float coreGlow = smoothstep(0.2, 0.95, tri);
      vec3 amber = mix(vec3(1.0, 0.78, 0.36), vec3(1.0, 0.95, 0.76), coreGlow);
      float ray = 0.5 + 0.5 * sin((tx - ty) * 12.0 - uTime * 2.4);
      c = mix(c, amber, clamp(edgeGlow * (0.48 + 0.2 * ray) * dg * breathe * marginFade, 0.0, 0.82));
    }
  }
  return clamp(c, 0.0, 1.0);
}

void main() {
  vec2 sp = vec2(gl_FragCoord.x, uFlipY > 0.5 ? gl_FragCoord.y : uRes.y - gl_FragCoord.y);
  vec2 pp = (sp - uOffset) / uScale;
  bool outOfPage = pp.x < 0.0 || pp.y < 0.0 || pp.x >= ${f(PAGE_W)} || pp.y >= ${f(PAGE_H)};

  vec3 col = PAPER;
  bool aboveMist = false;

  if (outOfPage) {
    aboveMist = true;
    if (uClean >= 0.5) {
      col = BG;
    } else {
      float mTooth = 0.55 * vnoise(pp * 1.8) + 0.45 * hash12(floor(pp * 2.5));
      col = PAPER * (0.972 + 0.032 * mTooth);
      float dxOut = max(-pp.x, pp.x - ${f(PAGE_W)});
      float dyOut = max(-pp.y, pp.y - ${f(PAGE_H)});
      float distOut = max(dxOut, dyOut);
      if (distOut <= 1.0) {
        col = mix(col, INK, 0.78);
      } else if (distOut >= 3.0 && distOut < 4.0) {
        col = mix(col, ${vec3Hex('#d9ae5b')}, 0.82);
      }
    }
  } else {
    ivec2 ip = ivec2(floor(pp));

    int id = rid(ip);
    vec4 actorPx = texelFetch(uActorTex, ip, 0);
    int actorId = decodeId(actorPx.r);
    bool isActor = actorPx.a > 0.0 && (uClean < 0.5 || actorId < 231 || actorId > 233);
    gFxVar = isActor ? floor(actorPx.g * 255.0 + 0.5) : 0.0;

    // 4-neighbour ids (ink sel-out, wiggle, guide glow)
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

    bool resolved = false;
    bool needSky = false;
    float wandPeekMix = 0.0;
    bool paintable = (id > 0 && id < 212) || (id >= 234 && id <= 254);
    ivec4 s0 = paintable ? regionRow0(id) : ivec4(0);

    // ---- Layer 3: ink (and sel-out) ----
    if (id == 0) {
      int nNE = rid(ip + ivec2(1, -1));
      int nNW = rid(ip + ivec2(-1, -1));
      int nSE = rid(ip + ivec2(1, 1));
      int nSW = rid(ip + ivec2(-1, 1));
      int ids8[8] = int[8](nE, nW, nS, nN, nNE, nNW, nSE, nSW);
      bool touchesRegular = false;
      bool touchesGhost = false;
      bool ghostVisible = false;
      bool inFlashlight = (uFlashlight.w > 0.5) && (distance(pp, uFlashlight.xy) <= uFlashlight.z);
      for (int k = 0; k < 8; k++) {
        int nid = ids8[k];
        if (nid >= 1 && nid <= 233) {
          touchesRegular = true;
        } else if (nid >= 234 && nid <= 254) {
          touchesGhost = true;
          if (hasFlag(regionRow0(nid).a, FLAG_REVEALED) || inFlashlight) {
            ghostVisible = true;
          }
        }
      }
      if (!isActor && !touchesRegular && touchesGhost && !ghostVisible) {
        needSky = true;
        if (uClean < 0.5 && uToolMode == 1 && uWandGlow.w > 0.5) {
          float wd = distance(pp, uWandGlow.xy);
          float wr = max(uWandGlow.z, 1.0);
          if (wd <= wr) {
            float wFall = 1.0 - smoothstep(wr * 0.25, wr, wd);
            float wPulse = 0.7 + 0.3 * sin(uTime * 4.0 + (pp.x + pp.y) * 0.15);
            wandPeekMix = 0.38 * wFall * wPulse;
          }
        }
      } else {
        col = INK;
        bool selOutDone = false;
        bool guideInk = false;
        int ids4[4] = int[4](nE, nW, nS, nN);
        for (int k = 0; k < 4; k++) {
          int nid = ids4[k];
          if ((nid > 0 && nid < 212) || (nid >= 234 && nid <= 254)) {
            ivec4 ns0 = regionRow0(nid);
            if (!selOutDone && hasFlag(ns0.a, FLAG_COMPLETE) && ns0.r > 0) {
              vec3 tint = PALAVG[clamp(ns0.r, 1, MAT_COUNT - 1)];
              col = mix(INK, tint * 0.52, 0.72);
              if (hasFlag(ns0.a, FLAG_FLASH)) col = mix(col, GOLD_WHITE, 0.55 + 0.25 * sin(uTime * 22.0));
              selOutDone = true;
            }
            if (uClean < 0.5 && !hasFlag(ns0.a, FLAG_COMPLETE) && hasFlag(ns0.a, FLAG_GUIDE_GLOW)) {
              guideInk = true;
            }
          }
        }
        if (guideInk) {
          float gWave = 0.5 + 0.5 * sin(uTime * 3.2 + (pp.x + pp.y) * 0.08);
          float gSpark = smoothstep(0.74, 0.98, hash12(vec2(ip) + floor(uTime * 4.0) * 0.13));
          col = mix(col, vec3(1.0, 0.89, 0.55), 0.28 + 0.30 * gWave + 0.22 * gSpark * gWave);
        }
      }
      resolved = true;
    } else if (id == 255) {
      needSky = true;
    } else if (id >= 234 && id <= 254) {
      needSky = true;
      bool visible = hasFlag(s0.a, FLAG_REVEALED);
      if (!visible && uFlashlight.w > 0.5) visible = distance(pp, uFlashlight.xy) <= uFlashlight.z;
      if (!visible) {
        if (uClean < 0.5 && uToolMode == 1 && uWandGlow.w > 0.5) {
          float wd = distance(pp, uWandGlow.xy);
          float wr = max(uWandGlow.z, 1.0);
          if (wd <= wr) {
            float wFall = 1.0 - smoothstep(wr * 0.2, wr, wd);
            float wPulse = 0.65 + 0.35 * sin(uTime * 3.8 + (pp.x - pp.y) * 0.1);
            wandPeekMix = 0.26 * wFall * wPulse;
          }
        }
        resolved = true;
      }
    }

    // ---- Layer 0 base by id class (single sky lookup) ----
    vec3 sky = needSky ? skyColor(pp, ip) : vec3(0.0);

    if (resolved) {
      if (needSky) {
        col = (wandPeekMix > 0.0) ? mix(sky, ghostShimmer(pp), wandPeekMix) : sky;
      }
    } else {
      // ---- Layers 1 + 2: region mask, stroke coverage, pigment ----
      vec3 base = vec3(0.0);
      int mat = 0;
      float a = 0.0;
      vec2 flow = vec2(0.0);
      vec2 matOff = vec2(float(id) * 17.3, float(id) * 9.1);
      float ripple = 0.0;
      float ripFront = 0.0;
      float ripDist = 0.0;
      bool isFixedMat = false;
      bool complete = paintable && hasFlag(s0.a, FLAG_COMPLETE);

      if (id >= 212 && id <= 233) {
        int fx = sysFixed(id);
        aboveMist = (id == 221 || id == 231 || id == 232 || id == 233);
        if (fx < 0 && fx != -3) {
          col = fixedColor(fx, pp);
          resolved = true;
        } else {
          mat = (fx == -3) ? uSelected : fx;
          a = 1.0;
          matOff = vec2(3.0, 7.0);
          isFixedMat = true;
        }
      } else {
        if (id == 255) {
          base = sky;
        } else if (id >= 234 && id <= 254) {
          base = mix(sky, ghostShimmer(pp), 0.5);
        } else {
          base = paperColor(pp);
        }

        if (isActor && paintable) {
          mat = s0.r;
          a = mat > 0 ? 1.0 : 0.0;
        } else {
          int baseSlot = decodeId(texelFetch(uRegionTex, ip, 0).b);
          bool vacatedSlot = !isActor && baseSlot > 0 && (((uLiveSlots >> baseSlot) & 1) == 1);
          float c = 0.0;
          if (!vacatedSlot || (id != 255 && s0.g > 0 && !complete)) {
            ivec2 stp = ivec2(int(floor(pp.x * STROKE_S)), ${STROKE_RT_H - 1} - int(floor(pp.y * STROKE_S)));
            vec4 sv = texelFetch(uStrokeTex, stp, 0);
            int svMat = decodeId(sv.g);
            if (sv.r > 0.0 && (!vacatedSlot || (s0.r > 0 && svMat == s0.r))) {
              c = sv.r;
              mat = svMat;
              a = smoothstep(0.12, 0.5, c);
              flow = vec2(sv.b, sv.a) * 2.0 - 1.0;
            }
          }
          if (complete) {
            ivec4 s1 = regionRow1(id);
            vec2 origin = vec2(float(s1.r), float(s1.g)) / 255.0 * vec2(${f(PAGE_W)}, ${f(PAGE_H)});
            float prog = float(s0.b) / 255.0;
            bool flashing = hasFlag(s0.a, FLAG_FLASH);
            ripDist = distance(pp, origin);
            ripFront = prog * RIPPLE_MAX;
            float rc = ((s0.b == 0 && !flashing) || s0.b >= 250) ? 1.0 : smoothstep(ripFront, ripFront - 1.5, ripDist);
            if (rc > a) {
              a = rc;
              if (!(c > 0.5)) mat = (s0.r > 0) ? s0.r : 1;
            }
            if (s0.b > 0 && s0.b < 250) ripple = 1.0;
          }
        }
      }

      if (!resolved) {
        // Enchanted Pencil hover shimmer + idle Starlight Wisp guide breathing on uncompleted regions
        bool hoverUncomp = false;
        bool guideUncomp = false;
        if (!isFixedMat && uClean < 0.5 && paintable && !complete) {
          hoverUncomp = (uToolMode == 0 && uHoverRegion > 0 && id == uHoverRegion);
          guideUncomp = hasFlag(s0.a, FLAG_GUIDE_GLOW);
        }
        bool needWatercolorEdge = !isFixedMat && mat > 0 && a > 0.0 && PROG[clamp(mat, 1, MAT_COUNT - 1)] == 3;

        // Single edge lookup across the entire shader
        float edge = (hoverUncomp || guideUncomp || needWatercolorEdge) ? edgeAmount(ip, id) : 0.0;

        if (hoverUncomp) {
          float hBreath = 0.5 + 0.5 * sin(uTime * 3.6 + (pp.x + pp.y) * 0.045);
          float pulse = 0.14 + 0.14 * hBreath;
          base = mix(base, vec3(1.0, 0.94, 0.74), pulse);
          base = mix(base, vec3(1.0, 0.91, 0.62), edge * (0.28 + 0.16 * hBreath));
        }
        if (guideUncomp) {
          float gPulse = 0.5 + 0.5 * sin(uTime * 3.2);
          float gWave = 0.5 + 0.5 * sin(uTime * 3.2 + (pp.x * 0.05 - pp.y * 0.04));
          float gDust = smoothstep(0.84, 0.99, hash12(floor(pp * 0.5) + floor(uTime * 3.0) * 0.37));
          base = mix(base, vec3(1.0, 0.93, 0.68), 0.12 + 0.16 * gPulse + 0.08 * gWave);
          base = mix(base, vec3(1.0, 0.88, 0.52), edge * (0.32 + 0.24 * gPulse));
          base = mix(base, vec3(1.0, 0.97, 0.84), gDust * (0.25 + 0.35 * gPulse));
        }

        col = base;
        if (mat > 0 && a > 0.0) {
          // Single pigment material shade lookup across the entire shader
          vec3 pig = shadeMaterial(clamp(mat, 1, MAT_COUNT - 1), pp, ip, flow, isFixedMat ? 0.0 : edge, matOff);
          if (!isFixedMat) {
            pig *= 0.965 + 0.05 * hash12(floor(pp * 3.0));
            col = mix(base, pig, a);
          } else {
            col = pig;
          }
        }
        if (ripple > 0.5) {
          vec3 ringc = vec3(smoothstep(5.0, 0.0, abs(ripDist - ripFront + 2.0)),
                            smoothstep(5.0, 0.0, abs(ripDist - ripFront)),
                            smoothstep(5.0, 0.0, abs(ripDist - ripFront - 2.0)));
          col += ringc * 0.35;
        }
        if (complete && hasFlag(s0.a, FLAG_FLASH)) {
          col = mix(col, GOLD_WHITE, clamp(0.5 + 0.25 * sin(uTime * 22.0), 0.0, 0.8));
        }
      }
    }
  }

  // Single-exit page overlays pass (called EXACTLY ONCE)
  fragColor = vec4(applyPageOverlays(col, pp, aboveMist), 1.0);
}
`;
}
