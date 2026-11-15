const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const E = require('../dist/engine.built.js');
const DIST = path.resolve(__dirname, '../dist'), SHOTS = path.resolve(__dirname, 'shots2');
const today = E.today(); const garmin = require('./mkgarmin.js')(today);
// add older history before the plan start
for (let i = 80; i < 500; i += 3) { const d = E.addD(today, -i); garmin.activities.push({ id: 90000 + i, name: 'Old run', type: 'running', run: true, start: d + ' 07:00:00', date: d, distM: 5000 + (i % 5) * 900, durS: 1900 + (i % 5) * 330, movS: 1900 + (i % 5) * 330, avgHR: 142, maxHR: 174 }); }
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(DIST, p); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': { '.html': 'text/html' }[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); }).listen(8813);
const repo = { state: null, sha: 0, puts: 0, disp: 0 };
function gh(route) { const req = route.request(), url = new URL(req.url()), m = req.method(); const p = url.pathname.replace('/repos/abohn94/run-plan-data', '');
  if (req.headers()['authorization'] !== 'Bearer good') return route.fulfill({ status: 401, body: '{}' });
  if (p === '') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"private":true}' });
  if (p === '/contents/user/state.json') { if (m === 'GET') return repo.state ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 's' + repo.sha, size: 10, content: Buffer.from(JSON.stringify(repo.state)).toString('base64') }) }) : route.fulfill({ status: 404, body: '{}' }); const b = JSON.parse(req.postData()); if (repo.state && b.sha !== 's' + repo.sha) return route.fulfill({ status: 409, body: '{}' }); repo.state = JSON.parse(Buffer.from(b.content, 'base64').toString()); repo.sha++; repo.puts++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 's' + repo.sha } }) }); }
  if (p === '/contents/garmin/data.json') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(garmin) });
  if (p.endsWith('/dispatches')) { repo.disp++; return route.fulfill({ status: 204, body: '' }); }
  if (p.includes('/runs')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"workflow_runs":[]}' });
  return route.fulfill({ status: 404, body: '{}' }); }
(async () => {
  const errs = []; const log = (...a) => console.log(...a);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true }); const pg = await ctx.newPage();
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); });
  await pg.route('https://fonts.g**', r => r.abort()); await pg.route('https://api.github.com/**', gh);
  const U = 'http://127.0.0.1:8813/'; const shot = (n, full) => pg.screenshot({ path: SHOTS + '/f-' + n + '.png', fullPage: !!full });
  await pg.goto(U); await pg.waitForTimeout(500);
  // connect first (existing-user path), with empty repo -> then onboarding uses Garmin history
  await pg.click('text=Connect Garmin first'); await pg.waitForTimeout(300);
  await pg.fill('input[name=token]', 'good'); await pg.click('form[data-form=connect] button[type=submit]'); await pg.waitForTimeout(1200);
  log('after connect:', await pg.evaluate(() => location.hash), 'garmin acts', await pg.evaluate(() => (window.Store.garmin || {}).activities.length));
  await pg.goto(U + '#/setup'); await pg.waitForTimeout(400);
  await pg.click('text=Build my plan'); await pg.waitForTimeout(200); await shot('w1');
  await pg.click('text=Regular runner'); await pg.waitForTimeout(250); if (await pg.$('text=Continue')) { const h = await pg.innerText('#main'); if (/How would you describe/.test(h)) await pg.click('text=Continue'); }
  await pg.waitForTimeout(200); await pg.click('text=Hit a goal time'); await pg.waitForTimeout(250); if (/What are you training/.test(await pg.innerText('#main'))) await pg.click('text=Continue');
  await pg.waitForTimeout(200);
  for (const [n, d, g, k] of [['Half Marathon', '2027-04-24', '1:45:00', 'half'], ['Marathon', '2027-10-17', '3:30:00', 'full'], ['Turkey Trot 5K', '2026-11-26', '', '5k']]) {
    await pg.click('text=+ Add a race'); await pg.fill('#ev-name', n); await pg.fill('#ev-date', d); await pg.fill('#ev-goal', g); await pg.selectOption('#ev-dist', k); if (k === '5k') await pg.click('[data-evp="C"]'); await pg.click('[data-act="sheet-save"]'); await pg.waitForTimeout(200); }
  await shot('w3-races'); await pg.click('.wizfoot .btn.primary'); await pg.waitForTimeout(250);
  log('current step prefill:', (await pg.innerText('#main')).match(/From your Garmin:[^\n]*/)?.[0], '| mpw', await pg.inputValue('input[name=mpw]'), 'easy', await pg.inputValue('input[name=easyPace]'));
  await shot('w4-current', true);
  await pg.fill('input[name=weightLb]', '175'); await pg.check('input[name=injuryProne]'); await pg.click('.wizfoot .btn.primary'); await pg.waitForTimeout(250);
  await shot('w5-days'); await pg.fill('input[name=startDate]', '2026-10-12'); await pg.click('.wizfoot .btn.primary'); await pg.waitForTimeout(250);
  await pg.click('[data-pick="liftDays"][data-v="2"]'); await pg.click('[data-pick="crossDays"][data-v="1"]'); await shot('w6-gym'); await pg.click('.wizfoot .btn.primary'); await pg.waitForTimeout(250);
  if (await pg.$('[data-act=pl-dark]')) { await pg.click('text=No, daylight only'); await pg.waitForTimeout(300); await shot('w6b-place'); await pg.click('.wizfoot .btn.primary'); await pg.waitForTimeout(250); }
  await shot('w7-match', true); log('match:', (await pg.innerText('.match')).replace(/\n/g, ' | ').slice(0, 200));
  await pg.click('.wizfoot .btn.primary'); await pg.waitForTimeout(250); await shot('w8-review', true);
  await pg.click('text=Start training'); await pg.waitForTimeout(800);
  log('hash', await pg.evaluate(() => location.hash), 'weeks', await pg.evaluate(() => window.__APP.plan.weeks.length), 'logs', await pg.evaluate(() => Object.keys(window.Store.state.logs).length));
  await shot('today', true);
  // 5K C race appears as tune-up
  log('tune-up day:', await pg.evaluate(() => JSON.stringify(window.__APP.plan.weeks.flatMap(w => w.days).find(d => d.date === '2026-11-26').parts.map(p => p.title))));
  // edit a race: move marathon two weeks earlier; plan length changes
  await pg.goto(U + '#/goals'); await pg.waitForTimeout(300); await pg.click('.card:has-text("Marathon") >> text=Edit >> nth=1').catch(async () => { await pg.click('text=Edit >> nth=2'); });
  await pg.waitForTimeout(200); log('editing:', await pg.inputValue('#ev-name')); await pg.fill('#ev-date', '2027-10-03'); await pg.click('[data-act="sheet-save"]'); await pg.waitForTimeout(400);
  log('weeks after race move', await pg.evaluate(() => window.__APP.plan.weeks.length));
  // delete the 5K
  // progress tabs
  for (const t of ['', '/running', '/recovery', '/strength']) { await pg.goto(U + '#/progress' + t); await pg.waitForTimeout(400); await shot('prog' + t.replace('/', '-'), true); }
  log('all-time tile:', (await pg.evaluate(() => { location.hash = '#/progress'; return 1; })) && (await pg.waitForTimeout(300), (await pg.innerText('#main')).match(/ALL TIME[\s\S]{0,40}/)?.[0].replace(/\n/g, ' ')));
  // gym days page, coach, check-in, life event, metrics, fit download
  await pg.goto(U + '#/cross'); await pg.waitForTimeout(300); await shot('gym', true);
  await pg.goto(U + '#/coach'); await pg.waitForTimeout(300); await pg.fill('#coachIn', 'can I use the bike instead'); await pg.press('#coachIn', 'Enter'); await pg.waitForTimeout(300); await shot('coach', true);
  await pg.goto(U + '#/zones'); await pg.waitForTimeout(300); await pg.click('text=Add reading'); await pg.fill('#m-lt', '7:35'); await pg.fill('#m-vo2', '49'); await pg.click('[data-act="sheet-save"]'); await pg.waitForTimeout(300);
  await pg.goto(U + '#/day/' + E.addD(E.monday(today), 1)); await pg.waitForTimeout(300);
  const fit = await pg.$('text=Download for Garmin (.fit)'); if (fit) { const [dl] = await Promise.all([pg.waitForEvent('download'), fit.click()]); log('fit', dl.suggestedFilename()); }
  await pg.goBack(); await pg.waitForTimeout(200); log('back ->', await pg.evaluate(() => location.hash));
  await pg.goto(U + '#/settings'); await pg.waitForTimeout(300); await shot('settings', true);
  await pg.waitForTimeout(1800); log('repo puts', repo.puts, 'profile.method', repo.state.profile.method, 'events', repo.state.events.length, 'metrics', repo.state.metrics.length);
  // light theme
  await pg.evaluate(() => { localStorage.setItem('rp-theme', 'light'); }); await pg.goto(U + '#/plan'); await pg.reload(); await pg.waitForTimeout(900); await shot('light-plan');
  log('ERRORS', errs.length ? errs : 'none'); await browser.close(); server.close();
})().catch(e => { console.error(e); server.close(); process.exit(1); });
