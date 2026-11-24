import { createSimulation } from '../../../src/simulation';
import type { GestureEvent, MaterialId, SimEvent, SimulationPort, ToolState, RunContext } from '../../../src/contracts';
import { buildFixture, ctxOf } from './fixture';

export function mkSim(ctx: Partial<RunContext> = {}, opts: { withActors?: boolean } = {}): SimulationPort {
  const sim = createSimulation();
  sim.loadPage(buildFixture(opts), ctxOf(ctx));
  sim.setTool({ materialId: 6, brush: 'standard', doodle: false });
  sim.drainEvents();
  return sim;
}

let clock = 0;
export function ge(phase: GestureEvent['phase'], x: number, y: number, pointerId = 1): GestureEvent {
  clock += 8;
  return { phase, x, y, pointerId, pointerType: 'touch', pressure: 0.5, tiltX: 0, tiltY: 0, timeMs: clock };
}

export function drag(sim: SimulationPort, pts: { x: number; y: number }[], pointerId = 1): void {
  if (pts.length === 0) return;
  const first = pts[0]!;
  sim.gesture(ge('start', first.x, first.y, pointerId));
  for (let i = 1; i < pts.length; i++) sim.gesture(ge('move', pts[i]!.x, pts[i]!.y, pointerId));
  const last = pts[pts.length - 1]!;
  sim.gesture(ge('end', last.x, last.y, pointerId));
}

export function tap(sim: SimulationPort, x: number, y: number, pointerId = 1): void {
  sim.gesture(ge('start', x, y, pointerId));
  sim.gesture(ge('end', x, y, pointerId));
}

export function setTool(sim: SimulationPort, t: Partial<ToolState>): void {
  sim.setTool({ materialId: 6, brush: 'standard', doodle: false, ...t });
}

export function paintRegion(sim: SimulationPort, id: number, mat: MaterialId = 6, passes = 1): void {
  setTool(sim, { materialId: mat });
  for (let i = 0; i < passes; i++) drag(sim, sim.qaStrokePath(id));
}

export function run(sim: SimulationPort, ms: number, step = 16): void {
  for (let t = 0; t < ms; t += step) sim.update(step, t);
}

export function count(events: SimEvent[], type: SimEvent['type']): number {
  return events.filter((e) => e.type === type).length;
}

export function actor(sim: SimulationPort, kind: string) {
  return sim.view().actors.find((a) => a.kind === kind);
}
