/* ================= Phase 3: race day, shoes, staying on plan, and coming back from a niggle ================= */

/* ---------- race day: fueling, carb loading, race morning, checklist ---------- */
function raceFuel(ev, rp) {
  var d = E.distOf(ev); if (d.mi < 9) return null;
  var full = d.key === 'full', total = rp ? rp.total : E.parseClock(ev.goal) || d.mi * 540;
  var gHr = full ? (total > 4 * 3600 ? 60 : 75) : 45, gel = 25;
  var first = full ? 35 * 60 : 40 * 60, every = full ? Math.round(3600 * gel / gHr) : 35 * 60, out = [];
  for (var t = first; t < total - 10 * 60; t += every) {
    var mile = rp ? (rp.segs.filter(function (s) { return s.cum <= t; }).length) : Math.round(t / total * d.mi);
    out.push({ t: t, mile: Math.max(1, mile) });
  }
  return { list: out, gHr: Math.round(out.length * gel / (total / 3600)), aim: gHr, gels: out.length, carbs: out.length * gel };
}
function carbLoad(ev) {
  var d = E.distOf(ev), kg = +(st().profile || {}).weightKg || 0; if (d.mi < 13 || !kg) return null;
  var full = d.key === 'full', days = full ? 3 : 2, gkg = full ? 9 : 7, out = [];
  for (var i = days; i >= 1; i--) out.push({ date: E.addD(ev.date, -i), g: Math.round(kg * gkg / 10) * 10 });
  return { days: out, gkg: gkg, kg: kg };
}
function raceMorning(ev) {
  var d = E.distOf(ev), start = +(ev.hour || 7) * 60, kg = +(st().profile || {}).weightKg || 70, short = d.mi < 9;
  var wu = short ? 25 : d.key === 'full' ? 10 : 15;
  var rows = [
    [start - 180, 'Breakfast', 'About ' + Math.round(kg * (short ? 1 : 2) / 10) * 10 + ' g of carbs you know well: bagel, banana, oats. Coffee if you normally have it.'],
    [start - 120, 'Last big drink', '400–600 ml of water or a sports drink, then sips.'],
    [start - 75, 'Arrive', 'Bag check, bathroom line, pin the bib.'],
    [start - 15 - wu, 'Warm up', short ? '10–15 min easy jog, drills, then 4 × 20 s strides at race pace.' : d.key === 'full' ? '5–10 min of easy jogging and a few short strides. Save everything else.' : '10 min easy jog, then 3 × 20 s strides.'],
    [start - 15, 'Corral', (short ? '' : 'A gel or chews now. ') + 'Stay warm in a throwaway layer.'],
    [start, 'Start', 'Settle in. The first mile should feel easy.']
  ];
  return rows.map(function (r) { return { t: r[0], what: r[1], how: r[2] }; });
}
function raceShoe() { return shoes().filter(function (s) { return !s.retired && s.role === 'race'; })[0] || null; }
function raceExtrasHTML(ev, rp) {
  var h = '', f = raceFuel(ev, rp), cl = carbLoad(ev), rm = raceMorning(ev), rs = raceShoe();
  if (f) h += '<section class="card" id="rp-fuel"><h3>Fueling</h3><p class="small muted" style="margin-top:4px">' + f.gels + (f.gels === 1 ? ' gel (' : ' gels (') + f.carbs + ' g), about ' + f.gHr + ' g of carbs an hour. Take each a little before an aid station and wash it down with water.' + (f.gHr < f.aim - 5 ? ' Sports drink at the stations tops you up toward ' + f.aim + ' g an hour if your stomach handles it.' : '') + ' Practice this exact plan on your long runs.</p>' +
    '<div class="scroll"><table class="t fit" style="margin-top:8px"><thead><tr><th>Gel</th><th class="num">Race clock</th><th class="num">Near mile</th></tr></thead><tbody>' + f.list.map(function (g, i) { return '<tr><td>' + (i + 1) + '</td><td class="num">' + E.clock(g.t) + '</td><td class="num">' + g.mile + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
  if (cl) h += '<section class="card" id="rp-carb"><h3>Carb loading</h3><p class="small muted" style="margin-top:4px">About ' + cl.gkg + ' g of carbs per kg of body weight for the last ' + cl.days.length + ' days, with runs short and easy. Lower the fiber and fat so it sits well.</p><div class="cl-days">' +
    cl.days.map(function (x) { return '<div><span>' + fmtD(x.date, { weekday: 'short', month: 'short', day: 'numeric' }) + '</span><b>' + x.g + ' g</b><em>carbs</em></div>'; }).join('') + '</div><p class="tiny muted" style="margin-top:6px">For ' + Math.round(cl.kg * 2.2046) + ' lb. A bagel is about 50 g, a cup of rice 45 g, a sports drink 30 g.</p></section>';
  h += '<section class="card" id="rp-morning"><h3>Race morning</h3><div class="rm-list">' + rm.map(function (r) { return '<div class="rm"><b>' + clockOf(((r.t % 1440) + 1440) % 1440) + '</b><div><span>' + esc(r.what) + '</span><small>' + esc(r.how) + '</small></div></div>'; }).join('') + '</div></section>';
  var items = ['Bib and safety pins (or race belt)', 'Timing chip, if it is separate', (rs ? shoeName(rs) : 'Race shoes') + ', already run in at least twice', 'Gels for the plan above, plus one spare', 'Anti-chafe on feet, thighs and anywhere straps rub', 'Throwaway layer for the start', 'Watch charged, race workout loaded'];
  var done = ((st().prefs || {}).raceCheck || {})[ev.id] || {};
  h += '<section class="card" id="rp-check"><h3>Checklist</h3><div class="stack tight" style="margin-top:6px">' + items.map(function (it, i) { return '<label class="check"><input type="checkbox" data-rcheck="' + esc(ev.id) + '|' + i + '"' + (done[i] ? ' checked' : '') + '> ' + esc(it) + '</label>'; }).join('') + '</div></section>';
  return h;
}
document.addEventListener('change', function (e) {
  var t = e.target; if (!t.dataset || !t.dataset.rcheck) return;
  var p = t.dataset.rcheck.split('|'), id = p[0], i = +p[1], on = t.checked;
  Store.edit('prefs', 'raceCheck', function (S) { S.prefs = S.prefs || {}; S.prefs.raceCheck = S.prefs.raceCheck || {}; S.prefs.raceCheck[id] = S.prefs.raceCheck[id] || {}; S.prefs.raceCheck[id][i] = on; });
});
var _racepace16 = VIEWS.racepace;
VIEWS.racepace = function () {
  var h = _racepace16(), ev = evById(App.args[0]); if (!ev || !(E.parseClock(ev.goal) > 0)) return h;
  var rp = null; try { rp = E.racePacing(E.distOf(ev).mi, E.parseClock(ev.goal), ev.course && ev.course.elev, raceHeat(ev).pct); } catch (e) { rp = null; }
  var add = raceExtrasHTML(ev, rp), i = h.indexOf('<div class="band" id="paceBand">');
  h = i > 0 ? h.slice(0, i) + add + h.slice(i) : h + add;
  /* quick links to each part of the plan, under the headline numbers */
  var nav = '<div class="rp-nav" role="navigation" aria-label="Race plan sections"><button class="chip" data-act="rp-go" data-arg="' + jattr({ id: 'rp-miles' }) + '">Mile by mile</button>' + (/id="rp-fuel"/.test(add) ? '<button class="chip" data-act="rp-go" data-arg="' + jattr({ id: 'rp-fuel' }) + '">Fueling</button>' : '') + (/id="rp-carb"/.test(add) ? '<button class="chip" data-act="rp-go" data-arg="' + jattr({ id: 'rp-carb' }) + '">Carb loading</button>' : '') + '<button class="chip" data-act="rp-go" data-arg="' + jattr({ id: 'rp-morning' }) + '">Race morning</button><button class="chip" data-act="rp-go" data-arg="' + jattr({ id: 'rp-check' }) + '">Checklist</button></div>';
  h = h.replace('<div class="sechead"><h2>Mile by mile</h2>', '<div class="sechead" id="rp-miles"><h2>Mile by mile</h2>');
  var at = h.indexOf('<div class="odds');
  return at > 0 ? h.slice(0, at) + nav + h.slice(at) : nav + h;
};
/* race week: a countdown on Today with what matters that day */
function raceWeekCard() {
  var ev = (st().events || []).filter(function (e) { return e.date >= App.today && E.diffD(App.today, e.date) <= 7 && (e.priority || 'A') !== 'C'; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
  if (!ev) return '';
  var n = E.diffD(App.today, ev.date), cl = carbLoad(ev), today = cl && cl.days.filter(function (x) { return x.date === App.today; })[0];
  var tune = (ev.priority || 'A') === 'B';
  var line = n === 0 ? 'Race day. Trust the training, start easy, and fuel on schedule.' : n === 1 ? 'Tomorrow. Short shakeout, lay out your kit tonight, and get to bed early.' : today && !tune ? 'Carb loading today: about ' + today.g + ' g of carbs, with low fiber.' : tune ? 'A tune-up: the plan trains through it, with easy days just before. Race it if you feel good, or run it at goal pace.' : 'Taper week: you are supposed to feel restless. Keep runs short and easy.';
  return '<section class="card offer racewk"><div class="spread"><div><div class="eyebrow">' + (n === 0 ? 'Race day' : n + (n === 1 ? ' day' : ' days') + ' to go') + '</div><h3>' + esc(ev.name || E.distOf(ev).label) + '</h3></div><span class="rw-n" aria-hidden="true">' + n + '</span></div><p class="small">' + esc(line) + '</p>' +
    (E.parseClock(ev.goal) > 0 ? '<div class="btns"><a class="btn sm primary" href="#/racepace/' + encodeURIComponent(ev.id) + '">Race plan</a></div>' : '') + '</section>';
}

/* ---------- shoes: a role for each pair, and the right pair for each session ---------- */
var SHOE_ROLES = [['daily', 'Daily trainer'], ['workout', 'Workouts'], ['race', 'Race day'], ['long', 'Long runs'], ['trail', 'Trail'], ['recovery', 'Recovery runs']];
var _shoeSheet16 = SHEETS.shoe;
SHEETS.shoe = function (a) {
  var h = _shoeSheet16(a), cur = (sheetCtx.shoe && sheetCtx.shoe.role) || 'daily';
  var sel = '<label class="f">Used for<select class="i" id="sh-role">' + SHOE_ROLES.map(function (r) { return '<option value="' + r[0] + '"' + (r[0] === cur ? ' selected' : '') + '>' + r[1] + '</option>'; }).join('') + '</select></label>';
  var i = h.indexOf('<label class="check"><input type="checkbox" id="sh-def"');
  return i > 0 ? h.slice(0, i) + sel + h.slice(i) : h + sel;
};
var _shoeSave16 = SAVE2.shoe;
SAVE2.shoe = function () { var r = $('#sh-role'); if (r && sheetCtx && sheetCtx.shoe) sheetCtx.shoe.role = r.value; return _shoeSave16.apply(this, arguments); };
function shoeForPart(p) {
  var act = shoes().filter(function (s) { return !s.retired; }); if (act.length < 2 || !p || !E.isRun(p)) return null;
  var want = p.type === 'race' ? ['race', 'workout'] : p.type === 'speed' ? ['workout', 'race', 'daily'] : p.type === 'long' ? ['long', 'daily'] : p.type === 'recovery' ? ['recovery', 'daily'] : ['daily', 'recovery'];
  for (var i = 0; i < want.length; i++) { var s = act.filter(function (x) { return (x.role || 'daily') === want[i]; })[0]; if (s) return s; }
  return null;
}
function shoeLine(date) {
  var d = dayOf(date), p = d && d.parts.filter(function (x) { return E.isRun(x); })[0], s = shoeForPart(p); if (!s) return '';
  var x = shoeStats(s), goal = +s.goalMi || 400, warn = s.role === 'race' && x.mi >= goal - 50;
  return '<a class="shoeline" href="#/shoe/' + esc(s.id) + '"><span aria-hidden="true">👟</span><span>Shoes for this run: <b>' + esc(shoeName(s)) + '</b>' + (warn ? ' · ' + Math.round(goal - x.mi) + ' mi left in them' : '') + '</span></a>';
}
var _day16 = VIEWS.day;
VIEWS.day = function () {
  var h = _day16(), d = App.args[0] || App.today, s = ''; try { s = d >= App.today ? shoeLine(d) : ''; } catch (e) { s = ''; }
  if (!s) return h;
  var i = h.indexOf('<section'); return i > 0 ? h.slice(0, i) + s + h.slice(i) : h + s;
};

/* ---------- staying on plan: a streak that forgives, and a gentle way back after missed days ---------- */
function onPlanStreak() {
  var p = App.plan; if (!p) return 0;
  var marks = (p.statusByWeek) || {}, n = 0, past = p.weeks.filter(function (w) { return w.end < App.today; }).reverse();
  for (var i = 0; i < past.length; i++) {
    var w = past[i]; if (marks[w.start]) continue;   /* sick, vacation or a busy week you marked don't break it */
    var planned = 0, done = 0;
    w.days.forEach(function (d) { d.parts.forEach(function (q) { if (q.type === 'rest' || q.type === 'race') return; planned++; if (partDone(d.date, q)) done++; }); });
    if (!planned) continue;
    if (done / planned >= 0.75) n++; else break;
  }
  return n;
}
function missedRunDays() {
  var n = 0, planned = 0;
  for (var i = 1; i <= 21; i++) {
    var d = E.addD(App.today, -i), day = dayOf(d), l = logOf(d), ran = (l.run && !l.run.skip && +l.run.mi > 0) || (l.xrun && +l.xrun.mi > 0);
    if (ran) break;
    n++; if (day && day.parts.some(function (q) { return E.isRun(q) && q.type !== 'race'; })) planned++;
  }
  return { days: n, planned: planned };
}
function resetWeekCard() {
  var w = App.week; if (!w || !App.plan) return '';
  var m = missedRunDays(), seen = st().seen || {}, key = 'reset:' + w.start;
  if (m.days < 4 || m.planned < 2 || seen[key] || (App.plan.statusByWeek || {})[w.start] || App.today < App.plan.start) return '';
  return '<section class="card offer"><div class="eyebrow">Ease back in</div><h3>No run for ' + m.days + ' days. Happens to everyone.</h3><p class="small muted">Make this a lighter week: the key runs stay, everything else shrinks by about a third. Next week picks up where the plan left off.</p>' +
    '<div class="btns"><button class="btn primary sm" data-act="reset-week" data-arg="' + jattr({ w: w.start }) + '">Make this week lighter</button><button class="btn sm ghost" data-act="reset-no" data-arg="' + jattr({ k: key }) + '">Keep the plan</button></div></section>';
}
ACTIONS['reset-week'] = function (a) { Store.editMany([['status', a.w], ['seen', 'reset:' + a.w]], function (S) { S.status = S.status || {}; S.status[a.w] = { kind: 'busy', level: 'light' }; S.seen = S.seen || {}; S.seen['reset:' + a.w] = 1; }); toast('Lighter week set. You can undo it in Week status.'); };
ACTIONS['reset-no'] = function (a) { Store.edit('seen', a.k, function (S) { S.seen = S.seen || {}; S.seen[a.k] = 1; }); };

/* ---------- a niggle: a 5-rung ladder back to running ---------- */
var _painBanner16 = painBanner;
painBanner = function () {
  if (st().ladder) return '';   /* the ladder card takes over */
  var done = (st().prefs || {}).ladderDone; if (done && E.diffD(done, App.today) < 10) return '';
  var h = _painBanner16(); if (!h) return h;
  var f = painFlags(10);
  return h.replace(/<\/div><\/section>$/, '<button class="btn sm" data-act="ladder-start" data-arg="' + jattr({ k: f.shin ? 'shin' : 'other' }) + '">Start a return ladder</button></div></section>');
};
ACTIONS['ladder-start'] = function (a) { Store.edit('ladder', null, function (S) { S.ladder = { start: App.today, step: 0, kind: a.k }; }); toast('Return ladder set: your runs become five steps back'); };
function ladderCard() {
  var L = st().ladder; if (!L || L.step >= E.LADDER.length) return '';
  /* the latest ladder session waiting for a pain answer */
  var ask = null;
  for (var i = 0; i <= 2 && !ask; i++) { var d = E.addD(App.today, -i), day = dayOf(d), part = day && day.parts.filter(function (q) { return q.ladder; })[0], l = logOf(d); if (part && d >= L.start && (l.run || l.cross || l.done) && !(L.ans || {})[d]) ask = { date: d, rung: part.ladder }; }
  var dots = E.LADDER.map(function (r, i) { return '<i class="' + (i < L.step ? 'on' : i === L.step ? 'cur' : '') + '" title="' + esc(r.title) + '"></i>'; }).join('');
  return '<section class="card offer ladder"><div class="eyebrow">Return ladder · step ' + (L.step + 1) + ' of ' + E.LADDER.length + '</div><h3>' + esc(E.LADDER[Math.min(L.step, E.LADDER.length - 1)].title) + '</h3><div class="cbdots lad" aria-hidden="true">' + dots + '</div>' +
    (ask ? '<p class="small" style="margin-top:8px">Was ' + (ask.date === App.today ? 'today\'s' : fmtD(ask.date, { weekday: 'long' }) + '\'s') + ' step pain-free, during and the morning after?</p><div class="btns"><button class="btn primary sm" data-act="ladder-ans" data-arg="' + jattr({ d: ask.date, r: ask.rung, ok: 1 }) + '">Pain-free</button><button class="btn sm" data-act="ladder-ans" data-arg="' + jattr({ d: ask.date, r: ask.rung, ok: 0 }) + '">It hurt</button></div>' :
      '<p class="small muted" style="margin-top:6px">Each step has to be pain-free (2 out of 10 or less) before you move up. No workouts until you finish. See a professional if it hurts to hop or press on the bone.</p>') +
    '<div class="btns"><button class="btn sm ghost" data-act="ladder-stop">End the ladder</button></div></section>';
}
ACTIONS['ladder-ans'] = function (a) {
  Store.editMany([['ladder'], ['prefs', 'ladderDone']], function (S) {
    var L = S.ladder; if (!L) return; L.ans = L.ans || {}; L.ans[a.d] = a.ok ? 'ok' : 'pain';
    L.step = a.ok ? Math.max(L.step, a.r) : Math.max(0, a.r - 2); L.start = E.addD(a.d, 1);
    if (L.step >= E.LADDER.length) { S.ladder = null; S.prefs = S.prefs || {}; S.prefs.ladderDone = App.today; }
  });
  toast(a.ok ? (a.r >= E.LADDER.length ? 'Ladder done. Back to the plan.' : 'Moving up a step') : 'Back a step. Give it a day or two.');
};
ACTIONS['ladder-stop'] = function () { Store.editMany([['ladder'], ['prefs', 'ladderDone']], function (S) { S.ladder = null; S.prefs = S.prefs || {}; S.prefs.ladderDone = App.today; }); toast('Ladder ended. Your normal plan is back.'); };

/* Today: race week, the ladder, the reset offer. Progress: the streak. */
var _today16 = VIEWS.today;
VIEWS.today = function () {
  var h = _today16(), add = ''; try { add = raceWeekCard() + ladderCard() + resetWeekCard(); } catch (e) { console.warn(e); }
  if (!add) return h; var i = h.indexOf('<section'); return i > 0 ? h.slice(0, i) + add + h.slice(i) : h + add;
};
var _records16 = recordsHTML;
recordsHTML = function () {
  var h = _records16(), n = onPlanStreak(); if (n < 2) return h;
  var tile = '<div class="streak"><b>' + n + '</b><div><span>weeks in a row on plan</span><small>A week counts at 75% of its sessions. Rest days, and weeks you mark sick, on vacation or busy, never break it.</small></div></div>';
  if (!h) return '<div class="sechead"><h2>Records and milestones</h2></div><section class="card stack">' + tile + '</section>';
  return h.replace('<section class="card stack">', '<section class="card stack">' + tile);
};
App.p16 = { missedRunDays: missedRunDays, resetWeekCard: resetWeekCard, onPlanStreak: onPlanStreak, raceFuel: raceFuel, shoeForPart: shoeForPart };
ACTIONS['rp-go'] = function (a) { var el = document.getElementById(a.id); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); };
