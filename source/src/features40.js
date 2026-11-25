/* ================= Goal reached: a big celebration, then the next goal =================
   Shown once per goal, the first time the app sees it reached: a lifting goal when your estimated max (or reps) reaches
   the target from sets logged after you set the goal; a race goal when your race result beats the goal time. Then it
   offers to set the next one: a new lifting target about 5% higher, or your next race. */
var CELE_COL = ['var(--gold)', 'var(--green)', 'var(--blue)', 'var(--violet)', 'var(--red)', 'var(--amber)'];
function celeConfetti() { var h = ''; for (var i = 0; i < 70; i++) h += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;background:' + CELE_COL[i % CELE_COL.length] + ';animation-duration:' + (2.6 + Math.random() * 2.8).toFixed(2) + 's;animation-delay:' + (-Math.random() * 4).toFixed(2) + 's;transform:rotate(' + Math.round(Math.random() * 360) + 'deg)"></i>'; return '<div class="cele-conf" aria-hidden="true">' + h + '</div>'; }
var CELE_TROPHY = '<svg class="cele-trophy" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="tg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#e3a91b"/></linearGradient></defs><path d="M34 18h52v22c0 19-11 34-26 37-15-3-26-18-26-37z" fill="url(#tg)"/><path d="M34 26H18c0 16 8 26 20 28M86 26h16c0 16-8 26-20 28" fill="none" stroke="#e3a91b" stroke-width="7" stroke-linecap="round"/><rect x="53" y="76" width="14" height="16" rx="3" fill="#e3a91b"/><rect x="36" y="92" width="48" height="12" rx="4" fill="url(#tg)"/><path d="M60 30l4.8 9.7 10.7 1.6-7.8 7.5 1.8 10.6-9.5-5-9.5 5 1.8-10.6-7.8-7.5 10.7-1.6z" fill="#fff8dc"/></svg>';
/* what's newly reached and not celebrated yet */
function celePending() {
  var seen = (st().prefs || {}).cele || {}, out = [];
  lgList().forEach(function (g) {
    if (g.on === false || seen['lg:' + g.id] || g.doneAt) return;
    var S = lgStat(g); if (!S.cur || S.cur < S.target) return;
    var val = function (x) { return S.reps ? x.sets.reduce(function (a, s) { return Math.max(a, +s.r || 0); }, 0) : x.e1; };
    var hit = S.h.filter(function (x) { return val(x) >= S.target && (!g.at || x.date >= g.at); })[0];
    if (!hit) return;   /* already past it when the goal was set: no party for that */
    var first = S.h.filter(function (x) { return !g.at || x.date >= g.at; })[0];
    out.push({ kind: 'lift', id: 'lg:' + g.id, g: g, S: S, date: hit.date, from: first ? val(first) : null });
  });
  (st().events || []).forEach(function (ev) {
    if (seen['race:' + ev.id] || ev.date > App.today || E.diffD(ev.date, App.today) > 30 || !(E.parseClock(ev.goal) > 0)) return;
    /* the run that was the race: marked as a race, or the one closest to the race distance (not the warm-up) */
    var want = E.distOf(ev).mi, acts = ((Store.garmin && Store.garmin.activities) || []).filter(function (x) { return x.run && x.date === ev.date && Math.abs(x.distM / E.MI_M - want) <= Math.max(0.4, want * 0.05); }).sort(function (x, y) { return (y.race ? 1 : 0) - (x.race ? 1 : 0) || Math.abs(x.distM / E.MI_M - want) - Math.abs(y.distM / E.MI_M - want); });
    var a0 = acts[0]; if (!a0) return; var sec = a0.movS || a0.durS, gl = E.parseClock(ev.goal);
    var r = { mi: a0.distM / E.MI_M, sec: sec, goal: gl, pace: sec / (a0.distM / E.MI_M), hr: a0.avgHR }; if (r.sec > r.goal) return;
    out.push({ kind: 'race', id: 'race:' + ev.id, ev: ev, r: r });
  });
  return out;
}
function celeHTML(c) {
  var body, stats, next, btn;
  if (c.kind === 'lift') {
    var g = c.g, S = c.S, days = g.at ? Math.max(1, E.diffD(g.at, c.date)) : null, nw = S.reps ? Math.max(+g.r, S.cur) + 2 : Math.round(Math.max(+g.w, S.cur) * 1.05 / 5) * 5;
    body = '<h1>Goal reached!</h1><div class="cele-goal">' + esc(lgLabel(g)) + ' ' + esc(lgTargetTxt(g)) + '</div><p class="small muted">' + (S.reps ? 'You did ' + S.cur + ' reps' : 'Your estimated max hit ' + S.cur + ' lb') + ' on ' + fmtD(c.date, { weekday: 'long', month: 'long', day: 'numeric' }) + '. Every session you logged got you here.</p>';
    stats = '<div class="cele-stats"><div><span>Now</span><b>' + S.cur + '</b><small class="tiny muted">' + S.unit + '</small></div>' + (c.from && Math.round(c.from) < S.cur ? '<div><span>Started at</span><b>' + Math.round(c.from) + '</b><small class="tiny muted">' + S.unit + '</small></div>' : '') + (days ? '<div><span>Took</span><b>' + (days < 14 ? days : Math.round(days / 7)) + '</b><small class="tiny muted">' + (days < 14 ? (days === 1 ? 'day' : 'days') : 'weeks') + '</small></div>' : '') + '</div>';
    next = '<div class="cele-next"><b>What\'s next?</b><p class="small muted" style="margin-top:4px">A new target keeps the progress coming. About 5% higher is a good next step: ' + (S.reps ? nw + ' reps' : nw + ' lb') + '.</p></div>';
    btn = '<button class="btn primary" data-act="cele-new" data-arg="' + jattr({ id: c.id, gid: g.id, w: S.reps ? 0 : nw, r: S.reps ? nw : g.r }) + '">Set my next goal</button>';
  } else {
    var ev = c.ev, r = c.r, by = Math.round(r.goal - r.sec);
    body = '<h1>Goal smashed!</h1><div class="cele-goal">' + esc(ev.name || E.distOf(ev).label) + '</div><p class="small muted">You ran ' + E.clock(Math.round(r.sec)) + ', beating your ' + E.clock(r.goal) + ' goal by ' + (by >= 60 ? Math.floor(by / 60) + ' min ' + (by % 60) + ' s' : by + ' s') + '. All those early alarms and easy miles paid off.</p>';
    stats = '<div class="cele-stats"><div><span>Time</span><b>' + E.clock(Math.round(r.sec)) + '</b></div><div><span>Pace</span><b>' + pace(r.pace) + '</b><small class="tiny muted">/mi</small></div>' + (r.hr ? '<div><span>Avg HR</span><b>' + r.hr + '</b></div>' : '') + '</div>';
    var nx = (st().events || []).filter(function (e) { return e.date > App.today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
    next = '<div class="cele-next"><b>What\'s next?</b><p class="small muted" style="margin-top:4px">' + (nx ? 'Next up: ' + esc(nx.name || E.distOf(nx).label) + (nx.goal ? ' with a goal of ' + esc(nx.goal) : ', with no goal time yet') + '. Recover first, then set your sights on it.' : 'Recover for a week or two, then pick your next race and a new goal time.') + '</p></div>';
    btn = nx && !nx.goal ? '<button class="btn primary" data-act="cele-race" data-arg="' + jattr({ id: c.id, ev: nx.id }) + '">Set a goal for ' + esc(nx.name || E.distOf(nx).label) + '</button>' : nx ? '<button class="btn primary" data-act="cele-close" data-arg="' + jattr({ id: c.id, to: '#/goals' }) + '">See my goals</button>' : '<button class="btn primary" data-act="cele-race" data-arg="' + jattr({ id: c.id }) + '">Add my next race</button>';
  }
  return celeConfetti() + '<div class="cele-card" role="dialog" aria-modal="true" aria-label="Goal reached">' + CELE_TROPHY + body + stats + next + '<div class="btns">' + btn + '<button class="btn ghost" data-act="cele-close" data-arg="' + jattr({ id: c.id }) + '">Later</button></div></div>';
}
function celeShow() {
  if (App.celeOpen || !st().profile || App.view === 'setup' || !$('#sheet').hidden) return;
  var c = celePending()[0]; if (!c) return;
  var el = document.getElementById('cele'); if (!el) { el = document.createElement('div'); el.id = 'cele'; el.className = 'cele'; document.body.appendChild(el); }
  el.innerHTML = celeHTML(c); el.hidden = false; App.celeOpen = c.id; document.body.style.overflow = 'hidden';
  Store.edit('prefs', 'cele', function (S) { S.prefs = S.prefs || {}; S.prefs.cele = Object.assign({}, S.prefs.cele || {}); S.prefs.cele[c.id] = App.today; });
  if (c.kind === 'lift') Store.edit('profile', null, function (S) { S.profile.lgoals = (S.profile.lgoals || []).map(function (g) { return g.id === c.g.id ? Object.assign({}, g, { doneAt: c.date }) : g; }); });
  try { var b = el.querySelector('.btn.primary'); if (b) b.focus(); } catch (e) {}
}
function celeHide() { var el = document.getElementById('cele'); if (el) { el.hidden = true; el.innerHTML = ''; } App.celeOpen = null; document.body.style.overflow = ''; }
ACTIONS['cele-close'] = function (a) { celeHide(); if (a && a.to) go(a.to); else render(); };
ACTIONS['cele-new'] = function (a) {
  celeHide();
  var g = lgList().filter(function (x) { return x.id === a.gid; })[0] || {};
  /* the reached goal retires (kept in your history); the new one starts from today */
  Store.edit('profile', null, function (S) { S.profile.lgoals = (S.profile.lgoals || []).map(function (x) { return x.id === a.gid ? Object.assign({}, x, { on: false }) : x; }); });
  App.lgd = { _for: 'new', k: g.k, n: g.n, w: a.w || '', r: a.r || 1, by: '' };
  recompute(); go('#/goals'); setTimeout(function () { openSheet('lgoal', {}); }, 250);
};
ACTIONS['cele-race'] = function (a) { celeHide(); go('#/goals'); setTimeout(function () { openSheet('event', a.ev ? { id: a.ev } : {}); }, 250); };
var _render40 = render;
render = function () { var r = _render40.apply(this, arguments); try { setTimeout(celeShow, 400); } catch (e) {} return r; };
/* reached goals stay on the goals page with a badge; only active goals drive the plan */
var _lgCard40 = lgCard;
lgCard = function () {
  var h = _lgCard40(), done = ((st().profile || {}).lgoals || []).filter(function (g) { return g.doneAt; });
  if (!done.length) return h;
  var c = '<div class="stack" style="margin-top:6px"><b class="tiny muted" style="text-transform:uppercase;letter-spacing:.08em">Reached</b>' + done.map(function (g) { return '<div class="spread small"><span>✓ ' + esc(lgLabel(g)) + ' ' + esc(lgTargetTxt(g)) + '</span><span class="muted">' + fmtD(g.doneAt, { month: 'short', day: 'numeric', year: 'numeric' }) + '</span></div>'; }).join('') + '</div>';
  var i = h.lastIndexOf('</section>'); return h.slice(0, i) + c + h.slice(i);
};
var _lgList40 = lgList;
lgList = function () { return _lgList40().filter(function (g) { return g.on !== false; }); };
/* setting a goal you've already passed: say so instead of throwing a party */
var _save40 = ACTIONS['sheet-save'];
ACTIONS['sheet-save'] = function (a) {
  var isLg = sheetCtx && sheetCtx.kind === 'lgoal'; _save40(a); if (!isLg) return;
  var L = lgList(), g = L[L.length - 1]; if (!g) return;
  var S = lgStat(g); if (S.cur && S.cur >= S.target && !g.doneAt) { Store.edit('profile', null, function (St) { St.profile.lgoals = (St.profile.lgoals || []).map(function (x) { return x.id === g.id ? Object.assign({}, x, { at: App.today }) : x; }); }); toast('You\'re already at ' + S.cur + ' ' + S.unit + '. Try a higher target to keep progressing'); }
};
App.p40 = { celePending: celePending, celeShow: celeShow };
