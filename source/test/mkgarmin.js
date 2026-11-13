// synthetic Garmin data.json around "today" for UI tests
const E = require('../dist/engine.built.js');
module.exports = function (today) {
  const days = {}, acts = [];
  for (let i = 60; i >= 0; i--) {
    const d = E.addD(today, -i);
    days[d] = { sleepH: 7 + (i % 3) * 0.4, sleepScore: 75 + (i % 5), rhr: 52 + (i % 3), hrv: 56 + (i % 4), hrvWeek: 57, hrvLow: 50, hrvHigh: 64, hrvStatus: 'BALANCED', bbHigh: 78, bbLow: 22, stress: 28, steps: 9000 };
    if (i % 2 === 1 && i < 40) acts.push({ id: 1000 + i, name: 'Morning Run', type: 'running', run: true, start: d + ' 06:30:00', date: d, distM: 4828 + (i % 3) * 800, durS: 1900 + (i % 3) * 300, movS: 1880 + (i % 3) * 300, avgHR: 138 + (i % 4), maxHR: 172 });
    if (i % 7 === 2 && i < 40) acts.push({ id: 5000 + i, name: 'Strength', type: 'strength_training', strength: true, start: d + ' 17:00:00', date: d, durS: 2700 });
  }
  days[today] = { sleepH: 5.4, sleepScore: 55, rhr: 60, hrv: 46, hrvLow: 50, hrvHigh: 64, hrvStatus: 'LOW', bbHigh: 40, bbLow: 20 };
  return { version: 1, updated: new Date().toISOString(), status: 'ok', errors: [], activities: acts.reverse(), days };
};
