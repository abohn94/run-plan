/* ================= What a coach asks before coaching you: your running background, injury history, pain on a 0–10 scale,
   monthly strength checks and what your races are like. The coach turns each into a rule it keeps checking. ================= */
TITLES.intake = 'Your running background'; TABOF.intake = 'coach';
TITLES.rchecks = 'Strength checks'; TABOF.rchecks = 'progress';
function INTK() { return st().intake || {}; }
var IK_YEARS = [['0', 'Under 1 year'], ['1', '1–2 years'], ['3', '3–5 years'], ['6', '6–10 years'], ['10', 'More than 10']];
var IK_WHEN = [['now', 'This year'], ['1', '1–2 years ago'], ['3', '3+ years ago']];
var IK_INJ = [['shin', 'Shin splints'], ['stressfx', 'Stress fracture'], ['achilles', 'Achilles'], ['calf', 'Calf strain'], ['plantar', 'Plantar fasciitis'], ['knee', 'Runner\'s knee'], ['itb', 'IT band'], ['hip', 'Hip or glute'], ['ham', 'Hamstring'], ['back', 'Low back'], ['other', 'Other']];
var IK_LOWER = { shin: 1, stressfx: 1, achilles: 1, calf: 1, plantar: 1 };
var IK_SURF = [['road', 'Road'], ['trail', 'Trail'], ['track', 'Track'], ['tread', 'Treadmill'], ['grass', 'Grass']];
var IK_XT = [['bike', 'Bike'], ['pool', 'Pool'], ['ellip', 'Elliptical'], ['incline', 'Incline treadmill'], ['row', 'Rower']];
var IK_PR = [['5k', '5K', 3.107], ['10k', '10K', 6.214], ['half', 'Half', 13.109], ['full', 'Marathon', 26.219]];
function ikName(list, k) { return ((list.filter(function (x) { return x[0] === k; })[0]) || [k, k])[1]; }
function ikInjuries(I) { var o = (I || INTK()).inj || {}; return Object.keys(o).map(function (k) { return Object.assign({ k: k, name: ikName(IK_INJ, k) }, o[k]); }); }
function ikLowerLeg(I) { return ikInjuries(I).filter(function (x) { return IK_LOWER[x.k]; }); }
function ikXT() { var x = INTK().xt || []; return x.length ? x.map(function (k) { return ikName(IK_XT, k).toLowerCase(); }) : ['bike', 'elliptical', 'pool']; }
/* the most you've ever held: what you told me, or the best 3-week average the app has seen */
function ikSustainedPeak() {
  return cm('ikpeak', function () {
    var by = {}; allRuns().forEach(function (r) { var w = wkStart(r.date); by[w] = (by[w] || 0) + r.mi; });
    var ks = Object.keys(by).sort(), best = 0;
    for (var i = 2; i < ks.length; i++) { if (E.diffD(ks[i - 2], ks[i]) !== 14) continue; best = Math.max(best, (by[ks[i]] + by[ks[i - 1]] + by[ks[i - 2]]) / 3); }
    return Math.round(best);
  });
}
function ikPeakEver() { return Math.max(+INTK().peakMpw || 0, ikSustainedPeak() || 0); }
function ikPRvdot(maxYears) {
  var P = INTK().pr || {}, best = null, yr = +App.today.slice(0, 4);
  IK_PR.forEach(function (d) { var x = P[d[0]]; if (!x || !x.t) return; var t = E.parseClock(x.t); if (!(t > 0)) return; if (maxYears != null && x.y && yr - +x.y > maxYears) return; var v = E.vdotOf(d[2], t); if (!best || v > best.v) best = { v: v, d: d[1], t: x.t, y: x.y }; });
  return best;
}

/* ---------- the intake page ---------- */
function ikDraft() {
  if (!App.ui.ik) { var I = JSON.parse(JSON.stringify(INTK())); I.inj = I.inj || {}; I.pr = I.pr || {}; I.surf = I.surf || []; I.xt = I.xt || []; if (I.prone == null) I.prone = !!(st().profile || {}).injuryProne; App.ui.ik = I; }
  return App.ui.ik;
}
function ikRead() {
  var D = ikDraft(), v = function (id) { var el = $('#' + id); return el ? el.value.trim() : ''; };
  if (!$('#ik-years')) return D;
  D.years = v('ik-years'); D.peakMpw = +v('ik-peak') || null; D.peakWhen = v('ik-peakw'); D.longest = +v('ik-long') || null;
  IK_PR.forEach(function (d) { var t = v('ik-pr-' + d[0]), y = v('ik-py-' + d[0]); if (t || y) D.pr[d[0]] = { t: t, y: +y || null }; else delete D.pr[d[0]]; });
  D.hrMed = !!($('#ik-med') || {}).checked; D.notes = v('ik-notes');
  var pr = $('#ik-prone'); if (pr) D.prone = pr.checked;
  return D;
}
function ikChip(act, arg, label, on) { return '<button type="button" class="chip" data-act="' + act + '" data-arg="' + jattr(arg) + '" aria-pressed="' + !!on + '">' + label + '</button>'; }
VIEWS.intake = function () {
  var D = ikDraft(), saved = !!INTK().at, low = Object.keys(D.inj).some(function (k) { return IK_LOWER[k]; });
  var opt = function (list, sel) { return '<option value="">Choose</option>' + list.map(function (o) { return '<option value="' + o[0] + '"' + (String(sel) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); };
  var h = '<div class="pagehead"><h1>Your running background</h1><p>What a coach asks at the first meeting. Your watch can\'t tell me any of this, and it changes how fast I build your miles, which exercises I give you and how I read pain. About two minutes.</p></div>';
  h += '<section class="card stack"><h3>Experience</h3><label class="f">How long have you been running regularly?<select class="i" id="ik-years">' + opt(IK_YEARS, D.years) + '</select></label>' +
    '<div class="grid2"><label class="f">Most miles a week you\'ve held for a month or more<input class="i" id="ik-peak" type="number" inputmode="decimal" min="0" max="200" placeholder="e.g. 30" value="' + (D.peakMpw || '') + '"></label><label class="f">When was that?<select class="i" id="ik-peakw">' + opt(IK_WHEN, D.peakWhen) + '</select></label></div>' +
    (ikSustainedPeak() ? '<p class="tiny muted">Your Garmin history shows ' + ikSustainedPeak() + ' mi a week as your best three-week average.</p>' : '') +
    '<label class="f">Longest run you\'ve ever done (mi)<input class="i" id="ik-long" type="number" inputmode="decimal" min="0" max="100" placeholder="e.g. 13.1" value="' + (D.longest || '') + '"></label></section>';
  h += '<section class="card stack"><h3>Personal bests</h3><p class="small muted">Optional. Times as h:mm:ss or mm:ss, and the year. I use recent ones to check that your goals and paces are realistic.</p>' +
    IK_PR.map(function (d) { var x = D.pr[d[0]] || {}; return '<div class="ikpr"><b>' + d[1] + '</b><input class="i" id="ik-pr-' + d[0] + '" placeholder="time" value="' + esc(x.t || '') + '"><input class="i" id="ik-py-' + d[0] + '" type="number" inputmode="numeric" min="1970" max="2030" placeholder="year" value="' + (x.y || '') + '"></div>'; }).join('') + '</section>';
  h += '<section class="card stack"><h3>Injury history</h3><p class="small muted">Tap anything you\'ve had. Past injuries are the strongest predictor of the next one, so this decides which strength work I give you.</p><div class="chips">' +
    IK_INJ.map(function (o) { return ikChip('ik-inj', { k: o[0] }, o[1], D.inj[o[0]]); }).join('') + '</div>' +
    Object.keys(D.inj).map(function (k) { var x = D.inj[k]; return '<div class="ikinj"><b>' + ikName(IK_INJ, k) + '</b><div class="chips">' + ikChip('ik-injs', { k: k, f: 'when', v: 'recent' }, 'In the last year', x.when === 'recent') + ikChip('ik-injs', { k: k, f: 'when', v: 'old' }, 'Longer ago', x.when === 'old') + '</div><div class="chips">' + ikChip('ik-injs', { k: k, f: 'st', v: 'gone' }, 'Fully healed', x.st === 'gone') + ikChip('ik-injs', { k: k, f: 'st', v: 'niggle' }, 'Still niggles', x.st === 'niggle') + ikChip('ik-injs', { k: k, f: 'st', v: 'now' }, 'Injured now', x.st === 'now') + '</div></div>'; }).join('') +
    (low ? '<label class="check"><input type="checkbox" id="ik-prone"' + (D.prone ? ' checked' : '') + '> <span><b>Build my miles more gently</b><br><span class="small muted">With a lower-leg injury in your history I\'d cap weekly increases lower, keep the long run a smaller share of the week and keep the shin routine in your plan. Untick to keep the normal build.</span></span></label>' : '') + '</section>';
  h += '<section class="card stack"><h3>Where and how you train</h3><label class="f">Surfaces you can run on<div class="chips">' + IK_SURF.map(function (o) { return ikChip('ik-tog', { f: 'surf', k: o[0] }, o[1], D.surf.indexOf(o[0]) >= 0); }).join('') + '</div></label>' +
    '<label class="f">Cross-training you have access to<div class="chips">' + IK_XT.map(function (o) { return ikChip('ik-tog', { f: 'xt', k: o[0] }, o[1], D.xt.indexOf(o[0]) >= 0); }).join('') + '</div></label><p class="tiny muted">When something hurts, I swap runs for the cross-training you can actually do.</p></section>';
  h += '<section class="card stack"><h3>Health</h3><label class="check"><input type="checkbox" id="ik-med"' + (D.hrMed ? ' checked' : '') + '> <span><b>I take a medication that affects heart rate</b><br><span class="small muted">For example a beta blocker. Heart-rate zones don\'t work properly on these, so I\'ll coach easy days by effort and breathing instead of bpm.</span></span></label>' +
    '<label class="f">Anything else your coach should know?<input class="i" id="ik-notes" placeholder="e.g. flat feet, orthotics, asthma in cold air" value="' + esc(D.notes || '') + '"></label></section>';
  return h + '<div class="btns"><button class="btn primary" data-act="ik-save">' + (saved ? 'Save changes' : 'Send to coach') + '</button><a class="btn ghost" href="#/coach">Cancel</a></div>';
};
function ikRerender() { ikRead(); var y = window.scrollY; render(); window.scrollTo(0, y); }
ACTIONS['ik-inj'] = function (a) { var D = ikRead(); if (D.inj[a.k]) delete D.inj[a.k]; else { D.inj[a.k] = { when: 'old', st: 'gone' }; if (IK_LOWER[a.k]) D.prone = true; } ikRerender(); };
ACTIONS['ik-injs'] = function (a) { var D = ikRead(); if (D.inj[a.k]) D.inj[a.k][a.f] = a.v; ikRerender(); };
ACTIONS['ik-tog'] = function (a) { var D = ikRead(), L = D[a.f], i = L.indexOf(a.k); if (i >= 0) L.splice(i, 1); else L.push(a.k); ikRerender(); };
ACTIONS['ik-save'] = function () {
  var D = ikRead();
  for (var k in D.pr) { if (D.pr[k].t && !(E.parseClock(D.pr[k].t) > 0)) { toast('Check the ' + ikName(IK_PR, k) + ' time (h:mm:ss)'); return; } }
  var I = Object.assign({}, D, { at: new Date().toISOString() }), low = ikLowerLeg(I).length, wasProne = !!(st().profile || {}).injuryProne, prone = low ? !!D.prone : wasProne;
  Store.editMany([['intake', null], ['profile', null]], function (S) { S.intake = I; if (S.profile) S.profile.injuryProne = prone; });
  App.ui.ik = null;
  var say = ['Thanks. This changes how I coach you:'];
  var pe = ikPeakEver(); if (pe) say.push('• I\'ll keep each training block\'s peak within about 20–25% of the most you\'ve held (' + pe + ' mi a week), then raise it once you\'ve absorbed it.');
  if (low) say.push('• Lower-leg history (' + ikLowerLeg(I).map(function (x) { return x.name.toLowerCase(); }).join(', ') + '): ' + (prone ? 'gentler build, a smaller long-run share and the shin routine stay on.' : 'you chose the normal build; I\'ll watch your pain scores closely.'));
  var inj = ikInjuries(I).filter(function (x) { return !IK_LOWER[x.k]; }); if (inj.length) say.push('• I\'ll add prehab for your ' + inj.map(function (x) { return x.name.toLowerCase(); }).join(', ') + ' history.');
  if (I.hrMed) say.push('• Easy days go by effort and breathing, not heart rate; I\'ve turned off bpm caps.');
  if (ikInjuries(I).some(function (x) { return x.st === 'now'; })) say.push('• You said something is injured now: log it under "Something came up → Injury" so the plan backs off and the return ladder takes over.');
  say.push('Next: do the four-test strength check so I know where your calves and hips are.');
  coachSay(say.join('\n'), [{ label: 'Do the strength check', act: { nav: '#/rchecks' } }]);
  if (I.hrMed) Store.edit('prefs', 'easyCap', function (S) { S.prefs = S.prefs || {}; delete S.prefs.easyCap; });
  toast('Saved. Your coach has it'); go('#/coach');
};

/* ---------- monthly strength and resilience checks ---------- */
var RC_TESTS = [
  { k: 'heel', name: 'Single-leg calf raises', unit: 'reps', target: 25, how: 'Stand on one foot on a step, fingertips on a wall for balance only. Rise as high as you can and lower all the way, about one rep per second, knee straight. Stop when you can\'t reach full height. Count clean reps.', why: 'Calves and Achilles absorb several times your body weight every stride. Low counts, or one side much weaker, go with shin, calf and Achilles trouble.', fix: 'heel' },
  { k: 'bridge', name: 'Single-leg bridge', unit: 'reps', target: 20, how: 'On your back, one foot flat with the knee bent to 90°, other leg pointing up. Push through the heel until hips are level with your knee, lower to tap the floor. Stop when your hips tilt or the back takes over.', why: 'Glutes and hamstrings hold your pelvis and knee steady. Weakness here shows up as runner\'s knee, IT band and hip pain.', fix: 'bridge' },
  { k: 'plank', name: 'Side plank', unit: 'sec', target: 60, how: 'On your forearm, elbow under shoulder, feet stacked, body in a straight line. Hold until your hips start to sag.', why: 'Lateral hip and trunk strength stops your pelvis dropping each time you land, which shows up late in long runs as form falling apart.', fix: 'plank' },
  { k: 'bal', name: 'Single-leg balance, eyes closed', unit: 'sec', target: 15, how: 'Barefoot, stand on one leg, hands on hips, then close your eyes. Time it until your other foot touches down or your hands come off your hips. Best of two tries; stop at 30.', why: 'Ankle and foot control. Poor balance goes with ankle sprains and overloading the shin and foot.', fix: 'bal' }
];
var RC_FIX = {
  heel: { name: 'Calf raises', dose: '3 × 15 each leg, straight knee and bent knee, slow 3-second lowering; add a backpack once 25 is easy', for: 'calves and Achilles' },
  bridge: { name: 'Single-leg bridges and step-downs', dose: '3 × 12 each leg, pause 2 seconds at the top; step-downs off a stair, knee tracking over the 2nd toe', for: 'glutes and knees' },
  plank: { name: 'Side planks and side-lying leg raises', dose: '3 × 30–45 s each side, plus 2 × 15 slow leg raises', for: 'hips and trunk' },
  bal: { name: 'Single-leg balance work', dose: '3 × 30 s each leg daily (brushing teeth works), eyes closed once steady, then on a pillow', for: 'ankle and foot control' },
  achilles: { name: 'Slow heel drops', dose: '3 × 15 each leg off a step, lowering over 3 seconds, straight and bent knee', for: 'Achilles history' },
  plantar: { name: 'Toe-towel heel raises and short-foot', dose: '3 × 12 heel raises with toes up on a rolled towel, slow; 3 × 10 short-foot holds', for: 'plantar fascia history' },
  ham: { name: 'Single-leg deadlifts and bridge walkouts', dose: '3 × 10 each leg, slow', for: 'hamstring history' },
  back: { name: 'Dead bugs and bird dogs', dose: '3 × 10 each side, slow', for: 'low-back history' },
  hip: { name: 'Clamshells and lateral band walks', dose: '3 × 15 each side', for: 'hip and IT band history' }
};
function rcList() { return (st().rchecks || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }
function rcLast() { var L = rcList(); return L[L.length - 1] || null; }
function rcAsym(l, r) { if (l == null || r == null || Math.max(l, r) <= 0) return 0; return Math.abs(l - r) / Math.max(l, r); }
/* what a set of results says: below target and left/right gaps */
function rcAssess(c) {
  var out = [];
  if (!c) return out;
  RC_TESTS.forEach(function (t) {
    var l = c[t.k + 'L'], r = c[t.k + 'R']; if (l == null && r == null) return;
    var lo = Math.min(l != null ? l : r, r != null ? r : l), as = rcAsym(l, r), weak = l != null && r != null ? (l < r ? 'left' : 'right') : '';
    out.push({ t: t, l: l, r: r, low: lo < t.target, asym: as, weak: weak, flag: lo < t.target || as > 0.15 });
  });
  return out;
}
function rcDue() { var c = rcLast(); return !c || E.diffD(c.date, App.today) >= 28; }
function rcPrehab() {
  var keys = [], A = rcAssess(rcLast()).filter(function (x) { return x.flag; });
  A.forEach(function (x) { if (keys.indexOf(x.t.fix) < 0) keys.push(x.t.fix); });
  ikInjuries().forEach(function (x) { var k = { achilles: 'achilles', calf: 'heel', shin: 'heel', stressfx: 'heel', plantar: 'plantar', ham: 'ham', back: 'back', hip: 'hip', itb: 'hip', knee: 'bridge' }[x.k]; if (k && keys.indexOf(k) < 0) keys.push(k); });
  return keys.slice(0, 4);
}
function rcResultLine(x) { var u = x.t.unit === 'sec' ? ' s' : ''; return x.t.name + ': ' + (x.l != null ? 'L ' + x.l + u : '') + (x.l != null && x.r != null ? ' / ' : '') + (x.r != null ? 'R ' + x.r + u : '') + ' (target ' + x.t.target + u + (x.asym > 0.1 ? ', ' + x.weak + ' ' + Math.round(x.asym * 100) + '% weaker' : '') + ')'; }
VIEWS.rchecks = function () {
  var last = rcLast(), L = rcList(), A = rcAssess(last), pre = rcPrehab();
  var h = '<div class="pagehead"><h1>Strength checks</h1><p>Four quick tests, once a month, about 10 minutes. They show whether your calves, hips and ankles can handle the miles that are coming, and whether one side is lagging. Each side counts separately.</p></div>';
  if (last) h += '<section class="card"><div class="spread"><h3>Last check</h3><span class="small muted">' + fmtD(last.date, { month: 'short', day: 'numeric' }) + (rcDue() ? ' · due again' : ' · next ' + fmtD(E.addD(last.date, 28), { month: 'short', day: 'numeric' })) + '</span></div>' +
    '<ul class="plain small wkl">' + A.map(function (x) { return '<li>' + (x.flag ? '<span class="rcflag">!</span> ' : '✓ ') + esc(rcResultLine(x)) + '</li>'; }).join('') + '</ul>' +
    (pre.length ? '<p class="small" style="margin-top:8px"><b>Your prehab</b> (3 times a week, about 15 minutes, after an easy run or on a rest day):</p><ul class="plain small wkl">' + pre.map(function (k) { var f = RC_FIX[k]; return '<li><b>' + f.name + '</b>: ' + f.dose + '. <span class="muted">For your ' + f.for + '.</span></li>'; }).join('') + '</ul>' : '<p class="small" style="margin-top:6px">Everything at target and balanced. Keep your strength sessions going.</p>') + '</section>';
  var prev = last || {}, today = last && last.date === App.today ? last : {};
  h += '<section class="card stack"><h3>' + (today.date ? 'Today\'s results' : 'Do the check') + '</h3><p class="small muted">Warm up with 5 minutes of walking first. Rest a minute between tests.</p>' +
    RC_TESTS.map(function (t) { var v = function (s) { var x = today[t.k + s]; return x != null ? x : ''; }; return '<div class="rctest"><b>' + t.name + '</b><p class="small muted">' + t.how + '</p><div class="rclr"><label class="f">Left (' + t.unit + ')<input class="i" id="rc-' + t.k + 'L" type="number" inputmode="numeric" min="0" max="300" value="' + v('L') + '"></label><label class="f">Right (' + t.unit + ')<input class="i" id="rc-' + t.k + 'R" type="number" inputmode="numeric" min="0" max="300" value="' + v('R') + '"></label></div><p class="tiny muted">Target ' + t.target + (t.unit === 'sec' ? ' s' : '') + ' each side' + (prev[t.k + 'L'] != null && !today.date ? ' · last time L ' + prev[t.k + 'L'] + ' / R ' + prev[t.k + 'R'] : '') + '. ' + t.why + '</p></div>'; }).join('') +
    '<div class="btns"><button class="btn primary" data-act="rc-save">Save and get my prehab</button></div></section>';
  if (L.length > 1) h += '<section class="card"><h3>History</h3><div class="tscroll"><table class="t fit"><thead><tr><th>Date</th>' + RC_TESTS.map(function (t) { return '<th class="num">' + t.name.replace('Single-leg ', '').replace(', eyes closed', '') + '</th>'; }).join('') + '</tr></thead><tbody>' + L.slice().reverse().slice(0, 12).map(function (c) { return '<tr><td>' + fmtD(c.date, { month: 'short', day: 'numeric' }) + '</td>' + RC_TESTS.map(function (t) { return '<td class="num">' + (c[t.k + 'L'] != null ? c[t.k + 'L'] : '–') + '/' + (c[t.k + 'R'] != null ? c[t.k + 'R'] : '–') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div><p class="tiny muted">Left / right.</p></section>';
  return h;
};
ACTIONS['rc-save'] = function () {
  var c = { id: App.today, date: App.today }, n = 0;
  RC_TESTS.forEach(function (t) { ['L', 'R'].forEach(function (s) { var el = $('#rc-' + t.k + s), v = el && el.value !== '' ? +el.value : null; if (v != null && !isNaN(v)) { c[t.k + s] = v; n++; } }); });
  if (!n) { toast('Enter at least one result'); return; }
  var before = rcList().filter(function (x) { return x.date < App.today; }).pop();
  Store.edit('rchecks', c.id, function (S) { S.rchecks = (S.rchecks || []).filter(function (x) { return x.id !== c.id; }).concat([c]); });
  var A = rcAssess(c), F = A.filter(function (x) { return x.flag; }), pre = rcPrehab(), say = [];
  say.push(F.length ? 'Strength check saved. What I see:' : 'Strength check saved: everything at target and balanced left to right. That\'s a strong base for building miles.');
  F.forEach(function (x) { say.push('• ' + rcResultLine(x) + '.'); });
  if (before) { var up = A.filter(function (x) { var b = Math.min(before[x.t.k + 'L'] || 0, before[x.t.k + 'R'] || 0), m = Math.min(x.l || 0, x.r || 0); return b && m > b * 1.1; }); if (up.length) say.push('Improved since last month: ' + up.map(function (x) { return x.t.name.toLowerCase(); }).join(', ') + '.'); }
  if (pre.length) say.push('\nYour prehab, 3 times a week:\n' + pre.map(function (k) { return '• ' + RC_FIX[k].name + ': ' + RC_FIX[k].dose; }).join('\n') + '\n\nWhy: building calf and hip strength is one of the few things shown to lower running injuries. It\'s on your shin routine page. Retest in 4 weeks; strength gains usually show within 4–6.');
  Store.edit('prefs', 'prehab', function (S) { S.prefs = S.prefs || {}; S.prefs.prehab = pre; });
  coachSay(say.join('\n'), [{ label: 'Open the routine', act: { nav: '#/shins' } }]);
  toast('Saved'); render();
};

/* ---------- pain: the trend, and the pain-monitoring rules ---------- */
function pnSeries(days) {
  return (st().checkins || []).filter(function (c) { return E.diffD(c.date, App.today) <= (days || 60); }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }).map(function (c) { return { d: c.date, v: c.pain ? (c.painLvl != null ? +c.painLvl : null) : 0, where: c.pain ? c.where : '', when: c.painWhen || '' }; }).filter(function (x) { return x.v != null; });
}
var PN_WHEN = { during: 'during runs', after: 'after runs', morning: 'worst the morning after', always: 'even when walking' };
function painCard() {
  var S = pnSeries(60); if (!S.some(function (x) { return x.v > 0; }) && S.length < 5) return '';
  var last = S[S.length - 1], wk = S.filter(function (x) { return E.diffD(x.d, App.today) <= 6; }), mx = Math.max.apply(null, wk.map(function (x) { return x.v; }).concat([0]));
  var verdict = !last ? '' : mx >= 5 ? '<b>Above 5 this week.</b> That\'s the stop line: no running until it settles and walking is pain-free.' : mx >= 3 ? '<b>Into the 3–5 band this week.</b> Train, but back off: shorter, softer, no speed until it\'s back to 2 or less.' : wk.some(function (x) { return x.v > 0; }) ? '<b>Low and acceptable.</b> Up to 2/10 is fine if it\'s settled by the next morning.' : '<b>Pain-free this week.</b>';
  var pts = S.map(function (x) { return { d: x.d, v: x.v, c: x.v >= 5 ? 'var(--red)' : x.v >= 3 ? 'var(--amber)' : 'var(--green)' }; });
  return mcard('pain', 'Pain', 'Your 0–10 pain score from the daily check-in (0 on days with no pain). The green band is the acceptable zone.', verdict, mx >= 5 ? 'bad' : mx >= 3 ? 'warn' : 'ok',
    lineSVG(pts, { label: 'Pain score', band: [0, 2], color: 'var(--ink)', fmt: function (v) { return Math.round(v); } }),
    'This is the pain-monitoring model sports physios use for tendon and shin problems: pain up to 2/10 during or after running is acceptable if it\'s back to normal by the next morning and isn\'t creeping up week to week. 3–5 means modify. Above 5 means stop. Training through low, stable pain keeps you running while tissues adapt; it\'s the trend that matters, which is why I chart it.');
}
function pnFindings() {
  var out = [], C = (st().checkins || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }), last = C.filter(function (c) { return E.diffD(c.date, App.today) <= 1; }).pop();
  if (last && last.pain && last.painLvl != null) {
    var lvl = +last.painLvl, where = last.where ? ikName([['shin', 'shin'], ['calf', 'calf / Achilles'], ['knee', 'knee'], ['hip', 'hip / hamstring'], ['foot', 'foot'], ['other', 'sore spot']], last.where) : 'sore spot';
    var prev = C.filter(function (c) { return c.date < last.date && E.diffD(c.date, last.date) <= 7 && c.pain && c.painLvl != null && (!last.where || c.where === last.where); }).pop();
    var rising = prev && lvl >= +prev.painLvl + 2, mornWorse = last.painWhen === 'morning' && prev && lvl > +prev.painLvl;
    var runs = daysAhead(3, function (p) { return E.isRun(p); }, App.today === last.date ? 0 : 1), hard = runs.filter(function (x) { return isHardP(x.p); }), xt = ikXT();
    var tail = where === 'shin' ? ' Do the shin routine today unless it makes the pain worse.' : '';
    if (lvl >= 5 || (last.painWhen === 'always' && lvl >= 4)) {
      out.push({ id: 'pain-stop-' + last.date, pri: 11, tone: 'act', title: 'Stop running for now', seen: 'Your ' + where + ' pain is ' + lvl + '/10' + (last.painWhen ? ', ' + PN_WHEN[last.painWhen] : '') + '. Above 5 is the stop line in the pain-monitoring model' + (last.painWhen === 'always' ? ', and pain while walking means the tissue isn\'t coping with everyday load' : '') + '.',
        change: 'No running until it\'s under 3/10 and walking is pain-free. Cross-train instead (' + xt.join(', ') + ': whatever doesn\'t hurt). See a doctor or physical therapist if it\'s one pinpoint spot on the bone, hurts at night or makes you limp: those can be signs of a stress fracture.' + tail,
        plan: runs.length ? 'Your ' + plural(runs.length, 'run') + ' in the next 3 days become cross-training. If it\'s still 3 or more after that, log it as an injury and the return ladder takes over.' : 'No runs in the next 3 days anyway. If it\'s still 3 or more by then, log it as an injury and the return ladder takes over.',
        expect: 'Caught at this stage, most overuse pain settles in 1–2 weeks of reduced load. Running through it is how a 2-week problem becomes a 2-month one.',
        act: runs.length ? { ov: runs.map(function (x) { return [x.date, 'cross']; }) } : { sheet: 'life' }, label: runs.length ? 'Switch to cross-training' : 'Log it as an injury' });
    } else if (lvl >= 3 || rising || mornWorse) {
      var r0 = runs[0];
      out.push({ id: 'pain-off-' + last.date, pri: 10, tone: 'act', title: rising || mornWorse ? 'Pain is going the wrong way' : 'Pain is above the safe line', seen: 'Your ' + where + ' pain is ' + lvl + '/10' + (last.painWhen ? ', ' + PN_WHEN[last.painWhen] : '') + (prev ? ', up from ' + prev.painLvl + ' on ' + fmtD(prev.date, { weekday: 'long' }) : '') + '. ' + (mornWorse ? 'Pain that\'s worse the next morning means the last run was more than the tissue could take.' : 'The 3–5 band means keep moving but reduce the load.'),
        change: (r0 ? 'Make ' + dlab(r0.date) + '\'s ' + partLine(r0) + ' about a third shorter and fully easy, on a soft surface or treadmill' : 'Keep the next run short and easy') + (hard.filter(function (x) { return !r0 || x.date !== r0.date; }).length ? ', and run ' + hard.filter(function (x) { return !r0 || x.date !== r0.date; }).map(function (x) { return dlab(x.date) + '\'s ' + x.p.title.toLowerCase(); }).join(' and ') + ' easy' : '') + '. Stop if it goes above 3 during the run.' + tail,
        plan: 'Miles drop a little for the next few days; no speed work until pain is 2 or less. When you\'ve had 3 days at 2 or less, the plan goes back to normal.',
        expect: 'Pain back to 2 or less within about a week. If it\'s still 3+ after a week of reduced load, get it looked at.',
        act: r0 || hard.length ? { ov: (r0 ? [[r0.date, 'short']] : []).concat(hard.filter(function (x) { return !r0 || x.date !== r0.date; }).map(function (x) { return [x.date, 'easy']; })) } : null, label: r0 || hard.length ? 'Back off' : 'Got it' });
    } else if (lvl > 0) {
      out.push({ id: 'pain-ok-' + last.date, pri: 5, tone: 'watch', title: 'Low pain, okay to train', seen: 'Your ' + where + ' pain is ' + lvl + '/10' + (last.painWhen ? ', ' + PN_WHEN[last.painWhen] : '') + '. That\'s in the acceptable zone.',
        change: 'Train as planned. The rule: up to 2/10 is fine if it\'s settled by the next morning and isn\'t creeping up. Keep scoring it in your check-in so I can see the trend.' + tail,
        plan: 'No change.', expect: 'Low, stable pain usually fades as the tissue adapts. If it climbs to 3 or is worse the next morning, I\'ll pull the load back.', act: null, label: 'Got it' });
    }
  }
  /* three pain-free check-ins after a painful stretch: back to normal */
  var r3 = C.filter(function (c) { return E.diffD(c.date, App.today) <= 3; }), before = C.filter(function (c) { var g = E.diffD(c.date, App.today); return g > 3 && g <= 14 && c.pain; });
  if (r3.length >= 3 && r3.every(function (c) { return !c.pain || (c.painLvl != null && +c.painLvl <= 1); }) && before.length) out.push({ id: 'painfree', pri: 3, tone: 'good', title: 'Pain has settled', seen: 'Your last ' + r3.length + ' check-ins were pain-free (or nearly), after ' + plural(before.length, 'painful day') + ' before that.', change: 'Back to normal training. Keep the prehab going for at least two more weeks; that\'s when the tissue is still rebuilding.', plan: 'No change: the plan is back to normal.', expect: '', act: null, label: 'Nice' });
  return out;
}

/* ---------- the coach's new rules ---------- */
function ikPlanPeak(until) { var W = (App.plan && App.plan.weeks) || []; return Math.max.apply(null, W.filter(function (w) { return !until || w.start <= until; }).map(function (w) { var m = 0; w.days.forEach(function (d) { d.parts.forEach(function (p) { if (E.isRun(p) && p.type !== 'race') m += +p.mi || 0; }); }); return Math.round(m * 10) / 10; }).concat([0])); }
function ikFindings() {
  var out = [], I = INTK(), prof = st().profile || {}, prefs = st().prefs || {}, an = App.an || {};
  var aEv = ((App.plan && App.plan.aEvents) || []).filter(function (e) { return e.date >= App.today; });
  var evs = (st().events || []).filter(function (e) { return e.date >= App.today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  /* nothing known yet */
  if (!I.at) out.push({ id: 'intake', pri: 4, tone: 'watch', title: 'Tell me your running history', seen: 'I\'m coaching you on watch data alone. I don\'t know your injury history, the most miles you\'ve handled before, or your personal bests.', change: 'Spend two minutes on your running background.', plan: 'Your plan\'s peak mileage, the prehab I give you and how I treat pain all get set from it.', expect: 'A plan built around what your body has handled before, not just what the last few weeks show.', act: { nav: '#/intake' }, label: 'Fill it in' });
  /* peak mileage guardrail: this block's peak vs the most you've ever held */
  var pe = ikPeakEver(), first = aEv[0], blockPeak = first ? ikPlanPeak(first.date) : ikPlanPeak(), recentInj = ikLowerLeg(I).some(function (x) { return x.when === 'recent' || x.st !== 'gone'; });
  var lim = pe ? Math.round(pe * (recentInj ? 1.15 : 1.25)) + 2 : 0, cur = prof.ctl && +prof.ctl.peak;
  if (I.at && pe >= 8 && blockPeak > lim && (!cur || cur > lim)) {
    var tgt = Math.max(Math.round(pe * (recentInj ? 1.15 : 1.2)), pe + 4);
    out.push({ id: 'peak', pri: 6, tone: 'act', title: 'Peak mileage is a big step up', seen: 'Your plan peaks at ' + mi(blockPeak) + ' mi a week' + (first ? ' before ' + (first.name || 'your race') : '') + '. The most you\'ve held is about ' + pe + ' mi a week' + (I.peakWhen === '3' ? ', and that was 3+ years ago' : '') + '.' + (recentInj ? ' With a recent lower-leg injury, that jump is where problems tend to start.' : ''),
      change: 'Cap this training block\'s peak at ' + tgt + ' mi a week. After the race, once you\'ve held it for a few weeks, I\'ll raise it for the next block.',
      plan: 'The build-up flattens near the top: the same workouts and long runs, with easy runs trimmed so no week goes over ' + tgt + ' mi. The weeks before that barely change.',
      expect: 'A first jump of about 20% over your previous best is what most runners absorb safely in one block. Two steady blocks (half, then marathon) get you higher, with less risk, than one big leap.',
      act: { peak: tgt }, label: 'Cap at ' + tgt + ' mi' });
  }
  /* after the race the coach set a cap for: time to raise it */
  var raced = prefs.peakByCoach && (st().events || []).some(function (e) { return (e.priority || 'A') === 'A' && e.date >= prefs.peakByCoach.at && e.date < App.today && E.diffD(e.date, App.today) <= 42; });
  if (prefs.peakByCoach && cur && cur === prefs.peakByCoach.v && raced && ikSustainedPeak() >= cur * 0.85) {
    var up = Math.round(cur * 1.2);
    out.push({ id: 'peakup', pri: 4, tone: 'act', title: 'Ready for a higher peak', seen: 'You held about ' + ikSustainedPeak() + ' mi a week through the last block, near the ' + cur + ' mi cap we set.', change: 'Raise the peak to ' + up + ' mi a week for this block.', plan: 'The next build climbs a little higher at the top; the early weeks don\'t change.', expect: 'More aerobic volume is the biggest driver of marathon fitness once the body has proven it can handle the last level.', act: { peak: up }, label: 'Raise to ' + up + ' mi' });
  }
  /* heart-rate medication: effort, not bpm */
  if (I.hrMed && prefs.easyCap) out.push({ id: 'hrmed', pri: 5, tone: 'act', title: 'Coach by effort, not heart rate', seen: 'You take a medication that affects heart rate, so bpm zones and caps can be wrong by 10–30 beats.', change: 'Run easy days at 2–3 out of 10 effort: you can talk in full sentences and breathe through your nose. Use pace and effort for workouts.', plan: 'Heart-rate caps come off your runs; paces and the plan stay the same.', expect: 'Effort is a reliable guide on these medications. Tell your doctor before starting hard training.', act: { pref: { easyCap: null } }, label: 'Switch to effort' });
  /* the course: hills and heat */
  evs.forEach(function (e) {
    var dd = E.diffD(App.today, e.date); if ((e.priority || 'A') === 'C') return;
    if ((e.course === 'hilly' || e.course === 'rolling') && dd <= 84 && dd >= 7 && prefs.hillPrep !== e.id) out.push({ id: 'hill-' + e.id, pri: 4, tone: 'act', title: 'Get ready for a ' + e.course + ' course', seen: (e.name || 'Your race') + ' is ' + plural(Math.round(dd / 7), 'week') + ' away on a ' + e.course + ' course.', change: 'Run long runs on routes with similar climbs, swap strides for 6–8 × 60-second hill repeats once a week, and practise relaxed downhills with short, quick steps.', plan: 'Same days and distances; long-run and easy-run days get a hill reminder.', expect: 'Hills run in training cost far less on race day, and downhill practice spares your quads in the last miles.', act: { pref: { hillPrep: e.id } }, label: 'Add hill prep' });
    if (+e.temp >= 65 && dd <= 28 && dd >= 5 && prefs.heatPrep !== e.id) out.push({ id: 'heat-' + e.id, pri: 4, tone: 'act', title: 'Get used to the heat', seen: 'You expect about ' + e.temp + '°F for ' + (e.name || 'your race') + ', ' + plural(dd, 'day') + ' away.', change: 'For the next two to three weeks, do 3–4 easy runs a week in the warmest part of the day, with an extra layer, or indoors on a warm treadmill. Add electrolytes on runs over an hour.', plan: 'Same runs; easy days get a heat reminder. Expect slower paces on those runs. That\'s fine.', expect: 'Ten to fourteen days of heat exposure lowers your heart rate at the same pace and makes you sweat sooner. On race day, if it\'s above 70°F, start 10–20 s/mi slower than goal pace.', act: { pref: { heatPrep: e.id } }, label: 'Add heat prep' });
  });
  /* threshold retest */
  var lt = an.lt, ltAge = lt && lt.date ? E.diffD(lt.date, App.today) : null, nextQ = daysAhead(14, function (p) { return p.type === 'speed'; })[0];
  if (ltAge != null && ltAge > 42 && nextQ && prefs.ltTest !== nextQ.date && !(prefs.ltTest && prefs.ltTest >= App.today)) out.push({ id: 'ltretest', pri: 3, tone: 'act', title: 'Time to retest your threshold', seen: 'Your threshold reading is from ' + fmtD(lt.date, { month: 'short', day: 'numeric' }) + ', ' + plural(Math.floor(ltAge / 7), 'week') + ' ago. Paces and heart-rate zones are only as good as that number.', change: 'Make ' + dlab(nextQ.date) + '\'s ' + partLine(nextQ) + ' a 30-minute threshold test: warm up 15 minutes, then run 30 minutes as hard as you can hold evenly, with the chest strap on.', plan: 'That session becomes the test; nothing else moves. Afterwards your paces and zones update from the result.', expect: 'Your average heart rate for the last 20 minutes is a close estimate of your threshold heart rate, and Garmin usually updates its own reading from a run like this.', act: { pref: { ltTest: nextQ.date } }, label: 'Make it a test' });
  /* fueling practice before a half or full */
  var big = aEv.filter(function (e) { return (e.dist === 'half' || e.dist === 'full') && E.diffD(App.today, e.date) <= 112; })[0];
  if (big) {
    var longs = activities().filter(function (a) { return a.kind === 'run' && (a.sec || 0) >= 4500 && E.diffD(a.date, App.today) <= 28; });
    var fueled = longs.filter(function (a) { var L = logOf(a.date); return Object.keys(L).some(function (k) { return L[k] && +L[k].gels > 0; }); });
    if (longs.length >= 2 && !fueled.length && !(prefs.fuelPrac && E.diffD(prefs.fuelPrac, App.today) < 28)) out.push({ id: 'fuelprac', pri: 4, tone: 'act', title: 'Practise race fueling', seen: 'None of your last ' + plural(longs.length, 'long run') + ' had fuel logged, and ' + (big.name || 'your race') + ' is ' + plural(Math.round(E.diffD(App.today, big.date) / 7), 'week') + ' away.', change: 'On every run over 75 minutes, take a gel (or 25–30 g of carbs) at 30–40 minutes and every 30–40 after. Use what the race hands out, or what you\'ll carry. Log it in the run recap.', plan: 'No change to the runs; long runs get a fueling reminder.', expect: 'The gut is trainable: practice cuts stomach trouble and lets you absorb ' + (big.dist === 'full' ? '60–90' : '30–60') + ' g of carbs an hour, which is what holds pace in the last miles.', act: { pref: { fuelLong: true, fuelPrac: App.today } }, label: 'Add the reminders' });
  }
  /* goal reality check from recent PRs and current fitness */
  var cv = curVdot(), pv = ikPRvdot(2), bestV = Math.max(cv || 0, pv ? pv.v : 0);
  if (first && first.goal && bestV) { var gv = E.goalVdot(first), wks = E.diffD(App.today, first.date) / 7, room = wks / 6 + 1; if (gv && gv - bestV > room && gv - bestV > 2) out.push({ id: 'goal', pri: 3, tone: 'watch', title: 'Your goal is a stretch', seen: (first.name || 'Your race') + ' goal of ' + first.goal + ' needs a VDOT of about ' + gv.toFixed(1) + '. Your current fitness' + (pv ? ' and recent personal best' : '') + ' put you at ' + bestV.toFixed(1) + ', with ' + Math.round(wks) + ' weeks to go.', change: 'Keep training for it, but set a "good day" goal too. I\'ll show you the predicted time every weekly check-in.', plan: 'No change: paces stay on your current fitness, not the goal, so you don\'t overreach.', expect: 'A rule of thumb is about 1 VDOT point per 6 weeks of steady training for an experienced runner. Gains come faster if you\'re newer to structured training.', act: null, label: 'Got it' }); }
  /* strength checks */
  var rl = rcLast(), A = rcAssess(rl), F = A.filter(function (x) { return x.flag; });
  if (rcDue()) out.push({ id: 'rcheck', pri: rl ? 3 : (prof.injuryProne ? 5 : 4), tone: 'act', title: rl ? 'Monthly strength check is due' : 'Do a strength check', seen: rl ? 'Your last check was ' + fmtD(rl.date, { month: 'short', day: 'numeric' }) + '.' : 'I don\'t know yet whether your calves, hips and ankles are ready for the miles ahead' + (prof.injuryProne ? ', and with your shin history that matters most' : '') + '.', change: 'Four tests, about 10 minutes: single-leg calf raises, single-leg bridge, side plank and eyes-closed balance, each side.', plan: 'No running changes. The results decide the prehab I give you.', expect: 'A clear picture of weak spots and left/right gaps, which are what overuse injuries tend to find.', act: { nav: '#/rchecks' }, label: 'Do the check' });
  else if (F.length && JSON.stringify(prefs.prehab || []) !== JSON.stringify(rcPrehab())) out.push({ id: 'prehab', pri: 5, tone: 'act', title: 'Prehab for what the strength check found', seen: F.map(rcResultLine).join('; ') + '.', change: rcPrehab().map(function (k) { return RC_FIX[k].name + ' (' + RC_FIX[k].dose + ')'; }).join('; ') + '. Three times a week.', plan: 'No running changes; the exercises go on your shin routine page.', expect: 'Strength gains show in 4–6 weeks. A gap between sides under 10% is the aim.', act: { pref: { prehab: rcPrehab() }, nav: '#/shins' }, label: 'Add to my routine' });
  return out;
}
/* the coach's list now includes the new rules; pain levels replace the older yes/no shin rule */
var _cf32 = coachFindings;
coachFindings = function () {
  return cm('findings32', function () {
    var base = (_cf27safe() || []).slice(), ws = wkStart(App.today), prefs = st().prefs || {}, no = prefs.cfNo || {}, acc = prefs.cfAcc || {}, I = INTK();
    var extra = []; try { extra = pnFindings(); } catch (e) { console.warn(e); } try { extra = extra.concat(ikFindings()); } catch (e) { console.warn(e); }
    extra.forEach(function (f) { f.id = f.id + ':' + ws; });
    if (extra.some(function (f) { return /^pain-/.test(f.id); })) base = base.filter(function (f) { return !/^shin:/.test(f.id); });
    if (I.hrMed) base = base.filter(function (f) { return !/^easycap:/.test(f.id); });
    return base.concat(extra.filter(function (f) { return !no[f.id] && !acc[f.id]; })).sort(function (a, b) { return b.pri - a.pri; });
  });
};
function _cf27safe() { try { return _cf32(); } catch (e) { return []; } }
/* the coach's new actions: a peak cap */
var _apply32 = applyCoachAct;
applyCoachAct = function (f) {
  var a = f.act || {};
  if (a.peak) {
    var ev = ((App.plan && App.plan.aEvents) || []).filter(function (e) { return e.date >= App.today; })[0];
    Store.editMany([['profile', null], ['prefs', 'peakByCoach']], function (S) { S.profile.ctl = Object.assign({}, S.profile.ctl || {}, { peak: a.peak }); S.prefs = S.prefs || {}; S.prefs.peakByCoach = { v: a.peak, at: App.today, ev: ev ? ev.date : null }; });
    if (typeof recompute === 'function') recompute();
  }
  return _apply32(f);
};
/* the coach's notes on a run: hills, heat, fueling, threshold test, heart-rate cap or effort. Shown on Today and on the day page. */
function coachRunLines(x, date) {
  var p = st().prefs || {}, I = INTK(), add = '';
  if (!E.isRun(x) || partDone(date, x)) return '';
  var easyish = x.type === 'easy' || x.type === 'long' || x.type === 'recovery';
  if (I.hrMed && easyish) add += '<p class="small capline">Run by effort: <b>2–3 of 10</b>, full sentences, nose breathing. Heart rate isn\'t reliable on your medication.</p>';
  else if (p.easyCap && easyish) add += '<p class="small capline">Keep heart rate under <b>' + p.easyCap + ' bpm</b>. Slow down or walk hills to stay there.</p>';
  if (p.fuelLong && x.type === 'long') add += '<p class="small capline">First 3 miles 15–20 s/mi slower · drink every 15–20 min · carbs every 30–40 min after the first hour.</p>';
  if (p.hillPrep && x.type === 'long') add += '<p class="small capline">Choose a hilly route like your race course. Relaxed, quick steps downhill.</p>';
  if (p.heatPrep && (x.type === 'easy' || x.type === 'recovery')) add += '<p class="small capline">Heat prep: run in the warmest part of the day or add a layer. Slower pace is fine.</p>';
  if (p.ltTest === date && x.type === 'speed') add += '<p class="small capline"><b>Threshold test:</b> 15 min warm-up, then 30 min as hard as you can hold evenly, chest strap on. Your last-20-minute average heart rate ≈ your threshold.</p>';
  return add;
}
var _hero32 = heroHTML;
heroHTML = function (x, date, zz) {
  var h = _hero32(x, date, zz).replace(/<p class="small capline">[\s\S]*?<\/p>/g, ''), add = coachRunLines(x, date);
  if (!add) return h;
  var i = h.lastIndexOf('<span class="btn primary"'); return i > 0 ? h.slice(0, i) + add + h.slice(i) : h + add;
};
var _day32 = VIEWS.day;
VIEWS.day = function () {
  var h = _day32(), d = App.args[0] || App.today, day = dayOf(d); if (!day) return h;
  var add = day.parts.map(function (x) { var l = coachRunLines(x, d); return l ? (day.parts.filter(E.isRun).length > 1 ? '<p class="tiny muted">' + esc(x.title) + '</p>' : '') + l : ''; }).join('');
  if (!add) return h;
  var c = '<section class="card coachnotes"><div class="eyebrow">Coach notes</div>' + add + '</section>', i = h.indexOf('<section'); return i >= 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};

/* ---------- where it shows up ---------- */
/* Today: the intake once, until it's done (or put off for a week) */
var _today32 = VIEWS.today;
VIEWS.today = function () {
  var h = _today32(), p = st().prefs || {};
  if (INTK().hrMed) h = h.replace(/<a class="card hrzcard"[\s\S]*?<\/a>/, '');
  if (!App.plan || !st().profile || INTK().at || h.indexOf('Tell me your running history') >= 0 || (p.intakeLater && E.diffD(p.intakeLater, App.today) < 7)) return h;
  var c = '<section class="card ikcard"><div class="eyebrow">Coach</div><h3>Tell me your running history</h3><p class="small muted">Injuries, the most miles you\'ve handled, your bests. Two minutes, and your plan gets built around it.</p><div class="btns"><a class="btn sm primary" href="#/intake">Fill it in</a><button class="btn sm ghost" data-act="ik-later">Later</button></div></section>';
  var g = h.indexOf('class="greet"'), i = g >= 0 ? h.indexOf('</h1></div>', g) : -1;
  return i > 0 ? h.slice(0, i + 11) + c + h.slice(i + 11) : h + c;
};
ACTIONS['ik-later'] = function () { Store.edit('prefs', 'intakeLater', function (S) { S.prefs = S.prefs || {}; S.prefs.intakeLater = App.today; }); };
/* Coach: what I know about you */
function ikSummary() {
  var I = INTK(), bits = [];
  if (!I.at) return '<p class="small muted">Not filled in yet.</p>';
  if (I.years) bits.push('Running ' + ikName(IK_YEARS, I.years).toLowerCase());
  var pe = ikPeakEver(); if (pe) bits.push('most held: ' + pe + ' mi a week');
  if (I.longest) bits.push('longest run ' + mi(I.longest) + ' mi');
  var inj = ikInjuries(I); if (inj.length) bits.push('history: ' + inj.map(function (x) { return x.name.toLowerCase() + (x.st === 'niggle' ? ' (niggles)' : x.st === 'now' ? ' (now)' : ''); }).join(', '));
  var pv = ikPRvdot(); if (pv) bits.push('best: ' + pv.d + ' ' + pv.t + (pv.y ? ' (' + pv.y + ')' : ''));
  if (I.hrMed) bits.push('coached by effort (heart-rate medication)');
  return '<p class="small">' + esc(bits.join(' · ')) + '</p>';
}
var _coach32 = VIEWS.coach;
VIEWS.coach = function () {
  var h = _coach32(); if (App.args[0] === 'archive' || !App.plan) return h;
  var rl = rcLast(), A = rcAssess(rl).filter(function (x) { return x.flag; });
  var c = '<section class="card ikabout"><div class="spread"><h3>What I know about you</h3><a class="small" href="#/intake">' + (INTK().at ? 'Edit' : 'Fill in') + ' ›</a></div>' + ikSummary() +
    '<div class="spread" style="margin-top:8px"><span class="small"><b>Strength check:</b> ' + (rl ? fmtD(rl.date, { month: 'short', day: 'numeric' }) + (A.length ? ' · ' + plural(A.length, 'area') + ' to work on' : ' · all on target') + (rcDue() ? ' · due' : '') : 'not done yet') + '</span><a class="small" href="#/rchecks">' + (rcDue() ? 'Do it' : 'Results') + ' ›</a></div></section>';
  var i = h.indexOf('<div class="thread"'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};
/* the shin routine page carries the prehab the strength check prescribed */
var _shins32 = VIEWS.shins;
VIEWS.shins = function () {
  var h = _shins32(), pre = (st().prefs || {}).prehab || [];
  if (!pre.length) return h;
  var c = '<section class="card prehab"><div class="spread"><h3>Your prehab</h3><a class="small" href="#/rchecks">Strength check ›</a></div><p class="small muted">From your strength check and injury history. Three times a week.</p><ul class="plain small wkl">' + pre.map(function (k) { var f = RC_FIX[k]; return f ? '<li><b>' + f.name + '</b>: ' + f.dose + '.</li>' : ''; }).join('') + '</ul></section>';
  var i = h.indexOf('<section', h.indexOf('class="card shindone"') + 10); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};
/* Progress: pain on Recovery, strength checks on Strength */
var _progress32 = VIEWS.progress;
VIEWS.progress = function () {
  var h = _progress32(), tab = App.args[0] || 'overview'; tab = PT_ALIAS[tab] || tab;
  if (tab !== 'recovery' && tab !== 'strength') return h;
  var card = '';
  try {
    if (tab === 'recovery') card = painCard();
    else { var rl = rcLast(), A = rcAssess(rl); card = '<section class="card"><div class="spread"><h3>Strength checks</h3><a class="small" href="#/rchecks">' + (rcDue() ? 'Do it now' : 'Open') + ' ›</a></div><p class="small muted" style="margin-top:2px">Calf raises, single-leg bridge, side plank and balance, each side, once a month.</p>' + (rl ? '<ul class="plain small wkl">' + A.map(function (x) { return '<li>' + (x.flag ? '<span class="rcflag">!</span> ' : '✓ ') + esc(rcResultLine(x)) + '</li>'; }).join('') + '</ul>' : '<p class="small">Not done yet. It tells me whether your legs are ready for the miles ahead.</p>') + '</section>'; }
  } catch (e) { console.warn(e); card = ''; }
  if (!card) return h;
  var i = h.lastIndexOf('</div>'); return h.slice(0, i) + '<div class="c12">' + card + '</div>' + h.slice(i);
};
/* the weekly check-in: pain trend, strength checks and background */
var _weekly32 = weeklyHTML;
weeklyHTML = function (ws) {
  var h = _weekly32(ws), we = E.addD(ws, 6), b = [];
  var P = pnSeries(21), wk = P.filter(function (x) { return x.d >= ws && x.d <= we; }), pw = P.filter(function (x) { return x.d >= E.addD(ws, -7) && x.d < ws; });
  var mx = function (L) { return Math.max.apply(null, L.map(function (x) { return x.v; }).concat([0])); };
  if (wk.some(function (x) { return x.v > 0; })) b.push('Pain: highest ' + mx(wk) + '/10 this week' + (pw.length ? (mx(wk) > mx(pw) ? ', up from ' + mx(pw) + ' the week before.' : mx(wk) < mx(pw) ? ', down from ' + mx(pw) + ' the week before.' : ', same as the week before.') : '.') + (mx(wk) <= 2 ? ' Within the safe zone.' : mx(wk) <= 5 ? ' In the back-off band: I\'ve suggested reducing load.' : ' Above the stop line.'));
  else if (wk.length >= 3) b.push('Pain-free all week.');
  var rl = rcLast(); b.push(rl ? 'Strength check: ' + fmtD(rl.date, { month: 'short', day: 'numeric' }) + (rcDue() ? ', due again: about 10 minutes.' : ', next one ' + fmtD(E.addD(rl.date, 28), { month: 'short', day: 'numeric' }) + '.') : 'Strength check: not done yet. It tells me whether your calves and hips are ready for the miles ahead.');
  var pre = (st().prefs || {}).prehab || []; if (pre.length) b.push('Prehab: ' + pre.map(function (k) { return (RC_FIX[k] || {}).name; }).filter(Boolean).join(', ').toLowerCase() + ', three times a week.');
  var sd = Object.keys(st().logs || {}).filter(function (d) { return d >= ws && d <= we && (st().logs[d] || {}).shins; }).length; if (sd) b.push('Shin routine done ' + plural(sd, 'time') + '.');
  if (!INTK().at) b.push('I still don\'t know your injury history or past mileage: <a href="#/intake">two minutes here</a>.');
  var sec = '<section class="card"><div class="spread"><h3>Body</h3><a class="small" href="#/rchecks">Strength checks ›</a></div><ul class="plain small wkl">' + b.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></section>';
  var i = h.indexOf('<section class="card"><h3>What I\'m noticing'); return i > 0 ? h.slice(0, i) + sec + h.slice(i) : h + sec;
};
/* Reminders: the monthly strength check */
var _notify32 = VIEWS.notify;
VIEWS.notify = function () {
  var h = _notify32(), n = remPrefs(), on = n.rchecks !== false, i = h.indexOf('<label class="check"><input type="checkbox" id="nt-wk"');
  var c = '<label class="check"><input type="checkbox" id="nt-rc"' + (on ? ' checked' : '') + '> <span><b>Monthly strength check</b><br><span class="small muted">On a rest day when it\'s been 4 weeks, at the shin-routine time.</span></span></label>';
  return i > 0 ? h.slice(0, i) + c + h.slice(i) : h;
};
var _ntRead32 = ntRead;
ntRead = function () { var n = _ntRead32(), el = $('#nt-rc'); if (el) n.rchecks = el.checked; return n; };
/* More: links */
var _more32 = VIEWS.more;
VIEWS.more = function () {
  var h = _more32(), i = h.indexOf('<a href="#/hrzones"'); if (i < 0) i = h.indexOf('<a href="#/zones"'); if (i < 0) return h;
  return h.slice(0, i) + '<a href="#/intake">Running background<span class="v">' + (INTK().at ? 'done' : 'not filled in') + '</span><span class="chev">›</span></a><a href="#/rchecks">Strength checks<span class="v">' + (rcLast() ? (rcDue() ? 'due' : fmtD(rcLast().date, { month: 'short', day: 'numeric' })) : 'not done') + '</span><span class="chev">›</span></a>' + h.slice(i);
};
ACTIONS['ev-course'] = function (a) { sheetCtx.ev.course = sheetCtx.ev.course === a.v ? '' : a.v; $$('[data-act="ev-course"]').forEach(function (x) { x.setAttribute('aria-pressed', String(JSON.parse(x.dataset.arg).v === sheetCtx.ev.course)); }); };
App.p32 = { coachFindings: coachFindings, st: st, openSheet: function (k, a) { openSheet(k, a || {}); }, closeSheet: function () { closeSheet(); }, ikFindings: ikFindings, pnFindings: pnFindings, rcAssess: rcAssess, ikPeakEver: ikPeakEver, painCard: painCard };
