/**
 * Procedural Storybook Focal Landmark Kit — 62 multi-part, chunky, hand-inked landmarks
 * across all 20 new universes. Every helper returns `number[]` of its allocated colourable
 * region IDs (2–5 chunky regions, each >= 100px at scale = 1) ready for `ctx.heroQuest(...)`!
 * Pure & deterministic (uses ctx.rng only where noted; zero timers or wall-clock APIs).
 */
import type { MaterialId } from '../../contracts/materials';
import type { RegionKind } from '../../contracts/regions';
import type { SceneCtx } from '../context';
import { inkArc, rot, star } from '../props';
import { INK, type Paint, type Pt, type Raster } from '../raster';

export interface LandmarkOpts {
  /** Optional prefix applied to allocated region labels */
  label?: string;
  /** Horizontal orientation: 1 (default) or -1 (mirrored) */
  flip?: 1 | -1;
  /** Optional preColor materials matching returned regions (ideal for Hub sanctuaries) */
  preColor?: readonly MaterialId[];
  /** Optional deterministic variant seed offset */
  variant?: number;
}

// ---------------------------------------------------------------------------
// Internal geometry & storybook detailing helpers
// ---------------------------------------------------------------------------

function makeAlloc(ctx: SceneCtx, opts: LandmarkOpts) {
  const ids: number[] = [];
  const alloc = (kind: RegionKind, name: string): number => {
    const id = ctx.dyn(kind, opts.label ? `${opts.label} ${name}` : name);
    ids.push(id);
    return id;
  };
  const finish = (): number[] => {
    if (opts.preColor && opts.preColor.length > 0) {
      for (let i = 0; i < ids.length; i++) {
        ctx.preColor(ids[i] as number, opts.preColor[i % opts.preColor.length] as MaterialId);
      }
    }
    return ids;
  };
  return { alloc, finish };
}

function tf(x: number, y: number, s: number, f: number) {
  const p = (u: number, v: number): Pt => [x + u * s * f, y + v * s];
  const poly = (raw: readonly Pt[]): Pt[] => raw.map(([u, v]) => [x + u * s * f, y + v * s] as Pt);
  return { p, poly };
}

function rrect(
  r: Raster,
  id: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  rad: number,
  angle = 0,
  p?: Paint,
): void {
  const hw = w / 2;
  const hh = h / 2;
  const rr = Math.min(rad, hw, hh);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const bound = Math.hypot(hw, hh) + 1;
  r.shape(
    id,
    cx - bound,
    cy - bound,
    cx + bound,
    cy + bound,
    (px, py) => {
      const dx = px - cx;
      const dy = py - cy;
      const u = Math.abs(dx * c + dy * s);
      const v = Math.abs(-dx * s + dy * c);
      if (u > hw || v > hh) return false;
      const ix = hw - rr;
      const iy = hh - rr;
      if (u <= ix || v <= iy) return true;
      const qx = u - ix;
      const qy = v - iy;
      return qx * qx + qy * qy <= rr * rr;
    },
    p,
  );
}

function inkCircle(r: Raster, cx: number, cy: number, rad: number, id: number): void {
  inkArc(r, cx, cy, rad, rad, 0, Math.PI * 2, 0, { only: [id] });
}

function inkPlus(r: Raster, cx: number, cy: number, arm: number, id: number): void {
  r.line(INK, cx - arm, cy, cx + arm, cy, { only: [id] });
  r.line(INK, cx, cy - arm, cx, cy + arm, { only: [id] });
}

function polyArc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, steps: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

// ===========================================================================
// 1. MARINE (U2 — Coral Kingdom)
// ===========================================================================

/** Grand bubblegum coral archway with branching arms & pearl crest (3 regions). */
export function drawCoralArch(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const arch = alloc('flora', 'Coral Archway');
  const branches = alloc('flora', 'Reef Fan Branches');
  const crest = alloc('star', 'Arch Pearl Shell');

  // Side fan branches behind main arch
  r.capsule(branches, ...p(-36, 4), ...p(-52, -16), 8 * s);
  r.capsule(branches, ...p(-44, -6), ...p(-54, 4), 6.5 * s);
  r.capsule(branches, ...p(36, 4), ...p(52, -16), 8 * s);
  r.capsule(branches, ...p(44, -6), ...p(54, 4), 6.5 * s);
  inkCircle(r, ...p(-48, -12), 2.5 * s, branches);
  inkCircle(r, ...p(48, -12), 2.5 * s, branches);

  // Thick horseshoe coral arch
  r.shape(arch, x - 50 * s, y - 44 * s, x + 50 * s, y + 38 * s, (px, py) => {
    const dx = (px - x) / (40 * s);
    const dy = (py - (y + 12 * s)) / (46 * s);
    if (py > y + 36 * s) return false;
    const d = Math.hypot(dx, Math.min(0, dy));
    if (py > y + 12 * s) return Math.abs(px - x) <= 40 * s && Math.abs(px - x) >= 22 * s;
    return d <= 1.0 && d >= 0.56;
  });
  // Bumpy coral rim discs & polyp rings
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI + (i / 6) * Math.PI;
    const bx = x + Math.cos(a) * 34 * s;
    const by = y + 10 * s + Math.sin(a) * 40 * s;
    r.disc(arch, bx, by, 7 * s);
    inkCircle(r, bx, by, 2.5 * s, arch);
  }
  r.ellipse(arch, ...p(-31, 34), 13 * s, 6 * s);
  r.ellipse(arch, ...p(31, 34), 13 * s, 6 * s);

  // Scallop shell crest atop the arch keystone
  r.disc(crest, ...p(0, -32), 11 * s);
  for (const ang of [-0.6, -0.2, 0.2, 0.6]) {
    r.line(INK, ...p(0, -25), ...p(Math.sin(ang) * 10, -32 - Math.cos(ang) * 9), { only: [crest] });
  }

  return finish();
}

/** Graceful storybook jellyfish with scalloped bell, inner mantle & ribbons (3 regions). */
export function drawJellyfish(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const tentacles = alloc('prop', 'Jellyfish Ribbons');
  const bell = alloc('prop', 'Jellyfish Bell');
  const frill = alloc('flora', 'Scalloped Jelly Frill');

  // Thick wavy trailing tentacles
  for (const ox of [-20, -7, 7, 20]) {
    const sway = ox < 0 ? -5 : 5;
    r.capsule(tentacles, ...p(ox, 4), ...p(ox + sway, 22), 4.6 * s);
    r.capsule(tentacles, ...p(ox + sway, 22), ...p(ox - sway * 0.6, 38), 4.2 * s);
  }

  // Translucent dome bell
  r.shape(bell, x - 36 * s, y - 38 * s, x + 36 * s, y + 6 * s, (px, py) => {
    const dx = (px - x) / (33 * s);
    const dy = (py - (y - 2 * s)) / (32 * s);
    if (dy > 0.14) return false;
    return dx * dx + dy * dy <= 1;
  });
  inkArc(r, x, y - 2 * s, 25 * s, 24 * s, Math.PI * 1.12, Math.PI * 1.48, 0, { only: [bell] });
  inkCircle(r, ...p(-11, -14), 4 * s, bell);
  inkCircle(r, ...p(12, -16), 3.2 * s, bell);
  inkCircle(r, ...p(2, -23), 2.8 * s, bell);

  // Scalloped ruffled lower bell rim
  for (const ox of [-24, -12, 0, 12, 24]) {
    r.disc(frill, ...p(ox, 4), 8.2 * s);
  }
  r.line(INK, ...p(-26, 4), ...p(26, 4), { only: [frill] });

  return finish();
}

/** Giant open pearl-clam with fluted fan shells and gleaming oversized pearl (3 regions). */
export function drawGiantClam(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const upperShell = alloc('prop', 'Upper Scallop Shell');
  const pearlId = alloc('star', 'Giant Sea Pearl');
  const lowerShell = alloc('prop', 'Lower Clam Shell');

  // Upper open fan shell
  r.ellipse(upperShell, ...p(0, -14), 38 * s, 24 * s);
  for (let i = -3; i <= 3; i++) {
    r.disc(upperShell, ...p(i * 10.5, -24 + Math.abs(i) * 2.5), 8.5 * s);
    r.line(INK, ...p(0, 2), ...p(i * 11, -30 + Math.abs(i) * 2), { only: [upperShell] });
  }

  // Oversized luminous pearl nestled in center
  r.disc(pearlId, ...p(0, 2), 14.5 * s);
  inkArc(r, ...p(0, 2), 10 * s, 10 * s, Math.PI * 1.1, Math.PI * 1.5, 0, { only: [pearlId] });

  // Lower fluted cradle shell
  r.ellipse(lowerShell, ...p(0, 20), 40 * s, 15 * s);
  for (let i = -3; i <= 3; i++) {
    r.disc(lowerShell, ...p(i * 10.5, 25 - Math.abs(i) * 1.2), 7.5 * s);
    r.line(INK, ...p(0, 12), ...p(i * 10.5, 30), { only: [lowerShell] });
  }

  return finish();
}

/** Cozy brass & bubblegum storybook submarine with conning tower, portholes & tail fin (4 regions). */
export function drawSubmarine(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const tail = alloc('prop', 'Submarine Tail & Propeller');
  const tower = alloc('prop', 'Conning Tower');
  const hull = alloc('prop', 'Submarine Hull');
  const portholes = alloc('star', 'Submarine Portholes');

  // Rear fins + propeller blades
  r.poly(tail, poly([[-34, -4], [-52, -18], [-48, 0], [-52, 18], [-34, 6]]));
  r.ellipse(tail, ...p(-52, -9), 5 * s, 9 * s);
  r.ellipse(tail, ...p(-52, 9), 5 * s, 9 * s);

  // Conning tower + periscope
  rrect(r, tower, ...p(4, -22), 26 * s, 20 * s, 6 * s);
  r.capsule(tower, ...p(6, -30), ...p(6, -40), 3.6 * s);
  r.capsule(tower, ...p(6, -40), ...p(15, -40), 3.8 * s);
  r.line(INK, ...p(-6, -22), ...p(14, -22), { only: [tower] });

  // Chunky capsule hull
  r.ellipse(hull, ...p(0, 4), 44 * s, 23 * s);
  r.line(INK, ...p(-36, 12), ...p(36, 12), { only: [hull] });
  for (const rx of [-26, -8, 10, 28]) {
    r.dot(INK, ...p(rx, 16), { only: [hull] });
  }

  // Twin circular porthole windows sharing 1 region id
  r.disc(portholes, ...p(-12, 2), 9 * s);
  r.disc(portholes, ...p(14, 2), 9 * s);
  inkArc(r, ...p(-12, 2), 5.8 * s, 5.8 * s, Math.PI * 1.1, Math.PI * 1.55, 0, { only: [portholes] });
  inkArc(r, ...p(14, 2), 5.8 * s, 5.8 * s, Math.PI * 1.1, Math.PI * 1.55, 0, { only: [portholes] });

  return finish();
}

/** Whimsical tilted storybook sunken galleon with billowing sail, mast & hull (3 regions). */
export function drawSunkenShip(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const sail = alloc('prop', 'Tattered Galleon Sail');
  const cabin = alloc('prop', 'Captain Cabin');
  const hull = alloc('prop', 'Sunken Ship Hull');

  // Mast + billowing curved sail
  r.poly(sail, poly([[-4, -40], [32, -32], [24, -4], [-8, -8]]));
  r.poly(sail, poly([[-26, -32], [-6, -28], [-10, -4], [-28, -8]]));
  r.line(INK, ...p(12, -34), ...p(8, -8), { only: [sail] });
  r.line(INK, ...p(-2, -20), ...p(24, -18), { only: [sail] });

  // Aft deck cabin
  r.poly(cabin, poly([[-42, -12], [-14, -10], [-14, 12], [-40, 12]]));
  inkCircle(r, ...p(-28, 0), 4.5 * s, cabin);

  // Tilted wooden ship hull
  r.poly(hull, poly([[-46, 4], [48, -2], [36, 30], [-36, 32]]));
  for (const hy of [12, 20]) {
    r.line(INK, ...p(-38, hy), ...p(40, hy - 3), { only: [hull] });
  }
  for (const px of [-20, 0, 20]) {
    inkCircle(r, ...p(px, 14), 3.6 * s, hull);
  }

  return finish();
}

/** Lush swaying kelp forest cluster with wide ribbon fronds & bubbly float bladders (3 regions). */
export function drawKelpCluster(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const backFrond = alloc('flora', 'Tall Sea Kelp');
  const frontFrond = alloc('flora', 'Ribbon Kelp');
  const baseRock = alloc('prop', 'Mossy Reef Base');

  // Back tall ribbon stalks
  r.capsule(backFrond, ...p(-16, 30), ...p(-22, -4), 7.5 * s);
  r.capsule(backFrond, ...p(-22, -4), ...p(-12, -36), 6.8 * s);
  r.ellipse(backFrond, ...p(-30, -14), 10 * s, 5 * s, -0.5 * f);
  r.capsule(backFrond, ...p(16, 30), ...p(24, -2), 7.5 * s);
  r.capsule(backFrond, ...p(24, -2), ...p(14, -34), 6.8 * s);
  r.ellipse(backFrond, ...p(32, -12), 10 * s, 5 * s, 0.5 * f);
  r.line(INK, ...p(-16, 24), ...p(-14, -28), { only: [backFrond] });
  r.line(INK, ...p(16, 24), ...p(16, -26), { only: [backFrond] });

  // Center main swaying kelp frond with leaf blades
  r.capsule(frontFrond, ...p(0, 32), ...p(-4, 0), 8.2 * s);
  r.capsule(frontFrond, ...p(-4, 0), ...p(4, -36), 7.4 * s);
  r.ellipse(frontFrond, ...p(-14, -6), 11 * s, 5.5 * s, -0.4 * f);
  r.ellipse(frontFrond, ...p(14, -18), 11 * s, 5.5 * s, 0.4 * f);
  r.line(INK, ...p(0, 26), ...p(2, -30), { only: [frontFrond] });

  // Grounding mossy reef rock mound
  r.ellipse(baseRock, ...p(0, 30), 34 * s, 11 * s);
  inkArc(r, ...p(-12, 29), 8 * s, 4 * s, Math.PI, Math.PI * 2, 0, { only: [baseRock] });
  inkArc(r, ...p(12, 30), 7 * s, 3.5 * s, Math.PI, Math.PI * 2, 0, { only: [baseRock] });

  return finish();
}

// ===========================================================================
// 2. BAKERY (U3 — Sugar-Cloud Sky Bakery)
// ===========================================================================

/** Stacked 3-tier pastel French macaron tower with whipped cream filling (4 regions). */
export function drawMacaronTower(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const botMac = alloc('milkshake', 'Bottom Macaron');
  const midMac = alloc('milkshake', 'Middle Macaron');
  const topMac = alloc('milkshake', 'Crown Macaron');
  const cream = alloc('milkshake', 'Whipped Cream Layers');

  const drawTier = (id: number, cy: number, rx: number, ry: number): void => {
    r.ellipse(id, ...p(0, cy - ry * 0.55), rx * s, ry * 0.65 * s);
    r.ellipse(id, ...p(0, cy + ry * 0.55), rx * s, ry * 0.62 * s);
    // Crisp scalloped meringue feet lines
    r.line(INK, ...p(-rx * 0.85, cy - ry * 0.25), ...p(rx * 0.85, cy - ry * 0.25), { only: [id] });
    r.line(INK, ...p(-rx * 0.85, cy + ry * 0.35), ...p(rx * 0.85, cy + ry * 0.35), { only: [id] });
  };

  drawTier(botMac, 22, 36, 13);
  drawTier(midMac, -2, 29, 12);
  drawTier(topMac, -24, 22, 11);

  // Cream fillings shared as one luscious region
  for (const [cy, w] of [[22, 70], [-2, 56], [-24, 42]] as const) {
    rrect(r, cream, ...p(0, cy), w * s, 7.5 * s, 3.5 * s);
  }
  r.disc(cream, ...p(0, -37), 8 * s);

  return finish();
}

/** Giant glazed donut Ferris/water wheel on frosted wafer stand (3 regions). */
export function drawDonutWheel(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const stand = alloc('prop', 'Wafer Wheel Stand');
  const dough = alloc('milkshake', 'Golden Donut Ring');
  const glaze = alloc('milkshake', 'Sprinkle Frosting');

  // Criss-cross wafer stand legs
  r.poly(stand, poly([[-8, 0], [8, 0], [34, 38], [20, 38], [0, 12], [-20, 38], [-34, 38]]));
  r.line(INK, ...p(-22, 28), ...p(22, 28), { only: [stand] });

  // Torus donut body
  r.shape(dough, x - 36 * s, y - 40 * s, x + 36 * s, y + 32 * s, (px, py) => {
    const d = Math.hypot(px - x, py - (y - 4 * s));
    return d <= 34 * s && d >= 13 * s;
  });

  // Wavy glossy frosting glaze covering upper 60% of the donut torus
  r.shape(glaze, x - 36 * s, y - 40 * s, x + 36 * s, y + 18 * s, (px, py) => {
    const dx = px - x;
    const dy = py - (y - 4 * s);
    const d = Math.hypot(dx, dy);
    if (d > 33 * s || d < 14 * s) return false;
    const drip = 8 * s + Math.sin(dx * 0.24 / s) * 7 * s;
    return dy <= drip;
  });
  // Sprinkle ticks on glaze
  for (const [u, v, du, dv] of [[-18, -22, 4, -2], [0, -26, 4, 2], [18, -20, -3, 3], [-24, -6, 3, 2], [22, -4, -3, 2]] as const) {
    r.line(INK, ...p(u, v), ...p(u + du, v + dv), { only: [glaze] });
  }

  return finish();
}

/** Whimsical storybook cupcake cottage with ruffled wrapper walls, frosting roof & door (4 regions). */
export function drawCupcakeHouse(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const wrapper = alloc('prop', 'Cupcake Cottage Base');
  const door = alloc('prop', 'Gingerbread Door');
  const roof = alloc('milkshake', 'Swirled Frosting Roof');
  const cherry = alloc('star', 'Roof Cherry Chimney');

  // Tapered pleated paper cup walls
  r.poly(wrapper, poly([[-36, 4], [36, 4], [28, 38], [-28, 38]]));
  for (const ux of [-22, -11, 11, 22]) {
    r.line(INK, ...p(ux * 1.15, 6), ...p(ux * 0.9, 36), { only: [wrapper] });
  }

  // Arched cottage door
  r.disc(door, ...p(0, 21), 10 * s);
  r.rect(door, x - 10 * s, y + 21 * s, x + 10 * s, y + 38 * s);
  r.dot(INK, ...p(5, 28), { only: [door] });
  inkCircle(r, ...p(0, 19), 3.5 * s, door);

  // Plush 3-tier whipped icing roof
  r.ellipse(roof, ...p(0, 2), 42 * s, 16 * s);
  r.ellipse(roof, ...p(0, -14), 32 * s, 15 * s);
  r.ellipse(roof, ...p(0, -28), 20 * s, 11 * s);
  inkArc(r, ...p(0, -12), 24 * s, 8 * s, Math.PI * 0.1, Math.PI * 0.9, 0, { only: [roof] });
  inkArc(r, ...p(0, 2), 32 * s, 9 * s, Math.PI * 0.1, Math.PI * 0.9, 0, { only: [roof] });

  // Giant cherry topper
  r.disc(cherry, ...p(0, -39), 10.5 * s);
  inkArc(r, ...p(0, -39), 6.5 * s, 6.5 * s, Math.PI * 1.1, Math.PI * 1.5, 0, { only: [cherry] });

  return finish();
}

/** Erupting ice-cream sundae volcano with waffle mountain, melting scoops & fudge plume (4 regions). */
export function drawSundaeVolcano(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const plume = alloc('milkshake', 'Whipped Cream Plume');
  const cone = alloc('prop', 'Waffle Cone Mountain');
  const scoop = alloc('milkshake', 'Melting Ice-Cream Peak');
  const wafer = alloc('prop', 'Wafer Stick');

  // Plume cloud puffing above crater
  r.disc(plume, ...p(0, -32), 14 * s);
  r.disc(plume, ...p(-13, -27), 10 * s);
  r.disc(plume, ...p(13, -27), 10 * s);
  inkArc(r, ...p(0, -32), 8 * s, 6 * s, Math.PI * 1.0, Math.PI * 1.9, 0, { only: [plume] });

  // Diagonal rolled wafer stick tucked into side
  r.poly(wafer, poly([[14, -36], [24, -32], [12, 2], [2, -2]]));
  for (let i = 0; i < 4; i++) {
    r.line(INK, ...p(14 - i * 3, -32 + i * 8), ...p(22 - i * 3, -29 + i * 8), { only: [wafer] });
  }

  // Waffle mountain slope
  r.poly(cone, poly([[-20, -10], [20, -10], [46, 38], [-46, 38]]));
  for (let i = -2; i <= 2; i++) {
    r.line(INK, ...p(i * 9, -8), ...p(i * 18 - 10, 36), { only: [cone] });
    r.line(INK, ...p(i * 9, -8), ...p(i * 18 + 10, 36), { only: [cone] });
  }

  // Dripping ice-cream scoop lava cap
  r.ellipse(scoop, ...p(0, -12), 28 * s, 14 * s);
  r.capsule(scoop, ...p(-16, -6), ...p(-20, 14), 6.5 * s);
  r.capsule(scoop, ...p(2, -4), ...p(4, 18), 7 * s);
  r.capsule(scoop, ...p(18, -6), ...p(22, 10), 6 * s);

  return finish();
}

/** Cozy fairy teapot cottage with curved spout, handle, lid dome & round door (4 regions). */
export function drawTeapotHouse(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const spoutHandle = alloc('prop', 'Teapot Spout & Handle');
  const body = alloc('prop', 'Teapot Cottage Body');
  const lid = alloc('prop', 'Teapot Lid Roof');
  const door = alloc('star', 'Round Teapot Door');

  // Curved spout on right + arched handle on left (shared region)
  r.capsule(spoutHandle, ...p(26, 8), ...p(46, -12), 7.5 * s);
  r.disc(spoutHandle, ...p(48, -14), 6 * s);
  r.shape(spoutHandle, x - 52 * s, y - 16 * s, x - 20 * s, y + 26 * s, (px, py) => {
    const cx = x - 34 * s * f;
    const d = Math.hypot((px - cx) / (15 * s), (py - (y + 4 * s)) / (18 * s));
    return d <= 1.0 && d >= 0.52;
  });

  // Plump rounded teapot walls
  r.ellipse(body, ...p(0, 8), 35 * s, 28 * s);
  r.rect(body, x - 26 * s, y + 28 * s, x + 26 * s, y + 36 * s);
  inkArc(r, ...p(0, 8), 28 * s, 22 * s, Math.PI * 1.15, Math.PI * 1.48, 0, { only: [body] });
  inkCircle(r, ...p(-18, 2), 5 * s, body);
  inkCircle(r, ...p(18, 2), 5 * s, body);

  // Domed tea-cozy roof lid + finial knob
  r.ellipse(lid, ...p(0, -18), 27 * s, 11 * s);
  r.disc(lid, ...p(0, -31), 7.5 * s);
  r.line(INK, ...p(-22, -18), ...p(22, -18), { only: [lid] });

  // Cozy round hobbit-style front door
  r.disc(door, ...p(0, 18), 11 * s);
  r.line(INK, ...p(0, 9), ...p(0, 27), { only: [door] });
  r.dot(INK, ...p(4, 18), { only: [door] });

  return finish();
}

/** Sweet gingerbread express train with frosting roof, peppermint wheels & puffing smokestack (4 regions). */
export function drawGingerbreadTrain(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const cab = alloc('prop', 'Gingerbread Cab');
  const boiler = alloc('milkshake', 'Icing Boiler Engine');
  const stack = alloc('prop', 'Candy Smokestack');
  const wheels = alloc('star', 'Peppermint Wheels');

  // Flared smokestack + cowcatcher front
  r.poly(stack, poly([[18, -32], [34, -32], [30, -12], [22, -12]]));
  r.poly(stack, poly([[36, 10], [50, 26], [34, 26]]));
  r.line(INK, ...p(21, -24), ...p(31, -24), { only: [stack] });

  // Rear engineer cab with frosting eaves
  rrect(r, cab, ...p(-24, -4), 30 * s, 44 * s, 4 * s);
  rrect(r, cab, ...p(-24, -27), 36 * s, 8 * s, 3.5 * s);
  r.rect(INK, x - 31 * s * f - (f < 0 ? 14 * s : 0), y - 16 * s, x - 17 * s * f + (f < 0 ? 14 * s : 0), y - 16 * s, { only: [cab] });
  inkCircle(r, ...p(-24, -10), 6.5 * s, cab);

  // Front horizontal biscuit boiler
  rrect(r, boiler, ...p(14, 2), 46 * s, 28 * s, 7 * s);
  for (const bx of [0, 14, 28]) {
    r.line(INK, ...p(bx, -10), ...p(bx, 14), { only: [boiler] });
  }

  // Three chunky peppermint candy wheels (shared region)
  for (const wx of [-28, 2, 26]) {
    r.disc(wheels, ...p(wx, 24), 11 * s);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI;
      r.line(INK, ...p(wx - Math.cos(a) * 8, 24 - Math.sin(a) * 8), ...p(wx + Math.cos(a) * 8, 24 + Math.sin(a) * 8), { only: [wheels] });
    }
  }

  return finish();
}

// ===========================================================================
// 3. FOREST / MUSHROOM / AUTUMN / BOTANICAL (U4, U16, U17)
// ===========================================================================

/** Storybook luminous toadstool house with giant spotted cap, chimney, stalk & door (4 regions). */
export function drawToadstoolHouse(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const stalk = alloc('flora', 'Mushroom Cottage Stalk');
  const door = alloc('prop', 'Fairy Cottage Door');
  const cap = alloc('flora', 'Spotted Toadstool Cap');
  const spots = alloc('star', 'Glowing Cap Spots');

  // Plump tapered stalk walls
  r.shape(stalk, x - 30 * s, y - 4 * s, x + 30 * s, y + 38 * s, (px, py) => {
    if (py < y - 2 * s || py > y + 37 * s) return false;
    const t = (py - (y - 2 * s)) / (39 * s);
    const hw = (21 + t * 8) * s;
    return Math.abs(px - x) <= hw;
  });
  inkCircle(r, ...p(-14, 16), 4.5 * s, stalk);
  inkCircle(r, ...p(14, 16), 4.5 * s, stalk);

  // Arched wooden door
  r.disc(door, ...p(0, 21), 9.5 * s);
  r.rect(door, x - 9.5 * s, y + 21 * s, x + 9.5 * s, y + 37 * s);
  r.line(INK, ...p(0, 13), ...p(0, 36), { only: [door] });
  r.dot(INK, ...p(4, 26), { only: [door] });

  // Huge umbrella mushroom cap
  r.shape(cap, x - 48 * s, y - 42 * s, x + 48 * s, y + 10 * s, (px, py) => {
    const dx = (px - x) / (46 * s);
    const dy = (py - (y + 2 * s)) / (40 * s);
    if (dy > 0.14) return false;
    return dx * dx + dy * dy <= 1;
  });
  inkArc(r, ...p(0, 6), 40 * s, 8 * s, Math.PI * 1.05, Math.PI * 1.95, 0, { only: [cap] });

  // Three generous glowing spots on the cap (shared region)
  r.disc(spots, ...p(-22, -12), 8 * s);
  r.disc(spots, ...p(2, -24), 9 * s);
  r.disc(spots, ...p(23, -10), 7.5 * s);

  return finish();
}

/** Enchanted hollow ancient oak tree with lush canopy puffs, gnarled trunk & cozy hollow (3 regions). */
export function drawHollowOak(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const trunk = alloc('flora', 'Ancient Oak Trunk');
  const hollow = alloc('star', 'Glowing Tree Hollow');
  const canopy = alloc('flora', 'Oak Leaf Canopy');

  // Flared storybook trunk with roots
  r.poly(trunk, poly([[-18, -8], [18, -8], [24, 24], [38, 38], [14, 38], [0, 30], [-14, 38], [-38, 38], [-24, 24]]));
  r.line(INK, ...p(-12, -4), ...p(-16, 26), { only: [trunk] });
  r.line(INK, ...p(12, -4), ...p(16, 26), { only: [trunk] });

  // Warm arched tree hollow nook
  r.ellipse(hollow, ...p(0, 14), 10.5 * s, 13 * s);
  inkArc(r, ...p(0, 14), 6.5 * s, 8.5 * s, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [hollow] });

  // Cloud-like leafy canopy crown
  r.disc(canopy, ...p(-24, -14), 20 * s);
  r.disc(canopy, ...p(24, -14), 20 * s);
  r.disc(canopy, ...p(-12, -28), 21 * s);
  r.disc(canopy, ...p(14, -28), 20 * s);
  r.disc(canopy, ...p(0, -16), 22 * s);
  inkArc(r, ...p(-20, -16), 11 * s, 9 * s, Math.PI * 1.1, Math.PI * 1.85, 0, { only: [canopy] });
  inkArc(r, ...p(16, -24), 11 * s, 9 * s, Math.PI * 1.15, Math.PI * 1.9, 0, { only: [canopy] });

  return finish();
}

/** Hanging woodland fairy lantern on curved shepherd crook with glowing crystal jar (3 regions). */
export function drawFairyLantern(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const crook = alloc('prop', 'Lantern Branch Post');
  const cap = alloc('prop', 'Lantern Cap & Base');
  const glow = alloc('star', 'Fairy Glow Globe');

  // Curved wooden post on the left arching overhead
  r.capsule(crook, ...p(-24, 38), ...p(-24, -26), 5.5 * s);
  r.capsule(crook, ...p(-24, -26), ...p(6, -34), 5 * s);
  r.ellipse(crook, ...p(-24, 36), 14 * s, 5.5 * s);
  r.ellipse(crook, ...p(-33, -12), 9 * s, 4.5 * s, -0.5 * f);

  // Glowing glass lantern jar
  rrect(r, glow, ...p(8, 2), 28 * s, 32 * s, 10 * s);
  inkPlus(r, ...p(8, 0), 5 * s, glow);
  inkArc(r, ...p(8, 2), 10 * s, 12 * s, Math.PI * 1.1, Math.PI * 1.48, 0, { only: [glow] });

  // Leafy roof cap + bottom saucer frame
  r.poly(cap, poly([[8, -28], [28, -12], [-12, -12]]));
  rrect(r, cap, ...p(8, 21), 30 * s, 8 * s, 3.5 * s);
  r.line(INK, ...p(-6, -15), ...p(22, -15), { only: [cap] });

  return finish();
}

/** Fairytale autumn pumpkin carriage with leafy stem crown, arched window & spoked wheels (4 regions). */
export function drawPumpkinCarriage(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const stem = alloc('flora', 'Curled Vine Crown');
  const body = alloc('flora', 'Pumpkin Coach Body');
  const windowId = alloc('star', 'Carriage Window');
  const wheels = alloc('prop', 'Golden Coach Wheels');

  // Curled vine & leaf crown on top
  r.capsule(stem, ...p(0, -24), ...p(8, -40), 5.5 * s);
  r.ellipse(stem, ...p(-14, -28), 11 * s, 6 * s, -0.35 * f);
  r.ellipse(stem, ...p(15, -28), 11 * s, 6 * s, 0.35 * f);

  // Ribbed plump pumpkin coach body
  r.ellipse(body, ...p(-18, 0), 22 * s, 26 * s);
  r.ellipse(body, ...p(18, 0), 22 * s, 26 * s);
  r.ellipse(body, ...p(0, 0), 26 * s, 28 * s);
  inkArc(r, ...p(0, 0), 17 * s, 27 * s, 0, Math.PI * 2, 0, { only: [body] });

  // Arched coach window
  r.disc(windowId, ...p(0, -4), 10 * s);
  r.rect(windowId, x - 10 * s, y - 4 * s, x + 10 * s, y + 8 * s);
  r.line(INK, ...p(0, -13), ...p(0, 7), { only: [windowId] });
  r.line(INK, ...p(-9, -1), ...p(9, -1), { only: [windowId] });

  // Twin spoked carriage wheels (shared region)
  for (const wx of [-24, 24]) {
    r.disc(wheels, ...p(wx, 25), 13 * s);
    inkCircle(r, ...p(wx, 25), 9 * s, wheels);
    inkPlus(r, ...p(wx, 25), 9 * s, wheels);
  }

  return finish();
}

/** Cozy autumn maple windmill with tapered tower, conical cap & four giant sail blades (3 regions). */
export function drawMapleWindmill(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const tower = alloc('prop', 'Windmill Stone Tower');
  const roof = alloc('prop', 'Windmill Cap Roof');
  const sails = alloc('flora', 'Maple Leaf Sails');

  // Tapered mill tower
  r.poly(tower, poly([[-18, -14], [18, -14], [28, 38], [-28, 38]]));
  for (const ty of [4, 16, 28]) {
    r.line(INK, ...p(-20, ty), ...p(20, ty), { only: [tower] });
  }
  inkArc(r, ...p(0, 38), 8 * s, 14 * s, Math.PI, Math.PI * 2, 0, { only: [tower] });

  // Conical dome roof
  r.poly(roof, poly([[0, -38], [24, -12], [-24, -12]]));
  r.line(INK, ...p(-16, -20), ...p(16, -20), { only: [roof] });

  // 4 broad diagonal windmill sails radiating from hub (0, -10)
  const hub = p(0, -10);
  r.disc(sails, hub[0], hub[1], 7 * s);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    const blade = rot(
      [
        [hub[0] + 5 * s, hub[1] - 5.5 * s],
        [hub[0] + 38 * s, hub[1] - 8.5 * s],
        [hub[0] + 38 * s, hub[1] + 8.5 * s],
        [hub[0] + 5 * s, hub[1] + 5.5 * s],
      ],
      hub[0],
      hub[1],
      a,
    );
    r.poly(sails, blade);
    const l0 = rot([[hub[0] + 8 * s, hub[1]], [hub[0] + 35 * s, hub[1]]], hub[0], hub[1], a);
    r.line(INK, (l0[0] as Pt)[0], (l0[0] as Pt)[1], (l0[1] as Pt)[0], (l0[1] as Pt)[1], { only: [sails] });
  }

  return finish();
}

/** Woodland acorn cottage with cross-hatched acorn cap roof, rounded nut walls & door (3 regions). */
export function drawAcornCottage(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const nut = alloc('flora', 'Acorn Cottage Walls');
  const door = alloc('prop', 'Acorn Front Door');
  const cap = alloc('flora', 'Woven Acorn Cap Roof');

  // Plump rounded acorn nut body
  r.ellipse(nut, ...p(0, 10), 30 * s, 28 * s);
  r.line(INK, ...p(-24, 16), ...p(24, 16), { only: [nut] });

  // Arched cottage door + tiny porthole
  r.disc(door, ...p(0, 18), 9.5 * s);
  r.rect(door, x - 9.5 * s, y + 18 * s, x + 9.5 * s, y + 36 * s);
  r.dot(INK, ...p(4, 24), { only: [door] });

  // Thick textured acorn cap beret + stem
  r.ellipse(cap, ...p(0, -14), 37 * s, 18 * s);
  r.capsule(cap, ...p(0, -30), ...p(4, -40), 5 * s);
  for (let i = -24; i <= 24; i += 12) {
    r.line(INK, ...p(i - 6, -24), ...p(i + 6, -4), { only: [cap] });
    r.line(INK, ...p(i + 6, -24), ...p(i - 6, -4), { only: [cap] });
  }

  return finish();
}

/** Towering giant storybook sunflower with radiant petal ring, seed heart & leafy stalk (3 regions). */
export function drawGiantSunflower(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const stalk = alloc('flora', 'Sunflower Stalk & Leaves');
  const petals = alloc('flora', 'Sunbeam Petals');
  const heartId = alloc('star', 'Sunflower Seed Heart');

  // Sturdy stem & broad opposite leaves
  r.capsule(stalk, ...p(0, -2), ...p(0, 38), 6.5 * s);
  r.ellipse(stalk, ...p(-20, 22), 16 * s, 9 * s, -0.35 * f);
  r.ellipse(stalk, ...p(20, 18), 16 * s, 9 * s, 0.35 * f);
  r.line(INK, ...p(-32, 18), ...p(-8, 25), { only: [stalk] });
  r.line(INK, ...p(32, 14), ...p(8, 21), { only: [stalk] });

  // 12 plump radiating petals
  const cy = y - 14 * s;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    r.ellipse(petals, x + Math.cos(a) * 23 * s, cy + Math.sin(a) * 23 * s, 12 * s, 6.5 * s, a);
  }

  // Cross-hatched seed center
  r.disc(heartId, x, cy, 15.5 * s);
  for (let i = -8; i <= 8; i += 6) {
    r.line(INK, x + i * s - 6 * s, cy - 8 * s, x + i * s + 6 * s, cy + 8 * s, { only: [heartId] });
    r.line(INK, x + i * s + 6 * s, cy - 8 * s, x + i * s - 6 * s, cy + 8 * s, { only: [heartId] });
  }

  return finish();
}

/** Golden hexagonal honeycomb garden archway draped with wildflowers (3 regions). */
export function drawHoneycombArch(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const arch = alloc('prop', 'Honeycomb Arch');
  const drips = alloc('milkshake', 'Golden Honey Drips');
  const blossoms = alloc('flora', 'Archway Blossoms');

  const hex = (id: number, cx: number, cy: number, rad: number): void => {
    const hPts: Pt[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      hPts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    r.poly(id, hPts);
    inkArc(r, cx, cy, rad * 0.55, rad * 0.55, 0, Math.PI * 2, 0, { only: [id] });
  };

  // Arch built of plump fused hexagons
  const cells: Array<[number, number]> = [
    [-32, 26], [-32, 8], [-28, -10], [-16, -24], [0, -30], [16, -24], [28, -10], [32, 8], [32, 26],
  ];
  for (const [u, v] of cells) {
    hex(arch, ...p(u, v), 13 * s);
  }

  // Thick golden honey drips from top inner rim
  r.capsule(drips, ...p(-12, -14), ...p(-12, 0), 5.5 * s);
  r.capsule(drips, ...p(0, -18), ...p(0, -2), 6.2 * s);
  r.capsule(drips, ...p(12, -14), ...p(12, -2), 5.5 * s);

  // Twin blooming flowers perched on arch shoulders
  for (const [u, v] of [[-26, -24], [26, -24]] as const) {
    const fc = p(u, v);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      r.disc(blossoms, fc[0] + Math.cos(a) * 6.5 * s, fc[1] + Math.sin(a) * 6.5 * s, 5 * s);
    }
    inkCircle(r, fc[0], fc[1], 3 * s, blossoms);
  }

  return finish();
}

/** Sunlit Victorian glass conservatory dome with wrought-iron arches & lush palms inside (4 regions). */
export function drawGlassConservatory(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const wings = alloc('prop', 'Side Glass Wings');
  const dome = alloc('prop', 'Crystal Greenhouse Dome');
  const baseWall = alloc('prop', 'Conservatory Base Wall');
  const portal = alloc('star', 'Sunbeam Entry Arch');

  // Flanking arched glass side wings
  rrect(r, wings, ...p(-36, 12), 26 * s, 32 * s, 9 * s);
  rrect(r, wings, ...p(36, 12), 26 * s, 32 * s, 9 * s);
  r.line(INK, ...p(-36, -2), ...p(-36, 26), { only: [wings] });
  r.line(INK, ...p(36, -2), ...p(36, 26), { only: [wings] });

  // Grand central glass dome + finial
  r.disc(dome, ...p(0, -6), 30 * s);
  r.rect(dome, x - 30 * s, y - 6 * s, x + 30 * s, y + 24 * s);
  r.disc(dome, ...p(0, -37), 6 * s);
  // Conservatory iron ribs
  inkArc(r, ...p(0, -6), 15 * s, 29 * s, Math.PI, Math.PI * 2, 0, { only: [dome] });
  r.line(INK, ...p(0, -35), ...p(0, 22), { only: [dome] });
  r.line(INK, ...p(-28, -4), ...p(28, -4), { only: [dome] });

  // Stone garden plinth base
  r.rect(baseWall, x - 50 * s, y + 22 * s, x + 50 * s, y + 38 * s);
  for (const bx of [-34, -18, 18, 34]) {
    r.line(INK, ...p(bx, 23), ...p(bx, 37), { only: [baseWall] });
  }

  // Tall glowing entry doorway
  r.disc(portal, ...p(0, 14), 10.5 * s);
  r.rect(portal, x - 10.5 * s, y + 14 * s, x + 10.5 * s, y + 38 * s);
  r.line(INK, ...p(0, 5), ...p(0, 36), { only: [portal] });

  return finish();
}

// ===========================================================================
// 4. ORIGAMI / SAKURA / DRAGON (U5, U9, U19)
// ===========================================================================

/** Soaring geometric folded origami paper crane with crisp fold creases (3 regions). */
export function drawOrigamiCrane(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const farWing = alloc('prop', 'Origami Back Wing');
  const body = alloc('prop', 'Folded Crane Body');
  const nearWing = alloc('star', 'Origami Front Wing');

  // Far soaring wing + pointed tail
  r.poly(farWing, poly([[-6, -6], [-44, -36], [-12, 8]]));
  r.poly(farWing, poly([[14, 4], [46, -22], [28, 16]]));
  r.line(INK, ...p(-28, -20), ...p(-8, 2), { only: [farWing] });

  // Diamond folded body + graceful neck & folded beak head
  r.poly(body, poly([[-26, 2], [0, -14], [26, 6], [0, 26]]));
  r.poly(body, poly([[-16, 4], [-36, -24], [-46, -16], [-32, -10], [-20, 12]]));
  r.line(INK, ...p(-18, 4), ...p(18, 6), { only: [body] });
  r.line(INK, ...p(0, -12), ...p(0, 24), { only: [body] });

  // Foreground swept geometric wing
  r.poly(nearWing, poly([[-10, 4], [22, -34], [34, -8], [10, 14]]));
  r.line(INK, ...p(4, 2), ...p(22, -26), { only: [nearWing] });

  return finish();
}

/** Crisp folded origami paper boat sailing with tall triangular center sail (3 regions). */
export function drawPaperBoat(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const sail = alloc('star', 'Paper Boat Sail');
  const hull = alloc('prop', 'Folded Boat Hull');
  const brim = alloc('prop', 'Boat Folded Brim');

  // Tall triangular origami peak
  r.poly(sail, poly([[0, -36], [22, 6], [-22, 6]]));
  r.line(INK, ...p(0, -32), ...p(0, 4), { only: [sail] });

  // Wide prow-to-stern folded hull
  r.poly(hull, poly([[-48, 0], [48, 0], [32, 28], [-32, 28]]));
  r.line(INK, ...p(-36, 4), ...p(0, 25), { only: [hull] });
  r.line(INK, ...p(36, 4), ...p(0, 25), { only: [hull] });

  // Foreground folded cuff band
  r.poly(brim, poly([[-34, 16], [34, 16], [28, 30], [-28, 30]]));
  r.line(INK, ...p(0, 17), ...p(0, 29), { only: [brim] });

  return finish();
}

/** Tiered 3-story storybook pagoda tower with upturned curved eaves & golden spire (4 regions). */
export function drawPagodaTower(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const walls = alloc('prop', 'Pagoda Walls');
  const lowerRoof = alloc('prop', 'Lower Pagoda Eaves');
  const upperRoof = alloc('prop', 'Upper Pagoda Roofs');
  const spire = alloc('star', 'Pagoda Spire');

  // Stacked timber wall stories
  r.rect(walls, x - 26 * s, y + 10 * s, x + 26 * s, y + 36 * s);
  r.rect(walls, x - 20 * s, y - 10 * s, x + 20 * s, y + 10 * s);
  r.rect(walls, x - 14 * s, y - 24 * s, x + 14 * s, y - 10 * s);
  r.line(INK, ...p(-12, 12), ...p(-12, 35), { only: [walls] });
  r.line(INK, ...p(12, 12), ...p(12, 35), { only: [walls] });
  r.line(INK, ...p(0, -8), ...p(0, 8), { only: [walls] });

  // Sweeping upturned lower roof
  r.poly(lowerRoof, poly([[-44, 12], [-28, 2], [28, 2], [44, 12], [32, 16], [-32, 16]]));
  r.line(INK, ...p(-30, 10), ...p(30, 10), { only: [lowerRoof] });

  // Middle + top upturned roofs sharing one rich region
  r.poly(upperRoof, poly([[-36, -6], [-22, -16], [22, -16], [36, -6], [24, -2], [-24, -2]]));
  r.poly(upperRoof, poly([[-28, -22], [0, -36], [28, -22], [18, -18], [-18, -18]]));

  // Ornamental spire finial
  r.poly(spire, poly([[0, -48], [6, -34], [-6, -34]]));
  r.disc(spire, ...p(0, -34), 6 * s);

  return finish();
}

/** Soaring serpentine origami dragon kite with fierce joyful head & trailing paper tail (3 regions). */
export function drawKiteDragon(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const tail = alloc('prop', 'Kite Ribbon Tail');
  const body = alloc('star', 'Dragon Kite Segments');
  const head = alloc('prop', 'Dragon Kite Head');

  // Sweeping S-curve kite ribbon tail
  r.capsule(tail, ...p(-14, 10), ...p(-34, 24), 7 * s);
  r.capsule(tail, ...p(-34, 24), ...p(-46, 8), 6.5 * s);
  r.poly(tail, poly([[-46, 8], [-58, 0], [-52, 18]]));

  // Overlapping diamond kite scales
  for (const [u, v, rad] of [[-12, 8, 12], [2, -2, 13], [16, -12, 14]] as const) {
    r.poly(body, poly([[u, v - rad], [u + rad, v], [u, v + rad], [u - rad, v]]));
    r.line(INK, ...p(u - rad * 0.6, v), ...p(u + rad * 0.6, v), { only: [body] });
  }

  // Cheerful horned dragon kite head
  r.ellipse(head, ...p(30, -20), 16 * s, 13 * s);
  r.poly(head, poly([[22, -30], [18, -44], [30, -32]]));
  r.poly(head, poly([[32, -30], [40, -42], [40, -26]]));
  inkCircle(r, ...p(34, -22), 3.2 * s, head);
  r.line(INK, ...p(26, -14), ...p(42, -16), { only: [head] });

  return finish();
}

/** Iconic vermilion Torii shrine gate with curved kasagi lintel, pillars & nameplate (3 regions). */
export function drawToriiGate(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const pillars = alloc('prop', 'Torii Gate Pillars');
  const lintel = alloc('prop', 'Curved Torii Lintel');
  const plaque = alloc('star', 'Shrine Plaque');

  // Twin tall pillars + plinth bases + tie beam
  r.rect(pillars, x - 30 * s, y - 22 * s, x - 18 * s, y + 38 * s);
  r.rect(pillars, x + 18 * s, y - 22 * s, x + 30 * s, y + 38 * s);
  r.rect(pillars, x - 34 * s, y + 28 * s, x - 14 * s, y + 38 * s);
  r.rect(pillars, x + 14 * s, y + 28 * s, x + 34 * s, y + 38 * s);
  r.rect(pillars, x - 40 * s, y - 10 * s, x + 40 * s, y - 1 * s);
  r.line(INK, ...p(-24, -18), ...p(-24, 34), { only: [pillars] });
  r.line(INK, ...p(24, -18), ...p(24, 34), { only: [pillars] });

  // Sweeping upturned top kasagi crossbeam
  r.poly(lintel, poly([[-50, -34], [-24, -28], [24, -28], [50, -34], [46, -20], [-46, -20]]));
  r.line(INK, ...p(-42, -25), ...p(42, -25), { only: [lintel] });

  // Center lacquered nameplate tablet
  rrect(r, plaque, ...p(0, -14), 16 * s, 20 * s, 3 * s);
  inkPlus(r, ...p(0, -14), 4 * s, plaque);

  return finish();
}

/** Graceful leaping garden koi fish with flowing dorsal/tail fins & marbled spot patch (3 regions). */
export function drawKoiPondFish(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const fins = alloc('prop', 'Flowing Koi Fins');
  const body = alloc('prop', 'Koi Fish Body');
  const spots = alloc('star', 'Koi Calico Patch');

  // Sweeping veil tail + pectoral & dorsal fins
  r.poly(fins, poly([[-26, 2], [-52, -20], [-42, 4], [-52, 24], [-24, 10]]));
  r.ellipse(fins, ...p(2, -22), 18 * s, 9 * s, -0.3 * f);
  r.ellipse(fins, ...p(8, 20), 14 * s, 8 * s, 0.45 * f);
  r.line(INK, ...p(-32, 4), ...p(-46, -8), { only: [fins] });
  r.line(INK, ...p(-32, 6), ...p(-46, 16), { only: [fins] });

  // Plump curved koi torso
  r.ellipse(body, ...p(4, 0), 34 * s, 18 * s, -0.1 * f);
  inkArc(r, ...p(20, -2), 5 * s, 11 * s, Math.PI * 0.65, Math.PI * 1.35, 0, { only: [body] });
  inkCircle(r, ...p(27, -4), 3 * s, body);

  // Iconic koi calico head & saddle patches
  r.disc(spots, ...p(14, -5), 8.5 * s);
  r.ellipse(spots, ...p(-10, 1), 10 * s, 8 * s, -0.2 * f);

  return finish();
}

/** Blossoming sakura cherry tree with curving dark trunk & layered pink petal clouds (3 regions). */
export function drawSakuraTree(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const trunk = alloc('flora', 'Curved Sakura Trunk');
  const backBlossom = alloc('flora', 'Sakura Outer Petals');
  const frontBlossom = alloc('flora', 'Sakura Blossom Crown');

  // Graceful leaning trunk & spreading boughs
  r.poly(trunk, poly([[-14, 38], [-6, 12], [-22, -6], [-14, -12], [2, 2], [20, -10], [26, -4], [10, 14], [18, 38]]));
  r.line(INK, ...p(-4, 34), ...p(0, 8), { only: [trunk] });

  // Back petal puffs
  r.disc(backBlossom, ...p(-28, -14), 19 * s);
  r.disc(backBlossom, ...p(28, -14), 19 * s);
  r.disc(backBlossom, ...p(0, -30), 20 * s);

  // Front layered blossom cloud
  r.disc(frontBlossom, ...p(-14, -22), 18 * s);
  r.disc(frontBlossom, ...p(14, -20), 17 * s);
  r.disc(frontBlossom, ...p(0, -12), 16 * s);
  inkArc(r, ...p(-14, -22), 10 * s, 8 * s, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [frontBlossom] });
  inkArc(r, ...p(14, -20), 9 * s, 7 * s, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [frontBlossom] });

  return finish();
}

/** Curled sleeping jade cloud-dragon with folded wing, ridged spine & cozy snout (4 regions). */
export function drawSleepingDragon(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const body = alloc('prop', 'Sleeping Dragon Body');
  const belly = alloc('star', 'Dragon Belly Scales');
  const wing = alloc('prop', 'Folded Dragon Wing');
  const head = alloc('prop', 'Dragon Head & Horns');

  // Coiled plump sleeping body + curling tail
  r.ellipse(body, ...p(0, 8), 38 * s, 23 * s);
  r.capsule(body, ...p(-32, 14), ...p(-48, -4), 8 * s);
  r.poly(body, poly([[-48, -4], [-58, -14], [-44, -18]]));

  // Ribbed golden belly crescent
  r.ellipse(belly, ...p(2, 16), 24 * s, 11 * s);
  for (const bx of [-12, -2, 8, 18]) {
    r.line(INK, ...p(bx, 8), ...p(bx, 24), { only: [belly] });
  }

  // Folded scalloped wing resting over back
  r.poly(wing, poly([[-22, 4], [-6, -26], [16, -18], [10, 8], [-6, 12]]));
  r.line(INK, ...p(-6, -22), ...p(-8, 8), { only: [wing] });
  r.line(INK, ...p(-6, -22), ...p(8, 4), { only: [wing] });

  // Peaceful dragon head resting on paws with horns
  r.ellipse(head, ...p(28, 2), 17 * s, 13 * s);
  r.poly(head, poly([[18, -8], [10, -24], [26, -12]]));
  r.poly(head, poly([[28, -8], [32, -24], [38, -8]]));
  inkArc(r, ...p(32, 0), 4.5 * s, 3 * s, 0.1, Math.PI - 0.1, 0, { only: [head] });

  return finish();
}

/** Glowing festival paper lantern with lacquered caps, curved bamboo ribs & silk tassel (3 regions). */
export function drawPaperLantern(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const tassel = alloc('star', 'Lantern Silk Tassel');
  const caps = alloc('prop', 'Lantern Lacquer Caps');
  const globe = alloc('star', 'Paper Lantern Globe');

  // Plump silk hanging tassel below
  r.poly(tassel, poly([[-8, 22], [8, 22], [12, 40], [-12, 40]]));
  r.line(INK, ...p(-4, 24), ...p(-6, 38), { only: [tassel] });
  r.line(INK, ...p(4, 24), ...p(6, 38), { only: [tassel] });

  // Top & bottom lacquered wooden collars
  rrect(r, caps, ...p(0, -28), 28 * s, 10 * s, 3 * s);
  r.disc(caps, ...p(0, -35), 5.5 * s);
  rrect(r, caps, ...p(0, 20), 26 * s, 9 * s, 3 * s);

  // Ribbed glowing lantern belly
  r.ellipse(globe, ...p(0, -4), 28 * s, 24 * s);
  inkArc(r, ...p(0, -4), 14 * s, 23 * s, 0, Math.PI * 2, 0, { only: [globe] });
  r.line(INK, ...p(0, -26), ...p(0, 18), { only: [globe] });
  r.line(INK, ...p(-25, -4), ...p(25, -4), { only: [globe] });

  return finish();
}

// ===========================================================================
// 5. DINO / ICE / GEODE (U6, U7, U11)
// ===========================================================================

/** Friendly storybook rainbow brontosaurus with long curving neck, spots & sturdy legs (3 regions). */
export function drawBrontosaurus(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const legs = alloc('prop', 'Dino Back Legs');
  const body = alloc('flora', 'Brontosaurus Body');
  const spots = alloc('star', 'Rainbow Dino Spots');

  // Far legs behind torso
  r.capsule(legs, ...p(-22, 16), ...p(-24, 36), 7.5 * s);
  r.capsule(legs, ...p(8, 16), ...p(10, 36), 7.5 * s);

  // Plump body + swooping tail + tall curving neck + friendly head
  r.ellipse(body, ...p(-4, 6), 28 * s, 20 * s);
  r.capsule(body, ...p(-26, 10), ...p(-48, 22), 8 * s);
  r.capsule(body, ...p(16, 0), ...p(30, -30), 9 * s);
  r.ellipse(body, ...p(37, -30), 12 * s, 9 * s);
  r.capsule(body, ...p(-12, 18), ...p(-14, 36), 7.5 * s);
  r.capsule(body, ...p(18, 16), ...p(20, 36), 7.5 * s);
  inkCircle(r, ...p(40, -32), 2.2 * s, body);
  inkArc(r, ...p(41, -28), 5 * s, 3 * s, 0.2, Math.PI * 0.85, 0, { only: [body] });

  // Cheerful chunky saddle spots (shared region)
  r.disc(spots, ...p(-12, 0), 7 * s);
  r.disc(spots, ...p(4, -2), 8 * s);
  r.disc(spots, ...p(14, 8), 6 * s);

  return finish();
}

/** Lush prehistoric volcano caldera with glowing rainbow lava flow & puffing steam cloud (3 regions). */
export function drawVolcanoCaldera(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const cloud = alloc('cloud', 'Volcano Steam Puff');
  const cone = alloc('prop', 'Volcano Mountain');
  const lava = alloc('star', 'Glowing Lava Flow');

  // Puffing caldera cloud
  r.disc(cloud, ...p(-8, -32), 13 * s);
  r.disc(cloud, ...p(8, -34), 14 * s);
  r.disc(cloud, ...p(0, -24), 12 * s);
  inkArc(r, ...p(6, -34), 7 * s, 6 * s, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [cloud] });

  // Broad sloped volcanic cone
  r.poly(cone, poly([[-20, -14], [20, -14], [50, 38], [-50, 38]]));
  r.line(INK, ...p(-22, 4), ...p(-34, 32), { only: [cone] });
  r.line(INK, ...p(24, 6), ...p(36, 32), { only: [cone] });

  // Cascading glowing lava crown & streams
  r.ellipse(lava, ...p(0, -12), 21 * s, 8 * s);
  r.capsule(lava, ...p(-8, -8), ...p(-14, 16), 6.5 * s);
  r.capsule(lava, ...p(6, -8), ...p(12, 22), 7 * s);

  return finish();
}

/** Giant spiral ammonite fossil stone with ribbed shell chambers & crystal center (3 regions). */
export function drawAmmoniteFossil(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const stone = alloc('prop', 'Fossil Rock Base');
  const shell = alloc('prop', 'Ammonite Spiral Shell');
  const core = alloc('star', 'Spiral Fossil Core');

  // Grounding stone rock cradle
  r.ellipse(stone, ...p(0, 26), 38 * s, 13 * s);

  // Outer spiral chamber disc
  r.disc(shell, ...p(0, -2), 31 * s);
  // Radial ribbed chambers
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    r.line(INK, x + Math.cos(a) * 14 * s, y - 2 * s + Math.sin(a) * 14 * s, x + Math.cos(a) * 29 * s, y - 2 * s + Math.sin(a) * 29 * s, { only: [shell] });
  }

  // Inner coiled crystal spiral center
  r.disc(core, ...p(3, 0), 14 * s);
  inkArc(r, ...p(3, 0), 9 * s, 9 * s, 0, Math.PI * 1.7, 0, { only: [core] });
  inkArc(r, ...p(3, 0), 4.5 * s, 4.5 * s, 0, Math.PI * 1.8, 0, { only: [core] });

  return finish();
}

/** Cozy frosted snow-block igloo dome with arched ice tunnel & glowing warm entrance (3 regions). */
export function drawIglooDome(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const dome = alloc('prop', 'Snow-Block Igloo Dome');
  const tunnel = alloc('prop', 'Igloo Entry Arch');
  const doorway = alloc('star', 'Warm Igloo Glow');

  // Hemisphere igloo dome
  r.shape(dome, x - 44 * s, y - 34 * s, x + 44 * s, y + 36 * s, (px, py) => {
    if (py > y + 34 * s) return false;
    const dx = (px - x) / (42 * s);
    const dy = (py - (y + 34 * s)) / (60 * s);
    return dx * dx + dy * dy <= 1;
  });
  // Curved ice-block masonry seams
  for (const by of [-8, 6, 20]) {
    r.line(INK, ...p(-38, by), ...p(38, by), { only: [dome] });
  }
  for (const bx of [-22, -6, 10, 26]) {
    r.line(INK, ...p(bx, -8), ...p(bx, 6), { only: [dome] });
    r.line(INK, ...p(bx - 6, 6), ...p(bx - 6, 20), { only: [dome] });
  }

  // Rounded front entry tunnel hood
  r.disc(tunnel, ...p(14, 14), 19 * s);
  r.rect(tunnel, x + (14 * f - 19) * s, y + 14 * s, x + (14 * f + 19) * s, y + 35 * s);

  // Cozy glowing arched interior doorway
  r.disc(doorway, ...p(16, 17), 11 * s);
  r.rect(doorway, x + (16 * f - 11) * s, y + 17 * s, x + (16 * f + 11) * s, y + 35 * s);

  return finish();
}

/** Towering fairy-tale crystal ice palace with 3 pointed frost spires & glowing gate (4 regions). */
export function drawIcePalace(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const sideTowers = alloc('prop', 'Palace Frost Towers');
  const keep = alloc('prop', 'Crystal Palace Keep');
  const spires = alloc('star', 'Ice Palace Spires');
  const gate = alloc('star', 'Aurora Palace Gate');

  // Side crystal towers
  r.rect(sideTowers, x - 42 * s, y - 8 * s, x - 20 * s, y + 38 * s);
  r.rect(sideTowers, x + 20 * s, y - 8 * s, x + 42 * s, y + 38 * s);
  r.line(INK, ...p(-31, -4), ...p(-31, 34), { only: [sideTowers] });
  r.line(INK, ...p(31, -4), ...p(31, 34), { only: [sideTowers] });

  // Central palace keep
  r.rect(keep, x - 22 * s, y - 16 * s, x + 22 * s, y + 38 * s);
  r.line(INK, ...p(-20, 4), ...p(20, 4), { only: [keep] });
  inkPlus(r, ...p(0, -6), 4 * s, keep);

  // Three soaring icicle spires (shared region)
  r.poly(spires, poly([[0, -46], [24, -14], [-24, -14]]));
  r.poly(spires, poly([[-31, -34], [-18, -6], [-44, -6]]));
  r.poly(spires, poly([[31, -34], [44, -6], [18, -6]]));
  r.line(INK, ...p(0, -42), ...p(0, -16), { only: [spires] });

  // Pointed gothic palace portal
  r.poly(gate, poly([[0, 8], [13, 20], [13, 38], [-13, 38], [-13, 20]]));
  r.line(INK, ...p(0, 12), ...p(0, 36), { only: [gate] });

  return finish();
}

/** Enchanted storybook snowglobe on carved pedestal with miniature snowy castle inside (3 regions). */
export function drawSnowglobe(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const glass = alloc('prop', 'Snowglobe Crystal Dome');
  const village = alloc('star', 'Miniature Snow Village');
  const pedestal = alloc('prop', 'Carved Globe Pedestal');

  // Large glass globe
  r.disc(glass, ...p(0, -6), 34 * s);
  inkArc(r, ...p(0, -6), 27 * s, 27 * s, Math.PI * 1.1, Math.PI * 1.48, 0, { only: [glass] });
  inkPlus(r, ...p(-16, -20), 2.5 * s, glass);
  inkPlus(r, ...p(16, -22), 2.5 * s, glass);
  inkPlus(r, ...p(4, -28), 2 * s, glass);

  // Miniature alpine cottage + pine silhouette inside dome
  r.poly(village, poly([[-22, 16], [-22, 4], [-12, -10], [-2, 4], [10, -14], [22, 4], [22, 16]]));
  r.line(INK, ...p(-12, 4), ...p(-12, 14), { only: [village] });
  r.line(INK, ...p(10, -8), ...p(10, 14), { only: [village] });

  // Sturdy wooden/gold pedestal base
  r.poly(pedestal, poly([[-28, 20], [28, 20], [34, 38], [-34, 38]]));
  rrect(r, pedestal, ...p(0, 21), 62 * s, 7 * s, 3 * s);
  r.line(INK, ...p(-24, 30), ...p(24, 30), { only: [pedestal] });

  return finish();
}

/** Dramatic split amethyst geode cathedral cavern lined with faceted crystal teeth (3 regions). */
export function drawGeodeCathedral(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const shell = alloc('prop', 'Geode Outer Shell');
  const band = alloc('prop', 'Agate Mineral Rim');
  const heartId = alloc('star', 'Amethyst Crystal Core');

  // Egg-shaped outer rocky shell
  r.ellipse(shell, ...p(0, 0), 38 * s, 40 * s);
  inkArc(r, ...p(0, 0), 33 * s, 35 * s, Math.PI * 0.2, Math.PI * 1.8, 0, { only: [shell] });

  // Concentric banded mineral rim
  r.ellipse(band, ...p(0, 2), 28 * s, 31 * s);
  inkArc(r, ...p(0, 2), 24 * s, 27 * s, 0, Math.PI * 2, 0, { only: [band] });

  // Faceted inner crystal cathedral cavern
  r.poly(heartId, poly([
    [0, -24], [14, -14], [18, 6], [12, 24], [-12, 24], [-18, 6], [-14, -14],
  ]));
  r.line(INK, ...p(0, -22), ...p(0, 22), { only: [heartId] });
  r.line(INK, ...p(-14, -10), ...p(0, 2), { only: [heartId] });
  r.line(INK, ...p(14, -10), ...p(0, 2), { only: [heartId] });
  r.line(INK, ...p(-14, 12), ...p(0, 2), { only: [heartId] });
  r.line(INK, ...p(14, 12), ...p(0, 2), { only: [heartId] });

  return finish();
}

/** Radiant multi-prism crystal spire cluster rising from rocky matrix (3 regions). */
export function drawCrystalCluster(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const sideSpikes = alloc('star', 'Side Crystal Prisms');
  const mainSpire = alloc('star', 'Central Crystal Spire');
  const matrix = alloc('prop', 'Crystal Rock Matrix');

  // Flanking angled prisms
  r.poly(sideSpikes, poly([[-26, -24], [-12, -16], [-10, 22], [-30, 22], [-38, -8]]));
  r.poly(sideSpikes, poly([[28, -20], [38, -4], [30, 22], [10, 22], [14, -14]]));
  r.line(INK, ...p(-26, -20), ...p(-20, 18), { only: [sideSpikes] });
  r.line(INK, ...p(28, -16), ...p(22, 18), { only: [sideSpikes] });

  // Tall central hex spire
  r.poly(mainSpire, poly([[0, -40], [16, -20], [14, 24], [-14, 24], [-16, -20]]));
  r.line(INK, ...p(0, -36), ...p(0, 20), { only: [mainSpire] });
  r.line(INK, ...p(-14, -18), ...p(0, -10), { only: [mainSpire] });
  r.line(INK, ...p(14, -18), ...p(0, -10), { only: [mainSpire] });

  // Chunky stone base matrix
  r.ellipse(matrix, ...p(0, 26), 38 * s, 12 * s);
  r.line(INK, ...p(-24, 24), ...p(24, 28), { only: [matrix] });

  return finish();
}

/** Gem-heaped crystal cave minecart with riveted iron tub & twin rail wheels (3 regions). */
export function drawMinecart(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const gems = alloc('star', 'Heaped Crystal Gems');
  const tub = alloc('prop', 'Riveted Minecart Tub');
  const wheels = alloc('prop', 'Minecart Rail Wheels');

  // Overflowing faceted gem pile
  r.poly(gems, poly([[-30, -4], [-22, -26], [-8, -18], [4, -34], [18, -18], [30, -24], [34, -4]]));
  r.line(INK, ...p(4, -30), ...p(4, -6), { only: [gems] });
  r.line(INK, ...p(-20, -22), ...p(-16, -6), { only: [gems] });
  r.line(INK, ...p(22, -20), ...p(20, -6), { only: [gems] });

  // Flared iron hopper tub
  r.poly(tub, poly([[-38, -6], [38, -6], [30, 24], [-30, 24]]));
  rrect(r, tub, ...p(0, -6), 80 * s, 7 * s, 3 * s);
  for (const bx of [-16, 0, 16]) {
    r.line(INK, ...p(bx, -1), ...p(bx * 0.85, 22), { only: [tub] });
  }

  // Twin chunky iron wheels (shared region)
  for (const wx of [-19, 19]) {
    r.disc(wheels, ...p(wx, 28), 11 * s);
    inkCircle(r, ...p(wx, 28), 5 * s, wheels);
  }

  return finish();
}

// ===========================================================================
// 6. CLOCKWORK / MUSIC / CIRCUS / ARCADE (U8, U10, U14, U18)
// ===========================================================================

/** Majestic brass & cloudwork steampunk airship with ribbed dirigible hull, tail fins & gondola (4 regions). */
export function drawBrassAirship(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const fins = alloc('prop', 'Airship Tail Fins');
  const hull = alloc('prop', 'Dirigible Balloon');
  const band = alloc('star', 'Brass Trim Band');
  const gondola = alloc('prop', 'Airship Gondola');

  // Swept tail stabilizer fins
  r.poly(fins, poly([[-32, -16], [-52, -32], [-46, -6]]));
  r.poly(fins, poly([[-32, 2], [-52, 16], [-44, -6]]));

  // Plump dirigible balloon envelope
  r.ellipse(hull, ...p(2, -10), 46 * s, 25 * s);
  inkArc(r, ...p(2, -10), 44 * s, 12 * s, 0, Math.PI * 2, 0, { only: [hull] });
  r.line(INK, ...p(-40, -10), ...p(44, -10), { only: [hull] });

  // Decorative central brass rib collar
  r.ellipse(band, ...p(6, -10), 11 * s, 25 * s);
  r.line(INK, ...p(6, -33), ...p(6, 13), { only: [band] });

  // Suspended boat-shaped gondola cabin
  r.poly(gondola, poly([[-18, 16], [24, 16], [18, 34], [-14, 34]]));
  inkCircle(r, ...p(-4, 24), 4 * s, gondola);
  inkCircle(r, ...p(10, 24), 4 * s, gondola);

  return finish();
}

/** Chunky ornate clockwork gear with 8 broad teeth, spoked wheel & jewel center hub (3 regions). */
export function drawClockworkGear(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const rim = alloc('prop', 'Clockwork Gear Wheel');
  const inner = alloc('prop', 'Gear Spokes Plate');
  const hub = alloc('star', 'Gear Jewel Hub');

  // Outer cog teeth + wheel ring
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tx = x + Math.cos(a) * 32 * s;
    const ty = y + Math.sin(a) * 32 * s;
    rrect(r, rim, tx, ty, 14 * s, 11 * s, 2.5 * s, a);
  }
  r.disc(rim, x, y, 29 * s);
  inkCircle(r, x, y, 25 * s, rim);

  // Recessed spoked inner disc
  r.disc(inner, x, y, 20 * s);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    r.line(INK, x - Math.cos(a) * 18 * s, y - Math.sin(a) * 18 * s, x + Math.cos(a) * 18 * s, y + Math.sin(a) * 18 * s, { only: [inner] });
  }

  // Center jewel axle
  r.disc(hub, ...p(0, 0), 10.5 * s);
  inkPlus(r, ...p(0, 0), 4.5 * s, hub);

  return finish();
}

/** Enchanted concert grand piano with raised winged lid, keyboard & sturdy legs (3 regions). */
export function drawGrandPiano(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const lid = alloc('star', 'Grand Piano Wing Lid');
  const body = alloc('prop', 'Piano Case & Legs');
  const keys = alloc('prop', 'Ivory Piano Keys');

  // Raised swooping lid wing
  r.poly(lid, poly([[-38, -4], [24, -36], [42, -24], [32, -4]]));
  r.line(INK, ...p(-20, -10), ...p(26, -28), { only: [lid] });

  // Piano body + 3 legs + pedal lyre
  rrect(r, body, ...p(0, 4), 78 * s, 22 * s, 5 * s);
  r.rect(body, x - 34 * s, y + 14 * s, x - 24 * s, y + 38 * s);
  r.rect(body, x + 24 * s, y + 14 * s, x + 34 * s, y + 38 * s);
  r.rect(body, x - 6 * s, y + 14 * s, x + 6 * s, y + 36 * s);

  // Foreground keyboard deck with inked black keys
  rrect(r, keys, ...p(-6, 4), 56 * s, 12 * s, 2.5 * s);
  for (let kx = -28; kx <= 16; kx += 7) {
    r.line(INK, ...p(kx, -1), ...p(kx, 9), { only: [keys] });
  }
  for (const bx of [-25, -18, -4, 3, 10]) {
    r.line(INK, ...p(bx, -1), ...p(bx, 4), { only: [keys] });
    r.line(INK, ...p(bx + 1, -1), ...p(bx + 1, 4), { only: [keys] });
  }

  return finish();
}

/** Celestial golden concert harp with flowing musical waterfall strings (3 regions). */
export function drawHarpWaterfall(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const cascade = alloc('star', 'Melody Waterfall Strings');
  const frame = alloc('prop', 'Golden Harp Frame');
  const splash = alloc('cloud', 'Mist Cascade Pool');

  // Flowing shimmering string cascade inside the harp
  r.poly(cascade, poly([[-20, -24], [24, -14], [18, 28], [-20, 28]]));
  for (const sx of [-12, -4, 4, 12]) {
    r.line(INK, ...p(sx, -20), ...p(sx, 26), { only: [cascade] });
  }

  // Ornate carved pillar + curved neck + soundboard
  r.capsule(frame, ...p(-24, -34), ...p(-24, 30), 6.5 * s);
  r.disc(frame, ...p(-24, -36), 8 * s);
  r.capsule(frame, ...p(-22, -32), ...p(6, -24), 6.5 * s);
  r.capsule(frame, ...p(6, -24), ...p(30, -14), 6 * s);
  r.capsule(frame, ...p(28, -12), ...p(16, 30), 7.5 * s);

  // Bubbly mist cloud pool at base
  r.ellipse(splash, ...p(2, 31), 34 * s, 9 * s);
  r.disc(splash, ...p(-18, 28), 8 * s);
  r.disc(splash, ...p(20, 28), 8 * s);

  return finish();
}

/** Giant musical vinyl-record moon sculpture with crescent needle arm & center label (3 regions). */
export function drawVinylMoon(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const discId = alloc('prop', 'Vinyl Record Disc');
  const labelId = alloc('star', 'Record Center Label');
  const toneArm = alloc('prop', 'Golden Tonearm');

  // Large grooved vinyl record disc
  r.disc(discId, ...p(-4, 0), 34 * s);
  for (const rad of [29, 24, 19]) {
    inkCircle(r, ...p(-4, 0), rad * s, discId);
  }

  // Inner colored vinyl label
  r.disc(labelId, ...p(-4, 0), 13.5 * s);
  inkCircle(r, ...p(-4, 0), 4 * s, labelId);

  // Retro phonograph tonearm resting across right side
  r.disc(toneArm, ...p(34, -22), 10 * s);
  r.capsule(toneArm, ...p(34, -22), ...p(24, 14), 4.8 * s);
  rrect(r, toneArm, ...p(18, 20), 14 * s, 10 * s, 3 * s, 0.4 * f);

  return finish();
}

/** Grand striped starlight circus big-top tent with fluttering pennants & open curtain entry (4 regions). */
export function drawCircusBigTop(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const flag = alloc('star', 'Big-Top Pennant');
  const walls = alloc('prop', 'Circus Tent Walls');
  const canopy = alloc('prop', 'Striped Big-Top Canopy');
  const entry = alloc('star', 'Glowing Tent Entrance');

  // Top pennant banner
  r.capsule(flag, ...p(0, -34), ...p(0, -46), 3.2 * s);
  r.poly(flag, poly([[0, -46], [26, -40], [0, -33]]));

  // Lower tent walls
  r.rect(walls, x - 42 * s, y + 2 * s, x + 42 * s, y + 38 * s);
  for (const wx of [-28, -14, 14, 28]) {
    r.line(INK, ...p(wx, 4), ...p(wx, 36), { only: [walls] });
  }

  // Sweeping peaked circus roof canopy + scalloped valance
  r.poly(canopy, poly([[0, -36], [48, 2], [-48, 2]]));
  for (const ox of [-36, -24, -12, 0, 12, 24, 36]) {
    r.disc(canopy, ...p(ox, 4), 7 * s);
  }
  for (const sx of [-24, 0, 24]) {
    r.line(INK, ...p(0, -34), ...p(sx, 2), { only: [canopy] });
  }

  // Welcoming arched tent entrance
  r.poly(entry, poly([[0, 12], [16, 38], [-16, 38]]));
  r.disc(entry, ...p(0, 18), 10 * s);

  return finish();
}

/** Whimsical storybook carousel pavilion with scalloped crown dome, painted canopy & base deck (4 regions). */
export function drawCarousel(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const column = alloc('prop', 'Carousel Center Column');
  const horses = alloc('star', 'Carousel Steeds');
  const canopy = alloc('prop', 'Carousel Crown Canopy');
  const base = alloc('prop', 'Carousel Stage Deck');

  // Center mirrored column + brass poles
  r.rect(column, x - 12 * s, y - 8 * s, x + 12 * s, y + 28 * s);
  r.line(INK, ...p(-4, -6), ...p(-4, 26), { only: [column] });
  r.line(INK, ...p(4, -6), ...p(4, 26), { only: [column] });

  // Twin prancing carousel pony silhouettes (shared region)
  for (const dir of [-1, 1] as const) {
    const hx = dir * 24;
    r.ellipse(horses, ...p(hx, 12), 13 * s, 7.5 * s);
    r.capsule(horses, ...p(hx + dir * 7, 10), ...p(hx + dir * 11, -1), 4.5 * s);
    r.capsule(horses, ...p(hx - 6, 16), ...p(hx - 8, 25), 3.2 * s);
    r.capsule(horses, ...p(hx + 6, 16), ...p(hx + 8, 25), 3.2 * s);
  }

  // Conical circus dome roof
  r.poly(canopy, poly([[0, -38], [46, -8], [-46, -8]]));
  for (const ox of [-34, -20, -6, 8, 22, 34]) {
    r.disc(canopy, ...p(ox, -6), 7 * s);
  }
  r.line(INK, ...p(0, -34), ...p(-20, -8), { only: [canopy] });
  r.line(INK, ...p(0, -34), ...p(20, -8), { only: [canopy] });

  // Circular stepped wooden carousel platform
  r.ellipse(base, ...p(0, 30), 46 * s, 10 * s);
  r.line(INK, ...p(-36, 30), ...p(36, 30), { only: [base] });

  return finish();
}

/** Towering starlight Ferris wheel with glowing passenger gondolas & A-frame support (4 regions). */
export function drawFerrisWheel(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const legs = alloc('prop', 'Ferris Support Frame');
  const wheel = alloc('prop', 'Ferris Wheel Rim');
  const hub = alloc('star', 'Ferris Star Hub');
  const cabins = alloc('star', 'Passenger Gondolas');

  // Sturdy A-frame base legs
  r.poly(legs, poly([[-8, -4], [8, -4], [32, 38], [20, 38], [0, 8], [-20, 38], [-32, 38]]));

  // Outer ring + spokes drawn into wheel region
  const cy = y - 6 * s;
  r.shape(wheel, x - 36 * s, cy - 36 * s, x + 36 * s, cy + 36 * s, (px, py) => {
    const d = Math.hypot(px - x, py - cy);
    return d <= 34 * s && d >= 24 * s;
  });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI;
    r.capsule(wheel, x - Math.cos(a) * 28 * s, cy - Math.sin(a) * 28 * s, x + Math.cos(a) * 28 * s, cy + Math.sin(a) * 28 * s, 2.6 * s);
  }

  // Center star hub
  r.disc(hub, x, cy, 10 * s);
  inkPlus(r, x, cy, 5 * s, hub);

  // 6 cheerful gondolas around the rim (shared region)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const gx = x + Math.cos(a) * 32 * s;
    const gy = cy + Math.sin(a) * 32 * s;
    rrect(r, cabins, gx, gy, 13 * s, 11 * s, 4 * s);
    r.line(INK, gx - 4 * s, gy, gx + 4 * s, gy, { only: [cabins] });
  }

  return finish();
}

/** Retro neon-rainbow standing arcade cabinet with glowing CRT screen, marquee & joystick deck (4 regions). */
export function drawArcadeCabinet(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const cabinet = alloc('prop', 'Arcade Cabinet Body');
  const marquee = alloc('star', 'Neon Marquee Sign');
  const screen = alloc('star', 'Glowing Pixel Screen');
  const deck = alloc('prop', 'Joystick Control Deck');

  // Iconic side-chamfered standing cabinet silhouette
  r.poly(cabinet, poly([[-26, -38], [26, -38], [28, -22], [24, -18], [24, 6], [32, 14], [28, 38], [-28, 38], [-32, 14], [-24, 6], [-24, -18], [-28, -22]]));
  r.line(INK, ...p(-16, 26), ...p(16, 26), { only: [cabinet] });
  inkCircle(r, ...p(-8, 31), 2.5 * s, cabinet);
  inkCircle(r, ...p(8, 31), 2.5 * s, cabinet);

  // Top illuminated marquee header
  rrect(r, marquee, ...p(0, -30), 44 * s, 12 * s, 3 * s);
  inkPlus(r, ...p(-12, -30), 3 * s, marquee);
  inkPlus(r, ...p(12, -30), 3 * s, marquee);

  // Chunky curved CRT screen with pixel alien/star motif
  rrect(r, screen, ...p(0, -6), 38 * s, 26 * s, 5 * s);
  r.line(INK, ...p(-12, -12), ...p(12, -12), { only: [screen] });
  inkPlus(r, ...p(0, -4), 4.5 * s, screen);

  // Control console panel
  r.poly(deck, poly([[-26, 9], [26, 9], [30, 19], [-30, 19]]));
  inkCircle(r, ...p(-12, 14), 3 * s, deck);
  inkCircle(r, ...p(6, 14), 2.2 * s, deck);
  inkCircle(r, ...p(14, 14), 2.2 * s, deck);

  return finish();
}

/** Neon prize claw machine with transparent plushie showcase, dangling claw & coin base (4 regions). */
export function drawClawMachine(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const frame = alloc('prop', 'Claw Machine Frame');
  const glass = alloc('prop', 'Showcase Glass Window');
  const prizes = alloc('star', 'Plushie Prize Pile');
  const topCrown = alloc('star', 'Arcade Neon Crown');

  // Tall sturdy arcade housing
  rrect(r, frame, ...p(0, 2), 62 * s, 72 * s, 5 * s);
  r.line(INK, ...p(-24, 24), ...p(24, 24), { only: [frame] });
  rrect(r, frame, ...p(-12, 31), 16 * s, 10 * s, 2 * s);

  // Bright marquee crown
  rrect(r, topCrown, ...p(0, -32), 64 * s, 13 * s, 4 * s);
  inkPlus(r, ...p(0, -32), 3.5 * s, topCrown);

  // Big clear prize showcase window + inked mechanical claw
  rrect(r, glass, ...p(0, -4), 50 * s, 38 * s, 4 * s);
  r.line(INK, ...p(0, -22), ...p(0, -8), { only: [glass] });
  r.line(INK, ...p(0, -8), ...p(-8, -1), { only: [glass] });
  r.line(INK, ...p(0, -8), ...p(8, -1), { only: [glass] });

  // Mound of round cuddly plushies at bottom of showcase
  r.disc(prizes, ...p(-14, 10), 9 * s);
  r.disc(prizes, ...p(0, 8), 10 * s);
  r.disc(prizes, ...p(14, 10), 9 * s);
  r.dot(INK, ...p(-2, 6), { only: [prizes] });
  r.dot(INK, ...p(2, 6), { only: [prizes] });

  return finish();
}

// ===========================================================================
// 7. DESERT / LIBRARY / DESK / NILE / NEXUS (U12, U13, U15, U20, U21)
// ===========================================================================

/** Starlight desert stepped pyramid temple with glowing capstone & grand entrance (3 regions). */
export function drawPyramidTemple(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const body = alloc('prop', 'Pyramid Sandstone Body');
  const cap = alloc('star', 'Golden Pyramid Capstone');
  const gate = alloc('prop', 'Temple Sanctuary Gate');

  // Grand pyramid triangle with perspective ridge
  r.poly(body, poly([[0, -38], [50, 36], [-50, 36]]));
  r.line(INK, ...p(0, -16), ...p(16, 35), { only: [body] });
  for (const py of [-4, 8, 20]) {
    r.line(INK, ...p(-36, py), ...p(36, py), { only: [body] });
  }

  // Radiant golden apex capstone
  r.poly(cap, poly([[0, -38], [18, -12], [-18, -12]]));
  inkPlus(r, ...p(0, -21), 4 * s, cap);

  // Monumental temple entryway
  r.poly(gate, poly([[-14, 10], [14, 10], [18, 36], [-18, 36]]));
  r.line(INK, ...p(-8, 12), ...p(-8, 35), { only: [gate] });
  r.line(INK, ...p(8, 12), ...p(8, 35), { only: [gate] });

  return finish();
}

/** Swaying starlight oasis palm tree with ringed curved trunk, lush fronds & coconuts (3 regions). */
export function drawOasisPalm(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const trunk = alloc('flora', 'Curved Palm Trunk');
  const fronds = alloc('flora', 'Oasis Palm Fronds');
  const coconuts = alloc('prop', 'Golden Coconuts');

  // S-curved ringed trunk
  r.capsule(trunk, ...p(-12, 36), ...p(-4, 6), 8 * s);
  r.capsule(trunk, ...p(-4, 6), ...p(4, -18), 6.5 * s);
  for (const [u, v] of [[-10, 26], [-7, 16], [-3, 6], [0, -4], [2, -12]] as const) {
    r.line(INK, ...p(u - 6, v), ...p(u + 6, v + 2), { only: [trunk] });
  }

  // Sweeping star-burst palm canopy fronds
  const cx = x + 4 * s * f;
  const cy = y - 18 * s;
  for (const [dx, dy, rx, ry, ang] of [
    [-22, -6, 22, 8, -0.35],
    [22, -6, 22, 8, 0.35],
    [-16, -18, 18, 7.5, -0.85],
    [16, -18, 18, 7.5, 0.85],
    [0, -20, 14, 7.5, 0],
  ] as const) {
    r.ellipse(fronds, cx + dx * s * f, cy + dy * s, rx * s, ry * s, ang * f);
  }
  r.line(INK, cx, cy, cx - 34 * s * f, cy - 4 * s, { only: [fronds] });
  r.line(INK, cx, cy, cx + 34 * s * f, cy - 4 * s, { only: [fronds] });

  // Cluster of 3 plump coconuts beneath crown
  r.disc(coconuts, ...p(-2, -10), 6.5 * s);
  r.disc(coconuts, ...p(10, -10), 6.5 * s);
  r.disc(coconuts, ...p(4, -4), 6.5 * s);

  return finish();
}

/** Billowing flying magic carpet with ornate woven medallion & 4 golden tassels (3 regions). */
export function drawMagicCarpet(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const tassels = alloc('star', 'Golden Carpet Tassels');
  const rug = alloc('prop', 'Woven Magic Carpet');
  const emblem = alloc('star', 'Carpet Star Medallion');

  // Four corner swinging tassels (shared region)
  for (const [u, v] of [[-46, 2], [46, -10], [-36, 22], [36, 16]] as const) {
    r.capsule(tassels, ...p(u, v), ...p(u + (u < 0 ? -7 : 7), v + 12), 4.5 * s);
  }

  // Undulating wavy perspective carpet body
  r.poly(rug, poly([
    [-46, 0], [-14, -14], [18, -8], [46, -12],
    [36, 16], [8, 22], [-18, 14], [-36, 22],
  ]));
  r.line(INK, ...p(-36, 4), ...p(36, -4), { only: [rug] });
  r.line(INK, ...p(-30, 14), ...p(30, 10), { only: [rug] });

  // Central diamond star emblem
  r.poly(emblem, poly([[0, -8], [20, 4], [0, 16], [-20, 4]]));
  inkPlus(r, ...p(0, 4), 5 * s, emblem);

  return finish();
}

/** Towering storybook castle built from stacked gilded books with spire turret & bookmark banner (4 regions). */
export function drawBookCastle(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const baseBooks = alloc('prop', 'Stacked Tome Foundation');
  const towers = alloc('prop', 'Book Spine Towers');
  const roofs = alloc('star', 'Storybook Turret Roofs');
  const bookmark = alloc('star', 'Ribbon Bookmark Gate');

  // Horizontal stacked base books
  rrect(r, baseBooks, ...p(0, 26), 88 * s, 20 * s, 4 * s);
  r.line(INK, ...p(-40, 26), ...p(40, 26), { only: [baseBooks] });
  r.line(INK, ...p(-28, 17), ...p(-28, 35), { only: [baseBooks] });
  r.line(INK, ...p(28, 17), ...p(28, 35), { only: [baseBooks] });

  // Vertical tall book-spine towers
  rrect(r, towers, ...p(-26, -4), 22 * s, 44 * s, 3 * s);
  rrect(r, towers, ...p(26, -4), 22 * s, 44 * s, 3 * s);
  rrect(r, towers, ...p(0, -10), 28 * s, 54 * s, 3 * s);
  r.line(INK, ...p(-32, -8), ...p(-20, -8), { only: [towers] });
  r.line(INK, ...p(20, -8), ...p(32, -8), { only: [towers] });
  r.line(INK, ...p(-10, -16), ...p(10, -16), { only: [towers] });

  // Three storybook spire roofs (shared region)
  r.poly(roofs, poly([[0, -48], [18, -34], [-18, -34]]));
  r.poly(roofs, poly([[-26, -40], [-12, -24], [-40, -24]]));
  r.poly(roofs, poly([[26, -40], [40, -24], [12, -24]]));

  // Flowing ribbon bookmark + arched library gate
  r.poly(bookmark, poly([[-10, 4], [10, 4], [10, 38], [0, 30], [-10, 38]]));
  inkPlus(r, ...p(0, 16), 3.5 * s, bookmark);

  return finish();
}

/** Enchanted giant glass inkwell bottle with soaring feather quill pen & starry ink swirl (3 regions). */
export function drawGiantInkwell(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const quill = alloc('star', 'Feather Quill Plume');
  const bottle = alloc('prop', 'Crystal Inkwell Jar');
  const inkBody = alloc('star', 'Starlight Ink Pool');

  // Sweeping grand feather plume emerging from neck
  r.capsule(quill, ...p(4, -6), ...p(28, -40), 5 * s);
  r.ellipse(quill, ...p(22, -28), 24 * s, 11 * s, -0.82 * f);
  r.line(INK, ...p(6, -8), ...p(32, -38), { only: [quill] });
  r.line(INK, ...p(18, -28), ...p(10, -34), { only: [quill] });
  r.line(INK, ...p(26, -24), ...p(34, -22), { only: [quill] });

  // Faceted glass inkwell jar + rim collar
  r.poly(bottle, poly([[-24, -4], [24, -4], [34, 34], [-34, 34]]));
  rrect(r, bottle, ...p(0, -10), 34 * s, 12 * s, 4 * s);
  r.line(INK, ...p(-24, 4), ...p(-28, 28), { only: [bottle] });

  // Glowing swirling ink lake inside bottle
  r.poly(inkBody, poly([[-24, 8], [24, 8], [28, 30], [-28, 30]]));
  inkArc(r, ...p(0, 19), 14 * s, 6 * s, 0, Math.PI * 2, 0, { only: [inkBody] });

  return finish();
}

/** Grand celestial hourglass tower with twin glass bulbs, golden sand & carved end caps (3 regions). */
export function drawHourglassTower(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const glass = alloc('prop', 'Hourglass Crystal Bulbs');
  const sand = alloc('star', 'Starlight Hourglass Sand');
  const frame = alloc('prop', 'Hourglass Pillars & Caps');

  // Twin pinched crystal bulbs
  r.disc(glass, ...p(0, -16), 21 * s);
  r.disc(glass, ...p(0, 16), 21 * s);
  r.rect(glass, x - 7 * s, y - 6 * s, x + 7 * s, y + 6 * s);

  // Flowing golden sand cones inside upper & lower bulbs
  r.poly(sand, poly([[-14, -14], [14, -14], [0, -2]]));
  r.poly(sand, poly([[0, 6], [17, 30], [-17, 30]]));
  r.line(INK, ...p(0, -2), ...p(0, 12), { only: [sand] });

  // Ornate top & bottom caps + flanking brass columns
  rrect(r, frame, ...p(0, -36), 62 * s, 10 * s, 3.5 * s);
  rrect(r, frame, ...p(0, 36), 62 * s, 10 * s, 3.5 * s);
  r.rect(frame, x - 28 * s, y - 32 * s, x - 20 * s, y + 32 * s);
  r.rect(frame, x + 20 * s, y - 32 * s, x + 28 * s, y + 32 * s);

  return finish();
}

/** Giant colorful sharpened pencil-spire tower with eraser crown & ferrule band (4 regions). */
export function drawPencilTower(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const tip = alloc('star', 'Pencil Spire Tip');
  const shaft = alloc('prop', 'Hexagonal Pencil Tower');
  const ferrule = alloc('prop', 'Brass Ferrule Band');
  const eraser = alloc('milkshake', 'Rosy Eraser Base');

  // Sharpened conical spire top
  r.poly(tip, poly([[0, -44], [20, -14], [-20, -14]]));
  r.line(INK, ...p(-7, -33), ...p(7, -33), { only: [tip] });

  // Faceted hexagonal barrel
  r.rect(shaft, x - 20 * s, y - 14 * s, x + 20 * s, y + 16 * s);
  r.line(INK, ...p(-7, -12), ...p(-7, 14), { only: [shaft] });
  r.line(INK, ...p(7, -12), ...p(7, 14), { only: [shaft] });

  // Ribbed metal ferrule collar
  rrect(r, ferrule, ...p(0, 20), 44 * s, 10 * s, 2.5 * s);
  r.line(INK, ...p(-18, 20), ...p(18, 20), { only: [ferrule] });

  // Chunky rounded pink eraser plinth
  rrect(r, eraser, ...p(0, 32), 42 * s, 14 * s, 5 * s);

  return finish();
}

/** Whimsical wooden thread-spool castle with colorful wound silk threads & button turret (3 regions). */
export function drawSpoolCastle(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const thread = alloc('star', 'Wound Silk Thread');
  const flanges = alloc('prop', 'Wooden Spool Flanges');
  const button = alloc('prop', 'Giant Button Crown');

  // Thick wound silk spool body
  r.rect(thread, x - 26 * s, y - 16 * s, x + 26 * s, y + 24 * s);
  for (let ty = -10; ty <= 18; ty += 6) {
    r.line(INK, ...p(-24, ty), ...p(24, ty + 2), { only: [thread] });
  }

  // Top & bottom wooden spool flanges
  r.ellipse(flanges, ...p(0, -18), 38 * s, 10 * s);
  r.ellipse(flanges, ...p(0, 26), 40 * s, 11 * s);
  inkArc(r, ...p(0, -18), 26 * s, 5 * s, 0, Math.PI * 2, 0, { only: [flanges] });

  // Oversized 4-hole sewing button perched atop
  r.disc(button, ...p(0, -32), 14 * s);
  inkCircle(r, ...p(0, -32), 10 * s, button);
  for (const [bx, by] of [[-3.5, -35.5], [3.5, -35.5], [-3.5, -28.5], [3.5, -28.5]] as const) {
    inkCircle(r, ...p(bx, by), 1.6 * s, button);
  }

  return finish();
}

/** Giant cozy porcelain teacup & saucer with rising starry steam swirl & tea tag (4 regions). */
export function drawGiantTeacup(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const steam = alloc('cloud', 'Fragrant Tea Steam');
  const saucer = alloc('prop', 'Porcelain Saucer');
  const cup = alloc('prop', 'Giant Porcelain Teacup');
  const tea = alloc('star', 'Golden Tea Surface');

  // Rising curled steam puff
  r.disc(steam, ...p(-8, -26), 11 * s);
  r.disc(steam, ...p(6, -32), 12 * s);
  r.disc(steam, ...p(14, -22), 9 * s);

  // Broad decorative saucer
  r.ellipse(saucer, ...p(0, 30), 46 * s, 11 * s);
  inkArc(r, ...p(0, 30), 34 * s, 6 * s, 0.1, Math.PI - 0.1, 0, { only: [saucer] });

  // Looped cup handle on right + rounded bowl
  r.shape(cup, x + 22 * s * f - (f < 0 ? 30 * s : 0), y - 12 * s, x + 52 * s * f + (f < 0 ? 30 * s : 0), y + 20 * s, (px, py) => {
    const hx = x + 34 * s * f;
    const d = Math.hypot((px - hx) / (15 * s), (py - (y + 3 * s)) / (14 * s));
    return d <= 1.0 && d >= 0.48;
  });
  r.shape(cup, x - 38 * s, y - 14 * s, x + 38 * s, y + 30 * s, (px, py) => {
    if (py < y - 12 * s || py > y + 29 * s) return false;
    const t = (py - (y - 12 * s)) / (41 * s);
    const hw = 35 * s * Math.sqrt(Math.max(0, 1 - t * t * 0.62));
    return Math.abs(px - x) <= hw;
  });
  inkPlus(r, ...p(0, 10), 6 * s, cup);

  // Shimmering tea surface ellipse
  r.ellipse(tea, ...p(0, -10), 31 * s, 8 * s);
  inkArc(r, ...p(0, -10), 18 * s, 4 * s, 0.2, Math.PI * 1.4, 0, { only: [tea] });

  return finish();
}

/** Regal friendly Golden Sphinx with striped royal nemes headdress, paws & solar crown (3 regions). */
export function drawGoldenSphinx(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const body = alloc('prop', 'Golden Sphinx Body');
  const headdress = alloc('star', 'Royal Nemes Headdress');
  const face = alloc('prop', 'Sphinx Face & Crown');

  // Recumbent lion torso + outstretched stone paws
  r.ellipse(body, ...p(-10, 14), 34 * s, 19 * s);
  r.capsule(body, ...p(14, 24), ...p(44, 26), 8.5 * s);
  r.rect(body, x - 44 * s, y + 26 * s, x + 46 * s, y + 36 * s);
  r.line(INK, ...p(-36, 31), ...p(38, 31), { only: [body] });

  // Flared striped royal nemes headdress
  r.poly(headdress, poly([[14, -30], [36, -12], [40, 14], [-6, 14], [-4, -12]]));
  for (const hy of [-16, -6, 4]) {
    r.line(INK, ...p(-2, hy), ...p(34, hy), { only: [headdress] });
  }

  // Serene sphinx head + solar disc crest
  r.disc(face, ...p(16, -10), 14 * s);
  r.disc(face, ...p(16, -32), 8.5 * s);
  inkArc(r, ...p(12, -12), 2.5 * s, 1.8 * s, Math.PI, Math.PI * 2, 0, { only: [face] });
  inkArc(r, ...p(21, -12), 2.5 * s, 1.8 * s, Math.PI, Math.PI * 2, 0, { only: [face] });
  inkArc(r, ...p(17, -6), 4.5 * s, 2.5 * s, 0.1, Math.PI - 0.1, 0, { only: [face] });

  return finish();
}

/** Celestial Nile lotus barge with sweeping lotus-bud prow, canopy shrine & billowing sail (4 regions). */
export function drawLotusBarge(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const sail = alloc('star', 'Star-Nile Barge Sail');
  const shrine = alloc('prop', 'Golden Deck Canopy');
  const hull = alloc('prop', 'Lotus Solar Barge');
  const lotus = alloc('flora', 'Lotus Prow Blossoms');

  // Wide rectangular Egyptian sail
  r.poly(sail, poly([[-20, -34], [24, -34], [20, -4], [-16, -4]]));
  r.line(INK, ...p(2, -32), ...p(2, -6), { only: [sail] });
  inkCircle(r, ...p(2, -19), 6 * s, sail);

  // Deck shrine pavilion
  rrect(r, shrine, ...p(0, 6), 34 * s, 18 * s, 3 * s);
  r.line(INK, ...p(-10, -1), ...p(-10, 14), { only: [shrine] });
  r.line(INK, ...p(10, -1), ...p(10, 14), { only: [shrine] });

  // Sweeping crescent papyrus hull
  r.poly(hull, poly([[-48, 4], [-34, 14], [34, 14], [48, 4], [38, 32], [-38, 32]]));
  r.line(INK, ...p(-36, 22), ...p(36, 22), { only: [hull] });

  // Twin blooming lotus finials at prow & stern (shared region)
  for (const lx of [-46, 46]) {
    r.ellipse(lotus, ...p(lx, 0), 8 * s, 11 * s);
    r.ellipse(lotus, ...p(lx - 6, 4), 6 * s, 9 * s, -0.45 * f);
    r.ellipse(lotus, ...p(lx + 6, 4), 6 * s, 9 * s, 0.45 * f);
  }

  return finish();
}

/** Grand multiverse portal archway with carved celestial pillars & swirling prism vortex (3 regions). */
export function drawPortalArch(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p } = tf(x, y, s, f);

  const vortex = alloc('star', 'Multiverse Prism Vortex');
  const frame = alloc('prop', 'Celestial Portal Arch');
  const keystone = alloc('star', 'Portal Keystone Gem');

  // Swirling portal doorway fill
  r.disc(vortex, ...p(0, -6), 24 * s);
  r.rect(vortex, x - 24 * s, y - 6 * s, x + 24 * s, y + 36 * s);
  inkArc(r, ...p(0, 6), 16 * s, 16 * s, 0, Math.PI * 1.75, 0, { only: [vortex] });
  inkArc(r, ...p(0, 6), 9 * s, 9 * s, Math.PI * 0.4, Math.PI * 2.1, 0, { only: [vortex] });

  // Thick carved stone & starlight arch frame
  r.shape(frame, x - 44 * s, y - 44 * s, x + 44 * s, y + 38 * s, (px, py) => {
    if (py > y + 36 * s) return false;
    if (py >= y - 6 * s) {
      const ax = Math.abs(px - x);
      return ax <= 40 * s && ax >= 23 * s;
    }
    const d = Math.hypot((px - x) / (40 * s), (py - (y - 6 * s)) / (36 * s));
    return d <= 1.0 && d >= 0.58;
  });
  r.rect(frame, x - 44 * s, y + 28 * s, x - 20 * s, y + 38 * s);
  r.rect(frame, x + 20 * s, y + 28 * s, x + 44 * s, y + 38 * s);
  for (const py of [4, 16]) {
    r.line(INK, ...p(-38, py), ...p(-25, py), { only: [frame] });
    r.line(INK, ...p(25, py), ...p(38, py), { only: [frame] });
  }

  // Radiant star keystone at top of portal arch
  star(ctx, keystone, ...p(0, -34), 13 * s, { points: 4, inner: 0.46 });

  return finish();
}

/** Radiant Prism Nexus royal crown monument with 5 towering crystal prongs & starlight halo (3 regions). */
export function drawPrismCrown(ctx: SceneCtx, x: number, y: number, scale = 1, opts: LandmarkOpts = {}): number[] {
  const { r } = ctx;
  const s = Math.max(0.65, scale);
  const f = opts.flip ?? 1;
  const { alloc, finish } = makeAlloc(ctx, opts);
  const { p, poly } = tf(x, y, s, f);

  const halo = alloc('star', 'Prism Crown Halo');
  const prongs = alloc('star', 'Crystal Crown Prongs');
  const band = alloc('prop', 'Royal Nexus Band');

  // Radiant semicircular halo ring behind crown
  r.shape(halo, x - 46 * s, y - 44 * s, x + 46 * s, y + 16 * s, (px, py) => {
    const d = Math.hypot((px - x) / (44 * s), (py - (y + 4 * s)) / (42 * s));
    return py <= y + 10 * s && d <= 1.0 && d >= 0.74;
  });

  // 5 dramatic faceted crown spikes
  r.poly(prongs, poly([
    [-34, 10], [-40, -18], [-22, -4], [-18, -28], [-6, -8],
    [0, -38],
    [6, -8], [18, -28], [22, -4], [40, -18], [34, 10],
  ]));
  r.line(INK, ...p(0, -34), ...p(0, 6), { only: [prongs] });
  r.line(INK, ...p(-18, -24), ...p(-16, 6), { only: [prongs] });
  r.line(INK, ...p(18, -24), ...p(16, 6), { only: [prongs] });

  // Jeweled royal crown band
  r.poly(band, poly([[-38, 6], [38, 6], [32, 30], [-32, 30]]));
  for (const bx of [-20, 0, 20]) {
    inkCircle(r, ...p(bx, 18), 5 * s, band);
  }
  r.line(INK, ...p(-34, 10), ...p(34, 10), { only: [band] });
  r.line(INK, ...p(-30, 26), ...p(30, 26), { only: [band] });

  return finish();
}

// Keep helper exported for advanced custom curves if needed by world authors
export { polyArc };
