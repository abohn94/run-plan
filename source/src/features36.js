/* ================= General fitness mode =================
   Setup asks what the app is for: race training, general fitness (cardio of any kind, strength progression, health
   tracking and scheduling), or both. Fitness-only setup skips the running questions, asks which cardio you do, and builds
   a rolling plan of cardio sessions and lifts. Adding a race later walks through runner type and plan style, using the
   fitness history you already have. More → Features turns parts of the app on or off. */
var CARDIO_OPTS = [['run', 'Outdoor runs'], ['tread', 'Treadmill runs'], ['ellip', 'Elliptical'], ['bike', 'Indoor bike'], ['row', 'Rower'], ['cycle', 'Outdoor rides'], ['swim', 'Swimming'], ['walk', 'Incline walks'], ['stairs', 'Stair climber'], ['hike', 'Hiking']];
if (WIZ_STEPS.indexOf('focus') < 0) WIZ_STEPS.splice(1, 0, 'focus');
if (WIZ_STEPS.indexOf('cardio') < 0) WIZ_STEPS.splice(WIZ_STEPS.indexOf('focus') + 1, 0, 'cardio');
function focusOf(p) { p = p || st().profile || {}; return p.focus || 'race'; }
function isFitOnly(p) { return focusOf(p) === 'fitness'; }
function fitRuns(p) { return (p.cardio || []).some(function (k) { return k === 'run' || k === 'tread'; }); }
function wizSkip(name, p) {
  var f = focusOf(p);
  if (name === 'cardio') return f === 'race' || !p.focus;
  if (f !== 'fitness') return false;
  if (name === 'current') return !fitRuns(p);
  return name === 'experience' || name === 'goal' || name === 'races' || name === 'match' || name === 'place';
}
var _setup36 = VIEWS.setup;
VIEWS.setup = function () {
  if (!App.wiz) App.wiz = wizInit();
  var z = App.wiz, p = z.profile;
  if (z.step > 0 && !p.focus && WIZ_STEPS[z.step] !== 'focus' && !Store.state.profile) z.step = WIZ_STEPS.indexOf('focus');
  var dir = z._prev != null && z.step < z._prev ? -1 : 1, guard = 0;
  while (WIZ_STEPS[z.step] && wizSkip(WIZ_STEPS[z.step], p) && guard++ < 20) z.step += dir;
  if (z.step < 0) z.step = 0; if (z.step >= WIZ_STEPS.length) z.step = WIZ_STEPS.length - 1;
  if (z._prev != null && z.step < z._prev && wizSkip(WIZ_STEPS[z.step], p)) z.step = z._prev;
  z._prev = z.step;
  var name = WIZ_STEPS[z.step], fit = isFitOnly(p), h;
  if (name === 'focus') h = wizBar(z) + focusStep(p);
  else if (name === 'cardio') h = wizBar(z) + cardioStep(p);
  else if (name === 'review' && fit) h = wizBar(z) + fitReview(z);
  else h = _setup36();
  if (name === 'welcome') h = h.replace('A running and strength plan built around your races, your week and your gym days.', 'Race training, general fitness, or both: runs, lifts, machines and outdoor workouts in one plan built around your week.');
  if (fit && name === 'days') h = h.replace('Which days can you run?', 'Which days can you work out?').replace('The plan only schedules runs on these days.', 'The plan only schedules cardio on these days. Lifts go on your gym days.')
    .replace(/<label class="f">Most runs per week<select class="i" name="runDays">[\s\S]*?<\/select><\/label>/, '<input type="hidden" name="runDays" value="' + Math.max(3, +p.cardioDays || 3) + '"><input type="hidden" name="_fit" value="1">').replace('Long run day', 'Longest session day').replace('Days you can run', 'Days you can work out');
  if (fit && name === 'gym') h = h.replace('Lifting makes you a more durable, more efficient runner. Your run schedule is arranged around your gym days.', 'Strength sessions track your weights and reps, so you can see your progress lift by lift.').replace(/<label class="f">Extra gym days: a lift plus a short treadmill run[\s\S]*?<\/label>/, '').replace(/<label class="check"><input type="checkbox" name="doubles"[\s\S]*?<\/label>/, '<label class="check"><input type="checkbox" name="doubles"' + (p.doubles !== false ? ' checked' : '') + '> I can do cardio and lift on the same day</label>')
    .replace('Sessions are 45 minutes: heavy compound lifts, plyometrics, and built-in shin and calf work.', 'Sessions are about 45 minutes of compound lifts, with weights that progress as you log them.').replace('See my plan', 'Continue');
  if (fit && name === 'current') h = h.replace('Where are you now?', 'Your running now').replace('Miles per week now', 'Miles per week now (0 is fine)');
  if (name === 'current' && focusOf(p) === 'both' && Store.state.profile) { var cs = cardioHist(); if (cs) h = h.replace('<div class="card stack">', '<div class="banner info small"><b>From your training so far:</b> ' + cs + '. The plan starts from this, so your running builds on the fitness you already have.</div><div class="card stack">'); }
  if (name === 'review' && fit) {}
  return h;
};
function wizBar(z) { var s = z.step, vis = WIZ_STEPS.filter(function (n, i) { return i > 0 && !wizSkip(n, z.profile); }), at = vis.indexOf(WIZ_STEPS[s]); return '<div class="wizard-steps" aria-label="Step ' + (at + 1) + ' of ' + vis.length + '">' + vis.map(function (x, i) { return '<i class="' + (i <= at ? 'on' : '') + '"></i>'; }).join('') + '</div>'; }
function focusStep(p) {
  return '<div class="q"><h1>What would you like to use the app for?</h1><p class="lead">You can change this any time, and add a race whenever you\'re ready.</p></div><div class="stack">' +
    optCard('focus', 'race', 'Race training', 'A running plan built around your races, with strength work to stay durable', p.focus) +
    optCard('focus', 'fitness', 'General fitness', 'Cardio of any kind, strength progression, health tracking and a weekly schedule. No race needed', p.focus) +
    optCard('focus', 'both', 'Both', 'Train for races and keep your other workouts in the same plan', p.focus) + '</div>' + wizFoot('Continue', !!p.focus);
}
function cardioStep(p) {
  var sel = p.cardio || (p.cardio = isFitOnly(p) ? [] : ['run']), fit = isFitOnly(p);
  return '<div class="q"><h1>What cardio do you do?</h1><p class="lead">' + (fit ? 'Pick everything you enjoy. The plan rotates through them, with easy, longer and interval sessions.' : 'Your runs come from the race plan. Pick anything else you do so it\'s logged and counted.') + '</p></div>' +
    '<div class="card stack"><div class="chips">' + CARDIO_OPTS.map(function (o) { return '<button type="button" class="chip" data-act="fit-cardio" data-arg="' + jattr({ k: o[0] }) + '" aria-pressed="' + (sel.indexOf(o[0]) >= 0) + '">' + o[1] + '</button>'; }).join('') + '</div>' +
    (fit ? '<label class="f">Cardio sessions per week<div class="chips">' + [1, 2, 3, 4, 5, 6].map(function (n) { return '<button type="button" class="chip" data-act="fit-cdays" data-arg="' + jattr({ n: n }) + '" aria-pressed="' + (+p.cardioDays === n) + '">' + n + '</button>'; }).join('') + '</div></label>' : '') +
    '<p class="small muted">Garmin activities of any type are pulled in automatically: gym lifts, runs, rides, rows, the elliptical, swims and walks.</p></div><p class="err" id="wizErr"></p>' +
    '<div class="wizfoot"><button type="button" class="btn ghost" data-act="wiz-back">Back</button><button class="btn primary" data-act="fit-cardio-next">Continue</button></div>';
}
ACTIONS['fit-cardio'] = function (a) { var p = App.wiz.profile, c = p.cardio || (p.cardio = []), i = c.indexOf(a.k); if (i >= 0) c.splice(i, 1); else c.push(a.k); render(); };
ACTIONS['fit-cdays'] = function (a) { App.wiz.profile.cardioDays = a.n; render(); };
ACTIONS['fit-cardio-next'] = function () {
  var p = App.wiz.profile, err = $('#wizErr');
  if (isFitOnly(p) && !(p.cardio || []).length) { if (err) err.textContent = 'Pick at least one, or go back and choose race training.'; return; }
  if (isFitOnly(p) && !p.cardioDays) p.cardioDays = 3;
  if (isFitOnly(p)) { p.goalType = 'fitness'; if (!p.level) p.level = 'some'; p.method = p.method || 'balanced'; App.wiz.picked = true; if (!fitRuns(p)) { p.mpw = p.mpw || 0; p.longest = p.longest || 0; } }
  App.wiz.step++; render(); window.scrollTo(0, 0);
};
/* focus picked: set sensible defaults for the steps that get skipped */
var _wizSet36 = ACTIONS['wiz-set'];
ACTIONS['wiz-set'] = function (a) {
  if (a.k === 'focus') { var p = App.wiz.profile; if (a.v === 'fitness') { p.goalType = 'fitness'; p.level = p.level || 'some'; p.method = p.method || 'balanced'; App.wiz.picked = true; } else if (p.goalType === 'fitness' && !App.wiz.events.length) p.goalType = null; }
  _wizSet36(a);
};
var _wizBack36 = ACTIONS['wiz-back'];
ACTIONS['wiz-back'] = function () { var z = App.wiz; if (!z) return _wizBack36(); var s = z.step - 1; while (s > 0 && wizSkip(WIZ_STEPS[s], z.profile)) s--; if (s <= 0 && !Store.state.profile) { z.step = 0; z._prev = 0; render(); return; } if (s < 1 && Store.state.profile) return _wizBack36(); z.step = s; z._prev = s; render(); window.scrollTo(0, 0); };
var _wizFin36 = ACTIONS['wiz-finish'];
ACTIONS['wiz-finish'] = function () {
  var p = App.wiz.profile; if (!p.focus) p.focus = 'race';
  if (isFitOnly(p)) { p.goalType = 'fitness'; p.level = p.level || 'some'; p.method = p.method || 'balanced'; p.runDays = Math.max(3, +p.cardioDays || 3); if (!App.wiz.events.some(function (e) { return e.priority === 'A'; })) {} }
  var fresh = !Store.state.profile, fit = isFitOnly(p);
  _wizFin36();
  if (fresh && fit) coachSay('Your plan is ready: ' + plural(+p.cardioDays || 3, 'cardio session') + ' and ' + plural(p.liftDays || 0, 'lifting day') + ' a week. It keeps rolling forward, and each morning I check your recovery. Add a race any time under Goals & races.', [{ label: 'See today', act: { nav: '#/today' } }]);
};
function fitReview(z) {
  var p = z.profile, prev = E.generate({ profile: p, events: z.events }), w1 = prev.weeks[0];
  var cmin = 0, nC = 0; w1.days.forEach(function (d) { d.parts.forEach(function (x) { if (x.cardio || E.isRun(x)) { nC++; cmin += x.min || Math.round((x.mi || 0) * 10); } }); });
  return '<div class="q"><h1>Here is your plan</h1><p class="lead">A rolling fitness plan starting ' + E.fmtDate(prev.start, { weekday: 'long', month: 'short', day: 'numeric' }) + '. Sessions build gradually, with an easier week every few weeks.</p></div>' +
    '<div class="tiles"><div class="tile"><span>Cardio</span><b>' + nC + '</b><em>sessions a week</em></div><div class="tile"><span>Cardio time</span><b>' + cmin + '</b><em>min in week 1</em></div><div class="tile"><span>Lifting</span><b>' + w1.tot.lifts + '</b><em>days a week</em></div></div>' +
    '<div class="sechead"><h2>Week 1</h2></div><div class="stack">' + w1.days.map(function (d) { return '<div class="dayblock"><div class="d">' + d.dow + '<b>' + E.pd(d.date).getDate() + '</b></div><div class="items">' + d.parts.map(function (x) { return x.type === 'rest' ? '<div class="restrow">' + esc(x.title) + '</div>' : '<div class="sess t-' + x.type + '"><span class="tico">' + (TICON[x.type] || TICON.easy) + '</span><div class="sh"><span class="lab">' + (x.cardio ? 'Cardio' : TYPE_LABEL[x.type]) + '</span><span class="ti">' + esc(x.title) + '</span></div><div class="big">' + (E.isRun(x) ? '<b>' + mi(x.mi) + '</b><small>mi</small>' : '<b>' + x.min + '</b><small>min</small>') + '</div></div>'; }).join('') + '</div></div>'; }).join('') + '</div>' +
    '<p class="small muted">Health tracking (sleep, HRV, resting heart rate, Body Battery and weight) works the same in every mode once Garmin is connected.</p>' +
    '<div class="wizfoot"><button class="btn ghost" data-act="wiz-back">Back</button><button class="btn primary" data-act="wiz-finish">Start training</button></div>';
}
/* last 4 weeks of cardio, for the race setup */
function cardioHist() {
  try {
    var from = E.addD(App.today, -28), A = activities().filter(function (a) { return a.date >= from && a.date <= App.today && a.kind !== 'lift'; });
    if (!A.length) return '';
    var min = 0, runMi = 0, nR = 0; A.forEach(function (a) { min += sessMin(a) || 0; if (a.kind === 'run') { nR++; runMi += a.mi || 0; } });
    return plural(A.length, 'cardio session') + ' in the last 4 weeks (about ' + Math.round(min / 4) + ' min a week)' + (nR ? ', including ' + plural(nR, 'run') + ' (' + Math.round(runMi / 4 * 10) / 10 + ' mi a week)' : '');
  } catch (e) { return ''; }
}

/* ---- adding a race in fitness mode: set up race training ---- */
var _sheetSave36 = ACTIONS['sheet-save'];
ACTIONS['sheet-save'] = function (a) {
  var was = sheetCtx && sheetCtx.kind === 'event' && App.view !== 'setup' && isFitOnly() ? (st().events || []).length : -1;
  _sheetSave36(a);
  if (was >= 0 && (st().events || []).length > was) setTimeout(raceSetupAsk, 300);
};
function raceSetupAsk() {
  ASK({ title: 'Set up race training?', text: 'Your race is saved. A few quick questions (your running experience and a training style) turn your plan into a race build. Your lifts and other cardio stay in it.', ok: 'Set it up', cancel: 'Not now' }, function () { raceSetupStart(); });
}
function raceSetupStart() {
  var z = wizInit(); z.profile.focus = 'both'; z.profile.goalType = z.profile.goalType === 'fitness' ? 'time' : z.profile.goalType; z.profile.level = null; z.profile.method = null; z.picked = false;
  if (!(z.profile.cardio || []).length) z.profile.cardio = ['run'];
  if (z.profile.cardio.indexOf('run') < 0 && z.profile.cardio.indexOf('tread') < 0) z.profile.cardio.unshift('run');
  z.step = WIZ_STEPS.indexOf('experience'); z._prev = z.step; App.wiz = z; go('#/setup');
}
ACTIONS['race-setup'] = function () { raceSetupStart(); };

/* ---- Features: choose what the app shows ---- */
TITLES.features = 'Features'; TABOF.features = 'more';
var FEAT = [
  ['race', 'Race training', 'Race builds, race-day pacing, fuelling and course prep'],
  ['strength', 'Strength training', 'Lifting days with weight and rep tracking'],
  ['coach', 'Coach suggestions', 'Suggested plan changes from your recovery and training. Pain and injury advice always stays on'],
  ['shins', 'Shin & prehab routine', 'Reminders on rest days'],
  ['nutrition', 'Nutrition', 'Fuelling guides in the library']
];
function featOn(k) { if (k === 'race') return focusOf() !== 'fitness'; if (k === 'strength') return +(st().profile || {}).liftDays > 0 || !(st().profile); var f = (st().prefs || {}).feat || {}; return f[k] !== false; }
VIEWS.features = function () {
  var p = st().profile || {};
  return '<div class="pagehead"><h1>Features</h1><p>Use the app for race training, general fitness, or both, and switch off what you don\'t need. Turning something off hides it; nothing is deleted.</p></div>' +
    '<section class="card stack"><h3>What it\'s for</h3><div class="chips">' + [['race', 'Race training'], ['fitness', 'General fitness'], ['both', 'Both']].map(function (o) { return '<button class="chip" data-act="feat-focus" data-arg="' + jattr({ v: o[0] }) + '" aria-pressed="' + (focusOf() === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>' +
    (focusOf() !== 'race' ? '<p class="small muted">Cardio: ' + esc((p.cardio || []).map(function (k) { return (CARDIO_OPTS.filter(function (o) { return o[0] === k; })[0] || [0, k])[1]; }).join(', ') || 'none picked') + (isFitOnly() ? ' · ' + plural(+p.cardioDays || 3, 'session') + ' a week' : '') + '. <a href="#" data-act="feat-cardio">Change</a></p>' : '') + '</section>' +
    '<section class="card stack"><h3>Show in the app</h3>' + FEAT.filter(function (f) { return f[0] !== 'race'; }).map(function (f) { return '<label class="check"><input type="checkbox" data-feat="' + f[0] + '"' + (featOn(f[0]) ? ' checked' : '') + '> <span><b>' + f[1] + '</b><br><span class="small muted">' + f[2] + '</span></span></label>'; }).join('') +
    '<p class="small muted">Health tracking (sleep, HRV, resting heart rate, Body Battery, weight) and activity history are always on.</p></section>';
};
ACTIONS['feat-focus'] = function (a) {
  var cur = focusOf(); if (a.v === cur) return;
  if (a.v === 'fitness') {
    ASK({ title: 'Switch to general fitness?', text: 'Your plan becomes cardio sessions and lifts with no race build. Your races stay saved, and you can switch back any time.', ok: 'Switch', cancel: 'Cancel' }, function () {
      Store.edit('profile', null, function (S) { var p = S.profile; p.focus = 'fitness'; if (!(p.cardio || []).length) p.cardio = ['run', 'ellip', 'bike']; p.cardioDays = p.cardioDays || Math.min(6, +p.runDays || 3); }); recompute(); render(); toast('Plan rebuilt');
    });
  } else if (cur === 'fitness') raceSetupStart();
  else { Store.edit('profile', null, function (S) { S.profile.focus = a.v; }); recompute(); render(); toast('Saved'); }
};
ACTIONS['feat-cardio'] = function () { var z = wizInit(); z.step = WIZ_STEPS.indexOf('cardio'); z._prev = z.step; App.wiz = z; go('#/setup'); };
document.addEventListener('change', function (e) {
  var k = e.target && e.target.dataset && e.target.dataset.feat; if (!k) return; var v = e.target.checked;
  if (k === 'strength') { Store.edit('profile', null, function (S) { var p = S.profile; if (v) { p.liftDays = p.liftDaysWas || 2; } else { p.liftDaysWas = p.liftDays || 2; p.liftDays = 0; p.crossDays = 0; } }); recompute(); toast(v ? 'Lifting days back in your plan' : 'Lifting removed from your plan'); return; }
  Store.edit('prefs', 'feat', function (S) { S.prefs = S.prefs || {}; var f = Object.assign({}, S.prefs.feat || {}); if (v) delete f[k]; else f[k] = false; if (Object.keys(f).length) S.prefs.feat = f; else delete S.prefs.feat; });
  toast(v ? 'Shown' : 'Hidden');
});
var _more36 = VIEWS.more;
VIEWS.more = function () { var h = _more36(), i = h.indexOf('<a href="#/status"'); if (i < 0) i = h.indexOf('<a href="#/intake"'); var row = '<a href="#/features">Features<span class="v">' + ({ race: 'race training', fitness: 'general fitness', both: 'race + fitness' })[focusOf()] + '</span><span class="chev">›</span></a>'; return i < 0 ? h : h.slice(0, i) + row + h.slice(i); };
var _you36 = VIEWS.you;
VIEWS.you = function () {
  var h = _you36(), f = (st().prefs || {}).feat || {};
  if (f.nutrition === false) h = h.replace(/<a href="#\/nutrition">[\s\S]*?<\/a>/, '');
  if (f.shins === false) h = h.replace(/<a href="#\/shins">[\s\S]*?<\/a>/, '');
  if (isFitOnly()) { h = h.replace('Goals & races', 'Races (optional)').replace('Gym days &amp; treadmill', 'Cardio & gym days').replace('Gym days & treadmill', 'Cardio & gym days'); var p = st().profile || {}; h = h.replace(/(Schedule, gym days & volume checks<span class="v">)[^<]*/, '$1' + (+p.cardioDays || 3) + ' cardio · ' + (p.liftDays || 0) + ' lifts').replace(/<em>VDOT<\/em>/, '<em>VDOT (runs)</em>'); }
  return h;
};
var _today36 = VIEWS.today;
VIEWS.today = function () {
  var h = _today36(), f = (st().prefs || {}).feat || {};
  if (f.shins === false) h = h.replace(/<div class="card shinrem shinrem2">[\s\S]*?Done ✓<\/button><\/div>/, '').replace(/<a class="card shinrem" href="#\/shins">[\s\S]*?<\/a>/, '');
  return h;
};
/* coach suggestions off: keep only pain and safety findings */
var _cf36 = coachFindings;
coachFindings = function () { var out = _cf36.apply(this, arguments); if (((st().prefs || {}).feat || {}).coach === false && out && out.filter) out = out.filter(function (x) { return /^(pain|niggle|sick|ill|hr-|chest)/.test(String(x.id || '')); }); return out; };
/* fitness mode: no race-prep or run-mix nudges */
var _mixF36 = mixFindings;
mixFindings = function () { return isFitOnly() ? [] : _mixF36(); };
var _rpf36 = typeof racePrepFindings === 'function' ? racePrepFindings : null;
if (_rpf36) racePrepFindings = function () { return isFitOnly() ? [] : _rpf36.apply(this, arguments); };
App.p36 = { wizSkip: wizSkip, focusOf: focusOf, cardioHist: cardioHist, raceSetupStart: raceSetupStart, featOn: featOn };

/* ---- fitness-mode screens: talk in sessions and minutes, not miles ---- */
var _recompute36 = recompute;
recompute = function () { var r = _recompute36.apply(this, arguments); TYPE_LABEL.cross = focusOf() === 'race' ? 'Walk / other' : 'Cardio'; return r; };
TYPE_LABEL.cross = 'Walk / other';
function cardioPlan(w) { var n = 0, m = 0; (w && w.days || []).forEach(function (d) { d.parts.forEach(function (p) { if (p.cardio || (E.isRun(p) && p.type !== 'race')) { n++; m += p.min || Math.round((p.mi || 0) * 10); } }); }); return { n: n, min: m }; }
function cardioWeek(ws) {
  var we = E.addD(ws, 6), min = 0, n = 0;
  try { activities().forEach(function (a) { if (a.date < ws || a.date > we || a.date > App.today || a.kind === 'lift') return; n++; min += sessMin(a) || 0; }); } catch (e) {}
  return { min: Math.round(min), n: n };
}
var _plan36 = VIEWS.plan;
VIEWS.plan = function (arg) {
  var h = _plan36.apply(this, arguments); if (!isFitOnly() || !App.plan) return h;
  return h.replace(/<div class="grid4"><div class="metric"><span>Planned<\/span><b>[\s\S]*?<span>Gym<\/span><b>(\d+)<\/b><\/div><\/div>/, function (m, lifts) {
    var sel = +((h.match(/<h2>Week (\d+) /) || [])[1]) || 1, w = App.plan.weeks[sel - 1] || App.plan.weeks[0], c = cardioWeek(w.start);
    return '<div class="grid4"><div class="metric"><span>Cardio</span><b>' + cardioPlan(w).n + '</b></div><div class="metric"><span>Planned</span><b>' + cardioPlan(w).min + ' min</b></div><div class="metric"><span>Done</span><b>' + c.min + ' min</b></div><div class="metric"><span>Gym</span><b>' + lifts + '</b></div></div>';
  });
};
var _prog36 = VIEWS.progress;
VIEWS.progress = function (arg) {
  var h = _prog36.apply(this, arguments); if (focusOf() === 'race' || (App.args && App.args[0] && App.args[0] !== 'overview')) return h;
  var ws = [], cur = App.plan ? (E.weekOf(App.plan, App.today) || {}).start : null; if (!cur) return h;
  for (var i = 7; i >= 0; i--) ws.push(E.addD(cur, -7 * i));
  var by = {}, from = ws[0];
  try { activities().forEach(function (a) { if (a.date < from || a.date > App.today || a.kind === 'lift') return; var k = a.kind === 'run' ? 'Running' : (a.g && a.g.type ? gLabel(a.g.type) : a.name) || 'Other'; by[k] = (by[k] || 0) + (sessMin(a) || 0); }); } catch (e) {}
  var rows = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; }).slice(0, 6);
  var card = '<section class="card"><h3>Cardio minutes</h3><p class="small muted">Every non-lifting session from your watch or log, per week. Planned in grey.</p>' +
    barChart(ws.map(function (s, i) { var w = E.weekOf(App.plan, s); return { label: i === 7 ? 'now' : E.fmtDate(s, { month: 'numeric', day: 'numeric' }), a: cardioPlan(w).min, b: cardioWeek(s).min, cur: i === 7 }; })) +
    (rows.length ? '<ul class="plain small wkl" style="margin-top:8px">' + rows.map(function (k) { return '<li class="spread"><span>' + esc(String(k).replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); })) + '</span><b>' + Math.round(by[k]) + ' min</b></li>'; }).join('') + '</ul><p class="tiny muted">Last 8 weeks, by activity.</p>' : '') + '</section>';
  if (isFitOnly()) { var wk = App.week || {}; h = h.replace(/(<div class="pagehead[^"]*">[\s\S]*?<p>)[^<]*/, '$1General fitness · week ' + (wk.n || 1)); var i3 = h.search(/<div class="(tiles|grid2|kpis)/); if (i3 > 0) return h.slice(0, i3) + card + h.slice(i3); }
  var i2 = h.indexOf('<section'); return i2 < 0 ? h + card : h.slice(0, i2) + card + h.slice(i2);
};
var _more36b = VIEWS.more;
VIEWS.more = function () {
  var h = _more36b(); if (!isFitOnly()) return h;
  h = h.replace(/<button class="card rtcard"[\s\S]*?<\/button>/, '');
  ['#/style', '#/planctl', '#/intake', '#/zones', '#/preview'].forEach(function (r) { h = h.replace(new RegExp('<a href="' + r.replace(/\//g, '\\/') + '[^"]*">[\\s\\S]*?<\\/a>'), ''); });
  var p = st().profile || {}; h = h.replace(/(Schedule, gym days &(?:amp;)? volume checks<span class="v">)[^<]*/, '$1' + (+p.cardioDays || 3) + ' cardio · ' + (p.liftDays || 0) + ' lifts').replace('Goals &amp; races', 'Races (optional)').replace('Goals & races', 'Races (optional)');
  return h;
};
/* the running intake isn't asked in fitness mode */
var _cf36b = coachFindings;
coachFindings = function () { var out = _cf36b.apply(this, arguments); if (isFitOnly() && out && out.filter) out = out.filter(function (x) { return !/^(intake|mixlow|mixhigh|vdot|pace|stride|hrz)/.test(String(x.id || '')); }); return out; };
var _settings36 = VIEWS.settings;
if (_settings36) VIEWS.settings = function () { var h = _settings36.apply(this, arguments); if (!isFitOnly()) return h; return h.replace('Days you can run', 'Days you can work out').replace(/(<label class="f">)Most runs per week/, '$1Most cardio sessions per week (set under More → Features)').replace('Long run day', 'Longest session day'); };
var _today36b = VIEWS.today;
VIEWS.today = function () { var h = _today36b(); if (!isFitOnly()) return h; return h.replace(/<section class="card ikcard">[\s\S]*?<\/section>/, ''); };
var _more36c = VIEWS.more;
VIEWS.more = function () { var h = _more36c(); if (!isFitOnly() || fitRuns(st().profile || {})) return h; ['#/form', '#/guides', '#/glossary', '#/shoes'].forEach(function (r) { h = h.replace(new RegExp('<a href="' + r.replace(/\//g, '\\/') + '"[^>]*>[\\s\\S]*?<\\/a>'), ''); }); return h; };
/* Today's week card and the calendar headers count minutes in fitness mode */
var _today36c = VIEWS.today;
VIEWS.today = function () {
  var h = _today36c(); if (!isFitOnly() || !App.week) return h;
  var c = cardioWeek(App.week.start), pl = cardioPlan(App.week);
  return h.replace(/<span><b style="color:var\(--ink\)">[^<]*<\/b> of [^<]* mi<\/span>/, '<span><b style="color:var(--ink)">' + c.min + '</b> of ' + pl.min + ' cardio min</span>');
};
/* fitness mode: hide run-only prompts on Today, and word the strength check for any training */
var _today36d = VIEWS.today;
VIEWS.today = function () {
  var h = _today36d(); if (!isFitOnly()) return h;
  h = h.replace(/<section class="card tipc">[\s\S]*?<\/section>/, '').replace(/<section class="card promptcard"><div class="eyebrow">Weekly fitness check<\/div>[\s\S]*?<\/section>/, '');
  return h.replace('ready for the miles ahead', 'ready for the training ahead');
};
