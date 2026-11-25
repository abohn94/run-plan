/* ================= Whose calendar is this? =================
   The calendar sync now reports each calendar separately (name, its shifts and busy times). The app asks whose each
   one is, labels it ("Alex's calendar"), and only your own calendars shape your plan, watch workouts and reminders.
   Shifts someone else invited your calendar to are skipped by the sync itself. */
App.calRaw = App.cal;
function calApply() {
  if (App.cal && !App.cal._f) App.calRaw = App.cal;   /* a raw file loaded by the original loader */
  var c = App.calRaw ? E.calFor(App.calRaw, st().prefs || {}) : null;
  if (c) { if (c === App.calRaw) c = Object.assign({}, c); Object.defineProperty(c, '_f', { value: true, enumerable: false }); }
  App.cal = c;
}
function calSrcs() { return (App.calRaw && App.calRaw.by) || []; }
function calWhoOf(b) {
  var src = ((st().prefs || {}).calSrc || {})[b.key] || {}, me = (st().prefs || {}).myName;
  if (src.who) return src.who;
  if (src.mine === true) return me || 'You';
  var n = String(b.name || b.key), at = n.indexOf('@'); n = at > 0 ? n.slice(0, at).split(/[._-]/)[0] : n;
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function calLabel(b) { var w = calWhoOf(b); return /s$/.test(w) ? w + '\' calendar' : w === 'You' ? 'Your calendar' : w + '\'s calendar'; }
function calMineLabel() { var mine = calSrcs().filter(function (b) { var s = ((st().prefs || {}).calSrc || {})[b.key]; return s && s.mine; }); return mine.length ? mine.map(calLabel).join(' + ') : ''; }
loadCal = function () {
  if (Store.mode !== 'github' || (loadCal.busy && Date.now() - loadCal.busy < 45000)) return; loadCal.busy = Date.now();
  Store.getFile('garmin/calendar.json').then(function (f) {
    loadCal.busy = 0; if (!f || !f.text) return;
    var j = JSON.parse(f.text), changed = f.text !== loadCal.last;
    loadCal.last = f.text; App.calRaw = j; calApply(); LS.set('rp-gcal', f.text);
    if (changed) { recompute(); if ($('#sheet').hidden) render(); else loadCal.last = null; }
  }, function () { loadCal.busy = 0; });
};
var _recompute38 = recompute;
recompute = function () { try { calApply(); } catch (e) { console.warn(e); } return _recompute38.apply(this, arguments); };
try { calApply(); } catch (e) { /* no state yet */ }
/* upcoming work shifts in one calendar, for the "whose is this?" question */
function calPeek(b) {
  var ds = Object.keys(b.shifts || {}).filter(function (d) { return d >= App.today; }).sort();
  return { n: ds.length, first: ds.slice(0, 3).map(function (d) { return fmtD(d, { weekday: 'short', month: 'short', day: 'numeric' }) + ' (' + ({ day: 'day', eve: 'evening', night: 'night' })[b.shifts[d]] + ')'; }) };
}
function calAskCard() {
  var pend = E.calPending(App.calRaw, st().prefs || {}); if (!pend.length || !st().profile) return '';
  return '<section class="card stack calask"><div class="eyebrow">Work calendar</div><h3>Whose calendar is this?</h3><p class="small muted">Only your own calendar should move your training. A shared calendar (like a partner\'s work schedule) can stay connected without changing your plan.</p>' +
    pend.map(function (b) { var pk = calPeek(b); return '<div class="calsrc"><p class="small"><b>' + esc(b.name) + '</b><br><span class="muted">' + (pk.n ? plural(pk.n, 'work shift') + ' ahead: ' + esc(pk.first.join(', ')) + (pk.n > 3 ? '…' : '') : 'No work shifts found ahead') + '</span></p><div class="btns"><button class="btn sm primary" data-act="cal-mine" data-arg="' + jattr({ key: b.key, mine: true }) + '">Mine</button><button class="btn sm" data-act="cal-mine" data-arg="' + jattr({ key: b.key, mine: false }) + '">Someone else\'s</button></div></div>'; }).join('') + '</section>';
}
ACTIONS['cal-mine'] = function (a) {
  Store.edit('prefs', 'calSrc', function (S) { S.prefs = S.prefs || {}; var c = Object.assign({}, S.prefs.calSrc || {}); c[a.key] = Object.assign({}, c[a.key] || {}, { mine: a.mine }); S.prefs.calSrc = c; });
  recompute(); render(); toast(a.mine ? 'Using it for your training' : 'Kept out of your training');
};
ACTIONS['cal-who'] = function (a) {
  var v = ($('#calwho-' + a.i) || {}).value || ''; v = v.trim().slice(0, 30);
  Store.edit('prefs', 'calSrc', function (S) { S.prefs = S.prefs || {}; var c = Object.assign({}, S.prefs.calSrc || {}); c[a.key] = Object.assign({}, c[a.key] || {}); if (v) c[a.key].who = v; else delete c[a.key].who; S.prefs.calSrc = c; });
  render(); toast('Saved');
};
ACTIONS['cal-myname'] = function () { var v = ($('#cal-myname') || {}).value || ''; Store.edit('prefs', 'myName', function (S) { S.prefs = S.prefs || {}; if (v.trim()) S.prefs.myName = v.trim().slice(0, 30); else delete S.prefs.myName; }); render(); toast('Saved'); };
var _today38 = VIEWS.today;
VIEWS.today = function () {
  var h = _today38(), c = calAskCard(); if (!c) return h;
  var g = h.indexOf('class="greet"'), i = g >= 0 ? h.indexOf('</h1></div>', g) : -1;
  return i > 0 ? h.slice(0, i + 11) + c + h.slice(i + 11) : c + h;
};
/* Google Calendar page: every connected calendar, whose it is, and whether it shapes your training */
var _calsync38 = VIEWS.calsync;
VIEWS.calsync = function () {
  var h = _calsync38(), B = calSrcs(); if (!B.length) return h;
  var src = (st().prefs || {}).calSrc || {};
  var card = '<section class="card stack"><h3>Your calendars</h3><p class="small muted">Only calendars marked <b>mine</b> move your training. Others stay connected but are ignored.</p>' +
    '<label class="f">Your name (for labels)<div style="display:flex;gap:8px;align-items:center"><input class="i" id="cal-myname" value="' + esc((st().prefs || {}).myName || '') + '" placeholder="Steph"><button class="btn sm" data-act="cal-myname">Save</button></div></label>' +
    B.map(function (b, i) {
      var s = src[b.key] || {}, pk = calPeek(b), st2 = s.mine === true ? '<span class="pill good">Used for your training</span>' : s.mine === false ? '<span class="pill">Not used</span>' : '<span class="pill warn">Not confirmed</span>';
      return '<div class="calsrc"><div class="spread"><b class="small">' + esc(calLabel(b)) + '</b>' + st2 + '</div><p class="tiny muted">' + esc(b.name) + ' · ' + (pk.n ? plural(pk.n, 'shift') + ' ahead' : 'no shifts ahead') + (b.foreign ? ' · skipped ' + plural(b.foreign, 'shift') + ' someone else invited this calendar to' : '') + '</p>' +
        '<div class="chips"><button class="chip" data-act="cal-mine" data-arg="' + jattr({ key: b.key, mine: true }) + '" aria-pressed="' + (s.mine === true) + '">Mine</button><button class="chip" data-act="cal-mine" data-arg="' + jattr({ key: b.key, mine: false }) + '" aria-pressed="' + (s.mine === false) + '">Someone else\'s</button></div>' +
        '<label class="f">Whose is it?<div style="display:flex;gap:8px;align-items:center"><input class="i" id="calwho-' + i + '" value="' + esc(s.who || '') + '" placeholder="' + esc(calWhoOf(b)) + '"><button class="btn sm" data-act="cal-who" data-arg="' + jattr({ key: b.key, i: i }) + '">Save</button></div></label></div>';
    }).join('') + '</section>';
  var i = h.indexOf('<div class="sechead"><h2>One-time setup');
  return i > 0 ? h.slice(0, i) + card + h.slice(i) : h + card;
};
/* label the calendar wherever shifts show */
var _you38 = VIEWS.you;
VIEWS.you = function () { var h = _you38(), m = calMineLabel(), pend = E.calPending(App.calRaw, st().prefs || {}).length; if (!calSrcs().length) return h; return h.replace(/(Google Calendar<span class="v">)[^<]*/, '$1' + (pend ? 'Confirm whose' : esc(m || 'Not used'))); };
function calTag(h) { var m = calMineLabel(); if (!m) return h; return h.replace(/<div class="eyebrow">Work calendar<\/div>/g, '<div class="eyebrow">Work calendar · ' + esc(m) + '</div>').replace(/from your calendar/g, 'from ' + esc(m)); }
var _today38b = VIEWS.today; VIEWS.today = function () { return calTag(_today38b()); };
var _calrev38 = VIEWS.calreview;
VIEWS.calreview = function () { var h = _calrev38(), m = calMineLabel(); return m ? h.replace('<p>Your work calendar changed.', '<p>' + esc(m) + ' changed.') : h; };
var _plan38 = VIEWS.plan; VIEWS.plan = function () { return calTag(_plan38.apply(this, arguments)); };
App.p38 = { calApply: calApply, calLabel: calLabel, calWhoOf: calWhoOf };
