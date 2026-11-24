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
    distRelativeAssetCheck: !hasAbsoluteAssetUrl,
    manifestHttp200: false,
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

    // 1. Navigate & Wait for Hub
    await page.goto(qaUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__chroma?.qa), undefined, { timeout: 15000 });
    await waitForMode(page, 'hub', 15000);
    await page.waitForTimeout(450);
    await snap('01-hub.png');

    // 2. Start Run -> Chapter 1
    await page.evaluate(() => window.__chroma.qa.startRun(4242));
    await waitForMode(page, 'chapter', 15000);
    await page.waitForTimeout(450);
    await snap('02-ch1-uncolored.png');

    // 3. Paint Violet (1..4), Lumi (5..8), Nova (9..11), Cloud with mat 6, Planet/Rings with mat 4, Poke, Complete
    const ch1Result = await page.evaluate(async () => {
      const qa = window.__chroma.qa;
      const regs = qa.regions();
      const byId = new Map(regs.map((r) => [r.id, r]));
      let painted = 0;

      // Harmonious materials for Violet (1..4), Lumi (5..8), Nova (9..11)
      const actorMatPlan = [
        [1, 7], // violet_skin -> CottonCandyChalk
        [2, 4], // violet_sandy_hair -> SolarCheetahAmber
        [3, 1], // violet_suit -> LiquidAurora
        [4, 2], // violet_helmet -> HoloFoil
        [5, 7], // lumi_body -> CottonCandyChalk
        [6, 6], // lumi_mane -> RainbowPrismWax
        [7, 2], // lumi_horn -> HoloFoil
        [8, 1], // lumi_tail -> LiquidAurora
        [9, 4], // nova_body -> SolarCheetahAmber
        [10, 5], // nova_spots -> SupernovaGlitter
        [11, 4], // nova_tail -> SolarCheetahAmber
      ];
      for (const [id, mat] of actorMatPlan) {
        if (byId.has(id)) {
          const ok = await qa.paintRegion(id, mat);
          if (ok) painted++;
        }
      }

      // Paint a cloud region using MaterialId 6 (RainbowPrismWax) -> rainbowSlide
      const cloud = regs.find((r) => r.kind === 'cloud' && !r.coverageExcluded && r.percent < 1);
      if (cloud) {
        const ok = await qa.paintRegion(cloud.id, 6);
        if (ok) painted++;
      }

      // Paint a planet or rings region using MaterialId 4 (SolarCheetahAmber) -> cheetahRacetrack
      const planetOrRing = regs.find(
        (r) => (r.kind === 'planet' || r.kind === 'rings') && !r.coverageExcluded && r.percent < 1,
      );
      if (planetOrRing) {
        const ok = await qa.paintRegion(planetOrRing.id, 4);
        if (ok) painted++;
      }

      // Let actors wake & step a couple frames before poking
      await new Promise((r) => setTimeout(r, 150));
      const pokedLumi = await qa.poke('lumi');
      const pokedNova = await qa.poke('nova');

      // Complete all remaining core regions
      await qa.completePage();

      return {
        painted,
        cloudId: cloud?.id ?? null,
        planetId: planetOrRing?.id ?? null,
        pokedLumi,
        pokedNova,
        stats: window.__chroma.stats(),
      };
    });

    await page.waitForTimeout(850);
    await snap('03-ch1-awakened.png');

    const postCh1Stats = await page.evaluate(() => window.__chroma.stats());
    report.ch1RegionsPainted = ch1Result.painted;
    report.effects = postCh1Stats.effects;
    report.events = postCh1Stats.events;
    report.gemsAfterCh1 = postCh1Stats.gems;

    // 4. Click Next Page (.cc-next) -> Astral Pencil Tin modal
    await page.locator('.cc-next').waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('.cc-next').click();
    await waitForMode(page, 'draft', 10000);
    await page.locator('.cc-draft .cc-card').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(450);
    await snap('04-draft-tin.png');

    // 5. Click first .cc-card -> Star-Door chooser
    await page.locator('.cc-draft .cc-card').first().click();
    await waitForMode(page, 'doors', 10000);
    await page.locator('.cc-doors .cc-door').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(450);
    await snap('05-star-doors.png');

    // 6. Click first .cc-door -> Page-turn curl -> Chapter 2
    await page.locator('.cc-doors .cc-door').first().click();
    await waitForMode(page, 'chapter', 15000);
    await page.waitForTimeout(400);

    // 7. 5-second active paint + particle performance telemetry test
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
          const mat = ((idx % 7) + 1);
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

    // 8. Live Browser Vault Self-Healing test
    // Wait briefly for debounced IndexedDB write before capturing pre-wipe state.
    await page.waitForTimeout(450);
    const preWipeGems = await page.evaluate(() => window.__chroma.stats().gems);
    report.vaultHealing.preWipeGems = preWipeGems;

    // First verify live onversionchange non-blocking deleteDatabase while app is open,
    // then close the app tab, evict localStorage + IndexedDB via a blank same-origin page
    // (simulating real offline browser storage eviction), and open a fresh app tab.
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
    await page.goto(qaUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__chroma?.qa), undefined, { timeout: 15000 });
    await waitForMode(page, 'hub', 15000);
    await page.waitForTimeout(350);

    const postWipeStats = await page.evaluate(() => window.__chroma.stats());
    report.vaultHealing.postWipeGems = postWipeStats.gems;
    report.vaultHealing.source = postWipeStats.vaultReport?.source ?? null;
    report.vaultHealing.healed = postWipeStats.vaultReport?.healed ?? [];

    // Clear shadow cookie -> trigger focus/reload -> assert cookie regenerated.
    const cookieRegen = await page.evaluate(() => {
      document.cookie = 'krunked-cookie-vault-v1=; max-age=0; path=/';
      const cleared = !document.cookie.includes('krunked-cookie-vault-v1=');
      window.dispatchEvent(new Event('focus'));
      const afterFocus = document.cookie.includes('krunked-cookie-vault-v1=');
      return { cleared, afterFocus };
    });
    report.vaultHealing.cookieRegenerated = cookieRegen.cleared && cookieRegen.afterFocus;

    // 9. Verify Service Worker registered with scope ending /chroma-cosmos/
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

    // 10. Bonus full-run & Bookshelf verification
    try {
      const continueVisible = await page.locator('.cc-continue').isVisible();
      if (continueVisible) {
        await page.locator('.cc-continue').click();
      } else {
        await page.evaluate(() => window.__chroma.qa.startRun(4242));
      }
      await waitForMode(page, 'chapter', 10000);

      // Advance chapters 2..5 until Finale overlay appears.
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
          const nextBtn = page.locator('.cc-next');
          const earlyBtn = page.locator('.cc-early');
          if (await nextBtn.isVisible()) {
            await nextBtn.click();
          } else {
            await earlyBtn.waitFor({ state: 'visible', timeout: 8000 });
            await earlyBtn.click();
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

        // Open Books tab and open saved Storybook
        await page.locator('button.cc-tab[data-tab="books"]').click();
        await page.locator('.cc-cover').first().waitFor({ state: 'visible', timeout: 10000 });
        await page.locator('.cc-cover').first().click();
        await waitForMode(page, 'book', 10000);
        await page.waitForTimeout(450);
        report.bookshelf.openedSavedBook = true;

        await snap('06-bookshelf.png');

        // Trigger Save Keepsake PNG and ensure zero console/page errors.
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await page.locator('.cc-keepsake').click();
        await downloadPromise;
        await page.waitForTimeout(300);
        report.bookshelf.keepsakeTriggered = true;
      }
    } catch (bonusErr) {
      report.bookshelf.error = String(bonusErr);
    }

    // Evaluate assertions
    report.assertions = {
      distRelativeAssetCheck: report.distRelativeAssetCheck === true,
      manifestHttp200: report.manifestHttp200 === true,
      zeroConsoleErrors: report.consoleErrors.length === 0,
      zeroPageErrors: report.pageErrors.length === 0,
      zeroNetworkErrors: report.networkErrors.length === 0,
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
      bookshelfCompleted: report.bookshelf.openedSavedBook === true,
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
    console.log(JSON.stringify({ passed: report.passed, assertions: report.assertions, telemetry: report.telemetry, maxFrameGapMs: report.maxFrameGapMs }, null, 2));
  }

  if (!report.passed) {
    process.exitCode = 1;
  }
}

void main();
