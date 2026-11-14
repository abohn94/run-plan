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
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(DIST, p); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': { '.html': 'text/html' }[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); }).listen(8814);
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
  const U = 'http://127.0.0.1:8814/'; const shot = (n, full) => pg.screenshot({ path: SHOTS + '/' + n + '.png', fullPage: !!full });
  const go = async (h, wait) => { await pg.goto(U + h); await pg.waitForTimeout(wait || 900); };
  const text = () => pg.innerText('#main');
  await go('#/today', 1500); await shot('01-today', true);
  log('today prompt:', ((await text()).match(/Update your [^\n]*/) || [''])[0], /Weekly fitness check/i.test(await text()), '| tabs:', (await pg.$$eval('.tabbar a', a => a.map(x => x.textContent.trim()))).join(','));
  await go('#/calendar'); await shot('02-calendar', true);
  await pg.click('a[aria-label="Previous month"]'); await pg.waitForTimeout(400); await shot('03-calendar-prev');
  log('calendar prev:', (await text()).slice(0, 80).replace(/\n/g, ' '));
  for (const t of ['overview', 'workouts', 'performance', 'health', 'strength']) { await go('#/progress/' + t); await shot('04-progress-' + t, true); log('progress', t, (await text()).length); }
  // activity detail from workouts list
  await go('#/progress/workouts'); await pg.click('.actrow'); await pg.waitForTimeout(400); await shot('05-activity', true); log('activity:', pg.url().split('#')[1]);
  // shoes
  await go('#/shoes'); await pg.click('text=Add shoes'); await pg.fill('#sh-brand', 'Brooks'); await pg.fill('#sh-model', 'Ghost 17'); await pg.fill('#sh-start', '120'); await pg.fill('#sh-since', E.addD(today, -60)); await pg.click('[data-act=sheet-save]'); await pg.waitForTimeout(400);
  await shot('06-shoes'); log('shoes:', (await text()).replace(/\n/g, ' ').slice(0, 160));
  await pg.click('.shoecard'); await pg.waitForTimeout(300); await shot('07-shoe', true);
  // assign 'none' on the first run in shoe page
  const runHref = await pg.$eval('.actrow', a => a.getAttribute('href')); await go(runHref, 500); await pg.click('[data-act=set-gear] >> text=None'); await pg.waitForTimeout(300); log('gear set:', JSON.stringify(await pg.evaluate(() => window.Store.state.gear)).slice(0, 80));
  // fitness page + metrics sheet
  await go('#/fitness'); await shot('11-fitness', true);
  await pg.click('text=Update readings'); await pg.fill('#m-vo2', '55'); await pg.fill('#m-lthr', '178'); await pg.fill('#m-lt', '7:16'); await pg.fill('#m-pw', '465'); await pg.fill('#m-wkg', '5.16'); await pg.click('[data-act=sheet-save]'); await pg.waitForTimeout(600);
  await shot('12-fitness-after', true);
  log('anchor:', JSON.stringify(await pg.evaluate(() => { const a = window.__APP.an.anchor; return a && { src: a.src, v: a.v.toFixed(1), from: a.from }; })), 'T zone', await pg.evaluate(d => { const w = window.ENGINE.weekOf(window.__APP.plan, d); return w && w.zonesAdj.T.map(window.ENGINE.fmtPace); }, today));
  await go('#/today', 1000); log('prompt after entering:', /Weekly fitness check/i.test(await text()));
  await go('#/you'); await shot('13-you', true);
  await go('#/day/' + today); await shot('14-day', true);
  // light theme spot check
  await pg.evaluate(() => { document.documentElement.dataset.theme = 'light'; }); await go('#/calendar'); await shot('15-calendar-light');
  await pg.setViewportSize({ width: 1200, height: 900 }); await go('#/progress/health'); await shot('16-desktop-health');
  await pg.waitForTimeout(2000);
  log('local orm:', JSON.stringify(await pg.evaluate(() => window.Store.state.orm)));
  log('repo puts:', repo.puts, '| shoes in repo:', (repo.state.shoes || []).length, '| orm:', (repo.state.orm || []).length, '| metrics:', (repo.state.metrics || []).length);
  log('ERRORS', errs.length ? errs : 'none');
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
