/* ================= Features 2: watch self-evaluation, lift volume & progressive overload, exact fueling,
   honest consistency check, drag-and-drop week editor ================= */

/* ---------- how you felt + perceived effort (Garmin's "Rate your workout") ---------- */
var FEEL = ['', 'Very weak', 'Weak', 'Normal', 'Strong', 'Very strong'];
var FEEL_IC = ['', '😫', '🙁', '😐', '🙂', '😄'];
var EFFORT = ['', 'Very easy', 'Easy', 'Moderate', 'Somewhat hard', 'Hard', 'Hard', 'Very hard', 'Very hard', 'Extremely hard', 'Maximum'];
function gAct(id) { var g = Store.garmin; if (!g || !g.activities || !id) return null; if (!gAct._m || gAct._u !== g.updated) { gAct._m = {}; gAct._u = g.updated; g.activities.forEach(function (a) { gAct._m[a.id] = a; }); } return gAct._m[id] || null; }
/* Copy ratings made on the watch or in Garmin Connect into your logs (never over your own). */
function fillRatings() {
  var logs = st().logs || {}, todo = [];
  Object.keys(logs).forEach(function (d) { ['run', 'xrun'].forEach(function (k) { var r = logs[d][k]; if (!r || !r.gid) return; var a = gAct(r.gid); if (!a) return; if ((a.rpe && !r.rpe) || (a.feel && !r.feel)) todo.push([d, k, a]); }); });
  if (!todo.length) return false;
  Store.editMany(todo.map(function (x) { return ['logs', x[0]]; }), function (S) { todo.forEach(function (x) { var r = S.logs[x[0]][x[1]]; if (x[2].rpe && !r.rpe) r.rpe = x[2].rpe; if (x[2].feel && !r.feel) r.feel = x[2].feel; }); });
  return true;
}
/* One-time switch to Garmin's effort scale: older in-app ratings used a scale where 4-5 meant "steady". */
var OLD_TO_GARMIN = [0, 1, 1, 2, 3, 3, 4, 5, 6, 8, 10];
function migrateEffortScale() {
  if (!st().profile || (st().prefs || {}).rpeScale === 'garmin') return false;
  var logs = st().logs || {}, ds = [];
  Object.keys(logs).forEach(function (d) { if (['run', 'xrun'].some(function (k) { return logs[d][k] && logs[d][k].rpe; })) ds.push(d); });
  Store.editMany(ds.map(function (d) { return ['logs', d]; }).concat([['prefs', 'rpeScale']]), function (S) {
    ds.forEach(function (d) { ['run', 'xrun'].forEach(function (k) { var r = S.logs[d][k]; if (r && r.rpe) r.rpe = OLD_TO_GARMIN[Math.max(1, Math.min(10, Math.round(r.rpe)))]; }); });
    S.prefs = S.prefs || {}; S.prefs.rpeScale = 'garmin';
  });
  return true;
}
/* Keep the profile weight in step with the latest Garmin weigh-in. */
function syncWeight() {
  var w = latestWeight(), p = st().profile;
  if (!p || !w || w.src !== 'garmin') return false;
  var kg = Math.round(w.lb / 2.2046 * 10) / 10;
  if (p.weightKg && Math.abs(p.weightKg - kg) < 0.3) return false;
  Store.edit('profile', null, function (S) { S.profile.weightKg = kg; });
  return true;
}
var _applyGarmin = applyGarmin;
applyGarmin = function () { var m = migrateEffortScale(); var a = _applyGarmin(); var b = fillRatings(); var c = syncWeight(); return m || a || b || c; };
function feelRow(cur, arg) { return '<div class="feelrow">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-act="rate2" data-arg="' + jattr(Object.assign({ k: 'feel', v: n }, arg)) + '" aria-pressed="' + (cur === n) + '"><span>' + FEEL_IC[n] + '</span>' + FEEL[n] + '</button>'; }).join('') + '</div>'; }
function effortRow(cur, arg) { return '<div class="rpe">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<button type="button" data-act="rate2" data-arg="' + jattr(Object.assign({ k: 'rpe', v: n }, arg)) + '" aria-pressed="' + (cur === n) + '" aria-label="Effort ' + n + '">' + n + '</button>'; }).join('') + '</div><p class="tiny muted" style="margin-top:4px">' + (cur ? '<b>' + cur + ' – ' + EFFORT[cur] + '.</b> ' : '') + 'Same scale as Garmin: 2 easy · 3 moderate · 5 hard · 7 very hard · 10 max</p>'; }
ACTIONS.rate2 = function (a) {
  if (a.sheet) { sheetCtx[a.k] = sheetCtx[a.k] === a.v ? null : a.v; $$('[data-act="rate2"]').forEach(function (b) { var x = JSON.parse(b.dataset.arg); if (x.k === a.k) b.setAttribute('aria-pressed', String(x.v === sheetCtx[a.k])); }); return; }
  Store.edit('logs', a.date, function (S) { var r = S.logs[a.date] && S.logs[a.date][a.slot]; if (r) r[a.k] = a.v; });
  toast(a.k === 'feel' ? 'Thanks — saved' : 'Effort saved — it tunes your paces');
};
rateCard = function () {
  var logs = st().logs || {}, t = App.today, items = [];
  for (var i = 0; i < 4; i++) { var d = E.addD(t, -i), l = logs[d]; if (!l) continue; ['run', 'xrun'].forEach(function (k) { var r = l[k]; if (r && !r.skip && +r.mi > 0 && (!r.rpe || !r.feel)) items.push({ date: d, slot: k, r: r }); }); }
  if (!items.length) return '';
  return '<section class="card"><h3>How did it go?</h3><p class="small muted">The same two questions Garmin asks after a run. Rate on the watch or in Garmin Connect and it syncs here, or answer now. Your answers adjust your paces and the next few days.</p>' + items.slice(0, 2).map(function (it) {
    var r = it.r, arg = { date: it.date, slot: it.slot };
    return '<div style="margin-top:12px"><div class="spread small"><b>' + E.fmtDate(it.date, { weekday: 'short' }) + ' · ' + esc(r.name || 'Run') + '</b><span class="mono muted">' + mi(r.mi) + ' mi' + (r.mi && r.sec ? ' · ' + pace(r.sec / r.mi) + '/mi' : '') + '</span></div><div class="eyebrow" style="margin-top:8px">How did you feel?</div>' + feelRow(r.feel, arg) + '<div class="eyebrow" style="margin-top:8px">Perceived effort</div>' + effortRow(r.rpe, arg) + '</div>';
  }).join('') + '</section>';
};
/* run log sheet: add "how did you feel" */
var _runSheet = SHEETS.run;
SHEETS.run = function (a) {
  var h = _runSheet(a), r = logOf(a.date)[a.slot || 'run'] || {};
  sheetCtx.feel = r.feel || null;
  return h.replace('<label class="f">Effort (RPE 1–10)', '<label class="f">How did you feel?' + feelRow(r.feel, { sheet: 1 }) + '</label><label class="f">Perceived effort (1–10, same scale as Garmin)');
};
SAVE2.run = function () {
  var a = sheetCtx.a, feel = sheetCtx.feel, date = a.date, slot = a.slot || 'run';
  saveSheet();
  if (feel) Store.edit('logs', date, function (S) { if (S.logs[date] && S.logs[date][slot]) S.logs[date][slot].feel = feel; });
};
/* activity page: self-evaluation and the deeper Garmin stats */
var TE_LABEL = { AEROBIC_BASE: 'Base', TEMPO: 'Tempo', LACTATE_THRESHOLD: 'Threshold', VO2MAX: 'VO2 max', ANAEROBIC_CAPACITY: 'Anaerobic capacity', SPEED: 'Speed', RECOVERY: 'Recovery' };
var _activity = VIEWS.activity;
VIEWS.activity = function () {
  var h = _activity(), a = actByKey(App.args[0]);
  if (!a || a.kind !== 'run') return h;
  var g = a.g || {}, l = a.log;
  /* drop the old effort-only block */
  h = h.replace(/<section class="card"><h3>How did it feel\?<\/h3>[\s\S]*?<\/section>/, '');
  var ev = '';
  if (l) ev = '<section class="card"><h3>Self-evaluation</h3>' + (g.rpe || g.feel ? '<p class="tiny muted">From your watch. Change it here if you like.</p>' : '') + '<div class="eyebrow" style="margin-top:8px">How did you feel?</div>' + feelRow(l.feel, { date: a.date, slot: a.slot }) + '<div class="eyebrow" style="margin-top:8px">Perceived effort</div>' + effortRow(l.rpe, { date: a.date, slot: a.slot }) + '</section>';
  var rows = [];
  if (g.teLabel) rows.push(['Primary benefit', TE_LABEL[g.teLabel] || String(g.teLabel).toLowerCase().replace(/_/g, ' ')]);
  if (g.exec) rows.push(['Execution score', g.exec + '%']);
  if (g.gapSpd) rows.push(['Grade-adjusted pace', pace(E.MI_M / g.gapSpd) + ' /mi']);
  if (g.maxSpd && g.maxSpd > 1) rows.push(['Best pace', pace(E.MI_M / g.maxSpd) + ' /mi']);
  if (g.recHR) rows.push(['Recovery heart rate', g.recHR + ' bpm']);
  if (g.stam0 != null && g.stam1 != null) rows.push(['Stamina', Math.round(g.stam0) + '% → ' + Math.round(g.stam1) + '%' + (g.stamMin != null ? ' (low ' + Math.round(g.stamMin) + '%)' : '')]);
  if (g.pwr) rows.push(['Power', g.pwr + ' W avg' + (g.pwrMax ? ' · ' + g.pwrMax + ' max' : '')]);
  if (g.stride) rows.push(['Stride length', (g.stride / 100).toFixed(2) + ' m']);
  if (g.vRatio) rows.push(['Vertical ratio', g.vRatio + '%']);
  if (g.vOsc) rows.push(['Vertical oscillation', g.vOsc + ' cm']);
  if (g.gct) rows.push(['Ground contact', g.gct + ' ms']);
  if (g.cadMax) rows.push(['Max cadence', g.cadMax + ' spm']);
  if (g.tMin != null && g.tMax != null) rows.push(['Temperature', Math.round(g.tMin * 9 / 5 + 32) + '–' + Math.round(g.tMax * 9 / 5 + 32) + ' °F']);
  var det = rows.length ? '<section class="card"><h3>Run details</h3><div class="scroll"><table class="t" style="margin-top:6px"><tbody>' + rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td class="num">' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table></div>' + runTips(g) + '</section>' : '';
  var at = h.indexOf('<section class="card"><h3>Best efforts');
  if (at < 0) at = h.indexOf('<section class="card"><div class="spread"><h3>Shoes');
  return at >= 0 ? h.slice(0, at) + ev + det + h.slice(at) : h + ev + det;
};
function runTips(g) {
  var t = [];
  if (g.cadence && g.cadence < 160) t.push('Cadence ' + g.cadence + ' spm is on the low side. Nudging it up 5% (shorter, quicker steps) lowers the load on your shins.');
  if (g.vRatio && g.vRatio > 9) t.push('Vertical ratio above 9% means a bouncy stride. Think "run tall, quick feet".');
  if (g.exec && g.exec < 60) t.push('Execution under 60%: the run drifted from the planned targets. Check the pace ranges before you start.');
  if (g.stam1 != null && g.stam1 < 30) t.push('You finished with little stamina left. Eat and sleep well tonight before the next key session.');
  return t.length ? '<ul class="plain small" style="margin-top:8px">' + t.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '';
}

/* ---------- lifting: total volume and progressive overload ---------- */
var LOWER = /squat|deadlift|lunge|leg press|hip thrust|rdl|romanian|step.?up|calf|glute bridge|good morning|hamstring|trap bar/i;
var DBELL = /dumbbell|\bdb\b|kettlebell/i;
function setsVolume(ss) { return ss.reduce(function (t, x) { return t + (+x.w || 0) * (+x.r || 0); }, 0); }
function wkVolume(w) { var v = 0; (w || App.wk || { ex: [] }).ex.forEach(function (x) { v += setsVolume(x.sets.filter(function (s) { return s.done; })); }); return v; }
function lbs(v) { return Math.round(v).toLocaleString() + ' lb'; }
function round5(x, inc) { inc = inc || 5; return Math.round(x / inc) * inc; }
function overload(n, rx, date, lp) {
  var h = liftHistory(n, date), tg = rxParse(rx), inc = DBELL.test(n) ? 5 : LOWER.test(n) ? 10 : 5;
  var out = { text: '', w: null, r: tg.reps, plateau: null, kind: 'start' };
  if (!h.length) { out.text = 'First time logging this. Pick a weight you could lift for about ' + (tg.reps + 3) + ' reps, so the last rep of each set feels like a 7 out of 10.'; return out; }
  var last = h[h.length - 1], topW = last.sets.reduce(function (m, s) { return Math.max(m, +s.w || 0); }, 0);
  var lastRpe = ((st().logs || {})[last.date] || {}).lift; lastRpe = lastRpe && lastRpe.rpe;
  if (!topW) {
    var allR = last.sets.every(function (s) { return +s.r >= tg.reps; });
    out.kind = 'bw'; out.text = allR ? 'Bodyweight: you hit ' + last.sets.map(function (s) { return s.r; }).join(', ') + ' reps. Add 1–2 reps per set, or hold a light dumbbell.' : 'Bodyweight: match or beat last time (' + last.sets.map(function (s) { return s.r; }).join(', ') + ' reps).';
    return out;
  }
  if (topW < 40) inc = Math.min(inc, 5);
  var top = last.sets.filter(function (s) { return +s.w === topW; });
  var need = tg.sets;
  var hit = top.length >= need && top.every(function (s) { return +s.r >= tg.reps; });
  var crushed = hit && top.every(function (s) { return +s.r >= tg.reps + 2; });
  /* consecutive sessions stuck at this weight without hitting the target */
  var stuck = 0;
  for (var i = h.length - 1; i >= 0; i--) { var tw = h[i].sets.reduce(function (m, s) { return Math.max(m, +s.w || 0); }, 0); var ts = h[i].sets.filter(function (s) { return +s.w === tw; }); var ok = ts.length >= need && ts.every(function (s) { return +s.r >= tg.reps; }); if (tw === topW && !ok) stuck++; else break; }
  if (lp >= 2) { out.kind = 'hold'; out.w = topW; out.text = (lp === 2 ? 'Peak phase' : 'Light phase') + ': hold ' + topW + ' lb × ' + tg.reps + ' and leave 2–3 reps in reserve. Strength is maintained, not chased, while running is the priority.'; }
  else if (hit && lastRpe && lastRpe >= 9) { out.kind = 'repeat'; out.w = topW; out.text = 'You hit ' + need + '×' + tg.reps + ' at ' + topW + ' lb, but it was a ' + lastRpe + '/10 session. Repeat ' + topW + ' lb and make it look easier before adding weight.'; }
  else if (hit) { out.kind = 'up'; out.w = topW + (crushed ? inc * 2 : inc); out.text = 'You hit all ' + need + '×' + tg.reps + ' at ' + topW + ' lb last time' + (crushed ? ' with reps to spare' : '') + '. Go ' + out.w + ' lb × ' + tg.reps + (DBELL.test(n) ? ' (per hand)' : '') + '.'; }
  else if (stuck >= 2) { out.kind = 'reset'; out.w = round5(topW * 0.9, inc === 10 ? 5 : 2.5); out.text = stuck + ' sessions short of ' + need + '×' + tg.reps + ' at ' + topW + ' lb. Drop to ' + out.w + ' lb, hit every rep, and build back up over 2–3 weeks. You will pass ' + topW + ' with better form.'; }
  else { out.kind = 'reps'; out.w = topW; out.text = 'Stay at ' + topW + ' lb and beat last time (' + last.sets.map(function (s) { return s.r; }).join(', ') + ' reps). Once you hit ' + need + '×' + tg.reps + ', add ' + inc + ' lb.'; }
  /* plateau: 4+ sessions over 3+ weeks with no new best e1RM in the last three */
  if (h.length >= 4 && E.diffD(h[0].date, last.date) >= 21) {
    var recent = h.slice(-3), before = h.slice(0, -3);
    var bR = Math.max.apply(null, recent.map(function (x) { return x.e1; })), bB = Math.max.apply(null, before.map(function (x) { return x.e1; }));
    if (bR <= bB * 1.01) out.plateau = { since: before.filter(function (x) { return x.e1 === bB; })[0].date, best: bB };
  }
  return out;
}
function plateauHTML(n, pl) {
  if (!pl) return '';
  var lower = LOWER.test(n), prot = (st().profile || {}).weightKg;
  var tips = [
    ['Deload, then rebuild', 'One week at about 85% of your working weight with 2 sets, then restart 5–10% below your best and add weight each session.'],
    ['Change the rep range', 'Switch for 3–4 weeks: if you have been doing sets of 8, try 5×5 heavier; if you have been at 5s, try 3×8–10.'],
    ['Add a back-off set', 'After your top sets, one extra set at 80–85% for as many clean reps as you can (stop 2 short of failure).'],
    ['Microload', 'Add 2.5 lb instead of ' + (lower ? '10' : '5') + '. Small jumps keep progress going when big ones stall.'],
    ['Swap the variation', lower ? 'Trade for a close cousin for a block: front squat, trap-bar deadlift, or Bulgarian split squat.' : 'Trade for a close cousin for a block: incline press, dumbbell press, or a paused rep.'],
    ['Check recovery', 'Plateaus during heavy running blocks are normal. Sleep 7.5+ hours and hit your protein target' + (prot ? ' (about ' + Math.round(prot * 1.8) + ' g a day)' : '') + '. Lift after runs, not before key workouts.']
  ];
  return '<div class="banner warn small" style="margin-top:8px"><b>Plateau:</b> no new best e1RM since ' + fmtD(pl.since, { month: 'short', day: 'numeric' }) + ' (' + pl.best + ' lb). Try one of these:<ol class="num" style="margin-top:6px">' + tips.map(function (t) { return '<li><b>' + t[0] + ':</b> ' + t[1] + '</li>'; }).join('') + '</ol></div>';
}
function overloadHTML(x, i, date, lp) {
  var o = overload(x.n, x.rx, date, lp);
  var btn = o.w && o.kind !== 'bw' ? '<button class="btn sm" data-act="wk-apply" data-arg="' + jattr({ i: i, w: o.w, r: o.r }) + '">Use ' + o.w + ' lb</button>' : '';
  return '<div class="overload"><div class="spread"><b class="small">Next step</b>' + btn + '</div><p class="small">' + esc(o.text) + '</p>' + plateauHTML(x.n, o.plateau) + '</div>';
}
ACTIONS['wk-apply'] = function (a) { App.wk.ex[a.i].sets.forEach(function (s) { if (!s.done) { s.w = a.w; if (a.r) s.r = a.r; } }); App.wk.touched = true; wkSave(); keepScroll(render); toast('Set to ' + a.w + ' lb'); };
var _workout = VIEWS.workout;
VIEWS.workout = function () {
  var h = _workout(), w = App.wk;
  if (!w) return h;
  w.ex.forEach(function (x, i) {
    var at = h.indexOf('id="ex' + i + '"'); if (at < 0) return;
    var tb = h.indexOf('<table class="sets">', at); if (tb < 0) return;
    h = h.slice(0, tb) + overloadHTML(x, i, w.date, w.lp) + h.slice(tb);
  });
  var vol = wkVolume(w);
  h = h.replace(' sets</span><button class="btn sm primary" data-act="wk-finish">', ' sets · <b id="wkVol">' + lbs(vol) + '</b></span><button class="btn sm primary" data-act="wk-finish">');
  return h;
};
document.addEventListener('input', function (e) { if (e.target.dataset && e.target.dataset.wk) { var v = $('#wkVol'); if (v) v.textContent = lbs(wkVolume()); } });
var _finish = ACTIONS['wk-finish'];
ACTIONS['wk-finish'] = function () {
  var vol = App.wk ? wkVolume(App.wk) : 0, before = App.wk;
  _finish();
  if (!App.wk && before && vol) setTimeout(function () { toast('Workout saved · ' + lbs(vol) + ' lifted'); }, 50);
};
var _liftSummary = liftSummaryCard;
liftSummaryCard = function (date, l) {
  var h = _liftSummary(date, l);
  if (!h || !l || !l.ex) return h;
  var tot = 0; Object.keys(l.ex).forEach(function (n) { tot += setsVolume(setsOf(l.ex[n])); });
  return h.replace('<h3>Lifts</h3>', '<div class="spread"><h3>Lifts</h3><span class="pill">' + lbs(tot) + ' total volume</span></div>').replace(/<div class="d mono small">(e1RM \d+)?<\/div>/g, function (m) { return m; });
};
var _progStrength = progStrength;
progStrength = function () {
  var h = _progStrength(), by = liftSeriesAll(), names = Object.keys(by);
  if (!names.length) return h;
  var top = names.map(function (n) { return { n: n, e1: by[n].reduce(function (m, x) { return Math.max(m, x.e1); }, 0) }; }).sort(function (a, b) { return b.e1 - a.e1; });
  var sel = App.ui.lift && by[App.ui.lift] ? App.ui.lift : top[0].n;
  var mod = findEx(sel), lp = (App.week && App.week.days.map(function (d) { return d.parts.filter(function (p) { return p.type === 'strength'; })[0]; }).filter(Boolean)[0] || { lp: 0 }).lp;
  var rx = mod ? mod.rx[lp] : (by[sel][by[sel].length - 1].sets.length + '×' + by[sel][by[sel].length - 1].sets[0].r);
  var o = overload(sel, rx, E.addD(App.today, 1), lp);
  var vols = by[sel].slice(-8).map(function (x) { return setsVolume(x.sets); });
  var card = '<section class="card"><div class="eyebrow">Progressive overload · ' + esc(sel) + '</div><p style="margin-top:6px">' + esc(o.text) + '</p>' + plateauHTML(sel, o.plateau) + (vols.length >= 2 ? lineChart(by[sel].slice(-8).map(function (x) { return x.date; }), [{ name: 'Session volume (lb)', vals: vols, color: 'var(--gold)', fmt: function (v) { return Math.round(v).toLocaleString(); } }]) : '') + '</section>';
  var at = h.indexOf('<div class="sechead"><h2>Graph</h2>');
  return at >= 0 ? h.slice(0, at) + card + h.slice(at) : h + card;
};

/* ---------- fueling: exact numbers from your synced weight and Garmin calories ---------- */
function median(a) { a = a.filter(function (x) { return typeof x === 'number' && isFinite(x); }).sort(function (x, y) { return x - y; }); if (!a.length) return null; var m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
function latestWeight() {
  var w = Store.garmin && Store.garmin.fitness && Store.garmin.fitness.weight, t = App.today;
  if (w) { var ds = Object.keys(w).filter(function (d) { return d <= t && E.diffD(d, t) <= 180; }).sort(); if (ds.length) { var d = ds[ds.length - 1]; return { lb: +w[d], date: d, src: 'garmin' }; } }
  var p = st().profile || {};
  if (p.weightKg) return { lb: Math.round(p.weightKg * 2.2046 * 10) / 10, date: null, src: 'you' };
  return null;
}
function burnModel() {
  var g = Store.garmin, t = App.today, days = g && g.days || {}, acts = g && g.activities || [];
  var rest = [], neat = [], perMi = [], perMinLift = [];
  var restMed = null;
  for (var i = 1; i <= 21; i++) { var d = E.addD(t, -i), r = days[d]; if (r && r.kcalRest > 1000) rest.push(r.kcalRest); }
  restMed = median(rest);
  var byDate = {}; acts.forEach(function (a) { if (a.date && a.calories) (byDate[a.date] = byDate[a.date] || []).push(a); });
  var net = function (a) { return Math.max(0, (a.calories || 0) - (restMed || 1800) * (a.durS || 0) / 86400); };
  for (var j = 1; j <= 21; j++) { var dd = E.addD(t, -j), rr = days[dd]; if (!rr || rr.kcalActive == null) continue; var ex = (byDate[dd] || []).reduce(function (s, a) { return s + net(a); }, 0); neat.push(Math.max(0, rr.kcalActive - ex)); }
  acts.forEach(function (a) { if (!a.calories || !a.date || E.diffD(a.date, t) > 90) return; if (a.run && a.distM > 1500) perMi.push(net(a) / (a.distM / E.MI_M)); else if (a.strength && a.durS > 600) perMinLift.push(net(a) / (a.durS / 60)); });
  return { rest: restMed, neat: median(neat), perMi: median(perMi), perMinLift: median(perMinLift), today: days[t] || null, byDate: byDate, net: net };
}
function fuelPlan(date) {
  date = date || App.today;
  var day = dayOf(date), wt = latestWeight(), bm = burnModel(), prof = st().profile || {};
  var nu = E.nutrition(day, wt ? wt.lb / 2.2046 : null, zonesAt(date), dayOf(E.addD(date, 1)), App.rd, null);
  if (!wt) return { nu: nu, missing: true };
  var kg = wt.lb / 2.2046, lb = wt.lb;
  var rest = bm.rest || Math.round(kg * 22), neat = bm.neat != null ? bm.neat : Math.round(kg * 5);
  var perMi = bm.perMi || lb * 0.63, perMinLift = bm.perMinLift || 4.5;
  var parts = [], planned = 0, done = 0;
  (day ? day.parts : []).forEach(function (p) {
    if (p.type === 'rest') return;
    var k = E.isRun(p) ? p.mi * perMi : p.type === 'strength' ? (p.min || 45) * perMinLift : (p.min || 30) * 5;
    var isDone = partDone(date, p);
    parts.push({ t: p.title + (E.isRun(p) ? ' ' + mi(p.mi) + ' mi' : p.min ? ' ' + p.min + ' min' : ''), k: Math.round(k), done: isDone });
    if (!isDone) planned += k;
  });
  /* anything you already did today, from Garmin (counts even if it was not in the plan) */
  (bm.byDate[date] || []).forEach(function (a) { done += bm.net(a); });
  if (done) parts.forEach(function (x) { if (x.done) x.k = 0; });
  var training = Math.round(planned + done);
  var target = rest + neat + training;
  var hardDay = nu.tier === 'High' || nu.tier === 'Very high';
  var goal = prof.bodyGoal || 'maintain', adj = 0;
  if (goal === 'lose') adj = hardDay ? 0 : nu.tier === 'Moderate' ? -250 : -400;
  if (goal === 'gain') adj = 300;
  target = Math.round((target + adj) / 10) * 10;
  var carbMid = (nu.carbGkg[0] + nu.carbGkg[1]) / 2, protMid = (nu.protGkg[0] + nu.protGkg[1]) / 2 + (goal === 'lose' ? 0.2 : 0);
  var P = round5(kg * protMid), C = round5(kg * carbMid), minFat = kg * 0.8;
  var F = (target - 4 * P - 4 * C) / 9;
  if (F < minFat) { C = Math.max(round5(kg * nu.carbGkg[0]), round5((target - 4 * P - 9 * minFat) / 4)); F = (target - 4 * P - 4 * C) / 9; }
  if (F < minFat) F = minFat;
  F = round5(F);
  var eaten = bm.today && bm.today.kcalEaten;
  return { nu: nu, wt: wt, kg: kg, rest: Math.round(rest), neat: Math.round(neat), training: training, parts: parts, adj: adj, goal: goal, kcal: target, P: P, C: C, F: F, eaten: eaten || null, est: !bm.rest, fluidL: E.round1(kg * 0.035 + (nu.load.min / 60) * 0.6) };
}
function fuelCardHTML(fp, link) {
  if (fp.missing) return '<a class="card" href="#/settings" style="text-decoration:none;color:inherit;display:block"><div class="eyebrow">' + fp.nu.tier + ' training day</div><p class="small" style="margin-top:6px">Add your weight (or weigh in on a Garmin-connected scale) for exact calories, carbs and protein.</p></a>';
  var tag = link ? 'a class="card fuel" href="#/nutrition" style="text-decoration:none;color:inherit;display:block"' : 'section class="card fuel"';
  return '<' + tag + '><div class="spread"><div class="eyebrow">' + fp.nu.tier + ' training day</div><span class="tiny muted">' + (fp.goal === 'lose' ? 'Lose slowly' : fp.goal === 'gain' ? 'Gain' : 'Maintain') + '</span></div>' +
    '<div class="kcal"><b>' + fp.kcal.toLocaleString() + '</b><span>kcal today</span></div>' +
    '<div class="grid3"><div class="metric"><span>Carbs</span><b>' + fp.C + ' g</b></div><div class="metric"><span>Protein</span><b>' + fp.P + ' g</b></div><div class="metric"><span>Fat</span><b>' + fp.F + ' g</b></div></div>' +
    (fp.eaten ? '<div class="bar" style="margin-top:10px"><i style="width:' + Math.min(100, Math.round(fp.eaten / fp.kcal * 100)) + '%"></i></div><p class="small muted" style="margin-top:4px">Eaten so far (Garmin): ' + fp.eaten.toLocaleString() + ' kcal · ' + Math.max(0, fp.kcal - fp.eaten).toLocaleString() + ' to go</p>' : '') +
    '<p class="tiny muted" style="margin-top:8px">' + (fp.est ? 'Estimated burn' : 'From Garmin') + ': resting ' + fp.rest.toLocaleString() + ' + daily movement ' + fp.neat.toLocaleString() + ' + training ' + fp.training.toLocaleString() + (fp.adj ? ' ' + (fp.adj > 0 ? '+ ' : '− ') + Math.abs(fp.adj) : '') + ' kcal. Weight ' + fp.wt.lb + ' lb' + (fp.wt.date ? ' (Garmin, ' + fmtD(fp.wt.date, { month: 'short', day: 'numeric' }) + ')' : ' (your profile)') + '.' + (fp.wt.date && E.diffD(fp.wt.date, App.today) > 30 ? ' Weigh in to keep this accurate.' : '') + '</p></' + (link ? 'a' : 'section') + '>';
}
ACTIONS.bodygoal = function (a) { Store.edit('profile', null, function (S) { S.profile.bodyGoal = a.v; }); toast('Fueling goal saved'); };
var _today2 = VIEWS.today;
VIEWS.today = function () {
  var h = _today2();
  if (!App.plan) return h;
  try {
    var fp = fuelPlan(App.today);
    h = h.replace(/<div class="sechead"><h2>Fuel today<\/h2><a href="#\/nutrition">Details<\/a><\/div><a class="card" href="#\/nutrition"[\s\S]*?<\/a>/, '<div class="sechead"><h2>Fuel today</h2><a href="#/nutrition">Details</a></div>' + fuelCardHTML(fp, true));
  } catch (e) { console.error(e); }
  var hc = honestCard();
  if (hc) { var at = h.indexOf('<section class="card lv-'); h = at >= 0 ? h.slice(0, at) + hc + h.slice(at) : h + hc; }
  return h;
};
var _nutrition = VIEWS.nutrition;
VIEWS.nutrition = function () {
  var h = _nutrition(), fp = fuelPlan(App.today), goal = (st().profile || {}).bodyGoal || 'maintain';
  var top = fuelCardHTML(fp, false) + '<section class="card stack"><h3>Your goal</h3><div class="chips">' + [['maintain', 'Maintain weight'], ['lose', 'Lose slowly'], ['gain', 'Gain']].map(function (x) { return '<button class="chip" data-act="bodygoal" data-arg="' + jattr({ v: x[0] }) + '" aria-pressed="' + (goal === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div><p class="tiny muted">Losing slowly trims 250–400 kcal on easy and rest days only. Long-run and hard days stay fully fueled, because under-fueling is a major cause of bone stress injuries in runners.</p>' +
    (fp.parts && fp.parts.length ? '<div class="scroll"><table class="t"><tbody>' + fp.parts.map(function (x) { return '<tr><td>' + esc(x.t) + '</td><td class="num">' + (x.done ? 'done' : '~' + x.k + ' kcal') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') + '</section>';
  var i = 0, w = App.week;
  h = h.replace(/<div class="grid3"><div class="metric"><span>Carbs<\/span>[\s\S]*?<span>Fluids<\/span><b>[^<]*<\/b><\/div><\/div>/g, function (m) {
    var d = w && w.days[i++]; if (!d) return m;
    var f = fuelPlan(d.date); if (f.missing) return m;
    return '<div class="grid4"><div class="metric"><span>Calories</span><b>' + f.kcal.toLocaleString() + '</b></div><div class="metric"><span>Carbs</span><b>' + f.C + ' g</b></div><div class="metric"><span>Protein</span><b>' + f.P + ' g</b></div><div class="metric"><span>Fat</span><b>' + f.F + ' g</b></div></div><p class="tiny muted">Fluids about ' + f.fluidL + ' L, more in heat.</p>';
  });
  if (fp.wt) h = h.replace(/Daily targets scale with your training load and recovery\. [^<]*(<a href="#\/settings">Add your weight<\/a> for gram targets\.)?/, 'Daily targets from your weight (' + fp.wt.lb + ' lb), your Garmin calorie burn and each day\'s training. ');
  var at = h.indexOf('</div>', h.indexOf('class="pagehead"')) + 6;
  return h.slice(0, at) + top + h.slice(at);
};

/* ---------- honest consistency check ---------- */
function honestCard() {
  var c = App.plan && App.plan.compliance;
  if (!c || c.level === 'ok') return '';
  var wk = c.weeks.slice().reverse();
  var lines = wk.map(function (x) { return 'Week ' + x.n + ': ' + mi(x.act) + ' of ' + mi(x.planned) + ' mi (' + Math.round(x.pct * 100) + '%)' + (x.keyP ? ', ' + x.keyD + ' of ' + x.keyP + ' key runs' : ''); });
  var cap = c.cap;
  var ev = nextRace(), msg = '';
  if (ev && ev.goal && App.an) {
    var d = E.distOf(ev), g = E.parseClock(ev.goal), pr = E.predict(App.an.vNow, d.mi), wksLeft = Math.round(E.diffD(App.today, ev.date) / 7);
    var gap = (pr - g) / g;
    if (gap > 0.03) msg = 'Today\'s fitness predicts ' + E.clock(pr) + ' for ' + esc(ev.name || d.label) + ' against your ' + esc(ev.goal) + ' goal. ' + wksLeft + ' weeks is enough to close that gap only if most weeks get done. ' + (c.level === 'verylow' && wksLeft < 20 ? 'If the next few weeks look like the last two, it is worth moving the goal to around ' + E.clock(Math.round(pr * 0.985 / 60) * 60) + '.' : 'Consistency matters more than any single workout.');
  }
  return '<section class="card honest"><div class="eyebrow">Honest check-in</div><h3 style="margin-top:2px">' + (c.level === 'verylow' ? 'You are running well under the plan' : 'You are a bit behind the plan') + '</h3><ul class="plain small" style="margin-top:6px">' + lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>' +
    '<p class="small" style="margin-top:8px">' + (cap ? 'Jumping straight back to the full plan is how shin splints start, so this week is capped at <b>' + mi(cap.mi) + ' mi</b> (planned ' + mi(cap.planned) + ')' + (cap.long ? ' and the long run at <b>' + cap.long + ' mi</b>' : '') + '. Hit these and next week builds again.' : 'This week is already within a safe step of what you have been running. Aim to get every run in.') + '</p>' +
    (msg ? '<p class="small muted" style="margin-top:6px">' + msg + '</p>' : '') +
    '<div class="btns" style="margin-top:10px"><a class="btn sm" href="#/editweek/' + (App.week ? App.week.n : 1) + '">Rearrange this week</a><a class="btn sm ghost" href="#/settings">Fewer run days</a>' + (msg ? '<a class="btn sm ghost" href="#/goals">Review goal</a>' : '') + '</div></section>';
}

/* ---------- drag-and-drop week editor ---------- */
TITLES.editweek = 'Edit week';
TABOF.editweek = 'plan';
function partKeyOf(d, p) { return p.akey || E.partKey(p.moved || d.date, p); }
VIEWS.editweek = function () {
  var p = App.plan; if (!p) return setupNeeded();
  var n = E.clamp(+App.args[0] || (App.week ? App.week.n : 1), 1, p.weeks.length), w = p.weeks[n - 1], t = App.today;
  var sel = App.ui.edSel || null;
  var html = '<div class="pagehead"><h1>Week ' + w.n + '</h1><p>' + fmtD(w.start, { month: 'short', day: 'numeric' }) + ' – ' + fmtD(w.end, { month: 'short', day: 'numeric' }) + '. Drag a session to another day, or tap it and then tap a day. The plan checks the new layout as you go.</p></div>';
  html += '<div class="pager" style="margin-bottom:4px"><a class="iconbtn" href="#/editweek/' + Math.max(1, n - 1) + '" aria-label="Previous week">‹</a><b>' + mi(w.tot.mi) + ' mi · ' + w.tot.runs + ' runs · ' + w.tot.lifts + ' gym</b><a class="iconbtn" href="#/editweek/' + Math.min(p.weeks.length, n + 1) + '" aria-label="Next week">›</a></div>';
  html += '<section class="card edweek">' + w.days.map(function (d) {
    var chips = d.parts.filter(function (x) { return x.type !== 'rest'; }).map(function (x) {
      var k = partKeyOf(d, x), done = partDone(d.date, x);
      return '<div class="edchip t-' + x.type + (sel === k ? ' sel' : '') + (done ? ' dn' : '') + '" data-edkey="' + esc(k) + '" data-from="' + d.date + '"><span class="grip">⋮⋮</span><span class="tx"><b>' + esc(x.title) + '</b><small>' + (E.isRun(x) ? mi(x.mi) + ' mi' : x.min ? x.min + ' min' : '') + (x.moved ? ' · from ' + E.DOW[E.dow(x.moved)] : '') + (done ? ' · done' : '') + '</small></span></div>';
    }).join('');
    return '<div class="edday' + (d.date === t ? ' today' : '') + (d.date < t ? ' past' : '') + '" data-edday="' + d.date + '"><div class="d">' + d.dow + '<b>' + E.pd(d.date).getDate() + '</b></div><div class="items">' + (chips || '<span class="restlbl">Rest</span>') + '</div></div>';
  }).join('') + '</section>';
  /* intensity check */
  var warns = E.weekIntensity(w, st().profile);
  html += '<div class="sechead"><h2>Check</h2></div>';
  html += warns.length ? '<div class="stack tight">' + warns.map(function (x) { return '<div class="banner ' + (x.level === 'warn' ? 'warn' : 'info') + ' small">' + esc(x.text) + (x.fix ? '<div class="btns" style="margin-top:8px"><button class="btn sm" data-act="edfix" data-arg="' + jattr(x.fix) + '">' + esc(x.fix.label) + '</button></div>' : '') + '</div>'; }).join('') + '</div>' : '<div class="banner small"><b style="color:var(--green)">Looks good.</b> Hard days are spaced out, there is a rest day, and no heavy legs before the long run.</div>';
  var hasArr = Object.keys(st().arr || {}).some(function (k) { var d0 = k.split('|')[0]; return d0 >= w.start && d0 <= w.end; });
  html += '<div class="btns"><a class="btn primary" href="#/plan/' + w.n + '">Done</a>' + (hasArr ? '<button class="btn ghost" data-act="ed-reset" data-arg="' + jattr({ start: w.start, end: w.end }) + '">Reset to plan</button>' : '') + '</div>';
  html += '<p class="tiny muted">Rules of thumb: keep an easy day or rest between hard sessions, no heavy leg day right before the long run, and at least one full rest day. Moves only apply to this week.</p>';
  return html;
};
function edMove(key, to) {
  var orig = key.split('|')[0];
  Store.edit('arr', key, function (S) { S.arr = S.arr || {}; if (to === orig) delete S.arr[key]; else S.arr[key] = to; });
  App.ui.edSel = null;
}
ACTIONS['ed-reset'] = function (a) {
  var ks = Object.keys(st().arr || {}).filter(function (k) { var d0 = k.split('|')[0]; return d0 >= a.start && d0 <= a.end; });
  Store.editMany(ks.map(function (k) { return ['arr', k]; }), function (S) { ks.forEach(function (k) { delete S.arr[k]; }); });
  toast('Week reset to the plan');
};
ACTIONS.edfix = function (f) {
  if (f.type === 'move') { edMove(f.key, f.to); toast('Moved'); return; }
  if (f.type === 'override') { setOverride(f.date, f.action, 'too many hard days in a row'); toast('Changed to an easy run'); return; }
  if (f.type === 'lift') { Store.edit('overrides', f.date, function (S) { S.overrides[f.date] = { action: 'light lift', lift: 'light', reason: 'long run tomorrow', at: new Date().toISOString() }; }); toast('Lift set to light'); }
};
/* pointer drag (touch and mouse), with tap-to-move as a fallback */
(function () {
  var drag = null;
  function dayAt(x, y) { var el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('[data-edday]') : null; }
  document.addEventListener('pointerdown', function (e) {
    var c = e.target.closest && e.target.closest('.edchip'); if (!c || e.button > 0) return;
    drag = { el: c, key: c.dataset.edkey, from: c.dataset.from, x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.on && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 8) {
      drag.on = true;
      var r = drag.el.getBoundingClientRect();
      drag.ghost = drag.el.cloneNode(true); drag.ghost.classList.add('ghost');
      drag.ghost.style.width = r.width + 'px'; drag.dx = e.clientX - r.left; drag.dy = e.clientY - r.top;
      document.body.appendChild(drag.ghost); drag.el.classList.add('lifted');
      try { drag.el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    }
    if (!drag.on) return;
    e.preventDefault();
    drag.ghost.style.transform = 'translate(' + (e.clientX - drag.dx) + 'px,' + (e.clientY - drag.dy) + 'px)';
    $$('.edday.over').forEach(function (d) { d.classList.remove('over'); });
    var d = dayAt(e.clientX, e.clientY); if (d) d.classList.add('over');
    if (e.clientY < 90) window.scrollBy(0, -12); else if (e.clientY > window.innerHeight - 120) window.scrollBy(0, 12);
  }, { passive: false });
  function end(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dd = drag;
    drag = null;
    if (!dd.on) return;   /* a tap: handled by click */
    dd.ghost.remove(); dd.el.classList.remove('lifted');
    $$('.edday.over').forEach(function (d) { d.classList.remove('over'); });
    var t = dayAt(e.clientX, e.clientY);
    if (t && t.dataset.edday !== dd.from) { edMove(dd.key, t.dataset.edday); toast('Moved to ' + E.DOW_LONG[E.dow(t.dataset.edday)]); }
    edMove.justDragged = Date.now();
  }
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', function (e) { if (drag && drag.ghost) { drag.ghost.remove(); drag.el.classList.remove('lifted'); } drag = null; });
  document.addEventListener('click', function (e) {
    if (App.view !== 'editweek' || Date.now() - (edMove.justDragged || 0) < 300) return;
    var c = e.target.closest('.edchip');
    if (c) { App.ui.edSel = App.ui.edSel === c.dataset.edkey ? null : c.dataset.edkey; render(); return; }
    var d = e.target.closest('[data-edday]');
    if (d && App.ui.edSel) {
      var from = ($('.edchip.sel') || {}).dataset;
      if (from && from.from !== d.dataset.edday) { edMove(App.ui.edSel, d.dataset.edday); toast('Moved to ' + E.DOW_LONG[E.dow(d.dataset.edday)]); } else { App.ui.edSel = null; render(); }
    }
  });
})();
/* plan view: edit button, honest card, and warnings when you have rearranged the week */
var _plan2 = VIEWS.plan;
VIEWS.plan = function () {
  var h = _plan2(), p = App.plan; if (!p) return h;
  var cur = App.week ? App.week.n : 1, sel = E.clamp(+App.args[0] || cur, 1, p.weeks.length), w = p.weeks[sel - 1];
  var i = h.lastIndexOf('<div class="btns"><button class="btn sm" data-act="sheet"');
  if (i >= 0) h = h.slice(0, i) + '<div class="btns"><a class="btn sm primary" href="#/editweek/' + w.n + '">Edit week</a>' + h.slice(i + '<div class="btns">'.length);
  var rearranged = w.days.some(function (d) { return d.parts.some(function (x) { return x.akey; }); });
  if (rearranged) {
    var warns = E.weekIntensity(w, st().profile).filter(function (x) { return x.level === 'warn'; });
    if (warns.length) { var j = h.indexOf('<div class="stack"><div class="dayblock'); var b = '<div class="banner warn small"><b>Your new layout is intense.</b> ' + esc(warns[0].text) + ' <a href="#/editweek/' + w.n + '">Fix it</a></div>'; h = j >= 0 ? h.slice(0, j) + b + h.slice(j) : h + b; }
  }
  if (sel === cur) { var hc = honestCard(); if (hc) { var k = h.indexOf('<section class="card"><div class="spread"><h3>Your season'); h = k >= 0 ? h.slice(0, k) + hc + h.slice(k) : hc + h; } }
  return h;
};
