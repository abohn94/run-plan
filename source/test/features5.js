// End-to-end check of the new features against a real-shaped state and Garmin file.
// Usage: node test/features.js <state.json> <data.json> <shots dir>
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const E = require('../dist/engine.built.js');
const DIST = path.resolve(__dirname, '../dist');
const [stateF, dataF, SHOTS] = process.argv.slice(2);
fs.mkdirSync(SHOTS, { recursive: true });
const today = E.today();
const state0 = JSON.parse(fs.readFileSync(stateF, 'utf8'));
const garmin = JSON.parse(fs.readFileSync(dataF, 'utf8'));
// simulate the v2 sync: best efforts + vo2 on runs, but no threshold (so the weekly prompt shows)
garmin.version = 2;
if (process.env.REAL !== '1') garmin.activities.forEach((a, i) => { if (a.run && a.distM > 5000 && a.movS) { const p = a.movS / a.distM; a.best = { '1k': Math.round(p * 1000 * 0.93), '1mi': Math.round(p * 1609 * 0.95), '5k': Math.round(p * 5000 * 0.98) }; if (i % 3 === 0) a.vo2 = 54 + (i % 3); } });
if (process.env.REAL !== '1') garmin.fitness = { vo2: { [E.addD(today, -9)]: 55 }, weight: { [E.addD(today, -20)]: 176.2, [E.addD(today, -3)]: 175.0 } };
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(DIST, p); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': { '.html': 'text/html' }[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); }).listen(8819);
const repo = { state: state0, sha: 1, puts: 0 };
function gh(route) { const req = route.request(), url = new URL(req.url()), m = req.method(); const p = url.pathname.replace('/repos/abohn94/run-plan-data', '');
  if (p === '') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"private":true}' });
  if (p === '/contents/user/state.json') { if (m === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 's' + repo.sha, size: 10, content: Buffer.from(JSON.stringify(repo.state)).toString('base64') }) }); const b = JSON.parse(req.postData()); if (b.sha !== 's' + repo.sha) return route.fulfill({ status: 409, body: '{}' }); repo.state = JSON.parse(Buffer.from(b.content, 'base64').toString()); repo.sha++; repo.puts++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 's' + repo.sha } }) }); }
  if (p === '/contents/garmin/data.json') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(garmin) });
  if (p.endsWith('/dispatches')) return route.fulfill({ status: 204, body: '' });
  if (p.includes('/runs')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"workflow_runs":[]}' });
  return route.fulfill({ status: 404, body: '{}' }); }
(async () => {
  const errs = []; const log = (...a) => console.log(...a);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); });
  await pg.route('https://fonts.g**', r => r.abort()); await pg.route('https://api.github.com/**', gh);
  await ctx.addInitScript(() => { localStorage.setItem('rp-conn', JSON.stringify({ owner: 'abohn94', repo: 'run-plan-data', token: 'good', branch: '' })); });
  const U = 'http://127.0.0.1:8819/'; const shot = (n, full) => pg.screenshot({ path: SHOTS + '/' + n + '.png', fullPage: !!full });
  const go = async (h, wait) => { await pg.goto(U + h); await pg.waitForTimeout(wait || 900); };
  const text = () => pg.innerText('#main');
  const T = () => pg.innerText('#main');
  await go('#/today', 1500);
  // 1. a day with a lift: bubble only
  const liftDay = await pg.evaluate(() => { const p = window.__APP.plan, t = window.ENGINE.today(); for (const w of p.weeks) for (const d of w.days) if (d.date >= t && d.parts.some(x => x.type === 'strength')) return d.date; });
  await go('#/day/' + liftDay, 900); await shot('d1-day', true);
  log('day bubble:', await pg.$eval('.liftbub', b => b.innerText.replace(/\n/g, ' | ')), '| exercise list on day page:', !!(await pg.$('#main .ex')));
  await go('#/plan', 800); log('plan bubbles:', (await pg.$$('.liftbub')).length);
  await go('#/today', 800); log('today start buttons (should be 0):', (await pg.$$('a.btn[href^="#/workout"]')).length);
  // 2. preview
  await go('#/day/' + liftDay, 600); await pg.click('.liftbub'); await pg.waitForTimeout(500); log('preview url:', pg.url().split('#')[1]); await shot('d2-preview', true);
  log('preview sections:', (await pg.$$eval('#main section h3', h => h.map(x => x.innerText))).join(' | '));
  // 3. start -> warm-up section
  await pg.click('text=Start workout'); await pg.waitForTimeout(600); log('workout url:', pg.url().split('#')[1]); await shot('d3-warmup');
  log('section 1:', await pg.innerText('.sectitle'), '| weight inputs in warm-up:', (await pg.$$('input[data-wk$="|w"]')).length, '| warm-up rows:', (await pg.$$('.wurow')).length);
  await pg.click('.wurow >> nth=0'); await pg.click('[data-act=wu-all]'); await pg.waitForTimeout(200);
  await pg.click('.secnav .btn.primary'); await pg.waitForTimeout(400); await shot('d4-power');
  const kinds = async () => pg.evaluate(() => window.__APP.wk.ex.filter(x => x.sec === window.__APP.wk.cur).map(x => x.n + ':' + x.kind).join(', '));
  log('section 2:', await pg.innerText('.sectitle'), '|', await kinds(), '| weight inputs:', (await pg.$$('input[data-wk$="|w"]')).length);
  // tick the bodyweight power sets
  const tickAll = async () => { const n2 = (await pg.$$('[data-act=wk-done]')).length; for (let k = 0; k < n2; k++) { const b = (await pg.$$('[data-act=wk-done]'))[k]; const arg = JSON.parse(await b.getAttribute('data-arg')); const wi = await pg.$('input[data-wk="' + arg.i + '|' + arg.j + '|w"]'); if (wi && !(await wi.inputValue())) await wi.fill('40'); await (await pg.$$('[data-act=wk-done]'))[k].click(); await pg.waitForTimeout(60); const s = await pg.$('[data-act=rest-stop]'); if (s && await s.isVisible()) await s.click(); } };
  await tickAll();
  await pg.click('.secnav .btn.primary'); await pg.waitForTimeout(400);
  log('section 3:', await pg.innerText('.sectitle'), '|', await kinds(), '| weight inputs:', (await pg.$$('input[data-wk$="|w"]')).length);
  await pg.click('.hxbtn >> nth=0'); await pg.waitForTimeout(300); await shot('d5-heavy');
  log('prev box:', (await pg.innerText('.hxbox')).replace(/\n/g, ' | ').slice(0, 220));
  const first = await pg.evaluate(() => window.__APP.wk.ex.findIndex(x => x.sec === window.__APP.wk.cur && x.kind === 'wt'));
  await pg.fill('input[data-wk="' + first + '|0|w"]', '185'); await pg.fill('input[data-wk="' + first + '|1|w"]', '195'); 
  for (const j of [0, 1]) { await pg.click('#ex' + first + ' [data-act=wk-done] >> nth=' + j); await pg.waitForTimeout(80); const s = await pg.$('[data-act=rest-stop]'); if (s && await s.isVisible()) await s.click(); }
  log('volume live:', await pg.innerText('#wkVol'), '| clock:', await pg.innerText('#wkClock'));
  // jump to last section via dots
  const n = await pg.evaluate(() => window.__APP.wk.secs.length); await pg.click('.secdots button >> nth=' + (n - 1)); await pg.waitForTimeout(300);
  log('last section:', await pg.innerText('.sectitle'), '|', await kinds(), '| end button:', !!(await pg.$('[data-act=wk-end]')));
  await shot('d6-finishers');
  pg.once('dialog', d => d.accept()); await pg.click('[data-act=wk-end]'); await pg.waitForTimeout(800);
  log('summary url:', pg.url().split('#')[1]); await shot('d7-summary', true);
  log('summary:', (await T()).split('\n').slice(0, 16).join(' | '));
  const saved = await pg.evaluate(d => window.Store.state.logs[d].lift, liftDay); log('saved:', JSON.stringify({ sec: saved.sec, vol: saved.vol, ex: Object.keys(saved.ex) }));
  // 4. fresh plan
  await go('#/settings', 600); pg.once('dialog', d => d.accept()); await pg.click('text=Start a fresh plan >> nth=1').catch(async () => { await pg.click('[data-act=reset-plan]'); }); await pg.waitForTimeout(700);
  log('after reset:', pg.url().split('#')[1], '| profile:', await pg.evaluate(() => window.Store.state.profile), '| prev:', JSON.stringify(await pg.evaluate(() => window.Store.state.prefs.prevProfile)));
  await shot('d8-welcome');
  log('ERRORS', errs.length ? errs.slice(0, 6) : 'none');
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
