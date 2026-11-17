/* ================= Phase 1: close the loop =================
   - workout execution feeds a pace suggestion you accept or keep
   - Today's one-line insight from yesterday's (or today's) key session
   - a new race or time-trial result shows what it changed, and you can keep your old paces
   - simple or full display ================= */

/* ---------- execution history for key sessions ---------- */
function keyExecutions(daysBack) {
  var out = [], t = App.today;
  for (var i = 0; i <= daysBack; i++) {
    var d = E.addD(t, -i), l = logOf(d), gid = l.run && l.run.gid; if (!gid) continue;
    var laps = lapsFor(gid); if (!laps) continue;
    var day = dayOf(d), p = day && day.parts.filter(function (x) { return (x.type === 'speed' || x.type === 'long') && x.steps; })[0];
    if (!p) continue;
    var ex = null; try { ex = E.execution(p, _zonesAt7(d), laps); } catch (e) { ex = null; }
    if (!ex) continue;
    var byZ = {}, hrZ = {}, zz = _zonesAt7(d) || {};
    ex.rows.forEach(function (r) {
      if (!r.target || !r.pace || /WARMUP|COOLDOWN|RECOVERY|REST/.test(r.type) || (r.zone !== 'T' && r.zone !== 'I')) return;
      var dz = r.pace < r.target[0] ? r.pace - r.target[0] : r.pace > r.target[1] ? r.pace - r.target[1] : 0;
      (byZ[r.zone] = byZ[r.zone] || []).push(dz);
      if (r.hr) (hrZ[r.zone] = hrZ[r.zone] || []).push(r.hr);
    });
    /* faster than the range but with heart rate above the zone isn't fitness, it's over-reaching */
    var hot = {}; Object.keys(hrZ).forEach(function (z) { var top = zz.hr && zz.hr[z] && zz.hr[z][1], m = hrZ[z].reduce(function (a, b) { return a + b; }, 0) / hrZ[z].length; hot[z] = !!(top && m > top + 2); });
    out.push({ date: d, p: p, ex: ex, byZ: byZ, hot: hot, tt: !!p.tt });
  }
  return out;   /* newest first */
}
var ZNAME = { T: 'threshold', I: 'interval' };
/* two recent sessions in a zone that agree: both clearly faster than the range and mostly on target, or both clearly slower and mostly off */
function paceSuggestion() {
  var pc = st().paceCal || {}, seen = st().seen || {}, xs = keyExecutions(28).filter(function (x) { return !x.tt; });
  var out = null;
  ['T', 'I'].forEach(function (z) {
    if (out) return;
    var got = xs.filter(function (x) { return x.byZ[z] && x.byZ[z].length >= 2 && (!pc[z + 'At'] || x.date > pc[z + 'At']); }).slice(0, 2);
    if (got.length < 2) return;
    var avg = got.map(function (x) { return x.byZ[z].reduce(function (a, b) { return a + b; }, 0) / x.byZ[z].length; });
    var key = 'pcal:' + z + ':' + got[0].date; if (seen[key]) return;
    var fast = avg.every(function (v) { return v <= -3; }) && got.every(function (x) { return !x.hot[z]; });
    var slow = avg.every(function (v) { return v >= 5; }) && got.every(function (x) { return (x.ex.score || 0) < 70; });
    if (!fast && !slow) return;
    var m = Math.abs((avg[0] + avg[1]) / 2), step = Math.min(10, Math.max(5, Math.round(m / 5) * 5));
    out = { z: z, delta: fast ? -step : step, fast: fast, key: key, last: got[0].date, avg: Math.round(m), titles: got.map(function (x) { return fmtD(x.date, { month: 'short', day: 'numeric' }); }) };
  });
  return out;
}
function paceSuggestionCard() {
  var s = paceSuggestion(); if (!s) return '';
  var zz = zonesAt(App.today), cur = zz && zz[s.z], nxt = cur ? [cur[0] + s.delta, cur[1] + s.delta] : null;
  return '<section class="card offer pcal"><div class="eyebrow">' + (s.fast ? 'You\'re ahead of your paces' : 'Your paces look too quick') + '</div>' +
    '<h3>' + (s.fast ? 'Speed up' : 'Ease') + ' your ' + ZNAME[s.z] + ' paces by ' + Math.abs(s.delta) + '&nbsp;s/mi?</h3>' +
    '<p class="small muted">Your last two ' + ZNAME[s.z] + ' sessions (' + esc(s.titles[1]) + ' and ' + esc(s.titles[0]) + ') ran about ' + s.avg + ' s/mi ' + (s.fast ? 'faster than the fast end of the range, with heart rate in the zone.' : 'slower than the range, with most reps off target.') + '</p>' +
    (cur ? '<div class="pcal-row"><span>' + pace(cur[0]) + '–' + pace(cur[1]) + '</span><i aria-hidden="true">→</i><b>' + pace(nxt[0]) + '–' + pace(nxt[1]) + '</b><em>/mi</em></div>' : '') +
    '<div class="btns"><button class="btn primary sm" data-act="pcal-yes" data-arg="' + jattr(s) + '">Update paces</button><button class="btn sm ghost" data-act="pcal-no" data-arg="' + jattr({ key: s.key }) + '">Keep my paces</button></div></section>';
}
ACTIONS['pcal-yes'] = function (a) {
  Store.editMany([['paceCal'], ['seen', a.key]], function (S) { S.paceCal = Object.assign({}, S.paceCal || {}); S.paceCal[a.z] = (S.paceCal[a.z] || 0) + a.delta; S.paceCal[a.z + 'At'] = a.last; S.seen = S.seen || {}; S.seen[a.key] = 'yes'; });
  toast((a.delta < 0 ? 'Faster ' : 'Easier ') + ZNAME[a.z] + ' paces from your next session'); if (watchOn && watchOn()) try { watchSoon(); } catch (e) {}
};
ACTIONS['pcal-no'] = function (a) { Store.edit('seen', a.key, function (S) { S.seen = S.seen || {}; S.seen[a.key] = 'kept'; }); toast('Paces kept'); };
ACTIONS['pcal-reset'] = function () { Store.edit('paceCal', null, function (S) { S.paceCal = {}; }); toast('Pace adjustments cleared'); };

/* ---------- one-line insight from the latest key session ---------- */
function insightCard() {
  var xs = keyExecutions(1); if (!xs.length) return '';
  var x = xs[0], ex = x.ex, when = x.date === App.today ? 'Today\'s' : 'Yesterday\'s';
  if (st().seen && st().seen['ins:' + x.date]) return '';
  var line = ex.of ? ex.hit + ' of ' + ex.of + ' work laps on target' + (ex.score != null ? ' (' + ex.score + '%)' : '') : 'splits are in';
  var all = []; Object.keys(x.byZ).forEach(function (z) { all = all.concat(x.byZ[z]); });
  var dzm = all.length ? Math.round(all.reduce(function (a, b) { return a + b; }, 0) / all.length) : 0;
  if (ex.of && dzm <= -4) line = ex.hit + ' of ' + ex.of + ' work laps in range: about ' + (-dzm) + ' s/mi faster than planned';
  else if (ex.of && dzm >= 5) line = ex.hit + ' of ' + ex.of + ' work laps in range: about ' + dzm + ' s/mi slower than planned';
  var extra = dzm <= -4 ? (x.hot && Object.keys(x.hot).some(function (z) { return x.hot[z]; }) ? 'Heart rate ran above the zone, so hold the planned pace next time.' : 'Heart rate stayed in the zone, a sign of new fitness.') : ex.fade != null && ex.fade > 8 ? 'The second half faded ' + ex.fade + ' s/mi: start the first reps a touch slower next time.' : ex.fade != null && ex.fade < -5 ? 'You finished stronger than you started. Well paced.' : (ex.score != null && ex.score >= 80 ? 'Right where it should be.' : ex.score != null && ex.score < 50 ? 'Off target. Heat, hills or tired legs? Check the laps.' : '');
  if (x.tt) extra = 'Your time trial result updates your paces. See below.';
  return '<section class="card offer insight"><a class="ins-main" href="#/day/' + x.date + '"><span class="ins-dot ' + (dzm <= -4 ? 'ok' : ex.score == null ? '' : ex.score >= 80 ? 'ok' : ex.score >= 50 ? 'mid' : 'low') + '" aria-hidden="true"></span><span><b>' + when + ' ' + esc(x.p.title) + ':</b> ' + line + '. ' + extra + '</span></a>' +
    '<button class="ins-x" data-act="ins-hide" data-arg="' + jattr({ d: x.date }) + '" aria-label="Hide">×</button></section>';
}
ACTIONS['ins-hide'] = function (a) { Store.edit('seen', 'ins:' + a.d, function (S) { S.seen = S.seen || {}; S.seen['ins:' + a.d] = 1; }); };

/* ---------- a new race or time trial: show what changed, you decide ---------- */
function anchorCard() {
  var an = App.an, r = an && an.result; if (!r || r.src !== 'race' || !r.date) return '';
  if (E.diffD(r.date, App.today) > 10 || (st().seen || {})['anc:' + r.date]) return '';
  var alt = null;
  try { var s2 = JSON.parse(JSON.stringify(st())); s2.anchorSkip = Object.assign({}, s2.anchorSkip || {}); s2.anchorSkip[r.date] = 1; alt = E.analyze(App.plan, s2, Store.garmin); } catch (e) { alt = null; }
  var w = E.weekOf(App.plan, App.today) || App.plan.weeks[0];
  var zNew = E.zonesFor(App.plan, w, an), zOld = alt ? E.zonesFor(App.plan, w, alt) : null;
  var row = function (k, lab) { return zOld && zOld[k] && zNew[k] ? '<tr><td>' + lab + '</td><td class="num">' + pace(zOld[k][0]) + '</td><td class="num"><b>' + pace(zNew[k][0]) + '</b></td></tr>' : ''; };
  var faster = zOld && zNew.T && zOld.T ? zNew.T[0] < zOld.T[0] : true;
  return '<section class="card offer anc"><div class="eyebrow">New fitness reading</div><h3>' + (r.sec ? E.clock(r.sec) : '') + ' ' + (r.mi ? (Math.round(r.mi * 10) / 10) + ' mi ' : '') + 'on ' + fmtD(r.date, { weekday: 'short', month: 'short', day: 'numeric' }) + (faster ? ' moved your paces faster' : ' moved your paces slower') + '</h3>' +
    (zOld ? '<div class="scroll"><table class="t fit" style="margin-top:6px"><thead><tr><th>Pace</th><th class="num">Before</th><th class="num">Now</th></tr></thead><tbody>' + row('E', 'Easy (fast end)') + row('T', 'Threshold') + row('I', 'Interval') + '</tbody></table></div>' : '') +
    '<p class="small muted">Races and time trials are the best guide to your fitness, so the new paces are already in use. If the conditions were unusual (heat, hills, sick, a short course), keep the old ones.</p>' +
    '<div class="btns"><button class="btn primary sm" data-act="anc-yes" data-arg="' + jattr({ d: r.date }) + '">Use new paces</button><button class="btn sm ghost" data-act="anc-no" data-arg="' + jattr({ d: r.date }) + '">Keep my old paces</button></div></section>';
}
ACTIONS['anc-yes'] = function (a) { Store.edit('seen', 'anc:' + a.d, function (S) { S.seen = S.seen || {}; S.seen['anc:' + a.d] = 1; }); toast('New paces in use'); };
ACTIONS['anc-no'] = function (a) { Store.editMany([['anchorSkip', a.d], ['seen', 'anc:' + a.d]], function (S) { S.anchorSkip = S.anchorSkip || {}; S.anchorSkip[a.d] = 1; S.seen = S.seen || {}; S.seen['anc:' + a.d] = 1; }); toast('Old paces kept. The result stays in your log.'); };

var _today12 = VIEWS.today;
VIEWS.today = function () {
  var h = _today12(), add = '';
  try { add = anchorCard() + paceSuggestionCard() + insightCard(); } catch (e) { console.warn(e); }
  if (!add) return h;
  var i = h.indexOf('<section'); return i > 0 ? h.slice(0, i) + add + h.slice(i) : h + add;
};
/* the same suggestion on the day page of the session it came from */
var _day12 = VIEWS.day;
VIEWS.day = function () {
  var h = _day12(), d = App.args[0] || App.today, s = null; try { s = paceSuggestion(); } catch (e) { s = null; }
  return s && s.last === d ? h + paceSuggestionCard() : h;
};

/* ---------- simple or full display ---------- */
function displayMode() { var p = st().prefs || {}; return p.display || ((st().profile || {}).level === 'new' ? 'simple' : 'full'); }
var _render12 = render;
render = function () { try { document.body.classList.toggle('simple', displayMode() === 'simple'); } catch (e) {} return _render12.apply(this, arguments); };
var _tsh12 = trainingStatusHTML;
trainingStatusHTML = function (date) {
  var h = _tsh12(date); if (!h) return h;
  var simple = displayMode() === 'simple';
  var t = '<button class="linkbtn dispt" data-act="display-toggle">' + (simple ? 'Show all numbers' : 'Simple view') + '</button>';
  return h.replace(/<\/div>$/, t + '</div>');
};
ACTIONS['display-toggle'] = function () {
  var nx = displayMode() === 'simple' ? 'full' : 'simple';
  Store.edit('prefs', 'display', function (S) { S.prefs = S.prefs || {}; S.prefs.display = nx; });
  toast(nx === 'simple' ? 'Simple view: the essentials only' : 'Showing all numbers');
};
App.p12 = { keyExecutions: keyExecutions, paceSuggestion: paceSuggestion };
