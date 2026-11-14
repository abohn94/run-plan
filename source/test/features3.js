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
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(DIST, p); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': { '.html': 'text/html' }[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); }).listen(8818);
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
  const U = 'http://127.0.0.1:8818/'; const shot = (n, full) => pg.screenshot({ path: SHOTS + '/' + n + '.png', fullPage: !!full });
  const go = async (h, wait) => { await pg.goto(U + h); await pg.waitForTimeout(wait || 900); };
  const text = () => pg.innerText('#main');
  const sheet = async a => { await pg.evaluate(x => { const b = document.createElement('button'); b.dataset.act = 'sheet'; b.dataset.arg = JSON.stringify(x); document.body.appendChild(b); b.click(); b.remove(); }, a); await pg.waitForTimeout(300); };
  await go('#/strength', 1200); await shot('b1-strength', true);
  await sheet({ sheet: 'exinfo', n: 'Back squat' }); await pg.screenshot({ path: SHOTS + '/b2-exinfo.png' });
  const sc = await pg.$('#sheetCard'); await sc.evaluate(e => e.scrollTo(0, 420)); await pg.screenshot({ path: SHOTS + '/b3-exinfo2.png' }); await sc.evaluate(e => e.scrollTo(0, 2000)); await pg.screenshot({ path: SHOTS + '/b4-exinfo3.png' });
  await pg.click('.sublink >> nth=0'); await pg.waitForTimeout(400); log('subs:', JSON.stringify(await pg.evaluate(() => window.Store.state.subs)));
  await go('#/style', 800); await shot('b6-style', true); log('style groups:', (await pg.$$eval('.sechead h2', h => h.map(x => x.textContent))).join(' | '));
  await go('#/goals', 600); await sheet({ sheet: 'event', kind: 'pace' }); await pg.selectOption('#ev-dist', '10mi'); await pg.fill('#ev-pace', '8:30'); await pg.waitForTimeout(200); log('pace -> time:', await pg.inputValue('#ev-goal')); await pg.fill('#ev-date', E.addD(today, 60)); await pg.click('[data-act=sheet-save]'); await pg.waitForTimeout(600);
  await shot('b7-goals', true); log('events:', (await pg.evaluate(() => window.Store.state.events.map(e => e.name + ':' + e.dist + ':' + e.goal + ':' + (e.kind || 'race')))).join(' ; '));
  await go('#/plan', 700); await shot('b8-plan'); log('countdown strip:', (await pg.$$eval('.cdstrip .cd', c => c.map(x => x.innerText.replace(/\n/g, ' ')))).join(' || '));
  await go('#/fitness', 700); await shot('b9-fitness', true); log('estimator:', ((await text()).match(/VDOT [\d.]+[^\n]*\n[^\n]*/) || [''])[0].replace(/\n/g, ' | '));
  await pg.fill('#est-t', '22:48'); await pg.waitForTimeout(200); log('calc:', ((await pg.innerText('#est-out')).split('\n')[0]));
  await go('#/progress/strength', 700); await sheet({ sheet: 'ormcalc', n: 'Back squat', w: 225, r: 5 }); await pg.screenshot({ path: SHOTS + '/b10-ormcalc.png' }); log('1RM calc:', (await pg.innerText('#oc-out')).split('\n').slice(0, 8).join(' ')); await pg.click('[data-act=oc-save]'); await pg.waitForTimeout(400); await shot('b11-strength-prog', true);
  await go('#/progress/performance', 700); await shot('b12-bars');
  await go('#/glance', 600); await shot('b13-glance');
  await go('#/today', 900); log('rating card shown:', /How did it go/i.test(await text()));
  await pg.setViewportSize({ width: 1440, height: 900 }); await go('#/dash', 1500); await shot('c1-dash', true); log('dash cards:', (await pg.$$('.dash .card')).length, '| sidebar links:', (await pg.$$eval('.tabbar a', a => a.filter(x => getComputedStyle(x).display !== 'none').map(x => x.textContent.trim()))).join(','));
  await go('#/plan', 800); await shot('c2-plan-desktop'); await go('#/progress/health', 800); await shot('c3-health-desktop');
  await pg.setViewportSize({ width: 1100, height: 800 }); await go('#/dash', 1000); await shot('c4-dash-1100', true);
  log('ERRORS', errs.length ? errs.slice(0, 6) : 'none');
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
