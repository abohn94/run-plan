/* ================= Features: lift logger, shoes, calendar, activities, health trends, VO2max & threshold ================= */
/* This file is inlined inside ui.js (at the FEATURES marker), so it shares its helpers and state. */

IC.calendar = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4M7.5 13h2M11 13h2M14.5 13h2M7.5 17h2M11 17h2"/></svg>';
Object.assign(TITLES, { calendar: 'Calendar', activity: 'Activity', shoes: 'Shoes', shoe: 'Shoe', workout: 'Workout', fitness: 'VO2 max & threshold' });
TOP.calendar = 1;
var TABOF = { day: 'plan', workout: 'plan', activity: 'progress', fitness: 'progress' };
var SAVE2 = {}, DEL2 = {};

/* ---------- small helpers ---------- */
function st() { return Store.state; }
function ftOf(m) { return Math.round((+m || 0) * 3.28084); }
function e1rm(w, r) { w = +w; r = +r; if (!(w > 0 && r > 0)) return 0; return Math.round(w * (1 + Math.min(r, 12) / 30)); }
function setsOf(e) {
  if (!e) return [];
  if (Array.isArray(e.s)) return e.s.filter(function (x) { return x && (+x.w > 0 || +x.r > 0); });
  if (e.w != null || e.reps != null) { var n = Math.max(1, +e.sets || 1), a = []; for (var i = 0; i < n; i++) a.push({ w: +e.w || 0, r: +e.reps || 0 }); return a; }
  return [];
}
function bestE1(e) { return setsOf(e).reduce(function (m, x) { return Math.max(m, e1rm(x.w, x.r)); }, 0); }
function restSec(s) {
  s = String(s || '');
  var m = /(\d+):(\d{2})/.exec(s); if (m) return +m[1] * 60 + +m[2];
  m = /(\d+)\s*s/.exec(s); if (m) return +m[1];
  m = /(\d+)\s*min/.exec(s); if (m) return +m[1] * 60;
  return 0;
}
function rxParse(rx) { var m = /(\d+)\s*[×x]\s*(\d+)/.exec(String(rx || '')); return m ? { sets: +m[1], reps: +m[2] } : { sets: 3, reps: 8 }; }
function mmss(sec) { sec = Math.max(0, Math.round(sec)); var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s < 10 ? '0' : '') + s; }
function monthKey(d) { return d.slice(0, 7); }
function monthLabel(k, opts) { return E.pd(k + '-01').toLocaleDateString('en-US', opts || { month: 'long', year: 'numeric' }); }
function addMonths(k, n) { var d = E.pd(k + '-01'); d = new Date(d.getFullYear(), d.getMonth() + n, 1); return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1); }
function fmtD(d, o) { return E.fmtDate(d, o || { weekday: 'short', month: 'short', day: 'numeric' }); }
function segBtns(key, opts, cur, route) {
  return '<div class="seg" role="group">' + opts.map(function (o) { return '<button data-act="' + (route ? 'nav' : 'ui') + '" data-arg="' + jattr(route ? { to: route + o[0], replace: true } : { k: key, v: o[0] }) + '" aria-pressed="' + (cur === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>';
}
ACTIONS.ui = function (a) { App.ui[a.k] = a.v; render(); };

/* ---------- every activity, keyed (Garmin + your own logs) ---------- */
var GTYPE = { treadmill_running: 'Treadmill run', running: 'Run', trail_running: 'Trail run', track_running: 'Track run', indoor_running: 'Indoor run', strength_training: 'Strength', indoor_cardio: 'Cardio', walking: 'Walk', hiking: 'Hike', golf: 'Golf', indoor_cycling: 'Indoor bike', cycling: 'Ride', elliptical: 'Elliptical', other: 'Activity' };
function gLabel(t) { return GTYPE[t] || String(t || 'Activity').replace(/_/g, ' ').replace(/^\w/, function (c) { return c.toUpperCase(); }); }
var _acts = null, _actsKey = '';
function activities() {
  var g = Store.garmin, logs = st().logs || {};
  var sig = (g && g.updated) + '|' + (st().updatedAt || '') + '|' + Object.keys(logs).length;
  if (_acts && _actsKey === sig) return _acts;
  var out = [], byG = {}, used = {};
  if (g && g.activities) g.activities.forEach(function (a) { byG[a.id] = a; });
  Object.keys(logs).forEach(function (d) {
    var l = logs[d];
    ['run', 'xrun'].forEach(function (s) {
      var r = l[s]; if (!r || r.skip) return;
      var a = r.gid ? byG[r.gid] : null; if (r.gid) used[r.gid] = 1;
      out.push({ key: r.gid ? 'g' + r.gid : 'l' + d + '|' + s, date: d, kind: 'run', name: r.name || (a && a.name) || TYPE_LABEL[r.ptype] || 'Run', mi: +r.mi || 0, sec: +r.sec || 0, hr: r.hr || null, rpe: r.rpe || null, ptype: r.ptype, g: a, log: r, slot: s, time: a && a.start ? a.start.slice(11, 16) : '', tread: !!(a && /treadmill|indoor/.test(a.type)) });
    });
    if (l.lift) { var la = l.lift.gid ? byG[l.lift.gid] : null; if (l.lift.gid) used[l.lift.gid] = 1; out.push({ key: l.lift.gid ? 'g' + l.lift.gid : 'l' + d + '|lift', date: d, kind: 'lift', name: (la && la.name) || (l.lift.key && E.LIFT[l.lift.key] ? 'Strength ' + (l.lift.key.length === 1 ? l.lift.key + ': ' : '') + E.LIFT[l.lift.key].name : 'Strength'), sec: (l.lift.min || 0) * 60, mi: 0, g: la, log: l.lift, slot: 'lift', time: la && la.start ? la.start.slice(11, 16) : '' }); }
    if (l.cross) { var ca = l.cross.gid ? byG[l.cross.gid] : null; if (l.cross.gid) used[l.cross.gid] = 1; out.push({ key: l.cross.gid ? 'g' + l.cross.gid : 'l' + d + '|cross', date: d, kind: 'other', name: (ca && ca.name) || l.cross.type || 'Activity', sec: (l.cross.min || 0) * 60, mi: ca && ca.distM ? E.round1(ca.distM / E.MI_M) : 0, g: ca, log: l.cross, slot: 'cross', time: ca && ca.start ? ca.start.slice(11, 16) : '' }); }
  });
  if (g && g.activities) g.activities.forEach(function (a) {
    if (used[a.id] || !a.date) return;
    var run = !!a.run && a.distM > 0;
    out.push({ key: 'g' + a.id, date: a.date, kind: run ? 'run' : a.strength ? 'lift' : 'other', name: a.name || gLabel(a.type), mi: a.distM ? E.round1(a.distM / E.MI_M) : 0, sec: Math.round(a.movS || a.durS || 0), hr: a.avgHR || null, g: a, log: null, time: a.start ? a.start.slice(11, 16) : '', tread: /treadmill|indoor/.test(a.type || '') });
  });
  out.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : (a.time < b.time ? 1 : -1); });
  _acts = out; _actsKey = sig;
  return out;
}
function actsOn(date) { return activities().filter(function (a) { return a.date === date; }); }
function actByKey(k) { return activities().filter(function (a) { return a.key === k; })[0] || null; }
function actIcon(a) { return '<span class="tico t-' + (a.kind === 'run' ? (a.ptype === 'long' ? 'long' : a.ptype === 'speed' ? 'speed' : a.ptype === 'race' ? 'race' : 'easy') : a.kind === 'lift' ? 'strength' : 'cross') + '">' + (a.kind === 'run' ? TICON.easy : a.kind === 'lift' ? TICON.strength : TICON.cross || TICON.rest) + '</span>'; }
function actRow(a, opts) {
  opts = opts || {};
  var stat = a.kind === 'run' ? mi(a.mi) + ' mi' + (a.sec ? ' · ' + E.clock(a.sec) + ' · ' + pace(a.sec / a.mi) + '/mi' : '') : (a.sec ? hms(a.sec) : '') + (a.mi ? ' · ' + mi(a.mi) + ' mi' : '') + (a.kind === 'lift' && a.log && a.log.ex && Object.keys(a.log.ex).length ? ' · ' + plural(Object.keys(a.log.ex).length, 'lift') : '');
  return '<a class="actrow" href="#/activity/' + encodeURIComponent(a.key) + '">' + actIcon(a) + '<span class="sh"><b>' + esc(a.name) + '</b><small>' + (opts.date === false ? '' : fmtD(a.date) + (a.time ? ' · ' + a.time : '') + ' · ') + esc(stat) + '</small></span><span class="chev">›</span></a>';
}

/* ---------- shoes ---------- */
function shoes() { return (st().shoes || []).slice(); }
function shoeName(s) { return s ? (s.nick || [s.brand, s.model].filter(Boolean).join(' ') || 'Shoe') : 'None'; }
function shoeFor(a) {
  if (a.kind !== 'run') return null;
  var g = st().gear || {}, k = a.key;
  if (g[k] === 'none') return null;
  var all = shoes();
  if (g[k]) return all.filter(function (s) { return s.id === g[k]; })[0] || null;
  var def = all.filter(function (s) { return s.def && !s.retired && (!s.since || a.date >= s.since); })[0];
  return def || null;
}
function shoeStats(s) {
  var runs = activities().filter(function (a) { return a.kind === 'run' && shoeFor(a) === s; });
  var m = runs.reduce(function (t, a) { return t + a.mi; }, 0), sec = runs.reduce(function (t, a) { return t + (a.sec || 0); }, 0);
  return { runs: runs, mi: (+s.startMi || 0) + m, logged: m, sec: sec };
}
function shoeCard(s) {
  var x = shoeStats(s), goal = +s.goalMi || 400, pct = Math.min(100, Math.round(x.mi / goal * 100));
  return '<a class="card shoecard" href="#/shoe/' + s.id + '"><div class="spread"><div><b>' + esc(shoeName(s)) + '</b>' + (s.nick && (s.brand || s.model) ? '<div class="tiny muted">' + esc([s.brand, s.model].filter(Boolean).join(' ')) + '</div>' : '') + '</div><div>' + (s.def ? '<span class="pill solid">Default</span>' : '') + (s.retired ? '<span class="pill">Retired</span>' : '') + '</div></div>' +
    '<div class="bar" style="margin:10px 0 6px"><i style="width:' + pct + '%;background:' + (pct >= 100 ? 'var(--danger)' : pct >= 85 ? 'var(--amber)' : 'var(--green)') + '"></i></div><div class="spread small muted"><span><b style="color:var(--ink)">' + Math.round(x.mi) + '</b> of ' + goal + ' mi</span><span>' + plural(x.runs.length, 'run') + '</span></div></a>';
}
VIEWS.shoes = function () {
  var all = shoes(), act = all.filter(function (s) { return !s.retired; }), ret = all.filter(function (s) { return s.retired; });
  var html = '<div class="pagehead"><h1>Shoes</h1><p>Track how far you have run in each pair. Runs go to your default shoe automatically; change any run on its activity page.</p></div>';
  html += act.length ? '<div class="stack">' + act.map(shoeCard).join('') + '</div>' : '<section class="card"><h3>No shoes yet</h3><p class="small muted">Add the shoes you run in. Most running shoes last 300–500 miles before the cushioning breaks down, and worn-out shoes are a common trigger for shin pain.</p></section>';
  html += '<div class="btns"><button class="btn primary" data-act="sheet" data-arg="' + jattr({ sheet: 'shoe' }) + '">Add shoes</button></div>';
  if (ret.length) html += '<div class="sechead"><h2>Retired</h2></div><div class="stack">' + ret.map(shoeCard).join('') + '</div>';
  return html;
};
VIEWS.shoe = function () {
  var s = shoes().filter(function (x) { return x.id === App.args[0]; })[0];
  if (!s) return '<div class="card">Shoe not found. <a href="#/shoes">All shoes</a></div>';
  var x = shoeStats(s), goal = +s.goalMi || 400, left = Math.max(0, goal - x.mi);
  var html = '<div class="pagehead"><h1>' + esc(shoeName(s)) + '</h1><p>' + esc([s.brand, s.model, s.color].filter(Boolean).join(' · ')) + '</p></div>';
  html += '<div class="tiles"><div class="tile"><span>Distance</span><b>' + Math.round(x.mi) + '</b><em>of ' + goal + ' mi goal</em></div><div class="tile"><span>Left</span><b>' + Math.round(left) + '</b><em>miles</em></div><div class="tile"><span>Runs</span><b>' + x.runs.length + '</b><em>' + (s.startMi ? Math.round(s.startMi) + ' mi before tracking' : 'tracked here') + '</em></div><div class="tile"><span>Avg pace</span><b style="font-size:1.3rem">' + (x.logged && x.sec ? pace(x.sec / x.logged) : '–') + '</b><em>per mile</em></div></div>';
  if (x.mi >= goal) html += '<div class="banner warn"><b>Time for a new pair.</b> These have passed your ' + goal + ' mi goal. Rotate in a fresh pair, especially with a history of shin splints.</div>';
  else if (x.mi >= goal * 0.85) html += '<div class="banner warn">Nearly there: about ' + Math.round(left) + ' mi left. A good time to buy the next pair and break them in on easy runs.</div>';
  html += '<div class="btns"><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'shoe', id: s.id }) + '">Edit</button>' + (!s.def && !s.retired ? '<button class="btn sm" data-act="shoe-def" data-arg="' + jattr({ id: s.id }) + '">Make default</button>' : '') + '<button class="btn sm ghost" data-act="shoe-retire" data-arg="' + jattr({ id: s.id }) + '">' + (s.retired ? 'Bring back' : 'Retire') + '</button></div>';
  html += '<div class="sechead"><h2>Runs</h2></div><section class="card">' + (x.runs.length ? x.runs.slice(0, 60).map(function (a) { return actRow(a); }).join('') : '<p class="empty">No runs yet. New runs after ' + fmtD(s.since || App.today) + ' count automatically while this is your default.</p>') + '</section>';
  return html;
};
SHEETS.shoe = function (a) {
  var s = (a.id && shoes().filter(function (x) { return x.id === a.id; })[0]) || { id: uid(), brand: '', model: '', nick: '', color: '', startMi: 0, goalMi: 400, since: App.today, def: !shoes().some(function (x) { return x.def && !x.retired; }) };
  sheetCtx.shoe = Object.assign({}, s); sheetCtx.isNew = !a.id;
  return '<h3>' + (a.id ? 'Edit shoes' : 'Add shoes') + '</h3><div class="grid2"><label class="f">Brand<input class="i" id="sh-brand" value="' + esc(s.brand) + '" placeholder="Brooks"></label><label class="f">Model<input class="i" id="sh-model" value="' + esc(s.model) + '" placeholder="Ghost 17"></label><label class="f">Nickname<input class="i" id="sh-nick" value="' + esc(s.nick) + '" placeholder="optional"></label><label class="f">Color<input class="i" id="sh-color" value="' + esc(s.color) + '" placeholder="optional"></label>' +
    '<label class="f">Miles already on them<input class="i" id="sh-start" type="number" min="0" inputmode="decimal" value="' + (s.startMi || 0) + '"></label><label class="f">Counting runs from<input class="i" id="sh-since" type="date" value="' + esc(s.since || App.today) + '"></label></div>' +
    '<label class="f">Distance goal: <b id="sh-goalv">' + (s.goalMi || 400) + ' mi</b><input type="range" id="sh-goal" min="200" max="700" step="25" value="' + (s.goalMi || 400) + '" style="width:100%"></label><p class="tiny muted">Most shoes last 300–500 miles. Retire them sooner if you notice new aches.</p>' +
    '<label class="check"><input type="checkbox" id="sh-def"' + (s.def ? ' checked' : '') + '> Default shoe: new runs count toward these</label>' + sheetBtns('Save', !!a.id);
};
SAVE2.shoe = function () {
  var s = sheetCtx.shoe;
  s.brand = $('#sh-brand').value.trim(); s.model = $('#sh-model').value.trim(); s.nick = $('#sh-nick').value.trim(); s.color = $('#sh-color').value.trim();
  s.startMi = +$('#sh-start').value || 0; s.goalMi = +$('#sh-goal').value || 400; s.since = $('#sh-since').value || App.today; s.def = $('#sh-def').checked;
  if (!s.brand && !s.model && !s.nick) { $('#shErr').textContent = 'Add a brand, model or nickname.'; return; }
  var ids = shoes().map(function (x) { return x.id; });
  Store.editMany(ids.concat([s.id]).map(function (id) { return ['shoes', id]; }), function (S) {
    S.shoes = S.shoes.filter(function (x) { return x.id !== s.id; });
    if (s.def) S.shoes.forEach(function (x) { x.def = false; });
    S.shoes.push(s);
  });
  closeSheet(); toast('Shoes saved');
};
DEL2.shoe = function () {
  var id = sheetCtx.shoe.id;
  if (!confirm('Delete these shoes? Runs stay in your history.')) return;
  Store.edit('shoes', id, function (S) { S.shoes = S.shoes.filter(function (x) { return x.id !== id; }); });
  closeSheet(); go('#/shoes'); toast('Deleted');
};
ACTIONS['shoe-def'] = function (a) { Store.editMany(shoes().map(function (x) { return ['shoes', x.id]; }), function (S) { S.shoes.forEach(function (x) { x.def = x.id === a.id; }); }); toast('Default shoe set'); };
ACTIONS['shoe-retire'] = function (a) { Store.edit('shoes', a.id, function (S) { S.shoes.forEach(function (x) { if (x.id === a.id) { x.retired = !x.retired; if (x.retired) x.def = false; } }); }); };
ACTIONS['set-gear'] = function (a) { Store.edit('gear', a.key, function (S) { if (a.shoe) S.gear[a.key] = a.shoe; else delete S.gear[a.key]; }); toast(a.shoe === 'none' ? 'No shoe for this run' : 'Shoe updated'); };
ACTIONS['save-anote'] = function (a) { var v = $('#anote').value.trim(); Store.edit('anotes', a.key, function (S) { if (v) S.anotes[a.key] = v; else delete S.anotes[a.key]; }); toast('Note saved'); };

/* ---------- activity detail ---------- */
var BEST = [['1k', '1K', 0.621371], ['1mi', '1 mi', 1], ['5k', '5K', 3.10686], ['10k', '10K', 6.21371], ['half', 'Half', 13.1094], ['full', 'Marathon', 26.2188]];
VIEWS.activity = function () {
  var a = actByKey(App.args[0]);
  if (!a) return '<div class="card">Activity not found.</div>';
  var g = a.g || {}, l = a.log || {};
  var html = '<div class="pagehead"><div class="eyebrow">' + esc(a.kind === 'run' ? (a.tread ? 'Treadmill run' : 'Run') : a.kind === 'lift' ? 'Strength' : gLabel(g.type)) + '</div><h1 style="font-size:1.7rem">' + esc(a.name) + '</h1><p>' + E.fmtDate(a.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + (a.time ? ' · ' + a.time : '') + (l.src === 'garmin' || a.g ? ' · Garmin' : '') + '</p></div>';
  var tiles = [];
  if (a.mi) tiles.push(['Distance', mi(a.mi), 'mi']);
  if (a.sec) tiles.push(['Time', E.clock(a.sec), a.kind === 'run' ? 'moving' : '']);
  if (a.kind === 'run' && a.mi && a.sec) tiles.push(['Avg pace', pace(a.sec / a.mi), 'per mile']);
  if (a.hr || g.avgHR) tiles.push(['Avg HR', a.hr || g.avgHR, g.maxHR ? 'max ' + g.maxHR : 'bpm']);
  if (g.cadence) tiles.push(['Cadence', g.cadence, 'steps/min']);
  if (g.elevM) tiles.push(['Elevation', ftOf(g.elevM), 'ft gain']);
  if (g.calories) tiles.push(['Calories', g.calories, 'kcal']);
  if (g.te) tiles.push(['Training effect', g.te, 'aerobic' + (g.ane ? ' · ' + g.ane + ' anaerobic' : '')]);
  if (g.load) tiles.push(['Load', g.load, 'Garmin']);
  if (g.vo2) tiles.push(['VO2max', g.vo2, 'from this run']);
  if (l.rpe) tiles.push(['Effort', l.rpe, 'RPE']);
  if (tiles.length) html += '<div class="tiles">' + tiles.map(function (x) { return '<div class="tile"><span>' + x[0] + '</span><b>' + x[1] + '</b><em>' + x[2] + '</em></div>'; }).join('') + '</div>';
  if (a.kind === 'run' && !l.rpe && a.log) html += '<section class="card"><h3>How did it feel?</h3><div class="rpe" style="margin-top:8px">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<button data-act="rate" data-arg="' + jattr({ date: a.date, slot: a.slot, rpe: n }) + '">' + n + '</button>'; }).join('') + '</div></section>';
  if (g.best) html += '<section class="card"><h3>Best efforts</h3><div class="badges" style="margin-top:10px">' + BEST.filter(function (b) { return g.best[b[0]]; }).map(function (b) { return '<div class="badge"><i>' + b[1] + '</i><b>' + E.clock(g.best[b[0]]) + '</b><small>' + pace(g.best[b[0]] / b[2]) + '/mi</small></div>'; }).join('') + '</div><p class="tiny muted" style="margin-top:8px">Fastest stretch of each distance within this run, from Garmin.</p></section>';
  if (a.kind === 'run') {
    var cur = shoeFor(a), gear = (st().gear || {})[a.key];
    var opts = shoes().filter(function (s) { return !s.retired || (cur && s.id === cur.id); });
    html += '<section class="card"><div class="spread"><h3>Shoes</h3><a class="small muted" href="#/shoes">Manage</a></div>' + (opts.length ? '<div class="chips" style="margin-top:8px">' + opts.map(function (s) { return '<button class="chip" data-act="set-gear" data-arg="' + jattr({ key: a.key, shoe: s.id }) + '" aria-pressed="' + (cur && cur.id === s.id) + '">' + esc(shoeName(s)) + '</button>'; }).join('') + '<button class="chip" data-act="set-gear" data-arg="' + jattr({ key: a.key, shoe: 'none' }) + '" aria-pressed="' + (gear === 'none') + '">None</button>' + (gear && gear !== 'none' ? '<button class="chip" data-act="set-gear" data-arg="' + jattr({ key: a.key, shoe: null }) + '">Use default</button>' : '') + '</div>' : '<p class="small muted" style="margin-top:6px">Add your shoes to track their miles.</p><div class="btns"><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'shoe' }) + '">Add shoes</button></div>') + '</section>';
  }
  if (a.kind === 'lift') html += liftSummaryCard(a.date, l);
  var note = (st().anotes || {})[a.key] || '';
  html += '<section class="card stack"><h3>Private notes</h3><textarea class="i" id="anote" rows="3" placeholder="How it went, the route, the weather…">' + esc(note) + '</textarea><div class="btns"><button class="btn sm" data-act="save-anote" data-arg="' + jattr({ key: a.key }) + '">Save note</button></div></section>';
  var btns = [];
  if (App.plan && dayOf(a.date)) btns.push('<a class="btn sm" href="#/day/' + a.date + '">Plan for this day</a>');
  if (a.log && a.kind === 'run') btns.push('<button class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'run', date: a.date, slot: a.slot }) + '">Edit log</button>');
  if (a.kind === 'lift') btns.push('<a class="btn sm primary" href="#/workout/' + a.date + '">' + (l.ex ? 'Edit sets' : 'Log sets & weights') + '</a>');
  if (btns.length) html += '<div class="btns">' + btns.join('') + '</div>';
  return html;
};
function liftSummaryCard(date, l) {
  if (!l || !l.ex || !Object.keys(l.ex).length) return '';
  return '<section class="card"><h3>Lifts</h3>' + Object.keys(l.ex).map(function (n) {
    var ss = setsOf(l.ex[n]);
    return '<div class="list-item"><div class="n small"><b>' + esc(n) + '</b></div><div class="d mono small">' + (bestE1(l.ex[n]) ? 'e1RM ' + bestE1(l.ex[n]) : '') + '</div><div class="c">' + ss.map(function (x) { return (x.w ? x.w + ' × ' : '') + x.r; }).join(', ') + '</div></div>';
  }).join('') + '</section>';
}

/* ---------- lift workout logger ---------- */
var LIFT_SKIP2 = { 'Lift warm-up': 1 };
function liftHistory(n, before) {
  var logs = st().logs || {}, out = [];
  Object.keys(logs).sort().forEach(function (d) { if (before && d >= before) return; var l = logs[d].lift; if (l && l.ex && l.ex[n]) { var ss = setsOf(l.ex[n]); if (ss.length) out.push({ date: d, sets: ss, e1: bestE1(l.ex[n]) }); } });
  return out;
}
function allLiftNames() {
  var names = {}, logs = st().logs || {};
  Object.keys(E.LIFT).forEach(function (k) { E.LIFT[k].blocks.forEach(function (b) { b.ex.forEach(function (x) { if (!LIFT_SKIP2[x.n]) names[x.n] = 1; }); }); });
  Object.keys(logs).forEach(function (d) { var l = logs[d].lift; if (l && l.ex) Object.keys(l.ex).forEach(function (n) { names[n] = 1; }); });
  return Object.keys(names).sort();
}
function newWorkout(date, key) {
  var logs = st().logs || {}, l = (logs[date] || {}).lift;
  var part = dayOf(date) ? dayOf(date).parts.filter(function (x) { return x.type === 'strength'; })[0] : null;
  var adv = date === App.today && part && App.rd ? E.liftAdvice(Object.assign({ _date: date }, part), App.rd, E.weekOf(App.plan, date)) : null;
  var lp = adv ? adv.lp : part ? part.lp : (l && l.lp) || 0;
  key = key || (l && l.key) || (part && part.key) || 'A';
  var wk = { date: date, key: key, lp: lp, start: Date.now(), ex: [], rpe: (l && l.rpe) || null, note: (l && l.note) || '', edit: !!(l && l.ex && Object.keys(l.ex).length) };
  if (wk.edit) {
    Object.keys(l.ex).forEach(function (n) { var mod = findEx(n); wk.ex.push({ n: n, rx: mod ? mod.rx[lp] : '', rest: mod ? restSec(mod.rest[lp]) : 90, cue: mod ? mod.cue : '', sets: setsOf(l.ex[n]).map(function (x) { return { w: x.w || '', r: x.r || '', done: true }; }) }); });
    return wk;
  }
  var m = E.LIFT[key];
  if (m) m.blocks.forEach(function (b) { b.ex.forEach(function (x) { if (LIFT_SKIP2[x.n]) return; wk.ex.push(exFromModule(x, lp, date)); }); });
  return wk;
}
function findEx(n) { var f = null; Object.keys(E.LIFT).some(function (k) { return E.LIFT[k].blocks.some(function (b) { return b.ex.some(function (x) { if (x.n === n) { f = x; return true; } return false; }); }); }); return f; }
function exFromModule(x, lp, date) {
  var rx = rxParse(x.rx[lp]), prev = liftHistory(x.n, date).pop();
  var sets = [];
  for (var i = 0; i < rx.sets; i++) { var p = prev && (prev.sets[i] || prev.sets[prev.sets.length - 1]); sets.push({ w: p && p.w ? p.w : '', r: rx.reps, done: false }); }
  return { n: x.n, rx: x.rx[lp], rest: restSec(x.rest[lp]), cue: x.cue, sets: sets };
}
function wkSave() { try { LS.set('rp-wk', JSON.stringify(App.wk)); } catch (e) { /* ignore */ } }
function wkLoad(date) { try { var w = JSON.parse(LS.get('rp-wk') || 'null'); return w && w.date === date ? w : null; } catch (e) { return null; } }
VIEWS.workout = function () {
  var date = App.args[0] || App.today, key = App.args[1];
  if (!App.wk || App.wk.date !== date || (key && App.wk.key !== key && !App.wk.touched)) { var dr = wkLoad(date); App.wk = dr && (!key || dr.key === key || dr.touched) ? dr : newWorkout(date, key); }
  var w = App.wk, m = E.LIFT[w.key];
  var done = 0, total = 0; w.ex.forEach(function (x) { x.sets.forEach(function (s) { total++; if (s.done) done++; }); });
  var html = '<div class="spread"><div style="min-width:0"><div class="eyebrow">' + fmtD(date, { weekday: 'long', month: 'short', day: 'numeric' }) + ' · ' + E.LIFT_PHASES[w.lp].k + ' loads</div><h2 style="margin-top:2px;font-size:1.4rem;font-weight:800">' + esc(m ? (w.key.length === 1 ? 'Strength ' + w.key + ': ' : '') + m.name : 'Workout') + '</h2></div></div>' +
    '<div class="wkhead"><div class="spread">' + (w.edit ? '<b class="small">Editing saved workout</b>' : '<div class="clock" id="wkClock">' + mmss((Date.now() - w.start) / 1000) + '</div>') + '<span class="small muted">' + done + ' of ' + total + ' sets</span><button class="btn sm primary" data-act="wk-finish">' + (w.edit ? 'Save' : 'Finish') + '</button></div>' +
    '<div class="exstrip">' + w.ex.map(function (x, i) { var dn = x.sets.length && x.sets.every(function (s) { return s.done; }); return '<button data-act="wk-jump" data-arg="' + jattr({ i: i }) + '" class="' + (dn ? 'dn' : '') + '">' + (dn ? '✓' : i + 1) + '<small>' + esc(x.n.split(' ').slice(0, 2).join(' ')) + '</small></button>'; }).join('') + '</div>' +
    '</div>' + (!w.edit && !w.touched ? '<label class="f small">Session<select class="i" id="wk-key">' + Object.keys(E.LIFT).map(function (k) { return '<option value="' + k + '"' + (k === w.key ? ' selected' : '') + '>' + (k.length === 1 ? 'Strength ' + k + ': ' : '') + E.LIFT[k].name + '</option>'; }).join('') + '</select></label>' : '');
  html += w.ex.map(function (x, i) {
    var prev = liftHistory(x.n, date).pop();
    var tested = (st().orm || []).filter(function (o) { return o.n === x.n; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
    return '<section class="card excard" id="ex' + i + '"><div class="spread"><div style="min-width:0"><h3>' + esc(x.n) + '</h3><div class="tiny muted">' + (x.rx ? esc(x.rx) : '') + (x.rest ? ' · rest ' + mmss(x.rest) : '') + (prev && prev.e1 ? ' · e1RM ' + prev.e1 : '') + (tested ? ' · 1RM ' + tested.w : '') + '</div></div><button class="iconbtn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'exmenu', i: i }) + '" aria-label="More">⋯</button></div>' +
      (x.cue ? '<p class="tiny muted" style="margin-top:4px">' + esc(x.cue) + '</p>' : '') +
      '<table class="sets"><thead><tr><th>Set</th><th>Previous</th><th>lb</th><th>Reps</th><th></th></tr></thead><tbody>' + x.sets.map(function (s, j) {
        var p = prev && prev.sets[j];
        return '<tr class="' + (s.done ? 'dn' : '') + '"><td>' + (j + 1) + '</td><td class="muted">' + (p ? (p.w ? p.w + ' × ' : '') + p.r : '–') + '</td><td><input class="i" data-wk="' + i + '|' + j + '|w" type="number" inputmode="decimal" step="2.5" min="0" value="' + esc(s.w) + '" placeholder="' + (p && p.w ? p.w : 'lb') + '"></td><td><input class="i" data-wk="' + i + '|' + j + '|r" type="number" inputmode="numeric" min="0" value="' + esc(s.r) + '"></td><td><button class="setchk" data-act="wk-done" data-arg="' + jattr({ i: i, j: j }) + '" aria-pressed="' + !!s.done + '" aria-label="Set done">✓</button></td></tr>';
      }).join('') + '</tbody></table><div class="btns"><button class="btn sm ghost" data-act="wk-set" data-arg="' + jattr({ i: i, d: 1 }) + '">+ Set</button>' + (x.sets.length > 1 ? '<button class="btn sm ghost" data-act="wk-set" data-arg="' + jattr({ i: i, d: -1 }) + '">− Set</button>' : '') + '<button class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'exhist', n: x.n }) + '">History</button></div></section>';
  }).join('');
  html += '<div class="btns"><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'exadd' }) + '">+ Add exercise</button></div>';
  html += '<section class="card stack"><h3>Finish</h3><label class="f">Session effort (RPE)<div class="rpe">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<button type="button" data-act="wk-rpe" data-arg="' + jattr({ v: n }) + '" aria-pressed="' + (w.rpe === n) + '">' + n + '</button>'; }).join('') + '</div></label><label class="f">Notes<input class="i" id="wk-note" value="' + esc(w.note || '') + '"></label>' +
    '<div class="btns"><button class="btn primary" data-act="wk-finish">' + (w.edit ? 'Save changes' : 'Finish workout') + '</button><button class="btn ghost" data-act="wk-discard">' + (w.edit ? 'Cancel' : 'Discard') + '</button></div><p class="tiny muted">Tick ✓ as you finish each set; it starts your rest timer. Only ticked sets are saved. Estimated one-rep max (e1RM) uses weight × (1 + reps ÷ 30), capped at 12 reps.</p></section>';
  html += '<div class="restbar" id="restBar"' + (App.rest ? '' : ' hidden') + '><span>Rest</span><b id="restT">' + (App.rest ? mmss((App.rest.end - Date.now()) / 1000) : '') + '</b><button data-act="rest-add" data-arg="' + jattr({ s: -15 }) + '">−15</button><button data-act="rest-add" data-arg="' + jattr({ s: 15 }) + '">+15</button><button data-act="rest-stop">Skip</button></div>';
  return html;
};
document.addEventListener('input', function (e) {
  var t = e.target; if (!t.dataset || !t.dataset.wk || !App.wk) return;
  var p = t.dataset.wk.split('|'), s = App.wk.ex[+p[0]].sets[+p[1]];
  s[p[2]] = t.value === '' ? '' : +t.value; s.ed = true; App.wk.touched = true;
  clearTimeout(wkSave._t); wkSave._t = setTimeout(wkSave, 300);
});
document.addEventListener('change', function (e) {
  if (e.target.id === 'wk-key' && App.wk) { var d = App.wk.date; App.wk = newWorkout(d, e.target.value); wkSave(); render(); }
  if (e.target.id === 'sh-goal') { var v = $('#sh-goalv'); if (v) v.textContent = e.target.value + ' mi'; }
});
document.addEventListener('input', function (e) { if (e.target.id === 'sh-goal') { var v = $('#sh-goalv'); if (v) v.textContent = e.target.value + ' mi'; } });
ACTIONS['wk-jump'] = function (a) { var el = $('#ex' + a.i); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
ACTIONS['wk-done'] = function (a) {
  var x = App.wk.ex[a.i], s = x.sets[a.j];
  if (!s.done && s.r === '') { toast('Enter reps first'); return; }
  s.done = !s.done; App.wk.touched = true; wkSave();
  if (s.done && x.rest > 0) App.rest = { end: Date.now() + x.rest * 1000, total: x.rest };
  keepScroll(render);
};
ACTIONS['wk-set'] = function (a) {
  var x = App.wk.ex[a.i];
  if (a.d > 0) { var last = x.sets[x.sets.length - 1] || { w: '', r: 8 }; x.sets.push({ w: last.w, r: last.r, done: false }); } else x.sets.pop();
  App.wk.touched = true; wkSave(); keepScroll(render);
};
ACTIONS['wk-rpe'] = function (a) { App.wk.rpe = App.wk.rpe === a.v ? null : a.v; $$('[data-act="wk-rpe"]').forEach(function (b) { b.setAttribute('aria-pressed', String(JSON.parse(b.dataset.arg).v === App.wk.rpe)); }); wkSave(); };
ACTIONS['rest-add'] = function (a) { if (App.rest) { App.rest.end += a.s * 1000; tick(); } };
ACTIONS['rest-stop'] = function () { App.rest = null; var b = $('#restBar'); if (b) b.hidden = true; };
ACTIONS['wk-discard'] = function () {
  if (!App.wk.edit && App.wk.touched && !confirm('Discard this workout?')) return;
  var d = App.wk.date; App.wk = null; App.rest = null; LS.del('rp-wk'); go('#/day/' + d);
};
ACTIONS['wk-finish'] = function () {
  var w = App.wk, ex = {};
  var anyDone = w.ex.some(function (x) { return x.sets.some(function (s) { return s.done; }); });
  w.note = ($('#wk-note') || {}).value || w.note;
  w.ex.forEach(function (x) {
    var ss = x.sets.filter(function (s) { return +s.r > 0 && (s.done || (!anyDone && s.ed)); }).map(function (s) { return { w: +s.w || 0, r: +s.r }; });
    if (!ss.length) return;
    var best = ss.reduce(function (b, s) { return e1rm(s.w, s.r) > e1rm(b.w, b.r) || (!b.w && s.w) ? s : b; }, ss[0]);
    ex[x.n] = { w: best.w, reps: best.r, sets: ss.length, s: ss };
  });
  if (!Object.keys(ex).length) { toast('Tick ✓ on the sets you finished first.'); return; }
  var date = w.date, old = logOf(date).lift || {};
  var mins = w.edit ? (old.min || null) : Math.min(240, Math.max(1, Math.round((Date.now() - w.start) / 60000)));
  var rec = Object.assign({}, old, { key: w.key, lp: w.lp, ex: ex, rpe: w.rpe || old.rpe || null, min: old.src === 'garmin' && old.min ? old.min : mins, note: (w.note || '').trim() });
  Store.edit('logs', date, function (S) { S.logs[date] = S.logs[date] || {}; S.logs[date].lift = rec; });
  App.wk = null; App.rest = null; LS.del('rp-wk');
  var prs = Object.keys(ex).filter(function (n) { var h = liftHistory(n, date); var prevBest = h.reduce(function (m, x) { return Math.max(m, x.e1); }, 0); return prevBest && bestE1(ex[n]) > prevBest; });
  toast(prs.length ? 'Saved — new e1RM best: ' + prs.slice(0, 2).join(', ') : 'Workout saved');
  go('#/progress/strength');
};
function keepScroll(fn) { var y = window.scrollY; fn(); window.scrollTo(0, y); }
SHEETS.exmenu = function (a) {
  var x = App.wk.ex[a.i];
  sheetCtx.i = a.i;
  return '<h3>' + esc(x.n) + '</h3><div class="stack tight"><button class="btn" data-act="sheet" data-arg="' + jattr({ sheet: 'exhist', n: x.n }) + '">History & graph</button><button class="btn" data-act="sheet" data-arg="' + jattr({ sheet: 'orm', n: x.n }) + '">Record a tested 1RM</button><button class="btn" data-act="sheet" data-arg="' + jattr({ sheet: 'exadd', swap: a.i }) + '">Substitute exercise</button><button class="btn danger" data-act="wk-remove" data-arg="' + jattr({ i: a.i }) + '">Remove from today</button></div><div class="btns"><button class="btn ghost" data-act="sheet-close">Close</button></div>';
};
ACTIONS['wk-remove'] = function (a) { App.wk.ex.splice(a.i, 1); App.wk.touched = true; wkSave(); closeSheet(); render(); };
SHEETS.exadd = function (a) {
  sheetCtx.swap = a.swap;
  return '<h3>' + (a.swap != null ? 'Substitute exercise' : 'Add exercise') + '</h3><label class="f">Exercise<input class="i" id="exa-n" list="exa-list" placeholder="e.g. Leg press" autocomplete="off"></label><datalist id="exa-list">' + allLiftNames().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist><div class="grid3"><label class="f">Sets<input class="i" id="exa-s" type="number" min="1" value="3"></label><label class="f">Reps<input class="i" id="exa-r" type="number" min="1" value="8"></label><label class="f">Rest (s)<input class="i" id="exa-rest" type="number" min="0" step="15" value="90"></label></div>' + sheetBtns(a.swap != null ? 'Substitute' : 'Add');
};
SAVE2.exadd = function () {
  var n = $('#exa-n').value.trim(); if (!n) { $('#shErr').textContent = 'Name the exercise.'; return; }
  var sets = Math.max(1, +$('#exa-s').value || 3), reps = +$('#exa-r').value || 8, prev = liftHistory(n, App.wk.date).pop(), mod = findEx(n), arr = [];
  for (var i = 0; i < sets; i++) { var p = prev && (prev.sets[i] || prev.sets[prev.sets.length - 1]); arr.push({ w: p && p.w ? p.w : '', r: reps, done: false }); }
  var x = { n: n, rx: sets + '×' + reps, rest: +$('#exa-rest').value || 0, cue: mod ? mod.cue : '', sets: arr };
  if (sheetCtx.swap != null) App.wk.ex.splice(sheetCtx.swap, 1, x); else App.wk.ex.push(x);
  App.wk.touched = true; wkSave(); closeSheet(); render();
};
SHEETS.exhist = function (a) {
  var h = liftHistory(a.n), tested = (st().orm || []).filter(function (o) { return o.n === a.n; }).sort(function (x, y) { return x.date < y.date ? 1 : -1; });
  var best = h.reduce(function (m, x) { return Math.max(m, x.e1); }, 0);
  return '<h3>' + esc(a.n) + '</h3><div class="grid3" style="margin-top:6px"><div class="metric"><span>Best e1RM</span><b>' + (best || '–') + '</b></div><div class="metric"><span>Tested 1RM</span><b>' + (tested[0] ? tested[0].w : '–') + '</b></div><div class="metric"><span>Sessions</span><b>' + h.length + '</b></div></div>' +
    (h.length >= 2 ? lineChart(h.map(function (x) { return x.date; }), [{ name: 'Estimated 1RM (lb)', vals: h.map(function (x) { return x.e1; }), color: 'var(--blue)' }]) : '') +
    '<div style="max-height:40vh;overflow:auto">' + (h.length ? h.slice().reverse().map(function (x) { return '<div class="list-item"><div class="n small"><b>' + fmtD(x.date, { month: 'short', day: 'numeric', year: 'numeric' }) + '</b></div><div class="d mono small">e1RM ' + x.e1 + '</div><div class="c">' + x.sets.map(function (s) { return (s.w ? s.w + ' × ' : '') + s.r; }).join(', ') + '</div></div>'; }).join('') : '<p class="empty">No history yet.</p>') +
    tested.map(function (o) { return '<div class="list-item"><div class="n small"><b>Tested 1RM · ' + fmtD(o.date, { month: 'short', day: 'numeric', year: 'numeric' }) + '</b></div><div class="d"><button class="btn sm ghost" data-act="del-orm" data-arg="' + jattr({ id: o.id }) + '">Remove</button></div><div class="c">' + o.w + ' lb' + (o.r > 1 ? ' × ' + o.r : '') + '</div></div>'; }).join('') + '</div>' +
    '<div class="btns"><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'orm', n: a.n }) + '">Record a tested 1RM</button><button class="btn ghost" data-act="sheet-close">Close</button></div>';
};
SHEETS.orm = function (a) {
  sheetCtx.n = a.n;
  return '<h3>Record a 1RM</h3><p class="small muted">' + esc(a.n || '') + '. Only test a true max with a spotter or safety bars, and not in race week.</p>' + (a.n ? '' : '<label class="f">Exercise<input class="i" id="orm-n" list="orm-list"></label><datalist id="orm-list">' + allLiftNames().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>') +
    '<div class="grid3"><label class="f">Weight (lb)<input class="i" id="orm-w" type="number" step="2.5" inputmode="decimal"></label><label class="f">Reps<input class="i" id="orm-r" type="number" min="1" value="1"></label><label class="f">Date<input class="i" id="orm-d" type="date" value="' + App.today + '"></label></div>' + sheetBtns('Save');
};
SAVE2.orm = function () {
  var n = sheetCtx.n || ($('#orm-n') ? $('#orm-n').value.trim() : ''), w = +$('#orm-w').value, r = +$('#orm-r').value || 1;
  if (!n || !(w > 0)) { $('#shErr').textContent = 'Enter the exercise and weight.'; return; }
  var o = { id: uid(), n: n, w: r > 1 ? e1rm(w, r) : w, raw: w, r: r, date: $('#orm-d').value || App.today };
  Store.edit('orm', o.id, function (S) { S.orm.push(o); });
  closeSheet(); toast(r > 1 ? 'Saved — estimated 1RM ' + o.w + ' lb' : '1RM saved');
};
ACTIONS['del-orm'] = function (a) { Store.edit('orm', a.id, function (S) { S.orm = S.orm.filter(function (x) { return x.id !== a.id; }); }); closeSheet(); };

/* ---------- timers ---------- */
function tick() {
  if (App.view === 'workout' && App.wk && !App.wk.edit) { var c = $('#wkClock'); if (c) c.textContent = mmss((Date.now() - App.wk.start) / 1000); }
  if (App.rest) {
    var left = (App.rest.end - Date.now()) / 1000, b = $('#restBar'), t = $('#restT');
    if (b) b.hidden = false; if (t) t.textContent = mmss(left);
    if (left <= 0) { App.rest = null; if (b) b.hidden = true; try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* ignore */ } toast('Rest done — next set'); }
  }
}
setInterval(tick, 1000);

/* ---------- calendar ---------- */
VIEWS.calendar = function () {
  var t = App.today, mk = /^\d{4}-\d{2}$/.test(App.args[0] || '') ? App.args[0] : monthKey(t);
  var first = mk + '-01', start = E.monday(first), last = E.addD(addMonths(mk, 1) + '-01', -1), end = E.addD(E.monday(last), 6);
  var all = activities(), byD = {};
  all.forEach(function (a) { if (a.date >= start && a.date <= end) (byD[a.date] = byD[a.date] || []).push(a); });
  var inM = all.filter(function (a) { return a.date >= first && a.date <= last; });
  var runs = inM.filter(function (a) { return a.kind === 'run'; });
  var html = '<div class="pagehead spread"><h1>' + monthLabel(mk, { month: 'long' }) + ' <span class="muted" style="font-weight:700">' + mk.slice(0, 4) + '</span></h1><div class="row"><a class="iconbtn" href="#/calendar/' + addMonths(mk, -1) + '" aria-label="Previous month">‹</a>' + (mk !== monthKey(t) ? '<a class="btn sm ghost" href="#/calendar">Today</a>' : '') + '<a class="iconbtn" href="#/calendar/' + addMonths(mk, 1) + '" aria-label="Next month">›</a></div></div>';
  html += '<div class="grid4"><div class="metric"><span>Runs</span><b>' + runs.length + '</b></div><div class="metric"><span>Miles</span><b>' + mi(sumMi(runs)) + '</b></div><div class="metric"><span>Time</span><b style="font-size:1rem">' + hms(runs.reduce(function (s, a) { return s + (a.sec || 0); }, 0)) + '</b></div><div class="metric"><span>Gym</span><b>' + inM.filter(function (a) { return a.kind === 'lift'; }).length + '</b></div></div>';
  var cells = '';
  for (var d = start; d <= end; d = E.addD(d, 1)) {
    var day = dayOf(d), acts = byD[d] || [], out = d < first || d > last;
    var dots = day ? day.parts.filter(function (x) { return x.type !== 'rest'; }).map(function (x) { return '<i class="t-' + x.type + (partDone(d, x) ? ' dn' : '') + '"></i>'; }).join('') : '';
    if (!day) dots = acts.slice(0, 3).map(function (a) { return '<i class="t-' + (a.kind === 'run' ? 'easy' : a.kind === 'lift' ? 'strength' : 'cross') + ' dn"></i>'; }).join('');
    var runMi = sumMi(acts.filter(function (a) { return a.kind === 'run'; }));
    var href = day ? '#/day/' + d : acts.length ? '#/activity/' + encodeURIComponent(acts[0].key) : '';
    cells += '<' + (href ? 'a href="' + href + '"' : 'span') + ' class="' + (d === t ? 'today ' : '') + (out ? 'out ' : '') + '"><b>' + E.pd(d).getDate() + '</b><span class="dots">' + dots + '</span><small>' + (runMi ? mi(runMi) : '') + '</small></' + (href ? 'a' : 'span') + '>';
  }
  html += '<section class="card"><div class="calgrid">' + E.DOW.map(function (x) { return '<em>' + x.charAt(0) + '</em>'; }).join('') + cells + '</div><p class="tiny muted" style="margin-top:8px">Dots are planned sessions (ringed when done). Numbers are miles run.</p></section>';
  /* week by week */
  for (var w0 = start; w0 <= end; w0 = E.addD(w0, 7)) {
    var w1 = E.addD(w0, 6), wr = all.filter(function (a) { return a.date >= w0 && a.date <= w1 && a.kind === 'run'; });
    var pw = App.plan ? E.weekOf(App.plan, w0) : null;
    html += '<div class="sechead"><h2 style="font-size:1.05rem">' + fmtD(w0, { month: 'short', day: 'numeric' }) + ' – ' + fmtD(w1, { month: 'short', day: 'numeric' }) + '</h2><span class="small muted">' + mi(sumMi(wr)) + (pw ? ' of ' + mi(pw.tot.mi) : '') + ' mi' + (pw ? ' · wk ' + pw.n : '') + '</span></div><section class="card calweek">';
    for (var dd = w0; dd <= w1; dd = E.addD(dd, 1)) {
      var dy = dayOf(dd), ac = (byD[dd] || []).slice().reverse(), items = '';
      ac.forEach(function (a) { items += actRow(a, { date: false }).replace('class="actrow"', 'class="actrow done"'); });
      if (dy) dy.parts.forEach(function (x) {
        if (x.type === 'rest') { if (!ac.length) items += '<a class="calplan rest" href="#/day/' + dd + '">Rest day</a>'; return; }
        if (partDone(dd, x)) return;
        items += '<a class="calplan t-' + x.type + '" href="#/day/' + dd + '"><i></i>' + esc(x.title) + (E.isRun(x) ? ' · ' + mi(x.mi) + ' mi' : x.min ? ' · ' + x.min + ' min' : '') + (dd < t ? ' <span class="pill warn" style="padding:0 7px">missed</span>' : '') + '</a>';
      });
      if (!items) items = '<span class="calplan rest">–</span>';
      html += '<div class="calday' + (dd === t ? ' today' : '') + '"><div class="d">' + E.DOW[E.dow(dd)] + '<b>' + E.pd(dd).getDate() + '</b></div><div class="items">' + items + '</div></div>';
    }
    html += '</section>';
  }
  return html;
};

/* ---------- progress (rebuilt tabs) ---------- */
var _progOld = VIEWS.progress;
VIEWS.progress = function () {
  var p = App.plan; if (!p) return setupNeeded();
  var tab = App.args[0] || 'overview';
  if (tab === 'running') tab = 'performance';
  if (tab === 'recovery') tab = 'health';
  var head = '<div class="pagehead"><h1>Progress</h1></div><div class="tabs" role="group" aria-label="Progress section">' + [['overview', 'Overview'], ['workouts', 'Workouts'], ['performance', 'Performance'], ['health', 'Health'], ['strength', 'Strength']].map(function (x) { return '<button data-act="nav" data-arg="' + jattr({ to: '#/progress/' + x[0], replace: true }) + '" aria-pressed="' + (tab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
  App.after = function () { var b = document.querySelector('.tabs [aria-pressed="true"]'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'center' }); };
  if (tab === 'overview') { var o = _progOld(); return head + o.slice(o.indexOf('</div>', o.indexOf('class="seg"')) + 6); }
  if (tab === 'workouts') return head + progWorkouts();
  if (tab === 'performance') return head + progPerformance();
  if (tab === 'health') return head + progHealth();
  return head + progStrength();
};
function progWorkouts() {
  var t = App.today, mk = App.ui.wm || monthKey(t), f = App.ui.wf || 'all';
  var list = activities().filter(function (a) { return monthKey(a.date) === mk && (f === 'all' || a.kind === f); });
  var runs = list.filter(function (a) { return a.kind === 'run'; });
  var html = '<div class="spread" style="margin-top:4px"><button class="iconbtn" data-act="ui" data-arg="' + jattr({ k: 'wm', v: addMonths(mk, -1) }) + '" aria-label="Previous month">‹</button><div style="text-align:center"><b>' + monthLabel(mk) + '</b><div class="tiny muted">' + plural(list.length, 'activity').replace('activitys', 'activities') + (runs.length ? ' · ' + mi(sumMi(runs)) + ' mi' : '') + '</div></div><button class="iconbtn" data-act="ui" data-arg="' + jattr({ k: 'wm', v: addMonths(mk, 1) }) + '" aria-label="Next month"' + (mk >= monthKey(t) ? ' disabled' : '') + '>›</button></div>';
  html += '<div class="chips">' + [['all', 'All'], ['run', 'Runs'], ['lift', 'Strength'], ['other', 'Other']].map(function (x) { return '<button class="chip" data-act="ui" data-arg="' + jattr({ k: 'wf', v: x[0] }) + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
  html += '<section class="card">' + (list.length ? list.map(function (a) { return actRow(a); }).join('') : '<p class="empty">Nothing this month.</p>') + '</section>';
  return html;
}
function prRecords() {
  var rec = {};
  activities().forEach(function (a) {
    if (a.kind !== 'run') return;
    var b = a.g && a.g.best;
    BEST.forEach(function (x) {
      var s = b && b[x[0]];
      if (!s && a.mi && a.sec && a.mi >= x[2] * 0.985 && a.mi <= x[2] * 1.04) s = a.sec * x[2] / a.mi;  /* whole run close to the distance */
      if (s && (!rec[x[0]] || s < rec[x[0]].sec)) rec[x[0]] = { sec: s, date: a.date, key: a.key };
    });
  });
  return rec;
}
function progPerformance() {
  var t = App.today, by = App.ui.pb || 'week', all = activities(), runs = all.filter(function (a) { return a.kind === 'run'; });
  var html = segBtns('pb', [['week', 'By week'], ['month', 'By month']], by);
  var buckets = [];
  if (by === 'week') { var m0 = E.monday(t); for (var i = 11; i >= 0; i--) { var s = E.addD(m0, -7 * i); buckets.push({ from: s, to: E.addD(s, 6), label: E.pd(s).getDate() }); } }
  else { var mk = monthKey(t); for (var j = 11; j >= 0; j--) { var k = addMonths(mk, -j); buckets.push({ from: k + '-01', to: E.addD(addMonths(k, 1) + '-01', -1), label: monthLabel(k, { month: 'short' }).charAt(0) }); } }
  buckets.forEach(function (b) { var r = runs.filter(function (a) { return a.date >= b.from && a.date <= b.to; }); b.mi = sumMi(r); b.sec = r.reduce(function (s, a) { return s + (a.sec || 0); }, 0); b.n = r.length; });
  var cur = buckets[buckets.length - 1];
  html += '<section class="card"><div class="eyebrow">' + (by === 'week' ? 'This week · ' + fmtD(cur.from, { month: 'short', day: 'numeric' }) + ' – ' + fmtD(cur.to, { month: 'short', day: 'numeric' }) : monthLabel(monthKey(t))) + '</div><div class="grid3" style="margin-top:8px"><div class="metric"><span>Miles</span><b>' + mi(cur.mi) + '</b></div><div class="metric"><span>Time</span><b>' + hms(cur.sec) + '</b></div><div class="metric"><span>Runs</span><b>' + cur.n + '</b></div></div>' +
    barChart(buckets.map(function (b, i) { return { label: b.label, a: 0, b: b.mi, cur: i === buckets.length - 1, all: true }; })).replace('aria-label="Weekly miles"', 'aria-label="Miles"') + '</section>';
  /* personal records */
  var rec = prRecords();
  html += '<div class="sechead"><h2>Personal records</h2></div><section class="card"><div class="badges">' + BEST.map(function (x) { var r = rec[x[0]]; return r ? '<a class="badge" href="#/activity/' + encodeURIComponent(r.key) + '"><i>' + x[1] + '</i><b>' + E.clock(r.sec) + '</b><small>' + fmtD(r.date, { month: 'short', day: 'numeric', year: 'numeric' }) + '</small></a>' : '<div class="badge off"><i>' + x[1] + '</i><b>–</b><small>not yet</small></div>'; }).join('') + '</div><p class="tiny muted" style="margin-top:8px">From Garmin\'s fastest splits inside each run, or whole runs of that distance.</p></section>';
  /* all-time */
  var yr = runs.filter(function (a) { return a.date.slice(0, 4) === t.slice(0, 4); });
  var wk = {}; runs.forEach(function (a) { var k = E.monday(a.date); wk[k] = (wk[k] || 0) + a.mi; });
  var bigK = Object.keys(wk).reduce(function (a, b) { return !a || wk[b] > wk[a] ? b : a; }, null);
  var longest = runs.reduce(function (a, b) { return !a || b.mi > a.mi ? b : a; }, null);
  html += '<div class="sechead"><h2>All-time stats</h2></div><div class="tiles">' + [
    ['Total distance', Math.round(sumMi(runs)) + ' mi', plural(runs.length, 'run')],
    [t.slice(0, 4), Math.round(sumMi(yr)) + ' mi', plural(yr.length, 'run')],
    ['Total time', hms(runs.reduce(function (s, a) { return s + (a.sec || 0); }, 0)), 'running'],
    ['Longest run', longest ? mi(longest.mi) + ' mi' : '–', longest ? fmtD(longest.date, { month: 'short', day: 'numeric', year: 'numeric' }) : ''],
    ['Biggest week', bigK ? mi(wk[bigK]) + ' mi' : '–', bigK ? 'week of ' + fmtD(bigK, { month: 'short', day: 'numeric', year: '2-digit' }) : ''],
    ['All activities', all.length, 'incl. gym & walks']
  ].map(function (x) { return '<div class="tile"><span>' + x[0] + '</span><b style="font-size:1.35rem">' + x[1] + '</b><em>' + x[2] + '</em></div>'; }).join('') + '</div>';
  /* fitness summary */
  var an = App.an || {};
  html += '<a class="card" href="#/fitness" style="text-decoration:none;color:inherit;display:block"><div class="spread"><h3>VO2 max & threshold</h3><span class="chev">›</span></div><div class="grid3" style="margin-top:8px"><div class="metric"><span>VO2 max</span><b>' + (an.vo2 ? an.vo2.v : '–') + '</b></div><div class="metric"><span>LT pace</span><b>' + (an.lt && an.lt.pace ? pace(an.lt.pace) : '–') + '</b></div><div class="metric"><span>LT HR</span><b>' + (an.lt && an.lt.hr ? an.lt.hr : '–') + '</b></div></div></a>';
  /* the old running tab: monthly table, easy pace vs HR, all runs */
  return html + runningExtras();
}
function runningExtras() {
  var save = App.args.slice(); App.args = ['running'];
  var o = _progOld(); App.args = save;
  return o.split('<section class="card">').slice(1).filter(function (x) { return !/^<h3>(Monthly miles|Personal bests|VO2max)</.test(x); }).map(function (x) { return '<section class="card">' + x; }).join('');
}
/* health trends */
var HM = [
  { k: 'rhr', n: 'Resting heart rate', u: 'bpm', good: -1, c: 'var(--red)', nd: 0 },
  { k: 'hrv', n: 'HRV (overnight)', u: 'ms', good: 1, c: 'var(--violet)', nd: 0 },
  { k: 'sleepH', n: 'Sleep', u: 'h', good: 1, c: 'var(--blue)', nd: 1 },
  { k: 'sleepScore', n: 'Sleep score', u: '', good: 1, c: 'var(--blue)', nd: 0 },
  { k: 'bbHigh', n: 'Body Battery peak', u: '', good: 1, c: 'var(--gold)', nd: 0 },
  { k: 'stress', n: 'Stress', u: '', good: -1, c: 'var(--amber)', nd: 0 },
  { k: 'steps', n: 'Steps', u: '', good: 1, c: 'var(--green)', nd: 0 },
  { k: 'weight', n: 'Weight', u: 'lb', good: 0, c: 'var(--slate)', nd: 1 }
];
function healthVal(d, k) {
  var g = Store.garmin;
  if (k === 'weight') { var w = g && g.fitness && g.fitness.weight; return w && w[d] != null ? +w[d] : null; }
  var r = g && g.days && g.days[d]; return r && typeof r[k] === 'number' ? r[k] : null;
}
function progHealth() {
  var t = App.today, R = App.ui.hr || '12w', days = { '4w': 28, '12w': 84, '6m': 182, '1y': 365 }[R];
  var html = segBtns('hr', [['4w', '4W'], ['12w', '12W'], ['6m', '6M'], ['1y', '1Y']], R);
  if (!(Store.garmin && Store.garmin.days)) return html + '<section class="card"><h3>No health data yet</h3><p class="small muted">Connect Garmin to trend resting heart rate, HRV, sleep, Body Battery, stress, steps and weight.</p><div class="btns" style="margin-top:10px"><a class="btn primary" href="#/sync">Connect Garmin</a></div></section>';
  var dates = []; for (var i = days - 1; i >= 0; i--) dates.push(E.addD(t, -i));
  var weekly = days > 90;
  var avg = function (k, a, b) { var v = []; for (var q = a; q < b; q++) { var x = healthVal(E.addD(t, -q), k); if (x != null) v.push(x); } return v.length ? E.mean(v) : null; };
  /* readiness first */
  var rds = dates.slice(-Math.min(days, 42)).map(function (d) { var r = E.readiness(st(), Store.garmin, d); return r.factors ? r.score : null; });
  html += '<section class="card"><h3>Readiness</h3>' + lineChart(dates.slice(-Math.min(days, 42)), [{ name: 'Readiness score', vals: rds, color: 'var(--green)' }]) + '</section>';
  HM.forEach(function (m) {
    var a7 = avg(m.k, 0, 7), base = avg(m.k, 7, 35);
    if (a7 == null && avg(m.k, 0, days) == null) return;
    var ch = a7 != null && base != null ? a7 - base : null, tol = Math.max(0.5, Math.abs(base || 0) * 0.03);
    var dir = ch == null || Math.abs(ch) < tol ? 0 : ch > 0 ? 1 : -1, good = m.good === 0 ? 0 : dir * m.good;
    var fmt = function (v) { return v == null ? '–' : m.k === 'steps' ? Math.round(v).toLocaleString() : v.toFixed(m.nd); };
    var ds = dates, vals;
    if (weekly) { ds = []; vals = []; for (var w = days - 7; w >= 0; w -= 7) { var v = []; for (var q = w; q < w + 7; q++) { var x = healthVal(E.addD(t, -q), m.k); if (x != null) v.push(x); } ds.push(E.addD(t, -w)); vals.push(v.length ? E.mean(v) : null); } }
    else vals = dates.map(function (d) { return healthVal(d, m.k); });
    html += '<section class="card hm"><div class="spread"><div><div class="eyebrow">' + m.n + '</div><b class="hv">' + fmt(a7) + '<small> ' + m.u + '</small></b><div class="tiny muted">7-day average</div></div><div class="trend ' + (good > 0 ? 'good' : good < 0 ? 'bad' : '') + '">' + (dir > 0 ? '▲' : dir < 0 ? '▼' : '▬') + ' ' + (ch == null ? '' : (ch > 0 ? '+' : '') + (m.k === 'steps' ? Math.round(ch).toLocaleString() : ch.toFixed(m.nd || 1))) + '<small>vs your 4-week normal</small></div></div>' +
      lineChart(ds, [{ name: (weekly ? 'Weekly average' : 'Daily') + (m.u ? ' (' + m.u + ')' : ''), vals: vals, color: m.c, fmt: function (v) { return fmt(v); } }]) + '</section>';
  });
  var an = App.an || {};
  if (an.vo2 && an.vo2.hist.length) { var vh = an.vo2.hist.filter(function (x) { return x.date >= dates[0]; }); if (vh.length >= 2) html += '<section class="card"><div class="spread"><h3>VO2 max</h3><a class="small muted" href="#/fitness">Details</a></div>' + lineChart(vh.map(function (x) { return x.date; }), [{ name: 'VO2 max', vals: vh.map(function (x) { return x.v; }), color: 'var(--violet)' }]) + '</section>'; }
  return html;
}
/* strength progress */
function liftSeriesAll() {
  var logs = st().logs || {}, by = {};
  Object.keys(logs).sort().forEach(function (d) { var l = logs[d].lift; if (!l || !l.ex) return; Object.keys(l.ex).forEach(function (n) { var e = bestE1(l.ex[n]); if (!e) return; (by[n] = by[n] || []).push({ date: d, e1: e, sets: setsOf(l.ex[n]) }); }); });
  return by;
}
function progStrength() {
  var t = App.today, by = liftSeriesAll(), names = Object.keys(by), logs = st().logs || {}, orm = st().orm || [];
  var html = '<div class="btns" style="margin-top:4px"><a class="btn primary" href="#/workout/' + t + '">Start a workout</a><button class="btn" data-act="sheet" data-arg="' + jattr({ sheet: 'orm' }) + '">Record a 1RM</button></div>';
  if (!names.length) html += '<section class="card"><h3>No sets logged yet</h3><p class="small muted">Start a workout from any strength day. Log weight and reps for each set and your estimated one-rep max (e1RM), personal bests and graphs build here.</p></section>';
  else {
    var cutoff = E.addD(t, -28);
    var top = names.map(function (n) { var s = by[n], curE = s.reduce(function (m, x) { return Math.max(m, x.e1); }, 0), old = s.filter(function (x) { return x.date <= cutoff; }).reduce(function (m, x) { return Math.max(m, x.e1); }, 0); return { n: n, e1: curE, ch: old ? curE - old : null, last: s[s.length - 1] }; }).sort(function (a, b) { return b.e1 - a.e1; });
    html += '<div class="sechead"><h2>Top estimated 1RM</h2></div><section class="card">' + top.slice(0, 5).map(function (x) {
      return '<button class="liftrow" data-act="ui" data-arg="' + jattr({ k: 'lift', v: x.n }) + '"><span class="sh"><b>' + esc(x.n) + '</b><small>last ' + fmtD(x.last.date, { month: 'short', day: 'numeric' }) + ' · ' + x.last.sets.map(function (s) { return (s.w ? s.w + '×' : '') + s.r; }).slice(0, 4).join(', ') + '</small></span><span class="num"><b>' + x.e1 + '</b>' + (x.ch ? '<em class="' + (x.ch > 0 ? 'up' : 'down') + '">' + (x.ch > 0 ? '↗ +' : '↘ ') + x.ch + '</em>' : '') + '</span></button>';
    }).join('') + '<p class="tiny muted" style="margin-top:6px">Best e1RM in lb. Change compares with 4 weeks ago.</p></section>';
    var sel = App.ui.lift && by[App.ui.lift] ? App.ui.lift : top[0].n, s = by[sel];
    var tested = orm.filter(function (o) { return o.n === sel; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    html += '<div class="sechead"><h2>Graph</h2></div><section class="card"><select class="i" id="liftSel">' + top.map(function (x) { return '<option' + (x.n === sel ? ' selected' : '') + '>' + esc(x.n) + '</option>'; }).join('') + '</select>' +
      (s.length >= 2 ? lineChart(s.map(function (x) { return x.date; }), [{ name: 'Estimated 1RM (lb)', vals: s.map(function (x) { return x.e1; }), color: 'var(--blue)' }]) : '<p class="small muted" style="margin-top:8px">One session so far. The graph appears after your second.</p>') +
      (s.length >= 2 ? lineChart(s.map(function (x) { return x.date; }), [{ name: 'Top set weight (lb)', vals: s.map(function (x) { return x.sets.reduce(function (m, y) { return Math.max(m, +y.w || 0); }, 0) || null; }), color: 'var(--green)' }]) : '') +
      (tested.length ? '<p class="small" style="margin-top:6px"><b>Tested 1RM:</b> ' + tested.map(function (o) { return o.w + ' lb (' + fmtD(o.date, { month: 'short', day: 'numeric' }) + ')'; }).join(', ') + '</p>' : '') +
      '<div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Date</th><th>Sets</th><th class="num">e1RM</th></tr></thead><tbody>' + s.slice().reverse().slice(0, 12).map(function (x) { return '<tr><td>' + fmtD(x.date, { month: 'short', day: 'numeric', year: '2-digit' }) + '</td><td class="small">' + x.sets.map(function (y) { return (y.w ? y.w + '×' : '') + y.r; }).join(', ') + '</td><td class="num">' + x.e1 + '</td></tr>'; }).join('') + '</tbody></table></div><div class="btns"><button class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'exhist', n: sel }) + '">Full history</button><button class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'orm', n: sel }) + '">Record 1RM</button></div></section>';
    /* weekly volume */
    var m0 = E.monday(t), vol = [];
    for (var i = 11; i >= 0; i--) { var a = E.addD(m0, -7 * i), b = E.addD(a, 6), v = 0; Object.keys(logs).forEach(function (d) { if (d < a || d > b) return; var l = logs[d].lift; if (l && l.ex) Object.keys(l.ex).forEach(function (n) { setsOf(l.ex[n]).forEach(function (x) { v += (+x.w || 0) * (+x.r || 0); }); }); }); vol.push({ label: E.pd(a).getDate(), a: 0, b: Math.round(v / 1000), cur: i === 0, all: true }); }
    html += '<section class="card"><h3>Weekly volume</h3><p class="small muted">Thousands of lb lifted (weight × reps).</p>' + barChart(vol) + '</section>';
  }
  /* workouts per month incl. Garmin strength sessions */
  var mk = monthKey(t), months = [];
  for (var j = 11; j >= 0; j--) months.push(addMonths(mk, -j));
  var lifts = activities().filter(function (a) { return a.kind === 'lift'; });
  html += '<section class="card"><div class="spread"><h3>Gym sessions</h3><span class="small muted">' + lifts.filter(function (a) { return monthKey(a.date) === mk; }).length + ' this month</span></div>' + barChart(months.map(function (m) { return { label: monthLabel(m, { month: 'short' }).charAt(0), a: 0, b: lifts.filter(function (a) { return monthKey(a.date) === m; }).length, cur: m === mk, all: true }; })) + '</section>';
  if (App.plan && App.week) { var cur = App.week.n; html += '<section class="card"><h3>Planned vs done</h3>' + barChart(App.plan.weeks.slice(Math.max(0, cur - 12), cur).map(function (w) { var n2 = 0; w.days.forEach(function (d) { if ((logs[d.date] || {}).lift) n2++; }); return { label: w.n, a: w.tot.lifts, b: n2, cur: w.n === cur }; })) + '</section>'; }
  return html;
}
document.addEventListener('change', function (e) { if (e.target.id === 'liftSel') { App.ui.lift = e.target.value; keepScroll(render); } });

/* ---------- VO2 max & lactate threshold ---------- */
function gauge(v) {
  var lo = 30, hi = 70, f = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  var segs = [['var(--danger)', 0, 0.25], ['var(--amber)', 0.25, 0.45], ['var(--green)', 0.45, 0.65], ['var(--blue)', 0.65, 0.82], ['var(--violet)', 0.82, 1]];
  var R = 80, cx = 100, cy = 96, a0 = Math.PI * 0.85, span = Math.PI * 1.3;
  function pt(t) { var a = a0 + span * t; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; }
  var s = '<svg class="gauge" viewBox="0 0 200 170" role="img" aria-label="VO2 max ' + v + '">';
  segs.forEach(function (g) { var p0 = pt(g[1] + 0.006), p1 = pt(g[2] - 0.006); s += '<path d="M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + ' A' + R + ' ' + R + ' 0 0 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) + '" stroke="' + g[0] + '" stroke-width="12" fill="none" stroke-linecap="round"/>'; });
  var p = pt(f);
  s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="10" fill="var(--ink)" stroke="var(--card)" stroke-width="4"/><text x="100" y="104" text-anchor="middle" style="font-size:44px;font-weight:800;fill:var(--ink)">' + v + '</text><text x="100" y="126" text-anchor="middle" style="font-size:12px;fill:var(--muted)">ml/kg/min</text></svg>';
  return s;
}
function fitnessPromptNeeded() {
  var an = App.an; if (!an || !st().profile) return null;
  var fr = an.readings || [], t = App.today;
  var vo2 = E.latestReading(fr, 'vo2'), lt = E.latestReading(fr, 'ltPace') || E.latestReading(fr, 'ltHr');
  var stale = function (r) { return !r || E.diffD(r.date, t) >= 7; };
  var need = [];
  if (stale(vo2)) need.push('VO2 max');
  if (stale(lt)) need.push('lactate threshold');
  if (!need.length) return null;
  var sn = (st().prefs || {}).fitSnooze;
  if (sn && E.diffD(sn, t) < 7) return null;
  return need;
}
function fitnessPromptCard() {
  var need = fitnessPromptNeeded(); if (!need) return '';
  return '<section class="card promptcard"><div class="eyebrow">Weekly fitness check</div><h3 style="margin-top:2px">Update your ' + need.join(' and ') + '</h3><p class="small muted" style="margin-top:4px">In the Garmin Connect app: ☰ More → Performance Stats → VO2 Max and Lactate Threshold. Enter the numbers here and your paces update.</p><div class="btns" style="margin-top:10px"><button class="btn sm primary" data-act="sheet" data-arg="' + jattr({ sheet: 'metrics' }) + '">Enter readings</button><button class="btn sm ghost" data-act="fit-snooze">Not this week</button></div></section>';
}
ACTIONS['fit-snooze'] = function () { Store.edit('prefs', 'fitSnooze', function (S) { S.prefs.fitSnooze = App.today; }); toast('I\'ll ask again next week'); };
VIEWS.fitness = function () {
  var an = App.an || {}, fr = an.readings || [], t = App.today, R = App.ui.fr || '12w', days = { '4w': 28, '12w': 84, '6m': 182, '1y': 365 }[R];
  var vo2 = E.latestReading(fr, 'vo2'), ltp = E.latestReading(fr, 'ltPace'), lth = E.latestReading(fr, 'ltHr');
  var you = (st().metrics || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  var pw = you.filter(function (m) { return m.ltPower; })[0];
  var srcTxt = function (r) { return r ? (r.src === 'garmin' ? 'Garmin' : 'You') + ' · ' + fmtD(r.date, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No reading yet'; };
  var html = '<div class="pagehead"><h1>VO2 max & threshold</h1><p>Your paces follow these numbers. Garmin values sync automatically when available; otherwise the app asks you once a week.</p></div>';
  html += fitnessPromptCard();
  html += segBtns('fr', [['4w', '4W'], ['12w', '12W'], ['6m', '6M'], ['1y', '1Y']], R);
  var from = E.addD(t, -days);
  /* VO2 max */
  var vh = (an.vo2 ? an.vo2.hist : []).filter(function (x) { return x.date >= from; });
  html += '<section class="card"><div class="spread"><h3>VO2 max</h3><span class="tiny muted">' + srcTxt(vo2) + '</span></div>' + (vo2 ? '<div style="max-width:260px;margin:4px auto 0">' + gauge(vo2.vo2) + '</div><p class="small muted" style="text-align:center">On its own, VO2 max ' + vo2.vo2 + ' suggests race fitness around VDOT ' + E.vdotFromVo2(vo2.vo2).toFixed(1) + ' (a ' + E.clock(E.predict(E.vdotFromVo2(vo2.vo2), 13.1094)) + ' half). Watch VO2 max often reads high, so your paces lean on threshold and race results first.</p>' : '<p class="empty">No VO2 max yet.</p>') +
    (vh.length >= 2 ? lineChart(vh.map(function (x) { return x.date; }), [{ name: 'VO2 max', vals: vh.map(function (x) { return x.v; }), color: 'var(--violet)' }]) : '') + '</section>';
  /* Lactate threshold */
  var lh = fr.filter(function (m) { return m.date >= from && (m.ltPace || m.ltHr); });
  html += '<section class="card"><div class="spread"><h3>Lactate threshold</h3><span class="tiny muted">' + srcTxt(ltp || lth) + '</span></div><div class="ltgrid"><div><b>' + (lth ? lth.ltHr : '–') + '<small> bpm</small></b><span><i style="background:var(--red)"></i>Heart rate</span></div><div><b>' + (ltp ? pace(ltp.ltPace) : '–') + '<small> /mi</small></b><span><i style="background:var(--blue)"></i>Pace</span></div><div><b>' + (pw ? pw.ltPower : '–') + '<small> W</small></b><span><i style="background:var(--violet)"></i>Power</span></div><div><b>' + (pw && pw.ltWkg ? pw.ltWkg : '–') + '<small> W/kg</small></b><span><i style="background:var(--violet)"></i>Power (W/kg)</span></div></div>' +
    (lh.filter(function (m) { return m.ltPace; }).length >= 2 ? lineChart(lh.filter(function (m) { return m.ltPace; }).map(function (m) { return m.date; }), [{ name: 'Threshold pace (min/mi)', vals: lh.filter(function (m) { return m.ltPace; }).map(function (m) { return m.ltPace / 60; }), color: 'var(--blue)', invert: true, fmt: function (v) { return pace(v * 60); } }]) : '') +
    (lh.filter(function (m) { return m.ltHr; }).length >= 2 ? lineChart(lh.filter(function (m) { return m.ltHr; }).map(function (m) { return m.date; }), [{ name: 'Threshold heart rate (bpm)', vals: lh.filter(function (m) { return m.ltHr; }).map(function (m) { return m.ltHr; }), color: 'var(--red)' }]) : '') + '</section>';
  html += '<div class="btns"><button class="btn primary" data-act="sheet" data-arg="' + jattr({ sheet: 'metrics' }) + '">Update readings</button><a class="btn" href="#/zones">All paces & zones</a></div>';
  /* how it moves paces */
  var zz = zonesAt(t), A = an.anchor;
  var why = !A ? 'No race, threshold or VO2 max reading yet, so paces come from your plan settings and recent runs.' : A.src === 'race' ? 'Your paces are set from your race or time trial on ' + fmtD(A.date) + ' (' + mi(A.mi) + ' mi in ' + E.clock(A.sec) + ').' : A.src === 'lt' ? 'Your paces are set from your lactate threshold pace of ' + pace(A.ltPace) + '/mi (' + (A.from === 'garmin' ? 'Garmin' : 'entered by you') + ', ' + fmtD(A.date) + '). It pins your threshold pace directly and sets fitness at VDOT ' + A.v.toFixed(1) + '.' : 'Your paces use your VO2 max of ' + A.vo2 + ' (' + fmtD(A.date) + ') at half weight, because watch VO2 max is an estimate. A threshold reading or a race is more precise.';
  html += '<section class="card"><h3>How this sets your paces</h3><p class="small" style="margin-top:6px">' + esc(why) + '</p>' + (zz ? '<div class="scroll"><table class="t" style="margin-top:8px"><tbody>' + [['Easy', 'E'], ['Marathon', 'M'], ['Threshold', 'T'], ['Interval', 'I']].filter(function (x) { return zz[x[1]]; }).map(function (x) { return '<tr><td>' + x[0] + '</td><td class="num">' + pace(zz[x[1]][0]) + '–' + pace(zz[x[1]][1]) + ' /mi</td><td class="num muted">' + (zz.hr && zz.hr[x[1]] ? (zz.hr[x[1]][0] ? zz.hr[x[1]][0] + '–' : '<') + zz.hr[x[1]][1] + ' bpm' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
    '<p class="tiny muted" style="margin-top:8px">Priority: a race or time trial from the last 12 weeks, then a threshold reading from the last 12 weeks, then the newest reading. Heart-rate zones come from your threshold heart rate.</p></section>';
  /* readings table */
  var rows = fr.slice().reverse().filter(function (m, i, arr) { return m.src === 'you' || !arr.slice(0, i).some(function (x) { return x.src === 'garmin' && x.vo2 === m.vo2 && x.ltPace === m.ltPace && x.ltHr === m.ltHr; }); }).slice(0, 25);
  html += '<section class="card"><h3>Readings</h3>' + (rows.length ? '<div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Date</th><th>From</th><th class="num">VO2</th><th class="num">LT pace</th><th class="num">LT HR</th><th></th></tr></thead><tbody>' + rows.map(function (m) { return '<tr><td>' + fmtD(m.date, { month: 'short', day: 'numeric', year: '2-digit' }) + '</td><td>' + (m.src === 'garmin' ? 'Garmin' : 'You') + '</td><td class="num">' + (m.vo2 || '–') + '</td><td class="num">' + (m.ltPace ? pace(m.ltPace) : '–') + '</td><td class="num">' + (m.ltHr || '–') + '</td><td>' + (m.src === 'you' && m.id ? '<button class="btn sm ghost" data-act="del-metric" data-arg="' + jattr({ id: m.id }) + '">✕</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="empty">No readings yet.</p>') + '</section>';
  return html;
};
SHEETS.metrics = function () {
  var fr = (App.an && App.an.readings) || [];
  var vo2 = E.latestReading(fr, 'vo2'), ltp = E.latestReading(fr, 'ltPace'), lth = E.latestReading(fr, 'ltHr');
  var pw = (st().metrics || []).filter(function (m) { return m.ltPower; }).sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0];
  return '<h3>Update VO2 max & threshold</h3><p class="small muted">Garmin Connect app: ☰ More → Performance Stats → VO2 Max, and Lactate Threshold. Last values are filled in; change what is new.</p><label class="f">Date<input class="i" type="date" id="m-date" value="' + App.today + '"></label>' +
    '<div class="grid2"><label class="f">VO2 max<input class="i" id="m-vo2" type="number" step="0.1" inputmode="decimal" placeholder="55" value="' + (vo2 ? vo2.vo2 : '') + '"></label><label class="f">Threshold heart rate (bpm)<input class="i" id="m-lthr" type="number" inputmode="numeric" placeholder="178" value="' + (lth ? lth.ltHr : '') + '"></label><label class="f">Threshold pace (m:ss /mi)<input class="i" id="m-lt" placeholder="7:16" value="' + (ltp ? pace(ltp.ltPace) : '') + '"></label><label class="f">Threshold power (W, optional)<input class="i" id="m-pw" type="number" inputmode="numeric" placeholder="465" value="' + (pw ? pw.ltPower : '') + '"></label><label class="f">Power W/kg (optional)<input class="i" id="m-wkg" type="number" step="0.01" inputmode="decimal" placeholder="5.16" value="' + (pw && pw.ltWkg ? pw.ltWkg : '') + '"></label></div><p class="tiny muted">If Garmin shows pace per km, multiply by 1.609 for per mile.</p>' + sheetBtns('Save & update paces');
};
SAVE2.metrics = function () {
  var md = $('#m-date').value || App.today, lt = $('#m-lt').value.trim(), lthr = +$('#m-lthr').value || null, vo2 = +$('#m-vo2').value || null, pw = +$('#m-pw').value || null, wkg = +$('#m-wkg').value || null;
  var err = $('#shErr');
  if (lt && !(E.parseClock(lt) > 200 && E.parseClock(lt) < 900)) { err.textContent = 'Threshold pace should look like 7:16 (per mile).'; return; }
  if (vo2 && !(vo2 > 20 && vo2 < 95)) { err.textContent = 'VO2 max should be between 20 and 95.'; return; }
  if (lthr && !(lthr > 100 && lthr < 220)) { err.textContent = 'Threshold heart rate looks off.'; return; }
  if (!lt && !lthr && !vo2) { err.textContent = 'Enter at least one value.'; return; }
  var mm = { id: uid(), date: md, ltPace: lt || null, ltHr: lthr, vo2: vo2, ltPower: pw, ltWkg: wkg };
  Store.editMany([['metrics', mm.id], ['prefs', 'fitSnooze']], function (S) { S.metrics = S.metrics.filter(function (x) { return !(x.date === md); }); S.metrics.push(mm); delete S.prefs.fitSnooze; });
  closeSheet(); toast('Saved — paces updated');
};

/* ---------- hooks into existing screens ---------- */
ACTIONS['sheet-save'] = function () { if (sheetCtx && SAVE2[sheetCtx.kind]) SAVE2[sheetCtx.kind](); else saveSheet(); };
ACTIONS['sheet-del'] = function () { if (sheetCtx && DEL2[sheetCtx.kind]) DEL2[sheetCtx.kind](); else deleteSheet(); };
var _hero = heroHTML;
heroHTML = function (x, date, zz) {
  var h = _hero(x, date, zz);
  if (x.type === 'strength') { var l = logOf(date).lift, has = l && l.ex && Object.keys(l.ex).length; h += '<a class="btn primary block" href="#/workout/' + date + '">' + (has ? 'View logged workout' : wkLoad(date) ? 'Resume workout' : 'Start workout') + '</a>'; }
  return h;
};
var _today = VIEWS.today;
VIEWS.today = function () {
  var h = _today();
  if (!App.plan) return h;
  var extra = fitnessPromptCard();
  var def = shoes().filter(function (s) { return s.def && !s.retired; })[0];
  if (def) { var x = shoeStats(def), goal = +def.goalMi || 400; if (x.mi >= goal * 0.9) extra += '<a class="banner warn" href="#/shoe/' + def.id + '" style="text-decoration:none;color:inherit;display:block"><b>' + esc(shoeName(def)) + ': ' + Math.round(x.mi) + ' of ' + goal + ' mi.</b> ' + (x.mi >= goal ? 'Time to retire them.' : 'Nearly worn out; line up the next pair.') + ' ›</a>'; }
  var td = dayOf(App.today), sp = td && td.parts.filter(function (x) { return x.type === 'strength'; })[0];
  if (sp && td.parts[0] !== sp) { var ll = logOf(App.today).lift, has = ll && ll.ex && Object.keys(ll.ex).length; extra = '<a class="btn primary block" href="#/workout/' + App.today + '">' + (has ? 'View logged lifts' : (wkLoad(App.today) ? 'Resume ' : 'Start ') + esc(sp.title.replace(/^Strength [A-C]: /, '')) + ' workout') + '</a>' + extra; }
  if (!extra) return h;
  var at = h.indexOf('<section class="card lv-');
  return at >= 0 ? h.slice(0, at) + extra + h.slice(at) : h + extra;
};
var _logBlock = logBlock;
logBlock = function (date, x, l, kind) {
  if (kind !== 'lift') return _logBlock(date, x, l, kind);
  var rec = l.lift;
  return (rec ? '<div class="banner small"><b>Logged:</b> ' + esc((rec.min ? rec.min + ' min' : 'Strength') + (rec.ex ? ' · ' + plural(Object.keys(rec.ex).length, 'lift') : '') + (rec.rpe ? ' · RPE ' + rec.rpe : '') + (rec.src === 'garmin' ? ' · Garmin' : '')) + '</div>' + liftSummaryCard(date, rec).replace('<section class="card">', '<div>').replace(/<\/section>$/, '</div>') : '') +
    '<div class="btns"><a class="btn sm primary" href="#/workout/' + date + '">' + (rec && rec.ex ? 'Edit sets' : wkLoad(date) ? 'Resume workout' : 'Start workout') + '</a><button class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'lift', date: date }) + '">Quick log</button></div>';
};
var _you = VIEWS.you;
VIEWS.you = function () {
  var h = _you();
  var def = shoes().filter(function (s) { return s.def && !s.retired; })[0];
  var an = App.an || {};
  var block = '<div class="sechead"><h2>Fitness & gear</h2></div><div class="menu"><a href="#/fitness">VO2 max & threshold<span class="v">' + (an.vo2 ? an.vo2.v : '') + (an.lt && an.lt.pace ? ' · ' + pace(an.lt.pace) + '/mi' : '') + '</span><span class="chev">›</span></a><a href="#/shoes">Shoes<span class="v">' + (def ? esc(shoeName(def)) + ' · ' + Math.round(shoeStats(def).mi) + ' mi' : 'Add yours') + '</span><span class="chev">›</span></a><a href="#/progress/strength">Lifts & 1RM<span class="v"></span><span class="chev">›</span></a></div>';
  var at = h.indexOf('<div class="sechead"><h2>Library');
  return at >= 0 ? h.slice(0, at) + block + h.slice(at) : h + block;
};
var _strength = VIEWS.strength;
VIEWS.strength = function () {
  var sel = App.args[0] && E.LIFT[App.args[0]] ? App.args[0] : App.ui.mod;
  return _strength().replace(/<button class="btn sm primary" data-act="sheet" data-arg="[^"]*">Log this session today<\/button>/, '<a class="btn sm primary" href="#/workout/' + App.today + '/' + sel + '">Start this workout today</a>');
};

var _render = render;
render = function () { _acts = null; _render(); };

/* Save straight away when the app goes to the background, so a quick close never loses an edit. */
document.addEventListener('visibilitychange', function () { if (document.hidden && Store.mode === 'github' && Object.keys(Store.touched).length) Store.save(); });
