/* ================= features8: you stay in charge (advisory mode, locks), feel + pain loop, proof you're improving,
   weekly coach report, what's next after a race ================= */

/* ---------- advisory mode and locks ---------- */
TITLES.control = 'Plan control';
function lockKey(kind, v) { return kind + ':' + v; }
function isLocked(k) { return !!((st().locks || {})[k]); }
ACTIONS['lock-toggle'] = function (a) {
  var k = a.k, on = !isLocked(k);
  Store.edit('locks', k, function (S) { S.locks = S.locks || {}; if (on) S.locks[k] = 1; else delete S.locks[k]; });
  toast(on ? (a.k.charAt(0) === 'w' ? 'Week locked: nothing changes it automatically' : 'Day locked') : 'Unlocked');
};
ACTIONS['adv-apply'] = function (a) { Store.edit('advOk', a.w, function (S) { S.advOk = S.advOk || {}; S.advOk[a.w] = 1; }); toast('Suggestions applied to this week'); if (a.w <= App.today && typeof watchSoon === 'function' && watchOn()) watchSoon(); };
ACTIONS['adv-undo'] = function (a) { Store.edit('advOk', a.w, function (S) { S.advOk = S.advOk || {}; delete S.advOk[a.w]; }); toast('Back to the plan as written'); };
ACTIONS['adv-hide'] = function (a) { Store.edit('seen', 'adv:' + a.w, function (S) { S.seen = S.seen || {}; S.seen['adv:' + a.w] = 1; }); };
ACTIONS['adv-mode'] = function () {
  var on = !(st().prefs || {}).advisory;
  Store.edit('prefs', 'advisory', function (S) { S.prefs = S.prefs || {}; S.prefs.advisory = on; });
  toast(on ? 'Advisory mode on: the app suggests, you decide' : 'Automatic adjustments on');
};
function advCard(w) {
  if (!w || w.end < App.today) return '';
  var pr = st().prefs || {}, ok = (st().advOk || {})[w.start], seen = (st().seen || {})['adv:' + w.start];
  var lockRow = '<div class="lockrow"><span>' + (w.locked ? '<b>Week locked.</b> The app won\'t change it on its own.' : 'Lock this week so nothing changes it automatically.') + '</span><button class="btn sm' + (w.locked ? ' primary' : '') + '" data-act="lock-toggle" data-arg="' + jattr({ k: lockKey('w', w.start) }) + '">' + (w.locked ? 'Unlock' : 'Lock week') + '</button></div>';
  var out = '';
  if (w.advice && w.advice.length && !seen) {
    out += '<section class="card advc"><div class="eyebrow">Suggested for this week</div><h3 style="margin-top:2px">' + plural(w.advice.length, 'change') + ' the app would make</h3><div class="advlist">' + w.advice.map(function (x) {
      return '<div><span class="d">' + fmtD(x.date, { weekday: 'short' }) + '</span><span class="c"><em>' + esc(x.label) + '</em><span class="was small">' + esc(x.before) + '</span><span class="now small">' + esc(x.after) + '</span></span></div>';
    }).join('') + '</div><div class="btns" style="margin-top:10px"><button class="btn sm primary" data-act="adv-apply" data-arg="' + jattr({ w: w.start }) + '">Apply these</button><button class="btn sm" data-act="adv-hide" data-arg="' + jattr({ w: w.start }) + '">Keep as planned</button></div>' + lockRow + '</section>';
  } else if (pr.advisory && ok) {
    out += '<section class="card"><p class="small">You applied this week\'s suggestions. <button class="linkbtn" data-act="adv-undo" data-arg="' + jattr({ w: w.start }) + '">Undo</button></p>' + lockRow + '</section>';
  } else out += '<section class="card tight">' + lockRow + '</section>';
  return out;
}
var _day8 = VIEWS.day;
VIEWS.day = function () {
  var h = _day8(), date = App.args[0] || App.today; if (!App.plan || date < App.today) return h;
  var w = E.weekOf(App.plan, date), k = lockKey('d', date), on = isLocked(k) || (w && w.locked);
  return h + '<section class="card tight"><div class="lockrow"><span>' + (on ? '<b>Locked.</b> This day stays exactly as it is.' : 'Lock this day so the app never changes it on its own.') + '</span>' + (w && w.locked ? '<span class="tiny muted">whole week locked</span>' : '<button class="btn sm' + (on ? ' primary' : '') + '" data-act="lock-toggle" data-arg="' + jattr({ k: k }) + '">' + (on ? 'Unlock' : 'Lock day') + '</button>') + '</div></section>';
};
VIEWS.control = function () {
  var pr = st().prefs || {}, L = Object.keys(st().locks || {}).filter(function (k) { return k.slice(2) >= E.addD(App.today, -6); }).sort();
  var html = '<div class="pagehead"><h1>Plan control</h1><p>Decide how much the app changes your plan on its own.</p></div>';
  html += '<section class="card stack"><div class="spread"><h3>Advisory mode</h3><button class="toggle' + (pr.advisory ? ' on' : '') + '" role="switch" aria-checked="' + !!pr.advisory + '" data-act="adv-mode" aria-label="Advisory mode"><i></i></button></div>' +
    '<p class="small muted">' + (pr.advisory ? 'On: the app suggests changes and you apply them week by week.' : 'Off: the app adjusts your plan automatically.') + '</p>' +
    '<p class="small">Automatic adjustments are the app\'s own ideas: trimming runs to stay under your shin-load ceiling, nudges from Garmin\'s training balance, moving after-work runs indoors when it\'s dark, and matching a week to what you have actually been running. With advisory mode on, each shows up on the Plan tab as a suggestion with the before and after. Changes you make yourself, and calendar shifts you accept, always apply.</p></section>';
  html += '<section class="card stack"><h3>Locked days and weeks</h3>' + (L.length ? L.map(function (k) { return '<div class="lockrow"><span>' + (k.charAt(0) === 'w' ? 'Week of ' : '') + fmtD(k.slice(2), { weekday: k.charAt(0) === 'w' ? undefined : 'short', month: 'short', day: 'numeric' }) + '</span><button class="btn sm" data-act="lock-toggle" data-arg="' + jattr({ k: k }) + '">Unlock</button></div>'; }).join('') : '<p class="small muted">Nothing locked. Lock a week on the Plan tab or a day from its session page.</p>') + '</section>';
  return html;
};
var _you8 = VIEWS.you;
VIEWS.you = function () { var h = _you8(), link = '<a href="#/control">Plan control<span class="v">' + ((st().prefs || {}).advisory ? 'Advisory' : 'Automatic') + '</span><span class="chev">›</span></a>', i = h.indexOf('<a href="#/calsync"'); return i < 0 ? h : h.slice(0, i) + link + h.slice(i); };

/* ---------- how did it feel: add a pain check, and say what the feedback changed ---------- */
var _rateCard8 = rateCard;
rateCard = function () {
  var h = _rateCard8(); if (!h) return h;
  var logs = st().logs || {}, d = null;
  for (var i = 0; i < 4 && !d; i++) { var x = E.addD(App.today, -i); if (logs[x] && logs[x].run && logs[x].run.src === 'garmin') d = x; }
  if (!d) return h;
  var cur = (logs[d].run || {}).pain || '';
  var row = '<div class="painrow"><span class="small">Any pain on ' + fmtD(d, { weekday: 'short' }) + '?</span>' + [['none', 'None'], ['shin', 'Shins'], ['other', 'Other']].map(function (o) { return '<button type="button" data-act="pain" data-arg="' + jattr({ d: d, v: o[0] }) + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
  var i2 = h.lastIndexOf('</section>'); return h.slice(0, i2) + row + h.slice(i2);
};
ACTIONS.pain = function (a) { Store.edit('logs', a.d, function (S) { var r = S.logs[a.d] && S.logs[a.d].run; if (r) r.pain = a.v; }); toast(a.v === 'none' ? 'Good to hear' : 'Noted. Watch for a pattern on Today'); };
function painFlags(days) {
  var logs = st().logs || {}, n = 0, kinds = {};
  for (var i = 0; i < days; i++) { var r = logs[E.addD(App.today, -i)]; r = r && r.run; if (r && r.pain && r.pain !== 'none') { n++; kinds[r.pain] = 1; } }
  return { n: n, shin: !!kinds.shin };
}
function painBanner() {
  var f = painFlags(10); if (f.n < 2 || (st().seen || {})['pain:' + E.monday(App.today)]) return '';
  var w = App.week;
  return '<section class="card banner warn"><b>' + (f.shin ? 'Shins flagged ' : 'Pain flagged ') + f.n + ' times in 10 days.</b> Back off before it becomes an injury: make this week lighter, keep runs on soft surfaces or the treadmill, and do the shin routine daily. See a professional if it hurts to hop or press on the bone.<div class="btns" style="margin-top:8px">' + (w ? '<button class="btn sm primary" data-act="sheet" data-arg="' + jattr({ sheet: 'weekstatus', week: w.n }) + '">Make this week lighter</button>' : '') + '<a class="btn sm" href="#/shins">Shin routine</a><button class="btn sm ghost" data-act="pain-ok">I\'m fine</button></div></section>';
}
ACTIONS['pain-ok'] = function () { var k = 'pain:' + E.monday(App.today); Store.edit('seen', k, function (S) { S.seen = S.seen || {}; S.seen[k] = 1; }); };
function tuneLine() {
  var an = App.an; if (!an || !an.off) return '';
  var o = an.off, bits = [];
  if (o.E) bits.push('easy ' + (o.E > 0 ? o.E + ' s/mi slower' : -o.E + ' s/mi faster'));
  if (o.T) bits.push('threshold ' + (o.T > 0 ? o.T + ' s/mi slower' : -o.T + ' s/mi faster'));
  if (o.I) bits.push('intervals ' + (o.I > 0 ? o.I + ' s/mi slower' : -o.I + ' s/mi faster'));
  return bits.length ? '<p class="tiny muted" style="margin-top:6px">From how recent runs felt: ' + esc(bits.join(', ')) + '.</p>' : '';
}

/* ---------- proof you're getting fitter ---------- */
function easyRuns(from, to) {
  var acts = (Store.garmin && Store.garmin.activities) || [];
  return acts.filter(function (a) {
    if (!a.run || !a.avgHR || !a.distM || a.distM < 2400 || a.date < from || a.date > to || a.race) return false;
    if (a.teLabel && /ANAEROBIC|VO2|THRESHOLD|TEMPO|SPEED/.test(a.teLabel)) return false;
    return !(a.te >= 3.5);
  });
}
function efficiency(list) { return median(list.map(function (a) { return ((a.gapSpd || (a.distM / (a.movS || a.durS))) / a.avgHR); })); }
function progressFacts() {
  var t = App.today, out = [];
  var now = easyRuns(E.addD(t, -21), t), then = easyRuns(E.addD(t, -63), E.addD(t, -35));
  if (now.length >= 3 && then.length >= 3) {
    var e1 = efficiency(now), e0 = efficiency(then), hr = Math.round(median(now.map(function (a) { return a.avgHR; })));
    var p1 = 1609.344 / (e1 * hr), p0 = 1609.344 / (e0 * hr), d = Math.round(p0 - p1);
    out.push({ k: 'aer', good: d > 0, title: 'Easy pace at ' + hr + ' bpm', big: pace(p1) + '/mi', sub: Math.abs(d) < 3 ? 'same as a month ago' : (d > 0 ? d + ' s/mi faster' : -d + ' s/mi slower') + ' than a month ago (' + pace(p0) + ')', why: 'The same heart rate buying more speed is the clearest sign your aerobic engine is growing.' });
  }
  var lt = (GX().ltHistory) || {}, ld = Object.keys(lt).filter(function (k) { return lt[k].pace; }).sort();
  if (ld.length >= 2) { var a0 = lt[ld[0]].pace, a1 = lt[ld[ld.length - 1]].pace, dd = Math.round(a0 - a1); out.push({ k: 'lt', good: dd >= 0, title: 'Threshold pace (Garmin)', big: pace(a1) + '/mi', sub: Math.abs(dd) < 2 ? 'holding steady since ' + fmtD(ld[0], { month: 'short', day: 'numeric' }) : (dd > 0 ? dd + ' s/mi faster' : -dd + ' s/mi slower') + ' since ' + fmtD(ld[0], { month: 'short', day: 'numeric' }), why: 'The pace you could hold for about an hour.' }); }
  else if (ld.length === 1) out.push({ k: 'lt', good: true, title: 'Threshold pace (Garmin)', big: pace(lt[ld[0]].pace) + '/mi', sub: 'first reading; the trend appears as Garmin updates it', why: 'The pace you could hold for about an hour.' });
  /* sessions completed in the plan so far (last 4 weeks) */
  if (App.plan) {
    var planned = 0, done = 0;
    App.plan.weeks.forEach(function (w) { w.days.forEach(function (d) { if (d.date >= t || d.date < E.addD(t, -28)) return; d.parts.forEach(function (p) { if (p.type === 'rest' || p.type === 'race') return; planned++; if (partDone(d.date, p)) done++; }); }); });
    if (planned >= 3) out.push({ k: 'cons', good: done / planned >= 0.75, title: 'Sessions completed', big: done + ' of ' + planned, sub: 'last 4 weeks (' + Math.round(done / planned * 100) + '%)', why: 'Consistency beats any single workout. Planned rest counts as doing the plan.' });
  }
  /* weekly miles, last 4 weeks */
  var acts = (Store.garmin && Store.garmin.activities) || [], wk = [];
  for (var k = 3; k >= 0; k--) { var s = E.addD(E.monday(t), -7 * k), e = E.addD(s, 6); wk.push(acts.filter(function (a) { return a.run && a.date >= s && a.date <= e; }).reduce(function (x, a) { return x + a.distM / E.MI_M; }, 0)); }
  if (wk.some(function (x) { return x > 0; })) out.push({ k: 'mi', good: true, title: 'Weekly miles', big: mi(wk[3]) + ' mi', sub: 'this week · previous: ' + wk.slice(0, 3).reverse().map(function (x) { return mi(x); }).join(' · '), why: '', spark: wk });
  return out;
}
function progressCard(compact) {
  var f = progressFacts(); if (!f.length) return '';
  var items = compact ? f.filter(function (x) { return x.good; }).slice(0, 2) : f;
  if (!items.length) return '';
  return '<section class="card progc"><div class="eyebrow">' + (compact ? 'You\'re getting fitter' : 'Proof it\'s working') + '</div><div class="pgrid">' + items.map(function (x) {
    return '<div class="pf' + (x.good ? ' good' : '') + '"><span>' + esc(x.title) + '</span><b>' + esc(x.big) + '</b><em>' + esc(x.sub) + '</em>' + (!compact && x.why ? '<small>' + esc(x.why) + '</small>' : '') + '</div>';
  }).join('') + '</div>' + (compact ? '<a class="tiny" href="#/progress">See all progress ›</a>' : '') + '</section>';
}
var _progress8 = VIEWS.progress;
VIEWS.progress = function () { var h = _progress8(), c = progressCard(false); if (!c) return h; var i = h.indexOf('</div>', h.indexOf('class="pagehead"')); return i > 0 ? h.slice(0, i + 6) + c + h.slice(i + 6) : c + h; };

/* ---------- weekly coach report ---------- */
TITLES.report = 'Weekly report';
function reportWeek() {
  if (!App.plan) return null;
  var d = E.dow(App.today);   /* 0 = first day of your week */
  var ref = d === 6 ? App.today : d <= 1 ? E.addD(App.today, -7) : null; if (!ref) return null;
  return E.weekOf(App.plan, ref);
}
function weekReport(w) {
  if (!w) return null;
  var logs = st().logs || {}, zz = w.zonesAdj || {}, x = GX();
  var plannedRuns = 0, doneRuns = 0, plannedMi = 0, doneMi = 0, keyDone = [], keyMissed = [], fastEasy = 0, easyN = 0, lifts = 0, liftsDone = 0;
  w.days.forEach(function (d) {
    if (d.date > App.today) return;
    var l = logs[d.date] || {};
    d.parts.forEach(function (p) {
      if (E.isRun(p) && p.type !== 'race') { plannedRuns++; plannedMi += p.mi || 0; var ok = partDone(d.date, p); if (ok) doneRuns++; if (p.type === 'speed' || p.type === 'long') (ok ? keyDone : keyMissed).push(p.title); }
      if (p.type === 'strength') { lifts++; if (partDone(d.date, p)) liftsDone++; }
    });
    var r = l.run; if (r && !r.skip && +r.mi > 0) { doneMi += +r.mi; if ((r.ptype === 'easy' || r.ptype === 'recovery') && r.sec && zz.E) { easyN++; if (r.sec / r.mi < zz.E[0] - 10) fastEasy++; } }
  });
  var rd = Object.keys(x.readiness || {}).filter(function (k) { return k >= w.start && k <= w.end; }).map(function (k) { return x.readiness[k].score; }).filter(Boolean);
  var good = [], watch = [];
  if (plannedRuns && doneRuns === plannedRuns) good.push('every run done');
  if (keyDone.length) good.push(keyDone.join(' and ').toLowerCase() + ' done');
  if (lifts && liftsDone === lifts) good.push('all ' + plural(lifts, 'lift'));
  if (keyMissed.length) watch.push('missed ' + keyMissed.join(' and ').toLowerCase() + '; don\'t make it up, the plan moves on');
  if (fastEasy >= 2 || (easyN && fastEasy / easyN > 0.5)) watch.push(fastEasy + ' easy run' + (fastEasy > 1 ? 's were' : ' was') + ' faster than easy pace; slow those down so the hard days stay good');
  var pf = painFlags(7); if (pf.n) watch.push((pf.shin ? 'shins' : 'pain') + ' flagged ' + plural(pf.n, 'time'));
  if (rd.length >= 3) { var ar = Math.round(rd.reduce(function (a, b) { return a + b; }, 0) / rd.length); if (ar < 40) watch.push('Garmin readiness averaged ' + ar + '; protect sleep this week'); else good.push('readiness averaged ' + ar); }
  var nx = E.weekOf(App.plan, E.addD(w.end, 1)), nextKey = null, nextLong = null;
  if (nx) nx.days.forEach(function (d) { d.parts.forEach(function (p) { if (p.type === 'speed' && !nextKey) nextKey = { p: p, d: d.date }; if ((p.type === 'long' || p.type === 'race') && !nextLong) nextLong = { p: p, d: d.date }; }); });
  return { w: w, nx: nx, plannedRuns: plannedRuns, doneRuns: doneRuns, plannedMi: plannedMi, doneMi: doneMi, good: good, watch: watch, nextKey: nextKey, nextLong: nextLong };
}
function reportHTML(r, full) {
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
  var h = '<div class="rprow"><span>Runs</span><b>' + r.doneRuns + ' of ' + r.plannedRuns + '</b></div><div class="rprow"><span>Miles</span><b>' + mi(r.doneMi) + ' of ' + mi(r.plannedMi) + '</b></div>';
  if (r.good.length) h += '<p class="small" style="margin-top:8px"><b>Went well:</b> ' + esc(cap(r.good.join(', '))) + '.</p>';
  if (r.watch.length) h += '<p class="small" style="margin-top:6px"><b>Watch:</b> ' + esc(cap(r.watch.join('; '))) + '.</p>';
  if (r.nx) h += '<p class="small" style="margin-top:6px"><b>Next week' + (r.nx.phase ? ' (' + esc(r.nx.phase.name) + (r.nx.cut ? ', cutback' : '') + ')' : '') + ':</b> ' + mi(r.nx.tot.mi) + ' mi' + (r.nextKey ? ', key session ' + esc(r.nextKey.p.title) + ' on ' + fmtD(r.nextKey.d, { weekday: 'long' }) : '') + (r.nextLong ? ', ' + esc(r.nextLong.p.title.toLowerCase()) + ' ' + mi(r.nextLong.p.mi) + ' mi on ' + fmtD(r.nextLong.d, { weekday: 'long' }) : '') + '.</p>';
  if (full) h += tuneLine();
  return h;
}
function reportCard() {
  var w = reportWeek(); if (!w || (st().seen || {})['report:' + w.start]) return '';
  var r = weekReport(w); if (!r || (!r.plannedMi && !r.doneMi)) return '';
  return '<section class="card rpt"><div class="spread"><div class="eyebrow">Weekly report · ' + fmtD(w.start, { month: 'short', day: 'numeric' }) + '</div><button class="linkbtn tiny" data-act="report-hide" data-arg="' + jattr({ w: w.start }) + '">Done</button></div>' + reportHTML(r, false) + '<a class="tiny" href="#/report/' + w.start + '">Full report ›</a></section>';
}
ACTIONS['report-hide'] = function (a) { var k = 'report:' + a.w; Store.edit('seen', k, function (S) { S.seen = S.seen || {}; S.seen[k] = 1; }); };
VIEWS.report = function () {
  var w = App.plan && E.weekOf(App.plan, App.args[0] || App.today); if (!w) return '<section class="card">No week found.</section>';
  var r = weekReport(w);
  var html = '<div class="pagehead"><h1>Week of ' + fmtD(w.start, { month: 'short', day: 'numeric' }) + '</h1><p>' + esc(w.phase.name) + (w.cut ? ' · cutback' : '') + ' · week ' + w.n + ' of ' + App.plan.weeks.length + '</p></div><section class="card">' + reportHTML(r, true) + '</section>';
  var pc = progressCard(false); if (pc) html += pc;
  html += '<div class="btns"><a class="btn sm" href="#/report/' + E.addD(w.start, -7) + '">‹ Earlier week</a><a class="btn sm" href="#/plan/' + w.n + '">Open week ' + w.n + '</a></div>';
  return html;
};

/* ---------- what's next after a race ---------- */
function raceResult(ev) {
  var acts = ((Store.garmin && Store.garmin.activities) || []).filter(function (a) { return a.run && a.date === ev.date; }).sort(function (a, b) { return b.distM - a.distM; });
  var a = acts[0]; if (!a) return null;
  var sec = a.movS || a.durS, g = E.parseClock(ev.goal);
  return { mi: a.distM / E.MI_M, sec: sec, goal: g > 0 ? g : null, pace: sec / (a.distM / E.MI_M), hr: a.avgHR };
}
function postRaceCard() {
  var evs = (st().events || []).filter(function (e) { return e.date < App.today && E.diffD(e.date, App.today) <= 21 && (e.priority || 'A') !== 'C' && !(st().seen || {})['race:' + e.id]; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  var ev = evs[0]; if (!ev) return '';
  var r = raceResult(ev), next = (st().events || []).filter(function (e) { return e.date > App.today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
  var res = r ? '<p class="small" style="margin-top:6px">' + E.clock(Math.round(r.sec)) + ' (' + pace(r.pace) + '/mi)' + (r.goal ? ' · goal ' + E.clock(r.goal) + ': ' + (r.sec <= r.goal ? '<b>goal reached</b> by ' + E.clock(Math.round(r.goal - r.sec)) : E.clock(Math.round(r.sec - r.goal)) + ' off') : '') + '</p>' : '<p class="small muted" style="margin-top:6px">Your race result shows here once it syncs from Garmin.</p>';
  var days = E.diffD(ev.date, App.today);
  var rec = days <= 14 ? '<p class="small" style="margin-top:6px"><b>Recover first.</b> Day ' + days + ' after the race: easy running only for about ' + (E.distOf(ev).key === 'full' ? '2–3 weeks' : '1–2 weeks') + '. Your plan already eases you back in.</p>' : '';
  var nx = next ? '<p class="small" style="margin-top:6px"><b>Next up:</b> ' + esc(next.name || E.distOf(next).label) + ' in ' + plural(Math.round(E.diffD(App.today, next.date) / 7), 'week') + '.</p>' : '<p class="small" style="margin-top:6px"><b>What\'s next?</b> Pick a new goal so your fitness has somewhere to go. A fitness block keeps you training with a 10K check in 10 weeks.</p>';
  return '<section class="card postrace"><div class="eyebrow">After the race</div><h3 style="margin-top:2px">' + esc(ev.name || E.distOf(ev).label) + '</h3>' + res + rec + nx +
    '<div class="btns" style="margin-top:10px">' + (next ? '' : '<button class="btn sm primary" data-act="sheet" data-arg="' + jattr({ sheet: 'event' }) + '">Add my next race</button><button class="btn sm" data-act="fitness-block">Start a fitness block</button>') + '<button class="btn sm ghost" data-act="race-seen" data-arg="' + jattr({ id: ev.id }) + '">Done</button></div></section>';
}
ACTIONS['race-seen'] = function (a) { var k = 'race:' + a.id; Store.edit('seen', k, function (S) { S.seen = S.seen || {}; S.seen[k] = 1; }); };
ACTIONS['fitness-block'] = function () {
  var d = E.addD(App.today, 70), id = 'fb' + Date.now().toString(36);
  Store.edit('events', null, function (S) { S.events = (S.events || []).concat([{ id: id, name: 'Fitness check 10K', date: d, dist: '10k', goal: '', priority: 'B' }]); });
  toast('Fitness block added: 10K check on ' + fmtD(d, { month: 'short', day: 'numeric' }));
};

/* ---------- Today: the new cards, in a sensible order ---------- */
var _today8 = VIEWS.today;
VIEWS.today = function () {
  var h = _today8(); if (!App.plan) return h;
  var early = App.today >= App.plan.start && E.diffD(App.plan.start, App.today) <= 21;
  var add = painBanner() + postRaceCard() + reportCard() + (early ? progressCard(true) : '');
  if (!add) return h;
  var i = h.indexOf('<section class="card cond'); if (i < 0) i = h.indexOf('<section', h.indexOf('<section') + 1);
  return i > 0 ? h.slice(0, i) + add + h.slice(i) : h + add;
};

/* ---------- your personal Google Calendar events beside the training (read-only: they can't be moved here) ---------- */
function calEvents(date) { return ((App.cal && App.cal.events) || {})[date] || []; }
function evTime(ev) { if (ev.a) return 'All day'; var f = function (m) { var h = Math.floor(m / 60) % 24, mm = m % 60; return (h % 12 || 12) + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '') + (h < 12 ? 'a' : 'p'); }; return f(ev.s) + (ev.e && ev.e !== ev.s ? '–' + f(Math.min(ev.e, 1439)) : ''); }
function evRow(ev, cls) { return '<div class="pev' + (ev.f ? ' free' : '') + (cls ? ' ' + cls : '') + '" title="From your Google Calendar (change it there)"><span class="pt">' + evTime(ev) + '</span><span class="pn">' + esc(ev.t) + '</span></div>'; }
/* work shifts from your calendar (shown even before you review them) plus ones you set yourself */
function shownShifts() { try { return (typeof calShifts === 'function' && App.cal) ? calShifts().proposed : (typeof allShifts === 'function' ? allShifts() : {}); } catch (e) { return {}; } }
var SHIFT_NAME = { day: 'Day shift', eve: 'Evening shift', night: 'Night shift' };
function shiftRowHTML(date) {
  var k = shownShifts()[date]; if (!k || !SHIFT_NAME[k]) return '';
  var t = App.cal && App.cal.times && App.cal.times[date], applied = (typeof allShifts === 'function' ? allShifts() : {})[date] === k;
  var f = function (m) { m = ((m % 1440) + 1440) % 1440; var h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '') + (h < 12 ? 'a' : 'p'); };
  var tm = t ? f(t[0]) + '–' + f(t[1]) : k === 'day' ? 'Day' : k === 'eve' ? 'Evening' : 'Night';
  return '<div class="pev shift k-' + k + '" title="Work shift from your calendar"><span class="pt">' + tm + '</span><span class="pn">' + SHIFT_NAME[k] + (applied ? '' : ' <a class="pendtag" href="#/calreview">review</a>') + '</span></div>';
}
function dayEventsHTML(date) {
  var ev = calEvents(date), sh = shiftRowHTML(date); if (!ev.length && !sh) return '';
  return '<div class="pevs" aria-label="Work and calendar events">' + sh + ev.map(function (e) { return evRow(e); }).join('') + '</div>';
}
/* how booked a day is: personal events plus work, as a share of a 16-hour waking day */
function busyShare(date) {
  var mins = 0, sh = shownShifts()[date];
  /* each event counts at least 2 hours (getting there, getting ready), so a busy day reads as busy */
  calEvents(date).forEach(function (e) { if (e.f) return; mins += e.a ? 120 : Math.max(120, Math.min(e.e || e.s, 1440) - e.s); });
  if (sh) mins += sh === 'day' ? 570 : 510;
  return Math.min(1, mins / 960);
}
/* week preview: events under each day, not draggable */
var _preview8 = VIEWS.preview;
VIEWS.preview = function () {
  var h = _preview8(); if (!App.cal || !App.cal.events) return h;
  Object.keys(App.cal.events).forEach(function (d) {
    var k = 'data-pvday="' + d + '"', i = h.indexOf(k); if (i < 0) return;
    var j = h.indexOf('<div class="pvitems', i); if (j < 0) return;
    var e = h.indexOf('>', j) + 1; h = h.slice(0, e) + dayEventsHTML(d) + h.slice(e);
  });
  return h;
};
/* session page: what else is on that day */
var _day8e = VIEWS.day;
VIEWS.day = function () {
  var h = _day8e(), date = App.args[0] || App.today, inner = dayEventsHTML(date); if (!inner) return h;
  var c = '<section class="card"><div class="spread"><h3>On your calendar</h3><span class="tiny muted">Google Calendar</span></div>' + inner + '</section>';
  var i = h.indexOf('<section class="card"><h3>Day actions'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};
/* calendar tab: a busy bar in every day (the week-by-week list shows the events themselves) */
function busyBar(d) {
  if (!App.cal) return '';
  var b = busyShare(d), sh = shownShifts()[d], n = calEvents(d).length, pw = sh ? Math.min(b, (sh === 'day' ? 570 : 510) / 960) : 0;
  return '<span class="busy" title="' + (n ? plural(n, 'event') : 'No events') + (sh ? ' · ' + sh + ' shift' : '') + '"><i class="w" style="width:' + Math.round(pw * 100) + '%"></i><i style="width:' + Math.round((b - pw) * 100) + '%"></i></span>';
}
var _calendar8 = VIEWS.calendar;
VIEWS.calendar = function () {
  var h = _calendar8(); if (!App.cal) return h;
  return h.replace('Dots are planned sessions (ringed when done). Numbers are miles run.', 'Dots are planned sessions (ringed when done). Numbers are miles run. The bar under each day shows how booked it is: <span class="busykey"><i class="w"></i>work</span> <span class="busykey"><i></i>personal</span>. Your events are listed under each week below.');
};
