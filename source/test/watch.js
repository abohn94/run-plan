// Watch workouts page: turn on, auto-send after changing today's workout, manual send.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'), http = require('http');
const DIST = path.resolve(__dirname, '../dist'), [stateF, dataF, SH] = process.argv.slice(2); fs.mkdirSync(SH, { recursive: true });
let st = JSON.parse(fs.readFileSync(stateF)); const garmin = JSON.parse(fs.readFileSync(dataF)); const disp = [];
const server = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; const f = path.join(DIST, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(fs.readFileSync(f)); }).listen(8833);
(async () => { const errs = []; const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.route('https://fonts.g**', r => r.abort());
  let sha = 1;
  await pg.route('https://api.github.com/**', r => { const q = r.request(), u = new URL(q.url()).pathname;
    if (u.endsWith('state.json') && q.method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 's' + sha, content: Buffer.from(JSON.stringify(st)).toString('base64') }) });
    if (u.endsWith('state.json')) { st = JSON.parse(Buffer.from(JSON.parse(q.postData()).content, 'base64').toString()); sha++; return r.fulfill({ status: 200, body: JSON.stringify({ content: { sha: 's' + sha } }) }); }
    if (u.endsWith('watch.json')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'w', content: Buffer.from(JSON.stringify({ updated: new Date().toISOString(), days: { [new Date().toLocaleDateString('en-CA')]: [{ id: 1, name: 'Test Run', title: 'Easy run' }] } })).toString('base64') }) });
    if (u.endsWith('data.json')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(garmin) });
    if (u.endsWith('/dispatches')) { disp.push(u.split('/').slice(-2)[0]); return r.fulfill({ status: 204, body: '' }); }
    if (u.includes('runs')) return r.fulfill({ status: 200, body: '{"workflow_runs":[]}' }); r.fulfill({ status: 200, body: '{"private":true}' }); });
  await ctx.addInitScript(() => localStorage.setItem('rp-conn', JSON.stringify({ owner: 'abohn94', repo: 'run-plan-data', token: 'x', branch: '' })));
  await pg.goto('http://127.0.0.1:8833/#/watch'); await pg.waitForTimeout(1500); await pg.screenshot({ path: SH + '/w1.png', fullPage: true });
  await pg.click('[data-act=watch-on]'); await pg.waitForTimeout(2500); console.log('on:', JSON.stringify(st.prefs.watch));
  await pg.screenshot({ path: SH + '/w2.png', fullPage: true });
  // change today's workout: add a run via the readiness offer action
  await pg.evaluate(() => { window.__APP && 0; }); await pg.evaluate(() => document.dispatchEvent(new Event('x')));
  await pg.evaluate(() => { const b = document.createElement('button'); b.dataset.act = 'offer-yes'; b.dataset.arg = JSON.stringify({ add: { run: 3 } }); document.body.appendChild(b); b.click(); });
  await pg.waitForTimeout(9000); console.log('dispatches after change:', disp);
  await pg.click('[data-act=watch-now]'); await pg.waitForTimeout(3000); console.log('dispatches after send now:', disp);
  console.log('wide:', await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), 'errors:', errs); await b.close(); server.close(); })();
