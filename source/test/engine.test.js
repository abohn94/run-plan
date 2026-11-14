const E = require('../dist/engine.built.js');
const seed = require('./seed.js');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const st = JSON.parse(JSON.stringify(seed));
let p = E.generate(st);
ok(p.weeks.length === 53, 'weeks 53');
ok(p.weeks[27].days[5].parts.some(x => x.type === 'race'), 'half on Sat wk28');
ok(p.weeks[52].days[6].parts.some(x => x.type === 'race'), 'full on Sun wk53');
// ramp rule: no build week > 12% over previous build week (after cutbacks compare to the last non-cut)
let lastBuild = null;
p.weeks.forEach(w => { if (w.kind === 'build') { if (lastBuild && w.phase.key !== 'maint' && w.n > 2) ok(w.tot.mi <= lastBuild * 1.15 + 1.5, 'ramp wk' + w.n + ' ' + lastBuild + '->' + w.tot.mi); lastBuild = w.tot.mi; } else if (w.kind !== 'cutback') lastBuild = null; });
// every speed session has steps and distance
p.weeks.forEach(w => w.days.forEach(d => d.parts.forEach(x => { if (E.isRun(x)) ok(x.steps && x.steps.length && x.mi > 0, 'steps ' + w.n + d.dow + x.title); })));
// lift days honored
[0, 1, 2, 3, 4].forEach(k => { const s2 = JSON.parse(JSON.stringify(seed)); s2.profile.liftDays = k; const q = E.generate(s2); ok(q.weeks[5].tot.lifts === k, 'lifts ' + k + ' got ' + q.weeks[5].tot.lifts); });
// no doubles: runs + lifts on separate days
{ const s2 = JSON.parse(JSON.stringify(seed)); s2.profile.liftDays = 3; s2.profile.doubles = false; const q = E.generate(s2);
  q.weeks.slice(0, 20).forEach(w => w.days.forEach(d => { const r = d.parts.some(E.isRun), l = d.parts.some(x => x.type === 'strength'); ok(!(r && l) || w.phase.key === 'race', 'double on ' + w.n + d.dow); })); }
// availability: no runs on unavailable days
{ const s2 = JSON.parse(JSON.stringify(seed)); s2.profile.avail = [false, true, true, true, false, true, true]; const q = E.generate(s2);
  q.weeks.forEach(w => { if (w.phase.key !== 'race') { ok(!w.days[0].parts.some(E.isRun) && !w.days[4].parts.some(E.isRun), 'avail ' + w.n); } }); }
// methods all generate
Object.keys(E.METHODS).forEach(k => { const s2 = JSON.parse(JSON.stringify(seed)); s2.profile.method = k; s2.profile.crossDays = 1; const q = E.generate(s2); ok(q.weeks.length === 53, 'method ' + k); const pk = Math.max(...q.weeks.map(w => w.tot.mi)); console.log('method', k, 'peak', pk, 'runs@peak', q.weeks.find(w => w.tot.mi === pk).tot.runs, 'cross', q.weeks[20].tot.cross); });
// statuses + life events
st.life = [{ id: 'l1', kind: 'sick', level: 'mild', from: '2026-11-16', to: '2026-11-20' }, { id: 'l2', kind: 'busy', from: '2026-12-08', to: '2026-12-08' }];
let a = E.analyze(p, st, null); E.adapt(p, st, a);
ok(p.weeks[5].mod && p.weeks[5].mod.kind === 'sick', 'sick week');
ok(p.weeks[6].mod && p.weeks[6].mod.phase === 'ramp', 'ramp after');
ok(p.weeks[5].tot.mi < p.weeks[5].base, 'sick fewer miles');
ok(!p.weeks[8].days[1].parts.some(E.isRun), 'busy day cleared');
ok(p.weeks[8].days.some(d => d.parts.some(x => x.moved === '2026-12-08')), 'run moved');
// time trial -> paces move
const st2 = JSON.parse(JSON.stringify(seed));
st2.logs = { '2027-01-05': { run: { ptype: 'speed', mi: 5, sec: 2400, rpe: 9, seg: { mi: 3.10686, sec: 24 * 60 + 30, race: true } } } };
let p2 = E.generate(st2); let a2 = E.analyze(p2, st2, null); E.adapt(p2, st2, a2);
ok(a2.dv < 0, 'slow TT lowers fitness ' + a2.dv);
ok(p2.weeks[20].zonesAdj.T[0] > p2.weeks[20].zones.T[0], 'T slower after slow TT');
// LT and VO2 entries
const st3 = JSON.parse(JSON.stringify(seed)); st3.metrics = [{ date: '2027-01-10', ltPace: '7:30', ltHr: 172 }];
let p3 = E.generate(st3); let a3 = E.analyze(p3, st3, null); E.adapt(p3, st3, a3);
console.log('LT anchor vdot', a3.vdot.toFixed(1), 'T wk15', p3.weeks[14].zonesAdj.T, 'hr', JSON.stringify(p3.weeks[14].zonesAdj.hr));
const st4 = JSON.parse(JSON.stringify(seed)); st4.metrics = [{ date: '2027-01-10', vo2: 50 }];
let p4 = E.generate(st4); let a4 = E.analyze(p4, st4, null); console.log('VO2 anchor vdot', a4.vdot.toFixed(1), a4.notes.map(n => n.title));
// readiness
const g = { days: {}, activities: [] };
for (let i = 1; i <= 21; i++) g.days[E.addD('2026-11-12', -i)] = { rhr: 52, hrv: 55, hrvLow: 50, hrvHigh: 64, sleepH: 7.4, bbHigh: 80 };
g.days['2026-11-12'] = { rhr: 61, hrv: 44, hrvLow: 50, hrvHigh: 64, hrvStatus: 'LOW', sleepH: 5.2, sleepScore: 52, bbHigh: 35 };
const rd = E.readiness({ logs: {} }, g, '2026-11-12'); console.log('readiness', rd.level, rd.score, rd.reasons.map(r => r.text));
ok(rd.level === 'red', 'red readiness');
g.days['2026-11-12'] = { rhr: 53, hrv: 56, hrvLow: 50, sleepH: 7.5, sleepScore: 82, bbHigh: 85 };
ok(E.readiness({ logs: {} }, g, '2026-11-12').level === 'green', 'green readiness');
const rec = E.recommend({ level: 'amber', flags: {}, metrics: {} }, p.weeks[13].days[1]); console.log('amber rec', rec.headline, rec.actions.map(x => x.action));
// overrides
const st5 = JSON.parse(JSON.stringify(seed)); st5.overrides = { '2027-01-12': { action: 'easy', reason: 'low HRV' } };
let p5 = E.generate(st5); E.adapt(p5, st5, E.analyze(p5, st5, null));
ok(p5.weeks[13].days[1].parts[0].type === 'easy', 'override easy');
// nutrition
const nu = E.nutrition(p.weeks[20].days[6], 75, p.weeks[20].zones, null, null, null); console.log('nutrition long', nu.tier, nu.carbG, nu.protG, !!nu.fuel);
// garmin match
const ga = { activities: [{ id: 1, date: '2026-11-10', start: '2026-11-10 06:00:00', run: true, distM: 4828, movS: 1800, avgHR: 140 }, { id: 2, date: '2026-11-10', start: '2026-11-10 17:00:00', strength: true, durS: 2700 }] };
const adds = E.matchGarmin({ logs: {} }, p, ga); ok(adds.length === 2 && adds[0].rec.mi === 3, 'match ' + JSON.stringify(adds));
// FIT
p.weeks.forEach(w => w.days.forEach(d => d.parts.forEach(x => { if (E.isRun(x)) { const f = E.workoutFile(x, w.zones, 'W' + w.n + ' ' + x.title); ok(f.length > 50 && E.fitCrc(f, 0, f.length - 2) === (f[f.length - 2] | f[f.length - 1] << 8), 'fit ' + w.n); } })));
console.log(bad ? 'FAILED ' + bad : 'ALL OK (engine)');
// ---- fitness readings: Garmin VO2max/threshold merge and anchor priority ----
{
  const s2 = JSON.parse(JSON.stringify(seed)); const q = E.generate(s2); const t = E.today();
  const g = { activities: [{ id: 1, run: true, date: E.addD(t, -3), distM: 8000, movS: 2700, vo2: 54 }], days: {}, fitness: { vo2: { [E.addD(t, -1)]: 55 }, ltSpeed: { [E.addD(t, -2)]: 0.3691, [t]: 0.3691 }, ltHr: { [t]: 178 } } };
  ok(E.ltSpeedToPace(0.3691) === 436, 'lt speed 0.3691 -> 436 s/mi got ' + E.ltSpeedToPace(0.3691));
  ok(E.ltSpeedToPace(3.691) === 436, 'lt speed m/s');
  const a = E.analyze(q, s2, g);
  ok(a.lt && a.lt.pace === 436 && a.lt.hr === 178, 'lt merged ' + JSON.stringify(a.lt));
  ok(a.vo2 && a.vo2.v === 55, 'vo2 latest 55');
  ok(a.anchor && a.anchor.src === 'lt', 'lt beats newer vo2: ' + (a.anchor && a.anchor.src));
  ok(a.ltPin === 436, 'threshold pinned');
  // a race in the last 12 weeks wins over a threshold reading
  const s3 = JSON.parse(JSON.stringify(s2)); s3.logs = s3.logs || {}; s3.logs[E.addD(t, -20)] = { run: { ptype: 'race', mi: 3.11, sec: 1260, seg: { mi: 3.11, sec: 1260, race: true } } };
  const b = E.analyze(q, s3, g);
  ok(b.anchor && b.anchor.src === 'race', 'race wins: ' + (b.anchor && b.anchor.src));
  // manual entries still work and count as 'you'
  const s4 = JSON.parse(JSON.stringify(s2)); s4.metrics = [{ id: 'm1', date: t, ltPace: '7:30', ltHr: 175, vo2: 50 }];
  const c = E.analyze(q, s4, null);
  ok(c.lt.pace === 450 && c.lt.src === 'you' && c.vo2.v === 50, 'manual reading ' + JSON.stringify(c.lt));
  console.log('fitness vdot from LT 7:16 =', E.vdotFromThreshold(436).toFixed(1), ' VO2 55 ->', E.vdotFromVo2(55));
}
console.log(bad ? 'FAILURES ' + bad : 'ALL OK (fitness)');
// ---- consistency cap, drag-and-drop arrangement, intensity check ----
{
  const t = E.today(); const s5 = JSON.parse(JSON.stringify(seed)); s5.profile.startDate = E.monday(E.addD(t, -28)); s5.logs = {};
  const q0 = E.generate(s5); const cw = E.weekOf(q0, t);
  // ran only one 3 mi run in each of the last two weeks
  [1, 2].forEach(k => { const w = q0.weeks[cw.n - 1 - k]; s5.logs[w.days[1].date] = { run: { ptype: 'easy', mi: 3, sec: 1800 } }; });
  const q = E.generate(s5); E.adapt(q, s5, E.analyze(q, s5, null));
  ok(q.compliance && q.compliance.level === 'verylow' && q.compliance.cap, 'compliance cap ' + JSON.stringify(q.compliance && q.compliance.cap));
  const w = E.weekOf(q, t); ok(w.mod && w.mod.phase === 'compliance' && w.tot.mi <= q.compliance.cap.mi + 1.5, 'week capped ' + w.tot.mi + ' vs ' + q.compliance.cap.mi);
  // drag the long run onto the day after a key workout -> back-to-back warning with a fix
  const s6 = JSON.parse(JSON.stringify(seed)); const q6 = E.generate(s6); E.adapt(q6, s6, E.analyze(q6, s6, null));
  const w6 = q6.weeks[6]; const sp = w6.days.find(d => d.parts.some(p => p.type === 'speed')); const lg = w6.days.find(d => d.parts.some(p => p.type === 'long'));
  const target = w6.days[(sp.i + 1) % 7]; const lp = lg.parts.find(p => p.type === 'long');
  s6.arr = { [E.partKey(lg.date, lp)]: target.date };
  const q7 = E.generate(s6); E.adapt(q7, s6, E.analyze(q7, s6, null)); const w7 = q7.weeks[6];
  ok(w7.days[target.i].parts.some(p => p.type === 'long' && p.akey), 'long run moved to ' + target.dow);
  ok(!w7.days[lg.i].parts.some(p => p.type === 'long'), 'long run left its day');
  const warns = E.weekIntensity(w7, s6.profile); ok(warns.some(x => /back to back/.test(x.text) && x.fix), 'back-to-back warning: ' + warns.map(x => x.text).join(' | '));
  ok(E.weekIntensity(w6, s6.profile).filter(x => x.level === 'warn').length === 0, 'generated week has no warnings: ' + E.weekIntensity(w6, s6.profile).map(x => x.text).join(' | '));
}
console.log(bad ? 'FAILURES ' + bad : 'ALL OK (week tools)');
// ---- week start, removals, alternatives, load focus, rest-day offer ----
{
  const s = JSON.parse(JSON.stringify(seed)); const base = E.generate(s); E.setWeekStart(0);
  const longAbs = E.dow(base.weeks[6].days.find(d => d.parts.some(p => p.type === 'long')).date);
  const s2 = JSON.parse(JSON.stringify(seed)); E.rotateProfile(s2.profile, 6); // Sunday start
  const q = E.generate(s2);
  ok(E.DOW[0] === 'Sun' && E.pd(q.weeks[3].start).getDay() === 0, 'sunday weeks start ' + q.weeks[3].start + ' ' + E.DOW[0]);
  const ld = q.weeks[6].days.find(d => d.parts.some(p => p.type === 'long'));
  ok(E.pd(ld.date).getDay() === E.pd(base.weeks[6].days[longAbs].date).getDay(), 'long run stays on same weekday after rotation');
  ok(q.weeks[27].days.some(d => d.parts.some(x => x.type === 'race')), 'half still in plan');
  E.setWeekStart(0);
  // removal with 'x'
  const s3 = JSON.parse(JSON.stringify(seed)); const q3 = E.generate(s3); E.adapt(q3, s3, E.analyze(q3, s3, null));
  const w = q3.weeks[6], ed = w.days.find(d => d.parts.some(p => p.type === 'easy' && p.role !== 'gym')), ep = ed.parts.find(p => p.type === 'easy');
  s3.arr = { [E.partKey(ed.date, ep)]: 'x' };
  const q4 = E.generate(s3); E.adapt(q4, s3, E.analyze(q4, s3, null));
  ok(q4.weeks[6].removed.length === 1 && q4.weeks[6].tot.mi < w.tot.mi, 'removed easy run ' + q4.weeks[6].tot.mi + ' vs ' + w.tot.mi);
  // alternatives exist for each type
  ['easy', 'long', 'speed', 'strength'].forEach(tp => { const d = w.days.find(x => x.parts.some(p => p.type === tp)); if (!d) return; const p = d.parts.find(x => x.type === tp); const al = E.sessionAlternatives(q3, s3, w, p, d.date, 'removed'); ok(al.length >= 1, 'alts ' + tp + ' ' + al.map(a => a.label).join(' / ')); console.log(tp, '->', al.map(a => a.label).join(' | ')); });
  // lift mix
  const ld2 = w.days.filter(d => d.parts.some(p => p.type === 'strength'));
  if (ld2.length >= 2) { const a = ld2[0].parts.find(p => p.type === 'strength'), b = ld2[1].parts.find(p => p.type === 'strength'); const m = E.liftMod(a.key, a.v, b.key); ok(m.blocks.some(x => /heavy/i.test(x.t) && x.ex.length === 4), 'mix heavy 4'); console.log('mix', m.name, m.blocks.map(x => x.t + ':' + x.ex.map(e => e.n).join(',')).join(' ; ')); }
  // load focus
  const t = E.today(), acts = []; for (let i = 1; i < 28; i += 2) acts.push({ date: E.addD(t, -i), run: true, distM: 8000, load: 90, teLabel: 'AEROBIC_BASE' });
  const lf = E.loadFocus({ activities: acts }, t); ok(lf && lf.nudge === 'anaerobic', 'load focus nudge ' + JSON.stringify(lf));
  // overrides
  const s5 = JSON.parse(JSON.stringify(seed)); const q5 = E.generate(s5); const w5 = q5.weeks[6]; const ed5 = w5.days.find(d => d.parts.some(p => p.type === 'easy'));
  const rd5 = w5.days.find(d => d.parts.every(p => p.type === 'rest'));
  s5.overrides = { [ed5.date]: { action: 'add', mi: 1.5 } }; if (rd5) s5.overrides[rd5.date] = { action: 'addday', add: { run: 3, lift: 'UB' } };
  E.adapt(q5, s5, E.analyze(q5, s5, null));
  ok(q5.weeks[6].days[ed5.i].parts.some(p => p.note && /Longer/.test(p.note)), 'add miles override');
  if (rd5) ok(q5.weeks[6].days[rd5.i].parts.filter(p => p.added).length === 2, 'addday adds run+lift');
}
console.log(bad ? 'FAILURES ' + bad : 'ALL OK (week start + alternatives)');
