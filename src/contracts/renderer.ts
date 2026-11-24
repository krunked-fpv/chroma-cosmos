/** Renderer contracts. */
import type { CompiledPage, SpriteLibrary, SpriteSheet, WonderSketchDot } from './art';
import type { CausalityKind } from './causality';
import type { MaterialId } from './materials';
import type { GpuStampBatch, SimView, ToolMode } from './simulation';
import type { AppMode } from './ui';

export interface RendererStats {
  textures: number;
  renderTextures: number;
  pooledRenderTextures: number;
  drawCalls: number;
  contextLost: boolean;
  shaderErrors: string[];
  resolution: number;
}

export interface FrameInput {
  timeMs: number;
  dtMs: number;
  view: SimView;
  stampBatches: GpuStampBatch[];
  selectedMaterial: MaterialId;
  beatPhase: number;
  mode: AppMode;
  toolMode?: ToolMode;
  hoverPos?: { x: number; y: number } | null;
  /** 0..1 warm Star-Door light peeking under the bottom-right corner once Story Medallions complete. */
  dogEarGlow?: number;
  /** 0..1 Hint Spotlight dim factor (softly dims non-target uncolored paper by 12% while highlighting FLAG_SPOTLIGHT regions). */
  hintDim?: number;
  /** Optional procedural Wonder Whisper sketch dots provided by ArtPort.wonderSketch. */
  wonderSketch?: (effect: CausalityKind, box: { x0: number; y0: number; x1: number; y1: number }, timeMs: number) => WonderSketchDot[];
}

export interface RendererPort {
  init(host: HTMLElement): Promise<{ webgl2: boolean }>;
  start(onTick: (dtMs: number, timeMs: number) => void): void;
  stop(): void;
  loadPage(p: CompiledPage, s: SpriteLibrary, wisp?: SpriteSheet): void;
  render(f: FrameInput): void;
  clientToInternal(cx: number, cy: number): { x: number; y: number } | null;
  internalToClient(x: number, y: number): { x: number; y: number };
  pageTurn(swap: () => void): Promise<void>;
  capturePage(scale: number): HTMLCanvasElement;
  stats(): RendererStats;
  destroy(): void;
}
