/* ================= A completed run, laid out like Garmin Connect: Overview · Stats · Laps · Charts · Gear ================= */
var RUN_TABS = [['overview', 'Overview'], ['stats', 'Stats'], ['laps', 'Laps'], ['charts', 'Charts'], ['gear', 'Gear']];
var HR_ZN = ['Warm up', 'Easy', 'Aerobic', 'Threshold', 'Maximum'], PW_ZN = ['Easy', 'Moderate', 'Tempo', 'Long interval', 'Short interval'];
var ZCOL = ['var(--gray)', 'var(--blue)', 'var(--green)', 'var(--amber)', 'var(--red)'];
function fF(c) { return Math.round(c * 9 / 5 + 32); }
function mph(ms) { return (ms * 2.23694).toFixed(1); }

/* the run's numbers: Garmin's full summary when it has synced, the activity list's numbers until then */
function runSum(a) {
  var g = a.g || {}, ser = g.id ? SERIES[String(g.id)] : null, S = (ser && ser.sum) || {};
  var pick = function () { for (var i = 0; i < arguments.length; i++) if (arguments[i] != null && arguments[i] !== '') return arguments[i]; return null; };
  return {
    full: !!ser && !!ser.sum, dist: g.distM || (a.mi ? a.mi * E.MI_M : null),
    total: pick(S.duration, g.durS, a.sec), moving: pick(S.movingDuration, g.movS), elapsed: pick(S.elapsedDuration),
    avgSp: pick(S.averageSpeed), movSp: pick(S.averageMovingSpeed, g.distM && g.movS ? g.distM / g.movS : null), gapSp: pick(S.avgGradeAdjustedSpeed, g.gapSpd), maxSp: pick(S.maxSpeed, g.maxSpd),
    hr: pick(S.averageHR, g.avgHR, a.hr), hrMax: pick(S.maxHR, g.maxHR), hrMin: S.minHR, recHR: pick(S.recoveryHeartRate, g.recHR),
    cad: pick(S.averageRunCadence, g.cadence), cadMax: pick(S.maxRunCadence, g.cadMax), sl: pick(S.strideLength, g.stride), vr: pick(S.verticalRatio, g.vRatio), vo: pick(S.verticalOscillation, g.vOsc), gct: pick(S.groundContactTime, g.gct), steps: S.steps,
    pw: pick(S.averagePower, g.pwr), pwMax: pick(S.maxPower, g.pwrMax), np: S.normalizedPower,
    up: pick(S.elevationGain, g.elevM), down: S.elevationLoss, elMin: S.minElevation, elMax: S.maxElevation,
    te: pick(S.trainingEffect, g.te), an: pick(S.anaerobicTrainingEffect, g.ane), load: pick(S.activityTrainingLoad, g.load), label: pick(S.trainingEffectLabel, g.teLabel),
    st0: pick(S.beginPotentialStamina, g.stam0), st1: pick(S.endPotentialStamina, g.stam1), stMin: pick(S.minAvailableStamina, g.stamMin),
    cal: pick(S.calories, g.calories), bmr: S.bmrCalories, sweat: S.waterEstimated, tAvg: S.averageTemperature, tMin: pick(S.minTemperature, g.tMin), tMax: pick(S.maxTemperature, g.tMax),
    modMin: S.moderateIntensityMinutes, vigMin: S.vigorousIntensityMinutes, bb: S.differenceBodyBattery, exec: pick(S.directWorkoutComplianceScore, g.exec),
    hrZ: S.hrZ, pwZ: S.pwZ, rw: S.rw
  };
}
function statsHTML(a) {
  var x = runSum(a), sec = function (title, rows) { rows = rows.filter(function (r) { return r && r[1] != null && r[1] !== '' && !/^(NaN|null|undefined)/.test(String(r[1])); }); return rows.length ? '<div class="stsec"><h4>' + title + '</h4>' + rows.map(function (r) { return '<div class="strow"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('') + '</div>' : ''; };
  var P = function (sp) { return sp > 0.5 ? pace(E.MI_M / sp) + ' /mi' : null; }, S = function (sp) { return sp > 0 ? mph(sp) + ' mph' : null; }, ft = function (m) { return m != null ? Math.round(m * 3.28084) + ' ft' : null; };
  var lapsL = a.g && a.g.id ? lapsFor(a.g.id) : null, work = (lapsL || []).filter(function (l) { return /ACTIVE|INTERVAL/.test(l.type || '') && (lapsL || []).some(function (q) { return /RECOVERY|REST/.test(q.type || ''); }); });
  var wd = work.reduce(function (t, l) { return t + l.d; }, 0), wt = work.reduce(function (t, l) { return t + l.t; }, 0);
  var h = sec('Pace', [['Avg pace', P(x.avgSp || (x.dist && x.total ? x.dist / x.total : 0))], ['Avg moving pace', P(x.movSp)], ['Avg grade-adjusted pace', P(x.gapSp)], ['Best pace', P(x.maxSp)]]) +
    sec('Speed', [['Avg speed', S(x.avgSp || (x.dist && x.total ? x.dist / x.total : 0))], ['Avg moving speed', S(x.movSp)], ['Avg grade-adjusted speed', S(x.gapSp)], ['Max speed', S(x.maxSp)]]) +
    sec('Timing', [['Total time', x.total ? clockS(x.total) : null], ['Moving time', x.moving ? clockS(x.moving) : null], ['Elapsed time', x.elapsed ? clockS(x.elapsed) : null]]) +
    (x.rw ? sec('Run / walk', [['Run time', x.rw.run ? clockS(x.rw.run) : null], ['Walk time', x.rw.walk != null ? clockS(x.rw.walk) : null], ['Idle time', x.rw.stand != null ? clockS(x.rw.stand) : null]]) : '') +
    sec('Heart rate', [['Avg heart rate', x.hr ? Math.round(x.hr) + ' bpm' : null], ['Max heart rate', x.hrMax ? Math.round(x.hrMax) + ' bpm' : null], ['Recovery heart rate', x.recHR ? Math.round(x.recHR) + ' bpm' : null]]) +
    sec('Stamina', [['Beginning potential', x.st0 != null ? Math.round(x.st0) + '%' : null], ['Ending potential', x.st1 != null ? Math.round(x.st1) + '%' : null], ['Min stamina', x.stMin != null ? Math.round(x.stMin) + '%' : null]]) +
    sec('Training effect', [['Primary benefit', x.label ? (TE_LABEL[x.label] || phraseText(x.label)) : null], ['Aerobic', x.te != null ? (+x.te).toFixed(1) : null], ['Anaerobic', x.an != null ? (+x.an).toFixed(1) : null], ['Exercise load', x.load != null ? Math.round(x.load) : null], ['Body Battery', x.bb != null ? (x.bb > 0 ? '+' : '') + x.bb : null]]) +
    sec('Power', [['Avg power', x.pw ? Math.round(x.pw) + ' W' : null], ['Max power', x.pwMax ? Math.round(x.pwMax) + ' W' : null], ['Normalized power', x.np ? Math.round(x.np) + ' W' : null]]) +
    sec('Running dynamics', [['Avg cadence', x.cad ? Math.round(x.cad) + ' spm' : null], ['Max cadence', x.cadMax ? Math.round(x.cadMax) + ' spm' : null], ['Avg step length', x.sl ? inch(x.sl) + ' in' : null], ['Avg vertical ratio', x.vr ? (+x.vr).toFixed(1) + '%' : null], ['Avg vertical oscillation', x.vo ? inch(x.vo) + ' in' : null], ['Avg ground contact', x.gct ? Math.round(x.gct) + ' ms' : null], ['Steps', x.steps ? x.steps.toLocaleString() : null]]) +
    sec('Elevation', [['Total ascent', ft(x.up)], ['Total descent', ft(x.down)], ['Min elevation', ft(x.elMin)], ['Max elevation', ft(x.elMax)]]) +
    (work.length ? sec('Workout intervals', [['Run time', clockS(wt)], ['Run distance', (wd / E.MI_M).toFixed(2) + ' mi'], ['Run pace', pace(wt / wd * E.MI_M) + ' /mi']]) : '') +
    sec('Nutrition & hydration', [['Resting calories', x.bmr != null ? Math.round(x.bmr) : null], ['Active calories', x.cal != null && x.bmr != null ? Math.round(x.cal - x.bmr) : null], ['Total calories', x.cal != null ? Math.round(x.cal) : null], ['Est. sweat loss', x.sweat ? Math.round(x.sweat / 29.5735) + ' oz' : null]]) +
    sec('Temperature', [['Avg temperature', x.tAvg != null ? fF(x.tAvg) + ' °F' : null], ['Min temperature', x.tMin != null ? fF(x.tMin) + ' °F' : null], ['Max temperature', x.tMax != null ? fF(x.tMax) + ' °F' : null]]) +
    sec('Intensity minutes', [['Moderate', x.modMin != null ? x.modMin + ' min' : null], ['Vigorous', x.vigMin != null ? x.vigMin + ' min (counts double)' : null], ['Total', x.modMin != null ? (x.modMin + 2 * (x.vigMin || 0)) + ' min' : null]]);
  return '<section class="card stats">' + (h || '<p class="small muted">No stats yet.</p>') + (x.full ? '' : '<p class="tiny muted" style="margin-top:8px">The full set (elapsed time, descent, temperature, zones, sweat loss) arrives with the run\'s chart data, usually within the hour of syncing.</p>') + '<p class="tiny muted" style="margin-top:8px">The watch\'s temperature reads high when it\'s on your wrist.</p></section>';
}

/* ---------- laps, with Garmin's step types and the plan's targets ---------- */
var LAP_T = { WARMUP: 'Warm up', ACTIVE: 'Run', INTERVAL: 'Run', RECOVERY: 'Recovery', REST: 'Rest', COOLDOWN: 'Cool down' };
function lapRows(a) {
  var laps = a.g && a.g.id ? lapsFor(a.g.id) : null; if (!laps || !laps.length) return null;
  var p = plannedRunOn(a.date), zz = _zonesAt7(a.date) || {}, steps = p && p.steps ? p.steps.filter(function (s) { return s.k === 'run' || s.k === 'rep'; }) : [];
  var structured = laps.some(function (l) { return /RECOVERY|REST|WARMUP|COOLDOWN/.test(l.type || ''); }), n = 0, d0 = 0, t0 = 0;
  return laps.map(function (l, i) {
    var typ = String(l.type || 'ACTIVE').toUpperCase(), run = /ACTIVE|INTERVAL/.test(typ);
    var zone = /WARMUP|COOLDOWN|RECOVERY|REST/.test(typ) ? (typ === 'RECOVERY' || typ === 'REST' ? null : 'E') : (steps.length ? (steps[Math.min(steps.length - 1, Math.max(0, (l.step != null ? l.step : i) - 1))] || steps[0]).z : null);
    var tgt = p && zone && zz[zone] ? zz[zone] : null, pc = l.sp ? E.MI_M / l.sp : null;
    var r = { i: i, n: structured && run ? ++n : !structured ? ++n : null, type: structured ? LAP_T[typ] || phraseText(typ) : 'Lap', key: structured ? (run ? 'run' : typ.toLowerCase()) : 'run', l: l, pace: pc, tgt: tgt,
      ok: tgt && pc ? pc >= tgt[0] - (zone === 'E' ? 20 : 6) && pc <= tgt[1] + (zone === 'E' ? 20 : 6) : null, a: d0, b: d0 + l.d, ta: t0, tb: t0 + (l.t || 0) };
    d0 += l.d; t0 += l.t || 0; return r;
  });
}
function lapsHTML(a) {
  var rows = lapRows(a); if (!rows) return '<section class="card"><p class="small muted">Laps appear once Garmin sends them, usually within the hour.</p></section>';
  var f = App.ui.lapf || 'all', kinds = [];
  rows.forEach(function (r) { if (kinds.indexOf(r.key) < 0) kinds.push(r.key); });
  var nm = { run: 'Run', warmup: 'Warm up', recovery: 'Recovery', rest: 'Rest', cooldown: 'Cool down' };
  if (kinds.indexOf(f) < 0) f = 'all';
  var chips = kinds.length > 1 ? '<div class="chips lapf">' + [['all', 'All']].concat(kinds.map(function (k) { return [k, nm[k] || k]; })).map(function (c) { return '<button class="chip" data-act="ui" data-arg="' + jattr({ k: 'lapf', v: c[0] }) + '" aria-pressed="' + (f === c[0]) + '">' + c[1] + '</button>'; }).join('') + '</div>' : '';
  var show = rows.filter(function (r) { return f === 'all' || r.key === f; }), open = App.ui.lapo;
  var anyT = rows.some(function (r) { return r.tgt; });
  var body = show.map(function (r) {
    var l = r.l, det = [];
    if (r.tgt) det.push(['Target', pace(r.tgt[0]) + '–' + pace(r.tgt[1]) + ' /mi']);
    if (l.gap) det.push(['Grade-adjusted', pace(E.MI_M / l.gap) + ' /mi']);
    if (l.cad) det.push(['Cadence', Math.round(l.cad) + ' spm']);
    if (l.sl) det.push(['Step length', inch(l.sl) + ' in']);
    if (l.gct) det.push(['Ground contact', Math.round(l.gct) + ' ms']);
    if (l.vo) det.push(['Bounce', inch(l.vo) + ' in']);
    if (l.vr) det.push(['Vertical ratio', (+l.vr).toFixed(1) + '%']);
    if (l.pw) det.push(['Power', Math.round(l.pw) + ' W']);
    if (l.up != null || l.down != null) det.push(['Climb', '+' + Math.round((l.up || 0) * 3.28084) + ' / −' + Math.round((l.down || 0) * 3.28084) + ' ft']);
    if (l.temp != null) det.push(['Temperature', fF(l.temp) + ' °F']);
    var isOpen = open === r.i;
    return '<tr class="laprow ' + (r.key === 'run' ? 'lrun' : 'lother') + (isOpen ? ' open' : '') + '" data-act="ui" data-arg="' + jattr({ k: 'lapo', v: isOpen ? -1 : r.i }) + '"><td class="num">' + (r.n || '') + '</td><td>' + esc(r.type) + '</td><td class="num">' + clockS(l.t || 0) + '</td><td class="num">' + (l.d / E.MI_M).toFixed(2) + '</td><td class="num"><b>' + (r.pace ? pace(r.pace) : '–') + '</b>' + (r.ok === true ? '<i class="lok">✓</i>' : r.ok === false ? '<i class="loff">•</i>' : '') + '</td><td class="num">' + (l.hr ? Math.round(l.hr) : '–') + '</td></tr>' +
      (isOpen && det.length ? '<tr class="lapdet"><td></td><td colspan="5"><div class="lapgrid">' + det.map(function (d) { return '<span><small>' + d[0] + '</small><b>' + d[1] + '</b></span>'; }).join('') + '</div></td></tr>' : '');
  }).join('');
  var tt = rows.reduce(function (s, r) { return s + (r.l.t || 0); }, 0), td = rows.reduce(function (s, r) { return s + r.l.d; }, 0);
  var p = plannedRunOn(a.date), done = rows.filter(function (r) { return r.ok != null && r.key === 'run'; }), hit = done.filter(function (r) { return r.ok; }).length;
  var du = null; try { du = E.durability(rows.map(function (r) { return r.l; })); } catch (e) { du = null; }
  return '<section class="card lapcard">' + (p ? '<p class="small"><b>Planned:</b> ' + esc(p.title) + (done.length ? ' · ' + hit + ' of ' + done.length + ' run laps on target' : '') + '</p>' : '') + chips +
    '<div class="scroll"><table class="t fit laptab"><thead><tr><th class="num">#</th><th>Type</th><th class="num">Time</th><th class="num">Mi</th><th class="num">Pace</th><th class="num">HR</th></tr></thead><tbody>' + body +
    (f === 'all' ? '<tr class="laptot"><td></td><td><b>Total</b></td><td class="num"><b>' + clockS(tt) + '</b></td><td class="num"><b>' + (td / E.MI_M).toFixed(2) + '</b></td><td class="num"><b>' + (td ? pace(tt / td * E.MI_M) : '–') + '</b></td><td></td></tr>' : '') + '</tbody></table></div>' +
    '<p class="tiny muted" style="margin-top:6px">Tap a lap for cadence, form, power and climb.' + (anyT ? ' ✓ on target, • off target.' : '') + '</p>' +
    (du ? '<p class="small" style="margin-top:10px"><b>Durability:</b> heart-rate drift ' + du.decouple + '% from the first half to the second. ' + (du.decouple <= 5 ? 'Under 5% means your aerobic base held up well.' : 'Over 5% usually means the pace was a little ambitious or it was hot.') + '</p>' : '') + '</section>';
}

/* ---------- charts: time or distance, the plan's pace band, form colored for your body, zones ---------- */
function zoneBars(list, names, unit, title, note) {
  if (!list || !list.length) return '';
  var tot = list.reduce(function (t, z) { return t + (z.s || 0); }, 0); if (!tot) return '';
  var sorted = list.slice().sort(function (p, q) { return q.z - p.z; });
  return '<div class="zsec"><div class="spread"><h4>' + title + '</h4></div>' + sorted.map(function (z) {
    var nx = list.filter(function (q) { return q.z === z.z + 1; })[0], rng = nx ? z.lo + '–' + (nx.lo - 1) : '> ' + (z.lo - 1), pct = Math.round((z.s || 0) / tot * 100);
    return '<div class="zrow"><div class="spread tiny"><span><b>Zone ' + z.z + '</b> · ' + rng + ' ' + unit + ' · ' + (names[z.z - 1] || '') + '</span><span class="mono">' + clockS(z.s || 0) + ' <span class="muted">' + pct + '%</span></span></div><div class="zbar"><i style="width:' + Math.max(1, pct) + '%;background:' + ZCOL[Math.min(4, z.z - 1)] + '"></i></div></div>';
  }).join('') + (note ? '<p class="tiny muted">' + note + '</p>' : '') + '</div>';
}
function teScale(v, label) {
  if (v == null) return '';
  var segs = [[0, 1, 'var(--line2)'], [1, 2, 'var(--line2)'], [2, 3, 'var(--blue)'], [3, 4, 'var(--green)'], [4, 5, 'var(--amber)']];
  var words = v < 1 ? 'No benefit' : v < 2 ? 'Minor' : v < 3 ? 'Maintaining' : v < 4 ? 'Improving' : v < 5 ? 'Highly improving' : 'Overreaching';
  return '<div class="te"><div class="spread"><span class="small"><b>' + label + '</b> ' + (+v).toFixed(1) + '</span><span class="tiny muted">' + words + '</span></div><div class="tebar">' + segs.map(function (s) { return '<i style="background:' + s[2] + '"></i>'; }).join('') + '<b style="left:' + Math.min(100, v / 5 * 100) + '%"></b></div></div>';
}
function chartsTabHTML(a) {
  var g = a.g || {}, id = g.id; if (!id) return '<section class="card"><p class="small muted">No watch data for this run.</p></section>';
  var cached = SERIES[String(id)], ser = cached || seriesFromLaps(lapsFor(id)), axis = App.ui.rchx || 'd';
  if (!ser) return '<section class="card"><p class="small muted">Charts appear once Garmin sends this run\'s details (usually within the hour).</p></section>';
  /* the plan's pace band for each lap */
  var rows = lapRows(a) || [], tg = rows.filter(function (r) { return r.tgt; }).map(function (r) { return axis === 't' ? { a: r.ta, b: r.tb, lo: r.tgt[0], hi: r.tgt[1] } : { a: r.a / E.MI_M, b: r.b / E.MI_M, lo: r.tgt[0], hi: r.tgt[1] }; });
  var b = bio(), v = g.distM && (g.movS || g.durS) ? g.distM / (g.movS || g.durS) : 3, x = formExpect(v, b);
  var band = function (k) { return { cad: [x.cad - 4, x.cad + 12], gct: [x.gct - 40, x.gct + 15], vo: [x.vo * 0.8, x.vo * 1.12], vr: [5, 8.6], sl: [x.sl * 0.88, x.sl * 1.05] }[k]; };
  var X = runSum(a), ch = runChartsHTML(String(id), ser, { axis: axis, targets: tg.length ? tg : null, band: band, over: X.up != null ? { el: '+' + Math.round(X.up * 3.28084) + ' <small>ft gain</small>' } : null }), rw = X.rw, rwt = rw ? (rw.run || 0) + (rw.walk || 0) + (rw.stand || 0) : 0;
  var tog = '<div class="seg rchx" role="group" aria-label="Chart axis">' + [['t', 'Time'], ['d', 'Distance']].map(function (o) { return '<button data-act="ui" data-arg="' + jattr({ k: 'rchx', v: o[0] }) + '" aria-pressed="' + (axis === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
  return tog + '<section class="card rchcard">' + ch + (tg.length ? '<p class="tiny muted">Shaded on the pace chart: the plan\'s target for each lap.</p>' : '') + (cached ? '<p class="tiny muted">Form dots: green is typical for your height and weight at this pace, amber a little outside, red well outside.</p>' : '') + '</section>' +
    (X.te != null ? '<section class="card"><h3>Training effect</h3>' + teScale(X.te, 'Aerobic') + teScale(X.an, 'Anaerobic') + (X.label ? '<p class="tiny muted" style="margin-top:6px">Primary benefit: ' + esc(TE_LABEL[X.label] || phraseText(X.label)) + (X.load != null ? ' · load ' + Math.round(X.load) : '') + '</p>' : '') + '</section>' : '') +
    (rwt ? '<section class="card"><h3>Run / walk</h3><div class="rwbar">' + [['run', 'var(--blue)'], ['walk', 'var(--green)'], ['stand', 'var(--gold)']].map(function (k) { return rw[k[0]] ? '<i style="width:' + (rw[k[0]] / rwt * 100) + '%;background:' + k[1] + '"></i>' : ''; }).join('') + '</div><div class="legend">' + [['run', 'Run', 'var(--blue)'], ['walk', 'Walk', 'var(--green)'], ['stand', 'Idle', 'var(--gold)']].map(function (k) { return rw[k[0]] != null ? '<span><i class="dot" style="background:' + k[2] + '"></i>' + k[1] + ' ' + clockS(rw[k[0]]) + '</span>' : ''; }).join('') + '</div></section>' : '') +
    (X.hrZ || X.pwZ ? '<section class="card">' + zoneBars(X.hrZ, HR_ZN, 'bpm', 'Time in heart-rate zones', 'Your Garmin heart-rate zones.') + zoneBars(X.pwZ, PW_ZN, 'W', 'Time in power zones') + '</section>' : '') +
    (cached ? '' : '<p class="tiny muted" style="margin:0 4px">Per-lap charts for now. Second-by-second charts, zones and run/walk arrive with the run\'s details, usually within the hour of syncing.</p>');
}

/* ---------- gear ---------- */
function gearHTML(a, shoesSec) {
  var cur = shoeFor(a);
  return (cur ? shoeCard(cur) : '<section class="card"><p class="small muted">No shoe on this run yet.</p></section>') + (shoesSec || '') + '<div class="btns"><a class="btn sm ghost" href="#/shoes">All shoes</a></div>';
}

/* ---------- the page: split what the rest of the app builds into the five tabs ---------- */
var _activity21 = VIEWS.activity;
VIEWS.activity = function () {
  var h = _activity21(), a = actByKey(App.args[0]);
  if (!a || a.kind !== 'run' || a.date > App.today) return h;
  var tab = App.args[1] || 'overview';
  if (!RUN_TABS.some(function (t) { return t[0] === tab; })) tab = 'overview';
  var box = document.createElement('div'); box.innerHTML = h;
  var head = '', parts = { overview: [], gear: [] }, shoesSec = '';
  Array.prototype.forEach.call(box.children, function (el) {
    var t = (el.querySelector('h3') || {}).textContent || '', cls = el.className || '';
    if (/pagehead/.test(cls)) head = el.outerHTML;
    else if (/rchcard/.test(cls) || /\bexec\b/.test(cls) || t === 'Run details') return;   /* charts, laps and Garmin's numbers have their own tabs */
    else if (t === 'Shoes') shoesSec = el.outerHTML;
    else parts.overview.push(el.outerHTML);
  });
  var g = a.g || {};
  if (g.id && SERIES[String(g.id)] === undefined) seriesFor(g.id, function (s) { if (s && App.view === 'activity' && App.args[0] === a.key && $('#sheet').hidden) render(); });
  var seg = '<div class="seg runtabs" role="tablist" aria-label="Run sections">' + RUN_TABS.map(function (t) { return '<button role="tab" data-act="nav" data-arg="' + jattr({ to: '#/activity/' + encodeURIComponent(a.key) + (t[0] === 'overview' ? '' : '/' + t[0]), replace: true }) + '" aria-pressed="' + (tab === t[0]) + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
  var body = '';
  try {
    body = tab === 'stats' ? statsHTML(a) : tab === 'laps' ? lapsHTML(a) : tab === 'charts' ? chartsTabHTML(a) : tab === 'gear' ? gearHTML(a, shoesSec) : parts.overview.join('');
  } catch (e) { console.error(e); body = parts.overview.join(''); }
  return head + seg + '<div class="runtab">' + body + '</div>';
};
App.p21 = { runSum: runSum, lapRows: lapRows };
