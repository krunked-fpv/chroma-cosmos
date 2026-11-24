import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MATERIALS } from '../../../src/contracts/materials';
import { REGION_FLAG, SYSTEM_REGIONS } from '../../../src/contracts/regions';
import { MAX_STAMPS_PER_BATCH } from '../../../src/contracts/constants';
import { buildCompositeFrag, buildCurlFrag, buildStampFrag, QUAD_VERT } from '../../../src/shaders';
import { hexToRgb, vec3Hex } from '../../../src/shaders/glsl-util';
import { buildMaterialTables } from '../../../src/shaders/materials';

const balanced = (s: string, open: string, close: string): boolean => {
  let d = 0;
  for (const c of s) {
    if (c === open) d++;
    if (c === close) d--;
    if (d < 0) return false;
  }
  return d === 0;
};

describe('GLSL sources (static checks; real compile is verified in the live lab)', () => {
  const comp = buildCompositeFrag();
  const stamp = buildStampFrag();
  const curl = buildCurlFrag();

  it('are GLSL ES 3.00 with balanced braces/parens', () => {
    for (const src of [QUAD_VERT, comp, stamp, curl]) {
      expect(src.startsWith('#version 300 es')).toBe(true);
      expect(balanced(src, '{', '}')).toBe(true);
      expect(balanced(src, '(', ')')).toBe(true);
    }
    expect(comp).toContain('out vec4 fragColor');
  });

  it('use texelFetch for every pixel-art lookup and never bilinear texture()', () => {
    expect(comp).toContain('texelFetch(uRegionTex');
    expect(comp).toContain('texelFetch(uActorTex');
    expect(comp).toContain('texelFetch(uRegionStateTex');
    expect(comp).toContain('texelFetch(uStrokeTex');
    expect(comp).not.toMatch(/\btexture\s*\(/);
    expect(stamp).not.toMatch(/\btexture\s*\(/);
    expect(stamp).toContain('texelFetch(uRegionTex');
    expect(stamp).toContain('texelFetch(uAllowedTex');
  });

  it('decodes ids with the documented rule and resolves actor > live base > static', () => {
    expect(comp).toContain('int(floor(v * 255.0 + 0.5))');
    const rid = comp.slice(comp.indexOf('int rid('), comp.indexOf('ivec4 regionRow0'));
    expect(rid.indexOf('uActorTex')).toBeLessThan(rid.indexOf('uLiveSlots'));
    expect(rid).toContain('uLiveSlots >> slot');
    expect(rid).toContain('decodeId(r.g)');
  });

  it('branches on all ten programs and the palette tables cover all 12 materials', () => {
    for (let p = 1; p <= 9; p++) expect(comp).toContain(`prog == ${p}`);
    expect(comp).toContain('progBiolum');
    const tables = buildMaterialTables();
    expect(tables).toContain(`const int PROG[${MATERIALS.length + 1}]`);
    const progs = /const int PROG\[\d+\] = int\[\d+\]\(([^)]*)\)/.exec(tables)![1]!.split(',').map(Number);
    expect(progs).toEqual([0, ...MATERIALS.map((m) => m.program)]);
    expect(progs[11]).toBe(4); // 24K Solar Flare reuses program 4
    expect(progs[12]).toBe(1); // Aurora Sherbet reuses program 1
  });

  it('embeds the SYSTEM_REGIONS fixed materials and special tokens including 231..233', () => {
    for (const r of SYSTEM_REGIONS) expect(comp).toContain(`if (id == ${r.id}) return`);
    expect(comp).toContain('if (id == 212) return -1;'); // eyeShine
    expect(comp).toContain('if (id == 213) return -2;'); // blush
    expect(comp).toContain('if (id == 214) return -3;'); // selected
    expect(comp).toContain('if (id == 216) return 2;'); // violet cape = holo foil
    expect(comp).toContain('if (id == 231) return -4;'); // wispCore
    expect(comp).toContain('if (id == 232) return -5;'); // wispAura
    expect(comp).toContain('if (id == 233) return -6;'); // wonderChalk
    const fixedBlock = comp.slice(comp.indexOf('vec3 fixedColor('), comp.indexOf('vec3 applyPageOverlays('));
    expect(fixedBlock).toContain('if (fx == -4)');
    expect(fixedBlock).toContain('if (fx == -5)');
    expect(fixedBlock).toContain('if (fx == -6)');
    expect(fixedBlock).toContain('gFxVar');
  });

  it('declares and uses all new interactive uniforms with exact renderer bindings (zero unused/mismatched)', () => {
    for (const decl of [
      'uniform int uHoverRegion;',
      'uniform int uToolMode;',
      'uniform vec4 uWandGlow;',
      'uniform float uPrologueMist;',
      'uniform float uDogEarGlow;',
    ]) {
      expect(comp).toContain(decl);
    }
    const uniformMatches = [...comp.matchAll(/^uniform\s+(?:sampler2D|vec[234]|float|int)\s+(\w+)(?:\[[^\]]+\])?;/gm)];
    expect(uniformMatches.length).toBeGreaterThanOrEqual(24);
    const rendererSrc = readFileSync(resolve(process.cwd(), 'src/renderer/index.ts'), 'utf8');
    const compUniformsStart = rendererSrc.indexOf('const compUniforms = {');
    const compUniformsEnd = rendererSrc.indexOf('const stampUniforms = {', compUniformsStart);
    const compBlock = rendererSrc.slice(compUniformsStart, compUniformsEnd);
    for (const m of uniformMatches) {
      const name = m[1]!;
      const occurrences = comp.match(new RegExp(`\\b${name}\\b`, 'g'))?.length ?? 0;
      expect(occurrences, `uniform ${name} should be used in composite shader`).toBeGreaterThan(1);
      expect(compBlock, `uniform ${name} should be bound in renderer/index.ts`).toContain(`${name}:`);
    }
  });

  it('handles Enchanted Pencil hover shimmer and idle guideGlow breathing on ink and interior', () => {
    expect(comp).toContain(`const int FLAG_GUIDE_GLOW = ${REGION_FLAG.guideGlow};`);
    expect(comp).toContain('uToolMode == 0 && uHoverRegion > 0 && id == uHoverRegion');
    expect(comp).toContain('mix(base, vec3(1.0, 0.94, 0.74), pulse)');
    expect(comp).toContain('float innerEdge = edgeAmount(ip, id);');
    const inkBlock = comp.slice(comp.indexOf('if (id == 0) {'), comp.indexOf('// ---- Layer 0 base by id class ----'));
    expect(inkBlock).toContain('FLAG_GUIDE_GLOW');
    expect(inkBlock).toContain('sin(uTime * 3.2');
    const postBase = comp.slice(comp.indexOf('// ---- Layers 1 + 2:'));
    expect(postBase).toContain('hasFlag(s0.a, FLAG_GUIDE_GLOW)');
    expect(postBase).toContain('sin(uTime * 3.2)');
  });

  it('adds Starlight Wand sky stardust shimmer and soft UV ghost peek without bypassing flashlight/revealed', () => {
    const skyBlock = comp.slice(comp.indexOf('vec3 skyColor('), comp.indexOf('vec3 ghostShimmer('));
    expect(skyBlock).toContain('uToolMode == 1');
    expect(skyBlock).toContain('uWandGlow.w > 0.5');
    expect(skyBlock).toContain('uWandGlow.xy');
    const inkBlock = comp.slice(comp.indexOf('if (id == 0) {'), comp.indexOf('// ---- Layer 0 base by id class ----'));
    expect(inkBlock).toContain('uToolMode == 1 && uWandGlow.w > 0.5');
    const ghostBlock = comp.slice(comp.indexOf('} else if (id >= 234 && id <= 254) {'), comp.indexOf('} else if (id >= 212 && id <= 233) {'));
    expect(ghostBlock).toContain('if (!visible)');
    expect(ghostBlock).toContain('uToolMode == 1 && uWandGlow.w > 0.5');
    // Soft peek returns early before full ghost base/paintability so FLAG_REVEALED / uFlashlight is not bypassed
    expect(ghostBlock.indexOf('uWandGlow.w > 0.5')).toBeLessThan(ghostBlock.indexOf('base = mix(skyColor(pp, ip), ghostShimmer(pp), 0.5);'));
  });

  it('adds Sleepy Hush prologue mist veil and bottom-right dog-ear Star-Door light, suppressed when uClean = 1', () => {
    const overlays = comp.slice(comp.indexOf('vec3 applyPageOverlays('), comp.indexOf('void main()'));
    expect(overlays).toContain('if (uClean >= 0.5) return clamp(c, 0.0, 1.0);');
    expect(overlays).toContain('uPrologueMist > 0.001');
    expect(overlays).toContain('uDogEarGlow > 0.001 && pp.x > 426.0 && pp.y > 224.0');
    // Keepsake capture uClean >= 0.5 suppresses Wisp/Wonder-Whisper system IDs 231..233 in rid() and isActor
    const rid = comp.slice(comp.indexOf('int rid('), comp.indexOf('ivec4 regionRow0'));
    expect(rid).toContain('uClean < 0.5 || aid < 231 || aid > 233');
    expect(comp).toContain('uClean < 0.5 || actorId < 231 || actorId > 233');
    expect(comp).toContain('if (uClean < 0.5 && paintable && !complete)');
  });

  it('declares the stamp batch arrays with the contract limit', () => {
    expect(stamp).toContain(`uStampA[${MAX_STAMPS_PER_BATCH}]`);
    expect(stamp).toContain(`uStampB[${MAX_STAMPS_PER_BATCH}]`);
  });

  it('suppresses vacated actor-slot strokes so moved actors do not leave ghosted silhouettes', () => {
    expect(comp).toContain('int baseSlot = decodeId(texelFetch(uRegionTex, ip, 0).b);');
    expect(comp).toContain('bool vacatedSlot = !isActor && baseSlot > 0 && (((uLiveSlots >> baseSlot) & 1) == 1);');
    expect(comp).toContain('if (!vacatedSlot || (id != 255 && s0.g > 0 && !complete))');
    expect(comp).toContain('svMat == s0.r');
  });

  it('hides unrevealed ghost ink outlines in the id == 0 ink branch', () => {
    const inkStart = comp.indexOf('if (id == 0) {');
    const inkEnd = comp.indexOf('// ---- Layer 0 base by id class ----');
    expect(inkStart).toBeGreaterThan(0);
    expect(inkEnd).toBeGreaterThan(inkStart);
    const inkBlock = comp.slice(inkStart, inkEnd);
    expect(inkBlock).toContain('rid(ip + ivec2(1, -1))');
    expect(inkBlock).toContain('rid(ip + ivec2(-1, -1))');
    expect(inkBlock).toContain('rid(ip + ivec2(1, 1))');
    expect(inkBlock).toContain('rid(ip + ivec2(-1, 1))');
    expect(inkBlock).toContain('bool touchesRegular = false;');
    expect(inkBlock).toContain('bool touchesGhost = false;');
    expect(inkBlock).toContain('bool ghostVisible = false;');
    expect(inkBlock).toContain('FLAG_REVEALED');
    expect(inkBlock).toContain('uFlashlight.w > 0.5');
    expect(inkBlock).toContain('if (!touchesRegular && touchesGhost && !ghostVisible)');
    expect(inkBlock).toContain('fragColor = vec4(skyColor(pp, ip), 1.0);');
  });

  it('colour helpers', () => {
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
    expect(hexToRgb('#0f0')).toEqual([0, 1, 0]);
    expect(vec3Hex('#231942')).toMatch(/^vec3\(0\.1372\d*,0\.0980\d*,0\.2588\d*\)$/);
  });
});
