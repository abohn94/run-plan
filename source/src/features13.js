/* ================= Run recap: what you see right after a run syncs =================
   verdict · compared with similar runs (grade-adjusted, at the same heart rate) · records · what it means for
   tomorrow · the week so far · a 10-second check-in · recovery prompts. Opens once by itself after a new run
   syncs, and stays at the top of that day's page. ================= */

function actById(id) { var g = Store.garmin; if (!g || !g.activities || !id) return null; for (var i = g.activities.length - 1; i >= 0; i--) if (String(g.activities[i].id) === String(id)) return g.activities[i]; return null; }
/* the kind of run, for finding similar ones */
function runClass(ptype, title) {
  if (ptype === 'race') return 'race';
  if (ptype === 'long') return 'long';
  if (ptype === 'speed') return 'speed:' + String(title || '').toLowerCase().replace(/\d+(\.\d+)?\s*(mi|×|x|k|m|min|s)?/g, '').replace(/[^a-z]+/g, ' ').trim();
  return 'easy';
}
/* treadmill pace and heart rate don't compare with the road, so they're matched separately */
function isTread(a, p) { return /treadmill|indoor/i.test((a && (a.type + ' ' + a.name)) || '') || !!(p && p.treadmill); }
function speedOf(a) { return a && a.gapSpd > 0 ? a.gapSpd : a && a.distM > 0 && (a.movS || a.durS) ? a.distM / (a.movS || a.durS) : null; }
/* every run you've logged that has a watch activity, with its class */
function classedRuns() {
  var logs = st().logs || {}, out = [];
  Object.keys(logs).forEach(function (d) { ['run', 'xrun'].forEach(function (k) { var r = logs[d][k]; if (!r || r.skip || !r.gid) return; var a = actById(r.gid); if (!a) return; var pp = dayOf(d) && dayOf(d).parts.filter(E.isRun)[0]; out.push({ date: d, slot: k, r: r, a: a, cls: runClass(r.ptype, (pp || {}).title || r.name) + (isTread(a, pp) ? ':tm' : '') }); }); });
  return out.sort(function (x, y) { return x.date < y.date ? -1 : 1; });
}
function recapData(date, slot) {
  slot = slot || 'run';
  var r0 = logOf(date)[slot]; if (!r0 || r0.skip || !(+r0.mi > 0)) return null;
  var a = actById(r0.gid), r = Object.assign({}, r0, { hr: r0.hr || (a && a.avgHR) || null }), day = dayOf(date), p = day && day.parts.filter(function (x) { return E.isRun(x); })[0];
  var kind = r.ptype || (p && p.type) || 'easy', cls = runClass(kind, (p && p.title) || r.name) + (isTread(a, p) ? ':tm' : '');
  var laps = r.gid ? lapsFor(r.gid) : null, zz = _zonesAt7(date) || {};
  var ex = null, du = null; try { if (laps && p && p.steps) ex = E.execution(p, zz, laps); if (laps) du = E.durability(laps); } catch (e) { ex = null; }
  var paceS = r.sec && r.mi ? r.sec / r.mi : null;
  /* verdict */
  var verdict = '', tone = 'ok';
  if (kind === 'speed' && ex && ex.of) {
    var all = []; ex.rows.forEach(function (x) { if (x.target && x.pace && x.ok === false && !/WARMUP|COOLDOWN|RECOVERY|REST/.test(x.type)) all.push(x.pace < x.target[0] ? x.pace - x.target[0] : x.pace - x.target[1]); });
    var m = all.length ? Math.round(all.reduce(function (s, v) { return s + v; }, 0) / all.length) : 0;
    verdict = ex.hit === ex.of ? 'Nailed it: every work lap on target.' : ex.hit / ex.of >= 0.7 ? 'On target: ' + ex.hit + ' of ' + ex.of + ' work laps in range.' : m < 0 ? 'Faster than planned: ' + ex.hit + ' of ' + ex.of + ' laps in range, the rest about ' + (-m) + ' s/mi quick.' : 'Tough day: ' + ex.hit + ' of ' + ex.of + ' laps in range, the rest about ' + m + ' s/mi slow.';
    tone = ex.hit / ex.of >= 0.7 ? 'ok' : m < 0 ? 'mid' : 'low';
  } else if (p && p.timed) {
    /* comeback run-walk or timed run: finishing is the whole job */
    var wk0 = App.plan && E.weekOf(App.plan, date), cbw = wk0 && wk0.comeback;
    verdict = (cbw ? 'Comeback week ' + cbw.week + ' of ' + cbw.of + ': ' : '') + (r.sec >= (p.min || 0) * 60 * 0.9 ? 'done, all ' + Math.round(r.sec / 60) + ' minutes. That\'s the whole job.' : Math.round(r.sec / 60) + ' of ' + p.min + ' minutes. Stopping early is fine when something feels off.');
    tone = r.sec >= (p.min || 0) * 60 * 0.9 ? 'ok' : 'mid';
  } else if (kind === 'speed') { verdict = 'Workout done. The lap-by-lap check appears once your laps sync from Garmin.'; tone = 'mid';
  } else if (kind === 'race') { verdict = 'Race done: ' + mi(r.mi) + ' mi in ' + E.clock(r.sec) + '.'; }
  else {
    var e = zz.E, hrz = zz.hr && zz.hr.E;
    var hotHr = r.hr && hrz && r.hr > hrz[1] + 3, fastE = paceS && e && paceS < e[0] - 15;
    verdict = kind === 'long' ? (du && du.decouple > 8 ? 'Long run done, but heart rate drifted ' + du.decouple + '% late. Fuel and pace the first half easier next time.' : 'Long run done' + (du ? ', and you held steady to the end (drift ' + du.decouple + '%).' : '.')) :
      hotHr ? 'Easy run, but heart rate ran high (' + r.hr + ' avg). Slow down a little next time.' : fastE && r.hr && hrz && r.hr <= hrz[1] ? 'Quicker than the easy range, but your heart rate stayed easy (' + r.hr + '). That\'s fitness showing.' : fastE ? 'A bit quick for an easy day. Easy days make the hard days work.' : 'Easy, as planned.';
    tone = hotHr || (fastE && !(r.hr && hrz && r.hr <= hrz[1])) || (du && du.decouple > 8) ? 'mid' : 'ok';
  }
  /* similar runs: the same kind, a similar distance, the last 120 days */
  var sim = [], cmp = null;
  if (a && r.hr && !(p && p.timed)) {
    sim = classedRuns().filter(function (x) { return x.date < date && E.diffD(x.date, date) <= 120 && x.cls === cls && x.a.avgHR && Math.abs(x.r.mi - r.mi) <= Math.max(1, r.mi * 0.35); }).slice(-3);
    var me = speedOf(a);
    if (sim.length && me) {
      var effNow = me / a.avgHR, effThen = sim.reduce(function (s, x) { return s + speedOf(x.a) / x.a.avgHR; }, 0) / sim.length;
      var paceNow = E.MI_M / me, paceThenSameHr = E.MI_M / (effThen * a.avgHR), dPace = Math.round(paceNow - paceThenSameHr);
      var tNow = a.tMax, tThen = sim.reduce(function (s, x) { return s + (x.a.tMax || 0); }, 0) / sim.length;
      cmp = { n: sim.length, d: dPace, pct: Math.round((effNow / effThen - 1) * 1000) / 10, gap: !!a.gapSpd, warmer: tNow && tThen && tNow - tThen >= 5, cooler: tNow && tThen && tThen - tNow >= 5,
        last: sim[sim.length - 1], rows: sim.map(function (x) { return { date: x.date, mi: x.r.mi, pace: x.r.sec / x.r.mi, hr: x.a.avgHR }; }) };
    }
  }
  /* records */
  var recs = [], runs = classedRuns(), prior = runs.filter(function (x) { return x.date < date; });
  var longest90 = prior.filter(function (x) { return E.diffD(x.date, date) <= 90; }).reduce(function (s, x) { return Math.max(s, +x.r.mi || 0); }, 0);
  if (r.mi >= 3 && prior.length >= 4 && r.mi > longest90 + 0.05) recs.push('Longest run in 90 days');
  if (App.plan && r.mi >= 3 && prior.filter(function (x) { return x.date >= App.plan.start; }).length >= 3 && r.mi > prior.filter(function (x) { return x.date >= App.plan.start; }).reduce(function (s, x) { return Math.max(s, +x.r.mi || 0); }, 0) + 0.05 && recs.indexOf('Longest run in 90 days') < 0) recs.push('Longest run of this plan');
  if (a && a.best) [['1mi', 'mile'], ['5k', '5K'], ['10k', '10K'], ['half', 'half marathon']].forEach(function (k) {
    var v = +a.best[k[0]]; if (!(v > 0)) return;
    var older = ((Store.garmin || {}).activities || []).filter(function (x) { return x.run && x.best && +x.best[k[0]] > 0 && x.date < date && E.diffD(x.date, date) <= 365; });
    if (older.length >= 3 && older.every(function (x) { return v < +x.best[k[0]]; })) recs.push('Fastest ' + k[1] + ' in a year (' + E.clock(Math.round(v)) + ')');
  });
  if (kind === 'speed' && cmp && cmp.d <= -5) recs.push('Best ' + (p ? p.title.toLowerCase() : 'session') + ' at this heart rate');
  /* the week so far */
  var w = App.plan && E.weekOf(App.plan, date), wk = null;
  if (w) {
    var plannedMi = w.days.reduce(function (s, d) { return s + d.parts.filter(E.isRun).reduce(function (t, x) { return t + (x.mi || 0); }, 0); }, 0);
    var done = w.days.reduce(function (s, d) { return s + dayRun(d); }, 0);
    var keyLeft = w.days.filter(function (d) { return d.date > date && d.parts.some(function (x) { return x.type === 'long' || x.type === 'speed'; }); }).map(function (d) { return d.parts.filter(function (x) { return x.type === 'long' || x.type === 'speed'; })[0].title; });
    wk = { done: done, planned: plannedMi, keyLeft: keyLeft };
  }
  /* tomorrow, with Garmin's recovery time */
  var tmr = null, td = dayOf(E.addD(date, 1));
  if (td) {
    var real = td.parts.filter(function (x) { return x.type !== 'rest'; }), hard = real.some(function (x) { return x.type === 'speed' || x.type === 'long' || x.type === 'race'; });
    var rv = null; try { rv = date === App.today ? recoveryLeft(App.today) : null; } catch (e) { rv = null; }
    var line = real.length ? real.map(function (x) { return x.title + (E.isRun(x) && x.mi ? ' ' + mi(x.mi) + ' mi' : ''); }).join(' + ') : 'Rest';
    var note = '';
    if (rv && rv.left > 0 && rv.end) { var hrsToRun = 24; note = hard ? (rv.left > hrsToRun ? 'Garmin has you recovering until ' + rv.untilTxt.replace(/^until /, '') + ', so take the start easy or swap it in the morning.' : 'Garmin recovery ends ' + rv.untilTxt.replace(/^until /, '') + ', in time for it.') : 'Garmin recovery: ' + Math.ceil(rv.left) + ' h. An easy day fits.'; }
    else if (hard) note = 'Sleep and fuel tonight set it up.';
    tmr = { line: line, note: note, hard: hard };
  }
  /* recovery prompts */
  var kg = +(st().profile || {}).weightKg || 0, hardRun = kind === 'speed' || kind === 'long' || kind === 'race' || (r.sec || 0) >= 75 * 60;
  var fuel = kg && (hardRun || (r.sec || 0) >= 45 * 60) ? { carb: Math.round(kg * (hardRun ? 1.0 : 0.6) / 5) * 5, pro: Math.round(kg * 0.3 / 5) * 5 } : null;
  var sw = ((st().prefs || {}).sweat || []).slice(-1)[0], fluid = sw && r.sec ? Math.round(sw.ozh * r.sec / 3600 * 1.25) : null;
  var shin = hardRun && (st().profile || {}).injuryProne;
  return { date: date, slot: slot, r: r, a: a, p: p, kind: kind, ex: ex, du: du, verdict: verdict, tone: tone, cmp: cmp, recs: recs, wk: wk, tmr: tmr, fuel: fuel, fluid: fluid, shin: shin, long: kind === 'long' || r.mi >= 10 };
}
function rchip(arg, label, on) { return '<button type="button" class="chip" data-act="rcp" data-arg="' + jattr(arg) + '" aria-pressed="' + (!!on) + '">' + label + '</button>'; }
function recapHTML(date, slot, inSheet) {
  var R = recapData(date, slot); if (!R) return '';
  var r = R.r, ar = { date: R.date, slot: R.slot };
  var head = '<div class="eyebrow">Run recap · ' + fmtD(date, { weekday: 'short', month: 'short', day: 'numeric' }) + '</div>' +
    '<h3 class="rc-title">' + esc((R.p && R.p.title) || r.name || 'Run') + '</h3>' +
    '<div class="rc-stats"><span><b>' + mi(r.mi) + '</b> mi</span><span><b>' + (r.sec ? E.clock(r.sec) : '–') + '</b></span><span><b>' + (r.sec ? pace(r.sec / r.mi) : '–') + '</b> /mi</span>' + (r.hr ? '<span><b>' + r.hr + '</b> bpm</span>' : '') + '</div>';
  var lines = '<div class="rc-lines">';
  lines += '<div class="rc-line"><span class="rc-dot ' + R.tone + '" aria-hidden="true"></span><p>' + esc(R.verdict) + '</p></div>';
  if (R.cmp) {
    var c = R.cmp, better = c.d < -2, worse = c.d > 2;
    lines += '<div class="rc-line"><span class="rc-ic" aria-hidden="true">≈</span><p>' + (better ? '<b>' + (-c.d) + ' s/mi faster</b>' : worse ? '<b>' + c.d + ' s/mi slower</b>' : '<b>About the same pace</b>') + ' at the same heart rate ' + (better || worse ? 'than' : 'as') + ' your last ' + (c.n === 1 ? 'similar run' : c.n + ' similar runs') + (c.gap ? ' (hills evened out)' : '') + '.' +
      (c.warmer ? ' It was warmer today, so this undersells you.' : c.cooler ? ' It was cooler today, which helps.' : '') + '</p></div>';
  }
  if (R.tmr) lines += '<div class="rc-line"><span class="rc-ic" aria-hidden="true">→</span><p><b>Tomorrow:</b> ' + esc(R.tmr.line) + (R.tmr.note ? '. ' + esc(R.tmr.note) : '') + '</p></div>';
  lines += '</div>';
  var recs = R.recs.length ? '<div class="rc-recs">' + R.recs.map(function (x) { return '<span class="pill solid rc-rec">★ ' + esc(x) + '</span>'; }).join('') + '</div>' : '';
  var wk = R.wk ? '<div class="rc-week"><div class="spread"><span class="tiny muted">This week</span><span class="tiny"><b>' + mi(R.wk.done) + '</b> of ' + mi(R.wk.planned) + ' mi' + (R.wk.keyLeft.length ? ' · ' + esc(R.wk.keyLeft.join(', ').toLowerCase()) + ' to go' : '') + '</span></div><div class="rc-bar"><i style="width:' + Math.min(100, R.wk.planned ? R.wk.done / R.wk.planned * 100 : 0) + '%"></i></div></div>' : '';
  var rr = logOf(date)[R.slot] || {};
  var chk = '<div class="rc-check"><div class="tiny muted">How hard was it? (Garmin scale)</div><div class="rc-rpe">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return rchip(Object.assign({ k: 'rpe', v: n }, ar), n, +r.rpe === n); }).join('') + '</div>' +
    '<div class="tiny muted" style="margin-top:8px">Legs</div><div class="chips">' + [['fresh', 'Fresh'], ['ok', 'Normal'], ['heavy', 'Heavy'], ['sore', 'Sore']].map(function (o) { return rchip(Object.assign({ k: 'legs', v: o[0] }, ar), o[1], r.legs === o[0]); }).join('') + rchip(Object.assign({ k: 'pain', v: 'shin' }, ar), 'Shin pain', r.pain === 'shin') + rchip(Object.assign({ k: 'pain', v: 'other' }, ar), 'Other pain', r.pain === 'other') + '</div>' +
    (R.long ? '<div class="tiny muted" style="margin-top:8px">Gels or fuel taken</div><div class="chips">' + [0, 1, 2, 3, 4, 5].map(function (n) { return rchip(Object.assign({ k: 'gels', v: n }, ar), n === 5 ? '5+' : n, r.gels === n); }).join('') + '</div>' : '') + '</div>';
  var tips = [];
  if (R.fuel) tips.push('Eat within an hour: about <b>' + R.fuel.carb + ' g carbs</b> and <b>' + R.fuel.pro + ' g protein</b>.');
  if (R.fluid && R.fluid >= 12) tips.push('Drink about <b>' + R.fluid + ' oz</b> over the next few hours (from your sweat rate).');
  if (R.shin) tips.push('Do the <a href="#/shins">shin routine</a> tonight.');
  var tipH = tips.length ? '<ul class="plain small rc-tips">' + tips.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' : '';
  var more = (R.cmp ? '<details class="rc-more"><summary>Similar runs</summary><table class="t fit"><thead><tr><th>Date</th><th class="num">Miles</th><th class="num">Pace</th><th class="num">HR</th></tr></thead><tbody>' + R.cmp.rows.slice().reverse().map(function (x) { return '<tr><td>' + fmtD(x.date, { month: 'short', day: 'numeric' }) + '</td><td class="num">' + mi(x.mi) + '</td><td class="num">' + pace(x.pace) + '</td><td class="num">' + x.hr + '</td></tr>'; }).join('') + '<tr class="rc-now"><td>This run</td><td class="num">' + mi(r.mi) + '</td><td class="num">' + pace(r.sec / r.mi) + '</td><td class="num">' + (r.hr || '–') + '</td></tr></tbody></table></details>' : '') +
    (inSheet ? '<div class="btns"><a class="btn primary" href="#/day/' + date + '" data-act="sheet-close-go" data-arg="' + jattr({ h: '#/day/' + date }) + '">See the laps</a><button class="btn ghost" data-act="sheet-close">Done</button></div>' : '');
  return (inSheet ? '' : '<section class="card recap">') + head + lines + recs + wk + chk + tipH + more + (inSheet ? '' : '</section>');
}
ACTIONS.rcp = function (a, el) {
  var cur = (logOf(a.date)[a.slot] || {})[a.k], v = cur === a.v ? null : a.v;
  Store.edit('logs', a.date, function (S) { var r = S.logs[a.date] && S.logs[a.date][a.slot]; if (r) { if (v == null) delete r[a.k]; else r[a.k] = v; } });
  $$('[data-act="rcp"]').forEach(function (b) { var x = JSON.parse(b.dataset.arg); if (x.k === a.k && x.date === a.date && x.slot === a.slot) b.setAttribute('aria-pressed', String(v != null && x.v === v)); });
};
ACTIONS['sheet-close-go'] = function (a) { closeSheet(); setTimeout(function () { go(a.h); }, 60); };
SHEETS.recap = function (a) { return '<div class="recap insheet">' + recapHTML(a.date, a.slot, true) + '</div>'; };

/* open the recap once, by itself, after a new run from today or yesterday syncs */
function newRunToRecap() {
  var seen = st().seen || {}, out = null;
  [App.today, E.addD(App.today, -1)].forEach(function (d) { if (out) return; ['xrun', 'run'].forEach(function (k) { var r = logOf(d)[k]; if (!out && r && r.gid && !r.skip && +r.mi > 0 && !seen['recap:' + r.gid]) out = { date: d, slot: k, gid: r.gid }; }); });
  return out;
}
var _render13 = render;
render = function () {
  var res = _render13.apply(this, arguments);
  try {
    if (App.view === 'today' && $('#sheet').hidden && Store.mode === 'github' && !render.recapBusy && loadExtra.at) {
      var n = newRunToRecap();
      if (n && recapData(n.date, n.slot)) {
        render.recapBusy = true;
        Store.edit('seen', 'recap:' + n.gid, function (S) { S.seen = S.seen || {}; S.seen['recap:' + n.gid] = 1; });
        setTimeout(function () { render.recapBusy = false; if ($('#sheet').hidden && App.view === 'today') openSheet('recap', n); }, 350);
      }
    }
  } catch (e) { console.warn(e); render.recapBusy = false; }
  return res;
};
/* always at the top of that day's page */
var _day13 = VIEWS.day;
VIEWS.day = function () {
  var h = _day13(), d = App.args[0] || App.today, l = logOf(d), add = '';
  ['run', 'xrun'].forEach(function (k) { if (l[k] && !l[k].skip && +l[k].mi > 0) add += recapHTML(d, k, false); });
  if (!add) return h;
  var i = h.indexOf('<section'); return i > 0 ? h.slice(0, i) + add + h.slice(i) : add + h;
};
App.p13 = { recapData: recapData, newRunToRecap: newRunToRecap };
