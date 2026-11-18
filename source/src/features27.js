/* ================= The coach: watches every metric, says what it saw, what to change, how the plan changes,
   and what to expect. You accept or decline; accepted changes are followed up in the weekly check-in. ================= */
function dlab(d) { return d === App.today ? 'today' : d === E.addD(App.today, 1) ? 'tomorrow' : fmtD(d, { weekday: 'long' }); }
function daysAhead(n, pred, from) {
  var out = [];
  for (var i = from == null ? 1 : from; i <= n; i++) { var d = E.addD(App.today, i), day = dayOf(d); if (!day) continue; day.parts.forEach(function (p) { if (pred(p, d) && !partDone(d, p)) out.push({ date: d, p: p }); }); }
  return out;
}
var isHardP = function (p) { return p.type === 'speed' || p.type === 'long'; };
var isEasyP = function (p) { return E.isRun(p) && (p.type === 'easy' || p.type === 'recovery'); };
function nextHard(from) { return daysAhead(7, isHardP, from)[0] || null; }
function nextEasy(from) { return daysAhead(5, isEasyP, from)[0] || null; }
function partLine(x) { return x.p.title + (x.p.mi ? ' (' + mi(x.p.mi) + ' mi)' : ''); }
function weekMi() { return App.week ? App.week.tot.mi : 0; }

/* ---------- what the coach sees ---------- */
function fatigueSignals() {
  var sig = [], m = monoAt(App.today), S = monoSeries(), past = S.slice(-5, -1).filter(function (x) { return x.load; }), as = avg(past.map(function (x) { return x.strain; }));
  if (m.mono >= 2 && m.load) sig.push({ k: 'mono', t: 'your last 7 days have had no real easy days (monotony ' + m.mono.toFixed(1) + ')' });
  if (as && m.strain > as * 1.5 && m.load > 150) sig.push({ k: 'strain', t: 'training strain is ' + Math.round((m.strain / as - 1) * 100) + '% above your last 4 weeks' });
  var W = lastWeeks(5).map(weekEffort), cur = W[W.length - 1], base = avg(W.slice(0, -1).filter(function (w) { return w.rated >= 2 && w.garmin; }).map(function (w) { return w.srpe / w.garmin; }));
  if (cur.rated >= 2 && cur.garmin && base && cur.srpe / cur.garmin > base * 1.3) sig.push({ k: 'srpe', t: 'runs have felt ' + Math.round((cur.srpe / cur.garmin / base - 1) * 100) + '% harder than the work measured' });
  var H = hrvStability(); if (H && H.suppressed) sig.push({ k: 'hrv', t: 'your 7-day HRV has been below your normal range for ' + H.belowDays + ' of the last 4 days' }); else if (H && H.unsettled) sig.push({ k: 'hrvcv', t: 'your HRV is swinging more than usual from day to day' });
  var Wl = wellnessSeries(), N = wellnessNorm(), r3 = Wl.filter(function (x) { return E.diffD(x.d, App.today) <= 2; });
  if (N && r3.length >= 2 && avg(r3.map(function (x) { return x.v; })) < N.mean - 12) sig.push({ k: 'well', t: 'your check-ins over the last few days are well below your normal (' + Math.round(avg(r3.map(function (x) { return x.v; }))) + ' vs ' + Math.round(N.mean) + ')' });
  var pc = GX().pc || {}, P = Object.keys(pc).map(function (k) { return pc[k]; }).filter(function (x) { return E.diffD(x.date, App.today) <= 7; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(-2);
  if (P.length === 2 && P.every(function (x) { return x.v <= -4; })) sig.push({ k: 'pc', t: 'Garmin\'s performance condition was ' + P.map(function (x) { return x.v; }).join(' and ') + ' on your last two runs' });
  return sig;
}
function coachFindings() {
  return cm('findings', function () {
    var F = [], ws = wkStart(App.today), prof = st().profile || {}, prefs = st().prefs || {};
    var add = function (f) { f.id = f.id + ':' + ws; F.push(f); };
    /* fatigue: two or more signals together */
    var sig = fatigueSignals(), nh = nextHard(), ne = nextEasy();
    if (sig.length >= 2 && nh) {
      add({ id: 'fatigue', pri: 10, tone: 'act', title: 'Several signs of fatigue', seen: 'In the last week ' + sig.map(function (s) { return s.t; }).join('; ') + '. One of these alone is noise; together they usually mean fatigue is building faster than you are recovering.',
        change: 'Make ' + dlab(nh.date) + '\'s ' + partLine(nh) + ' an easy run' + (ne && ne.date !== nh.date ? ', and shorten ' + dlab(ne.date) + '\'s easy run by about a third' : '') + '.',
        plan: 'This week drops by about ' + mi((nh.p.type === 'long' ? nh.p.mi * 0.2 : 0) + (ne ? ne.p.mi * 0.3 : 0)) + ' mi and the hard session becomes easy running. Next week is unchanged; if you still look tired by the weekly check-in, I will suggest a lighter week.',
        expect: 'Most runners bounce back within 3–5 days: HRV back in range, check-ins back to normal, and easy pace feeling easy again. You lose no fitness; pushing through usually costs a week, not a day.',
        act: { ov: [[nh.date, 'easy']].concat(ne && ne.date !== nh.date ? [[ne.date, 'short']] : []) }, label: 'Ease off' });
    } else {
      if (sig.some(function (s) { return s.k === 'mono'; })) { var e2 = ne || nh; if (e2) add({ id: 'mono', pri: 7, tone: 'act', title: 'Your days are too alike', seen: 'Monotony is ' + monoAt(App.today).mono.toFixed(1) + ' (over 2.0 is the warning line): your easy days are about as hard as your other days, so nothing is fully recovering.', change: 'Turn ' + dlab(e2.date) + '\'s ' + partLine(e2) + ' into a rest day, and keep the next easy runs truly conversational.', plan: 'This week loses ' + mi(e2.p.mi || 0) + ' mi; key sessions stay exactly as planned.', expect: 'Monotony back under 1.5 within a week. Variety (hard days hard, easy days easy) is what lowers illness and overuse injury risk, and you\'ll go into your next workout fresher.', act: { ov: [[e2.date, 'rest']] }, label: 'Add the rest day' }); }
      if (sig.some(function (s) { return s.k === 'hrv'; }) && nh) add({ id: 'hrv', pri: 8, tone: 'act', title: 'HRV is down', seen: 'Your 7-day HRV average has been below your normal range for ' + hrvStability().belowDays + ' of the last 4 days.', change: 'Run ' + dlab(nh.date) + '\'s ' + partLine(nh) + ' as an easy run instead.', plan: 'One hard session becomes easy this week; total miles barely change.', expect: 'HRV usually returns to range in 3–5 days with an easier stretch. If it doesn\'t, check sleep, alcohol, stress and early illness.', act: { ov: [[nh.date, 'easy']] }, label: 'Swap to easy' });
      if (sig.some(function (s) { return s.k === 'srpe'; }) && nh) add({ id: 'srpe', pri: 6, tone: 'watch', title: 'Runs feel harder than the work', seen: 'This week ' + sig.filter(function (s) { return s.k === 'srpe'; })[0].t + '. Heart rate says the sessions were normal; your legs and head say otherwise.', change: 'Keep ' + dlab(nh.date) + '\'s ' + partLine(nh) + ', but start it by feel and cut it short if the first rep feels like the last.', plan: 'No change unless you cut it short; then the app logs what you did and next week builds from that.', expect: 'If it\'s heat, sleep or stress, effort and heart rate realign within a week. If it keeps happening, I\'ll suggest a lighter week.', act: null, label: 'Got it' });
      if (sig.some(function (s) { return s.k === 'strain'; })) add({ id: 'strain', pri: 5, tone: 'watch', title: 'A big jump in training strain', seen: 'This week\'s ' + sig.filter(function (s) { return s.k === 'strain'; })[0].t + '.', change: 'Protect your sleep and keep the next easy runs truly easy.', plan: 'No change needed yet.', expect: 'Strain spikes are fine once in a while; it\'s two or three in a row that lead to illness and niggles.', act: null, label: 'Got it' });
    }
    /* intensity: easy running drifting hard */
    var Z = lastWeeks(2).map(weekZones), zt = [0, 0, 0, 0, 0]; Z.forEach(function (w) { w.t.forEach(function (s, i) { zt[i] += s; }); });
    var ztot = zt.reduce(function (a, b) { return a + b; }, 0), low = ztot ? easyShareOf(zt) : null, cap = easyCapHR();
    var runsN = Z.reduce(function (a, w) { return a + w.n; }, 0);
    if (low != null && low < 0.7 && runsN >= 3 && cap) add({ id: 'easycap', pri: 6, tone: 'act', title: 'Easy runs are drifting too hard', seen: 'Only ' + Math.round(low * 100) + '% of your running time in the last two weeks was easy (under ' + cap + ' bpm). The aim is about 80%.', change: 'Keep easy and long runs under ' + cap + ' bpm, the top of your easy zone, even if it means slowing down or walking up hills.', plan: 'Paces and miles stay the same; I\'ll show the heart-rate cap on every easy run and long run.', expect: 'Easy runs will feel slow for 2–3 weeks. Then the same heart rate buys more speed (watch "Easy pace and heart rate"), and your workouts get better because you arrive fresher.', act: { pref: { easyCap: cap } }, label: 'Show the cap on my runs' });
    /* durability: fading late in long runs */
    var D = durabilitySeries().slice(-3), hi = D.filter(function (x) { return x.v > 8; });
    if (hi.length >= 2 || (D.length && D[D.length - 1].v > 10)) add({ id: 'fuel', pri: 5, tone: 'act', title: 'Fading late in long runs', seen: 'Heart-rate drift was ' + D.map(function (x) { return x.v + '%'; }).join(', ') + ' on your recent long runs (under 5% is strong).', change: 'Start long runs 15–20 s/mi slower for the first 3 miles, drink every 15–20 minutes when it\'s warm, and take a gel or 30–60 g of carbs every 30–40 minutes on runs over 75 minutes.', plan: 'Distances stay the same; I\'ll add a pacing and fuel reminder to your long-run days.', expect: 'Drift under 5% within 3–4 long runs, and stronger final miles, which is exactly what race day needs.', act: { pref: { fuelLong: true } }, label: 'Add the reminders' });
    else if (D.length >= 3 && D[D.length - 1].v < avg(D.slice(0, -1).map(function (x) { return x.v; })) - 1.5) add({ id: 'durgood', pri: 2, tone: 'good', title: 'Your long runs are getting stronger', seen: 'Heart-rate drift on your last long run was ' + D[D.length - 1].v + '%, better than the runs before.', change: 'Keep doing what you\'re doing.', plan: 'No change.', expect: 'Steady finishes now mean a strong last 10K on race day.', act: null, label: 'Nice' });
    /* critical speed vs training paces */
    var c = critSpeed(), zz = _zonesAt7(App.today), tp = zz && zz.T ? (zz.T[0] + zz.T[1]) / 2 : null;
    if (c && tp && c.pace < tp * 0.96) add({ id: 'cs', pri: 4, tone: 'watch', title: 'Your paces may be too cautious', seen: 'Critical speed from your best efforts is ' + pace(c.pace) + '/mi, ' + Math.round(tp - c.pace) + ' s/mi faster than your threshold training pace of ' + pace(tp) + '/mi.', change: 'Check your paces against a recent race or time trial and update them.', plan: 'If you update, every workout pace shifts to match; easy pace changes least.', expect: 'Workouts at the right intensity: hard enough to move fitness, not so hard you dread them.', act: { nav: '#/zones' }, label: 'Review paces' });
    var CS = csSeries(); if (CS.length >= 3 && CS[CS.length - 1].pace < CS[CS.length - 3].pace - 4) add({ id: 'csgood', pri: 2, tone: 'good', title: 'Critical speed is improving', seen: 'Up from ' + pace(CS[CS.length - 3].pace) + ' to ' + pace(CS[CS.length - 1].pace) + '/mi in two months.', change: 'Nothing; keep stacking consistent weeks.', plan: 'No change.', expect: 'Race predictions follow this number.', act: null, label: 'Nice' });
    /* volume guardrails */
    var R = weekRunSeries(3), lw = R[R.length - 2], capS = prof.injuryProne ? 0.3 : 0.33;
    if (lw && lw.mi >= 8 && lw.n >= 4 && lw.share > capS + 0.03) add({ id: 'longshare', pri: 4, tone: 'watch', title: 'Long run is most of your week', seen: 'Last week\'s long run was ' + Math.round(lw.share * 100) + '% of your ' + mi(lw.mi) + ' miles (guardrail about ' + Math.round(capS * 100) + '%). That usually happens when weekday runs get skipped.', change: 'Don\'t make up missed miles in the long run. If weekdays are tight, a 20-minute easy run beats nothing.', plan: 'No change: the plan already caps the long run, and next week builds from what you actually ran.', expect: 'Load spread across the week is far easier on shins and tendons than the same miles in one day.', act: null, label: 'Got it' });
    if (lw && R[R.length - 3] && R[R.length - 3].mi >= 5 && lw.ramp > 0.3 && App.week) add({ id: 'ramp', pri: 5, tone: 'watch', title: 'A big jump in mileage', seen: 'Last week was ' + mi(lw.mi) + ' mi, up ' + Math.round(lw.ramp * 100) + '% from ' + mi(R[R.length - 3].mi) + '.', change: 'Hold this week near last week\'s total; don\'t add extra.', plan: 'This week is planned at ' + mi(weekMi()) + ' mi. ' + (weekMi() > lw.mi * 1.15 ? 'Accepting makes it a lighter week (about 70%).' : weekMi() < lw.mi ? 'That\'s already lighter than last week, so no change is needed.' : 'That\'s already close, so no change is needed.'), expect: 'Bones and tendons adapt slower than your aerobic system; a steady week now lets the jump settle before the next build.', act: weekMi() > lw.mi * 1.15 ? { light: App.week.start } : null, label: weekMi() > lw.mi * 1.15 ? 'Make this week lighter' : 'Got it' });
    /* pain from the check-in */
    var CI = (st().checkins || []).filter(function (x) { return E.diffD(x.date, App.today) <= 2 && x.pain; }), shin = CI.filter(function (x) { return x.where === 'shin'; });
    if (shin.length) { var tm = daysAhead(2, function (p) { return E.isRun(p); }, 1)[0]; add({ id: 'shin', pri: 9, tone: 'act', title: 'Shin is talking', seen: 'You reported shin pain ' + (shin.length > 1 ? 'on ' + shin.length + ' of the last 3 days' : shin[0].date === App.today ? 'in today\'s check-in' : shin[0].date === E.addD(App.today, -1) ? 'yesterday' : 'on ' + fmtD(shin[0].date, { weekday: 'long' })) + (shin[shin.length - 1].note ? ': "' + shin[shin.length - 1].note + '"' : '') + '.', change: 'Do the shin routine ' + (new Date().getHours() < 15 ? 'today' : 'tonight') + (tm ? ', and make ' + dlab(tm.date) + '\'s ' + partLine(tm) + (shin.length > 1 ? ' a treadmill walk' : ' about a third shorter, on a soft surface or treadmill') : '') + '. Stop any run where it goes above 3/10 or makes you limp.', plan: tm ? (shin.length > 1 ? 'That run becomes a brisk incline walk; if pain is still there in 2 days, the return ladder takes over.' : 'That run drops to about ' + mi((tm.p.mi || 0) * 0.7) + ' mi; the rest of the week stays.') : 'No runs in the next two days, so no change needed.', expect: 'Shin pain at 2/10 that settles with load reduction usually calms in 3–7 days. Catching it now is the difference between a lighter week and a month off.', act: tm ? { ov: [[tm.date, shin.length > 1 ? 'cross' : 'short']], nav: '#/shins' } : { nav: '#/shins' }, label: tm ? 'Adjust and open routine' : 'Open the routine' }); }
    /* bloodwork */
    var b = bloodLatest(), lowB = bloodLow(b);
    if (lowB.length) add({ id: 'blood', pri: 4, tone: 'watch', title: lowB.map(function (m) { return m[1]; }).join(' and ') + ' low', seen: 'Your results from ' + fmtD(b.date, { month: 'short', day: 'numeric' }) + ': ' + lowB.map(function (m) { return m[1] + ' ' + b[m[0]] + ' ' + m[2]; }).join(', ') + '.', change: 'Talk with your doctor about it; for ferritin, iron-rich meals with vitamin C help, and supplements are a medical decision.', plan: 'No plan change.', expect: 'Low iron or vitamin D can make every pace feel harder; correcting them often lifts training within 6–12 weeks.', act: null, label: 'Got it' });
    else if (!b && weekMi() >= 15 && !(prefs.cfNo || {})['bloodbase']) F.push({ id: 'bloodbase', pri: 1, tone: 'watch', title: 'Get a baseline blood test', seen: 'No bloodwork logged. Ferritin and vitamin D are the two most common hidden limits for runners, especially in winter.', change: 'Ask your doctor for ferritin, vitamin D (25-OH) and hemoglobin at your next visit, and log them here.', plan: 'No change.', expect: 'A baseline makes any later dip easy to spot.', act: { sheet: 'blood' }, label: 'Log results' });
    /* good news */
    var H2 = hrvStability(); if (H2 && H2.elevatedLow && !sig.length) add({ id: 'hrvgood', pri: 2, tone: 'good', title: 'Recovering well', seen: 'Your 7-day HRV (' + Math.round(H2.now.mean) + ' ms) is above your normal range.', change: 'If you feel good, today is a good day for quality.', plan: 'No change.', expect: '', act: null, label: 'Nice' });
    var ff = prefs.formFocus; if (ff && typeof formSummary === 'function') { var s2 = formSummary(), Ff = FORM_FOCI[ff.k], since = s2.runs.filter(function (r) { return r.date >= ff.from; }); if (Ff && ff.base != null && since.length >= 3) { var now2 = avg(since.map(function (r) { return r[Ff.metric]; })), better = Ff.metric === 'cad' ? now2 - ff.base : ff.base - now2; if (better > (Ff.metric === 'cad' ? 2 : Ff.metric === 'gct' ? 6 : 0.2)) add({ id: 'formgood', pri: 3, tone: 'good', title: 'Form focus is working', seen: Ff.name + ': ' + fmtMetric(Ff.metric, ff.base) + ' → ' + fmtMetric(Ff.metric, now2) + ' over ' + plural(since.length, 'run') + '.', change: 'Keep the cue going until it feels automatic.', plan: 'No change.', expect: '', act: null, label: 'Nice' }); } }
    /* drop what you declined or already accepted this week */
    var no = prefs.cfNo || {}, acc = prefs.cfAcc || {};
    return F.filter(function (f) { return !no[f.id] && !acc[f.id]; }).sort(function (a, b) { return b.pri - a.pri; });
  });
}
/* ---------- showing a finding ---------- */
function findingHTML(f, compact) {
  return '<div class="cfind ' + f.tone + '"><div class="cf-h"><span class="cf-tag">' + (f.tone === 'act' ? 'Recommendation' : f.tone === 'good' ? 'Going well' : 'Watching') + '</span><b>' + esc(f.title) + '</b></div>' +
    '<p class="small"><b>What I see:</b> ' + esc(f.seen) + '</p>' + (f.tone !== 'good' || f.change !== 'Nothing; keep stacking consistent weeks.' ? '<p class="small"><b>' + (f.tone === 'good' ? 'Keep:' : 'What I recommend:') + '</b> ' + esc(f.change) + '</p>' : '') +
    (compact ? '' : (f.plan && f.plan !== 'No change.' ? '<p class="small"><b>How your plan changes:</b> ' + esc(f.plan) + '</p>' : '') + (f.expect ? '<p class="small"><b>What to expect:</b> ' + esc(f.expect) + '</p>' : '')) +
    '<div class="btns">' + (f.tone === 'good' ? '<button class="btn sm ghost" data-act="cf-no" data-arg="' + jattr({ id: f.id }) + '">' + esc(f.label || 'Nice') + '</button>' : '<button class="btn sm ' + (f.act ? 'primary' : '') + '" data-act="cf-yes" data-arg="' + jattr({ id: f.id }) + '">' + esc(f.label || 'Got it') + '</button>' + (f.act ? '<button class="btn sm ghost" data-act="cf-no" data-arg="' + jattr({ id: f.id }) + '">Not now</button>' : '')) + (compact ? '<button class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'finding', id: f.id }) + '">Why?</button>' : '') + '</div></div>';
}
SHEETS.finding = function (a) { var f = coachFindings().filter(function (x) { return x.id === a.id; })[0]; return f ? '<h3>Coach</h3>' + findingHTML(f, false) : '<p class="small muted">Already handled.</p>'; };
function applyCoachAct(f) {
  var a = f.act; if (!a) return;
  if (a.ov) a.ov.forEach(function (o) { setOverride(o[0], o[1], f.title.toLowerCase()); });
  if (a.light) Store.edit('status', a.light, function (S) { S.status = S.status || {}; S.status[a.light] = { kind: 'busy', level: 'light' }; });
  if (a.pref) Store.edit('prefs', null, function (S) { S.prefs = S.prefs || {}; Object.keys(a.pref).forEach(function (k) { S.prefs[k] = a.pref[k]; }); });
  if (a.sheet) { closeSheet(); setTimeout(function () { openSheet(a.sheet, {}); }, 80); }
  if (a.nav) setTimeout(function () { closeSheet(); go(a.nav); }, a.ov || a.pref ? 400 : 60);
}
function snapshotFor(id) {
  var k = id.split(':')[0], m = monoAt(App.today), H = hrvStability(), D = durabilitySeries(), Z = lastWeeks(2).map(weekZones), zt = [0, 0, 0, 0, 0]; Z.forEach(function (w) { w.t.forEach(function (s, i) { zt[i] += s; }); }); var zs = zt.reduce(function (a, b) { return a + b; }, 0) ? 1 : 0;
  return { mono: Math.round(m.mono * 10) / 10, hrv: H ? Math.round(H.now.mean) : null, drift: D.length ? D[D.length - 1].v : null, easy: zs ? Math.round(easyShareOf(zt) * 100) : null, well: (wellnessSeries().slice(-1)[0] || {}).v || null, k: k };
}
ACTIONS['cf-yes'] = function (a) {
  var f = coachFindings().filter(function (x) { return x.id === a.id; })[0]; if (!f) return;
  Store.edit('prefs', 'cfAcc', function (S) { S.prefs = S.prefs || {}; S.prefs.cfAcc = S.prefs.cfAcc || {}; S.prefs.cfAcc[f.id] = { at: App.today, title: f.title, change: f.change, expect: f.expect, before: snapshotFor(f.id) }; });
  applyCoachAct(f);
  if (f.act) coachSay('Done: ' + f.change + (f.plan && f.plan !== 'No change.' ? '\n\n' + f.plan : '') + (f.expect ? '\n\nWhat to expect: ' + f.expect : '') + '\n\nI\'ll check how it went in your weekly check-in.', [{ label: 'Open this week', act: { nav: '#/plan' } }]);
  if (!a.keep) closeSheet();
  toast(f.act ? 'Done. Your plan is updated' : 'Noted');
};
ACTIONS['cf-no'] = function (a) { Store.edit('prefs', 'cfNo', function (S) { S.prefs = S.prefs || {}; S.prefs.cfNo = S.prefs.cfNo || {}; S.prefs.cfNo[a.id] = App.today; }); closeSheet(); toast('Okay. Your plan stays as it is'); };

/* ---------- where the coach shows up ---------- */
/* Today: the most important recommendation, one at a time */
var _today27 = VIEWS.today;
VIEWS.today = function () {
  var h = _today27(); if (!App.plan || !st().profile) return h;
  var f = null; try { f = coachFindings().filter(function (x) { return x.tone !== 'good'; })[0]; } catch (e) { f = null; }
  if (!f) return h;
  var c = '<section class="card coachcard"><div class="eyebrow">Coach</div>' + findingHTML(f, true) + '</section>';
  var g = h.indexOf('class="herow'); g = g >= 0 ? h.indexOf('</a>', g) : -1;
  return g > 0 ? h.slice(0, g + 4) + c + h.slice(g + 4) : c + h;
};
/* Coach tab: everything it is watching */
var _coach27 = VIEWS.coach;
VIEWS.coach = function () {
  var h = _coach27(); if (App.args[0] === 'archive' || !App.plan) return h;
  var F = []; try { F = coachFindings(); } catch (e) { F = []; }
  var panel = '<section class="card cwatch"><div class="spread"><h3>What I\'m watching</h3><a class="small" href="#/weekly">Weekly check-in ›</a></div>' +
    (F.length ? F.slice(0, 6).map(function (f) { return findingHTML(f, false); }).join('') : '<p class="small muted" style="margin-top:6px">Nothing needs changing right now. Your load, recovery and running all look on track.</p>') + '</section>';
  var i = h.indexOf('<div class="thread"'); return i > 0 ? h.slice(0, i) + panel + h.slice(i) : panel + h;
};
/* easy-run heart-rate cap and long-run fueling, once accepted */
var _hero27 = heroHTML;
heroHTML = function (x, date, zz) {
  var h = _hero27(x, date, zz), p = st().prefs || {}, add = '';
  if (partDone(date, x)) return h;
  if (p.easyCap && (x.type === 'easy' || x.type === 'long' || x.type === 'recovery')) add += '<p class="small capline">Keep heart rate under <b>' + p.easyCap + ' bpm</b>. Slow down or walk hills to stay there.</p>';
  if (p.fuelLong && x.type === 'long') add += '<p class="small capline">First 3 miles 15–20 s/mi slower · drink every 15–20 min · carbs every 30–40 min after the first hour.</p>';
  if (!add) return h;
  var i = h.lastIndexOf('<span class="btn primary"'); return i > 0 ? h.slice(0, i) + add + h.slice(i) : h;
};
App.p27 = { coachFindings: coachFindings, fatigueSignals: fatigueSignals };
