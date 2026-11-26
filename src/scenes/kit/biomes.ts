/**
 * Procedural Biome, Sky, Celestial Orb, Cloud, Ghost Silhouette & Hub Sanctuary Kit.
 * Pure, deterministic (uses ctx.rng only), strictly adheres to >= 60px region hygiene
 * and keeps bottom margin y = 254..269 clear for marginPath() flower rain.
 */
import { MaterialId } from '../../contracts/materials';
import type { RegionKind } from '../../contracts/regions';
import type { SceneCtx } from '../context';
import { crescent, inkArc, jit, puffyCloud, ringedPlanet, rot, star } from '../props';
import { INK, SKY, W, type Paint, type Pt, type Raster } from '../raster';

// ---------------------------------------------------------------------------
// Internal geometry helpers
// ---------------------------------------------------------------------------

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
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
    (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
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

function inkCrossStar(r: Raster, x: number, y: number, arm: number, onlyId: number): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  r.line(INK, rx - arm, ry, rx + arm, ry, { only: [onlyId] });
  r.line(INK, rx, ry - arm, rx, ry + arm, { only: [onlyId] });
}

function ghostWeb(r: Raster, id: number, nodes: readonly Pt[], edges: readonly [number, number][]): void {
  for (const [a, b] of edges) {
    const pa = nodes[a];
    const pb = nodes[b];
    if (pa && pb) r.line(INK, pa[0], pa[1], pb[0], pb[1], { only: [id] });
  }
  for (const [nx, ny] of nodes) {
    r.dot(INK, nx, ny, { only: [id] });
    r.dot(INK, nx + 1, ny, { only: [id] });
  }
}

// ---------------------------------------------------------------------------
// 1. Sky Sparkles (1px ink accents strictly on open SKY = 255)
// ---------------------------------------------------------------------------

export type SkySparkleStyle = 'stars' | 'bubbles' | 'petals' | 'snow' | 'notes' | 'gears' | 'hearts';

export function drawSkySparkles(
  ctx: SceneCtx,
  count: number,
  yMax = 156,
  style: SkySparkleStyle = 'stars',
): void {
  const { r, rng } = ctx;
  const n = Math.max(0, Math.round(count));
  if (n === 0) return;
  const maxY = clamp(Math.round(yMax), 18, 244);
  const only = [SKY];

  for (let i = 0; i < n; i++) {
    const bandX0 = 14 + ((W - 28) * i) / n;
    const bandX1 = 14 + ((W - 28) * (i + 1)) / n;
    const x = Math.round(rng.range(bandX0, bandX1));
    const y = rng.int(12, maxY);

    switch (style) {
      case 'stars': {
        r.dot(INK, x, y, { only });
        if (i % 3 === 0) {
          const arm = i % 6 === 0 ? 2 : 1;
          for (let d = 1; d <= arm; d++) {
            r.dot(INK, x - d, y, { only });
            r.dot(INK, x + d, y, { only });
            r.dot(INK, x, y - d, { only });
            r.dot(INK, x, y + d, { only });
          }
        }
        break;
      }
      case 'bubbles': {
        const rad = i % 3 === 0 ? 3 : 2;
        inkArc(r, x, y, rad, rad, 0, Math.PI * 2, 0, { only });
        if (i % 2 === 0) r.dot(INK, x + rad + 2, y - rad - 1, { only });
        break;
      }
      case 'petals': {
        const dir = i % 2 === 0 ? 1 : -1;
        r.line(INK, x - 2 * dir, y - 1, x + 2 * dir, y + 1, { only });
        r.dot(INK, x, y - 1, { only });
        r.dot(INK, x + dir, y + 2, { only });
        break;
      }
      case 'snow': {
        r.dot(INK, x, y, { only });
        if (i % 2 === 0) {
          r.dot(INK, x - 2, y, { only });
          r.dot(INK, x + 2, y, { only });
          r.dot(INK, x, y - 2, { only });
          r.dot(INK, x, y + 2, { only });
          r.dot(INK, x - 1, y - 1, { only });
          r.dot(INK, x + 1, y + 1, { only });
          r.dot(INK, x - 1, y + 1, { only });
          r.dot(INK, x + 1, y - 1, { only });
        } else {
          r.dot(INK, x + 1, y, { only });
        }
        break;
      }
      case 'notes': {
        r.dot(INK, x, y, { only });
        r.dot(INK, x + 1, y, { only });
        r.dot(INK, x, y + 1, { only });
        r.line(INK, x + 1, y, x + 1, y - 5, { only });
        r.line(INK, x + 1, y - 5, x + 4, y - 4, { only });
        break;
      }
      case 'gears': {
        inkArc(r, x, y, 2.2, 2.2, 0, Math.PI * 2, 0, { only });
        r.dot(INK, x - 3, y, { only });
        r.dot(INK, x + 3, y, { only });
        r.dot(INK, x, y - 3, { only });
        r.dot(INK, x, y + 3, { only });
        break;
      }
      case 'hearts': {
        r.dot(INK, x - 1, y - 1, { only });
        r.dot(INK, x + 1, y - 1, { only });
        r.dot(INK, x - 2, y, { only });
        r.dot(INK, x, y, { only });
        r.dot(INK, x + 2, y, { only });
        r.dot(INK, x - 1, y + 1, { only });
        r.dot(INK, x + 1, y + 1, { only });
        r.dot(INK, x, y + 2, { only });
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Horizon Hills & Distant Silhouettes (clamped strictly <= y=251)
// ---------------------------------------------------------------------------

export type HorizonStyle =
  | 'rolling'
  | 'coral'
  | 'dunes'
  | 'peaks'
  | 'mushroom'
  | 'bamboo'
  | 'castle'
  | 'clouds'
  | 'waves'
  | 'mesas';

export interface HorizonHillsOpts {
  style: HorizonStyle;
  /** Approximate crest y for the backmost layer (default 178) */
  yBase?: number;
  /** Bottom boundary of horizon fill (default 242, clamped <= 251) */
  yBottom?: number;
  /** Number of layered bands (1..3, default 2) */
  layers?: number;
  /** Label prefix for allocated regions */
  labelPrefix?: string;
  /** RegionKind for allocated bands (default 'prop') */
  kind?: RegionKind;
  /** Horizontal span (default 0..480) */
  x0?: number;
  x1?: number;
  /** Optional preColor materials for hub rooms */
  preColor?: readonly MaterialId[];
}

const HORIZON_LABEL: Record<HorizonStyle, readonly string[]> = {
  rolling: ['Far Rolling Hills', 'Near Meadow Ridge', 'Lowland Swell'],
  coral: ['Outer Coral Reef', 'Inner Reef Ridge', 'Tidepool Shelf'],
  dunes: ['Far Starlight Dunes', 'Sweeping Sand Ridge', 'Golden Dune Slope'],
  peaks: ['Distant Snow Peaks', 'Alpine Foothills', 'Glacier Ridge'],
  mushroom: ['Toadstool Ridge', 'Mossy Cap Hills', 'Spore Bank'],
  bamboo: ['Misty Bamboo Ridge', 'Jade Grove Slope', 'Valley Terrace'],
  castle: ['Distant Spire Skyline', 'Castle Battlements', 'Courtyard Wall'],
  clouds: ['Upper Cloud Bank', 'Billowing Cloud Sea', 'Soft Mist Shelf'],
  waves: ['Distant Ocean Swell', 'Rolling Sea Wave', 'Cresting Tide'],
  mesas: ['Far Canyon Mesas', 'Stepped Red Butte', 'Desert Plateau'],
};

export function drawHorizonHills(ctx: SceneCtx, opts: HorizonHillsOpts): number[] {
  const { r, rng } = ctx;
  const x0 = clamp(Math.round(opts.x0 ?? 0), 0, W - 40);
  const x1 = clamp(Math.round(opts.x1 ?? W), x0 + 40, W);
  const yBottom = clamp(Math.round(opts.yBottom ?? 242), 140, 251);
  const layers = clamp(Math.round(opts.layers ?? 2), 1, 3);
  const yBase = clamp(Math.round(opts.yBase ?? 176), 96, yBottom - layers * 12);
  const kind: RegionKind = opts.kind ?? 'prop';
  const ids: number[] = [];

  const stepY = layers > 1 ? Math.max(12, Math.round((yBottom - yBase) / (layers + 1.2))) : 0;

  for (let L = 0; L < layers; L++) {
    const names = HORIZON_LABEL[opts.style];
    const baseName = names[L % names.length] ?? 'Horizon Ridge';
    const label = opts.labelPrefix ? `${opts.labelPrefix} ${baseName}` : baseName;
    const id = ctx.dyn(kind, label);
    ids.push(id);

    const ly = yBase + L * stepY;
    const phase = rng.range(0, Math.PI * 2);
    const pts: Pt[] = [[x0, yBottom]];
    const span = x1 - x0;

    const topAt = (x: number): number => {
      const t = (x - x0) / span;
      switch (opts.style) {
        case 'rolling':
          return ly - Math.sin(t * Math.PI * (2 + L * 0.7) + phase) * 14 - Math.cos(t * Math.PI * 4.5 + L) * 5;
        case 'coral':
          return ly - Math.abs(Math.sin(t * Math.PI * (5 + L) + phase)) * 16 - Math.sin(t * Math.PI * 11) * 4;
        case 'dunes':
          return ly - Math.sin(t * Math.PI * (1.8 + L * 0.5) + phase) * 15 + Math.sin(t * Math.PI * 3.6 + phase) * 4;
        case 'peaks': {
          const period = 3 + L;
          const u = ((t * period + (L * 0.37)) % 1 + 1) % 1;
          const tri = u < 0.5 ? u * 2 : (1 - u) * 2;
          return ly + 6 - tri * (28 - L * 4);
        }
        case 'mushroom': {
          const wave = Math.sin(t * Math.PI * 2.2 + phase) * 8;
          const bump = Math.max(0, Math.sin(t * Math.PI * (6 + L * 2) + phase)) * 11;
          return ly - wave - bump;
        }
        case 'bamboo':
          return ly - Math.sin(t * Math.PI * (2.5 + L) + phase) * 10 - (Math.sin(t * Math.PI * 14 + L) > 0.35 ? 10 : 0);
        case 'castle': {
          const seg = Math.floor(t * (10 + L * 2));
          const h = ((seg * 37 + L * 19) % 5);
          const tower = h === 0 ? 22 : h === 2 ? 15 : h === 4 ? 10 : 4;
          return ly + 4 - tower;
        }
        case 'clouds':
          return ly - Math.abs(Math.sin(t * Math.PI * (4.5 + L * 1.2) + phase)) * 15;
        case 'waves':
          return ly - Math.sin(t * Math.PI * (3.2 + L * 0.8) + phase) * 9 - Math.sin(t * Math.PI * 6.4 + phase) * 3;
        case 'mesas': {
          const u = ((t * (2.6 + L * 0.6) + L * 0.3) % 1 + 1) % 1;
          const plateau = u > 0.22 && u < 0.72 ? 20 - L * 3 : u > 0.14 && u <= 0.22 ? ((u - 0.14) / 0.08) * (20 - L * 3) : u >= 0.72 && u < 0.8 ? ((0.8 - u) / 0.08) * (20 - L * 3) : 0;
          return ly + 6 - plateau;
        }
      }
    };

    const stepX = opts.style === 'castle' || opts.style === 'bamboo' ? 4 : 6;
    for (let x = x0; x <= x1; x += stepX) {
      pts.push([x, clamp(topAt(x), 42, yBottom - 10)]);
    }
    if ((pts[pts.length - 1] as Pt)[0] !== x1) {
      pts.push([x1, clamp(topAt(x1), 42, yBottom - 10)]);
    }
    pts.push([x1, yBottom]);
    r.poly(id, pts);

    // Extra rounded cap puffs for coral / clouds / mushroom silhouettes
    if (opts.style === 'clouds') {
      const puffs = 8 + L * 2;
      for (let i = 0; i < puffs; i++) {
        const px = x0 + ((i + 0.5) / puffs) * span;
        const py = clamp(topAt(px) + 5, 50, yBottom - 12);
        const rad = 14 + (i % 3) * 4;
        r.disc(id, px, py, rad);
        if (i % 2 === 0) inkArc(r, px - 2, py + 2, rad * 0.55, rad * 0.45, Math.PI * 1.1, Math.PI * 1.9, 0, { only: [id] });
      }
    } else if (opts.style === 'coral') {
      const bumps = 9 + L * 2;
      for (let i = 0; i < bumps; i++) {
        const px = x0 + ((i + 0.4) / bumps) * span;
        const py = clamp(topAt(px) + 6, 52, yBottom - 14);
        r.disc(id, px, py, 9 + (i % 3) * 3);
        inkArc(r, px, py + 7, 3.5, 3.5, 0, Math.PI * 2, 0, { only: [id] });
      }
    } else if (opts.style === 'peaks') {
      // Crisp alpine snow-cap ridge zigzag ink lines
      const zPts: Pt[] = [];
      for (let x = x0 + 6; x < x1 - 6; x += 12) {
        zPts.push([x, topAt(x) + 11 + ((x / 12) % 2 ? 4 : -3)]);
      }
      r.strokePath(INK, zPts, { only: [id] });
    } else if (opts.style === 'dunes') {
      const dPts: Pt[] = [];
      for (let x = x0 + 4; x < x1 - 4; x += 10) {
        dPts.push([x, topAt(x) + 9 + Math.sin(x * 0.03) * 2]);
      }
      r.strokePath(INK, dPts, { only: [id] });
    } else if (opts.style === 'waves') {
      const wPts: Pt[] = [];
      for (let x = x0 + 4; x < x1 - 4; x += 8) {
        wPts.push([x, topAt(x) + 8]);
      }
      r.strokePath(INK, wPts, { only: [id] });
      for (let x = x0 + 42 + L * 26; x < x1 - 30; x += 96) {
        inkArc(r, x, topAt(x) + 11, 8, 4.5, Math.PI * 1.1, Math.PI * 2.4, -0.2, { only: [id] });
      }
    } else if (opts.style === 'mesas') {
      for (let dy = 8; dy <= 22; dy += 7) {
        r.line(INK, x0 + 4, ly + dy - 4, x1 - 4, ly + dy - 4, { only: [id] });
      }
    } else if (opts.style === 'castle') {
      for (let x = x0 + 24; x < x1 - 24; x += 34) {
        const ty = topAt(x) + 8;
        r.line(INK, x - 3, ty, x - 3, ty + 7, { only: [id] });
        r.line(INK, x + 3, ty, x + 3, ty + 7, { only: [id] });
        r.line(INK, x - 3, ty, x + 3, ty, { only: [id] });
      }
    } else if (opts.style === 'bamboo') {
      for (let x = x0 + 18; x < x1 - 18; x += 26) {
        const ty = topAt(x) + 4;
        r.line(INK, x, ty, x, yBottom - 2, { only: [id] });
        r.line(INK, x - 3, ty + 10, x + 3, ty + 10, { only: [id] });
        r.line(INK, x - 3, ty + 20, x + 3, ty + 20, { only: [id] });
      }
    } else if (opts.style === 'mushroom') {
      for (let x = x0 + 26; x < x1 - 26; x += 48) {
        const ty = topAt(x) + 8;
        inkArc(r, x, ty, 3, 2.5, 0, Math.PI * 2, 0, { only: [id] });
      }
    } else if (opts.style === 'rolling') {
      for (let x = x0 + 30 + L * 18; x < x1 - 30; x += 64) {
        const ty = topAt(x) + 10;
        inkArc(r, x, ty, 12, 4, Math.PI * 1.15, Math.PI * 1.85, 0, { only: [id] });
      }
    }

    if (opts.preColor && opts.preColor.length > 0) {
      ctx.preColor(id, opts.preColor[L % opts.preColor.length] as MaterialId);
    }
  }

  return ids;
}

// ---------------------------------------------------------------------------
// 3. Foreground Ground Deck (stops cleanly at y <= 252!)
// ---------------------------------------------------------------------------

export type GroundDeckStyle =
  | 'pier'
  | 'counter'
  | 'meadow'
  | 'courtyard'
  | 'glacier'
  | 'brass'
  | 'tatami'
  | 'stage'
  | 'desk'
  | 'gardenPath';

export interface GroundDeckOpts {
  style: GroundDeckStyle;
  /** Top edge y of the ground surface (default 208) */
  yTop?: number;
  /** Bottom edge y (default 250, strictly clamped <= 252 to preserve flower-rain margin!) */
  yBottom?: number;
  /** Include decorative front fascia trim or garden path inset (default true) */
  includeTrim?: boolean;
  /** Optional label prefix */
  labelPrefix?: string;
  /** Horizontal span (default 0..480) */
  x0?: number;
  x1?: number;
  /** Optional preColor materials [deck, trim/path] */
  preColor?: readonly MaterialId[];
}

const DECK_LABELS: Record<GroundDeckStyle, readonly [string, string]> = {
  pier: ['Wooden Pier Deck', 'Pier Fascia Beam'],
  counter: ['Tiled Bakery Counter', 'Counter Marble Edge'],
  meadow: ['Mossy Meadow Floor', 'Wildflower Border'],
  courtyard: ['Stone Courtyard Floor', 'Carved Stone Curb'],
  glacier: ['Glacier Ice Shelf', 'Frosted Ice Rim'],
  brass: ['Clockwork Brass Deck', 'Riveted Gear Trim'],
  tatami: ['Woven Tatami Deck', 'Tatami Silk Border'],
  stage: ['Starlight Stage Floor', 'Stage Apron Trim'],
  desk: ['Giant Oak Desktop', 'Desk Bevel Ruler'],
  gardenPath: ['Lush Garden Lawn', 'Stepping Stone Path'],
};

export function drawGroundDeck(ctx: SceneCtx, opts: GroundDeckOpts): number[] {
  const { r } = ctx;
  const x0 = clamp(Math.round(opts.x0 ?? 0), 0, W - 40);
  const x1 = clamp(Math.round(opts.x1 ?? W), x0 + 40, W);
  const yBottom = clamp(Math.round(opts.yBottom ?? 250), 170, 252);
  const yTop = clamp(Math.round(opts.yTop ?? 208), 140, yBottom - 16);
  const includeTrim = opts.includeTrim ?? yBottom - yTop >= 24;
  const [mainLabel, subLabel] = DECK_LABELS[opts.style];
  const pref = (s: string): string => (opts.labelPrefix ? `${opts.labelPrefix} ${s}` : s);

  const ids: number[] = [];
  const mainId = ctx.dyn(opts.style === 'meadow' || opts.style === 'gardenPath' ? 'flora' : 'prop', pref(mainLabel));
  ids.push(mainId);

  const trimH = includeTrim && opts.style !== 'gardenPath' ? clamp(Math.round((yBottom - yTop) * 0.24), 8, 12) : 0;
  const deckBot = yBottom - trimH;

  if (opts.style === 'meadow' || opts.style === 'gardenPath') {
    const pts: Pt[] = [[x0, deckBot]];
    for (let x = x0; x <= x1; x += 12) {
      pts.push([x, yTop + Math.sin(x * 0.025) * 4]);
    }
    pts.push([x1, yTop + Math.sin(x1 * 0.025) * 4], [x1, deckBot]);
    r.poly(mainId, pts);
  } else if (opts.style === 'stage') {
    const pts: Pt[] = [[x0, deckBot]];
    for (let x = x0; x <= x1; x += 16) {
      const t = (x - x0) / (x1 - x0) - 0.5;
      pts.push([x, yTop + t * t * 14]);
    }
    pts.push([x1, yTop + 3.5], [x1, deckBot]);
    r.poly(mainId, pts);
  } else if (opts.style === 'glacier') {
    const pts: Pt[] = [[x0, deckBot]];
    for (let x = x0; x <= x1; x += 24) {
      pts.push([x, yTop + (((x / 24) | 0) % 2 === 0 ? 0 : 4)]);
    }
    pts.push([x1, yTop], [x1, deckBot]);
    r.poly(mainId, pts);
  } else {
    r.rect(mainId, x0, yTop, x1, deckBot);
  }

  // Interior ink texture per ground style
  const midX = (x0 + x1) / 2;
  switch (opts.style) {
    case 'pier': {
      for (let py = yTop + 9; py < deckBot - 2; py += 9) {
        r.line(INK, x0 + 2, py, x1 - 2, py, { only: [mainId] });
      }
      for (let px = x0 + 36; px < x1 - 12; px += 44) {
        r.line(INK, px, yTop + 1, px, deckBot - 1, { only: [mainId] });
        r.dot(INK, px - 3, yTop + 5, { only: [mainId] });
        r.dot(INK, px + 3, yTop + 5, { only: [mainId] });
      }
      break;
    }
    case 'counter': {
      for (let py = yTop + 11; py < deckBot - 2; py += 11) {
        r.line(INK, x0 + 2, py, x1 - 2, py, { only: [mainId] });
      }
      for (let px = x0 + 28; px < x1 - 10; px += 28) {
        const lean = ((px - midX) / Math.max(1, x1 - x0)) * 18;
        r.line(INK, px, yTop + 1, px + lean, deckBot - 1, { only: [mainId] });
      }
      break;
    }
    case 'meadow': {
      for (let px = x0 + 24; px < x1 - 20; px += 42) {
        const gy = yTop + 12 + ((px * 7) % Math.max(8, deckBot - yTop - 16));
        r.line(INK, px, gy, px - 3, gy - 5, { only: [mainId] });
        r.line(INK, px, gy, px + 3, gy - 5, { only: [mainId] });
      }
      break;
    }
    case 'courtyard': {
      let row = 0;
      for (let py = yTop + 10; py < deckBot - 2; py += 10) {
        r.line(INK, x0 + 2, py, x1 - 2, py, { only: [mainId] });
        const off = row % 2 === 0 ? 18 : 0;
        for (let px = x0 + 22 + off; px < x1 - 10; px += 36) {
          r.line(INK, px, py - 9, px, py - 1, { only: [mainId] });
        }
        row++;
      }
      break;
    }
    case 'glacier': {
      for (let px = x0 + 28; px < x1 - 28; px += 52) {
        r.line(INK, px, yTop + 4, px + 16, yTop + 14, { only: [mainId] });
        r.line(INK, px + 16, yTop + 14, px + 8, deckBot - 3, { only: [mainId] });
      }
      break;
    }
    case 'brass': {
      r.line(INK, x0 + 2, yTop + Math.round((deckBot - yTop) / 2), x1 - 2, yTop + Math.round((deckBot - yTop) / 2), { only: [mainId] });
      for (let px = x0 + 48; px < x1 - 16; px += 64) {
        r.line(INK, px, yTop + 1, px, deckBot - 1, { only: [mainId] });
        r.dot(INK, px - 4, yTop + 5, { only: [mainId] });
        r.dot(INK, px + 4, yTop + 5, { only: [mainId] });
        r.dot(INK, px - 4, deckBot - 5, { only: [mainId] });
        r.dot(INK, px + 4, deckBot - 5, { only: [mainId] });
      }
      break;
    }
    case 'tatami': {
      const midY = Math.round((yTop + deckBot) / 2);
      r.line(INK, x0 + 2, midY, x1 - 2, midY, { only: [mainId] });
      r.line(INK, x0 + 2, midY + 2, x1 - 2, midY + 2, { only: [mainId] });
      for (let px = x0 + 64; px < x1 - 24; px += 96) {
        r.line(INK, px, yTop + 1, px, midY - 1, { only: [mainId] });
        r.line(INK, px + 44, midY + 3, px + 44, deckBot - 1, { only: [mainId] });
      }
      break;
    }
    case 'stage': {
      for (let py = yTop + 10; py < deckBot - 2; py += 10) {
        r.line(INK, x0 + 2, py, x1 - 2, py, { only: [mainId] });
      }
      for (let px = x0 + 40; px < x1 - 20; px += 52) {
        const lean = ((px - midX) / Math.max(1, x1 - x0)) * 22;
        r.line(INK, px, yTop + 2, px + lean, deckBot - 1, { only: [mainId] });
      }
      break;
    }
    case 'desk': {
      for (let py = yTop + 9; py < deckBot - 2; py += 11) {
        const pts: Pt[] = [];
        for (let px = x0 + 6; px < x1 - 6; px += 24) {
          pts.push([px, py + Math.sin(px * 0.04 + py) * 1.5]);
        }
        r.strokePath(INK, pts, { only: [mainId] });
      }
      break;
    }
    case 'gardenPath': {
      for (let px = x0 + 20; px < x1 - 20; px += 46) {
        r.line(INK, px, yTop + 14, px - 2, yTop + 9, { only: [mainId] });
        r.line(INK, px, yTop + 14, px + 3, yTop + 10, { only: [mainId] });
      }
      break;
    }
  }

  if (includeTrim) {
    const subId = ctx.dyn('prop', pref(subLabel));
    ids.push(subId);
    if (opts.style === 'gardenPath') {
      // Winding storybook central garden path polygon on top of lawn
      const pathPts: Pt[] = [
        [midX - 28, yTop + 2],
        [midX + 28, yTop + 2],
        [midX + 54, yBottom],
        [midX - 54, yBottom],
      ];
      r.poly(subId, pathPts);
      for (let py = yTop + 10; py < yBottom - 4; py += 11) {
        const t = (py - yTop) / Math.max(1, yBottom - yTop);
        const hw = 22 + t * 24;
        r.line(INK, midX - hw, py, midX + hw, py, { only: [subId] });
      }
    } else {
      r.rect(subId, x0, deckBot, x1, yBottom);
      if (opts.style === 'desk') {
        // Ruler ticks along desk front bevel
        for (let px = x0 + 12; px < x1 - 8; px += 12) {
          const tickH = px % 36 === 0 ? 6 : 3;
          r.line(INK, px, deckBot + 1, px, deckBot + tickH, { only: [subId] });
        }
      } else if (opts.style === 'brass') {
        for (let px = x0 + 18; px < x1 - 12; px += 24) {
          inkArc(r, px, deckBot + trimH / 2, 2.2, 2.2, 0, Math.PI * 2, 0, { only: [subId] });
        }
      } else if (opts.style === 'glacier') {
        for (let px = x0 + 14; px < x1 - 14; px += 22) {
          r.line(INK, px, deckBot + 1, px + 5, yBottom - 2, { only: [subId] });
        }
      } else {
        for (let px = x0 + 24; px < x1 - 16; px += 32) {
          r.line(INK, px, deckBot + 1, px, yBottom - 1, { only: [subId] });
        }
      }
    }
  }

  if (opts.preColor && opts.preColor.length > 0) {
    for (let i = 0; i < ids.length; i++) {
      ctx.preColor(ids[i] as number, opts.preColor[i % opts.preColor.length] as MaterialId);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// 4. Themed Celestial Orb (canonical 12 = planet core, 13 = rings)
// ---------------------------------------------------------------------------

export type ThemedOrbStyle =
  | 'ringedPlanet'
  | 'pearlMoon'
  | 'donutPlanet'
  | 'astrolabe'
  | 'lanternMoon'
  | 'snowglobe'
  | 'vinyl'
  | 'geode'
  | 'lotusSun'
  | 'bubbleOrb'
  | 'macaronOrb'
  | 'pixelPlanet';

export interface ThemedOrbOpts {
  tilt?: number;
  coreLabel?: string;
  ringLabel?: string;
  preColorCore?: MaterialId;
  preColorRing?: MaterialId;
}

const ORB_LABELS: Record<ThemedOrbStyle, readonly [string, string]> = {
  ringedPlanet: ['Ringed Planet', 'Planet Rings'],
  pearlMoon: ['Pearl Moon', 'Bubble Pearl Rings'],
  donutPlanet: ['Frosted Donut Planet', 'Caramel Swirl Rings'],
  astrolabe: ['Brass Astrolabe Orb', 'Armillary Clock Rings'],
  lanternMoon: ['Sky Lantern Moon', 'Golden Halo Ring'],
  snowglobe: ['Snowglobe Planet', 'Aurora Frost Rings'],
  vinyl: ['Vinyl Record Moon', 'Melody Staff Rings'],
  geode: ['Amethyst Geode Planet', 'Crystal Belt Rings'],
  lotusSun: ['Golden Lotus Sun', 'Solar Petal Crown'],
  bubbleOrb: ['Iridescent Bubble Orb', 'Shimmer Stream Rings'],
  macaronOrb: ['Pastel Macaron Planet', 'Cream Collar Ring'],
  pixelPlanet: ['Retro Pixel Planet', 'Bit-Stream Rings'],
};

export function drawThemedOrb(
  ctx: SceneCtx,
  x: number,
  y: number,
  radius: number,
  style: ThemedOrbStyle = 'ringedPlanet',
  opts: ThemedOrbOpts = {},
): { coreId: number; ringId: number; rx: number; ry: number; tilt: number } {
  const { r } = ctx;
  const rad = Math.max(11, radius);
  const [defCore, defRing] = ORB_LABELS[style];
  const coreId = ctx.canon(12, opts.coreLabel ?? defCore, 'planet');
  const ringId = ctx.canon(13, opts.ringLabel ?? defRing, 'rings');
  const tilt = opts.tilt ?? -0.26;
  const rx = rad * 2.05;
  const ry = rad * 0.62;

  const paintStandardRing = (back: boolean, rw = rx, rh = ry, kin = 0.64): void => {
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    const m = Math.max(rw, rh) + 2;
    r.shape(ringId, x - m, y - m, x + m, y + m, (px, py) => {
      const dx = px - x;
      const dy = py - y;
      const u = (dx * c + dy * s) / rw;
      const v = (-dx * s + dy * c) / rh;
      const k = u * u + v * v;
      if (k > 1 || k < kin * kin) return false;
      return back ? v < 0 : v >= 0;
    });
  };

  switch (style) {
    case 'ringedPlanet': {
      ringedPlanet(ctx, x, y, rad, { coreId, ringId, tilt, ringW: 2.05, ringH: 0.62, bands: true });
      break;
    }
    case 'pearlMoon': {
      paintStandardRing(true, rad * 2.1, rad * 0.65, 0.64);
      r.disc(coreId, x, y, rad);
      // Mother-of-pearl luster & soft moon craters
      inkArc(r, x - rad * 0.28, y - rad * 0.24, rad * 0.48, rad * 0.36, Math.PI * 0.9, Math.PI * 1.6, 0, { only: [coreId] });
      inkArc(r, x + rad * 0.24, y + rad * 0.2, rad * 0.22, rad * 0.2, 0, Math.PI * 2, 0, { only: [coreId] });
      inkArc(r, x + rad * 0.36, y - rad * 0.26, rad * 0.14, rad * 0.14, 0, Math.PI * 2, 0, { only: [coreId] });
      paintStandardRing(false, rad * 2.1, rad * 0.65, 0.64);
      // Pearl beads inked along ring
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const p = rot([[x + Math.cos(a) * rad * 1.72, y + Math.sin(a) * rad * 0.52]], x, y, tilt)[0] as Pt;
        inkArc(r, p[0], p[1], 2.2, 2.2, 0, Math.PI * 2, 0, { only: [ringId] });
      }
      break;
    }
    case 'donutPlanet': {
      paintStandardRing(true, rad * 2.05, rad * 0.64, 0.62);
      r.disc(coreId, x, y, rad);
      // Frosted glaze drip wave & sprinkle ticks on top half
      const drip: Pt[] = [];
      for (let i = -8; i <= 8; i++) {
        const t = i / 8;
        drip.push([x + t * rad * 0.92, y + Math.sin(t * Math.PI * 3) * rad * 0.14]);
      }
      r.strokePath(INK, drip, { only: [coreId] });
      for (const [sx, sy, dx, dy] of [
        [-0.4, -0.45, 3, -1],
        [0.15, -0.52, -2, 2],
        [0.45, -0.32, 3, 1],
        [-0.1, -0.25, 3, -1],
      ] as const) {
        r.line(INK, x + sx * rad, y + sy * rad, x + sx * rad + dx, y + sy * rad + dy, { only: [coreId] });
      }
      paintStandardRing(false, rad * 2.05, rad * 0.64, 0.62);
      inkArc(r, x, y, rad * 1.66, rad * 0.51, 0, Math.PI * 2, tilt, { only: [ringId] });
      break;
    }
    case 'astrolabe': {
      paintStandardRing(true, rad * 2.12, rad * 0.72, 0.64);
      // Secondary upright armillary band behind core
      r.shape(ringId, x - rad * 1.4, y - rad * 1.4, x + rad * 1.4, y + rad * 1.4, (px, py) => {
        const d = Math.hypot((px - x) / (rad * 1.32), (py - y) / (rad * 1.32));
        return d <= 1 && d >= 0.78;
      });
      r.disc(coreId, x, y, rad);
      // Meridian + equator etched astrolabe lines
      inkArc(r, x, y, rad * 0.52, rad * 0.95, 0, Math.PI * 2, 0, { only: [coreId] });
      r.line(INK, x - rad * 0.92, y, x + rad * 0.92, y, { only: [coreId] });
      r.line(INK, x, y - rad * 0.92, x, y + rad * 0.92, { only: [coreId] });
      paintStandardRing(false, rad * 2.12, rad * 0.72, 0.64);
      // Degree calibration ticks on ring
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const p0 = rot([[x + Math.cos(a) * rad * 1.42, y + Math.sin(a) * rad * 0.48]], x, y, tilt)[0] as Pt;
        const p1 = rot([[x + Math.cos(a) * rad * 1.98, y + Math.sin(a) * rad * 0.66]], x, y, tilt)[0] as Pt;
        r.line(INK, p0[0], p0[1], p1[0], p1[1], { only: [ringId] });
      }
      break;
    }
    case 'lanternMoon': {
      paintStandardRing(true, rad * 2.0, rad * 0.62, 0.62);
      // Softly squared paper lantern orb
      r.ellipse(coreId, x, y, rad * 0.94, rad * 1.06);
      // Curved vertical lantern bamboo ribs + top/bottom collar ink lines
      inkArc(r, x, y, rad * 0.45, rad * 1.02, 0, Math.PI * 2, 0, { only: [coreId] });
      r.line(INK, x, y - rad, x, y + rad, { only: [coreId] });
      r.line(INK, x - rad * 0.7, y - rad * 0.68, x + rad * 0.7, y - rad * 0.68, { only: [coreId] });
      r.line(INK, x - rad * 0.7, y + rad * 0.68, x + rad * 0.7, y + rad * 0.68, { only: [coreId] });
      paintStandardRing(false, rad * 2.0, rad * 0.62, 0.62);
      inkArc(r, x, y, rad * 1.62, rad * 0.5, 0, Math.PI * 2, tilt, { only: [ringId] });
      break;
    }
    case 'snowglobe': {
      paintStandardRing(true, rad * 2.0, rad * 0.62, 0.62);
      r.disc(coreId, x, y, rad);
      // Curved snowdrift inside globe + tiny snowflake cross + glass glare
      inkArc(r, x, y + rad * 0.95, rad * 0.95, rad * 0.58, Math.PI * 1.15, Math.PI * 1.85, 0, { only: [coreId] });
      inkArc(r, x, y, rad * 0.76, rad * 0.76, Math.PI * 1.08, Math.PI * 1.48, 0, { only: [coreId] });
      inkCrossStar(r, x + rad * 0.25, y - rad * 0.25, 2, coreId);
      inkCrossStar(r, x - rad * 0.3, y - rad * 0.05, 2, coreId);
      paintStandardRing(false, rad * 2.0, rad * 0.62, 0.62);
      // Base collar beneath snowglobe fused into ring region for extra richness
      r.ellipse(ringId, x, y + rad * 0.92, rad * 0.65, rad * 0.24);
      break;
    }
    case 'vinyl': {
      paintStandardRing(true, rad * 2.15, rad * 0.64, 0.64);
      r.disc(coreId, x, y, rad);
      // Concentric vinyl grooves & center label circle
      inkArc(r, x, y, rad * 0.76, rad * 0.76, 0, Math.PI * 2, 0, { only: [coreId] });
      inkArc(r, x, y, rad * 0.54, rad * 0.54, 0, Math.PI * 2, 0, { only: [coreId] });
      inkArc(r, x, y, rad * 0.28, rad * 0.28, 0, Math.PI * 2, 0, { only: [coreId] });
      paintStandardRing(false, rad * 2.15, rad * 0.64, 0.64);
      inkArc(r, x, y, rad * 1.65, rad * 0.49, 0, Math.PI * 2, tilt, { only: [ringId] });
      inkArc(r, x, y, rad * 1.85, rad * 0.55, 0, Math.PI * 2, tilt, { only: [ringId] });
      break;
    }
    case 'geode': {
      paintStandardRing(true, rad * 2.08, rad * 0.64, 0.62);
      // Faceted octagonal crystal core
      const oct: Pt[] = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        oct.push([x + Math.cos(a) * rad * 1.04, y + Math.sin(a) * rad * 1.04]);
      }
      r.poly(coreId, oct);
      // Radial mineral facets
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI + Math.PI / 8;
        r.line(INK, x - Math.cos(a) * rad * 0.95, y - Math.sin(a) * rad * 0.95, x + Math.cos(a) * rad * 0.95, y + Math.sin(a) * rad * 0.95, { only: [coreId] });
      }
      inkArc(r, x, y, rad * 0.46, rad * 0.46, 0, Math.PI * 2, 0, { only: [coreId] });
      paintStandardRing(false, rad * 2.08, rad * 0.64, 0.62);
      inkArc(r, x, y, rad * 1.68, rad * 0.52, 0, Math.PI * 2, tilt, { only: [ringId] });
      break;
    }
    case 'lotusSun': {
      // Radiant 8-petal lotus/solar crown (ringId) framing sun disc (coreId)
      const petals = 8;
      for (let i = 0; i < petals; i++) {
        const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
        const pcx = x + Math.cos(a) * rad * 1.24;
        const pcy = y + Math.sin(a) * rad * 1.24;
        r.ellipse(ringId, pcx, pcy, rad * 0.46, rad * 0.28, a);
      }
      r.disc(coreId, x, y, rad);
      inkArc(r, x, y, rad * 0.64, rad * 0.64, 0, Math.PI * 2, 0, { only: [coreId] });
      inkCrossStar(r, x, y, Math.max(3, Math.round(rad * 0.3)), coreId);
      break;
    }
    case 'bubbleOrb': {
      paintStandardRing(true, rad * 2.05, rad * 0.62, 0.64);
      r.disc(coreId, x, y, rad);
      inkArc(r, x, y, rad * 0.74, rad * 0.74, Math.PI * 1.08, Math.PI * 1.48, 0, { only: [coreId] });
      inkArc(r, x, y, rad * 0.74, rad * 0.74, Math.PI * 0.15, Math.PI * 0.35, 0, { only: [coreId] });
      paintStandardRing(false, rad * 2.05, rad * 0.62, 0.64);
      r.disc(ringId, x - rad * 1.45, y - rad * 0.25, Math.max(4.5, rad * 0.28));
      r.disc(ringId, x + rad * 1.45, y + rad * 0.22, Math.max(4, rad * 0.24));
      break;
    }
    case 'macaronOrb': {
      // Fluffy ruffled cream center band (ringId) + rounded top/bottom macaron shell (coreId)
      r.ellipse(coreId, x, y, rad * 1.06, rad * 0.92, tilt * 0.4);
      paintStandardRing(true, rad * 1.95, rad * 0.56, 0.58);
      paintStandardRing(false, rad * 1.95, rad * 0.56, 0.58);
      // Cream filling stripe across center of macaron
      const midA = rot([[x - rad * 0.96, y], [x + rad * 0.96, y]], x, y, tilt * 0.4);
      r.line(INK, (midA[0] as Pt)[0], (midA[0] as Pt)[1], (midA[1] as Pt)[0], (midA[1] as Pt)[1], { only: [coreId] });
      break;
    }
    case 'pixelPlanet': {
      // Stepped 8-bit blocky planet & blocky ring
      const q = Math.max(3, Math.round(rad / 5));
      const snap = (v: number): number => Math.round(v / q) * q;
      const paintPixRing = (back: boolean): void => {
        const c = Math.cos(tilt);
        const s = Math.sin(tilt);
        const m = rad * 2.2;
        r.shape(ringId, x - m, y - m, x + m, y + m, (px, py) => {
          const sx = snap(px - x);
          const sy = snap(py - y);
          const u = (sx * c + sy * s) / (rad * 2.0);
          const v = (-sx * s + sy * c) / (rad * 0.64);
          const k = u * u + v * v;
          if (k > 1 || k < 0.42) return false;
          return back ? v < 0 : v >= 0;
        });
      };
      paintPixRing(true);
      r.shape(coreId, x - rad - q, y - rad - q, x + rad + q, y + rad + q, (px, py) => {
        const sx = snap(px - x);
        const sy = snap(py - y);
        return sx * sx + sy * sy <= rad * rad;
      });
      r.line(INK, x - rad * 0.6, y - rad * 0.25, x + rad * 0.6, y - rad * 0.25, { only: [coreId] });
      r.line(INK, x - rad * 0.4, y + rad * 0.25, x + rad * 0.55, y + rad * 0.25, { only: [coreId] });
      paintPixRing(false);
      break;
    }
  }

  if (opts.preColorCore !== undefined) ctx.preColor(coreId, opts.preColorCore);
  if (opts.preColorRing !== undefined) ctx.preColor(ringId, opts.preColorRing);

  return { coreId, ringId, rx, ry, tilt };
}

// ---------------------------------------------------------------------------
// 5. Themed Cloud (works cleanly with canonical 14 / 15 or any dynamic id)
// ---------------------------------------------------------------------------

export type ThemedCloudStyle =
  | 'fluffy'
  | 'cottonCandy'
  | 'steamPuff'
  | 'bubbleCluster'
  | 'origami'
  | 'sakura'
  | 'music'
  | 'pixel';

export function drawThemedCloud(
  ctx: SceneCtx,
  id: number,
  x: number,
  y: number,
  w: number,
  h: number,
  style: ThemedCloudStyle = 'fluffy',
): number {
  const { r } = ctx;
  if ((id === 14 || id === 15) && !ctx.defs.has(id)) {
    ctx.canon(id, id === 14 ? 'Dreamy Cloud' : 'Sky Cloud', 'cloud');
  }
  const cw = Math.max(36, w);
  const ch = Math.max(16, h);

  switch (style) {
    case 'fluffy': {
      puffyCloud(ctx, id, x, y, cw, ch, true);
      break;
    }
    case 'cottonCandy': {
      r.ellipse(id, x, y + ch * 0.14, cw * 0.48, ch * 0.34);
      r.disc(id, x - cw * 0.24, y - ch * 0.04, ch * 0.44);
      r.disc(id, x + cw * 0.24, y - ch * 0.02, ch * 0.42);
      r.disc(id, x, y - ch * 0.2, ch * 0.52);
      // Whipped candy-floss spiral swirls
      inkArc(r, x, y - ch * 0.12, ch * 0.32, ch * 0.26, Math.PI * 0.8, Math.PI * 2.2, 0, { only: [id] });
      inkArc(r, x - cw * 0.22, y + ch * 0.04, ch * 0.22, ch * 0.18, Math.PI * 1.1, Math.PI * 2.1, 0, { only: [id] });
      break;
    }
    case 'steamPuff': {
      // Trailing billowing steam plume expanding from left to right
      r.disc(id, x - cw * 0.36, y + ch * 0.12, ch * 0.28);
      r.disc(id, x - cw * 0.16, y + ch * 0.02, ch * 0.38);
      r.disc(id, x + cw * 0.08, y - ch * 0.05, ch * 0.48);
      r.disc(id, x + cw * 0.32, y - ch * 0.02, ch * 0.42);
      inkArc(r, x + cw * 0.08, y - ch * 0.04, ch * 0.28, ch * 0.24, Math.PI * 1.0, Math.PI * 2.0, 0, { only: [id] });
      inkArc(r, x - cw * 0.16, y + ch * 0.02, ch * 0.2, ch * 0.18, Math.PI * 1.1, Math.PI * 2.0, 0, { only: [id] });
      break;
    }
    case 'bubbleCluster': {
      const bubbles: Array<[number, number, number]> = [
        [x - cw * 0.28, y + ch * 0.08, ch * 0.36],
        [x - cw * 0.06, y - ch * 0.1, ch * 0.46],
        [x + cw * 0.16, y - ch * 0.02, ch * 0.42],
        [x + cw * 0.33, y + ch * 0.1, ch * 0.3],
        [x, y + ch * 0.16, ch * 0.34],
      ];
      for (const [bx, by, br] of bubbles) r.disc(id, bx, by, br);
      for (const [bx, by, br] of bubbles.slice(0, 3)) {
        inkArc(r, bx, by, br * 0.62, br * 0.62, Math.PI * 1.1, Math.PI * 1.48, 0, { only: [id] });
      }
      break;
    }
    case 'origami': {
      // Crisp geometric paper-folded cloud polygon
      const hw = cw / 2;
      const hh = ch / 2;
      r.poly(id, [
        [x - hw, y + hh * 0.65],
        [x - hw * 0.72, y - hh * 0.22],
        [x - hw * 0.38, y - hh * 0.36],
        [x - hw * 0.05, y - hh],
        [x + hw * 0.35, y - hh * 0.45],
        [x + hw * 0.76, y - hh * 0.28],
        [x + hw, y + hh * 0.65],
      ]);
      // Paper fold crease lines
      r.line(INK, x - hw * 0.05, y - hh + 2, x - hw * 0.18, y + hh * 0.62, { only: [id] });
      r.line(INK, x - hw * 0.38, y - hh * 0.34, x + hw * 0.35, y - hh * 0.43, { only: [id] });
      r.line(INK, x + hw * 0.35, y - hh * 0.43, x + hw * 0.22, y + hh * 0.62, { only: [id] });
      break;
    }
    case 'sakura': {
      // Stylized Japanese kumo cloud scroll with rounded ends & scroll curls
      r.capsule(id, x - cw * 0.36, y + ch * 0.18, x + cw * 0.36, y + ch * 0.18, ch * 0.26);
      r.capsule(id, x - cw * 0.2, y - ch * 0.14, x + cw * 0.24, y - ch * 0.14, ch * 0.3);
      r.disc(id, x + cw * 0.02, y - ch * 0.24, ch * 0.32);
      inkArc(r, x - cw * 0.34, y + ch * 0.18, ch * 0.16, ch * 0.16, Math.PI * 0.5, Math.PI * 1.9, 0, { only: [id] });
      inkArc(r, x + cw * 0.34, y + ch * 0.18, ch * 0.16, ch * 0.16, -Math.PI * 0.9, Math.PI * 0.5, 0, { only: [id] });
      break;
    }
    case 'music': {
      puffyCloud(ctx, id, x, y, cw, ch, false);
      // Flowing 3-line musical staff curved gently across the cloud belly
      for (const dy of [-3, 1, 5]) {
        const sPts: Pt[] = [];
        for (let i = -5; i <= 5; i++) {
          const t = i / 5;
          sPts.push([x + t * cw * 0.38, y + dy + Math.sin(t * Math.PI) * 2.5]);
        }
        r.strokePath(INK, sPts, { only: [id] });
      }
      break;
    }
    case 'pixel': {
      // Chunky 8-bit stepped block cloud
      const hw = Math.round(cw / 2);
      const hh = Math.round(ch / 2);
      r.rect(id, x - hw, y - hh * 0.1, x + hw, y + hh * 0.72);
      r.rect(id, x - hw * 0.72, y - hh * 0.58, x + hw * 0.68, y + hh * 0.3);
      r.rect(id, x - hw * 0.36, y - hh, x + hw * 0.32, y - hh * 0.2);
      r.line(INK, x - hw + 4, y + hh * 0.44, x + hw - 4, y + hh * 0.44, { only: [id] });
      break;
    }
  }
  return id;
}

// ---------------------------------------------------------------------------
// 6. Ghost Constellation Silhouettes (20 bespoke chunky >= 150px shapes!)
// ---------------------------------------------------------------------------

export type GhostSilhouetteKind =
  | 'owl'
  | 'seahorse'
  | 'cupcake'
  | 'moth'
  | 'crane'
  | 'dino'
  | 'penguin'
  | 'robot'
  | 'koi'
  | 'treble'
  | 'crystal'
  | 'camel'
  | 'book'
  | 'balloon'
  | 'cat'
  | 'fox'
  | 'butterfly'
  | 'pixelHeart'
  | 'dragon'
  | 'scarab';

const GHOST_DEFAULT_LABELS: Record<GhostSilhouetteKind, string> = {
  owl: 'Starlight Owl Ghost',
  seahorse: 'Constellation Seahorse',
  cupcake: 'Sugar-Star Cupcake Ghost',
  moth: 'Moonlight Moth Ghost',
  crane: 'Paper-Star Crane Ghost',
  dino: 'Constellation Little Dino',
  penguin: 'Aurora Penguin Ghost',
  robot: 'Clockwork Robot Ghost',
  koi: 'Starlight Koi Ghost',
  treble: 'Melody Clef Ghost',
  crystal: 'Star-Prism Crystal Ghost',
  camel: 'Dune-Star Camel Ghost',
  book: 'Floating Grimoire Ghost',
  balloon: 'Sky-Balloon Ghost',
  cat: 'Sleepy Star-Cat Ghost',
  fox: 'Constellation Fox Ghost',
  butterfly: 'Sunbeam Butterfly Ghost',
  pixelHeart: '8-Bit Heart Ghost',
  dragon: 'Cloud Dragon Ghost',
  scarab: 'Golden Scarab Ghost',
};

export function drawGhostSilhouette(
  ctx: SceneCtx,
  label: string,
  kind: GhostSilhouetteKind,
  x: number,
  y: number,
  scale = 1,
): number {
  const { r } = ctx;
  const id = ctx.ghost(label);
  const s = 15 * Math.max(0.8, scale);
  const only = [SKY];

  switch (kind) {
    case 'owl': {
      r.ellipse(id, x, y + s * 0.22, s * 0.58, s * 0.66, 0, { only });
      r.poly(id, [[x - s * 0.4, y - s * 0.06], [x - s * 1.0, y + s * 0.24], [x - s * 0.8, y + s * 0.62], [x - s * 0.34, y + s * 0.54]], { only });
      r.poly(id, [[x + s * 0.4, y - s * 0.06], [x + s * 1.0, y + s * 0.24], [x + s * 0.8, y + s * 0.62], [x + s * 0.34, y + s * 0.54]], { only });
      r.disc(id, x, y - s * 0.38, s * 0.44, { only });
      r.poly(id, [[x - s * 0.42, y - s * 0.52], [x - s * 0.52, y - s * 0.94], [x - s * 0.14, y - s * 0.68]], { only });
      r.poly(id, [[x + s * 0.42, y - s * 0.52], [x + s * 0.52, y - s * 0.94], [x + s * 0.14, y - s * 0.68]], { only });
      inkArc(r, x - s * 0.18, y - s * 0.4, 2.2, 2.2, 0, Math.PI * 2, 0, { only: [id] });
      inkArc(r, x + s * 0.18, y - s * 0.4, 2.2, 2.2, 0, Math.PI * 2, 0, { only: [id] });
      ghostWeb(r, id, [[x - s * 0.6, y + s * 0.28], [x, y + s * 0.16], [x + s * 0.6, y + s * 0.28], [x, y + s * 0.58]], [[0, 1], [1, 2], [1, 3]]);
      break;
    }
    case 'seahorse': {
      // Curled S-curve body + snout + crown fin + coiled tail
      r.disc(id, x - s * 0.05, y - s * 0.62, s * 0.36, { only });
      r.capsule(id, x + s * 0.18, y - s * 0.62, x + s * 0.66, y - s * 0.54, s * 0.16, { only });
      r.ellipse(id, x + s * 0.06, y + s * 0.02, s * 0.48, s * 0.62, -0.18, { only });
      r.poly(id, [[x - s * 0.36, y - s * 0.24], [x - s * 0.82, y - s * 0.04], [x - s * 0.36, y + s * 0.22]], { only });
      r.capsule(id, x + s * 0.02, y + s * 0.5, x - s * 0.22, y + s * 0.98, s * 0.22, { only });
      r.disc(id, x + s * 0.08, y + s * 0.96, s * 0.24, { only });
      ghostWeb(r, id, [[x - s * 0.04, y - s * 0.62], [x + s * 0.08, y - s * 0.02], [x - s * 0.08, y + s * 0.72]], [[0, 1], [1, 2]]);
      break;
    }
    case 'cupcake': {
      // Chunky cupcake wrapper + swirled frosting mound + top cherry
      r.poly(id, [[x - s * 0.72, y + s * 0.08], [x + s * 0.72, y + s * 0.08], [x + s * 0.52, y + s * 0.86], [x - s * 0.52, y + s * 0.86]], { only });
      r.ellipse(id, x, y - s * 0.06, s * 0.82, s * 0.44, 0, { only });
      r.ellipse(id, x, y - s * 0.44, s * 0.56, s * 0.34, 0, { only });
      r.disc(id, x, y - s * 0.8, s * 0.26, { only });
      r.line(INK, x - s * 0.32, y + s * 0.14, x - s * 0.24, y + s * 0.8, { only: [id] });
      r.line(INK, x + s * 0.32, y + s * 0.14, x + s * 0.24, y + s * 0.8, { only: [id] });
      ghostWeb(r, id, [[x, y - s * 0.5], [x - s * 0.42, y - s * 0.04], [x + s * 0.42, y - s * 0.04], [x, y + s * 0.48]], [[0, 1], [0, 2], [1, 3], [2, 3]]);
      break;
    }
    case 'moth': {
      r.poly(id, [[x - s * 0.12, y - s * 0.14], [x - s * 0.9, y - s * 0.7], [x - s * 1.1, y - s * 0.26], [x - s * 0.9, y + s * 0.12], [x - s * 0.14, y + s * 0.12]], { only });
      r.poly(id, [[x + s * 0.12, y - s * 0.14], [x + s * 0.9, y - s * 0.7], [x + s * 1.1, y - s * 0.26], [x + s * 0.9, y + s * 0.12], [x + s * 0.14, y + s * 0.12]], { only });
      r.ellipse(id, x - s * 0.46, y + s * 0.36, s * 0.38, s * 0.36, 0.2, { only });
      r.ellipse(id, x + s * 0.46, y + s * 0.36, s * 0.38, s * 0.36, -0.2, { only });
      r.ellipse(id, x, y + s * 0.04, s * 0.2, s * 0.5, 0, { only });
      ghostWeb(r, id, [[x, y - s * 0.1], [x - s * 0.68, y - s * 0.22], [x + s * 0.68, y - s * 0.22], [x - s * 0.42, y + s * 0.36], [x + s * 0.42, y + s * 0.36]], [[0, 1], [0, 2], [0, 3], [0, 4]]);
      break;
    }
    case 'crane': {
      // Origami soaring crane silhouette
      r.poly(id, [[x - s * 1.15, y - s * 0.34], [x - s * 0.2, y - s * 0.1], [x, y + s * 0.42], [x - s * 0.56, y + s * 0.22]], { only });
      r.poly(id, [[x + s * 1.15, y - s * 0.34], [x + s * 0.2, y - s * 0.1], [x, y + s * 0.42], [x + s * 0.56, y + s * 0.22]], { only });
      r.poly(id, [[x - s * 0.28, y + s * 0.1], [x, y - s * 0.42], [x + s * 0.28, y + s * 0.1], [x, y + s * 0.56]], { only });
      r.capsule(id, x - s * 0.16, y - s * 0.14, x - s * 0.64, y - s * 0.84, s * 0.14, { only });
      r.capsule(id, x - s * 0.64, y - s * 0.84, x - s * 0.96, y - s * 0.72, s * 0.1, { only });
      r.capsule(id, x + s * 0.16, y + s * 0.12, x + s * 0.72, y - s * 0.72, s * 0.14, { only });
      ghostWeb(r, id, [[x - s * 0.66, y - s * 0.12], [x, y + s * 0.08], [x + s * 0.66, y - s * 0.12]], [[0, 1], [1, 2]]);
      break;
    }
    case 'dino': {
      // Cute long-neck baby brontosaurus silhouette
      r.ellipse(id, x - s * 0.1, y + s * 0.22, s * 0.68, s * 0.46, 0, { only });
      r.capsule(id, x + s * 0.34, y + s * 0.02, x + s * 0.64, y - s * 0.74, s * 0.22, { only });
      r.ellipse(id, x + s * 0.82, y - s * 0.76, s * 0.34, s * 0.24, 0, { only });
      r.capsule(id, x - s * 0.64, y + s * 0.3, x - s * 1.18, y + s * 0.58, s * 0.18, { only });
      r.capsule(id, x - s * 0.42, y + s * 0.54, x - s * 0.46, y + s * 0.94, s * 0.18, { only });
      r.capsule(id, x + s * 0.24, y + s * 0.54, x + s * 0.28, y + s * 0.94, s * 0.18, { only });
      ghostWeb(r, id, [[x + s * 0.74, y - s * 0.74], [x + s * 0.44, y - s * 0.18], [x - s * 0.12, y + s * 0.22], [x - s * 0.88, y + s * 0.44]], [[0, 1], [1, 2], [2, 3]]);
      break;
    }
    case 'penguin': {
      r.ellipse(id, x, y + s * 0.22, s * 0.58, s * 0.72, 0, { only });
      r.disc(id, x, y - s * 0.48, s * 0.44, { only });
      r.poly(id, [[x + s * 0.34, y - s * 0.52], [x + s * 0.8, y - s * 0.42], [x + s * 0.34, y - s * 0.32]], { only });
      r.ellipse(id, x - s * 0.62, y + s * 0.18, s * 0.22, s * 0.48, 0.35, { only });
      r.ellipse(id, x + s * 0.62, y + s * 0.18, s * 0.22, s * 0.48, -0.35, { only });
      inkArc(r, x, y + s * 0.28, s * 0.34, s * 0.46, 0, Math.PI * 2, 0, { only: [id] });
      ghostWeb(r, id, [[x, y - s * 0.48], [x - s * 0.24, y + s * 0.24], [x + s * 0.24, y + s * 0.24]], [[0, 1], [0, 2], [1, 2]]);
      break;
    }
    case 'robot': {
      // Cute retro tin-toy robot silhouette
      rrect(r, id, x, y - s * 0.44, s * 0.92, s * 0.68, 4, 0, { only });
      rrect(r, id, x, y + s * 0.28, s * 1.06, s * 0.82, 4, 0, { only });
      r.capsule(id, x, y - s * 0.78, x, y - s * 1.04, s * 0.1, { only });
      r.disc(id, x, y - s * 1.04, s * 0.18, { only });
      r.capsule(id, x - s * 0.62, y + s * 0.16, x - s * 0.9, y + s * 0.56, s * 0.14, { only });
      r.capsule(id, x + s * 0.62, y + s * 0.16, x + s * 0.9, y + s * 0.56, s * 0.14, { only });
      inkArc(r, x - s * 0.2, y - s * 0.46, 2.2, 2.2, 0, Math.PI * 2, 0, { only: [id] });
      inkArc(r, x + s * 0.2, y - s * 0.46, 2.2, 2.2, 0, Math.PI * 2, 0, { only: [id] });
      ghostWeb(r, id, [[x - s * 0.28, y + s * 0.2], [x + s * 0.28, y + s * 0.2], [x, y + s * 0.52]], [[0, 1], [1, 2], [2, 0]]);
      break;
    }
    case 'koi': {
      r.ellipse(id, x + s * 0.1, y, s * 0.86, s * 0.44, -0.18, { only });
      r.poly(id, [[x - s * 0.64, y + s * 0.12], [x - s * 1.2, y - s * 0.34], [x - s * 1.02, y + s * 0.16], [x - s * 1.18, y + s * 0.62]], { only });
      r.ellipse(id, x + s * 0.08, y - s * 0.44, s * 0.36, s * 0.18, -0.45, { only });
      r.ellipse(id, x + s * 0.14, y + s * 0.46, s * 0.32, s * 0.18, 0.4, { only });
      ghostWeb(r, id, [[x + s * 0.64, y - s * 0.12], [x + s * 0.08, y], [x - s * 0.48, y + s * 0.12], [x - s * 0.96, y + s * 0.16]], [[0, 1], [1, 2], [2, 3]]);
      break;
    }
    case 'treble': {
      // Chunky musical treble/eighth-note cloud emblem
      r.ellipse(id, x - s * 0.38, y + s * 0.56, s * 0.42, s * 0.3, -0.35, { only });
      r.ellipse(id, x + s * 0.44, y + s * 0.38, s * 0.42, s * 0.3, -0.35, { only });
      r.capsule(id, x - s * 0.14, y + s * 0.48, x - s * 0.14, y - s * 0.68, s * 0.17, { only });
      r.capsule(id, x + s * 0.68, y + s * 0.3, x + s * 0.68, y - s * 0.82, s * 0.17, { only });
      r.capsule(id, x - s * 0.14, y - s * 0.68, x + s * 0.68, y - s * 0.82, s * 0.22, { only });
      ghostWeb(r, id, [[x - s * 0.38, y + s * 0.54], [x - s * 0.14, y - s * 0.66], [x + s * 0.68, y - s * 0.8], [x + s * 0.44, y + s * 0.36]], [[0, 1], [1, 2], [2, 3]]);
      break;
    }
    case 'crystal': {
      r.poly(id, [[x, y - s * 1.05], [x + s * 0.52, y - s * 0.34], [x + s * 0.44, y + s * 0.46], [x, y + s * 0.96], [x - s * 0.44, y + s * 0.46], [x - s * 0.52, y - s * 0.34]], { only });
      r.poly(id, [[x - s * 0.78, y - s * 0.24], [x - s * 0.36, y + s * 0.04], [x - s * 0.42, y + s * 0.72], [x - s * 0.86, y + s * 0.44]], { only });
      r.poly(id, [[x + s * 0.78, y - s * 0.24], [x + s * 0.36, y + s * 0.04], [x + s * 0.42, y + s * 0.72], [x + s * 0.86, y + s * 0.44]], { only });
      ghostWeb(r, id, [[x, y - s * 0.7], [x - s * 0.3, y], [x + s * 0.3, y], [x, y + s * 0.62]], [[0, 1], [0, 2], [1, 3], [2, 3], [1, 2]]);
      break;
    }
    case 'camel': {
      r.ellipse(id, x, y + s * 0.16, s * 0.74, s * 0.42, 0, { only });
      r.disc(id, x - s * 0.18, y - s * 0.26, s * 0.34, { only });
      r.disc(id, x + s * 0.26, y - s * 0.22, s * 0.3, { only });
      r.capsule(id, x + s * 0.56, y + s * 0.08, x + s * 0.86, y - s * 0.56, s * 0.18, { only });
      r.ellipse(id, x + s * 1.0, y - s * 0.58, s * 0.28, s * 0.2, 0, { only });
      r.capsule(id, x - s * 0.46, y + s * 0.44, x - s * 0.54, y + s * 0.96, s * 0.15, { only });
      r.capsule(id, x + s * 0.42, y + s * 0.44, x + s * 0.48, y + s * 0.96, s * 0.15, { only });
      ghostWeb(r, id, [[x - s * 0.18, y - s * 0.24], [x + s * 0.26, y - s * 0.2], [x + s * 0.88, y - s * 0.56], [x, y + s * 0.22]], [[0, 1], [1, 2], [0, 3], [1, 3]]);
      break;
    }
    case 'book': {
      // Open floating magical storybook with wing-like curved pages
      r.poly(id, [[x, y - s * 0.34], [x - s * 0.62, y - s * 0.64], [x - s * 1.04, y - s * 0.24], [x - s * 0.88, y + s * 0.54], [x, y + s * 0.38]], { only });
      r.poly(id, [[x, y - s * 0.34], [x + s * 0.62, y - s * 0.64], [x + s * 1.04, y - s * 0.24], [x + s * 0.88, y + s * 0.54], [x, y + s * 0.38]], { only });
      r.line(INK, x, y - s * 0.3, x, y + s * 0.36, { only: [id] });
      ghostWeb(r, id, [[x - s * 0.56, y - s * 0.14], [x, y + s * 0.04], [x + s * 0.56, y - s * 0.14]], [[0, 1], [1, 2]]);
      break;
    }
    case 'balloon': {
      // Hot air balloon silhouette with hanging basket
      r.disc(id, x, y - s * 0.24, s * 0.72, { only });
      r.poly(id, [[x - s * 0.58, y + s * 0.08], [x + s * 0.58, y + s * 0.08], [x + s * 0.28, y + s * 0.56], [x - s * 0.28, y + s * 0.56]], { only });
      r.capsule(id, x - s * 0.2, y + s * 0.52, x - s * 0.2, y + s * 0.82, s * 0.1, { only });
      r.capsule(id, x + s * 0.2, y + s * 0.52, x + s * 0.2, y + s * 0.82, s * 0.1, { only });
      rrect(r, id, x, y + s * 0.9, s * 0.56, s * 0.34, 3, 0, { only });
      ghostWeb(r, id, [[x, y - s * 0.72], [x - s * 0.42, y - s * 0.18], [x + s * 0.42, y - s * 0.18], [x, y + s * 0.36]], [[0, 1], [0, 2], [1, 3], [2, 3]]);
      break;
    }
    case 'cat': {
      // Curled sleeping kitty silhouette with pointy ears & curling tail
      r.ellipse(id, x, y + s * 0.24, s * 0.74, s * 0.52, 0, { only });
      r.disc(id, x - s * 0.44, y - s * 0.24, s * 0.42, { only });
      r.poly(id, [[x - s * 0.8, y - s * 0.4], [x - s * 0.76, y - s * 0.94], [x - s * 0.42, y - s * 0.58]], { only });
      r.poly(id, [[x - s * 0.44, y - s * 0.58], [x - s * 0.12, y - s * 0.94], [x - s * 0.06, y - s * 0.4]], { only });
      r.capsule(id, x + s * 0.62, y + s * 0.28, x + s * 0.96, y - s * 0.36, s * 0.18, { only });
      ghostWeb(r, id, [[x - s * 0.44, y - s * 0.24], [x + s * 0.12, y + s * 0.2], [x + s * 0.76, y - s * 0.08]], [[0, 1], [1, 2]]);
      break;
    }
    case 'fox': {
      r.ellipse(id, x, y + s * 0.06, s * 0.72, s * 0.36, -0.14, { only });
      r.capsule(id, x + s * 0.42, y + s * 0.18, x + s * 0.82, y + s * 0.66, s * 0.15, { only });
      r.capsule(id, x - s * 0.4, y + s * 0.22, x - s * 0.74, y + s * 0.72, s * 0.15, { only });
      r.disc(id, x + s * 0.66, y - s * 0.24, s * 0.36, { only });
      r.poly(id, [[x + s * 0.78, y - s * 0.36], [x + s * 1.24, y - s * 0.14], [x + s * 0.76, y - s * 0.04]], { only });
      r.poly(id, [[x + s * 0.42, y - s * 0.44], [x + s * 0.48, y - s * 0.96], [x + s * 0.76, y - s * 0.5]], { only });
      r.poly(id, [[x + s * 0.68, y - s * 0.46], [x + s * 0.84, y - s * 0.92], [x + s * 0.94, y - s * 0.4]], { only });
      r.ellipse(id, x - s * 0.88, y - s * 0.14, s * 0.6, s * 0.3, 0.5, { only });
      ghostWeb(r, id, [[x + s * 0.68, y - s * 0.22], [x + s * 0.12, y + s * 0.04], [x - s * 0.4, y + s * 0.08], [x - s * 0.92, y - s * 0.16]], [[0, 1], [1, 2], [2, 3]]);
      break;
    }
    case 'butterfly': {
      r.ellipse(id, x - s * 0.54, y - s * 0.28, s * 0.56, s * 0.46, -0.35, { only });
      r.ellipse(id, x + s * 0.54, y - s * 0.28, s * 0.56, s * 0.46, 0.35, { only });
      r.ellipse(id, x - s * 0.42, y + s * 0.36, s * 0.4, s * 0.34, 0.25, { only });
      r.ellipse(id, x + s * 0.42, y + s * 0.36, s * 0.4, s * 0.34, -0.25, { only });
      r.ellipse(id, x, y + s * 0.04, s * 0.18, s * 0.56, 0, { only });
      ghostWeb(r, id, [[x - s * 0.54, y - s * 0.26], [x, y], [x + s * 0.54, y - s * 0.26], [x - s * 0.38, y + s * 0.36], [x + s * 0.38, y + s * 0.36]], [[0, 1], [1, 2], [1, 3], [1, 4]]);
      break;
    }
    case 'pixelHeart': {
      // Chunky 8-bit heart built from 4px blocks
      const u = Math.max(3, Math.round(s * 0.24));
      const rows = [
        '01100110',
        '11111111',
        '11111111',
        '11111111',
        '01111110',
        '00111100',
        '00011000',
      ];
      const ox = Math.round(x - 4 * u);
      const oy = Math.round(y - 3.5 * u);
      for (let ry = 0; ry < rows.length; ry++) {
        const row = rows[ry] as string;
        for (let rx = 0; rx < row.length; rx++) {
          if (row[rx] === '1') {
            r.rect(id, ox + rx * u, oy + ry * u, ox + (rx + 1) * u, oy + (ry + 1) * u, { only });
          }
        }
      }
      ghostWeb(r, id, [[x - u * 1.5, y - u], [x + u * 1.5, y - u], [x, y + u * 1.5]], [[0, 2], [1, 2]]);
      break;
    }
    case 'dragon': {
      // Winding serpentine cloud-dragon silhouette with horns & wing
      r.capsule(id, x - s * 0.96, y + s * 0.32, x - s * 0.26, y - s * 0.22, s * 0.26, { only });
      r.capsule(id, x - s * 0.26, y - s * 0.22, x + s * 0.42, y + s * 0.24, s * 0.26, { only });
      r.capsule(id, x + s * 0.42, y + s * 0.24, x + s * 0.96, y - s * 0.34, s * 0.22, { only });
      r.disc(id, x + s * 1.0, y - s * 0.42, s * 0.32, { only });
      r.poly(id, [[x + s * 0.82, y - s * 0.64], [x + s * 0.66, y - s * 1.02], [x + s * 1.04, y - s * 0.72]], { only });
      r.poly(id, [[x - s * 0.3, y - s * 0.36], [x - s * 0.56, y - s * 0.96], [x + s * 0.16, y - s * 0.48]], { only });
      ghostWeb(r, id, [[x - s * 0.84, y + s * 0.26], [x - s * 0.22, y - s * 0.2], [x + s * 0.4, y + s * 0.22], [x + s * 0.98, y - s * 0.42]], [[0, 1], [1, 2], [2, 3]]);
      break;
    }
    case 'scarab': {
      // Winged Egyptian star-scarab holding solar disc
      r.ellipse(id, x, y + s * 0.12, s * 0.46, s * 0.58, 0, { only });
      r.disc(id, x, y - s * 0.68, s * 0.26, { only });
      r.poly(id, [[x - s * 0.36, y - s * 0.18], [x - s * 1.12, y - s * 0.46], [x - s * 1.0, y + s * 0.24], [x - s * 0.36, y + s * 0.36]], { only });
      r.poly(id, [[x + s * 0.36, y - s * 0.18], [x + s * 1.12, y - s * 0.46], [x + s * 1.0, y + s * 0.24], [x + s * 0.36, y + s * 0.36]], { only });
      r.line(INK, x, y - s * 0.28, x, y + s * 0.66, { only: [id] });
      ghostWeb(r, id, [[x, y - s * 0.68], [x - s * 0.72, y - s * 0.08], [x, y + s * 0.14], [x + s * 0.72, y - s * 0.08]], [[0, 2], [1, 2], [2, 3]]);
      break;
    }
  }

  return id;
}

/** Convenience alias matching ghostCreature(ctx, kind, x, y) ergonomics. */
export function ghostCreature(
  ctx: SceneCtx,
  kind: GhostSilhouetteKind,
  x: number,
  y: number,
  label?: string,
  scale = 1,
): number {
  return drawGhostSilhouette(ctx, label ?? GHOST_DEFAULT_LABELS[kind], kind, x, y, scale);
}

// ---------------------------------------------------------------------------
// 7. Cozy Pre-Colored Hub Sanctuary Room Builder (25 room regions + Violet = 29!)
// ---------------------------------------------------------------------------

export type WindowShape = 'arched' | 'porthole' | 'gothic' | 'octagonal' | 'shoji' | 'dome' | 'pixel';
export type WallStyle = 'wainscot' | 'stone' | 'bamboo' | 'tile' | 'crystal' | 'fabric' | 'arcade';
export type FloorStyle = 'wood' | 'tile' | 'moss' | 'ice' | 'sandstone' | 'tatami' | 'brass' | 'neon';
export type RugShape = 'oval' | 'round' | 'star' | 'scallop' | 'diamond' | 'cloud';
export type LampStyle = 'moon' | 'lantern' | 'coral' | 'crystal' | 'candle' | 'mushroom' | 'neon';
export type GarlandStyle = 'stars' | 'bubbles' | 'bunting' | 'lanterns' | 'leaves' | 'notes' | 'hearts';

export interface SanctuaryPalette {
  wallPanel: MaterialId;
  floor: MaterialId;
  windowFrame: MaterialId;
  windowGlass: MaterialId;
  curtain: MaterialId;
  orbCore: MaterialId;
  orbRing: MaterialId;
  rugOuter: MaterialId;
  rugInner: MaterialId;
  furniture: MaterialId;
  furnitureTrim: MaterialId;
  accentA: MaterialId;
  accentB: MaterialId;
  accentC: MaterialId;
}

export interface SanctuaryRoomOpts {
  title: string;
  sky: { top: string; bottom: string; mist: string };
  palette: SanctuaryPalette;
  windowShape?: WindowShape;
  windowOrbStyle?: ThemedOrbStyle;
  wallStyle?: WallStyle;
  floorStyle?: FloorStyle;
  rugShape?: RugShape;
  lampStyle?: LampStyle;
  garlandStyle?: GarlandStyle;
  sparkleStyle?: SkySparkleStyle;
  /** Optional custom view painted inside the window glass before mullions & curtains */
  drawWindowView?: (ctx: SceneCtx, wx: number, wy: number, wHalf: number, wBot: number) => void;
  /** Optional extra custom room props painted after core furniture & before Violet */
  drawExtraProps?: (ctx: SceneCtx) => number[];
  /** Place Violet standing in the sanctuary and pre-color 1..4 (default true) */
  placeViolet?: boolean;
  violetPos?: { x: number; y: number; facing?: 1 | -1 };
  workbenchLabel?: string;
  shelfLabel?: string;
  seatingLabel?: string;
  trinketLabels?: readonly [string, string, string];
}

export interface SanctuaryRoomResult {
  roomIds: number[];
  extraIds: number[];
  windowCenter: { x: number; y: number };
  deskTop: { x: number; y: number };
}

export function drawSanctuaryRoom(ctx: SceneCtx, opts: SanctuaryRoomOpts): SanctuaryRoomResult {
  const { r, rng } = ctx;
  const pal = opts.palette;
  const winShape = opts.windowShape ?? 'arched';
  const wallStyle = opts.wallStyle ?? 'wainscot';
  const floorStyle = opts.floorStyle ?? 'wood';
  const rugShape = opts.rugShape ?? 'oval';
  const lampStyle = opts.lampStyle ?? 'moon';
  const garlandStyle = opts.garlandStyle ?? 'stars';
  const sparkleStyle = opts.sparkleStyle ?? 'stars';
  const roomIds: number[] = [];

  ctx.title = opts.title;
  ctx.sky = opts.sky;
  ctx.focal = { x: 232, y: 128 };

  const add = (kind: RegionKind, label: string, mat: MaterialId): number => {
    const id = ctx.dyn(kind, label);
    ctx.preColor(id, mat);
    roomIds.push(id);
    return id;
  };

  // 1) Upper wall decorative wallpaper pattern on open sky (y = 10..118)
  drawSkySparkles(ctx, 18, 114, sparkleStyle);

  // 2) Lower wall paneling (y = 124..186)
  const wallId = add('prop', 'Sanctuary Wall Panels', pal.wallPanel);
  r.rect(wallId, 0, 124, W, 186);
  r.line(INK, 0, 128, W - 1, 128, { only: [wallId] });
  r.line(INK, 0, 182, W - 1, 182, { only: [wallId] });
  switch (wallStyle) {
    case 'wainscot':
      for (let x = 28; x < W; x += 40) r.line(INK, x, 132, x, 180, { only: [wallId] });
      break;
    case 'stone':
      for (const py of [144, 162]) {
        r.line(INK, 0, py, W - 1, py, { only: [wallId] });
        const off = py === 144 ? 22 : 0;
        for (let x = 18 + off; x < W; x += 44) r.line(INK, x, py - 16, x, py, { only: [wallId] });
      }
      break;
    case 'bamboo':
      for (let x = 20; x < W; x += 22) {
        r.line(INK, x, 129, x, 181, { only: [wallId] });
        r.line(INK, x - 3, 146, x + 3, 146, { only: [wallId] });
        r.line(INK, x - 3, 166, x + 3, 166, { only: [wallId] });
      }
      break;
    case 'tile':
      for (const py of [142, 156, 170]) r.line(INK, 0, py, W - 1, py, { only: [wallId] });
      for (let x = 24; x < W; x += 24) r.line(INK, x, 129, x, 181, { only: [wallId] });
      break;
    case 'crystal':
      for (let x = 24; x < W; x += 44) {
        r.line(INK, x, 129, x + 22, 156, { only: [wallId] });
        r.line(INK, x + 22, 156, x, 181, { only: [wallId] });
      }
      break;
    case 'fabric':
      for (let x = 22; x < W; x += 36) {
        inkArc(r, x, 136, 16, 14, 0.1, Math.PI - 0.1, 0, { only: [wallId] });
      }
      break;
    case 'arcade':
      for (const py of [140, 154, 168]) r.line(INK, 0, py, W - 1, py, { only: [wallId] });
      for (let x = 32; x < W; x += 32) {
        r.line(INK, x, 129, x, 181, { only: [wallId] });
        r.dot(INK, x + 16, 147, { only: [wallId] });
      }
      break;
  }

  // 3) Sanctuary floor (y = 186..250 — leaves y = 252..269 completely clear!)
  const floorId = add('prop', 'Sanctuary Floor', pal.floor);
  r.rect(floorId, 0, 186, W, 250);
  switch (floorStyle) {
    case 'wood':
      for (let i = 0; i < 4; i++) {
        const py = 198 + i * 13;
        r.line(INK, 0, py, W - 1, py, { only: [floorId] });
        for (let x = 36 + (i % 2) * 44; x < W - 12; x += 88) r.line(INK, x, py - 12, x, py - 1, { only: [floorId] });
      }
      break;
    case 'tile':
    case 'neon':
      for (const py of [200, 216, 232]) r.line(INK, 0, py, W - 1, py, { only: [floorId] });
      for (let x = 30; x < W; x += 36) {
        const lean = ((x - 240) / 240) * 26;
        r.line(INK, x, 186, x + lean, 249, { only: [floorId] });
      }
      break;
    case 'moss':
      for (let x = 22; x < W - 20; x += 38) {
        const gy = 200 + ((x * 11) % 38);
        r.line(INK, x, gy, x - 3, gy - 4, { only: [floorId] });
        r.line(INK, x, gy, x + 3, gy - 4, { only: [floorId] });
      }
      break;
    case 'ice':
      for (let x = 26; x < W - 26; x += 58) {
        r.line(INK, x, 190, x + 18, 214, { only: [floorId] });
        r.line(INK, x + 18, 214, x + 4, 244, { only: [floorId] });
      }
      break;
    case 'sandstone':
      for (const py of [204, 224, 242]) {
        r.line(INK, 0, py, W - 1, py, { only: [floorId] });
        for (let x = 26 + (py % 20); x < W - 14; x += 56) r.line(INK, x, py - 18, x, py - 1, { only: [floorId] });
      }
      break;
    case 'tatami':
      r.line(INK, 0, 218, W - 1, 218, { only: [floorId] });
      r.line(INK, 0, 221, W - 1, 221, { only: [floorId] });
      for (let x = 96; x < W; x += 120) {
        r.line(INK, x, 186, x, 217, { only: [floorId] });
        r.line(INK, x + 50, 222, x + 50, 249, { only: [floorId] });
      }
      break;
    case 'brass':
      r.line(INK, 0, 216, W - 1, 216, { only: [floorId] });
      for (let x = 58; x < W; x += 72) {
        r.line(INK, x, 186, x, 249, { only: [floorId] });
        r.dot(INK, x - 5, 194, { only: [floorId] });
        r.dot(INK, x + 5, 194, { only: [floorId] });
        r.dot(INK, x - 5, 242, { only: [floorId] });
        r.dot(INK, x + 5, 242, { only: [floorId] });
      }
      break;
  }

  // 4) Central Sanctuary Window (frame + glass + themed celestial 12/13 + curtains)
  const wx = 232;
  const wArchY = 66;
  const wHalf = 46;
  const wBot = 142;

  const winFrame = add('prop', 'Sanctuary Window Frame', pal.windowFrame);
  const paintWinMask = (targetId: number, pad: number): void => {
    const hw = wHalf + pad;
    switch (winShape) {
      case 'arched':
      case 'dome':
        r.disc(targetId, wx, wArchY, hw);
        r.rect(targetId, wx - hw, wArchY, wx + hw, wBot + pad);
        break;
      case 'porthole':
        r.disc(targetId, wx, 84, hw + 6);
        break;
      case 'gothic':
        r.poly(targetId, [
          [wx, wArchY - hw - 10],
          [wx + hw, wArchY - 6],
          [wx + hw, wBot + pad],
          [wx - hw, wBot + pad],
          [wx - hw, wArchY - 6],
        ]);
        break;
      case 'octagonal': {
        const oct: Pt[] = [];
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          oct.push([wx + Math.cos(a) * (hw + 8), 84 + Math.sin(a) * (hw + 8)]);
        }
        r.poly(targetId, oct);
        break;
      }
      case 'shoji':
      case 'pixel':
        r.rect(targetId, wx - hw, 24 - pad, wx + hw, wBot + pad);
        break;
    }
  };

  paintWinMask(winFrame, 7);
  if (winShape !== 'porthole' && winShape !== 'octagonal') {
    r.rect(winFrame, wx - wHalf - 11, wBot, wx + wHalf + 11, wBot + 9); // sill
  }
  // Curtain rod
  r.rect(winFrame, wx - wHalf - 20, 18, wx + wHalf + 20, 23);
  r.disc(winFrame, wx - wHalf - 21, 20.5, 4);
  r.disc(winFrame, wx + wHalf + 21, 20.5, 4);

  const winGlass = add('prop', 'Sanctuary Window View', pal.windowGlass);
  paintWinMask(winGlass, 0);

  // Subtle stars on glass
  for (const [gx, gy] of [
    [wx - 30, 56],
    [wx + 24, 48],
    [wx - 24, 114],
    [wx + 28, 112],
  ] as const) {
    inkCrossStar(r, gx + jit(rng, 0, 1.5), gy + jit(rng, 0, 1.5), 2, winGlass);
  }

  // Canonical celestial orb (12/13) visible through the window!
  const orb = drawThemedOrb(ctx, wx - 4, 80, 12.5, opts.windowOrbStyle ?? 'ringedPlanet', {
    tilt: -0.28,
    preColorCore: pal.orbCore,
    preColorRing: pal.orbRing,
  });
  roomIds.push(orb.coreId, orb.ringId);

  if (opts.drawWindowView) {
    opts.drawWindowView(ctx, wx, 84, wHalf, wBot);
  }

  // Window mullions drawn cleanly on glass only
  if (winShape === 'shoji') {
    for (const mx of [wx - 22, wx, wx + 22]) r.line(INK, mx, 25, mx, wBot - 1, { only: [winGlass] });
    for (const my of [54, 84, 114]) r.line(INK, wx - wHalf + 1, my, wx + wHalf - 1, my, { only: [winGlass] });
  } else {
    r.line(INK, wx, 24, wx, wBot - 1, { only: [winGlass] });
    r.line(INK, wx - wHalf + 2, 102, wx + wHalf - 2, 102, { only: [winGlass] });
  }

  // Left & Right Curtains
  const curtainL = add('prop', 'Left Window Drape', pal.curtain);
  r.poly(curtainL, [
    [wx - wHalf - 15, 22],
    [wx - wHalf + 7, 22],
    [wx - wHalf + 5, 62],
    [wx - wHalf - 4, 98],
    [wx - wHalf + 4, 145],
    [wx - wHalf - 17, 145],
    [wx - wHalf - 15, 98],
    [wx - wHalf - 17, 58],
  ]);
  r.line(INK, wx - wHalf - 8, 26, wx - wHalf - 10, 95, { only: [curtainL] });
  r.line(INK, wx - wHalf - 15, 98, wx - wHalf - 4, 98, { only: [curtainL] });

  const curtainR = add('prop', 'Right Window Drape', pal.curtain);
  r.poly(curtainR, [
    [wx + wHalf - 7, 22],
    [wx + wHalf + 15, 22],
    [wx + wHalf + 17, 58],
    [wx + wHalf + 15, 98],
    [wx + wHalf + 17, 145],
    [wx + wHalf - 4, 145],
    [wx + wHalf + 4, 98],
    [wx + wHalf - 5, 62],
  ]);
  r.line(INK, wx + wHalf + 8, 26, wx + wHalf + 10, 95, { only: [curtainR] });
  r.line(INK, wx + wHalf + 4, 98, wx + wHalf + 15, 98, { only: [curtainR] });

  // 5) Wall Garland (4 chunky themed ornaments cleanly spaced on left & right walls)
  inkArc(r, 88, 14, 74, 34, Math.PI * 0.08, Math.PI * 0.92, 0, { only: [SKY] });
  inkArc(r, 350, 18, 48, 28, Math.PI * 0.08, Math.PI * 0.92, 0, { only: [SKY] });
  const garlandSpecs: Array<[string, number, number, MaterialId]> = [
    ['Wall Garland West-1', 50, 44, pal.accentA],
    ['Wall Garland West-2', 118, 46, pal.accentB],
    ['Wall Garland East-1', 330, 44, pal.accentB],
    ['Wall Garland East-2', 374, 44, pal.accentA],
  ];
  for (const [gLabel, gx, gy, gMat] of garlandSpecs) {
    const gid = add('star', gLabel, gMat);
    const ox = gx + jit(rng, 0, 1.5);
    const oy = gy + jit(rng, 0, 1.5);
    switch (garlandStyle) {
      case 'stars':
        star(ctx, gid, ox, oy, 10.5, { points: 5, inner: 0.48 });
        break;
      case 'bubbles':
        r.disc(gid, ox, oy, 9.5);
        inkArc(r, ox, oy, 6, 6, Math.PI * 1.1, Math.PI * 1.5, 0, { only: [gid] });
        break;
      case 'bunting':
        r.poly(gid, [[ox - 10, oy - 7], [ox + 10, oy - 7], [ox, oy + 11]]);
        r.line(INK, ox - 6, oy - 2, ox + 6, oy - 2, { only: [gid] });
        break;
      case 'lanterns':
        r.ellipse(gid, ox, oy + 1, 8.5, 10.5);
        r.line(INK, ox, oy - 9, ox, oy + 11, { only: [gid] });
        r.line(INK, ox - 7, oy + 1, ox + 7, oy + 1, { only: [gid] });
        break;
      case 'leaves':
        r.ellipse(gid, ox, oy, 7.5, 11.5, 0.35);
        r.line(INK, ox - 3, oy - 8, ox + 3, oy + 8, { only: [gid] });
        break;
      case 'notes':
        r.ellipse(gid, ox - 2, oy + 4, 8, 6, -0.3);
        r.rect(gid, ox + 3, oy - 10, ox + 7, oy + 4);
        r.poly(gid, [[ox + 3, oy - 10], [ox + 12, oy - 6], [ox + 12, oy - 1], [ox + 3, oy - 5]]);
        break;
      case 'hearts':
        r.disc(gid, ox - 4.5, oy - 2, 6);
        r.disc(gid, ox + 4.5, oy - 2, 6);
        r.poly(gid, [[ox - 10, oy], [ox + 10, oy], [ox, oy + 11]]);
        break;
    }
  }

  // 6) Cozy Center Rug (outer + inner medallion)
  const rugOuter = add('prop', 'Sanctuary Rug', pal.rugOuter);
  const rugInner = add('star', 'Rug Emblem', pal.rugInner);
  const rx0 = 230;
  const ry0 = 224;
  switch (rugShape) {
    case 'oval':
    case 'round':
      r.ellipse(rugOuter, rx0, ry0, 68, 22);
      inkArc(r, rx0, ry0, 61, 18, 0, Math.PI * 2, 0, { only: [rugOuter] });
      r.ellipse(rugInner, rx0, ry0, 42, 13);
      break;
    case 'diamond':
      r.poly(rugOuter, [[rx0, ry0 - 23], [rx0 + 74, ry0], [rx0, ry0 + 23], [rx0 - 74, ry0]]);
      r.poly(rugInner, [[rx0, ry0 - 14], [rx0 + 44, ry0], [rx0, ry0 + 14], [rx0 - 44, ry0]]);
      break;
    case 'scallop':
    case 'cloud':
      r.ellipse(rugOuter, rx0, ry0, 64, 20);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        r.ellipse(rugOuter, rx0 + Math.cos(a) * 56, ry0 + Math.sin(a) * 16, 13, 7);
      }
      r.ellipse(rugInner, rx0, ry0, 40, 12.5);
      break;
    case 'star':
      r.ellipse(rugOuter, rx0, ry0, 68, 22);
      r.poly(rugInner, [
        [rx0, ry0 - 15],
        [rx0 + 14, ry0 - 5],
        [rx0 + 44, ry0 - 3],
        [rx0 + 18, ry0 + 5],
        [rx0 + 26, ry0 + 15],
        [rx0, ry0 + 8],
        [rx0 - 26, ry0 + 15],
        [rx0 - 18, ry0 + 5],
        [rx0 - 44, ry0 - 3],
        [rx0 - 14, ry0 - 5],
      ]);
      break;
  }
  r.line(INK, rx0 - 26, ry0, rx0 + 26, ry0, { only: [rugInner] });
  r.line(INK, rx0, ry0 - 8, rx0, ry0 + 8, { only: [rugInner] });

  // 7) Left Cozy Seating / Alcove Daybed (frame + cushion + throw pillow = 3 regions)
  const seatFrame = add('prop', opts.seatingLabel ?? 'Cozy Lounge Frame', pal.furniture);
  r.ellipse(seatFrame, 24, 152, 13, 16);
  r.rect(seatFrame, 11, 152, 36, 238);
  r.rect(seatFrame, 12, 218, 126, 238);
  r.ellipse(seatFrame, 120, 186, 7, 8);
  r.rect(seatFrame, 113, 186, 127, 240);
  inkArc(r, 24, 155, 7, 9, Math.PI, Math.PI * 2, 0, { only: [seatFrame] });

  const seatCushion = add('prop', 'Plush Lounge Cushion', pal.accentC);
  r.poly(seatCushion, [[35, 188], [114, 184], [116, 224], [35, 226]]);
  r.line(INK, 40, 202, 111, 198, { only: [seatCushion] });
  r.line(INK, 40, 215, 112, 212, { only: [seatCushion] });

  const seatPillow = add('prop', 'Sanctuary Pillow', pal.accentA);
  r.ellipse(seatPillow, 52, 174, 19, 13, -0.18);
  inkArc(r, 52, 175, 10, 5, Math.PI * 0.2, Math.PI * 0.85, -0.18, { only: [seatPillow] });

  // 8) Side Pedestal Table & Themed Glowing Lamp (clear of left curtain at x >= 171!)
  const sx = 148;
  const sideTable = add('prop', 'Side Pedestal Table', pal.furnitureTrim);
  r.rect(sideTable, sx - 15, 172, sx + 15, 178);
  r.rect(sideTable, sx - 12, 178, sx + 12, 222);
  r.line(INK, sx - 9, 195, sx + 9, 195, { only: [sideTable] });
  r.line(INK, sx - 9, 209, sx + 9, 209, { only: [sideTable] });
  r.dot(INK, sx, 187, { only: [sideTable] });
  r.dot(INK, sx, 202, { only: [sideTable] });

  const lampId = add('star', 'Sanctuary Glow Lamp', pal.accentB);
  r.ellipse(lampId, sx, 169, 9, 3.5);
  r.rect(lampId, sx - 3, 160, sx + 3, 169);
  switch (lampStyle) {
    case 'moon':
      crescent(ctx, lampId, sx, 147, 13, -0.35);
      break;
    case 'lantern':
      r.ellipse(lampId, sx, 148, 11, 13);
      r.line(INK, sx, 136, sx, 160, { only: [lampId] });
      r.line(INK, sx - 9, 148, sx + 9, 148, { only: [lampId] });
      break;
    case 'coral':
      r.disc(lampId, sx, 152, 10);
      r.capsule(lampId, sx - 3, 148, sx - 9, 136, 4);
      r.capsule(lampId, sx + 3, 148, sx + 9, 137, 4);
      break;
    case 'crystal':
      r.poly(lampId, [[sx, 132], [sx + 10, 146], [sx + 7, 162], [sx - 7, 162], [sx - 10, 146]]);
      r.line(INK, sx, 135, sx, 160, { only: [lampId] });
      break;
    case 'candle':
      r.rect(lampId, sx - 6, 146, sx + 6, 166);
      r.ellipse(lampId, sx, 139, 5, 7);
      break;
    case 'mushroom':
      r.ellipse(lampId, sx, 149, 14, 9);
      inkArc(r, sx - 5, 147, 2.2, 2.2, 0, Math.PI * 2, 0, { only: [lampId] });
      inkArc(r, sx + 5, 148, 2, 2, 0, Math.PI * 2, 0, { only: [lampId] });
      break;
    case 'neon':
      star(ctx, lampId, sx, 148, 13, { points: 5, inner: 0.5 });
      break;
  }

  // 9) Craft Workbench / Art Desk + Open Sketchbook (2 regions)
  const dx0 = 304;
  const dx1 = 394;
  const dyTop = 180;
  const dyBot = 240;

  const deskId = add('prop', opts.workbenchLabel ?? 'Craft Workbench', pal.furnitureTrim);
  r.rect(deskId, dx0 - 3, dyTop, dx1 + 3, dyTop + 10);
  r.rect(deskId, dx0, dyTop + 10, dx0 + 12, dyBot);
  r.rect(deskId, dx1 - 24, dyTop + 10, dx1, dyBot);
  r.line(INK, dx1 - 21, dyTop + 26, dx1 - 3, dyTop + 26, { only: [deskId] });
  r.line(INK, dx1 - 21, dyTop + 42, dx1 - 3, dyTop + 42, { only: [deskId] });
  r.dot(INK, dx1 - 12, dyTop + 18, { only: [deskId] });
  r.dot(INK, dx1 - 12, dyTop + 34, { only: [deskId] });

  const bookId = add('prop', 'Open Sketchbook', pal.accentA);
  r.poly(bookId, [
    [dx0 + 4, dyTop - 11],
    [dx0 + 18, dyTop - 14],
    [dx0 + 27, dyTop - 10],
    [dx0 + 37, dyTop - 14],
    [dx0 + 50, dyTop - 11],
    [dx0 + 48, dyTop + 5],
    [dx0 + 27, dyTop + 7],
    [dx0 + 6, dyTop + 5],
  ]);
  r.line(INK, dx0 + 27, dyTop - 9, dx0 + 27, dyTop + 6, { only: [bookId] });
  inkCrossStar(r, dx0 + 38, dyTop - 3, 3, bookId);
  r.line(INK, dx0 + 10, dyTop - 5, dx0 + 21, dyTop - 5, { only: [bookId] });
  r.line(INK, dx0 + 10, dyTop - 1, dx0 + 20, dyTop - 1, { only: [bookId] });

  // 10) Far-Right Display Shelf + 3 Chunky Keepsake/Book Rows (4 regions)
  const bx0 = 406;
  const bx1 = 468;
  const by0 = 52;
  const by1 = 228;

  const shelfId = add('prop', opts.shelfLabel ?? 'Sanctuary Bookshelf', pal.furniture);
  r.rect(shelfId, bx0 - 3, by0 - 5, bx1 + 3, by0 + 2);
  r.rect(shelfId, bx0, by0, bx1, by1);
  for (const sy of [100, 146, 192, 218]) {
    r.line(INK, bx0 + 3, sy, bx1 - 3, sy, { only: [shelfId] });
  }

  const tLabels = opts.trinketLabels ?? ['Realm Chronicles', 'Craft Keepsakes', 'Wonder Folios'];
  const shelfRows: Array<[string, number, number, MaterialId]> = [
    [tLabels[0], 64, 97, pal.accentB],
    [tLabels[1], 110, 143, pal.accentC],
    [tLabels[2], 156, 189, pal.accentA],
  ];
  for (const [sLabel, sy0, sy1, sMat] of shelfRows) {
    const sid = add('prop', sLabel, sMat);
    r.rect(sid, bx0 + 6, sy0, bx1 - 6, sy1);
    r.line(INK, bx0 + 22, sy0 + 2, bx0 + 22, sy1 - 1, { only: [sid] });
    r.line(INK, bx0 + 38, sy0 + 2, bx0 + 38, sy1 - 1, { only: [sid] });
    r.line(INK, bx0 + 7, sy0 + 8, bx1 - 7, sy0 + 8, { only: [sid] });
    r.line(INK, bx0 + 7, sy1 - 7, bx1 - 7, sy1 - 7, { only: [sid] });
  }

  // 11) Optional universe-specific custom props hook
  const extraIds = opts.drawExtraProps ? opts.drawExtraProps(ctx) : [];

  // 12) Violet standing in her sanctuary (pre-colored 1..4)
  if (opts.placeViolet !== false) {
    const vx = opts.violetPos?.x ?? 230;
    const vy = opts.violetPos?.y ?? 238;
    const facing = opts.violetPos?.facing ?? 1;
    ctx.actor('violet', vx, vy, { facing, anim: 'idle' });
    ctx.preColor(1, MaterialId.CottonCandyChalk);
    ctx.preColor(2, MaterialId.SolarFlare24K);
    ctx.preColor(3, MaterialId.SupernovaGlitter);
    ctx.preColor(4, MaterialId.OpalPearl);
  }

  // 13) Margin flower-rain path & cozy ambient orbit path
  ctx.marginPath(256);
  ctx.ellipsePath('orbit', wx, 98, 128, 52, 24);

  return {
    roomIds,
    extraIds,
    windowCenter: { x: wx, y: 84 },
    deskTop: { x: dx0 + 70, y: dyTop },
  };
}
