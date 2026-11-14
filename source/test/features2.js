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
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(DIST, p); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': { '.html': 'text/html' }[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); }).listen(8816);
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
  const U = 'http://127.0.0.1:8816/'; const shot = (n, full) => pg.screenshot({ path: SHOTS + '/' + n + '.png', fullPage: !!full });
  const go = async (h, wait) => { await pg.goto(U + h); await pg.waitForTimeout(wait || 900); };
  const text = () => pg.innerText('#main');
  await go('#/today', 1500); await shot('a1-today', true);
  const tx = await text();
  log('honest card:', /Honest check-in/i.test(tx), '|', (tx.match(/capped at [^.]*/) || [''])[0]);
  log('fuel:', (tx.match(/[\d,]+\s*\nkcal today/) || [''])[0].replace(/\n/g, ' '), (tx.match(/From Garmin: [^\n]*/) || tx.match(/Estimated burn: [^\n]*/) || [''])[0]);
  log('rating card:', /How did it go\?/.test(tx));
  // rate feel on the first card
  if (await pg.$('[data-act=rate2]')) { await pg.click('.feelrow button >> nth=3'); await pg.waitForTimeout(300); }
  await go('#/activity/g25046421382'); await shot('a2-activity', true);
  log('activity details:', ((await text()).match(/Run details[\s\S]{0,260}/) || [''])[0].replace(/\n/g, ' | '));
  await go('#/nutrition'); await shot('a3-nutrition', true);
  await pg.click('text=Lose slowly'); await pg.waitForTimeout(400); log('lose kcal:', ((await text()).match(/[\d,]+\s*\nkcal today/) || [''])[0].replace(/\n/g, ' '));
  // the workout screen itself is covered by test/features5.js
  // week editor: drag the long run to Saturday... find chips
  const wn = await pg.evaluate(() => window.__APP.week.n);
  await go('#/editweek/' + wn); await shot('a6-editweek', true);
  const chips = await pg.$$eval('.edchip', c => c.map(x => x.dataset.edkey + '>' + x.dataset.from));
  log('chips:', chips.join(' ; '));
  const longChip = await pg.$('.edchip.t-long'); const days = await pg.$$('.edday');
  // drag long run to the day after the speed session
  const speedFrom = await pg.$eval('.edchip.t-speed', c => c.dataset.from).catch(() => null);
  const targetDate = speedFrom ? await pg.evaluate(d => window.ENGINE.addD(d, 1), speedFrom) : null;
  if (longChip && targetDate) {
    const tgt = await pg.$('[data-edday="' + targetDate + '"]'); await longChip.scrollIntoViewIfNeeded(); await pg.evaluate(() => window.scrollBy(0, 150)); const tb = await tgt.boundingBox();
    const b2 = await longChip.boundingBox();
    await pg.mouse.move(b2.x + 20, b2.y + b2.height / 2); await pg.mouse.down(); await pg.mouse.move(b2.x + 25, b2.y + 30, { steps: 4 }); await pg.mouse.move(tb.x + 80, tb.y + tb.height / 2, { steps: 12 }); await pg.mouse.up(); await pg.waitForTimeout(600);
    log('after drag arr:', JSON.stringify(await pg.evaluate(() => window.Store.state.arr)));
    await shot('a7-editweek-after', true);
    log('warnings:', (await pg.$$eval('.banner', b => b.map(x => x.innerText.replace(/\n/g, ' ')))).join(' || ').slice(0, 400));
    const fix = await pg.$('[data-act=edfix]'); if (fix) { await fix.click(); await pg.waitForTimeout(500); log('after fix:', (await pg.$$eval('.banner', b => b.map(x => x.innerText.replace(/\n/g, ' ')))).join(' || ').slice(0, 300)); }
  }
  // tap-to-move: tap a strength chip then a day
  const lc = await pg.$('.edchip.t-strength'); if (lc) { const from = await lc.evaluate(c => c.dataset.from); await lc.click(); await pg.waitForTimeout(200); const other = await pg.$$eval('[data-edday]', (d, f) => d.map(x => x.dataset.edday).filter(x => x !== f)[0], from); await pg.click('[data-edday="' + other + '"] .d'); await pg.waitForTimeout(400); log('tap move:', Object.keys(await pg.evaluate(() => window.Store.state.arr)).length); }
  await go('#/plan/' + wn); await shot('a8-plan', true); log('plan has edit:', !!(await pg.$('a[href="#/editweek/' + wn + '"]')));
  await go('#/calendar'); log('calendar edit link:', !!(await pg.$('a[href^="#/editweek/"]')));
  await pg.waitForTimeout(1600);
  log('repo arr:', Object.keys(repo.state.arr || {}).length, '| bodyGoal:', repo.state.profile.bodyGoal);
  log('ERRORS', errs.length ? errs : 'none');
  await browser.close(); server.close();
})().catch(e => { console.error(e); process.exit(1); });
