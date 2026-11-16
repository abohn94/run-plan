/* Run Plan UI. Hash routes (#/today, #/plan/14, #/day/2027-01-12 ...) so the phone's back button and edge swipe work. */
(function () {
'use strict';
var E = window.ENGINE, Store = window.Store, C = window.COACH;
var LS = Store.LS;

/* ---------------- helpers ---------------- */
function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function mi(x) { return (Math.round((+x || 0) * 10) / 10).toString(); }
function jattr(o) { return esc(JSON.stringify(o)); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function pace(sec) { return E.fmtPace(sec); }
function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2600);
}
function download(name, data, mime) {
  var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
var IC = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>',
  today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  coach: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>',
  you: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  run: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="14" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2v4M6 12l3-3 4 1 3 3 3 1M11 15l-1-5"/></svg>'
};

/* ---------------- app state ---------------- */
var App = { plan: null, an: null, view: 'today', args: [], ui: { lp: null, warm: 'quick', mod: 'A' }, wiz: null };

function recompute() {
  var st = Store.state;
  App.today = E.today();
  if (!st.profile) { App.plan = null; return; }
  try {
    var plan = E.generate(st);
    var an = E.analyze(plan, st, Store.garmin);
    E.adapt(plan, st, an);
    App.plan = plan; App.an = an;
    App.week = E.weekOf(plan, App.today) || (App.today < plan.start ? plan.weeks[0] : plan.weeks[plan.weeks.length - 1]);
    App.rd = E.readiness(st, Store.garmin, App.today);
    var td = dayOf(App.today);
    App.rec = E.recommend(App.rd, td);
  } catch (e) {
    console.error(e);
    App.plan = null; App.err = e.message;
  }
}
function dayOf(date) {
  if (!App.plan) return null;
  var w = E.weekOf(App.plan, date);
  return w ? E.dayAt(w, date) : null;
}
function zonesAt(date) { var w = App.plan && E.weekOf(App.plan, date); return w ? w.zonesAdj : (App.plan ? App.plan.weeks[0].zonesAdj : null); }
function logOf(date) { return (Store.state.logs || {})[date] || {}; }

/* Pull new Garmin activities into the log (never overwriting your own entries). */
function applyGarmin() {
  if (!App.plan || !Store.garmin) return false;
  var adds = E.matchGarmin(Store.state, App.plan, Store.garmin);
  if (!adds.length) return false;
  var touches = [];
  adds.forEach(function (a) { touches.push(['logs', a.date]); touches.push(['seen', String(a.id)]); });
  Store.editMany(touches, function (s) {
    adds.forEach(function (a) {
      s.logs[a.date] = s.logs[a.date] || {};
      s.logs[a.date][a.slot] = a.rec;
      s.seen[a.id] = 1;
    });
  });
  return true;
}

/* ---------------- routing ---------------- */
var TITLES = { today: 'Today', plan: 'Training plan', day: 'Session', coach: 'Coach', progress: 'Progress', strength: 'Strength', cross: 'Gym days', you: 'You', shins: 'Shins & prehab', warmup: 'Warm-up & cool-down', nutrition: 'Nutrition', zones: 'Pace & HR zones', goals: 'Goals & races', settings: 'Plan settings', style: 'Training style', sync: 'Garmin & sync', data: 'Your data', about: 'About & terms', setup: 'Set up your plan' };
var TOP = { today: 1, plan: 1, coach: 1, progress: 1, you: 1, setup: 1 };
function route(keep) {
  var h = (location.hash || '#/today').replace(/^#\/?/, '');
  var parts = h.split('/');
  App.view = TITLES[parts[0]] ? parts[0] : 'today';
  App.args = parts.slice(1).map(decodeURIComponent);
  if (!Store.state.profile && ['setup', 'sync', 'about', 'data'].indexOf(App.view) < 0) App.view = 'setup';
  if (App.view !== 'setup' && Store.state.profile) App.wiz = null;
  render();
  if (keep !== true) window.scrollTo(0, 0);
}
function go(h) { if (location.hash === h) route(); else location.hash = h; }

function render() {
  var top = !!TOP[App.view];
  $('#title').textContent = top ? '' : (TITLES[App.view] || 'Personal Run');
  $('#backBtn').hidden = top; $('#backSpacer').hidden = !top;
  document.body.classList.toggle('onboarding', App.view === 'setup');
  var tab = (typeof TABOF !== 'undefined' && TABOF[App.view]) || (TOP[App.view] ? App.view : 'you');
  $$('.tabbar a').forEach(function (a) { a.setAttribute('aria-current', a.dataset.v === tab ? 'page' : 'false'); });
  var fn = VIEWS[App.view] || VIEWS.today;
  var html;
  try { html = fn(); } catch (e) { console.error(e); html = '<div class="card"><h2>Something went wrong</h2><p class="muted">' + esc(e.message) + '</p></div>'; }
  $('#main').innerHTML = html;
  if (App.after) { var f = App.after; App.after = null; f(); }
  renderSyncChip();
}

/* ---------------- shared pieces ---------------- */
var TYPE_LABEL = { long: 'Long run', speed: 'Key workout', easy: 'Easy run', recovery: 'Recovery run', strength: 'Strength', rest: 'Rest', cross: 'Walk / other', race: 'Race' };
var Z_COLOR = { REC: 'var(--green)', E: 'var(--green)', S: 'color-mix(in srgb, var(--green) 50%, var(--gold))', M: 'var(--gold)', G: 'var(--gold)', H: 'var(--gold)', T: 'var(--amber)', I: 'var(--red)', R: 'var(--red)', F: 'var(--amber)' };
function structHTML(p, zz, lg) {
  var s = E.structure(p, zz);
  if (!s.length) return '';
  var tot = s.reduce(function (a, b) { return a + b.w; }, 0) || 1;
  return '<div class="structure' + (lg ? ' lg' : '') + '" aria-hidden="true">' + s.map(function (b) {
    return '<i style="flex:' + (b.w / tot * 100).toFixed(2) + ' 1 0;height:' + Math.round(b.h * 100) + '%;background:' + (Z_COLOR[b.z] || 'var(--green)') + '"></i>';
  }).join('') + '</div>';
}
function estText(p, zz) {
  if (E.isRun(p)) { var m = E.estMinutes(p, zz); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; }
  if (p.min) return p.min + ' min';
  return '';
}
function partDone(date, p) {
  var l = logOf(date);
  if (l.done) return true;
  if (E.isRun(p)) return !!l.run;
  if (p.type === 'strength') return !!l.lift;
  if (p.type === 'cross') return !!l.cross;
  return false;
}
var SVG0 = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">';
var TICON = {
  easy: SVG0 + '<circle cx="14" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2v4M6 12l3-3 4 1 3 3 3 1M11 15l-1-5"/></svg>',
  speed: SVG0 + '<path d="M13 2L5 14h6l-1 8 9-12h-6z"/></svg>',
  long: SVG0 + '<path d="M4 19c0-7 16-3 16-10a3.5 3.5 0 0 0-7 0"/><circle cx="4" cy="19" r="1.4"/></svg>',
  strength: SVG0 + '<path d="M3.5 9.5v5M6.5 7v10M17.5 7v10M20.5 9.5v5M6.5 12h11"/></svg>',
  rest: SVG0 + '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  cross: SVG0 + '<circle cx="13" cy="4.5" r="1.8"/><path d="M9 21l2-6-1-4 4 2 1 4M10 11l-3 2M14 13l3 1"/></svg>',
  race: SVG0 + '<path d="M5 21V4h12l-2.5 4L17 12H5"/></svg>'
};
TICON.recovery = TICON.easy;
function sessHTML(p, date, zz, opts) {
  opts = opts || {};
  var t = p.type === 'recovery' ? 'recovery' : p.type;
  var done = partDone(date, p);
  var big = E.isRun(p) ? '<b>' + mi(p.mi) + '</b><small>mi</small>' : p.min ? '<b>' + p.min + '</b><small>min</small>' : '';
  var flag = p.moved ? 'Moved from ' + E.fmtDate(p.moved, { weekday: 'short' }) : p.changed ? 'Adjusted' : '';
  var meta = [];
  if (estText(p, zz) && E.isRun(p)) meta.push(estText(p, zz));
  if (E.isRun(p) && mainPace(p, zz)) meta.push(mainPace(p, zz).replace(' ', '/mi '));
  if (p.type === 'strength') meta.push(E.LIFT_PHASES[p.lp].k + ' loads');
  if (flag) meta.push('<span class="flag">' + flag + '</span>');
  return '<a class="sess t-' + t + (done ? ' done' : '') + '" href="#/day/' + date + '">' + (done ? '<span class="tick" aria-label="Done">✓</span>' : '') +
    '<span class="tico">' + (TICON[p.type] || TICON.easy) + '</span>' +
    '<div class="sh"><span class="lab">' + (p.treadmill ? 'Treadmill' : TYPE_LABEL[p.type] || p.type) + '</span><span class="ti">' + esc(p.title) + '</span></div>' +
    '<div class="big"' + (done ? ' style="padding-right:26px"' : '') + '>' + big + '</div>' +
    '<div class="meta">' + meta.join(' · ') + '</div>' +
    (opts.struct !== false && E.isRun(p) ? '<div class="struct">' + structHTML(p, zz) + '</div>' : '') + '</a>';
}
function mainPace(p, zz) {
  var z = null;
  (p.steps || []).forEach(function (s) { if (!z && (s.k === 'run' || s.k === 'rep') && s.z !== 'F' && s.z !== 'E' && s.z !== 'REC') z = s.z; });
  if (!z) z = p.type === 'recovery' ? 'REC' : 'E';
  var r = zz && zz[z];
  return r ? pace(r[0]) + '–' + pace(r[1]) + ' ' + E.ZONE_NAME[z] : '';
}
function legend() {
  return '<div class="legend">' + [['long', 'Long'], ['speed', 'Key workout'], ['easy', 'Easy / recovery'], ['strength', 'Strength'], ['cross', 'Walk / other'], ['rest', 'Rest'], ['race', 'Race']].map(function (x) {
    return '<span class="t-' + x[0] + '"><i class="dot"></i>' + x[1] + '</span>';
  }).join('') + '</div>';
}
function nextRace() {
  var t = App.today;
  return (Store.state.events || []).filter(function (e) { return e.date >= t; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0] || null;
}

/* ---------------- views ---------------- */
var VIEWS = {};

VIEWS.today = function () {
  var p = App.plan; if (!p) return setupNeeded();
  var w = App.week, t = App.today, day = dayOf(t), zz = zonesAt(t), rd = App.rd, rec = App.rec;
  var ev = nextRace();
  var started = t >= p.start;
  var hr = new Date().getHours();
  var html = '<div class="greet"><div class="date">' + E.fmtDate(t, { weekday: 'long', month: 'long', day: 'numeric' }) + '</div><h1>' + (hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening') + '</h1></div>';
  /* week progress */
  if (started && w) {
    var act = weekActual(w), pct = w.tot.mi ? Math.min(100, Math.round(act / w.tot.mi * 100)) : 0;
    var sessions = 0, done = 0;
    w.days.forEach(function (d) { d.parts.forEach(function (x) { if (x.type === 'rest') return; sessions++; if (partDone(d.date, x)) done++; }); });
    html += '<a class="card wkprog" href="#/plan/' + w.n + '" style="text-decoration:none;color:inherit"><div class="top"><b>Week ' + w.n + ' · ' + esc(w.phase.name) + '</b><span class="small muted">' + (ev ? esc(ev.name) + ' in ' + plural(E.diffD(t, ev.date), 'day') : '') + '</span></div>' +
      '<div class="bar" style="margin:10px 0 8px"><i style="width:' + pct + '%"></i></div><div class="spread small muted"><span><b style="color:var(--ink)">' + mi(act) + '</b> of ' + mi(w.tot.mi) + ' mi</span><span>' + done + ' of ' + sessions + ' workouts' + (w.cut ? ' · cutback week' : '') + '</span></div></a>';
  } else {
    html += '<div class="card"><b>Your plan starts ' + E.fmtDate(p.start, { weekday: 'long', month: 'short', day: 'numeric' }) + '</b><p class="small muted">Until then, run easy and enjoy it.</p></div>';
  }
  /* today's sessions: the first one is the hero */
  if (day) {
    day.parts.forEach(function (x, i) { html += i === 0 ? heroHTML(x, t, zz) : sessHTML(x, t, zz, { struct: false }); });
    var lp = day.parts.filter(function (x) { return x.type === 'strength'; })[0];
    if (lp && rec && rec.lift) html += '<div class="banner warn">Lifting today: ' + (rec.lift === 'skip' ? 'skip the gym or do 15 minutes of mobility.' : 'go light. Use Light-phase loads, half the sets, no jumps.') + '</div>';
  }
  html += readinessCard(rd, rec, t);
  html += rateCard();
  /* this week */
  if (started && w) html += '<div class="sechead"><h2>This week</h2><a href="#/plan/' + w.n + '">See plan</a></div><section class="card"><div class="weekstrip">' + w.days.map(function (d) {
    var dots = d.parts.filter(function (x) { return x.type !== 'rest'; }).map(function (x) { return '<i class="t-' + x.type + (partDone(d.date, x) ? ' dn' : '') + '"></i>'; }).join('');
    return '<a href="#/day/' + d.date + '" class="' + (d.date === t ? 'today' : '') + '">' + d.dow.charAt(0) + '<span class="n">' + E.pd(d.date).getDate() + '</span><span class="dots">' + dots + '</span></a>';
  }).join('') + '</div></section>';
  /* tomorrow */
  var tm = dayOf(E.addD(t, 1));
  if (tm) html += '<div class="sechead"><h2>Tomorrow</h2></div><div class="stack">' + tm.parts.map(function (x) { return x.type === 'rest' ? restRow(x, tm.date) : sessHTML(x, tm.date, zonesAt(tm.date), { struct: false }); }).join('') + '</div>';
  /* nutrition */
  var nu = E.nutrition(day, Store.state.profile.weightKg, zz, tm, rd, w && w.event && w.event.date >= w.start && w.event.date <= w.end ? w.event : null);
  html += '<div class="sechead"><h2>Fuel today</h2><a href="#/nutrition">Details</a></div><a class="card" href="#/nutrition" style="text-decoration:none;color:inherit"><div class="eyebrow">' + nu.tier + ' training day</div>' +
    '<div class="grid3" style="margin-top:8px"><div class="metric"><span>Carbs</span><b>' + (nu.carbG ? nu.carbG[0] + '–' + nu.carbG[1] + ' g' : nu.carbGkg[0] + '–' + nu.carbGkg[1] + ' g/kg') + '</b></div>' +
    '<div class="metric"><span>Protein</span><b>' + (nu.protG ? nu.protG[0] + '–' + nu.protG[1] + ' g' : nu.protGkg[0] + '–' + nu.protGkg[1] + ' g/kg') + '</b></div>' +
    '<div class="metric"><span>Fluids</span><b>' + (nu.fluidL ? nu.fluidL + ' L' : 'to thirst') + '</b></div></div>' +
    (nu.tips[0] ? '<p class="small muted" style="margin-top:10px">' + esc(nu.tips[0]) + '</p>' : '') + '</a>';
  var notes = (App.an && App.an.notes || []).filter(function (n) { return n.level !== 'info'; }).slice(0, 2);
  if (notes.length) html += '<div class="sechead"><h2>Coach notes</h2><a href="#/coach">Coach</a></div><div class="stack tight">' + notes.map(function (n) { return '<div class="banner ' + (n.level === 'warn' ? 'warn' : 'info') + '"><b>' + esc(n.title) + '.</b> ' + esc(n.body) + '</div>'; }).join('') + '</div>';
  if (Store.mode !== 'github') html += '<a class="banner info" href="#/sync" style="text-decoration:none;color:inherit"><b>Connect Garmin.</b> Unlock readiness-based adjustments, automatic run logging and your full run history ›</a>';
  return html;
};
function restRow(x, date) { return '<a class="restrow" href="#/day/' + date + '">' + '<span class="tico t-rest" style="width:34px;height:34px;border-radius:11px">' + TICON.rest + '</span>' + esc(x.title) + '</a>'; }
function heroHTML(x, date, zz) {
  var t = x.type === 'recovery' ? 'recovery' : x.type;
  var done = partDone(date, x);
  var nums = '';
  if (E.isRun(x)) nums = '<div><b>' + mi(x.mi) + ' mi</b><span>Distance</span></div><div><b>' + estText(x, zz) + '</b><span>Time</span></div>' + (mainPace(x, zz) ? '<div><b>' + mainPace(x, zz).split(' ')[0] + '</b><span>' + esc(mainPace(x, zz).split(' ').slice(1).join(' ')) + ' /mi</span></div>' : '');
  else if (x.min) nums = '<div><b>' + x.min + ' min</b><span>Duration</span></div>' + (x.type === 'strength' ? '<div><b>' + E.LIFT_PHASES[x.lp].k + '</b><span>Loads</span></div>' : '');
  return '<a class="herow t-' + t + '" href="#/day/' + date + '"><div class="spread"><span class="lab">Today · ' + (TYPE_LABEL[x.type] || x.type) + '</span>' + (done ? '<span class="pill good">Done ✓</span>' : x.changed || x.moved ? '<span class="pill warn">Adjusted</span>' : '') + '</div>' +
    '<h2>' + esc(x.title) + '</h2>' + (nums ? '<div class="nums">' + nums + '</div>' : '<p class="small muted">' + esc(x.note || '') + '</p>') +
    (E.isRun(x) ? structHTML(x, zz) : '') + '<span class="btn primary" style="justify-self:start">' + (x.type === 'rest' ? 'Recovery tips' : done ? 'View workout' : 'View workout') + '</span></a>';
}

function metricTile(label, val, sub, cls) { return '<div class="metric ' + (cls || '') + '"><span>' + label + '</span><b>' + val + '</b><em>' + (sub || '&nbsp;') + '</em></div>'; }
function readinessCard(rd, rec, date) {
  if (!rd) return '';
  var m = rd.metrics, lvCls = rd.factors ? 'lv-' + rd.level : 'lv-none';
  var pct = rd.factors ? rd.score : 0;
  var C2 = 2 * Math.PI * 38;
  var ring = '<div class="ring ' + lvCls + '"><svg viewBox="0 0 86 86"><circle cx="43" cy="43" r="38" stroke="var(--line2)" stroke-width="7" fill="none"/><circle cx="43" cy="43" r="38" stroke="var(--lv)" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="' + (C2 * pct / 100).toFixed(1) + ' ' + C2.toFixed(1) + '"/></svg><b>' + (rd.factors ? rd.score : '–') + '</b><small>READY</small></div>';
  var tiles = '';
  if (rd.garmin) {
    var hrv = m.hrv, rhr = m.rhr, sl = m.sleep, bb = m.bb;
    tiles = '<div class="grid4" style="margin-top:10px">' +
      metricTile('HRV', hrv ? hrv.v : '–', hrv && hrv.lo ? hrv.lo + '–' + hrv.hi + ' normal' : (hrv && hrv.status ? String(hrv.status).toLowerCase() : 'ms'), hrv && hrv.lo && hrv.v < hrv.lo ? 'warn' : '') +
      metricTile('Rest HR', rhr ? rhr.v : '–', rhr && rhr.base ? 'normal ' + Math.round(rhr.base) : 'bpm', rhr && rhr.base && rhr.v - rhr.base >= 5 ? 'warn' : '') +
      metricTile('Sleep', sl ? mi(sl.v) + 'h' : '–', sl && sl.score ? 'score ' + sl.score : '', sl && sl.v < 6.25 ? 'warn' : '') +
      metricTile('Battery', bb ? bb.v : '–', bb && bb.low != null ? 'low ' + bb.low : 'peak', bb && bb.v < 45 ? 'warn' : '') + '</div>';
  }
  var noData = !rd.factors && !(rec && rec.src === 'recovery');
  var head = noData ? 'No readiness data yet' : rec.headline;
  var body = noData ? (Store.mode === 'github' ? 'Sync your watch with Garmin Connect, or do a quick check-in.' : 'Do a quick check-in, or connect Garmin for automatic readiness.') : rec.body;
  var acts = (rec && rec.actions || []).filter(function (a) { return a.action !== 'keep' || true; }).map(function (a) {
    return '<button class="btn sm' + (a.action === 'keep' ? ' ghost' : '') + '" data-act="rec" data-arg="' + jattr({ action: a.action, date: date }) + '">' + esc(a.label) + '</button>';
  }).join('');
  var ov = Store.state.overrides && Store.state.overrides[date];
  if (ov) acts = '<span class="pill teal">Applied: ' + esc(ov.action) + '</span><button class="btn sm ghost" data-act="undo-override" data-arg="' + jattr({ date: date }) + '">Undo</button>';
  var ci = rd.checkin;
  return '<section class="card ' + lvCls + '"><div class="row" style="align-items:flex-start">' + ring + '<div class="advice" style="flex:1;min-width:0"><div class="eyebrow">Readiness</div><h3 style="margin-top:2px">' + esc(head) + '</h3><p class="small" style="margin-top:4px">' + esc(body) + '</p></div></div>' +
    tiles + (rd.reasons.length ? '<ul class="reasons">' + rd.reasons.map(function (r) { return '<li>' + esc(r.text) + '</li>'; }).join('') + '</ul>' : '') +
    '<div class="btns" style="margin-top:10px">' + acts + '<button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'checkin' }) + '">' + (ci ? 'Update check-in' : 'Check in') + '</button></div></section>';
}
function rateCard() {
  var logs = Store.state.logs || {}, t = App.today, items = [];
  for (var i = 0; i < 4; i++) {
    var d = E.addD(t, -i), l = logs[d];
    if (!l) continue;
    ['run', 'xrun'].forEach(function (s) { if (l[s] && l[s].src === 'garmin' && !l[s].rpe && !l[s].skip) items.push({ date: d, slot: s, r: l[s] }); });
  }
  if (!items.length) return '';
  return '<section class="card"><h3>How did it feel?</h3><p class="small muted">Synced from Garmin. Your effort rating tunes future paces.</p>' + items.slice(0, 2).map(function (it) {
    var r = it.r;
    return '<div style="margin-top:10px"><div class="spread small"><b>' + E.fmtDate(it.date, { weekday: 'short' }) + ' · ' + esc(r.name || 'Run') + '</b><span class="mono muted">' + mi(r.mi) + ' mi · ' + (r.mi ? pace(r.sec / r.mi) + '/mi' : '') + (r.hr ? ' · ' + r.hr + ' bpm' : '') + '</span></div>' +
      '<div class="rpe" style="margin-top:6px">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<button data-act="rate" data-arg="' + jattr({ date: it.date, slot: it.slot, rpe: n }) + '" aria-label="Effort ' + n + '">' + n + '</button>'; }).join('') + '</div></div>';
  }).join('') + '<p class="tiny muted" style="margin-top:6px">Same scale as Garmin: 1–2 easy · 3 moderate · 4 somewhat hard · 5–6 hard · 7–8 very hard · 9–10 max</p></section>';
}
function setupNeeded() { return '<section class="card glow"><h2>Welcome</h2><p class="muted" style="margin-top:6px">Set up your goals, schedule and training style to build your plan.</p><div class="btns" style="margin-top:12px"><a class="btn primary" href="#/setup">Set up my plan</a></div></section>'; }

/* ---- plan ---- */
VIEWS.plan = function () {
  var p = App.plan; if (!p) return setupNeeded();
  var cur = App.week ? App.week.n : 1;
  var sel = E.clamp(+App.args[0] || cur, 1, p.weeks.length);
  var w = p.weeks[sel - 1], t = App.today;
  var ev = nextRace();
  var html = '';
  if (ev) {
    var d = E.distOf(ev), g = E.parseClock(ev.goal);
    html += '<a class="racecard" href="#/goals"><span class="eyebrow" style="color:var(--ink);opacity:.8">' + esc(ev.name || d.label) + ' · ' + E.fmtDate(ev.date, { month: 'short', day: 'numeric', year: 'numeric' }) + '</span><span class="cd">' + E.diffD(t, ev.date) + ' <span style="font-size:1rem;letter-spacing:0">days to go</span></span>' +
      '<span class="small muted">' + (g > 0 ? 'Goal ' + E.clock(g) + ' · ' + pace(g / d.mi) + '/mi' : esc(d.label)) + (App.an ? ' · predicted today ' + E.clock(E.predict(App.an.vNow, d.mi)) : '') + '</span></a>';
  }
  /* season overview: one bar per week, colored by training block, flags on race weeks */
  var PHC = { base: 'var(--green)', thr: 'var(--gold)', spec: 'var(--amber)', taper: 'var(--violet)', race: 'var(--red)', recov: 'var(--slate)', maint: 'var(--gray)', build: 'var(--blue)', peak: 'var(--red)' };
  var max = Math.max.apply(null, p.weeks.map(function (x) { return x.tot.mi; })) || 1;
  var bars = p.weeks.map(function (x) {
    var act = weekActual(x), col = PHC[x.phase.key] || 'var(--gray)';
    var race = x.days.filter(function (dd) { return dd.parts.some(function (q) { return q.type === 'race'; }); })[0];
    return '<button title="Week ' + x.n + ' · ' + esc(x.phase.name) + ': ' + mi(x.tot.mi) + ' mi" aria-label="Week ' + x.n + '" data-act="nav" data-arg="' + jattr({ to: '#/plan/' + x.n, replace: true }) + '" class="' + (x.cut ? 'cut ' : '') + (race ? 'race ' : '') + (x.n < cur ? 'past ' : '') + (x.n === sel ? 'cur' : '') + '" style="--pc:' + col + '">' + (race ? '<span class="rflag" aria-hidden="true" style="bottom:calc(' + Math.max(4, x.tot.mi / max * 100) + '% + 3px)">🏁</span>' : '') + '<i style="height:' + Math.max(4, x.tot.mi / max * 100) + '%"></i>' + (act > 0 ? '<b style="height:' + Math.min(100, act / max * 100) + '%"></b>' : '') + '</button>';
  }).join('');
  var groups = [], lastKey = null, seenPh = {}, phLeg = [];
  p.weeks.forEach(function (x) { var k = x.phase.key + x.phase.block; if (k !== lastKey) { groups.push({ key: x.phase.key, name: x.phase.name, n: 1 }); lastKey = k; } else groups[groups.length - 1].n++; if (!seenPh[x.phase.name]) { seenPh[x.phase.name] = 1; phLeg.push([x.phase.key, x.phase.name]); } });
  var races = (Store.state.events || []).filter(function (e) { return e.date >= p.start && e.date <= p.weeks[p.weeks.length - 1].end; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  html += '<section class="card"><div class="spread"><h3>Your season</h3><span class="tiny muted">' + esc(p.method.name) + ' · ' + p.weeks.length + ' weeks</span></div><div class="season" style="margin-top:22px">' + bars + '</div>' +
    '<div class="phasebar" style="grid-template-columns:' + groups.map(function (g2) { return g2.n + 'fr'; }).join(' ') + '">' + groups.map(function (g2) { return '<i title="' + esc(g2.name) + '" style="background:' + (PHC[g2.key] || 'var(--gray)') + '"></i>'; }).join('') + '</div>' +
    '<div class="phlegend">' + phLeg.map(function (l) { return '<span><i style="background:' + (PHC[l[0]] || 'var(--gray)') + '"></i>' + esc(l[1]) + '</span>'; }).join('') + '</div>' +
    (races.length ? '<div class="phraces">' + races.map(function (e) { return '<span>🏁 ' + esc(e.name || E.distOf(e).label) + ' · ' + E.fmtDate(e.date, { month: 'short', day: 'numeric' }) + '</span>'; }).join('') + '</div>' : '') +
    '<p class="tiny muted" style="margin-top:8px">One bar per week, colored by training block; the bright bar is the week shown below, and green shows miles you have logged. Tap a bar to jump to that week.</p></section>';
  /* week pager */
  var act2 = weekActual(w), pct = w.tot.mi ? Math.min(100, Math.round(act2 / w.tot.mi * 100)) : 0;
  var mod = w.mod;
  var modTxt = mod && mod.phase === 'compliance' ? 'Capped at ' + mi(mod.capMi) + ' mi to match what you have been running' : mod ? (mod.phase === 'status' ? E.STATUS[mod.kind].label + ' · ' + E.STATUS[mod.kind].levels[mod.level].label : 'Ramping back, step ' + mod.step + ' of ' + mod.of + ' (' + Math.round(mod.m * 100) + '% of planned miles)') : '';
  html += '<section class="card stack"><div class="pager"><button class="iconbtn" aria-label="Previous week" data-act="nav" data-arg="' + jattr({ to: '#/plan/' + (sel - 1), replace: true }) + '"' + (sel <= 1 ? ' disabled' : '') + '>‹</button>' +
    '<div><div class="ph">' + esc(w.phase.name) + (w.cut ? ' · cutback' : '') + (sel === cur ? ' · this week' : '') + '</div><h2>Week ' + w.n + ' <span class="muted" style="font-size:1rem;font-weight:700">of ' + p.weeks.length + '</span></h2><div class="small muted">' + E.fmtDate(w.start) + ' – ' + E.fmtDate(w.end) + '</div></div>' +
    '<button class="iconbtn" aria-label="Next week" data-act="nav" data-arg="' + jattr({ to: '#/plan/' + (sel + 1), replace: true }) + '"' + (sel >= p.weeks.length ? ' disabled' : '') + '>›</button></div>' +
    '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
    '<div class="grid4"><div class="metric"><span>Planned</span><b>' + mi(w.tot.mi) + ' mi</b></div><div class="metric"><span>Logged</span><b>' + mi(act2) + ' mi</b></div><div class="metric"><span>Runs</span><b>' + w.tot.runs + '</b></div><div class="metric"><span>Gym</span><b>' + w.tot.lifts + '</b></div></div>' +
    (w.notes.length ? '<p class="small muted">' + w.notes.map(esc).join(' ') + '</p>' : '<p class="small muted">' + esc(w.phase.focus) + '</p>') +
    (mod ? '<div class="banner warn small"><b>' + esc(modTxt) + '.</b> ' + esc(mod.phase === 'compliance' ? 'Your last two weeks came in well under plan, so this week builds from what you actually ran instead of jumping back to the full plan. Hit these runs and next week grows again.' : mod.phase === 'status' ? E.STATUS[mod.kind].levels[mod.level].text : 'Miles are reduced while you rebuild. No catching up on missed runs.') + '</div>' : '') +
    (sel !== cur ? '<div class="btns"><a class="btn sm" href="#/plan/' + cur + '">Back to this week</a></div>' : '') + '</section>';
  if (typeof advCard === 'function') html += advCard(w);
  /* the days */
  html += '<div class="stack">' + w.days.map(function (d2) {
    var items = d2.parts.map(function (x) { return x.type === 'rest' ? restRow(x, d2.date) : sessHTML(x, d2.date, w.zonesAdj, { struct: false }); }).join('');
    if (d2.dropped) items += '<div class="tiny muted">No free day this week for: ' + esc(d2.dropped.join(', ')) + '</div>';
    if (typeof dayEventsHTML === 'function') items = dayEventsHTML(d2.date) + items;   /* the work shift and events first: they shape the day */
    return '<div class="dayblock' + (d2.date === t ? ' today' : '') + '"><div class="d">' + d2.dow + '<b>' + E.pd(d2.date).getDate() + '</b></div><div class="items">' + items + '</div></div>';
  }).join('') + '</div>';
  if (typeof addWkBtn === 'function') html += addWkBtn(w);
  html += legend();
  html += '<div class="btns"><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'weekstatus', week: w.n }) + '">Week status' + (mod && mod.phase === 'status' ? ': ' + E.STATUS[mod.kind].label : '') + '</button><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'life' }) + '">Something came up</button><a class="btn sm" href="#/planctl">Plan settings</a><a class="btn sm" href="#/table">Training log</a></div>';
  return html;
};
function weekActual(w) {
  var t = 0, logs = Store.state.logs || {};
  w.days.forEach(function (d) { var l = logs[d.date]; if (!l) return; ['run', 'xrun'].forEach(function (s) { if (l[s] && !l[s].skip) t += +l[s].mi || 0; }); });
  return t;
}

/* ---- day / session detail ---- */
VIEWS.day = function () {
  var date = App.args[0] || App.today;
  var p = App.plan; if (!p) return setupNeeded();
  var w = E.weekOf(p, date), d = dayOf(date);
  if (!d) return '<div class="card">That date is outside your plan.</div>';
  var zz = w.zonesAdj, l = logOf(date);
  var prev = E.addD(date, -1), next = E.addD(date, 1);
  var html = '<div class="spread"><a class="btn sm ghost" href="#/day/' + prev + '">‹ ' + E.fmtDate(prev, { weekday: 'short' }) + '</a><div style="text-align:center"><div class="eyebrow">Week ' + w.n + ' · ' + esc(w.phase.name) + '</div><b>' + E.fmtDate(date, { weekday: 'long', month: 'short', day: 'numeric' }) + '</b></div><a class="btn sm ghost" href="#/day/' + next + '">' + E.fmtDate(next, { weekday: 'short' }) + ' ›</a></div>';
  if (date === App.today && App.rd && App.rd.factors) html += readinessCard(App.rd, App.rec, date);
  if (d.blocked) html += '<div class="banner warn">You marked this day as ' + esc(d.blocked) + '. Runs were moved to free days this week.</div>';
  d.parts.forEach(function (x, idx) { html += partDetail(x, date, w, zz, l, idx); });
  html += '<section class="card"><h3>Day actions</h3><div class="btns" style="margin-top:8px">' +
    '<button class="btn sm" data-act="toggle-done" data-arg="' + jattr({ date: date }) + '">' + (l.done ? 'Unmark done' : 'Mark day done') + '</button>' +
    (d.parts.some(function (x) { return E.isRun(x) || x.type === 'cross'; }) ? '<button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'move', date: date }) + '">Move to another day</button>' : '') +
    '<button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'swap', date: date }) + '">Swap / adjust</button>' +
    ((Store.state.overrides || {})[date] || isMovedTo(date) ? '<button class="btn sm ghost" data-act="reset-day" data-arg="' + jattr({ date: date }) + '">Reset day to plan</button>' : '') +
    (!d.parts.some(E.isRun) ? '<button class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'run', date: date, slot: l.run ? 'xrun' : 'run', extra: true }) + '">Log an extra run</button>' : '') +
    (!d.parts.some(function (x) { return x.type === 'strength'; }) ? '<button class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'lift', date: date, extra: true }) + '">Log a lift</button>' : '') +
    (!d.parts.some(function (x) { return x.type === 'cross'; }) ? '<button class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'cross', date: date }) + '">Log another activity</button>' : '') +
    '</div></section>';
  return html;
};
function isMovedTo(date) { var m = Store.state.moves || {}; return Object.keys(m).some(function (k) { return k === date || m[k] === date; }); }
function partDetail(x, date, w, zz, l, idx) {
  var t = x.type === 'recovery' ? 'recovery' : x.type;
  var head = '<div class="spread"><div><div class="eyebrow" style="color:var(--c)">' + (TYPE_LABEL[x.type] || x.type) + '</div><h2 style="margin-top:2px">' + esc(x.title) + '</h2></div><div style="text-align:right">' +
    (E.isRun(x) ? '<b style="font-size:1.8rem;font-weight:800">' + mi(x.mi) + '</b><span class="muted small"> mi</span>' : x.min ? '<b style="font-size:1.8rem;font-weight:800">' + x.min + '</b><span class="muted small"> min</span>' : '') +
    (estText(x, zz) && E.isRun(x) ? '<div class="tiny muted mono">≈ ' + estText(x, zz) + '</div>' : '') + '</div></div>';
  var body = '';
  if (x.moved) body += '<div class="banner info small">Moved here from ' + E.fmtDate(x.moved, { weekday: 'long' }) + '.</div>';
  if (x.changed && x.from) body += '<div class="banner warn small">Adjusted from: ' + esc(x.from) + '.</div>';
  if (E.isRun(x)) {
    body += structHTML(x, zz, true);
    if (x.purpose) body += '<p class="small"><b>Why:</b> ' + esc(x.purpose) + '</p>';
    var hr = zz && zz.hr;
    body += '<ol class="steps">' + E.describe(x, zz).map(function (s) {
      var h = hr && s.z && hr[s.z] ? ' · ' + (hr[s.z][0] ? hr[s.z][0] + '–' : '<') + hr[s.z][1] + ' bpm' : '';
      return '<li><span class="z" style="background:' + (Z_COLOR[s.z] || 'var(--green)') + '"></span><span>' + esc(s.text) + '</span><span class="pc">' + (s.pace || (s.kind === 'wu' || s.kind === 'cd' ? (zz && zz.E ? pace(zz.E[0]) + '–' + pace(zz.E[1]) : '') : '')) + '<span class="muted">' + h + '</span></span>' + (s.rec ? '<span class="rc">' + esc(s.rec) + '</span>' : '') + '</li>';
    }).join('') + '</ol>';
    if (x.note) body += '<p class="small muted">' + esc(x.note) + '</p>';
    if (x.type === 'race' && x.goal) body += racePlanHTML(x);
    body += logBlock(date, x, l, 'run');
    body += '<div class="btns"><a class="btn sm ghost" href="#/warmup">Warm-up</a></div>';
  } else if (x.type === 'strength') {
    var adv = date === App.today && App.rd ? E.liftAdvice(Object.assign({ _date: date }, x), App.rd, w) : null;
    var lp = adv ? adv.lp : x.lp;
    if (adv && adv.notes.length) body += '<div class="banner warn small">' + adv.notes.map(esc).join(' ') + '</div>';
    body += '<p class="small muted">' + esc(x.note || '') + ' · <b>' + E.LIFT_PHASES[lp].k + '</b> loads: ' + esc(E.LIFT_PHASES[lp].d) + '</p>';
    body += moduleBody(x.key, lp, x.v);
    body += logBlock(date, x, l, 'lift');
  } else if (x.type === 'cross') {
    body += '<p class="small">' + esc(x.note || '') + '</p>';
    body += logBlock(date, x, l, 'cross');
  } else {
    body += '<p class="small muted">' + esc(x.note || '') + '</p><p class="small">On rest days: the 10-minute <a href="#/shins">shin routine</a>, an easy walk, and an early night.</p>';
  }
  return '<section class="card t-' + t + '" style="border-left:4px solid var(--c)">' + head + '<div class="stack" style="margin-top:10px">' + body + '</div></section>';
}
function racePlanHTML(x) {
  var g = E.parseClock(x.goal), d = x.mi;
  if (!(g > 0)) return '';
  var marks = d > 20 ? [[6.2, '10K'], [13.1, 'Half'], [18.6, '30K'], [20, '20 mi'], [24.9, '40K'], [d, 'Finish']] : d > 10 ? [[3.1, '5K'], [6.2, '10K'], [9.3, '15K'], [10, '10 mi'], [d, 'Finish']] : [[1, '1 mi'], [2, '2 mi'], [d, 'Finish']];
  return '<div class="grid3">' + marks.map(function (m) { return '<div class="metric"><span>' + m[1] + '</span><b class="mono" style="font-size:1rem">' + E.clock(g * m[0] / d) + '</b></div>'; }).join('') + '</div>';
}
function logBlock(date, x, l, kind) {
  var rec = kind === 'run' ? l.run : kind === 'lift' ? l.lift : l.cross;
  var btn = '<button class="btn sm primary" data-act="sheet" data-arg="' + jattr({ sheet: kind, date: date, slot: 'run' }) + '">' + (rec ? 'Edit log' : kind === 'run' ? (x.type === 'race' || x.tt ? 'Log result' : 'Log run') : kind === 'lift' ? 'Log lift' : 'Log session') + '</button>';
  if (!rec) return '<div class="btns">' + btn + '</div>';
  var s = '';
  if (kind === 'run') s = rec.skip ? 'Skipped' : mi(rec.mi) + ' mi in ' + E.clock(rec.sec || 0) + (rec.mi && rec.sec ? ' · ' + pace(rec.sec / rec.mi) + '/mi' : '') + (rec.hr ? ' · ' + rec.hr + ' bpm' : '') + (rec.rpe ? ' · RPE ' + rec.rpe : ' · rate it') + (rec.src === 'garmin' ? ' · Garmin' : '');
  else if (kind === 'lift') s = (rec.key ? 'Strength ' + rec.key : 'Strength') + (rec.min ? ' · ' + rec.min + ' min' : '') + (rec.ex ? ' · ' + Object.keys(rec.ex).length + ' lifts logged' : '') + (rec.rpe ? ' · RPE ' + rec.rpe : '') + (rec.src === 'garmin' ? ' · Garmin' : '');
  else s = (rec.type || 'Activity') + ' · ' + (rec.min || 0) + ' min' + (rec.rpe ? ' · RPE ' + rec.rpe : '') + (rec.src === 'garmin' ? ' · Garmin' : '');
  var x2 = kind === 'run' && l.xrun ? '<div class="small mono muted">Also: ' + mi(l.xrun.mi) + ' mi' + (l.xrun.sec ? ' in ' + E.clock(l.xrun.sec) : '') + '</div>' : '';
  return '<div class="banner small"><b>Logged:</b> <span class="mono">' + esc(s) + '</span>' + x2 + '</div><div class="btns">' + btn + '</div>';
}

/* ---- strength modules ---- */
function moduleBody(key, lp) {
  var m = E.LIFT[key];
  if (!m) return '';
  return m.blocks.map(function (b) {
    return '<div class="block-h"><span>' + esc(b.t) + '</span><span>' + b.min + ' min</span></div>' + b.ex.map(function (e) {
      return '<div class="ex"><div class="n">' + esc(e.n) + '</div><div class="rx">' + esc(e.rx[lp]) + (e.rest[lp] && e.rest[lp] !== '–' ? '<div class="tiny muted">rest ' + esc(e.rest[lp]) + '</div>' : '') + '</div><div class="cue">' + esc(e.cue) + '</div></div>';
    }).join('');
  }).join('');
}
VIEWS.strength = function () {
  var w = App.week, lp = App.ui.lp != null ? App.ui.lp : (w && w.days ? (w.days.map(function (d) { return d.parts.filter(function (x) { return x.type === 'strength'; })[0]; }).filter(Boolean)[0] || { lp: 0 }).lp : 0);
  var mods = ['A', 'B', 'C', 'UB', 'HT', 'ACT'].filter(function (k) { return E.LIFT[k]; });
  var sel = App.args[0] && E.LIFT[App.args[0]] ? App.args[0] : App.ui.mod;
  var prof = Store.state.profile || {};
  var html = '<div class="pagehead"><h1>Strength</h1><p>45-minute sessions: heavy compound lifts, plyometrics for running power, and built-in shin and calf work. You lift ' + (prof.liftDays != null ? prof.liftDays : 2) + ' days a week; change it in <a href="#/settings">Plan settings</a> and the run schedule rearranges around it.</p></div>';
  html += '<div class="seg" role="group" aria-label="Phase">' + E.LIFT_PHASES.map(function (p, i) { return '<button data-act="lp" data-arg="' + jattr({ lp: i }) + '" aria-pressed="' + (i === lp) + '">' + p.k + '</button>'; }).join('') + '</div><p class="small muted">' + esc(E.LIFT_PHASES[lp].d) + '</p>';
  html += '<div class="chips">' + mods.map(function (k) { return '<button class="chip" data-act="mod" data-arg="' + jattr({ mod: k }) + '" aria-pressed="' + (k === sel) + '">' + (k.length === 1 ? 'Strength ' + k : E.LIFT[k].name) + '</button>'; }).join('') + '</div>';
  var m = E.LIFT[sel], total = m.blocks.reduce(function (a, b) { return a + b.min; }, 0);
  html += '<section class="card t-strength" style="border-left:4px solid var(--c)"><h2>' + esc(sel.length === 1 ? 'Strength ' + sel + ': ' + m.name : m.name) + '</h2><p class="small muted">' + total + ' min · ' + esc(m.focus) + '</p>' + moduleBody(sel, lp) +
    '<div class="btns" style="margin-top:10px"><button class="btn sm primary" data-act="sheet" data-arg="' + jattr({ sheet: 'lift', date: App.today, key: sel, extra: true }) + '">Log this session today</button></div></section>';
  html += '<section class="card"><h3>How the app tailors lifting</h3><ul class="plain small" style="margin-top:6px"><li>Heavy days go on your key-run days, after the run, so easy days stay easy.</li><li>No heavy legs the day before a long run.</li><li>Phases follow your running: Base (learn the lifts), Build (heavier, lower reps), Peak (maintain), Light (taper, race and recovery weeks).</li><li>When readiness is low, today\'s session drops to Light loads or becomes mobility only.</li><li>Niggles and injuries switch you to Upper Body & Core; vacations to the Travel Session.</li><li>Progress: add 5 lb to upper-body lifts or 10 lb to squats and deadlifts when you hit the top reps at the target RPE two sessions in a row.</li></ul></section>';
  return html;
};

/* ---- shins (prehab) ---- */
var ROUTINE = [
  ['Shin and calf strength', [['Tibialis raise (wall)', '3×15–20', 'Heels about 12 in from the wall. Toes up hard, 2 s up and 2 s down. Add a light band once it feels easy.'], ['Soleus raise (bent knee)', '3×15', 'Seated or knees bent 90°, weight on the thighs. 3 s down. The soleus takes most of the load when you run.'], ['Straight-knee calf raise', '3×12', 'Off a step. 2 s up, 3 s down.'], ['Eccentric heel drop', '3×10–12 /leg', 'Rise on two legs, lower on one over 3 s. Hold a dumbbell when it feels easy.']]],
  ['Foot and ankle', [['Short-foot hold', '3×10 × 5 s', 'Pull the ball of the foot toward the heel without curling the toes.'], ['Toe yoga', '2×10', 'Lift the big toe while the other four press down, then swap.'], ['Banded inversion / eversion', '2×15 each way', 'Only the ankle moves. Slow and controlled.'], ['Single-leg balance', '3×30 s /leg', 'Progress to eyes closed or a folded towel.']]],
  ['Hips and mobility', [['Side-lying hip abduction', '2×15 /side', 'Strong glute medius keeps the knee and shin from collapsing inward.'], ['Knee-to-wall ankle rock', '2×10 /side', 'Heel down, knee over the second toe.'], ['Calf and shin self-massage', '1–2 min /leg', 'Roll or press the muscles beside the shin bone. Never press on the bone itself.']]]
];
VIEWS.shins = function () {
  return '<div class="pagehead"><h1>Shins & prehab</h1><p>Shin splints come from adding load faster than the lower leg can adapt. This routine builds the calf, shin and foot strength to carry the miles, and the check below tells you how to respond when something aches.</p></div>' +
    '<section class="card"><h3>Before every run</h3><div class="stack tight" style="margin-top:8px"><div class="banner"><b style="color:var(--green)">Carry on.</b> No pain, or faint tightness that fades as you warm up.</div><div class="banner warn"><b>Dial it back.</b> A dull ache of 3/10 or less that settles within 24 hours: tell the coach "mild shin pain" — speed work becomes easy running and miles drop about 40%. Do the routine daily.</div><div class="banner" style="border-color:var(--danger)"><b style="color:var(--danger)">Stop and get checked.</b> Pain of 4/10+, pain when walking or at night, one sharp spot on the bone, or swelling. Stop running and see a sports medicine clinician to rule out a stress injury.</div></div></section>' +
    ROUTINE.map(function (g) { return '<section class="card"><h3>' + g[0] + '</h3>' + g[1].map(function (r) { return '<div class="list-item"><div class="n">' + r[0] + '</div><div class="d">' + r[1] + '</div><div class="c">' + r[2] + '</div></div>'; }).join('') + '</section>'; }).join('') +
    '<section class="card"><h3>Return-to-run ladder</h3><ol class="num small" style="margin-top:8px"><li><b>Calm it down (3–7 days).</b> No running. Walk if pain-free. Cross-train 30–45 minutes. Keep the routine daily at 2/10 pain or less.</li><li><b>Test it.</b> Walk 30 minutes with no pain and hop 10 times on each leg without pain.</li><li><b>Walk and run.</b> 10 × (1 min easy run, 1 min walk) on a soft, flat surface, every other day.</li><li><b>Build.</b> 5 × (3 min run, 1 min walk), then 20 minutes continuous, then 30. Raise time 10–20% per session. No speed or hills.</li><li><b>Rejoin the plan.</b> The plan ramps you back at 40%, 60%, 75% and 90% of planned miles after an injury week. Speed returns after two pain-free weeks.</li></ol><p class="tiny muted" style="margin-top:8px">Move forward only if pain stays at 2/10 or less and is gone within 24 hours. This is general guidance, not medical advice.</p></section>';
};

/* ---- warm-up ---- */
var WARM_FULL = [['Brisk walk or easy jog', '2 min', 'Raise your heart rate gently.'], ['Ankle rocks (knee to wall)', '10 /side', 'Heel stays down.'], ['Calf raises, slow', '10', 'Pause at the top.'], ['Leg swings, front to back', '10 /leg', 'Hold a wall. Keep the torso tall.'], ['Leg swings, side to side', '10 /leg', 'Swing across the body, relaxed hips.'], ['Hip openers (90/90 or fire hydrant)', '8 /side', 'Open the hip without twisting the lower back.'], ['Walking lunge with a twist', '6 /side', 'Rotate over the front leg.'], ['A-skips', '2 × 20 m', 'Knee up, toe up, quick ground contact.'], ['High knees and butt kicks', '2 × 20 m', 'Light and quick.'], ['Strides', '4 × 20 s', 'Smooth and relaxed. Add 2 more before key workouts.']];
var WARM_QUICK = [['Easy jog', '2 min', 'Slow to start.'], ['Leg swings, front to back', '10 /leg', 'Hold a wall.'], ['Hip openers', '6 /side', 'Smooth and controlled.'], ['Ankle rocks', '8 /side', 'Heel stays down.'], ['A-skips', '2 × 20 m', 'Quick and light.']];
var LIFT_WARM = [['Treadmill walk, brisk', '2 min', 'Just enough to get warm.'], ['Glute bridge', '10', 'Squeeze for 2 s.'], ['Bodyweight squat to a 3 s hold', '8', 'Chest up, knees out.'], ['Hip hinge with a dowel or empty bar', '8', 'Flat back. Feel the hamstrings.'], ['Pogo hops', '1 × 10', 'Light bounce.']];
var COOL = [['Calf stretch, straight knee', '45 s /leg'], ['Calf stretch, bent knee (soleus)', '45 s /leg'], ['Hamstring stretch', '45 s /leg'], ['Quad stretch', '45 s /leg'], ['Half-kneeling hip flexor stretch', '45 s /side'], ['Figure-4 glute stretch', '45 s /side'], ['Kneeling shin stretch, gentle', '20 s, twice']];
function itemList(a) { return a.map(function (r) { return '<div class="list-item"><div class="n">' + r[0] + '</div><div class="d">' + r[1] + '</div>' + (r[2] ? '<div class="c">' + r[2] + '</div>' : '') + '</div>'; }).join(''); }
VIEWS.warmup = function () {
  var full = App.ui.warm === 'full';
  return '<div class="pagehead"><h1>Warm-up & cool-down</h1><p>Five to ten minutes before every run and a short wind-down after.</p></div>' +
    '<section class="card"><div class="spread"><h3>Dynamic warm-up</h3><div class="seg" style="width:160px"><button data-act="warm" data-arg="' + jattr({ w: 'quick' }) + '" aria-pressed="' + !full + '">5 min</button><button data-act="warm" data-arg="' + jattr({ w: 'full' }) + '" aria-pressed="' + full + '">10 min</button></div></div>' + itemList(full ? WARM_FULL : WARM_QUICK) + '<p class="tiny muted" style="margin-top:6px">Use the 10-minute version before key workouts and races.</p></section>' +
    '<section class="card"><h3>Lift warm-up · 5 min</h3>' + itemList(LIFT_WARM) + '</section>' +
    '<section class="card"><h3>Cool-down</h3><p class="small muted">Walk 5 minutes, then stretch about 8 minutes.</p>' + itemList(COOL) + '<p class="tiny muted" style="margin-top:6px">Foam roll calves, quads, glutes and upper back 60 s each. Roll beside the shin bone, never on it.</p></section>';
};

/* ---- nutrition ---- */
VIEWS.nutrition = function () {
  var p = App.plan; if (!p) return setupNeeded();
  var prof = Store.state.profile, kg = prof.weightKg, t = App.today, w = App.week;
  var html = '<div class="pagehead"><h1>Nutrition</h1><p>Daily targets scale with your training load and recovery. ' + (kg ? 'Based on ' + Math.round(kg * 2.2046) + ' lb.' : '<a href="#/settings">Add your weight</a> for gram targets.') + '</p></div>';
  var days = w ? w.days : [];
  html += days.map(function (d) {
    var nu = E.nutrition(d, kg, w.zonesAdj, dayOf(E.addD(d.date, 1)), d.date === t ? App.rd : null, w.event && w.event.date >= w.start && w.event.date <= w.end ? w.event : null);
    var isT = d.date === t;
    return '<details class="acc"' + (isT ? ' open' : '') + '><summary><div><b>' + E.fmtDate(d.date, { weekday: 'long' }) + (isT ? ' · today' : '') + '</b><div class="tiny muted">' + nu.tier + ' · ' + d.parts.filter(function (x) { return x.type !== 'rest'; }).map(function (x) { return x.title; }).join(' + ') + '</div></div></summary><div class="body">' +
      '<div class="grid3"><div class="metric"><span>Carbs</span><b>' + (nu.carbG ? nu.carbG[0] + '–' + nu.carbG[1] + ' g' : nu.carbGkg.join('–') + ' g/kg') + '</b></div><div class="metric"><span>Protein</span><b>' + (nu.protG ? nu.protG[0] + '–' + nu.protG[1] + ' g' : nu.protGkg.join('–') + ' g/kg') + '</b></div><div class="metric"><span>Fluids</span><b>' + (nu.fluidL ? nu.fluidL + ' L' : 'to thirst') + '</b></div></div>' +
      (nu.fuel ? '<div class="stack tight small">' + ['before', 'during', 'fluid', 'after'].filter(function (k) { return nu.fuel[k]; }).map(function (k) { return '<div><b>' + k.charAt(0).toUpperCase() + k.slice(1) + ':</b> ' + esc(nu.fuel[k]) + '</div>'; }).join('') + '</div>' : '') +
      (nu.tips.length ? '<ul class="plain small">' + nu.tips.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + '</div></details>';
  }).join('');
  html += '<section class="card"><h3>The basics</h3><ul class="plain small" style="margin-top:6px"><li><b>Carbohydrate</b> is your main running fuel. Eat more on long and hard days, less on rest days.</li><li><b>Protein</b> 1.4–2.0 g/kg a day, spread over 3–4 meals, supports muscle repair from lifting and running.</li><li><b>Long runs:</b> practice race fueling: 30–60 g carbs per hour (up to 90 g for the marathon once your gut is trained).</li><li><b>Bone health:</b> enough total energy, calcium and vitamin D lower stress-fracture risk. Never chronically under-eat while training.</li><li>Ranges are general sports-nutrition guidance, not medical advice. A sports dietitian can personalize them.</li></ul></section>';
  return html;
};

/* ---- zones + LT / VO2 ---- */
VIEWS.zones = function () {
  var p = App.plan; if (!p) return setupNeeded();
  var w = App.week, zz = w.zonesAdj, an = App.an, hr = zz.hr;
  var rows = [['REC', 'Recovery', 'Very easy, the day after hard efforts'], ['E', 'Easy / long', 'Conversational, full sentences'], ['S', 'Steady', 'Comfortably brisk'], ['M', 'Marathon pace', 'Your current marathon fitness'], ['G', 'Goal race pace', w.event ? esc(w.event.name) + ' goal' : 'Next race goal'], ['T', 'Threshold', 'Comfortably hard, ~1-hour race effort'], ['I', 'Interval', 'About 5K effort'], ['R', 'Strides', 'Fast but relaxed']];
  var html = '<div class="pagehead"><h1>Pace & HR zones</h1><p>Week ' + w.n + '. Paces grow with your planned fitness and update from races, time trials, threshold tests, VO2max and how your runs feel.</p></div>';
  html += '<section class="card"><div class="scroll"><table class="t"><thead><tr><th>Zone</th><th>Pace /mi</th>' + (hr ? '<th>Heart rate</th>' : '') + '<th>Feel</th></tr></thead><tbody>' + rows.map(function (r) {
    var z = zz[r[0]], h = hr && hr[r[0]];
    return '<tr><td><span class="dot" style="background:' + Z_COLOR[r[0]] + '"></span> ' + r[1] + '</td><td class="mono">' + (z ? pace(z[0]) + '–' + pace(z[1]) : '–') + '</td>' + (hr ? '<td class="mono">' + (h ? (h[0] ? h[0] + '–' : '<') + h[1] : '–') + '</td>' : '') + '<td class="small muted">' + r[2] + '</td></tr>';
  }).join('') + '</tbody></table></div></section>';
  html += '<section class="card"><div class="spread"><h3>Fitness</h3><span class="pill teal">VDOT ' + (an.vNow ? an.vNow.toFixed(1) : '–') + '</span></div>' +
    '<div class="grid4" style="margin-top:8px">' + [['5K', an.proj.k5], ['10K', an.proj.k10], ['Half', an.proj.half], ['Marathon', an.proj.full]].map(function (x) { return '<div class="metric"><span>' + x[0] + '</span><b class="mono" style="font-size:1rem">' + E.clock(x[1]) + '</b><em>predicted</em></div>'; }).join('') + '</div>' +
    (an.notes.length ? '<div class="stack tight" style="margin-top:10px">' + an.notes.map(function (n) { return '<div class="banner ' + (n.level === 'warn' ? 'warn' : 'info') + ' small"><b>' + esc(n.title) + '.</b> ' + esc(n.body) + '</div>'; }).join('') + '</div>' : '') + '</section>';
  var ms = (Store.state.metrics || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  html += '<section class="card"><div class="spread"><h3>Lactate threshold & VO2max</h3><button class="btn sm primary" data-act="sheet" data-arg="' + jattr({ sheet: 'metrics' }) + '">Add reading</button></div>' +
    '<p class="small muted" style="margin-top:4px">Garmin\'s personal API doesn\'t share these, so add them when your watch, a lab or a test updates them. A threshold pace sets your threshold workouts directly for the next 10 weeks; a VO2max reading nudges every pace (at half weight, since watch estimates vary). Threshold heart rate sets your HR zones.</p>' +
    (ms.length ? '<div class="scroll" style="margin-top:8px"><table class="t"><thead><tr><th>Date</th><th>LT pace</th><th>LT HR</th><th>VO2max</th><th></th></tr></thead><tbody>' + ms.map(function (m) { return '<tr><td class="mono">' + E.fmtDate(m.date, { month: 'short', day: 'numeric', year: '2-digit' }) + '</td><td class="mono">' + esc(m.ltPace || '–') + '</td><td class="mono">' + (m.ltHr || '–') + '</td><td class="mono">' + (m.vo2 || '–') + '</td><td><button class="btn sm ghost" data-act="del-metric" data-arg="' + jattr({ id: m.id }) + '">Delete</button></td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="empty">No readings yet.</p>') + '</section>';
  return html;
};

/* ---- progress ---- */
/* Every run we know about: logged runs plus Garmin history from before the plan. Oldest first. */
function allRuns() {
  var logs = Store.state.logs || {}, out = [], used = {};
  Object.keys(logs).forEach(function (d) { ['run', 'xrun'].forEach(function (s) { var r = logs[d][s]; if (!r || r.skip || !(+r.mi > 0)) return; if (r.gid) used[r.gid] = 1; out.push({ date: d, mi: +r.mi, sec: +r.sec || 0, hr: r.hr || null, rpe: r.rpe || null, ptype: r.ptype || 'easy', name: r.name || '', src: r.src || 'manual', race: !!(r.seg && r.seg.race), seg: r.seg || null, inPlan: true }); }); });
  var g = Store.garmin, start = App.plan ? App.plan.start : '9999';
  if (g && g.activities) g.activities.forEach(function (a) {
    if (!a.run || !a.date || used[a.id] || !(a.distM > 0)) return;
    if (a.date >= start && (Store.state.seen || {})[a.id]) return;
    out.push({ date: a.date, mi: E.round1(a.distM / E.MI_M), sec: Math.round(a.movS || a.durS || 0), hr: a.avgHR || null, rpe: null, ptype: a.race ? 'race' : 'easy', name: a.name || '', src: 'garmin', race: !!a.race, seg: null, inPlan: false });
  });
  out.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  return out;
}
function sumMi(a) { return a.reduce(function (t, x) { return t + x.mi; }, 0); }
function hms(sec) { var h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60); return h ? h + 'h ' + m + 'm' : m + 'm'; }
VIEWS.progress = function () {
  var p = App.plan; if (!p) return setupNeeded();
  var t = App.today, runs = allRuns(), logs = Store.state.logs || {};
  var tab = App.args[0] || 'overview';
  var html = '<div class="pagehead"><h1>Progress</h1></div><div class="seg" role="group" aria-label="Progress section">' + [['overview', 'Overview'], ['running', 'Running'], ['recovery', 'Recovery'], ['strength', 'Strength']].map(function (x) { return '<button data-act="nav" data-arg="' + jattr({ to: '#/progress/' + x[0], replace: true }) + '" aria-pressed="' + (tab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
  var since = function (days) { var from = E.addD(t, -days); return runs.filter(function (x) { return x.date > from && x.date <= t; }); };
  var yr = runs.filter(function (x) { return x.date.slice(0, 4) === t.slice(0, 4); });
  var cur = App.week ? App.week.n : 1;

  if (tab === 'overview') {
    var r30 = since(30), prev30 = runs.filter(function (x) { return x.date > E.addD(t, -60) && x.date <= E.addD(t, -30); });
    var d30 = sumMi(r30) - sumMi(prev30);
    var liftsN = Object.keys(logs).filter(function (d) { return logs[d].lift; }).length;
    html += '<div class="tiles">' + [
      ['This week', mi(App.week ? weekActual(App.week) : 0) + ' mi', App.week ? 'of ' + mi(App.week.tot.mi) + ' planned' : ''],
      ['Last 30 days', mi(sumMi(r30)) + ' mi', (d30 >= 0 ? '+' : '') + mi(d30) + ' vs previous 30'],
      [t.slice(0, 4) + ' total', Math.round(sumMi(yr)) + ' mi', plural(yr.length, 'run')],
      ['All time', Math.round(sumMi(runs)) + ' mi', plural(runs.length, 'run')],
      ['Fitness', App.an.vNow ? App.an.vNow.toFixed(1) : '–', 'VDOT'],
      ['Gym sessions', liftsN, 'logged']
    ].map(function (x) { return '<div class="tile"><span>' + x[0] + '</span><b>' + x[1] + '</b><em>' + x[2] + '</em></div>'; }).join('') + '</div>';
    var ws = p.weeks.slice(Math.max(0, cur - 12), Math.min(p.weeks.length, cur + 4));
    html += '<section class="card"><h3>Weekly miles</h3><p class="small muted">Planned against what you ran.</p>' + barChart(ws.map(function (w) { return { label: w.n, a: w.tot.mi, b: weekActual(w), cur: w.n === cur }; })) + '<div class="legend" style="margin-top:6px"><span><i class="dot" style="background:var(--line2)"></i>Planned</span><span><i class="dot" style="background:var(--green)"></i>Logged</span></div></section>';
    /* race predictions */
    html += '<section class="card"><div class="spread"><h3>Race predictions</h3><a class="btn sm" href="#/zones">Paces</a></div><div class="scroll"><table class="t fit" style="margin-top:6px"><thead><tr><th>Race</th><th class="num">Predicted</th><th class="num">Pace</th><th class="num">Goal</th></tr></thead><tbody>' +
      [['5K', 3.10686, '5k'], ['10K', 6.21371, '10k'], ['Half', 13.1094, 'half'], ['Marathon', 26.2188, 'full']].map(function (x) {
        var pr = E.predict(App.an.vNow, x[1]);
        var ev = (Store.state.events || []).filter(function (e) { return e.dist === x[2] && e.goal && e.date >= t; })[0];
        return '<tr><td>' + x[0] + '</td><td class="num">' + E.clock(pr) + '</td><td class="num">' + pace(pr / x[1]) + '</td><td class="num">' + (ev ? esc(String(ev.goal).replace(/^0:/, '')) : '–') + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="tiny muted" style="margin-top:8px">From your current fitness. It updates after races, time trials, threshold tests and VO2max readings.</p></section>';
    /* plan weeks table */
    var rows = p.weeks.slice(Math.max(0, cur - 8), cur).reverse();
    html += '<section class="card"><h3>Week by week</h3><div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Week</th><th class="num">Planned</th><th class="num">Ran</th><th class="num">%</th><th class="num">Long</th><th class="num">Gym</th></tr></thead><tbody>' + rows.map(function (w) {
      var a = weekActual(w), longest = 0, gym = 0;
      w.days.forEach(function (d) { var l = logs[d.date]; if (!l) return; ['run', 'xrun'].forEach(function (s) { if (l[s] && !l[s].skip) longest = Math.max(longest, +l[s].mi || 0); }); if (l.lift) gym++; });
      return '<tr><td><a href="#/plan/' + w.n + '">Wk ' + w.n + '</a> <span class="tiny muted">' + E.fmtDate(w.start) + '</span></td><td class="num">' + mi(w.tot.mi) + '</td><td class="num">' + mi(a) + '</td><td class="num">' + (w.tot.mi ? Math.round(a / w.tot.mi * 100) : 0) + '</td><td class="num">' + (longest ? mi(longest) : '–') + '</td><td class="num">' + gym + '/' + w.tot.lifts + '</td></tr>';
    }).join('') + '</tbody></table></div></section>';
  }

  if (tab === 'running') {
    /* monthly totals: last 12 months */
    var months = [];
    var d0 = E.pd(t); d0.setDate(1);
    for (var i = 11; i >= 0; i--) { var dd = new Date(d0.getFullYear(), d0.getMonth() - i, 1); months.push(dd.getFullYear() + '-' + (dd.getMonth() < 9 ? '0' : '') + (dd.getMonth() + 1)); }
    var byM = {}; months.forEach(function (m) { byM[m] = { mi: 0, sec: 0, n: 0, long: 0 }; });
    runs.forEach(function (x) { var m = byM[x.date.slice(0, 7)]; if (!m) return; m.mi += x.mi; m.sec += x.sec; m.n++; m.long = Math.max(m.long, x.mi); });
    html += '<section class="card"><h3>Monthly miles</h3><p class="small muted">The last 12 months, including your Garmin history.</p>' + barChart(months.map(function (m) { return { label: E.pd(m + '-01').toLocaleDateString('en-US', { month: 'short' }).charAt(0), a: 0, b: byM[m].mi, cur: m === t.slice(0, 7), all: true }; })) + '</section>';
    html += '<section class="card"><h3>Month by month</h3><div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Month</th><th class="num">Runs</th><th class="num">Miles</th><th class="num">Time</th><th class="num">Avg pace</th><th class="num">Longest</th></tr></thead><tbody>' + months.slice().reverse().map(function (m) {
      var x = byM[m];
      return '<tr><td>' + E.pd(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) + '</td><td class="num">' + x.n + '</td><td class="num">' + mi(x.mi) + '</td><td class="num">' + (x.sec ? hms(x.sec) : '–') + '</td><td class="num">' + (x.sec && x.mi ? pace(x.sec / x.mi) : '–') + '</td><td class="num">' + (x.long ? mi(x.long) : '–') + '</td></tr>';
    }).join('') + '</tbody></table></div></section>';
    /* bests */
    if (runs.length) {
      var longest = runs.reduce(function (a, b) { return b.mi > a.mi ? b : a; });
      var fast = runs.filter(function (x) { return x.mi >= 3 && x.sec > 0; });
      var fastest = fast.length ? fast.reduce(function (a, b) { return b.sec / b.mi < a.sec / a.mi ? b : a; }) : null;
      var wk = {}; runs.forEach(function (x) { var k = E.monday(x.date); wk[k] = (wk[k] || 0) + x.mi; });
      var bigK = Object.keys(wk).reduce(function (a, b) { return wk[b] > wk[a] ? b : a; });
      var races = runs.filter(function (x) { return x.race; }).slice(-6).reverse();
      html += '<section class="card"><h3>Personal bests</h3><div class="scroll"><table class="t" style="margin-top:6px"><tbody>' +
        '<tr><td>Longest run</td><td class="num">' + mi(longest.mi) + ' mi</td><td class="num muted">' + E.fmtDate(longest.date, { month: 'short', day: 'numeric', year: '2-digit' }) + '</td></tr>' +
        (fastest ? '<tr><td>Fastest run (3 mi+)</td><td class="num">' + pace(fastest.sec / fastest.mi) + '/mi</td><td class="num muted">' + E.fmtDate(fastest.date, { month: 'short', day: 'numeric', year: '2-digit' }) + '</td></tr>' : '') +
        '<tr><td>Biggest week</td><td class="num">' + mi(wk[bigK]) + ' mi</td><td class="num muted">' + E.fmtDate(bigK, { month: 'short', day: 'numeric', year: '2-digit' }) + '</td></tr>' +
        races.map(function (x) { var m = x.seg ? x.seg.mi : x.mi, s = x.seg ? x.seg.sec : x.sec; return '<tr><td>Race · ' + mi(m) + ' mi</td><td class="num">' + E.clock(s) + '</td><td class="num muted">' + E.fmtDate(x.date, { month: 'short', day: 'numeric', year: '2-digit' }) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
    }
    var easy = runs.filter(function (x) { return (x.ptype === 'easy' || x.ptype === 'recovery' || x.ptype === 'long') && x.sec && x.mi >= 1; }).slice(-40);
    if (easy.length >= 3) html += '<section class="card"><h3>Easy pace and heart rate</h3><p class="small muted">Aerobic fitness shows up as a faster easy pace at the same heart rate.</p>' + lineChart(easy.map(function (x) { return x.date; }), [{ name: 'Pace (min/mi)', vals: easy.map(function (x) { return x.sec / x.mi / 60; }), color: 'var(--green)', invert: true, fmt: function (v) { return pace(v * 60); } }]) + (easy.some(function (x) { return x.hr; }) ? lineChart(easy.map(function (x) { return x.date; }), [{ name: 'Avg heart rate (bpm)', vals: easy.map(function (x) { return x.hr; }), color: 'var(--red)' }]) : '') + '</section>';
    if (App.an.vo2 && App.an.vo2.hist.length >= 2) html += '<section class="card"><h3>VO2max</h3>' + lineChart(App.an.vo2.hist.map(function (x) { return x.date; }), [{ name: 'VO2max', vals: App.an.vo2.hist.map(function (x) { return x.v; }), color: 'var(--violet)' }]) + '</section>';
    var n = +App.ui.hist || 20;
    html += '<section class="card"><div class="spread"><h3>All runs</h3><a class="btn sm" href="#/data">Export</a></div><p class="small muted">' + plural(runs.length, 'run') + (runs.length ? ' since ' + E.fmtDate(runs[0].date, { month: 'short', year: 'numeric' }) : '') + '</p>' + (runs.length ? '<div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Date</th><th class="num">Miles</th><th class="num">Time</th><th class="num">Pace</th><th class="num">HR</th><th class="num">RPE</th></tr></thead><tbody>' + runs.slice(-n).reverse().map(function (x) {
      return '<tr><td>' + (x.inPlan ? '<a href="#/day/' + x.date + '">' : '') + E.fmtDate(x.date, { month: 'short', day: 'numeric', year: '2-digit' }) + (x.inPlan ? '</a>' : '') + (x.race ? ' <span class="pill" style="padding:1px 7px">race</span>' : '') + '</td><td class="num">' + mi(x.mi) + '</td><td class="num">' + (x.sec ? E.clock(x.sec) : '–') + '</td><td class="num">' + (x.sec ? pace(x.sec / x.mi) : '–') + '</td><td class="num">' + (x.hr || '–') + '</td><td class="num">' + (x.rpe || '–') + '</td></tr>';
    }).join('') + '</tbody></table></div>' + (runs.length > n ? '<div class="btns" style="margin-top:10px"><button class="btn sm" data-act="more-hist">Show more</button></div>' : '') : '<p class="empty">No runs yet. Once Garmin is connected, all your past runs appear here.</p>') + '</section>';
  }

  if (tab === 'recovery') {
    var g = Store.garmin && Store.garmin.days;
    if (!g) html += '<section class="card"><h3>No recovery data yet</h3><p class="small muted">Connect Garmin to see HRV, resting heart rate, sleep and Body Battery trends.</p><div class="btns" style="margin-top:10px"><a class="btn primary" href="#/sync">Connect Garmin</a></div></section>';
    else {
      var dates = []; for (var j = 41; j >= 0; j--) dates.push(E.addD(t, -j));
      var avg = function (k, from, to) { var v = []; for (var q = from; q < to; q++) { var r = g[E.addD(t, -q)]; if (r && typeof r[k] === 'number') v.push(r[k]); } return v.length ? E.mean(v) : null; };
      var rowsR = [['HRV', 'hrv', ' ms', 0], ['Resting HR', 'rhr', ' bpm', 0], ['Sleep', 'sleepH', ' h', 1], ['Sleep score', 'sleepScore', '', 0], ['Body Battery peak', 'bbHigh', '', 0], ['Stress', 'stress', '', 0]];
      var f = function (v, nd) { return v == null ? '–' : (nd ? v.toFixed(1) : Math.round(v)); };
      html += '<section class="card"><h3>Recovery averages</h3><div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Metric</th><th class="num">Last 7 days</th><th class="num">Last 28 days</th><th class="num">Change</th></tr></thead><tbody>' + rowsR.map(function (r) {
        var a = avg(r[1], 0, 7), b = avg(r[1], 0, 28), ch = a != null && b != null ? a - b : null;
        return '<tr><td>' + r[0] + '</td><td class="num">' + f(a, r[3]) + r[2] + '</td><td class="num">' + f(b, r[3]) + r[2] + '</td><td class="num">' + (ch == null ? '–' : (ch >= 0 ? '+' : '') + ch.toFixed(1)) + '</td></tr>';
      }).join('') + '</tbody></table></div></section>';
      var rds = dates.slice(-28).map(function (d) { var r = E.readiness(Store.state, Store.garmin, d); return r.factors ? r.score : null; });
      html += '<section class="card"><h3>Six-week trends</h3>' +
        lineChart(dates.slice(-28), [{ name: 'Readiness score', vals: rds, color: 'var(--green)' }]) +
        lineChart(dates, [{ name: 'HRV (ms)', vals: dates.map(function (d) { return g[d] && g[d].hrv; }), color: 'var(--violet)' }]) +
        lineChart(dates, [{ name: 'Resting heart rate (bpm)', vals: dates.map(function (d) { return g[d] && g[d].rhr; }), color: 'var(--red)' }]) +
        lineChart(dates, [{ name: 'Sleep (hours)', vals: dates.map(function (d) { return g[d] && g[d].sleepH; }), color: 'var(--blue)' }]) +
        lineChart(dates, [{ name: 'Body Battery peak', vals: dates.map(function (d) { return g[d] && g[d].bbHigh; }), color: 'var(--gold)' }]) + '</section>';
    }
  }

  if (tab === 'strength') {
    var lrows = liftSeries();
    var all = {}; Object.keys(logs).sort().forEach(function (d) { var l = logs[d].lift; if (!l || !l.ex) return; Object.keys(l.ex).forEach(function (nm) { var e = l.ex[nm]; if (!(e.w > 0)) return; var e1 = Math.round(e.w * (1 + (e.reps || 1) / 30)); var a = all[nm] = all[nm] || { first: e1, best: 0, last: null, n: 0 }; a.best = Math.max(a.best, e1); a.last = e; a.lastE = e1; a.n++; }); });
    var names = Object.keys(all);
    html += names.length ? '<section class="card"><h3>Your lifts</h3><div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Lift</th><th class="num">Last</th><th class="num">Est. 1RM</th><th class="num">Best</th><th class="num">Gain</th></tr></thead><tbody>' + names.sort(function (a, b) { return all[b].n - all[a].n; }).map(function (nm) {
      var a = all[nm];
      return '<tr><td>' + esc(nm) + '</td><td class="num">' + a.last.w + ' × ' + (a.last.reps || '–') + '</td><td class="num">' + a.lastE + '</td><td class="num">' + a.best + '</td><td class="num">' + (a.lastE - a.first >= 0 ? '+' : '') + (a.lastE - a.first) + '</td></tr>';
    }).join('') + '</tbody></table></div><p class="tiny muted" style="margin-top:8px">Weights in lb. Estimated one-rep max uses weight × (1 + reps ÷ 30).</p></section>' : '<section class="card"><h3>No lifts logged yet</h3><p class="small muted">Log weights from any strength session and your estimated one-rep max is tracked here.</p><div class="btns" style="margin-top:10px"><a class="btn primary" href="#/strength">Open strength</a></div></section>';
    lrows.slice(0, 4).forEach(function (s) { html += '<section class="card">' + lineChart(s.pts.map(function (x) { return x.date; }), [{ name: s.name + ' · est. 1RM (lb)', vals: s.pts.map(function (x) { return x.v; }), color: 'var(--blue)' }]) + '</section>'; });
    var gymW = p.weeks.slice(Math.max(0, cur - 12), cur).map(function (w) { var n2 = 0; w.days.forEach(function (d) { if ((logs[d.date] || {}).lift) n2++; }); return { label: w.n, a: w.tot.lifts, b: n2, cur: w.n === cur }; });
    html += '<section class="card"><h3>Gym sessions per week</h3>' + barChart(gymW) + '</section>';
  }
  return html;
};
function liftSeries() {
  var logs = Store.state.logs || {}, by = {};
  Object.keys(logs).sort().forEach(function (d) {
    var l = logs[d].lift; if (!l || !l.ex) return;
    Object.keys(l.ex).forEach(function (n) { var e = l.ex[n]; if (!(e.w > 0 && e.reps > 0)) return; (by[n] = by[n] || []).push({ date: d, v: Math.round(e.w * (1 + e.reps / 30)) }); });
  });
  return Object.keys(by).map(function (n) { return { name: n, pts: by[n] }; }).filter(function (s) { return s.pts.length >= 2; }).sort(function (a, b) { return b.pts.length - a.pts.length; });
}
function barChart(items) {
  var W = 340, H = 150, pl = 24, pb = 16, max = Math.max.apply(null, items.map(function (x) { return Math.max(x.a, x.b); }).concat([10]));
  var bw = (W - pl) / items.length;
  var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Weekly miles">';
  [0.5, 1].forEach(function (f) { var y = 10 + (H - pb - 10) * (1 - f); s += '<line x1="' + pl + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="var(--line)" stroke-dasharray="3 3"/><text x="0" y="' + (y + 3) + '">' + Math.round(max * f) + '</text>'; });
  items.forEach(function (x, i) {
    var X = pl + i * bw, ha = (H - pb - 10) * x.a / max, hb = (H - pb - 10) * x.b / max;
    s += '<rect x="' + (X + 1) + '" y="' + (H - pb - ha) + '" width="' + (bw - 2) + '" height="' + ha + '" rx="2" fill="var(--line2)"/>';
    var solo = x.all || !(x.a > 0), wb = solo ? bw - 2 : bw * 0.5, xb = solo ? X + 1 : X + bw * 0.25;
    if (hb > 0) s += '<rect x="' + xb + '" y="' + (H - pb - hb) + '" width="' + wb + '" height="' + hb + '" rx="2" fill="var(--green)"/>';
    /* value labels: inside the bar when it fits, above it when the bar is short */
    var val = x.b > 0 ? x.b : x.a, hv = x.b > 0 ? hb : ha, lab = val >= 10 ? String(Math.round(val)) : val > 0 ? String(Math.round(val * 10) / 10) : '';
    if (lab) {
      var cx = X + bw / 2, top = H - pb - hv, vert = (x.b > 0 ? wb : bw - 2) < 4 + lab.length * 4.6, need = vert ? lab.length * 4.6 + 6 : 12, inside = hv >= need;
      var fillc = inside ? (x.b > 0 ? '#04210f' : 'var(--ink)') : 'var(--muted)';
      if (vert) s += '<text class="bl" transform="translate(' + (cx + 2.7) + ',' + (inside ? top + 4 : top - 3) + ') rotate(-90)" text-anchor="' + (inside ? 'end' : 'start') + '" style="fill:' + fillc + '">' + lab + '</text>';
      else s += '<text class="bl" x="' + cx + '" y="' + (inside ? top + 10 : top - 3) + '" text-anchor="middle" style="fill:' + fillc + '">' + lab + '</text>';
    }
    if (x.cur || i % 4 === 0) s += '<text x="' + (X + bw / 2) + '" y="' + (H - 3) + '" text-anchor="middle"' + (x.cur ? ' style="fill:var(--ink);font-weight:700"' : '') + '>' + x.label + '</text>';
  });
  return s + '</svg>';
}
function lineChart(dates, series) {
  var W = 340, H = 110, pl = 30, pb = 14, pt = 16;
  var s0 = series[0], vals = s0.vals.map(function (v) { return typeof v === 'number' ? v : null; });
  var real = vals.filter(function (v) { return v != null; });
  if (real.length < 2) return '<p class="small muted">' + esc(s0.name) + ': not enough data yet.</p>';
  var lo = Math.min.apply(null, real), hi = Math.max.apply(null, real); if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
  var pad2 = (hi - lo) * 0.15; lo -= pad2; hi += pad2;
  function X(i) { return pl + i * (W - pl - 4) / Math.max(1, dates.length - 1); }
  function Y(v) { var f = (v - lo) / (hi - lo); if (s0.invert) f = 1 - f; return pt + (H - pt - pb) * (1 - f); }
  var path = '', started = false;
  vals.forEach(function (v, i) { if (v == null) { started = false; return; } path += (started ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' '; started = true; });
  var fmt = s0.fmt || function (v) { return Math.round(v * 10) / 10; };
  var last = null; for (var i = vals.length - 1; i >= 0; i--) if (vals[i] != null) { last = { i: i, v: vals[i] }; break; }
  return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(s0.name) + '"><text x="' + pl + '" y="10" style="fill:var(--ink)">' + esc(s0.name) + '</text>' +
    '<text x="0" y="' + (Y(s0.invert ? lo + pad2 : hi - pad2) + 3) + '">' + fmt(hi - pad2) + '</text><text x="0" y="' + (Y(s0.invert ? hi - pad2 : lo + pad2) + 3) + '">' + fmt(lo + pad2) + '</text>' +
    '<path d="' + path + '" fill="none" stroke="' + s0.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
    vals.map(function (v, i) { return v == null ? '' : '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="' + (dates.length > 30 ? 1.6 : 2.6) + '" fill="' + s0.color + '"/>'; }).join('') +
    (last ? '<text x="' + Math.min(W - 30, X(last.i) + 4) + '" y="' + (Y(last.v) - 6) + '" style="fill:var(--ink);font-weight:700">' + fmt(last.v) + '</text>' : '') +
    '<text x="' + pl + '" y="' + (H - 2) + '">' + E.fmtDate(dates[0]) + '</text><text x="' + W + '" y="' + (H - 2) + '" text-anchor="end">' + E.fmtDate(dates[dates.length - 1]) + '</text></svg>';
}

/* ---- coach ---- */
function coachCtx() {
  var t = App.today, w = App.week, nl = null;
  if (App.plan) {
    App.plan.weeks.some(function (wk) { return wk.days.some(function (d) { if (d.date >= t) { var lp = d.parts.filter(function (x) { return x.type === 'long'; })[0]; if (lp) { nl = E.fmtDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' }) + ', ' + mi(lp.mi) + ' mi (' + lp.title + ')'; return true; } } return false; }); });
  }
  return { zones: zonesAt(t), rd: App.rd, rec: App.rec, profile: Store.state.profile, todayDay: dayOf(t), tomorrowDay: dayOf(E.addD(t, 1)), nextLong: nl,
    nutrition: App.plan ? E.nutrition(dayOf(t), (Store.state.profile || {}).weightKg, zonesAt(t), dayOf(E.addD(t, 1)), App.rd, null) : null,
    weekSummary: w ? 'Week ' + w.n + ' (' + w.phase.name + '): ' + mi(w.tot.mi) + ' mi. ' + w.days.map(function (d) { return d.dow + ': ' + d.parts.map(function (x) { return x.type === 'rest' ? 'rest' : x.title + (E.isRun(x) ? ' ' + mi(x.mi) : ''); }).join(' + '); }).join(' · ') : '' };
}
function coachSay(text, actions, who) {
  var id = uid();
  Store.edit('coach', id, function (s) {
    s.coach.push({ id: id, t: new Date().toISOString(), who: who || 'coach', text: text, actions: actions || [] });
    if (s.coach.length > 200) s.coach = s.coach.slice(-200);
  });
}
function weeklyReviewIfDue() {
  if (!App.plan || !App.week) return;
  var prev = E.weekOf(App.plan, E.addD(App.week.start, -1));
  if (!prev) return;
  var tag = 'review-' + prev.start;
  if ((Store.state.coach || []).some(function (m) { return m.tag === tag; })) return;
  var done = prev.days.filter(function (d) { return d.parts.some(function (x) { return x.type !== 'rest' && partDone(d.date, x); }); }).length;
  var rds = prev.days.map(function (d) { return E.readiness(Store.state, Store.garmin, d.date); }).filter(function (r) { return r.factors; }).map(function (r) { return r.score; });
  var text = C.weeklyReview(prev, done, prev.tot.mi, weekActual(prev), rds.length ? E.mean(rds) : null);
  var id = uid();
  Store.edit('coach', id, function (s) { s.coach.push({ id: id, t: new Date().toISOString(), who: 'coach', text: text, tag: tag, actions: [] }); });
}
VIEWS.coach = function () {
  var msgs = (Store.state.coach || []).slice(-60);
  var html = '<div class="pagehead"><h1>Coach</h1><p>Tell me how you feel or what\'s coming up and I\'ll adjust your plan. Built in, free, and private.</p></div>';
  html += '<div class="chips">' + [['Daily check-in', { sheet: 'checkin' }], ['Something came up', { sheet: 'life' }], ['I\'m sore or hurting', { ask: 'I have some pain' }], ['I\'m sick', { ask: 'I am sick' }], ['Too hard', { ask: 'this plan feels too hard' }], ['Too easy', { ask: 'this plan feels too easy' }], ['My paces', { ask: 'what are my paces' }], ['This week', { ask: 'what does this week look like' }], ['Copy for Claude', { copy: true }]].map(function (c) {
    return '<button class="chip" data-act="coach-act" data-arg="' + jattr(c[1]) + '">' + c[0] + '</button>';
  }).join('') + '</div>';
  html += '<div class="thread" id="thread">' + (msgs.length ? msgs.map(function (m) {
    return '<div class="msg ' + (m.who === 'me' ? 'me' : 'coach') + '">' + esc(m.text) + ((m.actions || []).length ? '<div class="acts">' + m.actions.map(function (a) { return '<button class="btn sm" data-act="coach-act" data-arg="' + jattr(a.act) + '">' + esc(a.label) + '</button>'; }).join('') + '</div>' : '') + '<time>' + new Date(m.t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + '</time></div>';
  }).join('') : '<div class="msg coach">Hi! I\'m your built-in coach. Ask about paces, workouts, shins, fueling, lifting or race day — or tell me about travel, busy days, illness or how the plan feels, and I\'ll adapt it.</div>') + '</div>';
  html += '<form class="composer" data-form="coach"><input id="coachIn" placeholder="Ask your coach…" autocomplete="off" aria-label="Message the coach"><button class="btn primary sm" type="submit">Send</button></form>';
  App.after = function () { var th = $('#thread'); if (th && th.lastElementChild) th.lastElementChild.scrollIntoView({ block: 'end' }); };
  return html;
};
function coachAct(a) {
  if (!a) return;
  if (a.nav) { go(a.nav); return; }
  if (a.sheet) { openSheet(a.sheet, a); return; }
  if (a.ask) { coachSend(a.ask); return; }
  if (a.copy) { copyForClaude(); return; }
  if (a.life) { openSheet('life', { kind: a.life.kind, level: a.life.level }); return; }
  if (a.profile) {
    Store.edit('profile', null, function (s) { Object.keys(a.profile).forEach(function (k) { s.profile[k] = a.profile[k]; }); });
    coachSay('Done — your plan has been rebuilt with that change. Have a look at this week.', [{ label: 'Open plan', act: { nav: '#/plan' } }]);
    toast('Plan updated');
    return;
  }
  if (a.override) { setOverride(App.today, a.override, 'coach suggestion'); toast('Today adjusted'); return; }
}
function coachSend(text) {
  coachSay(text, [], 'me');
  var r = C.reply(text, coachCtx());
  coachSay(r.text, r.actions);
}
function copyForClaude() {
  var p = App.plan, st = Store.state, t = App.today, w = App.week;
  var lines = ['# My running plan context', '', 'Today: ' + t];
  if (p) {
    lines.push('Training style: ' + p.method.name + '. Profile: ' + JSON.stringify({ runDays: st.profile.runDays, liftDays: st.profile.liftDays, crossDays: st.profile.crossDays, longDay: E.DOW[st.profile.longDay], mpwAtStart: st.profile.mpw }));
    lines.push('Races: ' + (st.events || []).map(function (e) { return e.name + ' ' + e.date + ' (' + e.dist + ', goal ' + (e.goal || '–') + ', ' + e.priority + ')'; }).join('; '));
    if (w) { lines.push('', '## This week (Week ' + w.n + ', ' + w.phase.name + ', ' + mi(w.tot.mi) + ' mi)'); w.days.forEach(function (d) { lines.push('- ' + d.dow + ' ' + d.date + ': ' + d.parts.map(function (x) { return x.title + (E.isRun(x) ? ' ' + mi(x.mi) + ' mi' : x.min ? ' ' + x.min + ' min' : ''); }).join(' + ')); }); }
    var z = zonesAt(t); lines.push('', 'Current paces: easy ' + pace(z.E[0]) + '-' + pace(z.E[1]) + ', threshold ' + pace(z.T[0]) + '-' + pace(z.T[1]) + ', interval ' + pace(z.I[0]) + '-' + pace(z.I[1]) + ', goal ' + pace(z.G[0]) + '-' + pace(z.G[1]) + '. Fitness VDOT ' + (App.an.vNow || 0).toFixed(1) + '.');
  }
  lines.push('', '## Last 14 days');
  for (var i = 13; i >= 0; i--) {
    var d = E.addD(t, -i), l = (st.logs || {})[d] || {}, g = Store.garmin && Store.garmin.days && Store.garmin.days[d];
    var bits = [];
    if (l.run) bits.push('run ' + mi(l.run.mi) + ' mi' + (l.run.sec ? ' ' + E.clock(l.run.sec) : '') + (l.run.hr ? ' HR ' + l.run.hr : '') + (l.run.rpe ? ' RPE ' + l.run.rpe : ''));
    if (l.lift) bits.push('lift');
    if (l.cross) bits.push('cross ' + (l.cross.min || 0) + ' min');
    if (g) bits.push('sleep ' + (g.sleepH || '–') + 'h, HRV ' + (g.hrv || '–') + ', RHR ' + (g.rhr || '–') + ', BB ' + (g.bbHigh || '–'));
    var c = E.checkinFor(st, d); if (c) bits.push('check-in feel ' + c.feel + (c.note ? ' "' + c.note + '"' : ''));
    lines.push('- ' + d + ': ' + (bits.join('; ') || '—'));
  }
  lines.push('', 'My question: ');
  var text = lines.join('\n');
  var done = function () { toast('Copied. Paste it into the Claude app and add your question.'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { download('plan-context.md', text, 'text/markdown'); });
  else download('plan-context.md', text, 'text/markdown');
}

/* ---- goals ---- */
VIEWS.goals = function () {
  var evs = (Store.state.events || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  return '<div class="pagehead"><h1>Goals & races</h1><p>A-races get a full build and taper. B- and C-races slot in as tune-ups. Add, change or remove races any time and the plan rebuilds.</p></div>' +
    '<div class="btns"><button class="btn primary" data-act="sheet" data-arg="' + jattr({ sheet: 'event' }) + '">Add a race</button></div>' +
    (evs.length ? evs.map(function (e) {
      var d = E.distOf(e), g = E.parseClock(e.goal);
      var past = e.date < App.today;
      return '<section class="card"><div class="spread"><div><span class="pill ' + (e.priority === 'A' ? 'teal' : '') + '">' + (e.priority || 'A') + '-race</span><h2 style="margin-top:6px">' + esc(e.name || d.label) + '</h2><p class="small muted">' + E.fmtDate(e.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + ' · ' + esc(d.label) + (past ? ' · done' : ' · in ' + plural(E.diffD(App.today, e.date), 'day')) + '</p></div><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'event', id: e.id }) + '">Edit</button></div>' +
        (g > 0 ? '<div class="grid3" style="margin-top:8px"><div class="metric"><span>Goal</span><b class="mono" style="font-size:1rem">' + E.clock(g) + '</b></div><div class="metric"><span>Pace</span><b class="mono" style="font-size:1rem">' + pace(g / d.mi) + '/mi</b></div><div class="metric"><span>Predicted now</span><b class="mono" style="font-size:1rem">' + (App.an ? E.clock(E.predict(App.an.vNow, d.mi)) : '–') + '</b></div></div>' : '') + '</section>';
    }).join('') : '<p class="empty">No races yet.</p>');
};

/* ---- plan settings ---- */
VIEWS.settings = function () {
  var p = Object.assign(E.defaultProfile(), Store.state.profile || {});
  var dayChips = function (name, arr) { return '<div class="chips">' + E.DOW.map(function (d, i) { return '<button type="button" class="chip" data-toggle="' + name + '" data-i="' + i + '" aria-pressed="' + !!arr[i] + '">' + d + '</button>'; }).join('') + '</div>'; };
  return '<div class="pagehead"><h1>Plan settings</h1><p>Change anything and your plan rebuilds. Logged runs and lifts are never lost.</p></div>' +
    '<form class="stack" data-form="settings">' +
    '<section class="card stack"><h3>Schedule</h3>' +
    '<label class="f">Days you can run' + dayChips('avail', p.avail) + '</label>' +
    '<div class="grid2"><label class="f">Max runs per week<select class="i" name="runDays">' + [3, 4, 5, 6, 7].map(function (n) { return '<option' + (+p.runDays === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
    '<label class="f">Long run day<select class="i" name="longDay">' + E.DOW_LONG.map(function (d, i) { return '<option value="' + i + '"' + (+p.longDay === i ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label></div>' +
    '<div class="grid2"><label class="f">Lifting days per week<select class="i" name="liftDays">' + [0, 1, 2, 3, 4].map(function (n) { return '<option' + (+p.liftDays === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>' +
    '<label class="f">Extra gym days (lift + treadmill run)<select class="i" name="crossDays">' + [0, 1, 2, 3].map(function (n) { return '<option' + (+p.crossDays === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label></div>' +
    '<label class="check"><input type="checkbox" name="doubles"' + (p.doubles !== false ? ' checked' : '') + '> Lift on run days (run first). Turn off to keep lifting on separate days; runs per week drop to fit.</label></section>' +
    '<section class="card stack"><h3>Fitness</h3><div class="grid2">' +
    '<label class="f">Plan start<input class="i" type="date" name="startDate" value="' + esc(p.startDate) + '"></label<p class="tiny muted">Start on a Friday, Saturday or Sunday and those days join week 1, so your weeks still begin on your usual day.</p>' +
    '<label class="f">Weekly miles at start<input class="i" type="number" min="0" max="120" name="mpw" value="' + esc(p.mpw) + '"></label>' +
    '<label class="f">Longest recent run (mi)<input class="i" type="number" min="0" max="30" name="longest" value="' + esc(p.longest) + '"></label>' +
    '<label class="f">Typical easy pace (m:ss)<input class="i" name="easyPace" placeholder="10:00" value="' + esc(p.easyPace || '') + '"></label>' +
    '<label class="f">Body weight (lb)<input class="i" type="number" min="60" max="400" name="weightLb" value="' + (p.weightKg ? Math.round(p.weightKg * 2.2046) : '') + '"></label>' +
    '<label class="f">Mileage level<select class="i" name="volume">' + [[0.8, 'Lighter (−20%)'], [0.9, 'Slightly lighter'], [1, 'Standard'], [1.1, 'Slightly more'], [1.2, 'More (+20%)']].map(function (o) { return '<option value="' + o[0] + '"' + (Math.abs((+p.volume || 1) - o[0]) < 0.05 ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label></div>' +
    '<label class="check"><input type="checkbox" name="injuryProne"' + (p.injuryProne ? ' checked' : '') + '> I\'m prone to shin splints or other running injuries</label>' +
    '<label class="check"><input type="checkbox" name="runWalk"' + (p.runWalk ? ' checked' : '') + '> Suggest run-walk on long runs</label></section>' +
    '<section class="card stack"><h3>Training style</h3><p class="small">' + esc((E.METHODS[p.method] || E.METHODS.balanced).name) + ' — <a href="#/style">compare styles</a></p></section>' +
    '<section class="card stack"><h3>App</h3><label class="f">Theme<select class="i" name="theme"><option value="dark"' + (LS.get('rp-theme') !== 'light' ? ' selected' : '') + '>Dark</option><option value="light"' + (LS.get('rp-theme') === 'light' ? ' selected' : '') + '>Light</option></select></label></section>' +
    '<div class="btns"><button class="btn primary" type="submit">Save & rebuild plan</button><a class="btn ghost" href="#/today">Cancel</a></div><p class="err" id="setErr"></p></form>';
};
function readSettings(form) {
  var f = function (n) { return form.elements[n]; };
  var p = Object.assign(E.defaultProfile(), Store.state.profile || {});
  p.avail = [0, 1, 2, 3, 4, 5, 6].map(function (i) { var b = $('[data-toggle="avail"][data-i="' + i + '"]', form); return b ? b.getAttribute('aria-pressed') === 'true' : true; });
  p.runDays = +f('runDays').value; p.longDay = +f('longDay').value; p.liftDays = +f('liftDays').value; p.crossDays = +f('crossDays').value;
  p.doubles = f('doubles').checked;
  if (f('startDate').value) p.startDate = E.dow(f('startDate').value) >= 4 ? f('startDate').value : E.monday(f('startDate').value);
  p.mpw = +f('mpw').value || 0; p.longest = +f('longest').value || 0; p.easyPace = f('easyPace').value.trim();
  p.weightKg = +f('weightLb').value ? Math.round(+f('weightLb').value / 2.2046 * 10) / 10 : null;
  p.volume = +f('volume').value || 1; p.injuryProne = f('injuryProne').checked; p.runWalk = f('runWalk').checked;
  if (!p.avail[p.longDay]) p.avail[p.longDay] = true;
  return p;
}

/* ---- training style ---- */
VIEWS.style = function () {
  var prof = Store.state.profile || E.defaultProfile();
  var sug = E.suggestMethods(prof, Store.state.events);
  var sugKeys = sug.map(function (s) { return s.key; });
  return '<div class="pagehead"><h1>Training style</h1><p>Pick the approach that fits your life. Each is our own version of a well-known training philosophy — not the published plans themselves. Switching rebuilds future weeks; logs stay.</p></div>' +
    (sug.length ? '<div class="banner info"><b>Suggested for you:</b> ' + sug.map(function (s) { return esc(E.METHODS[s.key].name) + ' — ' + esc(s.why); }).join(' ') + '</div>' : '') +
    '<div class="stack">' + Object.keys(E.METHODS).map(function (k) {
      var m = E.METHODS[k];
      return '<button class="method" data-act="method" data-arg="' + jattr({ key: k }) + '" aria-pressed="' + (prof.method === k) + '"><div class="spread"><span class="k">' + esc(m.name) + '</span>' + (prof.method === k ? '<span class="pill teal">Current</span>' : sugKeys.indexOf(k) >= 0 ? '<span class="pill good">Suggested</span>' : '') + '</div>' +
        '<span class="tiny muted">Inspired by ' + esc(m.inspired) + '</span><span class="small">' + esc(m.desc) + '</span><span class="small muted"><b>Best for:</b> ' + esc(m.suits) + '</span>' +
        '<span class="tiny mono muted">' + m.runs[0] + '–' + m.runs[1] + ' runs/wk · ' + (m.quality > 1 ? '2 key workouts' : '1 key workout') + ' · long run up to ' + m.longCapFull + ' mi (marathon)' + (m.cross ? ' · ' + m.cross + ' cross-train' : '') + '</span></button>';
    }).join('') + '</div>';
};

/* ---- sync ---- */
VIEWS.sync = function () {
  var c = Store.conn || { owner: 'abohn94', repo: 'run-plan-data', token: '', branch: '' };
  var g = Store.garmin;
  var connected = Store.mode === 'github';
  var html = '<div class="pagehead"><h1>Garmin & sync</h1><p>Your data lives in your own private GitHub repository. A GitHub job pulls your Garmin data every hour with Garmin\'s official Personal API, and this app reads it with an access token that never leaves this device.</p></div>';
  html += '<section class="card stack"><div class="spread"><h3>Status</h3><span class="pill ' + (connected ? 'good' : '') + '">' + (connected ? 'Connected' : 'This device only') + '</span></div>' +
    (connected ? '<div class="small">Repository: <span class="mono">' + esc(c.owner + '/' + c.repo) + '</span></div>' : '') +
    '<div class="small">Garmin data: ' + (g ? 'updated ' + (g.updated ? new Date(g.updated).toLocaleString() : '–') + ' · ' + (g.activities || []).length + ' activities · status ' + esc(g.status || '–') : 'none yet') + '</div>' +
    (g && g.errors && g.errors.length ? '<div class="banner warn small">' + g.errors.map(esc).join('<br>') + '</div>' : '') +
    '<div class="small" id="lastRun"></div>' + (Store.error ? '<div class="err">' + esc(Store.error) + '</div>' : '') +
    (connected ? '<div class="btns"><button class="btn primary sm" data-act="syncnow">Sync Garmin now</button><button class="btn sm" data-act="pull">Refresh</button><button class="btn sm ghost" data-act="disconnect">Disconnect this device</button></div>' : '') + '</section>';
  html += '<section class="card stack"><h3>' + (connected ? 'Connection' : 'Connect your private repository') + '</h3><form class="stack" data-form="connect"><div class="grid2"><label class="f">GitHub owner<input class="i" name="owner" value="' + esc(c.owner) + '" autocomplete="off"></label><label class="f">Private repository<input class="i" name="repo" value="' + esc(c.repo) + '" autocomplete="off"></label></div>' +
    '<label class="f">Fine-grained access token<input class="i" name="token" type="password" placeholder="github_pat_…" value="" autocomplete="off"></label><p class="tiny muted">Stored only in this browser. Use a token limited to the one data repository, with Contents and Actions set to read and write.</p>' +
    '<div class="btns"><button class="btn primary" type="submit">' + (connected ? 'Update connection' : 'Connect') + '</button></div><p class="err" id="connErr"></p></form></section>';
  html += '<details class="acc"><summary><b>Setup guide (about 10 minutes, once)</b></summary><div class="body"><ol class="num small">' +
    '<li><b>Garmin key.</b> In Garmin Connect on the web: profile picture → Settings → Personal API (or connect.garmin.com/app/settings/personalApiToken). Create a key, choose 1 year, and copy it.</li>' +
    '<li><b>Add it to GitHub.</b> In your private <span class="mono">run-plan-data</span> repository: Settings → Secrets and variables → Actions → New repository secret. Name: <span class="mono">GARMIN_PERSONAL_API_KEY</span>. Paste the key.</li>' +
    '<li><b>Start the first sync.</b> Actions tab → Garmin sync → Run workflow. The first run pulls about 6 months of history.</li>' +
    '<li><b>Create an app token.</b> GitHub → Settings → Developer settings → Fine-grained tokens → Generate. Repository access: only <span class="mono">run-plan-data</span>. Permissions: Contents (read and write) and Actions (read and write). Expiration: up to a year.</li>' +
    '<li><b>Connect.</b> Paste the token above on your phone (and computer, if you like). Add this page to your home screen for an app-like icon.</li>' +
    '<li><b>Renewals.</b> Garmin emails you before the key expires; GitHub emails you if a sync fails or the token is about to expire. Replace them in the same places.</li></ol></div></details>';
  if (!connected) html += '<section class="card stack"><h3>No GitHub? Load a Garmin file</h3><p class="small muted">If you run the sync script yourself, you can load its <span class="mono">data.json</span> here.</p><input type="file" accept="application/json,.json" data-file="garmin"></section>';
  App.after = function () { if (connected) Store.lastRun().then(function (r) { var el = $('#lastRun'); if (el && r) el.innerHTML = 'Last sync job: ' + esc(r.conclusion || r.status) + ' · ' + new Date(r.at).toLocaleString() + ' · <a href="' + esc(r.url) + '" target="_blank" rel="noopener">view</a>'; }); };
  return html;
};

/* ---- data ---- */
VIEWS.data = function () {
  return '<div class="pagehead"><h1>Your data</h1><p>Back up, export or import. Everything stays yours.</p></div>' +
    '<section class="card stack"><h3>Export</h3><div class="btns"><button class="btn sm" data-act="export" data-arg="' + jattr({ kind: 'runs' }) + '">Runs (CSV)</button><button class="btn sm" data-act="export" data-arg="' + jattr({ kind: 'lifts' }) + '">Lifts (CSV)</button><button class="btn sm" data-act="export" data-arg="' + jattr({ kind: 'json' }) + '">Full backup (JSON)</button></div></section>' +
    '<section class="card stack"><h3>Import</h3><p class="small muted">Restore a JSON backup, or bring in the run and lift CSV exports from your previous "Half to Full 2027" plan.</p><label class="f">Backup (.json)<input type="file" accept=".json,application/json" data-file="backup"></label><label class="f">Previous plan runs or lifts (.csv)<input type="file" accept=".csv,text/csv" data-file="csv"></label><p class="small" id="impMsg"></p></section>' +
    '<section class="card stack"><h3>Start over</h3><p class="small muted">Clears your plan setup on this device and in your repository. Logs stay unless you also clear them.</p><div class="btns"><button class="btn sm danger" data-act="reset-plan">Re-run setup</button></div></section>';
};
VIEWS.about = function () {
  return '<div class="pagehead"><h1>About & terms</h1></div><section class="card stack small"><p><b>Personal Run</b> is a personal training app built by a runner for his own training. It is free and has no ads, accounts or tracking.</p><p><b>Not medical advice.</b> Training, recovery and nutrition suggestions are general guidance. Stop and see a clinician for pain that persists, chest pain, dizziness, or anything that worries you.</p><p><b>Your data.</b> Your plan, logs and Garmin data are stored in your own private GitHub repository (or only on this device). Your GitHub token and Garmin key are never shared with anyone else.</p><p><b>Training styles</b> are original plans inspired by well-known coaching approaches. They are not affiliated with or endorsed by those coaches, and do not reproduce their published plans.</p><p><b>Garmin.</b> Garmin and Garmin Connect are trademarks of Garmin Ltd. This app uses Garmin\'s Personal API with your own key and is not affiliated with Garmin.</p></section>';
};

/* ---- onboarding: one question per screen ---- */
var WIZ_STEPS = ['welcome', 'experience', 'goal', 'races', 'current', 'days', 'gym', 'match', 'review'];
function wizInit() {
  var hs = E.historyStats(Store.garmin, App.today);
  var p = Object.assign(E.defaultProfile(), Store.state.profile || {});
  if (!Store.state.profile) { p.level = null; p.goalType = null; p.method = null; p.startDate = E.monday(App.today); if (hs && hs.runs >= 3) { p.mpw = Math.round(hs.mpw); p.longest = Math.round(hs.longest); if (hs.easyPace) p.easyPace = E.fmtPace(hs.easyPace); p.fromGarmin = true; } }
  return { step: Store.state.profile ? 1 : 0, profile: p, events: (Store.state.events || []).slice(), hs: hs };
}
function optCard(key, val, title, sub, cur) { return '<button class="opt" data-act="wiz-set" data-arg="' + jattr({ k: key, v: val }) + '" aria-pressed="' + (cur === val) + '"><span class="k">' + title + '</span><span class="s">' + sub + '</span></button>'; }
function wizFoot(nextLabel, canNext, form) {
  return '<div class="wizfoot"><button type="button" class="btn ghost" data-act="wiz-back">Back</button>' + (form ? '<button class="btn primary" type="submit">' + (nextLabel || 'Continue') + '</button>' : '<button class="btn primary" data-act="wiz-next"' + (canNext === false ? ' disabled' : '') + '>' + (nextLabel || 'Continue') + '</button>') + '</div>';
}
VIEWS.setup = function () {
  if (!App.wiz) App.wiz = wizInit();
  var z = App.wiz, p = z.profile, s = z.step, name = WIZ_STEPS[s];
  /* Garmin data may arrive after the first screen: use it until the "where are you now" step is answered. */
  if (!Store.state.profile && !z.currentDone && (!z.hs || z.hs.runs < 3) && Store.garmin) {
    var hs2 = E.historyStats(Store.garmin, App.today);
    if (hs2 && hs2.runs >= 3) { z.hs = hs2; p.mpw = Math.round(hs2.mpw); p.longest = Math.round(hs2.longest); if (hs2.easyPace) p.easyPace = E.fmtPace(hs2.easyPace); p.fromGarmin = true; }
  }
  var bar = '<div class="wizard-steps" aria-label="Step ' + s + ' of ' + (WIZ_STEPS.length - 1) + '">' + WIZ_STEPS.slice(1).map(function (x, i) { return '<i class="' + (i < s ? 'on' : '') + '"></i>'; }).join('') + '</div>';
  var html = s > 0 ? bar : '';
  if (name === 'welcome') {
    return '<div class="q" style="padding-top:8vh"><div class="eyebrow">Personal Run</div><h1 style="font-size:2.6rem;margin-top:6px">Train smarter.<br>Recover better.</h1><p class="lead">A running and strength plan built around your races, your week and your gym days. It adapts every day to your Garmin sleep, HRV, resting heart rate and Body Battery.</p></div>' +
      '<div class="card small" style="margin-top:8px"><b>' + (z.hs && z.hs.runs >= 3 ? 'Garmin connected: ' + z.hs.runs + ' runs found' : 'Garmin not connected yet') + '</b><p class="muted" style="margin-top:4px">' + (z.hs && z.hs.runs >= 3 ? 'Your history will fill in your current mileage, longest run and pace in the next steps.' : 'Connecting Garmin first lets the app fill in your mileage and pace from your history. You can also skip it and connect any time: your plan then starts adapting to your sleep and recovery.') + '</p><p class="muted" style="margin-top:4px">This app builds and manages its own plan. It does not import the plan inside Garmin Connect, so use one or the other for day-to-day training.</p></div>' +
      '<div class="stack" style="margin-top:8px"><button class="btn primary block" data-act="wiz-next">Build my plan</button>' + (z.hs && z.hs.runs >= 3 ? '' : '<a class="btn ghost block" href="#/sync">Connect Garmin first</a>') + '</div>' +
      '<div class="card small" style="margin-top:10px"><b>Before you start</b><ul class="plain muted" style="margin-top:6px"><li><b>Not medical advice.</b> This is general training guidance. See a clinician for pain that persists, chest pain or dizziness.</li><li><b>Your data stays yours.</b> It lives in your own private GitHub repository, or only on this device.</li></ul><p class="muted" style="margin-top:6px">By continuing you accept the <a href="#/about">terms</a>.</p></div>';
  }
  if (name === 'experience') {
    html += '<div class="q"><h1>How would you describe your running?</h1><p class="lead">This sets how gently the plan starts and how fast it builds.</p></div><div class="stack">' +
      optCard('level', 'new', 'New or returning', 'Running for less than a year, or coming back after a long break', p.level) +
      optCard('level', 'some', 'Regular runner', 'Running most weeks, with a few races done', p.level) +
      optCard('level', 'exp', 'Experienced', 'Years of consistent training and structured workouts', p.level) + '</div>' + wizFoot('Continue', !!p.level);
  } else if (name === 'goal') {
    html += '<div class="q"><h1>What are you training for?</h1><p class="lead">You can add specific races next.</p></div><div class="stack">' +
      optCard('goalType', 'time', 'Hit a goal time', 'Race faster: a PR or a target finish time', p.goalType) +
      optCard('goalType', 'finish', 'Finish a race', 'Get to the finish line strong and healthy', p.goalType) +
      optCard('goalType', 'fitness', 'Build fitness', 'No race yet: a stronger aerobic base and routine', p.goalType) + '</div>' + wizFoot('Continue', !!p.goalType);
  } else if (name === 'races') {
    html += '<div class="q"><h1>Your races</h1><p class="lead">Add as many as you like. A-races get a full build and taper. B and C races become tune-ups along the way. You can change these any time.</p></div>' +
      '<div class="stack">' + (z.events.length ? z.events.map(function (e) { var d = E.distOf(e); return '<button class="opt" data-act="sheet" data-arg="' + jattr({ sheet: 'event', wiz: true, id: e.id }) + '"><span class="spread"><span class="k">' + esc(e.name || d.label) + '</span><span class="pill' + (e.priority === 'A' ? ' solid' : '') + '">' + e.priority + '</span></span><span class="s">' + E.fmtDate(e.date, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + ' · ' + esc(d.label) + (e.goal ? ' · goal ' + esc(e.goal) : '') + '</span></button>'; }).join('') : '<div class="card small muted">No races yet. Without one, you get a 16-week base-building plan.</div>') +
      '<button class="btn block" data-act="sheet" data-arg="' + jattr({ sheet: 'event', wiz: true }) + '">+ Add a race</button></div>' + wizFoot(z.events.length ? 'Continue' : 'Skip for now');
  } else if (name === 'current') {
    var hs = z.hs;
    html += '<form class="stack" data-form="wiz"><div class="q"><h1>Where are you now?</h1><p class="lead">An honest starting point keeps the build safe.</p></div>' +
      (hs && hs.runs >= 3 ? '<div class="banner info small"><b>From your Garmin:</b> ' + hs.runs + ' runs since ' + E.fmtDate(hs.since, { month: 'short', year: 'numeric' }) + '. Last 4 weeks: about ' + hs.mpw + ' mi a week over ' + hs.runsPerWeek + ' runs, longest ' + hs.longest + ' mi' + (hs.easyPace ? ', typical pace ' + E.fmtPace(hs.easyPace) + '/mi' : '') + '. We filled these in for you.</div>' : '') +
      '<div class="card stack"><div class="grid2"><label class="f">Miles per week now<input class="i" type="number" name="mpw" min="0" max="150" inputmode="decimal" value="' + esc(p.mpw) + '"></label><label class="f">Longest recent run (mi)<input class="i" type="number" name="longest" min="0" max="40" inputmode="decimal" value="' + esc(p.longest) + '"></label>' +
      '<label class="f">Typical easy pace (m:ss)<input class="i" name="easyPace" placeholder="10:00" value="' + esc(p.easyPace || '') + '"></label><label class="f">Body weight (lb, optional)<input class="i" type="number" name="weightLb" inputmode="decimal" value="' + (p.weightKg ? Math.round(p.weightKg * 2.2046) : '') + '"></label></div>' +
      '<label class="f">A recent race or time trial (optional, sets your paces)<div class="grid2"><select class="i" name="rdist"><option value="">None</option>' + ['5k', '10k', 'half', 'full'].map(function (k) { return '<option value="' + k + '"' + (p.recent && p.recent.dist === k ? ' selected' : '') + '>' + E.DIST[k].label + '</option>'; }).join('') + '</select><input class="i" name="rtime" placeholder="h:mm:ss" value="' + esc(p.recent && p.recent.time || '') + '"></div></label>' +
      '<label class="check"><input type="checkbox" name="injuryProne"' + (p.injuryProne ? ' checked' : '') + '> I get shin splints or other running injuries</label>' +
      '<label class="check"><input type="checkbox" name="hrTrainer"' + (p.hrTrainer ? ' checked' : '') + '> I like to train by heart rate</label></div><p class="err" id="wizErr"></p>' + wizFoot('Continue', true, true) + '</form>';
  } else if (name === 'days') {
    html += '<form class="stack" data-form="wiz"><div class="q"><h1>Which days can you run?</h1><p class="lead">The plan only schedules runs on these days.</p></div><div class="card stack"><div class="chips">' + E.DOW.map(function (d, i) { return '<button type="button" class="chip" data-toggle="avail" data-i="' + i + '" aria-pressed="' + !!p.avail[i] + '">' + d + '</button>'; }).join('') + '</div>' +
      '<div class="grid2"><label class="f">Most runs per week<select class="i" name="runDays">' + [3, 4, 5, 6, 7].map(function (n) { return '<option' + (+p.runDays === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label><label class="f">Long run day<select class="i" name="longDay">' + E.DOW_LONG.map(function (d, i) { return '<option value="' + i + '"' + (+p.longDay === i ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="f">Plan starts<input class="i" type="date" name="startDate" value="' + esc(p.startDate) + '"></label></div><p class="err" id="wizErr"></p>' + wizFoot('Continue', true, true) + '</form>';
  } else if (name === 'gym') {
    html += '<form class="stack" data-form="wiz"><div class="q"><h1>How about the gym?</h1><p class="lead">Lifting makes you a more durable, more efficient runner. Your run schedule is arranged around your gym days.</p></div><div class="card stack">' +
      '<label class="f">Lifting days per week<div class="chips">' + [0, 1, 2, 3, 4].map(function (n) { return '<button type="button" class="chip" data-pick="liftDays" data-v="' + n + '" aria-pressed="' + (+p.liftDays === n) + '">' + n + '</button>'; }).join('') + '</div></label>' +
      '<label class="f">Extra gym days: a lift plus a short treadmill run<div class="chips">' + [0, 1, 2, 3].map(function (n) { return '<button type="button" class="chip" data-pick="crossDays" data-v="' + n + '" aria-pressed="' + (+p.crossDays === n) + '">' + n + '</button>'; }).join('') + '</div></label>' +
      '<label class="check"><input type="checkbox" name="doubles"' + (p.doubles !== false ? ' checked' : '') + '> I can lift on run days (run first, then lift)</label></div>' +
      '<p class="small muted">Sessions are 45 minutes: heavy compound lifts, plyometrics, and built-in shin and calf work.</p>' + wizFoot('See my plan', true, true) + '</form>';
  } else if (name === 'match') {
    var sug = E.suggestMethods(p, z.events), best = sug[0];
    if (!p.method) p.method = best.key;
    var m = E.METHODS[p.method];
    html += '<div class="q"><h1>Your recommended plan</h1><p class="lead">Matched to your experience, goal, schedule and gym days.</p></div>' +
      '<div class="match"><span class="pill solid" style="justify-self:start">' + (p.method === best.key ? 'Best match' : 'Your pick') + '</span><h2>' + esc(m.name) + '</h2><p>' + esc(m.desc) + '</p><p class="small"><b>Why:</b> ' + esc((sug.filter(function (x) { return x.key === p.method; })[0] || best).why) + '</p><p class="tiny muted">Inspired by ' + esc(m.inspired) + '. Our own plan, not the published one.</p></div>' +
      '<div class="sechead"><h2>Other styles</h2></div><div class="stack">' + sug.filter(function (x) { return x.key !== p.method; }).map(function (x) { var mm = E.METHODS[x.key]; return '<button class="opt" data-act="wiz-set" data-arg="' + jattr({ k: 'method', v: x.key, stay: true }) + '"><span class="spread"><span class="k">' + esc(mm.name) + '</span>' + (x.key === best.key ? '<span class="pill good">Best match</span>' : '') + '</span><span class="s">' + esc(mm.suits) + '</span></button>'; }).join('') + '</div>' + wizFoot('Use this plan');
  } else if (name === 'review') {
    var prev = E.generate({ profile: p, events: z.events });
    var peak = Math.max.apply(null, prev.weeks.map(function (w) { return w.tot.mi; }));
    var w1 = prev.weeks[0], zz = w1.zones;
    html += '<div class="q"><h1>Here is your plan</h1><p class="lead">' + esc(prev.method.name) + ', ' + prev.weeks.length + ' weeks, starting ' + E.fmtDate(prev.start, { weekday: 'long', month: 'short', day: 'numeric' }) + '.</p></div>' +
      '<div class="tiles"><div class="tile"><span>Weeks</span><b>' + prev.weeks.length + '</b></div><div class="tile"><span>First week</span><b>' + mi(w1.tot.mi) + ' mi</b></div><div class="tile"><span>Peak week</span><b>' + mi(peak) + ' mi</b></div><div class="tile"><span>Easy pace</span><b style="font-size:1.2rem">' + pace(zz.E[0]) + '–' + pace(zz.E[1]) + '</b></div><div class="tile"><span>Threshold</span><b style="font-size:1.2rem">' + pace(zz.T[0]) + '–' + pace(zz.T[1]) + '</b></div><div class="tile"><span>Gym days</span><b>' + w1.tot.lifts + '</b></div></div>' +
      '<div class="sechead"><h2>Week 1</h2></div><div class="stack">' + w1.days.map(function (d) { return '<div class="dayblock"><div class="d">' + d.dow + '<b>' + E.pd(d.date).getDate() + '</b></div><div class="items">' + d.parts.map(function (x) { return x.type === 'rest' ? '<div class="restrow">' + esc(x.title) + '</div>' : '<div class="sess t-' + x.type + '"><span class="tico">' + (TICON[x.type] || TICON.easy) + '</span><div class="sh"><span class="lab">' + TYPE_LABEL[x.type] + '</span><span class="ti">' + esc(x.title) + '</span></div><div class="big">' + (E.isRun(x) ? '<b>' + mi(x.mi) + '</b><small>mi</small>' : '<b>' + x.min + '</b><small>min</small>') + '</div></div>'; }).join('') + '</div></div>'; }).join('') + '</div>' +
      '<div class="wizfoot"><button class="btn ghost" data-act="wiz-back">Back</button><button class="btn primary" data-act="wiz-finish">Start training</button></div>';
  }
  return html;
};

/* ---- you ---- */
VIEWS.you = function () {
  var p = Store.state.profile, pl = App.plan;
  var evs = (Store.state.events || []).filter(function (e) { return e.date >= App.today; });
  function item(h, label, v) { return '<a href="' + h + '">' + label + '<span class="v">' + (v || '') + '</span><span class="chev">›</span></a>'; }
  var html = '<div class="pagehead"><h1>You</h1></div>';
  if (p && pl) html += '<div class="tiles"><div class="tile"><span>Plan</span><b style="font-size:1.15rem">' + esc(pl.method.short) + '</b><em>' + pl.weeks.length + ' weeks</em></div><div class="tile"><span>Fitness</span><b>' + (App.an && App.an.vNow ? App.an.vNow.toFixed(1) : '–') + '</b><em>VDOT</em></div><div class="tile"><span>Races</span><b>' + evs.length + '</b><em>upcoming</em></div></div>';
  html += '<div class="sechead"><h2>Your plan</h2></div><div class="menu">' + item('#/goals', 'Goals & races', evs.length ? plural(evs.length, 'race') : 'Add one') + item('#/settings', 'Schedule & gym days', p ? p.runDays + ' runs · ' + (p.liftDays || 0) + ' lifts' : '') + item('#/style', 'Training style', pl ? esc(pl.method.short) : '') + item('#/zones', 'Paces, threshold & VO2max', '') + '</div>';
  html += '<div class="sechead"><h2>Library</h2></div><div class="menu">' + item('#/strength', 'Strength sessions') + item('#/cross', 'Gym days & treadmill') + item('#/shins', 'Shins & prehab') + item('#/warmup', 'Warm-up & cool-down') + item('#/nutrition', 'Nutrition') + '</div>';
  html += '<div class="sechead"><h2>App</h2></div><div class="menu">' + item('#/sync', 'Garmin & sync', Store.mode === 'github' ? 'Connected' : 'Not connected') + item('#/data', 'Export & import') +
    '<button data-act="theme">Appearance<span class="v">' + (LS.get('rp-theme') === 'light' ? 'Light' : 'Dark') + '</span><span class="chev">›</span></button><button data-act="size">Text size<span class="v">' + ['Standard', 'Large', 'Largest'][+(LS.get('rp-size') || 0)] + '</span><span class="chev">›</span></button>' + item('#/about', 'About & terms') + '</div>';
  return html;
};

/* ---- gym days ---- */
VIEWS.cross = function () {
  var prof = Store.state.profile || {};
  return '<div class="pagehead"><h1>Gym days</h1><p>Your cross-training happens in the weight room. A gym day pairs a 45-minute lifting session with a short, easy treadmill run, so you build strength and add a little aerobic volume in one visit.</p></div>' +
    (Store.state.profile ? '<section class="card stack"><h3>Extra gym days per week</h3><p class="small muted">These are on top of your ' + (prof.liftDays || 0) + ' regular lifting days. The plan places them on days without another run.</p><div class="chips">' + [0, 1, 2, 3].map(function (n) { return '<button class="chip" data-act="profile" data-arg="' + jattr({ crossDays: n }) + '" aria-pressed="' + ((prof.crossDays || 0) === n) + '">' + n + '</button>'; }).join('') + '</div></section>' : '') +
    '<section class="card"><h3>How a gym day runs</h3><ol class="num small" style="margin-top:8px"><li><b>Treadmill run, 2–3 miles.</b> Easy, conversational pace at 1% incline. It doubles as your warm-up.</li><li><b>Lift, 45 minutes.</b> The session shown in your plan: Strength A, B, C or Upper Body & Core.</li><li><b>Shin routine, 5 minutes.</b> Tibialis raises and calf work are already built into most sessions.</li></ol></section>' +
    '<section class="card"><h3>Treadmill tips</h3><ul class="plain small" style="margin-top:6px"><li>Set the incline to 1% to match outdoor effort.</li><li>Treadmill pace can feel harder than the same pace outside. Run by effort and heart rate, not the display.</li><li>Use your easy pace range from the workout card. Your watch records it as an indoor run and it syncs like any other.</li><li>If your watch misjudges treadmill distance, calibrate and save after the run.</li><li>On icy days, any outdoor run in the plan can move to the treadmill at the same paces.</li></ul></section>' +
    '<section class="card"><h3>When running is off the table</h3><p class="small" style="margin-top:6px">During a niggle or injury week, runs are replaced with pain-free treadmill walks (flat or a gentle incline) and gym sessions switch to Upper Body & Core. The plan then ramps your running back in gradually.</p></section>';
};

/* ---------------- sheets ---------------- */
var sheetCtx = null;
function openSheet(kind, a) {
  a = a || {};
  sheetCtx = { kind: kind, a: a, rpe: null };
  var h = SHEETS[kind] ? SHEETS[kind](a) : '';
  if (!h) return;
  $('#sheetCard').innerHTML = '<div class="grabber"></div>' + h;
  $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden';
  history.pushState({ sheet: 1 }, '');
  var f = $('#sheetCard input:not([type=checkbox]):not([type=hidden]), #sheetCard select'); if (f && kind !== 'checkin') { try { f.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
}
function closeSheet(fromPop) {
  if ($('#sheet').hidden) return;
  $('#sheet').hidden = true; $('#sheetCard').innerHTML = ''; document.body.style.overflow = ''; sheetCtx = null;
  if (!fromPop && history.state && history.state.sheet) history.back();
}
window.addEventListener('popstate', function () { if (!$('#sheet').hidden) closeSheet(true); });
function rpeRow(val) { return '<div class="rpe" role="group" aria-label="Effort">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<button type="button" data-rpe="' + n + '" aria-pressed="' + (val === n) + '">' + n + '</button>'; }).join('') + '</div>'; }
function sheetBtns(save, del) { return '<div class="btns"><button class="btn primary" data-act="sheet-save">' + (save || 'Save') + '</button><button class="btn ghost" data-act="sheet-close">Cancel</button>' + (del ? '<button class="btn danger" data-act="sheet-del">Delete</button>' : '') + '</div><p class="err" id="shErr"></p>'; }
var SHEETS = {};
SHEETS.run = function (a) {
  var date = a.date, slot = a.slot || 'run', l = logOf(date), r = l[slot] || {};
  var p = !a.extra && dayOf(date) ? dayOf(date).parts.filter(E.isRun)[0] : null;
  sheetCtx.rpe = r.rpe || null;
  var type = r.ptype || (p ? p.type : 'easy');
  var isRace = p && (p.type === 'race' || p.tt);
  return '<h3>' + (r.mi ? 'Edit run' : 'Log run') + '</h3><p class="small muted">' + E.fmtDate(date, { weekday: 'long', month: 'short', day: 'numeric' }) + (p ? ' · planned: ' + esc(p.title) + ', ' + mi(p.mi) + ' mi' : '') + '</p>' +
    '<div class="grid2"><label class="f">Type<select class="i" id="r-type">' + [['recovery', 'Recovery'], ['easy', 'Easy'], ['long', 'Long'], ['speed', 'Key workout'], ['race', 'Race / time trial']].map(function (o) { return '<option value="' + o[0] + '"' + (type === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
    '<label class="f">Distance (mi)<input class="i" id="r-mi" type="number" step="0.01" min="0" inputmode="decimal" value="' + (r.mi != null ? r.mi : p ? p.mi : '') + '"></label>' +
    '<label class="f">Time (h:mm:ss)<input class="i" id="r-time" placeholder="45:00" value="' + (r.sec ? E.clock(r.sec) : '') + '"></label><label class="f">Avg heart rate<input class="i" id="r-hr" type="number" min="60" max="220" value="' + (r.hr || '') + '"></label></div>' +
    '<label class="f">Effort (RPE 1–10)' + rpeRow(r.rpe) + '</label>' +
    '<div class="grid2" id="r-segw"><label class="f">' + (isRace ? 'Race distance (mi)' : 'Hard part: miles') + '<input class="i" id="r-segmi" type="number" step="0.01" value="' + (r.seg ? r.seg.mi : isRace && p ? (p.tt ? 3.11 : E.round1(p.mi)) : '') + '"></label><label class="f">' + (isRace ? 'Race time' : 'Hard part: time') + '<input class="i" id="r-segt" placeholder="m:ss" value="' + (r.seg ? E.clock(r.seg.sec) : '') + '"></label></div>' +
    '<label class="check"><input type="checkbox" id="r-race"' + ((r.seg && r.seg.race) || (isRace && !r.seg) ? ' checked' : '') + '> This was a race or time trial (resets my paces)</label>' +
    '<label class="check"><input type="checkbox" id="r-skip"' + (r.skip ? ' checked' : '') + '> I skipped this run</label>' +
    '<label class="f">Notes<input class="i" id="r-note" value="' + esc(r.note || '') + '"></label>' + sheetBtns('Save', !!(r.mi || r.skip));
};
SHEETS.lift = function (a) {
  var date = a.date, l = logOf(date), r = l.lift || {};
  var part = dayOf(date) ? dayOf(date).parts.filter(function (x) { return x.type === 'strength'; })[0] : null;
  var key = a.key || r.key || (part ? part.key : 'A');
  sheetCtx.rpe = r.rpe || null; sheetCtx.key = key;
  return '<h3>Log lift</h3><p class="small muted">' + E.fmtDate(date, { weekday: 'long', month: 'short', day: 'numeric' }) + '</p><label class="f">Session<select class="i" id="l-key">' + Object.keys(E.LIFT).map(function (k) { return '<option value="' + k + '"' + (k === key ? ' selected' : '') + '>' + (k.length === 1 ? 'Strength ' + k + ': ' : '') + E.LIFT[k].name + '</option>'; }).join('') + '</select></label><div id="l-rows">' + liftRows(key, r.ex || {}) + '</div>' +
    '<div class="grid2"><label class="f">Minutes<input class="i" id="l-min" type="number" value="' + (r.min || 45) + '"></label></div><label class="f">Session effort (RPE)' + rpeRow(r.rpe) + '</label><label class="f">Notes<input class="i" id="l-note" value="' + esc(r.note || '') + '"></label>' + sheetBtns('Save', !!l.lift);
};
var LIFT_SKIP = { 'Lift warm-up': 1 };
function liftRows(key, vals) {
  var m = E.LIFT[key]; if (!m) return '';
  var names = []; m.blocks.forEach(function (b) { b.ex.forEach(function (e) { if (!LIFT_SKIP[e.n] && !e.wu) names.push(e.n); }); });
  return names.map(function (n) {
    var v = vals[n] || lastWeight(n) || {};
    return '<div class="stack tight" style="padding:6px 0;border-top:1px solid var(--line)"><b class="small">' + esc(n) + '</b><div class="grid3"><label class="f">Weight (lb)<input class="i" data-ex="' + esc(n) + '" data-k="w" type="number" min="0" step="2.5" value="' + (v.w != null ? v.w : '') + '"></label><label class="f">Reps<input class="i" data-ex="' + esc(n) + '" data-k="reps" type="number" min="0" value="' + (v.reps != null ? v.reps : '') + '"></label><label class="f">Sets<input class="i" data-ex="' + esc(n) + '" data-k="sets" type="number" min="0" value="' + (v.sets != null ? v.sets : '') + '"></label></div></div>';
  }).join('');
}
function lastWeight(n) {
  var logs = Store.state.logs || {}, ds = Object.keys(logs).sort().reverse();
  for (var i = 0; i < ds.length; i++) { var l = logs[ds[i]].lift; if (l && l.ex && l.ex[n] && l.ex[n].w != null) return { w: l.ex[n].w, reps: l.ex[n].reps, sets: l.ex[n].sets }; }
  return null;
}
SHEETS.cross = function (a) {
  var date = a.date, r = logOf(date).cross || {};
  sheetCtx.rpe = r.rpe || null;
  return '<h3>Log another activity</h3><p class="small muted">' + E.fmtDate(date, { weekday: 'long', month: 'short', day: 'numeric' }) + '</p><div class="grid2"><label class="f">Activity<select class="i" id="c-type">' + ['Treadmill walk', 'Incline walk', 'Hike', 'Stair climber', 'Swim', 'Sport', 'Other'].map(function (o) { return '<option' + (r.type === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></label><label class="f">Minutes<input class="i" id="c-min" type="number" min="0" value="' + (r.min || '') + '"></label><label class="f">Avg heart rate<input class="i" id="c-hr" type="number" value="' + (r.hr || '') + '"></label></div><label class="f">Effort (RPE)' + rpeRow(r.rpe) + '</label>' + sheetBtns('Save', !!logOf(date).cross);
};
SHEETS.checkin = function () {
  var c = E.checkinFor(Store.state, App.today) || {};
  sheetCtx.ci = { feel: c.feel != null ? c.feel : null, sore: c.sore || 0, stress: c.stress || 1, sleep: c.sleep != null ? c.sleep : null, ill: !!c.ill, pain: !!c.pain, where: c.where || '' };
  var ci = sheetCtx.ci;
  function chips(k, opts) { return '<div class="chips">' + opts.map(function (o) { return '<button type="button" class="chip" data-ci="' + k + '" data-v="' + esc(o[0]) + '" aria-pressed="' + (String(ci[k]) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>'; }
  return '<h3>Daily check-in</h3><p class="small muted">Ten seconds. It sharpens today\'s recommendation' + (Store.garmin ? ' alongside your Garmin data.' : '.') + '</p>' +
    '<label class="f">How do you feel?' + chips('feel', [[1, 'Awful'], [2, 'Flat'], [3, 'OK'], [4, 'Good'], [5, 'Great']]) + '</label>' +
    '<label class="f">Legs' + chips('sore', [[0, 'Fresh'], [1, 'A bit tight'], [2, 'Sore']]) + '</label>' +
    '<label class="f">Life stress' + chips('stress', [[1, 'Low'], [2, 'Medium'], [3, 'High']]) + '</label>' +
    (!(Store.garmin && Store.garmin.days && Store.garmin.days[App.today] && Store.garmin.days[App.today].sleepH) ? '<label class="f">Sleep last night' + chips('sleep', [[1, 'Poor'], [2, 'Short'], [3, 'OK'], [4, 'Great']]) + '</label>' : '') +
    '<label class="check"><input type="checkbox" id="ci-pain"' + (ci.pain ? ' checked' : '') + '> Something hurts</label><label class="f" id="ci-wherew"' + (ci.pain ? '' : ' hidden') + '>Where?' + chips('where', [['shin', 'Shin'], ['calf', 'Calf / Achilles'], ['knee', 'Knee'], ['hip', 'Hip / hamstring'], ['foot', 'Foot'], ['other', 'Other']]) + '</label>' +
    '<label class="check"><input type="checkbox" id="ci-ill"' + (ci.ill ? ' checked' : '') + '> I feel sick</label>' +
    '<label class="f">Anything coming up or on your mind?<input class="i" id="ci-note" placeholder="e.g. night shift tomorrow, travel Friday" value="' + esc(c.note || '') + '"></label>' + sheetBtns('Save check-in');
};
var LIFE_KINDS = [['busy', 'Busy day(s)', [['light', 'Lighter week']]], ['travel', 'Travel', []], ['vacation', 'Vacation', [['light', 'Light running'], ['off', 'No running']]], ['sick', 'Sick', [['mild', 'Mild'], ['severe', 'Out completely']]], ['injured', 'Injury / niggle', [['modified', 'Niggle: modified'], ['out', 'Out: no running']]]];
SHEETS.life = function (a) {
  sheetCtx.kind2 = a.kind || 'busy'; sheetCtx.level = a.level || null;
  var list = (Store.state.life || []).filter(function (e) { return e.to >= E.addD(App.today, -14); }).sort(function (x, y) { return x.from < y.from ? -1 : 1; });
  return '<h3>Something came up</h3><p class="small muted">Busy and travel days move your runs to free days. Three or more days of vacation, sickness or injury reshape the week and ease you back in afterwards.</p>' +
    '<div class="chips" id="lifeKinds">' + LIFE_KINDS.map(function (k) { return '<button type="button" class="chip" data-life="' + k[0] + '" aria-pressed="' + (sheetCtx.kind2 === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div><div id="lifeLevels">' + lifeLevels() + '</div>' +
    '<div class="grid2"><label class="f">From<input class="i" type="date" id="lf-from" value="' + esc(a.from || App.today) + '"></label><label class="f">To<input class="i" type="date" id="lf-to" value="' + esc(a.to || App.today) + '"></label></div><label class="f">Note<input class="i" id="lf-note" placeholder="optional"></label>' +
    sheetBtns('Adjust my plan') + (list.length ? '<div><b class="small">Upcoming and recent</b>' + list.map(function (e) { return '<div class="list-item"><div class="n small">' + esc((LIFE_KINDS.filter(function (k) { return k[0] === e.kind; })[0] || [0, e.kind])[1]) + (e.level ? ' · ' + esc(e.level) : '') + '</div><div class="d"><button class="btn sm ghost" data-act="del-life" data-arg="' + jattr({ id: e.id }) + '">Remove</button></div><div class="c">' + E.fmtDate(e.from) + ' – ' + E.fmtDate(e.to) + (e.note ? ' · ' + esc(e.note) : '') + '</div></div>'; }).join('') + '</div>' : '');
};
function lifeLevels() {
  var k = LIFE_KINDS.filter(function (x) { return x[0] === sheetCtx.kind2; })[0];
  if (!k || !k[2].length) { sheetCtx.level = null; return ''; }
  if (!sheetCtx.level || !k[2].some(function (l) { return l[0] === sheetCtx.level; })) sheetCtx.level = sheetCtx.kind2 === 'busy' ? null : k[2][0][0];
  return '<div class="chips" style="margin-top:4px">' + (sheetCtx.kind2 === 'busy' ? '<button type="button" class="chip" data-lvl="" aria-pressed="' + !sheetCtx.level + '">Just these days</button>' : '') + k[2].map(function (l) { return '<button type="button" class="chip" data-lvl="' + l[0] + '" aria-pressed="' + (sheetCtx.level === l[0]) + '">' + l[1] + '</button>'; }).join('') + '</div>';
}
SHEETS.event = function (a) {
  var list = a.wiz ? App.wiz.events : Store.state.events;
  var e = (a.id && list.filter(function (x) { return x.id === a.id; })[0]) || { id: uid(), name: '', date: E.addD(App.today, 120), dist: 'half', goal: '', priority: 'A' };
  sheetCtx.ev = Object.assign({}, e); sheetCtx.isNew = !a.id;
  return '<h3>' + (a.id ? 'Edit race' : 'Add a race') + '</h3><label class="f">Name<input class="i" id="ev-name" value="' + esc(e.name) + '" placeholder="e.g. Twin Cities Marathon"></label><div class="grid2"><label class="f">Date<input class="i" type="date" id="ev-date" value="' + esc(e.date) + '"></label><label class="f">Goal time (optional)<input class="i" id="ev-goal" placeholder="1:45:00" value="' + esc(e.goal || '') + '"></label></div>' +
    '<label class="f">Distance<div class="chips">' + [['5k', '5K'], ['10k', '10K'], ['half', 'Half'], ['full', 'Marathon'], ['custom', 'Other']].map(function (d) { return '<button type="button" class="chip" data-evd="' + d[0] + '" aria-pressed="' + (e.dist === d[0]) + '">' + d[1] + '</button>'; }).join('') + '</div></label><label class="f" id="ev-miw"' + (e.dist === 'custom' ? '' : ' hidden') + '>Distance (mi)<input class="i" id="ev-mi" type="number" step="0.1" value="' + esc(e.mi || '') + '"></label>' +
    '<label class="f">Priority<div class="chips">' + [['A', 'A — goal race'], ['B', 'B — tune-up'], ['C', 'C — for fun']].map(function (d) { return '<button type="button" class="chip" data-evp="' + d[0] + '" aria-pressed="' + (e.priority === d[0]) + '">' + d[1] + '</button>'; }).join('') + '</div></label>' + sheetBtns('Save race', !!a.id);
};
SHEETS.metrics = function () {
  return '<h3>Add a fitness reading</h3><p class="small muted">From your watch (Garmin shows Lactate Threshold and VO2 Max under Performance Stats), a lab, or a 30-minute threshold test. Fill in what you have.</p><label class="f">Date<input class="i" type="date" id="m-date" value="' + App.today + '"></label><div class="grid2"><label class="f">Lactate threshold pace (m:ss /mi)<input class="i" id="m-lt" placeholder="7:45"></label><label class="f">Lactate threshold HR (bpm)<input class="i" id="m-lthr" type="number" placeholder="172"></label><label class="f">VO2max<input class="i" id="m-vo2" type="number" step="0.1" placeholder="48"></label></div><p class="tiny muted">Garmin shows threshold pace per km if your units are metric; convert with ×1.609.</p>' + sheetBtns('Save reading');
};
SHEETS.move = function (a) {
  var w = E.weekOf(App.plan, a.date);
  return '<h3>Move this session</h3><p class="small muted">Pick another day this week. Keep at least a day between hard sessions, and avoid the day before your long run.</p><div class="stack tight">' + w.days.filter(function (d) { return d.date !== a.date; }).map(function (d) {
    return '<button class="btn" style="justify-content:space-between" data-act="do-move" data-arg="' + jattr({ from: a.date, to: d.date }) + '"><span>' + E.fmtDate(d.date, { weekday: 'long' }) + '</span><span class="tiny muted">' + esc(d.parts.map(function (x) { return x.title; }).join(' + ')) + '</span></button>';
  }).join('') + '</div><div class="btns"><button class="btn ghost" data-act="sheet-close">Cancel</button></div>';
};
SHEETS.swap = function (a) {
  return '<h3>Adjust this day</h3><div class="stack tight">' + [['easy', 'Make it an easy run', 'Same day, easy effort, a little shorter'], ['short', 'Shorten it', 'About 30% shorter'], ['cross', 'Treadmill walk instead', 'Brisk incline walk, low impact'], ['rest', 'Rest day', 'Skip today, no make-up']].map(function (o) {
    return '<button class="btn" style="justify-content:space-between;text-align:left" data-act="do-swap" data-arg="' + jattr({ date: a.date, action: o[0] }) + '"><span>' + o[1] + '</span><span class="tiny muted">' + o[2] + '</span></button>';
  }).join('') + '</div><div class="btns"><button class="btn ghost" data-act="sheet-close">Cancel</button></div>';
};
SHEETS.weekstatus = function (a) {
  var w = App.plan.weeks[a.week - 1], cur = (Store.state.status || {})[w.start] || null;
  sheetCtx.week = w;
  return '<h3>Week ' + w.n + ' status</h3><p class="small muted">Mark the whole week. The plan scales it and ramps you back in over the following weeks.</p><div class="stack tight"><button class="btn" data-act="do-status" data-arg="' + jattr({ start: w.start, kind: null }) + '" aria-pressed="' + !cur + '">On plan</button>' +
    ['vacation', 'sick', 'injured'].map(function (k) { return Object.keys(E.STATUS[k].levels).map(function (lv) { return '<button class="btn" style="justify-content:space-between" data-act="do-status" data-arg="' + jattr({ start: w.start, kind: k, level: lv }) + '" aria-pressed="' + !!(cur && cur.kind === k && cur.level === lv) + '"><span>' + E.STATUS[k].label + ' · ' + E.STATUS[k].levels[lv].label + '</span><span class="tiny muted">' + Math.round(E.STATUS[k].levels[lv].m * 100) + '% miles</span></button>'; }).join(''); }).join('') + '</div><div class="btns"><button class="btn ghost" data-act="sheet-close">Close</button></div>';
};

function saveSheet() {
  var k = sheetCtx.kind, a = sheetCtx.a, err = $('#shErr');
  function fail(m) { if (err) err.textContent = m; }
  if (k === 'run') {
    var date = a.date, slot = a.slot || 'run';
    var skip = $('#r-skip').checked;
    var miV = +$('#r-mi').value, sec = E.parseClock($('#r-time').value);
    if (!skip && !(miV > 0)) return fail('Enter the distance.');
    var rec = { ptype: $('#r-type').value, mi: miV || 0, sec: sec > 0 ? Math.round(sec) : 0, rpe: sheetCtx.rpe || null, hr: +$('#r-hr').value || null, note: $('#r-note').value.trim(), skip: skip };
    var old = logOf(date)[slot];
    if (old && old.src === 'garmin') { rec.src = 'garmin'; rec.gid = old.gid; rec.name = old.name; rec.maxhr = old.maxhr; rec.te = old.te; }
    var sm = +$('#r-segmi').value, st2 = E.parseClock($('#r-segt').value), race = $('#r-race').checked;
    if (race && !(sm > 0 && st2 > 0)) { sm = miV; st2 = sec; }
    if (sm > 0 && st2 > 0) rec.seg = { mi: sm, sec: Math.round(st2), race: race };
    Store.edit('logs', date, function (s) { s.logs[date] = s.logs[date] || {}; s.logs[date][slot] = rec; });
    closeSheet(); toast(race ? 'Result saved — your paces updated' : 'Run saved');
    return;
  }
  if (k === 'lift') {
    var d2 = a.date, ex = {};
    $$('[data-ex]').forEach(function (inp) { var n = inp.dataset.ex, kk = inp.dataset.k, v = inp.value; if (v === '') return; ex[n] = ex[n] || {}; ex[n][kk] = +v; });
    var lr = { key: $('#l-key').value, lp: (dayOf(d2) && (dayOf(d2).parts.filter(function (x) { return x.type === 'strength'; })[0] || {}).lp) || 0, ex: ex, rpe: sheetCtx.rpe || null, min: +$('#l-min').value || null, note: $('#l-note').value.trim() };
    Store.edit('logs', d2, function (s) { s.logs[d2] = s.logs[d2] || {}; s.logs[d2].lift = lr; });
    closeSheet(); toast('Lift saved'); return;
  }
  if (k === 'cross') {
    var d3 = a.date, m = +$('#c-min').value;
    if (!(m > 0)) return fail('Enter minutes.');
    Store.edit('logs', d3, function (s) { s.logs[d3] = s.logs[d3] || {}; s.logs[d3].cross = { type: $('#c-type').value, min: m, hr: +$('#c-hr').value || null, rpe: sheetCtx.rpe || null }; });
    closeSheet(); toast('Session saved'); return;
  }
  if (k === 'checkin') {
    var ci = sheetCtx.ci;
    if (ci.feel == null) return fail('Pick how you feel.');
    var c = { id: App.today, date: App.today, t: new Date().toISOString(), feel: +ci.feel, sore: +ci.sore, stress: +ci.stress, sleep: ci.sleep != null ? +ci.sleep : null, ill: $('#ci-ill').checked, pain: $('#ci-pain').checked, where: $('#ci-pain').checked ? ci.where : '', note: $('#ci-note').value.trim() };
    Store.edit('checkins', c.id, function (s) { s.checkins = s.checkins.filter(function (x) { return x.id !== c.id; }); s.checkins.push(c); if (s.checkins.length > 400) s.checkins = s.checkins.slice(-400); });
    closeSheet();
    recompute();
    var acts = (App.rec.actions || []).filter(function (x) { return x.action !== 'keep'; }).map(function (x) { return { label: x.label, act: x.action === 'sick' ? { life: { kind: 'sick', level: 'mild' } } : x.action === 'injured' ? { life: { kind: 'injured', level: 'modified' } } : { override: x.action } }; });
    if (c.note && /\b(travel|trip|shift|busy|work|wedding|vacation)\b/i.test(c.note)) acts.push({ label: 'Plan around it', act: { sheet: 'life' } });
    coachSay(C.afterCheckin(c, App.rd, App.rec), acts);
    toast('Check-in saved');
    return;
  }
  if (k === 'life') {
    var from = $('#lf-from').value, to = $('#lf-to').value;
    if (!from || !to || to < from) return fail('Check the dates.');
    var e = { id: uid(), kind: sheetCtx.kind2, level: sheetCtx.level, from: from, to: to, note: $('#lf-note').value.trim() };
    if (e.kind === 'busy' && !e.level) e.level = null;
    Store.edit('life', e.id, function (s) { s.life.push(e); });
    closeSheet();
    var days = E.diffD(from, to) + 1;
    coachSay('Got it: ' + (LIFE_KINDS.filter(function (x) { return x[0] === e.kind; })[0] || [0, e.kind])[1].toLowerCase() + ', ' + E.fmtDate(from) + (to !== from ? '–' + E.fmtDate(to) : '') + '. ' + (e.kind === 'busy' || e.kind === 'travel' || days < 3 ? 'I moved your runs to free days that week where possible, most important first.' : 'I scaled that week and will ramp you back in gradually afterwards. No making up missed runs.'), [{ label: 'See the week', act: { nav: '#/plan/' + ((E.weekOf(App.plan, from) || {}).n || '') } }]);
    toast('Plan adjusted');
    return;
  }
  if (k === 'event') {
    var ev = sheetCtx.ev;
    ev.name = $('#ev-name').value.trim(); ev.date = $('#ev-date').value; ev.goal = $('#ev-goal').value.trim();
    if (ev.dist === 'custom') ev.mi = +$('#ev-mi').value || null;
    if (!ev.date) return fail('Pick a date.');
    if (ev.goal && !(E.parseClock(ev.goal) > 0)) return fail('Goal time looks off. Use h:mm:ss, like 1:45:00.');
    if (a.wiz) { App.wiz.events = App.wiz.events.filter(function (x) { return x.id !== ev.id; }).concat([ev]).sort(function (x, y) { return x.date < y.date ? -1 : 1; }); closeSheet(); render(); return; }
    Store.edit('events', ev.id, function (s) { s.events = s.events.filter(function (x) { return x.id !== ev.id; }); s.events.push(ev); });
    closeSheet(); toast('Race saved — plan rebuilt'); return;
  }
  if (k === 'metrics') {
    var md = $('#m-date').value, lt = $('#m-lt').value.trim(), lthr = +$('#m-lthr').value || null, vo2 = +$('#m-vo2').value || null;
    if (lt && !(E.parseClock(lt) > 200)) return fail('Threshold pace should look like 7:45.');
    if (!lt && !lthr && !vo2) return fail('Enter at least one value.');
    var mm = { id: uid(), date: md || App.today, ltPace: lt || null, ltHr: lthr, vo2: vo2 };
    Store.edit('metrics', mm.id, function (s) { s.metrics.push(mm); });
    closeSheet(); toast('Saved — paces updated'); return;
  }
}
function deleteSheet() {
  var k = sheetCtx.kind, a = sheetCtx.a;
  if (k === 'run' || k === 'lift' || k === 'cross') {
    var slot = k === 'run' ? (a.slot || 'run') : k;
    var old = logOf(a.date)[slot];
    Store.editMany([['logs', a.date]].concat(old && old.gid ? [['seen', String(old.gid)]] : []), function (s) { if (s.logs[a.date]) delete s.logs[a.date][slot]; if (old && old.gid) s.seen[old.gid] = 1; });
    closeSheet(); toast('Deleted'); return;
  }
  if (k === 'event') {
    var id = sheetCtx.ev.id;
    if (a.wiz) { App.wiz.events = App.wiz.events.filter(function (x) { return x.id !== id; }); closeSheet(); render(); return; }
    Store.edit('events', id, function (s) { s.events = s.events.filter(function (x) { return x.id !== id; }); });
    closeSheet(); toast('Race removed');
  }
}
function setOverride(date, action, reason) {
  Store.edit('overrides', date, function (s) { s.overrides[date] = { action: action, reason: reason || '', lift: action === 'rest' ? 'skip' : (App.rec && App.rec.lift) || null, at: new Date().toISOString() }; });
}

/* ---------------- events ---------------- */
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-act],[data-rpe],[data-ci],[data-life],[data-lvl],[data-evd],[data-evp],[data-toggle],[data-pick]');
  if (!b) { if (e.target.id === 'sheet') closeSheet(); if (e.target.id === 'searchSheet') closeSearch(); return; }
  if (b.dataset.rpe) { if (sheetCtx) { sheetCtx.rpe = sheetCtx.rpe === +b.dataset.rpe ? null : +b.dataset.rpe; $$('[data-rpe]').forEach(function (x) { x.setAttribute('aria-pressed', String(+x.dataset.rpe === sheetCtx.rpe)); }); } return; }
  if (b.dataset.ci) { var k = b.dataset.ci; sheetCtx.ci[k] = b.dataset.v; $$('[data-ci="' + k + '"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); return; }
  if (b.dataset.life) { sheetCtx.kind2 = b.dataset.life; $$('[data-life]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); $('#lifeLevels').innerHTML = lifeLevels(); return; }
  if (b.dataset.lvl !== undefined && !b.dataset.act) { sheetCtx.level = b.dataset.lvl || null; $$('[data-lvl]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); return; }
  if (b.dataset.evd) { sheetCtx.ev.dist = b.dataset.evd; $$('[data-evd]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); $('#ev-miw').hidden = b.dataset.evd !== 'custom'; return; }
  if (b.dataset.evp) { sheetCtx.ev.priority = b.dataset.evp; $$('[data-evp]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); return; }
  if (b.dataset.pick) { App.wiz.profile[b.dataset.pick] = +b.dataset.v; $$('[data-pick="' + b.dataset.pick + '"]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); return; }
  if (b.dataset.toggle) { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); return; }
  var act = b.dataset.act, arg = {};
  try { arg = b.dataset.arg ? JSON.parse(b.dataset.arg) : {}; } catch (x) { arg = {}; }
  ACTIONS[act] && ACTIONS[act](arg, b, e);
});
var ACTIONS = {
  nav: function (a) { if (a.replace) { history.replaceState(null, '', a.to); route(true); } else go(a.to); },
  back: function () { if (history.length > 1) history.back(); else go('#/today'); },
  theme: function () { var t = (LS.get('rp-theme') || 'dark') === 'dark' ? 'light' : 'dark'; LS.set('rp-theme', t); document.documentElement.dataset.theme = t; render(); },
  'more-hist': function () { App.ui.hist = (+App.ui.hist || 20) + 40; render(); },
  'wiz-set': function (a) { var z = App.wiz; z.profile[a.k] = a.v; if (a.k === 'method') z.picked = true; else if (!z.picked && !Store.state.profile) z.profile.method = null; if (a.stay) render(); else { z.step = Math.min(WIZ_STEPS.length - 1, z.step + 1); render(); window.scrollTo(0, 0); } },
  sheet: function (a) { openSheet(a.sheet, a); },
  'sheet-save': function () { saveSheet(); },
  'sheet-close': function () { closeSheet(); },
  'sheet-del': function () { deleteSheet(); },
  search: function () { openSearch(); },
  size: function () { var s = (+(LS.get('rp-size') || 0) + 1) % 3; LS.set('rp-size', s); document.documentElement.dataset.size = s; render(); },
  rate: function (a) { Store.edit('logs', a.date, function (s) { s.logs[a.date][a.slot].rpe = a.rpe; }); toast('Thanks — effort saved'); },
  rec: function (a) {
    if (a.action === 'keep') { toast('Keeping the plan'); return; }
    if (a.action === 'sick') { openSheet('life', { kind: 'sick', level: 'mild' }); return; }
    if (a.action === 'injured') { openSheet('life', { kind: 'injured', level: 'modified' }); return; }
    setOverride(a.date, a.action, App.rd && App.rd.reasons[0] ? App.rd.reasons[0].text : 'recovery');
    toast('Today adjusted');
  },
  'undo-override': function (a) { Store.edit('overrides', a.date, function (s) { delete s.overrides[a.date]; }); },
  'toggle-done': function (a) { Store.edit('logs', a.date, function (s) { s.logs[a.date] = s.logs[a.date] || {}; if (s.logs[a.date].done) delete s.logs[a.date].done; else s.logs[a.date].done = true; }); },
  'do-move': function (a) { Store.edit('moves', a.from, function (s) { s.moves[a.from] = a.to; }); closeSheet(); setTimeout(function () { go('#/day/' + a.to); }, 60); toast('Moved'); },
  'do-swap': function (a) { setOverride(a.date, a.action, 'your choice'); closeSheet(); toast('Day adjusted'); },
  'reset-day': function (a) { Store.editMany([['overrides', a.date]].concat(Object.keys(Store.state.moves || {}).filter(function (k) { return k === a.date || Store.state.moves[k] === a.date; }).map(function (k) { return ['moves', k]; })), function (s) { delete s.overrides[a.date]; Object.keys(s.moves).forEach(function (k) { if (k === a.date || s.moves[k] === a.date) delete s.moves[k]; }); }); toast('Back to plan'); },
  'do-status': function (a) { Store.edit('status', a.start, function (s) { if (a.kind) s.status[a.start] = { kind: a.kind, level: a.level }; else delete s.status[a.start]; }); closeSheet(); toast('Week updated'); },
  'del-life': function (a) { Store.edit('life', a.id, function (s) { s.life = s.life.filter(function (x) { return x.id !== a.id; }); }); closeSheet(); toast('Removed'); },
  'del-metric': function (a) { Store.edit('metrics', a.id, function (s) { s.metrics = s.metrics.filter(function (x) { return x.id !== a.id; }); }); },
  fit: function (a) {
    var w = E.weekOf(App.plan, a.date), d = dayOf(a.date), p = d.parts[a.idx];
    var name = ('W' + w.n + ' ' + d.dow + ' ' + p.title).replace(/[^\w ]/g, '').slice(0, 23).trim();
    download(('W' + (w.n < 10 ? '0' : '') + w.n + '-' + d.dow + '-' + p.title).replace(/[^\w]+/g, '-') + '.fit', E.workoutFile(p, w.zonesAdj, name), 'application/octet-stream');
  },
  'garmin-week': function (a) {
    var w = App.plan.weeks[a.week - 1], files = [];
    w.days.forEach(function (d) { d.parts.forEach(function (p) { if (!E.isRun(p)) return; var name = ('W' + w.n + ' ' + d.dow + ' ' + p.title).replace(/[^\w ]/g, '').slice(0, 23).trim(); files.push({ name: ('W' + (w.n < 10 ? '0' : '') + w.n + '-' + d.dow + '-' + p.title).replace(/[^\w]+/g, '-') + '.fit', data: E.workoutFile(p, w.zonesAdj, name) }); }); });
    var txt = 'Copy the .fit files into the GARMIN/NewFiles folder on your watch over USB (or GARMIN/Workouts if NewFiles does not exist). Eject, unplug, and find them under Run > Training > Workouts.\n';
    files.push({ name: 'README.txt', data: new TextEncoder().encode(txt) });
    download('garmin-week-' + w.n + '.zip', new Blob([E.zipFiles(files)], { type: 'application/zip' }));
  },
  lp: function (a) { App.ui.lp = a.lp; render(); },
  mod: function (a) { App.ui.mod = a.mod; go('#/strength/' + a.mod); },
  warm: function (a) { App.ui.warm = a.w; render(); },
  profile: function (a) { Store.edit('profile', null, function (s) { Object.keys(a).forEach(function (k) { s.profile[k] = a[k]; }); }); toast('Plan rebuilt'); },
  method: function (a) { Store.edit('profile', null, function (s) { s.profile.method = a.key; }); toast(E.METHODS[a.key].name + ' — plan rebuilt'); },
  'coach-act': function (a) { coachAct(a); },
  syncnow: function (a, b) { b.disabled = true; renderSyncChip('busy'); Store.syncNow().then(function () { toast('Sync started — new data in 1–3 minutes'); pollGarmin(0); }, function (e) { toast(e.message); renderSyncChip(); b.disabled = false; }); },
  pull: function () { Store.pull(); },
  disconnect: function () { askUI({ title: 'Disconnect this device?', text: 'Your data stays in GitHub. You can reconnect any time.', ok: 'Disconnect', danger: true }).then(function (ok) { if (ok) { Store.disconnect(); render(); } }); },
  export: function (a) { exportData(a.kind); },
  'reset-plan': function () { askUI({ title: 'Re-run setup?', text: 'Your logs are kept.', ok: 'Re-run setup' }).then(function (ok) { if (ok) { App.wiz = null; Store.edit('profile', null, function (s) { s.profile = null; }); go('#/setup'); } }); },
  'wiz-back': function () { var z = App.wiz; if (z.step <= (Store.state.profile ? 1 : 0)) { if (Store.state.profile) { App.wiz = null; go('#/you'); } return; } z.step--; render(); window.scrollTo(0, 0); },
  'wiz-next': function () { App.wiz.step = Math.min(WIZ_STEPS.length - 1, App.wiz.step + 1); render(); window.scrollTo(0, 0); },
  'wiz-finish': function () {
    var z = App.wiz, p = z.profile;
    delete p.fromGarmin;
    if (!p.level) p.level = 'some'; if (!p.goalType) p.goalType = 'time'; if (!p.method) p.method = 'balanced';
    var fresh = !Store.state.profile;
    Store.editMany([['profile'], ['events']], function (s) { s.profile = p; s.events = z.events; });
    App.wiz = null;
    if (fresh) coachSay('Your plan is ready: ' + E.METHODS[p.method].name + ' with ' + (p.liftDays || 0) + ' lifting days a week. Each morning I check your recovery and suggest adjustments. Tell me any time something comes up.', [{ label: 'See today', act: { nav: '#/today' } }]);
    else toast('Plan rebuilt');
    go('#/today');
  }
};
document.addEventListener('submit', function (e) {
  var f = e.target, kind = f.dataset.form;
  if (!kind) return;
  e.preventDefault();
  if (kind === 'coach') { var v = $('#coachIn').value.trim(); if (v) coachSend(v); return; }
  if (kind === 'settings') {
    var p = readSettings(f);
    Store.edit('profile', null, function (s) { s.profile = p; });
    var th = f.elements.theme.value; LS.set('rp-theme', th); document.documentElement.dataset.theme = th;
    toast('Saved — plan rebuilt'); go('#/plan'); return;
  }
  if (kind === 'connect') {
    var c = { owner: f.elements.owner.value.trim(), repo: f.elements.repo.value.trim(), token: f.elements.token.value.trim() || (Store.conn && Store.conn.token) || '', branch: '' };
    var err = $('#connErr'); err.textContent = '';
    if (!c.owner || !c.repo || !c.token) { err.textContent = 'Fill in all three fields.'; return; }
    renderSyncChip('busy');
    Store.connect(c).then(function () { toast('Connected'); render(); }, function (x) { err.textContent = x.message; renderSyncChip(); });
    return;
  }
  if (kind === 'wiz') {
    var z = App.wiz, p = z.profile, name = WIZ_STEPS[z.step], el = f.elements, werr = $('#wizErr');
    if (name === 'current') {
      z.currentDone = true;
      var ep = el.easyPace.value.trim();
      if (ep && !(E.parseClock(ep) > 240 && E.parseClock(ep) < 1200)) { werr.textContent = 'Easy pace should look like 10:00 (minutes:seconds per mile).'; return; }
      p.mpw = +el.mpw.value || 0; p.longest = +el.longest.value || 0; p.easyPace = ep;
      p.weightKg = +el.weightLb.value ? Math.round(+el.weightLb.value / 2.2046 * 10) / 10 : null;
      p.recent = el.rdist.value && E.parseClock(el.rtime.value) > 0 ? { dist: el.rdist.value, time: el.rtime.value.trim() } : null;
      p.injuryProne = el.injuryProne.checked; p.hrTrainer = el.hrTrainer.checked;
    } else if (name === 'days') {
      p.avail = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return $('[data-toggle="avail"][data-i="' + i + '"]', f).getAttribute('aria-pressed') === 'true'; });
      if (p.avail.filter(Boolean).length < 2) { werr.textContent = 'Pick at least two days.'; return; }
      p.runDays = +el.runDays.value; p.longDay = +el.longDay.value;
      if (el.startDate.value) p.startDate = E.dow(el.startDate.value) >= 4 ? el.startDate.value : E.monday(el.startDate.value);
      if (!p.avail[p.longDay]) p.avail[p.longDay] = true;
    } else if (name === 'gym') {
      p.doubles = el.doubles.checked;
    }
    if (!z.picked && !Store.state.profile) p.method = null;
    z.step++; render(); window.scrollTo(0, 0);
    return;
  }
});
document.addEventListener('change', function (e) {
  var t = e.target;
  if (t.id === 'l-key') { sheetCtx.key = t.value; $('#l-rows').innerHTML = liftRows(t.value, {}); return; }
  if (t.id === 'ci-pain') { $('#ci-wherew').hidden = !t.checked; return; }
  if (t.dataset && t.dataset.file && t.files && t.files[0]) {
    var kind = t.dataset.file, rd = new FileReader();
    rd.onload = function () { importFile(kind, String(rd.result)); };
    rd.readAsText(t.files[0]);
  }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!$('#sheet').hidden) closeSheet(); else if (!$('#searchSheet').hidden) closeSearch(); else closeDrawer(); } });

/* ---------------- drawer, search, chips ---------------- */
function closeDrawer() {}
function renderSyncChip(force) {
  var el = $('#syncChip'); if (!el) return;
  var s = force || ({ ok: 'ok', saving: 'busy', loading: 'busy', error: 'err', offline: 'err', idle: 'ok' }[Store.status] || 'ok');
  var txt = Store.mode !== 'github' ? 'Local' : s === 'busy' ? 'Syncing' : s === 'err' ? (Store.status === 'offline' ? 'Offline' : 'Error') : 'Synced';
  el.dataset.s = Store.mode !== 'github' ? '' : s;
  el.querySelector('span').textContent = txt;
  el.title = Store.error || (Store.garmin && Store.garmin.updated ? 'Garmin data from ' + new Date(Store.garmin.updated).toLocaleString() : '');
}
var SEARCH_INDEX = null;
function buildIndex() {
  var items = [];
  Object.keys(TITLES).forEach(function (k) { if (['day', 'setup', 'activity', 'shoe', 'workout'].indexOf(k) < 0) items.push({ t: TITLES[k], s: 'Page', h: '#/' + k }); });
  C.KB.forEach(function (k) { items.push({ t: k.title, s: 'Coach topic', h: '#/coach', ask: k.title }); });
  Object.keys(E.LIFT).forEach(function (k) { var m = E.LIFT[k]; items.push({ t: (k.length === 1 ? 'Strength ' + k + ': ' : '') + m.name, s: 'Strength session', h: '#/strength/' + k }); m.blocks.forEach(function (b) { b.ex.forEach(function (x) { items.push({ t: x.n, s: 'Exercise · ' + m.name, h: '#/strength/' + k }); }); }); });
  ROUTINE.forEach(function (g) { g[1].forEach(function (r) { items.push({ t: r[0], s: 'Shin routine', h: '#/shins' }); }); });
  if (App.plan) App.plan.weeks.forEach(function (w) { w.days.forEach(function (d) { d.parts.forEach(function (p) { if (p.type !== 'rest') items.push({ t: p.title, s: 'Week ' + w.n + ' · ' + E.fmtDate(d.date, { weekday: 'short', month: 'short', day: 'numeric' }), h: '#/day/' + d.date, date: d.date }); }); }); });
  return items;
}
function openSearch() { SEARCH_INDEX = buildIndex(); $('#searchSheet').hidden = false; var i = $('#searchIn'); i.value = ''; $('#searchRes').innerHTML = ''; setTimeout(function () { i.focus(); }, 30); history.pushState({ search: 1 }, ''); }
function closeSearch(fromPop) { if ($('#searchSheet').hidden) return; $('#searchSheet').hidden = true; if (!fromPop && history.state && history.state.search) history.back(); }
window.addEventListener('popstate', function () { if (!$('#searchSheet').hidden) closeSearch(true); });
function runSearch(q) {
  q = q.trim().toLowerCase();
  if (!q) { $('#searchRes').innerHTML = ''; return; }
  var t = App.today;
  var res = SEARCH_INDEX.filter(function (x) { return x.t.toLowerCase().indexOf(q) >= 0 || x.s.toLowerCase().indexOf(q) >= 0; });
  res.sort(function (a, b) { return (a.date ? (a.date >= t ? 1 : 2) : 0) - (b.date ? (b.date >= t ? 1 : 2) : 0) || (a.date || '').localeCompare(b.date || ''); });
  $('#searchRes').innerHTML = res.slice(0, 30).map(function (x) { return '<a href="' + x.h + '" data-close-search' + (x.ask ? ' data-ask="' + esc(x.ask) + '"' : '') + '>' + esc(x.t) + '<small>' + esc(x.s) + '</small></a>'; }).join('') || '<p class="empty">No matches.</p>';
}
document.addEventListener('input', function (e) { if (e.target.id === 'searchIn') runSearch(e.target.value); });
document.addEventListener('click', function (e) {
  var a = e.target.closest('[data-close-search]');
  if (!a) return;
  e.preventDefault();
  var ask = a.dataset.ask, h = a.getAttribute('href');
  $('#searchSheet').hidden = true;
  history.replaceState(null, '', h);
  route();
  if (ask) coachSend(ask);
});

/* ---------------- import / export ---------------- */
function csvCell(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function exportData(kind) {
  var logs = Store.state.logs || {}, lines;
  if (kind === 'json') { download('run-plan-backup-' + App.today + '.json', JSON.stringify(Store.state, null, 1), 'application/json'); return; }
  if (kind === 'runs') {
    lines = [['date', 'type', 'miles', 'seconds', 'pace_per_mile', 'rpe', 'avg_hr', 'source', 'race_miles', 'race_seconds', 'skipped', 'note'].join(',')];
    Object.keys(logs).sort().forEach(function (d) { ['run', 'xrun'].forEach(function (s) { var r = logs[d][s]; if (!r) return; lines.push([d, r.ptype, r.mi, r.sec, r.mi && r.sec ? pace(r.sec / r.mi) : '', r.rpe, r.hr, r.src || 'manual', r.seg && r.seg.race ? r.seg.mi : '', r.seg && r.seg.race ? r.seg.sec : '', r.skip ? 'yes' : '', r.note].map(csvCell).join(',')); }); });
    download('run-plan-runs.csv', lines.join('\n'), 'text/csv');
  } else {
    lines = [['date', 'session', 'exercise', 'weight_lb', 'sets', 'reps', 'est_1rm', 'rpe'].join(',')];
    Object.keys(logs).sort().forEach(function (d) { var l = logs[d].lift; if (!l || !l.ex) return; Object.keys(l.ex).forEach(function (n) { var e = l.ex[n]; lines.push([d, l.key, n, e.w, e.sets, e.reps, e.w > 0 && e.reps > 0 ? Math.round(e.w * (1 + e.reps / 30)) : '', l.rpe].map(csvCell).join(',')); }); });
    download('run-plan-lifts.csv', lines.join('\n'), 'text/csv');
  }
}
function parseCSV(text) {
  var rows = [], row = [], cur = '', q = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(function (r) { return r.length > 1; });
}
function isoFrom(s) { var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim()); if (m) return m[3] + '-' + (m[1].length < 2 ? '0' : '') + m[1] + '-' + (m[2].length < 2 ? '0' : '') + m[2]; return /^\d{4}-\d{2}-\d{2}$/.test(s.trim()) ? s.trim() : null; }
function importFile(kind, text) {
  var msg = $('#impMsg');
  try {
    if (kind === 'backup') { var s = JSON.parse(text); if (!s || typeof s !== 'object' || !('logs' in s)) throw new Error('Not a Personal Run backup.'); askUI({ title: 'Replace everything with this backup?', text: 'Your current plan, logs and settings are overwritten by the file.', ok: 'Restore backup', danger: true }).then(function (ok) { if (ok) { Store.replaceAll(s); toast('Backup restored'); } }); return; }
    if (kind === 'garmin') { var g = JSON.parse(text); Store.setGarminLocal(g); toast('Garmin data loaded'); return; }
    var rows = parseCSV(text), head = rows.shift().map(function (h) { return h.trim().toLowerCase(); }), col = function (n) { return head.indexOf(n); };
    var n = 0, touches = [], adds = [];
    if (col('miles') >= 0) {
      rows.forEach(function (r) {
        var d = isoFrom(r[col('date')] || ''); if (!d) return;
        var rec = { ptype: r[col('type')] || 'easy', mi: +r[col('miles')] || 0, sec: +r[col('seconds')] || 0, rpe: +r[col('rpe')] || null, hr: +r[col('avg_hr')] || null, skip: (r[col('skipped')] || '') === 'yes', src: 'import' };
        var rm = +(r[col('race_miles')] || 0), rs = +(r[col('race_seconds')] || 0);
        var hm = col('hard_miles') >= 0 ? +(r[col('hard_miles')] || 0) : 0, hp = col('hard_pace_per_mile') >= 0 ? E.parseClock(r[col('hard_pace_per_mile')]) : 0;
        if (rm && rs) rec.seg = { mi: rm, sec: rs, race: true }; else if (hm && hp > 0) rec.seg = { mi: hm, sec: Math.round(hm * hp), race: false };
        adds.push([d, rec]); touches.push(['logs', d]); n++;
      });
      Store.editMany(touches, function (s) { adds.forEach(function (x) { s.logs[x[0]] = s.logs[x[0]] || {}; if (!s.logs[x[0]].run) s.logs[x[0]].run = x[1]; else if (!s.logs[x[0]].xrun) s.logs[x[0]].xrun = x[1]; }); });
    } else if (col('exercise') >= 0) {
      var by = {};
      rows.forEach(function (r) { var d = isoFrom(r[col('date')] || ''); if (!d) return; by[d] = by[d] || { key: r[col('session')] || 'A', lp: 0, ex: {}, rpe: +r[col('rpe')] || null, src: 'import' }; by[d].ex[r[col('exercise')]] = { w: +r[col('weight_lb')] || 0, sets: +r[col('sets')] || 0, reps: +r[col('reps')] || 0 }; n++; });
      Store.editMany(Object.keys(by).map(function (d) { return ['logs', d]; }), function (s) { Object.keys(by).forEach(function (d) { s.logs[d] = s.logs[d] || {}; if (!s.logs[d].lift) s.logs[d].lift = by[d]; }); });
    } else throw new Error('Unrecognized CSV columns.');
    if (msg) { msg.className = 'ok-msg'; msg.textContent = 'Imported ' + n + ' rows.'; }
  } catch (e) { if (msg) { msg.className = 'err'; msg.textContent = e.message; } else toast(e.message); }
}

/*FEATURES*/
/*FEATURES2*/
/*FEATURES3*/
/*FEATURES4*/
/*FEATURES5*/

/* ---------------- Garmin polling ---------------- */
function pollGarmin(n) {
  if (n > 12) { renderSyncChip(); return; }
  setTimeout(function () { Store.refreshGarmin().then(function (changed) { if (changed) { toast('New Garmin data'); renderSyncChip(); } else pollGarmin(n + 1); }); }, 15000);
}

/* ---------------- boot ---------------- */
function onData(why) {
  recompute();
  if (applyGarmin()) recompute();
  if (Store.state.profile && App.plan) weeklyReviewIfDue();
  if (why === 'init' || why === 'pull' || why === 'cache') { if (!$('#sheet').hidden) return; if (App.view === 'setup' && App.wiz && App.wiz.step > 0 && !Store.state.profile) { App.wiz.hs = E.historyStats(Store.garmin, App.today); render(); return; } route(true); return; }
  render();
}
Store.onchange = function (why) { clearTimeout(onData._t); onData._t = setTimeout(function () { onData(why); }, why === 'edit' ? 0 : 10); };
Store.onstatus = function () { renderSyncChip(); };
(function chrome() {
  document.documentElement.dataset.theme = LS.get('rp-theme') || 'dark';
  document.documentElement.dataset.size = LS.get('rp-size') || '0';
  $('#searchBtn').innerHTML = IC.search; $('#backBtn').innerHTML = IC.back;
  $$('.tabbar a').forEach(function (a) { a.insertAdjacentHTML('afterbegin', IC[a.dataset.ic]); });
})();
window.addEventListener('hashchange', function () { route(); });
document.addEventListener('visibilitychange', function () { if (!document.hidden && Store.mode === 'github') { Store.refreshGarmin(); if (App.today !== E.today()) onData('day'); } });
setInterval(function () { if (!document.hidden && Store.mode === 'github') Store.refreshGarmin(); }, 10 * 60 * 1000);
recompute(); applyGarmin(); recompute(); route();
Store.init().then(function () { onData('init'); });
window.__APP = App;
})();
