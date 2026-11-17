/* Run Plan engine: dates, paces, training styles, plan generator, adaptations,
   readiness, nutrition, analysis and Garmin FIT export. Pure functions, no DOM. */
(function (root) {
'use strict';

var MI_M = 1609.344;
var DOW_ABS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], DOW_LONG_ABS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
var DOW = DOW_ABS.slice(), DOW_LONG = DOW_LONG_ABS.slice();
/* Weeks can start on any day. WS: 0 = Monday ... 6 = Sunday. Day indexes everywhere are relative to it. */
var WS = 0;
function setWeekStart(k) { k = ((+k || 0) % 7 + 7) % 7; WS = k; for (var i = 0; i < 7; i++) { DOW[i] = DOW_ABS[(i + k) % 7]; DOW_LONG[i] = DOW_LONG_ABS[(i + k) % 7]; } return k; }
/* keep the same real weekdays when the week start changes: avail[] and longDay are stored relative to the week start */
function rotateProfile(p, to) {
  var from = +p.weekStart || 0, d = ((to - from) % 7 + 7) % 7; if (!d) { p.weekStart = to; return p; }
  if (p.avail) p.avail = p.avail.map(function (x, i) { return p.avail[(i + d) % 7]; });
  if (p.longDay != null) p.longDay = ((+p.longDay - d) % 7 + 7) % 7;
  p.weekStart = to; return p;
}

/* ---------------- dates (local, as YYYY-MM-DD strings) ---------------- */
function pad(n) { return (n < 10 ? '0' : '') + n; }
function ds(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function pd(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function addD(s, n) { var d = pd(s); d.setDate(d.getDate() + n); return ds(d); }
function dow(s) { return (pd(s).getDay() + 13 - WS) % 7; }
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
  if (lthr) return { REC: [0, Math.round(lthr * 0.8)], E: [Math.round(lthr * 0.75), Math.round(lthr * 0.85)], S: [Math.round(lthr * 0.87), Math.round(lthr * 0.92)], M: [Math.round(lthr * 0.89), Math.round(lthr * 0.93)], T: [Math.round(lthr * 0.95), Math.round(lthr * 1.0)], ST: [Math.round(lthr * 0.9), Math.round(lthr * 0.96)], I: [Math.round(lthr * 1.02), Math.round(lthr * 1.06)] };
  if (maxHr) return { REC: [0, Math.round(maxHr * 0.7)], E: [Math.round(maxHr * 0.65), Math.round(maxHr * 0.78)], S: [Math.round(maxHr * 0.8), Math.round(maxHr * 0.85)], M: [Math.round(maxHr * 0.82), Math.round(maxHr * 0.87)], T: [Math.round(maxHr * 0.87), Math.round(maxHr * 0.92)], ST: [Math.round(maxHr * 0.82), Math.round(maxHr * 0.88)], I: [Math.round(maxHr * 0.94), Math.round(maxHr * 0.98)] };
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
  full: { key: 'full', mi: 26.2188, label: 'Marathon', peak: 45, longCap: 20, taper: 3, recov: 3 },
  /* more distances: 'key' is the training family they follow */
  '1mi': { key: '5k', id: '1mi', mi: 1, label: '1 mile', peak: 22, longCap: 8, taper: 1, recov: 1 },
  '8k': { key: '10k', id: '8k', mi: 4.97097, label: '8K / 5 mile', peak: 28, longCap: 11, taper: 1, recov: 1 },
  '15k': { key: 'half', id: '15k', mi: 9.32057, label: '15K', peak: 32, longCap: 12, taper: 1, recov: 1 },
  '10mi': { key: 'half', id: '10mi', mi: 10, label: '10 mile', peak: 32, longCap: 13, taper: 1, recov: 1 },
  '25k': { key: 'full', id: '25k', mi: 15.5343, label: '25K', peak: 38, longCap: 16, taper: 2, recov: 2 },
  '30k': { key: 'full', id: '30k', mi: 18.6411, label: '30K', peak: 42, longCap: 18, taper: 2, recov: 2 },
  '50k': { key: 'full', id: '50k', mi: 31.0686, label: '50K', peak: 50, longCap: 22, taper: 3, recov: 3 }
};
function distOf(ev) {
  if (!ev) return DIST.half;
  if (DIST[ev.dist]) return DIST[ev.dist];
  var m = +ev.mi || 13.1;
  var base = m <= 4 ? DIST['5k'] : m <= 8 ? DIST['10k'] : m <= 16 ? DIST.half : DIST.full;
  /* a custom distance scales peak mileage and the long run between the standard races */
  var peak = m <= 16 ? base.peak : Math.round(clamp(35 + (m - 13.1) * 0.8, 35, 52));
  return { key: base.key, mi: m, label: (Math.round(m * 10) / 10) + ' mi', peak: peak, longCap: clamp(Math.round(m <= 13.2 ? m + 1 : m * 0.78), base.key === '5k' ? 8 : 10, 22), taper: m > 20 ? 3 : m > 12 ? 2 : 1, recov: m > 20 ? 3 : m > 12 ? 2 : 1 };
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
  z.ST = [z.T[1], z.T[1] + 20];   /* sub-threshold: just under threshold, about half-marathon to 30K effort */
  return z;
}
var ZONE_NAME = { REC: 'recovery', E: 'easy', S: 'steady', M: 'marathon pace', H: 'half marathon pace', T: 'threshold', ST: 'sub-threshold', I: 'interval', R: 'repetition', G: 'goal pace', F: 'by feel' };

/* ---------------- training styles ---------------- */
var METHODS = {
  balanced: {
    key: 'balanced', name: 'Balanced threshold', short: 'Balanced',
    inspired: 'Pyramidal training with paces from Jack Daniels\' VDOT tables',
    desc: 'Mostly easy running, one key workout a week that progresses from playful speed to lactate threshold to race pace, and a long run that grows steadily. Paces come from your fitness, not a guess.',
    suits: 'Most runners. Good when you also lift 2–3 days a week.',
    runs: [3, 5], quality: 1, peakMult: 1, longFrac: 1, longCapFull: 20, longCapHalf: 14, mlr: false, cross: 0, easyShare: 0.8
  },
  cumulative: {
    key: 'cumulative', name: 'Hansons-style cumulative fatigue', short: 'Hansons',
    inspired: 'Modeled on the Hansons Marathon Method (not affiliated)',
    desc: 'Six shorter runs a week with two key workouts (speed or strength repeats, and a goal-pace tempo). Long runs stop around 16 miles because you start them already a little tired.',
    suits: 'Runners who can run most days and want race-specific work every week.',
    runs: [5, 6], quality: 2, peakMult: 1.15, longFrac: 0.85, longCapFull: 16, longCapHalf: 12, mlr: false, cross: 0, easyShare: 0.75
  },
  endurance: {
    key: 'endurance', name: 'Pfitzinger-style endurance', short: 'Pfitzinger',
    inspired: 'Modeled on Pete Pfitzinger\'s Advanced Marathoning approach (not affiliated)',
    desc: 'Higher mileage built on general-aerobic runs, a midweek medium-long run, lactate-threshold tempos that lengthen through the block, VO2max intervals late in the build, and long runs up to 20–22 miles with marathon-pace segments. Demanding and very effective for the marathon.',
    suits: 'Experienced runners with time for 5–6 runs and 40+ miles a week.',
    runs: [5, 6], quality: 1, peakMult: 1.2, longFrac: 1.05, longCapFull: 21, longCapHalf: 15, mlr: true, cross: 0, easyShare: 0.8
  },
  daniels: {
    key: 'daniels', name: 'Daniels 2Q', short: 'Daniels',
    inspired: 'Modeled on Jack Daniels\' Running Formula 2Q approach (not affiliated)',
    desc: 'Two quality days a week, everything else easy, with all paces from your VDOT. Builds through four phases: foundation and strides, repetitions and hills, intervals and threshold, then threshold and race pace. Long runs stay under about 25% of the week or 2.5 hours.',
    suits: 'Runners who want structure and two real workouts a week, with 25+ miles a week.',
    runs: [4, 6], quality: 2, peakMult: 1.05, longFrac: 0.92, longCapFull: 20, longCapHalf: 14, mlr: false, cross: 0, easyShare: 0.8
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
  },
  runwalk: {
    key: 'runwalk', name: 'Run-walk', short: 'Run-walk',
    inspired: 'Run-walk-run plans in the style of Jeff Galloway',
    desc: 'Every run uses planned walk breaks, starting around 1 minute running and 1 minute walking and growing to 4 or 5 minutes of running per minute of walking. Three runs a week and a long run that builds patiently.',
    suits: 'Brand-new runners, returning from a long layoff or injury, or anyone who wants the gentlest way to cover the distance.',
    runs: [3, 3], quality: 0, peakMult: 0.7, longFrac: 1.1, longCapFull: 20, longCapHalf: 12, mlr: false, cross: 0, easyShare: 1
  },
  hybrid: {
    key: 'hybrid', name: 'Hybrid: strength + endurance', short: 'Hybrid',
    inspired: 'Concurrent-training plans used by hybrid athletes',
    desc: 'Lifting and running get equal billing: three or four runs (one key workout, one long run) and at least three heavy lifting sessions, with hard runs and leg days sequenced so they do not blunt each other.',
    suits: 'Lifters who want to run a strong race without giving up the barbell.',
    runs: [3, 4], quality: 1, peakMult: 0.85, longFrac: 1.05, longCapFull: 20, longCapHalf: 13, mlr: false, cross: 0, easyShare: 0.75, liftMin: 3
  },
  lydiard: {
    key: 'lydiard', name: 'Base first', short: 'Base first',
    inspired: 'Aerobic base, hills, then sharpening, in the style of Arthur Lydiard',
    desc: 'A long aerobic base of easy and steady running with strides, then a hill-strength phase, then a short sharpening phase of race-pace work. Speed comes last, on top of a big engine.',
    suits: 'Runners with months before the race who want durable fitness and few hard sessions early on.',
    runs: [4, 6], quality: 1, peakMult: 1.15, longFrac: 1.05, longCapFull: 22, longCapHalf: 15, mlr: true, cross: 0, easyShare: 0.85
  },
  norwegian: {
    key: 'norwegian', name: 'Norwegian singles', short: 'Norwegian',
    inspired: 'The sub-threshold "Norwegian singles" approach adapted for one run a day',
    desc: 'Two or three controlled sub-threshold interval sessions a week (such as 10 × 1K, 5 × 2K or 3 × 3K with 60-second rests), always a notch below threshold, with truly easy running between and one easy long run. No all-out workouts. Near a marathon, one session becomes marathon-pace work.',
    suits: 'Consistent runners at 25+ miles a week over 5–7 days who recover well from frequent moderate work. Not for beginners.',
    runs: [5, 7], quality: 3, peakMult: 1.15, longFrac: 0.9, longCapFull: 20, longCapHalf: 14, mlr: false, cross: 0, easyShare: 0.78, qBeforeLong: true
  },
  canova: {
    key: 'canova', name: 'Marathon specific', short: 'Specific',
    inspired: 'Race-specific extension training in the style of Renato Canova',
    desc: 'Builds from fast continuous runs at about 90% of marathon pace, then extends how long you can hold marathon pace: long marathon-pace intervals with steady "float" recoveries and long fast runs. High mileage, very race-specific.',
    suits: 'Advanced marathoners at 40+ miles a week chasing a time goal.',
    runs: [5, 7], quality: 2, peakMult: 1.3, longFrac: 1.05, longCapFull: 22, longCapHalf: 15, mlr: true, cross: 0, easyShare: 0.72
  }
};
/* Who each style is for. level: 1 beginner, 2 intermediate, 3 advanced. focus: 'run' or 'mixed' (running + lifting). */
var METHOD_META = {
  runwalk: { level: 1, focus: 'run', minMpw: 0, days: '3 runs', evidence: 'Walk breaks lower impact and perceived strain; a 2016 study of first-time marathoners found run-walkers finished in similar times with less muscle pain and fatigue.' },
  beginner: { level: 1, focus: 'run', minMpw: 5, days: '3–4 runs', evidence: 'Gradual mileage growth with mostly easy running is the common thread in novice plans, and large training-log studies link sudden mileage spikes to injury.' },
  lowfreq: { level: 1, focus: 'mixed', minMpw: 8, days: '3 runs + 2 gym days', evidence: 'The FIRST three-run programme produced marathon improvements in its own studies; best when the other days are real training, here lifting.' },
  hybrid: { level: 2, focus: 'mixed', minMpw: 10, days: '3–4 runs + 3–4 lifts', evidence: 'A 2022 review of 43 studies found concurrent training does not reduce strength or muscle gain; heavy lifting (near-maximal loads, 10+ weeks) improves running economy.' },
  balanced: { level: 2, focus: 'mixed', minMpw: 10, days: '3–5 runs + 2–3 lifts', evidence: 'Pyramidal training: mostly easy, some threshold, a little fast. A 2024 analysis of about 120,000 marathoners found faster runners follow this pattern and differ mainly by doing more easy miles.' },
  polarized: { level: 2, focus: 'run', minMpw: 15, days: '4–6 runs', evidence: 'Controlled trials of 80/20 intensity balance show better gains than threshold-heavy training for recreational runners who usually run easy days too hard.' },
  lydiard: { level: 2, focus: 'run', minMpw: 15, days: '4–6 runs', evidence: 'Volume of easy running is the strongest training predictor of marathon time in large datasets; this style front-loads it.' },
  cumulative: { level: 2, focus: 'run', minMpw: 20, days: '6 runs', evidence: 'Frequent running spreads load across the week; long runs are capped so no single run is more than about 30% of weekly volume.' },
  daniels: { level: 3, focus: 'run', minMpw: 25, days: '4–6 runs, 2 quality', evidence: 'VDOT pacing ties every workout to current fitness, so effort stays matched to the runner; the two-quality-day structure is one of the most widely used self-coached marathon schemes.' },
  endurance: { level: 3, focus: 'run', minMpw: 30, days: '5–6 runs', evidence: 'Higher mileage with threshold work and medium-long runs: the pattern most associated with faster marathon times in training-log research.' },
  norwegian: { level: 3, focus: 'run', minMpw: 25, days: '5–7 runs', evidence: 'Keeps about 20–25% of weekly running just under the second lactate threshold, where a lot of quality can be absorbed with little fatigue. Evidence is strong observationally (elite and amateur results) but controlled trials are still few.' },
  canova: { level: 3, focus: 'run', minMpw: 40, days: '5–7 runs', evidence: 'Race-pace specificity: the closer the session is to marathon pace and duration, the more directly it trains the demands of the race. Coaching-derived rather than trial-tested.' }
};
Object.keys(METHOD_META).forEach(function (k) { Object.assign(METHODS[k], METHOD_META[k]); });
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
  if (runs >= 4 && lvl === 'exp') add('daniels', 3, 'Two real workouts a week with every pace from your fitness: a favorite of experienced self-coached runners.');
  if (mpw >= 25) add('daniels', 1); else add('daniels', -3);
  if (lifts >= 3) add('daniels', -2);
  if (p.hrTrainer) add('polarized', 4, 'You like training by heart rate, which fits 80/20.');
  if (runs >= 4 && lvl !== 'new') add('polarized', 1, 'Two varied workouts with strictly easy days between them.');
  if (goal === 'fitness') { add('polarized', 1); add('lowfreq', 1); }
  /* newer styles */
  if (lvl === 'new' && mpw < 6) add('runwalk', 7, 'You are just starting, and walk breaks are the gentlest way to build.'); else if (lvl === 'new' || p.runWalk) add('runwalk', 2, 'Walk breaks keep the impact low while you build.'); else add('runwalk', -6);
  if (goal === 'finish' && mpw < 10) add('runwalk', 2);
  if (lifts >= 3 && runs <= 4) add('hybrid', 8, 'You lift ' + lifts + ' days a week and this style keeps lifting and running in balance.'); else if (lifts >= 3) add('hybrid', 3, 'You lift ' + lifts + ' days a week.'); else add('hybrid', -3);
  if (lvl === 'new') add('hybrid', -2);
  if (runs >= 5 && mpw >= 25 && lvl !== 'new') add('norwegian', lvl === 'exp' ? 5 : 3, 'You run ' + runs + ' days and ' + mpw + ' miles a week, enough to absorb frequent sub-threshold work.'); else add('norwegian', -5);
  if (p.injuryProne) add('norwegian', -2);
  if (lifts >= 3) { add('norwegian', -2); add('canova', -3); }
  if (hasFull && lvl === 'exp' && mpw >= 40 && runs >= 5 && goal === 'time') add('canova', 6, 'Your mileage and experience suit marathon-specific work.'); else add('canova', -6);
  if (runs >= 4 && mpw >= 15 && lvl !== 'new') add('lydiard', 2, 'A long aerobic base suits the time you have before your race.'); else add('lydiard', -2);
  var far = (events || []).filter(function (e) { return (e.priority || 'A') === 'A'; }).some(function (e) { return diffD(today(), e.date) > 150; });
  if (far && lvl !== 'new' && runs >= 4) add('lydiard', 2);
  /* never rank a style far above the runner's level or current mileage as the best match */
  var lv = lvl === 'new' ? 1 : lvl === 'exp' ? 3 : 2;
  Object.keys(sc).forEach(function (k) { var m = METHODS[k]; if (m.level > lv) sc[k] -= 4 * (m.level - lv); if (mpw < m.minMpw * 0.6) sc[k] -= 3; });
  return Object.keys(sc).map(function (k) { return { key: k, score: sc[k], why: why[k].slice(0, 2).join(' ') || METHODS[k].suits, level: METHODS[k].level, focus: METHODS[k].focus, stretch: METHODS[k].level > lv || mpw < METHODS[k].minMpw * 0.6 }; }).sort(function (a, b) { return b.score - a.score; });
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
  fartlek: function (n, on, off, effort) { return { key: 'fartlek', title: 'Fartlek', purpose: 'Playful speed that teaches you to change gears without the stress of a track session.', steps: function (q) { return [wu(warm(q)), rep(n, { min: on }, 'F', { min: off }, effort || 'brisk, effort 5–6 of 10'), cd(0)]; } }; },
  reps: function (n, m) { return { key: 'reps', title: 'Repetitions', purpose: 'Short, fast and fully recovered (R pace, about mile race effort): improves speed and running economy without much fatigue.', steps: function (q) { return [wu(warm(q)), rep(n, { m: m }, 'R', { m: m, walk: false }, 'R pace: fast, relaxed form; full jog recovery'), cd(0)]; } }; },
  hills: function (n, sec) { return { key: 'hills', title: 'Hill repeats', purpose: 'Strength and running power with less impact than flat speed. Great for shins when the hill is gentle.', steps: function (q) { return [wu(warm(q)), rep(n, { sec: sec }, 'F', { sec: 90, walk: false }, 'uphill, effort 7 of 10, jog back down'), cd(0)]; } }; },
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
  /* sub-threshold intervals sized to the day: work = about q minus warm-up and cool-down */
  subT: function (kind) {
    var K = { k1: [1000, 'Sub-threshold 1K repeats', 6, 12, 'toward the faster end of the range (about 10-mile to 15K race effort)'], k2: [2000, 'Sub-threshold 2K repeats', 3, 6, 'mid-range (about half-marathon effort)'], k3: [3000, 'Sub-threshold 3K repeats', 2, 4, 'toward the slower end of the range (about 30K effort)'] }[kind];
    return { key: 'subt', title: K[1], purpose: 'Controlled work just under your lactate threshold. It should feel "comfortably hard" (effort 5–6), never a strain: finish feeling you could do two more reps. If your breathing gets ragged, slow down.', steps: function (q) {
      var work = clamp(q - 2.2, 1.8, 7.5), n = clamp(Math.round(work / (K[0] / MI_M)), K[2], K[3]);
      return [wu(warm(q)), rep(n, { m: K[0] }, 'ST', { sec: 60 }, K[4]), cd(0)];
    } };
  },
  mpFloat: function (n, mi) { return { key: 'goal', title: 'Marathon-pace intervals', purpose: 'Long repeats at marathon pace with a steady (not easy) float between them, extending how long you can hold race pace.', steps: function (q) { return [wu(1.5), rep(n, { mi: mi }, 'M', { mi: 0.5 }, 'float at steady effort, not a jog'), cd(0)]; } }; },
  fastCont: function (mi) { return { key: 'steady', title: 'Fast continuous run', purpose: 'Continuous running at about 90% of marathon speed: the foundation that marathon pace is built on.', steps: function (q) { return [wu(1), run(mi, 'S', 'steady, about 90% of marathon speed'), cd(0)]; } }; },
  speedStrength: function (n, m) { return { key: 'intervals', title: 'Strength repeats', purpose: 'Longer repeats a little faster than goal pace, building speed endurance under fatigue.', steps: function (q) { return [wu(1.5), rep(n, { m: m }, 'T', { m: 400 }), cd(0)]; } }; }
};

/* Session sequences by phase. Cutback weeks use a lighter option. */
function qualityFor(ctx) {
  var ph = ctx.phase, i = ctx.qi, d = ctx.dist.key, meth = ctx.method, slot = ctx.slot || 0;
  if (ctx.check) return SESS.tt();   /* a fitness checkpoint on a lighter week */
  if (ctx.cut) {
    if (ph === 'spec' && d === 'half' && ctx.tuneup) return SESS.tuneup();
    if (ph === 'base') return SESS.strides(6);
    return SESS.fartlek(6, 2, 1, '10K effort');
  }
  if (meth.key === 'norwegian') {
    var kinds = ['k1', 'k2', 'k3'];
    if (ph === 'taper') return d === 'full' ? SESS.goal(1, 3, 0, 'M') : SESS.subT('k1');
    if (ph === 'race') return SESS.sharpener(d === 'full' ? 'M' : 'G');
    if (ph === 'recov') return i === 0 ? null : SESS.strides(6);
    /* near a marathon the third session becomes marathon pace */
    /* near the race the midweek session becomes race-pace work; the day before the long run always stays sub-threshold */
    if (ph === 'spec' && d === 'full' && slot === 1) return [SESS.goal(2, 2.5, 3, 'M'), SESS.goal(1, 5, 0, 'M'), SESS.mpFloat(3, 2), SESS.goal(1, 6, 0, 'M'), SESS.mpFloat(3, 3), SESS.goal(1, 8, 0, 'M')][Math.min(i, 5)];
    if (ph === 'spec' && d !== 'full' && slot === 1) return d === 'half' ? [SESS.goal(2, 2, 3), SESS.goal(3, 2, 2)][i % 2] : [SESS.intervals(5, 1000, 400), SESS.intervals(6, 800, 400)][i % 2];
    return SESS.subT(kinds[(i + slot) % 3]);
  }
  if (meth.key === 'canova' && !ctx.tt) {
    if (ph === 'base') return slot === 1 ? [SESS.hills(8, 45), SESS.fartlek(8, 1, 1), SESS.hills(10, 45)][i % 3] : [SESS.fastCont(4), SESS.fastCont(5), SESS.progression(20), SESS.fastCont(6), SESS.fastCont(7), SESS.fastCont(8)][Math.min(i, 5)];
    if (ph === 'thr') return slot === 1 ? [SESS.intervals(5, 1000, 400), SESS.intervalsMi(4, 2), SESS.intervals(6, 1000, 400)][i % 3] : [SESS.fastCont(8), SESS.tempoMi(4), SESS.fastCont(9), SESS.cruise(3, 2, 90), SESS.fastCont(10), SESS.tempoMi(5)][Math.min(i, 5)];
    if (ph === 'spec' && d === 'full') return slot === 1 ? [SESS.tempoMi(4), SESS.intervalsMi(4, 2), SESS.cruise(3, 2, 90)][i % 3] : [SESS.mpFloat(3, 2), SESS.mpFloat(4, 2), SESS.mpFloat(3, 3), SESS.mpFloat(4, 3), SESS.goal(1, 10, 0, 'M'), SESS.mpFloat(5, 3), SESS.goal(1, 12, 0, 'M'), SESS.mpFloat(4, 3)][Math.min(i, 7)];
  }
  /* Daniels 2Q: phase II repetitions and hills, phase III intervals + threshold, phase IV threshold + race pace */
  if (meth.key === 'daniels' && !ctx.tt) {
    if (ph === 'base') return slot === 1 ? [SESS.hills(8, 45), SESS.strides(8)][i % 2] : [SESS.strides(8), SESS.reps(8, 200), SESS.hills(8, 45), SESS.reps(10, 200), SESS.reps(6, 400), SESS.reps(8, 300)][Math.min(i, 5)];
    if (ph === 'thr') return slot === 1 ? [SESS.intervals(5, 1000, 400), SESS.intervals(6, 800, 400), SESS.intervalsMi(4, 3), SESS.intervals(5, 1200, 400)][i % 4] : [SESS.cruise(4, 1, 60), SESS.tempoMi(3), SESS.cruise(5, 1, 60), SESS.tempoMi(4), SESS.cruise(3, 2, 120), SESS.tempoMi(5)][Math.min(i, 5)];
    if (ph === 'spec') {
      if (d === 'full') return slot === 1 ? [SESS.cruise(4, 1.5, 60), SESS.tempoMi(5), SESS.cruise(3, 2, 120), SESS.tempoMi(6)][i % 4] : [SESS.goal(2, 3, 3, 'M'), SESS.mpPlusT(5), SESS.goal(1, 8, 0, 'M'), SESS.goal(2, 4, 3, 'M'), SESS.mpPlusT(7), SESS.goal(1, 10, 0, 'M')][Math.min(i, 5)];
      if (d === 'half') return slot === 1 ? [SESS.intervals(5, 1000, 400), SESS.intervalsMi(4, 3)][i % 2] : [SESS.cruise(4, 1.5, 60), SESS.goal(2, 3, 3), SESS.tempoMi(5), SESS.goal(3, 2, 2)][Math.min(i, 3)];
      return slot === 1 ? SESS.reps(8, 400) : [SESS.intervals(5, 1000, 400), SESS.cruise(4, 1, 60), SESS.intervals(6, 800, 400)][i % 3];
    }
  }
  /* Pfitzinger: lactate-threshold tempos that lengthen, VO2max late in the build */
  if (meth.key === 'endurance' && !ctx.tt) {
    if (ph === 'base') return slot === 1 ? SESS.strides(10) : [SESS.strides(10), SESS.tempoMi(4), SESS.strides(10), SESS.tempoMi(4), SESS.tempoMi(5)][Math.min(i, 4)];
    if (ph === 'thr') return slot === 1 ? [SESS.intervals(5, 1000, 400), SESS.intervals(6, 1000, 400)][i % 2] : [SESS.tempoMi(4), SESS.tempoMi(5), SESS.tempoMi(5), SESS.tempoMi(6), SESS.tempoMi(6), SESS.tempoMi(7)][Math.min(i, 5)];
    if (ph === 'spec') return slot === 1 ? SESS.tempoMi(5) : [SESS.intervals(5, 1200, 400), SESS.tempoMi(6), SESS.intervals(6, 1200, 400), SESS.tempoMi(7), SESS.intervals(5, 1000, 400)][Math.min(i, 4)];
  }
  if (meth.key === 'lydiard' && !ctx.tt) {
    if (ph === 'base') return [SESS.strides(6), SESS.steady(15), SESS.strides(8), SESS.steady(20), SESS.progression(20), SESS.steadyMi(4), SESS.strides(8), SESS.steady(25), SESS.progression(25), SESS.steadyMi(5)][i % 10];
    if (ph === 'thr' && i < 4) return [SESS.hills(6, 60), SESS.hills(8, 60), SESS.hills(10, 60), SESS.hills(12, 45)][i];
  }
  if (meth.key === 'beginner') {
    var bl = [SESS.fartlek(6, 1, 1), SESS.strides(6), SESS.fartlek(8, 1, 1), SESS.hills(6, 45), SESS.steady(15), SESS.fartlek(5, 2, 2, 'steady-hard, effort 5 of 10'), SESS.progression(15), SESS.steady(20)];
    if (ph === 'spec') bl = [SESS.goal(1, 2, 0), SESS.steady(20), SESS.goal(2, 1.5, 3), SESS.progression(20)];
    return bl[i % bl.length];
  }
  if (ph === 'base') {
    var b1 = [SESS.fartlek(6, 1, 1), SESS.fartlek(8, 1, 1), SESS.fartlek(5, 2, 2, 'steady-hard, effort 5 of 10'), SESS.hills(6, 45), SESS.steady(12), SESS.hills(8, 45), SESS.progression(15), SESS.fartlek(8, 1.5, 1.5, 'brisk, effort 5 of 10'), SESS.steadyMi(3), SESS.steady(20), SESS.hills(10, 45), SESS.progression(20)];
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
  if (ctx.method && ctx.method.key === 'canova' && d === 'full' && (ph === 'thr' || ph === 'spec') && mi >= 12) {
    var c = [
      easy('Easy long run. The fast long runs do the specific work; this one builds endurance.'),
      { title: 'Long fast run', steps: [run(3, 'E'), run(mi - 4, 'S', 'steady, about 90% of marathon speed'), run(1, 'E')], note: 'The signature run of this style: long and continuous at about 90% of marathon speed. Fuel as you will on race day.' },
      easy(),
      { title: 'Long run, marathon-pace blocks', steps: [run(3, 'E'), rep(ph === 'spec' ? 3 : 2, { mi: 3 }, 'M', { mi: 1 }, 'float at steady effort'), run(Math.max(1, mi - 3 - (ph === 'spec' ? 11 : 7)), 'E')], note: 'Marathon pace in blocks inside the long run. Practice race fueling and race shoes.' }
    ];
    return c[i % c.length];
  }
  if (ph === 'spec') {
    if (d === 'full') {
      var opts = [
        { title: 'Long run, marathon-pace finish', steps: [run(mi - 3, 'E'), run(3, 'M')], note: 'Finish at marathon pace on tired legs. Fuel every 30–40 minutes.' },
        { title: 'Long run, steady second half', steps: [run(Math.ceil(mi * 0.6), 'E'), run(Math.floor(mi * 0.4), 'S')], note: 'Settle in easy, then hold steady effort. Practice your race fueling.' },
        easy('Your biggest runs. Keep it truly easy and practice fueling: 30–60 g of carbs per hour.'),
        { title: 'Dress rehearsal', steps: [run(mi - 8, 'E'), run(8, 'M')], note: 'Race shoes, race kit, race breakfast and race fueling. The most important long run of the block.' }
      ];
      /* bigger runners get the sub-elite staples: a progression long run and alternating marathon-pace miles */
      if (mi >= 16 && ctx.method && ctx.method.key !== 'beginner' && ctx.method.key !== 'runwalk') opts.splice(2, 0,
        { title: 'Progression long run', steps: [run(Math.round(mi * 0.5), 'E'), run(Math.round(mi * 0.3), 'S'), run(mi - Math.round(mi * 0.5) - Math.round(mi * 0.3), 'M')], note: 'Easy, then steady, then marathon pace for the last part. Teaches you to run fast on tired legs. Fuel every 30–40 minutes.' },
        { title: 'Long run, alternating miles', steps: [run(3, 'E'), rep(Math.max(3, Math.floor((mi - 5) / 2)), { mi: 1 }, 'M', { mi: 1 }, 'steady, not easy'), run(Math.max(1, mi - 3 - 2 * Math.max(3, Math.floor((mi - 5) / 2))), 'E')], note: 'Marathon pace, then a steady mile, repeated. The steady miles are the point: no jogging. Take a gel every 30 minutes.' });
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
  var qPref = (o.qBeforeLong && o.quality >= 3 ? [2, 4, 6, 3, 5] : [2, 3, 4, 5, 1]).map(function (x) { return wrap(L + x); });
  for (var qi = 0; qi < o.quality && runDays.length < runs; qi++) {
    var best = null;
    qPref.forEach(function (d) {
      if (best !== null || !free(d)) return;
      if ((d === wrap(L - 1) && !o.qBeforeLong) || d === wrap(L + 1)) return;
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
    if (d === L && o.lifts < 4) return false;   /* not on the long-run day unless there is no other room */
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
  [wrap(L + 1), wrap(L - 4), wrap(L - 2)].concat(lPref).forEach(function (d) { if (liftDays.length < o.lifts && liftDays.indexOf(d) < 0 && d !== wrap(L - 1)) liftDays.push(d); });
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

/* Your own plan settings (profile.ctl) on top of the style: peak weekly miles, quality days, longest long run,
   and the intensity mix (pyramidal = the style as written, polarized = more interval/hill work and no tempo,
   threshold = tempo and cruise intervals in place of fast intervals). */
function applyCtl(m, c) {
  if (!c) return m;
  var o = Object.assign({}, m, { ctl: c });
  if (c.quality != null && c.quality !== '') o.quality = clamp(+c.quality, 0, 3);
  if (+c.longCap) { o.longCapFull = clamp(+c.longCap, 6, 24); o.longCapHalf = Math.min(clamp(+c.longCap, 6, 24), 16); }
  return o;
}
var MIX_SWAP = {
  polarized: { tempo: function () { return SESS.intervals(5, 1000, 400); }, cruise: function () { return SESS.intervals(6, 800, 400); }, steady: function () { return SESS.hills(8, 60); }, subt: function () { return SESS.intervals(5, 1000, 400); } },
  threshold: { intervals: function () { return SESS.cruise(4, 1, 60); }, hills: function () { return SESS.tempoMi(3); }, reps: function () { return SESS.cruise(5, 1, 60); }, fartlek: function () { return SESS.steady(20); } }
};
function generate(state) {
  var prof = Object.assign(defaultProfile(), state.profile || {});
  setWeekStart(prof.weekStart || 0);
  var method = applyCtl(METHODS[prof.method] || METHODS.balanced, prof.ctl);
  var start = monday(prof.startDate || today());
  /* a start a few days before the week begins (Fri, Sat or Sun) makes the first week longer instead of
     dragging the plan back to an earlier Monday: those lead-in days join week 1 (an 8-, 9- or 10-day week) */
  var lead = [];
  if (prof.startDate && dow(prof.startDate) >= 4) { start = addD(monday(prof.startDate), 7); for (var ld = prof.startDate; ld < start; ld = addD(ld, 1)) lead.push(ld); }
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
  /* comeback: a race from before the break overstates today's fitness. Detraining costs roughly 3% after a few weeks off, up to 15% after a long layoff. */
  var cb = prof.comeback && +prof.comeback.off ? prof.comeback : null;
  if (cb && v0 && prof.recent && prof.recent.time) v0 = v0 * (1 - (cb.off <= 4 ? 0.03 : cb.off <= 8 ? 0.06 : cb.off <= 16 ? 0.1 : 0.15));
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
    if (method.ctl && +method.ctl.peak) peakTarget = clamp(Math.round(+method.ctl.peak), Math.max(8, +prof.mpw || 8), 120);
    var longCap = Math.min(dist.longCap, dist.key === 'full' ? method.longCapFull : dist.key === 'half' ? method.longCapHalf : dist.longCap);
    if (method.ctl && +method.ctl.longCap) longCap = Math.min(clamp(+method.ctl.longCap, 6, 24), dist.key === 'full' ? 24 : dist.key === 'half' ? 16 : 14);
    var gvB = ev ? goalVdot(ev) : null;
    var vStart = plannedV.length ? plannedV[plannedV.length - 1] : v0;
    var growth = Math.min(0.11 * L, Math.max(gvB ? gvB - vStart : 0, 0.045 * L));

    var m = firstBlock ? Math.max(6, +prof.mpw || 10) : Math.max(8, Math.round((prevPeak || 20) * 0.35));
    /* comeback: start from a share of what you ran before the break (more time off, a smaller share), never below what you run now */
    if (firstBlock && cb && cb.before) m = Math.max(6, +prof.mpw || 0, Math.round(cb.before * (cb.off <= 4 ? 0.7 : cb.off <= 8 ? 0.5 : cb.off <= 16 ? 0.35 : cb.off <= 52 ? 0.25 : 0.2)));
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
        var rf = prevDist && prevDist.mi > 20 ? [0.3, 0.45, 0.6] : prevDist && prevDist.mi > 9 ? [0.5, 0.7] : [0.75];
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
  var cbInfo = cb ? applyComeback(weeks, prof, cb) : null;
  /* "Suggest run-walk on long runs": long runs get real walk breaks on the watch, 9 min running and 1 min walking */
  if (prof.runWalk && method.key !== 'runwalk') weeks.forEach(function (w) {
    if (w.comeback) return;
    w.days.forEach(function (d) { d.parts = d.parts.map(function (p) {
      if (p.type !== 'long' || p.timed || !p.steps || p.steps.length !== 1 || p.steps[0].k !== 'run') return p;
      var ep = w.zones && w.zones.E ? (w.zones.E[0] + w.zones.E[1]) / 2 : 600, min = Math.round(p.mi * ep / 60), reps = Math.max(2, Math.round(min / 10));
      return Object.assign({}, p, { timed: true, min: reps * 10, title: 'Long run, run-walk', steps: [{ k: 'rep', n: reps, work: { min: 9 }, z: 'E', rec: { min: 1, walk: true }, effort: 'easy, then a 1-minute walk' }], note: 'Run 9 minutes, walk 1, ' + reps + ' times. Walk breaks lower the impact without costing fitness.' });
    }); });
  });
  return { comeback: cbInfo, start: lead[0] || start, weekStart: start, lead: lead, weeks: weeks, events: events, aEvents: aEvents, method: method, profile: prof, v0: v0 };
}

/* Comeback weeks: runs by time, not distance; walk breaks after a long layoff (or if you asked for them);
   no hard sessions in the first two weeks; a 5K check in the week after the timed block. */
function applyComeback(weeks, prof, cb) {
  var from = monday(cb.from || today()), timedN = cb.off >= 9 ? 4 : 3, walk = cb.off >= 9 || prof.runWalk || prof.level === 'new';
  var ratios = [[3, 1], [4, 1], [6, 1], [9, 1]], first = null, n = 0;
  weeks.forEach(function (w) {
    if (w.end < from) return;
    var k = Math.floor(diffD(from, w.start) / 7); if (k < 0) k = 0;
    if (first == null) first = w.n;
    if (k >= timedN) { if (k === timedN && !w.cut) w.days.some(function (d) { var i = d.parts.findIndex(function (p) { return p.type === 'speed'; }); if (i < 0) return false; var t = SESS.tt(); d.parts[i] = { type: 'speed', role: 'speed', key: 'tt', tt: true, title: '5K fitness check', mi: d.parts[i].mi, steps: t.steps(d.parts[i].mi), purpose: 'Your first fitness check since coming back. The result resets your paces from here.' }; return true; }); return; }
    n++;
    var zz = w.zones, ep = zz && zz.E ? (zz.E[0] + zz.E[1]) / 2 : 600, ratio = ratios[Math.min(k, ratios.length - 1)];
    w.comeback = { week: k + 1, of: timedN, walk: walk };
    w.days.forEach(function (d) {
      d.parts = d.parts.map(function (p) {
        /* the first two comeback weeks lift with body weight: the same patterns, none of the barbell load */
        if (p.type === 'strength' && k < 2 && /^[ABC]$/.test(p.key || '')) return Object.assign(liftPart('HT', 0, w, 'Comeback week ' + (k + 1) + ': body-weight strength, so muscles and tendons catch up before the barbell comes back.'), { role: p.role, moved: p.moved, title: 'Body-weight strength' });
        if (!isRun(p) || p.type === 'race') return p;
        var easyMin = Math.max(15, Math.round((p.mi || 2) * ep / 60 / 5) * 5);
        if (p.type === 'speed' && k < 2) p = Object.assign({}, p, { type: 'easy', role: 'easy', key: null, title: 'Easy run' });
        if (p.type === 'speed') return p;   /* week 3+: light quality is back (strides, fartlek), still by feel */
        var min = p.type === 'long' ? Math.min(easyMin, 30 + 10 * k) : Math.min(easyMin, 20 + 5 * k);
        var q = Object.assign({}, p, { min: min, mi: round1(min * 60 / ep), timed: true });
        if (walk) {
          var set = ratio[0] + ratio[1], reps = Math.max(2, Math.round(min / set));
          q.title = 'Run-walk ' + reps * set + ' min';
          q.steps = [{ k: 'rep', n: reps, work: { min: ratio[0] }, z: 'E', rec: { min: ratio[1], walk: true }, effort: 'easy running, then a brisk walk' }];
          q.note = 'Comeback week ' + (k + 1) + ' of ' + timedN + ': run ' + ratio[0] + ' min, walk ' + ratio[1] + ' min, ' + reps + ' times. Time, not distance or pace, is the goal.';
        } else {
          q.title = (p.type === 'long' ? 'Long run ' : 'Easy run ') + min + ' min';
          q.steps = [{ k: 'run', min: min, z: 'E' }];
          q.note = 'Comeback week ' + (k + 1) + ' of ' + timedN + ': run by time at an easy, chatty effort. Walk breaks are fine.';
        }
        return q;
      });
    });
    w.tot = totals(w.days);
  });
  return { from: from, weeks: timedN, walk: walk, firstWeek: first };
}

function longMilesFor(w, prev) {
  var m = w.target, ph = w.phase.key, d = w.dist.key, meth = w.method;
  var f = m < 15 ? 0.45 : m < 25 ? 0.4 : 0.38;
  if (ph === 'spec') f = d === 'full' ? 0.45 : 0.4;
  f *= meth.longFrac;
  if (meth.key === 'cumulative') f = Math.min(f, 0.32);
  if (meth.key === 'norwegian') f = Math.min(f, m >= 40 ? 0.3 : 0.33);
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
  var lifts = clamp(Math.max(+prof.liftDays || 0, method.liftMin || 0), 0, 4);
  if (w.phase.key === 'race') lifts = Math.min(lifts, 1);
  else if (w.phase.key === 'taper' || w.phase.key === 'recov') lifts = Math.min(lifts, 2);
  if (!prof.doubles) runs = Math.min(runs, Math.max(3, 7 - lifts - 1));
  var cross = clamp((+prof.crossDays || 0) + (method.cross || 0), 0, 3);   /* gym days: a lift plus a short treadmill run */
  if (w.phase.key === 'race') cross = 0;
  lifts = Math.min(lifts, 4 - cross);
  var quality = method.quality;
  if (w.cut || w.phase.key === 'recov' || w.phase.key === 'taper' || w.phase.key === 'race') quality = Math.min(quality, 1);
  if (runs <= 3 && method.key !== 'lowfreq') quality = Math.min(quality, 1);
  if (w.phase.key === 'base' && ['lowfreq', 'polarized', 'norwegian', 'canova'].indexOf(method.key) < 0) quality = Math.min(quality, 1);
  if (method.key === 'norwegian' && !(w.cut || w.phase.key === 'recov' || w.phase.key === 'taper' || w.phase.key === 'race')) {
    /* ease in: one session for the first two weeks, three only with enough days and miles */
    quality = runs >= 6 && m >= 30 ? 3 : runs >= 4 ? 2 : 1;
    if (w.firstBlock && w.blockWeek < 2) quality = 1; else if (w.firstBlock && w.blockWeek < 5) quality = Math.min(quality, 2);
  }

  var lay = layoutWeek({ runs: runs, quality: quality, lifts: lifts, cross: cross, avail: prof.avail || [1, 1, 1, 1, 1, 1, 1].map(Boolean), longDay: prof.longDay != null ? +prof.longDay : 6, doubles: prof.doubles !== false, mlr: method.mlr && m >= 30, qBeforeLong: !!method.qBeforeLong });
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
    days[raceIdx].parts.push({ type: 'race', role: 'race', kind: ev.kind || 'race', title: ev.name || (ev.kind === 'distance' ? 'Goal run: ' + w.dist.label : ev.kind === 'pace' ? w.dist.label + ' time trial' : w.dist.label), mi: w.dist.mi, goal: ev.goal, steps: [S('run', { mi: w.dist.mi, z: ev.kind === 'distance' ? 'E' : 'G', label: ev.kind === 'distance' ? 'Your goal distance' : ev.kind === 'pace' ? 'Time trial' : 'Race' })], note: ev.kind === 'distance' ? 'Goal day: cover ' + w.dist.label + '. Start easy, fuel after 45 minutes, and enjoy it. Pace does not matter today.' : raceNote(ev, w.dist) });
    var sd = raceIdx - 4 >= 0 ? raceIdx - 4 : null;
    if (sd != null) days[sd].parts.push(mkQuality(w, qualityFor({ phase: 'race', qi: 0, dist: w.dist, method: method }), 4, zz));
    var cand = [raceIdx - 5, raceIdx - 3, raceIdx - 2, raceIdx - 6].filter(function (d) { return d >= 0 && d !== sd; });
    var ez = cand.slice(0, runs >= 4 && raceIdx >= 5 ? 2 : 1);
    var each = clamp(Math.round((m - (sd != null ? 4 : 0) - 2) / Math.max(1, ez.length)), 3, w.dist.key === 'full' ? 6 : 5);
    ez.forEach(function (d) { days[d].parts.push(easyPart('Easy run', each, 'easy', zz)); });
    if (raceIdx - 1 >= 0) days[raceIdx - 1].parts.push(easyPart('Shakeout', 2, 'easy', zz, '15–20 minutes very easy with 4 relaxed strides. Lay out your gear tonight.'));
    if (raceIdx + 1 < 7 && !days[raceIdx + 1].parts.length) days[raceIdx + 1].parts.push(restPart('Recovery day', 'Walk, stretch, eat well. No running today.'));
    if (lifts && raceIdx >= 5) days[0].parts.push(liftPart('A', 3, w, 'Light session early in race week. Half the sets, easy loads, no jumps.'));
  } else {
    /* normal week */
    var qParts = [];
    var nQ = lay.qDays.length;
    var qMiles = clamp(Math.round(m * (method.key === 'lowfreq' ? 0.28 : method.key === 'norwegian' ? (nQ >= 3 ? 0.13 : 0.16) : method.key === 'canova' && nQ > 1 ? 0.2 : nQ > 1 ? 0.16 : 0.2)), method.key === 'norwegian' ? 4 : 3, method.key === 'canova' ? 14 : method.key === 'norwegian' ? 8 : 10);
    lay.qDays.forEach(function (d, qn) {
      var ttWeek = w.phase.key === 'thr' && w.qi === 0 && !w.cut && w.firstBlock && qn === 0 && !(prof.recent && prof.recent.time) && !(idx > 0 && weeks[idx - 1].cut && !prof.runWalk);
      var tuneup = w.phase.key === 'spec' && w.cut;
      /* fitness checkpoint: every lighter (cutback) week in base and threshold blocks gets a 5K time trial, unless a race is near */
      var check = w.cut && qn === 0 && /^(base|thr|maint)$/.test(w.phase.key) && !prof.runWalk && !(others || []).some(function (e) { return e.date >= addD(w.start, -14) && e.date <= addD(w.end, 7); });
      var sess = qualityFor({ phase: w.phase.key === 'maint' ? 'base' : w.phase.key, qi: w.qi, dist: w.dist, method: method, cut: w.cut, firstBlock: w.firstBlock && w.phase.key !== 'maint', slot: qn, tt: ttWeek, tuneup: tuneup, check: check });
      var mixK = method.ctl && method.ctl.mix, swap = mixK && MIX_SWAP[mixK];
      if (swap && sess && swap[sess.key] && w.phase.key !== 'race' && w.phase.key !== 'taper' && !(w.phase.key === 'spec' && /goal/.test(sess.key))) sess = swap[sess.key]();
      if (!sess) { lay.roles[d] = lay.roles[d].map(function (r) { return /^quality/.test(r) ? 'easy' : r; }); return; }
      var p = mkQuality(w, sess, qMiles, zz);
      days[d].parts.push(p); qParts.push(p); used += p.mi;
    });
    /* long run (or a B race on the weekend) */
    var lr = longFor({ phase: w.phase.key === 'maint' ? 'base' : w.phase.key, dist: w.dist, li: w.li, cut: w.cut, method: method }, longMi);
    var longPart = { type: 'long', role: 'long', title: lr.title, mi: longMi, steps: lr.steps, note: lr.note };
    if (method.key === 'beginner' && prof.runWalk) longPart.note += ' Run-walk is welcome: for example 4 min running, 1 min walking.';
    if (method.key === 'norwegian') longPart.note = 'Keep this truly easy. The sub-threshold days do the work; the long run just adds time on your feet.' + (longMi >= 10 ? ' Fuel after 75 minutes.' : '');
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
      /* sharpen, don't tire: no hard running in the two days before, no heavy legs the day before, an easy shakeout after */
      [d - 1, d - 2].forEach(function (k) {
        if (k < 0) return;
        days[k].parts = days[k].parts.map(function (p) {
          if (p.type === 'speed') return easyPart('Easy run', Math.max(2, Math.round((p.mi || 4) * 0.6)), 'easy', zz, 'Easy, because of your ' + (e.name || dd.label) + ' on ' + DOW_LONG[d] + '.');
          if (p.type === 'long' && k === d - 1) return easyPart('Easy run', Math.max(2, Math.round((p.mi || 6) * 0.5)), 'easy', zz, 'Shortened: race on ' + DOW_LONG[d] + '.');
          return p;
        }).filter(function (p) { return !(k === d - 1 && p.type === 'strength' && p.key !== 'UB'); });
        if (!days[k].parts.length) days[k].parts.push(restPart());
      });
      if (d + 1 < 7) days[d + 1].parts = days[d + 1].parts.map(function (p) { return p.type === 'easy' ? Object.assign(easyPart('Recovery run', Math.max(2, Math.round((p.mi || 3) * 0.7)), 'recovery', zz, 'Shake out the race legs. Truly easy.'), { role: p.role }) : p; });
    });
    /* lifts */
    var mods = liftRotation(lifts + gymDays.length, runs);
    /* lifting two days in a row: the first of the pair is upper body so legs are never hit back to back */
    var liftIdx = []; lay.roles.forEach(function (r, d) { if (r.indexOf('lift') >= 0 || r.indexOf('cross') >= 0) liftIdx.push(d); });
    if (liftIdx.some(function (d, j) { return liftIdx[j + 1] === d + 1; })) {
      var pool = mods.filter(function (k) { return k !== 'UB'; }), pi = 0, usedUB = false, byDay = {};
      if (!pool.length) pool = ['A'];
      liftIdx.forEach(function (d, j) { if (liftIdx[j + 1] === d + 1 && !usedUB) { byDay[d] = 'UB'; usedUB = true; } else byDay[d] = pool[pi++ % pool.length]; });
      var liftOnly = [], gymOnly = [];
      lay.roles.forEach(function (r, d) { if (r.indexOf('lift') >= 0) liftOnly.push(byDay[d]); });
      gymDays.forEach(function (d) { gymOnly.push(byDay[d]); });
      mods = liftOnly.concat(gymOnly);
    }
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
  if (method.key === 'runwalk') {
    var wkAll = w.n, ratio = wkAll <= 2 ? [1, 1] : wkAll <= 4 ? [2, 1] : wkAll <= 8 ? [3, 1] : wkAll <= 14 ? [4, 1] : [5, 1];
    days.forEach(function (d) { d.parts.forEach(function (p) { if (isRun(p) && p.type !== 'race') { p.runwalk = ratio; p.note = 'Run ' + ratio[0] + ' min, walk ' + ratio[1] + ' min, from the first minute. ' + (p.type === 'long' ? 'On long runs, start the walk breaks before you feel you need them.' : 'Walk briskly, then ease back into the run.'); } if (p.type === 'race') p.note = (p.note || '') + ' Keep your run-walk rhythm from the start: ' + ratio[0] + ':' + ratio[1] + ' works well on race day too.'; }); });
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
  var v = LIFT_VARS[key] ? liftVar(w && w.n) : 0, mod = liftMod(key, v);
  var min = mod.blocks.reduce(function (a, b) { return a + b.min; }, 0);
  return { type: 'strength', role: 'lift', key: key, v: v, lp: lp, title: (key === 'UB' || key === 'HT' || key === 'ACT') ? mod.name : 'Strength ' + key + ': ' + mod.name, min: min, note: note || mod.focus };
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
  if (mod.phase === 'compliance') return p;
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
  var comp = compliance(plan, st);
  plan.compliance = comp;
  var arr = st.arr || {};
  /* You stay in charge: in advisory mode (prefs.advisory) the app's own automatic adjustments become suggestions until
     you apply them for that week (st.advOk[weekStart]); locked days and weeks (st.locks 'd:date' / 'w:weekStart') never
     change automatically. Your own changes (moves, swaps, added workouts, accepted shifts) always apply. */
  var adv = !!(st.prefs || {}).advisory, advOk = st.advOk || {}, locks = st.locks || {};
  var daySum = function (d) { return d.parts.filter(function (p) { return p.type !== 'rest'; }).map(function (p) { return p.title + (isRun(p) && p.mi ? ' · ' + half(p.mi) + ' mi' : ''); }).join(' + ') || 'Rest'; };
  /* what you would actually do that day; notes alone don't count as a change */
  var sig = function (d) { return JSON.stringify(d.parts.map(function (p) { return [p.type, p.title, p.mi || 0, p.min || 0, !!p.treadmill, p.key || '', p.steps || null]; })); };
  var guarded = function (w, label, fn) {
    if (!adv && !Object.keys(locks).length) return fn();
    var before = JSON.stringify(w.days); fn();
    if (JSON.stringify(w.days) === before) return;
    var b = JSON.parse(before), weekOk = !adv || advOk[w.start];
    w.days.forEach(function (d, i) {
      if (sig(d) === sig(b[i])) return;
      var locked = locks['d:' + d.date] || locks['w:' + w.start];
      if (locked || !weekOk) {
        if (!locked && d.date >= today()) (w.advice = w.advice || []).push({ date: d.date, label: label, before: daySum(b[i]), after: daySum(d) });
        w.days[i] = b[i];
      }
    });
  };
  plan.weeks.forEach(function (w) {
    w.advice = [];
    w.locked = !!locks['w:' + w.start];
    var mod = mult[w.start] || null;
    if (comp && comp.cap && w.start === comp.cap.week && (!mod || mod.m > comp.cap.m)) mod = { m: comp.cap.m, phase: 'compliance', capMi: comp.cap.mi, longCap: comp.cap.long };
    w.mod = mod;
    var zz = zonesFor(plan, w, analysis);
    w.zonesAdj = zz;
    w.base = w.tot.mi;
    var applyMod = function () { w.days.forEach(function (d) {
      d.parts = d.parts.map(function (p) {
        if (!mod || mod.m >= 1) return p;
        if (p.type === 'strength') return modLift(p, mod);
        if (p.type === 'cross' || p.type === 'rest' || p.timed) return p;   /* comeback runs are already short and timed */
        return modRun(p, mod, zz);
      });
    }); };
    if (mod && mod.phase === 'compliance') guarded(w, 'Matched to what you have been running', applyMod); else applyMod();
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
    /* work shifts: key sessions move to days off, the day after a night is easy */
    var shAll = st.shiftsAll || st.shifts;
    if (shAll) applyShifts(w, shAll, zz, { weekendDayOff: (st.prefs || {}).weekendDayOff !== false });
    /* drag-and-drop arrangement: {origDate|role|kind: newDate} */
    var moved = [];
    w.days.forEach(function (d) {
      d.parts.forEach(function (p) {
        if (p.type === 'rest') return;
        var k0 = partKey(p.moved || d.date, p), to = arr[k0];
        if (to === 'x') moved.push({ p: p, from: d, to: null, key: k0 });
        else if (to && to !== d.date && to >= w.start && to <= w.end) moved.push({ p: p, from: d, to: to });
      });
    });
    w.removed = [];
    moved.forEach(function (m) {
      m.from.parts = m.from.parts.filter(function (x) { return x !== m.p; });
      if (!m.from.parts.length) m.from.parts.push(restPart());
      if (!m.to) { w.removed.push({ p: m.p, from: m.from.date, key: m.key }); return; }
      var b = w.days[dow(m.to)];
      b.parts = b.parts.filter(function (x) { return x.type !== 'rest'; });
      var q = Object.assign({}, m.p, { moved: m.p.moved || m.from.date, akey: partKey(m.p.moved || m.from.date, m.p) });
      if (isRun(q)) b.parts.unshift(q); else b.parts.push(q);
    });
    var mix = st.liftmix || {};
    w.days.forEach(function (d) { d.parts = d.parts.map(function (p) { if (p.type !== 'strength') return p; var k = mix[p.akey || partKey(p.moved || d.date, p)]; if (!k || !LIFT[k] || k === p.key) return p; return Object.assign({}, p, { mix: k, title: 'Combined: ' + LIFT[p.key].name.replace(/ Day$| & Core$/, '') + ' + ' + LIFT[k].name.replace(/ Day$| & Core$/, ''), changed: true, note: 'Combined session: covers the main lifts from the session you removed this week.' }); }); });
    /* long run never longer than the cap from the consistency check */
    if (mod && mod.phase === 'compliance' && mod.longCap) guarded(w, 'Long run capped to match recent running', function () { w.days.forEach(function (d) { d.parts = d.parts.map(function (p) { if (p.type === 'long' && p.mi > mod.longCap) { var q = scaleRun(p, mod.longCap / p.mi, zz); q.changed = true; q.from = p.title; q.note = 'Capped to ' + mod.longCap + ' mi: build back to longer runs gradually.'; return q; } return p; }); }); });
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
        if (o.action === 'add' && o.mi) { var a2 = scaleRun(p, ((p.mi || 0) + o.mi) / (p.mi || 1), zz); a2.mi = half((p.mi || 0) + o.mi); if (p.type !== 'speed') a2.steps = [run(a2.mi, p.type === 'recovery' ? 'REC' : 'E')]; a2.changed = true; a2.from = p.title; a2.note = 'Longer by ' + o.mi + ' mi: ' + (o.reason || 'picking up miles from a run you dropped.'); return a2; }
        if (o.action === 'long' && o.mi) return { type: 'long', role: 'long', title: o.title || 'Medium-long run', mi: o.mi, steps: [run(o.mi, 'E')], note: o.reason || 'Easy, conversational: this stands in for the long run this week.', changed: true, from: p.title };
        if (o.action === 'strides' && p.type !== 'speed') { var sm = Math.max(2, p.mi || 3); return { type: 'easy', role: p.role, title: 'Easy + strides', mi: sm, steps: [run(Math.max(1, sm - 0.4), 'E'), rep(6, { sec: 20 }, 'R', { sec: 40, walk: true }, 'fast but relaxed')], note: o.reason || 'Strides keep your legs quick without real fatigue.', changed: true, from: p.title }; }
        if (o.action === 'tread') return Object.assign({}, p, { treadmill: true, changed: true, from: p.title, note: 'Treadmill today: ' + (o.reason || 'icy or very cold outside') + '. Set a 1% incline so the effort matches the road; paces stay the same.' });
        if (o.action === 'cross') return { type: 'cross', role: p.role, title: 'Treadmill walk', min: clamp(Math.round((p.mi || 3) * 10), 20, 45), note: 'Brisk walk on a 4–8% incline instead of running: ' + (o.reason || 'low impact today.'), changed: true, from: p.title };
        return p;
      });
    });
    /* a workout added to a rest day (readiness offer) */
    w.days.forEach(function (d) {
      var o = ov[d.date];
      if (!o || o.action !== 'addday' || !o.add) return;
      if (d.parts.some(function (p) { return p.type !== 'rest'; }) && !o.force) return;
      var add = [];
      if (o.add.run) add.push(easyPart(o.add.runTitle || 'Easy run', o.add.run, 'easy', zz, 'Added because you are rested and ready. ' + (o.add.why || 'Keep it conversational.')));
      if (o.add.lift && LIFT[o.add.lift]) add.push(liftPart(o.add.lift, o.add.lp != null ? o.add.lp : liftPhaseFor(w.phase.key, w.phIdx), w, 'Added because you are rested and ready.'));
      add.forEach(function (p) { p.added = true; });
      d.parts = add.length ? add : d.parts;
    });
    /* workouts you added yourself (st.extras: {date: [session]}), e.g. one your shifts had pushed out */
    var ex = st.extras || {};
    w.days.forEach(function (d) {
      var list = ex[d.date]; if (!list || !list.length) return;
      var add = list.map(function (q, i) { var p = JSON.parse(JSON.stringify(q)); if (isRun(p) && !(p.steps && p.steps.length)) p = Object.assign(easyPart(p.title || 'Easy run', p.mi || 3, p.type === 'recovery' ? 'recovery' : 'easy', zz, ''), { role: p.role || 'easy' }); p.added = true; p.userAdded = true; p.xi = i; p.changed = true; p.note = 'Added by you. ' + (p.note || ''); delete p.moved; delete p.shin; delete p.dark; delete p.daylight; return p; });
      d.parts = d.parts.filter(function (p) { return p.type !== 'rest'; }).concat(add);
    });
    /* training balance from Garmin load focus: small, safe nudges to future sessions this week and next */
    var lf = analysis && analysis.loadFocus;
    if (lf && lf.nudge && !(mod && mod.m < 1)) guarded(w, 'Garmin training balance', function () { applyLoadFocus(w, lf, zz); });
    /* daylight: no running in the dark if you'd rather not */
    guarded(w, 'Daylight', function () { applyDaylight(w, st, zz); });
    /* your own choice per run: indoors (treadmill) or outdoors */
    var ven = st.venue || {};
    if (Object.keys(ven).length) w.days.forEach(function (d) { d.parts = d.parts.map(function (p) {
      if (!isRun(p) || p.type === 'race') return p;
      var v = ven[p.akey || partKey(p.moved || d.date, p)]; if (!v) return p;
      if (v === 'in') return Object.assign({}, p, { treadmill: true, venue: 'in', dark: false, note: 'Indoors on the treadmill, by your choice. Set a 1% incline so the effort matches the road.' });
      var sun = (st.prefs || {}).loc ? sunTimes(d.date, st.prefs.loc.lat, st.prefs.loc.lon) : null;
      return Object.assign({}, p, { treadmill: false, venue: 'out', dark: false, title: p.title.replace(/^Treadmill /, '').replace(/^run$/, 'Easy run'), note: 'Outdoors, by your choice.' + (sun ? ' Daylight ' + clockMin(sun.rise) + '–' + clockMin(sun.set) + '.' : '') });
    }); });
    /* personal shin-load ceiling: trims easy and long runs in this week and next when the plan asks for more */
    var sh = analysis && analysis.shin;
    if (sh && st.profile && st.profile.injuryProne && (st.prefs || {}).shinCap !== false && w.end >= today() && w.start <= addD(today(), 7) && w.phase.key !== 'race' && w.phase.key !== 'taper') guarded(w, 'Shin-load ceiling', function () { capWeek(w, sh.ceiling, zz); });
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
  addLead(plan, st);
  applyLadder(plan, st);
  plan.statusByWeek = stat;
  plan.mult = mult;
  return plan;
}
/* Return-to-run ladder after a niggle (st.ladder {start, step 0..4}): each run day from the start takes the next rung,
   walk → run-walk 1:1 → run-walk 4:1 → 20 min easy → 30 min easy. No workouts until it's done. Pain moves you back a rung (set in the app). */
var LADDER = [
  { title: 'Pain-free walk', min: 30, walk: true, note: 'Brisk walk, 30 minutes. It has to be completely pain-free to move up.' },
  { title: 'Run-walk 1:1', min: 20, steps: [{ k: 'rep', n: 10, work: { min: 1 }, z: 'E', rec: { min: 1, walk: true }, effort: 'very easy jog, then walk' }], note: 'Jog 1 minute, walk 1 minute, 10 times. Stop if it hurts.' },
  { title: 'Run-walk 4:1', min: 25, steps: [{ k: 'rep', n: 5, work: { min: 4 }, z: 'E', rec: { min: 1, walk: true }, effort: 'easy running, then walk' }], note: 'Run 4 minutes, walk 1 minute, 5 times. Soft surface or treadmill if you can.' },
  { title: 'Easy run 20 min', min: 20, steps: [{ k: 'run', min: 20, z: 'E' }], note: 'Twenty minutes easy and continuous. The last rung before normal easy running.' },
  { title: 'Easy run 30 min', min: 30, steps: [{ k: 'run', min: 30, z: 'E' }], note: 'Thirty minutes easy. Pain-free today means you are back to the plan, workouts included.' }
];
function applyLadder(plan, st) {
  var L = st.ladder; if (!L || L.step == null || L.step >= LADDER.length || !L.start) return;
  var step = L.step, from = L.start, logs = st.logs || {}, td = today();
  plan.weeks.forEach(function (w) {
    if (w.end < from) return;
    var zz = w.zonesAdj || w.zones, ep = zz && zz.E ? (zz.E[0] + zz.E[1]) / 2 : 600, changed = false;
    w.days.forEach(function (d) {
      if (d.date < from || step >= LADDER.length) return;
      /* no jumping or heavy leg work while you climb back: leg days become upper body and core */
      d.parts = d.parts.map(function (p) { return p.type === 'strength' && /^[ABC]$/.test(p.key || '') ? Object.assign(liftPart('UB', 0, w, 'Return ladder: upper body and core only, so the sore spot gets a break from impact and heavy leg work.'), { role: p.role }) : p; });
      var hasRun = d.parts.some(function (p) { return isRun(p) && p.type !== 'race'; }); if (!hasRun) return;
      /* a past day you didn't do keeps no rung (and uses none up); the ladder waits for you */
      var lg = logs[d.date] || {}, did = (lg.run && !lg.run.skip) || lg.cross || lg.done;
      if (d.date < td && !did) { d.parts = d.parts.filter(function (p) { return !isRun(p) || p.type === 'race'; }); if (!d.parts.length) d.parts.push(restPart()); changed = true; return; }
      var r = LADDER[step], part;
      if (r.walk) part = { type: 'cross', role: 'cross', title: r.title, min: r.min, note: r.note, ladder: step + 1 };
      else part = { type: 'easy', role: 'easy', title: r.title, min: r.min, mi: round1(r.min * 60 / ep), timed: true, steps: r.steps, note: r.note, ladder: step + 1 };
      d.parts = d.parts.filter(function (p) { return !isRun(p) || p.type === 'race'; }).filter(function (p) { return !(p.type === 'strength' && /^[ABC]$/.test(p.key || '')); });
      d.parts.unshift(part); step++; changed = true;
    });
    if (changed) w.tot = totals(w.days);
  });
  plan.ladder = { step: L.step, of: LADDER.length, kind: L.kind || 'other' };
}
/* lead-in days before week 1 (see generate): rest by default. A move from a week-1 day onto a lead-in day
   (st.moves {from: leadDate}) carries that whole day's sessions over and leaves the old day as rest; workouts
   you add yourself (st.extras) land there too. Week 1 then runs from the first lead-in day: an 8+ day week. */
function addLead(plan, st) {
  var lead = plan.lead || [], w = plan.weeks[0];
  if (!lead.length || !w || (w.days[0] && w.days[0].lead)) return;
  var moves = st.moves || {}, ex = st.extras || {}, zz = w.zonesAdj;
  var days = lead.map(function (date, k) {
    var d = { date: date, dow: DOW_ABS[(pd(date).getDay() + 6) % 7], i: k - lead.length, lead: true, parts: [] };
    Object.keys(moves).forEach(function (from) {
      if (moves[from] !== date) return;
      var src = w.days.filter(function (x) { return x.date === from; })[0]; if (!src) return;
      var mv = src.parts.filter(function (p) { return p.type !== 'rest'; }); if (!mv.length) return;
      mv.forEach(function (p) { d.parts.push(Object.assign({}, p, { moved: from })); });
      src.parts = [restPart('Rest & recover', 'Rest day: its sessions moved to ' + DOW_LONG_ABS[(pd(date).getDay() + 6) % 7] + '.')];
    });
    (ex[date] || []).forEach(function (q, i) {
      var p = JSON.parse(JSON.stringify(q));
      if (isRun(p) && !(p.steps && p.steps.length)) p = Object.assign(easyPart(p.title || 'Easy run', p.mi || 3, p.type === 'recovery' ? 'recovery' : 'easy', zz, ''), { role: p.role || 'easy' });
      p.added = true; p.userAdded = true; p.xi = i; p.changed = true; p.note = 'Added by you. ' + (p.note || ''); d.parts.push(p);
    });
    var ven = st.venue || {};
    d.parts = d.parts.map(function (p) { var v = isRun(p) && ven[p.akey || partKey(p.moved || date, p)]; return v === 'in' ? Object.assign({}, p, { treadmill: true, venue: 'in', dark: false, title: /^Easy run$/.test(p.title) ? 'Treadmill run' : p.title, note: 'Indoors on the treadmill, by your choice. Set a 1% incline so the effort matches the road.' }) : v === 'out' ? Object.assign({}, p, { treadmill: false, venue: 'out' }) : p; });
    if (!d.parts.length) d.parts.push(restPart('Rest & recover', 'Your plan starts here. Rest, walk, or get set up for the week ahead.'));
    return d;
  });
  w.days = days.concat(w.days);
  w.start = lead[0];
  w.lead = lead.length;
  w.tot = totals(w.days);
}
/* the day object for a date, by date (week 1 can be longer than 7 days) */
function dayAt(w, date) {
  if (!w) return null;
  for (var i = 0; i < w.days.length; i++) if (w.days[i].date === date) return w.days[i];
  return null;
}
function applyLoadFocus(w, lf, zz) {
  var t = today(), next = addD(monday(t), 13);
  if (w.end < t || w.start > next || w.phase.key === 'race' || w.phase.key === 'taper' || w.phase.key === 'recov') return;
  var fut = w.days.filter(function (d) { return d.date > t; });
  var hardNear = function (d) { return w.days.some(function (x) { return Math.abs(x.i - d.i) === 1 && x.parts.some(function (p) { return p.type === 'speed' || p.type === 'long' || p.type === 'race'; }); }); };
  var easyDays = fut.filter(function (d) { return d.parts.some(function (p) { return (p.type === 'easy' || p.type === 'recovery') && p.role !== 'gym' && !p.changed; }); });
  var why = function (txt) { return 'Training balance: ' + txt; };
  if (lf.nudge === 'anaerobic') {
    if (fut.some(function (d) { return d.parts.some(function (p) { return /strides/i.test(p.title); }); })) return;
    var d1 = easyDays.filter(function (d) { return !hardNear(d); })[0] || easyDays[0]; if (!d1) return;
    d1.parts = d1.parts.map(function (p) { if ((p.type === 'easy' || p.type === 'recovery') && p.role !== 'gym') { var sm = Math.max(2, p.mi); return Object.assign({}, p, { type: 'easy', title: 'Easy + strides', steps: [run(Math.max(1, sm - 0.4), 'E'), rep(6, { sec: 20 }, 'R', { sec: 40, walk: true }, 'fast but relaxed')], lf: 'anaerobic', note: why('your Garmin anaerobic load is low. Six short, relaxed strides fix it without real fatigue.') }); } return p; });
  } else if (lf.nudge === 'high') {
    if (fut.some(function (d) { return d.parts.some(function (p) { return p.type === 'speed'; }); })) return;
    var d2 = easyDays.filter(function (d) { return !hardNear(d); })[0]; if (!d2) return;
    d2.parts = d2.parts.map(function (p) { if ((p.type === 'easy' || p.type === 'recovery') && p.role !== 'gym' && p.mi >= 3) { var mins = clamp(Math.round(p.mi * 3), 10, 25); return { type: 'speed', role: p.role, key: 'steady', title: 'Progression run', mi: p.mi, steps: [run(Math.max(1.5, p.mi - mins / 9), 'E'), runMin(mins, 'S', 'build from easy to steady')], lf: 'high', changed: true, from: p.title, note: why('your Garmin high-aerobic load is low. Finish this run steady to top it up.') }; } return p; });
  } else if (lf.nudge === 'low') {
    var q = fut.filter(function (d) { return d.parts.some(function (p) { return p.type === 'speed'; }); });
    if (q.length < 2) return;
    var d3 = q[q.length - 1];
    d3.parts = d3.parts.map(function (p) { if (p.type === 'speed') { var e = toEasy(p, 1, 'Easy run', why('your Garmin low-aerobic base is short of its target, so one workout becomes easy running this week.')); e.lf = 'low'; e.steps = [run(e.mi, 'E')]; return e; } return p; });
  } else if (lf.nudge === 'anaerobic-excess') {
    fut.forEach(function (d) { d.parts = d.parts.map(function (p) { if (p.type === 'speed' && (p.key === 'intervals' || p.key === 'hills')) { var nq = mkQuality(w, SESS.tempoMi(Math.max(2, Math.round((p.mi || 5) * 0.45))), p.mi || 5, zz); nq.lf = 'anaerobic-excess'; nq.changed = true; nq.from = p.title; nq.note = why('your anaerobic load is above target, so this week\'s intervals become threshold running.'); return nq; } return p; }); });
  }
}
/* ---------- Garmin-style load focus: last 4 weeks of load split into low aerobic, high aerobic and anaerobic ---------- */
var LF_DEFAULT = { low: [0.5, 0.72], high: [0.2, 0.38], anaerobic: [0.06, 0.16] };
function loadFocus(garmin, date) {
  var acts = (garmin && garmin.activities) || [], from = addD(date, -28), b = { low: 0, high: 0, anaerobic: 0 };
  acts.forEach(function (a) {
    if (!a.date || a.date <= from || a.date > date) return;
    var l = +a.load || (a.run && a.distM ? a.distM / MI_M * 10 : 0); if (!l) return;
    var lab = a.teLabel || '', k;
    if (/ANAEROBIC|SPEED/.test(lab)) k = 'anaerobic'; else if (/TEMPO|THRESHOLD|VO2/.test(lab)) k = 'high'; else if (lab) k = 'low';
    else k = (+a.ane >= 2.5) ? 'anaerobic' : (+a.te >= 3.5) ? 'high' : 'low';
    b[k] += l;
  });
  var tot = b.low + b.high + b.anaerobic;
  if (tot < 150) return null;
  var ts = garmin && garmin.fitness && garmin.fitness.trainingStatus, out = { total: Math.round(tot), cats: {}, src: 'app', status: ts && ts.status || null, feedback: ts && ts.balance || null };
  ['low', 'high', 'anaerobic'].forEach(function (k) {
    var g = ts && ts.targets && ts.targets[k], val = b[k], lo, hi;
    if (g && g[1] > 0) { lo = g[0]; hi = g[1]; out.src = 'garmin'; if (ts.loads && ts.loads[k] != null) val = ts.loads[k]; }
    else { lo = LF_DEFAULT[k][0] * tot; hi = LF_DEFAULT[k][1] * tot; }
    out.cats[k] = { load: Math.round(val), lo: Math.round(lo), hi: Math.round(hi), state: val < lo ? 'short' : val > hi ? 'over' : 'ok' };
  });
  var c = out.cats;
  out.nudge = c.anaerobic.state === 'short' ? 'anaerobic' : c.high.state === 'short' ? 'high' : c.low.state === 'short' && c.low.load < c.low.lo * 0.85 ? 'low' : c.anaerobic.state === 'over' && c.anaerobic.load > c.anaerobic.hi * 1.25 ? 'anaerobic-excess' : null;
  return out;
}

/* ---------- what to do when a session is removed or missed ---------- */
function sessionAlternatives(plan, st, w, p, fromDate, why) {
  /* why: 'removed' | 'missed'. Returns [{label, text, ops:[...]}] */
  var t = today(), opts = [], key = p.akey || partKey(p.moved || fromDate, p);
  var future = w.days.filter(function (d) { return d.date > (why === 'missed' ? t : fromDate) || (why === 'removed' && d.date >= t && d.date !== fromDate); }).filter(function (d) { return d.date >= t; });
  var hard = function (d) { return d.parts.some(function (x) { return x.type === 'speed' || x.type === 'long' || x.type === 'race'; }); };
  var near = function (d) { return w.days.some(function (x) { return Math.abs(x.i - d.i) === 1 && hard(x) && x.date !== fromDate; }); };
  var runDays = future.filter(function (d) { return d.parts.some(isRun); });
  var freeDays = future.filter(function (d) { return !d.parts.some(isRun); });
  var easyRuns = future.map(function (d) { return { d: d, p: d.parts.filter(function (x) { return (x.type === 'easy' || x.type === 'recovery') && x.role !== 'gym'; })[0] }; }).filter(function (x) { return x.p; });
  var keyOf = function (d, x) { return x.akey || partKey(x.moved || d.date, x); };
  var skip = why === 'missed' ? [{ t: 'remove', key: key }] : [];
  if (p.type === 'strength') {
    var kept = future.concat(why === 'removed' ? w.days.filter(function (d) { return d.date >= t && d.date !== fromDate && future.indexOf(d) < 0; }) : []).map(function (d) { return { d: d, x: d.parts.filter(function (x) { return x.type === 'strength' && !x.mix; })[0] }; }).filter(function (o) { return o.x; });
    if (kept.length && LIFT[p.key] && kept[0].x.key !== p.key) opts.push({ label: 'Combine it into ' + kept[0].d.dow + '\'s lift', text: 'Turn ' + kept[0].d.dow + '\'s ' + kept[0].x.title.replace(/^Strength (\w+: )?/, '') + ' into a combined session that also covers the main lifts of ' + p.title.replace(/^Strength (\w+: )?/, '') + ', so no muscle group goes untrained this week.', ops: skip.concat([{ t: 'mix', key: keyOf(kept[0].d, kept[0].x), with: p.key }]) });
    var free = freeDays.filter(function (d) { return !d.parts.some(function (x) { return x.type === 'strength'; }) && !w.days.some(function (x) { return x.i === d.i + 1 && x.parts.some(function (y) { return y.type === 'long'; }); }); })[0];
    if (free) opts.push({ label: 'Do it on ' + free.dow + ' instead', text: free.dow + ' has no run, so a lift fits without crowding a key session.', ops: [{ t: 'move', key: key, to: free.date }] });
    opts.push({ label: 'Skip it this week', text: 'One missed lift costs very little. You will hit those muscles again next week.', ops: skip.length ? skip : [] });
    return opts;
  }
  if (p.type === 'easy' || p.type === 'recovery') {
    opts.push({ label: 'Skip it, keep the key runs', text: 'Easy runs are the most flexible part of the week. Keep the ' + (w.days.some(function (d) { return d.parts.some(function (x) { return x.type === 'speed'; }); }) ? 'workout and ' : '') + 'long run as planned.', ops: skip });
    if (easyRuns.length && p.mi >= 2) { var add = half(Math.min(2, p.mi / easyRuns.length)); opts.push({ label: 'Spread the miles', text: 'Add ' + add + ' mi to ' + easyRuns.map(function (x) { return x.d.dow; }).join(' and ') + ' so the weekly total stays close.', ops: skip.concat(easyRuns.map(function (x) { return { t: 'ov', date: x.d.date, action: 'add', mi: add, reason: 'picking up miles from a run you dropped.' }; })) }); }
    var fd = freeDays.filter(function (d) { return !near(d); })[0];
    if (fd) opts.push({ label: 'Make it up on ' + fd.dow, text: fd.dow + ' is free and not next to a hard day.', ops: [{ t: 'move', key: key, to: fd.date }] });
    return opts;
  }
  if (p.type === 'long') {
    var fi = dow(fromDate), nextRun = why === 'missed' ? runDays[0] : runDays.filter(function (d) { return !d.parts.some(function (x) { return x.type === 'speed'; }); }).sort(function (a, b) { return Math.abs(a.i - fi) - Math.abs(b.i - fi); })[0] || runDays[0];
    if (nextRun) {
      var x0 = nextRun.parts.filter(isRun)[0], ops = [{ t: 'move', key: key, to: nextRun.date }, { t: 'remove', key: keyOf(nextRun, x0) }];
      var laterQ = future.filter(function (d) { return d.date > nextRun.date && d.parts.some(function (x) { return x.type === 'speed'; }); })[0];
      if (laterQ) ops.push({ t: 'ov', date: laterQ.date, action: 'easy', reason: 'the long run moved, so this workout becomes easy running.' });
      if (x0.type === 'speed' || laterQ) opts.push({ label: 'Long run on ' + nextRun.dow + ', ease the workout', text: 'Do the long run on ' + (why === 'missed' ? 'your next run day (' + nextRun.dow + ')' : nextRun.dow) + (x0.type === 'speed' ? ' in place of the ' + x0.title.toLowerCase() : '') + (laterQ ? ' and make ' + laterQ.dow + '\'s workout an easy run' : '') + ', so you are not stacking hard days.', ops: ops });
      else opts.push({ label: 'Long run on ' + nextRun.dow, text: 'Do the long run on your next run day instead of its ' + x0.title.toLowerCase() + '.', ops: ops });
    }
    var fl = freeDays.filter(function (d) { return !near(d); })[0];
    if (fl) opts.push({ label: 'Move it to ' + fl.dow, text: fl.dow + ' is free and has an easy day either side.', ops: [{ t: 'move', key: key, to: fl.date }] });
    var erl = easyRuns.filter(function (x) { return x.d !== nextRun; });
    if (erl.length) { var er = erl[erl.length - 1]; opts.push({ label: 'Medium-long on ' + er.d.dow, text: 'Turn ' + er.d.dow + '\'s easy run into a ' + half(p.mi * 0.75) + ' mi medium-long run and keep everything else.', ops: skip.concat([{ t: 'ov', date: er.d.date, action: 'long', mi: half(p.mi * 0.75), reason: 'stands in for the long run you dropped this week.' }]) }); }
    opts.push({ label: 'Skip it', text: 'One missed long run is fine. Next week\'s long run stays as planned; do not try to make up the miles.', ops: skip });
    return opts;
  }
  if (p.type === 'speed') {
    var er2 = easyRuns.filter(function (x) { return !near(x.d) || why === 'missed'; })[0];
    if (er2) opts.push({ label: 'Do it on ' + er2.d.dow, text: 'Swap it into ' + er2.d.dow + '\'s easy run slot; that easy run drops.', ops: [{ t: 'move', key: key, to: er2.d.date }, { t: 'remove', key: keyOf(er2.d, er2.p) }] });
    if (easyRuns.length) { var er3 = easyRuns[0]; opts.push({ label: 'Strides on ' + er3.d.dow, text: 'Keep the easy run and add six short strides: a little speed without a full workout.', ops: skip.concat([{ t: 'ov', date: er3.d.date, action: 'strides' }]) }); }
    opts.push({ label: 'Skip it, keep the long run', text: 'The long run matters more this week. Run it as planned.', ops: skip });
    return opts;
  }
  return [{ label: 'Skip it', text: '', ops: skip }];
}
/* sessions this week that were planned before today and not done */
function missedThisWeek(plan, st, date) {
  var w = weekOf(plan, date); if (!w) return [];
  var logs = st.logs || {}, out = [];
  w.days.forEach(function (d) {
    if (d.date >= date) return;
    var l = logs[d.date] || {};
    d.parts.forEach(function (p) {
      if (p.type === 'rest' || p.type === 'cross' || p.type === 'race') return;
      var done = isRun(p) ? !!(l.run && (l.run.skip || +l.run.mi > 0)) : p.type === 'strength' ? !!l.lift : true;
      if (l.done) done = true;
      if (!done) out.push({ p: p, date: d.date, day: d });
    });
  });
  return out;
}
/* rested on a rest day? offer a workout that fits around the rest of the week */
function restDayOffer(plan, st, garmin, date, rd) {
  var w = weekOf(plan, date); if (!w || !rd || !rd.factors) return null;
  var d = dayAt(w, date); if (!d) return null;
  if (d.parts.some(function (p) { return p.type !== 'rest'; }) || (st.overrides || {})[date]) return null;
  if (rd.level !== 'green' || rd.score < 70) return null;
  var logs = st.logs || {}, acts = (garmin && garmin.activities) || [], idle = 0;
  for (var i = 1; i <= 4; i++) { var dd = addD(date, -i), l = logs[dd] || {}, active = (l.run && +l.run.mi > 0) || l.lift || acts.some(function (a) { return a.date === dd && (a.run || a.strength); }); if (active) break; idle++; }
  if (idle < 2) return null;
  var tm = w.days[w.days.indexOf(d) + 1] || null, tmHard = tm && tm.parts.some(function (p) { return p.type === 'speed' || p.type === 'long' || p.type === 'race'; });
  var liftsPlanned = w.tot.lifts, liftsDone = w.days.filter(function (x) { return x.date < date && logs[x.date] && logs[x.date].lift; }).length;
  var keys = w.days.map(function (x) { return x.parts.filter(function (p) { return p.type === 'strength'; })[0]; }).filter(Boolean).map(function (p) { return p.key; });
  var missingLift = liftsDone < liftsPlanned ? (['A', 'B', 'C'].filter(function (k) { return keys.indexOf(k) < 0; })[0] || 'UB') : null;
  if (tmHard) return { title: 'Rested and ready: an easy run?', body: 'You have had ' + idle + ' days off and your recovery markers look good. Tomorrow is ' + tm.parts.filter(function (p) { return p.type !== 'strength'; })[0].title.toLowerCase() + ', so keep today light: a short easy run, and lift only upper body if at all.', add: { run: 3, lift: missingLift ? 'UB' : null, why: 'Easy only: tomorrow is a key session.' } };
  return { title: 'Rested and ready: add a session?', body: 'You have had ' + idle + ' days off and your recovery markers look good. ' + (missingLift ? 'You are a lift short this week, so here is a lift and a short easy run.' : 'Here is an easy run to keep the week moving.'), add: { run: missingLift ? 2 : 4, lift: missingLift, why: missingLift ? 'Run first, then lift.' : '' } };
}
function partKey(date, p) { return date + '|' + (p.role || p.type) + (p.type === 'strength' ? '' : '|' + (isRunType(p.type) ? 'run' : p.type)); }
function isRunType(t) { return t === 'easy' || t === 'recovery' || t === 'long' || t === 'speed' || t === 'race'; }
/* How well recent weeks were followed. If you ran much less than planned, this week is capped so the jump back is not too big. */
function compliance(plan, st) {
  var t = today(), cur = weekOf(plan, t);
  if (!cur || cur.n < 2) return null;
  var logs = st.logs || {}, marks = weekStatuses(plan, st), weeks = [];
  for (var i = cur.n - 2; i >= Math.max(0, cur.n - 4); i--) {
    var w = plan.weeks[i];
    if (marks[w.start]) continue;   /* vacation, sickness and injury are handled elsewhere */
    var act = 0, long = 0, runs = 0, planned = 0, keyP = 0, keyD = 0;
    w.days.forEach(function (d) {
      var l = logs[d.date] || {};
      ['run', 'xrun'].forEach(function (k) { var r = l[k]; if (r && !r.skip && +r.mi > 0) { act += +r.mi; runs++; long = Math.max(long, +r.mi); } });
      d.parts.forEach(function (p) { if (isRun(p)) { planned += p.mi || 0; if (p.type === 'long' || p.type === 'speed') { keyP++; if (l.run && !l.run.skip && +l.run.mi > 0) keyD++; } } });
    });
    weeks.push({ n: w.n, start: w.start, planned: round1(planned), act: round1(act), pct: planned ? act / planned : 1, long: round1(long), runs: runs, keyP: keyP, keyD: keyD });
    if (weeks.length >= 2) break;
  }
  if (!weeks.length) return null;
  var pAvg = mean(weeks.map(function (x) { return x.pct; }));
  var actMax = Math.max.apply(null, weeks.map(function (x) { return x.act; }));
  var longMax = Math.max.apply(null, weeks.map(function (x) { return x.long; }));
  var out = { weeks: weeks, pct: pAvg, level: pAvg >= 0.85 ? 'ok' : pAvg >= 0.65 ? 'low' : 'verylow', cap: null };
  var curPlanned = 0, curLong = 0;
  cur.days.forEach(function (d) { d.parts.forEach(function (p) { if (isRun(p)) { curPlanned += p.mi || 0; if (p.type === 'long') curLong = Math.max(curLong, p.mi); } }); });
  if (out.level !== 'ok' && curPlanned > 0) {
    var capMi = round1(Math.max(actMax * 1.15 + 1.5, 6));
    var longCap = half(Math.max(longMax * 1.2 + 1, 3));
    if (capMi < curPlanned * 0.97 || (curLong && longCap < curLong)) out.cap = { week: cur.start, m: clamp(capMi / curPlanned, 0.5, 1), mi: capMi, long: curLong && longCap < curLong ? longCap : null, planned: round1(curPlanned) };
  }
  return out;
}
/* Is a week's arrangement too intense? Returns warnings with suggested fixes. */
function weekIntensity(w, prof) {
  var out = [], days = w.days;
  var hard = function (d) { return d.parts.some(function (p) { return p.type === 'speed' || p.type === 'long' || p.type === 'race'; }); };
  var legs = function (d) { return d.parts.some(function (p) { return p.type === 'strength' && (p.key === 'A' || p.key === 'B' || p.key === 'C') && (p.lp || 0) < 3; }); };
  var runs = function (d) { return d.parts.filter(isRun).length; };
  var title = function (d, f) { var p = d.parts.filter(f)[0]; return p ? p.title : ''; };
  for (var i = 0; i < days.length; i++) {
    var d = days[i], n = days[i + 1];
    if (runs(d) > 1) out.push({ level: 'warn', date: d.date, text: d.dow + ' has two runs. Unless you planned a double on purpose, move one to a free day.', fix: freeFix(w, d, function (p) { return isRun(p) && p.type !== 'long'; }) });
    var subThenLong = n && d.parts.some(function (p) { return p.key === 'subt'; }) && !d.parts.some(function (p) { return p.type === 'long' || p.type === 'race'; }) && n.parts.some(function (p) { return p.type === 'long'; }) && !n.parts.some(function (p) { return p.type === 'speed'; });   /* controlled sub-threshold the day before an easy long run is part of the Norwegian layout */
    if (n && hard(d) && hard(n) && !subThenLong) {
      var easier = n.parts.some(function (p) { return p.type === 'speed'; }) ? n : d;
      out.push({ level: 'warn', date: n.date, text: 'Hard days back to back: ' + d.dow + ' (' + title(d, function (p) { return p.type === 'speed' || p.type === 'long' || p.type === 'race'; }) + ') and ' + n.dow + ' (' + title(n, function (p) { return p.type === 'speed' || p.type === 'long' || p.type === 'race'; }) + '). Keep at least one easy day between them.', fix: { label: 'Make ' + easier.dow + ' easy', type: 'override', date: easier.date, action: 'easy' } });
    }
    if (n && legs(d) && n.parts.some(function (p) { return p.type === 'long'; })) out.push({ level: 'warn', date: d.date, text: 'Heavy leg day on ' + d.dow + ' right before your long run. Tired legs make the long run harder and riskier.', fix: { label: 'Make ' + d.dow + '\'s lift light', type: 'lift', date: d.date, action: 'light' } });
    if (n && legs(d) && n.parts.some(function (p) { return p.type === 'speed'; })) out.push({ level: 'info', date: d.date, text: 'Leg day on ' + d.dow + ' before ' + n.dow + '\'s key workout. Fine if you keep 3 reps in reserve; better to lift after the workout instead.', fix: null });
  }
  var streak = 0, maxStreak = 0;
  days.forEach(function (d) { streak = d.parts.some(function (p) { return isRun(p) && p.role !== 'gym'; }) ? streak + 1 : 0; maxStreak = Math.max(maxStreak, streak); });   /* short gym treadmill runs don't count */
  if (maxStreak >= (prof && prof.injuryProne ? 5 : 6)) out.push({ level: 'warn', date: null, text: maxStreak + ' running days in a row. ' + (prof && prof.injuryProne ? 'With your shin history, ' : '') + 'put a rest or gym-only day in the middle.', fix: null });
  if (!days.some(function (d) { return d.parts.every(function (p) { return p.type === 'rest'; }); })) out.push({ level: 'warn', date: null, text: 'No rest day this week. Keep at least one full rest day.', fix: null });
  return out;
}
function freeFix(w, from, f) {
  var p = from.parts.filter(f)[0]; if (!p) return null;
  var free = w.days.filter(function (d) { return d !== from && !d.parts.some(isRun); });
  free.sort(function (a, b) { return Math.abs(a.i - from.i) - Math.abs(b.i - from.i); });
  return free[0] ? { label: 'Move ' + p.title + ' to ' + free[0].dow, type: 'move', key: p.akey || partKey(p.moved || from.date, p), to: free[0].date } : null;
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
  z.ST = [z.T[1], z.T[1] + 20];
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
      out.push({ date: date, slot: slot, ptype: r.ptype || 'easy', mi: mi, sec: sec, pace: mi > 0 && sec > 0 ? sec / mi : null, rpe: +r.rpe || null, feel: +r.feel || null, hr: +r.hr || null, seg: r.seg || null, src: r.src || 'manual' });
    });
  });
  return out;
}
function partOn(plan, date, type) {
  var w = weekOf(plan, date);
  if (!w) return null;
  var d = dayAt(w, date); if (!d) return null;
  return d.parts.filter(function (p) { return type ? p.type === type : isRun(p); })[0] || null;
}
function weekOf(plan, date) {
  for (var i = 0; i < plan.weeks.length; i++) if (date >= plan.weeks[i].start && date <= plan.weeks[i].end) return plan.weeks[i];
  return null;
}
function mainZone(p) {
  if (!p || !p.steps) return null;
  var z = null;
  p.steps.forEach(function (s) { if (!z && (s.k === 'rep' || s.k === 'run') && ['T', 'ST', 'I', 'M', 'G', 'H'].indexOf(s.z) >= 0) z = s.z; });
  return z;
}

/* VO2max and lactate threshold readings: yours (entered in the app) plus whatever Garmin syncs. Oldest first. */
function ltSpeedToPace(v) { v = +v; if (!(v > 0)) return null; if (v < 1.5) v *= 10; return v > 1.5 && v < 8 ? Math.round(MI_M / v) : null; }
function fitnessReadings(st, garmin) {
  var out = [];
  (st && st.metrics || []).forEach(function (m) {
    if (!m || !m.date) return;
    var lt = parseClock(m.ltPace);
    out.push({ date: m.date, src: 'you', id: m.id, vo2: +m.vo2 > 20 ? +m.vo2 : null, ltPace: lt > 0 ? lt : null, ltHr: +m.ltHr > 0 ? +m.ltHr : null, ltPower: +m.ltPower || null, ltWkg: +m.ltWkg || null });
  });
  var f = garmin && garmin.fitness, by = {};
  function row(d) { return by[d] = by[d] || { date: d, src: 'garmin', vo2: null, ltPace: null, ltHr: null }; }
  if (garmin && garmin.activities) garmin.activities.forEach(function (a) { if (a.run && a.date && +a.vo2 > 20) row(a.date).vo2 = +a.vo2; });
  if (f) {
    Object.keys(f.vo2 || {}).forEach(function (d) { if (+f.vo2[d] > 20) row(d).vo2 = +f.vo2[d]; });
    Object.keys(f.ltSpeed || {}).forEach(function (d) { var pc = ltSpeedToPace(f.ltSpeed[d]); if (pc) row(d).ltPace = pc; });
    Object.keys(f.ltHr || {}).forEach(function (d) { if (+f.ltHr[d] > 80) row(d).ltHr = +f.ltHr[d]; });
  }
  Object.keys(by).forEach(function (d) { out.push(by[d]); });
  out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.src === 'you' ? 1 : -1); });
  return out;
}
function latestReading(list, key, src) {
  for (var i = list.length - 1; i >= 0; i--) if (list[i][key] && (!src || list[i].src === src)) return list[i];
  return null;
}

function analyze(plan, st, garmin) {
  var runs = runLogs(st);
  var res = { off: { E: 0, S: 0, T: 0, I: 0 }, notes: [], vdot: null, result: null, proj: null, dv: 0, dvFrom: null, easy: null, hr: null };
  res.dvAt = function (date) { return res.dvFrom && date >= monday(res.dvFrom) ? res.dv : 0; };
  function note(level, title, body) { res.notes.push({ level: level, title: title, body: body }); }
  /* 1. the latest fitness anchor: a race or time trial, a lactate threshold test, or a VO2max reading */
  var anchors = [];
  var skipA = st.anchorSkip || {};
  runs.forEach(function (r) { if (r.seg && r.seg.race && r.seg.mi >= 1 && r.seg.sec > 0 && !skipA[r.date]) anchors.push({ date: r.date, src: 'race', v: vdotOf(r.seg.mi, r.seg.sec), w: 1, mi: r.seg.mi, sec: r.seg.sec }); });
  var fr = fitnessReadings(st, garmin);
  res.readings = fr;
  /* one anchor per source per day; a Garmin threshold reading repeats daily, so only changes count */
  var lastLt = null;
  fr.forEach(function (m) {
    if (m.ltPace) { if (!(m.src === 'garmin' && lastLt && lastLt.pace === m.ltPace)) anchors.push({ date: m.date, src: 'lt', v: vdotFromThreshold(m.ltPace), w: 0.9, ltPace: m.ltPace, ltHr: m.ltHr, from: m.src }); lastLt = { pace: m.ltPace }; }
    else if (m.vo2) anchors.push({ date: m.date, src: 'vo2', v: vdotFromVo2(m.vo2), w: 0.5, vo2: m.vo2, from: m.src });
  });
  /* best recent efforts: Garmin's fastest splits inside your runs over the last 8 weeks (a floor on your fitness) */
  var eff = null, tdy = today();
  ((garmin && garmin.activities) || []).forEach(function (a) {
    if (!a.run || !a.best || !a.date || a.date > tdy || diffD(a.date, tdy) > 56) return;
    [['5k', 3.10686, 1], ['10k', 6.21371, 1], ['half', 13.1094, 1], ['full', 26.2188, 1], ['1mi', 1, 0.96]].forEach(function (d) {
      var sec = +a.best[d[0]]; if (!(sec > 0)) return;
      var v = vdotOf(d[1], sec) * d[2];
      if (v > 20 && v < 85 && (!eff || v > eff.v)) eff = { date: a.date, src: 'effort', v: v, w: 1, mi: d[1], sec: sec, key: d[0], name: a.name };
    });
  });
  if (eff) anchors.push(eff);
  res.effort = eff;
  anchors.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  var lm = latestReading(fr, 'ltPace') || latestReading(fr, 'ltHr');
  if (lm) { var lhr = latestReading(fr, 'ltHr'); res.lt = { date: lm.date, pace: lm.ltPace || null, hr: lhr ? lhr.ltHr : null, src: lm.src }; }
  var vo2m = fr.filter(function (m) { return m.vo2; });
  if (vo2m.length) { var vh = {}; vo2m.forEach(function (m) { vh[m.date] = m.vo2; }); res.vo2 = { date: vo2m[vo2m.length - 1].date, v: vo2m[vo2m.length - 1].vo2, src: vo2m[vo2m.length - 1].src, hist: Object.keys(vh).sort().map(function (d) { return { date: d, v: vh[d] }; }) }; }
  if (anchors.length) {
    /* Priority: a race or time trial in the last 12 weeks, then a threshold reading in the last 12 weeks, then the newest reading of any kind.
       Watch VO2max alone moves paces at half weight. */
    var tday = today(), recent = function (a) { return diffD(a.date, tday) <= 84; };
    var pick = function (f) { for (var i = anchors.length - 1; i >= 0; i--) if (f(anchors[i])) return anchors[i]; return null; };
    var aLt = pick(function (a) { return a.src === 'lt' && recent(a); }), aEf = pick(function (a) { return a.src === 'effort'; });
    /* a threshold reading and a proven recent effort: whichever shows more fitness wins (an effort inside a training run is a floor) */
    var measured = aLt && aEf ? (aEf.v * aEf.w > aLt.v * aLt.w + 0.5 ? aEf : aLt) : (aLt || aEf);
    var last = pick(function (a) { return a.src === 'race' && recent(a); }) || measured || anchors[anchors.length - 1];
    res.anchor = last;
    var w = weekOf(plan, last.date);
    var exp = w ? w.vPlan : plan.v0;
    res.vdot = exp + (last.v - exp) * last.w;
    res.dv = clamp((last.v - exp) * last.w, -5, 5); res.dvFrom = last.date;
    res.result = { date: last.date, src: last.src, mi: last.mi, sec: last.sec, vdot: res.vdot, raw: last.v, exp: exp, ltPace: last.ltPace, vo2: last.vo2 };
    res.sources = { race: pick(function (a) { return a.src === 'race'; }), lt: pick(function (a) { return a.src === 'lt'; }), effort: aEf, vo2: pick(function (a) { return a.src === 'vo2'; }) };
  }
  /* A recent lactate threshold pace pins the threshold zone directly (within 10 weeks). */
  if (res.lt && res.lt.pace && diffD(res.lt.date, today()) <= 70) res.ltPin = res.lt.pace;
  /* 2. effort feedback on quality runs */
  var RPE_T = { T: 5, I: 7, M: 4, G: 4, H: 4 };   /* Garmin's effort scale: 2 easy, 3 moderate, 5 hard, 7 very hard */
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
  /* 2b. your accepted pace calibration from workout execution (st.paceCal {T, I, TAt, IAt}); a newer race or time trial supersedes it */
  var pc = st.paceCal || {};
  ['T', 'I'].forEach(function (z) { if (pc[z] && (!res.anchor || !res.anchor.date || (pc[z + 'At'] || '') >= res.anchor.date)) res.off[z] = r5(clamp((res.off[z] || 0) + pc[z], -30, 40)); });
  res.paceCal = pc;
  /* 3. easy runs: effort and heart rate */
  var er = runs.filter(function (r) { return (r.ptype === 'easy' || r.ptype === 'recovery' || r.ptype === 'long') && r.pace; }).slice(-5);
  var easyAdj = 0;
  var rated = er.filter(function (r) { return r.rpe; });
  if (rated.length >= 2) {
    var ar = mean(rated.map(function (r) { return r.rpe; }));
    if (ar >= 5) easyAdj = 15; else if (ar >= 4) easyAdj = 8; else if (ar <= 1.5 && rated.length >= 3) easyAdj = -5;
    res.easy = { rpe: ar, n: rated.length };
  }
  /* how you felt (Garmin self-evaluation, 1 very weak ... 5 very strong) */
  var felt = runs.filter(function (r) { return r.feel && diffD(r.date, today()) <= 10; }).slice(-4);
  if (felt.length >= 2) {
    var fm = mean(felt.map(function (r) { return r.feel; }));
    res.feel = { avg: fm, n: felt.length };
    if (fm <= 2.25) { easyAdj = Math.max(easyAdj, 10); res.feelLow = true; note('warn', 'You have felt weak on recent runs', 'Your last ' + felt.length + ' runs averaged "' + ['', 'very weak', 'weak', 'normal', 'strong', 'very strong'][Math.round(fm)] + '". Easy paces are 10 s/mi slower, and if the next key workout still feels flat, swap it for an easy run. Check sleep, fueling and any aches.'); }
  }
  var hrMax = maxHrSeen(garmin);
  res.hrMax = hrMax;
  res.loadFocus = loadFocus(garmin, today());
  try { res.shin = shinLoad(st, garmin, null, today()); res.recovery = recoveryProfile(garmin); } catch (e) { res.shin = null; }
  var withHr = er.filter(function (r) { return r.hr; });
  if (hrMax && withHr.length >= 3) {
    var hrPct = mean(withHr.map(function (r) { return r.hr; })) / hrMax;
    res.hr = { pct: hrPct, max: hrMax };
    if (hrPct > 0.8) { easyAdj = Math.max(easyAdj, 10); note('warn', 'Easy runs are running hot', 'Your easy runs average ' + Math.round(hrPct * 100) + '% of your max heart rate (' + hrMax + '). Easy should sit around 65–78%. Easy paces are ' + Math.max(easyAdj, 10) + ' s/mi slower so they stay truly easy.'); }
  }
  res.off.E = r5(clamp(easyAdj + (res.dv ? 0 : 0), -15, 45));
  res.off.S = r5((res.off.E + res.off.T) / 2);
  if (res.easy && easyAdj >= 8 && !(res.hr && res.hr.pct > 0.8)) note('warn', 'Slow your easy runs', 'Your last easy runs averaged RPE ' + res.easy.rpe.toFixed(1) + '. Easy should feel like a 2 or 3 (easy to moderate).');
  /* 4. projections */
  var vNow = res.vdot != null ? res.vdot : (weekOf(plan, today()) || plan.weeks[0]).vPlan + res.dvAt(today());
  res.vNow = vNow;
  res.proj = { k5: predict(vNow, 3.10686), k10: predict(vNow, 6.21371), half: predict(vNow, 13.1094), full: predict(vNow, 26.2188) };
  if (res.result) {
    var rr = res.result, d = rr.vdot - rr.exp;
    var what = rr.src === 'race' ? 'Your ' + round1(rr.mi) + ' mi in ' + clock(rr.sec) : rr.src === 'effort' ? 'Your best recent ' + round1(rr.mi) + ' mi stretch of ' + clock(rr.sec) : rr.src === 'lt' ? 'Your lactate threshold pace of ' + fmtPace(rr.ltPace) + '/mi' : 'Your VO2max of ' + rr.vo2;
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
    /* the same run must never count twice: skip a watch activity already linked to a log, or one that matches a run you logged by hand */
    var linked = {}; ['run', 'xrun', 'lift', 'cross'].forEach(function (k) { if (l[k] && l[k].gid) linked[l[k].gid] = 1; });
    var manual = ['run', 'xrun'].filter(function (k) { return l[k] && !l[k].gid && !l[k].skip && +l[k].mi > 0; }).map(function (k) { return +l[k].mi; });
    list = list.filter(function (a) {
      if (linked[a.id]) return false;
      if (a.run && manual.length) { var ami = (a.distM || 0) / MI_M, j = -1; manual.forEach(function (m, k) { if (j < 0 && Math.abs(m - ami) <= Math.max(0.5, m * 0.2)) j = k; }); if (j >= 0) { manual.splice(j, 1); return false; } }
      return true;
    });
    list.forEach(function (a) {
      if (a.run) {
        var slot = slots.shift();
        if (!slot) return;
        var p = plan ? partOn(plan, date) : null;
        var mi = round1((a.distM || 0) / MI_M), sec = Math.round(a.movS || a.durS || 0);
        adds.push({ date: date, slot: slot, id: a.id, rec: { src: 'garmin', gid: a.id, ptype: a.race ? 'race' : (p ? p.type : 'easy'), mi: mi, sec: sec, hr: a.avgHR || null, maxhr: a.maxHR || null, te: a.te || null, name: a.name || '', rpe: a.rpe || null, feel: a.feel || null, seg: a.race && mi >= 1 ? { mi: mi, sec: sec, race: true } : null } });
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
function recommend(rd, day, ctx) {
  var r0 = recommend0(rd, day);
  var m = rd && rd.metrics || {}, sl = m.sleep, bb = m.bb, parts = day ? day.parts : [];
  var runP = parts.filter(isRun)[0];
  var poor = sl && sl.score && sl.score < 60 && bb && bb.v != null && bb.v < 50;
  if (poor && !rd.flags.ill && !rd.flags.pain && (runP || parts.some(function (p) { return p.type === 'strength'; })) && !r0.actions.some(function (a) { return a.action === 'rest'; })) {
    r0.headline = rd.level === 'green' ? 'Short sleep, low battery' : r0.headline;
    r0.body = 'Sleep score ' + sl.score + ' and Body Battery peaked at ' + bb.v + '. ' + (rd.level === 'green' ? 'Your other markers are fine, so the choice is yours: ' : '') + 'An extra rest day now is cheaper than a flat week.';
    r0.actions = [{ action: 'rest', label: 'Take a rest day' }].concat(runP ? [{ action: 'easy', label: 'Easy run only' }] : []).concat([{ action: 'keep', label: 'Keep the plan' }]);
    if (r0.level === 'green') r0.level = 'amber';
  }
  if (ctx && ctx.yesterdayHard && runP && runP.type === 'speed' && rd.level !== 'red') {
    r0.headline = 'Yesterday was harder than planned';
    r0.body = 'You trained harder yesterday than the plan had in mind (' + ctx.yesterdayHard + '). Run easy today and keep the hard work for later in the week, so you are not stacking two hard days.';
    r0.actions = [{ action: 'easy', label: 'Swap to easy run' }, { action: 'keep', label: 'Keep the workout' }];
    if (r0.level === 'green') r0.level = 'amber';
  }
  /* Garmin's recovery time still running when a hard session is due: suggest easing off, you decide */
  var rv = ctx && ctx.recovery, hardP = parts.filter(function (p) { return p.type === 'speed' || p.type === 'long'; })[0];
  if (rv && hardP && rv.atRun >= 6 && rd.level !== 'red' && !rd.flags.ill && !rd.flags.pain && !r0.actions.some(function (a) { return a.action === 'rest'; })) {
    var hrs = Math.ceil(rv.atRun), longRun = hardP.type === 'long';
    r0.headline = 'Garmin says you are still recovering'; r0.src = 'recovery';
    r0.body = 'Your watch has about ' + hrs + ' hours of recovery left at your usual run time' + (rv.untilTxt ? ' (' + rv.untilTxt + ')' : '') + '. ' +
      (longRun ? 'A shorter, easy long run keeps the habit without digging a deeper hole.' : 'A hard ' + hardP.title.toLowerCase() + ' before then adds fatigue for little gain.') + ' If you feel good, keeping it is your call.';
    r0.actions = [{ action: 'easy', label: longRun ? 'Shorter, easy long run' : 'Swap to easy run' }, { action: 'keep', label: 'Keep the ' + (longRun ? 'long run' : 'workout') }];
    if (r0.level === 'green') r0.level = 'amber';
  }
  return r0;
}
function recommend0(rd, day) {
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
var INT_H = { REC: 0.22, E: 0.3, S: 0.5, M: 0.6, G: 0.65, H: 0.65, ST: 0.68, T: 0.75, I: 0.9, R: 1, F: 0.7 };
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


/* ======================= individualization: weather, shins, recovery, shifts, goals, laps, races ======================= */
/* Dew-point pace slowdown (RunnersConnect table), scaled down by Garmin heat acclimation. Returns a fraction (0.03 = 3% slower). */
function heatPct(dewF, tempF, acclimPct) {
  if (dewF == null) return 0;
  var pts = [[55, 0], [57.5, 0.01], [62.5, 0.025], [67.5, 0.04], [72.5, 0.065], [77.5, 0.135], [82, 0.16]];
  var p = 0;
  if (dewF > pts[0][0]) { for (var i = 1; i < pts.length; i++) { if (dewF <= pts[i][0]) { var a = pts[i - 1], b = pts[i]; p = a[1] + (b[1] - a[1]) * (dewF - a[0]) / (b[0] - a[0]); break; } } if (dewF > pts[pts.length - 1][0]) p = 0.16; }
  if (tempF != null && tempF >= 85) p += 0.01 * Math.min(4, (tempF - 80) / 5);   /* direct sun and radiant heat on top of humidity */
  if (acclimPct) p *= 1 - 0.3 * clamp(acclimPct, 0, 100) / 100;
  return Math.round(p * 1000) / 1000;
}
/* scale pace zones (seconds per mile) by a heat slowdown; heart-rate zones stay as they are */
function heatZones(zz, pct) {
  if (!zz || !pct) return zz;
  var out = {}; Object.keys(zz).forEach(function (k) { var z = zz[k]; out[k] = Array.isArray(z) && typeof z[0] === 'number' ? [Math.round(z[0] * (1 + pct)), Math.round(z[1] * (1 + pct))] : z; });
  out.heat = pct; return out;
}
/* winter: ice, deep cold or heavy snow -> suggest the treadmill */
function winterCheck(h) {
  if (!h) return null;
  var why = [];
  var ice = [56, 57, 66, 67].indexOf(h.code) >= 0, snow = h.snow != null && h.snow >= 0.4;
  var chill = h.feels != null ? h.feels : h.temp;
  if (ice) why.push('freezing rain or drizzle (ice)');
  if (chill != null && chill <= -10) why.push('a wind chill of ' + Math.round(chill) + '°F');
  else if (chill != null && chill <= 0 && h.wind >= 15) why.push(Math.round(h.wind) + ' mph wind at ' + Math.round(chill) + '°F feels-like');
  if (snow) why.push('heavy snow (' + h.snow + ' in/h)');
  if (!why.length) return null;
  return { swap: true, level: ice || (chill != null && chill <= -15) ? 'high' : 'mid', why: why.join(' and ') };
}

/* weekly run miles, from Garmin activities (with logs filling gaps) */
function weeklyMiles(st, garmin, endDate, weeks) {
  var byDay = {};
  ((garmin && garmin.activities) || []).forEach(function (a) { if (a.run && a.date && a.distM) byDay[a.date] = (byDay[a.date] || 0) + a.distM / MI_M; });
  Object.keys((st && st.logs) || {}).forEach(function (d) { var r = st.logs[d].run; if (r && +r.mi > 0 && !byDay[d]) byDay[d] = +r.mi; });
  var out = [];
  for (var i = weeks - 1; i >= 0; i--) {
    var e = addD(endDate, -7 * i), s = addD(e, -6), t = 0, tread = 0;
    Object.keys(byDay).forEach(function (d) { if (d >= s && d <= e) t += byDay[d]; });
    ((garmin && garmin.activities) || []).forEach(function (a) { if (a.run && a.date >= s && a.date <= e && /treadmill|indoor/.test(a.type || '')) tread += (a.distM || 0) / MI_M; });
    out.push({ start: s, end: e, mi: round1(t), tread: round1(tread) });
  }
  return out;
}
/* Shin-load ceiling: a personal weekly mileage limit from what you have handled without pain */
function shinLoad(st, garmin, plan, date) {
  var prof = (st && st.profile) || {};
  var wk = weeklyMiles(st, garmin, addD(date, -1), 10), last4 = wk.slice(-4), a4 = mean(last4.map(function (w) { return w.mi; })) || 0;
  var pains = ((st && st.checkins) || []).filter(function (c) { return c.pain && c.date >= addD(date, -21); });
  var shinPain = pains.filter(function (c) { return !c.where || /shin|tib|calf|lower leg|ankle/i.test(String(c.where)); });
  /* the biggest week in the last 10 that was not followed by pain within 7 days */
  var safe = 0; wk.forEach(function (w) { var hurt = ((st && st.checkins) || []).some(function (c) { return c.pain && c.date >= w.start && c.date <= addD(w.end, 7); }); if (!hurt) safe = Math.max(safe, w.mi); });
  var reasons = [], f = prof.injuryProne ? 1.10 : 1.15;
  var ceiling = Math.max(a4 * f, Math.min(safe * 1.05, a4 * 1.3), 8);
  if (shinPain.length) { ceiling = Math.min(ceiling, Math.max(a4, 6)); reasons.push('shin or lower-leg pain reported in the last 3 weeks'); }
  var tread = mean(last4.map(function (w) { return w.mi ? w.tread / w.mi : 0; })) || 0;
  if (tread > 0.6) reasons.push('most recent miles were on a treadmill, so road miles count a little more');
  var cad = ((garmin && garmin.activities) || []).filter(function (a) { return a.run && a.cadence && a.date >= addD(date, -21); }).map(function (a) { return a.cadence; });
  var cadAvg = cad.length ? mean(cad) : null;
  if (cadAvg && cadAvg < 160) { ceiling *= 0.95; reasons.push('cadence averages ' + Math.round(cadAvg) + ' spm; a slightly quicker step (165+) lowers shin load'); }
  var shoes = ((st && st.shoes) || []).filter(function (s) { return !s.retired; });
  var worn = shoes.filter(function (s) { return (+s.mi || 0) + (+s.start || 0) > 400; });
  if (worn.length) reasons.push(worn.map(function (s) { return s.name; }).join(', ') + ' past 400 mi');
  ceiling = round1(ceiling);
  var w = plan && weekOf(plan, date), nw = plan && weekOf(plan, addD(date, 7));
  var risk = function (mi) { return !mi ? 'ok' : mi > ceiling * 1.1 ? 'high' : mi > ceiling ? 'watch' : 'ok'; };
  return { ceiling: ceiling, a4: round1(a4), safe: round1(safe), weeks: wk, cadence: cadAvg ? Math.round(cadAvg) : null, reasons: reasons,
    thisWeek: w ? { mi: w.tot.mi, risk: risk(w.tot.mi) } : null, nextWeek: nw ? { mi: nw.tot.mi, risk: risk(nw.tot.mi) } : null };
}
/* cap a week's runs at the shin ceiling (scales easy and long runs, keeps the key workout) */
function capWeek(w, ceiling, zz) {
  w.tot = totals(w.days);
  var mine = 0; w.days.forEach(function (d) { d.parts.forEach(function (p) { if (p.userAdded && isRun(p)) mine += p.mi || 0; }); });
  var over = w.tot.mi - mine - ceiling; if (over <= 0.5) return false;   /* runs you add yourself don't squeeze the others */
  var flex = []; w.days.forEach(function (d) { d.parts.forEach(function (p, i) { if (isRun(p) && !p.userAdded && !p.timed && (p.type === 'easy' || p.type === 'recovery' || p.type === 'long') && d.date > today()) flex.push({ d: d, i: i, p: p }); }); });
  var tot = flex.reduce(function (a, x) { return a + (x.p.mi || 0); }, 0); if (tot < 1) return false;
  var f = Math.max(0.6, (tot - over) / tot);
  flex.forEach(function (x) { var p = scaleRun(x.p, f, zz); p.mi = half(Math.max(1.5, (x.p.mi || 0) * f)); if (x.p.type !== 'long') p.steps = [run(p.mi, x.p.type === 'recovery' ? 'REC' : 'E')]; p.changed = true; p.shin = true; p.note = 'Shortened to stay under your shin-load ceiling of ' + ceiling + ' mi this week.'; x.d.parts[x.i] = p; });
  w.tot = totals(w.days); w.shinCap = ceiling; return true;
}

/* Personal recovery profile: how many days your HRV and resting HR take to settle after each kind of session */
function recoveryProfile(garmin) {
  var days = (garmin && garmin.days) || {}, acts = (garmin && garmin.activities) || [];
  var kinds = { long: [], hard: [], lift: [] };
  acts.forEach(function (a) {
    if (!a.date) return;
    var k = a.strength ? 'lift' : a.run && (a.distM / MI_M >= 8 || (a.movS || 0) >= 5400) ? 'long' : a.run && (/TEMPO|THRESHOLD|VO2|ANAEROBIC|SPEED/.test(a.teLabel || '') || +a.te >= 3.5) ? 'hard' : null;
    if (k) kinds[k].push(a.date);
  });
  function base(d, key) { var v = []; for (var i = 1; i <= 7; i++) { var x = days[addD(d, -i)]; if (x && typeof x[key] === 'number') v.push(x[key]); } return v.length >= 3 ? mean(v) : null; }
  var out = {};
  Object.keys(kinds).forEach(function (k) {
    var rec = [], drops = [];
    kinds[k].slice(0, 40).forEach(function (d) {
      var bh = base(d, 'hrv'), br = base(d, 'rhr'); if (!bh) return;
      var n1 = days[addD(d, 1)]; if (n1 && typeof n1.hrv === 'number') drops.push((n1.hrv - bh) / bh);
      var back = null;
      for (var i = 1; i <= 4; i++) { var x = days[addD(d, i)]; if (!x || typeof x.hrv !== 'number') continue; if (x.hrv >= bh * 0.97 && (!br || typeof x.rhr !== 'number' || x.rhr <= br + 2)) { back = i; break; } }
      rec.push(back == null ? 4 : back);
    });
    if (rec.length) out[k] = { n: rec.length, days: round1(mean(rec)), hrvDrop: drops.length ? Math.round(mean(drops) * 100) : null };
  });
  return out;
}

/* Shift-aware week: move key sessions off work days, ease the day after nights.  st.shifts = { 'YYYY-MM-DD': 'day'|'night' } */
function applyShifts(w, shifts, zz, opts) {
  if (!shifts) return;
  var on = function (d) { return shifts[d.date]; }, hard = function (p) { return p.type === 'speed' || p.type === 'long'; };
  var hardDay = function (d) { return d.parts.some(hard); };
  w.days.forEach(function (d) {
    if (!on(d) || d.date < today()) return;
    d.shift = on(d);
    /* evening shift: the morning is free, so sessions stay; long runs are capped to finish well before work */
    if (on(d) === 'eve') {
      d.parts = d.parts.map(function (p) {
        if (!isRun(p)) return p;
        var q = p.type === 'long' && p.mi > 10 ? Object.assign(scaleRun(p, 10 / p.mi, zz), { changed: true }) : Object.assign({}, p);
        q.note = 'Evening shift today: do this in the morning' + (p.type === 'long' && p.mi > 10 ? ', capped at 10 mi so you are fresh for work.' : '.') + (p.note ? ' ' + p.note : '');
        return q;
      });
      return;
    }
    d.parts.forEach(function (p, i) {
      if (!hard(p)) return;
      var easyIdx = function (x) { return x.parts.findIndex(function (q) { return isRun(q) && !hard(q) && q.role !== 'gym'; }); };
      var cand = w.days.filter(function (x) { return !on(x) && x.date >= today() && x !== d && !hardDay(x) && !w.days.some(function (y) { return Math.abs(y.i - x.i) === 1 && y !== d && hardDay(y); }) && (easyIdx(x) >= 0 || !x.parts.some(isRun)); });
      /* prefer swapping with an easy run, then a day with no run at all; nearest first */
      cand.sort(function (a, b) { return ((easyIdx(a) >= 0 ? 0 : 10) + Math.abs(a.i - d.i)) - ((easyIdx(b) >= 0 ? 0 : 10) + Math.abs(b.i - d.i)); });
      var to = cand[0];
      /* nothing clean: a long run still beats a workout, so take a free day next to the workout and make the workout easy */
      if (!to && p.type === 'long') {
        var c2 = w.days.filter(function (x) { return !on(x) && x.date >= today() && x !== d && !x.parts.some(function (q) { return q.type === 'long'; }) && (easyIdx(x) >= 0 || !x.parts.some(isRun) || x.parts.some(function (q) { return q.type === 'speed'; })); });
        c2.sort(function (a, b) { return Math.abs(a.i - d.i) - Math.abs(b.i - d.i); });
        to = c2[0];
        if (to) w.days.forEach(function (y) { if (Math.abs(y.i - to.i) <= 1) y.parts = y.parts.map(function (q) { return q.type === 'speed' ? toEasy(q, 0.85, 'Easy run', 'Easy this week: the long run moved next to it because of your shifts.') : q; }); });
      }
      if (to) {
        var ei = to.parts.findIndex(function (x) { return isRun(x) && !hard(x) && x.role !== 'gym'; });
        var moved = Object.assign({}, p, { moved: p.moved || d.date, note: 'Moved off your ' + on(d) + ' shift.' });
        if (ei >= 0) { var ez = Object.assign({}, to.parts[ei], { moved: d.date, note: 'Swapped with your key session because of your ' + on(d) + ' shift.' }); to.parts[ei] = moved; d.parts[i] = ez; }
        else { to.parts = to.parts.filter(function (x) { return x.type !== 'rest'; }); to.parts.unshift(moved); d.parts[i] = restPart('Shift day', 'Your key session moved to ' + to.dow + '.'); }
      } else {
        var e = toEasy(p, p.type === 'long' ? 0.7 : 0.75, 'Short easy run', 'Shortened for your ' + on(d) + ' shift.'); d.parts[i] = e;
      }
    });
    d.parts = d.parts.map(function (p) { if (isRun(p) && !hard(p) && p.mi > 4 && on(d)) { var s = scaleRun(p, 0.75, zz); s.changed = true; s.note = 'Trimmed for your ' + on(d) + ' shift.'; s.steps = [run(s.mi, 'E')]; return s; } return p; });
    d.parts = d.parts.filter(function (p, i, a) { return p.type !== 'rest' || a.length === 1; });
  });
  /* weekends with a day shift are off: whatever is left there moves to a free weekday, or drops */
  if (opts && opts.weekendDayOff) w.days.forEach(function (d) {
    var wd = pd(d.date).getDay();
    if (on(d) !== 'day' || (wd !== 0 && wd !== 6) || d.date < today()) return;
    var left = d.parts.filter(function (p) { return p.type !== 'rest'; }), dropped = [];
    left.forEach(function (p) {
      var run = isRun(p), to = w.days.filter(function (x) {
        if (x === d || x.date < today() || (on(x) && on(x) !== 'eve')) return false;
        var xd = pd(x.date).getDay(); if ((xd === 0 || xd === 6) && on(x) === 'day') return false;
        return run ? !x.parts.some(isRun) && !w.days.some(function (y) { return Math.abs(y.i - x.i) === 0 && y.parts.some(function (q) { return q.type === 'long'; }); }) : !x.parts.some(function (q) { return q.type === 'strength'; }) && !w.days.some(function (y) { return y.i === x.i + 1 && y.parts.some(function (q) { return q.type === 'long'; }); });
      }).sort(function (a, b) { return Math.abs(a.i - d.i) - Math.abs(b.i - d.i); })[0];
      if (to) { to.parts = to.parts.filter(function (q) { return q.type !== 'rest'; }); to.parts.push(Object.assign({}, p, { moved: p.moved || d.date, note: 'Moved off your weekend day shift.' + (p.note ? ' ' + p.note : '') })); }
      else dropped.push(p.title);
    });
    d.parts = [restPart('Work day', 'Weekend day shift: no training today.' + (dropped.length ? ' Skipped this week: ' + dropped.join(', ') + '.' : ''))];
  });
  /* the day after a night shift: easy only */
  w.days.forEach(function (d) {
    var prev = addD(d.date, -1); if (shifts[prev] !== 'night' || d.date < today()) return;
    d.parts = d.parts.map(function (p) { return p.type === 'speed' ? toEasy(p, 0.8, 'Easy run', 'Easy today: you came off a night shift.') : p; });
  });
  w.tot = totals(w.days);
}

/* Chance of hitting a race goal: planned fitness on race day, discounted by consistency, with ~3% spread */
function normCdf(z) { var t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2), p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }
function goalOdds(plan, an, ev, garminPred) {
  var g = parseClock(ev && ev.goal); if (!(g > 0) || !an || !an.vNow) return null;
  var d = distOf(ev), rw = weekOf(plan, ev.date); if (!rw) return null;
  var vRace = rw.vPlan + (an.dvAt ? an.dvAt(ev.date) : 0), gain = vRace - (weekOf(plan, today()) || plan.weeks[0]).vPlan;
  var comp = plan.compliance ? (plan.compliance.level === 'verylow' ? 0.4 : plan.compliance.level === 'low' ? 0.7 : 1) : 1;
  var vExp = an.vNow + Math.max(0, gain) * comp, tExp = predict(vExp, d.mi);
  var gk = { '5k': 'k5', '10k': 'k10', half: 'half', full: 'full' }[d.key], gp = garminPred && gk && +garminPred[gk];
  if (gp && Math.abs(d.mi - DIST[d.key].mi) < 0.2) tExp = (tExp + gp * (tExp / predict(an.vNow, d.mi))) / 2;   /* blend with Garmin's own race predictor */
  var sd = tExp * (0.025 + 0.0004 * Math.max(0, diffD(today(), ev.date)) / 7);
  var p = normCdf((g - tExp) / sd);
  var need = []; if (comp < 1) need.push('hit most planned runs; consistency is the biggest lever'); if (p < 0.5) need.push('a 2–3% gain from threshold work and long runs would move this past 50%');
  return { p: Math.round(clamp(p, 0.03, 0.95) * 100), garmin: gp || null, expected: Math.round(tExp), goal: g, vRace: round1(vExp), weeks: Math.round(diffD(today(), ev.date) / 7), tips: need };
}

/* How well a run matched the workout: laps carry the watch's workout step index */
function execution(p, zz, laps) {
  if (!laps || !laps.length || !p || !p.steps) return null;
  var work = laps.filter(function (l) { return l.t > 20 && l.d > 50; });
  if (!work.length) return null;
  var rows = [], hitN = 0, tot = 0;
  work.forEach(function (l, i) {
    var pace = l.sp ? MI_M / l.sp : null, typ = String(l.type || '').toUpperCase();
    var zone = typ === 'WARMUP' || typ === 'COOLDOWN' || typ === 'RECOVERY' ? 'E' : null;
    if (!zone) { var st = p.steps.filter(function (s) { return s.k === 'run' || s.k === 'rep'; }); var s0 = st[Math.min(st.length - 1, Math.max(0, (l.step != null ? l.step : i) - 1))] || st[0]; zone = s0 ? s0.z : 'E'; }
    var tgt = zz && zz[zone], ok = null, off = null;
    if (tgt && pace && typ !== 'RECOVERY' && typ !== 'REST') { var slack = zone === 'E' || zone === 'REC' ? 20 : 6; ok = pace >= tgt[0] - slack && pace <= tgt[1] + slack; off = pace < tgt[0] ? Math.round(pace - tgt[0]) : pace > tgt[1] ? Math.round(pace - tgt[1]) : 0; if (typ === 'ACTIVE' || typ === 'INTERVAL' || !typ) { tot++; if (ok) hitN++; } }
    rows.push({ i: i + 1, type: typ || 'ACTIVE', zone: zone, mi: round1(l.d / MI_M), sec: Math.round(l.t), pace: pace ? Math.round(pace) : null, hr: l.hr, target: tgt || null, ok: ok, off: off, gscore: l.score });
  });
  var main = rows.filter(function (r) { return r.type !== 'WARMUP' && r.type !== 'COOLDOWN' && r.type !== 'RECOVERY' && r.type !== 'REST' && r.ok != null; });
  var fade = null;
  if (main.length >= 3) { var a = main.slice(0, Math.ceil(main.length / 2)), b = main.slice(Math.ceil(main.length / 2)); fade = Math.round(mean(b.map(function (r) { return r.pace; })) - mean(a.map(function (r) { return r.pace; }))); }
  return { score: tot ? Math.round(hitN / tot * 100) : null, hit: hitN, of: tot, rows: rows, fade: fade, garmin: mean(work.filter(function (l) { return l.score != null; }).map(function (l) { return l.score; })) };
}
/* Durability: aerobic decoupling over a long run (pace per heartbeat, second half vs first) */
function durability(laps) {
  var L = (laps || []).filter(function (l) { return l.t > 60 && l.hr && (l.gap || l.sp); });
  if (L.length < 6) return null;
  var h = Math.floor(L.length / 2), eff = function (a) { return mean(a.map(function (l) { return (l.gap || l.sp) / l.hr; })); };
  var e1 = eff(L.slice(0, h)), e2 = eff(L.slice(h));
  return { decouple: Math.round((e1 - e2) / e1 * 1000) / 10, laps: L.length };
}

/* Race-day pacing from a course: elev = feet per 0.1 mi. Even effort: uphill costs ~3.3% per 1% grade, downhill gives back ~1.8% (capped). */
function racePacing(distMi, goalSec, elev, heat) {
  var n = Math.ceil(distMi - 1e-6), segs = [];
  for (var m = 0; m < n; m++) {
    var len = Math.min(1, distMi - m), i0 = Math.round(m * 10), i1 = Math.min(elev ? elev.length - 1 : 0, Math.round((m + len) * 10));
    var up = 0, down = 0;
    if (elev && elev.length > 1) for (var j = i0 + 1; j <= i1; j++) { var dz = elev[j] - elev[j - 1]; if (dz > 0) up += dz; else down -= dz; }
    var grade = elev && elev.length > 1 ? (elev[i1] - elev[i0]) / (len * 5280) * 100 : 0;
    var f = 1 + (grade > 0 ? 0.033 * grade : Math.max(-0.08, 0.018 * grade));
    if (m < 2) f *= 1.005;   /* settle in: the first two miles a touch conservative */
    segs.push({ mile: m + 1, len: len, grade: Math.round(grade * 10) / 10, up: Math.round(up), down: Math.round(down), f: f });
  }
  var w = segs.reduce(function (a, s) { return a + s.f * s.len; }, 0), base = goalSec * (1 + (heat || 0)) / w, t = 0;
  segs.forEach(function (s) { s.pace = Math.round(base * s.f); s.sec = Math.round(base * s.f * s.len); t += s.sec; s.cum = t; });
  return { segs: segs, total: t, avgPace: Math.round(t / distMi), heat: heat || 0 };
}
/* Sleep target the night before: wake time minus sleep need, earlier before a hard day or after a short night */
function sleepTarget(needH, wakeMin, hardTomorrow, debtH) {
  var need = (needH || 8) + (hardTomorrow ? 0.25 : 0) + Math.min(1, Math.max(0, debtH || 0) / 2);
  var bed = wakeMin - Math.round(need * 60) - 15;
  bed = ((bed % 1440) + 1440) % 1440;
  return { bedMin: bed, needH: Math.round(need * 4) / 4 };
}


/* ---------- daylight: sunrise and sunset for a place (NOAA approximation), in local minutes after midnight ---------- */
function sunTimes(date, lat, lon) {
  if (lat == null || lon == null) return null;
  var d = pd(date), start = new Date(d.getFullYear(), 0, 1), doy = Math.round((d - start) / 864e5) + 1;
  var g = 2 * Math.PI / 365 * (doy - 1);
  var eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  var decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  var la = lat * Math.PI / 180;
  function ha(zen) { var c = Math.cos(zen * Math.PI / 180) / (Math.cos(la) * Math.cos(decl)) - Math.tan(la) * Math.tan(decl); return c > 1 || c < -1 ? null : Math.acos(c) * 180 / Math.PI; }
  var off = -new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12).getTimezoneOffset();
  function at(h, sign) { return h == null ? null : Math.round(720 - 4 * (lon + sign * h) - eq + off); }
  var h0 = ha(90.833), h6 = ha(96);
  return { rise: at(h0, 1), set: at(h0, -1), dawn: at(h6, 1), dusk: at(h6, -1) };
}
function clockMin(m) { if (m == null) return '–'; var h = Math.floor(m / 60) % 24, mm = m % 60; return (h % 12 || 12) + ':' + (mm < 10 ? '0' : '') + mm + ' ' + (h < 12 ? 'AM' : 'PM'); }
/* Runs that would happen in the dark become treadmill runs (after a day shift) or get a "finish before sunset" note.
   prefs.darkRun: false = daylight only; prefs.runHour: usual training hour; prefs.commute: minutes; st.shiftEnds: {date: minutes} */
function applyDaylight(w, st, zz) {
  var pr = (st && st.prefs) || {}, L = pr.loc; if (!L || pr.darkRun !== false) return;
  var sh = st.shiftsAll || st.shifts || {}, ends = st.shiftEnds || {}, commute = +pr.commute || 40;
  w.days.forEach(function (d) {
    if (d.date < today()) return;
    var sun = sunTimes(d.date, L.lat, L.lon); if (!sun || sun.set == null) return;
    var kind = sh[d.date];
    d.parts = d.parts.map(function (p) {
      if (!isRun(p) || p.treadmill || p.type === 'race') return p;
      var mins = Math.round((p.mi || 3) * 10);
      if (kind === 'day') {
        var start = (ends[d.date] || 930) + commute;
        if (start + 30 + mins > sun.set - 20) return Object.assign({}, p, { treadmill: true, changed: true, dark: true, note: 'Treadmill after work: it’s dark by ' + clockMin(sun.set) + '. Set a 1% incline. ' + (p.note || '') });
        return Object.assign({}, p, { note: 'After work, finish by sunset (' + clockMin(sun.set) + '). ' + (p.note || '') });
      }
      if (kind === 'eve' || kind === 'night') return p;
      var h = pr.runHour == null ? 17 : +pr.runHour, t0 = h * 60;
      if (t0 + mins > sun.set - 20 || t0 < sun.rise) return Object.assign({}, p, { daylight: true, note: 'Daylight runs only: ' + (t0 < sun.rise ? 'sunrise is ' + clockMin(sun.rise) : 'sunset is ' + clockMin(sun.set)) + ', so go between ' + clockMin(sun.rise + 15) + ' and ' + clockMin(sun.set - mins) + ', or use the treadmill. ' + (p.note || '') });
      return p;
    });
  });
}

/* ---------------- exports ---------------- */
var api = {
  MI_M: MI_M, DOW: DOW, DOW_LONG: DOW_LONG, DIST: DIST, METHODS: METHODS, STATUS: STATUS, LIFT: LIFT, LIFT_VARS: LIFT_VARS, liftVar: liftVar, liftMod: liftMod, LIFT_PHASES: LIFT_PHASES, ZONE_NAME: ZONE_NAME,
  ds: ds, pd: pd, addD: addD, dow: dow, monday: monday, diffD: diffD, today: today, fmtDate: fmtDate,
  clamp: clamp, round1: round1, half: half, mean: mean, clock: clock, fmtPace: fmtPace, parseClock: parseClock,
  vdotOf: vdotOf, paceAt: paceAt, predict: predict, zones: zones, distOf: distOf, goalVdot: goalVdot, vdotFromEasy: vdotFromEasy,
  suggestMethods: suggestMethods, historyStats: historyStats, defaultProfile: defaultProfile, generate: generate, layoutWeek: layoutWeek, adapt: adapt, isRun: isRun,
  sunTimes: sunTimes, clockMin: clockMin, applyDaylight: applyDaylight, heatPct: heatPct, heatZones: heatZones, winterCheck: winterCheck, weeklyMiles: weeklyMiles, shinLoad: shinLoad, capWeek: capWeek, recoveryProfile: recoveryProfile, applyShifts: applyShifts, goalOdds: goalOdds, execution: execution, durability: durability, racePacing: racePacing, sleepTarget: sleepTarget, normCdf: normCdf,
  analyze: analyze, compliance: compliance, weekIntensity: weekIntensity, partKey: partKey, sessionAlternatives: sessionAlternatives, missedThisWeek: missedThisWeek, restDayOffer: restDayOffer, loadFocus: loadFocus, setWeekStart: setWeekStart, rotateProfile: rotateProfile, DOW_ABS: DOW_ABS, DOW_LONG_ABS: DOW_LONG_ABS, fitnessReadings: fitnessReadings, latestReading: latestReading, ltSpeedToPace: ltSpeedToPace, matchGarmin: matchGarmin, readiness: readiness, recommend: recommend, nutrition: nutrition, liftAdvice: liftAdvice,
  weekOf: weekOf, dayAt: dayAt, LADDER: LADDER, partOn: partOn, zonesFor: zonesFor, describe: describe, structure: structure, estMinutes: estMinutes, stepMiles: stepMiles,
  fitItems: fitItems, workoutFile: workoutFile, workoutFit: workoutFit, zipFiles: zipFiles, fitCrc: fitCrc, flattenSteps: flattenSteps,
  loadMiles: loadMiles, vdotFromThreshold: vdotFromThreshold, vdotFromVo2: vdotFromVo2, hrZones: hrZones, checkinFor: checkinFor, maxHrSeen: maxHrSeen, weekStatuses: weekStatuses, liftRotation: liftRotation
};
/* Calendar shifts go through a review: st.calAck holds what you accepted per date ("day" / "eve" / "night",
   "none" for no shift, or "x:<type>" for a shift you chose not to plan around). With prefs.calAuto the
   calendar applies straight away. calShifts(cal, st, today) -> { applied, proposed, pending: [{date, from, to}] } */
api.calShifts = function (cal, st, today) {
  var c = (cal && cal.shifts) || {}, ack = st.calAck || {}, mine = st.shifts || {}, auto = !!(st.prefs || {}).calAuto;
  var applied = {}, proposed = {}, pending = [], dates = {};
  Object.keys(c).concat(Object.keys(ack)).forEach(function (d) { dates[d] = 1; });
  Object.keys(dates).sort().forEach(function (d) {
    var now = c[d] || 'none', a = ack[d];
    if (now !== 'none') proposed[d] = now;
    var use;
    if (auto || d < today) use = now;
    else if (a == null) use = 'none';
    else use = /^x:/.test(a) ? 'none' : a;
    if (use !== 'none') applied[d] = use;
    var seen = a === now || a === 'x:' + now || (a == null && now === 'none');
    if (!auto && d >= today && !seen && !mine[d]) pending.push({ date: d, from: a == null || /^x:/.test(a) ? 'none' : a, to: now });
  });
  [applied, proposed].forEach(function (o) { Object.keys(mine).forEach(function (d) { if (mine[d] === 'off') delete o[d]; else o[d] = mine[d]; }); });
  return { applied: applied, proposed: proposed, pending: pending };
};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.ENGINE = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
