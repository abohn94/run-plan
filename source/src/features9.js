/* ================= features9: workout builder + library, plan controls, spreadsheet view + CSV, analysis charts,
   smart-training score, weekly share card ================= */

/* ---------- workout builder ---------- */
TITLES.builder = 'Workout builder'; TITLES.workouts = 'My workouts';
var BZ = [['E', 'Easy'], ['S', 'Steady'], ['M', 'Marathon pace'], ['G', 'Goal / half pace'], ['T', 'Threshold'], ['I', 'Interval (5K)'], ['R', 'Repetition (mile)']];
var BU = [['min', 'min'], ['mi', 'mi'], ['m', 'm']];
function bldNew() { return { id: null, title: '', note: '', steps: [{ k: 'wu', u: 'min', v: 10 }, { k: 'rep', n: 6, u: 'min', v: 3, z: 'T', ru: 'min', rv: 1, walk: false }, { k: 'cd', u: 'min', v: 10 }] }; }
/* builder rows -> engine steps */
function bldLen(u, v) { v = +v || 0; var o = {}; o[u === 'm' ? 'm' : u === 'mi' ? 'mi' : 'min'] = v; return o; }
function bldSteps(b) {
  return b.steps.map(function (s) {
    if (s.k === 'wu') return Object.assign({ k: 'wu', z: 'E' }, bldLen(s.u, s.v));
    if (s.k === 'cd') return Object.assign({ k: 'cd', z: 'E' }, bldLen(s.u, s.v));
    if (s.k === 'run') return Object.assign({ k: 'run', z: s.z || 'E', label: '' }, bldLen(s.u, s.v));
    return { k: 'rep', n: Math.max(1, +s.n || 1), work: bldLen(s.u, s.v), z: s.z || 'I', rec: Object.assign(bldLen(s.ru, s.rv), { walk: !!s.walk }), effort: (BZ.filter(function (x) { return x[0] === s.z; })[0] || ['', ''])[1].toLowerCase() };
  });
}
function bldZones() { var w = App.week || (App.plan && App.plan.weeks[0]); return w && w.zonesAdj; }
function bldPart(b) {
  var steps = bldSteps(b), zz = bldZones(), mi0 = E.stepMiles(steps, zz);
  var hard = steps.some(function (s) { return s.z && s.z !== 'E' && s.z !== 'REC'; });
  return { type: hard ? 'speed' : 'easy', role: hard ? 'speed' : 'easy', key: 'custom', custom: true, title: b.title || 'My workout', mi: Math.max(0.5, Math.round(mi0 * 2) / 2), steps: steps, purpose: b.note || '', note: b.note || '' };
}
function bSel(attrs, opts, cur) { return '<select class="i sm" ' + attrs + '>' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(cur) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }
function bNum(attrs, v, step) { return '<input class="i sm" type="number" inputmode="decimal" min="0" step="' + (step || 'any') + '" value="' + esc(v) + '" ' + attrs + '>'; }
function zPace(z) { var zz = bldZones(), r = zz && zz[z]; return r ? '<span class="zp">' + pace(r[0]) + '–' + pace(r[1]) + '</span>' : ''; }
function bldRow(s, i, n) {
  var a = function (f) { return 'data-bld="' + i + '" data-f="' + f + '"'; };
  var name = { wu: 'Warm-up', cd: 'Cool-down', run: 'Run', rep: 'Repeats' }[s.k];
  var body;
  if (s.k === 'rep') body = '<div class="bline">' + bNum(a('n'), s.n, 1) + '<span>×</span>' + bNum(a('v'), s.v) + bSel(a('u'), BU, s.u) + '<span>at</span>' + bSel(a('z'), BZ, s.z) + zPace(s.z) + '</div><div class="bline"><span>recover</span>' + bNum(a('rv'), s.rv) + bSel(a('ru'), BU, s.ru) + bSel(a('walk'), [['false', 'jog'], ['true', 'walk']], String(!!s.walk)) + '</div>';
  else body = '<div class="bline">' + bNum(a('v'), s.v) + bSel(a('u'), BU.slice(0, 2), s.u) + (s.k === 'run' ? '<span>at</span>' + bSel(a('z'), BZ, s.z) + zPace(s.z) : '<span class="muted">easy ' + zPace('E') + '</span>') + '</div>';
  return '<div class="bstep k-' + s.k + '"><div class="bhead"><b>' + name + '</b><span class="bctl">' + (i > 0 ? '<button class="iconbtn xs" data-act="bld-mv" data-arg="' + jattr({ i: i, d: -1 }) + '" aria-label="Move up">↑</button>' : '') + (i < n - 1 ? '<button class="iconbtn xs" data-act="bld-mv" data-arg="' + jattr({ i: i, d: 1 }) + '" aria-label="Move down">↓</button>' : '') + '<button class="iconbtn xs" data-act="bld-rm" data-arg="' + jattr({ i: i }) + '" aria-label="Remove step">✕</button></span></div>' + body + '</div>';
}
function bldSummary() {
  var b = App.bld; if (!b) return '';
  var p = bldPart(b), zz = bldZones();
  return '<div class="bsum">' + structHTML(p, zz, true) + '<div class="spread small" style="margin-top:6px"><span>About <b>' + mi(p.mi) + ' mi</b> · ' + estText(p, zz) + '</span><span class="muted">paces from your current fitness</span></div></div>';
}
VIEWS.builder = function () {
  var id = App.args[0];
  if (!App.bld || (id && App.bld.id !== id) || (!id && App.bld.id)) {
    var have = id && (st().wlib || []).filter(function (w) { return w.id === id; })[0];
    App.bld = have ? JSON.parse(JSON.stringify(have.b)) : bldNew(); if (have) App.bld.id = id;
  }
  var b = App.bld;
  var html = '<div class="pagehead"><h1>' + (b.id ? 'Edit workout' : 'Build a workout') + '</h1><p>Any structure you like. Paces come from your current fitness and update as you get fitter; it goes to your watch like the rest of the plan.</p></div>';
  html += '<section class="card stack"><label class="f">Name<input class="i" id="bldTitle" data-bld="t" data-f="title" placeholder="e.g. 3 × 2 mi threshold" value="' + esc(b.title) + '"></label><div id="bldSum">' + bldSummary() + '</div></section>';
  html += '<div class="stack">' + b.steps.map(function (s, i) { return bldRow(s, i, b.steps.length); }).join('') + '</div>';
  html += '<div class="btns" style="margin-top:10px"><button class="btn sm" data-act="bld-add" data-arg="' + jattr({ k: 'wu' }) + '">+ Warm-up</button><button class="btn sm" data-act="bld-add" data-arg="' + jattr({ k: 'run' }) + '">+ Run</button><button class="btn sm" data-act="bld-add" data-arg="' + jattr({ k: 'rep' }) + '">+ Repeats</button><button class="btn sm" data-act="bld-add" data-arg="' + jattr({ k: 'cd' }) + '">+ Cool-down</button></div>';
  html += '<section class="card stack" style="margin-top:12px"><label class="f">Notes (optional)<input class="i" data-bld="t" data-f="note" value="' + esc(b.note) + '" placeholder="What it\'s for, how it should feel"></label><div class="btns"><button class="btn primary" data-act="bld-save">Save to my workouts</button><button class="btn" data-act="bld-save" data-arg="' + jattr({ add: true }) + '">Save and add to a day</button>' + (b.id ? '<button class="btn ghost" data-act="bld-del">Delete</button>' : '') + '</div></section>';
  return html;
};
document.addEventListener('input', function (e) {
  var t = e.target; if (!t.dataset || t.dataset.bld == null || !App.bld) return;
  if (t.dataset.bld === 't') App.bld[t.dataset.f] = t.value;
  else { var s = App.bld.steps[+t.dataset.bld]; if (!s) return; var v = t.value; s[t.dataset.f] = t.dataset.f === 'walk' ? v === 'true' : /^(n|v|rv)$/.test(t.dataset.f) ? v : v; }
  var el = document.getElementById('bldSum'); if (el) el.innerHTML = bldSummary();
});
document.addEventListener('change', function (e) { var t = e.target; if (t.tagName === 'SELECT' && t.dataset && t.dataset.bld != null) t.dispatchEvent(new Event('input', { bubbles: true })); });
ACTIONS['bld-add'] = function (a) {
  var b = App.bld, s = a.k === 'rep' ? { k: 'rep', n: 4, u: 'min', v: 3, z: 'I', ru: 'min', rv: 2, walk: false } : a.k === 'run' ? { k: 'run', u: 'mi', v: 2, z: 'T' } : { k: a.k, u: 'min', v: 10 };
  if (a.k === 'wu') b.steps.unshift(s); else if (a.k === 'cd') b.steps.push(s); else { var j = b.steps.length && b.steps[b.steps.length - 1].k === 'cd' ? b.steps.length - 1 : b.steps.length; b.steps.splice(j, 0, s); }
  render();
};
ACTIONS['bld-rm'] = function (a) { App.bld.steps.splice(a.i, 1); render(); };
ACTIONS['bld-mv'] = function (a) { var s = App.bld.steps, j = a.i + a.d; if (j < 0 || j >= s.length) return; var x = s[a.i]; s[a.i] = s[j]; s[j] = x; render(); };
ACTIONS['bld-save'] = function (a) {
  var b = App.bld; if (!b.steps.length) { toast('Add at least one step'); return; }
  if (!b.title.trim()) b.title = bldPart(b).title;
  var id = b.id || 'w' + Date.now().toString(36), rec = { id: id, b: JSON.parse(JSON.stringify(Object.assign({}, b, { id: id }))) };
  Store.edit('wlib', null, function (S) { S.wlib = (S.wlib || []).filter(function (w) { return w.id !== id; }).concat([rec]); });
  App.bld.id = id; toast('Saved to My workouts');
  if (a && a.add) { var w = App.week || (App.plan && App.plan.weeks[0]); openSheet('addwk', { week: w ? w.start : App.today, mine: id }); }
  else go('#/workouts');
};
ACTIONS['bld-del'] = function () { var id = App.bld && App.bld.id; if (!id) return; Store.edit('wlib', null, function (S) { S.wlib = (S.wlib || []).filter(function (w) { return w.id !== id; }); }); App.bld = null; toast('Deleted'); go('#/workouts'); };
VIEWS.workouts = function () {
  var L = st().wlib || [], zz = bldZones();
  var html = '<div class="pagehead"><h1>My workouts</h1><p>Workouts you built. Add any of them to a day from the Plan tab, or from here.</p></div>';
  html += '<div class="btns"><a class="btn primary" href="#/builder" data-act="bld-fresh">+ Build a workout</a></div>';
  if (!L.length) html += '<section class="card"><p class="small muted">Nothing saved yet. Build your favourite session once (a Pfitzinger LT run, 10 × 400 m, a progression long run) and reuse it any week.</p></section>';
  else html += '<div class="stack" style="margin-top:12px">' + L.map(function (w) { var p = bldPart(w.b); return '<section class="card wlib"><div class="spread"><div><h3>' + esc(p.title) + '</h3><span class="small muted">' + mi(p.mi) + ' mi · ' + estText(p, zz) + '</span></div><div class="btns"><a class="btn sm" href="#/builder/' + w.id + '">Edit</a><button class="btn sm primary" data-act="sheet" data-arg="' + jattr({ sheet: 'addwk', week: (App.week || {}).start || App.today, mine: w.id }) + '">Add to a day</button></div></div>' + structHTML(p, zz) + '</section>'; }).join('') + '</div>';
  return html;
};
ACTIONS['bld-fresh'] = function () { App.bld = null; go('#/builder'); };
/* the add-a-workout sheet gets "My workouts" */
var _addwk9 = SHEETS.addwk;
SHEETS.addwk = function (a) {
  var h = _addwk9(a); if (!h) return h;
  var L = st().wlib || [], opts = App._addOpts || [];
  var rows = L.map(function (w) { var p = bldPart(w.b), i = opts.length; opts.push({ part: p, why: 'My workout' }); return '<button class="addopt mine' + (a.mine === w.id ? ' sug' : '') + '" data-act="extra-add" data-arg="' + jattr({ i: i }) + '"><span class="tico">' + (TICON[p.type] || TICON.easy) + '</span><span class="t"><b>' + esc(p.title) + ' · ' + mi(p.mi) + ' mi</b><small>My workout</small></span><span class="plus">+</span></button>'; }).join('');
  App._addOpts = opts;
  var block = '<div class="eyebrow" style="margin-top:12px">My workouts</div><div class="stack tight">' + rows + '<a class="addopt build" href="#/builder" data-act="bld-fresh"><span class="tico">' + (TICON.speed || '') + '</span><span class="t"><b>Build a new workout</b><small>Warm-up, repeats, paces, cool-down</small></span><span class="plus">›</span></a></div>';
  var i = h.indexOf('<div class="eyebrow" style="margin-top:12px">Or add</div>');
  return i > 0 ? h.slice(0, i) + block + h.slice(i) : h + block;
};
var _you9 = VIEWS.you;
VIEWS.you = function () { var h = _you9(), n = (st().wlib || []).length, link = '<a href="#/workouts">My workouts<span class="v">' + (n ? n + ' saved' : 'build your own') + '</span><span class="chev">›</span></a>', i = h.indexOf('<a href="#/control"'); return i < 0 ? h : h.slice(0, i) + link + h.slice(i); };

/* ---------- plan builder controls (profile.ctl), with a before/after preview ---------- */
TITLES.planctl = 'Plan settings';
var MIXES = [['', 'Style default', 'As the training style is written.'], ['pyramidal', 'Pyramidal', 'Mostly easy, some threshold, a little fast.'], ['polarized', 'Polarized', 'Easy days easier, hard days harder: intervals and hills replace tempo work.'], ['threshold', 'Threshold-heavy', 'Tempo and cruise intervals replace short fast intervals.']];
function planSum(p) {
  var longest = 0, qmax = 0, tot = 0;
  p.weeks.forEach(function (w) { tot += w.tot.mi; var q = 0; w.days.forEach(function (d) { d.parts.forEach(function (x) { if (x.type === 'long' && x.mi > longest) longest = x.mi; if (x.type === 'speed') q++; }); }); if (!w.cut && w.phase.key !== 'race' && w.phase.key !== 'taper') qmax = Math.max(qmax, q); });
  return { peak: Math.max.apply(null, p.weeks.map(function (w) { return w.tot.mi; })), longest: longest, q: qmax, tot: Math.round(tot), weeks: p.weeks };
}
function miniSeason(p, max) {
  return '<div class="minis">' + p.weeks.map(function (w) { return '<i style="height:' + Math.max(3, w.tot.mi / max * 100) + '%"></i>'; }).join('') + '</div>';
}
function ctlPreview() {
  var S = Store.state, cur, nxt;
  try { cur = planSum(E.generate(S)); var S2 = JSON.parse(JSON.stringify(S)); S2.profile.ctl = App.ctl; nxt = planSum(E.generate(S2)); } catch (e) { return '<p class="small muted">Preview unavailable.</p>'; }
  var max = Math.max(cur.peak, nxt.peak) || 1;
  var row = function (lbl, a, b, unit) { var ch = Math.round((b - a) * 10) / 10; return '<div class="cmp"><span>' + lbl + '</span><b>' + mi(a) + (unit || '') + '</b><b class="' + (ch ? 'chg' : '') + '">' + mi(b) + (unit || '') + '</b></div>'; };
  return '<div class="cmp head"><span></span><em>Now</em><em>With these settings</em></div>' + row('Peak week', cur.peak, nxt.peak, ' mi') + row('Longest run', cur.longest, nxt.longest, ' mi') + row('Workouts / week', cur.q, nxt.q) + row('Season total', cur.tot, nxt.tot, ' mi') +
    '<div class="minipair"><div><em>Now</em>' + miniSeason(cur, max) + '</div><div><em>New</em>' + miniSeason(nxt, max) + '</div></div>';
}
VIEWS.planctl = function () {
  var pr = st().profile || {};
  if (!App.ctl || App.ctlFor !== JSON.stringify(pr.ctl || {})) { App.ctl = JSON.parse(JSON.stringify(pr.ctl || {})); App.ctlFor = JSON.stringify(pr.ctl || {}); }
  var c = App.ctl, m = E.METHODS[pr.method] || E.METHODS.balanced;
  var seg = function (f, opts) { return '<div class="segs">' + opts.map(function (o) { return '<button type="button" data-act="ctl-set" data-arg="' + jattr({ f: f, v: o[0] }) + '" aria-pressed="' + (String(c[f] == null ? '' : c[f]) === String(o[0])) + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
  var html = '<div class="pagehead"><h1>Plan settings</h1><p>Fine-tune ' + esc(m.name) + ' to how you train. Leave anything on Auto to follow the style. Nothing changes until you apply.</p></div>';
  html += '<section class="card stack"><div class="spread"><h3>Peak weekly miles</h3><b id="ctlPeakV">' + (c.peak ? c.peak + ' mi' : 'Auto') + '</b></div><input type="range" min="15" max="90" step="1" value="' + (c.peak || 40) + '" data-ctl="peak" aria-label="Peak weekly miles"><div class="spread tiny muted"><span>15</span><button class="linkbtn tiny" data-act="ctl-set" data-arg="' + jattr({ f: 'peak', v: '' }) + '">Use Auto</button><span>90</span></div></section>';
  html += '<section class="card stack"><div class="spread"><h3>Longest long run</h3><b id="ctlLongV">' + (c.longCap ? c.longCap + ' mi' : 'Auto') + '</b></div><input type="range" min="8" max="24" step="1" value="' + (c.longCap || 20) + '" data-ctl="longCap" aria-label="Longest long run"><div class="spread tiny muted"><span>8</span><button class="linkbtn tiny" data-act="ctl-set" data-arg="' + jattr({ f: 'longCap', v: '' }) + '">Use Auto</button><span>24</span></div></section>';
  html += '<section class="card stack"><h3>Workouts per week</h3>' + seg('quality', [['', 'Auto'], ['0', 'None'], ['1', '1'], ['2', '2'], ['3', '3']]) + '<p class="tiny muted">Build weeks only. Cutback, taper and race weeks stay lighter.</p></section>';
  html += '<section class="card stack"><h3>Intensity mix</h3>' + seg('mix', MIXES.map(function (x) { return [x[0], x[1]]; })) + '<p class="tiny muted">' + esc((MIXES.filter(function (x) { return x[0] === (c.mix || ''); })[0] || MIXES[0])[2]) + '</p></section>';
  html += '<section class="card stack"><h3>Preview</h3><div id="ctlPrev">' + ctlPreview() + '</div><div class="btns"><button class="btn primary" data-act="ctl-apply">Apply to my plan</button><button class="btn ghost" data-act="ctl-reset">Reset to style defaults</button></div></section>';
  return html;
};
document.addEventListener('input', function (e) {
  var t = e.target; if (!t.dataset || !t.dataset.ctl || !App.ctl) return;
  App.ctl[t.dataset.ctl] = +t.value;
  var lbl = document.getElementById(t.dataset.ctl === 'peak' ? 'ctlPeakV' : 'ctlLongV'); if (lbl) lbl.textContent = t.value + ' mi';
  clearTimeout(App._ctlT); App._ctlT = setTimeout(function () { var el = document.getElementById('ctlPrev'); if (el) el.innerHTML = ctlPreview(); }, 120);
});
ACTIONS['ctl-set'] = function (a) { if (a.v === '' || a.v == null) delete App.ctl[a.f]; else App.ctl[a.f] = a.f === 'mix' ? a.v : +a.v; var y = window.scrollY; render(); window.scrollTo(0, y); };
ACTIONS['ctl-apply'] = function () {
  var c = {}; Object.keys(App.ctl).forEach(function (k) { if (App.ctl[k] !== '' && App.ctl[k] != null) c[k] = App.ctl[k]; });
  Store.edit('profile', null, function (S) { if (Object.keys(c).length) S.profile.ctl = c; else delete S.profile.ctl; });
  App.ctlFor = null; toast('Plan updated'); go('#/plan');
};
ACTIONS['ctl-reset'] = function () { App.ctl = {}; var y = window.scrollY; render(); window.scrollTo(0, y); };
var _you9b = VIEWS.you;
VIEWS.you = function () { var h = _you9b(), c = (st().profile || {}).ctl, link = '<a href="#/planctl">Plan settings<span class="v">' + (c && Object.keys(c).length ? 'customised' : 'peak, long run, mix') + '</span><span class="chev">›</span></a>', i = h.indexOf('<a href="#/workouts"'); return i < 0 ? h : h.slice(0, i) + link + h.slice(i); };

/* ---------- spreadsheet view: every week × day, planned vs run, with totals; CSV export ---------- */
TITLES.table = 'Training log';
function dayRun(d) { var l = logOf(d.date), r = l.run && !l.run.skip ? +l.run.mi || 0 : 0, x = l.xrun && !l.xrun.skip ? +l.xrun.mi || 0 : 0; return r + x; }
function dayPlanMi(d) { return d.parts.reduce(function (a, p) { return a + (E.isRun(p) ? p.mi || 0 : 0); }, 0); }
VIEWS.table = function () {
  var p = App.plan; if (!p) return setupNeeded();
  var cur = App.week ? App.week.n : 1, from = Math.max(1, +App.args[0] || cur - 3), to = Math.min(p.weeks.length, from + 11);
  var dows = E.DOW.map(function (x) { return x.charAt(0); });
  var html = '<div class="pagehead"><h1>Training log</h1><p>Your whole plan as a table: planned miles in each cell, what you ran underneath. Tap a day to open it.</p></div>';
  html += '<div class="spread" style="margin-bottom:8px"><a class="btn sm' + (from <= 1 ? ' off' : '') + '" href="#/table/' + Math.max(1, from - 12) + '">‹ Earlier</a><span class="small muted">Weeks ' + from + '–' + to + ' of ' + p.weeks.length + '</span><a class="btn sm' + (to >= p.weeks.length ? ' off' : '') + '" href="#/table/' + Math.min(p.weeks.length, from + 12) + '">Later ›</a></div>';
  html += '<section class="card sheetc"><table class="wsheet"><thead><tr><th>Wk</th>' + dows.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '<th>Total</th></tr></thead><tbody>';
  for (var n = from; n <= to; n++) {
    var w = p.weeks[n - 1], tp = 0, ta = 0;
    html += '<tr class="' + (n === cur ? 'cur ' : '') + (w.cut ? 'cut' : '') + '"><th><a href="#/plan/' + n + '">' + n + '</a><small>' + E.fmtDate(w.start, { month: 'numeric', day: 'numeric' }) + '</small></th>';
    w.days.forEach(function (d) {
      var pm = dayPlanMi(d), am = dayRun(d), lift = d.parts.some(function (x) { return x.type === 'strength'; }), key = d.parts.some(function (x) { return x.type === 'speed' || x.type === 'long' || x.type === 'race'; });
      tp += pm; ta += am;
      var past = d.date < App.today, cls = (d.date === App.today ? 'td ' : '') + (key ? 'key ' : '') + (past && pm && !am ? 'miss ' : '') + (am ? 'ran ' : '');
      html += '<td class="' + cls + '"><a href="#/day/' + d.date + '"><b>' + (pm ? mi(pm) : lift ? 'G' : '·') + '</b>' + (am ? '<small>' + mi(am) + '</small>' : '') + '</a></td>';
    });
    html += '<td class="tot"><b>' + mi(tp) + '</b>' + (ta ? '<small>' + mi(ta) + '</small>' : '') + '</td></tr>';
  }
  html += '</tbody></table><p class="tiny muted" style="margin-top:8px">Bold: planned miles · <span style="color:var(--green)">green: ran</span> · amber outline: key session · G: gym only · faded: missed.</p></section>';
  html += '<section class="card stack"><h3>Export</h3><p class="small muted">Everything in a spreadsheet file: each day\'s planned sessions, what you ran, time, heart rate, effort and notes.</p><div class="btns"><button class="btn sm primary" data-act="csv-export">Download CSV</button></div></section>';
  return html;
};
function csvCell9(v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
ACTIONS['csv-export'] = function () {
  var p = App.plan; if (!p) return;
  var rows = [['date', 'week', 'phase', 'day', 'planned sessions', 'planned run miles', 'ran miles', 'run time', 'avg HR', 'effort (1-10)', 'feel (1-5)', 'pain', 'lift', 'notes']];
  p.weeks.forEach(function (w) { w.days.forEach(function (d) {
    var l = logOf(d.date), r = l.run && !l.run.skip ? l.run : null;
    rows.push([d.date, w.n, w.phase.name, d.dow, d.parts.filter(function (x) { return x.type !== 'rest'; }).map(function (x) { return x.title + (E.isRun(x) ? ' ' + mi(x.mi) + ' mi' : ''); }).join(' + ') || 'Rest', mi(dayPlanMi(d)), r ? mi(dayRun(d)) : '', r && r.sec ? E.clock(r.sec) : '', r && r.hr || '', r && r.rpe || '', r && r.feel || '', r && r.pain || '', l.lift ? (l.lift.key || 'yes') : '', (r && r.note) || '']);
  }); });
  download('run-plan-' + App.today + '.csv', rows.map(function (r) { return r.map(csvCell).join(','); }).join('\n'), 'text/csv');
  toast('CSV downloaded');
};
var _data9 = VIEWS.data;
VIEWS.data = function () { return '<section class="card stack"><h3>Training log</h3><p class="small muted">Your whole plan as a spreadsheet, and a CSV download.</p><div class="btns"><a class="btn sm" href="#/table">Open training log</a><button class="btn sm" data-act="csv-export">Download CSV</button></div></section>' + _data9(); };

/* ---------- Progress → Performance: point to the deep-dive analysis ---------- */
var _progress9 = VIEWS.progress;
VIEWS.progress = function () {
  var h = _progress9(); if ((App.args[0] || 'overview') !== 'performance') return h;
  var lf = App.an && App.an.loadFocus, x = GX(), ratio = x.status && x.status.acwr;
  var rows = [['Training load', ratio ? 'Load ratio ' + ratio + (ratio > 1.3 ? ': ramping fast' : ratio < 0.8 ? ': lighter than usual' : ': in the safe range') : 'Short-term against long-term load'], ['Aerobic efficiency', 'Distance per heartbeat on easy runs: rising means fitter'], ['Long-run durability', 'How much your heart rate drifts late in long runs'], ['Goal odds', 'Your chance of each goal, from predictions and recent training']];
  var c = '<a class="card anlink" href="#/dash"><div class="spread"><div><div class="eyebrow">Analysis</div><h3 style="margin-top:2px">Training dashboard</h3></div><span class="chev">›</span></div><div class="anrows">' + rows.map(function (r) { return '<div><b>' + r[0] + '</b><span>' + esc(r[1]) + '</span></div>'; }).join('') + '</div></a>';
  var t = h.indexOf('class="tabs"'), i = t > 0 ? h.indexOf('</div>', t) : -1;
  return i > 0 ? h.slice(0, i + 6) + c + h.slice(i + 6) : h + c;
};

/* ---------- smart-training score: rewards the choices that make training work (rest, easy kept easy, key sessions) ---------- */
function smartScore(w) {
  if (!w) return null;
  var logs = st().logs || {}, zz = w.zonesAdj || {}, hrMax = App.an && App.an.hrMax, checks = [];
  w.days.forEach(function (d) {
    if (d.date >= App.today) return;
    var l = logs[d.date] || {}, r = l.run && !l.run.skip ? l.run : null, real = d.parts.filter(function (p) { return p.type !== 'rest'; });
    if (!real.length) checks.push({ ok: !r || (+r.mi || 0) < 1.5, why: 'Rest day ' + (r && +r.mi >= 1.5 ? 'used for a run' : 'respected') + ' (' + d.dow + ')' });
    d.parts.forEach(function (p) {
      if ((p.type === 'easy' || p.type === 'recovery') && r && r.sec && +r.mi > 0) {
        var pc = r.sec / r.mi, ok = zz.E ? pc >= zz.E[0] - 10 : true; if (r.hr && hrMax) ok = ok && r.hr / hrMax <= 0.82;
        checks.push({ ok: ok, why: 'Easy run ' + (ok ? 'kept easy' : 'ran too hard') + ' (' + d.dow + ')' });
      }
      if (p.type === 'speed' || p.type === 'long') checks.push({ ok: partDone(d.date, p), why: p.title + ' ' + (partDone(d.date, p) ? 'done' : 'missed') + ' (' + d.dow + ')' });
    });
  });
  var ran = 0; w.days.forEach(function (d) { if (d.date < App.today) ran += dayRun(d); });
  var planned = 0; w.days.forEach(function (d) { if (d.date < App.today) planned += dayPlanMi(d); });
  if (planned >= 3) checks.push({ ok: ran <= planned * 1.15 + 0.5, why: ran > planned * 1.15 + 0.5 ? 'Ran ' + mi(ran - planned) + ' mi more than planned' : 'Mileage within plan' });
  if (!checks.length) return null;
  var ok = checks.filter(function (c) { return c.ok; }).length;
  return { pct: Math.round(ok / checks.length * 100), ok: ok, n: checks.length, checks: checks };
}
function smartHTML(s, full) {
  if (!s) return '';
  var col = s.pct >= 80 ? 'var(--green)' : s.pct >= 60 ? 'var(--gold)' : 'var(--amber)';
  return '<div class="smart"><div class="sm-ring" style="--p:' + s.pct + ';--c:' + col + '"><b>' + s.pct + '</b></div><div><b>Smart training</b><span class="small muted">' + s.ok + ' of ' + s.n + ' good choices this week' + (s.pct >= 80 ? '. Rest and easy days are training too.' : '') + '</span></div></div>' +
    (full ? '<ul class="smchecks">' + s.checks.map(function (c) { return '<li class="' + (c.ok ? 'ok' : 'no') + '">' + esc(c.why) + '</li>'; }).join('') + '</ul>' : '');
}
var _reportHTML9 = reportHTML;
reportHTML = function (r, full) { return _reportHTML9(r, full) + smartHTML(smartScore(r.w), full) + (full ? '<div class="btns" style="margin-top:12px"><button class="btn sm" data-act="share-week" data-arg="' + jattr({ w: r.w.start }) + '">Share this week</button></div>' : ''); };

/* ---------- share card: a picture of the week for a friend, partner or club ---------- */
ACTIONS['share-week'] = function (a) {
  var w = App.plan && E.weekOf(App.plan, a.w); if (!w) return;
  var r = weekReport(w), s = smartScore(w), cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350;
  var g = cv.getContext('2d'), F = function (sz, wt) { return (wt || 800) + ' ' + sz + 'px system-ui, -apple-system, Segoe UI, sans-serif'; };
  var grd = g.createLinearGradient(0, 0, 1080, 1350); grd.addColorStop(0, '#2a2140'); grd.addColorStop(1, '#0b0b0f'); g.fillStyle = grd; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = '#9a9aa8'; g.font = F(34, 800); g.fillText(('WEEK ' + w.n + ' · ' + w.phase.name).toUpperCase(), 80, 140);
  g.fillStyle = '#fff'; g.font = F(92, 800); g.fillText(E.fmtDate(w.start, { month: 'short', day: 'numeric' }) + ' – ' + E.fmtDate(w.end, { month: 'short', day: 'numeric' }), 80, 250);
  var tiles = [[mi(r.doneMi) + ' mi', 'of ' + mi(r.plannedMi) + ' planned'], [r.doneRuns + ' / ' + r.plannedRuns, 'runs'], [s ? s.pct + '%' : '–', 'smart training']];
  tiles.forEach(function (t, i) { var y = 360 + i * 230; g.fillStyle = 'rgba(255,255,255,.07)'; if (g.roundRect) { g.beginPath(); g.roundRect(80, y, 920, 200, 36); g.fill(); } else g.fillRect(80, y, 920, 200); g.fillStyle = i === 2 ? '#34d399' : '#fff'; g.font = F(96, 800); g.fillText(t[0], 130, y + 120); g.fillStyle = '#9a9aa8'; g.font = F(38, 700); g.fillText(t[1], 130, y + 172); });
  var ev = (st().events || []).filter(function (e) { return e.date > App.today; }).sort(function (x, y) { return x.date < y.date ? -1 : 1; })[0];
  g.fillStyle = '#fff'; g.font = F(44, 700); if (ev) g.fillText(E.diffD(App.today, ev.date) + ' days to ' + (ev.name || E.distOf(ev).label), 80, 1140);
  g.fillStyle = '#6b6b78'; g.font = F(32, 700); g.fillText('Run Plan', 80, 1270);
  cv.toBlob(function (blob) {
    var file = new File([blob], 'week-' + w.n + '.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'My training week' }).catch(function () {});
    else download('week-' + w.n + '.png', blob);
  }, 'image/png');
};
