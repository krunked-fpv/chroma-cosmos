/** Renderer contracts. */
import type { CompiledPage, SpriteLibrary } from './art';
import type { MaterialId } from './materials';
import type { GpuStampBatch, SimView } from './simulation';
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
}

export interface RendererPort {
  init(host: HTMLElement): Promise<{ webgl2: boolean }>;
  start(onTick: (dtMs: number, timeMs: number) => void): void;
  stop(): void;
  loadPage(p: CompiledPage, s: SpriteLibrary): void;
  render(f: FrameInput): void;
  clientToInternal(cx: number, cy: number): { x: number; y: number } | null;
  internalToClient(x: number, y: number): { x: number; y: number };
  pageTurn(swap: () => void): Promise<void>;
  capturePage(scale: number): HTMLCanvasElement;
  stats(): RendererStats;
  destroy(): void;
}
