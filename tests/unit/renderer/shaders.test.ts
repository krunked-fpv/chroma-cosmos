import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MATERIALS } from '../../../src/contracts/materials';
import { REGION_FLAG, SYSTEM_REGIONS } from '../../../src/contracts/regions';
import { MAX_STAMPS_PER_BATCH } from '../../../src/contracts/constants';
import { buildCompositeFrag, buildCurlFrag, buildStampFrag, QUAD_VERT } from '../../../src/shaders';
import { hexToRgb, vec3Hex } from '../../../src/shaders/glsl-util';
import { buildMaterialTables, buildPaletteTexData, PAL_TEX_H, PAL_TEX_W } from '../../../src/shaders/materials';

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
    expect(comp).toContain('texelFetch(uPalTex');
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
    const palBytes = new Uint8Array(PAL_TEX_W * PAL_TEX_H * 4);
    buildPaletteTexData(palBytes);
    for (const mat of MATERIALS) {
      const [r, g, b] = hexToRgb(mat.palette[0]!);
      const o = mat.id * PAL_TEX_W * 4;
      expect(palBytes[o]).toBe(Math.round(r * 255));
      expect(palBytes[o + 1]).toBe(Math.round(g * 255));
      expect(palBytes[o + 2]).toBe(Math.round(b * 255));
      expect(palBytes[o + 3]).toBe(255);
    }
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
    expect(comp).toContain('float edge = (hoverUncomp || guideUncomp || needWatercolorEdge) ? edgeAmount(ip, id) : 0.0;');
    const inkBlock = comp.slice(comp.indexOf('if (id == 0) {'), comp.indexOf('// ---- Layer 0 base by id class'));
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
    const inkBlock = comp.slice(comp.indexOf('if (id == 0) {'), comp.indexOf('// ---- Layer 0 base by id class'));
    expect(inkBlock).toContain('uToolMode == 1 && uWandGlow.w > 0.5');
    const ghostPreBlock = comp.slice(
      comp.indexOf('} else if (id >= 234 && id <= 254) {'),
      comp.indexOf('// ---- Layer 0 base by id class'),
    );
    expect(ghostPreBlock).toContain('if (!visible)');
    expect(ghostPreBlock).toContain('uToolMode == 1 && uWandGlow.w > 0.5');
    expect(ghostPreBlock).toContain('resolved = true;');
    // Soft peek resolves before full ghost base/paintability so FLAG_REVEALED / uFlashlight is not bypassed
    expect(comp.indexOf('wandPeekMix = 0.26')).toBeLessThan(comp.indexOf('base = mix(sky, ghostShimmer(pp), 0.5);'));
  });

  it('adds Sleepy Hush prologue mist veil and bottom-right dog-ear Star-Door light, suppressed when uClean = 1', () => {
    const overlays = comp.slice(comp.indexOf('vec3 applyPageOverlays('), comp.indexOf('void main()'));
    expect(overlays).toContain('if (uClean >= 0.5) return clamp(c, 0.0, 1.0);');
    expect(overlays).toContain('uPrologueMist > 0.001');
    expect(overlays).toContain('uDogEarGlow > 0.001 && pp.x > 426.0 && pp.y > 224.0');
    expect(overlays).toContain('(uRes - uOffset) / max(uScale, 0.001)');
    // Keepsake capture uClean >= 0.5 suppresses Wisp/Wonder-Whisper system IDs 231..233 in rid() and isActor
    const rid = comp.slice(comp.indexOf('int rid('), comp.indexOf('ivec4 regionRow0'));
    expect(rid).toContain('uClean < 0.5 || aid < 231 || aid > 233');
    expect(comp).toContain('uClean < 0.5 || actorId < 231 || actorId > 233');
    expect(comp).toContain('if (!isFixedMat && uClean < 0.5 && paintable && !complete)');
  });

  it('uses a single-exit composite main() with deduplicated AST calls (fast ANGLE/FXC cold-boot compile)', () => {
    const stripComments = (src: string): string => src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const cleanComp = stripComments(comp);
    const mainBody = cleanComp.slice(cleanComp.indexOf('void main()'));
    const countCalls = (src: string, fn: string): number => (src.match(new RegExp(`\\b${fn}\\s*\\(`, 'g')) ?? []).length;

    // Single-exit main(): zero early returns and exactly one applyPageOverlays() call at the end
    expect(mainBody).not.toMatch(/\breturn\b/);
    expect(countCalls(mainBody, 'applyPageOverlays')).toBe(1);
    expect(countCalls(cleanComp, 'applyPageOverlays')).toBe(2); // 1 definition + 1 call

    // Heavy helpers invoked at most once across the entire composite shader
    expect(countCalls(mainBody, 'skyColor')).toBe(1);
    expect(countCalls(cleanComp, 'skyColor')).toBe(2); // 1 definition + 1 call
    expect(countCalls(mainBody, 'edgeAmount')).toBe(1);
    expect(countCalls(cleanComp, 'edgeAmount')).toBe(2); // 1 definition + 1 call
    expect(countCalls(mainBody, 'shadeMaterial')).toBe(1);
    expect(countCalls(cleanComp, 'shadeMaterial')).toBe(2); // 1 definition + 1 call
    expect(countCalls(cleanComp, 'snoise')).toBe(3); // 1 definition + 2 shared calls across all 10 material programs

    // Renderer guards redundant synchronous validateProgram() pass behind import.meta.env.DEV
    const rendererSrc = readFileSync(resolve(process.cwd(), 'src/renderer/index.ts'), 'utf8');
    const devGuardIdx = rendererSrc.indexOf('if (import.meta.env.DEV)');
    const validateIdx = rendererSrc.indexOf('validateProgram(gl, name, src)');
    expect(devGuardIdx).toBeGreaterThan(0);
    expect(validateIdx).toBeGreaterThan(devGuardIdx);
  });

  it('renders bright luminous Wonder Whispers (fx == -6) and rich Wisp core/aura (fx == -4/-5)', () => {
    const fixedBlock = comp.slice(comp.indexOf('vec3 fixedColor('), comp.indexOf('vec3 applyPageOverlays('));
    // Wonder Whispers: no dark indigo #3b2d5c; warm cream-gold (#fff3c4 -> #ffe082) & moonlight lavender (#ddd0ff -> #b5e8ff)
    expect(fixedBlock).not.toContain(vec3Hex('#3b2d5c'));
    expect(fixedBlock).toContain(vec3Hex('#fff3c4'));
    expect(fixedBlock).toContain(vec3Hex('#ffe082'));
    expect(fixedBlock).toContain(vec3Hex('#ddd0ff'));
    expect(fixedBlock).toContain(vec3Hex('#b5e8ff'));
    // Wisp core (#fff7d6 -> #ffd56b) & vivid violet-amber fairy aura (#a87eff <-> #ffbe55)
    expect(fixedBlock).toContain(vec3Hex('#fff7d6'));
    expect(fixedBlock).toContain(vec3Hex('#ffd56b'));
    expect(fixedBlock).toContain(vec3Hex('#a87eff'));
    expect(fixedBlock).toContain(vec3Hex('#ffbe55'));
  });

  it('renders seamless heirloom cotton sketchbook margin with ink & gold plate hairlines outside [0..480, 0..270]', () => {
    const mainBody = comp.slice(comp.indexOf('void main()'));
    const marginBlock = mainBody.slice(mainBody.indexOf('if (outOfPage)'), mainBody.indexOf('ivec2 ip = ivec2(floor(pp));'));
    expect(marginBlock).toContain('if (uClean >= 0.5)');
    expect(marginBlock).toContain('PAPER *');
    expect(marginBlock).toContain('distOut <= 1.0');
    expect(marginBlock).toContain('mix(col, INK,');
    expect(marginBlock).toContain('distOut >= 3.0 && distOut < 4.0');
    expect(marginBlock).toContain(vec3Hex('#d9ae5b'));
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
    const inkEnd = comp.indexOf('// ---- Layer 0 base by id class');
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
    expect(inkBlock).toContain('if (!isActor && !touchesRegular && touchesGhost && !ghostVisible)');
    expect(inkBlock).toContain('needSky = true;');
  });

  it('colour helpers', () => {
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
    expect(hexToRgb('#0f0')).toEqual([0, 1, 0]);
    expect(vec3Hex('#231942')).toMatch(/^vec3\(0\.1372\d*,0\.0980\d*,0\.2588\d*\)$/);
  });
});
