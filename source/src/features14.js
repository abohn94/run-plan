/* ================= Phase 2: records that come from training, a few milestones that mean something,
   and this build against your last one ================= */

/* ---------- workout records: your best run of each kind of key session, judged at the same heart rate ---------- */
function workoutRecords() {
  var by = {};
  classedRuns().forEach(function (x) {
    if (!/^speed:|^long$/.test(x.cls) || !x.a.avgHR) return;
    var s = speedOf(x.a); if (!s) return;
    var title = x.cls === 'long' ? 'Long run' : ((dayOf(x.date) && (dayOf(x.date).parts.filter(E.isRun)[0] || {}).title) || x.r.name || 'Workout');
    var key = x.cls === 'long' ? 'long' : x.cls, eff = s / x.a.avgHR;
    var b = by[key] = by[key] || { title: title, n: 0, best: null };
    b.n++; if (!b.best || eff > b.best.eff) b.best = { eff: eff, date: x.date, pace: x.r.sec / x.r.mi, hr: x.a.avgHR, mi: x.r.mi };
  });
  return Object.keys(by).map(function (k) { return by[k]; }).filter(function (b) { return b.n >= 2; }).sort(function (a, b) { return a.best.date < b.best.date ? 1 : -1; });
}

/* ---------- milestones: few, earned, and the comeback ones for anyone returning ---------- */
function milestones() {
  var logs = st().logs || {}, out = [], dates = Object.keys(logs).sort(), since = (st().profile || {}).comeback && st().profile.comeback.from;
  /* all your running, Garmin history included, so a "first" is really a first */
  var runs = allRuns().filter(function (r) { return r.date <= App.today; }).map(function (r) { return { date: r.date, mi: +r.mi, sec: +r.sec || 0 }; });
  if (since) runs = runs.filter(function (r) { return r.date >= since; });
  var starter = since || (st().profile || {}).level === 'new';
  var first = function (f) { for (var i = 0; i < runs.length; i++) if (f(runs[i])) return runs[i].date; return null; };
  var add = function (k, label, date, note) { if (date) out.push({ k: k, label: label, date: date, note: note || '' }); };
  if (starter) { add('30min', 'First 30 minutes non-stop', first(function (r) { return r.sec >= 1800; })); add('60min', 'First hour on your feet', first(function (r) { return r.sec >= 3600; })); }
  [[starter ? 6.2 : 99, 'First 10K distance'], [10, 'First 10-mile run'], [13.1, 'First half-marathon distance'], [20, 'First 20-miler']].forEach(function (m) { add('d' + m[0], m[1], first(function (r) { return r.mi >= m[0] - 0.05; })); });
  /* weeks */
  var wk = {}; runs.forEach(function (r) { var k = E.monday(r.date); wk[k] = (wk[k] || 0) + r.mi; });
  var wks = Object.keys(wk).sort();
  (starter ? [[10, 'First 10-mile week'], [25, 'First 25-mile week'], [50, 'First 50-mile week']] : [[25, 'First 25-mile week'], [50, 'First 50-mile week'], [70, 'First 70-mile week']]).forEach(function (m) { var k = wks.filter(function (x) { return wk[x] >= m[0]; })[0]; add('w' + m[0], m[1], k ? E.addD(k, 6) : null); });
  /* months */
  var mo = {}; runs.forEach(function (r) { var k = r.date.slice(0, 7); mo[k] = (mo[k] || 0) + r.mi; });
  var m100 = Object.keys(mo).sort().filter(function (k) { return mo[k] >= 100; })[0]; add('m100', 'First 100-mile month', m100 ? m100 + '-28' : null);
  /* consistency: 4 and 10 weeks in a row with every long run done */
  if (App.plan) {
    var streak = 0, best4 = null, best10 = null;
    App.plan.weeks.forEach(function (w) {
      if (w.end >= App.today) return;
      var longs = []; w.days.forEach(function (d) { d.parts.forEach(function (p) { if (p.type === 'long') longs.push(d.date); }); });
      if (!longs.length) return;
      var ok = longs.every(function (d) { var r = logs[d] && logs[d].run; return r && !r.skip && +r.mi > 0; });
      streak = ok ? streak + 1 : 0;
      if (streak === 4 && !best4) best4 = w.end; if (streak === 10 && !best10) best10 = w.end;
    });
    add('lr4', '4 weeks of long runs in a row', best4); add('lr10', '10 weeks of long runs in a row', best10);
  }
  /* the first two weeks of your history can't hold a real "first": that's just where the records begin */
  var hist0 = runs.length ? runs[0].date : null;
  if (hist0 && !since) out = out.filter(function (m) { return E.diffD(hist0, m.date) > 14; });
  return out.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
}
/* a new milestone gets one card on Today */
function milestoneCard() {
  var seen = st().seen || {}, m = milestones().filter(function (x) { return !seen['ms:' + x.k] && E.diffD(x.date, App.today) <= 7; })[0];
  if (!m) return '';
  return '<section class="card offer mscard"><span class="ms-star" aria-hidden="true">★</span><div><div class="eyebrow">Milestone</div><h3>' + esc(m.label) + '</h3><p class="small muted">' + fmtD(m.date, { weekday: 'long', month: 'short', day: 'numeric' }) + '. Every one of these is proof the plan is working.</p></div><button class="ins-x" data-act="ms-seen" data-arg="' + jattr({ k: m.k }) + '" aria-label="Dismiss">×</button></section>';
}
ACTIONS['ms-seen'] = function (a) { Store.edit('seen', 'ms:' + a.k, function (S) { S.seen = S.seen || {}; S.seen['ms:' + a.k] = 1; }); };
/* milestones older than a week are just history: mark them seen once so they never pop up late */
function settleOldMilestones() {
  var seen = st().seen || {}, old = milestones().filter(function (x) { return !seen['ms:' + x.k] && E.diffD(x.date, App.today) > 7; });
  if (old.length) Store.editMany(old.map(function (x) { return ['seen', 'ms:' + x.k]; }), function (S) { S.seen = S.seen || {}; old.forEach(function (x) { S.seen['ms:' + x.k] = 1; }); });
}

/* ---------- this build vs your last build for the same distance ---------- */
function buildCompare() {
  var p = App.plan; if (!p) return null;
  var next = (p.aEvents || []).filter(function (e) { return e.date >= App.today; })[0]; if (!next) return null;
  var dist = E.distOf(next).key, past = (st().events || []).filter(function (e) { return e.date < App.today && E.distOf(e).key === dist; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
  if (!past) return null;
  var wTo = Math.ceil(E.diffD(App.today, next.date) / 7);   /* weeks to go */
  var logs = st().logs || {};
  var block = function (raceDate, weeksOut) {
    var end = E.addD(raceDate, -7 * weeksOut), start = E.addD(end, -27), mi = 0, longest = 0, runs = 0, key = 0;
    for (var d = start; d <= end; d = E.addD(d, 1)) { ['run', 'xrun'].forEach(function (k) { var r = logs[d] && logs[d][k]; if (r && !r.skip && +r.mi > 0) { mi += +r.mi; runs++; longest = Math.max(longest, +r.mi); if (r.ptype === 'speed') key++; } }); }
    return { mi: mi, wk: mi / 4, longest: longest, runs: runs, key: key, start: start, end: end };
  };
  var now = block(next.date, wTo), then = block(past.date, wTo);
  if (!then.runs) return null;
  return { next: next, past: past, wTo: wTo, now: now, then: then, vNow: App.an && App.an.vdot };
}
function buildCompareHTML() {
  var b = buildCompare(); if (!b) return '';
  var row = function (lab, a, c, unit) { var d = a - c; return '<tr><td>' + lab + '</td><td class="num">' + (Math.round(c * 10) / 10) + unit + '</td><td class="num"><b>' + (Math.round(a * 10) / 10) + unit + '</b></td><td class="num ' + (d > 0.05 ? 'up' : d < -0.05 ? 'down' : '') + '">' + (d > 0 ? '+' : '') + (Math.round(d * 10) / 10) + '</td></tr>'; };
  return '<section class="card"><h3>This build vs your last ' + esc(E.distOf(b.next).label.toLowerCase()) + '</h3><p class="small muted" style="margin-top:4px">The 4 weeks ending ' + b.wTo + ' weeks out from ' + esc(b.next.name || 'your race') + ', against the same 4 weeks before ' + esc(b.past.name || 'your last one') + ' (' + fmtD(b.past.date, { month: 'short', year: 'numeric' }) + ').</p>' +
    '<div class="scroll"><table class="t fit cmpb" style="margin-top:8px"><thead><tr><th></th><th class="num">Then</th><th class="num">Now</th><th class="num">Δ</th></tr></thead><tbody>' +
    row('Miles a week', b.now.wk, b.then.wk, '') + row('Longest run', b.now.longest, b.then.longest, ' mi') + row('Runs', b.now.runs, b.then.runs, '') + row('Key sessions', b.now.key, b.then.key, '') + '</tbody></table></div></section>';
}

/* ---------- Progress → Overview: records and milestones; Today: a new milestone ---------- */
function recordsHTML() {
  var ms = milestones(), wr = workoutRecords();
  if (!ms.length && !wr.length) return '';
  var since = (st().profile || {}).comeback && st().profile.comeback.from;
  var h = '<div class="sechead"><h2>Records and milestones</h2></div><section class="card stack">';
  if (ms.length) h += '<div><h4 class="tiny muted" style="margin:0 0 6px">Milestones' + (since ? ' since your comeback' : '') + '</h4><div class="msrow">' + ms.slice(0, 8).map(function (m) { return '<div class="ms"><span aria-hidden="true">★</span><b>' + esc(m.label) + '</b><small>' + fmtD(m.date, { month: 'short', day: 'numeric', year: 'numeric' }) + '</small></div>'; }).join('') + '</div></div>';
  if (wr.length) h += '<div><h4 class="tiny muted" style="margin:0 0 6px">Best sessions at the same effort</h4><div class="list wrec">' + wr.slice(0, 6).map(function (b) { return '<a class="list-item" href="#/day/' + b.best.date + '"><div class="n small"><b>' + esc(b.title) + '</b></div><div class="d tiny muted">' + fmtD(b.best.date, { month: 'short', day: 'numeric' }) + ' · best of ' + b.n + '</div><div class="c small">' + pace(b.best.pace) + '/mi at ' + b.best.hr + ' bpm</div></a>'; }).join('') + '</div><p class="tiny muted" style="margin-top:6px">Ranked by pace per heartbeat (hills evened out), so a hot or hilly day doesn\'t hide a good session.</p></div>';
  return h + '</section>';
}
var _progress14 = VIEWS.progress;
VIEWS.progress = function () {
  var h = _progress14(); if ((App.args[0] || 'overview') !== 'overview') return h;
  var add = ''; try { add = buildCompareHTML() + recordsHTML(); } catch (e) { console.warn(e); }
  if (!add) return h;
  var i = h.indexOf('<div class="sechead">'); return i > 0 ? h.slice(0, i) + add + h.slice(i) : h + add;
};
var _today14 = VIEWS.today;
VIEWS.today = function () {
  var h = _today14(), c = ''; try { settleOldMilestones(); c = milestoneCard(); } catch (e) { c = ''; }
  if (!c) return h; var i = h.indexOf('<section'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};
App.p14 = { milestones: milestones, workoutRecords: workoutRecords, buildCompare: buildCompare };
