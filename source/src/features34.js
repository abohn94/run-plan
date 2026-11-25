/* ================= Race-specific prep: the real course, the expected weather and a fueling plan built for you =================
   About 12 weeks out the app asks for the course GPX, start time and expected temperature. The course is analyzed
   (climb, descents, where the hills fall), training adds course-matched hills, the pacing plan calls out each climb,
   and fueling is sized to your weight and rehearsed on long runs, with a log of what worked. */

/* ---------- terrain (flat/rolling/hilly) lives in ev.terrain; ev.course is only ever the GPX course ---------- */
function evTerrain(ev) { var s = courseStats(ev); return s ? s.terrain : ev.terrain || (typeof ev.course === 'string' ? ev.course : ''); }
ACTIONS['ev-course'] = function (a) {
  var cur = sheetCtx.ev.terrain || (typeof sheetCtx.ev.course === 'string' ? sheetCtx.ev.course : '');
  sheetCtx.ev.terrain = cur === a.v ? '' : a.v; if (typeof sheetCtx.ev.course === 'string') delete sheetCtx.ev.course;
  $$('[data-act="ev-course"]').forEach(function (x) { x.setAttribute('aria-pressed', String(JSON.parse(x.dataset.arg).v === sheetCtx.ev.terrain)); });
};
var _evSheet34 = SHEETS.event;
SHEETS.event = function (a) {
  var h = _evSheet34(a), e = sheetCtx.ev || {}, t = e.terrain || (typeof e.course === 'string' ? e.course : '');
  if (typeof e.course === 'string') { e.terrain = t; delete e.course; }
  return h.replace(/data-act="ev-course" data-arg="([^"]*)" aria-pressed="(true|false)"/g, function (m, arg) { var v = ''; try { v = JSON.parse(arg.replace(/&quot;/g, '"')).v; } catch (x) { v = ''; } return 'data-act="ev-course" data-arg="' + arg + '" aria-pressed="' + (v === t) + '"'; })
    + (e.course && e.course.elev ? '' : '<p class="tiny muted">Tip: upload the course GPX on the race plan page and the terrain is worked out for you.</p>');
};

/* ---------- reading the course ---------- */
function courseStats(ev) {
  var c = ev && ev.course; if (!c || !c.elev || c.elev.length < 10) return null;
  if (c._s && c._s.n === c.elev.length) return c._s;
  var E1 = c.elev, n = E1.length, mi = c.mi || (n - 1) / 10, gain = 0, loss = 0;
  for (var i = 1; i < n; i++) { var dz = E1[i] - E1[i - 1]; if (dz > 0) gain += dz; else loss -= dz; }
  /* climbs: rises of 30+ ft over 0.3+ mi; a climb ends when the road drops 15+ ft below its high point */
  var climbs = [], st0 = 0, pk = 0;
  for (var k = 1; k < n; k++) {
    if (E1[k] > E1[pk]) pk = k;
    if (E1[k] < E1[st0] || (E1[pk] - E1[st0] < 10 && E1[k] <= E1[st0] + 4)) { st0 = k; pk = k; continue; }   /* slide the start along flats and dips */
    if (E1[pk] - E1[k] >= 15 || k === n - 1) {
      var rise = E1[pk] - E1[st0], len = (pk - st0) / 10;
      if (rise >= 30 && len >= 0.3) climbs.push({ at: st0 / 10, len: Math.round(len * 10) / 10, gain: Math.round(rise), grade: Math.round(rise / (len * 5280) * 1000) / 10 });
      st0 = k; pk = k;
    }
  }
  climbs.sort(function (a, b) { return b.gain - a.gain; });
  var top = climbs.slice(0, 4).sort(function (a, b) { return a.at - b.at; }), late = climbs.filter(function (x) { return x.at >= mi * 0.6; });
  var big = 0, bi = 0; for (var d = 0; d + 10 < n; d++) { var drop = E1[d] - E1[d + 10]; if (drop > big) { big = drop; bi = d; } }
  var fpm = gain / Math.max(1, mi), bigClimb = climbs.some(function (x) { return x.gain >= 50 || x.grade >= 2.5; }), terrain = fpm >= 40 ? 'hilly' : fpm >= 15 || bigClimb ? 'rolling' : 'flat';
  var s = { n: n, mi: mi, gain: Math.round(gain), loss: Math.round(loss), fpm: Math.round(fpm), terrain: terrain, climbs: top, all: climbs.length, late: late.sort(function (a, b) { return a.at - b.at; }), longest: climbs.slice().sort(function (a, b) { return b.len - a.len; })[0] || null, descent: big >= 25 ? { at: bi / 10, drop: Math.round(big) } : null };
  try { Object.defineProperty(c, '_s', { value: s, enumerable: false, configurable: true }); } catch (e) { /* ignore */ }
  return s;
}
/* expected race-day heat: the real forecast in the last two weeks, otherwise the temperature you expect */
var _raceHeat34 = raceHeat;
raceHeat = function (ev) {
  var r = _raceHeat34(ev); if (r && r.w) return r;
  if (+ev.temp > 0) { var t = +ev.temp, dew = ev.dew != null ? +ev.dew : t - 15; return { pct: E.heatPct(dew, t, (GX().acclim || {}).heat || 0), w: null, expected: t }; }
  return r;
};

/* ---------- fueling sized to you ---------- */
function bodyKg() { var p = st().profile || {}, w = (GX().who || {}).kg; return +p.weightKg || +w || null; }
function raceFuelPlan(ev) {
  var d = E.distOf(ev), kg = bodyKg() || 75, lb = Math.round(kg * 2.2046), g = E.parseClock(ev.goal) || d.mi * 540, hrs = g / 3600, full = d.key === 'full';
  /* in-race carbs: what the gut can absorb, not body size; longer and harder races sit higher in the range */
  var gHr = hrs < 1.25 ? 0 : full ? (hrs > 3.75 ? 60 : 75) : (hrs > 1.75 ? 50 : 40);
  var pre = Math.round(kg * (d.mi >= 13 ? 1.5 : 1) / 5) * 5, preH = d.mi >= 13 ? 3 : 2;
  var sw = ((st().prefs || {}).sweat || []).slice(-1)[0], heat = raceHeat(ev), hotish = (heat.expected || (heat.w && heat.w.temp) || 55) >= 65;
  var oz = sw ? Math.round(sw.ozh * (hotish ? 1.15 : 0.9)) : null, drinkOz = oz ? Math.min(28, Math.max(12, Math.round(oz * 0.6))) : (hotish ? 20 : 14);
  var sodium = hotish ? 500 : 300;
  return { kg: kg, lb: lb, gHr: gHr, pre: pre, preH: preH, drinkOz: drinkOz, sodium: sodium, hrs: hrs, full: full, mi: d.mi, gel: +((st().prefs || {}).gelG) || 25, sweatOz: oz };
}
function breakfastIdeas(g) {
  var menu = [['Plain bagel', 50], ['2 tbsp honey or jam', 30], ['Banana', 27], ['16 oz sports drink', 28], ['2 slices white toast', 26], ['Cup of oatmeal (cooked)', 27], ['Small white rice bowl (1 cup)', 45], ['Glass of juice (8 oz)', 26]];
  var out = [], t = 0, pick = [0, 1, 2, 3, 4, 7];
  for (var i = 0; i < pick.length && t < g - 10; i++) { out.push(menu[pick[i]]); t += menu[pick[i]][1]; }
  return { items: out, total: t };
}
function fuelLog() {
  var L = st().logs || {}, out = [];
  Object.keys(L).sort().forEach(function (d) { var r = L[d] && L[d].run; if (!r || !(+r.mi >= 6) && !(+r.sec >= 4500)) return; if (r.pre || r.gels != null || r.gut) out.push({ d: d, mi: r.mi, sec: r.sec, pre: r.pre, preT: r.preT, gels: r.gels, gut: r.gut, late: r.late }); });
  return out.slice(-12);
}
function fuelLogSummary() {
  var F = fuelLog(); if (!F.length) return null;
  var good = F.filter(function (x) { return x.gut === 'fine' && x.late !== 'faded'; }), bad = F.filter(function (x) { return x.gut && x.gut !== 'fine'; }), faded = F.filter(function (x) { return x.late === 'faded'; });
  return { n: F.length, good: good.length, bad: bad, faded: faded, last: F[F.length - 1], withGels: F.filter(function (x) { return +x.gels > 0; }).length };
}
var PRE_LBL = { none: 'nothing', small: 'under 50 g', meal: '50–100 g', big: '100 g+' }, PRET_LBL = { lt1: 'under 1 h', h1: '1–2 h', h2: '2–3 h', h3: '3 h+' }, GUT_LBL = { fine: 'fine', slosh: 'sloshy', cramp: 'cramps', bath: 'bathroom stop' };

/* ---------- the race plan page: course read-out, climbs, weather, personal fueling, practice log, prep timeline ---------- */
function prepTimeline(ev) {
  var days = E.diffD(App.today, ev.date), s = courseStats(ev), F = fuelLogSummary(), long = E.distOf(ev).mi >= 13, rows = [];
  var row = function (when, done, title, how) { rows.push('<div class="pt-row' + (done ? ' dn' : '') + '"><span class="pt-ck">' + (done ? '✓' : '') + '</span><div><b>' + title + '</b><small>' + when + (how ? ' · ' + how : '') + '</small></div></div>'); };
  row('12+ weeks out', !!s, 'Upload the course GPX', s ? E.round1(s.mi) + ' mi, ' + s.gain + ' ft of climbing' : 'see "Finding the course file" below');
  row('12+ weeks out', !!ev.hour && (+ev.temp > 0 || days <= 14), 'Start time and expected temperature', (ev.hour ? clockOf(ev.hour * 60) : 'start time not set (assuming 7:00 AM)') + (+ev.temp > 0 ? ' · ' + ev.temp + '°F' : ' · temperature not set'));
  row('10–12 weeks out', (st().prefs || {}).hillPrep === ev.id || !s || s.terrain === 'flat', 'Course-matched hill training', s && s.terrain !== 'flat' ? 'accept it in Coach' : 'not needed on a flat course');
  if (long) row('From 10 weeks out', F && F.withGels >= 3, 'Rehearse fueling on every long run', F ? F.withGels + ' long runs with fuel logged' : 'log breakfast, gels and stomach on each long run');
  if (long) row('6 weeks out', F && F.good >= 2, 'Settle on your race breakfast and gel', F && F.good ? F.good + ' rehearsals went well' : 'two good rehearsals with the same foods');
  row('2 weeks out', days <= 14 && !!ev.splits, 'Save the pacing plan to your watch', ev.splits ? 'saved' : '');
  return '<section class="card" id="rp-prep"><h3>Your race prep</h3><p class="small muted" style="margin-top:2px">' + (days > 0 ? days + ' days to go.' : 'Race day.') + ' Each step unlocks more of this plan.</p><div class="pt">' + rows.join('') + '</div></section>';
}
function courseHTML(ev) {
  var s = courseStats(ev); if (!s) return '';
  var g = E.parseClock(ev.goal), rp = g > 0 ? E.racePacing(E.distOf(ev).mi, g, ev.course.elev, raceHeat(ev).pct) : null, gp = g / E.distOf(ev).mi;
  var cl = s.climbs.map(function (c) { var seg = rp && rp.segs[Math.min(rp.segs.length - 1, Math.floor(c.at + c.len / 2))]; return '<li><b>Mile ' + E.round1(c.at) + '–' + E.round1(c.at + c.len) + '</b>: ' + c.gain + ' ft over ' + c.len + ' mi (' + c.grade + '%)' + (seg ? '. Aim for about <b>' + pace(seg.pace) + '/mi</b> (' + Math.round((seg.pace - gp)) + ' s slower than goal pace): hold the effort, not the pace.' : '') + '</li>'; }).join('');
  return '<section class="card" id="rp-course"><h3>The course</h3><div class="cs-grid"><div><b>' + s.gain + '</b><span>ft up</span></div><div><b>' + s.loss + '</b><span>ft down</span></div><div><b>' + s.fpm + '</b><span>ft per mile</span></div><div><b>' + ({ flat: 'Flat', rolling: 'Rolling', hilly: 'Hilly' })[s.terrain] + '</b><span>overall</span></div></div>' +
    (cl ? '<p class="small" style="margin-top:8px"><b>Climbs that matter</b></p><ul class="plain small wkl">' + cl + '</ul>' : '<p class="small" style="margin-top:8px">No climbs longer than a few hundred yards. Run it at even pace.</p>') +
    (s.late.length ? '<p class="small"><b>Late hills:</b> ' + s.late.map(function (c) { return 'mile ' + E.round1(c.at); }).join(', ') + ' come when your legs are tired. Train for them by finishing long runs on hills.</p>' : '') +
    (s.descent ? '<p class="small"><b>Biggest descent:</b> ' + s.descent.drop + ' ft in a mile around mile ' + E.round1(s.descent.at) + '. Let gravity do the work with short, quick steps; braking hard here costs your quads later.</p>' : '') + '</section>';
}
function fuelHTML(ev) {
  var f = raceFuelPlan(ev), d = E.distOf(ev); if (d.mi < 9) return '';
  var bf = breakfastIdeas(f.pre), start = +(ev.hour || 7) * 60, S = fuelLogSummary();
  var gels = f.gHr ? Math.max(1, Math.round(f.gHr * f.hrs / f.gel - (f.full ? 0 : 0.5))) : 0;
  var h = '<section class="card" id="rp-nutr"><h3>Your fueling plan</h3><p class="small muted" style="margin-top:2px">Sized for ' + f.lb + ' lb and a ' + E.clock(E.parseClock(ev.goal) || 0) + ' finish' + (f.sweatOz ? ', with your measured sweat rate' : '') + '.</p>' +
    '<p class="small" style="margin-top:8px"><b>Breakfast (' + clockOf(((start - f.preH * 60) % 1440 + 1440) % 1440) + ', ' + f.preH + ' hours before):</b> about <b>' + f.pre + ' g of carbs</b>, ' + (d.mi >= 13 ? '1.5' : '1') + ' g per kg of your weight, low in fat, fiber and protein. For example: ' + bf.items.map(function (x) { return x[0].toLowerCase() + ' (' + x[1] + ' g)'; }).join(', ') + '.</p>' +
    '<p class="small"><b>Why so much:</b> overnight your liver burns through much of its stored carbohydrate. Two slices of toast with honey is only about 50–60 g. That\'s a snack, not a race breakfast, and without gels during the race many runners hit empty around the halfway point.</p>' +
    (f.gHr ? '<p class="small"><b>During the race:</b> about <b>' + f.gHr + ' g of carbs an hour</b>, starting at 30–40 minutes and then every ' + Math.round(f.gel / f.gHr * 60) + ' minutes: about ' + gels + ' × ' + f.gel + ' g gels' + (f.full ? '. At this rate, choose products that mix glucose and fructose (often labelled 2:1), which the gut absorbs faster' : '') + '. Take each one with water at an aid station; sports drink from the aid stations counts toward the total.</p>' : '') +
    '<p class="small"><b>Last 15 minutes before the start:</b> one gel or a few chews' + (f.full ? '' : ' if breakfast was more than 3 hours ago') + '.</p>' +
    '<p class="small"><b>Fluids and salt:</b> about ' + f.drinkOz + ' oz an hour' + (f.sweatOz ? ' (you sweat about ' + f.sweatOz + ' oz an hour in similar weather)' : '') + ', drinking to thirst. Aim for about ' + f.sodium + ' mg of sodium an hour from sports drink, salty gels or a salt tab' + (f.sodium >= 500 ? ', since it\'ll be warm' : '') + '.</p>' +
    '<p class="small"><b>Nothing new on race day:</b> use the same breakfast, the same gel brand and flavor, and the same timing you rehearsed. Check which drink and gels the race hands out, and practise with those or carry your own.</p>';
  h += '<div class="fl-sum">' + (S ? '<p class="small"><b>Your rehearsals so far:</b> ' + plural(S.n, 'long run') + ' logged, ' + S.good + ' went well' + (S.bad.length ? '; stomach trouble on ' + S.bad.map(function (x) { return fmtD(x.d, { month: 'short', day: 'numeric' }) + ' (' + GUT_LBL[x.gut] + (x.pre ? ', ate ' + PRE_LBL[x.pre] + (x.preT ? ' ' + PRET_LBL[x.preT] + ' before' : '') : '') + ')'; }).join(', ') : '') + (S.faded.length ? '; faded late on ' + plural(S.faded.length, 'run') + ' (more carbs earlier usually fixes that)' : '') + '.</p>' : '<p class="small muted">No rehearsals logged yet. After each long run, use the run recap to log what you ate, when, gels taken and how your stomach felt. I\'ll learn what works for you.</p>') + '</div></section>';
  return h;
}
function courseHowTo() {
  return '<details class="mwhy" id="rp-howto"><summary>Finding the course file (GPX)</summary><ol class="small">' +
    '<li><b>Race website:</b> look for "Course map". Many link to a Strava, Garmin Connect, RunSignup, MapMyRun or RideWithGPS map with an <b>Export GPX</b> or <b>Download</b> option.</li>' +
    '<li><b>Strava:</b> search the race name under Explore → Routes or Segments, or find someone\'s run of the race from last year. On a route, ⋯ → Export GPX. On an activity, ⋯ → Export GPX (desktop browser).</li>' +
    '<li><b>Garmin Connect:</b> Training & Planning → Courses → Create Course, trace the published map, save, then ⋯ → Export to GPX. This also lets you send the course to your fenix to preview it.</li>' +
    '<li><b>Search</b> "[race name] GPX". Running clubs often post them.</li>' +
    '<li><b>Upload:</b> save the .gpx file to your phone (Downloads or Files), then on this page tap <b>Choose GPX file</b> under Course and pick it.</li></ol>' +
    '<p class="tiny muted">Upload 2–3 months before the race. That gives about 8–12 weeks to train for the hills, rehearse fueling and get used to any heat.</p></details>';
}
var _racepace34 = VIEWS.racepace;
VIEWS.racepace = function () {
  var h = _racepace34(), ev = evById(App.args[0]); if (!ev) return h;
  if (typeof ev.course === 'string') { ev.terrain = ev.course; delete ev.course; }
  var prep = prepTimeline(ev), course = courseHTML(ev), nutr = fuelHTML(ev);
  /* the course and timeline right after the headline numbers; the GPX how-to inside the Course card; the fueling plan before the old gel table */
  var a = h.indexOf('<div class="rp-nav"'); if (a < 0) a = h.indexOf('<div class="odds');
  h = a > 0 ? h.slice(0, a) + prep + h.slice(a) : prep + h;
  var c = h.indexOf('<section class="card stack"><div class="spread"><h3>Course</h3>'); if (c > 0) { var ce = h.indexOf('</section>', c); h = h.slice(0, ce) + courseHowTo() + h.slice(ce); h = h.slice(0, c) + course + h.slice(c); }
  var f = h.indexOf('<section class="card" id="rp-fuel">'); h = f > 0 ? h.slice(0, f) + nutr + h.slice(f) : h + nutr;
  /* temperature you expect, until a real forecast exists */
  var hz = raceHeat(ev);
  if (!hz.w) h = h.replace('</select></label>', '</select></label><label class="f">Expected temperature (°F)<input class="i" type="number" inputmode="numeric" data-evtemp="' + esc(ev.id) + '" value="' + (ev.temp || '') + '" placeholder="e.g. 50"></label>');
  return h;
};
document.addEventListener('change', function (e) {
  var f = e.target; if (!f.dataset || !f.dataset.evtemp) return; var id = f.dataset.evtemp, v = f.value === '' ? null : +f.value;
  Store.edit('events', null, function (S) { S.events.forEach(function (x) { if (String(x.id) === id) { if (v == null) delete x.temp; else x.temp = v; } }); }); toast('Saved'); render();
});

/* ---------- long-run recap: log your fueling rehearsal ---------- */
var _recap34 = recapHTML;
recapHTML = function (date, slot, inSheet) {
  var h = _recap34(date, slot, inSheet), r = (logOf(date)[slot] || {}); if (!h || !(+r.mi >= 6 || +r.sec >= 4500)) return h;
  var ar = { date: date, slot: slot }, row = function (lbl, k, opts) { return '<div class="tiny muted" style="margin-top:8px">' + lbl + '</div><div class="chips">' + opts.map(function (o) { return rchip(Object.assign({ k: k, v: o[0] }, ar), o[1], r[k] === o[0]); }).join('') + '</div>'; };
  var add = row('Carbs before the run', 'pre', [['none', 'None'], ['small', '<50 g'], ['meal', '50–100 g'], ['big', '100 g+']]) + row('How long before', 'preT', [['lt1', '<1 h'], ['h1', '1–2 h'], ['h2', '2–3 h'], ['h3', '3 h+']]) +
    row('Stomach', 'gut', [['fine', 'Fine'], ['slosh', 'Sloshy'], ['cramp', 'Cramps'], ['bath', 'Bathroom stop']]) + row('Last third of the run', 'late', [['strong', 'Strong'], ['ok', 'OK'], ['faded', 'Faded / no energy']]);
  var i = h.lastIndexOf('</div></div>'); if (h.indexOf('class="rc-check"') < 0 || i < 0) return h + add;
  var j = h.indexOf('<div class="tiny muted" style="margin-top:8px">Gels or fuel taken</div>'); if (j < 0) j = h.indexOf('Legs</div>'); if (j < 0) return h;
  var k = h.indexOf('</div>', h.indexOf('<div class="chips">', j)) + 6; return h.slice(0, k) + add + h.slice(k);
};

/* ---------- the coach: ask for the course in time, train for it, rehearse fueling ---------- */
function racePrepFindings() {
  var out = [], prefs = st().prefs || {};
  (st().events || []).filter(function (e) { return e.date > App.today && (e.priority || 'A') !== 'C' && E.distOf(e).mi >= 6; }).forEach(function (ev) {
    var days = E.diffD(App.today, ev.date), s = courseStats(ev), name = ev.name || E.distOf(ev).label, wk = Math.round(days / 7);
    if (days <= 100 && days >= 21 && !s && !(prefs.noGpx || {})[ev.id]) out.push({ id: 'gpx-' + ev.id, pri: 5, tone: 'act', title: 'Get the course for ' + name, seen: name + ' is ' + plural(wk, 'week') + ' away and I\'m planning as if it\'s flat. The real course changes your pacing, which hills you train for and how you fuel.', change: 'Download the course GPX file (race website, Strava or Garmin Connect) and upload it on the race plan page. Add the start time and the temperature you expect.', plan: 'Once it\'s in: a mile-by-mile pacing plan with every climb, course-matched hill sessions and long runs, and heat prep if it\'s warm.', expect: '8–12 weeks of course-specific preparation instead of guessing on race day.', act: { nav: '#/racepace/' + encodeURIComponent(ev.id) }, label: 'Open the race plan' });
    if (s && s.terrain !== 'flat' && days <= 84 && days >= 7 && prefs.hillPrep !== ev.id) {
      var L = s.longest, rep = L ? Math.max(60, Math.min(180, Math.round(L.len * (E.parseClock(ev.goal) / E.distOf(ev).mi || 540) * (1 + L.grade * 0.033) / 30) * 30)) : 90;
      out.push({ id: 'hill-' + ev.id, pri: 5, tone: 'act', title: 'Train for ' + name + '\'s hills', seen: 'The course climbs ' + s.gain + ' ft (' + s.fpm + ' ft a mile)' + (L ? '; the longest climb is ' + L.len + ' mi at ' + L.grade + '% from mile ' + E.round1(L.at) : '') + (s.late.length ? ', and there are hills after mile ' + E.round1(s.late[0].at) : '') + '.', change: 'Once a week, swap your strides for ' + (rep >= 120 ? '4–6' : '6–8') + ' × ' + (rep >= 60 ? Math.round(rep / 60 * 10) / 10 + ' min' : rep + ' s') + ' uphill at half-marathon effort, jogging back down. ' + (s.fpm >= 25 ? 'Run long runs on a route with about ' + Math.round(s.fpm * 0.8) + '+ ft of climbing a mile' : 'Include a climb of ' + (L ? L.gain + ' ft or more (' + L.len + ' mi or longer)' : 'a few hundred yards') + ' in your long runs') + (s.late.length ? ', placed in the last third' : '') + (s.descent ? ', and practise relaxed, quick-stepping downhills' : '') + '.', plan: 'Same days and distances. Long runs and one weekly session get course notes. Downhill sections slightly increase calf and shin load, so keep the shin routine going.', expect: 'Climbs cost less effort on race day, and your quads hold up on the descents.', act: { pref: { hillPrep: ev.id } }, label: 'Add course training' });
    }
    if (E.distOf(ev).mi >= 13 && days <= 84 && days >= 10 && !(prefs.fuelPracFor === ev.id)) { var f = raceFuelPlan(ev); out.push({ id: 'fuel-' + ev.id, pri: 4, tone: 'act', title: 'Rehearse race fueling for ' + name, seen: 'Your stomach needs practice to handle carbs at race effort, and race-morning breakfast is where many runners go wrong.', change: 'Before every long run over 75 minutes: about ' + Math.round(f.kg * 1 / 5) * 5 + ' g of carbs 2–3 hours before (or a smaller ' + Math.round(f.kg * 0.5 / 5) * 5 + ' g if you\'re going in 1 hour). During: a ' + f.gel + ' g gel at 30–40 minutes, then every 30–40 minutes. Afterwards, log it in the run recap.', plan: 'Long runs get a fueling note. Your race page builds your race breakfast and gel plan from what worked.', expect: 'By race day you\'ll know which breakfast, gel and timing your stomach handles, so there are no surprises and no fading in the second half.', act: { pref: { fuelPracFor: ev.id, fuelLong: true } }, label: 'Start rehearsing' }); }
  });
  return out;
}
var _pnF34 = pnFindings;
pnFindings = function () { var out = _pnF34(); try { out = out.concat(racePrepFindings()); } catch (e) { console.warn(e); } return out; };
/* the old one-line hill finding used the terrain chip; course-matched training replaces it when a GPX exists */
var _cf34 = coachFindings;
coachFindings = function () { var F = _cf34() || []; var seen = {}; return F.filter(function (f) { var k = f.id.split(':')[0]; if (seen[k]) return false; seen[k] = 1; return true; }); };

/* ---------- on the day: course and fueling notes on long runs and the weekly hill session ---------- */
function nextRaceFor(prefKey) { var id = (st().prefs || {})[prefKey]; return id ? evById(id) : null; }
var _crl34 = coachRunLines;
coachRunLines = function (x, date) {
  var h = _crl34(x, date); if (!E.isRun(x) || partDone(date, x)) return h;
  var hev = nextRaceFor('hillPrep'), s = hev && courseStats(hev);
  if (s && hev.date > date) {
    h = h.replace(/<p class="small capline">Choose a hilly route like your race course\.[^<]*<\/p>/, '');
    if (x.type === 'long') h += '<p class="small capline"><b>Course practice:</b> ' + (s.fpm >= 25 ? 'pick a route with about ' + Math.round(s.fpm * 0.8) + '+ ft of climbing a mile' : 'include a ' + (s.longest ? s.longest.gain + ' ft climb' : 'hill') + ' like the course') + (s.late.length ? ' in the last third' : '') + '. Run the climbs by effort.</p>';
    if (x.type === 'easy' && /strides/i.test(x.title || '')) h += '<p class="small capline"><b>Hill session:</b> swap the strides for short uphill repeats at half-marathon effort, jogging down.</p>';
  }
  var fev = nextRaceFor('fuelPracFor');
  if (fev && fev.date > date && x.type === 'long') { var f = raceFuelPlan(fev); h += '<p class="small capline"><b>Fuel rehearsal:</b> about ' + Math.round(f.kg / 5) * 5 + ' g carbs 2–3 h before, gel at 30–40 min then every 30–40 min. Log it in the recap afterwards.</p>'; }
  return h;
};
App.p34 = { courseStats: courseStats, raceFuelPlan: raceFuelPlan, racePrepFindings: racePrepFindings };
/* the older gel table and race-morning list follow the same personal numbers */
var _raceFuel34 = raceFuel;
raceFuel = function (ev, rp) {
  var r = _raceFuel34(ev, rp); if (!r) return r;
  var f = raceFuelPlan(ev); if (!f.gHr) return r;
  var total = rp ? rp.total : E.parseClock(ev.goal) || f.mi * 540, every = Math.round(f.gel / f.gHr * 3600), out = [];
  for (var t = 35 * 60; t < total - 10 * 60; t += every) { var mile = rp ? rp.segs.filter(function (s) { return s.cum <= t; }).length : Math.round(t / total * f.mi); out.push({ t: t, mile: Math.max(1, mile) }); }
  return { list: out, gHr: Math.round(out.length * f.gel / (total / 3600)), aim: f.gHr, gels: out.length, carbs: out.length * f.gel };
};
var _raceMorning34 = raceMorning;
raceMorning = function (ev) {
  var rows = _raceMorning34(ev), f = raceFuelPlan(ev), start = +(ev.hour || 7) * 60;
  return rows.map(function (r) { if (r.what !== 'Breakfast') return r; return { t: start - f.preH * 60, what: 'Breakfast', how: 'About ' + f.pre + ' g of carbs you\'ve rehearsed: for example, a bagel with honey, a banana and a sports drink. Coffee if you normally have it.' }; }).sort(function (a, b) { return a.t - b.t; });
};
