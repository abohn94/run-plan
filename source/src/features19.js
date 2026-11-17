/* ================= Sub-elite runner type, and offering a better-fitting runner type as the plan changes ================= */

/* ---------- what a sub-elite plan would change, shown before you commit ---------- */
var _lvPlans = {};
function planForLevel(level) {
  var s = st(), sig = level + '|' + s.updatedAt + '|' + App.today;
  if (_lvPlans[level] && _lvPlans[level].sig === sig) return _lvPlans[level].plan;
  var copy = JSON.parse(JSON.stringify(s)), p = null; copy.profile.level = level; delete copy.profile.comeback;
  try { p = E.generate(copy); E.adapt(p, copy, E.analyze(p, copy, Store.garmin)); } catch (e) { console.error(e); p = null; }
  E.setWeekStart(wsOf());
  _lvPlans[level] = { sig: sig, plan: p };
  return p;
}
/* average weekly miles over the last 4 weeks, only once there are 4 weeks of history to average */
function recentMpw() {
  var t = App.today, runs = allRuns().filter(function (r) { return r.date <= t; });
  if (!runs.length || runs.reduce(function (a, r) { return r.date < a ? r.date : a; }, t) > E.addD(t, -28)) return null;
  return runs.filter(function (r) { return r.date > E.addD(t, -28); }).reduce(function (a, r) { return a + r.mi; }, 0) / 4;
}
function curVdot() {
  if (App.an && App.an.vdot) return App.an.vdot;
  var p = st().profile || {}, r = p.recent;
  if (r && r.time && (r.mi || E.DIST[r.dist])) { var t = E.parseClock(r.time); if (t > 0) return E.vdotOf(+r.mi || E.DIST[r.dist].mi, t); }
  return null;
}
/* ---------- age and sex: filled in from Garmin when it knows them, editable in Runner type and setup ---------- */
function whoDefaults(p) { var w = GX().who || {}; return { sex: p.sex != null ? p.sex : w.sex === 'FEMALE' ? 'F' : w.sex === 'MALE' ? 'M' : '', by: p.birthYear || w.by || '' }; }
function aboutYouFields(p, pre) {
  var d = whoDefaults(p || {}), o = function (v, l) { return '<option value="' + v + '"' + (d.sex === v ? ' selected' : '') + '>' + l + '</option>'; };
  return '<div class="grid2"><label class="f">Sex<select class="i" id="' + pre + '-sex">' + o('', 'Prefer not to say') + o('F', 'Female') + o('M', 'Male') + '</select></label><label class="f">Birth year<input class="i" id="' + pre + '-by" type="number" inputmode="numeric" min="1920" max="2016" value="' + esc(d.by) + '" placeholder="e.g. 1988"></label></div>';
}
function readAboutYou(pre) { var s = $('#' + pre + '-sex'), b = $('#' + pre + '-by'), by = b ? +b.value : 0; return { sex: s ? s.value : '', birthYear: by > 1900 && by <= +App.today.slice(0, 4) - 8 ? by : null }; }
/* a profile that has never had age or sex set takes them from Garmin, once */
var _whySynced = false;
function syncWho() {
  var p = st().profile, w = GX().who; if (_whySynced || !p || !w || p.sex != null || p.birthYear != null) return; _whySynced = true;
  setTimeout(function () { Store.edit('profile', null, function (S) { if (!S.profile || S.profile.sex != null || S.profile.birthYear != null) return; S.profile.sex = w.sex === 'FEMALE' ? 'F' : w.sex === 'MALE' ? 'M' : ''; S.profile.birthYear = +w.by || null; }); }, 50);
}
var _today19 = VIEWS.today; VIEWS.today = function () { try { syncWho(); } catch (e) {} return _today19(); };
/* the runner's grade, using what's typed in the open sheet if there is one */
function gradeNow() { var p = Object.assign({}, st().profile || {}); if ($('#rt-sex')) { var a = readAboutYou('rt'); p.sex = a.sex; p.birthYear = a.birthYear; } return E.grade(p); }
function whoWords(g) { return g.sex === 'F' ? 'a woman' + (g.age ? ' of ' + g.age : '') : g.sex === 'M' ? 'a man' + (g.age ? ' of ' + g.age : '') : g.age ? 'someone ' + g.age : ''; }
/* what your VDOT is worth for someone your age and sex, in words */
function fitWords(vd, g) { if (!vd) return ''; var vg = vd * g.f; return ' with fitness around VDOT ' + Math.round(vd) + (g.f > 1.01 ? ', which for ' + whoWords(g) + ' is like a ' + Math.round(vg) + ' for a 25-year-old man' : ''); }
function benchTimes(v, g) { var t = function (mi, r) { return E.clock(Math.round(E.predict(v / g.f, mi) / r) * r); }; return t(E.DIST['5k'].mi, 5) + ' for 5K, ' + t(E.DIST.half.mi, 60).replace(/:00$/, '') + ' for the half or ' + t(E.DIST.full.mi, 60).replace(/:00$/, '') + ' for the marathon'; }
function eliteWarnHTML() {
  var m = recentMpw(), mpw = m != null ? m : +(st().profile || {}).mpw || 0, vd = curVdot(), cmp = '', g = gradeNow();
  try {
    var A = planStats(App.plan), B = planStats(planForLevel('elite'));
    cmp = '<div class="rt-cmp"><span>Typical week <b>' + Math.round(A.avg) + ' → ' + Math.round(B.avg) + ' mi</b></span><span>Peak week <b>' + Math.round(A.peak) + ' → ' + Math.round(B.peak) + ' mi</b></span><span>Key workouts <b>' + (Math.round(A.quality * 2) / 2) + ' → ' + (Math.round(B.quality * 2) / 2) + ' a week</b></span><span>Longest run <b>' + Math.round(A.long) + ' → ' + Math.round(B.long) + ' mi</b></span></div>';
  } catch (e) { cmp = ''; }
  var ms = g.age >= 60 ? 0.75 : g.age >= 50 ? 0.85 : 1, low = mpw && mpw < 45 * ms, slow = vd && vd * g.f < 55;
  return '<b>Heads up: this is a big step.</b> Sub-elite plans assume months of ' + Math.round(50 * ms) + '+ mile weeks without injury and race times around ' + (g.f > 1.01 ? benchTimes(57, g) + ' (that\'s sub-elite for ' + whoWords(g) + ')' : 'a sub-18 5K, sub-1:22 half or sub-2:55 marathon' + (g.sex || g.age ? '' : ' (add your age and sex below for benchmarks that fit you)')) + '. ' +
    (low || slow ? 'You\'ve ' + (low ? 'averaged ' + Math.round(mpw) + ' mi a week lately' : '') + (low && slow ? ' and your ' : low ? '' : 'your ') + (slow ? 'current fitness is closer to the experienced plan' : '') + ', so the jump would be steep. ' : '') +
    'Too much too soon is the most common way to get shin splints or a stress fracture. The safety checks (shin-load ceiling, matching recent weeks) stay on.' + cmp;
}

/* the setup wizard asks before choosing sub-elite, too */
var _wizSet19 = ACTIONS['wiz-set'];
ACTIONS['wiz-set'] = function (a) {
  if (a && a.k === 'level' && a.v === 'elite' && !ASK({ icon: '⚠', title: 'Sub-elite training?', text: 'This plan builds to high mileage with two or more hard sessions a week and long runs up to 22 miles. Pick it only if you already run 50+ miles a week injury-free. You can change it any time under You → Runner type.', ok: 'Yes, that\'s me', cancel: 'Pick another' }, ACTIONS['wiz-set'], this, arguments)) return;
  return _wizSet19.apply(this, arguments);
};

/* ---------- does a different runner type fit better? ---------- */
function runnerTypeHint() {
  var p = st().profile; if (!p) return null;
  var cur = runnerType(p), t = App.today, rm = recentMpw(), mpw = Math.max(rm || 0, +p.mpw || 0), vd = curVdot();
  var g = E.grade(p), vg = vd ? vd * g.f : null, ms = g.age >= 60 ? 0.75 : g.age >= 50 ? 0.85 : 1;
  var peak = p.ctl && +p.ctl.peak || 0, mlv = (E.METHODS[p.method] || {}).level || 2, mw = function (x) { return Math.round(x) + ' mi a week'; };
  /* a long gap in your watch history looks like a break */
  var runs = allRuns().filter(function (r) { return r.date <= t; }), lastRun = runs.reduce(function (a, r) { return r.date > a ? r.date : a; }, '');
  if (cur !== 'comeback' && cur !== 'starter' && lastRun && E.diffD(lastRun, t) >= 21) {
    var before = runs.filter(function (r) { return r.date > E.addD(lastRun, -28); }).reduce(function (a, r) { return a + r.mi; }, 0) / 4;
    if (before >= 8) return { to: 'comeback', why: 'Your last logged run was ' + Math.floor(E.diffD(lastRun, t) / 7) + ' weeks ago. A comeback start rebuilds from about half of the ' + mw(before) + ' you ran before.' };
  }
  if (cur === 'comeback') {
    var from = p.comeback && p.comeback.from;
    if (from && E.diffD(from, t) >= 56) return { to: p.level === 'exp' || p.level === 'elite' ? p.level : 'regular', why: 'Your comeback weeks are behind you (' + Math.floor(E.diffD(from, t) / 7) + ' weeks since you started back). Switching lets the plan build normally again.' };
    return null;
  }
  if (cur === 'starter') {
    var s0 = p.setupAt || p.startDate, cont = runs.some(function (r) { return r.date > E.addD(t, -21) && r.sec >= 1800; });
    if (s0 && E.diffD(s0, t) >= 56 && cont) return { to: 'regular', why: 'You\'ve finished the starter weeks and run 30 minutes without stopping. The regular plan writes runs by distance and adds one easy workout a week.' };
    return null;
  }
  if (cur === 'elite') {
    if ((mpw && mpw < 35 * ms && !(vg >= 60)) || (peak && peak < 45 * ms)) return { to: 'exp', why: (peak && peak < 45 ? 'You set your peak to ' + peak + ' mi a week' : 'You\'ve been running about ' + mw(mpw)) + ', well under what the sub-elite plan is built around. The experienced plan fits that better and still has two key sessions a week.' };
    return null;
  }
  if (cur === 'exp') {
    if ((mpw >= 50 * ms && vg >= 57) || vg >= 62 || peak >= 75 * ms) return { to: 'elite', why: (peak >= 75 * ms ? 'You set your peak to ' + peak + ' mi a week' : 'You\'re running about ' + mw(mpw)) + fitWords(vd, g) + '. The sub-elite plan adds volume, a second key session in base weeks and longer long runs.' };
    if (rm != null && rm < 15 && !(vg >= 50)) return { to: 'regular', why: 'You\'ve averaged ' + mw(rm) + ' lately. The regular plan builds from there more gently.' };
    return null;
  }
  /* regular */
  if ((mpw >= 50 * ms && vg >= 57) || vg >= 62) return { to: 'elite', why: 'You\'re running about ' + mw(mpw) + fitWords(vd, g) + ', which is sub-elite territory.' };
  if (mpw >= 35 * ms || vg >= 52 || mlv >= 3 || peak >= 50 || +p.volume >= 1.2) return { to: 'exp', why: (mlv >= 3 ? 'You picked ' + E.METHODS[p.method].name + ', a style for experienced runners' : peak >= 50 ? 'You set your peak to ' + peak + ' mi a week' : +p.volume >= 1.2 ? 'You turned weekly volume up' : mpw >= 35 * ms ? 'You\'re running about ' + mw(mpw) : 'Your fitness (VDOT ' + Math.round(vd) + (g.f > 1.01 ? ', strong for ' + whoWords(g) : '') + ') is ahead of the regular plan') + '. The experienced plan adds bigger workouts and pace suggestions.' };
  if (rm != null && rm < 2 && !(+p.mpw > 3) && !lastRun) return { to: 'starter', why: 'No runs logged yet. The starter weeks use run-walk by time and build to 30 minutes non-stop.' };
  return null;
}
function rtName(k) { return RUNNER_TYPES.filter(function (x) { return x[0] === k; })[0][1]; }
function rtShort(k) { return { starter: 'brand new', comeback: 'comeback', regular: 'regular', exp: 'experienced', elite: 'sub-elite' }[k] || k; }
function hintKey(h) { return 'rth:' + runnerType() + '>' + h.to; }
function hintDismissed(h, days) { var v = (st().seen || {})[hintKey(h)]; return v && (typeof v !== 'string' || E.diffD(v, App.today) < (days || 9999)); }
function runnerHintCard() {
  var h = null; try { h = runnerTypeHint(); } catch (e) { h = null; }
  if (!h || hintDismissed(h)) return '';
  return '<section class="card offer rthint"><div class="eyebrow">Runner type</div><p class="small" style="margin:2px 0 0"><b>' + esc(rtName(h.to)) + ' may fit you better.</b> ' + esc(h.why) + '</p><div class="btns"><button class="btn sm primary" data-act="rt-hint-yes" data-arg="' + jattr({ to: h.to }) + '">Review</button><button class="btn sm ghost" data-act="rt-hint-no" data-arg="' + jattr({ k: hintKey(h) }) + '">Keep ' + esc(rtName(runnerType()).toLowerCase()) + '</button></div></section>';
}
ACTIONS['rt-hint-yes'] = function (a) { openSheet('runnertype', { pre: a.to }); if (a.to === 'elite') setTimeout(function () { var ew = $('#rt-elite'); if (ew) { ew.hidden = false; ew.innerHTML = eliteWarnHTML(); } }, 0); };
ACTIONS['rt-hint-no'] = function (a) { Store.edit('seen', a.k, function (S) { S.seen = S.seen || {}; S.seen[a.k] = App.today; }); toast('Kept. You can change it any time under You → Runner type.'); };
/* the suggestion sits right under the runner type card on You and in Plan settings */
var _you19 = VIEWS.you;
VIEWS.you = function () { var h = _you19(), c = runnerHintCard(); if (!c) return h; var i = h.indexOf('<div class="sechead"><h2>Your plan</h2>'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h; };
var _settings19 = VIEWS.settings;
VIEWS.settings = function () { var h = _settings19(), c = runnerHintCard(); if (!c) return h; var i = h.indexOf('<form'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h; };

/* right after you change the plan (settings saved, a new style picked), ask once if the change points to another runner type */
function offerAfterChange() {
  setTimeout(function () {
    var h = null; try { h = runnerTypeHint(); } catch (e) { h = null; }
    if (!h || hintDismissed(h, 7) || document.querySelector('.askd')) return;
    askUI({ icon: '↕', title: 'Switch to ' + rtShort(h.to) + '?', text: h.why + ' You\'ll see what changes before anything is rebuilt.', ok: 'Review', cancel: 'Keep ' + rtShort(runnerType()) }).then(function (ok) {
      if (ok) ACTIONS['rt-hint-yes']({ to: h.to });
      else Store.edit('seen', hintKey(h), function (S) { S.seen = S.seen || {}; S.seen[hintKey(h)] = App.today; });
    });
  }, 700);
}
document.addEventListener('submit', function (e) { if (e.target && e.target.dataset && e.target.dataset.form === 'settings') offerAfterChange(); });
var _spAccept19 = ACTIONS['sp-accept'];
ACTIONS['sp-accept'] = function () { var r = _spAccept19.apply(this, arguments); offerAfterChange(); return r; };

document.addEventListener('change', function (e) { if (!e.target || (e.target.id !== 'rt-sex' && e.target.id !== 'rt-by')) return; var ew = $('#rt-elite'); if (ew && !ew.hidden) ew.innerHTML = eliteWarnHTML(); });
App.p19 = { runnerTypeHint: runnerTypeHint, recentMpw: recentMpw, planForLevel: planForLevel };
