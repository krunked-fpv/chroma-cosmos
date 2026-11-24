/**
 * Layer 2 - GLSL pigment materials. One unified `shadeMaterial()` that branches on the program id (1..10).
 * Every program uses at most two noise octaves. Palettes come straight from the MATERIALS contract.
 * Expects the including shader to declare: uTime, uBeat, uSparkle[8], uSparkleN and gFxVar.
 */
import { MATERIALS } from '../contracts/materials';
import { f, hexToRgb } from './glsl-util';

export const MAX_PALETTE = 8;
export const PAL_TEX_W = MAX_PALETTE;
export const PAL_TEX_H = 16;

/** Populates an 8x16 RGBA8 palette lookup texture from the MATERIALS contract (row m = material id, col i = stop). */
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

vec3 shadeMaterial(int m, vec2 p, ivec2 ip, vec2 flow, float edge, vec2 off) {
  int prog = PROG[m];
  // Shared simplex noise evaluation (2 call sites instead of 13 inlined copies across programs)
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
  float sn1 = snoise(q1);

  float sn2 = 0.0;
  if (prog == 1 || prog == 3 || prog == 10) {
    vec2 q2 = (p + 12.0 * vec2(sn1, sn1 * 0.7)) * 0.05 + 5.0;
    if (prog == 1) q2 = (p * 0.021 + off * 0.01) * 2.3 - vec2(uTime * 0.143, 0.0) + 7.1;
    else if (prog == 3) q2 = p * 0.065 + off * 0.01 + 3.3 + sn1 * 1.6;
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
  else c = progBiolum(m, p, off, sn1, sn2);
  return clamp(c, 0.0, 1.0);
}
`;
