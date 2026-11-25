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
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(DIST, p); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': { '.html': 'text/html' }[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); }).listen(8817);
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
  const U = 'http://127.0.0.1:8817/'; const shot = (n, full) => pg.screenshot({ path: SHOTS + '/' + n + '.png', fullPage: !!full });
  const go = async (h, wait) => { await pg.goto(U + h); await pg.waitForTimeout(wait || 900); };
  const text = () => pg.innerText('#main');
  // Every screen must fit the phone: nothing may stick out past the right edge unless it sits in a sideways scroller.
  const widths = (process.env.WIDTHS || '360,390,412').split(',').map(Number);
  const routes = ['lift/' + E.addD(E.monday(today), 7) + '/A', 'wksummary/' + today, 'today', 'status', 'intake', 'rchecks', 'weekly', 'hrzones', 'progress/recovery', 'plan', 'plan/12', 'day/' + today, 'calendar', 'coach', 'progress/overview', 'progress/workouts', 'progress/performance', 'progress/health', 'progress/strength', 'you', 'goals', 'settings', 'style', 'sync', 'data', 'about', 'strength', 'strength/B', 'strength/UB', 'cross', 'shins', 'warmup', 'nutrition', 'zones', 'fitness', 'shoes', 'dash', 'editweek/5', 'preview', 'notify', 'coach/archive', 'watch', 'shareapp', 'calsync', 'racepace/half27', 'stylepick/norwegian', 'stylepick/balanced', 'workout/' + today + '/A', 'activity/FIRST'];
  const sheets = [['goals', { sheet: 'event' }], ['fitness', { sheet: 'metrics' }], ['today', { sheet: 'checkin' }], ['plan', { sheet: 'life' }], ['strength', { sheet: 'exinfo', n: 'Back squat' }], ['strength', { sheet: 'exinfo', n: 'Pull-up' }], ['progress/strength', { sheet: 'ormcalc', n: 'Back squat', w: 225, r: 5 }], ['shoes', { sheet: 'shoe' }], ['day/' + today, { sheet: 'run', date: today, slot: 'run' }]];
  const check = () => pg.evaluate(() => {
    const vw = window.innerWidth, bad = [];
    const scroller = el => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth + 1) return true; if (p.classList.contains('exstrip') || p.classList.contains('tabs') || p.classList.contains('cdstrip') || p.classList.contains('scroll')) return true; } return false; };
    document.querySelectorAll('main *, .sheet-card *, .topbar *, .tabbar *').forEach(el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return; if ((r.right > vw + 1.5 || r.left < -1.5) && !scroller(el) && !el.closest('svg')) bad.push((el.tagName + '.' + String(el.className).split(' ').slice(0, 2).join('.')).slice(0, 40) + ' ' + Math.round(r.left) + '..' + Math.round(r.right) + ' "' + (el.textContent || '').trim().slice(0, 28) + '"'); });
    return { bad: bad.slice(0, 4), n: bad.length, doc: document.documentElement.scrollWidth, vw };
  });
  let fails = 0;
  for (const wd of widths) {
    await pg.setViewportSize({ width: wd, height: 800 });
    await go('#/progress/workouts', 1200); const first = await pg.$eval('.actrow', a => a.getAttribute('href')).catch(() => '#/today');
    for (const r of routes) {
      await go(r === 'activity/FIRST' ? first : '#/' + r, 450);
      const c = await check(); if (c.n || c.doc > c.vw + 1) { fails++; log('OVERFLOW', wd, r, c.doc, JSON.stringify(c.bad)); }
    }
    for (const [r, arg] of sheets) {
      await go('#/' + r, 400); await pg.evaluate(a => { const b = document.createElement('button'); b.dataset.act = 'sheet'; b.dataset.arg = JSON.stringify(a); document.body.appendChild(b); b.click(); b.remove(); }, arg); await pg.waitForTimeout(250);
      const c = await check(); if (c.n) { fails++; log('OVERFLOW sheet', wd, arg.sheet, arg.n || '', JSON.stringify(c.bad)); }
      if (wd === 390 && arg.sheet === 'exinfo') await shot('sheet-' + arg.n.replace(/\W/g, ''), false);
    }
  }
  log(fails ? 'OVERFLOW FAILURES ' + fails : 'ALL SCREENS FIT (' + widths.join(', ') + ' px)');
  log('ERRORS', errs.length ? errs.slice(0, 6) : 'none');
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
