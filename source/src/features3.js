/* ================= Features 3: training-style catalog by level, flexible goals and multi-race countdowns,
   desktop dashboard (deep dive), glance view for the home screen ================= */

IC.dash = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="10" rx="2"/><rect x="13" y="3" width="8" height="6" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="15" width="8" height="6" rx="2"/></svg>';
IC.shoe = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17v-5l4-1 3-5 3 2 2 4 5 2a2 2 0 0 1 1 2v1z"/><path d="M3 17h18"/></svg>';
IC.heart = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>';
IC.fuel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c3 4 5 6.5 5 10a5 5 0 0 1-10 0c0-3.500 2-6 5-10z"/></svg>';
IC.lift = TICON.strength;
Object.assign(TITLES, { dash: 'Training dashboard' });
TOP.dash = 1;
Object.assign(TABOF, { dash: 'dash', shoes: 'shoes', shoe: 'shoes', fitness: 'fitness', nutrition: 'nutrition', strength: 'strength', workout: 'plan' });

/* ---------- training styles, sorted by level ---------- */
var LEVELS = [[1, 'Beginner', 'New to running, coming back, or under about 10 miles a week'], [2, 'Intermediate', 'Running regularly, roughly 10–30 miles a week, some races done'], [3, 'Advanced', 'Years of consistent training, 30+ miles a week, structured workouts']];
function styleCatalog(prof, events, mode) {
  var sug = E.suggestMethods(prof, events), by = {}; sug.forEach(function (s, i) { by[s.key] = s; s.rank = i; });
  var f = App.ui.mf || 'all', cur = prof.method;
  var lv = prof.level === 'new' ? 1 : (prof.level === 'exp' || prof.level === 'elite') ? 3 : 2;
  var html = '<div class="chips">' + [['all', 'All styles'], ['run', 'Run-focused'], ['mixed', 'Running + lifting']].map(function (x) { return '<button class="chip" data-act="ui" data-arg="' + jattr({ k: 'mf', v: x[0] }) + '" aria-pressed="' + (f === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
  LEVELS.forEach(function (L) {
    var keys = Object.keys(E.METHODS).filter(function (k) { return E.METHODS[k].level === L[0] && (f === 'all' || E.METHODS[k].focus === f); }).sort(function (a, b) { return by[a].rank - by[b].rank; });
    if (!keys.length) return;
    html += '<div class="sechead"><h2>' + L[1] + (L[0] === lv ? ' <span class="pill good" style="vertical-align:middle">Your level</span>' : '') + '</h2></div><p class="small muted" style="margin-top:-8px">' + L[2] + '</p><div class="stack">' + keys.map(function (k) {
      var m = E.METHODS[k], s = by[k];
      var badge = cur === k ? '<span class="pill solid">' + (mode === 'wiz' ? 'Selected' : 'Current') + '</span>' : s.rank === 0 ? '<span class="pill good">Best match</span>' : s.stretch ? '<span class="pill warn">A stretch for now</span>' : s.rank <= 2 && s.score > 0 ? '<span class="pill good">Good fit</span>' : '';
      var act = mode === 'wiz' ? 'data-act="wiz-set" data-arg="' + jattr({ k: 'method', v: k, stay: true }) + '"' : 'data-act="method" data-arg="' + jattr({ key: k }) + '"';
      return '<button class="method" ' + act + ' aria-pressed="' + (cur === k) + '"><div class="spread"><span class="k">' + esc(m.name) + '</span>' + badge + '</div>' +
        '<span class="tags"><i>' + (m.focus === 'mixed' ? 'Running + lifting' : 'Run-focused') + '</i><i>' + esc(m.days) + '</i><i>' + (m.quality >= 3 ? 'Up to 3 key sessions' : m.quality === 2 ? '2 key workouts' : m.quality === 1 ? '1 key workout' : 'No hard workouts') + '</i></span>' +
        '<span class="small">' + esc(m.desc) + '</span><span class="small muted"><b>Best for:</b> ' + esc(m.suits) + '</span>' +
        (s.why && s.score > 0 && s.why !== m.suits ? '<span class="small"><b>For you:</b> ' + esc(s.why) + '</span>' : '') +
        (s.stretch ? '<span class="small" style="color:var(--amber)">This asks for more running than you do now (about ' + m.minMpw + '+ miles a week). You can pick it, and the plan will build up gradually, but a style at your level is safer.</span>' : '') +
        '<span class="tiny muted"><b>Why it works:</b> ' + esc(m.evidence) + '</span><span class="tiny muted">Inspired by ' + esc(m.inspired) + '. Our own plan, not the published one.</span></button>';
    }).join('') + '</div>';
  });
  return html;
}
var RESEARCH = '<section class="card"><h3>What the research says</h3><ul class="plain small" style="margin-top:6px">' +
  '<li><b>Easy volume matters most.</b> A 2024 analysis of about 120,000 marathoners\' Strava logs found faster runners mainly did more easy running; hard and threshold amounts were similar across groups, and almost everyone trained in a pyramid (mostly easy, some threshold, a little fast).</li>' +
  '<li><b>Sub-threshold work is efficient.</b> The Norwegian approach keeps quality just under the lactate threshold (about 20–25% of weekly running), so you can do a lot of it without deep fatigue. Strong results in practice; few controlled trials yet.</li>' +
  '<li><b>Lifting makes you more economical.</b> A 2022 meta-analysis found heavy resistance training improved running economy more than plyometrics alone, with the best results from near-maximal loads over 10+ weeks.</li>' +
  '<li><b>Lifting and running mix fine.</b> A 2022 review of 43 studies found combining them does not reduce strength or muscle gain; only explosive power suffers when both are done back to back. Run first when running is the priority, and separate hard runs from leg days by several hours where you can.</li>' +
  '<li><b>Specificity near the race.</b> Marathon-pace work extended over longer distances is the common thread in race-specific phases, from Hansons to Canova.</li></ul>' +
  '<p class="tiny muted" style="margin-top:8px">Sources: Muniz-Pumares et al., Sports Medicine 2024; Eihara et al., Sports Medicine – Open 2022; Schumann et al., Sports Medicine 2022; the sub-threshold summary of the LetsRun "Norwegian singles" thread; coaching writing by Daniels, Pfitzinger, Hansons, Fitzgerald, Lydiard, Galloway, Higdon and Canova.</p></section>';
VIEWS.style = function () {
  var prof = st().profile || E.defaultProfile();
  return '<div class="pagehead"><h1>Training style</h1><p>Eleven research-backed approaches, sorted by level. The app recommends one from your experience, current mileage, run days and gym days, but the choice is yours. Switching rebuilds future weeks; your logs stay.</p></div>' + styleCatalog(prof, st().events, 'page') + RESEARCH;
};
var _setup3 = VIEWS.setup;
VIEWS.setup = function () {
  var h = _setup3();
  if (!App.wiz || WIZ_STEPS[App.wiz.step] !== 'match') return h;
  var a = h.indexOf('<div class="sechead"><h2>Other styles</h2></div>'), b = h.lastIndexOf('<div class="wizfoot">');
  if (a < 0 || b < 0) return h;
  return h.slice(0, a) + '<div class="sechead"><h2>All styles by level</h2></div><p class="small muted" style="margin-top:-8px">Tap any style to select it instead.</p>' + styleCatalog(App.wiz.profile, App.wiz.events, 'wiz') + h.slice(b);
};

/* ---------- goals: races, distance goals and pace goals of any length ---------- */
var DIST_OPTS = [['1mi', '1 mile'], ['5k', '5K'], ['8k', '8K / 5 mile'], ['10k', '10K'], ['15k', '15K'], ['10mi', '10 mile'], ['half', 'Half marathon'], ['25k', '25K'], ['30k', '30K'], ['full', 'Marathon'], ['50k', '50K'], ['custom', 'Other distance']];
var KIND = { race: ['Race', 'A race on a set date'], distance: ['Distance goal', 'Cover a distance by a date, any pace'], pace: ['Pace goal', 'Hit a pace or time over a distance (time trial)'] };
function evMiles() { var d = $('#ev-dist').value; return d === 'custom' ? +$('#ev-mi').value || 0 : E.DIST[d].mi; }
SHEETS.event = function (a) {
  var list = a.wiz ? App.wiz.events : st().events;
  var e = (a.id && list.filter(function (x) { return x.id === a.id; })[0]) || { id: uid(), name: '', date: E.addD(App.today, 84), dist: a.kind === 'distance' ? '10mi' : 'half', goal: '', priority: 'A', kind: a.kind || 'race' };
  sheetCtx.ev = Object.assign({ kind: 'race' }, e); sheetCtx.isNew = !a.id;
  var k = sheetCtx.ev.kind, g = E.parseClock(e.goal), mi0 = E.distOf(e).mi;
  return '<h3>' + (a.id ? 'Edit goal' : 'Add a goal') + '</h3>' +
    '<div class="chips">' + Object.keys(KIND).map(function (x) { return '<button type="button" class="chip" data-act="evkind" data-arg="' + jattr({ v: x }) + '" aria-pressed="' + (k === x) + '">' + KIND[x][0] + '</button>'; }).join('') + '</div><p class="tiny muted" id="ev-kindh">' + KIND[k][1] + '.</p>' +
    '<label class="f">Name<input class="i" id="ev-name" value="' + esc(e.name) + '" placeholder="e.g. Twin Cities Marathon"></label>' +
    '<div class="grid2"><label class="f">Date<input class="i" type="date" id="ev-date" value="' + esc(e.date) + '"></label><label class="f">Distance<select class="i" id="ev-dist">' + DIST_OPTS.map(function (d) { return '<option value="' + d[0] + '"' + (e.dist === d[0] ? ' selected' : '') + '>' + d[1] + '</option>'; }).join('') + '</select></label></div>' +
    '<label class="f" id="ev-miw"' + (e.dist === 'custom' ? '' : ' hidden') + '>Distance in miles<input class="i" id="ev-mi" type="number" step="0.1" min="0.5" inputmode="decimal" value="' + esc(e.mi || '') + '"></label>' +
    '<div class="grid2" id="ev-goalw"' + (k === 'distance' ? ' hidden' : '') + '><label class="f">Goal time<input class="i" id="ev-goal" placeholder="1:45:00" value="' + esc(e.goal || '') + '"></label><label class="f">or goal pace /mi<input class="i" id="ev-pace" placeholder="8:00" value="' + (g > 0 ? pace(g / mi0) : '') + '"></label></div>' +
    '<p class="tiny muted" id="ev-goalh"' + (k === 'distance' ? ' hidden' : '') + '>Fill in either one and the other follows. Leave both empty to just finish.</p>' +
    '<label class="f" id="ev-priw">Priority<div class="chips">' + [['A', 'A — full build and taper'], ['B', 'B — tune-up'], ['C', 'C — for fun']].map(function (d) { return '<button type="button" class="chip" data-evp="' + d[0] + '" aria-pressed="' + ((e.priority || 'A') === d[0]) + '">' + d[1] + '</button>'; }).join('') + '</div></label>' +
    '<p class="tiny muted">Training for several races? Make each one you want to peak for an A. The plan builds toward the first, recovers, then builds toward the next. Races within about 5 weeks of a bigger one work best as B tune-ups.</p>' + sheetBtns('Save', !!a.id);
};
ACTIONS.evkind = function (a) {
  sheetCtx.ev.kind = a.v;
  $$('[data-act="evkind"]').forEach(function (b) { b.setAttribute('aria-pressed', String(JSON.parse(b.dataset.arg).v === a.v)); });
  $('#ev-kindh').textContent = KIND[a.v][1] + '.'; $('#ev-goalw').hidden = a.v === 'distance'; $('#ev-goalh').hidden = a.v === 'distance';
};
document.addEventListener('change', function (e) { if (e.target.id === 'ev-dist') { $('#ev-miw').hidden = e.target.value !== 'custom'; evSyncPace('time'); } });
function evSyncPace(from) {
  var mi2 = evMiles(), gi = $('#ev-goal'), pi = $('#ev-pace'); if (!gi || !pi || !(mi2 > 0)) return;
  if (from === 'pace') { var p = E.parseClock(pi.value); gi.value = p > 0 ? E.clock(Math.round(p * mi2)) : gi.value; }
  else { var g = E.parseClock(gi.value); pi.value = g > 0 ? pace(g / mi2) : pi.value; }
}
document.addEventListener('input', function (e) { if (e.target.id === 'ev-pace') evSyncPace('pace'); else if (e.target.id === 'ev-goal' || e.target.id === 'ev-mi') evSyncPace('time'); });
SAVE2.event = function () {
  var ev = sheetCtx.ev, a = sheetCtx.a, err = $('#shErr');
  ev.name = $('#ev-name').value.trim(); ev.date = $('#ev-date').value; ev.dist = $('#ev-dist').value;
  if (ev.dist === 'custom') { ev.mi = +$('#ev-mi').value || null; if (!(ev.mi >= 0.5 && ev.mi <= 100)) { err.textContent = 'Enter the distance in miles.'; return; } } else delete ev.mi;
  if (!ev.date) { err.textContent = 'Pick a date.'; return; }
  if (ev.kind === 'distance') ev.goal = '';
  else {
    var g = $('#ev-goal').value.trim(), p = $('#ev-pace').value.trim();
    if (!g && p) { var ps = E.parseClock(p); if (!(ps > 150 && ps < 1500)) { err.textContent = 'Goal pace should look like 8:00 (per mile).'; return; } g = E.clock(Math.round(ps * evMiles())); }
    if (g && !(E.parseClock(g) > 0)) { err.textContent = 'Goal time looks off. Use h:mm:ss, like 1:45:00, or m:ss for short races.'; return; }
    if (ev.kind === 'pace' && !g) { err.textContent = 'A pace goal needs a goal pace or time.'; return; }
    ev.goal = g;
  }
  if (ev.kind === 'race') delete ev.kind;
  if (!ev.name) ev.name = ev.kind === 'distance' ? 'Run ' + E.distOf(ev).label : ev.kind === 'pace' ? E.distOf(ev).label + ' at ' + pace(E.parseClock(ev.goal) / E.distOf(ev).mi) + '/mi' : E.distOf(ev).label;
  if (a.wiz) { App.wiz.events = App.wiz.events.filter(function (x) { return x.id !== ev.id; }).concat([ev]).sort(function (x, y) { return x.date < y.date ? -1 : 1; }); closeSheet(); render(); return; }
  Store.edit('events', ev.id, function (S) { S.events = S.events.filter(function (x) { return x.id !== ev.id; }); S.events.push(ev); });
  closeSheet(); toast('Saved — plan rebuilt');
};
function upcoming() { return (st().events || []).filter(function (e) { return e.date >= App.today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }
function countdownStrip(skipFirst) {
  var evs = upcoming().slice(skipFirst ? 1 : 0);
  if (!evs.length) return '';
  return '<div class="cdstrip">' + evs.map(function (e) {
    var d = E.distOf(e), days = E.diffD(App.today, e.date), g = E.parseClock(e.goal);
    return '<a href="#/goals" class="cd' + ((e.priority || 'A') === 'A' ? ' a' : '') + '"><b>' + days + '</b><small>day' + (days === 1 ? '' : 's') + '</small><span>' + esc(e.name || d.label) + '</span><em>' + E.fmtDate(e.date, { month: 'short', day: 'numeric' }) + ' · ' + esc(d.label) + (g > 0 ? ' · ' + E.clock(g) : '') + '</em></a>';
  }).join('') + '</div>';
}
var _goals3 = VIEWS.goals;
VIEWS.goals = function () {
  var h = _goals3();
  h = h.replace('<h1>Goals & races</h1><p>A-races get a full build and taper. B- and C-races slot in as tune-ups. Add, change or remove races any time and the plan rebuilds.</p>', '<h1>Goals & races</h1><p>Train for one race or several at once: a 5K next month, a 10-miler in the spring, a marathon next fall. Each A goal gets its own build, taper and recovery, and every goal keeps its own countdown. Change anything and the plan rebuilds.</p>');
  h = h.replace(/<div class="btns"><button class="btn primary" data-act="sheet"[^>]*>Add a race<\/button><\/div>/, countdownStrip(false) + '<div class="btns"><button class="btn primary" data-act="sheet" data-arg="' + jattr({ sheet: 'event' }) + '">Add a race</button><button class="btn" data-act="sheet" data-arg="' + jattr({ sheet: 'event', kind: 'distance' }) + '">Distance goal</button><button class="btn" data-act="sheet" data-arg="' + jattr({ sheet: 'event', kind: 'pace' }) + '">Pace goal</button></div>');
  return h.replace(/>Edit<\/button>/g, '>Edit</button>');
};
var _plan3 = VIEWS.plan;
VIEWS.plan = function () {
  var h = _plan3();
  if (upcoming().length < 2) return h;
  var i = h.indexOf('class="racecard"'); if (i < 0) return h;
  var j = h.indexOf('</a>', i); if (j < 0) return h;
  /* every upcoming race gets the same full-size card, in date order */
  var more = upcoming().slice(1).map(function (ev) {
    var d = E.distOf(ev), g = E.parseClock(ev.goal), days = E.diffD(App.today, ev.date);
    return '<a class="racecard" href="#/goals"><span class="eyebrow" style="color:var(--ink);opacity:.8">' + esc(ev.name || d.label) + ' · ' + E.fmtDate(ev.date, { month: 'short', day: 'numeric', year: 'numeric' }) + '</span><span class="cd">' + days + ' <span style="font-size:1rem;letter-spacing:0">day' + (days === 1 ? '' : 's') + ' to go</span></span>' +
      '<span class="small muted">' + (g > 0 ? 'Goal ' + E.clock(g) + ' · ' + pace(g / d.mi) + '/mi' : esc(d.label)) + (App.an && d.mi ? ' · predicted today ' + E.clock(E.predict(App.an.vNow, d.mi)) : '') + '</span></a>';
  }).join('');
  return h.slice(0, j + 4) + more + h.slice(j + 4);
};

/* ---------- desktop dashboard: the deep dive ---------- */
function multiLine(dates, series, opts) {
  opts = opts || {};
  var W = 640, H = opts.h || 220, pl = 38, pr = 10, pb = 22, pt = 12;
  var all = []; series.forEach(function (s) { s.vals.forEach(function (v) { if (typeof v === 'number' && isFinite(v)) all.push(v); }); });
  if (all.length < 2) return '<p class="small muted">Not enough data yet.</p>';
  var lo = opts.min != null ? opts.min : Math.min.apply(null, all), hi = Math.max.apply(null, all); if (hi - lo < 1e-6) hi = lo + 1;
  var pad = (hi - lo) * 0.08; hi += pad; if (opts.min == null) lo -= pad;
  function X(i) { return pl + i * (W - pl - pr) / Math.max(1, dates.length - 1); }
  function Y(v) { return pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo)); }
  var fmt = opts.fmt || function (v) { return Math.round(v); };
  var s = '<svg class="chart wide" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.label || 'Chart') + '">';
  [0, 0.5, 1].forEach(function (f) { var v = lo + (hi - lo) * f, y = Y(v); s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--line)" stroke-dasharray="3 4"/><text x="' + (pl - 6) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end">' + fmt(v) + '</text>'; });
  if (opts.band) { var y1 = Y(Math.min(hi, opts.band[1])), y0 = Y(Math.max(lo, opts.band[0])); s += '<rect x="' + pl + '" y="' + y1.toFixed(1) + '" width="' + (W - pl - pr) + '" height="' + Math.max(0, y0 - y1).toFixed(1) + '" fill="var(--green)" opacity=".1"/>'; }
  series.forEach(function (se) {
    var path = '', on = false;
    se.vals.forEach(function (v, i) { if (typeof v !== 'number' || !isFinite(v)) { on = false; return; } path += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' '; on = true; });
    if (se.area) { var first = se.vals.findIndex(function (v) { return typeof v === 'number'; }); var last = se.vals.length - 1; while (last > 0 && typeof se.vals[last] !== 'number') last--; s += '<path d="' + path + 'L' + X(last).toFixed(1) + ' ' + Y(lo).toFixed(1) + ' L' + X(first).toFixed(1) + ' ' + Y(lo).toFixed(1) + 'Z" fill="' + se.color + '" opacity=".12"/>'; }
    s += '<path d="' + path + '" fill="none" stroke="' + se.color + '" stroke-width="' + (se.w || 2.2) + '" stroke-linejoin="round" stroke-linecap="round"' + (se.dash ? ' stroke-dasharray="5 4"' : '') + '/>';
    if (se.dots) se.vals.forEach(function (v, i) { if (typeof v === 'number') s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="2.4" fill="' + se.color + '"/>'; });
  });
  var n = dates.length, ticks = [0, Math.round((n - 1) / 3), Math.round((n - 1) * 2 / 3), n - 1];
  ticks.forEach(function (i, k) { s += '<text x="' + X(i).toFixed(1) + '" y="' + (H - 5) + '" text-anchor="' + (k === 0 ? 'start' : k === 3 ? 'end' : 'middle') + '">' + E.fmtDate(dates[i]) + '</text>'; });
  s += '</svg><div class="legend">' + series.map(function (se) { var lastV = null; for (var i = se.vals.length - 1; i >= 0; i--) if (typeof se.vals[i] === 'number') { lastV = se.vals[i]; break; } return '<span><i class="dot" style="background:' + se.color + '"></i>' + esc(se.name) + (lastV != null ? ' <b>' + fmt(lastV) + '</b>' : '') + '</span>'; }).join('') + '</div>';
  return s;
}
function dailyLoad(days) {
  /* Garmin exercise load per day (falls back to miles x 10 when a run has no load) */
  var t = App.today, by = {};
  activities().forEach(function (a) { if (E.diffD(a.date, t) > days + 45 || a.date > t) return; var l = a.g && a.g.load ? a.g.load : a.kind === 'run' ? a.mi * 10 : a.kind === 'lift' ? 30 : 0; by[a.date] = (by[a.date] || 0) + l; });
  var dates = [], acute = [], chronic = [], a7 = 0, c28 = 0;
  for (var i = days + 44; i >= 0; i--) { var d = E.addD(t, -i), l = by[d] || 0; a7 += (l - a7) / 7; c28 += (l - c28) / 28; if (i <= days) { dates.push(d); acute.push(a7); chronic.push(c28); } }
  return { dates: dates, acute: acute, chronic: chronic, ratio: c28 > 1 ? a7 / c28 : null };
}
function intensitySplit(days) {
  var t = App.today, from = E.addD(t, -days), b = { easy: 0, mod: 0, hard: 0 };
  activities().forEach(function (a) {
    if (a.kind !== 'run' || a.date <= from || !a.sec) return;
    var g = a.g || {}, k = 'easy';
    if (g.teLabel) k = /VO2|ANAEROBIC|SPEED/.test(g.teLabel) ? 'hard' : /TEMPO|THRESHOLD/.test(g.teLabel) ? 'mod' : 'easy';
    else if (g.ane >= 2.5 || g.te >= 4.2) k = 'hard'; else if (g.te >= 3.2) k = 'mod';
    else if (!g.te) { var zz = zonesAt(a.date), pc = a.sec / a.mi; if (zz) k = pc <= zz.T[1] ? 'hard' : pc <= zz.S[1] ? 'mod' : 'easy'; }
    b[k] += a.sec;
  });
  var tot = b.easy + b.mod + b.hard;
  return tot ? { easy: b.easy / tot, mod: b.mod / tot, hard: b.hard / tot, sec: tot } : null;
}
function heatmap(weeks) {
  var t = App.today, start = E.addD(E.monday(t), -7 * (weeks - 1)), by = {}, gym = {};
  activities().forEach(function (a) { if (a.date < start) return; if (a.kind === 'run') by[a.date] = (by[a.date] || 0) + a.mi; else if (a.kind === 'lift') gym[a.date] = 1; });
  var max = Math.max.apply(null, Object.keys(by).map(function (k) { return by[k]; }).concat([4]));
  var s = '<div class="heat" style="grid-template-columns:auto repeat(' + weeks + ',1fr)">';
  for (var r = 0; r < 7; r++) {
    s += '<em>' + (r % 2 === 0 ? E.DOW[r].charAt(0) : '') + '</em>';
    for (var w = 0; w < weeks; w++) { var d = E.addD(start, w * 7 + r), v = by[d] || 0, fut = d > t; s += '<i title="' + fmtD(d) + (v ? ': ' + mi(v) + ' mi' : '') + (gym[d] ? ' + gym' : '') + '" style="' + (fut ? 'opacity:.25' : v ? 'background:color-mix(in srgb, var(--green) ' + Math.round(25 + 75 * Math.min(1, v / max)) + '%, var(--card2))' : gym[d] ? 'background:color-mix(in srgb, var(--blue) 55%, var(--card2))' : '') + '"></i>'; }
  }
  return s + '</div><div class="legend" style="margin-top:8px"><span><i class="dot" style="background:var(--green)"></i>Run (darker = longer)</span><span><i class="dot" style="background:var(--blue)"></i>Gym only</span></div>';
}
function dcard(cls, title, body, link) { return '<section class="card ' + cls + '"><div class="spread"><h3>' + title + '</h3>' + (link ? '<a class="small muted" href="' + link[0] + '">' + link[1] + ' ›</a>' : '') + '</div>' + body + '</section>'; }
function runBubble(a) {
  var gg = a.g || {}, l = a.log || {}, pt = l.ptype || a.ptype, feel = l.feel || gg.feel, eff = l.rpe || gg.rpe, d = E.pd(a.date);
  var stats = [['Miles', mi(a.mi)], ['Time', a.sec ? E.clock(a.sec) : '–'], ['Pace', a.sec && a.mi ? pace(a.sec / a.mi) : '–'], ['Avg HR', a.hr || '–']];
  var extra = [gg.cadence ? gg.cadence + ' spm' : '', gg.pwr ? gg.pwr + ' W' : '', gg.te ? 'TE ' + gg.te : '', gg.load ? 'Load ' + gg.load : '', feel ? FEEL[feel] : '', eff ? 'Effort ' + eff + '/10' : ''].filter(Boolean);
  return '<a class="runbub t-' + (pt === 'speed' || pt === 'long' || pt === 'race' || pt === 'recovery' ? pt : 'easy') + '" href="#/activity/' + encodeURIComponent(a.key) + '"><div class="rd"><span>' + E.DOW_ABS[(d.getDay() + 6) % 7] + '</span><b>' + d.getDate() + '</b><span>' + d.toLocaleString(undefined, { month: 'short' }) + '</span></div>' +
    '<div class="rb"><div class="rh">' + (pt ? '<span class="rt">' + esc(TYPE_LABEL[pt] || pt) + '</span>' : '') + '<div class="rn">' + esc(a.name) + '</div></div><div class="rs">' + stats.map(function (x) { return '<div><b>' + x[1] + '</b><span>' + x[0] + '</span></div>'; }).join('') + '</div>' +
    (extra.length ? '<div class="rx">' + extra.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>' : '') + '</div><span class="chev">›</span></a>';
}
VIEWS.dash = function () {
  var p = App.plan; if (!p) return setupNeeded();
  var t = App.today, w = App.week, an = App.an || {}, runs = activities().filter(function (a) { return a.kind === 'run'; });
  var hr = new Date().getHours();
  var html = '<div class="pagehead c12"><div class="eyebrow">' + E.fmtDate(t, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) + '</div><h1>Training dashboard</h1><p>' + esc(p.method.name) + ' · week ' + (w ? w.n : 1) + ' of ' + p.weeks.length + (w ? ' · ' + esc(w.phase.name) : '') + '</p></div>';
  html += '<div class="c12">' + (countdownStrip(false) || '<a class="banner info" href="#/goals" style="display:block;text-decoration:none;color:inherit">No goals yet. Add a race, a distance goal or a pace goal ›</a>') + '</div>';
  /* KPIs */
  var ld = dailyLoad(112), last28 = runs.filter(function (a) { return E.diffD(a.date, t) < 28 && a.date <= t; });
  var ratio = ld.ratio, rd = App.rd;
  html += '<div class="tiles c12 k6">' + [
    ['This week', mi(w ? weekActual(w) : 0) + ' mi', w ? 'of ' + mi(w.tot.mi) + ' planned' : ''],
    ['4-week average', mi(sumMi(last28) / 4) + ' mi', plural(last28.length, 'run')],
    ['Fitness', an.vNow ? an.vNow.toFixed(1) : '–', 'VDOT'],
    ['VO2 max', an.vo2 ? an.vo2.v : '–', an.lt && an.lt.pace ? 'LT ' + pace(an.lt.pace) + '/mi' : 'threshold not set'],
    ['Readiness', rd && rd.factors ? rd.score : '–', rd && rd.factors ? (rd.level === 'green' ? 'good to go' : rd.level === 'amber' ? 'ease off' : 'recover') : 'no data'],
    ['Load ratio', ratio ? ratio.toFixed(2) : '–', ratio ? (ratio > 1.5 ? 'spiking: back off' : ratio > 1.3 ? 'building fast' : ratio < 0.8 ? 'detraining' : 'in the sweet spot') : '']
  ].map(function (x) { return '<div class="tile"><span>' + x[0] + '</span><b>' + x[1] + '</b><em>' + x[2] + '</em></div>'; }).join('') + '</div>';
  /* today + week */
  var day = dayOf(t);
  html += dcard('c4', 'Today', (day ? day.parts.map(function (x) { return x.type === 'rest' ? restRow(x, t) : sessHTML(x, t, zonesAt(t), { struct: false }); }).join('') : '<p class="empty">Outside the plan.</p>') + (w ? '<div class="weekstrip" style="margin-top:12px">' + w.days.map(function (d) { var dots = d.parts.filter(function (x) { return x.type !== 'rest'; }).map(function (x) { return '<i class="t-' + x.type + (partDone(d.date, x) ? ' dn' : '') + '"></i>'; }).join(''); return '<a href="#/day/' + d.date + '" class="' + (d.date === t ? 'today' : '') + '">' + d.dow.charAt(0) + '<span class="n">' + E.pd(d.date).getDate() + '</span><span class="dots">' + dots + '</span></a>'; }).join('') + '</div>' : ''), ['#/plan', 'Plan']);
  /* training load */
  html += dcard('c8', 'Training load', '<p class="small muted">Short-term load (7 days) against long-term load (28 days), from Garmin exercise load. Staying within 0.8–1.3× of your long-term load is the range linked with the fewest injuries.</p>' + multiLine(ld.dates, [{ name: 'Long-term (fitness)', vals: ld.chronic, color: 'var(--blue)', area: true }, { name: 'Short-term (fatigue)', vals: ld.acute, color: 'var(--gold)' }], { label: 'Training load', min: 0 }));
  /* weekly miles */
  var cur = w ? w.n : 1, m0 = E.monday(t), wk = [];
  for (var i = 25; i >= 0; i--) { var s0 = E.addD(m0, -7 * i), e0 = E.addD(s0, 6), pw = E.weekOf(p, s0); wk.push({ label: E.pd(s0).getDate(), a: pw ? pw.tot.mi : 0, b: sumMi(runs.filter(function (a) { return a.date >= s0 && a.date <= e0; })), cur: i === 0 }); }
  html += dcard('c8', 'Weekly miles, last 26 weeks', barChart(wk).replace('class="chart"', 'class="chart wide"') + '<div class="legend"><span><i class="dot" style="background:var(--line2)"></i>Planned</span><span><i class="dot" style="background:var(--green)"></i>Run</span></div>', ['#/progress/performance', 'Performance']);
  /* intensity distribution */
  var sp = intensitySplit(56);
  html += dcard('c4', 'Intensity mix, 8 weeks', sp ? '<div class="splitbar"><i style="width:' + (sp.easy * 100).toFixed(1) + '%;background:var(--green)"></i><i style="width:' + (sp.mod * 100).toFixed(1) + '%;background:var(--gold)"></i><i style="width:' + (sp.hard * 100).toFixed(1) + '%;background:var(--red)"></i></div><div class="grid3" style="margin-top:10px"><div class="metric"><span>Easy</span><b>' + Math.round(sp.easy * 100) + '%</b></div><div class="metric"><span>Moderate</span><b>' + Math.round(sp.mod * 100) + '%</b></div><div class="metric"><span>Hard</span><b>' + Math.round(sp.hard * 100) + '%</b></div></div><p class="small muted" style="margin-top:8px">' + (sp.easy < 0.7 ? 'Less than 70% easy. Faster marathoners in large training studies do about 75–85% of their running easy: slow the easy days down.' : sp.easy > 0.92 ? 'Almost all easy. Fine while building a base; your plan adds threshold work as the race nears.' : 'A healthy pyramid: mostly easy, some moderate, a little hard.') + '</p><p class="tiny muted">By time, classed from Garmin training effect.</p>' : '<p class="empty">No runs yet.</p>');
  /* aerobic efficiency + long run */
  var easy = runs.filter(function (a) { return a.hr && a.sec && a.mi >= 2 && (!a.ptype || a.ptype === 'easy' || a.ptype === 'long' || a.ptype === 'recovery'); }).slice(0, 40).reverse();
  html += dcard('c6', 'Aerobic efficiency', '<p class="small muted">Meters covered per heartbeat on easy and long runs. A rising line means you are getting fitter at the same effort.</p>' + multiLine(easy.map(function (a) { return a.date; }), [{ name: 'm per beat', vals: easy.map(function (a) { return (a.mi * E.MI_M) / (a.hr * a.sec / 60); }), color: 'var(--green)', dots: true }], { fmt: function (v) { return v.toFixed(2); }, label: 'Aerobic efficiency', h: 190 }));
  var lw = [], ld2 = [];
  for (var j = 15; j >= 0; j--) { var s1 = E.addD(m0, -7 * j), e1 = E.addD(s1, 6), rr = runs.filter(function (a) { return a.date >= s1 && a.date <= e1; }); ld2.push(s1); lw.push(rr.length ? Math.max.apply(null, rr.map(function (a) { return a.mi; })) : null); }
  var nextLong = null; if (w) w.days.forEach(function (d) { d.parts.forEach(function (x) { if (x.type === 'long') nextLong = x.mi; }); });
  html += dcard('c6', 'Long-run progression', '<p class="small muted">Longest run each week.' + (nextLong ? ' This week\'s long run: ' + mi(nextLong) + ' mi.' : '') + '</p>' + multiLine(ld2, [{ name: 'Longest run (mi)', vals: lw, color: 'var(--red)', dots: true }], { fmt: function (v) { return v.toFixed(1); }, min: 0, label: 'Long run', h: 190 }));
  /* running dynamics */
  var dyn = runs.filter(function (a) { return a.g && (a.g.cadence || a.g.pwr); }).slice(0, 30).reverse(), dd = dyn.map(function (a) { return a.date; });
  var dynCharts = [['Cadence (spm)', 'cadence', 'var(--blue)', 0], ['Stride (m)', 'stride', 'var(--violet)', 2, 0.01], ['Vertical ratio (%)', 'vRatio', 'var(--amber)', 1], ['Ground contact (ms)', 'gct', 'var(--red)', 0], ['Power (W)', 'pwr', 'var(--gold)', 0]].filter(function (c) { return dyn.filter(function (a) { return a.g[c[1]]; }).length >= 3; });
  if (dynCharts.length) html += dcard('c12', 'Running dynamics, last ' + dyn.length + ' runs', '<div class="dyn">' + dynCharts.map(function (c) { return '<div>' + lineChart(dd, [{ name: c[0], vals: dyn.map(function (a) { return a.g[c[1]] ? a.g[c[1]] * (c[4] || 1) : null; }), color: c[2], fmt: function (v) { return v.toFixed(c[3]); } }]) + '</div>'; }).join('') + '</div><p class="tiny muted">Higher cadence and lower vertical ratio usually mean less impact per step. Treadmill runs can read differently from outdoor runs.</p>');
  /* recovery */
  var g = Store.garmin && Store.garmin.days;
  if (g) { var rdts = []; for (var q = 55; q >= 0; q--) rdts.push(E.addD(t, -q)); var norm = function (k) { return rdts.map(function (d) { return g[d] && typeof g[d][k] === 'number' ? g[d][k] : null; }); };
    html += dcard('c6', 'HRV and resting heart rate', multiLine(rdts, [{ name: 'HRV (ms)', vals: norm('hrv'), color: 'var(--violet)' }, { name: 'Resting HR (bpm)', vals: norm('rhr'), color: 'var(--red)' }], { label: 'HRV and resting HR', h: 190 }), ['#/progress/health', 'Health']);
    html += dcard('c6', 'Sleep', multiLine(rdts, [{ name: 'Sleep score', vals: norm('sleepScore'), color: 'var(--blue)' }, { name: 'Body Battery peak', vals: norm('bbHigh'), color: 'var(--gold)', dash: true }], { label: 'Sleep', h: 190 }), ['#/progress/health', 'Health']); }
  /* predictions + fitness trend */
  html += dcard('c6', 'Race predictions', '<div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Distance</th><th class="num">Predicted</th><th class="num">Pace</th><th class="num">Goal</th><th class="num">Gap</th></tr></thead><tbody>' + [['5k', '5K'], ['10k', '10K'], ['10mi', '10 mile'], ['half', 'Half'], ['full', 'Marathon']].map(function (x) { var d = E.DIST[x[0]], pr = E.predict(an.vNow, d.mi), ev = upcoming().filter(function (e) { return e.dist === x[0] && e.goal; })[0], gg = ev ? E.parseClock(ev.goal) : 0; return '<tr><td>' + x[1] + '</td><td class="num">' + E.clock(pr) + '</td><td class="num">' + pace(pr / d.mi) + '</td><td class="num">' + (gg ? esc(ev.goal) : '–') + '</td><td class="num" style="color:' + (gg ? (pr <= gg ? 'var(--green)' : 'var(--amber)') : 'inherit') + '">' + (gg ? (pr <= gg ? '−' : '+') + E.clock(Math.abs(pr - gg)) : '') + '</td></tr>'; }).join('') + '</tbody></table></div>', ['#/fitness', 'VO2 max & threshold']);
  var vh = an.vo2 ? an.vo2.hist.slice(-60) : [];
  html += dcard('c6', 'VO2 max trend', vh.length >= 2 ? multiLine(vh.map(function (x) { return x.date; }), [{ name: 'VO2 max', vals: vh.map(function (x) { return x.v; }), color: 'var(--violet)', dots: vh.length < 40 }], { fmt: function (v) { return v.toFixed(1); }, label: 'VO2 max', h: 190 }) : '<p class="empty">Not enough readings yet.</p>', ['#/fitness', 'Details']);
  /* strength */
  var by = liftSeriesAll(), names = Object.keys(by);
  if (names.length) { var top = names.map(function (n) { var s2 = by[n]; return { n: n, e1: s2.reduce(function (m, x) { return Math.max(m, x.e1); }, 0), last: s2[s2.length - 1] }; }).sort(function (a, b) { return b.e1 - a.e1; }).slice(0, 6);
    html += dcard('c6', 'Strength', '<div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Lift</th><th>Last</th><th class="num">Best e1RM</th><th>Next step</th></tr></thead><tbody>' + top.map(function (x) { var mod = findEx(x.n), o = overload(x.n, mod ? mod.rx[0] : '3×8', E.addD(t, 1), 0); return '<tr><td>' + esc(x.n) + '</td><td class="small">' + x.last.sets.slice(0, 3).map(function (s3) { return (s3.w ? s3.w + '×' : '') + s3.r; }).join(', ') + '</td><td class="num">' + x.e1 + '</td><td class="small">' + (o.kind === 'up' ? '↑ ' + o.w + ' lb' : o.kind === 'reset' ? '↓ ' + o.w + ' lb' : o.kind === 'reps' ? 'beat reps' : o.kind === 'hold' ? 'hold' : '–') + (o.plateau ? ' · plateau' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>', ['#/progress/strength', 'Strength']); }
  /* consistency */
  html += dcard(names.length ? 'c6' : 'c12', 'Consistency, last ' + (names.length ? 20 : 30) + ' weeks', heatmap(names.length ? 20 : 30), ['#/calendar', 'Calendar']);
  /* activity table */
  html += dcard('c12', 'Recent runs', '<div class="runbubs">' + runs.slice(0, 12).map(runBubble).join('') + '</div>', ['#/progress/workouts', 'All workouts']);
  return '<div class="dash">' + html + '</div>';
};

var _render3 = render;
render = function () {
  document.body.classList.toggle('wide', App.view === 'dash' || App.view === 'you');
  _render3();
};
/* on a computer, open on the dashboard */
if (window.matchMedia && window.matchMedia('(min-width: 1024px)').matches && (!location.hash || location.hash === '#/today' || location.hash === '#/')) { try { history.replaceState(null, '', '#/you'); } catch (e) { /* ignore */ } }
var _you3 = VIEWS.you;
VIEWS.you = function () {
  var h = _you3(), at = h.indexOf('<div class="tiles');
  var c = dashHero();
  return at >= 0 ? h.slice(0, at) + c + h.slice(at) : c + h;
};
/* the deep dive, shown big at the top of You: live numbers and what's inside */
function dashHero() {
  var x = App.extra || {}, an = App.an || {}, chips = [];
  if (x.status && x.status.acwr) chips.push(['Load ratio', x.status.acwr + (x.status.acwr > 1.3 ? ' · high' : x.status.acwr < 0.8 ? ' · low' : ' · safe')]);
  var hv = x.hrv && x.hrv[Object.keys(x.hrv).sort().pop()]; if (hv && hv.status) chips.push(['HRV', String(hv.status).charAt(0) + String(hv.status).slice(1).toLowerCase().replace(/_/g, ' ')]);
  if (x.endurance && x.endurance.score) chips.push(['Endurance', Math.round(x.endurance.score)]);
  var acts = (Store.garmin && Store.garmin.activities) || [], cut = E.addD(App.today, -28), m4 = acts.filter(function (a) { return a.run && a.date > cut; }).reduce(function (s, a) { return s + a.distM / E.MI_M; }, 0);
  if (m4) chips.push(['Avg week', mi(m4 / 4) + ' mi']);
  var inside = ['Training load', 'Aerobic efficiency', 'Weekly miles', 'Intensity mix', 'HRV & resting HR', 'Sleep', 'Race predictions', 'VO2 max trend', 'Running dynamics', 'Long-run progression', 'Strength'];
  return '<a class="dashhero" href="#/you"><div class="spread"><div><div class="eyebrow">Deep dive</div><h2>Training dashboard</h2></div><span class="dh-go" aria-hidden="true">›</span></div>' +
    '<p class="small">Every trend in one place: how your fitness, load, recovery and running form are moving week to week.</p>' +
    (chips.length ? '<div class="dh-chips">' + chips.slice(0, 4).map(function (c) { return '<div><span>' + c[0] + '</span><b>' + esc(String(c[1])) + '</b></div>'; }).join('') + '</div>' : '') +
    '<div class="dh-list">' + inside.map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</div><span class="btn sm primary dh-btn">Open dashboard</span></a>';
}
