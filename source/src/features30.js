/* ================= Reminders by push (ntfy): the daily check-in, the shin routine on rest days, the weekly check-in ================= */
TITLES.notify = 'Reminders';
function remPrefs() { var n = Object.assign({ on: false, topic: '', hour: 18 }, (st().prefs || {}).notify || {}); if (n.checkin == null) n.checkin = true; if (n.shins == null) n.shins = true; if (n.weekly == null) n.weekly = true; if (n.ciHour == null) { var w = /^(\d{1,2})/.exec((st().prefs || {}).wake || '07:30'); n.ciHour = Math.min(11, (w ? +w[1] : 7) + 1); } if (n.shinHour == null) n.shinHour = 19; return n; }
function hourOpts(sel, hrs) { return hrs.map(function (h) { return '<option value="' + h + '"' + (+sel === h ? ' selected' : '') + '>' + (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM') + '</option>'; }).join(''); }
VIEWS.notify = function () {
  var n = remPrefs(); if (!n.topic) n.topic = App.ui.newTopic || (App.ui.newTopic = ntfyTopic());
  var gh = Store.mode === 'github', ws = E.DOW_LONG_ABS[(wsOf() + 6) % 7];
  return '<div class="pagehead"><h1>Reminders</h1><p>Push notifications on your phone through ntfy, a free app. Tap one and it opens the right page.</p></div>' +
    (gh ? '' : '<div class="banner warn small">Reminders are sent by your Garmin sync on GitHub. <a href="#/sync">Connect it first</a>.</div>') +
    '<section class="card stack"><h3>What to send</h3>' +
    '<label class="check"><input type="checkbox" id="nt-ci"' + (n.checkin ? ' checked' : '') + '> <span><b>Daily check-in</b><br><span class="small muted">"How do you feel today?" if you haven\'t checked in yet. Your coach answers as soon as you submit.</span></span></label>' +
    '<label class="f">Send at<select class="i" id="nt-ciHour">' + hourOpts(n.ciHour, [5, 6, 7, 8, 9, 10, 11, 12]) + '</select></label>' +
    '<label class="check"><input type="checkbox" id="nt-sh"' + (n.shins ? ' checked' : '') + '> <span><b>Shin routine on rest days</b><br><span class="small muted">A reminder on days with no run, unless you\'ve already marked it done.</span></span></label>' +
    '<label class="f">Send at<select class="i" id="nt-shHour">' + hourOpts(n.shinHour, [12, 15, 16, 17, 18, 19, 20, 21]) + '</select></label>' +
    '<label class="check"><input type="checkbox" id="nt-wk"' + (n.weekly ? ' checked' : '') + '> <span><b>Weekly check-in</b><br><span class="small muted">Every ' + ws + ' evening: your coach\'s review of the week and next week\'s plan.</span></span></label>' +
    '<label class="f">Send at<select class="i" id="ntHour">' + hourOpts(n.hour, [8, 12, 16, 17, 18, 19, 20, 21]) + '</select></label></section>' +
    '<section class="card stack"><h3>Your phone</h3><div class="step"><span>1</span><div><b>Install ntfy</b><p class="small muted">Free and open source; no account needed.</p><div class="btns" style="margin-top:6px"><a class="btn sm" href="https://apps.apple.com/app/ntfy/id1625396347" target="_blank" rel="noopener">iPhone</a><a class="btn sm" href="https://play.google.com/store/apps/details?id=io.heckel.ntfy" target="_blank" rel="noopener">Android</a></div></div></div>' +
    '<div class="step"><span>2</span><div><b>Subscribe to your private topic</b><p class="small muted">In ntfy tap +, paste this name and subscribe. Treat it like a password. Reminders never include health data.</p><div class="topicrow"><code id="ntTopic">' + esc(n.topic) + '</code><button class="btn sm" data-act="nt-copy">Copy</button></div></div></div></section>' +
    '<label class="check"><input type="checkbox" id="ntOn"' + (n.on ? ' checked' : '') + '> <b>Send reminders</b></label>' +
    '<div class="btns"><button class="btn primary" data-act="nt-save">Save</button><button class="btn" data-act="nt-test">Send a test</button></div>' +
    '<p class="tiny muted">Reminders go out with the hourly sync, so one can arrive up to an hour after the time you pick.</p>';
};
ntRead = function () { return { on: $('#ntOn').checked, topic: $('#ntTopic').textContent.trim(), hour: +$('#ntHour').value, tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'), checkin: $('#nt-ci').checked, ciHour: +$('#nt-ciHour').value, shins: $('#nt-sh').checked, shinHour: +$('#nt-shHour').value, weekly: $('#nt-wk').checked }; };
ACTIONS['nt-save'] = function () { var n = ntRead(); Store.edit('prefs', 'notify', function (S) { S.prefs = S.prefs || {}; S.prefs.notify = n; }); toast(n.on ? 'Reminders on' : 'Saved'); };
ACTIONS['nt-test'] = function () {
  var n = ntRead(), url = location.href.split('#')[0] + '#/today/checkin';
  fetch('https://ntfy.sh/' + encodeURIComponent(n.topic), { method: 'POST', body: 'This is how your daily check-in reminder will look. Tap to check in.', headers: { Title: 'How do you feel today?', Click: url, Tags: 'wave' } })
    .then(function (r) { toast(r.ok ? 'Test sent. Check your phone' : 'ntfy said ' + r.status); }).catch(function () { toast('Could not reach ntfy.sh'); });
};
/* the More menu calls it Reminders now */
var _more30 = VIEWS.more;
VIEWS.more = function () { var n = remPrefs(); return _more30().replace(/>Weekly review reminder<span class="v">[^<]*<\/span>/, '>Reminders<span class="v">' + (n.on ? [n.checkin && 'check-in', n.shins && 'shins', n.weekly && 'weekly'].filter(Boolean).join(' · ') : 'Off') + '</span>'); };

/* ---------- a reminder opens the check-in directly ---------- */
var _today30 = VIEWS.today;
VIEWS.today = function () {
  var h = _today30();
  if (App.args[0] === 'checkin') { App.after = function () { try { history.replaceState(null, '', '#/today'); } catch (e) {} openSheet('checkin', {}); }; App.args = []; }
  return h;
};

/* ---------- the shin routine: mark it done (and the rest-day reminder stops) ---------- */
function shinsDone(d) { return !!(logOf(d || App.today).shins); }
var _shins30 = VIEWS.shins;
VIEWS.shins = function () {
  var h = _shins30(), done = shinsDone(), day = dayOf(App.today), rest = day && day.parts.every(function (p) { return p.type === 'rest'; });
  var c = '<section class="card shindone"><div class="spread"><div><b>' + (done ? 'Done for today ✓' : rest ? 'Rest day: today\'s one job' : 'Today\'s routine') + '</b><p class="small muted" style="margin:2px 0 0">' + (done ? 'Nice. Consistency here is what lets the miles go up.' : 'About 12 minutes. Mark it when you finish.') + '</p></div>' + (done ? '<button class="btn sm ghost" data-act="shins-undo">Undo</button>' : '<button class="btn sm primary" data-act="shins-done">Mark done</button>') + '</div>' + shinStreak() + '</section>';
  var i = h.indexOf('<section'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};
function shinStreak() { var n = 0, d = App.today; for (var i = 0; i < 14; i++) { if (shinsDone(E.addD(d, -i))) n++; } return n ? '<p class="tiny muted" style="margin-top:8px">' + n + ' of the last 14 days done.</p>' : ''; }
ACTIONS['shins-done'] = function () { var d = App.today; Store.edit('logs', d, function (S) { S.logs[d] = S.logs[d] || {}; S.logs[d].shins = true; }); toast('Shin routine done'); };
ACTIONS['shins-undo'] = function () { var d = App.today; Store.edit('logs', d, function (S) { if (S.logs[d]) delete S.logs[d].shins; }); };
/* on a rest day, Today carries the reminder too */
var _today30b = VIEWS.today;
VIEWS.today = function () {
  var h = _today30b(), day = dayOf(App.today), p = st().profile || {};
  if (!day || !day.parts.every(function (x) { return x.type === 'rest'; }) || shinsDone() || !(p.injuryProne || remPrefs().shins)) return h;
  var c = '<a class="card shinrem" href="#/shins"><span aria-hidden="true">🦵</span><span><b>Shin routine</b><small>Rest day: about 12 minutes of calf, shin and foot work.</small></span><span class="chev">›</span></a>';
  var g = h.indexOf('class="herow'); if (g < 0) g = h.indexOf('class="restrow'); g = g >= 0 ? h.indexOf('</a>', g) : -1;
  return g > 0 ? h.slice(0, g + 4) + c + h.slice(g + 4) : h;
};
App.p30 = { remPrefs: remPrefs };
