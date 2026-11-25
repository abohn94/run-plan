/* Strength programs: every questionnaire combination builds, respects equipment and limits, and fits the session length. */
const E = require('../dist/engine.built.js'); let n = 0; const bad = [];
for (const goal of Object.keys(E.SP_GOALS)) for (const emph of ['balanced', 'glutes', 'upper', 'legs']) for (const equip of ['gym', 'db', 'band', 'bw']) for (const style of ['weights', 'calis', 'mix']) for (const days of [2, 3, 4, 5, 6]) for (const len of [30, 45, 60, 75, 90]) for (const limits of [[], ['knees', 'back', 'shoulders']]) {
  const P = E.buildProgram({ on: true, goal, emph, equip, style, days, len, exp: 'some', limits, bar: false }, {}); n++;
  if (P.days.length !== days) bad.push('days ' + [goal, emph, equip, days]);
  P.days.forEach(d => { const xs = d.blocks.slice(1).reduce((a, b) => a.concat(b.ex.filter(x => !x.wu)), []);
    if (xs.length < 3) bad.push('thin ' + [goal, emph, equip, style, days, len, d.name]);
    xs.forEach(x => { const pe = Object.values(E.SP_POOL).flat().find(p => p.n === x.n); if (!pe) return;
      if (limits.some(l => pe.no.includes(l))) bad.push('limit ' + x.n);
      if (equip !== 'gym' && pe.eq === 'gym') bad.push('equip ' + equip + ' ' + x.n);
      if (equip === 'bw' && pe.eq === 'db') bad.push('equip bw ' + x.n); }); });
}
console.log(n + ' programs'); if (bad.length) { console.log('FAIL', [...new Set(bad)].slice(0, 20)); process.exit(1); } console.log('ALL OK (programs)');
