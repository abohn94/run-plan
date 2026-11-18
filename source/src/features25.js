/* ================= Coach-grade metrics, computed from data the app already has =================
   Session effort load, monotony and strain, miles at each intensity, time in heart-rate zones, HRV stability,
   durability, critical speed, long-run share and weekly ramp, power efficiency, climbing, respiration,
   left/right balance, the daily wellness score and bloodwork. Charts and plain explanations live in Progress. */
var CM = {};   /* this render's cache */
function cmKey() { return (st().updatedAt || '') + '|' + ((Store.garmin || {}).updated || '') + '|' + ((GX() || {}).updated || '') + '|' + App.today; }
function cm(name, fn) { var k = cmKey(); if (CM._k !== k) { CM = { _k: k }; } if (!(name in CM)) { try { CM[name] = fn(); } catch (e) { console.warn(name, e); CM[name] = null; } } return CM[name]; }
function wkStart(d) { return E.monday(d); }
function lastWeeks(n) { var out = [], s = wkStart(App.today); for (var i = n - 1; i >= 0; i--) out.push(E.addD(s, -7 * i)); return out; }
function sd(a) { if (a.length < 2) return 0; var m = a.reduce(function (x, y) { return x + y; }, 0) / a.length; return Math.sqrt(a.reduce(function (t, v) { return t + (v - m) * (v - m); }, 0) / a.length); }
function avg(a) { a = a.filter(function (v) { return v != null && !isNaN(v); }); return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }

/* ---------- daily training load (Garmin's exercise load; estimated where Garmin has none) ---------- */
function loadOf(a) { return a.g && a.g.load ? +a.g.load : a.kind === 'run' ? (a.mi || 0) * 10 : a.kind === 'lift' ? 30 : a.kind === 'other' ? Math.min(30, (a.sec || 0) / 120) : 0; }
function dailyLoads(days) {
  return cm('dl' + days, function () {
    var by = {}, from = E.addD(App.today, -days);
    activities().forEach(function (a) { if (a.date > from && a.date <= App.today) by[a.date] = (by[a.date] || 0) + loadOf(a); });
    return by;
  });
}
/* ---------- 1. session effort load: your 1-10 effort × minutes ---------- */
function rpeOf(a) { var l = a.log || {}; return +l.rpe || (a.g && a.g.rpe ? (+a.g.rpe > 10 ? a.g.rpe / 10 : +a.g.rpe) : 0) || 0; }
function sessMin(a) { return a.sec ? a.sec / 60 : (a.log && (+a.log.min || (+a.log.sec || 0) / 60)) || 0; }
function weekEffort(ws) {
  var we = E.addD(ws, 6), srpe = 0, gl = 0, n = 0, rated = 0;
  activities().forEach(function (a) { if (a.date < ws || a.date > we || a.date > App.today) return; var r = rpeOf(a), m = sessMin(a); if (a.kind === 'run' || a.kind === 'lift') { n++; gl += loadOf(a); if (r && m) { srpe += r * m; rated++; } } });
  return { ws: ws, srpe: Math.round(srpe), garmin: Math.round(gl), n: n, rated: rated };
}
/* ---------- 2. monotony and strain (Foster): how alike your days are, and the week's load × that ---------- */
function monoAt(end) {
  var by = dailyLoads(120), L = [];
  for (var i = 6; i >= 0; i--) L.push(by[E.addD(end, -i)] || 0);
  var tot = L.reduce(function (x, y) { return x + y; }, 0), m = tot / 7, s = sd(L);
  return { end: end, load: Math.round(tot), mono: tot ? (s ? m / s : 3) : 0, strain: tot ? Math.round(tot * (s ? m / s : 3)) : 0 };
}
function monoSeries() { return cm('mono', function () { return lastWeeks(12).map(function (ws) { var end = E.addD(ws, 6); return monoAt(end > App.today ? App.today : end); }); }); }
/* ---------- 3. miles at each intensity, from laps against your pace zones ---------- */
var ZK = ['E', 'M', 'T', 'I', 'R'], ZN = { E: 'Easy', M: 'Marathon pace', T: 'Threshold', I: 'Interval', R: 'Repetition' }, ZC = { E: 'var(--green)', M: 'var(--gold)', T: 'var(--amber)', I: 'var(--red)', R: 'var(--violet)' };
function zoneOfPace(pc, zz) {
  if (!zz || !pc) return 'E';
  var r = zz.R && zz.R[1], i = zz.I && zz.I[1], t = zz.T && zz.T[1], m = zz.M && zz.M[1];
  if (r && pc <= r + 5) return 'R'; if (i && pc <= i + 5) return 'I'; if (t && pc <= t + 8) return 'T'; if (m && pc <= m + 8) return 'M'; return 'E';
}
function weekIntensity(ws) {
  var we = E.addD(ws, 6), out = { ws: ws, E: 0, M: 0, T: 0, I: 0, R: 0, fromLaps: 0, runs: 0 };
  activities().forEach(function (a) {
    if (a.kind !== 'run' || a.date < ws || a.date > we || a.date > App.today) return; out.runs++;
    var laps = a.g && a.g.id ? lapsFor(a.g.id) : null, zz = _zonesAt7(a.date);
    if (laps && laps.length) { out.fromLaps++; laps.forEach(function (l) { if (!(l.d > 0) || !(l.sp > 0)) return; var z = /RECOVERY|REST|WARMUP|COOLDOWN/.test(l.type || '') ? 'E' : zoneOfPace(E.MI_M / (l.gap || l.sp), zz); out[z] += l.d / E.MI_M; }); }
    else out[a.ptype === 'speed' ? 'T' : 'E'] += a.mi || 0;   /* no laps: a key workout counts as threshold, anything else easy */
  });
  ZK.forEach(function (k) { out[k] = Math.round(out[k] * 10) / 10; });
  out.tot = ZK.reduce(function (t, k) { return t + out[k]; }, 0); out.hard = out.T + out.I + out.R;
  return out;
}
/* ---------- 4. time in heart-rate zones, week by week (Garmin's zone times; average heart rate where a run has none) ---------- */
function zoneTimes(a) {
  var z = (GX().zones || {})[String(a.g && a.g.id)], s = a.g && a.g.id && SERIES[String(a.g.id)];
  if (z && z.length) return { t: z, exact: true };
  if (s && s.sum && s.sum.hrZ) { var t = [0, 0, 0, 0, 0]; s.sum.hrZ.forEach(function (x) { if (x.z >= 1 && x.z <= 5) t[x.z - 1] = x.s || 0; }); return { t: t, exact: true }; }
  var hr = a.hr || (a.g && a.g.avgHR), lo = zoneLows(); if (!hr || !lo || !a.sec) return null;
  var zi = 0; for (var i = 0; i < lo.length; i++) if (hr >= lo[i]) zi = i;
  var t2 = [0, 0, 0, 0, 0]; t2[zi] = a.sec; return { t: t2, exact: false };
}
function zoneLows() {
  return cm('zl', function () {
    var x = GX().zoneLows; if (x && x.length === 5) return x;
    var found = null; Object.keys(SERIES).forEach(function (k) { var s = SERIES[k]; if (!found && s && s.sum && s.sum.hrZ && s.sum.hrZ.length === 5) found = s.sum.hrZ.map(function (z) { return z.lo; }); });
    if (found) return found;
    /* Garmin's default zones: 50/60/70/80/90% of your highest recorded heart rate */
    var mx = 0; try { mx = E.maxHrSeen ? +E.maxHrSeen(Store.garmin) || 0 : 0; } catch (e) { mx = 0; }
    if (!mx) ((Store.garmin && Store.garmin.activities) || []).forEach(function (a) { if (a.run && a.maxHR > mx) mx = a.maxHR; });
    return mx ? [0.5, 0.6, 0.7, 0.8, 0.9].map(function (f) { return Math.round(mx * f); }) : null;
  });
}
/* "easy" for 80/20: below your plan's easy heart-rate ceiling (from your lactate threshold) when it's known, else Garmin's zone 2 */
function easyCapHR() { var zz = _zonesAt7(App.today), lo = zoneLows(); return zz && zz.hr && zz.hr.E ? zz.hr.E[1] : lo ? lo[2] - 1 : null; }
function easyShareOf(t) {
  var tot = t.reduce(function (x, y) { return x + y; }, 0), lo = zoneLows(), cap = easyCapHR(); if (!tot) return null;
  var fr = 0; if (lo && cap) { for (var i = 0; i < 4; i++) if (cap >= lo[i]) { var top = lo[i + 1] || lo[i] + 20; fr = i + Math.min(1, Math.max(0, (cap + 1 - lo[i]) / (top - lo[i]))); } } else fr = 2;
  var easy = 0; t.forEach(function (s, i) { easy += s * Math.max(0, Math.min(1, fr - i)); });
  return easy / tot;
}
function weekZones(ws) {
  var we = E.addD(ws, 6), t = [0, 0, 0, 0, 0], exact = 0, n = 0;
  activities().forEach(function (a) { if (a.kind !== 'run' || a.date < ws || a.date > we || a.date > App.today) return; var z = zoneTimes(a); if (!z) return; n++; if (z.exact) exact++; z.t.forEach(function (s, i) { t[i] += s; }); });
  var tot = t.reduce(function (x, y) { return x + y; }, 0);
  return { ws: ws, t: t, tot: tot, low: tot ? easyShareOf(t) : null, mid: tot ? t[2] / tot : null, high: tot ? (t[3] + t[4]) / tot : null, exact: exact, n: n };
}
/* ---------- 5. HRV stability: the 7-day average and how much it swings, against your own normal ---------- */
function hrvDaily() {
  return cm('hrvd', function () {
    var d = (Store.garmin && Store.garmin.days) || {}, x = GX().hrv || {}, out = [];
    for (var i = 89; i >= 0; i--) { var k = E.addD(App.today, -i), v = (d[k] && d[k].hrv) || (x[k] && x[k].last); if (v) out.push({ d: k, v: +v }); }
    return out;
  });
}
function hrvStability() {
  return cm('hrvs', function () {
    var D = hrvDaily(); if (D.length < 10) return null;
    var by = {}; D.forEach(function (p) { by[p.d] = Math.log(p.v); });
    var roll = [];
    for (var i = 59; i >= 0; i--) {
      var end = E.addD(App.today, -i), w = []; for (var j = 0; j < 7; j++) { var v = by[E.addD(end, -j)]; if (v != null) w.push(v); }
      if (w.length >= 4) { var m = avg(w); roll.push({ d: end, mean: Math.exp(m), cv: sd(w) / m * 100 }); }
    }
    if (roll.length < 7) return null;
    var base = roll.slice(0, -7), bm = avg(base.map(function (r) { return Math.log(r.mean); })), bs = sd(base.map(function (r) { return Math.log(r.mean); })) || 0.04, bcv = avg(base.map(function (r) { return r.cv; }));
    var now = roll[roll.length - 1];
    var low = Math.exp(bm - bs), high = Math.exp(bm + bs);
    var below = roll.slice(-4).filter(function (r) { return r.mean < low; }).length;
    return { roll: roll, now: now, normLo: low, normHi: high, baseCV: bcv, belowDays: below, unsettled: bcv && now.cv > bcv * 1.5 && now.cv > 3, suppressed: below >= 3, elevatedLow: now.mean > high };
  });
}
/* ---------- 6. durability: heart-rate drift on runs of an hour or more ---------- */
function durabilitySeries() {
  return cm('dur', function () {
    var out = [];
    activities().forEach(function (a) {
      if (a.kind !== 'run' || !a.g || !a.g.id || (a.sec || 0) < 3300 || a.date > App.today) return;
      var l = lapsFor(a.g.id), du = null; try { du = l ? E.durability(l) : null; } catch (e) { du = null; }
      if (du && du.decouple != null) out.push({ d: a.date, v: du.decouple, mi: a.mi, key: a.key });
    });
    return out.sort(function (x, y) { return x.d < y.d ? -1 : 1; });
  });
}
/* ---------- 7. critical speed: the pace you could hold for about 30-40 minutes, from your best efforts ---------- */
var BEST_M = { '1k': 1000, '1mi': 1609.344, '5k': 5000, '10k': 10000, half: 21097.5 };
function critSpeed(end, days) {
  end = end || App.today; days = days || 120;
  var best = {};
  ((Store.garmin && Store.garmin.activities) || []).forEach(function (a) {
    if (!a.run || !a.best || a.date > end || E.diffD(a.date, end) > days) return;
    Object.keys(BEST_M).forEach(function (k) { var t = +a.best[k]; if (t > 0 && (!best[k] || t < best[k].t)) best[k] = { t: t, d: BEST_M[k], date: a.date }; });
  });
  var pts = Object.keys(best).map(function (k) { return best[k]; }).filter(function (p) { return p.t >= 120 && p.t <= 2700; });
  if (pts.length < 2 || Math.max.apply(null, pts.map(function (p) { return p.t; })) / Math.min.apply(null, pts.map(function (p) { return p.t; })) < 2) return null;
  var n = pts.length, mt = avg(pts.map(function (p) { return p.t; })), md = avg(pts.map(function (p) { return p.d; }));
  var num = pts.reduce(function (s, p) { return s + (p.t - mt) * (p.d - md); }, 0), den = pts.reduce(function (s, p) { return s + (p.t - mt) * (p.t - mt); }, 0);
  if (!den) return null;
  var cs = num / den, dp = md - cs * mt;
  if (!(cs > 2 && cs < 7)) return null;
  return { cs: cs, pace: E.MI_M / cs, dprime: Math.max(0, Math.round(dp)), pts: pts, end: end };
}
function csSeries() { return cm('css', function () { var out = []; for (var i = 5; i >= 0; i--) { var end = E.addD(App.today, -30 * i), c = critSpeed(end, 120); if (c) out.push({ d: end, pace: c.pace, cs: c.cs }); } return out; }); }
/* ---------- 8. long-run share and the weekly mileage jump ---------- */
function weekRunStats(ws) {
  var we = E.addD(ws, 6), tot = 0, long = 0, climb = 0, n = 0;
  activities().forEach(function (a) { if (a.kind !== 'run' || a.date < ws || a.date > we || a.date > App.today) return; n++; tot += a.mi || 0; long = Math.max(long, a.mi || 0); climb += (a.g && a.g.elevM) || 0; });
  return { ws: ws, mi: Math.round(tot * 10) / 10, long: Math.round(long * 10) / 10, share: tot ? long / tot : null, climbFt: Math.round(climb * 3.28084), n: n };
}
function weekRunSeries(n) { return cm('wrs' + n, function () { var W = lastWeeks(n).map(weekRunStats); W.forEach(function (w, i) { w.ramp = i && W[i - 1].mi >= 3 ? (w.mi - W[i - 1].mi) / W[i - 1].mi : null; }); return W; }); }
/* ---------- 9. power efficiency: speed per watt per kilogram on easy runs ---------- */
function powerEff() {
  return cm('pe', function () {
    var kg = (typeof bio === 'function' ? bio().kg : null) || +((st().profile || {}).weightKg) || null; if (!kg) return [];
    var out = [];
    activities().forEach(function (a) { var g = a.g || {}; if (a.kind !== 'run' || !g.pwr || !(g.distM > 1500) || a.date > App.today || !(a.ptype === 'easy' || a.ptype === 'long' || a.ptype === 'recovery' || !a.ptype)) return; var v = g.distM / (g.movS || g.durS); out.push({ d: a.date, v: v / (g.pwr / kg), tread: /treadmill|indoor/i.test(g.type + ' ' + g.name) }); });
    return out.sort(function (x, y) { return x.d < y.d ? -1 : 1; }).slice(-30);
  });
}
/* ---------- 10. respiration and left/right balance, when Garmin reports them ---------- */
function runExtras() {
  return cm('rx', function () {
    var resp = [], bal = [];
    Object.keys(SERIES).forEach(function (k) { var s = SERIES[k]; if (!s || !s.sum) return; Object.keys(s.sum).forEach(function (f) { var v = +s.sum[f]; if (!v) return; if (/respiration/i.test(f) && /avg/i.test(f)) resp.push({ d: s.date, v: v }); if (/balance/i.test(f) && v > 40 && v < 60) bal.push({ d: s.date, v: v }); }); });
    return { resp: resp.sort(function (x, y) { return x.d < y.d ? -1 : 1; }), bal: bal.sort(function (x, y) { return x.d < y.d ? -1 : 1; }) };
  });
}
/* ---------- the daily wellness score (sleep, energy, soreness, stress, mood, motivation) ---------- */
function wellnessOf(c) {
  if (!c) return null;
  var p = [];
  if (c.feel != null) p.push((c.feel - 1) / 4);
  if (c.sleepQ != null) p.push((c.sleepQ - 1) / 4); else if (c.sleep != null) p.push((c.sleep - 1) / 3);
  if (c.sore != null) p.push(c.soreQ != null ? (5 - c.soreQ) / 4 : (2 - c.sore) / 2);
  if (c.stress != null) p.push(c.stressQ != null ? (5 - c.stressQ) / 4 : (3 - c.stress) / 2);
  if (c.mood != null) p.push((c.mood - 1) / 4);
  if (c.motiv != null) p.push((c.motiv - 1) / 4);
  if (c.pain) p.push(0.25); if (c.ill) p.push(0);
  return p.length ? Math.round(avg(p) * 100) : null;
}
function wellnessSeries() {
  return cm('wel', function () { return (st().checkins || []).filter(function (c) { return E.diffD(c.date, App.today) <= 90 && c.date <= App.today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (c) { return { d: c.date, v: wellnessOf(c), c: c }; }).filter(function (x) { return x.v != null; }); });
}
function wellnessNorm() {
  var W = wellnessSeries(), past = W.filter(function (x) { return E.diffD(x.d, App.today) >= 1 && E.diffD(x.d, App.today) <= 28; });
  return past.length >= 5 ? { mean: avg(past.map(function (x) { return x.v; })), sd: sd(past.map(function (x) { return x.v; })) || 8 } : null;
}
/* ---------- bloodwork ---------- */
var BLOOD = [['ferritin', 'Ferritin', 'ng/mL', 35, null, 'Iron stores. Runners lose iron through sweat and foot-strike; below about 30–35 many sports doctors treat it as low, even when "in range".'],
  ['vitd', 'Vitamin D (25-OH)', 'ng/mL', 30, 100, 'Bone health and stress-fracture risk. Minnesota winters drop it; under 30 is insufficient.'],
  ['hgb', 'Hemoglobin', 'g/dL', 13.5, null, 'Oxygen carrying. Low hemoglobin feels like a heavy, flat engine at any pace. (For women the low line is about 12.)']];
function bloodLatest() { var L = (st().blood || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }); return L[0] || null; }
function bloodLow(b) { if (!b) return []; var sex = (st().profile || {}).sex; return BLOOD.filter(function (m) { var v = +b[m[0]], lo = m[0] === 'hgb' && sex === 'F' ? 12 : m[3]; return v > 0 && v < lo; }); }

App.p25 = { monoAt: monoAt, monoSeries: monoSeries, weekEffort: weekEffort, weekIntensity: weekIntensity, weekZones: weekZones, hrvStability: hrvStability, durabilitySeries: durabilitySeries, critSpeed: critSpeed, csSeries: csSeries, weekRunSeries: weekRunSeries, powerEff: powerEff, runExtras: runExtras, wellnessSeries: wellnessSeries, wellnessNorm: wellnessNorm };
