import { describe, expect, it } from 'vitest';
import { MATERIALS } from '../../../src/contracts/materials';
import { SYSTEM_REGIONS } from '../../../src/contracts/regions';
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

  it('embeds the SYSTEM_REGIONS fixed materials and special tokens', () => {
    for (const r of SYSTEM_REGIONS) expect(comp).toContain(`if (id == ${r.id}) return`);
    expect(comp).toContain('if (id == 212) return -1;'); // eyeShine
    expect(comp).toContain('if (id == 213) return -2;'); // blush
    expect(comp).toContain('if (id == 214) return -3;'); // selected
    expect(comp).toContain('if (id == 216) return 2;'); // violet cape = holo foil
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
