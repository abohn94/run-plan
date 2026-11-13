/* Run Plan engine: dates, paces, training styles, plan generator, adaptations,
   readiness, nutrition, analysis and Garmin FIT export. Pure functions, no DOM. */
(function (root) {
'use strict';

var MI_M = 1609.344;
var DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
var DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/* ---------------- dates (local, as YYYY-MM-DD strings) ---------------- */
function pad(n) { return (n < 10 ? '0' : '') + n; }
function ds(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function pd(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function addD(s, n) { var d = pd(s); d.setDate(d.getDate() + n); return ds(d); }
function dow(s) { return (pd(s).getDay() + 6) % 7; }
function monday(s) { return addD(s, -dow(s)); }
function diffD(a, b) { return Math.round((Date.UTC.apply(null, ymd(b)) - Date.UTC.apply(null, ymd(a))) / 86400000); }
function ymd(s) { var p = String(s).split('-'); return [+p[0], +p[1] - 1, +p[2]]; }
function today() { return ds(new Date()); }
function fmtDate(s, o) { return pd(s).toLocaleDateString('en-US', o || { month: 'short', day: 'numeric' }); }

/* ---------------- numbers and clocks ---------------- */
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function r5(x) { return Math.round(x / 5) * 5; }
function round1(x) { return Math.round(x * 10) / 10; }
function half(x) { return Math.round(x * 2) / 2; }
function mean(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : NaN; }
function clock(sec) {
  sec = Math.round(sec);
  var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return (h ? h + ':' + pad(m) : m) + ':' + pad(s);
}
function fmtPace(sec) { sec = Math.round(sec); return Math.floor(sec / 60) + ':' + pad(sec % 60); }
function parseClock(tok) {
  if (tok == null) return NaN;
  tok = String(tok).trim();
  if (!tok) return NaN;
  if (/^\d+(\.\d+)?$/.test(tok)) return parseFloat(tok);
  var m = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(tok);
  if (!m) return NaN;
  return m[3] != null ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : (+m[1]) * 60 + (+m[2]);
}

/* ---------------- fitness model (Daniels/Gilbert VDOT) ---------------- */
function vo2(v) { return -4.60 + 0.182258 * v + 0.000104 * v * v; }
function pctMax(t) { return 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t); }
function vdotOf(mi, sec) { var t = sec / 60; return vo2(mi * MI_M / t) / pctMax(t); }
function paceAt(vdot, p) {
  var a = 0.000104, b = 0.182258, x = vdot * p + 4.60;
  var v = (-b + Math.sqrt(b * b + 4 * a * x)) / (2 * a);
  return MI_M / v * 60;
}
function predict(vdot, mi) {
  var lo = mi * 200, hi = mi * 1800;
  for (var i = 0; i < 60; i++) { var mid = (lo + hi) / 2; if (vdotOf(mi, mid) > vdot) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function solveV(pct, sec) {
  var lo = 15, hi = 85;
  for (var i = 0; i < 50; i++) { var mid = (lo + hi) / 2; if (paceAt(mid, pct) > sec) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
function vdotFromThreshold(sec) { return solveV(0.8725, sec); }   /* threshold pace sits near 86-89% of VO2max */
function vdotFromVo2(vo2max) { return vo2max - 2; }                 /* watch VO2max tends to read a little above race-based VDOT */
function hrZones(lthr, maxHr) {
  if (lthr) return { REC: [0, Math.round(lthr * 0.8)], E: [Math.round(lthr * 0.75), Math.round(lthr * 0.85)], S: [Math.round(lthr * 0.87), Math.round(lthr * 0.92)], M: [Math.round(lthr * 0.89), Math.round(lthr * 0.93)], T: [Math.round(lthr * 0.95), Math.round(lthr * 1.0)], I: [Math.round(lthr * 1.02), Math.round(lthr * 1.06)] };
  if (maxHr) return { REC: [0, Math.round(maxHr * 0.7)], E: [Math.round(maxHr * 0.65), Math.round(maxHr * 0.78)], S: [Math.round(maxHr * 0.8), Math.round(maxHr * 0.85)], M: [Math.round(maxHr * 0.82), Math.round(maxHr * 0.87)], T: [Math.round(maxHr * 0.87), Math.round(maxHr * 0.92)], I: [Math.round(maxHr * 0.94), Math.round(maxHr * 0.98)] };
  return null;
}
function vdotFromEasy(sec) {                /* typical easy pace -> rough fitness */
  var lo = 20, hi = 80;
  for (var i = 0; i < 50; i++) { var mid = (lo + hi) / 2; if (paceAt(mid, 0.665) > sec) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

var DIST = {
  '5k': { key: '5k', mi: 3.10686, label: '5K', peak: 25, longCap: 10, taper: 1, recov: 1 },
  '10k': { key: '10k', mi: 6.21371, label: '10K', peak: 30, longCap: 12, taper: 1, recov: 1 },
  half: { key: 'half', mi: 13.1094, label: 'Half marathon', peak: 35, longCap: 14, taper: 2, recov: 2 },
  full: { key: 'full', mi: 26.2188, label: 'Marathon', peak: 45, longCap: 20, taper: 3, recov: 3 }
};
function distOf(ev) {
  if (!ev) return DIST.half;
  if (DIST[ev.dist]) return DIST[ev.dist];
  var m = +ev.mi || 13.1;
  var base = m <= 4 ? DIST['5k'] : m <= 8 ? DIST['10k'] : m <= 16 ? DIST.half : DIST.full;
  return { key: base.key, mi: m, label: ev.name || (m + ' mi'), peak: base.peak, longCap: base.longCap, taper: base.taper, recov: base.recov };
}
function goalVdot(ev) {
  var d = distOf(ev), t = parseClock(ev && ev.goal);
  return t > 0 ? vdotOf(d.mi, t) : null;
}

/* Training zones in seconds per mile, [fast, slow]. */
function zones(v, goalPace) {
  function band(p1, p2) { return [r5(paceAt(v, p1)), r5(paceAt(v, p2))]; }
  var m = predict(v, 26.2188) / 26.2188, h = predict(v, 13.1094) / 13.1094;
  var z = {
    REC: band(0.63, 0.59), E: band(0.70, 0.63), S: band(0.80, 0.77),
    M: [r5(m - 5), r5(m + 5)], H: [r5(h - 5), r5(h + 5)],
    T: band(0.885, 0.86), I: band(0.985, 0.965), R: band(1.06, 1.03)
  };
  z.G = goalPace ? [r5(goalPace - 5), r5(goalPace + 5)] : z.H;
  return z;
}
var ZONE_NAME = { REC: 'recovery', E: 'easy', S: 'steady', M: 'marathon pace', H: 'half marathon pace', T: 'threshold', I: 'interval', R: 'stride', G: 'goal pace', F: 'by feel' };

/* ---------------- training styles ---------------- */
var METHODS = {
  balanced: {
    key: 'balanced', name: 'Balanced threshold', short: 'Balanced',
    inspired: 'VDOT-paced plans in the style of Jack Daniels',
    desc: 'Mostly easy running, one key workout a week that progresses from playful speed to lactate threshold to race pace, and a long run that grows steadily. Paces come from your fitness, not a guess.',
    suits: 'Most runners. Good when you also lift 2–3 days a week.',
    runs: [3, 5], quality: 1, peakMult: 1, longFrac: 1, longCapFull: 20, longCapHalf: 14, mlr: false, cross: 0, easyShare: 0.8
  },
  cumulative: {
    key: 'cumulative', name: 'Cumulative fatigue', short: 'Cumulative',
    inspired: 'High-frequency plans in the style of the Hansons method',
    desc: 'Six shorter runs a week with two key workouts (speed or strength repeats, and a goal-pace tempo). Long runs stop around 16 miles because you start them already a little tired.',
    suits: 'Runners who can run most days and want race-specific work every week.',
    runs: [5, 6], quality: 2, peakMult: 1.15, longFrac: 0.85, longCapFull: 16, longCapHalf: 12, mlr: false, cross: 0, easyShare: 0.75
  },
  endurance: {
    key: 'endurance', name: 'Endurance + threshold', short: 'Endurance',
    inspired: 'Plans in the style of Pete Pfitzinger',
    desc: 'Higher mileage with a midweek medium-long run, lactate-threshold tempos and long runs up to 20–22 miles. Demanding but very effective for the marathon.',
    suits: 'Experienced runners with time for 5–6 runs and 40+ miles a week.',
    runs: [5, 6], quality: 1, peakMult: 1.2, longFrac: 1.05, longCapFull: 21, longCapHalf: 15, mlr: true, cross: 0, easyShare: 0.8
  },
  polarized: {
    key: 'polarized', name: '80/20 polarized', short: '80/20',
    inspired: 'Intensity-balanced plans in the style of Matt Fitzgerald\'s 80/20',
    desc: 'About 80% of your running is truly easy and 20% is moderate to hard. Key workouts alternate between threshold and faster intervals, and easy days are kept strictly easy.',
    suits: 'Runners who tend to run easy days too fast, or who train by heart rate.',
    runs: [4, 6], quality: 2, peakMult: 1.05, longFrac: 1, longCapFull: 20, longCapHalf: 14, mlr: false, cross: 0, easyShare: 0.8
  },
  lowfreq: {
    key: 'lowfreq', name: 'Run less, lift more', short: 'Run less',
    inspired: 'Three-key-run plans in the style of FIRST (Run Less, Run Faster)',
    desc: 'Three purposeful runs a week (intervals, tempo, long run) plus two gym days: a lifting session with a short, easy treadmill run. Less pounding, more strength.',
    suits: 'Injury-prone runners, busy schedules, and anyone who loves the gym.',
    runs: [3, 3], quality: 2, peakMult: 0.75, longFrac: 1.1, longCapFull: 20, longCapHalf: 14, mlr: false, cross: 2, easyShare: 0.5
  },
  beginner: {
    key: 'beginner', name: 'Beginner friendly', short: 'Beginner',
    inspired: 'Novice plans in the style of Hal Higdon and Jeff Galloway',
    desc: 'Simple and gentle: three or four easy runs, a long run that slowly grows, light fartleks for fun, and optional run-walk intervals. Finishing healthy is the goal.',
    suits: 'First race at the distance, coming back from injury, or low weekly mileage.',
    runs: [3, 4], quality: 1, peakMult: 0.85, longFrac: 1, longCapFull: 20, longCapHalf: 12, mlr: false, cross: 0, easyShare: 0.9
  }
};
function suggestMethods(profile, events) {
  /* Scores each style against the runner's answers. Returns [{key, score, why}] best first. */
  var p = profile || {};
  var mpw = +p.mpw || 0, runs = +p.runDays || 4, lifts = (+p.liftDays || 0) + (+p.crossDays || 0);
  var lvl = p.level || 'some', goal = p.goalType || 'time';
  var hasFull = (events || []).some(function (e) { return (e.priority || 'A') === 'A' && distOf(e).key === 'full'; });
  var sc = {}, why = {};
  Object.keys(METHODS).forEach(function (k) { sc[k] = 0; why[k] = []; });
  function add(k, n, w) { sc[k] += n; if (w && n > 0) why[k].push(w); }
  add('balanced', 3, 'A proven mix of easy running, one key workout and a growing long run.');
  if (lifts >= 2) add('balanced', 3, 'One key run a week leaves room and energy for ' + lifts + ' gym days.');
  if (goal === 'time') add('balanced', 1);
  if (lvl === 'new' || mpw < 12) add('beginner', lvl === 'new' ? 6 : 3, 'Your current mileage is low, so a gentle build is the safest start.');
  if (goal === 'finish') add('beginner', 3, 'Your goal is to finish strong and healthy.');
  if (lvl === 'exp') add('beginner', -6);
  if (p.injuryProne) { add('lowfreq', 3, 'Fewer runs lowers the pounding on your shins.'); add('cumulative', -3); add('endurance', -2); add('balanced', 1, 'Mileage builds gradually with cutback weeks.'); }
  if (runs <= 3) add('lowfreq', 4, 'You have three days to run, which is exactly what this style uses.');
  if (lifts >= 3) add('lowfreq', 2, 'You like the gym, and this style leans on it.');
  if (runs >= 6) add('cumulative', 3, 'You can run six days, which this style needs.'); else add('cumulative', -4);
  if (mpw >= 25 && lvl !== 'new') add('cumulative', 2);
  if (lifts >= 3) add('cumulative', -2);
  if (hasFull && runs >= 5 && lvl === 'exp') add('endurance', 4, 'Your experience can handle medium-long runs for the marathon.');
  if (mpw >= 30) add('endurance', 2); else add('endurance', -3);
  if (p.hrTrainer) add('polarized', 4, 'You like training by heart rate, which fits 80/20.');
  if (runs >= 4 && lvl !== 'new') add('polarized', 1, 'Two varied workouts with strictly easy days between them.');
  if (goal === 'fitness') { add('polarized', 1); add('lowfreq', 1); }
  return Object.keys(sc).map(function (k) { return { key: k, score: sc[k], why: why[k].slice(0, 2).join(' ') || METHODS[k].suits }; }).sort(function (a, b) { return b.score - a.score; });
}

/* What your Garmin history says about where you are now. */
function historyStats(garmin, date) {
  var acts = ((garmin && garmin.activities) || []).filter(function (a) { return a.run && a.distM > 800 && a.date; });
  if (!acts.length) return null;
  date = date || today();
  var from28 = addD(date, -28), from56 = addD(date, -56);
  var last4 = acts.filter(function (a) { return a.date > from28 && a.date <= date; });
  var last8 = acts.filter(function (a) { return a.date > from56 && a.date <= date; });
  var mi4 = last4.reduce(function (t, a) { return t + a.distM / MI_M; }, 0);
  var paces = last8.filter(function (a) { return (a.movS || a.durS) > 0 && a.distM > 1600; }).map(function (a) { return (a.movS || a.durS) / (a.distM / MI_M); }).sort(function (x, y) { return x - y; });
  var first = acts.reduce(function (m, a) { return a.date < m ? a.date : m; }, acts[0].date);
  return { runs: acts.length, since: first, mpw: round1(mi4 / 4), runsPerWeek: round1(last4.length / 4),
    longest: round1(last8.reduce(function (m, a) { return Math.max(m, a.distM / MI_M); }, 0)),
    easyPace: paces.length ? Math.round(paces[Math.floor(paces.length * 0.6)]) : null, totalMi: Math.round(acts.reduce(function (t, a) { return t + a.distM / MI_M; }, 0)) };
}

/* ---------------- strength modules (shared with the UI) ---------------- */
/*LIFTS*/

/* ---------------- workouts as structured steps ----------------
   step: {k:'wu'|'cd'|'run'|'rep', mi|min|sec, z, effort, n, work:{m|mi|min|sec}, rec:{min|sec|m, walk}} */
function S(k, o) { o.k = k; return o; }
function wu(mi) { return S('wu', { mi: mi, z: 'E' }); }
function cd(mi) { return S('cd', { mi: mi, z: 'E' }); }
function run(mi, z, label) { return S('run', { mi: mi, z: z, label: label }); }
function runMin(min, z, label) { return S('run', { min: min, z: z, label: label }); }
function rep(n, work, z, rec, effort) { return S('rep', { n: n, work: work, z: z, rec: rec, effort: effort }); }

/* Each session: { key, title, kind:'speed'|'tt', purpose, steps(q) } where q = target miles for the day. */
function warm(q) { return q >= 7 ? 1.5 : 1; }
var SESS = {
  fartlek: function (n, on, off, effort) { return { key: 'fartlek', title: 'Fartlek', purpose: 'Playful speed that teaches you to change gears without the stress of a track session.', steps: function (q) { return [wu(warm(q)), rep(n, { min: on }, 'F', { min: off }, effort || 'brisk, RPE 6–7'), cd(0)]; } }; },
  hills: function (n, sec) { return { key: 'hills', title: 'Hill repeats', purpose: 'Strength and running power with less impact than flat speed. Great for shins when the hill is gentle.', steps: function (q) { return [wu(warm(q)), rep(n, { sec: sec }, 'F', { sec: 90, walk: false }, 'uphill, RPE 8, jog back down'), cd(0)]; } }; },
  strides: function (n) { return { key: 'strides', title: 'Easy + strides', purpose: 'Keeps your legs quick on a light week without adding fatigue.', steps: function (q) { return [run(Math.max(1, q - 0.4), 'E'), rep(n || 6, { sec: 20 }, 'R', { sec: 40, walk: true }, 'fast but relaxed')]; } }; },
  steady: function (min) { return { key: 'steady', title: 'Steady run', purpose: 'Comfortably brisk aerobic running. Builds the engine with little recovery cost.', steps: function (q) { return [wu(1), runMin(min, 'S'), cd(0)]; } }; },
  steadyMi: function (mi) { return { key: 'steady', title: 'Steady run', purpose: 'Comfortably brisk aerobic running. Builds the engine with little recovery cost.', steps: function (q) { return [wu(1), run(mi, 'S'), cd(0)]; } }; },
  progression: function (min) { return { key: 'progression', title: 'Progression run', purpose: 'Start easy and finish steady. Teaches pacing and builds aerobic strength.', steps: function (q) { return [run(Math.max(1.5, q - min / 9), 'E'), runMin(min, 'S', 'build from easy to steady')]; } }; },
  tempoReps: function (n, min, recS) { return { key: 'tempo', title: n > 1 ? 'Tempo intervals' : 'Tempo run', purpose: 'Lactate threshold work: the pace you could hold for about an hour. This is where aerobic fitness turns into speed.', steps: function (q) { return [wu(warm(q)), rep(n, { min: min }, 'T', { sec: recS }), cd(0)]; } }; },
  tempoMi: function (mi) { return { key: 'tempo', title: 'Tempo run', purpose: 'Continuous lactate threshold running. Comfortably hard: you can say a short sentence.', steps: function (q) { return [wu(warm(q)), run(mi, 'T'), cd(0)]; } }; },
  cruise: function (n, mi, recS) { return { key: 'cruise', title: 'Cruise intervals', purpose: 'Threshold pace broken into repeats with short jogs, so you can do more of it.', steps: function (q) { return [wu(warm(q)), rep(n, { mi: mi }, 'T', { sec: recS }), cd(0)]; } }; },
  intervals: function (n, m, recM) { return { key: 'intervals', title: 'Intervals', purpose: 'VO2max work at about 5K effort. Raises your ceiling and makes race pace feel easier.', steps: function (q) { return [wu(warm(q)), rep(n, { m: m }, 'I', { m: recM }), cd(0)]; } }; },
  intervalsMi: function (n, recMin) { return { key: 'intervals', title: 'Mile repeats', purpose: 'Long intervals at about 10K-to-5K effort for a big aerobic stimulus.', steps: function (q) { return [wu(warm(q)), rep(n, { mi: 1 }, 'I', { min: recMin }), cd(0)]; } }; },
  goal: function (n, mi, recMin, z) { return { key: 'goal', title: (z || 'G') === 'M' ? 'Marathon pace' : 'Goal pace', purpose: 'Rehearses race pace so it feels familiar and controlled on race day.', steps: function (q) { return [wu(warm(q)), n > 1 ? rep(n, { mi: mi }, z || 'G', { min: recMin }) : run(mi, z || 'G'), cd(0)]; } }; },
  mpPlusT: function (mpMi) { return { key: 'goal', title: 'Marathon pace + threshold', purpose: 'Marathon pace with a threshold finish, teaching you to push when tired.', steps: function (q) { return [wu(1.5), run(mpMi, 'M'), run(1, 'T'), cd(0)]; } }; },
  tt: function () { return { key: 'tt', kind: 'tt', title: '5K time trial', purpose: 'A fitness check. Your result resets every training pace in the app.', steps: function (q) { return [wu(1), S('run', { mi: 3.10686, z: 'F', label: '5K, as even as you can run it', race: true }), cd(1)]; } }; },
  tuneup: function () { return { key: 'tt', kind: 'tt', title: '5K tune-up', purpose: 'A race-effort 5K on a light week. Rehearse your race-morning routine.', steps: function (q) { return [wu(1.5), S('run', { mi: 3.10686, z: 'I', label: '5K at race effort', race: true }), cd(1)]; } }; },
  sharpener: function (z) { return { key: 'sharpener', title: 'Race-week sharpener', purpose: 'Just enough pace to feel sharp. Nothing more.', steps: function (q) { return [wu(1), rep(2, { mi: 1 }, z || 'G', { min: 3 }), cd(1), rep(4, { sec: 20 }, 'R', { sec: 40, walk: true }, 'relaxed strides')]; } }; },
  speedStrength: function (n, m) { return { key: 'intervals', title: 'Strength repeats', purpose: 'Longer repeats a little faster than goal pace, building speed endurance under fatigue.', steps: function (q) { return [wu(1.5), rep(n, { m: m }, 'T', { m: 400 }), cd(0)]; } }; }
};

/* Session sequences by phase. Cutback weeks use a lighter option. */
function qualityFor(ctx) {
  var ph = ctx.phase, i = ctx.qi, d = ctx.dist.key, meth = ctx.method, slot = ctx.slot || 0;
  if (ctx.cut) {
    if (ph === 'spec' && d === 'half' && ctx.tuneup) return SESS.tuneup();
    if (ph === 'base') return SESS.strides(6);
    return SESS.fartlek(6, 2, 1, '10K effort');
  }
  if (meth.key === 'beginner') {
    var bl = [SESS.fartlek(6, 1, 1), SESS.strides(6), SESS.fartlek(8, 1, 1), SESS.hills(6, 45), SESS.steady(15), SESS.fartlek(5, 2, 2, 'steady-hard, RPE 7'), SESS.progression(15), SESS.steady(20)];
    if (ph === 'spec') bl = [SESS.goal(1, 2, 0), SESS.steady(20), SESS.goal(2, 1.5, 3), SESS.progression(20)];
    return bl[i % bl.length];
  }
  if (ph === 'base') {
    var b1 = [SESS.fartlek(6, 1, 1), SESS.fartlek(8, 1, 1), SESS.fartlek(5, 2, 2, 'steady-hard, RPE 7'), SESS.hills(6, 45), SESS.steady(12), SESS.hills(8, 45), SESS.progression(15), SESS.fartlek(8, 1.5, 1.5, 'brisk, RPE 7'), SESS.steadyMi(3), SESS.steady(20), SESS.hills(10, 45), SESS.progression(20)];
    var b2 = [SESS.steady(20), SESS.tempoMi(3), SESS.cruise(2, 2, 180), SESS.cruise(4, 1, 60), SESS.tempoMi(4), SESS.progression(20)];
    if (meth.key === 'polarized' && slot === 1) return [SESS.hills(6, 45), SESS.fartlek(6, 1, 1), SESS.hills(8, 45)][i % 3];
    if (slot === 1) return [SESS.steady(15), SESS.progression(15), SESS.steady(20)][i % 3];
    var list = ctx.firstBlock ? b1 : b2;
    return list[Math.min(i, list.length - 1)];
  }
  if (ph === 'thr') {
    if (ctx.tt) return SESS.tt();
    var t1 = [SESS.tempoReps(3, 5, 90), SESS.tempoReps(2, 10, 120), SESS.tempoMi(3), SESS.cruise(4, 1, 60), SESS.tempoMi(4), SESS.cruise(3, 2, 90), SESS.intervals(4, 1000, 400), SESS.tempoMi(5), SESS.cruise(3, 2, 60), SESS.intervalsMi(4, 2)];
    var t2 = [SESS.intervals(6, 400, 200), SESS.intervals(5, 800, 400), SESS.hills(8, 60), SESS.intervals(4, 1000, 400), SESS.intervalsMi(3, 2), SESS.intervals(6, 800, 400)];
    if (slot === 1) return meth.key === 'cumulative' ? SESS.speedStrength(4 + Math.min(i, 3), 1600) : t2[i % t2.length];
    return t1[Math.min(i, t1.length - 1)];
  }
  if (ph === 'spec') {
    var s;
    if (d === 'full') s = [SESS.mpPlusT(4), SESS.goal(2, 2.5, 3, 'M'), SESS.tempoMi(5), SESS.goal(2, 3, 3, 'M'), SESS.intervalsMi(5, 2), SESS.goal(1, 7, 0, 'M'), SESS.cruise(3, 2, 180), SESS.tempoMi(6)];
    else if (d === 'half') s = [SESS.tempoMi(5), SESS.goal(2, 2, 3), SESS.goal(3, 1, 2), SESS.cruise(3, 2, 90), SESS.goal(2, 3, 3), SESS.tempoMi(5)];
    else s = [SESS.intervals(5, 1000, 400), SESS.tempoMi(4), SESS.intervals(6, 800, 400), SESS.cruise(3, 1.5, 60), SESS.intervalsMi(4, 2), SESS.intervals(8, 400, 200)];
    if (slot === 1) {
      if (meth.key === 'cumulative') return SESS.goal(1, d === 'full' ? Math.min(10, 5 + i) : Math.min(6, 3 + i), 0, d === 'full' ? 'M' : 'G');
      return d === 'full' ? SESS.intervals(5, 1000, 400) : SESS.intervals(6, 800, 400);
    }
    return s[Math.min(i, s.length - 1)];
  }
  if (ph === 'taper') {
    if (d === 'full') return i === 0 ? SESS.goal(1, 3, 0, 'M') : SESS.goal(2, 1, 2, 'M');
    if (d === 'half') return SESS.goal(1, 3, 0);
    return SESS.intervals(3, 1000, 400);
  }
  if (ph === 'race') return SESS.sharpener(d === 'full' ? 'M' : 'G');
  if (ph === 'recov') return i === 0 ? null : SESS.strides(6);
  return SESS.strides(6);
}

/* Long-run structure for the phase. Returns {title, steps, note}. */
function longFor(ctx, mi) {
  var ph = ctx.phase, d = ctx.dist.key, i = ctx.li, z = d === 'full' ? 'M' : 'G';
  var easy = function (note) { return { title: 'Long run', steps: [run(mi, 'E')], note: note || 'Conversational the whole way. Fuel and hydrate like it is race day once it is over 75 minutes.' }; };
  if (ctx.cut || ph === 'base' || ph === 'recov') return easy();
  if (ph === 'thr') return i % 2 === 1 && mi >= 8 ? { title: 'Long run, steady finish', steps: [run(mi - 2, 'E'), run(2, 'S')], note: 'Easy, then finish the last 2 mi steady. Practice a gel or chews if it is over 75 minutes.' } : easy();
  if (ph === 'spec') {
    if (d === 'full') {
      var opts = [
        { title: 'Long run, marathon-pace finish', steps: [run(mi - 3, 'E'), run(3, 'M')], note: 'Finish at marathon pace on tired legs. Fuel every 30–40 minutes.' },
        { title: 'Long run, steady second half', steps: [run(Math.ceil(mi * 0.6), 'E'), run(Math.floor(mi * 0.4), 'S')], note: 'Settle in easy, then hold steady effort. Practice your race fueling.' },
        easy('Your biggest runs. Keep it truly easy and practice fueling: 30–60 g of carbs per hour.'),
        { title: 'Dress rehearsal', steps: [run(mi - 8, 'E'), run(8, 'M')], note: 'Race shoes, race kit, race breakfast and race fueling. The most important long run of the block.' }
      ];
      return opts[i % opts.length];
    }
    if (d === 'half') {
      var h = [
        { title: 'Long run, goal-pace middle', steps: [run(4, 'E'), run(Math.min(4, mi - 6), z), run(mi - 4 - Math.min(4, mi - 6), 'E')], note: 'Settle into goal pace in the middle, then relax home. One gel near the start of the fast section.' },
        easy('Your longest runs before the half. Easy effort; practice fueling at 45 and 75 minutes.'),
        { title: 'Race rehearsal', steps: [run(mi - 5, 'E'), run(5, z)], note: 'Last 5 mi at goal pace in race shoes. This is the race rehearsal.' }
      ];
      return h[i % h.length];
    }
    return i % 2 ? { title: 'Long run, fast finish', steps: [run(mi - 2, 'E'), run(2, 'T')], note: 'Finish the last 2 mi at threshold.' } : easy();
  }
  if (ph === 'taper') {
    if (d === 'full') return i === 0 ? { title: 'Taper long run', steps: [run(Math.ceil((mi - 4) / 2), 'E'), run(4, 'M'), run(Math.floor((mi - 4) / 2), 'E')], note: 'Middle 4 mi at marathon pace. The fitness is banked.' } : { title: 'Last long run', steps: [run(mi - 2, 'E'), run(2, 'M')], note: 'Easy, with a short marathon-pace finish. Legs should feel springy.' };
    return { title: 'Taper long run', steps: [run(mi - 2, 'E'), run(2, z)], note: 'Easy with a short goal-pace finish.' };
  }
  return easy();
}

function stepMiles(steps, zz) {
  var mid = function (z) { var p = zz && zz[z]; return p ? (p[0] + p[1]) / 2 : 540; };
  var tot = 0;
  steps.forEach(function (s) {
    if (s.k === 'rep') {
      var w = s.work, r = s.rec || {};
      var wm = w.mi != null ? w.mi : w.m != null ? w.m / MI_M : (w.min != null ? w.min * 60 : w.sec || 0) / mid(s.z === 'F' ? 'T' : s.z);
      var rm = r.mi != null ? r.mi : r.m != null ? r.m / MI_M : (r.min != null ? r.min * 60 : r.sec || 0) / (r.walk ? 1100 : mid('REC'));
      tot += s.n * wm + Math.max(0, s.n - 1) * rm;
    } else if (s.mi != null) tot += s.mi;
    else if (s.min != null) tot += s.min * 60 / mid(s.z === 'F' ? 'T' : s.z);
  });
  return tot;
}
/* Fill the open cool-down so the session totals q miles (at least 0.5 mi). */
function sizeSession(steps, q, zz) {
  var out = steps.map(function (s) { return Object.assign({}, s); });
  var c = null;
  out.forEach(function (s) { if (s.k === 'cd' && !s.mi) c = s; });
  if (c) { c.mi = 0; c.mi = Math.max(0.5, half(q - stepMiles(out, zz))); }
  return out;
}

/* ---------------- day layout ---------------- */
function wrap(d) { return ((d % 7) + 7) % 7; }
function layoutWeek(o) {
  /* o: {runs, quality, lifts, cross, avail[7] bools, longDay, doubles, mlr} -> per-day roles */
  var avail = o.avail, L = o.longDay;
  if (!avail[L]) { for (var k = 0; k < 7; k++) { if (avail[wrap(6 - k)]) { L = wrap(6 - k); break; } } }
  var roles = [[], [], [], [], [], [], []];
  var runDays = [L];
  roles[L].push('long');
  function free(d) { return avail[d] && runDays.indexOf(d) < 0; }
  var nAvail = avail.filter(Boolean).length;
  var runs = Math.min(o.runs, nAvail);
  var qDays = [];
  var qPref = [2, 3, 4, 5, 1].map(function (x) { return wrap(L + x); });
  for (var qi = 0; qi < o.quality && runDays.length < runs; qi++) {
    var best = null;
    qPref.forEach(function (d) {
      if (best !== null || !free(d)) return;
      if (d === wrap(L - 1) || d === wrap(L + 1)) return;
      if (qDays.some(function (x) { return Math.abs(wrap(x - d)) < 2 || Math.abs(wrap(d - x)) < 2; })) return;
      best = d;
    });
    if (best === null) break;
    qDays.push(best); runDays.push(best); roles[best].push('quality' + qi);
  }
  var ePref = [-3, -1, -4, 1, -2, 2, 3].map(function (x) { return wrap(L + x); });
  ePref.forEach(function (d) {
    if (runDays.length >= runs || !free(d)) return;
    runDays.push(d); roles[d].push('easy');
  });
  if (o.mlr) {
    var e = ePref.filter(function (d) { return roles[d].indexOf('easy') >= 0 && d !== wrap(L - 1) && d !== wrap(L + 1); })[0];
    if (e != null) { roles[e][roles[e].indexOf('easy')] = 'mlr'; }
  }
  /* Lifts: first on quality days (hard days hard), then on easy days away from the long run, else a free day. */
  var liftDays = [];
  var noRun = [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return runDays.indexOf(d) < 0; });
  function liftOK(d) {
    if (liftDays.indexOf(d) >= 0) return false;
    if (d === wrap(L - 1)) return false;
    if (liftDays.some(function (x) { return wrap(x - d) === 1 || wrap(d - x) === 1; }) && liftDays.length < 3) return false;
    return true;
  }
  var lPref = [];
  if (o.doubles) {
    qDays.forEach(function (d) { lPref.push(d); });
    [wrap(L - 3), wrap(L - 4), wrap(L + 1), wrap(L - 2), wrap(L + 2)].forEach(function (d) { lPref.push(d); });
  } else {
    noRun.slice().sort(function (a, b) { return Math.abs(wrap(a - L) - 3.5) - Math.abs(wrap(b - L) - 3.5); }).forEach(function (d) { lPref.push(d); });
    qDays.forEach(function (d) { lPref.push(d); });
  }
  [0, 1, 2, 3, 4, 5, 6].forEach(function (d) { lPref.push(d); });
  lPref.forEach(function (d) { if (liftDays.length < o.lifts && liftOK(d)) liftDays.push(d); });
  lPref.forEach(function (d) { if (liftDays.length < o.lifts && liftDays.indexOf(d) < 0 && d !== wrap(L - 1)) liftDays.push(d); });
  liftDays.forEach(function (d) { roles[d].push('lift'); });
  /* Cross-training on days without a run, never the day before the long run if avoidable. */
  var crossDays = [];
  var cPref = [0, 1, 2, 3, 4, 5, 6].filter(function (d) { return runDays.indexOf(d) < 0; })
    .sort(function (a, b) { return (a === wrap(L - 1)) - (b === wrap(L - 1)) || (roles[a].length - roles[b].length); });
  cPref.forEach(function (d) { if (crossDays.length < o.cross) crossDays.push(d); });
  crossDays.forEach(function (d) { roles[d].push('cross'); });
  return { roles: roles, longDay: L, runDays: runDays, qDays: qDays };
}

/* ---------------- the generator ---------------- */
function phaseInfo(key, block, name) {
  var F = {
    base: 'Build the aerobic engine with mostly easy running. Key runs stay playful: fartleks, hills, strides and steady efforts. Lifting builds durable tendons for the miles ahead.',
    maint: 'Rebuild comfortably with mostly easy running. Threshold work returns gradually. No race fatigue.',
    thr: 'Lactate threshold takes over the key run: tempo runs and cruise intervals that grow week by week. This is where aerobic fitness turns into speed.',
    spec: 'Race-specific work: goal pace, your longest long runs and fueling practice. Lifting maintains strength without stealing energy.',
    taper: 'Volume drops while a little pace stays. Sleep, eat well and arrive fresh.',
    race: 'Short, sharp and rested. Trust the work.',
    recov: 'Easy running only while your body recovers from the race. Light lifting.'
  };
  var N = { base: 'Aerobic Base', maint: 'Base Maintenance', thr: 'Threshold', spec: 'Race Specific', taper: 'Taper', race: 'Race Week', recov: 'Recovery' };
  return { key: key, name: name || N[key], focus: F[key], block: block };
}
function liftPhaseFor(ph, wiInPhase) {
  if (ph === 'base') return 0;
  if (ph === 'maint') return wiInPhase < 2 ? 0 : 1;
  if (ph === 'thr') return 1;
  if (ph === 'spec') return 2;
  return 3;
}

function defaultProfile() {
  return {
    startDate: monday(today()), mpw: 10, longest: 5, level: 'some', runDays: 5, liftDays: 2, crossDays: 0,
    avail: [true, true, true, true, true, true, true], longDay: 6, doubles: true, method: 'balanced',
    volume: 1, weightKg: null, recent: null, easyPace: '', injuryProne: false, hrTrainer: false, runWalk: false
  };
}

function generate(state) {
  var prof = Object.assign(defaultProfile(), state.profile || {});
  var method = METHODS[prof.method] || METHODS.balanced;
  var start = monday(prof.startDate || today());
  var events = (state.events || []).filter(function (e) { return e && e.date; }).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  var aEvents = events.filter(function (e) { return (e.priority || 'A') === 'A' && e.date >= start; });
  var otherEvents = events.filter(function (e) { return aEvents.indexOf(e) < 0 && e.date >= start; });
  var last = aEvents.length ? aEvents[aEvents.length - 1].date : addD(start, 7 * 16);
  var nWeeks = Math.max(4, Math.floor(diffD(start, monday(last)) / 7) + 1);
  if (!aEvents.length) nWeeks = 16;

  /* fitness at the start */
  var v0 = null;
  if (prof.recent && prof.recent.time && (prof.recent.mi || DIST[prof.recent.dist])) {
    var rmi = +prof.recent.mi || DIST[prof.recent.dist].mi, rt = parseClock(prof.recent.time);
    if (rt > 0) v0 = vdotOf(rmi, rt);
  }
  if (!v0 && parseClock(prof.easyPace) > 0) v0 = vdotFromEasy(parseClock(prof.easyPace));
  var gv = aEvents.length ? goalVdot(aEvents[0]) : null;
  if (!v0) v0 = gv ? gv - 3 : 38;

  /* assign every week to a block */
  var weeks = [];
  var blockStart = 0, prevPeak = null, prevDist = null;
  var plannedV = [];
  for (var bi = 0; bi < Math.max(1, aEvents.length); bi++) {
    var ev = aEvents[bi] || null;
    var dist = distOf(ev || { dist: 'half' });
    var raceW = ev ? Math.floor(diffD(start, monday(ev.date)) / 7) : nWeeks - 1;
    var recovW = (bi > 0 && prevDist) ? prevDist.recov : 0;
    var firstBlock = bi === 0;
    var L = raceW - blockStart + 1;
    var T = ev ? Math.min(dist.taper, Math.max(1, L - 2)) : 0;
    var R = Math.max(0, L - T - recovW);
    var specLen = ev ? Math.min({ full: 8, half: 6, '10k': 6, '5k': 5 }[dist.key] || 6, Math.floor(R * 0.4)) : 0;
    var thrLen = Math.min(10, Math.round((R - specLen) * 0.45));
    var baseLen = R - specLen - thrLen;
    if (!ev) { baseLen = Math.ceil(R / 2); thrLen = R - baseLen; specLen = 0; }
    var peakTarget = Math.max(+prof.mpw || 8, Math.round(dist.peak * method.peakMult * (prof.volume || 1)));
    var cap = method.runs[1] * 10 + 4;
    if (+prof.runDays) cap = Math.min(cap, (+prof.runDays) * 10 + 2);
    peakTarget = Math.min(peakTarget, Math.max(cap, +prof.mpw || 8));
    var longCap = Math.min(dist.longCap, dist.key === 'full' ? method.longCapFull : dist.key === 'half' ? method.longCapHalf : dist.longCap);
    var gvB = ev ? goalVdot(ev) : null;
    var vStart = plannedV.length ? plannedV[plannedV.length - 1] : v0;
    var growth = Math.min(0.11 * L, Math.max(gvB ? gvB - vStart : 0, 0.045 * L));

    var m = firstBlock ? Math.max(6, +prof.mpw || 10) : Math.max(8, Math.round((prevPeak || 20) * 0.35));
    var lastBuild = m, buildIdx = 0, lastLong = firstBlock ? Math.max(3, +prof.longest || 4) : 6;
    var phaseCounter = {};
    var qi = 0, li = 0, peakReached = m;
    for (var wi = 0; wi < L; wi++) {
      var n = blockStart + wi;
      var phKey, kind = 'build', cut = false;
      if (wi < recovW) { phKey = 'recov'; kind = 'recovery'; }
      else if (wi < recovW + baseLen) phKey = firstBlock ? 'base' : 'maint';
      else if (wi < recovW + baseLen + thrLen) phKey = 'thr';
      else if (wi < L - T) phKey = 'spec';
      else if (wi < L - 1 || !ev) phKey = 'taper';
      else phKey = 'race';
      if (!ev && wi >= L - T) phKey = 'thr';
      var phIdx = phaseCounter[phKey] = (phaseCounter[phKey] == null ? 0 : phaseCounter[phKey] + 1);
      var miles;
      if (phKey === 'recov') {
        var rf = prevDist && prevDist.key === 'full' ? [0.3, 0.45, 0.6] : [0.35, 0.55];
        miles = Math.max(6, Math.round((prevPeak || 20) * (rf[wi] || 0.6)));
        lastBuild = miles; m = miles;
      } else if (phKey === 'taper') {
        var tf = dist.key === 'full' ? [0.75, 0.55] : [0.65];
        miles = Math.round(peakReached * (tf[phIdx] || 0.6)); kind = 'taper';
      } else if (phKey === 'race') {
        miles = Math.round(peakReached * (dist.key === 'full' ? 0.32 : dist.key === 'half' ? 0.4 : 0.6)); kind = 'race';
      } else {
        buildIdx++;
        if (buildIdx % 4 === 0 && wi < L - T - 1) { cut = true; kind = 'cutback'; miles = Math.round(lastBuild * 0.75); }
        else {
          if (buildIdx === 1 && firstBlock) miles = m;
          else miles = Math.min(peakTarget, Math.max(lastBuild + 1, Math.round(lastBuild * 1.1)));
          lastBuild = miles; peakReached = Math.max(peakReached, miles);
        }
      }
      var vPlan = vStart + growth * (wi + 1) / L;
      plannedV.push(vPlan);
      weeks.push({ n: n + 1, start: addD(start, 7 * n), end: addD(start, 7 * n + 6), phase: phaseInfo(phKey, ev ? ev.name || dist.label : 'Base building'), phIdx: phIdx,
        kind: kind, cut: cut, target: miles, event: ev, dist: dist, firstBlock: firstBlock, vPlan: vPlan, longCap: longCap, blockWeek: wi, blockLen: L, method: method });
    }
    prevPeak = peakReached; prevDist = dist; blockStart = raceW + 1;
  }
  /* a race in the last block may leave trailing weeks: none, the plan ends on race week */
  /* long-run and quality progression counters per block */
  var counters = {};
  var lastLongs = {};
  weeks.forEach(function (w) {
    var bk = w.phase.block + '|' + w.phase.key;
    counters[bk] = counters[bk] || { q: 0, l: 0 };
    w.qi = counters[bk].q; w.li = counters[bk].l;
    if (!w.cut) { counters[bk].q++; counters[bk].l++; }
  });
  weeks.forEach(function (w, idx) { buildWeek(w, idx, weeks, prof, method, otherEvents, lastLongs); });
  return { start: start, weeks: weeks, events: events, aEvents: aEvents, method: method, profile: prof, v0: v0 };
}

function longMilesFor(w, prev) {
  var m = w.target, ph = w.phase.key, d = w.dist.key, meth = w.method;
  var f = m < 15 ? 0.45 : m < 25 ? 0.4 : 0.38;
  if (ph === 'spec') f = d === 'full' ? 0.45 : 0.4;
  f *= meth.longFrac;
  if (meth.key === 'cumulative') f = Math.min(f, 0.32);
  var L = Math.round(m * f);
  if (ph === 'spec' && !w.cut && w.li % 2 === 1 && L >= w.longCap - 1) L = Math.max(L - (d === 'full' ? 4 : 2), 8);
  if (w.cut) L = Math.round((prev || L) * 0.72);
  else if (prev) L = Math.min(L, prev + 2);
  if (ph === 'recov') L = Math.min(L, Math.round(m * 0.35));
  if (ph === 'taper') L = Math.round(m * (d === 'full' ? 0.4 : 0.38));
  return clamp(L, 3, w.longCap);
}

function buildWeek(w, idx, weeks, prof, method, others, lastLongs) {
  var m = w.target;
  var runs = method.key === 'lowfreq' ? 3 : clamp(Math.ceil(m / 5), Math.min(3, method.runs[0]), method.runs[1]);
  if (method.key === 'cumulative' && m >= 20) runs = Math.max(runs, 5);
  runs = Math.min(runs, +prof.runDays || 7);
  if (w.phase.key === 'recov' && w.phIdx === 0) runs = Math.min(runs, 3);
  if (m < 8) runs = Math.min(runs, 3);
  var lifts = clamp(+prof.liftDays || 0, 0, 4);
  if (w.phase.key === 'race') lifts = Math.min(lifts, 1);
  else if (w.phase.key === 'taper' || w.phase.key === 'recov') lifts = Math.min(lifts, 2);
  if (!prof.doubles) runs = Math.min(runs, Math.max(3, 7 - lifts - 1));
  var cross = clamp((+prof.crossDays || 0) + (method.cross || 0), 0, 3);   /* gym days: a lift plus a short treadmill run */
  if (w.phase.key === 'race') cross = 0;
  lifts = Math.min(lifts, 4 - cross);
  var quality = method.quality;
  if (w.cut || w.phase.key === 'recov' || w.phase.key === 'taper' || w.phase.key === 'race') quality = Math.min(quality, 1);
  if (runs <= 3 && method.key !== 'lowfreq') quality = Math.min(quality, 1);
  if (w.phase.key === 'base' && method.key !== 'lowfreq' && method.key !== 'polarized') quality = Math.min(quality, 1);

  var lay = layoutWeek({ runs: runs, quality: quality, lifts: lifts, cross: cross, avail: prof.avail || [1, 1, 1, 1, 1, 1, 1].map(Boolean), longDay: prof.longDay != null ? +prof.longDay : 6, doubles: prof.doubles !== false, mlr: method.mlr && m >= 30 });
  var ev = w.event;
  var raceIdx = (ev && ev.date >= w.start && ev.date <= w.end) ? dow(ev.date) : -1;
  var key = w.phase.block;
  var prevLong = lastLongs[key];
  var longMi = longMilesFor(w, prevLong);
  if (!w.cut && w.phase.key !== 'taper' && w.phase.key !== 'race' && w.phase.key !== 'recov') lastLongs[key] = w.phase.key === 'spec' ? Math.max(prevLong || 0, longMi) : longMi;
  var zz = zones(w.vPlan, ev && parseClock(ev.goal) > 0 ? parseClock(ev.goal) / w.dist.mi : null);
  w.zones = zz;

  var days = [];
  for (var i = 0; i < 7; i++) days.push({ date: addD(w.start, i), dow: DOW[i], i: i, parts: [] });
  var parts = [];
  var used = 0;
  /* race week: race day, a sharpener 3-4 days out, short easy runs */
  if (w.phase.key === 'race' && raceIdx >= 0) {
    days[raceIdx].parts.push({ type: 'race', role: 'race', title: ev.name || w.dist.label, mi: w.dist.mi, goal: ev.goal, steps: [S('run', { mi: w.dist.mi, z: 'G', label: 'Race' })], note: raceNote(ev, w.dist) });
    var sd = raceIdx - 4 >= 0 ? raceIdx - 4 : null;
    if (sd != null) days[sd].parts.push(mkQuality(w, qualityFor({ phase: 'race', qi: 0, dist: w.dist, method: method }), 4, zz));
    var cand = [raceIdx - 5, raceIdx - 3, raceIdx - 2, raceIdx - 6].filter(function (d) { return d >= 0 && d !== sd; });
    var ez = cand.slice(0, runs >= 4 ? 2 : 1);
    var each = clamp(Math.round((m - (sd != null ? 4 : 0) - 2) / Math.max(1, ez.length)), 3, w.dist.key === 'full' ? 6 : 5);
    ez.forEach(function (d) { days[d].parts.push(easyPart('Easy run', each, 'easy', zz)); });
    if (raceIdx - 1 >= 0) days[raceIdx - 1].parts.push(easyPart('Shakeout', 2, 'easy', zz, '15–20 minutes very easy with 4 relaxed strides. Lay out your gear tonight.'));
    if (raceIdx + 1 < 7 && !days[raceIdx + 1].parts.length) days[raceIdx + 1].parts.push(restPart('Recovery day', 'Walk, stretch, eat well. No running today.'));
    if (lifts && raceIdx >= 5) days[0].parts.push(liftPart('A', 3, w, 'Light session early in race week. Half the sets, easy loads, no jumps.'));
  } else {
    /* normal week */
    var qParts = [];
    var nQ = lay.qDays.length;
    var qMiles = clamp(Math.round(m * (method.key === 'lowfreq' ? 0.28 : nQ > 1 ? 0.16 : 0.2)), 3, 10);
    lay.qDays.forEach(function (d, qn) {
      var ttWeek = w.phase.key === 'thr' && w.qi === 0 && !w.cut && w.firstBlock && qn === 0 && !(prof.recent && prof.recent.time);
      var tuneup = w.phase.key === 'spec' && w.cut;
      var sess = qualityFor({ phase: w.phase.key === 'maint' ? 'base' : w.phase.key, qi: w.qi, dist: w.dist, method: method, cut: w.cut, firstBlock: w.firstBlock && w.phase.key !== 'maint', slot: qn, tt: ttWeek, tuneup: tuneup });
      if (!sess) { lay.roles[d] = lay.roles[d].map(function (r) { return /^quality/.test(r) ? 'easy' : r; }); return; }
      var p = mkQuality(w, sess, qMiles, zz);
      days[d].parts.push(p); qParts.push(p); used += p.mi;
    });
    /* long run (or a B race on the weekend) */
    var lr = longFor({ phase: w.phase.key === 'maint' ? 'base' : w.phase.key, dist: w.dist, li: w.li, cut: w.cut }, longMi);
    var longPart = { type: 'long', role: 'long', title: lr.title, mi: longMi, steps: lr.steps, note: lr.note };
    if (method.key === 'beginner' && prof.runWalk) longPart.note += ' Run-walk is welcome: for example 4 min running, 1 min walking.';
    days[lay.longDay].parts.push(longPart); used += longMi;
    /* easy runs fill the rest */
    var easyDays = [], mlrDay = null;
    lay.roles.forEach(function (r, d) { if (r.indexOf('easy') >= 0) easyDays.push(d); if (r.indexOf('mlr') >= 0) mlrDay = d; });
    var gymDays = [];
    lay.roles.forEach(function (r, d) { if (r.indexOf('cross') >= 0) gymDays.push(d); });
    var tmi = method.key === 'lowfreq' ? 1.5 : clamp(Math.round(m * 0.08), 2, 3);
    used += tmi * gymDays.length;
    var rem = Math.max(0, m - used);
    if (mlrDay != null) {
      var mlr = clamp(Math.round(longMi * 0.7), 6, 15);
      mlr = Math.min(mlr, Math.max(4, rem - 2 * easyDays.length));
      days[mlrDay].parts.push({ type: 'easy', role: 'mlr', title: 'Medium-long run', mi: mlr, steps: [run(mlr, 'E')], note: 'A steady midweek endurance run. Easy to steady effort.' });
      rem -= mlr;
    }
    var weights = easyDays.map(function (d) { return d === wrap(lay.longDay + 1) || lay.qDays.indexOf(wrap(d - 1)) >= 0 ? 0.8 : 1; });
    var wsum = weights.reduce(function (a, b) { return a + b; }, 0) || 1;
    easyDays.forEach(function (d, j) {
      var mi = Math.max(2, Math.round(rem * weights[j] / wsum));
      var rec = weights[j] < 1;
      days[d].parts.push(easyPart(rec ? 'Recovery run' : 'Easy run', mi, rec ? 'recovery' : 'easy', zz));
    });
    /* tune-up races (B/C events) replace that day's run */
    others.forEach(function (e) {
      if (e.date < w.start || e.date > w.end) return;
      var d = dow(e.date), dd = distOf(e);
      days[d].parts = days[d].parts.filter(function (p) { return p.type === 'strength' || p.type === 'cross'; });
      days[d].parts.unshift({ type: 'race', role: 'race', tuneup: true, title: e.name || dd.label, mi: dd.mi, goal: e.goal, steps: [S('run', { mi: dd.mi, z: 'F', label: 'Race or tune-up effort' })], note: 'Tune-up race (' + (e.priority || 'B') + ' priority). Race it if you feel good, or run it at steady effort as a workout.' });
      if (d + 1 < 7) days[d + 1].parts = days[d + 1].parts.filter(function (p) { return p.type !== 'speed'; });
    });
    /* lifts */
    var mods = liftRotation(lifts + gymDays.length, runs);
    var lp = liftPhaseFor(w.phase.key, w.phIdx);
    var li2 = 0;
    lay.roles.forEach(function (r, d) {
      if (r.indexOf('lift') < 0) return;
      var k = mods[li2 % mods.length]; li2++;
      days[d].parts.push(liftPart(k, lp, w));
    });
    gymDays.forEach(function (d) {
      if (!days[d].parts.some(isRun)) days[d].parts.unshift({ type: 'easy', role: 'gym', treadmill: true, title: 'Treadmill run', mi: tmi, steps: [run(tmi, 'E')], note: 'Easy treadmill run at 1% incline, before or after you lift. Keep it truly conversational: today is about the gym.' });
      if (!days[d].parts.some(function (p) { return p.type === 'strength'; })) { var k = mods[li2 % mods.length]; li2++; days[d].parts.push(liftPart(k, lp, w)); }
      days[d].gym = true;
    });
  }
  days.forEach(function (d) { if (!d.parts.length) d.parts.push(restPart()); });
  w.days = days;
  w.layout = lay;
  w.notes = weekNotes(w, prof);
  w.tot = totals(days);
}

function liftRotation(n, runs) {
  if (n <= 0) return [];
  if (n === 1) return ['A'];
  if (n === 2) return ['A', 'B'];
  if (n === 3) return runs <= 4 ? ['A', 'B', 'C'] : ['A', 'B', 'UB'];
  return ['A', 'UB', 'B', 'C'];
}
function mkQuality(w, sess, q, zz) {
  var steps = sizeSession(sess.steps(q), q, zz);
  var mi = half(stepMiles(steps, zz));
  return { type: 'speed', role: 'speed', key: sess.key, tt: sess.kind === 'tt', title: sess.title, mi: mi, steps: steps, purpose: sess.purpose };
}
function easyPart(title, mi, type, zz, note) {
  return { type: type, role: type, title: title, mi: mi, steps: [run(mi, type === 'recovery' ? 'REC' : 'E')], note: note || (type === 'recovery' ? 'Slower than you think. This run helps you absorb yesterday\'s work.' : 'Conversational effort. You should be able to speak in full sentences.') };
}
function liftPart(key, lp, w, note) {
  var mod = LIFT[key];
  var min = mod.blocks.reduce(function (a, b) { return a + b.min; }, 0);
  return { type: 'strength', role: 'lift', key: key, lp: lp, title: (key === 'UB' || key === 'HT' || key === 'ACT') ? mod.name : 'Strength ' + key + ': ' + mod.name, min: min, note: note || mod.focus };
}
function restPart(title, text) { return { type: 'rest', role: 'rest', title: title || 'Rest & recover', note: text || 'Full rest or a 20–30 minute walk. Mobility and the shin routine are welcome. Sleep is training too.' }; }
function raceNote(ev, dist) {
  var g = parseClock(ev.goal);
  var s = 'Race day! ';
  if (g > 0) s += 'Goal ' + clock(g) + ' (' + fmtPace(g / dist.mi) + '/mi). Start 5–10 s/mi slower for the first two miles, settle to goal pace, and race the last third. ';
  s += dist.key === 'full' ? 'Take 60–90 g of carbs per hour from the start and drink to thirst at aid stations.' : dist.key === 'half' ? 'One gel 15 minutes before the start and one around mile 7 if you like.' : 'Warm up well: 10–15 minutes easy and 4 strides.';
  return s;
}
function weekNotes(w, prof) {
  var n = [];
  if (w.n === 1) n.push('First week. Keep every run conversational and lifting loads around RPE 6–7.');
  if (w.phIdx === 0 && w.phase.key !== 'race') n.push(w.phase.name + ' begins. ' + w.phase.focus);
  if (w.cut) n.push('Cutback week: about 25% less running so your body absorbs the last few weeks.');
  if (w.days.some(function (d) { return d.parts.some(function (p) { return p.tt; }); })) n.push('Fitness check this week. Log your result and every pace in the app updates.');
  if (w.phase.key === 'race') n.push('Race week. Lay out gear two days before, hydrate, eat what you practiced, and sleep well two nights out.');
  return n;
}
function totals(days) {
  var o = { mi: 0, runs: 0, lifts: 0, cross: 0, long: 0, quality: 0 };
  days.forEach(function (d) {
    d.parts.forEach(function (p) {
      if (p.type === 'strength') o.lifts++;
      else if (p.type === 'cross') o.cross++;
      else if (p.type !== 'rest') {
        o.mi += p.mi || 0; o.runs++;
        if (p.type === 'long' || p.type === 'race') o.long = Math.max(o.long, p.mi || 0);
        if (p.type === 'speed') o.quality += p.mi || 0;
      }
    });
  });
  o.mi = round1(o.mi);
  return o;
}

/* ---------------- adaptations: status weeks, life events, day moves, today's call ---------------- */
var STATUS = {
  vacation: { label: 'Vacation', levels: {
    light: { label: 'Light running', m: 0.6, ramp: [0.9], text: 'Run when it suits you. Easy miles only, no speed work, and a bodyweight session in place of the gym.' },
    off: { label: 'No running', m: 0, ramp: [0.7, 0.9], text: 'Full break. One week off costs very little fitness. Walk a lot and come back hungry.' } } },
  sick: { label: 'Sick', levels: {
    mild: { label: 'Mild', m: 0.5, ramp: [0.75, 0.9], text: 'Rest until you are fever-free for 24 hours and symptoms are above the neck. Then easy miles only. No speed work or heavy lifting.' },
    severe: { label: 'Out', m: 0, ramp: [0.5, 0.7, 0.85], text: 'Rest completely. Come back only when fever-free for 24 hours and mostly normal. Chest symptoms or fever: check with a clinician before running.' } } },
  injured: { label: 'Injured', levels: {
    modified: { label: 'Niggle', m: 0.6, ramp: [0.7, 0.8, 0.9], text: 'Run only pain-free (2/10 or less). Speed work becomes easy running, no hills, and the gym switches to upper body and core. Do the shin routine daily.' },
    out: { label: 'Out', m: 0, ramp: [0.4, 0.6, 0.75, 0.9], text: 'No running. Walk on a treadmill 20–40 minutes if it is pain-free, lift upper body and core, and rehab daily. See a clinician if pain lasts, wakes you at night, or sits on one spot of bone.' } } },
  busy: { label: 'Busy', levels: {
    light: { label: 'Busy week', m: 0.7, ramp: [], text: 'A lighter week to fit life in. Key runs stay, extras shrink.' } } }
};

/* Week status from explicit week marks plus life events that cover 3+ days of a week. */
function weekStatuses(plan, st) {
  var out = {};
  var marks = st.status || {};
  (st.life || []).forEach(function (e) {
    if (!e.from || !e.to || !STATUS[e.kind]) return;
    plan.weeks.forEach(function (w) {
      var a = e.from > w.start ? e.from : w.start, b = e.to < w.end ? e.to : w.end;
      if (a > b) return;
      var days = diffD(a, b) + 1;
      if (days >= 3 || e.kind === 'injured' && e.level === 'out') {
        var lv = e.level || Object.keys(STATUS[e.kind].levels)[0];
        if (!out[w.start] || STATUS[e.kind].levels[lv].m < STATUS[out[w.start].kind].levels[out[w.start].level].m) out[w.start] = { kind: e.kind, level: lv, src: 'life', note: e.note };
      }
    });
  });
  Object.keys(marks).forEach(function (k) { if (marks[k] && STATUS[marks[k].kind]) out[k] = marks[k]; });
  return out;
}
function multipliers(plan, statusByWeek) {
  var out = {}, run = 0, lastMarked = -2, seq = null, pos = 0, kindOf = null, levelOf = null;
  plan.weeks.forEach(function (w, idx) {
    var s = statusByWeek[w.start];
    var lv = s && STATUS[s.kind] && STATUS[s.kind].levels[s.level];
    if (lv) {
      run = lastMarked === idx - 1 ? run + 1 : 1;
      lastMarked = idx;
      seq = lv.ramp.slice();
      for (var k = 1; k < Math.min(run, 4) && seq.length; k++) seq.unshift(seq[0]);
      pos = 0; kindOf = s.kind; levelOf = s.level;
      out[w.start] = { m: lv.m, kind: s.kind, level: s.level, phase: 'status', weeks: run, note: s.note };
    } else if (seq && pos < seq.length) {
      out[w.start] = { m: seq[pos], kind: kindOf, level: levelOf, phase: 'ramp', step: pos + 1, of: seq.length };
      pos++;
      if (pos >= seq.length) seq = null;
    }
  });
  return out;
}

function scaleRun(p, f, zz) {
  var q = Object.assign({}, p);
  q.mi = Math.max(1.5, half((p.mi || 0) * f));
  if (p.type === 'long' || p.type === 'easy' || p.type === 'recovery') q.steps = [run(q.mi, p.type === 'recovery' ? 'REC' : 'E')];
  return q;
}
function toEasy(p, f, title, note, zz) {
  return { type: 'easy', role: p.role, title: title || 'Easy run', mi: Math.max(2, half((p.mi || 4) * (f || 0.8))), steps: null, note: note || 'Swapped to easy running.', changed: true, from: p.title };
}
function modRun(p, mod, zz) {
  var m = mod.m, k = mod.kind;
  if (p.type === 'race') return p;
  if (m === 0) {
    if (k === 'injured') {
      return { type: 'cross', role: p.role, title: 'Treadmill walk', min: p.role === 'long' ? 40 : 25, note: 'Flat or gentle-incline treadmill walk, pain-free only. If walking hurts, rest instead.', changed: true, from: p.title };
    }
    return restPart(k === 'vacation' ? 'Vacation' : 'Rest', k === 'vacation' ? 'Skip the run and enjoy the break. A walk or swim is a bonus.' : 'Rest completely. Walk only if you feel up to it.');
  }
  if (p.role === 'easy' && m < 0.6 && p.type !== 'long') return restPart('Rest', 'Run volume is lower this week. Walk or stretch if you like.');
  if (p.type === 'speed' && (m < 0.85 || k === 'injured' || mod.phase === 'status')) {
    var e = toEasy(p, m < 0.75 ? 0.75 : 0.9, m < 0.75 ? 'Easy + strides' : 'Easy run', k === 'injured' ? 'Easy and pain-free only. No hills.' : 'Speed work returns once you are fully back.');
    if (m >= 0.75 && k !== 'injured') { e.steps = [run(Math.max(1, e.mi - 0.4), 'E'), rep(6, { sec: 20 }, 'R', { sec: 40, walk: true }, 'relaxed strides')]; }
    return e;
  }
  var q = scaleRun(p, Math.max(0.5, m), zz);
  q.changed = true; q.from = p.title;
  return q;
}
function modLift(p, mod) {
  if (mod.m === 0 && mod.kind === 'sick') return restPart('Rest', 'No lifting while sick.');
  if (mod.kind === 'injured') return Object.assign({}, p, { key: 'UB', title: LIFT.UB.name, lp: 0, note: 'Upper body and core while the leg settles.', changed: true });
  if (mod.kind === 'vacation') return Object.assign({}, p, { key: 'HT', title: LIFT.HT.name, lp: 0, note: 'Optional bodyweight session.', changed: true });
  if (mod.m < 0.9) return Object.assign({}, p, { lp: 3, note: 'Light while you ramp back up. Skip jumps if anything is sore.', changed: true });
  return p;
}

/* Apply statuses, unavailable days, moves and day overrides to the generated plan. */
function adapt(plan, st, analysis) {
  var stat = weekStatuses(plan, st);
  var mult = multipliers(plan, stat);
  var unavailable = {};
  (st.life || []).forEach(function (e) {
    if (!e.from || !e.to) return;
    if (e.kind === 'busy' || e.kind === 'travel' || (STATUS[e.kind] && diffD(e.from, e.to) < 2)) {
      for (var d = e.from; d <= e.to; d = addD(d, 1)) unavailable[d] = e.kind;
    }
  });
  var moves = st.moves || {};
  var ov = st.overrides || {};
  var off = (analysis && analysis.off) || {};
  plan.weeks.forEach(function (w) {
    var mod = mult[w.start] || null;
    w.mod = mod;
    var zz = zonesFor(plan, w, analysis);
    w.zonesAdj = zz;
    w.base = w.tot.mi;
    w.days.forEach(function (d) {
      d.parts = d.parts.map(function (p) {
        if (!mod || mod.m >= 1) return p;
        if (p.type === 'strength') return modLift(p, mod);
        if (p.type === 'cross' || p.type === 'rest') return p;
        return modRun(p, mod, zz);
      });
    });
    /* manual moves: {fromDate: toDate} for the run on that day */
    Object.keys(moves).forEach(function (from) {
      var to = moves[from];
      if (from < w.start || from > w.end || to < w.start || to > w.end) return;
      var a = w.days[dow(from)], b = w.days[dow(to)];
      var mv = a.parts.filter(function (p) { return isRun(p) || p.type === 'cross'; });
      if (!mv.length) return;
      a.parts = a.parts.filter(function (p) { return mv.indexOf(p) < 0; });
      b.parts = b.parts.filter(function (p) { return p.type !== 'rest'; });
      mv.forEach(function (p) { b.parts.unshift(Object.assign({}, p, { moved: from })); });
      if (!a.parts.length) a.parts.push(restPart());
    });
    /* unavailable days: move runs to free days in the same week, most important first */
    var blocked = w.days.filter(function (d) { return unavailable[d.date]; });
    if (blocked.length) {
      var queue = [];
      blocked.forEach(function (d) {
        d.parts.forEach(function (p) { if (isRun(p) && p.type !== 'race') queue.push({ p: p, from: d }); });
        d.parts = [restPart('Busy day', 'You marked this day as ' + (unavailable[d.date] === 'travel' ? 'travel' : 'busy') + '. Rest, or walk if you can.')];
        d.blocked = unavailable[d.date];
      });
      var prio = { long: 0, race: 0, speed: 1, easy: 2, recovery: 3 };
      queue.sort(function (a, b) { return (prio[a.p.type] || 9) - (prio[b.p.type] || 9); });
      queue.forEach(function (it) {
        var freeDays = w.days.filter(function (d) { return !d.blocked && !d.parts.some(isRun); });
        if (!freeDays.length) { it.from.dropped = (it.from.dropped || []).concat([it.p.title]); return; }
        freeDays.sort(function (a, b) { return Math.abs(a.i - it.from.i) - Math.abs(b.i - it.from.i); });
        var tgt = freeDays[0];
        tgt.parts = tgt.parts.filter(function (p) { return p.type !== 'rest'; });
        tgt.parts.unshift(Object.assign({}, it.p, { moved: it.from.date }));
      });
    }
    /* single-day overrides (accepted coach suggestions or manual swaps) */
    w.days.forEach(function (d) {
      var o = ov[d.date];
      if (!o) return;
      d.override = o;
      d.parts = d.parts.map(function (p) {
        if (!isRun(p) || p.type === 'race') {
          if (p.type === 'strength' && (o.lift === 'light' || o.action === 'rest')) return o.action === 'rest' ? restPart('Rest day', 'Swapped to rest: ' + (o.reason || 'recovery comes first today.')) : Object.assign({}, p, { lp: 3, changed: true, note: 'Light today: half the sets, easy loads, no jumps.' });
          if (p.type === 'strength' && o.lift === 'skip') return restPart('Lift skipped', o.reason || 'Skip the gym today.');
          return p;
        }
        if (o.action === 'easy') { var e = toEasy(p, p.type === 'long' ? 0.8 : 0.85, 'Easy run', 'Coach swap: ' + (o.reason || 'easy today.')); return e; }
        if (o.action === 'short') { var s2 = scaleRun(p, 0.7, zz); s2.changed = true; s2.note = 'Shortened: ' + (o.reason || 'lighter today.'); if (p.type === 'speed') { s2 = toEasy(p, 0.7, 'Short easy run', 'Shortened: ' + (o.reason || '')); } return s2; }
        if (o.action === 'rest') return restPart('Rest day', 'Swapped to rest: ' + (o.reason || 'recovery comes first today.'));
        if (o.action === 'cross') return { type: 'cross', role: p.role, title: 'Treadmill walk', min: clamp(Math.round((p.mi || 3) * 10), 20, 45), note: 'Brisk walk on a 4–8% incline instead of running: ' + (o.reason || 'low impact today.'), changed: true, from: p.title };
        return p;
      });
    });
    /* never show two rest cards on one day, and drop rest cards next to real sessions */
    w.days.forEach(function (d) {
      var real = d.parts.filter(function (p) { return p.type !== 'rest'; });
      d.parts = real.length ? real : [d.parts.filter(function (p) { return p.type === 'rest'; })[0] || restPart()];
    });
    /* fill steps for easy parts created above, then paces */
    w.days.forEach(function (d) {
      d.parts.forEach(function (p) {
        if (isRun(p) && !p.steps) p.steps = [run(p.mi, p.type === 'recovery' ? 'REC' : 'E')];
      });
    });
    w.tot = totals(w.days);
  });
  plan.statusByWeek = stat;
  plan.mult = mult;
  return plan;
}
function isRun(p) { return p && (p.type === 'easy' || p.type === 'recovery' || p.type === 'long' || p.type === 'speed' || p.type === 'race'); }

/* Paces for a week: planned fitness + measured change + effort feedback. */
function zonesFor(plan, w, an) {
  var v = w.vPlan + ((an && an.dvAt) ? an.dvAt(w.start) : 0);
  var gp = w.event && parseClock(w.event.goal) > 0 ? parseClock(w.event.goal) / w.dist.mi : null;
  var z = zones(v, gp);
  var off = (an && an.off) || {};
  Object.keys(z).forEach(function (k) {
    var o = k === 'REC' || k === 'E' ? off.E : k === 'S' ? off.S : k === 'T' ? off.T : k === 'I' || k === 'R' ? off.I : 0;
    if (o && k !== 'G') z[k] = [z[k][0] + o, z[k][1] + o];
  });
  /* A recently measured threshold pace pins threshold work for the next weeks. */
  if (an && an.ltPin && w.start >= monday(an.lt.date) && diffD(an.lt.date, w.start) <= 70) {
    z.T = [r5(an.ltPin - 5 + (off.T || 0)), r5(an.ltPin + 5 + (off.T || 0))];
  }
  if (an && (an.lt && an.lt.hr || an.hrMax)) z.hr = hrZones(an.lt && an.lt.hr, an.hrMax);
  return z;
}

/* ---------------- logs + Garmin -> analysis ---------------- */
function runLogs(st) {
  var out = [];
  var logs = st.logs || {};
  Object.keys(logs).sort().forEach(function (date) {
    var d = logs[date];
    ['run', 'xrun'].forEach(function (slot) {
      var r = d && d[slot];
      if (!r || r.skip) return;
      var mi = +r.mi || 0, sec = +r.sec || 0;
      out.push({ date: date, slot: slot, ptype: r.ptype || 'easy', mi: mi, sec: sec, pace: mi > 0 && sec > 0 ? sec / mi : null, rpe: +r.rpe || null, hr: +r.hr || null, seg: r.seg || null, src: r.src || 'manual' });
    });
  });
  return out;
}
function partOn(plan, date, type) {
  var w = weekOf(plan, date);
  if (!w) return null;
  var d = w.days[dow(date)];
  return d.parts.filter(function (p) { return type ? p.type === type : isRun(p); })[0] || null;
}
function weekOf(plan, date) {
  for (var i = 0; i < plan.weeks.length; i++) if (date >= plan.weeks[i].start && date <= plan.weeks[i].end) return plan.weeks[i];
  return null;
}
function mainZone(p) {
  if (!p || !p.steps) return null;
  var z = null;
  p.steps.forEach(function (s) { if (!z && (s.k === 'rep' || s.k === 'run') && ['T', 'I', 'M', 'G', 'H'].indexOf(s.z) >= 0) z = s.z; });
  return z;
}

function analyze(plan, st, garmin) {
  var runs = runLogs(st);
  var res = { off: { E: 0, S: 0, T: 0, I: 0 }, notes: [], vdot: null, result: null, proj: null, dv: 0, dvFrom: null, easy: null, hr: null };
  res.dvAt = function (date) { return res.dvFrom && date >= monday(res.dvFrom) ? res.dv : 0; };
  function note(level, title, body) { res.notes.push({ level: level, title: title, body: body }); }
  /* 1. the latest fitness anchor: a race or time trial, a lactate threshold test, or a VO2max reading */
  var anchors = [];
  runs.forEach(function (r) { if (r.seg && r.seg.race && r.seg.mi >= 1 && r.seg.sec > 0) anchors.push({ date: r.date, src: 'race', v: vdotOf(r.seg.mi, r.seg.sec), w: 1, mi: r.seg.mi, sec: r.seg.sec }); });
  (st.metrics || []).forEach(function (m) {
    if (!m || !m.date) return;
    var lt = parseClock(m.ltPace);
    if (lt > 0) anchors.push({ date: m.date, src: 'lt', v: vdotFromThreshold(lt), w: 0.9, ltPace: lt, ltHr: +m.ltHr || null });
    else if (+m.vo2 > 20) anchors.push({ date: m.date, src: 'vo2', v: vdotFromVo2(+m.vo2), w: 0.5, vo2: +m.vo2 });
  });
  anchors.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  var ltm = (st.metrics || []).filter(function (m) { return m && (+m.ltHr > 0 || parseClock(m.ltPace) > 0); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  if (ltm.length) { var lm = ltm[ltm.length - 1]; res.lt = { date: lm.date, pace: parseClock(lm.ltPace) > 0 ? parseClock(lm.ltPace) : null, hr: +lm.ltHr || null }; }
  var vo2m = (st.metrics || []).filter(function (m) { return m && +m.vo2 > 20; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  if (vo2m.length) res.vo2 = { date: vo2m[vo2m.length - 1].date, v: +vo2m[vo2m.length - 1].vo2, hist: vo2m.map(function (m) { return { date: m.date, v: +m.vo2 }; }) };
  if (anchors.length) {
    var last = anchors[anchors.length - 1];
    var w = weekOf(plan, last.date);
    var exp = w ? w.vPlan : plan.v0;
    res.vdot = exp + (last.v - exp) * last.w;
    res.dv = clamp((last.v - exp) * last.w, -5, 5); res.dvFrom = last.date;
    res.result = { date: last.date, src: last.src, mi: last.mi, sec: last.sec, vdot: res.vdot, raw: last.v, exp: exp, ltPace: last.ltPace, vo2: last.vo2 };
  }
  /* A recent lactate threshold pace pins the threshold zone directly (within 10 weeks). */
  if (res.lt && res.lt.pace && diffD(res.lt.date, today()) <= 70) res.ltPin = res.lt.pace;
  /* 2. effort feedback on quality runs */
  var RPE_T = { T: 7, I: 8, M: 6, G: 6, H: 6 };
  var fb = { T: [], I: [] };
  runs.forEach(function (r) {
    if (r.ptype !== 'speed' || !r.rpe) return;
    var p = partOn(plan, r.date, 'speed');
    var z = mainZone(p);
    if (z !== 'T' && z !== 'I') return;
    var zz = (weekOf(plan, r.date) || {}).zones;
    var tgt = zz && zz[z] ? (zz[z][0] + zz[z][1]) / 2 : null;
    var implied = 5 * (r.rpe - RPE_T[z]);
    if (r.seg && r.seg.mi > 0 && r.seg.sec > 0 && !r.seg.race && tgt) implied += (r.seg.sec / r.seg.mi) - tgt;
    fb[z].push({ off: implied, rpe: r.rpe });
  });
  ['T', 'I'].forEach(function (z) {
    var g = fb[z].slice(-3);
    if (!g.length) return;
    var val = mean(g.map(function (x) { return x.off; })) * (g.length >= 2 ? 1 : 0.5);
    res.off[z] = r5(clamp(val, -20, 40));
    var rp = mean(g.map(function (x) { return x.rpe; }));
    if (rp - RPE_T[z] >= 1.5) note('warn', 'Slow down your ' + (z === 'T' ? 'tempo' : 'interval') + ' work', 'Your last ' + g.length + ' sessions averaged RPE ' + rp.toFixed(1) + ' against a target of ' + RPE_T[z] + '. Those paces are ' + res.off[z] + ' s/mi slower for now.');
    else if (RPE_T[z] - rp >= 1) note('good', 'You can push your ' + (z === 'T' ? 'tempo' : 'interval') + ' work', 'Recent sessions averaged RPE ' + rp.toFixed(1) + '. Paces move ' + Math.abs(res.off[z]) + ' s/mi faster.');
  });
  /* 3. easy runs: effort and heart rate */
  var er = runs.filter(function (r) { return (r.ptype === 'easy' || r.ptype === 'recovery' || r.ptype === 'long') && r.pace; }).slice(-5);
  var easyAdj = 0;
  var rated = er.filter(function (r) { return r.rpe; });
  if (rated.length >= 2) {
    var ar = mean(rated.map(function (r) { return r.rpe; }));
    if (ar >= 6.5) easyAdj = 15; else if (ar >= 5.5) easyAdj = 8; else if (ar <= 3 && rated.length >= 3) easyAdj = -5;
    res.easy = { rpe: ar, n: rated.length };
  }
  var hrMax = maxHrSeen(garmin);
  res.hrMax = hrMax;
  var withHr = er.filter(function (r) { return r.hr; });
  if (hrMax && withHr.length >= 3) {
    var hrPct = mean(withHr.map(function (r) { return r.hr; })) / hrMax;
    res.hr = { pct: hrPct, max: hrMax };
    if (hrPct > 0.8) { easyAdj = Math.max(easyAdj, 10); note('warn', 'Easy runs are running hot', 'Your easy runs average ' + Math.round(hrPct * 100) + '% of your max heart rate (' + hrMax + '). Easy should sit around 65–78%. Easy paces are ' + Math.max(easyAdj, 10) + ' s/mi slower so they stay truly easy.'); }
  }
  res.off.E = r5(clamp(easyAdj + (res.dv ? 0 : 0), -15, 45));
  res.off.S = r5((res.off.E + res.off.T) / 2);
  if (res.easy && easyAdj >= 8 && !(res.hr && res.hr.pct > 0.8)) note('warn', 'Slow your easy runs', 'Your last easy runs averaged RPE ' + res.easy.rpe.toFixed(1) + '. Easy should feel like a 3 or 4.');
  /* 4. projections */
  var vNow = res.vdot != null ? res.vdot : (weekOf(plan, today()) || plan.weeks[0]).vPlan + res.dvAt(today());
  res.vNow = vNow;
  res.proj = { k5: predict(vNow, 3.10686), k10: predict(vNow, 6.21371), half: predict(vNow, 13.1094), full: predict(vNow, 26.2188) };
  if (res.result) {
    var rr = res.result, d = rr.vdot - rr.exp;
    var what = rr.src === 'race' ? 'Your ' + round1(rr.mi) + ' mi in ' + clock(rr.sec) : rr.src === 'lt' ? 'Your lactate threshold pace of ' + fmtPace(rr.ltPace) + '/mi' : 'Your VO2max reading of ' + rr.vo2;
    note(d >= 0.5 ? 'good' : d <= -1 ? 'warn' : 'good', d >= 0.5 ? 'Ahead of the plan' : d <= -1 ? 'Paces eased to match your fitness' : 'Right on plan',
      what + ' (' + fmtDate(rr.date) + ') puts your fitness (VDOT) at ' + rr.vdot.toFixed(1) + ' against ' + rr.exp.toFixed(1) + ' planned. Every pace from then on updates' + (rr.src === 'vo2' ? ', with half weight because watch VO2max is an estimate.' : '.'));
  }
  if (res.lt && res.lt.hr) note('info', 'Heart-rate guide from your threshold', 'Lactate threshold heart rate ' + res.lt.hr + ' bpm: easy runs below ' + Math.round(res.lt.hr * 0.85) + ', steady ' + Math.round(res.lt.hr * 0.87) + '–' + Math.round(res.lt.hr * 0.92) + ', threshold work ' + Math.round(res.lt.hr * 0.95) + '–' + Math.round(res.lt.hr * 1.0) + ' bpm.');
  if (!runs.length) note('info', 'No runs logged yet', 'Runs from your Garmin appear automatically after each sync. Rate how they felt and your paces tune themselves.');
  return res;
}
function maxHrSeen(g) {
  if (!g || !g.activities) return null;
  var m = 0;
  g.activities.forEach(function (a) { if (a.run && a.maxHR > m) m = a.maxHR; });
  return m >= 150 ? m : null;
}

/* ---------------- Garmin -> logs ---------------- */
function matchGarmin(st, plan, garmin) {
  /* returns a list of {date, slot, rec} to add; never overwrites manual entries */
  var adds = [];
  if (!garmin || !garmin.activities) return adds;
  var seen = st.seen || {};
  var logs = st.logs || {};
  var byDate = {};
  garmin.activities.forEach(function (a) {
    if (!a.date || seen[a.id]) return;
    (byDate[a.date] = byDate[a.date] || []).push(a);
  });
  Object.keys(byDate).forEach(function (date) {
    var l = logs[date] || {};
    var list = byDate[date].sort(function (a, b) { return (a.start || '') < (b.start || '') ? -1 : 1; });
    var slots = [];
    if (!l.run) slots.push('run');
    if (!l.xrun) slots.push('xrun');
    list.forEach(function (a) {
      if (a.run) {
        var slot = slots.shift();
        if (!slot) return;
        var p = plan ? partOn(plan, date) : null;
        var mi = round1((a.distM || 0) / MI_M), sec = Math.round(a.movS || a.durS || 0);
        adds.push({ date: date, slot: slot, id: a.id, rec: { src: 'garmin', gid: a.id, ptype: a.race ? 'race' : (p ? p.type : 'easy'), mi: mi, sec: sec, hr: a.avgHR || null, maxhr: a.maxHR || null, te: a.te || null, name: a.name || '', seg: a.race && mi >= 1 ? { mi: mi, sec: sec, race: true } : null } });
      } else if (a.strength) {
        if (!l.lift && !adds.some(function (x) { return x.date === date && x.slot === 'lift'; })) adds.push({ date: date, slot: 'lift', id: a.id, rec: { src: 'garmin', gid: a.id, key: null, min: Math.round((a.durS || 0) / 60), ex: {} } });
      } else {
        if (!l.cross && !adds.some(function (x) { return x.date === date && x.slot === 'cross'; })) adds.push({ date: date, slot: 'cross', id: a.id, rec: { src: 'garmin', gid: a.id, type: a.type, min: Math.round((a.durS || 0) / 60), hr: a.avgHR || null } });
      }
    });
  });
  return adds;
}

/* ---------------- readiness ---------------- */
function baselineOf(days, date, key, n) {
  var vals = [];
  for (var i = 1; i <= (n || 21); i++) { var r = days[addD(date, -i)]; if (r && typeof r[key] === 'number') vals.push(r[key]); }
  return vals.length >= 4 ? mean(vals) : null;
}
function loadMiles(st, date, ndays) {
  var t = 0, logs = st.logs || {};
  for (var i = 0; i < ndays; i++) {
    var d = logs[addD(date, -i)];
    if (!d) continue;
    ['run', 'xrun'].forEach(function (s) { if (d[s] && !d[s].skip) t += +d[s].mi || 0; });
    if (d.cross && d.cross.min) t += d.cross.min / 12;   /* ~5 mi-equivalent per hour of easy cross-training */
  }
  return t;
}
function checkinFor(st, date) {
  var c = (st.checkins || []).filter(function (x) { return x.date === date; });
  return c.length ? c[c.length - 1] : null;
}
function readiness(st, garmin, date) {
  var days = (garmin && garmin.days) || {};
  var g = days[date] || null;
  var f = [], reasons = [], metrics = {};
  function add(name, pts, why, val) { f.push({ name: name, pts: pts }); if (why) reasons.push({ pts: pts, text: why }); }
  if (g) {
    if (typeof g.hrv === 'number') {
      metrics.hrv = { v: g.hrv, base: g.hrvWeek || baselineOf(days, date, 'hrv'), lo: g.hrvLow, hi: g.hrvHigh, status: g.hrvStatus };
      var st2 = String(g.hrvStatus || '').toUpperCase();
      if (st2 === 'POOR' || (g.hrvLow && g.hrv < g.hrvLow * 0.9)) add('hrv', 2, 'HRV is well below your normal range (' + g.hrv + ' ms).');
      else if (st2 === 'LOW' || (g.hrvLow && g.hrv < g.hrvLow)) add('hrv', 1, 'HRV is below your normal range (' + g.hrv + ' ms).');
      else add('hrv', 0, null);
    }
    if (typeof g.rhr === 'number') {
      var b = baselineOf(days, date, 'rhr', 21);
      metrics.rhr = { v: g.rhr, base: b };
      if (b && g.rhr - b >= 8) add('rhr', 2, 'Resting heart rate is ' + Math.round(g.rhr - b) + ' bpm above your normal.');
      else if (b && g.rhr - b >= 5) add('rhr', 1, 'Resting heart rate is ' + Math.round(g.rhr - b) + ' bpm above your normal.');
      else add('rhr', 0, null);
    }
    if (typeof g.sleepH === 'number') {
      metrics.sleep = { v: g.sleepH, score: g.sleepScore, need: g.needH };
      if (g.sleepH < 5 || (g.sleepScore && g.sleepScore < 45)) add('sleep', 2, 'Short or poor sleep last night (' + round1(g.sleepH) + ' h' + (g.sleepScore ? ', score ' + g.sleepScore : '') + ').');
      else if (g.sleepH < 6.25 || (g.sleepScore && g.sleepScore < 60)) add('sleep', 1, 'Below-par sleep last night (' + round1(g.sleepH) + ' h' + (g.sleepScore ? ', score ' + g.sleepScore : '') + ').');
      else add('sleep', 0, null);
    }
    if (typeof g.bbHigh === 'number') {
      metrics.bb = { v: g.bbHigh, low: g.bbLow };
      if (g.bbHigh < 25) add('bb', 2, 'Body Battery only reached ' + g.bbHigh + '.');
      else if (g.bbHigh < 45) add('bb', 1, 'Body Battery is low (' + g.bbHigh + ').');
      else add('bb', 0, null);
    }
    if (typeof g.stress === 'number') metrics.stress = { v: g.stress };
  }
  var c = checkinFor(st, date);
  var flags = {};
  if (c) {
    if (c.ill) { add('ill', 3, 'You reported feeling sick.'); flags.ill = true; }
    if (c.pain) { add('pain', 2, 'You reported pain' + (c.where ? ' (' + c.where + ')' : '') + '.'); flags.pain = c.where || true; }
    if (c.feel != null) { if (c.feel <= 1) add('feel', 2, 'You feel rough today.'); else if (c.feel === 2) add('feel', 1, 'You feel a bit flat today.'); else add('feel', 0, null); }
    if (c.sore >= 2) add('sore', 1, 'Your legs are sore.');
    if (c.stress >= 3) add('stress', 1, 'Life stress is high today.');
    if (!g && c.sleep != null && c.sleep <= 2) add('sleep', c.sleep <= 1 ? 2 : 1, 'You slept poorly.');
  }
  var acute = loadMiles(st, addD(date, -1), 7), chronic = loadMiles(st, addD(date, -1), 28) / 4;
  metrics.load = { acute: round1(acute), chronic: round1(chronic) };
  if (chronic >= 8 && acute / chronic > 1.4) add('load', 1, 'Your last 7 days were ' + Math.round((acute / chronic - 1) * 100) + '% above your 4-week average.');
  var sum = f.reduce(function (a, x) { return a + x.pts; }, 0);
  var worst = f.reduce(function (a, x) { return Math.max(a, x.pts); }, 0);
  var level = flags.ill ? 'red' : (worst >= 2 && sum >= 3) || sum >= 4 ? 'red' : sum >= 2 || worst >= 2 ? 'amber' : sum >= 1 ? 'amber-' : 'green';
  if (level === 'amber-') level = 'green';
  var score = clamp(Math.round(100 - sum * 14), 5, 100);
  return { date: date, level: level, score: score, sum: sum, reasons: reasons.sort(function (a, b) { return b.pts - a.pts; }), metrics: metrics, garmin: !!g, checkin: c, flags: flags, factors: f.length };
}
/* What should today look like, given readiness? */
function recommend(rd, day) {
  var parts = day ? day.parts : [];
  var runP = parts.filter(isRun)[0], liftP = parts.filter(function (p) { return p.type === 'strength'; })[0];
  var r = { level: rd.level, headline: '', body: '', actions: [], lift: null };
  if (rd.flags.ill) {
    r.headline = 'Rest and recover';
    r.body = 'Skip training today. Come back once you have been fever-free for 24 hours. If symptoms are only above the neck and mild, a short easy walk is fine.';
    r.actions = [{ action: 'rest', label: 'Rest today' }, { action: 'sick', label: 'Mark the week as sick' }];
    return r;
  }
  if (rd.flags.pain) {
    r.headline = 'Protect the sore spot';
    r.body = 'Pain changes the plan. If it is 3/10 or less and settles as you warm up, run easy and short on soft ground. Otherwise walk on the treadmill pain-free, or rest, and mark the week as a niggle so the plan eases you back.';
    r.actions = [{ action: 'cross', label: 'Treadmill walk instead' }, { action: 'short', label: 'Short easy run' }, { action: 'injured', label: 'Mark a niggle' }];
    return r;
  }
  if (rd.level === 'green') {
    r.headline = runP ? 'Good to go' : 'Recovered and ready';
    r.body = runP ? 'Your recovery markers look normal. Run the session as planned.' : 'Enjoy the day. Tomorrow\'s session is set up well.';
    return r;
  }
  if (rd.level === 'amber') {
    r.headline = 'Take it a notch easier';
    if (runP && runP.type === 'speed') { r.body = 'Your body is showing some strain. Swap the workout for an easy run today; the key session can return later in the week if you bounce back.'; r.actions = [{ action: 'easy', label: 'Swap to easy run' }, { action: 'keep', label: 'Keep the workout' }]; }
    else if (runP && runP.type === 'long') { r.body = 'Shorten the long run by about 20% and keep it fully conversational.'; r.actions = [{ action: 'easy', label: 'Shorter, easy long run' }, { action: 'keep', label: 'Keep it' }]; }
    else if (runP) { r.body = 'Run it at the slow end of easy, or cut it short if your legs feel heavy.'; r.actions = [{ action: 'short', label: 'Shorten it' }, { action: 'keep', label: 'Keep it' }]; }
    else r.body = 'Keep today light and prioritize sleep tonight.';
    if (liftP) { r.lift = 'light'; r.body += ' Lift light today: half the sets, no jumps.'; }
    return r;
  }
  r.headline = 'Recovery day';
  r.body = 'Several recovery markers are off at once. Rest, or take a 20–30 minute easy walk. Missing one session costs nothing; pushing through this can cost a week.';
  r.actions = runP ? [{ action: 'rest', label: 'Rest today' }, { action: 'cross', label: 'Easy walk' }, { action: 'keep', label: 'Keep the plan' }] : [{ action: 'rest', label: 'Rest today' }];
  if (liftP) r.lift = 'skip';
  return r;
}

/* ---------------- nutrition ---------------- */
function dayLoad(day, zz) {
  var min = 0, hard = false, long = 0;
  (day ? day.parts : []).forEach(function (p) {
    if (isRun(p)) {
      var pace = zz && zz.E ? (zz.E[0] + zz.E[1]) / 2 : 570;
      min += (p.mi || 0) * pace / 60;
      if (p.type === 'speed' || p.type === 'race') hard = true;
      if (p.type === 'long' || p.type === 'race') long = Math.max(long, (p.mi || 0) * pace / 60);
    } else if (p.type === 'strength') min += 45;
    else if (p.type === 'cross') min += p.min || 35;
  });
  return { min: Math.round(min), hard: hard, long: Math.round(long) };
}
function nutrition(day, kg, zz, nextDay, rd, weekRace) {
  var L = dayLoad(day, zz);
  var tier, carb;
  if (L.long >= 120 || L.min >= 120) { tier = 'Very high'; carb = [8, 10]; }
  else if (L.long >= 75 || L.min >= 75 || (L.hard && L.min >= 50)) { tier = 'High'; carb = [6, 8]; }
  else if (L.min >= 40) { tier = 'Moderate'; carb = [5, 7]; }
  else if (L.min > 0) { tier = 'Light'; carb = [4, 5]; }
  else { tier = 'Rest'; carb = [3, 5]; }
  var lifting = day && day.parts.some(function (p) { return p.type === 'strength'; });
  var prot = lifting ? [1.6, 2.0] : [1.4, 1.8];
  var out = { tier: tier, load: L, carbGkg: carb, protGkg: prot, tips: [], fuel: null, kg: kg };
  if (kg) { out.carbG = [Math.round(carb[0] * kg), Math.round(carb[1] * kg)]; out.protG = [Math.round(prot[0] * kg), Math.round(prot[1] * kg)]; out.fluidL = round1(kg * 0.035 + (L.min / 60) * 0.6); }
  var next = nextDay ? dayLoad(nextDay, zz) : null;
  if (next && next.long >= 90) out.tips.push('Big run tomorrow: make dinner carb-rich and drink well this evening.');
  if (L.long >= 75) out.fuel = { during: L.long >= 150 ? '60–90 g carbs per hour (gels, chews, sports drink), starting by minute 30–40.' : '30–60 g carbs per hour, starting by minute 40.', fluid: '400–800 ml per hour depending on heat; add sodium (300–600 mg/h) on warm or long days.', before: '2–3 hours before: a familiar carb-based meal (1–2 g/kg carbs), low in fat and fiber.', after: 'Within an hour: carbs (about 1 g/kg) plus 20–30 g protein.' };
  else if (L.hard) out.fuel = { before: '1–3 hours before: a light carb snack such as toast with honey or a banana.', after: 'Within an hour: carbs plus 20–30 g protein, e.g. chocolate milk or a yogurt bowl.' };
  if (lifting) out.tips.push('Lifting day: spread protein across 3–4 meals, about 0.3–0.4 g/kg each, including one within 2 hours after the gym.');
  if (rd && rd.metrics.sleep && rd.metrics.sleep.v < 6.5) out.tips.push('Short sleep: keep caffeine before noon and front-load carbs at breakfast and lunch for steadier energy.');
  if (rd && rd.level !== 'green') out.tips.push('Recovery is the focus today: eat enough. Under-fueling slows adaptation and raises injury risk.');
  if (weekRace) {
    var dd = distOf(weekRace);
    if (dd.key === 'full') out.tips.push('Marathon week: for the 2 days before the race, aim for 8–12 g/kg of carbs per day, reduce fiber and fat, and stick to familiar foods.');
    else if (dd.key === 'half') out.tips.push('Half marathon week: the day before, lean on carbs (about 7–8 g/kg) and keep meals familiar.');
  }
  out.tips.push('Bone health matters for shins: aim for calcium-rich foods and vitamin D, and never train on an empty tank for long runs.');
  return out;
}

/* ---------------- lifting tailored to the day ---------------- */
function liftAdvice(part, rd, w) {
  if (!part) return null;
  var out = { lp: part.lp, notes: [] };
  if (rd.level === 'red') { out.lp = 3; out.skip = true; out.notes.push('Skip or do 15 minutes of mobility and the shin routine only.'); }
  else if (rd.level === 'amber') { out.lp = 3; out.notes.push('Light today: drop to the Light phase loads, half the sets, no box jumps or pogo hops.'); }
  if (rd.flags.pain) out.notes.push('Avoid anything that loads the sore spot. Upper body and core are fine.');
  var nextLong = w && w.days.some(function (d) { return d.date > part._date && d.parts.some(function (p) { return p.type === 'long'; }) && diffD(part._date || d.date, d.date) === 1; });
  if (nextLong) out.notes.push('Long run tomorrow: keep the legs fresh, leave 3 reps in the tank.');
  return out;
}

/* ---------------- Garmin FIT workout export ---------------- */
/*FIT*/
var INTENSITY_OF = { wu: 'warmup', cd: 'cooldown', run: 'active' };
function fitItems(p, zz) {
  var items = [];
  function paceOf(z) { if (!zz || !zz[z] || z === 'F') return null; return { lo: zz[z][0], hi: zz[z][1] }; }
  function dur(o) { return o.mi != null ? { dm: Math.round(o.mi * MI_M) } : o.m != null ? { dm: o.m } : o.min != null ? { ds: Math.round(o.min * 60) } : o.sec != null ? { ds: o.sec } : {}; }
  (p.steps || []).forEach(function (s) {
    if (s.k === 'rep') {
      var w = Object.assign({ kind: 'interval', pace: paceOf(s.z), name: 'Rep', notes: s.effort || ZONE_NAME[s.z] || '' }, dur(s.work));
      var r = Object.assign({ kind: 'recovery', pace: null, name: s.rec && s.rec.walk ? 'Walk' : 'Recover', notes: 'Easy' }, dur(s.rec || { sec: 60 }));
      items.push({ repeat: s.n, steps: [w, r] });
    } else {
      if (s.k === 'cd' && !(s.mi > 0)) return;
      items.push(Object.assign({ kind: INTENSITY_OF[s.k] || 'active', pace: s.k === 'wu' || s.k === 'cd' ? null : paceOf(s.z), name: s.k === 'wu' ? 'Warm up' : s.k === 'cd' ? 'Cool down' : (s.label || ZONE_NAME[s.z] || 'Run').slice(0, 15), notes: s.label || ZONE_NAME[s.z] || '' }, dur(s)));
    }
  });
  return items;
}
function workoutFile(p, zz, name) { return workoutFit(fitItems(p, zz), name, Date.now()); }

/* ---------------- describing a session in words ---------------- */
function zoneText(z, zz) {
  if (z === 'F') return null;
  var p = zz && zz[z];
  return p ? fmtPace(p[0]) + '–' + fmtPace(p[1]) + '/mi' : null;
}
function amt(o) {
  if (o.mi != null) return (Math.round(o.mi * 100) / 100) + ' mi';
  if (o.m != null) return o.m + ' m';
  if (o.min != null) return o.min + ' min';
  if (o.sec != null) return o.sec >= 60 && o.sec % 60 === 0 ? (o.sec / 60) + ' min' : o.sec + ' s';
  return '';
}
function describe(p, zz) {
  if (!p.steps) return [];
  return p.steps.map(function (s) {
    var pt = zoneText(s.z, zz);
    if (s.k === 'wu') return { kind: 'wu', text: amt(s) + ' warm-up, easy', pace: null };
    if (s.k === 'cd') return s.mi > 0 ? { kind: 'cd', text: amt(s) + ' cool-down, easy', pace: null } : null;
    if (s.k === 'rep') {
      var t = s.n + ' × ' + amt(s.work) + (s.z !== 'F' ? ' at ' + ZONE_NAME[s.z] : '') + (s.effort ? ' (' + s.effort + ')' : '');
      var r = s.rec ? amt(s.rec) + (s.rec.walk ? ' walk' : ' jog') + ' between' : '';
      return { kind: 'rep', text: t, rec: r, pace: pt, z: s.z };
    }
    return { kind: 'run', text: amt(s) + ' ' + (s.label ? s.label : ZONE_NAME[s.z]), pace: pt, z: s.z };
  }).filter(Boolean);
}
/* bar chart blocks for the workout structure view: [{w (relative duration), h (0-1 intensity), z}] */
var INT_H = { REC: 0.22, E: 0.3, S: 0.5, M: 0.6, G: 0.65, H: 0.65, T: 0.75, I: 0.9, R: 1, F: 0.7 };
function structure(p, zz) {
  var out = [];
  function mins(o, z) {
    var pace = zz && zz[z] ? (zz[z][0] + zz[z][1]) / 2 : 540;
    if (o.min != null) return o.min; if (o.sec != null) return o.sec / 60;
    if (o.mi != null) return o.mi * pace / 60; if (o.m != null) return o.m / MI_M * pace / 60; return 1;
  }
  (p.steps || []).forEach(function (s) {
    if (s.k === 'rep') {
      for (var i = 0; i < s.n; i++) {
        out.push({ w: mins(s.work, s.z === 'F' ? 'T' : s.z), h: INT_H[s.z] || 0.7, z: s.z });
        if (i < s.n - 1 && s.rec) out.push({ w: mins(s.rec, 'REC'), h: 0.18, z: 'REC' });
      }
    } else if (!(s.k === 'cd' && !(s.mi > 0))) out.push({ w: mins(s, s.z), h: s.k === 'wu' || s.k === 'cd' ? 0.26 : INT_H[s.z] || 0.3, z: s.k === 'wu' || s.k === 'cd' ? 'E' : s.z });
  });
  return out;
}
function estMinutes(p, zz) { return Math.round(structure(p, zz).reduce(function (a, b) { return a + b.w; }, 0)); }

/* ---------------- exports ---------------- */
var api = {
  MI_M: MI_M, DOW: DOW, DOW_LONG: DOW_LONG, DIST: DIST, METHODS: METHODS, STATUS: STATUS, LIFT: LIFT, LIFT_PHASES: LIFT_PHASES, ZONE_NAME: ZONE_NAME,
  ds: ds, pd: pd, addD: addD, dow: dow, monday: monday, diffD: diffD, today: today, fmtDate: fmtDate,
  clamp: clamp, round1: round1, half: half, mean: mean, clock: clock, fmtPace: fmtPace, parseClock: parseClock,
  vdotOf: vdotOf, paceAt: paceAt, predict: predict, zones: zones, distOf: distOf, goalVdot: goalVdot, vdotFromEasy: vdotFromEasy,
  suggestMethods: suggestMethods, historyStats: historyStats, defaultProfile: defaultProfile, generate: generate, layoutWeek: layoutWeek, adapt: adapt, isRun: isRun,
  analyze: analyze, matchGarmin: matchGarmin, readiness: readiness, recommend: recommend, nutrition: nutrition, liftAdvice: liftAdvice,
  weekOf: weekOf, partOn: partOn, zonesFor: zonesFor, describe: describe, structure: structure, estMinutes: estMinutes, stepMiles: stepMiles,
  fitItems: fitItems, workoutFile: workoutFile, workoutFit: workoutFit, zipFiles: zipFiles, fitCrc: fitCrc, flattenSteps: flattenSteps,
  loadMiles: loadMiles, vdotFromThreshold: vdotFromThreshold, vdotFromVo2: vdotFromVo2, hrZones: hrZones, checkinFor: checkinFor, maxHrSeen: maxHrSeen, weekStatuses: weekStatuses, liftRotation: liftRotation
};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.ENGINE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
