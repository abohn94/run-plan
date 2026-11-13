const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const E = require('../dist/engine.built.js');
const DIST = path.resolve(__dirname, '../dist'), SHOTS = path.resolve(__dirname, 'shots2'); fs.mkdirSync(SHOTS, { recursive: true });
const seed = require('./seed.js'); const today = E.today(); const garmin = require('./mkgarmin.js')(today);
const server = http.createServer((req, res) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(DIST, p); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png' }[path.extname(f)] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); }).listen(8812);
const repo = { state: null, sha: 0 };
function gh(route) { const req = route.request(), url = new URL(req.url()), m = req.method(); const p = url.pathname.replace('/repos/abohn94/run-plan-data', '');
  if (p === '') return route.fulfill({ status: 200, contentType: 'application/json', body: '{"private":true}' });
  if (p === '/contents/user/state.json') { if (m === 'GET') return repo.state ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sha: 's' + repo.sha, size: 10, content: Buffer.from(JSON.stringify(repo.state)).toString('base64') }) }) : route.fulfill({ status: 404, body: '{}' }); const b = JSON.parse(req.postData()); repo.state = JSON.parse(Buffer.from(b.content, 'base64').toString()); repo.sha++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { sha: 's' + repo.sha } }) }); }
  if (p === '/contents/garmin/data.json') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(garmin) });
  return route.fulfill({ status: 404, body: '{}' }); }
(async () => {
  const errs = [];
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  async function page(setup) { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message)); await pg.route('https://fonts.g**', r => r.abort()); await pg.route('https://api.github.com/**', gh); if (setup) await pg.addInitScript(setup); await pg.goto('http://127.0.0.1:8812/'); await pg.waitForTimeout(900); return { pg, ctx }; }
  let { pg, ctx } = await page();
  await pg.screenshot({ path: SHOTS + '/a-onboard0.png' });
  console.log('onboard text:', (await pg.innerText('#main')).slice(0, 300).replace(/\n/g, ' | '));
  await ctx.close();
  repo.state = Object.assign(JSON.parse(JSON.stringify(seed)), { v: 1, logs: {}, status: {}, life: [], overrides: {}, moves: {}, checkins: [], metrics: [], coach: [], seen: {} });
  repo.state.profile.weightKg = 79; repo.state.profile.crossDays = 1;
  ({ pg, ctx } = await page(() => { localStorage.setItem('rp-welcome', '1'); localStorage.setItem('rp-conn', JSON.stringify({ owner: 'abohn94', repo: 'run-plan-data', token: 'good' })); }));
  await pg.waitForTimeout(800);
  for (const v of (process.argv[2] || 'today,plan,progress,you,coach,cross,goals').split(',')) { await pg.goto('http://127.0.0.1:8812/#/' + v); await pg.waitForTimeout(350); await pg.screenshot({ path: SHOTS + '/b-' + v.replace(/\//g, '_') + '.png', fullPage: true }); }
  console.log('ERR', errs); await browser.close(); server.close();
})();
