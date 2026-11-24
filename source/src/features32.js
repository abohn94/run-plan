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
  for (var k in D.pr) { if (!D.pr[k].t) continue; var tt = E.parseClock(D.pr[k].t), dd = IK_PR.filter(function (x) { return x[0] === k; })[0], vv = tt > 0 ? E.vdotOf(dd[2], tt) : 0; if (!(tt > 0) || vv < 15 || vv > 90) { toast('Check the ' + ikName(IK_PR, k) + ' time: use mm:ss for under an hour (e.g. 20:00), h:mm:ss above'); return; } }
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
var PN_WHEN = { during: 'during runs', after: 'after runs', morning: 'worse the morning after', always: 'even when walking' };
var PN_AREA = { shin: 'shin', calf: 'calf / Achilles', knee: 'knee', hip: 'hip / hamstring', foot: 'foot', other: 'sore spot' };
/* Pain rules by tissue. Bone (shin, foot): bone stress can't be run through, so the line is low and red flags stop running.
   Tendon and joint (Achilles/calf, knee, hip): the tendon pain-monitoring model allows a little more if it settles by the next morning. */
var PN_RULES = {
  bone: { ok: 2, stop: 4, name: 'shin and foot', why: 'Shin and foot pain can be bone under stress, which doesn\'t adapt to being run through the way a tendon does' },
  tendon: { ok: 3, stop: 6, name: 'tendon and joint', why: 'Tendons tolerate some pain while they adapt, as long as it settles by the next morning and isn\'t creeping up' },
  other: { ok: 2, stop: 6, name: 'general', why: 'Low, stable pain is usually safe to train with; rising pain isn\'t' }
};
function pnTissue(where) { return where === 'shin' || where === 'foot' ? 'bone' : where === 'calf' || where === 'knee' || where === 'hip' ? 'tendon' : 'other'; }
/* one check-in → ok / modify / stop, with the reasons */
function pnBand(c, prev) {
  if (!c || !c.pain || c.painLvl == null) return null;
  var lvl = +c.painLvl, t = pnTissue(c.where), R = PN_RULES[t], why = [], band = 'ok';
  var flags = { limp: !!c.painLimp, spot: !!c.painSpot && t === 'bone', night: !!c.painNight, walk: c.painWhen === 'always' };
  var rising = prev && prev.painLvl != null && lvl >= +prev.painLvl + 2, morning = c.painWhen === 'morning' && lvl >= 2;
  if (flags.limp) why.push('it changes how you run or walk');
  if (flags.spot) why.push('it\'s one pinpoint spot on the bone');
  if (flags.night) why.push('it aches at rest or at night');
  if (flags.walk) why.push('it hurts even when walking');
  if (lvl >= R.stop) why.push(lvl + '/10 is at or above the ' + R.stop + '/10 stop line for ' + R.name + ' pain');
  if (why.length) band = 'stop';
  else if (lvl > R.ok || morning || rising) { band = 'mod'; if (lvl > R.ok) why.push(lvl + '/10 is above the ' + R.ok + '/10 you can train with for ' + R.name + ' pain'); if (morning) why.push('it was worse the next morning, which means the last run was more than the tissue could take'); if (rising) why.push('it rose from ' + prev.painLvl + ' to ' + lvl + ' in a few days'); }
  return { band: band, why: why, t: t, R: R, lvl: lvl, flags: flags, red: flags.limp || flags.spot || flags.night || flags.walk };
}
function pnLifeNow() { return (st().life || []).filter(function (e) { return e.kind === 'injured' && e.from <= App.today && e.to >= E.addD(App.today, -1); })[0] || null; }
function painCard() {
  var S = pnSeries(60); if (!S.some(function (x) { return x.v > 0; }) && S.length < 5) return '';
  var C = (st().checkins || []).filter(function (c) { return E.diffD(c.date, App.today) <= 6 && c.pain; }), bands = C.map(function (c) { return pnBand(c); }).filter(Boolean);
  var worst = bands.some(function (b) { return b.band === 'stop'; }) ? 'stop' : bands.some(function (b) { return b.band === 'mod'; }) ? 'mod' : bands.length ? 'ok' : 'none';
  var verdict = worst === 'stop' ? '<b>Over the stop line this week.</b> No running until walking is pain-free; then a gradual return.' : worst === 'mod' ? '<b>In the back-off zone this week.</b> Shorter, flatter, softer, no speed until it\'s back in the safe zone.' : worst === 'ok' ? '<b>Low and acceptable.</b> Fine to train with if it\'s settled by the next morning.' : '<b>Pain-free this week.</b>';
  var pts = S.map(function (x) { return { d: x.d, v: x.v, c: x.v >= 4 ? 'var(--red)' : x.v >= 3 ? 'var(--amber)' : 'var(--green)' }; });
  return mcard('pain', 'Pain', 'Your 0–10 pain score from the daily check-in (0 on days with no pain). The green band is the zone you can train with for shin and foot pain.', verdict, worst === 'stop' ? 'bad' : worst === 'mod' ? 'warn' : 'ok',
    lineSVG(pts, { label: 'Pain score', band: [0, 2], color: 'var(--ink)', fmt: function (v) { return Math.round(v); } }),
    'Sports physios use a pain-monitoring model: you keep running while pain stays low, settles by the next morning and isn\'t creeping up, and you back off when it doesn\'t. The lines depend on the tissue. <b>Shin and foot:</b> up to 2/10 is okay, 3 means back off, 4 or more means stop, because these can be bone stress injuries, which don\'t adapt to being run through. <b>Achilles, calf, knee and hip:</b> tendons tolerate a little more, so up to 3/10 is okay, 4–5 means back off, and 6 or more means stop. <b>Always stop</b> if it makes you limp, hurts when walking, aches at night, or is one pinpoint spot on the bone, and get it checked.');
}
function pnFindings() {
  var out = [], C = (st().checkins || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }), last = C.filter(function (c) { return E.diffD(c.date, App.today) <= 1; }).pop(), life = pnLifeNow();
  var prevOf = function (c) { return C.filter(function (x) { return x.date < c.date && E.diffD(x.date, c.date) <= 7 && x.pain && x.painLvl != null && x.where === c.where; }).pop(); };
  var B = last ? pnBand(last, prevOf(last)) : null;
  if (B) {
    var where = PN_AREA[last.where] || 'sore spot', lvl = B.lvl, xt = ikXT(), bone = B.t === 'bone';
    var runs = daysAhead(3, function (p) { return E.isRun(p); }, App.today === last.date ? 0 : 1), hard = runs.filter(function (x) { return isHardP(x.p); });
    var desc = 'Your ' + where + ' pain is ' + lvl + '/10' + (last.painWhen ? ', ' + PN_WHEN[last.painWhen] : '') + '.';
    var routine = last.where === 'shin' ? ' Keep doing the shin routine only if it\'s pain-free.' : '';
    /* recent days in the back-off zone for the same spot */
    var modDays = C.filter(function (c) { return E.diffD(c.date, last.date) <= 6 && c.where === last.where; }).filter(function (c) { var b = pnBand(c, prevOf(c)); return b && b.band !== 'ok'; }).length;
    if (B.band === 'stop') {
      var already = life && life.level === 'out';
      out.push({ id: 'pain-stop-' + last.date, pri: 11, tone: 'act', title: B.red ? 'Stop running and get it checked' : 'Stop running for now', seen: desc + ' That\'s over the line because ' + B.why.join(', and ') + '.',
        change: 'No running for now. Cross-train only if it\'s pain-free (' + xt.join(', ') + '), and keep lifting upper body and core.' + (B.red || bone ? ' See a doctor or physical therapist' + (B.red ? ' soon' : ' if it isn\'t clearly better in a few days') + (bone ? ': pinpoint bone pain, pain at night or pain when walking can mean a stress fracture, which needs imaging and 6+ weeks off, not a few days.' : '.') : '') + routine,
        plan: already ? 'You\'re already marked injured, so running stays off and the return plan is ready.' : 'I\'ll mark you injured: runs become pain-free cross-training or treadmill walks for the rest of the week. After that the plan comes back gradually at about 40%, then 60%, 75% and 90% of your normal weeks, with speed work last.',
        expect: 'Before your first run back you should be able to walk briskly for 30 minutes and do 15 single-leg hops on the sore side, all pain-free. Most overuse pain caught at this stage settles in 1–3 weeks; running through it is how 2 weeks becomes 2 months.',
        act: already ? null : { life: { kind: 'injured', level: 'out', note: where + ' ' + lvl + '/10' } }, label: already ? 'Got it' : 'Mark me injured' });
    } else if (B.band === 'mod') {
      var niggle = modDays >= 2 && !life;
      var r0 = runs[0], others = hard.filter(function (x) { return !r0 || x.date !== r0.date; });
      if (niggle) out.push({ id: 'pain-niggle-' + last.date, pri: 10, tone: 'act', title: 'This needs a lighter week', seen: desc + ' That\'s ' + plural(modDays, 'day') + ' in the back-off zone this week, so one shorter run isn\'t enough.',
        change: 'Run only while it stays at ' + B.R.ok + '/10 or less, on flat soft ground, no speed work or hills.' + (bone ? ' Shorten your stride slightly and land under your hips.' : '') + routine,
        plan: 'I\'ll mark this week as a niggle week: about 60% of planned miles, every run easy, strength work switches to upper body and core. Then 70%, 80% and 90% weeks bring you back.',
        expect: 'Pain back in the safe zone within a week or two. If it reaches ' + B.R.stop + '/10, makes you limp or hurts when walking, running stops.', act: { life: { kind: 'injured', level: 'modified', note: where + ' ' + lvl + '/10' } }, label: 'Make it a niggle week' });
      else if (!life) out.push({ id: 'pain-off-' + last.date, pri: 10, tone: 'act', title: B.why.some(function (w) { return /morning|rose|jumped/.test(w); }) ? 'Pain is going the wrong way' : 'Pain is above the safe line', seen: desc + ' Time to back off: ' + B.why.join(', and ') + '.',
        change: (bone && last.painWhen === 'morning' && r0 ? 'Take ' + dlab(r0.date) + ' off running (pain-free cross-training is fine)' : r0 ? 'Make ' + dlab(r0.date) + '\'s ' + partLine(r0) + ' about a third shorter and fully easy, on flat soft ground or a treadmill' : 'Keep the next run short and easy') + (others.length ? ', and run ' + others.map(function (x) { return dlab(x.date) + '\'s ' + x.p.title.toLowerCase(); }).join(' and ') + ' easy' : '') + '. During any run, stop if it goes above ' + B.R.ok + '/10 or changes your stride.' + routine,
        plan: 'No speed work or hills until pain is back to ' + B.R.ok + '/10 or less, and no mileage increase this week. If it stays in this zone for another day, I\'ll suggest a lighter week.',
        expect: 'Back in the safe zone within a few days. Pain that\'s still above ' + B.R.ok + ' after a week of reduced load should be looked at.',
        act: r0 || others.length ? { ov: (r0 ? [[r0.date, bone && last.painWhen === 'morning' ? 'cross' : 'short']] : []).concat(others.map(function (x) { return [x.date, 'easy']; })) } : null, label: r0 || others.length ? 'Back off' : 'Got it' });
    } else if (lvl > 0) {
      out.push({ id: 'pain-ok-' + last.date, pri: 5, tone: 'watch', title: 'Low pain, okay to train', seen: desc + ' For ' + B.R.name + ' pain, up to ' + B.R.ok + '/10 is in the zone you can train with.',
        change: 'Train as planned, as long as it stays at ' + B.R.ok + '/10 or less during the run, doesn\'t change your stride, and is back to normal by the next morning. Keep scoring it in your check-in.' + routine,
        plan: 'No change.', expect: 'Low, stable pain usually fades as the tissue adapts. If it climbs above ' + B.R.ok + ' or is worse the next morning, I\'ll pull the load back.', act: null, label: 'Got it' });
    }
  }
  /* pain has settled: back to running, gradually if it was serious */
  var r3 = C.filter(function (c) { return E.diffD(c.date, App.today) <= 3; }), before = C.filter(function (c) { var g = E.diffD(c.date, App.today); return g > 3 && g <= 21 && c.pain; });
  var wasStop = before.some(function (c) { var b = pnBand(c, prevOf(c)); return b && b.band === 'stop'; });
  if (r3.length >= 3 && r3.every(function (c) { return !c.pain || (c.painLvl != null && +c.painLvl <= 1); }) && before.length) out.push({ id: 'painfree', pri: wasStop ? 6 : 3, tone: wasStop ? 'act' : 'good', title: wasStop ? 'Ready to test a return to running' : 'Pain has settled', seen: 'Your last ' + r3.length + ' check-ins were pain-free (or nearly), after ' + plural(before.length, 'painful day') + ' before that.',
    change: wasStop ? 'Before your first run: a brisk 30-minute walk and 15 single-leg hops on the sore side, both pain-free. If either hurts, wait a few more days. Then start with run-walk (for example 5 × 3 minutes running, 1 minute walking) every other day.' : 'Back to normal training. Keep the prehab going for at least two more weeks; the tissue is still rebuilding.',
    plan: wasStop ? (life ? 'The return weeks are already in your plan: about 40%, 60%, 75% then 90% of normal.' : 'Your plan builds back over the next few weeks; speed work returns last.') : 'No change: the plan is back to normal.',
    expect: wasStop ? 'Mild soreness the next day means hold that step; pain over 2/10 means drop back a step for two days.' : '', act: wasStop ? { nav: '#/shins' } : null, label: wasStop ? 'Got it' : 'Nice' });
  return out;
}
/* check-ins written before the 1–10 score existed: read "2-3/10" and "walking" from the note */
function pnFromNote(c) {
  if (!c || !c.pain || c.painLvl != null || !c.note) return null;
  var m = /(\d+(?:\.\d+)?)\s*(?:(?:-|–|to)\s*(\d+(?:\.\d+)?))?\s*\/\s*10/.exec(c.note); if (!m) return null;
  var lvl = Math.round(Math.max(+m[1], m[2] ? +m[2] : 0)); if (!(lvl >= 0 && lvl <= 10)) return null;
  return { painLvl: lvl, painWhen: /walk|stairs|standing|house|all day|at rest/i.test(c.note) ? 'always' : /morning/i.test(c.note) ? 'morning' : /after/i.test(c.note) ? 'after' : /during|running|run\b/i.test(c.note) ? 'during' : '' };
}
function pnMigrate() {
  var C = st().checkins || [], fix = C.filter(function (c) { return pnFromNote(c); });
  if (!fix.length) return false;
  Store.editMany(fix.map(function (c) { return ['checkins', c.id]; }), function (S) { S.checkins.forEach(function (c) { var f = pnFromNote(c); if (f) { c.painLvl = f.painLvl; if (!c.painWhen) c.painWhen = f.painWhen; c.painFromNote = true; } }); });
  return true;
}
var _applyG32b = applyGarmin;
applyGarmin = function () { var m = false; try { m = pnMigrate(); } catch (e) { m = false; } var r = _applyG32b(); return r || m; };
/* the first run back after pain this week: ease into it */
function pnBackFinding() {
  var C = (st().checkins || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }), last = C.filter(function (c) { return E.diffD(c.date, App.today) <= 1; }).pop();
  if (!last || (last.pain && last.painLvl > 0)) return null;
  var recent = C.filter(function (c) { var g = E.diffD(c.date, App.today); return g >= 1 && g <= 7 && c.pain && c.painLvl != null; });
  if (!recent.length) return null;
  var worst = null; recent.forEach(function (c) { var b = pnBand(c); if (b && (!worst || (b.band === 'stop' ? 2 : b.band === 'mod' ? 1 : 0) > (worst.band === 'stop' ? 2 : worst.band === 'mod' ? 1 : 0))) { worst = b; worst.c = c; } });
  if (!worst || worst.band === 'ok') return null;
  var lastPain = recent[recent.length - 1], free = C.filter(function (c) { return c.date > lastPain.date && !(c.pain && c.painLvl > 0); }).length;
  if (free >= 3) return null;   /* the "pain has settled" message takes over */
  var nx = daysAhead(1, function (p) { return E.isRun(p); }, 0)[0]; if (!nx) return null;
  var where = PN_AREA[worst.c.where] || 'sore spot', R = worst.R, isLong = nx.p.type === 'long', hard = nx.p.type === 'speed', stop = worst.band === 'stop';
  var cut = stop ? (isLong ? 0.65 : 0.7) : (isLong ? 0.8 : 1), newMi = Math.round((nx.p.mi || 0) * cut * 2) / 2;
  return { id: 'painback-' + nx.date, pri: 10, tone: 'act', title: 'First run back: ease into it', seen: 'Your ' + where + ' was ' + worst.lvl + '/10 on ' + fmtD(worst.c.date, { weekday: 'long' }) + (worst.c.painWhen ? ' (' + PN_WHEN[worst.c.painWhen] + ')' : '') + ', and it\'s been pain-free for ' + plural(free, 'check-in') + '. ' + (stop ? 'Pain at that level' + (worst.c.painWhen === 'always' ? ', while walking,' : '') + ' means the tissue needs a gradual return, not your longest run of the week straight away.' : 'It\'s settling, so keep this run gentle.'),
    change: (stop ? 'Before you run: walk briskly for 5–10 minutes, then do 15 single-leg hops on the sore side. If either hurts, swap the run for a pain-free incline walk or bike. If both are pain-free, run ' : 'Run ') + dlab(nx.date) + '\'s ' + nx.p.title.toLowerCase() + (cut < 1 ? ' as about ' + mi(newMi) + ' mi instead of ' + mi(nx.p.mi) : '') + ', fully easy (the slow end of your easy pace), on flat ground or a treadmill' + (hard ? ', with no speed work' : '') + '. Stop and walk if it goes above ' + R.ok + '/10 or changes your stride.',
    plan: cut < 1 ? 'That run drops to about ' + mi(newMi) + ' mi. If tomorrow morning is pain-free, the rest of the week goes ahead as planned.' : 'No change to the distance. Tomorrow morning\'s check-in decides the next run.',
    expect: 'Pain-free during the run and the next morning means the tissue handled it and you can carry on. Soreness the next morning means hold at this level for a few more days.',
    act: cut < 1 || hard ? { ov: [[nx.date, cut < 1 ? 'short' : 'easy']] } : null, label: cut < 1 || hard ? 'Ease into it' : 'Got it' };
}
var _pnF32b = pnFindings;
pnFindings = function () { var out = _pnF32b(), b = null; try { b = pnBackFinding(); } catch (e) { b = null; } if (b) out.push(b); return out; };

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
    if ((st().checkins || []).some(function (c) { return E.diffD(c.date, App.today) <= 2 && c.pain && c.painLvl != null; })) base = base.filter(function (f) { return !/^shin:/.test(f.id); });
    if (I.hrMed) base = base.filter(function (f) { return !/^easycap:/.test(f.id); });
    return base.concat(extra.filter(function (f) { return !no[f.id] && !acc[f.id]; })).sort(function (a, b) { return b.pri - a.pri; });
  });
};
function _cf27safe() { try { return _cf32(); } catch (e) { return []; } }
/* the coach's new actions: a peak cap */
var _apply32 = applyCoachAct;
applyCoachAct = function (f) {
  var a = f.act || {};
  if (a.life) {
    var L = a.life, f0 = L.level === 'out' ? App.today : wkStart(App.today), e = { id: uid(), kind: L.kind, level: L.level, from: f0, to: L.level === 'out' ? E.addD(App.today, 2) : E.addD(f0, 6), note: L.note || 'from your coach' };
    Store.edit('life', e.id, function (S) { S.life = (S.life || []).concat([e]); });
    if (typeof recompute === 'function') recompute();
  }
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
  if (wk.some(function (x) { return x.v > 0; })) b.push('Pain: highest ' + mx(wk) + '/10 this week' + (pw.length ? (mx(wk) > mx(pw) ? ', up from ' + mx(pw) + ' the week before.' : mx(wk) < mx(pw) ? ', down from ' + mx(pw) + ' the week before.' : ', same as the week before.') : '.') + (function () { var bs = (st().checkins || []).filter(function (c) { return c.date >= ws && c.date <= we && c.pain; }).map(function (c) { return (pnBand(c) || {}).band; }); return bs.indexOf('stop') >= 0 ? ' Over the stop line: running paused, then a gradual return.' : bs.indexOf('mod') >= 0 ? ' In the back-off zone: I suggested reducing load.' : ' Within the safe zone.'; })());
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

/* ================= Treadmill walks: log the incline, and the coach sets the next one ================= */
var INC_CAP = { bone: 8, tendon: 3, other: 10 };
function isTreadType(t) { return /treadmill|incline|indoor_walk/i.test(t || ''); }
function incWalks(days) { var L = st().logs || {}; return Object.keys(L).filter(function (d) { var c = L[d] && L[d].cross; return c && isTreadType(c.type) && E.diffD(d, App.today) <= (days || 21); }).sort().map(function (d) { return Object.assign({ date: d }, L[d].cross); }); }
function incPain() {
  var C = (st().checkins || []).filter(function (c) { return E.diffD(c.date, App.today) <= 10 && c.pain && c.painLvl != null; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }), c = C[C.length - 1];
  if (!c) return null; var b = pnBand(c) || {}; return { date: c.date, where: c.where, t: pnTissue(c.where), band: b.band, lvl: c.painLvl };
}
function incSuggest() {
  var P = incPain(), cap = P ? INC_CAP[P.t] : 12, W = incWalks(21).filter(function (w) { return w.incline != null; }), last = W[W.length - 1], v, why;
  var area = P ? (PN_AREA[P.where] || 'sore spot') : '';
  if (!last) { v = P ? Math.min(cap, P.t === 'tendon' ? 0 : 4) : 5; why = P ? (P.t === 'tendon' ? 'Start flat: steep inclines stretch and load the Achilles and calf.' : 'A moderate start: steep inclines work the front of the shin hard.') : 'A brisk incline walk is real aerobic work with almost no impact.'; }
  else if (P && P.band && P.band !== 'ok' && P.date >= last.date) { v = Math.min(cap, Math.max(0, last.incline - 2)); why = 'Your ' + area + ' hurt after the last walk at ' + last.incline + '%, so ' + (v < last.incline - 2 ? 'come down to ' + v + '%: steeper loads it more than it\'s ready for.' : 'drop it 2%.'); }
  else if (last.incline >= cap) { v = cap; why = P ? 'Hold at ' + cap + '%: higher inclines load your ' + area + ' more than it\'s ready for.' : 'That\'s plenty: add minutes or speed instead.'; }
  else { v = Math.min(cap, last.incline + 1); why = 'No pain reported after your last walk at ' + last.incline + '%, so add 1%.'; }
  return { v: v, cap: cap, why: why, P: P, last: last };
}
function metWords(m) { return m < 4 ? 'light' : m < 6 ? 'moderate, like a brisk walk' : m < 8 ? 'vigorous, about an easy jog' : 'hard, like steady running'; }
/* the plan's treadmill walks carry the incline to use */
var _crl32 = coachRunLines;
coachRunLines = function (x, date) {
  if (x.type === 'cross' && /walk/i.test(x.title || '') && !partDone(date, x) && date >= App.today) {
    var s = incSuggest(); return '<p class="small capline"><b>Incline: about ' + s.v + '%</b> at a brisk 3.0–3.8 mph. ' + esc(s.why) + ' Log the incline when you finish so I can set the next one.</p>';
  }
  return _crl32(x, date);
};
/* the log sheet asks for incline and speed on treadmill walks */
var _crossSheet32 = SHEETS.cross;
SHEETS.cross = function (a) {
  var h = _crossSheet32(a), r = logOf(a.date).cross || {}, day = dayOf(a.date), planned = day && day.parts.filter(function (p) { return p.type === 'cross' && /walk/i.test(p.title || ''); })[0];
  if (!r.type && planned) { h = h.replace('<option>Treadmill walk</option>', '<option selected>Treadmill walk</option>'); if (planned.min) h = h.replace('id="c-min" type="number" min="0" value=""', 'id="c-min" type="number" min="0" value="' + planned.min + '"'); }
  var show = r.type ? isTreadType(r.type) : true, s = incSuggest();
  var f = '<div id="c-incw"' + (show ? '' : ' hidden') + '><div class="grid2"><label class="f">Incline (%)<input class="i" id="c-inc" type="number" inputmode="decimal" step="0.5" min="0" max="15" placeholder="' + s.v + '" value="' + (r.incline != null ? r.incline : '') + '"></label><label class="f">Speed (mph)<input class="i" id="c-mph" type="number" inputmode="decimal" step="0.1" min="1" max="5" placeholder="3.4" value="' + (r.mph || '') + '"></label></div><p class="tiny muted" id="c-met">' + incMetLine(r.mph, r.incline) + '</p></div>';
  var i = h.indexOf('<label class="f">Effort (RPE)'); return i > 0 ? h.slice(0, i) + f + h.slice(i) : h;
};
function incMetLine(mph, inc) { if (inc == null || inc === '') return 'Your coach uses the incline to set your next walk and to count it toward your training load.'; var m = E.walkMets(mph || 3.4, inc); return '≈ ' + m.toFixed(1) + ' METs: ' + metWords(m) + '.'; }
document.addEventListener('input', function (e) { if (e.target && (e.target.id === 'c-inc' || e.target.id === 'c-mph')) { var el = $('#c-met'); if (el) el.textContent = incMetLine($('#c-mph').value, $('#c-inc').value); } });
document.addEventListener('change', function (e) { if (e.target && e.target.id === 'c-type') { var w = $('#c-incw'); if (w) w.hidden = !isTreadType(e.target.value); } });
/* after logging a treadmill walk, the coach says what it makes of it and sets the next incline */
var _save32 = ACTIONS['sheet-save'];
ACTIONS['sheet-save'] = function (a) {
  var k = sheetCtx.kind, d = sheetCtx.a && sheetCtx.a.date;
  _save32(a);
  if (k !== 'cross' || !d) return;
  var c = logOf(d).cross; if (!c || !isTreadType(c.type) || c.incline == null) return;
  var m = E.walkMets(c.mph || 3.4, c.incline), s = incSuggest(), P = s.P;
  coachSay('Logged: ' + c.min + ' min at ' + c.incline + '% incline' + (c.mph ? ', ' + c.mph + ' mph' : '') + ' (≈ ' + m.toFixed(1) + ' METs, ' + metWords(m).split(',')[0] + ').' +
    (P && c.incline > s.cap ? ' That\'s steeper than I\'d like with your ' + (PN_AREA[P.where] || 'sore spot') + ' pain: keep it at ' + s.cap + '% or less until it settles.' : '') +
    '\n\nNext walk: about ' + s.v + '%. ' + s.why + ' Tell me in tomorrow\'s check-in how the ' + (P ? PN_AREA[P.where] || 'sore spot' : 'legs') + ' felt.', []);
};
/* the coach notices a walk that was too steep for a sore spot */
var _pnF32 = pnFindings;
pnFindings = function () {
  var out = _pnF32(), P = incPain(), W = incWalks(5).filter(function (w) { return w.incline != null; }), last = W[W.length - 1];
  if (P && last && last.incline > INC_CAP[P.t] && P.band !== 'ok') out.push({ id: 'incline-' + last.date, pri: 7, tone: 'act', title: 'Lower the treadmill incline', seen: 'Your last treadmill walk was at ' + last.incline + '% and your ' + (PN_AREA[P.where] || 'sore spot') + ' is at ' + P.lvl + '/10.', change: 'Keep incline walks at ' + INC_CAP[P.t] + '% or less until the pain is back in the safe zone' + (P.t === 'tendon' ? ': steep inclines stretch the Achilles and calf with every step.' : ': very steep inclines work the front of the shin hard.'), plan: 'Your planned treadmill walks will show ' + incSuggest().v + '%.', expect: 'The walk keeps your aerobic fitness without irritating the sore spot.', act: null, label: 'Got it' });
  return out;
};
App.p32.incSuggest = incSuggest;

/* ================= Walks are walks: never compared with runs, and a treadmill walk asks for its incline ================= */
GTYPE.treadmill_walking = GTYPE.treadmill_walking || 'Treadmill walk';
GTYPE.indoor_walking = GTYPE.indoor_walking || 'Treadmill walk';
function isTreadAct(a) { var l = (a && a.log) || {}, g = (a && a.g) || {}; return isTreadType(l.type) || /treadmill|indoor_walk/i.test(g.type || ''); }
/* a walk the watch recorded as a run moves from the run log to the activity log */
function fixWalkLogs() {
  var g = Store.garmin; if (!g || !g.activities) return false; E.markWalks(g);
  var walk = {}; g.activities.forEach(function (a) { if (a.walk) walk[a.id] = a; });
  var L = st().logs || {}, moves = [];
  Object.keys(L).forEach(function (d) { ['run', 'xrun'].forEach(function (s) { var r = L[d] && L[d][s]; if (r && r.gid && walk[r.gid]) moves.push({ d: d, s: s, a: walk[r.gid] }); }); });
  if (!moves.length) return false;
  Store.editMany(moves.map(function (m) { return ['logs', m.d]; }), function (S) {
    moves.forEach(function (m) { var l = S.logs[m.d], a = m.a; delete l[m.s]; if (!l.cross) l.cross = { src: 'garmin', gid: a.id, type: a.type, min: Math.round((a.durS || a.movS || 0) / 60), hr: a.avgHR || null }; });
  });
  return true;
}
var _applyG32 = applyGarmin;
applyGarmin = function () { var f = fixWalkLogs(); var r = _applyG32(); return r || f; };
function walkMph(g) { if (!g || !(g.distM > 0) || !(g.movS || g.durS)) return null; var v = g.distM / E.MI_M / ((g.movS || g.durS) / 3600); return v >= 1.5 && v <= 4.6 ? Math.round(v * 10) / 10 : null; }
function incSaid(c) {
  var m = E.walkMets(c.mph || 3.4, c.incline), s = incSuggest(), P = s.P;
  coachSay('Logged: ' + (c.min ? c.min + ' min at ' : '') + c.incline + '% incline' + (c.mph ? ', ' + c.mph + ' mph' : '') + ' (≈ ' + m.toFixed(1) + ' METs, ' + metWords(m).split(',')[0] + ').' +
    (P && c.incline > s.cap ? ' That\'s steeper than I\'d like with your ' + (PN_AREA[P.where] || 'sore spot') + ' pain: keep it at ' + s.cap + '% or less until it settles.' : '') +
    '\n\nNext walk: about ' + s.v + '%. ' + s.why + ' Tell me in tomorrow\'s check-in how the ' + (P ? PN_AREA[P.where] || 'sore spot' : 'legs') + ' felt.', []);
}
/* the walk's own page: walk numbers only, and the incline question first */
var _act32 = VIEWS.activity;
VIEWS.activity = function () {
  var h = _act32(), a = actByKey(App.args[0]); if (!a || a.kind === 'run') return h;
  var g = a.g || {}, isWalk = g.walk || /walk/i.test(g.type || '') || /walk/i.test((a.log || {}).type || '');
  if (!isWalk && !isTreadAct(a)) return h;
  var c = '<p class="tiny muted wnote">Walks are kept separate from your runs: they never count toward running pace, cadence, form or race predictions.</p>';
  if (isTreadAct(a) && a.date <= App.today) {
    var l = a.log || {}, has = l.incline != null, mph = l.mph || walkMph(g), s = incSuggest();
    var form = '<div class="grid2"><label class="f">Incline (%)<input class="i" id="w-inc" type="number" inputmode="decimal" step="0.5" min="0" max="15" placeholder="e.g. ' + s.v + '" value="' + (has ? l.incline : '') + '"></label><label class="f">Speed (mph)<input class="i" id="w-mph" type="number" inputmode="decimal" step="0.1" min="1" max="5" placeholder="3.4" value="' + (mph || '') + '"></label></div><p class="tiny muted" id="w-met">' + incMetLine(mph, has ? l.incline : '') + '</p><div class="btns"><button class="btn primary" data-act="w-inc-save" data-arg="' + jattr({ d: a.date, gid: g.id || null }) + '">' + (has ? 'Update' : 'Save incline') + '</button></div>';
    c = has ? '<section class="card incprompt"><div class="eyebrow">Incline</div><h3>' + l.incline + '% incline' + (l.mph ? ' at ' + l.mph + ' mph' : '') + '</h3><p class="small">≈ ' + E.walkMets(l.mph || 3.4, l.incline).toFixed(1) + ' METs: ' + metWords(E.walkMets(l.mph || 3.4, l.incline)) + '. Next walk: about <b>' + s.v + '%</b>. ' + esc(s.why) + '</p><details class="wedit"><summary class="small">Change it</summary>' + form + '</details></section>' + c
      : '<section class="card incprompt need"><div class="eyebrow">Incline</div><h3>What incline did you use?</h3><p class="small muted">Your watch can\'t see the treadmill\'s incline. Your coach uses it to count the effort and set your next walk' + (s.P ? ' around your ' + (PN_AREA[s.P.where] || 'sore spot') : '') + '.</p>' + form + '</section>' + c;
  }
  h = h.replace(/>Cadence</g, '>Steps per min<');
  var m = /<div class="pagehead">[\s\S]*?<\/h1>(?:<p>[\s\S]*?<\/p>)?<\/div>/.exec(h); if (!m) return c + h; var i = m.index + m[0].length; return h.slice(0, i) + c + h.slice(i);
};
ACTIONS['w-inc-save'] = function (a) {
  var inc = $('#w-inc').value, mph = $('#w-mph').value; if (inc === '') { toast('Enter the incline'); return; }
  var act = a.gid ? (Store.garmin.activities || []).filter(function (x) { return x.id === a.gid; })[0] : null, d = a.d;
  Store.edit('logs', d, function (S) {
    S.logs[d] = S.logs[d] || {}; var c = S.logs[d].cross;
    if (!c || (a.gid && c.gid && c.gid !== a.gid)) c = S.logs[d].cross = act ? { src: 'garmin', gid: act.id, type: act.type, min: Math.round((act.durS || act.movS || 0) / 60), hr: act.avgHR || null } : { type: 'Treadmill walk', min: 0 };
    c.incline = +inc; c.mph = mph !== '' ? +mph : null;
  });
  incSaid(logOf(d).cross); toast('Incline saved');
};
document.addEventListener('input', function (e) { if (e.target && (e.target.id === 'w-inc' || e.target.id === 'w-mph')) { var el = $('#w-met'); if (el) el.textContent = incMetLine($('#w-mph').value, $('#w-inc').value); } });
/* a logged treadmill walk with no incline asks for it on the day page and on Today */
var _crl32b = coachRunLines;
coachRunLines = function (x, date) {
  var l = logOf(date).cross;
  if (x.type === 'cross' && /walk/i.test(x.title || '') && l && isTreadType(l.type) && l.incline == null) return '<p class="small capline"><b>What incline did you use?</b> <a href="#/activity/' + encodeURIComponent(l.gid ? 'g' + l.gid : 'l' + date + '|cross') + '">Add it</a> so I can set your next walk.</p>';
  return _crl32b(x, date);
};
var _today32b = VIEWS.today;
VIEWS.today = function () {
  var h = _today32b(), L = st().logs || {}, miss = null;
  for (var i = 0; i <= 2 && !miss; i++) { var d = E.addD(App.today, -i), c = L[d] && L[d].cross; if (c && isTreadType(c.type) && c.incline == null) miss = { d: d, c: c }; }
  if (!miss) return h;
  var k = miss.c.gid ? 'g' + miss.c.gid : 'l' + miss.d + '|cross';
  var card = '<a class="card shinrem increm" href="#/activity/' + encodeURIComponent(k) + '"><span aria-hidden="true">⛰️</span><span><b>Add your treadmill incline</b><small>' + (miss.d === App.today ? 'Today\'s' : fmtD(miss.d, { weekday: 'long' }) + '\'s') + ' walk: ' + (miss.c.min || '') + ' min. Your coach uses it to set the next walk.</small></span><span class="chev">›</span></a>';
  var g = h.indexOf('class="greet"'), j = g >= 0 ? h.indexOf('</h1></div>', g) : -1;
  return j > 0 ? h.slice(0, j + 11) + card + h.slice(j + 11) : h + card;
};
/* a walk keeps Garmin's data but never its "Running" name */
var _acts32 = activities;
activities = function () { var r = _acts32(); r.forEach(function (x) { if (x.g && x.g.walk && /run/i.test(x.name || '')) x.name = gLabel(x.g.type); }); return r; };
App.p32.fixWalkLogs = fixWalkLogs;

/* ================= Your own schedule changes stay under the coach's eye ================= */
/* moving a session takes the coach's change for that day with it (a shortened or easy run stays shortened or easy) */
var _mv32 = ACTIONS['do-move'];
ACTIONS['do-move'] = function (a) {
  var ov = (st().overrides || {})[a.from], fromDay = dayOf(a.from), runMoved = fromDay && fromDay.parts.some(function (p) { return E.isRun(p) || p.type === 'cross'; });
  _mv32(a);
  if (ov && runMoved && !(st().overrides || {})[a.to]) {
    Store.editMany([['overrides', a.from], ['overrides', a.to]], function (S) { S.overrides = S.overrides || {}; S.overrides[a.to] = Object.assign({}, ov, { movedFrom: a.from }); delete S.overrides[a.from]; });
    toast('Moved, with your coach\'s change for that day');
  }
};
/* two hard days in a row after a move */
function schedFindings() {
  var out = [], D = [];
  for (var i = 0; i <= 7; i++) { var d = E.addD(App.today, i), day = dayOf(d); if (day) D.push({ d: d, p: day.parts.filter(function (p) { return (p.type === 'speed' || p.type === 'long') && !partDone(d, p); })[0] }); }
  for (var j = 1; j < D.length; j++) {
    var a = D[j - 1], b = D[j]; if (!a.p || !b.p) continue;
    var tg = b.p.type === 'long' && a.p.type !== 'long' ? a : b;   /* keep the long run; soften the other one */
    out.push({ id: 'b2b-' + b.d, pri: 7, tone: 'act', title: 'Two hard days in a row', seen: dlab(a.d) + '\'s ' + partLine({ p: a.p }) + ' and ' + dlab(b.d) + '\'s ' + partLine({ p: b.p }) + ' are back to back. Hard sessions need a day of easy running or rest between them, or the second one is run on tired legs' + ((st().profile || {}).injuryProne ? ' and your shins take two big loads in a row' : '') + '.',
      change: 'Make ' + dlab(tg.d) + '\'s ' + tg.p.title.toLowerCase() + ' an easy run' + (tg === a ? ' so the long run gets fresh legs' : '') + ', or move one of them so there\'s an easy or rest day between.', plan: 'Accepting turns ' + dlab(tg.d) + '\'s session into an easy run of about ' + mi((tg.p.mi || 0) * (tg.p.type === 'long' ? 0.8 : 0.85)) + ' mi.', expect: 'Each hard session gets done on fresh legs, which is where the training benefit comes from.', act: { ov: [[tg.d, 'easy']] }, label: 'Make ' + dlab(tg.d) + '\'s easy' });
  }
  return out;
}
var _pnF32c = pnFindings;
pnFindings = function () { var out = _pnF32c(); try { out = out.concat(schedFindings()); } catch (e) { console.warn(e); } return out; };

/* ================= Reminders: what was actually sent, so a missing one can be traced ================= */
function remHistory(cb) { if (Store.mode !== 'github' || !Store.getFile) return cb(null); Store.getFile('garmin/notify.json', true).then(function (f) { var j = null; try { j = JSON.parse(f.text); } catch (e) { j = null; } cb(j); }).catch(function () { cb(null); }); }
var _notify32b = VIEWS.notify;
VIEWS.notify = function () {
  var h = _notify32b(), H = App.ui.remHist;
  if (H === undefined) { App.ui.remHist = null; remHistory(function (j) { App.ui.remHist = j || false; if (App.view === 'notify') render(); }); }
  var rows = H && H.hist ? H.hist.slice(-8).reverse() : [];
  var c = '<section class="card stack"><h3>Recently sent</h3>' + (rows.length ? '<ul class="plain small wkl">' + rows.map(function (x) { var d = new Date(x.t); return '<li>' + (x.ok ? '✓ ' : '✗ ') + esc(x.title) + ' · ' + d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) + (x.ok ? '' : ' (ntfy refused it)') + '</li>'; }).join('') + '</ul><p class="tiny muted">✓ means ntfy.sh accepted it. If one shows here but never reached your phone, the problem is on the phone: check that notifications are allowed for ntfy, that a Focus or Do Not Disturb mode isn\'t hiding them, and that ntfy is subscribed to your topic on ntfy.sh. "Send a test" checks the whole path.</p>' : '<p class="small muted">' + (H === false || H === null ? 'Nothing recorded yet.' : 'Loading…') + '</p>') + '</section>';
  var i = h.indexOf('<label class="check"><input type="checkbox" id="ntOn"'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};
/* the week editor's drag-to-another-day does the same: the coach's change for the day follows the run */
var _edMove32 = edMove;
edMove = function (key, to) {
  var cur = (st().arr || {})[key] || key.split('|')[0], ov = (st().overrides || {})[cur], isRun = /\|run$/.test(key);
  _edMove32(key, to);
  if (ov && isRun && cur !== to && !(st().overrides || {})[to]) Store.editMany([['overrides', cur], ['overrides', to]], function (S) { S.overrides = S.overrides || {}; S.overrides[to] = Object.assign({}, ov, { movedFrom: cur }); delete S.overrides[cur]; });
};
App.p32.edMove = function (k, t) { edMove(k, t); };

/* ================= Reminders: one topic, saved the moment it's made, and a one-tap subscribe ================= */
var _notify32c = VIEWS.notify;
VIEWS.notify = function () {
  var saved = ((st().prefs || {}).notify || {}).topic;
  if (!saved) { var t = App.ui.newTopic || (App.ui.newTopic = ntfyTopic()); Store.edit('prefs', 'notify', function (S) { S.prefs = S.prefs || {}; S.prefs.notify = Object.assign({ on: false, hour: 18, tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') }, S.prefs.notify || {}, { topic: t }); }); }
  var h = _notify32c(), topic = ((st().prefs || {}).notify || {}).topic || '';
  var sub = '<div class="btns" style="margin-top:8px"><a class="btn sm primary" href="ntfy://ntfy.sh/' + encodeURIComponent(topic) + '">Subscribe in ntfy</a></div><p class="tiny muted" style="margin-top:6px">Android: opens ntfy ready to subscribe. Your phone must be subscribed to exactly <b>' + esc(topic) + '</b>. If ntfy shows a different runplan-… topic, unsubscribe from it: that one never gets reminders.</p>';
  var i = h.indexOf('<button class="btn sm" data-act="nt-copy">Copy</button></div>'); if (i > 0) { var j = i + '<button class="btn sm" data-act="nt-copy">Copy</button></div>'.length; h = h.slice(0, j) + sub + h.slice(j); }
  return h;
};
/* a test always goes to the saved topic, after saving what's on screen */
var _ntTest32 = ACTIONS['nt-test'];
ACTIONS['nt-test'] = function () { var n = ntRead(); Store.edit('prefs', 'notify', function (S) { S.prefs = S.prefs || {}; S.prefs.notify = n; }); _ntTest32(); };

/* ================= Rest timer on the lock screen (and an option to keep the screen on) =================
   Phones won't let a web page draw on the lock screen, but they do show media controls there. During a rest the app
   plays silence and publishes the rest as a "track": the lock screen shows "Rest 1:30 · Next: Back squat, set 3 of 4"
   with a progress bar that runs down on its own, plus −15 s / +15 s buttons. A buzz marks the end (no sound, so your music keeps playing). */
function wkPrefs() { var p = st().prefs || {}; return { lock: p.restLock !== false, wake: !!p.wakeWorkout }; }
var RL = { audio: null, ctx: null, cur: null, doneAt: 0, wake: null };
function rlSilence() {
  if (RL.url) return RL.url;
  var sr = 8000, n = sr * 10, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = function (o, s) { for (var i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
  for (var i = 0; i < n; i++) v.setInt16(44 + i * 2, (i % 2 ? 1 : -1), true);   /* inaudible, but not digital silence (some phones drop pure silence) */
  RL.url = URL.createObjectURL(new Blob([b], { type: 'audio/wav' })); return RL.url;
}
function rlNext() {
  var w = App.wk; if (!w || !w.ex) return '';
  for (var i = 0; i < w.ex.length; i++) { var x = w.ex[i]; if (x.kind === 'wu' || !x.sets) continue; for (var j = 0; j < x.sets.length; j++) if (!x.sets[j].done) return 'Next: ' + (x.n || 'next set') + ', set ' + (j + 1) + ' of ' + x.sets.length; }
  return 'Last set done';
}
function rlChime() {   /* no sound: a tone would interrupt your music. A buzz only. */
  try { if (navigator.vibrate) navigator.vibrate([300, 120, 300, 120, 300]); } catch (e) { /* ignore */ }
}
function rlStart() {
  if (!('mediaSession' in navigator)) return;
  if (!RL.audio) { RL.audio = new Audio(rlSilence()); RL.audio.loop = true; RL.audio.volume = 0.01; }
  var p = RL.audio.play(); if (p && p.catch) p.catch(function () { /* the phone refused; the in-app timer still works */ });
  var ms = navigator.mediaSession, adj = function (s) { return function () { if (App.rest) { App.rest.end += s * 1000; App.rest.total = Math.max(1, App.rest.total + s); rlUpdate(true); } }; };
  try { ms.setActionHandler('seekbackward', adj(-15)); ms.setActionHandler('seekforward', adj(15)); ms.setActionHandler('previoustrack', adj(-15)); ms.setActionHandler('nexttrack', adj(15)); ms.setActionHandler('pause', function () { App.rest = null; rlStop(); var b = $('#restBar'); if (b) b.hidden = true; }); ms.setActionHandler('play', function () {}); } catch (e) { /* older browsers */ }
  rlUpdate(true);
}
function rlUpdate(force) {
  if (!App.rest || !('mediaSession' in navigator)) return;
  var total = App.rest.total || 60, left = Math.max(0, (App.rest.end - Date.now()) / 1000), title = 'Rest ' + mmss(left);
  if (force || RL.title !== title) {
    RL.title = title;
    try { navigator.mediaSession.metadata = new MediaMetadata({ title: title, artist: rlNext(), album: 'Personal Run · ' + (App.wk && App.wk.key && E.LIFT[App.wk.key] ? 'Strength ' + App.wk.key + ': ' + E.LIFT[App.wk.key].name : 'Workout'), artwork: [{ src: 'pr-192.png', sizes: '192x192', type: 'image/png' }, { src: 'pr-512.png', sizes: '512x512', type: 'image/png' }] }); } catch (e) { /* ignore */ }
    try { navigator.mediaSession.playbackState = 'playing'; navigator.mediaSession.setPositionState({ duration: Math.max(total, 1), position: Math.min(total, Math.max(0, total - left)), playbackRate: 1 }); } catch (e) { /* ignore */ }
  }
}
function rlStop(done) {
  if (done) {
    try { navigator.mediaSession.metadata = new MediaMetadata({ title: 'Rest done: go', artist: rlNext(), album: 'Personal Run', artwork: [{ src: 'pr-192.png', sizes: '192x192', type: 'image/png' }] }); navigator.mediaSession.setPositionState({ duration: 1, position: 1, playbackRate: 1 }); } catch (e) { /* ignore */ }
    rlChime(); RL.doneAt = Date.now(); return;
  }
  RL.doneAt = 0;
  try { if (RL.audio) RL.audio.pause(); navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; } catch (e) { /* ignore */ }
}
/* follow the in-app rest timer: start, adjust, finish */
setInterval(function () {
  var on = wkPrefs().lock, r = App.rest;
  if (r && on) {
    if (RL.cur !== r) { RL.cur = r; RL.doneAt = 0; rlStart(); }
    else rlUpdate(false);
    if (r.end - Date.now() <= 250 && !RL.doneAt) rlStop(true);
  } else if (RL.cur) {
    var finished = RL.cur.end <= Date.now() + 1000;
    if (finished && !RL.doneAt) rlStop(true);
    if (!finished || Date.now() - RL.doneAt > 8000) { RL.cur = null; rlStop(false); }
  }
}, 500);
/* keep the screen on during a workout, if you want it */
function wakeSync() {
  var want = wkPrefs().wake && App.view === 'workout' && App.wk && document.visibilityState === 'visible';
  if (want && !RL.wake && navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { RL.wake = l; l.addEventListener('release', function () { RL.wake = null; }); }).catch(function () { RL.wake = null; });
  else if (!want && RL.wake) { try { RL.wake.release(); } catch (e) { /* ignore */ } RL.wake = null; }
}
document.addEventListener('visibilitychange', wakeSync); setInterval(wakeSync, 3000);
/* the two switches, at the bottom of the workout page */
var _workout32 = VIEWS.workout;
VIEWS.workout = function () {
  var h = _workout32(); if (!App.wk || App.wk.edit) return h;
  var p = wkPrefs(), ms = 'mediaSession' in navigator, wl = !!navigator.wakeLock;
  var c = '<section class="card stack rlset"><h3>Rest timer</h3>' +
    (ms ? '<label class="check"><input type="checkbox" id="rl-lock"' + (p.lock ? ' checked' : '') + '> <span><b>Show the rest timer on the lock screen</b><br><span class="small muted">When your screen turns off between sets, the lock screen shows the time left and your next set, with −15 s / +15 s buttons, and buzzes when it\'s time to go. It appears as a media player.</span></span></label>' : '') +
    (wl ? '<label class="check"><input type="checkbox" id="rl-wake"' + (p.wake ? ' checked' : '') + '> <span><b>Keep the screen on during workouts</b><br><span class="small muted">The screen stays on while this page is open. Uses more battery.</span></span></label>' : '') +
    (!ms && !wl ? '<p class="small muted">This browser can\'t show a lock-screen timer; keep the app open between sets.</p>' : '') + '</section>';
  var i = h.lastIndexOf('</section>'); return i > 0 ? h.slice(0, i + 10) + c + h.slice(i + 10) : h + c;
};
document.addEventListener('change', function (e) {
  var t = e.target; if (!t || (t.id !== 'rl-lock' && t.id !== 'rl-wake')) return;
  var k = t.id === 'rl-lock' ? 'restLock' : 'wakeWorkout', v = t.checked;
  Store.edit('prefs', k, function (S) { S.prefs = S.prefs || {}; S.prefs[k] = v; });
  if (k === 'restLock' && !v) { RL.cur = null; rlStop(false); }
  wakeSync(); toast(v ? 'On' : 'Off');
});
App.p32.rl = RL;

/* ================= Adding an exercise mid-session (and putting back one you removed) ================= */
/* an added exercise lands in the section you're on, with the right logging type, so it shows up and gets saved */
var _exaddSave32 = SAVE2.exadd;
SAVE2.exadd = function () {
  var w = App.wk; if (!w) return _exaddSave32();
  var swap = sheetCtx.swap, keepSec = swap != null && w.ex[swap] ? w.ex[swap].sec : w.cur, before = w.ex.length;
  _exaddSave32();
  var x = swap != null ? w.ex[swap] : w.ex.length > before ? w.ex[w.ex.length - 1] : null; if (!x) return;
  if (x.sec == null) x.sec = keepSec;
  if (!x.kind) x.kind = kindOf(x.n, x.rx);
  if (!x.rest) x.rest = 75;
  if (w.removed) w.removed = w.removed.filter(function (r) { return r.n !== x.n; });
  wkSave(); render();
};
/* removing keeps a copy, so it can be put back in one tap */
var _wkRemove32 = ACTIONS['wk-remove'];
ACTIONS['wk-remove'] = function (a) { var w = App.wk, x = w && w.ex[a.i]; if (x) { w.removed = (w.removed || []).filter(function (r) { return r.n !== x.n; }).concat([JSON.parse(JSON.stringify(x))]); } _wkRemove32(a); };
ACTIONS['wk-restore'] = function (a) {
  var w = App.wk; if (!w || !w.removed) return; var k = -1; w.removed.forEach(function (r, i) { if (r.n === a.n) k = i; }); if (k < 0) return;
  var x = w.removed.splice(k, 1)[0]; x.sec = w.cur; w.ex.push(x); w.touched = true; wkSave(); closeSheet(); render(); toast(x.n + ' is back');
};
var _exaddSheet32 = SHEETS.exadd;
SHEETS.exadd = function (a) {
  var h = _exaddSheet32(a), rm = (App.wk && App.wk.removed) || [];
  if (!rm.length || a.swap != null) return h;
  return h.replace('</h3>', '</h3><div class="stack tight"><span class="tiny muted">Put back one you removed</span><div class="chips">' + rm.map(function (r) { return '<button type="button" class="chip" data-act="wk-restore" data-arg="' + jattr({ n: r.n }) + '">↺ ' + esc(r.n) + '</button>'; }).join('') + '</div><span class="tiny muted">or add any exercise:</span></div>');
};
/* the Add exercise button on every section, not only the last */
var _workout32b = VIEWS.workout;
VIEWS.workout = function () {
  var h = _workout32b(); if (!App.wk) return h;
  if (h.indexOf('{&quot;sheet&quot;:&quot;exadd&quot;}') >= 0 || h.indexOf('"sheet":"exadd"') >= 0) return h;
  var btn = '<div class="btns"><button class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'exadd' }) + '">+ Add exercise</button></div>';
  var i = h.indexOf('<div class="secnav">'); return i > 0 ? h.slice(0, i) + btn + h.slice(i) : h + btn;
};

/* ================= Lifts added for you after the fact (e.g. by your coach from a message) =================
   state.liftAdds: [{ id, date, n, s: [{w, r}], note }]. Merged into that day's saved workout once it exists,
   or into the workout you're doing right now, then cleared. Never overwrites an exercise you logged yourself. */
function liftAddsApply() {
  var A = st().liftAdds || []; if (!A.length) return false;
  var done = [], changed = false, logs = st().logs || {};
  A.forEach(function (a) {
    var l = (logs[a.date] || {}).lift;
    if (l && l.ex) {
      if (!l.ex[a.n]) {
        var ss = a.s.map(function (s) { return { w: +s.w || 0, r: +s.r || 0 }; }), best = ss.reduce(function (b, s) { return e1rm(s.w, s.r) > e1rm(b.w, b.r) ? s : b; }, ss[0]);
        Store.edit('logs', a.date, function (S) { var L = S.logs[a.date].lift; L.ex = L.ex || {}; L.ex[a.n] = { w: best.w, reps: best.r, sets: ss.length, s: ss }; L.vol = Math.round((L.vol || 0) + setsVolume(ss)); });
        changed = true;
      }
      done.push(a.id);
    } else if (App.wk && App.wk.date === a.date && !App.wk.edit) {
      if (!App.wk.ex.some(function (x) { return x.n === a.n; })) {
        var near = App.wk.ex.filter(function (x) { return /row/i.test(x.n); })[0];
        App.wk.ex.push({ n: a.n, sec: near ? near.sec : App.wk.cur, kind: 'wt', rx: a.s.length + '×' + a.s[0].r, rest: 75, cue: a.note || '', sets: a.s.map(function (s) { return { w: s.w, r: s.r, done: true }; }) });
        App.wk.touched = true; wkSave(); changed = true;
      }
      done.push(a.id);
    }
  });
  if (done.length) Store.edit('liftAdds', null, function (S) { S.liftAdds = (S.liftAdds || []).filter(function (a) { return done.indexOf(a.id) < 0; }); });
  return changed;
}
var _applyG32c = applyGarmin;
applyGarmin = function () { var r = _applyG32c(); var m = false; try { m = liftAddsApply(); } catch (e) { m = false; } return r || m; };
var _wkEnd32 = ACTIONS['wk-end'];
ACTIONS['wk-end'] = function () { _wkEnd32.apply(this, arguments); try { if (liftAddsApply()) render(); } catch (e) { /* ignore */ } };
ACTIONS['wk-finish'] = ACTIONS['wk-end'];
var _wkView32 = VIEWS.workout;
VIEWS.workout = function () { var h = _wkView32(); try { if (App.wk && (st().liftAdds || []).some(function (a) { return a.date === App.wk.date; })) { if (liftAddsApply()) return _wkView32(); } } catch (e) { /* ignore */ } return h; };
