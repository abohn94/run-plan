/* ================= features11: calmer screens. Order of operations (act → decide → reference), reference material in
   accordions that remember their state, a grouped dashboard on phones, and motion ================= */

/* ---------- accordions ---------- */
var FOLDS = (function () { try { return JSON.parse(LS.get('rp-folds') || '{}') || {}; } catch (e) { return {}; } })();
function foldOpen(key, dflt) { return FOLDS[key] == null ? !!dflt : !!FOLDS[key]; }
/* a fold whose body sits outside the summary card, so cards never nest */
function foldWrap(key, title, teaser, bodyHTML, dflt) {
  return '<details class="fold" data-fold="' + esc(key) + '"' + (foldOpen(key, dflt) ? ' open' : '') + '><summary><span class="ft"><b>' + esc(title) + '</b>' + (teaser ? '<span>' + esc(teaser) + '</span>' : '') + '</span><i class="fchev" aria-hidden="true"></i></summary><div class="foldbody">' + bodyHTML + '</div></details>';
}
document.addEventListener('toggle', function (e) {
  var d = e.target; if (!d || !d.dataset || !d.dataset.fold) return;
  FOLDS[d.dataset.fold] = d.open;
  /* calendar weeks are remembered for this visit only; everything else is remembered for good */
  try { var keep = {}; Object.keys(FOLDS).forEach(function (k) { if (!/^cal-/.test(k)) keep[k] = FOLDS[k]; }); LS.set('rp-folds', JSON.stringify(keep)); } catch (err) { /* ignore */ }
}, true);
function domOf(h) { var t = document.createElement('template'); t.innerHTML = h; return t.content; }
function htmlOf(nodes) { return nodes.map(function (n) { return n.outerHTML; }).join(''); }
function txt1(el, sel) { var x = el && el.querySelector(sel); return x ? (x.textContent || '').replace(/\s+/g, ' ').trim() : ''; }
function cls(el, re) { return re.test(' ' + (el.className || '') + ' '); }

/* ---------- Today: reference sections fold; the readiness card keeps its live readings behind one tap ---------- */
var _today11 = VIEWS.today;
VIEWS.today = function () {
  var h = _today11();
  try {
    var root = domOf(h), kids = [].slice.call(root.children), out = '';
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i], head = (el.textContent || '').replace(/\s+/g, ' ').trim().toUpperCase();
      if (cls(el, / sechead /) && kids[i + 1]) {
        var title = txt1(el, 'h2') || head, body = kids[i + 1], key = null, teaser = '';
        if (/^TOMORROW/.test(head)) { key = 'today-tomorrow'; var td = dayOf(E.addD(App.today, 1)); teaser = td ? td.parts.map(function (p) { return p.title + (E.isRun(p) && p.mi ? ' · ' + mi(p.mi) + ' mi' : ''); }).join(' + ') : ''; }
        else if (/^FUEL/.test(head)) { key = 'today-fuel'; teaser = (body.textContent.match(/[\d,]+\s*kcal/) || [''])[0].replace(/(\d)\s*kcal/, '$1 kcal'); }
        else if (/^COACH NOTES/.test(head)) { key = 'today-coach'; var n = body.children.length; teaser = n + (n === 1 ? ' note' : ' notes'); title = 'Coach notes'; }
        if (key) { out += foldWrap(key, title.replace(/\s*(See plan|Details|Coach)\s*$/, ''), teaser, body.outerHTML + (txt1(el, 'a') ? '<div class="foldmore">' + (el.querySelector('a') ? el.querySelector('a').outerHTML : '') + '</div>' : ''), false); i++; continue; }
        out += el.outerHTML; continue;
      }
      if (cls(el, / progc /)) { out += foldWrap('today-progress', 'You\'re getting fitter', txt1(el, '.pf b') + ' · ' + txt1(el, '.pf span'), el.outerHTML, false); continue; }
      if (cls(el, / lv-/) && el.querySelector('.livehd')) {
        /* live readings inside the readiness card */
        var live = el.querySelector('.livehd'), rest = [], nx = live; while (nx) { rest.push(nx); nx = nx.nextElementSibling; }
        var bits = [].slice.call(el.querySelectorAll('.livehd ~ .gready > div')).slice(0, 3).map(function (d) { return txt1(d, 'span') + ' ' + txt1(d, 'b'); });
        var det = document.createElement('details'); det.className = 'infold'; det.dataset.fold = 'today-live'; if (foldOpen('today-live', false)) det.setAttribute('open', '');
        det.innerHTML = '<summary><span class="ft"><b>Right now</b><span>' + esc(bits.join(' · ').replace(/Garmin readiness/i, 'Garmin').replace(/Body Battery/i, 'Battery')) + '</span></span><i class="fchev" aria-hidden="true"></i></summary>';
        live.parentNode.insertBefore(det, live); rest.forEach(function (r) { det.appendChild(r); });
        out += el.outerHTML; continue;
      }
      out += el.outerHTML;
    }
    return out;
  } catch (e) { console.warn(e); return h; }
};

/* ---------- This Week: the week card, decisions, then the days ---------- */
var _plan11 = VIEWS.plan;
VIEWS.plan = function () {
  var h = _plan11();
  try {
    var root = domOf(h), kids = [].slice.call(root.children), g = { top: [], week: [], decide: [], days: [], after: [], races: [], season: [], tools: [] };
    kids.forEach(function (el) {
      if (cls(el, / racecard /)) g.races.push(el);
      else if (cls(el, / (calrev|advc) /)) g.decide.push(el);
      else if (el.querySelector && el.querySelector('.pager')) g.week.push(el);
      else if (el.querySelector && el.querySelector('.phasebar, .seasonbars, .rflag') || /^YOUR SEASON/i.test((el.textContent || '').trim())) g.season.push(el);
      else if (el.querySelector && el.querySelector('.dayblock')) g.days.push(el);
      else if (cls(el, / banner /)) g.decide.push(el);
      else if (cls(el, / (addwk|legend) /) || (cls(el, / card /) && el.querySelector('.lockrow'))) g.after.push(el);
      else if (cls(el, / btns /)) g.tools.push(el);
      else (g.days.length ? g.after : g.top).push(el);
    });
    if (!g.week.length || !g.days.length) return h;
    /* This Week is about this week: the week, decisions, the days. Races and the season chart live on the Season tab. */
    var out = htmlOf(g.top) + htmlOf(g.week) + htmlOf(g.decide) + htmlOf(g.days) + htmlOf(g.after);
    return out + htmlOf(g.tools);
  } catch (e) { console.warn(e); return h; }
};

/* races side by side and the season chart, taken from the plan's own rendering so they stay identical */
function seasonTop() {
  try {
    var root = domOf(_plan11()), races = [], season = [];
    [].slice.call(root.children).forEach(function (el) {
      if (cls(el, / racecard /)) races.push(el);
      else if (el.querySelector && (el.querySelector('.phasebar') || /^YOUR SEASON/i.test((el.textContent || '').trim()))) season.push(el);
    });
    return ((races.length ? '<div class="racegrid' + (races.length === 1 ? ' one' : '') + '">' + htmlOf(races) + '</div>' : '') + htmlOf(season)).replace('the bright bar is the week shown below', 'the bright bar is this week').replace('Tap a bar to jump to that week.', 'Tap a bar to open that week.');
  } catch (e) { return ''; }
}
/* ---------- Season (calendar): races and the season chart on top, then the month; each week's detail is an accordion ---------- */
var _calendar11 = VIEWS.calendar;
VIEWS.calendar = function () {
  var h = _calendar11();
  if (App.plan) { var top = seasonTop(), at = h.indexOf('<div class="pagehead'); h = at >= 0 ? h.slice(0, at) + top + h.slice(at) : top + h; }
  try {
    var root = domOf(h), kids = [].slice.call(root.children), out = '', n = 0;
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i], nx = kids[i + 1];
      if (cls(el, / sechead /) && nx && cls(nx, / calweek /)) {
        var title = txt1(el, 'h2'), sub = txt1(el, 'span').replace(/\s*·\s*Edit\s*$/, ''), isNow = !!nx.querySelector('.calday.today'), edit = el.querySelector('a');
        out += foldWrap('cal-' + (App.args[0] || App.today.slice(0, 7)) + '-' + n, title, sub + (isNow ? ' · this week' : ''), nx.outerHTML + (edit ? '<div class="foldmore">' + edit.outerHTML.replace('>Edit<', '>Edit this week ›<') + '</div>' : ''), isNow);
        n++; i++; continue;
      }
      out += el.outerHTML;
    }
    return out;
  } catch (e) { console.warn(e); return h; }
};

/* ---------- Progress → Overview: the long week-by-week table folds ---------- */
var _progress11 = VIEWS.progress;
VIEWS.progress = function () {
  var h = _progress11(); if ((App.args[0] || 'overview') !== 'overview') return h;
  try {
    var root = domOf(h), kids = [].slice.call(root.children), out = '';
    kids.forEach(function (el) {
      var t = txt1(el, 'h3');
      if (/^Week by week/i.test(t)) { var rows = el.querySelectorAll('tbody tr').length; out += foldWrap('prog-weeks', 'Week by week', rows + (rows === 1 ? ' week' : ' weeks') + ' · planned against run', el.outerHTML, false); }
      else out += el.outerHTML;
    });
    return out;
  } catch (e) { return h; }
};

/* ---------- Dashboard on phones: five groups instead of twenty cards ---------- */
var DASH_GROUPS = [
  ['Load and volume', /^(Training load|Weekly miles|Intensity mix|Training balance|Consistency)/i, true],
  ['Fitness and predictions', /^(Aerobic efficiency|VO2 max|Race predictions|Goal odds|Long-run progression|Garmin metrics)/i, false],
  ['Recovery', /^(HRV|Sleep|Shin load|Recovery)/i, false],
  ['Running form', /^(Running dynamics|Durability)/i, false],
  ['Strength', /^(Strength)/i, false],
  ['Recent runs', /^(Recent runs)/i, false]
];
var _dash11 = VIEWS.dash;
VIEWS.dash = function () {
  var h = _dash11(); if (window.innerWidth >= 1024) return h;
  try {
    var root = domOf(h), wrap = root.querySelector('.dash'); if (!wrap) return h;
    var kids = [].slice.call(wrap.children), top = '', groups = DASH_GROUPS.map(function () { return []; }), other = [];
    kids.forEach(function (el) {
      var t = txt1(el, 'h3') || txt1(el, 'h2');
      if (cls(el, / pagehead /) || cls(el, / tiles /) || el.querySelector('.cdstrip') || cls(el, / cdstrip /)) { top += el.outerHTML; return; }
      if (/^Today$/i.test(t)) return;   /* the Today tab already shows this */
      var gi = -1; DASH_GROUPS.forEach(function (g, k) { if (gi < 0 && g[1].test(t)) gi = k; });
      (gi < 0 ? other : groups[gi]).push(el);
    });
    var out = top;
    DASH_GROUPS.forEach(function (g, k) {
      if (!groups[k].length) return;
      var names = groups[k].map(function (el) { return (txt1(el, 'h3') || '').replace(/,.*$/, ''); }).join(' · ');
      out += foldWrap('dash-' + k, g[0], groups[k].length > 1 ? names : '', htmlOf(groups[k]), g[2]);
    });
    if (other.length) out += foldWrap('dash-more', 'More', other.length + ' cards', htmlOf(other), false);
    return '<div class="dash dashm">' + out + '</div>';
  } catch (e) { console.warn(e); return h; }
};
/* a calmer dashboard card on You: three numbers and one line */
dashHero = function () {
  var x = App.extra || {}, chips = [];
  if (x.status && x.status.acwr) chips.push(['Load', x.status.acwr + (x.status.acwr > 1.3 ? ' high' : x.status.acwr < 0.8 ? ' low' : ' safe')]);
  var hv = x.hrv && x.hrv[Object.keys(x.hrv).sort().pop()]; if (hv && hv.status) chips.push(['HRV', String(hv.status).charAt(0) + String(hv.status).slice(1).toLowerCase().replace(/_/g, ' ')]);
  var acts = (Store.garmin && Store.garmin.activities) || [], cut = E.addD(App.today, -28), m4 = acts.filter(function (a) { return a.run && a.date > cut; }).reduce(function (s, a) { return s + a.distM / E.MI_M; }, 0);
  if (m4) chips.push(['Avg week', mi(m4 / 4) + ' mi']);
  return '<a class="dashhero" href="#/dash"><div class="spread"><div><div class="eyebrow">Deep dive</div><h2>Training dashboard</h2></div><span class="dh-go" aria-hidden="true">›</span></div>' +
    (chips.length ? '<div class="dh-row">' + chips.slice(0, 3).map(function (c) { return '<div><b>' + esc(String(c[1])) + '</b><span>' + c[0] + '</span></div>'; }).join('') + '</div>' : '') +
    '<p class="small muted">Load, fitness, recovery, running form and strength trends, week by week.</p></a>';
};

/* ---------- motion: a screen eases in when you arrive (not on background refreshes) ---------- */
var _render11 = render, _lastView = null;
render = function () {
  var key = App.view + '/' + (App.args || []).join('/'), fresh = key !== _lastView; _lastView = key;
  _render11();
  var m = $('#main'); if (!m) return;
  if (fresh) { m.classList.remove('enter'); void m.offsetWidth; m.classList.add('enter'); clearTimeout(render._t); render._t = setTimeout(function () { m.classList.remove('enter'); }, 900); }
};

/* ---------- going back returns you to where you were on the previous screen ---------- */
var NAV = { stack: [location.hash || '#/today'], pos: {}, t: 0 };
window.addEventListener('scroll', function () { var n = Date.now(); if (n - NAV.t < 120) return; NAV.t = n; if (!NAV.lock) NAV.pos[location.hash || '#/today'] = window.scrollY; }, { passive: true });
var _route11 = route;
route = function (keep) {
  var h = location.hash || '#/today', st = NAV.stack, cur = st[st.length - 1], back = st.length >= 2 && st[st.length - 2] === h && h !== cur;
  if (h !== cur) { if (back) st.pop(); else { st.push(h); if (st.length > 50) st.shift(); } }
  NAV.lock = true;
  _route11(keep);
  if (back && keep !== true && NAV.pos[h]) {
    var y = NAV.pos[h]; window.scrollTo(0, y);
    requestAnimationFrame(function () { window.scrollTo(0, y); setTimeout(function () { window.scrollTo(0, y); NAV.lock = false; }, 60); });
  } else setTimeout(function () { NAV.lock = false; }, 150);
};

Object.assign(TITLES, { plan: 'This week', calendar: 'Season' });

/* ---------- App-styled dropdown picker (replaces the OS select menu) ---------- */
var PICK = { el: null, sel: null, touchAt: 0 };
function pickLabel(sel) {
  var lab = sel.closest('label');
  if (lab) { var t = ''; lab.childNodes.forEach(function (n) { if (n.nodeType === 3) t += n.textContent; }); t = t.trim(); if (t) return t; }
  return sel.getAttribute('aria-label') || sel.getAttribute('title') || 'Choose';
}
function pickClose(focus) {
  if (!PICK.el) return;
  PICK.el.remove(); PICK.el = null;
  if (PICK.sel) { PICK.sel.setAttribute('aria-expanded', 'false'); if (focus) try { PICK.sel.focus({ preventScroll: true }); } catch (e) {} }
  PICK.sel = null;
}
function pickOpen(sel) {
  if (sel.disabled) return;
  pickClose(false);
  var rows = '';
  Array.prototype.forEach.call(sel.children, function (ch) {
    if (ch.tagName === 'OPTGROUP') { rows += '<div class="pick-g">' + esc(ch.label) + '</div>'; Array.prototype.forEach.call(ch.children, function (o) { rows += row(o); }); }
    else if (ch.tagName === 'OPTION') rows += row(ch);
  });
  function row(o) {
    if (o.hidden) return '';
    return '<button type="button" class="pick-o" role="option" data-i="' + o.index + '" aria-selected="' + (o.selected ? 'true' : 'false') + '"' + (o.disabled ? ' disabled' : '') + '><span>' + esc(o.textContent) + '</span><span class="pk"></span></button>';
  }
  var d = document.createElement('div');
  d.className = 'pick';
  d.innerHTML = '<div class="pick-card" role="dialog" aria-modal="true" aria-label="' + esc(pickLabel(sel)) + '"><div class="pick-grab"></div><div class="pick-h"><b>' + esc(pickLabel(sel)) + '</b><button type="button" class="pick-x" aria-label="Close">×</button></div><div class="pick-list" role="listbox">' + rows + '</div></div>';
  document.body.appendChild(d);
  PICK.el = d; PICK.sel = sel;
  sel.setAttribute('aria-expanded', 'true');
  var cur = d.querySelector('.pick-o[aria-selected="true"]') || d.querySelector('.pick-o:not(:disabled)');
  if (cur) { cur.scrollIntoView({ block: 'center' }); try { cur.focus({ preventScroll: true }); } catch (e) {} }
  d.addEventListener('click', function (e) {
    if (e.target === d || e.target.closest('.pick-x')) { pickClose(true); return; }
    var b = e.target.closest('.pick-o'); if (!b || b.disabled) return;
    var s = PICK.sel, i = +b.dataset.i, changed = s.selectedIndex !== i;
    s.selectedIndex = i;
    pickClose(true);
    if (changed) { s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  d.addEventListener('keydown', function (e) {
    var list = Array.prototype.slice.call(d.querySelectorAll('.pick-o:not(:disabled)')), k = list.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); pickClose(true); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var n = list[Math.max(0, Math.min(list.length - 1, k + (e.key === 'ArrowDown' ? 1 : -1)))]; if (n) n.focus(); }
    else if (e.key === 'Tab') { e.preventDefault(); }
  });
}
function pickTarget(e) { var t = e.target; return t && t.tagName === 'SELECT' && !t.multiple && t.classList.contains('i') ? t : null; }
document.addEventListener('touchstart', function (e) {
  if (!pickTarget(e)) return; var t = e.touches[0]; PICK.tx = t.clientX; PICK.ty = t.clientY;
}, { passive: true, capture: true });
document.addEventListener('touchend', function (e) {
  var s = pickTarget(e); if (!s) return;
  var t = e.changedTouches[0]; if (t && Math.abs(t.clientX - PICK.tx) + Math.abs(t.clientY - PICK.ty) > 12) return;
  e.preventDefault(); PICK.touchAt = Date.now(); pickOpen(s);
}, { passive: false, capture: true });
document.addEventListener('mousedown', function (e) {
  var s = pickTarget(e); if (!s || e.button !== 0) return;
  e.preventDefault();
  if (Date.now() - PICK.touchAt < 700) return;
  pickOpen(s);
}, true);
document.addEventListener('keydown', function (e) {
  var s = pickTarget(e); if (!s || PICK.el) return;
  if (e.key === 'Enter' || e.key === ' ' || (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) || e.key === 'F4') { e.preventDefault(); pickOpen(s); }
}, true);
window.addEventListener('hashchange', function () { pickClose(false); });

/* ---------- App-styled suggestion list for text fields (replaces the OS datalist popup) ---------- */
function dlOpts(inp) { var d = document.getElementById(inp.dataset.dl); return d ? Array.prototype.map.call(d.options, function (o) { return o.value; }).filter(Boolean) : []; }
function dlHide(inp) { var p = inp && inp._dlPop; if (p) { p.remove(); inp._dlPop = null; inp.setAttribute('aria-expanded', 'false'); } }
function dlShow(inp) {
  var all = dlOpts(inp), q = inp.value.trim().toLowerCase();
  var hits = q ? all.filter(function (v) { return v.toLowerCase().indexOf(q) >= 0; }) : all;
  if (q && hits.length === 1 && hits[0].toLowerCase() === q) hits = [];
  if (!hits.length) { dlHide(inp); return; }
  hits.sort(function (a, b) { return (a.toLowerCase().indexOf(q) === 0 ? 0 : 1) - (b.toLowerCase().indexOf(q) === 0 ? 0 : 1); });
  var p = inp._dlPop;
  if (!p) { p = document.createElement('div'); p.className = 'dl-pop'; p.setAttribute('role', 'listbox'); (inp.closest('label') || inp).insertAdjacentElement('afterend', p); inp._dlPop = p; p._inp = inp; }
  inp.setAttribute('aria-expanded', 'true');
  p.innerHTML = hits.slice(0, 40).map(function (v) {
    var i = q ? v.toLowerCase().indexOf(q) : -1;
    var t = i >= 0 ? esc(v.slice(0, i)) + '<mark>' + esc(v.slice(i, i + q.length)) + '</mark>' + esc(v.slice(i + q.length)) : esc(v);
    return '<button type="button" class="dl-o" role="option" data-v="' + esc(v) + '">' + t + '</button>';
  }).join('');
}
document.addEventListener('focusin', function (e) { var t = e.target; if (t && t.dataset && t.dataset.dl) dlShow(t); });
document.addEventListener('input', function (e) { var t = e.target; if (t && t.dataset && t.dataset.dl) dlShow(t); });
document.addEventListener('focusout', function (e) { var t = e.target; if (t && t.dataset && t.dataset.dl) setTimeout(function () { if (document.activeElement !== t) dlHide(t); }, 120); });
document.addEventListener('keydown', function (e) { var t = e.target; if (t && t.dataset && t.dataset.dl && e.key === 'Escape' && t._dlPop) { e.preventDefault(); e.stopPropagation(); dlHide(t); } }, true);
document.addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('.dl-pop')) e.preventDefault(); }, true);
document.addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('.dl-o'); if (!b) return;
  var p = b.parentNode, inp = p._inp; if (!inp) return;
  inp.value = b.dataset.v; dlHide(inp);
  inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
  dlHide(inp);
});

/* ---------- App-styled confirm dialog (replaces the browser's "site says" box) ---------- */
/* askUI({ title, text, ok, cancel, danger }) -> Promise<boolean>
   ASK(opts, fn, self, args): synchronous guard for actions. First call opens the dialog and returns false;
   confirming re-runs fn with the same arguments, and that run gets true. */
var ASKS = { pass: null };
function askUI(o) {
  return new Promise(function (resolve) {
    var prev = document.querySelector('.askd'); if (prev) prev.remove();
    var d = document.createElement('div');
    d.className = 'askd';
    d.innerHTML = '<div class="askd-card" role="alertdialog" aria-modal="true" aria-labelledby="askd-t">' + (o.icon ? '<div class="askd-ico ' + (o.danger ? 'bad' : '') + '">' + o.icon + '</div>' : '') +
      '<h3 id="askd-t">' + esc(o.title) + '</h3>' + (o.text ? '<p class="small muted">' + esc(o.text) + '</p>' : '') +
      '<div class="askd-btns"><button type="button" class="btn" data-a="0">' + esc(o.cancel || 'Cancel') + '</button><button type="button" class="btn ' + (o.danger ? 'dangerfill' : 'primary') + '" data-a="1">' + esc(o.ok || 'OK') + '</button></div></div>';
    document.body.appendChild(d);
    var prevFocus = document.activeElement;
    var done = function (v) { d.remove(); document.removeEventListener('keydown', key, true); try { prevFocus && prevFocus.focus && prevFocus.focus({ preventScroll: true }); } catch (e) {} resolve(v); };
    var key = function (e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(false); } else if (e.key === 'Tab') { e.preventDefault(); var b = d.querySelectorAll('button'); (document.activeElement === b[1] ? b[0] : b[1]).focus(); } };
    document.addEventListener('keydown', key, true);
    d.addEventListener('click', function (e) { if (e.target === d) return done(false); var b = e.target.closest('[data-a]'); if (b) done(b.dataset.a === '1'); });
    setTimeout(function () { var b = d.querySelector('[data-a="1"]'); if (b) b.focus({ preventScroll: true }); }, 30);
  });
}
function ASK(o, fn, self, args) {
  if (ASKS.pass === fn) { ASKS.pass = null; return true; }
  askUI(o).then(function (ok) { if (!ok) return; ASKS.pass = fn; try { fn.apply(self, args); } finally { ASKS.pass = null; } });
  return false;
}
