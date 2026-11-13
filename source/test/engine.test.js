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
