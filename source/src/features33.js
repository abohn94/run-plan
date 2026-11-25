/* ================= System health: say so when the automatic parts stop working =================
   The app depends on four GitHub jobs (Garmin sync, Garmin metrics, watch workouts, reminders) and on your GitHub key.
   When one fails or goes quiet, Today shows a banner and the Status page explains what to do. Checked at most every 20 min. */
TITLES.status = 'Status'; TABOF.status = 'more';
var SYS_JOBS = [
  { f: 'garmin-sync.yml', name: 'Garmin sync', every: 3, what: 'your runs, sleep and HRV' },
  { f: 'garmin-extra.yml', name: 'Garmin metrics', every: 14, what: 'VO2 max, threshold, zones and run charts' },
  { f: 'watch-workouts.yml', name: 'Watch workouts', every: 30, what: 'today\'s workouts on your watch' },
  { f: 'reminders.yml', name: 'Reminders', every: 3, what: 'check-in, shin and weekly reminders' }
];
function sysHealth(force) {
  var H = App.sys || (App.sys = { at: 0, jobs: {}, watch: null, busy: false });
  if (Store.mode !== 'github' || H.busy || (!force && Date.now() - H.at < 20 * 60 * 1000)) return H;
  H.busy = true;
  var reqs = SYS_JOBS.map(function (j) {
    return Store.api('/actions/workflows/' + j.f + '/runs?per_page=6').then(function (r) { return r.ok ? r.json() : null; }).then(function (x) {
      if (!x || !x.workflow_runs) { H.jobs[j.f] = { err: true }; return; }
      var R = x.workflow_runs, done = R.filter(function (w) { return w.status === 'completed'; });
      var ok = done.filter(function (w) { return w.conclusion === 'success'; })[0];
      H.jobs[j.f] = { last: done[0] ? { c: done[0].conclusion, at: done[0].updated_at, url: done[0].html_url } : null, ok: ok ? ok.updated_at : null, fails: (function () { var n = 0; for (var i = 0; i < done.length && done[i].conclusion !== 'success'; i++) n++; return n; })() };
    }).catch(function () { H.jobs[j.f] = { err: true }; });
  });
  reqs.push(Store.getFile('garmin/watch.json', true).then(function (f) { try { H.watch = JSON.parse(f.text); } catch (e) { H.watch = null; } }).catch(function () { H.watch = null; }));
  Promise.all(reqs).then(function () { H.at = Date.now(); H.busy = false; if (App.view === 'today' || App.view === 'status') render(); }, function () { H.busy = false; });
  return H;
}
function hrsAgo(iso) { return iso ? (Date.now() - Date.parse(iso)) / 3600000 : Infinity; }
function agoTxt(h) { return h < 1 ? Math.max(1, Math.round(h * 60)) + ' min ago' : h < 48 ? Math.round(h) + ' h ago' : Math.round(h / 24) + ' days ago'; }
/* problems, worst first: {lvl: 'bad'|'warn', t: short text, fix: what to do} */
function sysProblems() {
  var H = App.sys, P = [], p = st().prefs || {};
  if (Store.error && /token|401|403|refused/i.test(Store.error)) P.push({ lvl: 'bad', t: 'GitHub refused your key: nothing is saving', fix: 'Your GitHub token expired or lost access. Make a new one (Status page has the steps) and paste it under Sync.' });
  var exp = p.tokenExp; if (exp) { var dl = E.diffD(App.today, exp); if (dl <= 14) P.push({ lvl: dl <= 3 ? 'bad' : 'warn', t: dl < 0 ? 'Your GitHub key has expired' : 'Your GitHub key expires ' + (dl === 0 ? 'today' : 'in ' + plural(dl, 'day')), fix: 'Make a new token before it runs out (Status page has the steps) and paste it under Sync.' }); }
  if (!H || !H.at) return P;
  SYS_JOBS.forEach(function (j) {
    var J = H.jobs[j.f]; if (!J || J.err) return;
    if (j.f === 'reminders.yml' && !(p.notify && p.notify.on)) return;
    if (j.f === 'watch-workouts.yml' && !(p.watch && p.watch.on)) return;
    var h = hrsAgo(J.ok);
    if (J.fails >= 2 || h > j.every * 2) P.push({ lvl: J.fails >= 3 || h > j.every * 4 ? 'bad' : 'warn', t: j.name + (J.fails ? ' has failed ' + plural(J.fails, 'time') + ' in a row' : ' hasn\'t run') + (J.ok ? ' (last worked ' + agoTxt(h) + ')' : ''), fix: 'Affects ' + j.what + '. See the Status page.' });
  });
  var W = H.watch, today = App.today, day = dayOf(today), needW = p.watch && p.watch.on && day && day.parts.some(function (x) { return (E.isRun(x) && x.mi > 0) || x.type === 'strength'; });
  if (W && W.errors && W.errors.length) P.push({ lvl: 'warn', t: 'Garmin refused a watch workout', fix: String(W.errors[0]).slice(0, 140) });
  else if (needW && new Date().getHours() >= 2 && W && !(W.days || {})[today]) P.push({ lvl: 'warn', t: 'Today\'s workouts aren\'t on your watch yet', fix: 'They normally go out just after midnight. Open the Status page and tap "Send to watch now".' });
  var g = Store.garmin; if (g && g.status && g.status !== 'ok') P.push({ lvl: 'warn', t: 'Garmin reported a problem: ' + g.status, fix: (g.errors || [])[0] || 'See the Status page.' });
  return P.sort(function (a, b) { return a.lvl === b.lvl ? 0 : a.lvl === 'bad' ? -1 : 1; });
}
var _today33 = VIEWS.today;
VIEWS.today = function () {
  var h = _today33(); if (Store.mode !== 'github' || !st().profile) return h;
  sysHealth(false);
  var P = sysProblems(); if (!P.length) return h;
  var b = '<a class="banner ' + (P[0].lvl === 'bad' ? 'bad' : 'warn') + ' small syshealth" href="#/status"><b>' + esc(P[0].t) + '</b>' + (P.length > 1 ? ' · +' + (P.length - 1) + ' more' : '') + '<span class="chev">›</span></a>';
  var g = h.indexOf('class="greet"'), i = g >= 0 ? h.indexOf('</h1></div>', g) : -1;
  return i > 0 ? h.slice(0, i + 11) + b + h.slice(i + 11) : b + h;
};
VIEWS.status = function () {
  var H = sysHealth(false), P = sysProblems(), p = st().prefs || {};
  var h = '<div class="pagehead"><h1>Status</h1><p>Everything that runs on its own in the background, and what to do if something stops.</p></div>';
  h += P.length ? '<section class="card stack"><h3>Needs attention</h3>' + P.map(function (x) { return '<div class="cfind ' + (x.lvl === 'bad' ? 'act' : 'watch') + '"><p class="small"><b>' + esc(x.t) + '</b></p><p class="small muted">' + esc(x.fix) + '</p></div>'; }).join('') + '</section>' : (H.at ? '<div class="banner small">✓ Everything is running.</div>' : '<p class="small muted">Checking…</p>');
  h += '<section class="card stack"><h3>Background jobs</h3>' + SYS_JOBS.map(function (j) { var J = H.jobs[j.f] || {}; return '<div class="spread"><span class="small"><b>' + j.name + '</b><br><span class="muted tiny">' + j.what + '</span></span><span class="small">' + (J.err ? 'can\'t check' : J.last ? (J.last.c === 'success' ? '✓ ' : '✗ ') + agoTxt(hrsAgo(J.last.at)) : '–') + '</span></div>'; }).join('') +
    '<div class="btns"><button class="btn sm" data-act="sys-run" data-arg="' + jattr({ f: 'garmin-sync.yml' }) + '">Sync Garmin now</button><button class="btn sm" data-act="sys-run" data-arg="' + jattr({ f: 'watch-workouts.yml' }) + '">Send to watch now</button><button class="btn sm ghost" data-act="sys-check">Check again</button></div></section>';
  h += '<section class="card stack"><h3>Your GitHub key</h3><p class="small muted">The app saves through a GitHub token, and tokens expire. Enter its expiry date and the app warns you two weeks before.</p><label class="f">Token expires on<input class="i" type="date" id="sys-exp" value="' + esc(p.tokenExp || '') + '"></label><div class="btns"><button class="btn sm primary" data-act="sys-exp">Save</button></div>' +
    '<details class="mwhy"><summary>How to make a new token</summary><ol class="small"><li>On github.com: Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.</li><li>Repository access: only <b>run-plan-data</b>. Permissions: <b>Contents</b> read and write, <b>Actions</b> read and write.</li><li>Pick the longest expiry offered, generate, and copy it.</li><li>In this app: More → Sync → paste the token → Connect. Then update the date above.</li></ol></details></section>';
  h += '<section class="card stack"><h3>If something breaks</h3><ul class="plain small wkl">' +
    '<li><b>Garmin sync or metrics failing for a day or more:</b> Garmin may have changed its login. Open the failed run (GitHub → run-plan-data → Actions), read the error, and ask Claude with the error text. The fix steps are in HANDOFF.md in run-plan-data.</li>' +
    '<li><b>Watch workouts missing:</b> tap "Send to watch now" above, then sync the watch in Garmin Connect.</li>' +
    '<li><b>No reminders:</b> check the Reminders page\'s "Recently sent" list and that ntfy is subscribed to the topic shown there.</li>' +
    '<li><b>App won\'t save:</b> almost always an expired GitHub key (see above).</li></ul></section>';
  return h;
};
ACTIONS['sys-check'] = function () { sysHealth(true); toast('Checking…'); };
ACTIONS['sys-run'] = function (a) {
  Store.api('/actions/workflows/' + a.f + '/dispatches', { method: 'POST', body: { ref: 'main' } }).then(function (r) { toast(r.ok || r.status === 204 ? 'Started. Give it a few minutes' : 'GitHub said ' + r.status); setTimeout(function () { sysHealth(true); }, 90000); }).catch(function () { toast('Couldn\'t reach GitHub'); });
};
ACTIONS['sys-exp'] = function () { var v = $('#sys-exp').value; Store.edit('prefs', 'tokenExp', function (S) { S.prefs = S.prefs || {}; if (v) S.prefs.tokenExp = v; else delete S.prefs.tokenExp; }); toast(v ? 'Saved' : 'Cleared'); render(); };
/* More: a Status row at the top of the list */
var _more33 = VIEWS.more;
VIEWS.more = function () {
  var h = _more33(), P = Store.mode === 'github' ? sysProblems() : [], i = h.indexOf('<a href="#/intake"'); if (i < 0) return h;
  return h.slice(0, i) + '<a href="#/status">Status<span class="v">' + (P.length ? '⚠ ' + plural(P.length, 'problem') : 'all running') + '</span><span class="chev">›</span></a>' + h.slice(i);
};

/* ================= Shin routine: one tap from Today ================= */
var _today33b = VIEWS.today;
VIEWS.today = function () {
  var h = _today33b();
  return h.replace(/<a class="card shinrem" href="#\/shins">([\s\S]*?)<span class="chev">›<\/span><\/a>/, function (m, inner) {
    return '<div class="card shinrem shinrem2"><a class="shinlink" href="#/shins">' + inner + '</a><button class="btn sm primary" data-act="shins-done">Done ✓</button></div>';
  });
};
App.p33 = { sysProblems: sysProblems, sysHealth: sysHealth };
