#!/usr/bin/env node
/* Works out today's sessions from your plan (the same engine the app uses) and writes a plain description
   of each one for scripts/garmin_workouts.py to turn into Garmin workouts.
   Usage: node scripts/watch_plan.js <path to engine.built.js> [YYYY-MM-DD] > spec.json            */
'use strict';
const fs = require('fs');
const state = JSON.parse(fs.readFileSync('user/state.json', 'utf8'));
let garmin = null, extra = null;
try { garmin = JSON.parse(fs.readFileSync('garmin/data.json', 'utf8')); } catch (e) { garmin = null; }
try { extra = JSON.parse(fs.readFileSync('garmin/extra.json', 'utf8')); } catch (e) { extra = null; }
/* work shifts from Google Calendar, with your own taps winning ("off" clears one) */
try {
  const cal = JSON.parse(fs.readFileSync('garmin/calendar.json', 'utf8')), all = Object.assign({}, cal.shifts || {}), mine = state.shifts || {};
  Object.keys(mine).forEach((d) => { if (mine[d] === 'off') delete all[d]; else all[d] = mine[d]; });
  state.shiftsAll = all;
  state.shiftEnds = cal.ends || {};
} catch (e) { /* no calendar connected */ }
/* same merge as the app: Garmin's own threshold and load balance */
if (garmin && extra) {
  garmin.fitness = garmin.fitness || {};
  Object.keys(extra.ltHistory || {}).forEach((d) => { const r = extra.ltHistory[d]; if (r.pace) { garmin.fitness.ltSpeed = garmin.fitness.ltSpeed || {}; garmin.fitness.ltSpeed[d] = 1609.344 / r.pace; } if (r.hr) { garmin.fitness.ltHr = garmin.fitness.ltHr || {}; garmin.fitness.ltHr[d] = r.hr; } });
  if (extra.balance) garmin.fitness.trainingStatus = { loads: extra.balance.loads, targets: extra.balance.targets, status: extra.status && extra.status.phrase, balance: extra.balance.phrase };
}

const prefs = state.prefs || {};
const TZ = (prefs.notify && prefs.notify.tz) || (prefs.watch && prefs.watch.tz) || 'America/Chicago';
process.env.TZ = TZ;   /* the engine's idea of "today" follows your time zone, not the server's */
const E = require(require('path').resolve(process.argv[2]));
function localDate(d) { return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); }
const date = process.argv[3] || localDate(new Date());
const out = { date: date, tz: TZ, on: !!(prefs.watch && prefs.watch.on), workouts: [] };
if (!state.profile) { process.stdout.write(JSON.stringify(out)); process.exit(0); }

const plan = E.generate(state);
E.adapt(plan, state, E.analyze(plan, state, garmin));
const w = E.weekOf(plan, date);
const day = w ? w.days[E.dow(date)] : null;
let zz = w ? w.zonesAdj : null;
const MI = 1609.344;
const [y, m, d] = date.split('-');
const label = (+m) + '/' + (+d) + '/' + y.slice(2);

/* ---------- runs ---------- */
function paceOf(z) { const p = zz && zz[z]; return p && p[0] && p[1] ? [p[1], p[0]] : null; }   /* [slow, fast] seconds per mile */
/* steps are time-based with a pace goal: a distance becomes the time it takes at the middle of the pace range */
function mid(z) { const p = zz && zz[z || 'E']; return p ? (p[0] + p[1]) / 2 : 600; }
function roundSec(t) { return t >= 300 ? Math.round(t / 60) * 60 : Math.max(15, Math.round(t / 15) * 15); }
function timed(o, z, keepDist) {
  if (keepDist || !o || o.m == null) return o;
  const r = Object.assign({}, o); r.s = roundSec(o.m / MI * mid(z)); delete r.m; return r;
}
function len(o) { if (!o) return { lap: true }; if (o.mi != null) return o.mi > 0 ? { m: Math.round(o.mi * MI) } : { lap: true }; if (o.m != null) return { m: o.m }; if (o.min != null) return { s: o.min * 60 }; if (o.sec != null) return { s: o.sec }; return { lap: true }; }
function runSteps(p) {
  const steps = [];
  (p.steps || []).forEach((s) => {
    if (s.k === 'wu') steps.push(Object.assign({ kind: 'warmup', pace: paceOf('E') }, timed(len(s), 'E')));
    else if (s.k === 'cd') steps.push(Object.assign({ kind: 'cooldown', pace: paceOf('E') }, timed(len(s), 'E')));
    else if (s.k === 'run') steps.push(Object.assign({ kind: 'run', pace: paceOf(s.z), desc: s.label || '' }, timed(len(s), s.z === 'F' ? 'T' : s.z, s.race)));
    else if (s.k === 'rep') steps.push({ kind: 'repeat', n: s.n, work: Object.assign({ pace: paceOf(s.z), desc: s.effort || '' }, timed(len(s.work), s.z === 'F' ? 'T' : s.z)), rec: Object.assign({ desc: s.rec && s.rec.walk ? 'walk' : 'easy jog' }, timed(len(s.rec), 'E')) });
  });
  return steps;
}

/* ---------- lifts: power, main lifts and finishers only (no warm-up or stretches) ---------- */
function rxParse(rx) { const m = /(\d+)\s*[×x]\s*(\d+)/.exec(String(rx || '')); return m ? { sets: +m[1], reps: +m[2] } : null; }
function restSec(s) { s = String(s || ''); let m = /(\d+):(\d{2})/.exec(s); if (m) return +m[1] * 60 + +m[2]; m = /(\d+)\s*s\b/.exec(s); if (m) return +m[1]; m = /(\d+)\s*min/.exec(s); if (m) return +m[1] * 60; return 0; }
function setsOf(e) {
  if (!e) return [];
  if (Array.isArray(e.s)) return e.s.filter((x) => x && (+x.w > 0 || +x.r > 0));
  if (e.w != null || e.reps != null) { const n = Math.max(1, +e.sets || 1), a = []; for (let i = 0; i < n; i++) a.push({ w: +e.w || 0, r: +e.reps || 0 }); return a; }
  return [];
}
const LOWER = /squat|deadlift|lunge|leg press|hip thrust|rdl|romanian|step.?up|calf|glute bridge|good morning|hamstring|trap bar/i, DBELL = /dumbbell|\bdb\b|kettlebell/i;
function round5(x, inc) { inc = inc || 5; return Math.round(x / inc) * inc; }
/* same rule as the app's "Next step" box: add weight after hitting every rep, hold in light phases, reset after stalling */
function suggestLb(n, rx, lp) {
  const logs = state.logs || {}, h = [];
  Object.keys(logs).sort().forEach((dd) => { if (dd >= date) return; const l = logs[dd].lift; if (l && l.ex && l.ex[n]) { const ss = setsOf(l.ex[n]); if (ss.length) h.push({ date: dd, sets: ss }); } });
  if (!h.length) return null;
  const tg = rxParse(rx) || { sets: 3, reps: 8 };
  const last = h[h.length - 1], topW = last.sets.reduce((a, s) => Math.max(a, +s.w || 0), 0);
  if (!topW) return null;
  let inc = DBELL.test(n) ? 5 : LOWER.test(n) ? 10 : 5; if (topW < 40) inc = Math.min(inc, 5);
  const ok = (sets, w) => { const t = sets.filter((s) => +s.w === w); return t.length >= tg.sets && t.every((s) => +s.r >= tg.reps); };
  const top = last.sets.filter((s) => +s.w === topW), hit = ok(last.sets, topW), crushed = hit && top.every((s) => +s.r >= tg.reps + 2);
  const lastRpe = (logs[last.date].lift || {}).rpe;
  let stuck = 0; for (let i = h.length - 1; i >= 0; i--) { const tw = h[i].sets.reduce((a, s) => Math.max(a, +s.w || 0), 0); if (tw === topW && !ok(h[i].sets, tw)) stuck++; else break; }
  if (lp >= 2) return topW;
  if (hit && lastRpe && lastRpe >= 9) return topW;
  if (hit) return topW + (crushed ? inc * 2 : inc);
  if (stuck >= 2) return round5(topW * 0.9, inc === 10 ? 5 : 2.5);
  return topW;
}
function liftSpec(p) {
  const mod = E.liftMod(p.key, p.v, p.mix), lp = p.lp || 0, subs = state.subs || {}, list = [];
  mod.blocks.forEach((b) => {
    if (/stretch|mobility|warm/i.test(b.t)) return;
    b.ex.forEach((x) => {
      if (x.wu) return;
      const n = subs[x.n] || x.n, rx = x.rx[lp] || x.rx[0], tg = rxParse(rx);
      const per = /\/(side|leg|arm)/.exec(rx), timed = /\d+\s*[×x]\s*(\d+)\s*s\b/.exec(rx), dist = /\d+\s*[×x]\s*\d+\s*m\b/.test(rx);
      const e = { name: n, block: b.t, sets: tg ? tg.sets : (+(/^(\d+)/.exec(rx) || [])[1] || 3), rest: restSec(x.rest && x.rest[lp]) || (/power/i.test(b.t) ? 60 : 90), note: rx + (x.cue ? '. ' + x.cue : '') };
      if (timed) e.sec = +timed[1]; else if (dist || !tg) e.lap = true; else e.reps = tg.reps;
      if (per) e.per = per[1];
      const lb = suggestLb(n, rx, lp); if (lb) e.lb = lb;
      list.push(e);
    });
  });
  return { name: mod.name, exercises: list };
}

async function heat() {
  const L = prefs.loc; if (!L || prefs.heatAdj === false || !zz) return 0;
  const race = (state.events || []).filter((e) => e.date === date)[0];
  const hr = race ? +(race.hour || 7) : (prefs.runHour == null ? 17 : +prefs.runHour);
  try {
    const u = 'https://api.open-meteo.com/v1/forecast?latitude=' + L.lat + '&longitude=' + L.lon + '&hourly=temperature_2m,dew_point_2m&temperature_unit=fahrenheit&timezone=auto&start_date=' + date + '&end_date=' + date;
    const j = await (await fetch(u)).json(), i = (j.hourly.time || []).findIndex((t) => t.slice(11, 13) === String(hr).padStart(2, '0'));
    if (i < 0) return 0;
    const p = E.heatPct(j.hourly.dew_point_2m[i], j.hourly.temperature_2m[i], (extra && extra.acclim && extra.acclim.heat) || 0);
    out.heat = { pct: p, temp: j.hourly.temperature_2m[i], dew: j.hourly.dew_point_2m[i], hour: hr };
    return p >= 0.01 ? p : 0;
  } catch (e) { return 0; }
}
(async () => {
const hp = await heat();
if (hp) zz = E.heatZones(zz, hp);
const race = (state.events || []).filter((e) => e.date === date && e.splits && e.splits.miles)[0];
if (day) {
  const runs = day.parts.filter((x) => E.isRun(x) && x.mi > 0), lifts = day.parts.filter((x) => x.type === 'strength' && E.LIFT[x.key]);
  runs.forEach((p, i) => {
    let steps = runSteps(p);
    /* race day with a saved pacing plan: one step per mile at its target pace (distance-based) */
    if (race && p.type === 'race') steps = race.splits.miles.map((m) => { const f = 1 + (hp || 0); const pc = Math.round(m[1] * (1 + (hp || 0)) / (1 + ((race.splits.heat) || 0))); return { kind: 'run', pace: [pc + 4, pc - 4], m: Math.round(m[0] * MI), desc: 'race pace' }; });
    if (hp) p = Object.assign({}, p, { note: 'Paces ' + Math.round(hp * 100) + '% slower for the heat and humidity. ' + (p.note || '') });
    out.workouts.push({ kind: 'run', name: label + ' Run' + (runs.length > 1 ? ' ' + (i + 1) : ''), title: p.title, mi: p.mi, desc: (p.title + ', ' + p.mi + ' mi. ' + (hp ? 'Heat-adjusted paces (+' + Math.round(hp * 100) + '%). ' : '') + (p.purpose || '')).trim().slice(0, 500), steps: steps });
  });
  lifts.forEach((p, i) => { const s = liftSpec(p); out.workouts.push({ kind: 'lift', name: label + ' Lift' + (lifts.length > 1 ? ' ' + (i + 1) : ''), title: p.title, desc: (p.title + '. ' + (s.name || '')).slice(0, 500), exercises: s.exercises }); });
}
/* extra one-off runs saved in prefs.watch.extra[date] (for example a test run before the plan starts) */
const extra = ((prefs.watch || {}).extra || {})[date] || [];
if (extra.length) {
  const wk = w || plan.weeks[0];
  extra.forEach((x, i) => {
    if (x.kind === 'lift') {
      const sl = wk.days.map((dd) => dd.parts.filter((pp) => pp.type === 'strength')[0]).filter(Boolean), first = sl.filter((pp) => pp.key === x.key)[0] || sl[0] || {};
      const sp = liftSpec({ key: x.key || first.key || 'A', v: first.v || 0, lp: x.lp != null ? x.lp : (first.lp || 0) });
      const nl = out.workouts.filter((o) => o.kind === 'lift').length;
      out.workouts.push({ kind: 'lift', name: label + ' Lift' + (nl ? ' ' + (nl + 1) : ''), title: x.title || sp.name, desc: (x.title || sp.name).slice(0, 500), exercises: sp.exercises });
      return;
    }
    const pz = (z) => { const p = wk.zonesAdj[z]; return p ? [p[1], p[0]] : null; };
    const steps = [];
    const mz = (z) => { const p = wk.zonesAdj[z]; return p ? (p[0] + p[1]) / 2 : 600; };
    const t = (mi, z) => roundSec(mi * mz(z));
    if (x.wu) steps.push({ kind: 'warmup', pace: pz('E'), s: t(x.wu, 'E'), desc: 'start easy and settle in' });
    steps.push({ kind: 'run', pace: pz(x.z || 'E'), s: t(x.mi, x.z || 'E'), desc: 'conversational' });
    if (x.cd) steps.push({ kind: 'cooldown', pace: pz('E'), s: t(x.cd, 'E'), desc: 'ease down' });
    const n = out.workouts.filter((o) => o.kind === 'run').length;
    out.workouts.push({ kind: 'run', name: label + ' Run' + (n ? ' ' + (n + 1) : ''), title: x.title || 'Easy run', mi: (x.wu || 0) + x.mi + (x.cd || 0), desc: (x.title || 'Easy run') + ': warm-up, easy miles at your easy pace, cool-down.', steps: steps });
  });
}
process.stdout.write(JSON.stringify(out, null, 1));
})();
