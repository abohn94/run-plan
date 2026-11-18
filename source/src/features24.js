/* ================= One Progress tab: the training dashboard and the old Progress tabs, combined
   Overview · Running · Training load · Recovery & strength. Every card from both survives; where two showed the same
   thing, the fuller one stays (race predictions with 10 mile and the gap; the Health cards with ranges and your normal). ================= */
var _prog24 = VIEWS.progress;
var PTABS = [['overview', 'Overview'], ['running', 'Running'], ['load', 'Load'], ['recovery', 'Recovery'], ['strength', 'Strength']];
var PT_ALIAS = { performance: 'running', workouts: 'running', health: 'recovery', dash: 'overview' };
/* render one of the old tabs (or the raw dashboard) and split it into units: a heading or toggle travels with the card under it */
function oldUnits(which) {
  var html, saveA = App.args, saveAfter = App.after;
  try {
    if (which === 'dash') html = _dash11();
    else { App.args = [which]; html = _prog24(); }
  } catch (e) { console.warn(e); html = ''; }
  App.args = saveA; App.after = saveAfter;
  var box = document.createElement('div'); box.innerHTML = html;
  var root = which === 'dash' ? (box.querySelector('.dash') || box) : box, out = [], pend = '';
  Array.prototype.forEach.call(root.children, function (el) {
    var c = ' ' + (el.className || '') + ' ';
    if (/ (pagehead|tabs) /.test(c) && which !== 'dash') return;
    if (which === 'workouts') { out.length ? out[0].html += el.outerHTML : out.push({ t: 'Activities', html: el.outerHTML, el: el }); return; }
    if (/ sechead /.test(c) || (/ seg /.test(c) && el.tagName === 'DIV')) { pend += el.outerHTML; return; }
    var t = ((el.querySelector('summary b') || el.querySelector('h2') || el.querySelector('h3') || el.querySelector('.eyebrow') || {}).textContent || '').trim();
    if (/ pagehead /.test(c)) t = '#head'; else if (/ tiles /.test(c)) t = '#tiles'; else if (el.querySelector('.cdstrip') || / cdstrip /.test(c)) t = '#countdown';
    if (/ formlink /.test(c)) t = '#formlink';
    if (pend && !/^#/.test(t)) { var ph = document.createElement('div'); ph.innerHTML = pend; var sh = ph.querySelector('.sechead h2, .sechead h3'); if (sh) t = sh.textContent.trim() + (t ? ' / ' + t : ''); }
    if (!t) t = ((el.querySelector('h4') || {}).textContent || '').trim();
    out.push({ t: t, html: pend + el.outerHTML, el: el, c: c }); pend = '';
  });
  return out;
}
function pickU(units, re, used) { var u = units.filter(function (x) { return !used[x.html] && re.test(x.t); })[0]; if (u) used[u.html] = 1; return u ? u.html : ''; }
/* the dashboard's cards link to the old Progress tabs; inside the merged tab those links point at itself */
function noSelfLinks(h) { return h.replace(/<a [^>]*href="#\/(progress[^"]*|you|dash)"[^>]*>[^<]*<\/a>/g, ''); }
function wrapC(h) { return /class="[^"]*\bc(4|6|8|12)\b/.test(h.slice(0, 200)) ? h : '<div class="c12">' + h + '</div>'; }
/* the merged tiles: the dashboard's six, plus last 30 days and the year; each opens its section */
function mergedTiles(dashTiles, progTiles) {
  var box = document.createElement('div'); box.innerHTML = dashTiles || '<div class="tiles"></div>';
  var t = box.firstElementChild; if (!t) return '';
  var p = document.createElement('div'); p.innerHTML = progTiles || '';
  Array.prototype.forEach.call(p.querySelectorAll('.tile'), function (x) { var lab = ((x.querySelector('span') || {}).textContent || '').toLowerCase(); if (/last 30 days|^\d{4} total/.test(lab)) t.appendChild(x.cloneNode(true)); });
  var dest = function (lab) { return /readiness/.test(lab) ? 'recovery' : /fitness|vo2|total/.test(lab) ? 'running' : 'load'; };
  Array.prototype.forEach.call(t.querySelectorAll('.tile'), function (x) { var lab = ((x.querySelector('span') || {}).textContent || '').toLowerCase(); x.classList.add('tlink'); x.setAttribute('role', 'link'); x.setAttribute('tabindex', '0'); x.dataset.act = 'nav'; x.dataset.arg = JSON.stringify({ to: '#/progress/' + dest(lab), replace: true }); });
  t.classList.remove('k6'); t.classList.add('k8', 'c12');
  return t.outerHTML;
}
/* the dashboard's lift table, as one stacked row per lift so the last sets, best e1RM and next step all fit a phone */
function liftSteps(h) {
  if (!h) return h;
  var box = document.createElement('div'); box.innerHTML = h;
  var tb = box.querySelector('table'); if (!tb) return h;
  var rows = Array.prototype.map.call(tb.querySelectorAll('tbody tr'), function (tr) { var c = tr.querySelectorAll('td'); return c.length >= 4 ? '<div class="lstep"><div class="spread"><b>' + c[0].innerHTML + '</b><span class="pill">' + c[3].innerHTML + '</span></div><div class="tiny muted">Last ' + c[1].innerHTML + ' · best e1RM <b>' + c[2].innerHTML + '</b> lb</div></div>' : ''; }).join('');
  var wrap = tb.closest('.scroll') || tb; wrap.outerHTML = '<div class="lsteps">' + rows + '</div>';
  var hd = box.querySelector('h3'); if (hd) hd.textContent = 'Next step for each lift';
  return box.innerHTML;
}
VIEWS.progress = function () {
  if (!App.plan) return setupNeeded();
  var tab = App.args[0] || 'overview'; tab = PT_ALIAS[tab] || tab; if (!PTABS.some(function (x) { return x[0] === tab; })) tab = 'overview';
  var D = oldUnits('dash'), used = {}, parts = [];
  var head = pickU(D, /^#head$/, used);
  head = head.replace(/<h1>[^<]*<\/h1>/, '<h1>Progress</h1>');
  var seg = '<div class="tabs ptabs c12" role="group" aria-label="Progress section">' + PTABS.map(function (x) { return '<button data-act="nav" data-arg="' + jattr({ to: '#/progress/' + x[0], replace: true }) + '" aria-pressed="' + (tab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
  var jump = { workouts: 'p-acts' }[App.args[0]];
  App.after = function () { var b = document.querySelector('.ptabs [aria-pressed="true"]'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'center' }); var j = jump && document.getElementById(jump); if (j) setTimeout(function () { j.scrollIntoView({ block: 'start' }); }, 60); };
  var add = function (h) { if (h) parts.push(wrapC(noSelfLinks(h))); };
  var rest = function (units, skip) { units.forEach(function (u) { if (used[u.html] || (skip && skip.test(u.t))) return; used[u.html] = 1; add(u.html); }); };
  var SKIP_D = /^(Today|HRV and resting heart rate|Sleep)$/i;                 /* Today has its own tab; the Health cards are the fuller versions */
  if (tab === 'overview') {
    var O = oldUnits('overview'), ou = {};
    add(pickU(D, /^#countdown$/, used));
    parts.push(mergedTiles(pickU(D, /^#tiles$/, used), pickU(O, /^#tiles$/, ou)));
    add(pickU(O, /proof it/i, ou)); add(pickU(O, /^Weekly miles$/i, ou));
    D.forEach(function (u) { if (/^#/.test(u.t)) used[u.html] = 1; });
  }
  if (tab === 'running') {
    var P = oldUnits('performance'), O2 = oldUnits('overview'), W = oldUnits('workouts'), R = oldUnits('running'), pu = {}, o2 = {}, ru = {};
    [/^This (week|month)\b/i].forEach(function (re) { add(pickU(P, re, pu)); });
    add(pickU(D, /^Race predictions/i, used)); add(pickU(D, /^Goal odds/i, used)); add(pickU(D, /^Garmin metrics/i, used));
    add(pickU(D, /^VO2 max trend/i, used)); add(pickU(P, /^VO2 max & threshold/i, pu));
    add(pickU(D, /^Aerobic efficiency/i, used)); add(pickU(P, /^Easy pace and heart rate/i, pu)); add(pickU(D, /^Long-run progression/i, used));
    add(pickU(D, /^Intensity mix/i, used)); add(pickU(D, /^Consistency/i, used));
    add(pickU(R, /^#formlink$/, ru)); add(pickU(D, /^Running dynamics/i, used));
    add(pickU(P, /^Personal records|^1K/i, pu)); add(pickU(O2, /^This build vs/i, o2)); add(pickU(O2, /^Records and milestones|Best sessions|Milestones/i, o2));
    add(pickU(P, /^Total distance|All-time/i, pu)); add(pickU(P, /^Month by month/i, pu));
    add(pickU(D, /^Recent runs/i, used));
    if (W[0]) add('<div class="sechead" id="p-acts"><h2>All activities</h2></div>' + W[0].html);
    add(pickU(P, /^All runs/i, pu));
    rest(P.filter(function (u) { return !/^Training dashboard$|^Fitness, fatigue and form$/i.test(u.t); }));
  }
  if (tab === 'load') {
    var P2 = oldUnits('performance'), O3 = oldUnits('overview'), p2 = {}, o3 = {};
    add(pickU(D, /^Training load/i, used)); add(pickU(P2, /^Fitness, fatigue and form/i, p2)); add(pickU(D, /^Training balance/i, used));
    add(pickU(D, /^Weekly miles, last/i, used)); add(pickU(O3, /^Week by week/i, o3));
  }
  if (tab === 'recovery') {
    var H = oldUnits('health');
    rest(H.filter(function (u) { return !/^VO2 max$/i.test(u.t); }));
    add(pickU(D, /^Shin load/i, used));
  }
  if (tab === 'strength') {
    var S = oldUnits('strength');
    add(liftSteps(pickU(D, /^Strength$/i, used)));
    rest(S);
  }
  /* anything new that appears on the dashboard later lands in its best-fit section instead of disappearing */
  if (tab === 'running') rest(D, /^#|^(Today|HRV and resting heart rate|Sleep|Shin load|Strength|Training load|Training balance|Weekly miles, last)/i);
  return '<div class="dash pdash">' + head + seg + parts.join('') + '</div>';
};
/* one Progress tab: You (the dashboard) folds into it */
TITLES.progress = TITLES.progress || 'Progress';
VIEWS.you = function () { App.args = [App.args[0] || 'overview']; return VIEWS.progress(); };
VIEWS.dash = VIEWS.you;
TABOF.you = 'progress'; TABOF.dash = 'progress'; TOP.dash = 1;
var _render24 = render;
render = function () { _render24(); document.body.classList.toggle('wide', App.view === 'progress' || App.view === 'you' || App.view === 'dash'); };
document.addEventListener('keydown', function (e) { var t = e.target; if ((e.key === 'Enter' || e.key === ' ') && t && t.classList && t.classList.contains('tlink')) { e.preventDefault(); t.click(); } });
App.p24 = { oldUnits: oldUnits };
