/**
 * Hub Scene: "Violet's Starlight Bedroom"
 * Cosy pre-coloured bedroom hub (25..45 colourable regions) featuring a grand arched
 * starry window with ringed planet (12/13) & scalloped curtains, wall star garlands,
 * cosy bed with starry quilt & fluffy pillow, bedside moon-lamp, brass telescope on
 * tripod aimed at the window, round starry rug, art desk with open sketchbook & fat
 * crayons, wooden bookshelf with chunky colour-banded books, floorboards, wainscoting
 * panels, and Violet standing in the room.
 */
import { MaterialId } from '../contracts/materials';
import type { SceneCtx } from './context';
import { crescent, inkArc, jit, ringedPlanet, rot, star } from './props';
import type { Pt, Raster } from './raster';

/** Draw a chunky crayon with pointed tip and paper-wrapper ink bands. */
function drawFatCrayon(r: Raster, id: number, cx: number, cy: number, len: number, thick: number, ang: number): void {
  const hw = thick / 2;
  const bodyEnd = len * 0.28;
  const tipEnd = len * 0.54;
  const backEnd = -len * 0.46;
  const pts = rot(
    [
      [cx + backEnd, cy - hw],
      [cx + bodyEnd, cy - hw],
      [cx + tipEnd, cy],
      [cx + bodyEnd, cy + hw],
      [cx + backEnd, cy + hw],
    ],
    cx,
    cy,
    ang,
  );
  r.poly(id, pts);
  for (const frac of [-0.26, 0.12]) {
    const seg = rot(
      [
        [cx + len * frac, cy - hw + 1],
        [cx + len * frac, cy + hw - 1],
      ],
      cx,
      cy,
      ang,
    );
    const a = seg[0] as Pt;
    const b = seg[1] as Pt;
    r.line(0, a[0], a[1], b[0], b[1], { only: [id] });
  }
}

/** Tiny ink star doodle inside a given region (e.g. night glass, quilt, wallpaper). */
function inkStar(r: Raster, x: number, y: number, arm: number, onlyId: number): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  r.line(0, rx - arm, ry, rx + arm, ry, { only: [onlyId] });
  r.line(0, rx, ry - arm, rx, ry + arm, { only: [onlyId] });
}

export function buildBedroomHub(ctx: SceneCtx): void {
  const r = ctx.r;
  const rng = ctx.rng;
  ctx.title = "Violet's Starlight Bedroom";
  // Warm cozy twilight-plum bedroom walls (upper wall sky backdrop)
  ctx.sky = { top: '#3c2559', bottom: '#6d4482', mist: '#a67db5' };
  ctx.focal = { x: 234, y: 122 };

  // =========================================================================
  // 1) ROOM ARCHITECTURE: COZY WALL PANELS & FLOORBOARDS (2 regions)
  // =========================================================================
  // Subtle hand-inked star wallpaper pattern on upper sky wall (y = 10..116)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 10; col++) {
      const wx = 20 + col * 48 + (row % 2 ? 22 : 0) + jit(rng, 0, 2);
      const wy = 24 + row * 34 + jit(rng, 0, 2);
      inkStar(r, wx, wy, 2, 255);
    }
  }

  // Lower wall wainscoting panel (y = 122..186)
  const wallPanel = ctx.dyn('prop', 'Cozy Wall Panels');
  r.rect(wallPanel, 0, 122, 480, 186);
  ctx.preColor(wallPanel, MaterialId.AuroraSherbet);
  // Chair-rail moulding & baseboard trim + vertical panel grooves
  r.line(0, 0, 126, 479, 126, { only: [wallPanel] });
  r.line(0, 0, 182, 479, 182, { only: [wallPanel] });
  for (let x = 28; x < 480; x += 40) {
    r.line(0, x, 130, x, 180, { only: [wallPanel] });
  }

  // Warm wooden floorboards (y = 186..252; bottom 16px margin 254..269 stays clean!)
  const floorId = ctx.dyn('prop', 'Wooden Floorboards');
  r.rect(floorId, 0, 186, 480, 252);
  ctx.preColor(floorId, MaterialId.SolarCheetahAmber);
  const plankYs = [196, 208, 222, 238];
  for (let i = 0; i < plankYs.length; i++) {
    const py = plankYs[i] as number;
    r.line(0, 0, py, 479, py, { only: [floorId] });
    const yPrev = i === 0 ? 186 : (plankYs[i - 1] as number);
    for (let jx = 34 + (i % 2) * 44; jx < 470; jx += 88) {
      r.line(0, jx, yPrev + 1, jx, py - 1, { only: [floorId] });
    }
  }

  // =========================================================================
  // 2) GRAND ARCHED STARRY WINDOW WITH NIGHT SKY, PLANET, MOON & CURTAINS (7 regions)
  // =========================================================================
  const wx = 234;
  const wArchY = 66;
  const wHalf = 46;
  const wBot = 142;

  // Window wooden arch frame, curtain rod & sill
  const winFrame = ctx.dyn('prop', 'Arched Window Frame');
  r.disc(winFrame, wx, wArchY, wHalf + 6);
  r.rect(winFrame, wx - wHalf - 6, wArchY, wx + wHalf + 6, wBot + 4);
  r.rect(winFrame, wx - wHalf - 11, wBot, wx + wHalf + 11, wBot + 9); // sill
  // Curtain rod extending just behind curtain tops
  r.rect(winFrame, wx - wHalf - 22, 18, wx + wHalf + 22, 23);
  r.disc(winFrame, wx - wHalf - 23, 20.5, 4);
  r.disc(winFrame, wx + wHalf + 23, 20.5, 4);
  ctx.preColor(winFrame, MaterialId.SolarFlare24K);

  // Night-sky window glass inside the arch
  const winGlass = ctx.dyn('prop', 'Starry Window Glass');
  r.disc(winGlass, wx, wArchY, wHalf);
  r.rect(winGlass, wx - wHalf, wArchY, wx + wHalf, wBot);
  ctx.preColor(winGlass, MaterialId.DeepSpaceBiolum);

  // Tiny twinkling stars on the night glass
  const glassStars: Array<[number, number, number]> = [
    [wx - 32, 52, 2], [wx - 10, 34, 3], [wx + 22, 42, 2],
    [wx - 34, 98, 2], [wx + 30, 118, 2], [wx - 8, 126, 3],
    [wx + 10, 56, 2],
  ];
  for (const [gx, gy, arm] of glassStars) {
    inkStar(r, gx + jit(rng, 0, 1.5), gy + jit(rng, 0, 1.5), arm, winGlass);
  }

  // Small Ringed Planet visible through the window! (core 12 + rings 13, each >= 180px)
  const pCore = ctx.canon(12);
  const pRings = ctx.canon(13);
  ringedPlanet(ctx, wx - 16, 78 + jit(rng, 0, 1.5), 12.5, {
    tilt: -0.32,
    coreId: pCore,
    ringId: pRings,
    ringW: 2.0,
    ringH: 0.62,
  });
  ctx.preColor(pCore, MaterialId.HoloFoil);
  ctx.preColor(pRings, MaterialId.SolarFlare24K);

  // Glowing crescent moon through the upper-right of the window
  const winMoon = ctx.dyn('star', 'Window Crescent Moon');
  crescent(ctx, winMoon, wx + 21, 58 + jit(rng, 0, 1.5), 11, -0.45);
  ctx.preColor(winMoon, MaterialId.OpalPearl);

  // Delicate arched window mullions (ink only on glass so planet/moon stay crisp)
  r.line(0, wx, wArchY - wHalf + 2, wx, wBot - 1, { only: [winGlass] });
  r.line(0, wx - wHalf + 2, 102, wx + wHalf - 2, 102, { only: [winGlass] });

  // Softly draped left & right scalloped tie-back curtains
  const curtainL = ctx.dyn('prop', 'Left Starry Curtain');
  r.poly(curtainL, [
    [wx - wHalf - 16, 22],
    [wx - wHalf + 8, 22],
    [wx - wHalf + 7, 56],
    [wx - wHalf + 2, 82],
    [wx - wHalf - 5, 100],
    [wx - wHalf + 2, 124],
    [wx - wHalf + 5, 146],
    [wx - wHalf - 18, 146],
    [wx - wHalf - 16, 100],
    [wx - wHalf - 18, 60],
  ]);
  r.line(0, wx - wHalf - 9, 26, wx - wHalf - 10, 96, { only: [curtainL] });
  r.line(0, wx - wHalf - 2, 26, wx - wHalf - 6, 96, { only: [curtainL] });
  r.line(0, wx - wHalf - 16, 100, wx - wHalf - 5, 100, { only: [curtainL] }); // tieback
  r.line(0, wx - wHalf - 11, 104, wx - wHalf - 12, 142, { only: [curtainL] });
  ctx.preColor(curtainL, MaterialId.CottonCandyChalk);

  const curtainR = ctx.dyn('prop', 'Right Starry Curtain');
  r.poly(curtainR, [
    [wx + wHalf - 8, 22],
    [wx + wHalf + 16, 22],
    [wx + wHalf + 18, 60],
    [wx + wHalf + 16, 100],
    [wx + wHalf + 18, 146],
    [wx + wHalf - 5, 146],
    [wx + wHalf - 2, 124],
    [wx + wHalf + 5, 100],
    [wx + wHalf - 2, 82],
    [wx + wHalf - 7, 56],
  ]);
  r.line(0, wx + wHalf + 9, 26, wx + wHalf + 10, 96, { only: [curtainR] });
  r.line(0, wx + wHalf + 2, 26, wx + wHalf + 6, 96, { only: [curtainR] });
  r.line(0, wx + wHalf + 5, 100, wx + wHalf + 16, 100, { only: [curtainR] }); // tieback
  r.line(0, wx + wHalf + 11, 104, wx + wHalf + 12, 142, { only: [curtainR] });
  ctx.preColor(curtainR, MaterialId.CottonCandyChalk);

  // =========================================================================
  // 3) WALL STAR GARLANDS (cleanly framed between walls, window & bookshelf -> 4 stars)
  // =========================================================================
  // Left garland cord: from x=12 to left curtain rod finial at x=165
  inkArc(r, 88, 14, 76, 34, Math.PI * 0.08, Math.PI * 0.92, 0, { only: [255] });
  // Right garland cord: from right curtain rod finial (x=304) cleanly to bookshelf left edge (x=402)
  inkArc(r, 353, 18, 50, 28, Math.PI * 0.08, Math.PI * 0.92, 0, { only: [255] });

  const garlandSpecs: Array<[string, number, number, MaterialId]> = [
    ['Garland Star West-1', 50, 44, MaterialId.SolarFlare24K],
    ['Garland Star West-2', 118, 46, MaterialId.LiquidAurora],
    ['Garland Star East-1', 332, 44, MaterialId.LiquidAurora],
    ['Garland Star East-2', 376, 44, MaterialId.SolarFlare24K],
  ];
  for (const [label, gx, gy, mat] of garlandSpecs) {
    const sid = ctx.dyn('star', label);
    star(ctx, sid, gx + jit(rng, 0, 1.5), gy + jit(rng, 0, 1.5), 10.5, { points: 5, inner: 0.48 });
    ctx.preColor(sid, mat);
  }

  // =========================================================================
  // 4) ROUND STARRY RUG ON THE FLOOR (center foreground -> 2 regions)
  // =========================================================================
  const rugOuter = ctx.dyn('prop', 'Round Starry Rug');
  r.ellipse(rugOuter, 230, 224, 66, 22);
  ctx.preColor(rugOuter, MaterialId.SupernovaGlitter);
  inkArc(r, 230, 224, 60, 18.5, 0, Math.PI * 2, 0, { only: [rugOuter] });

  const rugInner = ctx.dyn('star', 'Rug Star Medallion');
  r.ellipse(rugInner, 230, 224, 41, 13);
  ctx.preColor(rugInner, MaterialId.LiquidAurora);
  r.line(0, 196, 224, 264, 224, { only: [rugInner] });
  r.line(0, 230, 214, 230, 234, { only: [rugInner] });

  // =========================================================================
  // 5) COSY BED WITH STARRY QUILT & FLUFFY PILLOW (left foreground -> 5 regions)
  // =========================================================================
  // Wooden arched headboard (far left)
  const headboard = ctx.dyn('prop', 'Wooden Headboard');
  r.ellipse(headboard, 25, 146, 13, 17);
  r.rect(headboard, 12, 146, 37, 240);
  // Carved inner arch & star detail
  inkArc(r, 25, 150, 7, 9, Math.PI, Math.PI * 2, 0, { only: [headboard] });
  inkStar(r, 25, 147, 2, headboard);
  ctx.preColor(headboard, MaterialId.SolarCheetahAmber);

  // Fluffy cloud-like pillow propped cleanly against the headboard
  const pillow = ctx.dyn('prop', 'Fluffy Pillow');
  r.ellipse(pillow, 50, 172, 18, 12, -0.18);
  r.ellipse(pillow, 43, 167, 10, 7.5, -0.2);
  r.ellipse(pillow, 56, 174, 10, 8, -0.15);
  inkArc(r, 49, 173, 10, 5, Math.PI * 0.2, Math.PI * 0.85, -0.18, { only: [pillow] });
  ctx.preColor(pillow, MaterialId.OpalPearl);

  // Soft folded sheet cuff draping neatly across the upper mattress
  const sheetCuff = ctx.dyn('prop', 'Folded Sheet Cuff');
  r.poly(sheetCuff, [
    [35, 184],
    [76, 176],
    [82, 195],
    [35, 200],
  ]);
  r.line(0, 42, 191, 74, 184, { only: [sheetCuff] });
  ctx.preColor(sheetCuff, MaterialId.CottonCandyChalk);

  // Big draping starry quilt with cosy quilted stitching
  const quilt = ctx.dyn('prop', 'Starry Quilt');
  r.poly(quilt, [
    [34, 196],
    [78, 189],
    [131, 183],
    [135, 236],
    [34, 238],
  ]);
  r.line(0, 38, 208, 130, 200, { only: [quilt] });
  r.line(0, 38, 224, 132, 218, { only: [quilt] });
  inkStar(r, 62, 212, 3, quilt);
  inkStar(r, 94, 208, 3, quilt);
  inkStar(r, 119, 213, 2, quilt);
  inkStar(r, 78, 229, 3, quilt);
  inkStar(r, 112, 228, 2, quilt);
  ctx.preColor(quilt, MaterialId.VelvetNebula);

  // Wooden footboard
  const footboard = ctx.dyn('prop', 'Wooden Footboard');
  r.ellipse(footboard, 134, 180, 7, 8);
  r.rect(footboard, 127, 180, 141, 242);
  ctx.preColor(footboard, MaterialId.SolarCheetahAmber);

  // =========================================================================
  // 6) BEDSIDE NIGHTSTAND & GLOWING MOON-LAMP (cleanly spaced from curtain -> 2 regions)
  // =========================================================================
  const nsx = 158;
  const nightstand = ctx.dyn('prop', 'Bedside Nightstand');
  r.rect(nightstand, nsx - 14, 170, nsx + 16, 218);
  r.rect(nightstand, nsx - 16, 168, nsx + 18, 174); // tabletop overhang
  r.line(0, nsx - 10, 190, nsx + 12, 190, { only: [nightstand] });
  r.line(0, nsx - 10, 205, nsx + 12, 205, { only: [nightstand] });
  r.dot(0, nsx + 1, 181, { only: [nightstand] });
  r.dot(0, nsx + 1, 197, { only: [nightstand] });
  ctx.preColor(nightstand, MaterialId.AuroraSherbet);

  // Glowing bedside crescent moon-lamp sitting cleanly atop the nightstand (clear of curtain!)
  const moonLamp = ctx.dyn('star', 'Bedside Moon-Lamp');
  r.ellipse(moonLamp, nsx + 1, 165, 9, 4);
  r.rect(moonLamp, nsx - 2, 157, nsx + 4, 166);
  crescent(ctx, moonLamp, nsx + 1, 145, 13, -0.35);
  inkArc(r, nsx - 2, 145, 7.5, 7.5, Math.PI * 0.65, Math.PI * 1.35, 0, { only: [moonLamp] });
  ctx.preColor(moonLamp, MaterialId.SolarFlare24K);

  // =========================================================================
  // 7) BRASS TELESCOPE ON TRIPOD AIMED AT THE STAR WINDOW (clean silhouette -> 2 regions)
  // =========================================================================
  const tx = 286;
  const ty = 172;
  const tripod = ctx.dyn('prop', 'Telescope Tripod');
  r.disc(tripod, tx, ty, 5.5);
  r.capsule(tripod, tx - 1, ty + 2, tx - 14, 222, 2.4);
  r.capsule(tripod, tx, ty + 2, tx + 1, 225, 2.4);
  r.capsule(tripod, tx + 1, ty + 2, tx + 14, 222, 2.4);
  ctx.preColor(tripod, MaterialId.AuroraSherbet);

  // Sleek chunky brass telescope tube aimed directly up-left toward the star window!
  const scopeTube = ctx.dyn('prop', 'Brass Telescope');
  const scopeAng = -2.56;
  const tubePts = rot(
    [
      [tx - 13, ty - 4.8],
      [tx + 18, ty - 7.2],
      [tx + 22, ty - 8.2],
      [tx + 22, ty + 8.2],
      [tx + 18, ty + 7.2],
      [tx - 13, ty + 4.8],
      [tx - 18, ty + 3.0],
      [tx - 18, ty - 3.0],
    ],
    tx,
    ty,
    scopeAng,
  );
  r.poly(scopeTube, tubePts);
  for (const off of [-4, 8, 17]) {
    const band = rot([[tx + off, ty - 6], [tx + off, ty + 6]], tx, ty, scopeAng);
    r.line(0, (band[0] as Pt)[0], (band[0] as Pt)[1], (band[1] as Pt)[0], (band[1] as Pt)[1], { only: [scopeTube] });
  }
  ctx.preColor(scopeTube, MaterialId.SolarFlare24K);

  // =========================================================================
  // 8) WOODEN BOOKSHELF WITH CHUNKY COLOUR-BANDED BOOKS (far right -> 7 regions)
  // =========================================================================
  const bx0 = 406;
  const bx1 = 468;
  const by0 = 50;
  const by1 = 228;

  const shelfFrame = ctx.dyn('prop', 'Wooden Bookshelf');
  r.rect(shelfFrame, bx0 - 3, by0 - 5, bx1 + 3, by0 + 2); // crown top
  r.rect(shelfFrame, bx0, by0, bx1, by1);
  r.line(0, bx0 + 3, 98, bx1 - 3, 98, { only: [shelfFrame] });
  r.line(0, bx0 + 3, 144, bx1 - 3, 144, { only: [shelfFrame] });
  r.line(0, bx0 + 3, 190, bx1 - 3, 190, { only: [shelfFrame] });
  r.line(0, bx0 + 3, 218, bx1 - 3, 218, { only: [shelfFrame] }); // bottom plinth line
  ctx.preColor(shelfFrame, MaterialId.SolarCheetahAmber);

  // 6 chunky colour-banded book blocks with organic varied heights (2 per shelf across 3 shelves)
  const bookSpecs: Array<[string, number, number, number, number, MaterialId, boolean]> = [
    ['Star Atlas Books', bx0 + 6, 61, bx0 + 32, 95, MaterialId.RainbowPrismWax, false],
    ['Nebula Guides', bx0 + 35, 67, bx1 - 6, 95, MaterialId.LiquidAurora, true],
    ['Unicorn Tales', bx0 + 6, 111, bx0 + 30, 141, MaterialId.SupernovaGlitter, false],
    ['Crayon Journals', bx0 + 33, 106, bx1 - 6, 141, MaterialId.HoloFoil, false],
    ['Cosmic Comics', bx0 + 6, 154, bx0 + 31, 187, MaterialId.CottonCandyChalk, false],
    ['Dream Diaries', bx0 + 34, 159, bx1 - 6, 187, MaterialId.OpalPearl, true],
  ];
  for (const [label, x0, y0, x1, y1, mat, leanRight] of bookSpecs) {
    const bid = ctx.dyn('prop', label);
    if (leanRight) {
      // One book leaning playfully against the vertical book
      r.poly(bid, [
        [x0, y0 + 2],
        [x1 - 3, y0],
        [x1, y1],
        [x0, y1],
      ]);
    } else {
      r.rect(bid, x0, y0, x1, y1);
    }
    const midX = Math.round((x0 + x1) / 2);
    r.line(0, midX, y0 + 2, midX, y1 - 1, { only: [bid] });
    r.line(0, x0 + 1, y0 + 8, x1 - 1, y0 + 8, { only: [bid] });
    r.line(0, x0 + 1, y1 - 7, x1 - 1, y1 - 7, { only: [bid] });
    ctx.preColor(bid, mat);
  }

  // =========================================================================
  // 9) ART DESK WITH OPEN SKETCHBOOK & 3 DISTINCT FAT CRAYONS (right-center -> 5 regions)
  // =========================================================================
  const dx0 = 312;
  const dx1 = 399;
  const dyTop = 180;
  const dyBot = 240;

  const deskId = ctx.dyn('prop', 'Art Desk');
  r.rect(deskId, dx0 - 3, dyTop, dx1 + 3, dyTop + 10); // desktop
  r.rect(deskId, dx0, dyTop + 10, dx0 + 12, dyBot); // left leg
  r.rect(deskId, dx1 - 24, dyTop + 10, dx1, dyBot); // right drawer cabinet
  r.line(0, dx1 - 21, dyTop + 26, dx1 - 3, dyTop + 26, { only: [deskId] });
  r.line(0, dx1 - 21, dyTop + 42, dx1 - 3, dyTop + 42, { only: [deskId] });
  r.dot(0, dx1 - 12, dyTop + 18, { only: [deskId] });
  r.dot(0, dx1 - 12, dyTop + 34, { only: [deskId] });
  ctx.preColor(deskId, MaterialId.AuroraSherbet);

  // Clean open double-page Sketchbook resting on the left side of the desk
  const bookId = ctx.dyn('prop', 'Open Sketchbook');
  r.poly(bookId, [
    [dx0 + 3, dyTop - 11],
    [dx0 + 15, dyTop - 14],
    [dx0 + 24, dyTop - 10], // top center spine dip
    [dx0 + 34, dyTop - 14],
    [dx0 + 46, dyTop - 11],
    [dx0 + 44, dyTop + 5],
    [dx0 + 24, dyTop + 7], // bottom center spine
    [dx0 + 5, dyTop + 5],
  ]);
  // Center spine crease + sketched star on right page & lines on left page
  r.line(0, dx0 + 24, dyTop - 9, dx0 + 24, dyTop + 6, { only: [bookId] });
  inkStar(r, dx0 + 35, dyTop - 3, 3, bookId);
  r.line(0, dx0 + 9, dyTop - 5, dx0 + 19, dyTop - 5, { only: [bookId] });
  r.line(0, dx0 + 9, dyTop - 1, dx0 + 18, dyTop - 1, { only: [bookId] });
  ctx.preColor(bookId, MaterialId.OpalPearl);

  // Three fat crayons standing/fanned neatly on the right side of the desk with crisp separation!
  const crayonA = ctx.dyn('prop', 'Cherry Fat Crayon');
  drawFatCrayon(r, crayonA, dx0 + 57, dyTop - 12, 23, 7.2, -1.68);
  ctx.preColor(crayonA, MaterialId.RainbowPrismWax);

  const crayonB = ctx.dyn('prop', 'Magenta Fat Crayon');
  drawFatCrayon(r, crayonB, dx0 + 70, dyTop - 13, 23, 7.2, -1.42);
  ctx.preColor(crayonB, MaterialId.NeonCyberCheetah);

  const crayonC = ctx.dyn('prop', 'Aurora Fat Crayon');
  drawFatCrayon(r, crayonC, dx0 + 83, dyTop - 10, 23, 7.2, -1.12);
  ctx.preColor(crayonC, MaterialId.LiquidAurora);

  // =========================================================================
  // 10) VIOLET STANDING IN HER ROOM + PRE-COLORED REGIONS 1..4 + PATHS
  // =========================================================================
  ctx.actor('violet', 230, 238, { facing: 1, anim: 'idle' });
  ctx.preColor(1, MaterialId.AuroraSherbet); // Violet's warm skin
  ctx.preColor(2, MaterialId.SolarCheetahAmber); // Violet's sandy hair
  ctx.preColor(3, MaterialId.SupernovaGlitter); // Violet's pajama suit
  ctx.preColor(4, MaterialId.OpalPearl); // Starlight helmet

  // Paths: margin + cozy stardust orbit
  ctx.marginPath(256);
  ctx.ellipsePath('orbit', 234, 98, 128, 52, 24);
}
