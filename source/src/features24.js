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
/* recent runs: the latest three, the rest one tap away */
function recentFew(h) {
  if (!h) return h;
  var box = document.createElement('div'); box.innerHTML = h;
  var list = box.querySelector('.runbubs'); if (!list || list.children.length <= 3) return h;
  var extra = Array.prototype.slice.call(list.children, 3), n = extra.length;
  var more = document.createElement('details'); more.className = 'rbmore';
  more.innerHTML = '<summary>Show ' + n + ' more</summary><div class="runbubs"></div>';
  extra.forEach(function (e) { more.lastElementChild.appendChild(e); });
  list.after(more);
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
  App.after = function () { var b = document.querySelector('.ptabs [aria-pressed="true"]'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest', inline: 'center' }); var j = jump && document.getElementById(jump); if (j) { var dd = j.closest('details'); if (dd) dd.open = true; setTimeout(function () { j.scrollIntoView({ block: 'start' }); }, 60); } };
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
  /* a collapsible folder for the long tail: named, with what's inside, remembered open or closed */
  var fold = function (key, title, teaser, list, open) {
    var body = list.filter(Boolean).map(function (h) { return wrapC(noSelfLinks(h)); }).join(''); if (!body) return;
    parts.push('<div class="c12">' + foldWrap('pg-' + key, title, teaser, '<div class="dash pdin">' + body + '</div>', !!open) + '</div>');
  };
  if (tab === 'running') {
    var P = oldUnits('performance'), O2 = oldUnits('overview'), W = oldUnits('workouts'), R = oldUnits('running'), pu = {}, o2 = {}, ru = {};
    /* first: this week, how fast you could race, how the last runs went */
    add(pickU(P, /^This (week|month)\b/i, pu));
    add(pickU(D, /^Race predictions/i, used)); add(pickU(D, /^Goal odds/i, used));
    add(recentFew(pickU(D, /^Recent runs/i, used)));
    fold('run-fit', 'Fitness trends', 'VO2 max · aerobic efficiency · easy pace vs heart rate · long runs · Garmin metrics', [pickU(D, /^VO2 max trend/i, used), pickU(P, /^VO2 max & threshold/i, pu), pickU(D, /^Aerobic efficiency/i, used), pickU(P, /^Easy pace and heart rate/i, pu), pickU(D, /^Long-run progression/i, used), pickU(D, /^Garmin metrics/i, used)]);
    fold('run-habits', 'How you train', 'Intensity mix · consistency', [pickU(D, /^Intensity mix/i, used), pickU(D, /^Consistency/i, used)]);
    fold('run-form', 'Running form', 'Cadence, bounce and ground contact', [pickU(R, /^#formlink$/, ru), pickU(D, /^Running dynamics/i, used)]);
    fold('run-recs', 'Records and milestones', 'Personal records · best sessions · all-time stats', [pickU(P, /^Personal records|^1K/i, pu), pickU(O2, /^This build vs/i, o2), pickU(O2, /^Records and milestones|Best sessions|Milestones/i, o2), pickU(P, /^Total distance|All-time|#tiles/i, pu)]);
    var leftover = []; P.forEach(function (u) { if (!pu[u.html] && !/^Training dashboard$|^Fitness, fatigue and form$|^All runs/i.test(u.t)) { pu[u.html] = 1; leftover.push(u.html); } });
    D.forEach(function (u) { if (!used[u.html] && !/^#|^(Today|HRV and resting heart rate|Sleep|Shin load|Strength|Training load|Training balance|Weekly miles, last)/i.test(u.t)) { used[u.html] = 1; leftover.push(u.html); } });
    fold('run-hist', 'Run history', 'Month by month · every activity · the full run table', [pickU(P, /^Month by month/i, pu), W[0] ? '<div class="sechead" id="p-acts"><h2>All activities</h2></div>' + W[0].html : '', pickU(P, /^All runs/i, pu)].concat(leftover));
  }
  if (tab === 'load') {
    var P2 = oldUnits('performance'), O3 = oldUnits('overview'), p2 = {}, o3 = {};
    add(pickU(D, /^Training load/i, used)); add(pickU(D, /^Training balance/i, used));
    fold('load-ff', 'Fitness, fatigue and form', 'Are you building or fresh?', [pickU(P2, /^Fitness, fatigue and form/i, p2)]);
    fold('load-miles', 'Mileage history', 'Last 26 weeks · week by week', [pickU(D, /^Weekly miles, last/i, used), pickU(O3, /^Week by week/i, o3)]);
  }
  if (tab === 'recovery') {
    var H = oldUnits('health'), hu = {};
    /* first: readiness and the three numbers that move it */
    add(pickU(H, /^Readiness/i, hu)); add(pickU(H, /^HRV/i, hu)); add(pickU(H, /^Resting heart rate/i, hu)); add(pickU(H, /^Sleep$/i, hu));
    add(pickU(D, /^Shin load/i, used));
    var more = []; H.forEach(function (u) { if (!hu[u.html] && !/^VO2 max$/i.test(u.t)) { hu[u.html] = 1; more.push(u.html); } });
    fold('rec-more', 'More body metrics', 'Sleep score · Body Battery · stress · steps · weight', more);
  }
  if (tab === 'strength') {
    var S = oldUnits('strength'), su = {};
    add(pickU(S, /^$/, su));                                                  /* start a workout · 1RM calculator */
    add(liftSteps(pickU(D, /^Strength$/i, used)));
    add(pickU(S, /^Top estimated 1RM/i, su));
    fold('str-1rm', 'Your 1RMs', 'Calculated and entered, per lift', [pickU(S, /^Your 1RMs/i, su)]);
    fold('str-charts', 'Lift progress', 'Progressive overload · graph', [pickU(S, /^Progressive overload/i, su), pickU(S, /^Graph/i, su)]);
    var sm = []; S.forEach(function (u) { if (!su[u.html]) { su[u.html] = 1; sm.push(u.html); } });
    fold('str-vol', 'Volume and sessions', 'Weekly volume · gym sessions · planned vs done', sm);
  }
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
