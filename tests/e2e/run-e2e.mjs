import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { chromium } from 'playwright-core';

const ROOT = resolve(process.cwd());
const DIST_DIR = resolve(ROOT, 'dist');
const OUT_DIR = resolve(process.env.E2E_OUT || '.e2e-out');
const MOUNT_PREFIX = '/chroma-cosmos/';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

function startSubpathServer(distDir) {
  const server = createServer((req, res) => {
    try {
      const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
      const pathname = decodeURIComponent(reqUrl.pathname);

      if (pathname === '/chroma-cosmos') {
        res.writeHead(302, { Location: `${MOUNT_PREFIX}${reqUrl.search}` });
        res.end();
        return;
      }

      if (!pathname.startsWith(MOUNT_PREFIX)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found (outside /chroma-cosmos/ mount)');
        return;
      }

      let relPath = pathname.slice(MOUNT_PREFIX.length);
      if (relPath === '' || relPath.endsWith('/')) {
        relPath += 'index.html';
      }

      const fullPath = resolve(distDir, relPath);
      if (fullPath !== distDir && !fullPath.startsWith(distDir + sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`Not Found: ${pathname}`);
        return;
      }

      const ext = extname(fullPath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      const body = readFileSync(fullPath);
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'no-cache',
      });
      res.end(body);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(String(err));
    }
  });

  return new Promise((resolvePromise, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to bind ephemeral port'));
        return;
      }
      resolvePromise({ server, port: addr.port });
    });
  });
}

async function launchBrowser() {
  const channels = ['chrome', 'msedge'];
  let lastErr = null;
  for (const channel of channels) {
    try {
      const browser = await chromium.launch({
        channel,
        headless: false,
        args: [
          '--no-first-run',
          '--no-default-browser-check',
          '--autoplay-policy=no-user-gesture-required',
        ],
      });
      return { browser, channel };
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`Could not launch headed Chromium via chrome or msedge: ${String(lastErr)}`);
}

async function waitForMode(page, expectedMode, timeoutMs = 15000) {
  await page.waitForFunction(
    (m) => window.__chroma?.qa?.mode() === m,
    expectedMode,
    { timeout: timeoutMs },
  );
}

/** Measure pairwise bounding-box overlaps among named DOM selectors (ignoring hidden/zero-size elements). */
async function measureLayoutGeometry(page, namedSelectors) {
  return page.evaluate((items) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spreadEl = document.querySelector('.cc-book.cc-spread');
    const canvasEl = document.querySelector('.cc-canvas-host canvas');
    const sr = spreadEl ? spreadEl.getBoundingClientRect() : null;
    const cr = canvasEl ? canvasEl.getBoundingClientRect() : null;

    const boxes = [];
    for (const { name, selector } of items) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity || '1') === 0) {
        continue;
      }
      const r = el.getBoundingClientRect();
      if (r.width <= 0.5 || r.height <= 0.5) continue;
      boxes.push({
        name,
        selector,
        left: Math.round(r.left * 10) / 10,
        top: Math.round(r.top * 10) / 10,
        right: Math.round(r.right * 10) / 10,
        bottom: Math.round(r.bottom * 10) / 10,
        width: Math.round(r.width * 10) / 10,
        height: Math.round(r.height * 10) / 10,
      });
    }

    const overlaps = [];
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 1 && oy > 1) {
          overlaps.push({
            a: a.name,
            b: b.name,
            overlapW: Math.round(ox * 10) / 10,
            overlapH: Math.round(oy * 10) / 10,
            areaPx: Math.round(ox * oy),
          });
        }
      }
    }

    const viewportArea = vw * vh;
    const spreadPct = sr ? Math.round(((sr.width * sr.height) / viewportArea) * 10000) / 100 : 0;
    const canvasPct = cr ? Math.round(((cr.width * cr.height) / viewportArea) * 10000) / 100 : 0;

    return {
      viewport: { width: vw, height: vh },
      spreadPct,
      canvasPct,
      spreadRect: sr
        ? {
            left: Math.round(sr.left),
            top: Math.round(sr.top),
            width: Math.round(sr.width),
            height: Math.round(sr.height),
          }
        : null,
      boxes,
      overlaps,
    };
  }, namedSelectors);
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const distIndex = join(DIST_DIR, 'index.html');
  if (!existsSync(distIndex)) {
    throw new Error(`dist/index.html not found at ${distIndex}. Run "npm run build" first.`);
  }

  const indexHtml = readFileSync(distIndex, 'utf8');
  const hasAbsoluteAssetUrl = /["']\/(?:assets|manifest)/.test(indexHtml);

  const report = {
    timestamp: new Date().toISOString(),
    outDir: OUT_DIR,
    browserChannel: null,
    url: null,
    bootMs: null,
    rebootMs: null,
    distRelativeAssetCheck: !hasAbsoluteAssetUrl,
    manifestHttp200: false,
    hubAudit: {
      roleTabCount: -1,
      stationCount: 0,
      voyageVisible: false,
      paintboxDrawerOpened: false,
      wardrobeDrawerOpened: false,
      hubOverlaps: [],
    },
    prologueAudit: {
      wispActive: false,
      wispMode: null,
      ghostStrokeT: 0,
      prologueMist: 0,
      dissolvedOnFirstStroke: false,
    },
    activeColoringAudit: {
      litStarsMidPage: 0,
      totalStars: 0,
      gemsMidPage: 0,
      wonderWhisperEffect: null,
      wonderWhisperRegionId: 0,
      spreadViewportPct: 0,
      canvasViewportPct: 0,
      hudOverlaps: [],
      hudBoxes: [],
    },
    wandAudit: {
      wandActive: false,
      toolTagVisible: false,
      toolTagText: '',
      toolTagWordCount: 0,
      pokeInviteCount: 0,
    },
    completedDogEarAudit: {
      litStarsCompleted: 0,
      totalStarsCompleted: 0,
      hasLegacyNextOrEarlyText: true,
      dogEarNextVisible: false,
      dogEarEarlyHidden: false,
      completedHudOverlaps: [],
    },
    astralTinAudit: {
      tinVisible: false,
      lidVisible: false,
      hingesVisible: false,
      deckleCardCount: 0,
    },
    ch1RegionsPainted: 0,
    effects: [],
    events: [],
    gemsAfterCh1: 0,
    telemetry: null,
    maxFrameGapMs: null,
    vaultHealing: {
      preWipeGems: 0,
      postWipeGems: 0,
      source: null,
      healed: [],
      cookieRegenerated: false,
    },
    serviceWorker: {
      registered: false,
      scopes: [],
      matchesSubpath: false,
    },
    bookshelf: {
      reachedFinale: false,
      openedSavedBook: false,
      keepsakeTriggered: false,
    },
    screenshots: [],
    consoleErrors: [],
    pageErrors: [],
    networkErrors: [],
    assertions: {},
    passed: false,
    fatalError: null,
  };

  let server = null;
  let browser = null;

  try {
    const started = await startSubpathServer(DIST_DIR);
    server = started.server;
    const baseUrl = `http://127.0.0.1:${started.port}${MOUNT_PREFIX}`;
    const qaUrl = `${baseUrl}?qa=1`;
    report.url = qaUrl;

    // Verify manifest.json is served with HTTP 200 under /chroma-cosmos/.
    const manifestRes = await fetch(`${baseUrl}manifest.json`);
    report.manifestHttp200 = manifestRes.status === 200;

    const launched = await launchBrowser();
    browser = launched.browser;
    report.browserChannel = launched.channel;

    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      acceptDownloads: true,
    });
    const attachErrorListeners = (targetPage) => {
      targetPage.on('console', (msg) => {
        if (msg.type() === 'error') {
          report.consoleErrors.push(msg.text());
        }
      });
      targetPage.on('pageerror', (err) => {
        report.pageErrors.push(err.stack || err.message || String(err));
      });
      targetPage.on('response', (res) => {
        if (res.status() >= 400) {
          report.networkErrors.push(`${res.status()} ${res.url()}`);
        }
      });
    };

    let page = await context.newPage();
    attachErrorListeners(page);

    const snap = async (filename) => {
      const target = join(OUT_DIR, filename);
      await page.screenshot({ path: target });
      report.screenshots.push(target);
      return target;
    };

    // =========================================================================
    // STATE 1: Cozy Stargazer Desk Hub + Paintbox & Sticker Wardrobe Drawers
    // =========================================================================
    const bootStartMs = Date.now();
    await page.goto(qaUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__chroma?.qa), undefined, { timeout: 60000, polling: 100 });
    await waitForMode(page, 'hub', 15000);
    report.bootMs = Date.now() - bootStartMs;
    await page.waitForTimeout(550);

    const hubCheck = await page.evaluate(() => {
      const roleTabs = document.querySelectorAll('[role="tab"], [role="tablist"], .cc-tab, .cc-tabs').length;
      const stationIds = ['paintbox', 'wardrobe', 'bookshelf', 'trinkets'];
      const visibleStations = stationIds.filter((id) => {
        const el = document.querySelector(`.cc-station[data-station="${id}"]`);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      const voyageEl = document.querySelector('.cc-voyage-seal.cc-play');
      const vr = voyageEl ? voyageEl.getBoundingClientRect() : null;
      return {
        roleTabs,
        stationCount: visibleStations.length,
        voyageVisible: Boolean(vr && vr.width > 0 && vr.height > 0),
      };
    });
    const hubGeom = await measureLayoutGeometry(page, [
      { name: 'crystalJar', selector: '.cc-crystal-jar' },
      { name: 'bookmark', selector: '.cc-bookmark-ribbon' },
      { name: 'voyageRibbon', selector: '.cc-voyage-ribbon' },
      { name: 'station-paintbox', selector: '.cc-station[data-station="paintbox"]' },
      { name: 'station-wardrobe', selector: '.cc-station[data-station="wardrobe"]' },
      { name: 'station-bookshelf', selector: '.cc-station[data-station="bookshelf"]' },
      { name: 'station-trinkets', selector: '.cc-station[data-station="trinkets"]' },
    ]);
    report.hubAudit.roleTabCount = hubCheck.roleTabs;
    report.hubAudit.stationCount = hubCheck.stationCount;
    report.hubAudit.voyageVisible = hubCheck.voyageVisible;
    report.hubAudit.hubOverlaps = hubGeom.overlaps;

    await snap('01-desk-hub.png');

    // Open Hinged Wooden Paintbox close-up drawer -> 01b-hub-paintbox.png
    await page.locator('.cc-station[data-station="paintbox"]').click();
    await page.locator('.cc-drawer-paintbox').waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(420);
    report.hubAudit.paintboxDrawerOpened = await page.locator('.cc-drawer-paintbox').isVisible();
    await snap('01b-hub-paintbox.png');
    await page.locator('.cc-drawer-paintbox .cc-drawer-close').click();
    await page.locator('.cc-drawer-paintbox').waitFor({ state: 'hidden', timeout: 8000 });
    await page.waitForTimeout(180);

    // Open Paper-Doll Sticker Wardrobe Card drawer -> 01c-hub-wardrobe.png
    await page.locator('.cc-station[data-station="wardrobe"]').click();
    await page.locator('.cc-drawer-wardrobe').waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(420);
    report.hubAudit.wardrobeDrawerOpened = await page.locator('.cc-drawer-wardrobe').isVisible();
    await snap('01c-hub-wardrobe.png');
    await page.locator('.cc-drawer-wardrobe .cc-drawer-close').click();
    await page.locator('.cc-drawer-wardrobe').waitFor({ state: 'hidden', timeout: 8000 });
    await page.waitForTimeout(200);

    // =========================================================================
    // STATE 2: Chapter 1 Sleepy-Hush Prologue + Starlight Wisp Ghost-Stroke
    // =========================================================================
    await page.evaluate(() => window.__chroma.qa.startRun(4242));
    await waitForMode(page, 'chapter', 15000);

    // Wait ~3.4s+ until Wisp enters 'prologueStroke' with visible rainbow ghost-stroke trail
    await page.waitForFunction(
      () => {
        const w = window.__chroma?.qa?.wisp();
        return Boolean(w && w.active && w.mode === 'prologueStroke' && w.ghostStrokeT >= 0.25);
      },
      undefined,
      { timeout: 10000 },
    );
    await page.waitForTimeout(120);

    const wispDuringPrologue = await page.evaluate(() => window.__chroma.qa.wisp());
    report.prologueAudit.wispActive = Boolean(wispDuringPrologue?.active);
    report.prologueAudit.wispMode = wispDuringPrologue?.mode ?? null;
    report.prologueAudit.ghostStrokeT = Math.round((wispDuringPrologue?.ghostStrokeT ?? 0) * 1000) / 1000;
    report.prologueAudit.prologueMist = Math.round((wispDuringPrologue?.prologueMist ?? 0) * 1000) / 1000;

    await snap('02-ch1-prologue-wisp.png');

    // Make first stroke on target region -> assert prologue dissolves cleanly
    const dissolved = await page.evaluate(async () => {
      const qa = window.__chroma.qa;
      const wBefore = qa.wisp();
      const targetId = wBefore?.targetRegionId || 5;
      await qa.paintRegion(targetId, 7);
      await new Promise((r) => setTimeout(r, 260));
      const wAfter = qa.wisp();
      const rootPrologueAttr = document.querySelector('.cc-root')?.getAttribute('data-prologue');
      return {
        wispActiveAfter: Boolean(wAfter?.active),
        wispModeAfter: wAfter?.mode ?? null,
        rootPrologueAttr,
      };
    });
    report.prologueAudit.dissolvedOnFirstStroke =
      !dissolved.wispActiveAfter &&
      dissolved.wispModeAfter === 'hidden' &&
      dissolved.rootPrologueAttr === 'false';

    // =========================================================================
    // STATE 3: Active Coloring (Enchanted Pencil + Wonder Whispers) & Starlight Wand
    // =========================================================================
    // Paint Violet (1..4) and Lumi (5..8) to light 2 Bookmark Story Stars & earn Prism Stardust Crystals
    const midPaint = await page.evaluate(async () => {
      const qa = window.__chroma.qa;
      const regs = qa.regions();
      const byId = new Map(regs.map((r) => [r.id, r]));
      let painted = 0;

      const violetAndLumi = [
        [1, 7], // violet_skin -> CottonCandyChalk
        [2, 4], // violet_sandy_hair -> SolarCheetahAmber
        [3, 1], // violet_suit -> LiquidAurora
        [4, 2], // violet_helmet -> HoloFoil
        [5, 7], // lumi_body -> CottonCandyChalk
        [6, 6], // lumi_mane -> RainbowPrismWax
        [7, 2], // lumi_horn -> HoloFoil
        [8, 1], // lumi_tail -> LiquidAurora
      ];
      for (const [id, mat] of violetAndLumi) {
        if (byId.has(id)) {
          const ok = await qa.paintRegion(id, mat);
          if (ok) painted++;
        }
      }
      await new Promise((r) => setTimeout(r, 300));
      const cloud = regs.find((r) => r.kind === 'cloud' && !r.coverageExcluded && r.percent < 1);
      return {
        painted,
        cloudId: cloud?.id ?? null,
        cloudClientPt: cloud ? qa.clientPointOf(cloud.id) : null,
        stars: qa.storyStars(),
        gems: window.__chroma.stats().gems,
      };
    });

    // Wait for Bookmark Story Star threads & toasts to clear cleanly, then select Rainbow Prism Wax (mat 6)
    await page.waitForTimeout(2800);
    await page.locator('.cc-swatch[data-material="6"]').click();
    await page.waitForTimeout(150);

    // Hover an uncolored Space-Cloud with Rainbow Prism Wax selected -> Pencil shimmer + Wonder Whispers dotted sketch
    if (midPaint.cloudClientPt) {
      await page.mouse.move(midPaint.cloudClientPt.x, midPaint.cloudClientPt.y);
    }
    const wonderState = await page.evaluate((cloudId) => {
      if (cloudId !== null) {
        window.__chroma.qa.hoverRegion(cloudId);
      }
      return {
        whisper: window.__chroma.qa.wonderWhisper(),
        stars: window.__chroma.qa.storyStars(),
        gems: window.__chroma.stats().gems,
      };
    }, midPaint.cloudId);
    await page.waitForTimeout(260);

    const activeGeom = await measureLayoutGeometry(page, [
      { name: 'crystalJar', selector: '.cc-crystal-jar' },
      { name: 'bookmark', selector: '.cc-bookmark-ribbon' },
      { name: 'cornerRight', selector: '.cc-corner-right' },
      { name: 'dogEarEarly', selector: '.cc-dogear-early' },
      { name: 'woodGroove', selector: '.cc-wood-groove' },
    ]);

    const litMidStars = wonderState.stars.filter((s) => s.lit).length;
    report.activeColoringAudit.litStarsMidPage = litMidStars;
    report.activeColoringAudit.totalStars = wonderState.stars.length;
    report.activeColoringAudit.gemsMidPage = wonderState.gems;
    report.activeColoringAudit.wonderWhisperEffect = wonderState.whisper?.effect ?? null;
    report.activeColoringAudit.wonderWhisperRegionId = wonderState.whisper?.regionId ?? 0;
    report.activeColoringAudit.spreadViewportPct = activeGeom.spreadPct;
    report.activeColoringAudit.canvasViewportPct = activeGeom.canvasPct;
    report.activeColoringAudit.hudOverlaps = activeGeom.overlaps;
    report.activeColoringAudit.hudBoxes = activeGeom.boxes;

    await snap('03-active-coloring-pencil.png');

    // State 3b: Switch to Starlight Wand -> assert active, <=4-word micro-tag, sky doodle & poke rings
    await page.locator('.cc-tool-wand[data-tool="wand"]').click();
    await page.waitForTimeout(160);

    // Gentle sky doodle + hover over open starry sky between clouds so Wand spotlight glow & sky sparkles shine
    const skyBox = await page.evaluate(() => {
      const host = document.querySelector('.cc-canvas-host');
      const r = host ? host.getBoundingClientRect() : null;
      return r ? { x: r.left + r.width * 0.36, y: r.top + r.height * 0.16 } : null;
    });
    if (skyBox) {
      await page.mouse.move(skyBox.x, skyBox.y);
      await page.mouse.down();
      await page.mouse.move(skyBox.x + 36, skyBox.y - 12, { steps: 6 });
      await page.mouse.move(skyBox.x + 70, skyBox.y + 8, { steps: 6 });
      await page.mouse.up();
      await page.mouse.move(skyBox.x + 48, skyBox.y - 2);
    }
    await page.waitForTimeout(140);

    const wandCheck = await page.evaluate(() => {
      const wandBtn = document.querySelector('.cc-tool-wand[data-tool="wand"]');
      const tag = document.querySelector('.cc-tool-tag');
      const tagText = document.querySelector('.cc-tool-tag-text')?.textContent?.trim() ?? '';
      const words = tagText ? tagText.split(/\s+/).filter(Boolean).length : 0;
      return {
        wandActive: Boolean(wandBtn?.classList.contains('is-on') && wandBtn?.getAttribute('aria-pressed') === 'true'),
        toolTagVisible: Boolean(tag && !tag.hasAttribute('hidden')),
        toolTagText: tagText,
        toolTagWordCount: words,
        pokeInviteCount: window.__chroma.qa.pokeInvites().length,
      };
    });
    report.wandAudit = wandCheck;

    await snap('03b-active-wand.png');

    // =========================================================================
    // STATE 5 (captured BEFORE opening tin): Completed Chapter 1 + Glowing Dog-Ear
    // =========================================================================
    await page.locator('.cc-tool-pencil[data-tool="pencil"]').click();
    await page.waitForTimeout(120);

    const ch1Finish = await page.evaluate(async () => {
      const qa = window.__chroma.qa;
      const regs = qa.regions();
      const byId = new Map(regs.map((r) => [r.id, r]));
      let painted = 0;

      // Finish Nova (9..11), Cloud with RainbowPrismWax (6), Planet/Rings with SolarCheetahAmber (4)
      const restPlan = [
        [9, 4],  // nova_body -> SolarCheetahAmber
        [10, 5], // nova_spots -> SupernovaGlitter
        [11, 4], // nova_tail -> SolarCheetahAmber
      ];
      for (const [id, mat] of restPlan) {
        if (byId.has(id)) {
          const ok = await qa.paintRegion(id, mat);
          if (ok) painted++;
        }
      }

      const cloud = regs.find((r) => r.kind === 'cloud' && !r.coverageExcluded && r.percent < 1);
      if (cloud) {
        const ok = await qa.paintRegion(cloud.id, 6);
        if (ok) painted++;
      }

      const planetOrRing = regs.find(
        (r) => (r.kind === 'planet' || r.kind === 'rings') && !r.coverageExcluded && r.percent < 1,
      );
      if (planetOrRing) {
        const ok = await qa.paintRegion(planetOrRing.id, 4);
        if (ok) painted++;
      }

      await new Promise((r) => setTimeout(r, 150));
      const pokedLumi = await qa.poke('lumi');
      const pokedNova = await qa.poke('nova');

      await qa.completePage();
      return { painted, pokedLumi, pokedNova };
    });

    await page.locator('.cc-dogear-next[data-action="turn-next"]').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(900);

    const completedCheck = await page.evaluate(() => {
      const appText = document.getElementById('app')?.innerText ?? '';
      const hasLegacyText = /Next Page|Turn early/i.test(appText);
      const stars = window.__chroma.qa.storyStars();
      const litDom = document.querySelectorAll('.cc-story-socket.is-lit').length;
      const dogEarNext = document.querySelector('.cc-dogear-next[data-action="turn-next"]');
      const dogEarEarly = document.querySelector('.cc-dogear-early[data-action="turn-early"]');
      return {
        litStars: stars.filter((s) => s.lit).length,
        litDom,
        totalStars: stars.length,
        hasLegacyText,
        dogEarNextVisible: Boolean(dogEarNext && !dogEarNext.hasAttribute('hidden')),
        dogEarEarlyHidden: Boolean(dogEarEarly && dogEarEarly.hasAttribute('hidden')),
      };
    });
    const completedGeom = await measureLayoutGeometry(page, [
      { name: 'crystalJar', selector: '.cc-crystal-jar' },
      { name: 'bookmark', selector: '.cc-bookmark-ribbon' },
      { name: 'cornerRight', selector: '.cc-corner-right' },
      { name: 'dogEarNext', selector: '.cc-dogear-next' },
      { name: 'woodGroove', selector: '.cc-wood-groove' },
    ]);

    report.completedDogEarAudit.litStarsCompleted = completedCheck.litStars;
    report.completedDogEarAudit.totalStarsCompleted = completedCheck.totalStars;
    report.completedDogEarAudit.hasLegacyNextOrEarlyText = completedCheck.hasLegacyText;
    report.completedDogEarAudit.dogEarNextVisible = completedCheck.dogEarNextVisible;
    report.completedDogEarAudit.dogEarEarlyHidden = completedCheck.dogEarEarlyHidden;
    report.completedDogEarAudit.completedHudOverlaps = completedGeom.overlaps;

    await snap('05-completed-dogear.png');

    const postCh1Stats = await page.evaluate(() => window.__chroma.stats());
    report.ch1RegionsPainted = midPaint.painted + ch1Finish.painted;
    report.effects = postCh1Stats.effects;
    report.events = postCh1Stats.events;
    report.gemsAfterCh1 = postCh1Stats.gems;

    // =========================================================================
    // STATE 4: Tap glowing bottom-right curled dog-ear -> Hinged Astral Pencil Tin
    // =========================================================================
    await page.locator('.cc-dogear-next[data-action="turn-next"]').click();
    await waitForMode(page, 'draft', 10000);
    await page.locator('.cc-draft .cc-card').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(550);

    report.astralTinAudit = await page.evaluate(() => ({
      tinVisible: Boolean(document.querySelector('.cc-draft .cc-pencil-tin')),
      lidVisible: Boolean(document.querySelector('.cc-draft .cc-tin-lid-top')),
      hingesVisible: Boolean(document.querySelector('.cc-draft .cc-tin-hinges')),
      deckleCardCount: document.querySelectorAll('.cc-draft .cc-card.cc-deckle-card').length,
    }));

    await snap('04-astral-pencil-tin.png');

    // Pick first holographic card -> Star-Doors -> Chapter 2
    await page.locator('.cc-draft .cc-card').first().click();
    await waitForMode(page, 'doors', 10000);
    await page.locator('.cc-doors .cc-door').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(450);
    await snap('05b-star-doors.png');

    await page.locator('.cc-doors .cc-door').first().click();
    await waitForMode(page, 'chapter', 15000);
    await page.waitForTimeout(400);

    // =========================================================================
    // 60FPS GPU Telemetry Crucible (5-second active paint + particle stress)
    // =========================================================================
    const perfResult = await page.evaluate(async () => {
      const qa = window.__chroma.qa;
      const regs = qa.regions().filter((r) => !r.coverageExcluded && !r.ghost && r.percent < 1);
      window.__chroma.resetTelemetry();

      let maxGapMs = 0;
      let prevRaf = 0;
      let observing = true;
      const trackRaf = (now) => {
        if (!observing) return;
        if (prevRaf > 0) {
          const gap = now - prevRaf;
          if (gap > maxGapMs) maxGapMs = gap;
        }
        prevRaf = now;
        requestAnimationFrame(trackRaf);
      };
      requestAnimationFrame(trackRaf);

      const startWall = performance.now();
      let idx = 0;
      while (performance.now() - startWall < 5100) {
        if (idx < regs.length) {
          const reg = regs[idx];
          const mat = (idx % 7) + 1;
          await qa.paintRegion(reg.id, mat);
          idx++;
        } else {
          await qa.poke(idx % 2 === 0 ? 'lumi' : 'nova');
          idx++;
          await new Promise((r) => setTimeout(r, 80));
        }
      }
      observing = false;
      return {
        telemetry: window.__chroma.telemetry(),
        maxGapMs: Math.round(maxGapMs * 100) / 100,
      };
    });

    report.telemetry = perfResult.telemetry;
    report.maxFrameGapMs = perfResult.maxGapMs;

    // =========================================================================
    // Bidirectional krunked-cookie-vault-v1 Self-Healing Test
    // =========================================================================
    await page.waitForTimeout(450);
    const preWipeGems = await page.evaluate(() => window.__chroma.stats().gems);
    report.vaultHealing.preWipeGems = preWipeGems;

    // Verify live onversionchange non-blocking deleteDatabase while app is open
    await page.evaluate(async () => {
      await new Promise((resolvePromise, rejectPromise) => {
        const timer = setTimeout(() => rejectPromise(new Error('IDB deleteDatabase hung')), 5000);
        const req = indexedDB.deleteDatabase('chroma-cosmos-db');
        req.onsuccess = () => {
          clearTimeout(timer);
          resolvePromise();
        };
        req.onerror = () => {
          clearTimeout(timer);
          rejectPromise(req.error || new Error('IDB deleteDatabase error'));
        };
        req.onblocked = () => {
          clearTimeout(timer);
          rejectPromise(new Error('IDB deleteDatabase blocked'));
        };
      });
    });

    await page.close();
    const evictPage = await context.newPage();
    await evictPage.goto(`${baseUrl}manifest.json`, { waitUntil: 'load', timeout: 15000 });
    await evictPage.evaluate(async () => {
      localStorage.clear();
      await new Promise((resolvePromise, rejectPromise) => {
        const timer = setTimeout(() => rejectPromise(new Error('IDB deleteDatabase hung')), 5000);
        const req = indexedDB.deleteDatabase('chroma-cosmos-db');
        req.onsuccess = () => {
          clearTimeout(timer);
          resolvePromise();
        };
        req.onerror = () => {
          clearTimeout(timer);
          rejectPromise(req.error || new Error('IDB deleteDatabase error'));
        };
        req.onblocked = () => {
          clearTimeout(timer);
          rejectPromise(new Error('IDB deleteDatabase blocked'));
        };
      });
    });
    await evictPage.close();

    page = await context.newPage();
    attachErrorListeners(page);
    const rebootStartMs = Date.now();
    await page.goto(qaUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__chroma?.qa), undefined, { timeout: 60000, polling: 100 });
    await waitForMode(page, 'hub', 15000);
    report.rebootMs = Date.now() - rebootStartMs;
    await page.waitForTimeout(350);

    const postWipeStats = await page.evaluate(() => window.__chroma.stats());
    report.vaultHealing.postWipeGems = postWipeStats.gems;
    report.vaultHealing.source = postWipeStats.vaultReport?.source ?? null;
    report.vaultHealing.healed = postWipeStats.vaultReport?.healed ?? [];

    // Clear shadow cookie -> trigger focus -> assert cookie regenerated
    const cookieRegen = await page.evaluate(() => {
      document.cookie = 'krunked-cookie-vault-v1=; max-age=0; path=/';
      const cleared = !document.cookie.includes('krunked-cookie-vault-v1=');
      window.dispatchEvent(new Event('focus'));
      const afterFocus = document.cookie.includes('krunked-cookie-vault-v1=');
      return { cleared, afterFocus };
    });
    report.vaultHealing.cookieRegenerated = cookieRegen.cleared && cookieRegen.afterFocus;

    // =========================================================================
    // Service Worker Subpath Scope Verification (/chroma-cosmos/)
    // =========================================================================
    const swInfo = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { registered: false, scopes: [], matchesSubpath: false };
      await Promise.race([
        navigator.serviceWorker.ready.catch(() => null),
        new Promise((r) => setTimeout(r, 4000)),
      ]);
      const regs = await navigator.serviceWorker.getRegistrations();
      const scopes = regs.map((r) => r.scope);
      return {
        registered: regs.length > 0,
        scopes,
        matchesSubpath: scopes.some((s) => s.endsWith('/chroma-cosmos/')),
      };
    });
    report.serviceWorker = swInfo;

    // =========================================================================
    // Full 5-Chapter Voyage -> Saved Storybook on Bookshelf -> Keepsake PNG
    // =========================================================================
    try {
      const continueBtn = page.locator('.cc-voyage-seal.cc-continue');
      if (await continueBtn.isVisible()) {
        await continueBtn.click();
      } else {
        await page.evaluate(() => window.__chroma.qa.startRun(4242));
      }
      await waitForMode(page, 'chapter', 10000);

      const waitModeLeave = (prevMode) =>
        page.waitForFunction((m) => window.__chroma?.qa?.mode() !== m, prevMode, { timeout: 12000 });

      for (let step = 0; step < 30; step++) {
        const mode = await page.evaluate(() => window.__chroma.qa.mode());
        if (mode === 'finale') {
          report.bookshelf.reachedFinale = true;
          break;
        }
        if (mode === 'turning') {
          await waitModeLeave('turning');
          continue;
        }
        if (mode === 'chapter') {
          const nextDogEar = page.locator('.cc-dogear-next[data-action="turn-next"]');
          const earlyDogEar = page.locator('.cc-dogear-early[data-action="turn-early"]');
          if (await nextDogEar.isVisible()) {
            await nextDogEar.click();
          } else {
            await earlyDogEar.waitFor({ state: 'visible', timeout: 8000 });
            await earlyDogEar.click();
          }
          await waitModeLeave('chapter');
        } else if (mode === 'draft') {
          const card = page.locator('.cc-draft .cc-card:not([disabled])').first();
          await card.waitFor({ state: 'visible', timeout: 8000 });
          await card.click();
          await waitModeLeave('draft');
        } else if (mode === 'doors') {
          const door = page.locator('.cc-doors .cc-door:not([disabled])').first();
          await door.waitFor({ state: 'visible', timeout: 8000 });
          await door.click();
          await waitModeLeave('doors');
        }
      }

      if (report.bookshelf.reachedFinale) {
        await page.locator('.cc-finale').waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForTimeout(350);
        await page.locator('.cc-finale').click();
        await waitForMode(page, 'hub', 10000);
        await page.waitForTimeout(380);

        // Open Heirloom Wooden Bookshelf station (NO legacy .cc-tab!)
        await page.locator('.cc-station[data-station="bookshelf"]').click();
        await page.locator('.cc-drawer-bookshelf').waitFor({ state: 'visible', timeout: 10000 });
        await page.locator('.cc-book-spine.cc-cover').first().waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForTimeout(350);
        await page.locator('.cc-book-spine.cc-cover').first().click();
        await waitForMode(page, 'book', 10000);
        await page.waitForTimeout(450);
        report.bookshelf.openedSavedBook = true;

        await snap('06-bookshelf.png');

        // Trigger Save Keepsake PNG and ensure zero console/page errors
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await page.locator('.cc-keepsake').click();
        await downloadPromise;
        await page.waitForTimeout(300);
        report.bookshelf.keepsakeTriggered = true;
      }
    } catch (bonusErr) {
      report.bookshelf.error = String(bonusErr);
    }

    // Evaluate all red-team & E2E assertions
    report.assertions = {
      distRelativeAssetCheck: report.distRelativeAssetCheck === true,
      manifestHttp200: report.manifestHttp200 === true,
      coldBootUnder10s: (report.bootMs ?? 99999) <= 10000,
      zeroConsoleErrors: report.consoleErrors.length === 0,
      zeroPageErrors: report.pageErrors.length === 0,
      zeroNetworkErrors: report.networkErrors.length === 0,
      hubZeroRoleTabs: report.hubAudit.roleTabCount === 0,
      hubFourCraftStations: report.hubAudit.stationCount === 4 && report.hubAudit.voyageVisible,
      hubDrawersOpened: report.hubAudit.paintboxDrawerOpened && report.hubAudit.wardrobeDrawerOpened,
      hubZeroOverlap: report.hubAudit.hubOverlaps.length === 0,
      prologueWispActive:
        report.prologueAudit.wispActive &&
        (report.prologueAudit.wispMode === 'prologueStroke' || report.prologueAudit.wispMode === 'prologueTapPencil'),
      prologueDissolvedOnFirstStroke: report.prologueAudit.dissolvedOnFirstStroke === true,
      midPageTwoStoryStarsAndGems:
        report.activeColoringAudit.litStarsMidPage >= 2 && report.activeColoringAudit.gemsMidPage > 0,
      wonderWhisperRainbowSlide: report.activeColoringAudit.wonderWhisperEffect === 'rainbowSlide',
      spreadBreathingRoomGe78Pct: report.activeColoringAudit.spreadViewportPct >= 78,
      activeHudZeroOverlap: report.activeColoringAudit.hudOverlaps.length === 0,
      wandActiveWithMicroTagAndInvites:
        report.wandAudit.wandActive &&
        report.wandAudit.toolTagVisible &&
        report.wandAudit.toolTagWordCount > 0 &&
        report.wandAudit.toolTagWordCount <= 4 &&
        report.wandAudit.pokeInviteCount > 0,
      completedFiveStoryStarsAndDogEar:
        report.completedDogEarAudit.litStarsCompleted === 5 &&
        !report.completedDogEarAudit.hasLegacyNextOrEarlyText &&
        report.completedDogEarAudit.dogEarNextVisible &&
        report.completedDogEarAudit.dogEarEarlyHidden &&
        report.completedDogEarAudit.completedHudOverlaps.length === 0,
      astralPencilTinThreeCards:
        report.astralTinAudit.tinVisible &&
        report.astralTinAudit.lidVisible &&
        report.astralTinAudit.hingesVisible &&
        report.astralTinAudit.deckleCardCount === 3,
      rainbowSlideTriggered: report.effects.includes('rainbowSlide'),
      cheetahRacetrackTriggered: report.effects.includes('cheetahRacetrack'),
      autoBloomTriggered: report.events.includes('autoBloom'),
      pokeTriggered: report.events.includes('poke'),
      gemsEarned: report.gemsAfterCh1 > 0,
      telemetrySamplesOk: (report.telemetry?.samples ?? 0) >= 120,
      telemetryMedianOk: (report.telemetry?.frameMsMedian ?? 999) <= 16.7,
      noCatastrophicStall: (report.maxFrameGapMs ?? 999) <= 150,
      vaultRestoredFromCookie:
        report.vaultHealing.preWipeGems > 0 &&
        report.vaultHealing.postWipeGems === report.vaultHealing.preWipeGems &&
        report.vaultHealing.source === 'cookie',
      vaultCookieRegenerated: report.vaultHealing.cookieRegenerated === true,
      serviceWorkerScopedSubpath: report.serviceWorker.matchesSubpath === true,
      bookshelfCompleted: report.bookshelf.openedSavedBook === true && report.bookshelf.keepsakeTriggered === true,
    };

    report.passed = Object.values(report.assertions).every(Boolean);
  } catch (err) {
    report.fatalError = err?.stack || String(err);
    report.passed = false;
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
    if (server) {
      await new Promise((r) => server.close(() => r())).catch(() => undefined);
    }
    const reportPath = join(OUT_DIR, 'report.json');
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`E2E report written to ${reportPath}`);
    console.log(
      JSON.stringify(
        {
          passed: report.passed,
          bootMs: report.bootMs,
          rebootMs: report.rebootMs,
          assertions: report.assertions,
          spreadViewportPct: report.activeColoringAudit.spreadViewportPct,
          hudOverlaps: report.activeColoringAudit.hudOverlaps,
          completedHudOverlaps: report.completedDogEarAudit.completedHudOverlaps,
          hubOverlaps: report.hubAudit.hubOverlaps,
          telemetry: report.telemetry,
          maxFrameGapMs: report.maxFrameGapMs,
          consoleErrors: report.consoleErrors,
          pageErrors: report.pageErrors,
          networkErrors: report.networkErrors,
        },
        null,
        2,
      ),
    );
  }

  if (!report.passed) {
    process.exitCode = 1;
  }
}

void main();
