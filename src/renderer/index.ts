/**
 * PixiJS v8 / WebGL2 4-layer Hi-Bit compositor (RendererPort).
 * See ARCHITECTURE.md section 2 and 3. All pixel-art lookups are texelFetch + NEAREST.
 */
import {
  Application,
  Container,
  Mesh,
  Particle,
  ParticleContainer,
  RenderTexture,
  Texture,
} from 'pixi.js';
import type { MeshGeometry, Shader } from 'pixi.js';
import type { FrameInput, RendererPort, RendererStats } from '../contracts/renderer';
import type { CompiledPage, SpriteLibrary, SpriteSheet } from '../contracts/art';
import type { GpuStampBatch } from '../contracts/simulation';
import type { UniverseAmbientKind } from '../contracts/universes';
import { MAX_STAMPS_PER_BATCH, PAGE_H, PAGE_TURN_MS, PAGE_W, PAPER_HEX, WAND_UV_PEEK_RADIUS } from '../contracts/constants';
import { REGION_FLAG, REGION_STATE_BYTES, REGION_STATE_H, REGION_STATE_W } from '../contracts/regions';
import {
  MAX_SPARKLES,
  PAL_TEX_H,
  PAL_TEX_W,
  STROKE_RT_H,
  STROKE_RT_W,
  buildCompositeFrag,
  buildCurlFrag,
  buildPaletteTexData,
  buildStampFrag,
  hexToRgb,
} from '../shaders';
import { AdaptiveResolution, initialResolution } from './adaptive';
import {
  rasterizeEffects,
  rasterizePokeInvites,
  rasterizeWispGhostStroke,
  rasterizeWonderWhisper,
} from './fx';
import { DataTexture, createQuadGeometry, createShader, glOf, validateProgram } from './gpu';
import { blitActors, blitWisp, buildRegionTexData, liveSlotMask } from './pageData';
import { MAX_PARTICLES, particlesForAmbient, particlesForEffect, particlesForPokeInvites, particlesForWisp } from './particles';
import type { PixelParticle } from './particles';
import { PixelPlane } from './pixelPlane';
import { easeInOut, clamp01 } from './rng';
import { RtPool } from './rtPool';
import { packStampBatches, splitStampBatches, writeAllowedTexture } from './stampPacking';
import { clientToInternalPure, computeFit, internalToClientPure } from './fit';
import type { Fit } from './fit';

type QuadMesh = Mesh<MeshGeometry, Shader>;
type Uniforms = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const v2 = (): { value: Float32Array; type: 'vec2<f32>' } => ({ value: new Float32Array(2), type: 'vec2<f32>' });
const v3 = (): { value: Float32Array; type: 'vec3<f32>' } => ({ value: new Float32Array(3), type: 'vec3<f32>' });

export function createRenderer(): RendererPort {
  // ---- state ----
  let app: Application | null = null;
  let host: HTMLElement | null = null;
  let resizeObs: ResizeObserver | null = null;
  const viewportOffs: Array<() => void> = [];
  let fit: Fit = computeFit(PAGE_W * 2, PAGE_H * 2);
  let adaptive = new AdaptiveResolution(1);
  let resolution = 1;
  let contextLost = false;
  let destroyed = false;
  let turning = false;
  let rafId = 0;
  let running = false;
  let drawCalls = 0;
  let frameDrawCalls = 0;
  const shaderErrors: string[] = [];

  let page: CompiledPage | null = null;
  let pageAmbient: UniverseAmbientKind = 'stardust';
  let sprites: SpriteLibrary | null = null;
  let wispSheet: SpriteSheet | null = null;
  let needsReseed = false;
  let lastFrame: FrameInput | null = null;

  // GPU objects (created in init)
  let regionTex: DataTexture | null = null;
  let actorTex: DataTexture | null = null;
  let stateTex: DataTexture | null = null;
  let allowedTex: DataTexture | null = null;
  let palTex: DataTexture | null = null;
  let particleTex: DataTexture | null = null;
  let compShader: Shader | null = null;
  let stampShader: Shader | null = null;
  let curlShader: Shader | null = null;
  let compMeshStage: QuadMesh | null = null;
  let compMeshRt: QuadMesh | null = null;
  let stampMesh: QuadMesh | null = null;
  let curlMesh: QuadMesh | null = null;
  let particles: ParticleContainer | null = null;
  const particleObjs: Particle[] = [];
  let pool: RtPool<RenderTexture> | null = null;
  let strokeA: RenderTexture | null = null;
  let strokeB: RenderTexture | null = null;
  let strokeCur: 'A' | 'B' = 'A';
  let cu: Uniforms = {};
  let su: Uniforms = {};
  let lu: Uniforms = {};
  const plane = new PixelPlane();
  let planeWasDirty = false;
  let planeHasGuides = false;
  const particleScratch: PixelParticle[] = [];
  const targetScratch = { w: 0, h: 0, offX: 0, offY: 0, scale: 1, flip: false, clean: false };
  const sparkleArr = new Float32Array(MAX_SPARKLES * 2);
  const skyTop = new Float32Array([0.07, 0.05, 0.17]);
  const skyBot = new Float32Array([0.16, 0.1, 0.3]);
  const mistCol = new Float32Array(hexToRgb('#6b5b8a'));
  const stampA = new Float32Array(MAX_STAMPS_PER_BATCH * 4);
  const stampB = new Float32Array(MAX_STAMPS_PER_BATCH * 4);

  const canvas = (): HTMLCanvasElement => (app as Application).canvas as HTMLCanvasElement;
  const renderer = () => (app as Application).renderer;

  // ---- layout ----
  function refit(): void {
    if (!app) return;
    fit = computeFit(canvas().width, canvas().height);
    resolution = renderer().resolution;
    layoutParticles();
  }

  function resizeToHost(): void {
    if (!app || !host) return;
    const w = Math.max(1, Math.floor(host.clientWidth));
    const h = Math.max(1, Math.floor(host.clientHeight));
    renderer().resize(w, h, resolution);
    refit();
    if (lastFrame && !turning && !contextLost) drawStage();
  }

  function setResolution(res: number): void {
    resolution = res;
    resizeToHost();
  }

  // ---- uniform plumbing ----
  function setUniform(name: string, v: number): void {
    cu[name] = v;
  }

  function applyCompositeUniforms(f: FrameInput, timeSec: number, target: { w: number; h: number; offX: number; offY: number; scale: number; flip: boolean; clean: boolean }): void {
    (cu.uRes as Float32Array)[0] = target.w;
    (cu.uRes as Float32Array)[1] = target.h;
    (cu.uOffset as Float32Array)[0] = target.offX;
    (cu.uOffset as Float32Array)[1] = target.offY;
    setUniform('uScale', target.scale);
    setUniform('uTime', timeSec);
    setUniform('uBeat', f.beatPhase);
    setUniform('uAwakening', clamp01(f.view.pageAwakening));
    setUniform('uClean', target.clean ? 1 : 0);
    setUniform('uFlipY', target.flip ? 1 : 0);
    setUniform('uSelected', f.selectedMaterial);
    setUniform('uLiveSlots', liveSlotMask(f.view.actors));

    const interactive = !target.clean && f.mode !== 'book';
    const toolModeInt =
      interactive && (f.toolMode === 'wand' || (f.toolMode === undefined && !!f.view.wandGlow)) ? 1 : 0;
    setUniform('uToolMode', toolModeInt);

    let hoverId = 0;
    if (interactive && toolModeInt === 0) {
      if (f.view.hoveredRegionId !== undefined) {
        const raw = Math.floor(f.view.hoveredRegionId);
        hoverId = (raw >= 1 && raw <= 199) || (raw >= 234 && raw <= 254) ? raw : 0;
      } else if (f.hoverPos && page && Number.isFinite(f.hoverPos.x) && Number.isFinite(f.hoverPos.y)) {
        const hx = Math.floor(f.hoverPos.x);
        const hy = Math.floor(f.hoverPos.y);
        if (hx >= 0 && hy >= 0 && hx < PAGE_W && hy < PAGE_H) {
          const rid = page.regionMap[hy * PAGE_W + hx] ?? 0;
          if (rid >= 1 && rid <= 199) hoverId = rid;
        }
      }
    }
    setUniform('uHoverRegion', hoverId);

    const fl = f.view.uvFlashlight;
    const flu = cu.uFlashlight as Float32Array;
    flu[0] = fl ? fl.x : 0;
    flu[1] = fl ? fl.y : 0;
    flu[2] = fl ? fl.r : 0;
    flu[3] = fl ? 1 : 0;

    const wgu = cu.uWandGlow as Float32Array;
    const wg = interactive ? f.view.wandGlow : null;
    if (wg && Number.isFinite(wg.x) && Number.isFinite(wg.y)) {
      wgu[0] = wg.x;
      wgu[1] = wg.y;
      wgu[2] = Number.isFinite(wg.r) ? Math.max(0, wg.r) : WAND_UV_PEEK_RADIUS;
      wgu[3] = 1;
    } else if (interactive && toolModeInt === 1 && f.hoverPos && Number.isFinite(f.hoverPos.x) && Number.isFinite(f.hoverPos.y)) {
      wgu[0] = f.hoverPos.x;
      wgu[1] = f.hoverPos.y;
      wgu[2] = WAND_UV_PEEK_RADIUS;
      wgu[3] = 1;
    } else {
      wgu[0] = 0;
      wgu[1] = 0;
      wgu[2] = 0;
      wgu[3] = 0;
    }

    setUniform('uPrologueMist', interactive && f.view.wisp ? clamp01(f.view.wisp.prologueMist) : 0);
    setUniform('uDogEarGlow', interactive ? clamp01(f.dogEarGlow ?? (f.view.pageComplete && f.mode === 'chapter' ? 1 : 0)) : 0);
    setUniform('uHintDim', interactive && !turning ? clamp01(f.hintDim ?? f.view.hintState?.dimAmount ?? 0) : 0);

    const n = Math.min(MAX_SPARKLES, f.view.sparkleSources.length);
    sparkleArr.fill(0);
    for (let i = 0; i < n; i++) {
      const s = f.view.sparkleSources[i] as { x: number; y: number };
      sparkleArr[i * 2] = s.x;
      sparkleArr[i * 2 + 1] = s.y;
    }
    setUniform('uSparkleN', n);
    (cu.uSkyTop as Float32Array).set(skyTop);
    (cu.uSkyBot as Float32Array).set(skyBot);
    (cu.uMist as Float32Array).set(mistCol);
  }

  function screenTarget(): { w: number; h: number; offX: number; offY: number; scale: number; flip: boolean; clean: boolean } {
    targetScratch.w = canvas().width;
    targetScratch.h = canvas().height;
    targetScratch.offX = fit.offX;
    targetScratch.offY = fit.offY;
    targetScratch.scale = fit.scale;
    targetScratch.flip = false;
    targetScratch.clean = false;
    return targetScratch;
  }

  // ---- stroke RT ----
  function strokeSrc(): RenderTexture {
    return (strokeCur === 'A' ? strokeA : strokeB) as RenderTexture;
  }
  function strokeDst(): RenderTexture {
    return (strokeCur === 'A' ? strokeB : strokeA) as RenderTexture;
  }

  function clearRt(rt: RenderTexture): void {
    renderer().render({ container: new Container(), target: rt, clear: true, clearColor: [0, 0, 0, 0] });
    frameDrawCalls++;
  }

  function runStampBatch(batch: GpuStampBatch): void {
    if (!stampShader || !stampMesh || !allowedTex) return;
    const packed = packStampBatches([batch])[0];
    if (!packed || packed.count === 0) return;
    writeAllowedTexture(packed.allowed, allowedTex.data);
    allowedTex.update();
    (su.uStampA as Float32Array).set(packed.a);
    (su.uStampB as Float32Array).set(packed.b);
    su.uCount = packed.count;
    (stampShader.resources as Record<string, unknown>).uPrev = strokeSrc().source;
    renderer().render({ container: stampMesh, target: strokeDst(), clear: false });
    strokeCur = strokeCur === 'A' ? 'B' : 'A';
    frameDrawCalls++;
  }

  function stampBatches(batches: readonly GpuStampBatch[]): void {
    for (const b of splitStampBatches(batches)) runStampBatch(b);
  }

  /** Stamps full coverage for completed / pre-coloured regions, grouped by material. */
  function reseedStroke(state: Uint8Array | null): void {
    if (!page) return;
    const byMat = new Map<number, Uint8Array>();
    const add = (mat: number, id: number): void => {
      let a = byMat.get(mat);
      if (!a) {
        a = new Uint8Array(256);
        byMat.set(mat, a);
      }
      a[id] = 1;
    };
    if (state) {
      for (let id = 1; id < 255; id++) {
        const flags = state[id * 4 + 3] ?? 0;
        const mat = state[id * 4] ?? 0;
        if ((flags & REGION_FLAG.complete) !== 0 && mat > 0) add(mat, id);
      }
    }
    for (const pc of page.preColored ?? []) add(pc.materialId, pc.id);
    for (const [mat, allowed] of byMat) {
      runStampBatch({
        allowed,
        stamps: [{ x: PAGE_W / 2, y: PAGE_H / 2, radius: 4000, materialId: mat, dx: 0, dy: 0, strength: 1 }],
      });
    }
  }

  // ---- particles ----
  function layoutParticles(): void {
    for (const p of particleObjs) {
      p.scaleX = fit.scale / resolution;
      p.scaleY = fit.scale / resolution;
    }
  }

  function updateParticles(f: FrameInput): void {
    if (!particles) return;
    particleScratch.length = 0;
    for (const e of f.view.effects) particlesForEffect(e, particleScratch);
    if (f.mode !== 'book') {
      particlesForWisp(f.view.wisp, f.timeMs, particleScratch);
      particlesForPokeInvites(f.view.pokeInvites, f.timeMs, particleScratch);
      particlesForAmbient(pageAmbient, f.timeMs, f.view.pageAwakening, particleScratch);
    }
    const n = Math.min(particleScratch.length, MAX_PARTICLES);
    for (let i = 0; i < particleObjs.length; i++) {
      const p = particleObjs[i] as Particle;
      if (i < n) {
        const q = particleScratch[i] as PixelParticle;
        const ix = Math.floor(q.x);
        const iy = Math.floor(q.y);
        // 3x3 star centred on internal pixel (ix, iy), snapped to the internal pixel grid
        p.x = (fit.offX + (ix - 1) * fit.scale) / resolution;
        p.y = (fit.offY + (iy - 1) * fit.scale) / resolution;
        p.tint = q.color;
        p.alpha = q.alpha;
      } else {
        p.alpha = 0;
      }
    }
  }

  // ---- drawing ----
  function drawStage(): void {
    if (!app || contextLost) return;
    renderer().render(app.stage);
    frameDrawCalls += 2;
  }

  function renderCompositeTo(rt: RenderTexture): void {
    if (!compMeshRt) return;
    renderer().render({ container: compMeshRt, target: rt, clear: false });
    frameDrawCalls++;
  }

  function beginFrame(): void {
    frameDrawCalls = 0;
  }

  function endFrame(): void {
    drawCalls = frameDrawCalls;
  }

  function applyFrame(f: FrameInput): void {
    if (!app || !page || !stateTex || !actorTex) return;
    // region state (2048 bytes straight from SimView.regionState)
    const src = f.view.regionState;
    const n = Math.min(src.length, REGION_STATE_BYTES);
    stateTex.data.set(n === src.length ? src : src.subarray(0, n));
    stateTex.update();
    if (needsReseed) {
      needsReseed = false;
      reseedStroke(stateTex.data);
    }
    if (f.stampBatches.length > 0) stampBatches(f.stampBatches);
    // actor plane: live sprites + FX pixels + interactive guide overlays
    plane.clear();
    if (sprites) blitActors(plane, sprites, f.view.actors);
    rasterizeEffects(plane, f.view.effects);
    const hasGuides =
      f.mode !== 'book' &&
      (!!f.view.wonderWhisper ||
        (!!f.view.pokeInvites && f.view.pokeInvites.length > 0) ||
        (!!f.view.wisp && f.view.wisp.active && f.view.wisp.mode !== 'hidden'));
    if (hasGuides) {
      rasterizeWonderWhisper(plane, f.view.wonderWhisper, f.timeMs, f.wonderSketch);
      rasterizePokeInvites(plane, f.view.pokeInvites, f.timeMs);
      rasterizeWispGhostStroke(plane, f.view.wisp, f.timeMs);
      blitWisp(plane, f.view.wisp, wispSheet, f.timeMs);
    }
    if (plane.count > 0 || planeWasDirty) {
      actorTex.data.set(plane.data);
      actorTex.update();
    }
    planeWasDirty = plane.count > 0;
    planeHasGuides = hasGuides;
    updateParticles(f);
    applyCompositeUniforms(f, f.timeMs / 1000, screenTarget());
  }

  // ---- init ----
  async function init(h: HTMLElement): Promise<{ webgl2: boolean }> {
    host = h;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    resolution = initialResolution(dpr);
    adaptive = new AdaptiveResolution(resolution);
    const a = new Application();
    try {
      await a.init({
        preference: 'webgl',
        preferWebGLVersion: 2,
        antialias: false,
        autoDensity: true,
        resolution,
        background: PAPER_HEX,
        width: Math.max(1, h.clientWidth),
        height: Math.max(1, h.clientHeight),
        autoStart: false,
        sharedTicker: false,
        powerPreference: 'high-performance',
        hello: false,
      });
    } catch {
      try {
        a.destroy(true);
      } catch {
        /* ignore */
      }
      return { webgl2: false };
    }
    const r = a.renderer as unknown as { gl?: WebGL2RenderingContext; context?: { webGLVersion?: number } };
    const isGl2 = !!r.gl && typeof WebGL2RenderingContext !== 'undefined' && r.gl instanceof WebGL2RenderingContext;
    if (!isGl2 || (r.context && r.context.webGLVersion !== undefined && r.context.webGLVersion !== 2)) {
      a.destroy(true);
      return { webgl2: false };
    }
    app = a;
    a.ticker.stop();
    const cv = a.canvas as HTMLCanvasElement;
    cv.style.display = 'block';
    cv.style.touchAction = 'none';
    cv.addEventListener('webglcontextlost', onContextLost as EventListener, false);
    cv.addEventListener('webglcontextrestored', onContextRestored as EventListener, false);
    h.appendChild(cv);

    // data textures
    regionTex = new DataTexture(PAGE_W, PAGE_H);
    actorTex = new DataTexture(PAGE_W, PAGE_H);
    stateTex = new DataTexture(REGION_STATE_W, REGION_STATE_H);
    allowedTex = new DataTexture(256, 1);
    palTex = new DataTexture(PAL_TEX_W, PAL_TEX_H);
    buildPaletteTexData(palTex.data);
    palTex.update();
    particleTex = new DataTexture(3, 3);
    {
      // 3x3 pixel star (plus shape + soft corners)
      const px = [0, 1, 0, 1, 1, 1, 0, 1, 0];
      px.forEach((on, i) => {
        const o = i * 4;
        const d = particleTex!.data;
        d[o] = 255;
        d[o + 1] = 255;
        d[o + 2] = 255;
        d[o + 3] = on ? 255 : 0;
      });
      particleTex.update();
    }
    for (let i = 0; i < actorTex.data.length; i += 4) actorTex.data[i + 3] = 0;
    stateTex.update();
    allowedTex.update();

    // stroke render textures come from the pool
    pool = new RtPool<RenderTexture>({
      create: (w, hh) =>
        RenderTexture.create({ width: w, height: hh, resolution: 1, scaleMode: 'nearest', antialias: false }),
      destroy: (rt) => rt.destroy(true),
    });
    strokeA = pool.acquire(STROKE_RT_W, STROKE_RT_H);
    strokeB = pool.acquire(STROKE_RT_W, STROKE_RT_H);
    strokeA.source.scaleMode = 'linear';
    strokeB.source.scaleMode = 'linear';

    // shaders (only run extra synchronous validateProgram pass in DEV so production cold boot compiles once)
    const compFrag = buildCompositeFrag();
    const stampFrag = buildStampFrag();
    const curlFrag = buildCurlFrag();
    if (import.meta.env.DEV) {
      const gl = glOf(a.renderer as never);
      for (const [name, src] of [
        ['composite', compFrag],
        ['stamp', stampFrag],
        ['curl', curlFrag],
      ] as const) {
        const err = validateProgram(gl, name, src);
        if (err) shaderErrors.push(err);
      }
    }

    cu = {};
    const compUniforms = {
      uRes: v2(),
      uOffset: v2(),
      uScale: { value: 1, type: 'f32' },
      uTime: { value: 0, type: 'f32' },
      uBeat: { value: 0, type: 'f32' },
      uAwakening: { value: 0, type: 'f32' },
      uClean: { value: 0, type: 'f32' },
      uFlipY: { value: 0, type: 'f32' },
      uSelected: { value: 1, type: 'i32' },
      uLiveSlots: { value: 0, type: 'i32' },
      uHoverRegion: { value: 0, type: 'i32' },
      uToolMode: { value: 0, type: 'i32' },
      uSkyTop: v3(),
      uSkyBot: v3(),
      uMist: v3(),
      uFlashlight: { value: new Float32Array(4), type: 'vec4<f32>' },
      uWandGlow: { value: new Float32Array(4), type: 'vec4<f32>' },
      uPrologueMist: { value: 0, type: 'f32' },
      uDogEarGlow: { value: 0, type: 'f32' },
      uHintDim: { value: 0, type: 'f32' },
      uSparkle: { value: sparkleArr, type: 'vec2<f32>', size: MAX_SPARKLES },
      uSparkleN: { value: 0, type: 'i32' },
    } as const;
    compShader = createShader(compFrag, 'chroma-composite', compUniforms as never, 'compositeUniforms', {
      uRegionTex: regionTex.source,
      uActorTex: actorTex.source,
      uRegionStateTex: stateTex.source,
      uStrokeTex: strokeA.source,
      uPalTex: palTex.source,
    });
    cu = (compShader.resources as Record<string, { uniforms: Uniforms }>).compositeUniforms!.uniforms;

    const stampUniforms = {
      uCount: { value: 0, type: 'i32' },
      uStampA: { value: stampA, type: 'vec4<f32>', size: MAX_STAMPS_PER_BATCH },
      uStampB: { value: stampB, type: 'vec4<f32>', size: MAX_STAMPS_PER_BATCH },
    } as const;
    stampShader = createShader(stampFrag, 'chroma-stamp', stampUniforms as never, 'stampUniforms', {
      uPrev: strokeB.source,
      uRegionTex: regionTex.source,
      uAllowedTex: allowedTex.source,
    });
    su = (stampShader.resources as Record<string, { uniforms: Uniforms }>).stampUniforms!.uniforms;

    const curlUniforms = {
      uRes: v2(),
      uFold: { value: 0, type: 'f32' },
      uR: { value: 40, type: 'f32' },
      uSnapFlip: { value: 1, type: 'f32' },
    } as const;
    curlShader = createShader(curlFrag, 'chroma-curl', curlUniforms as never, 'curlUniforms', {
      uSnap: strokeA.source,
    });
    lu = (curlShader.resources as Record<string, { uniforms: Uniforms }>).curlUniforms!.uniforms;

    const geo = createQuadGeometry();
    const mkMesh = (shader: Shader): QuadMesh => {
      const m: QuadMesh = new Mesh<MeshGeometry, Shader>({ geometry: geo, shader });
      m.blendMode = 'none';
      m.state.blend = false; // raw RGBA output (data textures / opaque composite)
      return m;
    };
    const stageMesh = mkMesh(compShader);
    const turnMesh = mkMesh(curlShader);
    compMeshStage = stageMesh;
    compMeshRt = mkMesh(compShader);
    stampMesh = mkMesh(stampShader);
    curlMesh = turnMesh;
    turnMesh.visible = false;

    // particles
    const ptex = new Texture({ source: particleTex.source });
    particles = new ParticleContainer({
      texture: ptex,
      dynamicProperties: { position: true, vertex: true, color: true, rotation: false, uvs: false },
      roundPixels: false,
    });
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = new Particle({ texture: ptex, x: -100, y: -100, alpha: 0, anchorX: 0, anchorY: 0 });
      particleObjs.push(p);
      particles.addParticle(p);
    }
    a.stage.addChild(stageMesh, particles, turnMesh);

    // clear stroke RTs
    clearRt(strokeA);
    clearRt(strokeB);

    resizeObs = new ResizeObserver(() => resizeToHost());
    resizeObs.observe(h);
    const syncViewport = (): void => {
      if (destroyed || !app) return;
      const dprNow = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
      adaptive.setCeiling(initialResolution(dprNow));
      if (adaptive.resolution !== resolution) resolution = adaptive.resolution;
      resizeToHost();
    };
    const onOrientation = (): void => {
      syncViewport();
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(syncViewport);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', syncViewport);
      window.addEventListener('orientationchange', onOrientation);
      viewportOffs.push(() => {
        window.removeEventListener('resize', syncViewport);
        window.removeEventListener('orientationchange', onOrientation);
      });
      const vv = window.visualViewport;
      if (vv && typeof vv.addEventListener === 'function') {
        vv.addEventListener('resize', syncViewport);
        viewportOffs.push(() => vv.removeEventListener('resize', syncViewport));
      }
    }
    resizeToHost();
    return { webgl2: true };
  }

  // ---- context loss ----
  function onContextLost(e: Event): void {
    e.preventDefault();
    contextLost = true;
  }

  function onContextRestored(): void {
    contextLost = false;
    // Pixi rebuilds GL state; textures re-upload from CPU buffers. The stroke RTs come back empty: reseed.
    if (regionTex) regionTex.update();
    if (actorTex) actorTex.update();
    if (stateTex) stateTex.update();
    if (palTex) palTex.update();
    if (particleTex) particleTex.update();
    strokeCur = 'A';
    needsReseed = true;
    if (strokeA) clearRt(strokeA);
    if (strokeB) clearRt(strokeB);
    if (lastFrame) {
      const f = lastFrame;
      render(f);
    }
  }

  // ---- RendererPort ----
  function loadPage(p: CompiledPage, s: SpriteLibrary, wisp?: SpriteSheet): void {
    if (!app || !regionTex || !actorTex || !stateTex) return;
    page = p;
    pageAmbient = p.ambient ?? 'stardust';
    sprites = s;
    wispSheet = wisp ?? null;
    buildRegionTexData(p, regionTex.data);
    regionTex.update();
    plane.clear();
    actorTex.data.fill(0);
    actorTex.update();
    planeWasDirty = false;
    planeHasGuides = false;
    stateTex.data.fill(0);
    stateTex.update();
    skyTop.set(hexToRgb(p.sky.top));
    skyBot.set(hexToRgb(p.sky.bottom));
    mistCol.set(hexToRgb(p.sky.mist || '#6b5b8a'));
    if (!contextLost) {
      beginFrame();
      if (strokeA) clearRt(strokeA);
      if (strokeB) clearRt(strokeB);
      strokeCur = 'A';
      endFrame();
    }
    needsReseed = true;
  }

  function render(f: FrameInput): void {
    if (!app || destroyed || contextLost) return;
    lastFrame = f;
    beginFrame();
    const shifted = adaptive.push(f.dtMs, f.timeMs);
    if (shifted !== null) setResolution(shifted);
    if (!page) {
      applyCompositeUniformsIdle(f);
    } else {
      applyFrame(f);
    }
    // keep the composite reading the current stroke RT
    (compShader!.resources as Record<string, unknown>).uStrokeTex = strokeSrc().source;
    if (!turning) drawStage();
    endFrame();
  }

  function applyCompositeUniformsIdle(f: FrameInput): void {
    applyCompositeUniforms(f, f.timeMs / 1000, screenTarget());
  }

  function start(onTick: (dtMs: number, timeMs: number) => void): void {
    if (running) return;
    running = true;
    let last = performance.now();
    const loop = (now: number): void => {
      if (!running) return;
      const dt = Math.min(100, now - last);
      last = now;
      onTick(dt, now);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }

  function stop(): void {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  function clientToInternal(cx: number, cy: number): { x: number; y: number } | null {
    if (!app) return null;
    return clientToInternalPure(fit, canvas().getBoundingClientRect(), cx, cy);
  }

  function internalToClient(x: number, y: number): { x: number; y: number } {
    if (!app) return { x: 0, y: 0 };
    return internalToClientPure(fit, canvas().getBoundingClientRect(), x, y);
  }

  async function pageTurn(swap: () => void): Promise<void> {
    if (!app || !pool || !curlMesh || !compMeshStage || !particles || !curlShader || turning || contextLost || !lastFrame) {
      swap();
      return;
    }
    turning = true;
    const w = canvas().width;
    const h = canvas().height;
    const rtOld = pool.acquire(w, h);
    const rtNew = pool.acquire(w, h);
    const radius = Math.max(24, w * 0.07);
    const start0 = performance.now();
    const timeBase = lastFrame.timeMs - start0;
    let swapped = false;
    compMeshStage.visible = false;
    particles.visible = false;
    curlMesh.visible = true;
    (lu.uRes as Float32Array)[0] = w;
    (lu.uRes as Float32Array)[1] = h;
    lu.uR = radius;
    lu.uSnapFlip = 1;
    await new Promise<void>((resolve) => {
      const step = (now: number): void => {
        if (destroyed || contextLost) {
          resolve();
          return;
        }
        beginFrame();
        const p = clamp01((now - start0) / PAGE_TURN_MS);
        if (p >= 0.5 && !swapped) {
          swapped = true;
          swap();
          if (needsReseed && stateTex) {
            needsReseed = false;
            reseedStroke(stateTex.data);
          }
        }
        const f = lastFrame as FrameInput;
        const tgt = { w, h, offX: fit.offX, offY: fit.offY, scale: fit.scale, flip: true, clean: false };
        applyCompositeUniforms(f, (now + timeBase) / 1000, tgt);
        const far = w + radius * 0.2;
        const near = -radius * 1.05;
        if (!swapped) {
          const u = easeInOut(p / 0.5);
          lu.uFold = far + (near - far) * u;
          (compShader!.resources as Record<string, unknown>).uStrokeTex = strokeSrc().source;
          renderCompositeTo(rtOld);
          (curlShader!.resources as Record<string, unknown>).uSnap = rtOld.source;
        } else {
          const u = easeInOut((p - 0.5) / 0.5);
          lu.uFold = near + (far - near) * u;
          (compShader!.resources as Record<string, unknown>).uStrokeTex = strokeSrc().source;
          renderCompositeTo(rtNew);
          (curlShader!.resources as Record<string, unknown>).uSnap = rtNew.source;
        }
        drawStage();
        endFrame();
        if (p >= 1) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    if (!swapped) swap();
    if (destroyed) return;
    pool.release(rtOld);
    pool.release(rtNew);
    curlMesh.visible = false;
    compMeshStage.visible = true;
    particles.visible = true;
    turning = false;
    if (lastFrame) {
      applyCompositeUniforms(lastFrame, lastFrame.timeMs / 1000, screenTarget());
      drawStage();
    }
  }

  function capturePage(scale: number): HTMLCanvasElement {
    const s = Math.max(1, Math.round(scale));
    const w = PAGE_W * s;
    const h = PAGE_H * s;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    if (!app || !pool || !compMeshRt || !lastFrame || contextLost) return out;
    const rt = pool.acquire(w, h);
    beginFrame();
    const stripGuides = planeHasGuides && !!actorTex;
    if (stripGuides && actorTex) {
      plane.clear();
      if (sprites) blitActors(plane, sprites, lastFrame.view.actors);
      rasterizeEffects(plane, lastFrame.view.effects);
      actorTex.data.set(plane.data);
      actorTex.update();
    }
    applyCompositeUniforms(lastFrame, lastFrame.timeMs / 1000, { w, h, offX: 0, offY: 0, scale: s, flip: true, clean: true });
    (compShader!.resources as Record<string, unknown>).uStrokeTex = strokeSrc().source;
    renderCompositeTo(rt);
    const extracted = renderer().extract.canvas({ target: rt }) as HTMLCanvasElement;
    const ctx = out.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(extracted as CanvasImageSource, 0, 0, w, h);
    }
    pool.discard(rt);
    if (stripGuides && actorTex) {
      rasterizeWonderWhisper(plane, lastFrame.view.wonderWhisper, lastFrame.timeMs, lastFrame.wonderSketch);
      rasterizePokeInvites(plane, lastFrame.view.pokeInvites, lastFrame.timeMs);
      rasterizeWispGhostStroke(plane, lastFrame.view.wisp, lastFrame.timeMs);
      blitWisp(plane, lastFrame.view.wisp, wispSheet, lastFrame.timeMs);
      actorTex.data.set(plane.data);
      actorTex.update();
    }
    applyCompositeUniforms(lastFrame, lastFrame.timeMs / 1000, screenTarget());
    endFrame();
    return out;
  }

  function stats(): RendererStats {
    const ps = pool ? pool.stats() : { live: 0, pooled: 0, created: 0, destroyed: 0 };
    const textures = [regionTex, actorTex, stateTex, allowedTex, palTex, particleTex].filter((t) => t !== null).length;
    return {
      textures,
      renderTextures: ps.live,
      pooledRenderTextures: ps.pooled,
      drawCalls,
      contextLost,
      shaderErrors: [...shaderErrors],
      resolution,
    };
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    stop();
    resizeObs?.disconnect();
    resizeObs = null;
    for (const off of viewportOffs.splice(0)) off();
    if (app) {
      const cv = canvas();
      cv.removeEventListener('webglcontextlost', onContextLost as EventListener);
      cv.removeEventListener('webglcontextrestored', onContextRestored as EventListener);
    }
    pool?.destroyAll();
    strokeA = null;
    strokeB = null;
    for (const t of [regionTex, actorTex, stateTex, allowedTex, palTex, particleTex]) t?.destroy();
    regionTex = actorTex = stateTex = allowedTex = palTex = particleTex = null;
    particleObjs.length = 0;
    if (app) {
      app.destroy({ removeView: true }, { children: true, texture: false });
      app = null;
    }
  }

  return { init, start, stop, loadPage, render, clientToInternal, internalToClient, pageTurn, capturePage, stats, destroy };
}

