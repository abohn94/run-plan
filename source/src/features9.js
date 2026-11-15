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
