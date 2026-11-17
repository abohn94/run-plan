/* ================= Requests from the new testers: a starter block, what to wear, running words explained ================= */

/* ---------- starter block (8 weeks of run-walk for a true beginner) shares the comeback card ---------- */
var _comebackCard17 = comebackCard;
comebackCard = function () {
  var w = App.week, cb = w && w.comeback; if (!cb || !cb.starter) return _comebackCard17();
  var r = [[1, 1], [2, 1], [3, 1], [5, 1], [8, 1], [10, 1], [15, 1], [30, 0]][Math.min(cb.week - 1, 7)];
  return '<section class="card offer cbcard"><div class="eyebrow">Starter week ' + cb.week + ' of ' + cb.of + '</div><p class="small" style="margin:2px 0 0">' +
    (r[1] ? 'This week: run ' + r[0] + ' min, walk ' + r[1] + ' min, repeated. ' : 'This week: 30 minutes without stopping. You built this. ') +
    'Go slow enough to talk the whole time. By week 8 you\'ll run 30 minutes non-stop, then your first 5K.</p><div class="cbdots" aria-hidden="true">' + Array.from({ length: cb.of }, function (_, i) { return '<i class="' + (i < cb.week ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
    '<div class="btns"><a class="btn sm ghost" href="#/glossary">Running words explained</a></div></section>';
};

/* ---------- what to wear, from the forecast at your run time ---------- */
function dressFor(date) {
  var p = dayOf(date), run = p && p.parts.filter(function (x) { return E.isRun(x) && !x.treadmill; })[0]; if (!run) return null;
  var w = wxAt(date, runHour()); if (!w || w.feels == null) return null;
  var f = w.feels, out = [];
  if (f >= 65) out.push('singlet or light tee, shorts');
  else if (f >= 55) out.push('tee and shorts');
  else if (f >= 45) out.push('long sleeve or tee with arm sleeves, shorts or light tights');
  else if (f >= 35) out.push('long sleeve, light jacket, tights, thin gloves');
  else if (f >= 25) out.push('base layer and jacket, tights, gloves, hat or ear band');
  else if (f >= 10) out.push('thermal base layer, wind jacket, thermal tights, mittens, hat, neck gaiter');
  else out.push('everything above plus a face cover; the treadmill is a fine choice today');
  if (w.wind >= 15 && f < 60) out.push('a windproof shell');
  if (w.pop >= 50 && !(w.snow > 0)) out.push('a cap and light rain shell');
  if (w.snow > 0 || (f < 33 && w.pop >= 40)) out.push('shoes with grip (or traction cleats) for snow and ice');
  if (w.day === 0) out.push('a headlamp and something reflective');
  return { feels: Math.round(f), temp: Math.round(w.temp), list: out };
}
function dressLine(date) {
  var d = dressFor(date); if (!d) return '';
  return '<div class="dress"><span aria-hidden="true">🧥</span><span><b>What to wear (feels like ' + d.feels + '°F):</b> ' + esc(d.list.join('; ')) + '. Dress as if it were 15–20° warmer: you heat up fast.</span></div>';
}
var _today17 = VIEWS.today;
VIEWS.today = function () {
  var h = _today17(), l = ''; try { l = dressLine(App.today); } catch (e) { l = ''; }
  if (!l) return h;
  var i = h.indexOf('</section>'); return i > 0 ? h.slice(0, i) + l + h.slice(i) : h;   /* inside today's session card */
};
var _day17 = VIEWS.day;
VIEWS.day = function () {
  var h = _day17(), d = App.args[0] || App.today, l = ''; try { l = d >= App.today ? dressLine(d) : ''; } catch (e) { l = ''; }
  var gl = (st().profile || {}).level === 'new' ? '<p class="small" style="margin:4px 0 10px"><a href="#/glossary">What do these running words mean?</a></p>' : '';
  if (!l && !gl) return h;
  var i = h.indexOf('<section'); return i > 0 ? h.slice(0, i) + (l ? '<div class="card dresscard">' + l + '</div>' : '') + gl + h.slice(i) : h;
};

/* ---------- running words, in plain language ---------- */
var GLOSSARY = [
  ['Easy run', 'Slow enough to talk in full sentences. Most of your running should feel like this, and it\'s where most fitness is built.'],
  ['Recovery run', 'Even easier than easy, often the day after a hard session. Short and gentle.'],
  ['Long run', 'Your longest run of the week, at easy effort. It builds endurance for the race distance.'],
  ['Run-walk', 'Alternating running and walking on a timer, like 3 minutes running and 1 walking. A proven way to start, and many marathoners use it on purpose.'],
  ['Strides', 'Short, relaxed bursts of about 20 seconds at a quick but smooth pace, with full rest between. They teach good form without tiring you.'],
  ['Fartlek', 'Swedish for "speed play": short faster stretches mixed into an easy run, by feel.'],
  ['Hill repeats', 'Running up a hill at a strong effort, then walking or jogging down. Strength and speed with less pounding.'],
  ['Tempo or threshold', '"Comfortably hard": you can say a few words but not chat. Often 20–30 minutes in total.'],
  ['Intervals', 'Hard repeats with recovery between, like 5 × 3 minutes hard with 2 minutes easy. They raise your top-end fitness.'],
  ['Cutback week', 'A lighter week every few weeks so your body absorbs the training. It\'s planned, not a step back.'],
  ['Taper', 'The last 1–3 weeks before a race, when running gets lighter so you start fresh.'],
  ['Effort (1–10)', 'How hard it feels, on Garmin\'s scale: 2 easy, 3 moderate, 5 hard, 7 very hard, 10 all-out.'],
  ['Pace', 'Minutes per mile. A bigger number is slower: 12:00/mi is slower than 10:00/mi.'],
  ['Heart-rate zones', 'Ranges of heart rate that match each effort. Easy runs should sit in the low zones.'],
  ['Fitness score (VDOT)', 'One number for your running fitness, from races and tests. The app uses it to set every pace.'],
  ['VO₂ max', 'How much oxygen your body can use, estimated by your watch. It rises as you get fitter.'],
  ['Cadence', 'Steps per minute. Slightly quicker, lighter steps are easier on shins and knees.'],
  ['HRV', 'Heart-rate variability: the small variation between heartbeats overnight. Lower than your normal can mean you need more recovery.'],
  ['Body Battery', 'Garmin\'s 0–100 estimate of your energy, from sleep, stress and activity.'],
  ['Training load', 'How much your recent training has asked of your body. The app keeps it rising gently.']
];
TITLES.glossary = 'Running words'; TABOF.glossary = 'you';
VIEWS.glossary = function () {
  return '<div class="pagehead"><h1>Running words, explained</h1><p>The terms you\'ll see in your plan, in plain language.</p></div><section class="card"><dl class="gloss">' +
    GLOSSARY.map(function (g) { return '<dt>' + esc(g[0]) + '</dt><dd>' + esc(g[1]) + '</dd>'; }).join('') + '</dl></section>';
};
/* in the You → Library list */
var _you17 = VIEWS.you;
VIEWS.you = function () {
  var h = _you17(), i = h.indexOf('href="#/guides"'); if (i < 0) return h;
  var a = h.lastIndexOf('<a', i), close = h.indexOf('</a>', i) + 4; if (a < 0 || close < 4) return h;
  var item = h.slice(a, close).replace('href="#/guides"', 'href="#/glossary"').replace(/>Running guides</, '>Running words<').replace('form, races, workouts', 'plain-language glossary');
  return h.slice(0, close) + item + h.slice(close);
};
App.p17 = { dressFor: dressFor };
