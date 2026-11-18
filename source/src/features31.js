/* ================= Heart-rate zones: calculated from your threshold, kept current, and handed to Garmin ================= */
TITLES.hrzones = 'Heart-rate zones'; TABOF.hrzones = 'more';
var HRZ_USE = [['Recovery and easy', 'Recovery runs, warm-ups, most easy running'], ['Easy aerobic', 'The top of easy: long runs and easy days; still conversational'], ['Steady and marathon effort', 'Marathon pace and steady runs'], ['Threshold', 'Tempo and cruise intervals: comfortably hard'], ['VO2 max and speed', 'Intervals, hills and the end of races']];
function hrzNow() { try { return E.hrZoneSet(E.hrAnchors(Store.garmin, GX())); } catch (e) { return null; } }
function hrzRange(r) { return r[0] + '–' + r[1]; }
/* Garmin's zones as of your newest run, and the max HR they imply */
function garminZones() {
  var lo = GX().zoneLows; if (!lo || lo.length !== 5) return null;
  var z = lo.map(function (v, i) { return [v, i < 4 ? lo[i + 1] - 1 : null]; }), impliedMax = Math.round(lo[4] / 0.9);
  var pctMax = lo.every(function (v, i) { return Math.abs(v / impliedMax - (0.5 + i * 0.1)) < 0.012; });
  return { z: z, max: pctMax ? impliedMax : null, date: GX().zoneLowsDate || '' };
}
/* keep prefs.hrz in step with your data; announce real changes (the four boundaries, which move with your threshold) */
var _hrzChecked = '';
function hrzSync() {
  var x = GX(); if (!x || !x.updated || !st().profile) return;
  var cur = hrzNow(); if (!cur) return;
  var H = (st().prefs || {}).hrz, key = cur.sig + '|' + cur.max + '|' + cur.rest;
  if (_hrzChecked === key) return; _hrzChecked = key;
  if (H && H.sig === cur.sig && H.max === cur.max && H.rest === cur.rest) return;
  var changed = !H || H.sig !== cur.sig;
  setTimeout(function () {
    Store.edit('prefs', null, function (S) {
      S.prefs = S.prefs || {}; var old = S.prefs.hrz;
      S.prefs.hrz = { v: (old ? old.v : 0) + (changed ? 1 : 0), at: changed ? App.today : old.at, sig: cur.sig, z: cur.z, lthr: cur.lthr, max: cur.max, rest: cur.rest, ack: old ? old.ack : null,
        hist: ((old && old.hist) || []).concat(changed ? [{ at: App.today, sig: cur.sig, from: old ? old.sig : null, lthr: cur.lthr }] : []).slice(-12) };
      if (S.prefs.easyCap && S.prefs.easyCap !== cur.z[1][1]) S.prefs.easyCap = cur.z[1][1];
    });
    if (changed) coachSay((H ? 'Your heart-rate zones changed because your lactate threshold heart rate is now ' + cur.lthr + ' bpm (it was ' + H.lthr + ').' : 'I calculated your heart-rate zones from your lactate threshold heart rate (' + cur.lthr + ' bpm), your max (' + cur.max + ') and your resting heart rate (' + cur.rest + ').') +
      '\n\nZone 1 ' + hrzRange(cur.z[0]) + ' · Zone 2 ' + hrzRange(cur.z[1]) + ' · Zone 3 ' + hrzRange(cur.z[2]) + ' · Zone 4 ' + hrzRange(cur.z[3]) + ' · Zone 5 ' + hrzRange(cur.z[4]) + '\n\nEasy runs now top out at ' + cur.z[1][1] + ' bpm. Update the same numbers in Garmin so your watch alerts and time-in-zone match.', [{ label: 'Steps for Garmin', act: { nav: '#/hrzones' } }]);
  }, 120);
}
var _today31 = VIEWS.today;
VIEWS.today = function () {
  try { hrzSync(); } catch (e) {}
  var h = _today31(), H = (st().prefs || {}).hrz;
  if (!H || H.ack === H.sig || !App.plan) return h;
  var c = '<a class="card hrzcard" href="#/hrzones"><div class="eyebrow">Heart-rate zones ' + (H.v > 1 ? 'updated' : 'ready') + '</div><h3>Update your Garmin zones</h3><div class="hrzmini">' + H.z.map(function (r, i) { return '<span><small>Z' + (i + 1) + '</small><b>' + hrzRange(r) + '</b></span>'; }).join('') + '</div><span class="btn sm primary" style="margin-top:10px">See the steps</span></a>';
  var g = h.indexOf('class="card coachcard"'); g = g >= 0 ? h.indexOf('</section>', g) + 10 : (h.indexOf('class="herow') >= 0 ? h.indexOf('</a>', h.indexOf('class="herow')) + 4 : -1);
  return g > 3 ? h.slice(0, g) + c + h.slice(g) : h + c;
};
VIEWS.hrzones = function () {
  try { hrzSync(); } catch (e) {}
  var cur = hrzNow(), an = null; try { an = E.hrAnchors(Store.garmin, GX()); } catch (e) { an = null; }
  if (!cur) return '<div class="pagehead"><h1>Heart-rate zones</h1></div><section class="card"><p class="small muted">Needs a lactate threshold heart rate (from Garmin\'s detection or its guided test) or a few hard runs with heart rate.</p></section>';
  var H = (st().prefs || {}).hrz || {}, G = garminZones(), done = H.ack === cur.sig;
  var h = '<div class="pagehead"><h1>Heart-rate zones</h1><p>Built from your lactate threshold heart rate, the anchor coaches and sports scientists trust most for running, and kept up to date automatically when it changes.</p></div>';
  h += '<section class="card"><table class="t fit hrztab"><thead><tr><th>Zone</th><th class="num">BPM</th><th class="num">% LTHR</th><th>For</th></tr></thead><tbody>' + cur.z.map(function (r, i) { return '<tr><td><span class="zdot z' + (i + 1) + '"></span><b>' + (i + 1) + '</b></td><td class="num"><b>' + hrzRange(r) + '</b></td><td class="num">' + cur.pct[i][0] + '–' + (i === 4 ? cur.pct[i][1] : cur.pct[i][1]) + '%</td><td class="small">' + HRZ_USE[i][0] + '<br><span class="tiny muted">' + HRZ_USE[i][1] + '</span></td></tr>'; }).join('') + '</tbody></table>' +
    '<p class="small" style="margin-top:8px"><b>Easy runs: under ' + cur.z[1][1] + ' bpm</b> (zones 1–2). Recovery runs under ' + cur.z[0][1] + '. The app now uses these for every easy-run cap, run review and 80/20 chart.</p></section>';
  h += '<section class="card"><h3>Where these come from</h3><ul class="plain small wkl">' +
    '<li><b>Lactate threshold heart rate: ' + cur.lthr + ' bpm</b> (' + esc(an.lsrc) + (an.lthrAt ? ', ' + fmtD(an.lthrAt, { month: 'short', day: 'numeric' }) : '') + '). The heart rate you can hold for about an hour all-out. Zones are set as percentages of it (Joe Friel\'s running zones).</li>' +
    '<li><b>Max heart rate: ' + cur.max + ' bpm</b>, your highest believable reading in the last year' + (an.maxAt ? ' (' + fmtD(an.maxAt, { month: 'short', day: 'numeric' }) + ')' : '') + '.' + (an.dropped && an.dropped.length ? ' I ignored ' + an.dropped.map(function (d) { return d.v + ' bpm on ' + fmtD(d.d, { month: 'short', day: 'numeric' }); }).join(', ') + ': a sensor glitch, not a real heart rate.' : '') + '</li>' +
    '<li><b>Resting heart rate: ' + cur.rest + ' bpm</b>, the median of your last 30 days.</li>' +
    (cur.hrr ? '<li><b>Cross-check:</b> heart-rate reserve (max minus resting) at 70/75/80/85% gives ' + cur.hrr.join(' / ') + ' bpm, within a couple of beats of the zone 1–4 tops above. Two independent methods agreeing is a good sign the zones are right.</li>' : '') + '</ul></section>';
  if (G) h += '<section class="card"><h3>What Garmin uses now</h3><p class="small muted">' + (G.max ? 'Percent of max heart rate, with a max of <b>' + G.max + ' bpm</b>' + (G.max > cur.max + 3 ? ', about ' + (G.max - cur.max) + ' beats above your real max. That pushes every zone too high' : '') + '.' : 'From your newest run.') + '</p>' +
    '<table class="t fit hrztab"><thead><tr><th>Zone</th><th class="num">Garmin now</th><th class="num">New</th></tr></thead><tbody>' + G.z.map(function (r, i) { var n = cur.z[i]; return '<tr><td><span class="zdot z' + (i + 1) + '"></span>' + (i + 1) + '</td><td class="num muted">' + r[0] + (r[1] ? '–' + r[1] : '+') + '</td><td class="num"><b>' + hrzRange(n) + '</b></td></tr>'; }).join('') + '</tbody></table>' +
    '<p class="small" style="margin-top:8px">The biggest change: Garmin calls ' + (G.z[2][0]) + '+ bpm "zone 3", so ' + (G.z[2][0]) + '–' + cur.z[1][1] + ' bpm runs that are genuinely easy for you were counted as moderate.</p></section>';
  h += '<section class="card stack"><h3>Update Garmin</h3><p class="small muted">Your watch can\'t be changed from here, so here are the numbers and the steps. Setting zones by <b>%LTHR</b> is best: Garmin then moves them itself when it detects a new threshold, the same way this app does.</p>' +
    '<div class="hrzkeys"><span>Max HR <b>' + cur.max + '</b></span><span>Resting HR <b>' + cur.rest + '</b></span><span>LTHR <b>' + cur.lthr + '</b></span></div>' +
    '<h4>In the Garmin Connect app</h4><ol class="num small hrzsteps"><li>Tap your watch icon at the top (or <b>More</b> → <b>Garmin Devices</b>) and choose your <b>fēnix 7X</b>.</li><li>Open <b>User Settings</b> (on some versions <b>User Profile</b>) → <b>Heart Rate &amp; Power Zones</b> → <b>Heart Rate</b>.</li><li>Set <b>Max HR</b> to <b>' + cur.max + '</b> and <b>Resting HR</b> to <b>' + cur.rest + '</b> (or leave resting on auto). Check <b>Lactate Threshold</b> shows <b>' + cur.lthr + '</b>; keep <b>Auto Detection</b> on so it stays current.</li>' +
    '<li>Tap <b>Zones</b> → <b>Based On</b> → <b>%LTHR</b>, then enter the low % for each zone: <b>Z1 ' + cur.pct[0][0] + '%, Z2 ' + cur.pct[1][0] + '%, Z3 ' + cur.pct[2][0] + '%, Z4 ' + cur.pct[3][0] + '%, Z5 100%</b>. Garmin rounds percentages, so a boundary may land 1 bpm lower; that\'s fine. Prefer exact numbers? Choose <b>BPM</b> and enter <b>' + cur.z.map(function (r) { return r[0]; }).join(', ') + '</b> as the zone starts (but then they won\'t move on their own).</li><li>If you see <b>Sport Heart Rate Zones</b> or a <b>Running</b> zone set, enter the same values there; a running set overrides the default for runs.</li><li>Save, then sync your watch.</li></ol>' +
    '<h4>Or on the watch</h4><ol class="num small hrzsteps"><li>Hold the middle-left button (<b>MENU</b>) → <b>User Profile</b> → <b>Heart Rate &amp; Power Zones</b> → <b>Heart Rate</b>.</li><li>Set <b>Max. HR</b> ' + cur.max + ', <b>LTHR</b> ' + cur.lthr + ', <b>Resting HR</b> → Set Custom ' + cur.rest + '.</li><li><b>Zones</b> → <b>Based On</b> → <b>%LTHR</b> and enter the percentages above (or <b>BPM</b> and the zone starts).</li></ol>' +
    '<p class="tiny muted">Garmin occasionally renames these menus between app versions; the path is the same idea if a label differs.</p>' +
    (done ? '<div class="banner small"><b>Done ✓</b> You marked these as set in Garmin. If your threshold changes, I\'ll update the zones, tell you here and on Today, and send a reminder.</div>' : '<div class="btns"><button class="btn primary" data-act="hrz-ack" data-arg="' + jattr({ sig: cur.sig }) + '">I\'ve updated Garmin</button></div>') + '</section>';
  var hist = (H.hist || []).slice().reverse();
  if (hist.length) h += '<section class="card"><h3>Changes</h3>' + hist.map(function (x) { return '<div class="strow"><span>' + fmtD(x.at, { month: 'short', day: 'numeric', year: 'numeric' }) + '</span><b>' + (x.from ? 'Tops ' + x.from.replace(/\//g, ' / ') + ' → ' : 'Set: ') + x.sig.replace(/\//g, ' / ') + ' (LTHR ' + x.lthr + ')</b></div>'; }).join('') + '</section>';
  h += '<section class="card"><h3>Keep it accurate</h3><ul class="plain small wkl"><li>Your threshold estimate is only as good as your hard efforts. Every 4–6 weeks in a training block, a 30-minute solo time trial (average heart rate of the last 20 minutes ≈ LTHR) or Garmin\'s guided Lactate Threshold test with your chest strap keeps it honest.</li><li>Wear the chest strap for workouts: wrist readings lag and spike during intervals, which is how a 245 bpm reading ends up inflating max heart rate.</li></ul></section>';
  return h;
};
ACTIONS['hrz-ack'] = function (a) { Store.edit('prefs', 'hrz', function (S) { S.prefs.hrz.ack = a.sig; }); toast('Great. Your watch and the app now match'); };
/* reach it from More, the Paces page and the zones chart */
var _more31 = VIEWS.more;
VIEWS.more = function () { var h = _more31(), i = h.indexOf('<a href="#/zones"'); if (i < 0) return h; var cur = (st().prefs || {}).hrz; return h.slice(0, i) + '<a href="#/hrzones">Heart-rate zones<span class="v">' + (cur ? 'easy under ' + cur.z[1][1] : '') + '</span><span class="chev">›</span></a>' + h.slice(i); };
var _zones31 = VIEWS.zones;
VIEWS.zones = function () { var h = _zones31(); return h.replace('</h1>', '</h1>') + '<a class="card formlink" href="#/hrzones" style="margin-top:12px"><div><span class="eyebrow">Heart-rate zones</span><b>Your zones and how to set them in Garmin</b></div><span class="chev">›</span></a>'; };
App.p31 = { hrzNow: hrzNow, garminZones: garminZones };
