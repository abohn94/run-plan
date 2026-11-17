/* ================= Why a workout changed · runner type · a gentler first two weeks on a new watch ================= */

/* ---------- "Adjusted": tap it to see why, and where to change it ---------- */
var ADJ_WHY = [
  [/shin-load ceiling/i, 'Shin-load ceiling', 'This week would have jumped past the miles your legs have handled lately, so easy and long runs were trimmed a little. Big jumps in weekly miles are the most common cause of shin splints and stress injuries.', 'volume'],
  [/Matched to what you have been running|Long run capped to match recent running|match recent/i, 'Matched to your recent weeks', 'You ran well under the plan for a couple of weeks, so this week starts closer to what you\'ve actually been running. Stepping back up gradually is safer than jumping straight back to the plan.', 'volume'],
  [/weekday limit/i, 'Your weekday time limit', 'You set a maximum length for weekday runs, so this one was shortened to fit.', 'settings'],
  [/Training balance|anaerobic load|load focus/i, 'Garmin training balance', 'Your Garmin 4-week load shows a gap in one kind of training, so a small piece of it was added. It costs almost no extra fatigue.', 'control'],
  [/heat|humid|dew point/i, 'Heat and humidity', 'The forecast is warm or humid at your run time, so the target pace was slowed to keep the effort the same.', 'control'],
  [/in the dark|before sunrise|after sunset|dark by|daylight run/i, 'Daylight', 'The run would have finished in the dark, so it moved or changed to fit the daylight you have.', 'control'],
  [/shift|work/i, 'Your work schedule', 'A work shift changed what fits that day, so the session was moved or eased.', 'calreview'],
  [/Comeback week|Starter week/i, 'Comeback or starter block', 'In the first weeks back (or the first weeks ever), runs are set by time, with walk breaks where they help, so muscles, tendons and bones can catch up.', 'settings'],
  [/Return ladder/i, 'Return ladder', 'You\'re working back from pain one step at a time. Each step has to be pain-free before the next.', null],
  [/readiness|recovering|recovery markers|HRV|sleep/i, 'Morning readiness', 'Your sleep, HRV, resting heart rate or Garmin recovery time suggested an easier day. You chose to take the suggestion.', null],
  [/Added by you|by your choice|Swapped|Shortened:|Coach swap/i, 'Your choice', 'You changed this yourself.', null],
  [/cutback|lighter week|Busy week|vacation|sick|niggle/i, 'Week status', 'This week is marked lighter (busy, vacation, sick or a niggle), so sessions are scaled to fit.', null]
];
function adjustReasons(date) {
  var d = dayOf(date), w = App.plan && E.weekOf(App.plan, date); if (!d) return [];
  var txt = d.parts.map(function (p) { return (p.note || '') + ' ' + (p.title || ''); }).join(' ') + ' ' + ((w && w.advice || []).map(function (a) { return a.label; }).join(' '));
  if (w && w.mod && w.mod.phase === 'compliance') txt += ' Matched to what you have been running';
  if (w && w.mod && w.mod.phase === 'status') txt += ' lighter week';
  var out = [];
  d.parts.forEach(function (p) { if (p.moved && !out.length) out.push({ t: 'Moved', b: 'This session was moved here from ' + fmtD(p.moved, { weekday: 'long' }) + ', by you or to fit your schedule. The workout itself is the same.', go: null }); });
  ADJ_WHY.forEach(function (r) { if (r[0].test(txt) && !out.some(function (o) { return o.t === r[1]; })) out.push({ t: r[1], b: r[2], go: r[3] }); });
  return out;
}
SHEETS.whyadj = function (a) {
  var d = dayOf(a.date), from = d && d.parts.filter(function (p) { return p.from; })[0], rs = adjustReasons(a.date);
  var go = { volume: ['Adjust to your recent running', '#/settings', 'set-volume'], settings: ['Plan settings', '#/settings', null], control: ['Plan control: automatic or ask me first', '#/control', null], calreview: ['Work schedule review', '#/calreview', null] };
  var links = []; rs.forEach(function (r) { if (r.go && go[r.go] && !links.some(function (l) { return l[1] === go[r.go][1] && l[2] === go[r.go][2]; })) links.push(go[r.go]); });
  if (!links.some(function (l) { return l[2] === 'set-volume'; })) links.push(go.volume);
  if (!links.some(function (l) { return l[1] === '#/control'; })) links.push(go.control);
  return '<h3>Why this workout changed</h3><p class="small muted">The app adapts your plan to keep training safe and useful. Here is what changed ' + (a.date === App.today ? 'today' : 'on ' + fmtD(a.date, { weekday: 'long' })) + (from ? ' (originally: ' + esc(from.from) + ')' : '') + '.</p>' +
    (rs.length ? '<div class="stack tight">' + rs.map(function (r) { return '<div class="why"><b>' + esc(r.t) + '</b><p class="small">' + esc(r.b) + '</p></div>'; }).join('') + '</div>' : '<p class="small">A small change from the original plan to fit this week. The session page shows the details.</p>') +
    '<p class="tiny muted" style="margin-top:4px">You stay in charge: turn these checks off, or have the app ask before changing anything.</p>' +
    '<div class="stack tight" style="margin-top:6px">' + links.map(function (l) { return '<button class="btn sm' + (l[2] ? ' primary' : '') + '" data-act="adj-go" data-arg="' + jattr({ h: l[1], id: l[2] }) + '">' + esc(l[0]) + ' ›</button>'; }).join('') + '<button class="btn sm ghost" data-act="sheet-close">Close</button></div>';
};
ACTIONS['why-adjusted'] = function (a, el, e) { if (e) { e.preventDefault(); e.stopPropagation(); } openSheet('whyadj', a); };
ACTIONS['adj-go'] = function (a) { closeSheet(); setTimeout(function () { go(a.h); if (a.id) setTimeout(function () { var x = document.getElementById(a.id); if (x) { x.scrollIntoView({ block: 'start' }); x.classList.add('flash'); setTimeout(function () { x.classList.remove('flash'); }, 1600); } }, 300); }, 60); };
document.addEventListener('keydown', function (e) { var t = e.target; if ((e.key === 'Enter' || e.key === ' ') && t && t.dataset && t.dataset.act === 'why-adjusted') { e.preventDefault(); t.click(); } });

/* ---------- runner type: one place to say what kind of runner you are ---------- */
var RUNNER_TYPES = [
  ['starter', 'Brand new to running', 'An 8-week run-walk start, by time, building to 30 minutes non-stop. Simple screens.'],
  ['comeback', 'Coming back from a break', 'Starts from a share of what you ran before, with timed weeks first. Tell us how long you were off.'],
  ['regular', 'Regular runner', 'You run most weeks and have done a few races. The standard plan.'],
  ['exp', 'Experienced', 'Years of structured training. Full numbers, pace suggestions and bigger workouts.']
];
function runnerType(p) { p = p || st().profile || {}; if (p.comeback && +p.comeback.off) return 'comeback'; if (p.level === 'new') return 'starter'; if (p.level === 'exp') return 'exp'; return 'regular'; }
function runnerTypeLabel(p) { p = p || st().profile || {}; var t = RUNNER_TYPES.filter(function (x) { return x[0] === runnerType(p); })[0][1]; var mods = []; if (p.masters) mods.push('masters'); if (+p.weekdayMin) mods.push('weekdays ≤ ' + p.weekdayMin + ' min'); return t + (mods.length ? ' · ' + mods.join(' · ') : ''); }
SHEETS.runnertype = function () {
  var p = st().profile || {}, cur = runnerType(p); sheetCtx.rt = cur;
  return '<h3>What kind of runner are you?</h3><p class="small muted">This shapes how runs are written (by time or distance), how fast the plan builds, and how much detail you see. You can change it any time; your logs are kept.</p>' +
    '<div class="stack tight rt-list">' + RUNNER_TYPES.map(function (r) { return '<button type="button" class="opt rt" data-act="rt-pick" data-arg="' + jattr({ k: r[0] }) + '" aria-pressed="' + (cur === r[0]) + '"><b>' + esc(r[1]) + '</b><span class="small muted">' + esc(r[2]) + '</span></button>'; }).join('') + '</div>' +
    '<div id="rt-cb" class="grid2"' + (cur === 'comeback' ? '' : ' hidden') + '><label class="f">Time off<select class="i" id="rt-off">' + [[3, '2 to 4 weeks'], [6, '5 to 8 weeks'], [12, '2 to 4 months'], [30, '4 months to a year'], [60, 'More than a year']].map(function (o) { return '<option value="' + o[0] + '"' + (p.comeback && +p.comeback.off === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label><label class="f">Miles a week before<input class="i" id="rt-before" type="number" min="0" max="150" value="' + esc(p.comeback ? p.comeback.before || '' : '') + '" placeholder="e.g. 25"></label></div>' +
    '<h4>Also true for me</h4><label class="check"><input type="checkbox" id="rt-masters"' + (p.masters ? ' checked' : '') + '> 40 or older: a lighter week every third week</label>' +
    '<label class="f">Longest weekday run<select class="i" id="rt-wd">' + [[0, 'No limit'], [40, '40 minutes'], [50, '50 minutes'], [60, '1 hour'], [75, '1 hour 15'], [90, '1 hour 30']].map(function (o) { return '<option value="' + o[0] + '"' + ((+p.weekdayMin || 0) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label>' +
    '<div class="btns"><button class="btn primary" data-act="rt-save">Save and rebuild plan</button><button class="btn ghost" data-act="sheet-close">Cancel</button></div>';
};
ACTIONS['rt-pick'] = function (a) { sheetCtx.rt = a.k; $$('[data-act="rt-pick"]').forEach(function (b) { b.setAttribute('aria-pressed', String(JSON.parse(b.dataset.arg).k === a.k)); }); var cb = $('#rt-cb'); if (cb) cb.hidden = a.k !== 'comeback'; };
ACTIONS['rt-save'] = function () {
  var k = sheetCtx.rt, masters = $('#rt-masters').checked, wd = +$('#rt-wd').value || 0, off = +$('#rt-off').value || 3, before = +$('#rt-before').value || 0;
  Store.edit('profile', null, function (S) {
    var p = S.profile; if (!p) return;
    p.masters = masters; p.weekdayMin = wd;
    if (k === 'starter') { p.level = 'new'; if (+p.mpw > 3) { p.prevMpw = p.mpw; p.mpw = 0; } delete p.comeback; }
    else if (k === 'comeback') { p.level = p.level === 'exp' ? 'exp' : 'some'; p.comeback = { off: off, before: before, from: (p.comeback && p.comeback.from) || App.today }; }
    else { p.level = k === 'exp' ? 'exp' : 'some'; delete p.comeback; if (p.prevMpw && !(+p.mpw)) p.mpw = p.prevMpw; }
  });
  if (k === 'starter' || k === 'comeback') Store.edit('prefs', 'display', function (S) { S.prefs = S.prefs || {}; if (S.prefs.display == null) S.prefs.display = 'simple'; });
  closeSheet(); toast('Plan rebuilt for: ' + RUNNER_TYPES.filter(function (x) { return x[0] === k; })[0][1].toLowerCase());
};
function runnerTypeCard() {
  if (!st().profile) return '';
  return '<button class="card rtcard" data-act="sheet" data-arg="' + jattr({ sheet: 'runnertype' }) + '"><div><span class="eyebrow">Runner type</span><b>' + esc(runnerTypeLabel()) + '</b></div><span class="btn sm">Change</span></button>';
}
var _you18 = VIEWS.you;
VIEWS.you = function () { var h = _you18(), c = runnerTypeCard(); if (!c) return h; var i = h.indexOf('<div class="sechead"><h2>Your plan</h2>'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c; };
var _settings18 = VIEWS.settings;
VIEWS.settings = function () { var h = _settings18(), c = runnerTypeCard(); if (!c) return h; var i = h.indexOf('<form'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h; };

/* ---------- a new watch: readiness waits for a baseline, and says so ---------- */
function nightsOnWatch() { var d = (Store.garmin && Store.garmin.days) || {}; return Object.keys(d).filter(function (k) { var x = d[k]; return x && (x.hrv || x.sleepH || x.rhr); }).length; }
var _today18 = VIEWS.today;
VIEWS.today = function () {
  var h = _today18();
  if (Store.mode === 'github' && Store.garmin && nightsOnWatch() < 14) {
    var n = nightsOnWatch();
    h = h.replace(/In the Garmin Connect app: ☰ More → Performance Stats → VO2 Max and Lactate Threshold\. Enter the numbers here and your paces update\./, 'A new watch estimates VO2 max after a few outdoor runs with heart rate, and lactate threshold after its guided test. Until then the app sets your paces from your runs, so there is nothing to enter yet.');
    h = h.replace('Sync your watch with Garmin Connect, or do a quick check-in.', 'Your watch is learning your normal sleep, HRV and resting heart rate. Wear it to bed; readiness switches on after about two weeks (' + n + ' of 14 nights so far). Until then, a 10-second check-in works.');
  }
  return h;
};
App.p18 = { adjustReasons: adjustReasons, runnerType: runnerType };
