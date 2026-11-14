/* ================= Features 5: lift bubbles -> preview -> sectioned workout -> summary; fresh-plan reset ================= */

Object.assign(TITLES, { lift: 'Workout preview', wksummary: 'Workout summary' });
Object.assign(TABOF, { lift: 'plan', wksummary: 'plan' });

/* ---------- what kind of entry an exercise needs ---------- */
var WT_EQ = /barbell|dumbbell|kettlebell|machine|trap|landmine|plates?\b|weighted/i;
var NO_WT = /band|medicine ball|^none$|^wall$|pull-up bar|^bench$|^box|^step$|anchor|open space|rings/i;
function needsWeight(n) {
  var e = EXDB[n];
  if (e) return WT_EQ.test(e.eq || '') || /^Cable machine$/.test(e.eq || '');
  return /barbell|dumbbell|kettlebell|machine|cable|weighted|landmine|leg press|trap-bar|pulldown|goblet/i.test(n);
}
function isTimed(rx) { return /\d+\s*×\s*\d+\s*(s|m)\b/.test(String(rx || '')) || /\d+\s*(s|m)\s*\/?(side|leg)?$/.test(String(rx || '').trim()); }
function kindOf(n, rx) { var w = needsWeight(n); if (isTimed(rx)) return w ? 'timedw' : 'timed'; return w ? 'wt' : 'bw'; }

/* ---------- brief description for the bubble ---------- */
function liftModOf(p) { return E.liftMod(p.key, p.v); }
function liftDesc(p) {
  var m = liftModOf(p); if (!m) return '';
  var subs = st().subs || {}, lead = { UB: 'Upper body, core and hips', HT: 'Bodyweight, anywhere', ACT: 'Short and light to stay sharp' }[p.key] || (m.focus || '').split(':')[0];
  var heavy = m.blocks.filter(function (b) { return /heavy|main|push|pull|legs/i.test(b.t); }).reduce(function (a, b) { return a.concat(b.ex); }, []).filter(function (x) { return !x.wu; }).slice(0, 3).map(function (x) { return (subs[x.n] || x.n).replace(/^(Barbell|Dumbbell|Standing barbell|Seated dumbbell) /, '').toLowerCase(); });
  return lead + (heavy.length ? ': ' + heavy.join(', ') : '');
}
function liftBubble(p, date, opts) {
  opts = opts || {};
  var l = logOf(date).lift, has = l && l.ex && Object.keys(l.ex).length, draft = wkLoad(date);
  var m = liftModOf(p), min = p.min || (m ? m.blocks.reduce(function (a, b) { return a + b.min; }, 0) : 45);
  return '<a class="liftbub t-strength' + (has ? ' done' : '') + (opts.hero ? ' hero' : '') + '" href="#/lift/' + date + '/' + p.key + '">' + (has ? '<span class="tick" aria-label="Done">✓</span>' : '') +
    '<span class="tico">' + TICON.strength + '</span><div class="sh"><span class="lab">' + (opts.hero ? 'Today · ' : '') + 'Strength · ' + min + ' min · ' + E.LIFT_PHASES[p.lp].k + ' loads</span><span class="ti">' + esc(p.title) + '</span><span class="ds">' + esc(liftDesc(p)) + '</span>' +
    (draft && !has ? '<span class="flag">Workout in progress</span>' : p.changed ? '<span class="flag">Adjusted</span>' : '') + '</div><span class="chev">›</span></a>';
}
/* bubbles everywhere a lift appears */
var _sess5 = sessHTML;
sessHTML = function (p, date, zz, opts) { return p.type === 'strength' ? liftBubble(p, date) : _sess5(p, date, zz, opts); };
var _hero5 = heroHTML;
heroHTML = function (x, date, zz) { return x.type === 'strength' ? liftBubble(x, date, { hero: true }) : _hero5(x, date, zz).replace(/<a class="btn primary block" href="#\/workout\/[^"]*">[^<]*<\/a>$/, ''); };
var _partDetail5 = partDetail;
partDetail = function (x, date, w, zz, l, idx) {
  if (x.type !== 'strength') return _partDetail5(x, date, w, zz, l, idx);
  var rec = l.lift, has = rec && rec.ex && Object.keys(rec.ex).length;
  return liftBubble(x, date) + (has ? '<div class="banner small"><b>Done:</b> ' + esc((rec.sec ? mmss(rec.sec) : rec.min ? rec.min + ' min' : 'Strength') + ' · ' + plural(Object.keys(rec.ex).length, 'lift') + (rec.vol ? ' · ' + lbs(rec.vol) + ' lifted' : '')) + ' <a href="#/wksummary/' + date + '">Summary ›</a></div>' : rec && rec.src === 'garmin' ? '<div class="banner small">Garmin logged a ' + (rec.min || '') + '-minute strength session. <a href="#/workout/' + date + '">Add your sets</a></div>' : '');
};

/* ---------- preview ---------- */
function liftPartOn(date, key) {
  var d = dayOf(date), p = d ? d.parts.filter(function (x) { return x.type === 'strength' && (!key || x.key === key); })[0] : null;
  if (!p && key && E.LIFT[key]) { var w = App.plan && E.weekOf(App.plan, date); p = { type: 'strength', key: key, v: E.LIFT_VARS[key] ? E.liftVar(w ? w.n : 1) : 0, lp: (App.week && App.week.days.map(function (dd) { return dd.parts.filter(function (x) { return x.type === 'strength'; })[0]; }).filter(Boolean)[0] || { lp: 0 }).lp, title: (key.length === 1 ? 'Strength ' + key + ': ' : '') + E.LIFT[key].name }; }
  return p;
}
VIEWS.lift = function () {
  var date = App.args[0] || App.today, p = liftPartOn(date, App.args[1]);
  if (!p) return '<div class="card">No lift planned that day. <a href="#/strength">Pick a session</a></div>';
  var m = liftModOf(p), lp = p.lp, subs = st().subs || {}, l = logOf(date).lift, has = l && l.ex && Object.keys(l.ex).length, draft = wkLoad(date);
  var adv = date === App.today && App.rd ? E.liftAdvice(Object.assign({ _date: date }, p), App.rd, E.weekOf(App.plan, date)) : null;
  if (adv) lp = adv.lp;
  var total = m.blocks.reduce(function (a, b) { return a + b.min; }, 0);
  var html = '<div class="pagehead"><div class="eyebrow">' + E.fmtDate(date, { weekday: 'long', month: 'short', day: 'numeric' }) + '</div><h1 style="font-size:1.8rem">' + esc(p.title) + '</h1><p>' + esc(m.focus) + '</p></div>';
  html += '<div class="grid3"><div class="metric"><span>Time</span><b>' + total + ' min</b></div><div class="metric"><span>Loads</span><b>' + E.LIFT_PHASES[lp].k + '</b></div><div class="metric"><span>Sections</span><b>' + m.blocks.length + '</b></div></div>';
  if (adv && adv.notes.length) html += '<div class="banner warn small">' + adv.notes.map(esc).join(' ') + '</div>';
  html += '<p class="small muted">' + esc(E.LIFT_PHASES[lp].d) + '</p>';
  html += m.blocks.map(function (b, i) {
    return '<section class="card"><div class="spread"><h3><span class="secno">' + (i + 1) + '</span>' + esc(i === 0 && b.ex.every(function (x) { return x.wu; }) ? 'Warm-up: ' + b.t.toLowerCase() : b.t) + '</h3><span class="small muted">' + b.min + ' min</span></div>' + b.ex.map(function (e) {
      var n = subs[e.n] || e.n, k = e.wu ? 'wu' : kindOf(n, e.rx[lp]);
      return '<div class="ex"><div class="n">' + exBtn(n, subs[e.n] ? { orig: e.n } : null) + (subs[e.n] ? '<div class="tiny muted">your swap for ' + esc(e.n) + '</div>' : '') + '</div><div class="rx">' + esc(e.rx[lp]) + '<div class="tiny muted">' + (k === 'wt' || k === 'timedw' ? 'weighted' : k === 'wu' ? 'stretch' : 'bodyweight') + '</div></div></div>';
    }).join('') + '</section>';
  }).join('');
  html += '<div class="stickybtns">' + (has ? '<a class="btn primary" href="#/wksummary/' + date + '">View summary</a><a class="btn" href="#/workout/' + date + '">Edit sets</a>' : '<a class="btn primary block" href="#/workout/' + date + '/' + p.key + '">' + (draft ? 'Resume workout' : 'Start workout') + '</a>') + '</div>';
  html += '<div class="btns"><label class="f small" style="flex:1">Do a different session<select class="i" id="lift-swap">' + Object.keys(E.LIFT).map(function (k) { return '<option value="' + k + '"' + (k === p.key ? ' selected' : '') + '>' + (k.length === 1 ? 'Strength ' + k + ': ' : '') + E.LIFT[k].name + '</option>'; }).join('') + '</select></label></div>';
  return html;
};
document.addEventListener('change', function (e) { if (e.target.id === 'lift-swap') go('#/lift/' + (App.args[0] || App.today) + '/' + e.target.value); });

/* ---------- the workout, section by section ---------- */
function buildWorkout(date, key) {
  var logs = st().logs || {}, l = (logs[date] || {}).lift, p = liftPartOn(date, key) || liftPartOn(date, null);
  key = key || (p && p.key) || (l && l.key) || 'A';
  var adv = date === App.today && p && App.rd ? E.liftAdvice(Object.assign({ _date: date }, p), App.rd, E.weekOf(App.plan, date)) : null;
  var lp = adv ? adv.lp : p ? p.lp : (l && l.lp) || 0;
  var wkOf = App.plan ? E.weekOf(App.plan, date) : null;
  var v = p && p.key === key && p.v != null ? p.v : E.liftVar(wkOf ? wkOf.n : 1);
  var wk = { ver: 2, date: date, key: key, v: v, lp: lp, start: Date.now(), sec: 0, ex: [], secs: [], rpe: (l && l.rpe) || null, note: (l && l.note) || '', edit: !!(l && l.ex && Object.keys(l.ex).length) };
  if (wk.edit) {
    wk.secs = [{ t: 'Your lifts', min: 0 }];
    Object.keys(l.ex).forEach(function (n) { var mod = findEx(n), ss = setsOf(l.ex[n]), w = ss.some(function (s) { return +s.w > 0; }) || needsWeight(n); wk.ex.push({ n: n, sec: 0, kind: w ? 'wt' : 'bw', rx: mod ? mod.rx[lp] : '', rest: mod ? restSec(mod.rest[lp]) : 90, cue: mod ? mod.cue : '', sets: ss.map(function (s) { return { w: s.w || '', r: s.r || '', done: true }; }) }); });
    return wk;
  }
  var m = E.liftMod(key, v), subs = st().subs || {};
  m.blocks.forEach(function (b, bi) {
    var wu = b.ex.every(function (x) { return x.wu; });
    wk.secs.push({ t: wu && bi === 0 ? 'Warm-up' : b.t, sub: wu && bi === 0 ? b.t : '', min: b.min });
    b.ex.forEach(function (x) {
      if (x.wu) { wk.ex.push({ n: x.n, sec: bi, kind: 'wu', rx: x.rx[lp], cue: x.cue, done: false, sets: [] }); return; }
      var n = subs[x.n] || x.n, rx = x.rx[lp], tg = rxParse(rx), k = kindOf(n, rx), o = k === 'wt' ? overload(n, rx, date, lp) : null, prev = liftHistory(n, date).pop(), sets = [];
      for (var i = 0; i < tg.sets; i++) {
        var pv = prev && (prev.sets[i] || prev.sets[prev.sets.length - 1]);
        sets.push({ w: k === 'wt' || k === 'timedw' ? (o && o.w ? o.w : pv && pv.w ? pv.w : '') : '', r: k === 'timed' || k === 'timedw' ? '' : tg.reps, done: false });
      }
      wk.ex.push({ n: n, orig: subs[x.n] ? x.n : null, sec: bi, kind: k, rx: rx, rest: restSec(x.rest[lp]), cue: subs[x.n] ? exInfo(n).tips[0] : x.cue, sets: sets });
    });
  });
  return wk;
}
newWorkout = function (date, key) { return buildWorkout(date, key); };
function curSecEx(w) { return w.ex.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return o.x.sec === w.cur; }); }
function secDone(w, s) { var xs = w.ex.filter(function (x) { return x.sec === s; }); return xs.length && xs.every(function (x) { return x.kind === 'wu' ? x.done : x.sets.length && x.sets.every(function (q) { return q.done; }); }); }
function prevBox(x, i, w) {
  var h = liftHistory(x.n, w.date).slice(-3).reverse(), o = overload(x.n, x.rx, w.date, w.lp), orm = ormOf(x.n);
  var open = App.ui.hx && App.ui.hx[i];
  return '<button class="hxbtn" data-act="hx" data-arg="' + jattr({ i: i }) + '" aria-expanded="' + !!open + '"><span>Previous & recommended</span><b>' + (o.w ? 'Try ' + o.w + ' lb × ' + o.r : h.length ? 'Last: ' + h[0].sets.map(function (s) { return s.w + '×' + s.r; }).slice(0, 2).join(', ') : 'First time') + '</b><span class="chev">' + (open ? '▾' : '▸') + '</span></button>' +
    (open ? '<div class="hxbox"><div class="spread"><b class="small">Recommended</b>' + (o.w ? '<button class="btn sm" data-act="wk-apply" data-arg="' + jattr({ i: i, w: o.w, r: o.r }) + '">Use ' + o.w + ' lb</button>' : '') + '</div><p class="small">' + esc(o.text) + (orm.use && o.w ? ' <span class="muted">About ' + Math.round(o.w / orm.use * 100) + '% of your ' + orm.use + ' lb 1RM.</span>' : '') + '</p>' + plateauHTML(x.n, o.plateau) +
      (h.length ? '<div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Date</th><th>Sets (lb × reps)</th><th class="num">e1RM</th></tr></thead><tbody>' + h.map(function (s) { return '<tr><td>' + fmtD(s.date, { month: 'short', day: 'numeric' }) + '</td><td class="small">' + s.sets.map(function (q) { return (q.w ? q.w + '×' : '') + q.r; }).join(', ') + '</td><td class="num">' + s.e1 + '</td></tr>'; }).join('') + '</tbody></table></div>' : '<p class="small muted">No history yet: this session sets your baseline.</p>') + '</div>' : '');
}
function exCard(x, i, w) {
  var head = '<div class="spread"><div style="min-width:0"><h3>' + exBtn(x.n, { i: i }) + '</h3><div class="tiny muted">' + esc(x.rx || '') + (x.rest ? ' · rest ' + mmss(x.rest) : '') + '</div></div>' + (x.kind === 'wu' ? '' : '<button class="iconbtn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'exmenu', i: i }) + '" aria-label="More">⋯</button>') + '</div>';
  if (x.kind === 'wu') return '<button class="wurow' + (x.done ? ' dn' : '') + '" data-act="wu-chk" data-arg="' + jattr({ i: i }) + '"><span class="ck">' + (x.done ? '✓' : '') + '</span><span class="sh"><b>' + esc(x.n) + '</b><small>' + esc(x.rx.replace(/^1×/, '')) + ' · ' + esc(x.cue) + '</small></span></button>';
  var cue = x.cue ? '<p class="tiny muted" style="margin-top:4px">' + esc(x.cue) + '</p>' : '';
  var addrm = '<div class="btns"><button class="btn sm ghost" data-act="wk-set" data-arg="' + jattr({ i: i, d: 1 }) + '">+ Set</button>' + (x.sets.length > 1 ? '<button class="btn sm ghost" data-act="wk-set" data-arg="' + jattr({ i: i, d: -1 }) + '">− Set</button>' : '') + '</div>';
  if (x.kind === 'timed' || x.kind === 'timedw') {
    return '<section class="card excard" id="ex' + i + '">' + head + cue + (x.kind === 'timedw' ? '<label class="f small" style="margin-top:8px">Weight (lb)<input class="i" data-wk="' + i + '|0|w" type="number" inputmode="decimal" step="2.5" value="' + esc(x.sets[0] ? x.sets[0].w : '') + '" placeholder="lb"></label>' : '') +
      '<div class="setchips">' + x.sets.map(function (s, j) { return '<button class="setchip' + (s.done ? ' dn' : '') + '" data-act="wk-done" data-arg="' + jattr({ i: i, j: j }) + '">Set ' + (j + 1) + (s.done ? ' ✓' : '') + '</button>'; }).join('') + '</div></section>';
  }
  var prev = liftHistory(x.n, w.date).pop();
  var rows = x.sets.map(function (s, j) {
    return '<tr class="' + (s.done ? 'dn' : '') + '"><td>' + (j + 1) + '</td>' + (x.kind === 'wt' ? '<td><input class="i" data-wk="' + i + '|' + j + '|w" type="number" inputmode="decimal" step="2.5" min="0" value="' + esc(s.w) + '" placeholder="lb"></td>' : '') + '<td><input class="i" data-wk="' + i + '|' + j + '|r" type="number" inputmode="numeric" min="0" value="' + esc(s.r) + '"></td><td><button class="setchk" data-act="wk-done" data-arg="' + jattr({ i: i, j: j }) + '" aria-pressed="' + !!s.done + '" aria-label="Set done">✓</button></td></tr>';
  }).join('');
  return '<section class="card excard" id="ex' + i + '">' + head + cue +
    '<table class="sets ' + x.kind + '"><thead><tr><th>Set</th>' + (x.kind === 'wt' ? '<th>Weight (lb)</th>' : '') + '<th>Reps</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
    (x.kind === 'wt' ? prevBox(x, i, w) : prev ? '<p class="tiny muted" style="margin-top:6px">Last time: ' + prev.sets.map(function (q) { return q.r; }).join(', ') + ' reps. Beat it by a rep or two when it feels easy.</p>' : '') + addrm + '</section>';
}
VIEWS.workout = function () {
  var date = App.args[0] || App.today, key = App.args[1];
  if (!App.wk || App.wk.date !== date || App.wk.ver !== 2 || (key && App.wk.key !== key && !App.wk.touched)) {
    var dr = wkLoad(date);
    App.wk = dr && dr.ver === 2 && (!key || dr.key === key || dr.touched) ? dr : buildWorkout(date, key);
    if (App.wk.cur == null) App.wk.cur = 0;
    if (!App.wk.edit && !dr) wkSave();
  }
  var w = App.wk, m = E.liftMod(w.key, w.v), last = w.secs.length - 1, cs = w.secs[w.cur];
  var vol = wkVolume(w);
  var html = '<div class="wkhead"><div class="spread"><div style="min-width:0"><div class="eyebrow">' + (w.edit ? 'Editing saved workout' : esc(m ? (w.key.length === 1 ? 'Strength ' + w.key + ': ' : '') + m.name : 'Workout')) + '</div><b class="sectitle">' + (w.secs.length > 1 ? (w.cur + 1) + ' of ' + w.secs.length + ' · ' : '') + esc(cs.t) + '</b></div>' + (w.edit ? '' : '<div class="clock" id="wkClock">' + mmss((Date.now() - w.start) / 1000) + '</div>') + '</div>' +
    (w.secs.length > 1 ? '<div class="secdots">' + w.secs.map(function (s, i) { return '<button data-act="wk-sec" data-arg="' + jattr({ s: i }) + '" class="' + (i === w.cur ? 'on ' : '') + (secDone(w, i) ? 'dn' : '') + '" aria-label="' + esc(s.t) + '"><i></i><span>' + esc(s.t.replace('Muscle-specific finishers', 'Finishers').replace('Dynamic power', 'Power').replace('Heavy compounds', 'Heavy')) + '</span></button>'; }).join('') + '</div>' : '') +
    '<div class="tiny muted" style="margin-top:4px">Volume so far <b id="wkVol">' + lbs(vol) + '</b></div></div>';
  if (cs.sub || cs.min) html += '<p class="small muted">' + (w.cur === 0 && cs.sub ? esc(cs.sub) + ': tick each one off as you go. No weights needed. ' : '') + (cs.min ? 'About ' + cs.min + ' minutes.' : '') + '</p>';
  if (w.cur === 0 && cs.t === 'Warm-up' && !secDone(w, 0)) html += '<div class="btns"><button class="btn sm ghost" data-act="wu-all">Mark all done</button></div>';
  html += curSecEx(w).map(function (o) { return exCard(o.x, o.i, w); }).join('');
  if (w.cur === last) html += '<div class="btns"><button class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'exadd' }) + '">+ Add exercise</button></div>' +
    '<section class="card stack"><h3>How hard was it?</h3><div class="rpe">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function (n) { return '<button type="button" data-act="wk-rpe" data-arg="' + jattr({ v: n }) + '" aria-pressed="' + (w.rpe === n) + '">' + n + '</button>'; }).join('') + '</div><label class="f">Notes<input class="i" id="wk-note" value="' + esc(w.note || '') + '"></label></section>';
  html += '<div class="secnav">' + (w.cur > 0 ? '<button class="btn" data-act="wk-sec" data-arg="' + jattr({ s: w.cur - 1 }) + '">‹ Back</button>' : '<button class="btn ghost" data-act="wk-discard">' + (w.edit ? 'Cancel' : 'Quit') + '</button>') +
    (w.cur < last ? '<button class="btn primary" data-act="wk-sec" data-arg="' + jattr({ s: w.cur + 1 }) + '">Next: ' + esc(w.secs[w.cur + 1].t) + ' ›</button>' : '<button class="btn primary" data-act="wk-end">' + (w.edit ? 'Save changes' : 'End workout') + '</button>') + '</div>';
  html += '<div class="restbar" id="restBar"' + (App.rest ? '' : ' hidden') + '><span>Rest</span><b id="restT">' + (App.rest ? mmss((App.rest.end - Date.now()) / 1000) : '') + '</b><button data-act="rest-add" data-arg="' + jattr({ s: -15 }) + '">−15</button><button data-act="rest-add" data-arg="' + jattr({ s: 15 }) + '">+15</button><button data-act="rest-stop">Skip</button></div>';
  return html;
};
ACTIONS['wk-sec'] = function (a) { var w = App.wk; if (!w) return; w.cur = Math.max(0, Math.min(w.secs.length - 1, a.s)); w.touched = true; wkSave(); render(); window.scrollTo(0, 0); };
ACTIONS.hx = function (a) { App.ui.hx = App.ui.hx || {}; App.ui.hx[a.i] = !App.ui.hx[a.i]; keepScroll(render); };
ACTIONS['wu-chk'] = function (a) { var x = App.wk.ex[a.i]; x.done = !x.done; App.wk.touched = true; wkSave(); keepScroll(render); };
ACTIONS['wu-all'] = function () { App.wk.ex.forEach(function (x) { if (x.sec === App.wk.cur && x.kind === 'wu') x.done = true; }); App.wk.touched = true; wkSave(); render(); };
ACTIONS['wk-done'] = function (a) {
  var x = App.wk.ex[a.i], s = x.sets[a.j];
  if (!s.done) {
    if ((x.kind === 'wt' || x.kind === 'bw') && !(+s.r > 0)) { toast('Enter your reps first'); return; }
    if (x.kind === 'wt' && s.w === '') { toast('Enter the weight first'); return; }
  }
  s.done = !s.done; App.wk.touched = true;
  if (x.kind === 'timedw' && s.done) s.w = x.sets[0].w;
  wkSave();
  if (s.done && x.rest > 0 && !(a.j === x.sets.length - 1 && curSecEx(App.wk).every(function (o) { return o.x.kind === 'wu' || o.x.sets.every(function (q) { return q.done; }); }))) App.rest = { end: Date.now() + x.rest * 1000, total: x.rest };
  keepScroll(render);
};
ACTIONS['wk-set'] = function (a) {
  var x = App.wk.ex[a.i];
  if (a.d > 0) { var last = x.sets[x.sets.length - 1] || { w: '', r: 8 }; x.sets.push({ w: last.w, r: last.r, done: false }); } else x.sets.pop();
  App.wk.touched = true; wkSave(); keepScroll(render);
};
ACTIONS['wk-end'] = function () {
  var w = App.wk, ex = {}, any = false;
  w.note = ($('#wk-note') || {}).value || w.note;
  var anyDone = w.ex.some(function (x) { return x.kind !== 'wu' && x.sets.some(function (s) { return s.done; }); });
  w.ex.forEach(function (x) {
    if (x.kind === 'wu' || x.kind === 'timed') return;
    var ss = x.sets.filter(function (s) { return (s.done || (!anyDone && s.ed)) && (x.kind === 'timedw' ? +s.w > 0 : +s.r > 0); }).map(function (s) { return { w: x.kind === 'bw' ? 0 : +s.w || 0, r: x.kind === 'timedw' ? 1 : +s.r }; });
    if (!ss.length) return;
    var best = ss.reduce(function (b, s) { return e1rm(s.w, s.r) > e1rm(b.w, b.r) ? s : b; }, ss[0]);
    ex[x.n] = { w: best.w, reps: best.r, sets: ss.length, s: ss }; any = true;
  });
  var wuDone = w.ex.filter(function (x) { return x.kind === 'wu' && x.done; }).length;
  var timedDone = w.ex.filter(function (x) { return x.kind === 'timed' && x.sets.some(function (s) { return s.done; }); }).length;
  if (!any && !wuDone && !timedDone) { toast('Tick off at least one set before ending.'); return; }
  if (!w.edit && !confirm('End your workout?')) return;
  var date = w.date, old = logOf(date).lift || {};
  var secs = w.edit ? (old.sec || (old.min || 0) * 60) : Math.min(4 * 3600, Math.round((Date.now() - w.start) / 1000));
  var vol = 0; Object.keys(ex).forEach(function (n) { vol += setsVolume(ex[n].s); });
  var prs = Object.keys(ex).filter(function (n) { var h = liftHistory(n, date); var pb = h.reduce(function (m, x) { return Math.max(m, x.e1); }, 0); return pb && bestE1(ex[n]) > pb; });
  var rec = Object.assign({}, old, { key: w.key, v: w.v, lp: w.lp, ex: ex, rpe: w.rpe || old.rpe || null, sec: secs, min: old.src === 'garmin' && old.min ? old.min : Math.max(1, Math.round(secs / 60)), vol: Math.round(vol), prs: prs, wu: wuDone, note: (w.note || '').trim() });
  Store.edit('logs', date, function (S) { S.logs[date] = S.logs[date] || {}; S.logs[date].lift = rec; });
  App.wk = null; App.rest = null; LS.del('rp-wk');
  go('#/wksummary/' + date);
};
ACTIONS['wk-finish'] = ACTIONS['wk-end'];

/* ---------- summary ---------- */
VIEWS.wksummary = function () {
  var date = App.args[0] || App.today, l = logOf(date).lift;
  if (!l) return '<div class="card">No workout logged that day.</div>';
  var ex = l.ex || {}, names = Object.keys(ex), vol = l.vol != null ? l.vol : names.reduce(function (t, n) { return t + setsVolume(setsOf(ex[n])); }, 0);
  var sets = names.reduce(function (t, n) { return t + setsOf(ex[n]).length; }, 0), prs = l.prs || [];
  var title = l.key && E.LIFT[l.key] ? (l.key.length === 1 ? 'Strength ' + l.key + ': ' : '') + E.liftMod(l.key, l.v).name : 'Strength';
  var html = '<div class="donehead"><div class="eyebrow">' + E.fmtDate(date, { weekday: 'long', month: 'short', day: 'numeric' }) + '</div><h1>Workout complete</h1><p>' + esc(title) + '</p></div>';
  html += '<div class="tiles"><div class="tile big"><span>Total volume</span><b>' + Math.round(vol).toLocaleString() + '</b><em>lb lifted</em></div><div class="tile big"><span>Time lifting</span><b>' + (l.sec ? mmss(l.sec) : (l.min || 0) + ' min') + '</b><em>' + (l.sec ? 'h:mm:ss' : '') + '</em></div><div class="tile"><span>Sets</span><b>' + sets + '</b><em>' + plural(names.length, 'exercise') + '</em></div><div class="tile"><span>Effort</span><b>' + (l.rpe || '–') + '</b><em>' + (l.rpe ? 'out of 10' : 'not rated') + '</em></div></div>';
  if (prs.length) html += '<div class="banner good"><b>New best' + (prs.length > 1 ? 's' : '') + ':</b> ' + prs.map(function (n) { return esc(n) + ' (e1RM ' + bestE1(ex[n]) + ' lb)'; }).join(', ') + '</div>';
  html += '<section class="card"><h3>Exercises</h3><div class="scroll"><table class="t" style="margin-top:6px"><thead><tr><th>Exercise</th><th>Sets</th><th class="num">Volume</th><th class="num">e1RM</th></tr></thead><tbody>' + names.map(function (n) { var ss = setsOf(ex[n]), v = setsVolume(ss); return '<tr><td>' + esc(n) + '</td><td class="small">' + ss.map(function (s) { return '<span class="nw">' + (s.w ? s.w + '×' : '') + s.r + '</span>'; }).join(' ') + '</td><td class="num">' + (v ? Math.round(v).toLocaleString() : 'BW') + '</td><td class="num">' + (bestE1(ex[n]) && ss.some(function (s) { return s.w; }) ? bestE1(ex[n]) : '–') + '</td></tr>'; }).join('') + '</tbody></table></div>' + (l.note ? '<p class="small" style="margin-top:8px"><b>Notes:</b> ' + esc(l.note) + '</p>' : '') + '</section>';
  var prev = null; Object.keys(st().logs || {}).sort().reverse().some(function (d) { if (d >= date) return false; var x = st().logs[d].lift; if (x && x.ex && Object.keys(x.ex).length && x.key === l.key) { prev = { d: d, x: x }; return true; } return false; });
  if (prev) { var pv = prev.x.vol != null ? prev.x.vol : Object.keys(prev.x.ex).reduce(function (t, n) { return t + setsVolume(setsOf(prev.x.ex[n])); }, 0); if (pv) html += '<p class="small muted">Last time you did this session (' + fmtD(prev.d, { month: 'short', day: 'numeric' }) + '): ' + Math.round(pv).toLocaleString() + ' lb. ' + (vol >= pv ? 'Up ' + Math.round(vol - pv).toLocaleString() + ' lb.' : 'Down ' + Math.round(pv - vol).toLocaleString() + ' lb: fine on a light or tired day.') + '</p>'; }
  html += '<div class="btns"><a class="btn primary" href="#/today">Done</a><a class="btn" href="#/workout/' + date + '">Edit sets</a><a class="btn ghost" href="#/progress/strength">Strength progress</a></div>';
  return html;
};

/* ---------- start a fresh plan ---------- */
var KEEP_SCHEDULE = ['runDays', 'liftDays', 'crossDays', 'avail', 'longDay', 'doubles', 'injuryProne', 'hrTrainer', 'weightKg', 'runWalk'];
ACTIONS['reset-plan'] = function () {
  if (!confirm('Start a fresh plan? Your runs, lifts, races, readings and shoes are kept. The schedule is rebuilt from scratch and you choose a training style again.')) return;
  var old = st().profile || {}, keep = {};
  KEEP_SCHEDULE.forEach(function (k) { if (old[k] != null) keep[k] = old[k]; });
  var ks = function (o) { return Object.keys(o || {}); };
  Store.editMany([['profile'], ['prefs', 'prevProfile'], ['arr'], ['overrides'], ['moves'], ['status']], function (S) {
    S.profile = null; S.prefs = S.prefs || {}; S.prefs.prevProfile = keep; S.arr = {}; S.overrides = {}; S.moves = {}; S.status = {};
  });
  App.wiz = null; go('#/setup');
};
var _wizInit5 = wizInit;
wizInit = function () {
  var z = _wizInit5();
  if (st().profile) return z;
  var prev = (st().prefs || {}).prevProfile || {}, p = z.profile, t = App.today;
  KEEP_SCHEDULE.forEach(function (k) { if (prev[k] != null) p[k] = prev[k]; });
  /* starting mid-week? begin on Monday so the first week is a full one */
  p.startDate = E.dow(t) >= 3 ? E.addD(E.monday(t), 7) : E.monday(t);
  /* what you have actually been doing, from Garmin */
  var g = Store.garmin, acts = (g && g.activities) || [], from = E.addD(t, -28);
  var lifts = acts.filter(function (a) { return a.strength && a.date > from && a.date <= t; }).length / 4;
  if (prev.liftDays == null && lifts) p.liftDays = Math.min(4, Math.max(1, Math.round(lifts)));
  if (z.hs && z.hs.runsPerWeek && prev.runDays == null) p.runDays = Math.max(3, Math.min(6, Math.round(z.hs.runsPerWeek) + 1));
  z.recent = { lifts: Math.round(lifts * 10) / 10 };
  return z;
};
var _setup5 = VIEWS.setup;
VIEWS.setup = function () {
  var h = _setup5(), z = App.wiz;
  if (z && WIZ_STEPS[z.step] === 'current' && z.recent && z.hs) h = h.replace('We filled these in for you.', 'Gym: about ' + z.recent.lifts + ' strength sessions a week. We filled these in for you.');
  return h;
};
var _settings5 = VIEWS.settings;
VIEWS.settings = function () {
  var h = _settings5();
  return h + '<section class="card"><h3>Start a fresh plan</h3><p class="small muted">Rebuild your schedule from scratch from what you have been doing lately, and pick a training style again. Your history, races and readings stay.</p><div class="btns" style="margin-top:8px"><button class="btn" data-act="reset-plan">Start a fresh plan</button></div></section>';
};
var _data5 = VIEWS.data;
VIEWS.data = function () { return _data5().replace('<h3>Start over</h3><p class="small muted">Clears your plan setup on this device and in your repository. Logs stay unless you also clear them.</p><div class="btns"><button class="btn sm danger" data-act="reset-plan">Re-run setup</button>', '<h3>Start a fresh plan</h3><p class="small muted">Rebuilds your schedule from scratch. Runs, lifts, races and readings stay.</p><div class="btns"><button class="btn sm" data-act="reset-plan">Start a fresh plan</button>'); };
