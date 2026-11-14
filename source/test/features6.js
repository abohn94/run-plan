// Week start, week preview (cluster drag, separate, remove + alternatives, restore), Today cards, notify, zones, dashboard.
// Usage: node test/features6.js <state.json> <data.json> <shots dir>
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const E = require('../dist/engine.built.js');
const DIST = path.resolve(__dirname, '../dist');
const [stateF, dataF, SHOTS] = process.argv.slice(2);
fs.mkdirSync(SHOTS, { recursive: true });
const state0 = JSON.parse(fs.readFileSync(stateF, 'utf8'));
const garmin = JSON.parse(fs.readFileSync(dataF, 'utf8'));
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(DIST, p); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': { '.html': 'text/html' }[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); }).listen(8826);
const repo = { state: state0, sha: 1 };
function gh(route) { const req = route.request(), url = new URL(req.url()), m = req.method(); const p = url.pathname.replace('/repos/abohn94/run-plan-data', '');
  if (p === '') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"private":true}' });
  if (p === '/contents/user/state.json') { if (m === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 's' + repo.sha, size: 10, content: Buffer.from(JSON.stringify(repo.state)).toString('base64') }) }); const b = JSON.parse(req.postData()); if (b.sha !== 's' + repo.sha) return route.fulfill({ status: 409, body: '{}' }); repo.state = JSON.parse(Buffer.from(b.content, 'base64').toString()); repo.sha++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 's' + repo.sha } }) }); }
  if (p === '/contents/garmin/data.json') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(garmin) });
  if (p.includes('/runs')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"workflow_runs":[]}' });
  return route.fulfill({ status: 404, body: '{}' }); }
(async () => {
  const errs = [], log = (...a) => console.log(...a);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load|ntfy/.test(m.text())) errs.push(m.text()); });
  await pg.route('https://fonts.g**', r => r.abort()); await pg.route('https://api.github.com/**', gh);
  let ntfy = null; await pg.route('https://ntfy.sh/**', r => { ntfy = { url: r.request().url(), h: r.request().headers() }; r.fulfill({ status: 200, body: '{}', headers: { 'access-control-allow-origin': '*' } }); });
  await ctx.addInitScript(() => { localStorage.setItem('rp-conn', JSON.stringify({ owner: 'abohn94', repo: 'run-plan-data', token: 'good', branch: '' })); });
  const U = 'http://127.0.0.1:8826/', shot = (n, full) => pg.screenshot({ path: SHOTS + '/' + n + '.png', fullPage: !!full });
  const go = async (h, w) => { await pg.goto(U + h); await pg.waitForTimeout(w || 900); };
  const wide = async () => pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  await go('#/today', 1500);
  const nw = await pg.evaluate(() => { const p = window.__APP.plan, t = window.ENGINE.today(); return p.weeks.find(w => w.start > t).start; });
  await go('#/preview/' + nw); await shot('p1-preview', true);
  log('preview days:', (await pg.$$('.pvday')).length, 'chips:', (await pg.$$('.pvchip')).length, 'clusters:', (await pg.$$('.pvitems.cluster')).length, 'wide:', await wide());
  // cluster drag: find a day with 2 sessions, drag to the first rest day
  const info = await pg.evaluate(() => { const ds = [...document.querySelectorAll('.pvday')]; const c = ds.find(d => d.querySelectorAll('.pvchip').length > 1 && !d.classList.contains('past')); const r = ds.find(d => d.classList.contains('rest') && !d.classList.contains('past')); return c && r ? { from: c.dataset.pvday, to: r.dataset.pvday } : null; });
  log('cluster drag', info); await pg.setViewportSize({ width: 390, height: 1900 });
  if (info) {
    const a = await (await pg.$('[data-pvday="' + info.from + '"] .pvchip .tx')).boundingBox(), b = await (await pg.$('[data-pvday="' + info.to + '"]')).boundingBox();
    await pg.mouse.move(a.x + 20, a.y + 10); await pg.mouse.down(); await pg.mouse.move(a.x + 30, a.y + 30, { steps: 4 }); await pg.mouse.move(b.x + 80, b.y + b.height / 2, { steps: 10 }); await shot('p2-dragging'); await pg.mouse.up(); await pg.waitForTimeout(500);
    log('after drag: target chips', (await pg.$$('[data-pvday="' + info.to + '"] .pvchip')).length, 'source chips', (await pg.$$('[data-pvday="' + info.from + '"] .pvchip')).length);
    // separate on the target and move one back by tap
    await pg.click('[data-pvday="' + info.to + '"] .pvsplit'); await pg.waitForTimeout(300);
    log('separated cluster count:', (await pg.$$('[data-pvday="' + info.to + '"] .pvitems.cluster')).length);
    await pg.click('[data-pvday="' + info.to + '"] .pvchip >> nth=1'); await pg.waitForTimeout(200); await pg.click('[data-pvday="' + info.from + '"]'); await pg.waitForTimeout(400);
    await pg.setViewportSize({ width: 390, height: 844 }); log('after tap-move: target', (await pg.$$('[data-pvday="' + info.to + '"] .pvchip')).length, 'source', (await pg.$$('[data-pvday="' + info.from + '"] .pvchip')).length);
  }
  // remove a lift -> alternatives sheet
  const lift = await pg.$('.pvchip.t-strength .pvx');
  if (lift) { await lift.click(); await pg.waitForTimeout(600); await shot('p3-alts-lift'); log('lift alts:', (await pg.$$eval('.alt b', x => x.map(y => y.innerText))).join(' | '));
    await pg.click('.alt >> nth=0'); await pg.waitForTimeout(600); log('mix:', JSON.stringify(repo.state.liftmix || (await pg.evaluate(() => window.Store.state.liftmix)))); await shot('p4-after-mix', true);
    log('combined chip:', (await pg.$$eval('.pvchip.t-strength b', x => x.map(y => y.innerText))).join(' | ')); }
  // remove a long run -> alternatives
  const lr = await pg.$('.pvchip.t-long .pvx');
  if (lr) { await lr.click(); await pg.waitForTimeout(600); await shot('p5-alts-long'); log('long alts:', (await pg.$$eval('.alt b', x => x.map(y => y.innerText))).join(' | ')); await pg.click('[data-act=sheet-close]'); await pg.waitForTimeout(400); }
  log('removed list:', (await pg.$$('.pvrem')).length); await shot('p6-removed', true);
  await pg.click('.pvrem [data-act=pv-restore]'); await pg.waitForTimeout(400); log('after restore removed:', (await pg.$$('.pvrem')).length);
  await pg.click('[data-act=pv-ok]'); await pg.waitForTimeout(500); log('reviewed:', JSON.stringify((await pg.evaluate(() => window.Store.state.prefs.reviewed))));
  // week start: Sunday
  await go('#/settings'); await pg.selectOption('select[name=weekStart]', '6'); await pg.click('form[data-form=settings] button[type=submit]'); await pg.waitForTimeout(900);
  log('weekStart:', await pg.evaluate(() => window.Store.state.profile.weekStart), 'DOW[0]:', await pg.evaluate(() => window.ENGINE.DOW[0]), 'avail:', JSON.stringify(await pg.evaluate(() => window.Store.state.profile.avail)), 'long', await pg.evaluate(() => window.Store.state.profile.longDay));
  await go('#/plan'); await shot('p7-plan-sunday', true); log('plan first day label:', (await pg.$eval('.dayblock', d => d.innerText.slice(0, 20)).catch(() => '?')));
  await go('#/today', 900); await shot('p8-today', true);
  log('today cards: review', !!(await pg.$('.reviewcard')), 'missed', !!(await pg.$('.missed')), 'offer', !!(await pg.$('.offer')));
  // notify
  await go('#/notify'); await pg.check('#ntOn'); await pg.click('[data-act=nt-save]'); await pg.waitForTimeout(300); await pg.click('[data-act=nt-test]'); await pg.waitForTimeout(600); await shot('p9-notify', true);
  log('notify saved:', JSON.stringify(await pg.evaluate(() => window.Store.state.prefs.notify)), 'ntfy call:', ntfy && ntfy.url, ntfy && ntfy.h.click);
  await go('#/zones'); await shot('p10-zones', true); log('zone bubbles:', (await pg.$$('.zb')).length, 'wide:', await wide());
  await go('#/dash'); await shot('p11-dash', true); log('run bubbles:', (await pg.$$('.runbub')).length, 'lf rows:', (await pg.$$('.lfrow')).length, 'wide:', await wide());
  log('ERRORS:', errs.length ? errs : 'none');
  await browser.close(); server.close();
})();
