/* ===================== features 6: week start, weekly preview, smart swaps, readiness offers, load focus, polish ===================== */

/* ---------- week start day ---------- */
function wsOf(p) { return +((p || st().profile || {}).weekStart) || 0; }
var _recompute6 = recompute;
recompute = function () {
  E.setWeekStart(wsOf());
  _recompute6();
  if (!App.plan) return;
  /* yesterday harder than planned? ease today's workout */
  try {
    var y = E.addD(App.today, -1), yd = dayOf(y), why = null;
    var plannedHard = yd && yd.parts.some(function (p) { return p.type === 'speed' || p.type === 'long' || p.type === 'race'; });
    if (yd && !plannedHard) {
      var acts = ((Store.garmin || {}).activities || []).filter(function (a) { return a.date === y && a.run; });
      acts.forEach(function (a) { if (/TEMPO|THRESHOLD|VO2|ANAEROBIC|SPEED/.test(a.teLabel || '')) why = 'Garmin labelled it ' + a.teLabel.toLowerCase().replace(/_/g, ' '); else if (+a.te >= 3.8) why = 'aerobic training effect ' + a.te; });
      var lr = (logOf(y).run || {}); if (!why && +lr.rpe >= 7) why = 'you rated it ' + lr.rpe + '/10';
    }
    var rv = null; try { rv = recoveryLeft(App.today); } catch (e2) { rv = null; }
    App.rec = E.recommend(App.rd, dayOf(App.today), { yesterdayHard: why, recovery: rv });
  } catch (e) { console.error(e); }
};
var _readSettings6 = readSettings;
readSettings = function (form) {
  var p = _readSettings6(form), el = form.elements.weekStart;
  if (el) {
    var k = +el.value, was = wsOf(p);
    if (k !== was) { E.rotateProfile(p, k); E.setWeekStart(k); if (p.startDate) p.startDate = E.monday(p.startDate); App.ui.wsChanged = true; }
  }
  return p;
};
function wsSelect(cur) {
  return '<label class="f">Week starts on<select class="i" name="weekStart">' + E.DOW_LONG_ABS.map(function (d, i) { return '<option value="' + i + '"' + (cur === i ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label>';
}
var _settings6 = VIEWS.settings;
VIEWS.settings = function () {
  var h = _settings6(), p = st().profile || {};
  h = h.replace('<label class="f">Days you can run', wsSelect(wsOf(p)) + '<p class="tiny muted" style="margin-top:-6px">Your weekly review and every week in the plan begin on this day. Your run days and long run day stay on the same weekdays.</p><label class="f">Days you can run');
  h = h.replace('Plan start (Monday)', 'Plan start (first day of a week)');
  return h.replace('<section class="card stack"><h3>App</h3>', '<section class="card stack"><h3>Weekly review</h3><p class="small muted">A push notification the day before each week starts, with a link to preview and rearrange it.</p><div class="btns"><a class="btn sm" href="#/notify">' + (((st().prefs || {}).notify || {}).on ? 'Notifications on · change' : 'Set up notifications') + '</a></div></section><section class="card stack"><h3>App</h3>');
};
ACTIONS['wiz-ws'] = function (a) {
  var z = App.wiz; if (!z) return;
  E.rotateProfile(z.profile, +a.k); E.setWeekStart(+a.k);
  var t = App.today; z.profile.startDate = E.dow(t) >= 3 ? E.addD(E.monday(t), 7) : E.monday(t);
  render();
};
var _wizInit6 = wizInit;
wizInit = function () {
  var prev = (st().prefs || {}).prevProfile || {};
  E.setWeekStart(st().profile ? wsOf() : (+prev.weekStart || 0));
  var z = _wizInit6();
  if (!st().profile && prev.weekStart != null) z.profile.weekStart = +prev.weekStart;
  var t = App.today; if (!st().profile) z.profile.startDate = E.dow(t) >= 3 ? E.addD(E.monday(t), 7) : E.monday(t);
  return z;
};
var _setup6 = VIEWS.setup;
VIEWS.setup = function () {
  var z = App.wiz; if (z) E.setWeekStart(+z.profile.weekStart || 0);
  var h = _setup6();
  if (z && WIZ_STEPS[z.step] === 'days') {
    var cur = +z.profile.weekStart || 0;
    h = h.replace('<div class="card stack"><div class="chips">', '<div class="card stack"><label class="f">My week starts on<div class="chips">' + E.DOW_ABS.map(function (d, i) { return '<button type="button" class="chip" data-act="wiz-ws" data-arg="' + jattr({ k: i }) + '" aria-pressed="' + (cur === i) + '">' + d + '</button>'; }).join('') + '</div></label><label class="f" style="margin-top:4px">Days you can run</label><div class="chips">');
    h = h.replace('Plan starts (a Monday)', 'Plan starts (first day of a week)');
  }
  return h;
};

/* ---------- shared helpers ---------- */
function weekByStart(s) { var p = App.plan; if (!p) return null; return p.weeks.filter(function (w) { return w.start === s; })[0] || E.weekOf(p, s); }
function nextWeek() { var p = App.plan; if (!p) return null; var w = E.weekOf(p, E.addD(App.today, 7 - E.dow(App.today))); return w; }
function partSummary(x) { return E.isRun(x) ? mi(x.mi) + ' mi' : x.min ? x.min + ' min' : x.type === 'strength' ? '45 min' : ''; }
function partPurpose(x) {
  if (x.type === 'long') return 'Easy and steady. The most important run of the week.';
  if (x.type === 'speed') return x.purpose || (x.lf ? 'Training balance session.' : 'Key workout: quality over quantity.');
  if (x.type === 'strength') return typeof liftDesc === 'function' ? liftDesc(x) : '';
  if (x.type === 'recovery') return 'Very easy. Shake out the legs.';
  if (x.type === 'easy') return /strides/i.test(x.title) ? 'Easy with six short, relaxed strides.' : 'Conversational pace.';
  if (x.type === 'cross') return x.note || '';
  if (x.type === 'race') return 'Race day.';
  return '';
}
function opTouches(ops) { return ops.map(function (o) { return o.t === 'ov' ? ['overrides', o.date] : o.t === 'mix' ? ['liftmix', o.key] : ['arr', o.key]; }); }
function applyOps(ops, msg) {
  if (!ops || !ops.length) { if (msg) toast(msg); return; }
  Store.editMany(opTouches(ops), function (S) {
    S.arr = S.arr || {}; S.overrides = S.overrides || {}; S.liftmix = S.liftmix || {};
    ops.forEach(function (o) {
      if (o.t === 'move') { if (o.to === o.key.split('|')[0]) delete S.arr[o.key]; else S.arr[o.key] = o.to; }
      else if (o.t === 'remove') S.arr[o.key] = 'x';
      else if (o.t === 'restore') delete S.arr[o.key];
      else if (o.t === 'mix') { if (o.with) S.liftmix[o.key] = o.with; else delete S.liftmix[o.key]; }
      else if (o.t === 'ov') S.overrides[o.date] = { action: o.action, mi: o.mi || null, reason: o.reason || '', title: o.title || null, at: new Date().toISOString() };
    });
  });
  if (msg) toast(msg);
}
function findPart(w, key) {
  for (var i = 0; i < w.days.length; i++) { var d = w.days[i]; for (var j = 0; j < d.parts.length; j++) { var x = d.parts[j]; if (x.type !== 'rest' && partKeyOf(d, x) === key) return { d: d, p: x }; } }
  return null;
}

/* ---------- alternatives sheet: after removing or missing a session ---------- */
SHEETS.alts = function (a) {
  var c = App.ui.alts; if (!c) return '';
  var head = c.why === 'missed' ? 'You missed ' + esc(c.title) : 'Removed: ' + esc(c.title);
  var lead = c.why === 'missed' ? 'No problem. Here are a few ways to rearrange the rest of the week. Pick one, or leave the week as it is.' : (c.type === 'strength' ? 'Want to cover those muscles another way this week?' : 'Want to rebalance the rest of the week?');
  return '<h3>' + head + '</h3><p class="small muted">' + lead + '</p><div class="altlist">' + c.alts.map(function (o, i) {
    return '<button class="alt" data-act="alt-apply" data-arg="' + jattr({ i: i }) + '"><b>' + esc(o.label) + '</b>' + (o.text ? '<span>' + esc(o.text) + '</span>' : '') + '</button>';
  }).join('') + '</div><div class="btns"><button class="btn ghost" data-act="sheet-close">' + (c.why === 'missed' ? 'Decide later' : 'Leave it removed') + '</button></div>';
};
ACTIONS['alt-apply'] = function (a) {
  var c = App.ui.alts; if (!c) return; var o = c.alts[a.i]; if (!o) return;
  closeSheet(); App.ui.alts = null;
  setTimeout(function () { applyOps(o.ops, o.ops.length ? 'Week updated' : 'Got it'); if (c.why === 'missed') dismissMissed(c.key); }, 40);
};
function openAlts(w, key, why) {
  var f = findPart(w, key); if (!f) return false;
  var alts = E.sessionAlternatives(App.plan, st(), w, f.p, f.d.date, why);
  App.ui.alts = { why: why, key: key, title: f.p.title + ' (' + f.d.dow + ')', type: f.p.type, alts: alts };
  openSheet('alts', {});
  return true;
}
function dismissMissed(key) { Store.edit('prefs', 'missedOk', function (S) { S.prefs = S.prefs || {}; S.prefs.missedOk = S.prefs.missedOk || {}; S.prefs.missedOk[key] = App.today; }); }

/* ---------- weekly preview: clustered drag-and-drop, separate, remove, restore ---------- */
TITLES.preview = 'Week preview'; TABOF.preview = 'plan';
function pvWeek() {
  var p = App.plan; if (!p) return null;
  var a = App.args[0];
  if (a && /^\d{4}-\d{2}-\d{2}$/.test(a)) return weekByStart(a);
  if (a) return p.weeks[E.clamp(+a, 1, p.weeks.length) - 1];
  return nextWeek() || App.week;
}
VIEWS.preview = function () {
  var p = App.plan; if (!p) return setupNeeded();
  var w = pvWeek(); if (!w) return '<section class="card"><h2>That week is outside your plan</h2><div class="btns" style="margin-top:10px"><a class="btn" href="#/plan">See plan</a></div></section>';
  var t = App.today, split = App.ui.pvSplit || {}, sel = App.ui.pvSel || null, zz = w.zonesAdj;
  var long = 0, keys = 0; w.days.forEach(function (d) { d.parts.forEach(function (x) { if (x.type === 'long') long = Math.max(long, x.mi); if (x.type === 'speed') keys++; }); });
  var html = '<div class="pagehead"><div class="eyebrow">Week ' + w.n + ' of ' + p.weeks.length + ' · ' + esc(w.phase.name) + (w.cut ? ' · cutback' : '') + '</div><h1>Your week ahead</h1><p>' + fmtD(w.start, { weekday: 'long', month: 'short', day: 'numeric' }) + ' – ' + fmtD(w.end, { weekday: 'long', month: 'short', day: 'numeric' }) + '</p></div>';
  html += '<div class="pvstats"><div><b>' + mi(w.tot.mi) + '</b><span>miles</span></div><div><b>' + w.tot.runs + '</b><span>runs</span></div><div><b>' + w.tot.lifts + '</b><span>lifts</span></div><div><b>' + (long ? mi(long) : '–') + '</b><span>long run</span></div></div>';
  html += '<p class="tiny muted pvhint">Drag a day\'s sessions to another day, or tap them and then tap a day. Sessions on the same day move together; tap <b>Separate</b> to move them one at a time. ✕ removes a session.</p>';
  html += '<div class="pvdays">' + w.days.map(function (d) {
    var real = d.parts.filter(function (x) { return x.type !== 'rest'; }), past = d.date < t;
    var ks = real.map(function (x) { return partKeyOf(d, x); }), isSplit = !!split[d.date] || real.length < 2, cl = ks.join(',');
    var daySel = sel && sel.from === d.date && sel.cluster;
    var chips = real.map(function (x) {
      var k = partKeyOf(d, x), on = sel && (sel.cluster ? sel.from === d.date : sel.keys[0] === k);
      return '<div class="pvchip t-' + x.type + (on ? ' sel' : '') + (partDone(d.date, x) ? ' dn' : '') + '" data-pvkeys="' + esc(isSplit ? k : cl) + '" data-from="' + d.date + '"' + (isSplit ? '' : ' data-cluster="1"') + '>' +
        '<span class="tico">' + (TICON[x.type] || TICON.easy) + '</span><span class="tx"><b>' + esc(x.title) + '</b><small>' + [partSummary(x), x.type === 'speed' && mainPace(x, zz) ? mainPace(x, zz) + '/mi' : '', x.moved ? 'from ' + E.DOW[E.dow(x.moved)] : '', x.lf ? 'training balance' : '', x.added ? 'added' : ''].filter(Boolean).join(' · ') + '</small><em>' + esc(partPurpose(x)) + '</em></span>' +
        (past ? '' : '<button class="pvx" data-act="pv-rm" data-arg="' + jattr({ key: k, s: w.start }) + '" aria-label="Remove ' + esc(x.title) + '">✕</button>') + '</div>';
    }).join('');
    return '<div class="pvday' + (d.date === t ? ' today' : '') + (past ? ' past' : '') + (daySel ? ' sel' : '') + (real.length ? '' : ' rest') + '" data-pvday="' + d.date + '">' +
      '<div class="pvd"><span>' + d.dow + '</span><b>' + E.pd(d.date).getDate() + '</b></div>' +
      '<div class="pvitems' + (!isSplit ? ' cluster' : '') + '">' + (chips || '<span class="restlbl">Rest day</span>') +
      (real.length > 1 && !past ? '<button class="pvsplit" data-act="pv-split" data-arg="' + jattr({ d: d.date }) + '">' + (split[d.date] ? 'Keep together' : 'Separate') + '</button>' : '') + '</div></div>';
  }).join('') + '</div>';
  /* removed this week */
  if (w.removed && w.removed.length) html += '<div class="sechead"><h2>Removed</h2></div><div class="stack tight">' + w.removed.map(function (r) {
    return '<div class="pvrem t-' + r.p.type + '"><span class="tx"><b>' + esc(r.p.title) + '</b><small>' + E.DOW[E.dow(r.from)] + ' · ' + partSummary(r.p) + '</small></span><button class="btn sm ghost" data-act="pv-alts" data-arg="' + jattr({ key: r.key, s: w.start }) + '">Options</button><button class="btn sm" data-act="pv-restore" data-arg="' + jattr({ key: r.key, type: r.p.type }) + '">Restore</button></div>';
  }).join('') + '</div>';
  /* intensity check */
  var warns = E.weekIntensity(w, st().profile);
  html += '<div class="sechead"><h2>Check</h2></div>' + (warns.length ? '<div class="stack tight">' + warns.map(function (x) { return '<div class="banner ' + (x.level === 'warn' ? 'warn' : 'info') + ' small">' + esc(x.text) + (x.fix ? '<div class="btns" style="margin-top:8px"><button class="btn sm" data-act="edfix" data-arg="' + jattr(x.fix) + '">' + esc(x.fix.label) + '</button></div>' : '') + '</div>'; }).join('') + '</div>' : '<div class="banner small"><b style="color:var(--green)">Looks balanced.</b> Hard days are spaced out, there is a rest day, and no heavy legs before the long run.</div>');
  var lfp = []; w.days.forEach(function (d) { d.parts.forEach(function (x) { if (x.lf) lfp.push(x); }); });
  if (lfp.length) html += '<div class="banner info small" style="margin-top:8px"><b>Training balance.</b> ' + esc(lfp[0].note || '') + ' <a href="#/progress/load">See load focus</a></div>';
  var hasArr = Object.keys(st().arr || {}).some(function (k) { var d0 = k.split('|')[0]; return d0 >= w.start && d0 <= w.end; });
  var reviewed = ((st().prefs || {}).reviewed || {})[w.start];
  html += '<div class="btns pvfoot"><button class="btn primary" data-act="pv-ok" data-arg="' + jattr({ s: w.start }) + '">' + (reviewed ? 'Done' : 'Looks good') + '</button>' + (hasArr ? '<button class="btn ghost" data-act="ed-reset" data-arg="' + jattr({ start: w.start, end: w.end }) + '">Reset to plan</button>' : '') + '</div>';
  var n0 = p.weeks.indexOf(w);
  html += '<div class="pvpager">' + (n0 > 0 ? '<a class="small" href="#/preview/' + p.weeks[n0 - 1].start + '">‹ Week ' + (w.n - 1) + '</a>' : '<span></span>') + (n0 < p.weeks.length - 1 ? '<a class="small" href="#/preview/' + p.weeks[n0 + 1].start + '">Week ' + (w.n + 1) + ' ›</a>' : '<span></span>') + '</div>';
  return html;
};
function pvMove(keys, to, from) {
  if (!keys.length || to === from) { App.ui.pvSel = null; render(); return; }
  App.ui.pvSel = null;
  if (App.ui.pvSplit && App.ui.pvSplit[from] && keys.length > 1) delete App.ui.pvSplit[from];
  applyOps(keys.map(function (k) { return { t: 'move', key: k, to: to }; }), (keys.length > 1 ? 'Moved together to ' : 'Moved to ') + E.DOW_LONG[E.dow(to)]);
}
ACTIONS['pv-split'] = function (a) { App.ui.pvSplit = App.ui.pvSplit || {}; App.ui.pvSplit[a.d] = !App.ui.pvSplit[a.d]; App.ui.pvSel = null; render(); };
ACTIONS['pv-rm'] = function (a, b, e) {
  if (e) e.stopPropagation();
  var w = weekByStart(a.s); if (!w) return;
  var f = findPart(w, a.key); if (!f) return;
  var alts = E.sessionAlternatives(App.plan, st(), w, f.p, f.d.date, 'removed').filter(function (o) { return o.ops.length; });
  applyOps([{ t: 'remove', key: a.key }]);
  App.ui.pvSel = null;
  if (alts.length) { App.ui.alts = { why: 'removed', key: a.key, title: f.p.title + ' (' + f.d.dow + ')', type: f.p.type, alts: alts }; setTimeout(function () { openSheet('alts', {}); }, 80); }
  else toast('Removed');
};
ACTIONS['pv-alts'] = function (a) {
  var w = weekByStart(a.s); if (!w) return;
  var r = (w.removed || []).filter(function (x) { return x.key === a.key; })[0]; if (!r) return;
  App.ui.alts = { why: 'removed', key: a.key, title: r.p.title + ' (' + E.DOW[E.dow(r.from)] + ')', type: r.p.type, alts: E.sessionAlternatives(App.plan, st(), w, r.p, r.from, 'removed').filter(function (o) { return o.ops.length; }) };
  if (!App.ui.alts.alts.length) { toast('Nothing to rebalance: the rest of the week already covers it'); return; }
  openSheet('alts', {});
};
ACTIONS['pv-restore'] = function (a) {
  var ops = [{ t: 'restore', key: a.key }];
  if (a.type === 'strength') Object.keys(st().liftmix || {}).forEach(function (k) { var w = App.plan && E.weekOf(App.plan, a.key.split('|')[0]); if (w && k.split('|')[0] >= w.start && k.split('|')[0] <= w.end) ops.push({ t: 'mix', key: k, with: null }); });
  applyOps(ops, 'Restored');
};
ACTIONS['pv-ok'] = function (a) {
  Store.edit('prefs', 'reviewed', function (S) { S.prefs = S.prefs || {}; S.prefs.reviewed = S.prefs.reviewed || {}; S.prefs.reviewed[a.s] = App.today; var ks = Object.keys(S.prefs.reviewed).sort(); while (ks.length > 12) delete S.prefs.reviewed[ks.shift()]; });
  toast('Week set. Have a good one'); go('#/today');
};
var _edReset6 = ACTIONS['ed-reset'];
ACTIONS['ed-reset'] = function (a) {
  _edReset6(a);
  var ks = Object.keys(st().liftmix || {}).filter(function (k) { var d0 = k.split('|')[0]; return d0 >= a.start && d0 <= a.end; });
  if (ks.length) Store.editMany(ks.map(function (k) { return ['liftmix', k]; }), function (S) { ks.forEach(function (k) { delete S.liftmix[k]; }); });
};
/* pointer drag for the preview: clusters move together unless separated */
(function () {
  var drag = null, just = 0;
  function dayAt(x, y) { var el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('[data-pvday]') : null; }
  document.addEventListener('pointerdown', function (e) {
    if (App.view !== 'preview' || (e.target.closest && e.target.closest('button'))) return;
    var c = e.target.closest && e.target.closest('.pvchip'); if (!c || e.button > 0 || c.closest('.pvday.past')) return;
    var grp = c.dataset.cluster ? $$('.pvchip', c.parentNode) : [c];
    drag = { el: c, grp: grp, keys: c.dataset.pvkeys.split(','), from: c.dataset.from, x: e.clientX, y: e.clientY, on: false, id: e.pointerId };
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.on && Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 8) {
      drag.on = true;
      var box = drag.grp.length > 1 ? drag.el.parentNode : drag.el, r = box.getBoundingClientRect();
      drag.ghost = document.createElement('div'); drag.ghost.className = 'pvghost';
      drag.grp.forEach(function (g) { var cl = g.cloneNode(true); var x = cl.querySelector('.pvx'); if (x) x.remove(); drag.ghost.appendChild(cl); });
      drag.ghost.style.width = Math.min(r.width, 340) + 'px'; drag.dx = Math.min(e.clientX - r.left, 300); drag.dy = e.clientY - drag.el.getBoundingClientRect().top;
      document.body.appendChild(drag.ghost); drag.grp.forEach(function (g) { g.classList.add('lifted'); });
      try { drag.el.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    }
    if (!drag.on) return;
    e.preventDefault();
    drag.ghost.style.transform = 'translate(' + (e.clientX - drag.dx) + 'px,' + (e.clientY - drag.dy) + 'px)';
    $$('.pvday.over').forEach(function (d) { d.classList.remove('over'); });
    var d = dayAt(e.clientX, e.clientY); if (d && !d.classList.contains('past')) d.classList.add('over');
    if (e.clientY < 90) window.scrollBy(0, -12); else if (e.clientY > window.innerHeight - 120) window.scrollBy(0, 12);
  }, { passive: false });
  function end(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dd = drag; drag = null;
    if (!dd.on) return;
    dd.ghost.remove(); dd.grp.forEach(function (g) { g.classList.remove('lifted'); });
    $$('.pvday.over').forEach(function (d) { d.classList.remove('over'); });
    var t = dayAt(e.clientX, e.clientY);
    if (t && !t.classList.contains('past') && t.dataset.pvday !== dd.from) pvMove(dd.keys, t.dataset.pvday, dd.from);
    just = Date.now();
  }
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', function () { if (drag && drag.ghost) { drag.ghost.remove(); drag.grp.forEach(function (g) { g.classList.remove('lifted'); }); } drag = null; });
  document.addEventListener('click', function (e) {
    if (App.view !== 'preview' || Date.now() - just < 300 || e.target.closest('button,a')) return;
    var c = e.target.closest('.pvchip');
    if (c && !c.closest('.pvday.past')) {
      var keys = c.dataset.pvkeys.split(','), s = App.ui.pvSel;
      if (s && s.keys.join(',') === keys.join(',')) App.ui.pvSel = null; else if (s && s.from !== c.dataset.from) { pvMove(s.keys, c.dataset.from, s.from); return; } else App.ui.pvSel = { keys: keys, from: c.dataset.from, cluster: !!c.dataset.cluster };
      render(); return;
    }
    var d = e.target.closest('[data-pvday]');
    if (d && App.ui.pvSel && !d.classList.contains('past')) pvMove(App.ui.pvSel.keys, d.dataset.pvday, App.ui.pvSel.from);
  });
})();

/* ---------- Today: weekly review, missed sessions, rested-and-ready offer ---------- */
function weekDotsHTML(w) {
  return '<div class="pvmini">' + w.days.map(function (d) {
    var real = d.parts.filter(function (x) { return x.type !== 'rest'; });
    return '<div><span>' + d.dow.charAt(0) + '</span>' + (real.length ? real.map(function (x) { return '<i class="t-' + x.type + '" title="' + esc(x.title) + '"></i>'; }).join('') : '<i class="none"></i>') + '</div>';
  }).join('') + '</div>';
}
function reviewCard() {
  var p = App.plan; if (!p) return '';
  var t = App.today, tm = E.addD(t, 1), rv = (st().prefs || {}).reviewed || {}, w = null, lead = '';
  if (E.dow(tm) === 0) { w = E.weekOf(p, tm); lead = 'Next week starts tomorrow'; }
  else if (E.dow(t) === 0) { w = E.weekOf(p, t); lead = 'A new week starts today'; }
  if (w && w.lead && t >= w.start) lead = t === w.start ? 'Your plan starts today' : 'This week';
  if (!w || rv[w.start]) return '';
  var long = 0, keys = []; w.days.forEach(function (d) { d.parts.forEach(function (x) { if (x.type === 'long') long = Math.max(long, x.mi); if (x.type === 'speed') keys.push(x.title.toLowerCase()); }); });
  return '<a class="card reviewcard" href="#/preview/' + w.start + '"><div class="eyebrow">' + lead + '</div><h3>Week ' + w.n + ': ' + mi(w.tot.mi) + ' mi, ' + plural(w.tot.runs, 'run') + ', ' + plural(w.tot.lifts, 'lift') + '</h3>' +
    '<p class="small muted">' + (long ? 'Long run ' + mi(long) + ' mi' : '') + (keys.length ? (long ? ' · ' : '') + keys.slice(0, 2).join(', ') : '') + '</p>' + weekDotsHTML(w) + '<span class="btn sm primary" style="margin-top:10px">Review and rearrange</span></a>';
}
function missedCard() {
  var p = App.plan; if (!p || App.today < p.start) return '';
  var ok = (st().prefs || {}).missedOk || {}, w = App.week; if (!w) return '';
  var ms = E.missedThisWeek(p, st(), App.today).filter(function (m) { var k = partKeyOf(m.day, m.p); return !ok[k] && E.diffD(m.date, App.today) <= 3 && !(((st().profile || {}).setupAt) > m.date); });
  if (!ms.length) return '';
  return '<section class="card missed"><div class="eyebrow">Missed this week</div><div class="stack tight" style="margin-top:8px">' + ms.slice(0, 3).map(function (m) {
    var k = partKeyOf(m.day, m.p);
    return '<div class="mrow t-' + m.p.type + '"><span class="tx"><b>' + esc(m.p.title) + '</b><small>' + m.day.dow + ' · ' + partSummary(m.p) + '</small></span><div class="mbtns"><button class="btn sm ghost" data-act="missed-ok" data-arg="' + jattr({ key: k }) + '">Skip it</button><button class="btn sm primary" data-act="missed-opts" data-arg="' + jattr({ key: k }) + '">Options</button></div></div>';
  }).join('') + '</div></section>';
}
ACTIONS['missed-opts'] = function (a) { if (!openAlts(App.week, a.key, 'missed')) toast('That session already moved'); };
ACTIONS['missed-ok'] = function (a) { dismissMissed(a.key); toast('Skipped. The rest of the week stays as planned'); };
function restOfferCard() {
  var p = App.plan; if (!p) return '';
  var t = App.today, no = (st().prefs || {}).offerNo || {};
  if (no[t]) return '';
  var o = E.restDayOffer(p, st(), Store.garmin, t, App.rd); if (!o) return '';
  var items = []; if (o.add.run) items.push(o.add.run + ' mi easy run'); if (o.add.lift) items.push((o.add.lift.length === 1 ? 'Strength ' + o.add.lift : E.LIFT[o.add.lift].name) + ' (' + E.LIFT[o.add.lift].name.toLowerCase() + ')');
  return '<section class="card offer"><div class="eyebrow" style="color:var(--green)">Readiness ' + App.rd.score + '</div><h3>' + esc(o.title) + '</h3><p class="small muted" style="margin-top:4px">' + esc(o.body) + '</p><ul class="plain small" style="margin-top:6px">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
    '<div class="btns" style="margin-top:10px"><button class="btn sm primary" data-act="offer-yes" data-arg="' + jattr({ add: o.add }) + '">Add to today</button>' + (o.add.lift && o.add.run ? '<button class="btn sm" data-act="offer-yes" data-arg="' + jattr({ add: { run: o.add.run, why: o.add.why } }) + '">Just the run</button>' : '') + '<button class="btn sm ghost" data-act="offer-no">Rest anyway</button></div></section>';
}
ACTIONS['offer-yes'] = function (a) { var t = App.today; Store.edit('overrides', t, function (S) { S.overrides[t] = { action: 'addday', add: a.add, reason: 'rested and ready', at: new Date().toISOString() }; }); toast('Added to today'); };
ACTIONS['offer-no'] = function () { var t = App.today; Store.edit('prefs', 'offerNo', function (S) { S.prefs = S.prefs || {}; S.prefs.offerNo = {}; S.prefs.offerNo[t] = 1; }); toast('Enjoy the rest day'); };
var _today6 = VIEWS.today;
VIEWS.today = function () {
  var h = _today6(); if (!App.plan) return h;
  var add = reviewCard() + missedCard() + restOfferCard();
  if (!add) return h;
  var g = h.indexOf('class="greet"'), i = g >= 0 ? h.indexOf('</h1></div>', g) : -1;
  return i > 0 ? h.slice(0, i + 11) + add + h.slice(i + 11) : add + h;
};

/* ---------- weekly push notifications (ntfy.sh, free) ---------- */
TITLES.notify = 'Weekly review';
function ntfyTopic() { var a = 'abcdefghjkmnpqrstuvwxyz23456789', s = 'runplan-'; for (var i = 0; i < 14; i++) s += a.charAt(Math.floor(Math.random() * a.length)); return s; }
VIEWS.notify = function () {
  var n = Object.assign({ on: false, topic: '', hour: 18 }, (st().prefs || {}).notify || {});
  if (!n.topic) n.topic = App.ui.newTopic || (App.ui.newTopic = ntfyTopic());
  var ws = E.DOW_LONG_ABS[(wsOf() + 6) % 7], gh = Store.mode === 'github';
  return '<div class="pagehead"><h1>Weekly review</h1><p>Every ' + ws + ' evening, a notification asks you to look over the coming week. Tap it to open the preview, then drag sessions to the days that suit you.</p></div>' +
    (gh ? '' : '<div class="banner warn small">Notifications are sent by your Garmin sync, which runs on GitHub. <a href="#/sync">Connect it first</a>.</div>') +
    '<section class="card stack"><div class="step"><span>1</span><div><b>Install ntfy</b><p class="small muted">A free, open-source notification app. No account needed.</p><div class="btns" style="margin-top:6px"><a class="btn sm" href="https://apps.apple.com/app/ntfy/id1625396347" target="_blank" rel="noopener">iPhone</a><a class="btn sm" href="https://play.google.com/store/apps/details?id=io.heckel.ntfy" target="_blank" rel="noopener">Android</a></div></div></div>' +
    '<div class="step"><span>2</span><div><b>Subscribe to your private topic</b><p class="small muted">In ntfy tap +, paste this name, and subscribe. Treat it like a password: anyone with the name could read the reminders (they never include health data).</p><div class="topicrow"><code id="ntTopic">' + esc(n.topic) + '</code><button class="btn sm" data-act="nt-copy">Copy</button></div></div></div>' +
    '<div class="step"><span>3</span><div><b>Pick a time and turn it on</b><div class="grid2" style="margin-top:8px"><label class="f">Send at<select class="i" id="ntHour">' + [8, 12, 16, 17, 18, 19, 20, 21].map(function (h) { return '<option value="' + h + '"' + (+n.hour === h ? ' selected' : '') + '>' + (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM') + '</option>'; }).join('') + '</select></label><label class="f">On<select class="i" disabled><option>' + ws + '</option></select></label></div>' +
    '<label class="check" style="margin-top:8px"><input type="checkbox" id="ntOn"' + (n.on ? ' checked' : '') + '> Send the weekly review</label></div></div></section>' +
    '<div class="btns"><button class="btn primary" data-act="nt-save">Save</button><button class="btn" data-act="nt-test">Send a test</button></div>' +
    '<p class="tiny muted">The reminder goes out with the first hourly sync after the time you pick, so it can arrive up to an hour later. Change which day your week starts in <a href="#/settings">Plan settings</a>.</p>';
};
function ntRead() { return { on: $('#ntOn').checked, topic: $('#ntTopic').textContent.trim(), hour: +$('#ntHour').value, tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') }; }
ACTIONS['nt-copy'] = function () { var t = $('#ntTopic').textContent; try { navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { toast(t); } };
ACTIONS['nt-save'] = function () { var n = ntRead(); Store.edit('prefs', 'notify', function (S) { S.prefs = S.prefs || {}; S.prefs.notify = n; }); toast(n.on ? 'Weekly review on' : 'Saved'); };
ACTIONS['nt-test'] = function () {
  var n = ntRead(), nw = nextWeek(), url = location.href.split('#')[0] + '#/preview/' + (nw ? nw.start : '');
  fetch('https://ntfy.sh/' + encodeURIComponent(n.topic), { method: 'POST', body: 'This is how your weekly review reminder will look. Tap to open next week.', headers: { Title: 'Review next week\'s plan', Click: url, Tags: 'runner' } })
    .then(function (r) { toast(r.ok ? 'Test sent. Check your phone' : 'ntfy said ' + r.status); }).catch(function () { toast('Could not reach ntfy.sh'); });
};
var _you6 = VIEWS.you;
VIEWS.you = function () {
  var h = _you6();
  var link = '<a href="#/notify">Weekly review reminder<span class="v">' + (((st().prefs || {}).notify || {}).on ? 'On' : 'Off') + '</span><span class="chev">›</span></a>';
  var nw = nextWeek(), pv = App.plan && nw ? '<a href="#/preview/' + nw.start + '">Preview next week<span class="v">Week ' + nw.n + '</span><span class="chev">›</span></a>' : '';
  var i = h.indexOf('<a href="#/settings"');
  return i < 0 ? h : h.slice(0, i) + pv + h.slice(i).replace(/(<a href="#\/settings"[\s\S]*?<\/a>)/, '$1' + link);
};

/* ---------- training balance (Garmin load focus) ---------- */
var LF_NAMES = { low: ['Low aerobic', 'Easy and long running. Builds your base.', 'var(--blue)'], high: ['High aerobic', 'Tempo and threshold. Raises your race pace.', 'var(--amber)'], anaerobic: ['Anaerobic', 'Short, fast efforts. Speed and power.', 'var(--violet)'] };
function loadFocusHTML() {
  var lf = App.an && App.an.loadFocus;
  if (!lf) return '<p class="empty">Needs about four weeks of Garmin activities.</p>';
  var max = 0; ['low', 'high', 'anaerobic'].forEach(function (k) { max = Math.max(max, lf.cats[k].load, lf.cats[k].hi); }); max *= 1.12;
  var rows = ['low', 'high', 'anaerobic'].map(function (k) {
    var c = lf.cats[k], n = LF_NAMES[k];
    var st0 = c.state === 'short' ? (c.lo - c.load) + ' below range' : c.state === 'over' ? (c.load - c.hi) + ' above range' : 'In range';
    var pct = function (v) { return (v / max * 100).toFixed(1) + '%'; };
    return '<div class="lfrow"><div class="spread"><b>' + n[0] + ' <span class="lfv">' + c.load + '</span></b><span class="pill ' + (c.state === 'ok' ? 'good' : 'warn') + '">' + st0 + '</span></div>' +
      '<div class="lfbar" role="img" aria-label="' + n[0] + ' ' + c.load + ', target ' + c.lo + ' to ' + c.hi + '"><i class="val" style="width:' + pct(Math.max(c.load, max * 0.01)) + ';background:' + n[2] + '"></i><i class="tzone ' + (c.state === 'ok' ? 'in' : '') + '" style="left:' + pct(c.lo) + ';width:' + pct(c.hi - c.lo) + '"></i><i class="mk" style="left:' + pct(c.load) + ';background:' + n[2] + '"></i></div>' +
      '<div class="lfscale"><span style="left:' + pct(c.lo) + '">' + c.lo + '</span><span style="left:' + pct(c.hi) + '">' + c.hi + '</span></div>' +
      '<div class="tiny muted">' + n[1] + ' The outlined zone is the target.</div></div>';
  }).join('');
  var why = { anaerobic: 'This week gets six short strides on an easy day to top up anaerobic load.', high: 'An easy run this week finishes with a steady progression to top up high aerobic load.', low: 'One workout this week becomes easy running to rebuild your base.', 'anaerobic-excess': 'Intervals become threshold work this week to bring anaerobic load back into range.' }[lf.nudge];
  return '<p class="small muted">' + (lf.src === 'garmin' ? 'From Garmin: ' : 'Estimated from your activities: ') + '4-week load by type. Training across all three keeps fitness improving.' + (lf.status ? ' Status: <b>' + esc(String(lf.status).toLowerCase().replace(/_\d+$/, '').replace(/_/g, ' ')) + '</b>.' : '') + '</p><div class="stack tight" style="margin-top:10px">' + rows + '</div>' +
    (why ? '<div class="banner info small" style="margin-top:10px"><b>Plan adjusted.</b> ' + why + '</div>' : '<p class="small" style="margin-top:10px;color:var(--green)"><b>Balanced.</b> No changes needed.</p>');
}

/* ---------- pace & HR zones as bubbles ---------- */
var ZONE_ROWS = [['REC', 'Recovery', 'Very easy: the day after hard efforts. Could chat all day.', '1–2'], ['E', 'Easy / long', 'Conversational. Full sentences, breathing through the nose at times.', '2–3'], ['S', 'Steady', 'Comfortably brisk. Short sentences.', '4'], ['M', 'Marathon pace', 'Your current marathon fitness. Controlled and rhythmic.', '5'], ['G', 'Goal race pace', '', '5–6'], ['T', 'Threshold', 'Comfortably hard: about the pace you could race for an hour.', '6–7'], ['I', 'Interval', 'About 5K race effort. Hard, a few words at a time.', '8–9'], ['R', 'Strides', 'Fast but relaxed. Smooth form, not a sprint.', '9']];
var _zones6 = VIEWS.zones;
VIEWS.zones = function () {
  var h = _zones6(), p = App.plan; if (!p) return h;
  var w = App.week, zz = w.zonesAdj, hr = zz.hr, an = App.an || {};
  var basis = [];
  if (an.vNow) basis.push('<span class="pill">VDOT ' + an.vNow.toFixed(1) + '</span>');
  if (an.lt && an.lt.pace) basis.push('<span class="pill">Threshold ' + pace(an.lt.pace) + '/mi</span>');
  if (an.vo2 && an.vo2.v) basis.push('<span class="pill">VO2 max ' + an.vo2.v + '</span>');
  if (hr && hr.lthr) basis.push('<span class="pill">LTHR ' + hr.lthr + '</span>');
  var bub = '<div class="zbasis">' + basis.join('') + '</div><p class="tiny muted" style="margin:-4px 2px 4px">These update on their own as your threshold, VO2 max, races and runs show new fitness.</p><div class="zgrid">' + ZONE_ROWS.map(function (r) {
    var z = zz[r[0]], hz = hr && hr[r[0]], feel = r[0] === 'G' ? (w.event ? esc(w.event.name) + ' goal pace.' : 'Your next race goal.') + ' Practise it so race day feels familiar.' : r[2];
    return '<div class="zb" style="--c:' + Z_COLOR[r[0]] + '"><div class="zh"><b>' + r[1] + '</b><span class="zc">' + r[0] + '</span></div>' +
      '<div class="zv"><div><span>Pace /mi</span><b>' + (z ? pace(z[0]) + '–' + pace(z[1]) : '–') + '</b></div><div><span>Heart rate</span><b>' + (hz ? (hz[0] ? hz[0] + '–' : '<') + hz[1] : '–') + '</b></div><div><span>Effort</span><b>' + r[3] + '<small>/10</small></b></div></div>' +
      '<p class="zf">' + feel + '</p></div>';
  }).join('') + '</div>';
  h = h.replace(/<section class="card"><div class="scroll"><table class="t"><thead><tr><th>Zone<\/th>[\s\S]*?<\/section>/, bub);
  /* readings as rows that fit a phone */
  var ms = (st().metrics || []).slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  h = h.replace(/<div class="scroll" style="margin-top:8px"><table class="t"><thead><tr><th>Date<\/th><th>LT pace[\s\S]*?<\/table><\/div>/, '<div class="stack tight" style="margin-top:10px">' + ms.map(function (m) {
    return '<div class="mread"><b>' + E.fmtDate(m.date, { month: 'short', day: 'numeric', year: 'numeric' }) + '</b><div class="mv">' + (m.ltPace ? '<span>LT <b>' + esc(m.ltPace) + '</b>/mi</span>' : '') + (m.ltHr ? '<span>LTHR <b>' + m.ltHr + '</b></span>' : '') + (m.vo2 ? '<span>VO2 <b>' + m.vo2 + '</b></span>' : '') + '</div><button class="pvx" data-act="del-metric" data-arg="' + jattr({ id: m.id }) + '" aria-label="Delete reading">✕</button></div>';
  }).join('') + '</div>');
  return h.replace('<h3>Lactate threshold & VO2max</h3><button class="btn sm primary"', '<h3>Threshold & VO2 max</h3><button class="btn sm primary" style="white-space:nowrap"');
};

/* ---------- dashboard additions ---------- */
var _dash6 = VIEWS.dash;
VIEWS.dash = function () {
  var h = _dash6(); if (!App.plan) return h;
  var card = '<section class="card c6"><div class="spread"><h3>Training balance</h3><span class="tiny muted">last 4 weeks</span></div>' + loadFocusHTML() + '</section>';
  var i = h.lastIndexOf('<section', h.indexOf('<h3>Recent runs'));
  return i > 0 ? h.slice(0, i) + card + h.slice(i) : h.replace(/<\/div>$/, card + '</div>');
};
var _fitness6 = VIEWS.fitness;
if (_fitness6) VIEWS.fitness = function () { var h = _fitness6(); return App.plan ? h + '<section class="card"><h3>Training balance</h3>' + loadFocusHTML() + '</section>' : h; };

/* ---------- coach: today's conversation up front, earlier ones archived by day ---------- */
function localDay(iso) { var d = new Date(iso); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function coachCut() { var c = (st().prefs || {}).coachCut || ''; return c; }
function isCurrentMsg(m) { return localDay(m.t) === App.today && (!coachCut() || m.t > coachCut()); }
function msgHTML(m) {
  return '<div class="msg ' + (m.who === 'me' ? 'me' : 'coach') + '">' + esc(m.text) + '<time>' + new Date(m.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + '</time></div>';
}
var _coach6 = VIEWS.coach;
VIEWS.coach = function () {
  var all = st().coach || [];
  if (App.args[0] === 'archive') return coachArchive(all);
  var cur = all.filter(isCurrentMsg), old = all.length - cur.length, h;
  st().coach = cur;
  try { h = _coach6(); } finally { st().coach = all; }
  var bar = '<div class="coachbar"><span class="small muted">' + (cur.length ? 'Today' : 'New conversation') + '</span><span class="cbtns">' + (cur.length ? '<button class="btn sm ghost" data-act="coach-new">New chat</button>' : '') + (old ? '<a class="btn sm" href="#/coach/archive">Past chats</a>' : '') + '</span></div>';
  return h.replace('<div class="thread" id="thread">', bar + '<div class="thread" id="thread">');
};
function coachArchive(all) {
  var past = all.filter(function (m) { return !isCurrentMsg(m); }), byDay = {};
  past.forEach(function (m) { var d = localDay(m.t); (byDay[d] = byDay[d] || []).push(m); });
  var days = Object.keys(byDay).sort().reverse();
  var html = '<div class="pagehead"><h1>Past chats</h1><p>Earlier conversations with your coach, newest first. Today\'s chat is on the <a href="#/coach">Coach</a> tab.</p></div>';
  if (!days.length) return html + '<p class="empty">No past chats yet.</p>';
  html += '<div class="stack tight">' + days.map(function (d, i) {
    var ms = byDay[d], first = ms.filter(function (m) { return m.who === 'me'; })[0] || ms[0];
    return '<details class="card archday"' + (App.ui.archOpen === d ? ' open' : '') + '><summary><div class="ah"><b>' + E.fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric', year: d.slice(0, 4) !== App.today.slice(0, 4) ? 'numeric' : undefined }) + '</b><span class="tiny muted">' + plural(ms.length, 'message') + '</span></div><p class="small muted">' + esc(first.text.slice(0, 110)) + (first.text.length > 110 ? '…' : '') + '</p></summary><div class="thread">' + ms.map(msgHTML).join('') + '</div></details>';
  }).join('') + '</div>';
  html += '<div class="btns" style="margin-top:12px"><button class="btn ghost sm" data-act="coach-clear">Delete past chats</button></div>';
  return html;
}
ACTIONS['coach-new'] = function () { Store.edit('prefs', 'coachCut', function (S) { S.prefs = S.prefs || {}; S.prefs.coachCut = new Date().toISOString(); }); toast('Started a new chat. The last one is in Past chats'); };
ACTIONS['coach-clear'] = function (a, b) {
  if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Tap again to delete'; b.classList.add('danger'); return; }
  Store.edit('coach', null, function (S) { S.coach = (S.coach || []).filter(isCurrentMsg); });
  toast('Past chats deleted'); go('#/coach');
};

/* ---------- training style: explore a plan, compare it with yours, then change and confirm ---------- */
TITLES.stylepick = 'Plan preview'; TABOF.stylepick = 'plan';
var _altPlans = {};
function planFor(key) {
  var s = st(), sig = key + '|' + s.updatedAt + '|' + App.today;
  if (_altPlans[key] && _altPlans[key].sig === sig) return _altPlans[key].plan;
  var copy = JSON.parse(JSON.stringify(s)); copy.profile.method = key;
  var p = null;
  try { p = E.generate(copy); E.adapt(p, copy, E.analyze(p, copy, Store.garmin)); } catch (e) { console.error(e); p = null; }
  E.setWeekStart(wsOf());
  _altPlans[key] = { sig: sig, plan: p };
  return p;
}
function planStats(p) {
  var t = App.today, fut = p.weeks.filter(function (w) { return w.end >= t; }), build = fut.filter(function (w) { return w.kind === 'build' && w.phase.key !== 'race' && w.phase.key !== 'taper'; });
  var avg = function (f) { return build.length ? build.reduce(function (a, w) { return a + f(w); }, 0) / build.length : 0; };
  var easyMi = 0, allMi = 0;
  fut.forEach(function (w) { w.days.forEach(function (d) { d.parts.forEach(function (x) { if (!E.isRun(x)) return; allMi += x.mi || 0; if (x.type === 'easy' || x.type === 'recovery' || x.type === 'long') easyMi += x.mi || 0; }); }); });
  var cnt = function (w, f) { var n = 0; w.days.forEach(function (d) { d.parts.forEach(function (x) { if (f(x)) n++; }); }); return n; };
  var longest = 0; fut.forEach(function (w) { w.days.forEach(function (d) { d.parts.forEach(function (x) { if (x.type === 'long') longest = Math.max(longest, x.mi || 0); }); }); });
  return {
    peak: Math.max.apply(null, fut.map(function (w) { return w.tot.mi; }).concat([0])),
    gym: avg(function (w) { return cnt(w, function (x) { return E.isRun(x) && x.role === 'gym'; }); }),
    avg: avg(function (w) { return w.tot.mi; }),
    runs: avg(function (w) { return cnt(w, function (x) { return E.isRun(x) && x.role !== 'gym'; }); }),
    quality: avg(function (w) { return cnt(w, function (x) { return x.type === 'speed'; }); }),
    lifts: avg(function (w) { return w.tot.lifts; }),
    long: longest,
    total: allMi, easy: allMi ? easyMi / allMi : 0
  };
}
function sampleWorkouts(p, n) {
  var seen = {}, out = [], t = App.today;
  p.weeks.forEach(function (w) { if (w.end < t) return; w.days.forEach(function (d) { d.parts.forEach(function (x) { if (x.type === 'speed' && !seen[x.title] && out.length < n) { seen[x.title] = 1; out.push({ x: x, w: w }); } }); }); });
  return out;
}
function cmpRow(label, a, b, fmt, unit) {
  var fa = fmt(a), fb = fmt(b), d = b - a, same = fa === fb;
  return '<div class="cmprow"><span class="cl">' + label + '</span><span class="cv">' + fa + '<small>' + (unit || '') + '</small></span><span class="cv new">' + fb + '<small>' + (unit || '') + '</small>' + (same ? '' : '<em class="' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '▲' : '▼') + '</em>') + '</span></div>';
}
function weekLine(d) { var r = d.parts.filter(function (x) { return x.type !== 'rest'; }); return r.length ? r.map(function (x) { return '<span class="t-' + x.type + '"><i></i>' + esc(x.title) + (E.isRun(x) ? ' ' + mi(x.mi) : '') + '</span>'; }).join('') : '<span class="rest">Rest</span>'; }
VIEWS.stylepick = function () {
  var key = App.args[0], m = E.METHODS[key], cur = App.plan, prof = st().profile;
  if (!m || !cur || !prof) return '<section class="card"><p>Plan not found.</p><div class="btns"><a class="btn" href="#/style">Back to styles</a></div></section>';
  var isCur = prof.method === key, alt = isCur ? cur : planFor(key);
  if (!alt) return '<section class="card"><p>Could not build that plan.</p></section>';
  var sug = E.suggestMethods(prof, st().events), s = sug.filter(function (x) { return x.key === key; })[0] || {};
  var A = planStats(cur), B = planStats(alt), cm = cur.method;
  var html = '<div class="pagehead"><div class="eyebrow">' + (isCur ? 'Your current plan' : 'Exploring') + '</div><h1>' + esc(m.name) + '</h1><p>' + esc(m.desc) + '</p></div>';
  html += '<div class="tags sptags"><i>' + (m.focus === 'mixed' ? 'Running + lifting' : 'Run-focused') + '</i><i>' + esc(m.days) + '</i><i>' + (m.quality >= 3 ? 'Up to 3 key sessions' : m.quality === 2 ? '2 key workouts' : m.quality === 1 ? '1 key workout' : 'No hard workouts') + '</i></div>';
  if (s.why && !isCur) html += '<div class="banner ' + (s.stretch ? 'warn' : 'info') + ' small"><b>' + (s.stretch ? 'A stretch for now. ' : 'For you: ') + '</b>' + esc(s.stretch ? 'This asks for about ' + m.minMpw + '+ miles a week. The plan builds up gradually, but a style at your level is safer.' : s.why) + '</div>';
  /* comparison */
  if (!isCur) {
    html += '<div class="sechead"><h2>Compared with your plan</h2></div><section class="card cmp"><div class="cmprow head"><span></span><span class="cv">' + esc(cm.short || cm.name) + '</span><span class="cv new">' + esc(m.short || m.name) + '</span></div>' +
      cmpRow('Typical week', A.avg, B.avg, mi, ' mi') + cmpRow('Peak week', A.peak, B.peak, mi, ' mi') + cmpRow('Runs a week', A.runs, B.runs, function (x) { return (Math.round(x * 2) / 2).toString(); }) + (A.gym || B.gym ? cmpRow('Gym treadmill runs', A.gym, B.gym, function (x) { return (Math.round(x * 2) / 2).toString(); }) : '') +
      cmpRow('Key workouts', A.quality, B.quality, function (x) { return (Math.round(x * 2) / 2).toString(); }, '/wk') + cmpRow('Lifts a week', A.lifts, B.lifts, function (x) { return (Math.round(x * 2) / 2).toString(); }) +
      cmpRow('Longest run', A.long, B.long, mi, ' mi') + cmpRow('Easy running', A.easy * 100, B.easy * 100, function (x) { return Math.round(x) + ''; }, '%') + cmpRow('Miles to race day', A.total, B.total, function (x) { return Math.round(x).toLocaleString(); }) + '</section>';
  }
  /* a week side by side */
  var cw = App.week ? App.week.n : 1, n = Math.min(cur.weeks.length, alt.weeks.length, cw + 4), wa = cur.weeks[n - 1], wb = alt.weeks[n - 1];
  html += '<div class="sechead"><h2>' + (isCur ? 'A typical week' : 'The same week, side by side') + '</h2></div><p class="small muted" style="margin:-8px 2px 8px">Week ' + n + ' · ' + fmtD(wb.start, { month: 'short', day: 'numeric' }) + ' · ' + esc(wb.phase.name) + '</p>';
  html += '<section class="card cmpweek">' + (isCur ? '' : '<div class="cwrow head"><span></span><span>' + esc(cm.short || cm.name) + ' · ' + mi(wa.tot.mi) + ' mi</span><span>' + esc(m.short || m.name) + ' · ' + mi(wb.tot.mi) + ' mi</span></div>') +
    wb.days.map(function (d, i) { var da = wa.days[i], diff = !isCur && weekLine(da) !== weekLine(d); return '<div class="cwrow' + (isCur ? ' one' : '') + (diff ? ' diff' : '') + '"><b>' + d.dow + '</b>' + (isCur ? '' : '<div class="cwc">' + weekLine(da) + '</div>') + '<div class="cwc">' + weekLine(d) + '</div></div>'; }).join('') + '</section>';
  /* what the workouts look like */
  var sw = sampleWorkouts(alt, 4);
  if (sw.length) html += '<div class="sechead"><h2>Workouts you would do</h2></div><div class="stack tight">' + sw.map(function (o) { return '<div class="card swk t-speed"><div class="spread"><b>' + esc(o.x.title) + '</b><span class="tiny muted">from week ' + o.w.n + '</span></div><p class="small muted">' + esc(o.x.purpose || o.x.note || '') + '</p></div>'; }).join('') + '</div>';
  html += '<p class="tiny muted" style="margin-top:12px"><b>Why it works:</b> ' + esc(m.evidence) + ' Inspired by ' + esc(m.inspired) + '. Our own plan, not the published one.</p>';
  html += '<div class="btns pvfoot">' + (isCur ? '<a class="btn" href="#/style">Back to styles</a>' : '<button class="btn primary" data-act="sp-change" data-arg="' + jattr({ key: key }) + '">Change to this plan</button><a class="btn ghost" href="#/style">Keep my plan</a>') + '</div>';
  return html;
};
SHEETS.spconfirm = function (a) {
  var m = E.METHODS[a.key], cm = App.plan.method, alt = planFor(a.key), A = planStats(App.plan), B = planStats(alt);
  var lines = [];
  var d = function (x, y, what, f) { if (f(x) !== f(y)) lines.push(what + ': ' + f(x) + ' → ' + f(y)); };
  var r = function (x) { return (Math.round(x * 2) / 2).toString(); };
  d(A.avg, B.avg, 'Typical week', function (x) { return mi(x) + ' mi'; }); d(A.runs, B.runs, 'Runs a week', r); d(A.quality, B.quality, 'Key workouts a week', r); d(A.lifts, B.lifts, 'Lifts a week', r); d(A.long, B.long, 'Longest run', function (x) { return mi(x) + ' mi'; });
  return '<h3>Switch to ' + esc(m.name) + '?</h3><p class="small muted">From ' + esc(cm.name) + '. Future weeks are rebuilt; your logged runs, lifts, races and readings stay. Any sessions you moved or removed in upcoming weeks are reset.</p>' +
    (lines.length ? '<ul class="plain small">' + lines.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>' : '') +
    '<div class="btns"><button class="btn primary" data-act="sp-accept" data-arg="' + jattr({ key: a.key }) + '">Accept change</button><button class="btn ghost" data-act="sheet-close">Cancel</button></div>';
};
ACTIONS['sp-change'] = function (a) { openSheet('spconfirm', a); };
ACTIONS['sp-accept'] = function (a) {
  var t = App.today, from = (App.plan && App.plan.method.name) || '';
  var ks = Object.keys(st().arr || {}).filter(function (k) { return k.split('|')[0] > t; }), mk = Object.keys(st().liftmix || {}).filter(function (k) { return k.split('|')[0] > t; });
  Store.editMany([['profile', null]].concat(ks.map(function (k) { return ['arr', k]; }), mk.map(function (k) { return ['liftmix', k]; })), function (S) {
    S.profile.method = a.key; ks.forEach(function (k) { delete S.arr[k]; }); mk.forEach(function (k) { delete S.liftmix[k]; });
  });
  _altPlans = {};
  closeSheet();
  setTimeout(function () { toast('Switched from ' + from + ' to ' + E.METHODS[a.key].name); go('#/plan'); }, 60);
};
/* the style list now opens the preview instead of switching */
ACTIONS.method = function (a) { go('#/stylepick/' + a.key); };

/* ---------- workouts on your watch (GitHub job signs in to Garmin Connect and schedules today's sessions) ---------- */
TITLES.watch = 'Watch workouts';
var WATCH_WF = 'watch-workouts.yml';
function watchOn() { return !!(((st().prefs || {}).watch || {}).on); }
function todaySig() {
  var d = App.plan && dayOf(App.today); if (!d) return '';
  return JSON.stringify(d.parts.filter(function (x) { return (E.isRun(x) && x.mi > 0) || x.type === 'strength'; }).map(function (x) { return [x.type, x.title, x.mi || 0, x.steps || null, x.key || null, x.v || 0, x.mix || null, x.lp || 0]; }));
}
var _watchT = null;
function watchDispatch(why) {
  if (Store.mode !== 'github') return Promise.reject(new Error('Connect GitHub first.'));
  return Store.api('/actions/workflows/' + WATCH_WF + '/dispatches', { method: 'POST', body: { ref: Store.conn.branch || 'main' } }).then(function (r) {
    if (r.status === 204) { App.ui.watchSent = Date.now(); if (why) toast(why); return true; }
    if (r.status === 404) throw new Error('The watch workflow is not in your data repository yet.');
    throw new Error('GitHub said ' + r.status);
  });
}
/* wait until your change has been saved to GitHub, then start the job */
function watchSoon() {
  clearTimeout(_watchT);
  var tries = 0;
  (function wait() {
    _watchT = setTimeout(function () {
      if ((Store._saving || Object.keys(Store.touched || {}).length) && tries++ < 20) return wait();
      watchDispatch('Updating today\'s workout on your watch').catch(function (e) { console.warn(e); });
    }, 4000);
  })();
}
var _recompute6w = recompute;
recompute = function () {
  _recompute6w();
  try {
    if (!App.plan || !watchOn() || Store.mode !== 'github') return;
    var cur = { d: App.today, s: todaySig() }, prev = null;
    try { prev = JSON.parse(LS.get('rp-wsig') || 'null'); } catch (e) { prev = null; }
    LS.set('rp-wsig', JSON.stringify(cur));
    if (prev && prev.d === cur.d && prev.s !== cur.s) watchSoon();
  } catch (e) { console.error(e); }
};
ACTIONS['watch-on'] = function (a) {
  var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Chicago';
  Store.edit('prefs', 'watch', function (S) { S.prefs = S.prefs || {}; S.prefs.watch = { on: !!a.on, tz: tz }; });
  toast(a.on ? 'Watch workouts on' : 'Watch workouts off. Ones already sent are removed tonight');
  if (a.on) LS.set('rp-wsig', JSON.stringify({ d: App.today, s: todaySig() }));
};
ACTIONS['watch-now'] = function (a, b) {
  b.disabled = true;
  var go2 = function () { watchDispatch('Sending. Check your watch in a minute or two').catch(function (e) { toast(e.message); }).then(function () { b.disabled = false; setTimeout(function () { App.ui.watchLog = null; render(); }, 60000); }); };
  if (Store._saving || Object.keys(Store.touched || {}).length) { Store.save().then(go2); } else go2();
};
function watchLog() {
  if (App.ui.watchLog !== undefined && App.ui.watchLog !== null) return;
  App.ui.watchLog = 'loading';
  Store.getFile('garmin/watch.json').then(function (f) { App.ui.watchLog = f ? JSON.parse(f.text || '{}') : {}; if (App.view === 'watch') render(); }, function () { App.ui.watchLog = {}; });
}
VIEWS.watch = function () {
  var gh = Store.mode === 'github', on = watchOn(), c = Store.conn || {};
  if (gh) watchLog();
  var lg = App.ui.watchLog && App.ui.watchLog !== 'loading' ? App.ui.watchLog : null;
  var secrets = 'https://github.com/' + encodeURIComponent(c.owner || 'abohn94') + '/' + encodeURIComponent(c.repo || 'run-plan-data') + '/settings/secrets/actions/new';
  var html = '<div class="pagehead"><h1>Workouts on your watch</h1><p>Each night just after midnight, today\'s run and lift go to your Garmin calendar as <b>' + (function () { var p = App.today.split('-'); return +p[1] + '/' + +p[2] + '/' + p[0].slice(2); })() + ' Run</b> and <b>Lift</b>, and yesterday\'s are deleted. Your watch picks them up the next time it syncs with your phone.</p></div>';
  if (!gh) return html + '<div class="banner warn small">This needs your private data repository. <a href="#/sync">Connect it first</a>.</div>';
  html += '<section class="card stack"><div class="spread"><h3>Status</h3><span class="pill ' + (on ? 'good' : '') + '">' + (on ? 'On' : 'Off') + '</span></div>';
  if (lg) {
    var today = (lg.days || {})[App.today] || [];
    html += today.length ? '<div class="stack tight">' + today.map(function (x) { return '<div class="wrow"><b>' + esc(x.name) + '</b><span class="small muted">' + esc(x.title || '') + '</span></div>'; }).join('') + '</div>' : '<p class="small muted">Nothing on the watch for today' + (on ? ' yet.' : '.') + '</p>';
    if (lg.updated) html += '<p class="tiny muted">Last update ' + new Date(lg.updated).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + '</p>';
    if (lg.errors && lg.errors.length) html += '<div class="banner warn small">' + esc(lg.errors[0]) + '</div>';
  } else html += '<p class="small muted">' + (App.ui.watchLog === 'loading' ? 'Checking…' : 'Nothing sent yet.') + '</p>';
  html += '<div class="btns">' + (on ? '<button class="btn primary sm" data-act="watch-now">Send today\'s workouts now</button><button class="btn ghost sm" data-act="watch-on" data-arg="' + jattr({ on: false }) + '">Turn off</button>' : '<button class="btn primary sm" data-act="watch-on" data-arg="' + jattr({ on: true }) + '">Turn on</button>') + '</div></section>';
  html += '<div class="sechead"><h2>One-time setup</h2></div><section class="card stack">' +
    '<div class="step"><span>1</span><div><b>Add your Garmin email</b><p class="small muted">Open <a href="' + secrets + '" target="_blank" rel="noopener">your data repository\'s secrets</a>. Name: <code>GARMIN_EMAIL</code>. Secret: the email you sign in to Garmin Connect with. Tap <b>Add secret</b>.</p></div></div>' +
    '<div class="step"><span>2</span><div><b>Add your Garmin password</b><p class="small muted">Same page, <b>New repository secret</b> again. Name: <code>GARMIN_PASSWORD</code>. Secret: your Garmin password. GitHub keeps secrets encrypted, and no one (including this app) can read them back.</p></div></div>' +
    '<div class="step"><span>3</span><div><b>Turn it on and send a test</b><p class="small muted">Tap <b>Turn on</b> above, then <b>Send today\'s workouts now</b>. After a minute, open the Garmin Connect app: today\'s workouts appear in the calendar and on your watch after it syncs.</p></div></div></section>';
  html += '<section class="card stack"><h3>How it works</h3><ul class="plain small">' +
    '<li><b>Runs</b> carry each step with a pace range: warm-up, intervals and recoveries, cool-down. Your watch alerts you if you drift outside it.</li>' +
    '<li><b>Lifts</b> include only the power moves, main lifts and finishers, with sets, reps, rest and a suggested weight when you have history. No warm-up or stretches.</li>' +
    '<li><b>Changes:</b> when you change today\'s workout here, the new version replaces the old one within about a minute. Open Garmin Connect on your phone to push it to the watch right away.</li>' +
    '<li><b>Cleanup:</b> each night it deletes the workouts it sent on earlier days. It never touches workouts you made yourself.</li></ul>' +
    '<p class="tiny muted" style="margin-top:6px">This signs in to Garmin Connect the way the website does, not through Garmin\'s official API, so a Garmin change can pause it until it\'s updated. Your Garmin data sync isn\'t affected.</p></section>';
  return html;
};
var _you6w = VIEWS.you;
VIEWS.you = function () {
  var h = _you6w(), link = '<a href="#/watch">Workouts on your watch<span class="v">' + (watchOn() ? 'On' : 'Off') + '</span><span class="chev">›</span></a>';
  var i = h.indexOf('<a href="#/notify"');
  return i < 0 ? h : h.slice(0, i) + link + h.slice(i);
};
