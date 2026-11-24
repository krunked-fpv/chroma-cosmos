/**
 * Layer 2 - GLSL pigment materials. One unified `shadeMaterial()` that branches on the program id (1..15).
 * Every program uses at most two noise octaves. Palettes come straight from the MATERIALS contract.
 * Expects the including shader to declare: uTime, uBeat, uSparkle[8], uSparkleN and gFxVar.
 */
import { MATERIALS } from '../contracts/materials';
import { f, hexToRgb } from './glsl-util';

export const MAX_PALETTE = 8;
export const PAL_TEX_W = MAX_PALETTE;
export const PAL_TEX_H = 32;

/** Populates an 8x32 RGBA8 palette lookup texture from the MATERIALS contract (row m = material id, col i = stop). */
export function buildPaletteTexData(out: Uint8Array): void {
  out.fill(0);
  for (let m = 1; m <= MATERIALS.length; m++) {
    const def = MATERIALS.find((d) => d.id === m);
    if (!def) throw new Error(`material ${m} missing`);
    const pal = def.palette.map(hexToRgb);
    for (let i = 0; i < MAX_PALETTE; i++) {
      const c = pal[Math.min(i, pal.length - 1)] as [number, number, number];
      const o = (m * PAL_TEX_W + i) * 4;
      out[o] = Math.round(c[0] * 255);
      out[o + 1] = Math.round(c[1] * 255);
      out[o + 2] = Math.round(c[2] * 255);
      out[o + 3] = 255;
    }
  }
}

/** Generates compact `const` metadata tables from the MATERIALS contract (index 0 is an unused dummy row). */
export function buildMaterialTables(): string {
  const counts: number[] = [0];
  const progs: number[] = [0];
  const dark: string[] = ['vec3(0.0)'];
  for (let m = 1; m <= MATERIALS.length; m++) {
    const def = MATERIALS.find((d) => d.id === m);
    if (!def) throw new Error(`material ${m} missing`);
    const pal = def.palette.map(hexToRgb);
    counts.push(pal.length);
    progs.push(def.program);
    const avg = pal.reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0]).map((v) => v / pal.length);
    dark.push(`vec3(${f(avg[0] ?? 0)},${f(avg[1] ?? 0)},${f(avg[2] ?? 0)})`);
  }
  const n = MATERIALS.length + 1;
  return `
const int MAT_COUNT = ${n};
const int PALN[${n}] = int[${n}](${counts.join(',')});
const int PROG[${n}] = int[${n}](${progs.join(',')});
const vec3 PALAVG[${n}] = vec3[${n}](${dark.join(',')});
`;
}

export const MATERIAL_FUNCS_GLSL = `
vec3 palAt(int m, int i) { return texelFetch(uPalTex, ivec2(i, m), 0).rgb; }
// cyclic palette sample over the first n stops
vec3 palCyc(int m, float x, int n) {
  float fx = fract(x) * float(n);
  int i = int(floor(fx));
  int j = (i + 1) % n;
  return mix(palAt(m, i), palAt(m, j), smoothstep(0.0, 1.0, fract(fx)));
}
// clamped ramp over all stops
vec3 palRamp(int m, float x) {
  int n = PALN[m];
  float fx = clamp(x, 0.0, 1.0) * float(n - 1);
  int i = min(int(floor(fx)), n - 2);
  return mix(palAt(m, i), palAt(m, i + 1), smoothstep(0.0, 1.0, fx - float(i)));
}

// 1 - Liquid Aurora (and Aurora Sherbet): multi-stop pastel simplex, breathing
vec3 progAurora(int m, vec2 p, float n1, float n2) {
  float breathe = 0.5 + 0.5 * sin(uTime * 0.7 + n1 * 2.0);
  float v = 0.5 + 0.5 * (0.68 * n1 + 0.32 * n2);
  v = v * 0.85 + 0.12 * breathe + p.y * 0.0022;
  vec3 c = palCyc(m, v, PALN[m]);
  c = mix(c, vec3(1.0, 0.98, 0.94), 0.14 * pow(1.0 - abs(n2), 3.0));
  return c;
}

// 2 - Holographic Rainbow Foil: 7-spectrum iridescence shifted by stroke flow + tilt
vec3 progHolo(int m, vec2 p, vec2 flow, float sn) {
  float tilt = sin(uTime * 0.35) * 0.45;
  float h = dot(p, vec2(0.86, 0.51)) * 0.0105 + flow.x * 0.35 + flow.y * 0.2 + tilt + 0.32 * sn;
  vec3 c = palCyc(m, h, 7);
  float sheen = pow(0.5 + 0.5 * sin(dot(p, vec2(0.7, -0.7)) * 0.085 + uTime * 0.8 + h * 6.0), 6.0);
  c = mix(c, palAt(m, 7), sheen * 0.62);
  c *= 0.97 + 0.03 * sin((p.x + p.y) * 1.9);
  return c;
}

// 3 - Velvet Nebula watercolor: wet-on-wet bloom, edge pooling, micro-stars
vec3 progNebula(int m, vec2 off, ivec2 ip, float edge, float n, float n2) {
  float v = 0.5 + 0.5 * (0.6 * n + 0.4 * n2);
  float bloom = smoothstep(0.6, 0.88, v);
  vec3 c = palRamp(m, mix(0.2, 0.78, v));
  c = mix(c, palAt(m, 3), bloom * 0.5);
  c *= 1.0 - 0.1 * (smoothstep(0.58, 0.62, v) - smoothstep(0.62, 0.7, v));
  vec3 pooled = c * c * 0.82 + palAt(m, 0) * 0.1;
  c = mix(c, pooled, edge * 0.9);
  float sh = hash12(vec2(ip) + off);
  if (sh > 0.993) c = mix(c, palAt(m, 3), 0.55 + 0.45 * sin(uTime * 3.0 + sh * 99.0));
  return c;
}

// 4 - Solar Cheetah Amber (24K Solar Flare reuses it with the gold palette)
vec3 progAmber(int m, vec2 p, vec2 off, float sn) {
  int n = PALN[m];
  float nz = 0.5 + 0.5 * sn;
  float wave = 0.5 + 0.5 * sin(p.y * 0.035 + p.x * 0.012 + nz * 2.2);
  vec3 base = mix(palAt(m, 0), palAt(m, 1), smoothstep(0.15, 0.85, nz * 0.65 + wave * 0.35));
  float beat = fract(uBeat);
  float pulse = exp(-beat * 5.0);
  vec2 g = p / 24.0 + off * 0.07;
  vec2 ci = floor(g);
  vec2 fr = fract(g);
  vec2 jc = 0.36 + 0.28 * hash22(ci);
  vec2 dv = (fr - jc) * 24.0;
  float d = length(dv);
  float h = hash12(ci);
  float rad = (4.2 + 3.2 * h) * (1.0 + 0.16 * pulse);
  float dir = (h > 0.5) ? 1.0 : -1.0;
  float ang = atan(dv.y, dv.x) + d * 0.52 - uTime * 0.75 * dir;
  float arm = 0.5 + 0.5 * sin(ang * 2.0);
  float spot = smoothstep(rad, rad - 1.3, d);
  float ring = smoothstep(rad + 1.4, rad, d) - spot;
  vec3 rim = palAt(m, 2);
  vec3 core = palAt(m, n - 1);
  vec3 sp = mix(rim, core, 0.35 + 0.65 * arm * (1.0 - d / max(rad, 0.01)));
  if (n < 4) {
    // 24K Solar Flare: molten gold flare core + white-gold starburst glint
    sp = mix(rim, palAt(m, 0), 0.35 + 0.55 * arm);
    sp = mix(sp, vec3(1.0, 0.98, 0.86), 0.65 * pow(max(0.0, 1.0 - d / max(rad, 0.01)), 1.6));
  } else {
    // Solar Cheetah Amber: celestial indigo galaxy swirl with tiny golden star heart
    sp = mix(sp, palAt(m, 0), 0.32 * pow(arm, 2.0) * (1.0 - d / max(rad, 0.01)));
  }
  float present = step(0.24, h);
  vec3 c = mix(base, sp, spot * present);
  c = mix(c, mix(rim, palAt(m, 0), n < 4 ? 0.45 : 0.15), ring * 0.55 * present);
  c += (0.12 * pulse) * (spot * present) * palAt(m, 0);
  if (n < 4) {
    float glint = pow(0.5 + 0.5 * sin(dot(p, vec2(0.09, -0.07)) + uTime * 1.4 + nz * 3.0), 8.0);
    c = mix(c, vec3(1.0, 0.99, 0.9), glint * 0.42);
  }
  return c;
}

// 5 - Supernova Glitter: luminous violet-lavender gel + crisp diamond sparkles flashing near sparkle sources
vec3 progGlitter(int m, vec2 p, vec2 off, float sn) {
  float n = 0.5 + 0.5 * sn;
  vec3 base = mix(palAt(m, 0), palAt(m, 1), smoothstep(0.18, 0.82, n));
  base = mix(base, vec3(0.95, 0.85, 1.0), 0.16 * pow(n, 2.0));
  float boost = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= uSparkleN) break;
    boost = max(boost, smoothstep(48.0, 0.0, distance(p, uSparkle[i])));
  }
  vec3 c = base + palAt(m, 1) * (boost * 0.16);
  // two staggered sparkle grids (no radial moire): medium jewel diamonds + fine stardust flecks
  vec2 cellA = floor(p / 7.0);
  float hA = hash12(cellA + off);
  float threshA = mix(0.68, 0.38, boost);
  if (hA > threshA) {
    float ph = fract(uTime * (0.45 + hA * 0.75 + boost * 0.65) + hA * 17.3);
    float fl = pow(max(0.0, 1.0 - abs(ph - 0.5) * 2.0), 2.5);
    vec2 cp = (cellA + 0.25 + 0.5 * hash22(cellA + 4.1)) * 7.0;
    vec2 d = abs(p - cp);
    float rr = 0.85 + 2.1 * fl;
    float diamond = smoothstep(rr, rr - 0.85, d.x + d.y);
    float cross = smoothstep(0.6, 0.15, min(d.x, d.y)) * smoothstep(rr * 1.9, 0.0, max(d.x, d.y));
    vec3 spCol = mix(vec3(0.85, 0.94, 1.0), palAt(m, 2), 0.65 + 0.35 * fl);
    c = mix(c, spCol, clamp(diamond + cross * 0.75, 0.0, 1.0) * (0.45 + 0.55 * fl));
  }
  vec2 cellB = floor((p + vec2(3.5, 2.5)) / 4.0);
  float hB = hash12(cellB + off + 19.7);
  if (hB > mix(0.88, 0.72, boost)) {
    float tw = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * 3.2 + hB * 43.0), 3.0);
    vec2 cp = (cellB + 0.5) * 4.0 - vec2(3.5, 2.5);
    float d = length(p - cp);
    c = mix(c, palAt(m, 2), smoothstep(1.2, 0.2, d) * tw * 0.85);
  }
  return c;
}

// 6 - Rainbow Prism Wax: crayon tooth + multi-band stripes (fx rainbow pixels carry their band in gFxVar)
vec3 progWax(int m, vec2 p, vec2 off, float sn) {
  float tooth = vnoise(vec2(p.x * 0.7 + p.y * 0.25, p.y * 2.3) + off);
  float grain = hash12(floor(p * 1.5) + off);
  vec3 c;
  if (gFxVar > 0.5) {
    int bi = (int(gFxVar + 0.5) - 1) % 6;
    c = palAt(m, bi);
    c = mix(c, vec3(1.0), 0.08 + 0.12 * (0.5 + 0.5 * sin(uTime * 3.0 - p.x * 0.2)));
  } else {
    float band = (p.x * 0.55 + p.y * 0.85) / 7.0 + 0.15 * sn + uTime * 0.02;
    float fx = fract(band / 6.0) * 6.0;
    int i = int(floor(fx)) % 6;
    c = mix(palAt(m, i), palAt(m, (i + 1) % 6), smoothstep(0.78, 1.0, fract(fx)));
  }
  c = mix(c, vec3(1.0, 0.98, 0.94), smoothstep(0.62, 0.95, tooth * 0.7 + grain * 0.3) * 0.42);
  c *= 0.95 + 0.09 * tooth;
  return c;
}

// 7 - Cotton-Candy Chalk: fluffy pink-to-sky cloud billows + chalky shimmer (periodic so both hues shine anywhere)
vec3 progChalk(int m, vec2 p, vec2 off, float sn) {
  float n = 0.5 + 0.5 * sn;
  float n2 = vnoise(p * 0.12 + off);
  float swirl = 0.5 + 0.5 * sin(p.x * 0.045 + p.y * 0.032 + n * 2.6);
  float v = smoothstep(0.18, 0.82, 0.52 * swirl + 0.33 * n + 0.15 * n2);
  vec3 c = mix(palAt(m, 0), palAt(m, 1), v);
  float puff = smoothstep(0.56, 0.92, n * 0.65 + n2 * 0.45);
  c = mix(c, vec3(1.0, 0.97, 0.99), puff * 0.48);
  float sh = hash12(floor(p / 2.0) + off);
  float tw = pow(max(0.0, sin(uTime * 2.2 + sh * 50.0)), 18.0) * step(0.91, sh);
  c += tw * 0.5;
  c *= 0.96 + 0.07 * hash12(floor(p * 1.5));
  return c;
}

// 8 - Opal Pearl: milky pearlescence + lush pastel rainbow fire
vec3 progOpal(int m, vec2 p, vec2 off, float n) {
  vec3 milk = palAt(m, 0);
  float ang = 0.5 + 0.5 * sin(n * 3.2 + dot(p, vec2(0.028, 0.022)) + uTime * 0.28);
  vec3 pastel = palCyc(m, ang, 4);
  // boost pastel saturation slightly inside the milky pearl so opalescence reads vividly
  vec3 fireHue = mix(pastel, clamp(pastel * 1.12 - vec3(0.12), 0.0, 1.0), 0.55);
  vec3 c = mix(milk * 0.97, fireHue, 0.68);
  float fl = vnoise(p * 0.16 + off + uTime * 0.08);
  float fire = smoothstep(0.58, 0.9, fl);
  vec3 flash = palCyc(m, fl * 3.5 + ang + 0.25, 4);
  c = mix(c, clamp(flash * 1.1 - vec3(0.08), 0.0, 1.0), fire * 0.62);
  float gloss = pow(0.5 + 0.5 * sin(dot(p, vec2(0.55, 0.83)) * 0.065 + uTime * 0.45 + n * 1.5), 6.0);
  c = mix(c, vec3(1.0, 0.99, 1.0), gloss * 0.35);
  return c;
}

// 9 - Neon Cyber-Cheetah: synthwave magenta/lime gradient, sleek rosette spots, scanlines
vec3 progNeon(int m, vec2 p, vec2 off, ivec2 ip, float sn) {
  vec3 mag = palAt(m, 0);
  vec3 lime = palAt(m, 1);
  vec3 dk = palAt(m, 2);
  float g = 0.5 + 0.5 * sin(p.y * 0.05 + p.x * 0.015 + uTime * 0.55 + 1.15 * sn);
  vec3 c = mix(mag, lime, smoothstep(0.22, 0.78, g)) * 0.94;
  vec2 gc = p / 17.0 + off * 0.05;
  vec2 ci = floor(gc);
  vec2 jc = 0.38 + 0.24 * hash22(ci);
  float d = length((fract(gc) - jc) * 17.0);
  float h = hash12(ci);
  float r = 2.2 + 2.2 * h;
  float present = step(0.28, h);
  float core = smoothstep(r, r - 0.9, d) * present;
  float rim = (smoothstep(r + 1.4, r + 0.2, d) - smoothstep(r, r - 0.9, d)) * present;
  c = mix(c, mix(dk, mag * 0.45, 0.25), core * 0.9);
  c = mix(c, mix(lime, mag, step(0.5, g)) * 1.15, rim * 0.85);
  float sl = 0.84 + 0.16 * step(0.5, fract(float(ip.y) * 0.5));
  float sweep = pow(max(0.0, 1.0 - abs(fract(p.y / 80.0 - uTime * 0.14) - 0.5) * 6.0), 2.0);
  c = c * sl + mix(mag, lime, 0.5) * (0.14 * sweep);
  return c;
}

// 10 - Deep-Space Bioluminescence: teal-to-ultraviolet sea-star tendrils
vec3 progBiolum(int m, vec2 p, vec2 off, float w1, float n2) {
  vec3 deep = palAt(m, 0);
  vec3 teal = palAt(m, 1);
  vec3 uv = palAt(m, 2);
  float ridge = 1.0 - abs(n2);
  float tendril = pow(ridge, 6.0);
  vec2 gc = p / 60.0 + off * 0.05;
  vec2 ci = floor(gc);
  vec2 centre = (0.37 + 0.26 * hash22(ci)) * 60.0;
  vec2 v = fract(gc) * 60.0 - centre;
  float a = atan(v.y, v.x);
  float rr = length(v);
  float arms = pow(0.5 + 0.5 * cos(5.0 * a + rr * 0.1 - uTime * 0.4), 3.0) * smoothstep(22.0, 2.0, rr);
  float core = smoothstep(4.0, 0.0, rr);
  vec3 glow = mix(teal, uv, 0.5 + 0.5 * w1);
  vec3 c = deep * 1.25 + teal * 0.1 + glow * (tendril * 0.85 + arms * 0.8) + vec3(0.9, 1.0, 0.95) * core * 0.35;
  return c;
}

// 11 - Strawberry Supernova Glaze: glossy berry-pink glaze + warm golden supernova sugar-crystal glints
vec3 progStrawberry(int m, vec2 p, vec2 off, float sn1) {
  float nz = 0.5 + 0.5 * sn1;
  float glazeWave = 0.5 + 0.5 * sin(dot(p, vec2(0.036, 0.024)) + nz * 2.4 - uTime * 0.42);
  vec3 c = mix(palAt(m, 0), palAt(m, 1), smoothstep(0.16, 0.84, 0.55 * glazeWave + 0.45 * nz));
  float g1 = 0.5 + 0.5 * sin(dot(p, vec2(0.55, 0.83)) * 0.068 + sn1 * 1.6 - uTime * 0.55);
  float g2 = g1 * g1;
  float glossBand = g2 * g2 * g1;
  c = mix(c, palAt(m, 2), glossBand * 0.62);
  c = mix(c, vec3(1.0, 0.96, 0.98), glossBand * glossBand * 0.34);
  // Sparkling micro sugar granules (branchless)
  vec2 sgCell = floor(p / 5.0);
  float sgH = hash12(sgCell + off + 7.3);
  vec2 sgPos = (sgCell + 0.25 + 0.5 * hash22(sgCell + 3.1)) * 5.0;
  float sgTw = 0.5 + 0.5 * sin(uTime * 3.8 + sgH * 41.0);
  float sgMask = step(0.72, sgH) * smoothstep(1.35, 0.2, length(p - sgPos)) * (0.45 + 0.55 * sgTw * sgTw);
  c = mix(c, palAt(m, 3), sgMask * 0.82);
  // Warm golden supernova 4-point sugar-crystal star glints (branchless)
  vec2 stCell = floor((p + vec2(3.0, 4.0)) / 12.0);
  float stH = hash12(stCell + off + 29.1);
  vec2 stPos = (stCell + 0.25 + 0.5 * hash22(stCell + 11.7)) * 12.0 - vec2(3.0, 4.0);
  vec2 dv = abs(p - stPos);
  float ph = fract(uTime * (0.42 + stH * 0.58) + stH * 19.0);
  float fl0 = max(0.0, 1.0 - abs(ph - 0.5) * 2.0);
  float fl = fl0 * fl0;
  float core = smoothstep(1.6 + 1.1 * fl, 0.2, dv.x + dv.y);
  float rays = smoothstep(0.65, 0.12, min(dv.x, dv.y)) * smoothstep(2.4 + 2.2 * fl, 0.0, max(dv.x, dv.y));
  vec3 starGold = mix(palAt(m, 3), vec3(1.0, 0.97, 0.82), 0.5 + 0.5 * fl);
  c = mix(c, starGold, step(0.66, stH) * clamp(core + rays * 0.85, 0.0, 1.0) * (0.55 + 0.45 * fl));
  return c;
}

// 12 - Crystal Glacier Mint: faceted translucent ice-mint crystal prisms with specular frost ridges
vec3 progGlacier(int m, vec2 p, vec2 off, float sn1, float sn2) {
  vec2 gp = (p + vec2(sn1, sn2) * 3.2) / 15.0 + off * 0.04;
  float a1 = gp.x;
  float a2 = gp.x * 0.5 + gp.y * 0.8660254;
  float a3 = -gp.x * 0.5 + gp.y * 0.8660254;
  float f1 = fract(a1);
  float f2 = fract(a2);
  float f3 = fract(a3);
  vec2 facetId = vec2(floor(a1) + floor(a2) * 7.0, floor(a2) - floor(a3) * 11.0);
  float fh = hash12(facetId);
  float fh2 = hash12(facetId + 17.3);
  float refractIdx = clamp(0.45 * fh + 0.35 * (0.5 + 0.5 * sn1) + 0.20 * (0.5 + 0.5 * sin(uTime * 0.5 + fh2 * 6.28318)), 0.0, 1.0);
  vec3 c = mix(palAt(m, 0), palAt(m, 2), smoothstep(0.15, 0.85, refractIdx));
  float planeTilt = 0.5 + 0.5 * sin((f1 - f2) * 3.14159 + fh * 6.28318 + uTime * 0.75);
  c = mix(c, palAt(m, 1), 0.32 + 0.38 * planeTilt);
  float gl1 = 0.5 + 0.5 * sin(uTime * 1.15 + fh * 14.0 + dot(p, vec2(0.02, -0.025)));
  float gl2 = gl1 * gl1;
  float gl4 = gl2 * gl2;
  c = mix(c, palAt(m, 3), gl4 * gl2 * gl1 * 0.58 * step(0.35, fh2));
  float dEdge = min(min(min(f1, 1.0 - f1), min(f2, 1.0 - f2)), min(f3, 1.0 - f3));
  float ridge = smoothstep(0.13, 0.0, dEdge);
  float frostSpark = 0.75 + 0.25 * sin(uTime * 2.6 + (p.x + p.y) * 0.14);
  c = mix(c, palAt(m, 3), ridge * 0.72 * frostSpark);
  return c;
}

// 13 - Cosmic Cotton-Candy Swirl: whipped pastel pink/sky/lavender candy vortex spirals
vec3 progCottonSwirl(int m, vec2 p, vec2 off, float sn1, float sn2) {
  vec2 wp = p + vec2(sn1, sn2) * 11.0;
  vec2 gc = wp / 36.0 + off * 0.03;
  vec2 ci = floor(gc);
  vec2 jc = 0.34 + 0.32 * hash22(ci + 5.7);
  vec2 dv = fract(gc) - jc;
  float rad = length(dv);
  float dir = hash12(ci + 13.1) > 0.5 ? 1.0 : -1.0;
  float ang = atan(dv.y, dv.x);
  float vortexW = smoothstep(0.56, 0.06, rad);
  float vortexPhase = ang * 0.3183099 * dir + rad * 3.1 - uTime * 0.28 * dir + hash12(ci) * 3.0;
  float sweepPhase = dot(wp, vec2(0.026, 0.021)) + 0.45 * sin(wp.x * 0.035 - wp.y * 0.028 + uTime * 0.42);
  float spiral = mix(sweepPhase, vortexPhase, vortexW * 0.78);
  vec3 c = palCyc(m, spiral, 3);
  float w1 = 0.5 + 0.5 * sin(spiral * 18.84955 + sn2 * 1.8);
  float w2 = w1 * w1;
  c = mix(c, palAt(m, 3), w2 * w2 * (0.42 + 0.22 * vortexW));
  float puff = smoothstep(0.62, 0.94, 0.5 + 0.5 * sn1);
  c = mix(c, palAt(m, 3), puff * 0.22);
  return c;
}

// 14 - Enchanted Dragonfly Iridescence: angle-shifting teal/sapphire/violet/emerald wing-vein iridescence
vec3 progDragonfly(int m, vec2 p, vec2 flow, vec2 off, float sn1, float sn2) {
  vec2 hp = p * 0.105 + vec2(sn1, sn2) * 0.78 + off * 0.04;
  vec2 hr = vec2(1.0, 1.7320508);
  vec2 hh = hr * 0.5;
  vec2 ha = mod(hp, hr) - hh;
  vec2 hb = mod(hp - hh, hr) - hh;
  vec2 gv = (dot(ha, ha) < dot(hb, hb)) ? ha : hb;
  vec2 cid = hp - gv;
  float cellH = hash12(floor(cid * 2.0 + 0.5));
  float hexD = max(abs(gv.x), dot(abs(gv), vec2(0.5, 0.8660254)));
  float tilt = sin(uTime * 0.58) * 0.42;
  float irid = dot(p, vec2(0.76, -0.65)) * 0.013 + flow.x * 0.38 + flow.y * 0.24 + tilt + 0.36 * sn1 + cellH * 0.18;
  vec3 c = palCyc(m, irid, 4);
  float angleDot = dot(gv, vec2(cos(uTime * 0.8 + cellH * 4.0), sin(uTime * 0.8 + cellH * 4.0)));
  float sh1 = 0.5 + 0.5 * sin(dot(p, vec2(0.58, 0.81)) * 0.065 - uTime * 0.95 + sn2 * 2.1 + angleDot * 3.2);
  float sh2 = sh1 * sh1;
  float sheen = sh2 * sh2 * sh1;
  c = mix(c, mix(palAt(m, 3), vec3(0.92, 1.0, 0.98), 0.45), sheen * 0.55);
  float vein = smoothstep(0.41, 0.495, hexD);
  vec3 veinCol = mix(palAt(m, 1) * 0.38, palAt(m, 2) * 0.55, 0.5 + 0.5 * sin(irid * 6.28318));
  veinCol = mix(veinCol, palAt(m, 3), sheen * 0.45);
  c = mix(c, veinCol, vein * 0.78);
  return c;
}

// 15 - Royal Astral Velvet Gold: midnight-indigo velvet inlaid with gleaming burnished-gold astrolabe filigree
vec3 progRoyalGold(int m, vec2 p, vec2 off, float sn1, float sn2) {
  float nap = 0.5 + 0.5 * sn1;
  float microPile = hash12(floor(p * 1.5) + off);
  vec3 velvet = mix(palAt(m, 0), palAt(m, 1), smoothstep(0.18, 0.84, nap * 0.76 + microPile * 0.24));
  velvet *= 0.90 + 0.14 * (0.5 + 0.5 * sin(dot(p, vec2(0.03, 0.045)) + sn2 * 1.4));
  vec2 gc = p / 34.0 + off * 0.03;
  vec2 dv = (fract(gc) - 0.5) * 34.0;
  float r = length(dv);
  float outerRing = 1.0 - smoothstep(0.35, 1.15, abs(r - 12.8));
  float innerRing = 1.0 - smoothstep(0.32, 1.05, abs(length(dv - vec2(2.4, -2.0)) - 6.8));
  float crossMask = smoothstep(14.5, 11.5, r);
  float axisX = (1.0 - smoothstep(0.25, 0.9, abs(dv.y))) * crossMask;
  float axisY = (1.0 - smoothstep(0.25, 0.9, abs(dv.x))) * crossMask;
  float ang = atan(dv.y, dv.x) - uTime * 0.25;
  float ray0 = max(0.0, cos(ang * 4.0));
  float ray2 = ray0 * ray0;
  float starRay = ray2 * ray2 * ray2 * smoothstep(5.8, 0.6, r);
  float centerJewel = smoothstep(2.1, 0.4, r);
  float diagA = 1.0 - smoothstep(0.25, 0.85, abs(abs(dv.x) - abs(dv.y)));
  float diagThreads = diagA * smoothstep(10.0, 14.5, r) * (0.45 + 0.55 * smoothstep(0.25, 0.75, 0.5 + 0.5 * sn2));
  float filigree = clamp(max(max(outerRing, innerRing), max(max(axisX, axisY) * 0.7, max(starRay, max(centerJewel, diagThreads * 0.65)))), 0.0, 1.0);
  float lus1 = 0.5 + 0.5 * sin(dot(p, vec2(0.085, -0.065)) + uTime * 1.05 + sn1 * 2.2);
  vec3 gold = mix(palAt(m, 2), palAt(m, 3), 0.25 + 0.75 * lus1 * lus1);
  vec3 c = mix(velvet, gold, filigree * 0.92);
  // Tiny constellation star dots twinkling in the midnight velvet (branchless)
  vec2 stCell = floor((p + vec2(5.0, 7.0)) / 9.0);
  float stH = hash12(stCell + off + 41.3);
  vec2 stPos = (stCell + 0.5) * 9.0 - vec2(5.0, 7.0);
  float tw = 0.45 + 0.55 * sin(uTime * 3.1 + stH * 47.0);
  c = mix(c, palAt(m, 3), step(0.82, stH) * smoothstep(1.25, 0.2, length(p - stPos)) * tw * 0.85);
  return c;
}

vec3 shadeMaterial(int m, vec2 p, ivec2 ip, vec2 flow, float edge, vec2 off) {
  int prog = PROG[m];
  // Shared simplex noise evaluation (2 call sites across all 15 material programs)
  vec2 q1 = p * 0.028 + off * 0.01;
  if (prog == 1) q1 = p * 0.021 + off * 0.01 + vec2(uTime * 0.11, -uTime * 0.077) + flow * 0.4;
  else if (prog == 3) q1 = p * 0.02 + off * 0.01 + vec2(uTime * 0.01, 0.0);
  else if (prog == 4) q1 = p * 0.028 + off * 0.01 + vec2(uTime * 0.04, 0.0);
  else if (prog == 5) q1 = p * 0.032 + off * 0.01 + vec2(uTime * 0.05, -uTime * 0.03);
  else if (prog == 6) q1 = p * 0.04;
  else if (prog == 7) q1 = p * 0.038 + off * 0.01 + vec2(uTime * 0.025, -uTime * 0.015);
  else if (prog == 8) q1 = p * 0.032 + off * 0.01 + uTime * 0.035;
  else if (prog == 9) q1 = p * 0.022 + off * 0.01;
  else if (prog == 10) q1 = p * 0.03 + off * 0.01 + vec2(0.0, uTime * 0.05);
  else if (prog == 11) q1 = p * 0.032 + off * 0.01 + vec2(uTime * 0.04, -uTime * 0.03);
  else if (prog == 12) q1 = p * 0.034 + off * 0.01 + vec2(-uTime * 0.02, uTime * 0.015);
  else if (prog == 13) q1 = p * 0.025 + off * 0.01 + vec2(uTime * 0.055, uTime * 0.035);
  else if (prog == 14) q1 = p * 0.028 + off * 0.01 + vec2(uTime * 0.045, -uTime * 0.025);
  else if (prog == 15) q1 = p * 0.024 + off * 0.01 + vec2(uTime * 0.015, -uTime * 0.01);
  float sn1 = snoise(q1);

  float sn2 = 0.0;
  if (prog == 1 || prog == 3 || prog == 10 || prog >= 12) {
    vec2 q2 = (p + 12.0 * vec2(sn1, sn1 * 0.7)) * 0.05 + 5.0;
    if (prog == 1) q2 = (p * 0.021 + off * 0.01) * 2.3 - vec2(uTime * 0.143, 0.0) + 7.1;
    else if (prog == 3) q2 = p * 0.065 + off * 0.01 + 3.3 + sn1 * 1.6;
    else if (prog >= 12) q2 = p * 0.052 + off * 0.01 + vec2(4.7, -3.1) + vec2(-uTime * 0.03, uTime * 0.02);
    sn2 = snoise(q2);
  }

  vec3 c;
  if (prog == 1) c = progAurora(m, p, sn1, sn2);
  else if (prog == 2) c = progHolo(m, p, flow, sn1);
  else if (prog == 3) c = progNebula(m, off, ip, edge, sn1, sn2);
  else if (prog == 4) c = progAmber(m, p, off, sn1);
  else if (prog == 5) c = progGlitter(m, p, off, sn1);
  else if (prog == 6) c = progWax(m, p, off, sn1);
  else if (prog == 7) c = progChalk(m, p, off, sn1);
  else if (prog == 8) c = progOpal(m, p, off, sn1);
  else if (prog == 9) c = progNeon(m, p, off, ip, sn1);
  else if (prog == 10) c = progBiolum(m, p, off, sn1, sn2);
  else if (prog == 11) c = progStrawberry(m, p, off, sn1);
  else if (prog == 12) c = progGlacier(m, p, off, sn1, sn2);
  else if (prog == 13) c = progCottonSwirl(m, p, off, sn1, sn2);
  else if (prog == 14) c = progDragonfly(m, p, flow, off, sn1, sn2);
  else c = progRoyalGold(m, p, off, sn1, sn2);
  return clamp(c, 0.0, 1.0);
}
`;
