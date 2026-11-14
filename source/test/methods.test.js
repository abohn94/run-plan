// Every training style x runner level x goal set must build a sane plan.
const E = require('../dist/engine.built.js'); const seed = require('./seed.js'); const t = E.today();
let bad = 0; const ok = (c, m) => { if (!c) { bad++; if (bad < 40) console.log('FAIL', m); } };
const profs = { new: { level: 'new', mpw: 4, longest: 2, runDays: 3, liftDays: 1 }, some: { level: 'some', mpw: 18, longest: 7, runDays: 5, liftDays: 2 }, exp: { level: 'exp', mpw: 45, longest: 14, runDays: 6, liftDays: 1 }, lifter: { level: 'some', mpw: 12, longest: 5, runDays: 4, liftDays: 4 } };
const evs = {
  multi: [{ id: 'a', name: '5K', date: E.addD(t, 30), dist: '5k', goal: '24:00', priority: 'A' }, { id: 'b', name: '10 miler', date: E.addD(t, 91), dist: '10mi', goal: '1:25:00', priority: 'A' }, { id: 'c', name: 'Half', date: E.addD(t, 152), dist: 'half', goal: '1:50:00', priority: 'A' }, { id: 'd', name: 'Marathon', date: E.addD(t, 364), dist: 'full', goal: '3:55:00', priority: 'A' }],
  full: [{ id: 'd', name: 'Marathon', date: E.addD(t, 142), dist: 'full', goal: '3:30:00', priority: 'A' }],
  midweek: [{ id: 'm', name: 'Thursday 10K', date: E.addD(E.monday(E.addD(t, 70)), 3), dist: '10k', goal: '50:00', priority: 'A' }],
  ultra: [{ id: 'u', name: '50K', date: E.addD(t, 200), dist: '50k', goal: '', priority: 'A' }],
  custom: [{ id: 'x', name: '', date: E.addD(t, 80), dist: 'custom', mi: 7.5, goal: '', priority: 'A', kind: 'distance' }],
  none: []
};
const build = (m, pk, ek) => { const st = JSON.parse(JSON.stringify(seed)); Object.assign(st.profile, profs[pk], { method: m, startDate: E.monday(t) }); st.events = JSON.parse(JSON.stringify(evs[ek])); st.logs = {}; const p = E.generate(st); E.adapt(p, st, E.analyze(p, st, null)); return { p, st }; };
for (const m of Object.keys(E.METHODS)) for (const pk of Object.keys(profs)) for (const ek of Object.keys(evs)) {
  let p, st; try { ({ p, st } = build(m, pk, ek)); } catch (e) { ok(false, [m, pk, ek, e.stack.split('\n').slice(0, 3).join(' ')].join(' ')); continue; }
  const tag = [m, pk, ek].join('/');
  evs[ek].forEach(e => { const w = E.weekOf(p, e.date); ok(w && w.days[E.dow(e.date)].parts.some(x => x.type === 'race'), tag + ' race placed ' + e.name); });
  let prevLong = 0;
  p.weeks.forEach(w => {
    ok(w.tot.mi > 0 && isFinite(w.tot.mi), tag + ' wk' + w.n + ' mi ' + w.tot.mi);
    w.days.forEach(d => d.parts.forEach(x => { if (E.isRun(x)) ok(x.mi > 0 && isFinite(x.mi) && x.steps && x.steps.length, tag + ' wk' + w.n + d.dow + ' ' + x.title + ' ' + x.mi); }));
    const wr = E.weekIntensity(w, st.profile).filter(x => x.level === 'warn'); ok(wr.length === 0, tag + ' wk' + w.n + ' ' + w.phase.key + ' ' + wr.map(x => x.text).join('|'));
    const q = w.days.reduce((n, d) => n + d.parts.filter(x => x.type === 'speed').length, 0); ok(q <= 3, tag + ' wk' + w.n + ' quality ' + q);
    if (w.tot.mi > 25 && w.phase.key !== 'race') ok(w.tot.long <= w.tot.mi * 0.6 + 2, tag + ' wk' + w.n + ' long ' + w.tot.long + ' of ' + w.tot.mi);
  });
  if (m === 'runwalk') ok(p.weeks[0].days.some(d => d.parts.some(x => x.runwalk)), tag + ' has run-walk ratio');
  if (m === 'hybrid') ok(Math.max(...p.weeks.map(w => w.tot.lifts)) >= 3, tag + ' hybrid lifts');
  if (m === 'norwegian' && pk === 'exp' && ek === 'full') { const w = p.weeks[9]; const st2 = w.days.reduce((n, d) => n + d.parts.filter(x => x.key === 'subt').length, 0); ok(w.cut || st2 >= 2, tag + ' sub-threshold sessions wk10: ' + st2); }
}
// suggestions respect level
const sug = (pr, ev) => E.suggestMethods(Object.assign({}, seed.profile, pr), ev || evs.full)[0];
ok(['runwalk', 'beginner'].includes(sug({ level: 'new', mpw: 3, runDays: 3, liftDays: 0, injuryProne: false }).key), 'new runner -> ' + sug({ level: 'new', mpw: 3, runDays: 3, liftDays: 0, injuryProne: false }).key);
ok(sug({ level: 'some', mpw: 12, runDays: 4, liftDays: 4, injuryProne: false }).key === 'hybrid', 'lifter -> ' + sug({ level: 'some', mpw: 12, runDays: 4, liftDays: 4, injuryProne: false }).key);
ok(['canova', 'endurance', 'norwegian'].includes(sug({ level: 'exp', mpw: 50, runDays: 6, liftDays: 1, goalType: 'time', injuryProne: false }).key), 'advanced -> ' + sug({ level: 'exp', mpw: 50, runDays: 6, liftDays: 1, goalType: 'time', injuryProne: false }).key);
ok(!E.suggestMethods(Object.assign({}, seed.profile, { level: 'new', mpw: 3 }), evs.full).slice(0, 3).some(x => x.level === 3), 'no advanced style in a beginner top 3');
console.log(bad ? 'FAILURES ' + bad : 'ALL OK (' + Object.keys(E.METHODS).length + ' styles x levels x goals)');
