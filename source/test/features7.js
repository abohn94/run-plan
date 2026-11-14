// Garmin metrics, weather, execution, shifts, sleep, goal odds, race pacing, season, sweat, share kit.
const { chromium } = require('playwright'); const path = require('path'), fs = require('fs'), http = require('http');
const DIST = path.resolve(__dirname, '../dist'), [stateF, dataF, extraF, SH, calF] = process.argv.slice(2); const cal = calF ? JSON.parse(fs.readFileSync(calF)) : null; fs.mkdirSync(SH, { recursive: true });
let st = JSON.parse(fs.readFileSync(stateF)); const garmin = JSON.parse(fs.readFileSync(dataF)), extra = JSON.parse(fs.readFileSync(extraF));
const server = http.createServer((q, r) => { let p = q.url.split('?')[0]; if (p === '/') p = '/index.html'; const f = path.join(DIST, p); if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(fs.readFileSync(f)); }).listen(8835);
function wx() { const t = [], o = { temperature_2m: [], dew_point_2m: [], apparent_temperature: [], wind_speed_10m: [], precipitation_probability: [], snowfall: [], weather_code: [] }; const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  for (let i = 0; i < 24 * 16; i++) { const d = new Date(d0.getTime() + i * 3600e3); const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + ':00'; t.push(iso); const h = d.getHours(); o.temperature_2m.push(70 + 10 * Math.sin((h - 9) / 24 * 2 * Math.PI)); o.dew_point_2m.push(64 + (h % 5)); o.apparent_temperature.push(72); o.wind_speed_10m.push(6); o.precipitation_probability.push(h === 18 ? 40 : 5); o.snowfall.push(0); o.weather_code.push(2); }
  return JSON.stringify({ hourly: Object.assign({ time: t }, o) }); }
(async () => { const errs = [], log = (...a) => console.log(...a); const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, timezoneId: 'America/Chicago' }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load/.test(m.text())) errs.push(m.text()); });
  await pg.route('https://fonts.g**', r => r.abort()); await pg.route('https://api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: wx(), headers: { 'access-control-allow-origin': '*' } }));
  await pg.route('https://geocoding-api.open-meteo.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ name: 'Eden Prairie', admin1: 'Minnesota', country_code: 'US', latitude: 44.85, longitude: -93.47 }] }), headers: { 'access-control-allow-origin': '*' } }));
  let sha = 1;
  await pg.route('https://api.github.com/**', r => { const q = r.request(), u = new URL(q.url()).pathname;
    if (u.endsWith('state.json') && q.method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 's' + sha, content: Buffer.from(JSON.stringify(st)).toString('base64') }) });
    if (u.endsWith('state.json')) { st = JSON.parse(Buffer.from(JSON.parse(q.postData()).content, 'base64').toString()); sha++; return r.fulfill({ status: 200, body: JSON.stringify({ content: { sha: 's' + sha } }) }); }
    if (u.endsWith('calendar.json')) return cal ? r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'c', content: Buffer.from(JSON.stringify(cal)).toString('base64') }) }) : r.fulfill({ status: 404, body: '{}' });
    if (u.endsWith('extra.json')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'x', content: Buffer.from(JSON.stringify(extra)).toString('base64') }) });
    if (u.endsWith('data.json')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'g', size: 10, content: '' }) });
    if (u.includes('runs')) return r.fulfill({ status: 200, body: '{"workflow_runs":[]}' }); r.fulfill({ status: 404, body: '{}' }); });
  await pg.route('https://api.github.com/repos/abohn94/run-plan-data/contents/garmin/data.json*', r => { const a = r.request().headers().accept || ''; if (/raw/.test(a)) return r.fulfill({ status: 200, body: JSON.stringify(garmin) }); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 'g', size: 10, content: '' }) }); });
  await ctx.addInitScript(() => localStorage.setItem('rp-conn', JSON.stringify({ owner: 'abohn94', repo: 'run-plan-data', token: 'x', branch: '' })));
  const U = 'http://127.0.0.1:8835/', go = async (h, w) => { await pg.goto(U + h); await pg.waitForTimeout(w || 1200); }, shot = (n) => pg.screenshot({ path: SH + '/' + n + '.png', fullPage: true }), wide = () => pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  await go('#/today', 3500); await shot('t1-today');
  log('today: cond', !!(await pg.$('.cond')), 'hours', (await pg.$$('.hrs .hr')).length, 'gready', !!(await pg.$('.gready')), 'extra loaded', await pg.evaluate(() => !!(window.__APP && window.__APP.extra && window.__APP.extra.lt)), 'wide', await wide());
  log('cond text:', (await pg.innerText('.cond').catch(() => '')).replace(/\n/g, ' | ').slice(0, 300));
  await go('#/fitness', 1500); await shot('t2-fitness'); log('fitness tiles', (await pg.$$('.tiles.k3 .tile')).length, 'shinbars', (await pg.$$('.shinbars .sb')).length, 'recov', (await pg.$$('.recov > div')).length, 'durs', (await pg.$$('.durs > div')).length, 'wide', await wide());
  await go('#/dash', 1500); await shot('t3-dash'); log('dash odds', (await pg.$$('.odds')).length, 'wide', await wide());
  await go('#/goals', 1200); await shot('t4-goals'); log('goals odds', (await pg.$$('.odds')).length);
  const evid = await pg.evaluate(() => (window.Store.state.events.find(e => e.goal) || {}).id);
  await go('#/racepace/' + evid, 1200);
  const gpx = '<?xml version="1.0"?><gpx><trk><name>Test course</name><trkseg>' + Array.from({ length: 400 }, (_, i) => `<trkpt lat="${44.85 + i * 0.0005}" lon="-93.47"><ele>${270 + (i > 150 && i < 200 ? (i - 150) * 0.6 : i >= 200 ? 30 : 0)}</ele></trkpt>`).join('') + '</trkseg></trk></gpx>';
  fs.writeFileSync(SH + '/c.gpx', gpx); await pg.setInputFiles('input[data-course]', SH + '/c.gpx'); await pg.waitForTimeout(800);
  await shot('t5-racepace'); log('race miles', (await pg.$$('.mile')).length, 'up miles', (await pg.$$('.mile.up')).length, 'elev', !!(await pg.$('.elev')), 'wide', await wide());
  await pg.click('[data-act=race-save]'); await pg.waitForTimeout(400); log('splits saved', await pg.evaluate(() => !!window.Store.state.events.find(e => e.splits)));
  const nw = await pg.evaluate(() => { const p = window.__APP.plan, t = window.ENGINE.today(); return p.weeks.find(w => w.start > t).start; });
  await go('#/preview/' + nw, 1200); const firstDay = await pg.evaluate(() => [...document.querySelectorAll('.pvday')].find(d => d.querySelector('.pvchip.t-speed')).dataset.pvday);
  const idx = await pg.evaluate((d) => [...document.querySelectorAll('.shc')].findIndex(b => JSON.parse(b.dataset.arg).d === d), firstDay);
  await pg.click('.shc >> nth=' + idx); await pg.waitForTimeout(600); await shot('t6-preview-shift');
  log('shift set', JSON.stringify(await pg.evaluate(() => window.Store.state.shifts)), 'speed still on that day:', !!(await pg.$('[data-pvday="' + firstDay + '"] .pvchip.t-speed')), 'shin banner', !!(await pg.$('.banner.info')));
  await go('#/plan', 1200); await shot('t7-plan'); log('season segs', (await pg.$$('.season .sbar i')).length, 'wide', await wide());
  const gid = Object.keys(extra.laps)[0], act = 'g' + gid; await go('#/activity/' + act, 1500); await shot('t8-activity'); log('exec card', !!(await pg.$('.exec')), 'laps', (await pg.$$('.lap')).length);
  await go('#/nutrition', 1200); await pg.click('text=Test'); await pg.waitForTimeout(300); await pg.fill('#swA', '199'); await pg.fill('#swB', '197.5'); await pg.fill('#swC', '8'); await pg.click('[data-act=sheet-save]'); await pg.waitForTimeout(500); await shot('t9-nutrition'); log('sweat', JSON.stringify(await pg.evaluate(() => window.Store.state.prefs.sweat)));
  await go('#/shareapp', 800); log('share steps', (await pg.$$('.step')).length);
  await go('#/today', 1200); await pg.evaluate(() => { window.Store.state.prefs.loc = null; }); await pg.evaluate(() => { window.__APP && 0; });
  if (cal) {
    await go('#/today', 2500); await shot('k1-today-cal'); log('cal: away card', !!(await pg.$('.awayc')), 'free text', /calendar is free/.test(await pg.innerText('#main')));
    await pg.click('.awayc .btn.primary'); await pg.waitForTimeout(500); log('life added', JSON.stringify(await pg.evaluate(() => window.Store.state.life.filter(l => /calendar/.test(l.note || '')))));
    await go('#/preview/' + nw, 1500); await shot('k2-preview-cal'); log('cal shift chips', (await pg.$$('.shc.cal')).length, 'free tags', (await pg.$$('.pvfree')).length);
    log('shiftsAll', JSON.stringify(await pg.evaluate(() => window.Store.state.shiftsAll)), 'saved shifts key absent from JSON', !JSON.stringify(await pg.evaluate(() => window.Store.state)).includes('shiftsAll'));
    await go('#/calsync', 1000); await shot('k3-calsync'); log('calsync status', (await pg.innerText('.pill')).trim(), 'wide', await wide());
  }
  log('ERRORS:', errs.length ? errs : 'none'); await b.close(); server.close(); })();
