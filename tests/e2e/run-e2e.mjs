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

/** Audit live DOM for Anti-Lunch-Tray invariants: zero inline SVG, zero brown trays, zero dashed borders. */
async function auditAntiLunchTrayDom(page) {
  return page.evaluate(() => {
    const root = document.getElementById('app');
    if (!root) return { svgCount: -1, brownHits: [], dashedHits: [], legacyText: false };
    const svgCount = root.querySelectorAll('svg').length;
    const appText = root.innerText ?? '';
    const legacyText = /Next Page|Turn early/i.test(appText);

    const forbiddenRgb = new Set([
      'rgb(139, 90, 43)',   // #8b5a2b
      'rgb(107, 68, 35)',   // #6b4423
      'rgb(160, 82, 45)',   // #a0522d
      'rgb(210, 180, 140)', // #d2b48c
    ]);
    const brownHits = [];
    const dashedHits = [];

    for (const el of root.querySelectorAll('*')) {
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      if (forbiddenRgb.has(s.backgroundColor) || forbiddenRgb.has(s.borderColor)) {
        brownHits.push(`${el.tagName}.${el.className}`);
      }
      if (
        s.borderTopStyle === 'dashed' ||
        s.borderRightStyle === 'dashed' ||
        s.borderBottomStyle === 'dashed' ||
        s.borderLeftStyle === 'dashed'
      ) {
        dashedHits.push(`${el.tagName}.${el.className}`);
      }
    }

    return { svgCount, brownHits, dashedHits, legacyText };
  });
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
    spreadAudit: {
      spreadViewportPct: 0,
      canvasViewportPct: 0,
      voyageNodeCount: 0,
      medallionCount: 0,
      lanternVisible: false,
      dockPixelIconCount: 0,
      clippedMedallionLabels: [],
      hudOverlaps: [],
      hudBoxes: [],
      antiLunchTray: null,
    },
    hintAudit: {
      lanternActive: false,
      lanternDimAmount: 0,
      lanternSource: null,
      lanternQuestId: null,
      wispMode: null,
      wispGhostLen: 0,
      medallionRoutedQuestId: null,
      medallionActive: false,
      medallionDimAmount: 0,
    },
    finaleAudit: {
      ribbonVisible: false,
      finaleActive: false,
      finaleDurationMs: 0,
      completedQuests: 0,
      totalQuests: 0,
      autoTurnedToDraft: false,
      autoTurnElapsedMs: 0,
      finaleHudOverlaps: [],
      hasLegacyNextOrEarlyText: true,
    },
    draftAndDoorsAudit: {
      tinVisible: false,
      lidVisible: false,
      hingesVisible: false,
      cardCount: 0,
      cardPixCount: 0,
      pickedCardId: null,
      doorCount: 0,
      doorPixCount: 0,
    },
    midColoringRelicAudit: {
      chapterSlot: 0,
      relicStripVisible: false,
      charmCount: 0,
      litMedallionCount: 0,
      partialRingCount: 0,
      partialRingMaxProg: 0,
      clippedMedallionLabels: [],
      chapter2HudOverlaps: [],
      stayAndDoodleChecked: false,
    },
    hubAudit: {
      roleTabCount: -1,
      stationCount: 0,
      voyageVisible: false,
      crystalPillNewGiftVisible: false,
      stationNewGiftVisible: false,
      paintboxDrawerOpened: false,
      exoticMediumCardCount: 0,
      paintboxReadyBadgeCount: 0,
      wardrobeDrawerOpened: false,
      wardrobePortraitCount: 0,
      wardrobeItemCount: 0,
      wardrobeReadyBadgeCount: 0,
      hubOverlaps: [],
      antiLunchTray: null,
    },
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

    // Boot into Hub first to measure cold boot time
    const bootStartMs = Date.now();
    await page.goto(qaUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__chroma?.qa), undefined, { timeout: 60000, polling: 100 });
    await waitForMode(page, 'hub', 15000);
    report.bootMs = Date.now() - bootStartMs;
    await page.waitForTimeout(350);

    // =========================================================================
    // STATE 1: Redesigned Midnight-Cloisonne Coloring Spread (Chapter 1)
    // =========================================================================
    await page.evaluate(() => window.__chroma.qa.startRun(4242));
    await waitForMode(page, 'chapter', 15000);
    await page.waitForTimeout(300);

    // Dismiss Sleepy Hush prologue by tapping Enchanted Pencil so warm-ivory cotton paper & HUD shine cleanly,
    // then allow the brief 2.5s whisper tool tag to fade out before measuring & capturing State 1.
    await page.locator('.cc-tool-pencil[data-tool="pencil"]').click();
    await page.waitForTimeout(2800);

    const spreadCheck = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.cc-voyage-spine .cc-voyage-node').length;
      const medallions = document.querySelectorAll('.cc-quest-rail .cc-story-medallion').length;
      const lanternEl = document.querySelector('.cc-quest-rail .cc-hint-lantern');
      const lr = lanternEl ? lanternEl.getBoundingClientRect() : null;
      const dockPix = document.querySelectorAll('.cc-enamel-dock canvas.cc-pix').length;
      const clippedLabels = Array.from(document.querySelectorAll('.cc-quest-rail .cc-medallion-label'))
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent?.trim() ?? '');
      return {
        nodes,
        medallions,
        lanternVisible: Boolean(lr && lr.width >= 56 && lr.height >= 56),
        dockPix,
        clippedLabels,
      };
    });
    const spreadGeom = await measureLayoutGeometry(page, [
      { name: 'voyageSpine', selector: '.cc-voyage-pill' },
      { name: 'crystalJar', selector: '.cc-crystal-jar' },
      { name: 'cornerRight', selector: '.cc-corner-pill' },
      { name: 'questRail', selector: '.cc-quest-rail' },
      { name: 'enamelDock', selector: '.cc-enamel-bar' },
    ]);
    const spreadDomAudit = await auditAntiLunchTrayDom(page);

    report.spreadAudit = {
      spreadViewportPct: spreadGeom.spreadPct,
      canvasViewportPct: spreadGeom.canvasPct,
      voyageNodeCount: spreadCheck.nodes,
      medallionCount: spreadCheck.medallions,
      lanternVisible: spreadCheck.lanternVisible,
      dockPixelIconCount: spreadCheck.dockPix,
      clippedMedallionLabels: spreadCheck.clippedLabels,
      hudOverlaps: spreadGeom.overlaps,
      hudBoxes: spreadGeom.boxes,
      antiLunchTray: spreadDomAudit,
    };

    await snap('01-midnight-coloring-spread.png');

    // =========================================================================
    // STATE 2: Active Firefly Hint Lantern Spotlight + Tap-Medallion Routing
    // =========================================================================
    await page.locator('.cc-hint-lantern[data-action="request-hint"]').click();
    await page.waitForFunction(
      () => {
        const h = window.__chroma?.qa?.hintState();
        return Boolean(h && h.active && h.dimAmount > 0);
      },
      undefined,
      { timeout: 6000 },
    );
    // Let the golden spotlight halo, non-target dim, and Wisp ghost-stroke blossom mid-animation
    await page.waitForTimeout(420);

    const lanternHint = await page.evaluate(() => ({
      hint: window.__chroma.qa.hintState(),
      wisp: window.__chroma.qa.wisp(),
    }));
    report.hintAudit.lanternActive = Boolean(lanternHint.hint?.active);
    report.hintAudit.lanternDimAmount = Math.round((lanternHint.hint?.dimAmount ?? 0) * 1000) / 1000;
    report.hintAudit.lanternSource = lanternHint.hint?.source ?? null;
    report.hintAudit.lanternQuestId = lanternHint.hint?.questId ?? null;
    report.hintAudit.wispMode = lanternHint.wisp?.mode ?? null;
    report.hintAudit.wispGhostLen = lanternHint.wisp?.ghostPath?.length ?? 0;

    await snap('02-firefly-hint-spotlight.png');

    // Verify Tap-Medallion routing switches spotlight immediately to Lumi (zero cooldown)
    await page.locator('.cc-story-medallion[data-quest="lumi"]').click();
    await page.waitForTimeout(180);
    const medHint = await page.evaluate(() => window.__chroma.qa.hintState());
    report.hintAudit.medallionRoutedQuestId = medHint?.questId ?? null;
    report.hintAudit.medallionActive = Boolean(medHint?.active);
    report.hintAudit.medallionDimAmount = Math.round((medHint?.dimAmount ?? 0) * 1000) / 1000;

    // =========================================================================
    // STATE 4: Complete All Story Medallions -> Celebratory Auto-Page-Turn Finale
    //          AND verify automatic transition to 'draft' (~2.8s) WITHOUT clicking!
    // =========================================================================
    await page.evaluate(async () => {
      const qa = window.__chroma.qa;
      const regs = qa.regions();

      // Trigger Rainbow Slide (cloud + mat 6) and Cheetah Racetrack (planet + mat 4) for causality telemetry
      const cloud = regs.find((r) => r.kind === 'cloud' && !r.coverageExcluded && r.percent < 1);
      if (cloud) await qa.paintRegion(cloud.id, 6);
      const planet = regs.find((r) => (r.kind === 'planet' || r.kind === 'rings') && !r.coverageExcluded && r.percent < 1);
      if (planet) await qa.paintRegion(planet.id, 4);

      // Complete all Chapter 1 Hero Quests (rooftop: violet, lumi, nova, rocket)
      await qa.completePage();
      await qa.poke('lumi');
      await qa.poke('nova');
    });

    // Wait for celebratory bottom-right Auto-Page-Turn Finale ribbon to appear
    await page.locator('.cc-auto-turn-ribbon').waitFor({ state: 'visible', timeout: 10000 });
    const finaleStartWall = Date.now();
    await page.waitForTimeout(450);

    const finaleCheck = await page.evaluate(() => {
      const appText = document.getElementById('app')?.innerText ?? '';
      const quests = window.__chroma.qa.heroQuests();
      const finale = window.__chroma.qa.pageFinale();
      const ribbon = document.querySelector('.cc-auto-turn-ribbon');
      return {
        ribbonVisible: Boolean(ribbon && !ribbon.hasAttribute('hidden')),
        finaleActive: Boolean(finale?.active),
        finaleDurationMs: finale?.durationMs ?? 0,
        completedQuests: quests.filter((q) => q.completed).length,
        totalQuests: quests.length,
        hasLegacyText: /Next Page|Turn early/i.test(appText),
      };
    });
    const finaleGeom = await measureLayoutGeometry(page, [
      { name: 'voyageSpine', selector: '.cc-voyage-pill' },
      { name: 'crystalJar', selector: '.cc-crystal-jar' },
      { name: 'cornerRight', selector: '.cc-corner-pill' },
      { name: 'questRail', selector: '.cc-quest-rail' },
      { name: 'autoTurnRibbon', selector: '.cc-auto-turn-ribbon' },
      { name: 'enamelDock', selector: '.cc-enamel-bar' },
    ]);

    report.finaleAudit.ribbonVisible = finaleCheck.ribbonVisible;
    report.finaleAudit.finaleActive = finaleCheck.finaleActive;
    report.finaleAudit.finaleDurationMs = finaleCheck.finaleDurationMs;
    report.finaleAudit.completedQuests = finaleCheck.completedQuests;
    report.finaleAudit.totalQuests = finaleCheck.totalQuests;
    report.finaleAudit.hasLegacyNextOrEarlyText = finaleCheck.hasLegacyText;
    report.finaleAudit.finaleHudOverlaps = finaleGeom.overlaps;

    await snap('04-auto-page-turn-finale.png');

    const postCh1Stats = await page.evaluate(() => window.__chroma.stats());
    report.effects = postCh1Stats.effects;
    report.events = postCh1Stats.events;
    report.gemsAfterCh1 = postCh1Stats.gems;

    // DO NOT CLICK ANY TURN PAGE BUTTON! Wait for the 2.8s automatic transition into 'draft'!
    await waitForMode(page, 'draft', 7000);
    report.finaleAudit.autoTurnElapsedMs = Date.now() - finaleStartWall;
    report.finaleAudit.autoTurnedToDraft = (await page.evaluate(() => window.__chroma.qa.mode())) === 'draft';

    // =========================================================================
    // STATE 5: Expanded Astral Pencil Tin 3-Card Draft + Star-Door Picker
    // =========================================================================
    await page.locator('.cc-draft .cc-card').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(550);

    const draftCheck = await page.evaluate(() => ({
      tinVisible: Boolean(document.querySelector('.cc-draft .cc-pencil-tin')),
      lidVisible: Boolean(document.querySelector('.cc-draft .cc-tin-lid-top')),
      hingesVisible: Boolean(document.querySelector('.cc-draft .cc-tin-hinges')),
      cardCount: document.querySelectorAll('.cc-draft .cc-card.cc-deckle-card').length,
      cardPixCount: document.querySelectorAll('.cc-draft .cc-card canvas.cc-pix').length,
      firstCardId: document.querySelector('.cc-draft .cc-card')?.getAttribute('data-card') ?? null,
    }));
    report.draftAndDoorsAudit.tinVisible = draftCheck.tinVisible;
    report.draftAndDoorsAudit.lidVisible = draftCheck.lidVisible;
    report.draftAndDoorsAudit.hingesVisible = draftCheck.hingesVisible;
    report.draftAndDoorsAudit.cardCount = draftCheck.cardCount;
    report.draftAndDoorsAudit.cardPixCount = draftCheck.cardPixCount;
    report.draftAndDoorsAudit.pickedCardId = draftCheck.firstCardId;

    await snap('05-astral-tin-draft.png');

    // Pick first holographic card -> Star-Doors
    await page.locator('.cc-draft .cc-card').first().click();
    await waitForMode(page, 'doors', 10000);
    await page.locator('.cc-doors .cc-door').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(450);

    const doorsCheck = await page.evaluate(() => ({
      doorCount: document.querySelectorAll('.cc-doors .cc-door').length,
      doorPixCount: document.querySelectorAll('.cc-doors .cc-door canvas.cc-pix').length,
    }));
    report.draftAndDoorsAudit.doorCount = doorsCheck.doorCount;
    report.draftAndDoorsAudit.doorPixCount = doorsCheck.doorPixCount;

    await snap('05b-star-doors.png');

    // Enter Chapter 2 (now equipped with the drafted Magical Brush or Sticker Relic!)
    await page.locator('.cc-doors .cc-door').first().click();
    await waitForMode(page, 'chapter', 15000);
    await page.waitForTimeout(500);

    // =========================================================================
    // STATE 3: Mid-Coloring Live 360-deg Gold Radial Ring + Left-Margin Charm Strip (Chapter 2)
    // =========================================================================
    await page.evaluate(async () => {
      const qa = window.__chroma.qa;
      const quests = qa.heroQuests();
      // 1. Fully complete the first Story Medallion so one completed gold medallion shines
      if (quests[0]) {
        for (const rid of quests[0].regionIds) {
          await qa.paintRegion(rid, 1);
        }
      }
      // 2. Partially paint a multi-region Story Medallion (~40..72%) so the live 360-deg gold radial ring fills visibly!
      const multiQuest = quests.slice(1).find((q) => !q.completed && q.regionIds.length >= 2) ?? quests[1];
      if (multiQuest) {
        const regs = qa.regions();
        const areaOf = (id) => {
          const r = regs.find((x) => x.id === id);
          return r ? Math.max(1, (r.bbox.x1 - r.bbox.x0) * (r.bbox.y1 - r.bbox.y0)) : 1;
        };
        const totalArea = multiQuest.regionIds.reduce((s, id) => s + areaOf(id), 0);
        const sortedDesc = [...multiQuest.regionIds].sort((a, b) => areaOf(b) - areaOf(a));
        const palette = [6, 1, 4, 2, 7];
        let pIdx = 0;
        let estFrac = 0;
        for (const rid of sortedDesc) {
          const frac = areaOf(rid) / totalArea;
          if (estFrac + frac > 0.74 && estFrac >= 0.30) continue;
          if (estFrac + frac > 0.78) continue;
          await qa.paintRegion(rid, palette[pIdx++ % palette.length]);
          const qNow = qa.heroQuests().find((q) => q.questId === multiQuest.questId);
          estFrac = qNow ? qNow.progress : estFrac + frac;
          if (!qNow || qNow.completed || qNow.progress >= 0.45) break;
        }
      }
    });
    await page.waitForTimeout(1600);

    const ch2Check = await page.evaluate(() => {
      const strip = document.querySelector('.cc-relic-strip');
      const stripVisible = Boolean(strip && !strip.hasAttribute('hidden') && strip.getBoundingClientRect().width > 0);
      const charms = document.querySelectorAll('.cc-relic-strip .cc-charm-badge').length;
      const slot = Number(document.querySelector('.cc-voyage-spine')?.getAttribute('data-slot') ?? '0');
      const meds = Array.from(document.querySelectorAll('.cc-story-medallion'));
      const litCount = meds.filter((m) => m.classList.contains('is-lit')).length;
      const partials = meds
        .filter((m) => !m.classList.contains('is-lit'))
        .map((m) => parseFloat(m.style.getPropertyValue('--prog') || '0'))
        .filter((p) => p > 0.05 && p < 0.99);
      const clippedLabels = Array.from(document.querySelectorAll('.cc-quest-rail .cc-medallion-label'))
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent?.trim() ?? '');
      return {
        slot,
        stripVisible,
        charms,
        litCount,
        partialCount: partials.length,
        partialMax: partials.length > 0 ? Math.round(Math.max(...partials) * 1000) / 1000 : 0,
        clippedLabels,
      };
    });
    const ch2Geom = await measureLayoutGeometry(page, [
      { name: 'voyageSpine', selector: '.cc-voyage-pill' },
      { name: 'crystalJar', selector: '.cc-crystal-jar' },
      { name: 'cornerRight', selector: '.cc-corner-pill' },
      { name: 'relicStrip', selector: '.cc-relic-strip' },
      { name: 'questRail', selector: '.cc-quest-rail' },
      { name: 'enamelDock', selector: '.cc-enamel-bar' },
    ]);

    report.midColoringRelicAudit = {
      chapterSlot: ch2Check.slot,
      relicStripVisible: ch2Check.stripVisible,
      charmCount: ch2Check.charms,
      litMedallionCount: ch2Check.litCount,
      partialRingCount: ch2Check.partialCount,
      partialRingMaxProg: ch2Check.partialMax,
      clippedMedallionLabels: ch2Check.clippedLabels,
      chapter2HudOverlaps: ch2Geom.overlaps,
      stayAndDoodleChecked: false,
    };

    await snap('03-mid-coloring-relic-strip.png');

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
        if (qa.mode() !== 'chapter') {
          await new Promise((r) => setTimeout(r, 60));
          continue;
        }
        // Pause auto-turn if Chapter 2 finishes mid-crucible so we keep stressing smoothly on canvas
        const fin = qa.pageFinale();
        if (fin?.active && !fin.stayAndDoodle) {
          qa.setStayAndDoodle(true);
        }
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
        stayWasSet: Boolean(qa.pageFinale()?.stayAndDoodle),
      };
    });

    report.telemetry = perfResult.telemetry;
    report.maxFrameGapMs = perfResult.maxGapMs;
    report.midColoringRelicAudit.stayAndDoodleChecked = perfResult.stayWasSet;

    // =========================================================================
    // Bidirectional krunked-cookie-vault-v1 Self-Healing Test
    // =========================================================================
    await page.waitForTimeout(450);
    const preWipeGems = await page.evaluate(() => window.__chroma.stats().gems);
    report.vaultHealing.preWipeGems = preWipeGems;

    // Non-blocking IDB delete while app is open
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
    // STATE 6: Redesigned Stargazer Hub (10 Exotic Mediums, 14 Wardrobe, Affordable Pulse)
    // =========================================================================
    // Ensure >= 30 gems so multiple Exotic Mediums and Wardrobe items pulse "Ready to Unlock!" & "New Gift!"
    await page.evaluate(() => {
      const cur = window.__chroma.stats().gems;
      if (cur < 30) window.__chroma.qa.addGems(30 - cur);
    });
    await page.waitForTimeout(450);

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
      const pillBadge = document.querySelector('.cc-crystal-jar .cc-affordable-badge');
      const stationGiftDots = Array.from(document.querySelectorAll('.cc-station .cc-station-gift-dot')).filter(
        (el) => !el.hasAttribute('hidden') && el.getBoundingClientRect().width > 0,
      );
      return {
        roleTabs,
        stationCount: visibleStations.length,
        voyageVisible: Boolean(vr && vr.width > 0 && vr.height > 0),
        crystalPillNewGiftVisible: Boolean(
          pillBadge && !pillBadge.hasAttribute('hidden') && pillBadge.textContent?.includes('New Gift!'),
        ),
        stationNewGiftVisible: stationGiftDots.length >= 2,
      };
    });
    const hubGeom = await measureLayoutGeometry(page, [
      { name: 'crystalJar', selector: '.cc-crystal-jar' },
      { name: 'voyageSpine', selector: '.cc-voyage-pill' },
      { name: 'cornerRight', selector: '.cc-corner-pill' },
      { name: 'voyageRibbon', selector: '.cc-voyage-ribbon' },
      { name: 'station-paintbox', selector: '.cc-station[data-station="paintbox"]' },
      { name: 'station-wardrobe', selector: '.cc-station[data-station="wardrobe"]' },
      { name: 'station-bookshelf', selector: '.cc-station[data-station="bookshelf"]' },
      { name: 'station-trinkets', selector: '.cc-station[data-station="trinkets"]' },
    ]);
    const hubDomAudit = await auditAntiLunchTrayDom(page);

    report.hubAudit.roleTabCount = hubCheck.roleTabs;
    report.hubAudit.stationCount = hubCheck.stationCount;
    report.hubAudit.voyageVisible = hubCheck.voyageVisible;
    report.hubAudit.crystalPillNewGiftVisible = hubCheck.crystalPillNewGiftVisible;
    report.hubAudit.stationNewGiftVisible = hubCheck.stationNewGiftVisible;
    report.hubAudit.hubOverlaps = hubGeom.overlaps;
    report.hubAudit.antiLunchTray = hubDomAudit;

    await snap('06-stargazer-hub.png');

    // Open Exotic Mediums Paintbox -> 10 Exotic Mediums + "Ready to Unlock!" pulses
    await page.locator('.cc-station[data-station="paintbox"]').click();
    await page.locator('.cc-drawer-paintbox').waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(420);
    const paintboxCheck = await page.evaluate(() => ({
      exoticCount: document.querySelectorAll('.cc-drawer-paintbox .cc-shop-item').length,
      readyBadges: Array.from(document.querySelectorAll('.cc-drawer-paintbox .cc-ready-badge')).filter(
        (el) => el.textContent?.includes('Ready to Unlock!'),
      ).length,
    }));
    report.hubAudit.paintboxDrawerOpened = await page.locator('.cc-drawer-paintbox').isVisible();
    report.hubAudit.exoticMediumCardCount = paintboxCheck.exoticCount;
    report.hubAudit.paintboxReadyBadgeCount = paintboxCheck.readyBadges;
    await snap('06b-hub-paintbox.png');
    await page.locator('.cc-drawer-paintbox .cc-drawer-close').click();
    await page.locator('.cc-drawer-paintbox').waitFor({ state: 'hidden', timeout: 8000 });
    await page.waitForTimeout(180);

    // Open Stargazer Wardrobe -> 3 live portraits + 14 Wardrobe Items + "Ready to Unlock!" pulses
    await page.locator('.cc-station[data-station="wardrobe"]').click();
    await page.locator('.cc-drawer-wardrobe').waitFor({ state: 'visible', timeout: 8000 });
    await page.waitForTimeout(420);
    const wardrobeCheck = await page.evaluate(() => ({
      portraits: document.querySelectorAll('.cc-drawer-wardrobe .cc-doll-card').length,
      items: document.querySelectorAll('.cc-drawer-wardrobe .cc-ward-item').length,
      readyBadges: Array.from(document.querySelectorAll('.cc-drawer-wardrobe .cc-ready-badge')).filter(
        (el) => el.textContent?.includes('Ready to Unlock!'),
      ).length,
    }));
    report.hubAudit.wardrobeDrawerOpened = await page.locator('.cc-drawer-wardrobe').isVisible();
    report.hubAudit.wardrobePortraitCount = wardrobeCheck.portraits;
    report.hubAudit.wardrobeItemCount = wardrobeCheck.items;
    report.hubAudit.wardrobeReadyBadgeCount = wardrobeCheck.readyBadges;
    await snap('06c-hub-wardrobe.png');
    await page.locator('.cc-drawer-wardrobe .cc-drawer-close').click();
    await page.locator('.cc-drawer-wardrobe').waitFor({ state: 'hidden', timeout: 8000 });
    await page.waitForTimeout(180);

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
    // Full 5-Chapter Voyage -> Celestial Bookshelf -> Keepsake PNG Sanity Check
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
          const turnNow = page.locator('.cc-turn-now-btn[data-action="turn-now"]');
          if (await turnNow.isVisible()) {
            await turnNow.click();
          } else {
            await page.locator('.cc-settings-btn').click();
            const skipBtn = page.locator('.cc-skip-page-btn[data-action="skip-page"]');
            await skipBtn.waitFor({ state: 'visible', timeout: 5000 });
            await skipBtn.click();
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
        await page.waitForTimeout(350);

        await page.locator('.cc-station[data-station="bookshelf"]').click();
        await page.locator('.cc-drawer-bookshelf').waitFor({ state: 'visible', timeout: 10000 });
        await page.locator('.cc-book-spine.cc-cover').first().waitFor({ state: 'visible', timeout: 10000 });
        await page.waitForTimeout(300);
        await page.locator('.cc-book-spine.cc-cover').first().click();
        await waitForMode(page, 'book', 10000);
        await page.waitForTimeout(350);
        report.bookshelf.openedSavedBook = true;

        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await page.locator('.cc-keepsake').click();
        await downloadPromise;
        await page.waitForTimeout(250);
        report.bookshelf.keepsakeTriggered = true;
      }
    } catch (bonusErr) {
      report.bookshelf.error = String(bonusErr);
    }

    // =========================================================================
    // Evaluate All Sprint 2 Red-Team & 6-State Visual/Functional Assertions
    // =========================================================================
    report.assertions = {
      distRelativeAssetCheck: report.distRelativeAssetCheck === true,
      manifestHttp200: report.manifestHttp200 === true,
      coldBootUnder10s: (report.bootMs ?? 99999) <= 10000,
      zeroConsoleErrors: report.consoleErrors.length === 0,
      zeroPageErrors: report.pageErrors.length === 0,
      zeroNetworkErrors: report.networkErrors.length === 0,
      state1SpreadBreathingRoomGe78Pct: report.spreadAudit.spreadViewportPct >= 78,
      state1VoyageRibbonAndMedallions:
        report.spreadAudit.voyageNodeCount === 5 &&
        report.spreadAudit.medallionCount === 4 &&
        report.spreadAudit.lanternVisible &&
        report.spreadAudit.dockPixelIconCount >= 9,
      state1ZeroHudOverlapsAndAntiLunchTray:
        report.spreadAudit.hudOverlaps.length === 0 &&
        report.spreadAudit.clippedMedallionLabels.length === 0 &&
        report.spreadAudit.antiLunchTray?.svgCount === 0 &&
        report.spreadAudit.antiLunchTray?.brownHits.length === 0 &&
        report.spreadAudit.antiLunchTray?.dashedHits.length === 0 &&
        report.spreadAudit.antiLunchTray?.legacyText === false,
      state2FireflyHintSpotlightAndRouting:
        report.hintAudit.lanternActive &&
        report.hintAudit.lanternDimAmount > 0 &&
        report.hintAudit.wispMode === 'hintBeam' &&
        report.hintAudit.wispGhostLen >= 2 &&
        report.hintAudit.medallionRoutedQuestId === 'lumi' &&
        report.hintAudit.medallionActive &&
        report.hintAudit.medallionDimAmount > 0,
      state3MidColoringRingAndCharmStrip:
        report.midColoringRelicAudit.chapterSlot === 2 &&
        report.midColoringRelicAudit.relicStripVisible &&
        report.midColoringRelicAudit.charmCount >= 1 &&
        report.midColoringRelicAudit.litMedallionCount >= 1 &&
        report.midColoringRelicAudit.partialRingCount >= 1 &&
        report.midColoringRelicAudit.partialRingMaxProg >= 0.25 &&
        report.midColoringRelicAudit.clippedMedallionLabels.length === 0 &&
        report.midColoringRelicAudit.chapter2HudOverlaps.length === 0,
      state4AutoPageTurnFinaleAndAutoDraft:
        report.finaleAudit.ribbonVisible &&
        report.finaleAudit.finaleActive &&
        report.finaleAudit.finaleDurationMs === 2800 &&
        report.finaleAudit.completedQuests === 4 &&
        !report.finaleAudit.hasLegacyNextOrEarlyText &&
        report.finaleAudit.finaleHudOverlaps.length === 0 &&
        report.finaleAudit.autoTurnedToDraft,
      state5AstralTinAndStarDoors:
        report.draftAndDoorsAudit.tinVisible &&
        report.draftAndDoorsAudit.lidVisible &&
        report.draftAndDoorsAudit.hingesVisible &&
        report.draftAndDoorsAudit.cardCount === 3 &&
        report.draftAndDoorsAudit.cardPixCount >= 3 &&
        report.draftAndDoorsAudit.doorCount === 2 &&
        report.draftAndDoorsAudit.doorPixCount >= 2,
      state6StargazerHubCatalogAndPulses:
        report.hubAudit.roleTabCount === 0 &&
        report.hubAudit.stationCount === 4 &&
        report.hubAudit.voyageVisible &&
        report.hubAudit.crystalPillNewGiftVisible &&
        report.hubAudit.stationNewGiftVisible &&
        report.hubAudit.paintboxDrawerOpened &&
        report.hubAudit.exoticMediumCardCount === 10 &&
        report.hubAudit.paintboxReadyBadgeCount >= 1 &&
        report.hubAudit.wardrobeDrawerOpened &&
        report.hubAudit.wardrobePortraitCount === 3 &&
        report.hubAudit.wardrobeItemCount === 14 &&
        report.hubAudit.wardrobeReadyBadgeCount >= 1 &&
        report.hubAudit.hubOverlaps.length === 0 &&
        report.hubAudit.antiLunchTray?.svgCount === 0 &&
        report.hubAudit.antiLunchTray?.brownHits.length === 0 &&
        report.hubAudit.antiLunchTray?.dashedHits.length === 0,
      rainbowSlideTriggered: report.effects.includes('rainbowSlide'),
      cheetahRacetrackTriggered: report.effects.includes('cheetahRacetrack'),
      autoBloomTriggered: report.events.includes('autoBloom'),
      pokeTriggered: report.events.includes('poke'),
      gemsEarned: report.gemsAfterCh1 >= 10,
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
          spreadAudit: {
            spreadViewportPct: report.spreadAudit.spreadViewportPct,
            clippedMedallionLabels: report.spreadAudit.clippedMedallionLabels,
            hudOverlaps: report.spreadAudit.hudOverlaps,
            antiLunchTray: report.spreadAudit.antiLunchTray,
          },
          hintAudit: report.hintAudit,
          finaleAudit: report.finaleAudit,
          midColoringRelicAudit: report.midColoringRelicAudit,
          hubOverlaps: report.hubAudit.hubOverlaps,
          telemetry: report.telemetry,
          maxFrameGapMs: report.maxFrameGapMs,
          vaultHealing: report.vaultHealing,
          serviceWorker: report.serviceWorker,
          consoleErrors: report.consoleErrors,
          pageErrors: report.pageErrors,
          networkErrors: report.networkErrors,
          fatalError: report.fatalError,
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
