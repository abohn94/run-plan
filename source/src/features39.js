/* ================= Lifting goals =================
   Set targets like "bench 225" or "squat 300" next to your race goals. Programs are rebuilt around them (each goal lift
   twice a week: a heavy day at 3–5 reps and a volume day at 6–8), progress is tracked as an estimated one-rep max, and the
   coach gives feedback on rate, rep and weight ranges, form, frequency and recovery. Race training comes first: lower-body
   goals progress more slowly through a race build and hold steady in the taper.
   Sources: ACSM progression models; Schumann et al. 2022 (concurrent training doesn't blunt max strength or size; separate
   runs and lifts by 3+ hours); RippedBody progression rates for novice, intermediate and advanced lifters. */
TITLES.lgoal = 'Lifting goal'; TABOF.lgoal = 'more';
var LG_FORM = {
  bench: ['Squeeze your shoulder blades together and down, and keep them pinned for the whole set.', 'Plant your feet and drive through the floor (leg drive), with a slight arch.', 'Lower to your lower chest with forearms vertical, then press back up toward your face.', 'Pause 1 second on the chest on your volume day: it builds strength off the bottom, where most misses happen.'],
  squat: ['Brace before every rep: big breath into your belly, then tighten like you\'re about to be pushed.', 'Push your knees out over your toes on the way up.', 'Hit depth: hip crease just below the top of the knee.', 'Keep the bar over mid-foot. Film from the side every few weeks to check depth and bar path.'],
  deadlift: ['Bar over mid-foot, shins close to the bar.', 'Lats tight, and pull the slack out of the bar before it leaves the floor.', 'Push the floor away: hips and shoulders rise together.', 'Finish with your glutes; don\'t lean back. Reset between reps instead of bouncing.'],
  ohp: ['Squeeze your glutes and keep your ribs down so your lower back doesn\'t arch.', 'Move your head back slightly, then forward under the bar once it passes your forehead.', 'Forearms vertical; finish with the bar over your mid-foot.'],
  hipthrust: ['Shoulder blades on the bench edge, chin tucked, eyes forward.', 'Shins vertical at the top; drive through your heels.', 'Pause 1 second at the top with your glutes squeezed and ribs down.'],
  pullup: ['Start from a full hang with your shoulders engaged (not shrugged).', 'Drive your elbows down toward your back pockets.', 'Lower under control: 2–3 seconds. Use negatives or bands to add volume.'],
  frontsquat: ['Elbows high so the bar stays on your shoulders.', 'Sit straight down between your hips with an upright chest.'],
  rdl: ['Soft knees; push your hips back until you feel your hamstrings.', 'Bar slides down your thighs, back flat.']
};
var RUNSLOT = { squat: ['A', 0], frontsquat: ['A', 0], bench: ['A', 1], deadlift: ['B', 0], rdl: ['B', 0], ohp: ['B', 1], pullup: ['B', 2] };
var LG_ACC = { bench: 'triceps work (close-grip bench, pushdowns), rows for your upper back, and incline presses', squat: 'paused squats, Bulgarian split squats, leg press and core bracing work', deadlift: 'Romanian deadlifts, back extensions and rows', ohp: 'lateral raises, triceps and push presses', hipthrust: 'B-stance thrusts, Romanian deadlifts and abductions', pullup: 'negatives, rows, lat pulldowns and curls', frontsquat: 'paused squats and upper-back rows', rdl: 'leg curls, back extensions and hip thrusts' };
function lgList() { return ((st().profile || {}).lgoals || []).filter(function (g) { return g && g.n; }); }
function lgLabel(g) { var G = E.GOAL_LIFTS[g.k]; return G ? G.label : g.n; }
function lgTargetTxt(g) { return g.k === 'pullup' && !(+g.w) ? g.r + ' pull-ups' : g.w + ' lb' + (+g.r > 1 ? ' × ' + g.r : ''); }
function lgUpper(g) { var G = E.GOAL_LIFTS[g.k]; if (G) return !!G.up; return /press|bench|row|pull|curl|dip|raise|fly|pushdown/i.test(g.n); }
function lgExp() { var sp = (st().profile || {}).sp; if (sp && sp.exp) return sp.exp; var from = E.addD(App.today, -730), wk = {}; Object.keys(st().logs || {}).forEach(function (d) { if (d >= from && (st().logs[d] || {}).lift) wk[E.monday(d)] = 1; }); var n = Object.keys(wk).length; return n < 26 ? 'new' : n < 78 ? 'some' : 'exp'; }
function lgSeasonEnd() { if (focusOf() === 'fitness') return null; return (st().events || []).filter(function (e) { return e.date >= App.today && (e.priority || 'A') === 'A'; }).map(function (e) { return e.date; }).sort().pop() || null; }
function lgRaceAhead() { if (focusOf() === 'fitness') return null; return (st().events || []).filter(function (e) { return e.date >= App.today && (e.priority || 'A') === 'A'; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0] || null; }
function lgStat(g) {
  var reps = g.k === 'pullup' && !(+g.w), h = liftHistory(g.n), cut = E.addD(App.today, -56);
  var val = function (x) { return reps ? x.sets.reduce(function (a, s) { return Math.max(a, +s.r || 0); }, 0) : x.e1; };
  var recent = h.filter(function (x) { return x.date >= cut; }), cur = recent.reduce(function (a, x) { return Math.max(a, val(x)); }, 0);
  if (!reps) { var o = ormOf(g.n); if (o && o.use > cur) cur = o.use; }
  var target = reps ? +g.r : (+g.r > 1 ? e1rm(g.w, g.r) : +g.w);
  var wk = {}; h.forEach(function (x) { var m = E.monday(x.date); wk[m] = Math.max(wk[m] || 0, val(x)); });
  var ws = Object.keys(wk).sort(), last6 = ws.filter(function (m) { return m >= E.addD(App.today, -49); });
  var rate = null; if (last6.length >= 3) { var xs = last6.map(function (m) { return E.diffD(last6[0], m) / 7; }), ys = last6.map(function (m) { return wk[m]; }), mx = xs.reduce(function (a, b) { return a + b; }, 0) / xs.length, my = ys.reduce(function (a, b) { return a + b; }, 0) / ys.length, num = 0, den = 0; xs.forEach(function (x, i) { num += (x - mx) * (ys[i] - my); den += (x - mx) * (x - mx); }); rate = den ? num / den : null; }
  var up = lgUpper(g), ex = lgExp(), base = reps ? ({ new: 0.5, some: 0.25, exp: 0.1 })[ex] : ({ new: up ? 2.5 : 5, some: up ? 1 : 2, exp: up ? 0.4 : 0.75 })[ex];
  var full = base, race = lgRaceAhead(), seasonEnd = lgSeasonEnd(); if (race && !reps) base *= up ? 0.8 : 0.4;
  var bestDate = null, best = 0; h.forEach(function (x) { if (val(x) > best) { best = val(x); bestDate = x.date; } });
  var n21 = h.filter(function (x) { return x.date >= E.addD(App.today, -21); }).length;
  var stalled = h.filter(function (x) { return x.date >= E.addD(App.today, -28); }).length >= 4 && bestDate && E.diffD(bestDate, App.today) >= 21;
  var gap = Math.max(0, target - cur), r = rate != null && rate > 0.1 ? rate : base, eta = null;
  if (cur) {
    /* race season moves lower-body lifts slowly; after your last race they move at full pace */
    var wR = seasonEnd && !reps && race ? Math.max(0, E.diffD(App.today, seasonEnd) / 7) : 0, inSeason = wR * r;
    eta = !wR || gap <= inSeason ? Math.ceil(gap / r) : Math.ceil(wR + (gap - inSeason) / (rate != null && rate > 0.1 ? Math.max(rate, full) : full));
  }
  var rpes = h.slice(-3).map(function (x) { return +(((st().logs || {})[x.date] || {}).lift || {}).rpe || 0; });
  return { reps: reps, cur: Math.round(cur), target: Math.round(target), pct: target ? Math.min(100, Math.round(cur / target * 100)) : 0, rate: rate, base: base, eta: eta, stalled: stalled, n21: n21, wk: wk, ws: ws, h: h, race: race, up: up, exp: ex, hard: rpes.filter(function (x) { return x >= 9; }).length >= 2, unit: reps ? 'reps' : 'lb' };
}
function lgEtaTxt(S) { if (!S.cur) return 'Log it once to get a baseline'; if (S.cur >= S.target) return 'Reached'; if (!S.eta || S.eta > 104) return 'Over 2 years at this rate'; var d = E.addD(App.today, S.eta * 7); return 'About ' + (S.eta <= 10 ? plural(S.eta, 'week') : Math.round(S.eta / 4.3) + ' months') + ' (' + fmtD(d, { month: 'short', year: 'numeric' }) + ')'; }
function lgBar(S) { return '<div class="bar" style="margin:6px 0"><i style="width:' + S.pct + '%"></i></div>'; }
function lgAdvice(g, S) {
  var A = [], prof = st().profile || {}, P = E.programOf(prof), pg = P && (P.goals || []).filter(function (x) { return x.id === g.id; })[0], kg = +prof.weightKg, lbl = lgLabel(g).toLowerCase();
  var DOWN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (!S.cur) A.push(['Get a baseline', 'Next time it\'s on your plan, work up to one set of 3–5 reps that feels like an 8 out of 10 (2 reps left). That sets your starting point and the app estimates your one-rep max from it.']);
  else if (S.cur >= S.target) A.push(['You did it', 'Your estimated max (' + S.cur + ' ' + S.unit + ') has reached your target. Test it on a fresh day if you want it official, then set a new target about 5% higher.']);
  else if (S.cur >= S.target * 0.97 && !S.reps) A.push(['Ready to test it', 'You\'re within ' + (S.target - S.cur) + ' lb. On a fresh day (not before a long run or key workout): warm up, then a single at about 85%, one at 92%, and then try ' + g.w + ' lb. Use a spotter or safety bars.']);
  if (S.cur && S.target > S.cur * 1.3) { var ms = Math.round(S.cur * 1.1 / 5) * 5; A.push(['Set a milestone', 'Your target is ' + Math.round((S.target / S.cur - 1) * 100) + '% above where you are now. Keep it, and aim for ' + ms + ' ' + S.unit + ' first (about ' + Math.max(4, Math.ceil((ms - S.cur) / S.base)) + ' weeks). Hitting milestones keeps the progress visible.']); }
  if (S.stalled) A.push(['Break the plateau', 'No new best in 3+ weeks. Try one change at a time for 3–4 weeks: switch rep ranges (sets of 5 to sets of 8, or the reverse); add a back-off set at 85% for as many clean reps as you can; add 2.5 lb instead of 5; use paused reps' + (g.k === 'deadlift' ? ' or deficit pulls' : '') + '. Or take a deload week, then rebuild from 5–10% lower.']);
  else if (S.cur && S.rate != null && S.rate < S.base * 0.5 && S.cur < S.target) A.push(['Progress is slower than expected', 'You\'re gaining about ' + Math.max(0, S.rate).toFixed(1) + ' ' + S.unit + ' a week; ' + S.base.toFixed(1) + ' is typical at your experience. Check sleep and food first, then make sure the top set really reaches RPE 8.']);
  if (S.hard) A.push(['Too heavy right now', 'Your last sessions with this lift were rated 9–10 out of 10. Drop the working weight 5–10% and leave 1–2 reps in reserve. Grinding every set slows progress and makes form break down.']);
  if (P) {
    if (pg && pg.status === 'blocked') A.push(['Not in your program', 'Your equipment or limits rule out ' + esc(g.n) + '. Change your equipment answer, or pick a goal on a lift you can train.']);
    else if (pg) A.push(['How your program trains it', (pg.status === 'alt' ? 'Your equipment calls for ' + pg.use + ' as a stand-in (progress on it won\'t match the barbell number exactly). ' : '') + 'Twice a week: a heavy day (' + pg.heavy + ', last rep at RPE 8) and a volume day (' + pg.vol + ', crisp reps). Weight goes up when you hit the top of the rep range on every set.' + (pg.days ? ' Days: ' + pg.days.map(function (di) { return DOWN[P.sp.dows[di]]; }).join(' and ') + '.' : '')]);
  } else if (focusOf() !== 'fitness' && RUNSLOT[g.k]) A.push(['How your plan trains it', 'It\'s the main ' + (RUNSLOT[g.k][1] === 0 ? 'leg' : 'upper-body') + ' lift in your Strength ' + RUNSLOT[g.k][0] + ' session each week, on the same days as before. Sets follow your running: heavier in base and build (about ' + (RUNSLOT[g.k][1] === 0 ? '4×6 then 4×4' : '3×8 then 3×5') + '), held steady in peak and taper so your legs are fresh for race day. Your calf and shin work stays in. For twice-a-week training, choose Race + fitness under More → Features and take the strength questionnaire.']);
  else A.push([S.n21 < 4 ? 'Train it twice a week' : 'Get a program built around it', (S.n21 < 4 ? 'You\'ve done it ' + plural(S.n21, 'time') + ' in the last 3 weeks. ' : '') + 'A strength program puts your goal lifts in twice a week with the right rep ranges. <a href="#/sp">Build one</a>' + (focusOf() === 'race' ? ' (choose Race + fitness under More → Features to keep your running plan)' : '') + '.']);
  if (S.race) A.push(['Race training comes first', S.up ? 'Upper-body goals can keep moving through race training: arm and chest work doesn\'t take anything from your legs.' : 'Until ' + esc(S.race.name || 'your race') + ' (' + fmtD(S.race.date, { month: 'short', day: 'numeric' }) + '), this goal moves more slowly by design. ' + (P ? 'Leg sessions get lighter the day before long runs and key workouts, and the last two weeks hold strength rather than build it.' : 'Your running plan already keeps heavy leg days away from long runs and key workouts, and holds strength steady in peak and taper weeks.') + ' Research shows running alongside lifting doesn\'t blunt max strength or muscle growth, but tired legs on key runs cost your race. Expect faster progress after race day.']);
  else if (focusOf() !== 'race') A.push(['No race to protect', 'Your goal lifts get full priority: two sessions a week. If progress slows after a couple of months, a third lighter technique day can help.']);
  var F = LG_FORM[g.k]; if (F) A.push(['Form checklist', '<ul class="plain wkl">' + F.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>']);
  if (LG_ACC[g.k]) A.push(['What helps it', 'Supporting work: ' + LG_ACC[g.k] + '.']);
  A.push(['Recovery', 'Strength is built between sessions: 7–9 hours of sleep and ' + (kg ? 'about ' + Math.round(kg * 1.6) + '–' + Math.round(kg * 2.2) + ' g of protein a day' : '1.6–2.2 g of protein per kg of body weight a day') + '.' + (focusOf() !== 'fitness' ? ' On days with a run and a lift, run first and lift at least 3 hours later if you can.' : '')]);
  return A;
}
/* ---- goals page: lifting goals next to your races ---- */
function lgCard() {
  var L = lgList();
  return '<section class="card stack"><div class="spread"><h3>Lifting goals</h3><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'lgoal' }) + '">+ Add</button></div>' +
    (L.length ? L.map(function (g) { var S = lgStat(g); return '<a class="lgrow" href="#/lgoal/' + encodeURIComponent(g.id) + '" style="text-decoration:none;color:inherit;display:block"><div class="spread"><b class="small">' + esc(lgLabel(g)) + ' ' + esc(lgTargetTxt(g)) + '</b><span class="small muted">' + (S.cur ? S.cur + ' ' + S.unit + ' now' : 'no data yet') + ' ›</span></div>' + lgBar(S) + '<p class="tiny muted">' + esc(lgEtaTxt(S)) + (S.stalled ? ' · stalled' : '') + '</p></a>'; }).join('') :
      '<p class="small muted">Set targets like bench 225 or squat 300. Your strength program is built around them, and the coach tracks your progress and tells you what to adjust.</p>') + '</section>';
}
var _goals39 = VIEWS.goals;
VIEWS.goals = function () { var h = _goals39.apply(this, arguments), c = lgCard(), i = h.indexOf('</div>', h.indexOf('class="pagehead"')); return i > 0 ? h.slice(0, i + 6) + c + h.slice(i + 6) : c + h; };
/* add or edit a goal */
SHEETS.lgoal = function (a) {
  var g = a.id ? lgList().filter(function (x) { return x.id === a.id; })[0] : null, d = App.lgd = App.lgd && App.lgd._for === (a.id || 'new') ? App.lgd : Object.assign({ _for: a.id || 'new', k: 'bench', n: 'Barbell bench press', w: '', r: 1, by: '' }, g || {});
  var others = Object.keys(EXDB).filter(function (n) { return needsWeight(n) && !/stretch|warm/i.test(EXDB[n].pat); }).sort();
  return '<h2>' + (g ? 'Edit lifting goal' : 'Add a lifting goal') + '</h2><div class="chips">' + Object.keys(E.GOAL_LIFTS).map(function (k) { return '<button class="chip" data-act="lg-pick" data-arg="' + jattr({ k: k }) + '" aria-pressed="' + (d.k === k) + '">' + esc(E.GOAL_LIFTS[k].label) + '</button>'; }).join('') + '<button class="chip" data-act="lg-pick" data-arg="' + jattr({ k: 'other' }) + '" aria-pressed="' + (d.k === 'other') + '">Other</button></div>' +
    (d.k === 'other' ? '<label class="f">Exercise<select class="i" id="lg-n">' + others.map(function (n) { return '<option' + (n === d.n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></label>' : '') +
    '<div class="grid2"><label class="f">' + (d.k === 'pullup' ? 'Added weight (lb, 0 = bodyweight)' : 'Target weight (lb)') + '<input class="i" id="lg-w" type="number" inputmode="decimal" value="' + esc(d.w) + '" placeholder="' + (d.k === 'pullup' ? '0' : '225') + '"></label><label class="f">' + (d.k === 'pullup' ? 'Reps' : 'For how many reps') + '<select class="i" id="lg-r">' + [1, 2, 3, 5, 8, 10, 12, 15, 20].map(function (n) { return '<option value="' + n + '"' + (+d.r === n ? ' selected' : '') + '>' + (n === 1 && d.k !== 'pullup' ? '1 (one-rep max)' : n) + '</option>'; }).join('') + '</select></label></div>' +
    '<label class="f">By (optional)<input class="i" type="date" id="lg-by" value="' + esc(d.by || '') + '"></label>' + sheetBtns(g ? 'Save' : 'Add goal', !!g);
};
ACTIONS['lg-pick'] = function (a) { var d = App.lgd; d.k = a.k; if (E.GOAL_LIFTS[a.k]) d.n = E.GOAL_LIFTS[a.k].n; if (a.k === 'pullup' && d.r == 1) d.r = 10; var w = $('#lg-w'); if (w) d.w = w.value; openSheet('lgoal', { id: d._for === 'new' ? null : d._for }); };
var _save39 = ACTIONS['sheet-save'];
ACTIONS['sheet-save'] = function (a) {
  if (!sheetCtx || sheetCtx.kind !== 'lgoal') return _save39(a);
  var d = App.lgd, w = +$('#lg-w').value || 0, r = +$('#lg-r').value || 1, n = d.k === 'other' ? $('#lg-n').value : d.n;
  if (d.k !== 'pullup' && !(w > 0)) { var e = $('#shErr'); if (e) e.textContent = 'Enter a target weight.'; return; }
  var g = { id: d._for !== 'new' ? d._for : 'lg' + Date.now().toString(36), k: d.k, n: n, w: w, r: r, by: $('#lg-by').value || '', at: (d.at || App.today) };
  Store.edit('profile', null, function (S) { var L = (S.profile.lgoals || []).filter(function (x) { return x.id !== g.id; }); L.push(g); S.profile.lgoals = L; });
  App.lgd = null; closeSheet(); recompute(); render(); toast((st().profile.sp || {}).on ? 'Goal saved. Your program now trains it twice a week' : 'Goal saved');
};
var _del39 = ACTIONS['sheet-del'];
ACTIONS['sheet-del'] = function (a) {
  if (!sheetCtx || sheetCtx.kind !== 'lgoal') return _del39(a);
  var id = App.lgd && App.lgd._for; Store.edit('profile', null, function (S) { S.profile.lgoals = (S.profile.lgoals || []).filter(function (x) { return x.id !== id; }); if (!S.profile.lgoals.length) delete S.profile.lgoals; });
  App.lgd = null; closeSheet(); recompute(); go('#/goals'); toast('Goal removed');
};
/* ---- one goal ---- */
VIEWS.lgoal = function () {
  var id = decodeURIComponent(App.args[0] || ''), g = lgList().filter(function (x) { return x.id === id; })[0]; if (!g) return '<section class="card"><p class="small">Goal not found.</p><a class="btn sm" href="#/goals">Back</a></section>';
  var S = lgStat(g), A = lgAdvice(g, S);
  var h = '<div class="pagehead"><h1>' + esc(lgLabel(g)) + ' ' + esc(lgTargetTxt(g)) + '</h1><p>' + (g.by ? 'By ' + fmtD(g.by, { month: 'long', day: 'numeric', year: 'numeric' }) + '. ' : '') + (S.reps ? 'Tracked as your best set of reps.' : 'Tracked as your estimated one-rep max from your logged sets.') + '</p></div>';
  h += '<div class="tiles"><div class="tile"><span>Now</span><b>' + (S.cur || '–') + '</b><em>' + S.unit + (S.reps ? '' : ' est. max') + '</em></div><div class="tile"><span>Target</span><b>' + S.target + '</b><em>' + S.unit + (+g.r > 1 && !S.reps ? ' est. max' : '') + '</em></div><div class="tile"><span>Rate</span><b>' + (S.rate != null ? (S.rate >= 0 ? '+' : '') + S.rate.toFixed(1) : '–') + '</b><em>' + S.unit + ' a week</em></div></div>';
  h += '<section class="card stack">' + lgBar(S) + '<div class="spread small"><span>' + S.pct + '% of the way</span><b>' + esc(lgEtaTxt(S)) + '</b></div>' + (g.by && S.eta && S.cur < S.target ? '<p class="tiny muted">' + (E.addD(App.today, S.eta * 7) <= g.by ? 'On track for your date.' : 'Behind your date at this rate.') + '</p>' : '') +
    (S.ws.length >= 2 ? lineChart(S.ws.slice(-12), [{ name: S.reps ? 'Best reps' : 'Estimated max (lb)', vals: S.ws.slice(-12).map(function (m) { return S.wk[m]; }), color: 'var(--gold)', fmt: function (v) { return Math.round(v); } }]) : '') + '</section>';
  h += A.map(function (x) { return '<section class="card"><h3>' + esc(x[0]) + '</h3><div class="small" style="margin-top:4px">' + (/^<ul/.test(x[1]) ? x[1] : '<p>' + x[1] + '</p>') + '</div></section>'; }).join('');
  h += '<div class="btns"><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'lgoal', id: g.id }) + '">Edit goal</button>' + (EXDB[g.n] ? '<button class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'exinfo', n: g.n }) + '">How to do it</button>' : '') + '</div>';
  return h;
};
/* ---- program page: what it's built around ---- */
var _prog39 = VIEWS.program;
VIEWS.program = function () {
  var h = _prog39(), P = E.programOf(st().profile || {}); if (!P) return h;
  var L = lgList(), c = '<section class="card stack"><h3>Built around your goals</h3>' + (L.length ? '<ul class="plain small wkl">' + L.map(function (g) { var pg = (P.goals || []).filter(function (x) { return x.id === g.id; })[0] || {}; return '<li><a href="#/lgoal/' + encodeURIComponent(g.id) + '">' + esc(lgLabel(g)) + ' ' + esc(lgTargetTxt(g)) + '</a>: ' + (pg.status === 'blocked' ? 'not possible with your equipment or limits' : pg.status === 'alt' ? 'trained as ' + esc(pg.use) + ', twice a week' : 'heavy day ' + esc(pg.heavy || '') + ', volume day ' + esc(pg.vol || '')) + '</li>'; }).join('') + '</ul>' : '<p class="small muted">No lifting goals yet.</p>') + '<button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'lgoal' }) + '">+ Add a lifting goal</button></section>';
  var i = h.indexOf('<section class="card stack"><h3>Your week</h3>'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};
/* ---- setup: ask for lifting goals (any mode with lifting days) ---- */
if (WIZ_STEPS.indexOf('lgoals') < 0) WIZ_STEPS.splice(WIZ_STEPS.indexOf('program') + 1, 0, 'lgoals');
var _wizSkip39 = wizSkip;
wizSkip = function (name, p) { if (name === 'lgoals') return !p.focus || +p.liftDays === 0; return _wizSkip39(name, p); };
var LGQ = [['bench', 'Bench press', '225'], ['squat', 'Squat', '300'], ['deadlift', 'Deadlift', '365'], ['hipthrust', 'Hip thrust', '225'], ['ohp', 'Overhead press', '135'], ['pullup', 'Pull-ups (reps)', '10']];
function lgQuick(cur) {
  var by = {}; (cur || []).forEach(function (g) { by[g.k] = g; });
  return '<div class="grid2">' + LGQ.map(function (q) { var g = by[q[0]]; return '<label class="f">' + q[1] + '<input class="i" type="number" inputmode="decimal" data-lgq="' + q[0] + '" placeholder="e.g. ' + q[2] + '" value="' + (g ? (q[0] === 'pullup' ? g.r : g.w) : '') + '"></label>'; }).join('') + '</div><p class="tiny muted">Targets are one-rep maxes (pull-ups: reps). Leave blank to skip. Add others or edit these any time under Goals.</p>';
}
function lgReadQuick(cur) {
  var out = (cur || []).filter(function (g) { return !LGQ.some(function (q) { return q[0] === g.k; }); });
  LGQ.forEach(function (q) { var el = $('[data-lgq="' + q[0] + '"]'); var v = el ? +el.value : 0; if (!(v > 0)) return; var old = (cur || []).filter(function (g) { return g.k === q[0]; })[0]; out.push(q[0] === 'pullup' ? { id: old ? old.id : 'lg' + q[0], k: 'pullup', n: 'Pull-up', w: 0, r: v, at: old ? old.at : App.today } : { id: old ? old.id : 'lg' + q[0], k: q[0], n: E.GOAL_LIFTS[q[0]].n, w: v, r: 1, at: old ? old.at : App.today }); });
  return out;
}
var _setup39 = VIEWS.setup;
VIEWS.setup = function () {
  var h = _setup39(), z = App.wiz; if (!z || WIZ_STEPS[z.step] !== 'lgoals') return h;
  var bar = (h.match(/^<div class="wizard-steps"[\s\S]*?<\/div>/) || [''])[0];
  return bar + '<div class="q"><h1>Any lifting goals?</h1><p class="lead">Like your race goal, a target gives your lifting direction. Your strength work is built to get you there' + (focusOf(z.profile) !== 'fitness' ? ', without getting in the way of your running' : '') + '.</p></div><section class="card stack">' + lgQuick(z.profile.lgoals) + '</section>' +
    '<div class="wizfoot"><button type="button" class="btn ghost" data-act="wiz-back">Back</button><button class="btn primary" data-act="lg-wiz-next">Continue</button></div>';
};
ACTIONS['lg-wiz-next'] = function () { var z = App.wiz, L = lgReadQuick(z.profile.lgoals); if (L.length) z.profile.lgoals = L; else delete z.profile.lgoals; z.step++; render(); window.scrollTo(0, 0); };
/* questionnaire: goals as question 9 */
var _spForm39 = spForm;
spForm = function (ctx) {
  var h = _spForm39(ctx); if (ctx !== 'page') return h;
  var c = '<section class="card stack"><h3>9. Lifting goals (optional)</h3><p class="small muted">Your program trains each goal lift twice a week: a heavy day and a volume day.</p>' + lgQuick(lgList()) + '</section>';
  var i = h.indexOf('<p class="err" id="spErr">'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};
var _spSave39 = ACTIONS['sp-save'];
ACTIONS['sp-save'] = function () { var L = lgReadQuick(lgList()); Store.edit('profile', null, function (S) { if (L.length) S.profile.lgoals = L; else delete S.profile.lgoals; }); _spSave39(); };
/* ---- coach ---- */
function lgFindings() {
  var out = [], prof = st().profile || {}, prefs = st().prefs || {}, L = lgList(), ws = App.week ? App.week.start : E.monday(App.today);
  var lifts = +prof.liftDays > 0 || (prof.sp && prof.sp.on);
  if (lifts && !L.length && !prefs.lgAsked) out.push({ id: 'lgset', pri: 5, tone: 'act', title: 'Set a lifting goal?', seen: 'You have lifting in your plan but no target yet, like bench 225 or squat 300.', change: 'Add one or two lifting goals next to your race goals.', plan: (prof.sp && prof.sp.on) ? 'Your program rebuilds around them: each goal lift twice a week.' : focusOf() === 'race' ? 'Your goal lifts take the main slot in your usual strength sessions. Sets, days and runs stay exactly the same.' : 'I\'ll track them and tell you what to adjust.', expect: 'A specific target makes it clear when to add weight and when something needs to change.', act: { nav: '#/goals' }, label: 'Set a goal' });
  L.forEach(function (g) {
    var S = lgStat(g), nm = lgLabel(g) + ' ' + lgTargetTxt(g);
    if (S.cur && S.cur >= S.target) out.push({ id: 'lgdone-' + g.id, pri: 3, tone: 'good', title: 'Goal reached: ' + nm, seen: 'Your estimated max is ' + S.cur + ' ' + S.unit + '.', change: 'Set a new target about 5% higher.', plan: 'Your program keeps the same structure with the new target.', expect: 'Steady, smaller jumps from here.', act: { lgBump: g.id }, label: 'New target' });
    else if (S.stalled) out.push({ id: 'lgstall-' + g.id + '-' + ws, pri: 3, tone: 'act', title: lgLabel(g) + ' has stalled', seen: 'No new best in 3+ weeks (' + S.cur + ' ' + S.unit + ' estimated).', change: 'Try one change for 3–4 weeks: a different rep range, a back-off set, smaller jumps, or a deload.', plan: 'See the full list on the goal page.', expect: 'Most plateaus break within a month of one targeted change.', act: { nav: '#/lgoal/' + encodeURIComponent(g.id) }, label: 'See what to change' });
    else if (S.cur && S.cur >= S.target * 0.97 && !S.reps) out.push({ id: 'lgclose-' + g.id, pri: 4, tone: 'good', title: 'Close to ' + nm, seen: 'You\'re within ' + (S.target - S.cur) + ' lb.', change: 'Plan a test day on a fresh day.', plan: 'Not before a long run or key workout.', expect: 'A good chance of hitting it.', act: { nav: '#/lgoal/' + encodeURIComponent(g.id) }, label: 'How to test it' });
  });
  return out;
}
var _pnF39 = pnFindings;
pnFindings = function () { var out = _pnF39(); try { out = out.concat(lgFindings()); } catch (e) { console.warn(e); } return out; };
var _cfNo39 = ACTIONS['cf-no'];
ACTIONS['cf-no'] = function (a) { if (/^lgset/.test(a.id)) Store.edit('prefs', 'lgAsked', function (S) { S.prefs = S.prefs || {}; S.prefs.lgAsked = true; }); _cfNo39(a); };
var _apply39 = applyCoachAct;
applyCoachAct = function (f) {
  var a = f.act || {};
  if (a.lgBump) { Store.edit('profile', null, function (S) { S.profile.lgoals = (S.profile.lgoals || []).map(function (g) { if (g.id !== a.lgBump) return g; var n = Object.assign({}, g); if (g.k === 'pullup' && !(+g.w)) n.r = +g.r + 2; else n.w = Math.round(g.w * 1.05 / 5) * 5; n.at = App.today; return n; }); }); recompute(); }
  return _apply39(f);
};
App.p39 = { lgStat: lgStat, lgAdvice: lgAdvice, lgFindings: lgFindings };
/* ---- runners: suggest lifting days that don't keep colliding with key runs ---- */
function spDayClash() {
  var prof = st().profile || {}, P = E.programOf(prof); if (!P || focusOf() === 'fitness' || !App.plan) return null;
  var to = E.addD(App.today, 56), days = []; App.plan.weeks.forEach(function (w) { w.days.forEach(function (d) { if (d.date >= App.today && d.date <= to) days.push(d); }); });
  var key = function (d) { return d && d.parts.some(function (q) { return q.type === 'long' || q.type === 'speed' || q.type === 'race'; }); };
  var stat = {}; days.forEach(function (d, i) { var wd = E.pd(d.date).getDay(), s = stat[wd] || (stat[wd] = { n: 0, before: 0, same: 0, light: 0 }); s.n++; if (key(days[i + 1])) s.before++; if (key(d)) s.same++; if (d.parts.some(function (p) { return p.legsLight; })) s.light++; });
  var bad = P.sp.dows.filter(function (dw) { var s = stat[dw]; return s && s.n >= 3 && s.light / s.n >= 0.5; }); if (!bad.length) return null;
  var free = [0, 1, 2, 3, 4, 5, 6].filter(function (dw) { return P.sp.dows.indexOf(dw) < 0 && stat[dw]; }).map(function (dw) { var s = stat[dw]; return { dw: dw, score: s.before / s.n * 2 + s.same / s.n }; }).sort(function (a, b) { return a.score - b.score; });
  var best = free.filter(function (x) { return x.score < 0.5; });
  return { bad: bad, best: best.slice(0, 2).map(function (x) { return x.dw; }) };
}
var _prog39b = VIEWS.program;
VIEWS.program = function () {
  var h = _prog39b(), c = spDayClash(); if (!c) return h;
  var DN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var card = '<section class="card stack"><div class="eyebrow">Fitting around your running</div><p class="small">' + c.bad.map(function (dw) { return DN[dw]; }).join(' and ') + (c.bad.length > 1 ? '\'s sessions are' : '\'s session is') + ' usually lighter for your legs because a key run follows the next day.' + (c.best.length ? ' ' + c.best.map(function (dw) { return DN[dw]; }).join(' or ') + ' would give you full sessions more often.' : '') + '</p>' +
    (c.best.length ? '<div class="btns">' + c.best.map(function (dw) { return '<button class="btn sm" data-act="sp-move" data-arg="' + jattr({ from: c.bad[0], to: dw }) + '">Move ' + DN[c.bad[0]].slice(0, 3) + ' to ' + DN[dw].slice(0, 3) + '</button>'; }).join('') + '</div>' : '') + '</section>';
  var i = h.indexOf('<section class="card stack"><h3>Your week</h3>'); return i > 0 ? h.slice(0, i) + card + h.slice(i) : h + card;
};
ACTIONS['sp-move'] = function (a) {
  Store.edit('profile', null, function (S) { var sp = Object.assign({}, S.profile.sp), d = sp.dows.slice(); d[d.indexOf(a.from)] = a.to; d.sort(function (x, y) { return ((x + 6) % 7) - ((y + 6) % 7); }); sp.dows = d; S.profile.sp = sp; });
  recompute(); render(); toast('Lifting day moved');
};
/* everything that reads the coach list through App.p32 gets the latest version (fitness filters, program and goal items) */
App.p32.coachFindings = function () { return coachFindings.apply(null, arguments); };
App.p32.pnFindings = function () { return pnFindings.apply(null, arguments); };
/* ================= How you lift: with a spotter, with safety bars, or alone =================
   Near-max sets (1–5 reps) on bench, squat and overhead press need a spotter or safety bars. Alone, the same goal is
   reached with 6–12 rep sets stopped 2 reps short, plus dumbbell and machine versions you can push hard safely.
   Estimated max comes from those sets, so a heavy single is never required. */
var LS_OPTS = [['partner', 'With a partner who spots me', 'Heavy sets of 3–5 and test singles near your max'], ['safeties', 'Alone, in a rack with safety bars', 'Heavy squats and bench are fine with the safeties set'], ['solo', 'Alone, no spotter or safety bars', 'No near-max sets: you build with 6–12 reps and track your estimated max']];
function lsGet() { return (st().profile || {}).liftSetup || null; }
function liftDows() { var p = st().profile || {}; if (p.sp && p.sp.on && p.sp.dows) return p.sp.dows; var out = {}; (App.plan ? App.plan.weeks.slice(0, 2) : []).forEach(function (w) { w.days.forEach(function (d) { if (d.parts.some(function (q) { return q.type === 'strength'; })) out[E.pd(d.date).getDay()] = 1; }); }); return Object.keys(out).map(Number).sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); }); }
function lsQuestion(ctx, cur, dows) {
  cur = cur || {}; var DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return '<div class="stack"><b class="small">How do your lift days usually look?</b><p class="tiny muted">Heavy sets of 1–5 reps on bench, squat and overhead press need someone to spot you or safety bars. If you lift alone, you still get there, just a different way.</p>' +
    LS_OPTS.map(function (o) { return '<button type="button" class="opt" data-act="ls-set" data-arg="' + jattr({ ctx: ctx, spot: o[0] }) + '" aria-pressed="' + (cur.spot === o[0]) + '"><span class="k">' + o[1] + '</span><span class="s">' + o[2] + '</span></button>'; }).join('') +
    (cur.spot === 'partner' && dows && dows.length > 1 ? '<label class="f">Days you usually have a partner (leave all off if every day)<div class="chips">' + dows.map(function (d) { return '<button type="button" class="chip" data-act="ls-day" data-arg="' + jattr({ ctx: ctx, d: d }) + '" aria-pressed="' + ((cur.pdows || []).indexOf(d) >= 0) + '">' + DN[d] + '</button>'; }).join('') + '</div></label>' +
      '<label class="check"><input type="checkbox" data-lsrack="' + ctx + '"' + (cur.rack ? ' checked' : '') + '> My rack has safety bars on the other days</label>' : '') + '</div>';
}
function lsTarget(ctx) { if (ctx === 'wiz') { var p = App.wiz.profile; return p.liftSetup || (p.liftSetup = {}); } return Object.assign({}, lsGet() || {}); }
function lsCommit(ctx, v) { if (ctx === 'wiz') { App.wiz.profile.liftSetup = v; keepScroll(render); return; } Store.edit('profile', null, function (S) { S.profile.liftSetup = v; }); recompute(); keepScroll(render); toast('Saved: your program adjusts to it'); }
ACTIONS['ls-set'] = function (a) { var v = lsTarget(a.ctx); v.spot = a.spot; if (a.spot !== 'partner') { delete v.pdows; delete v.rack; } lsCommit(a.ctx, v); };
ACTIONS['ls-day'] = function (a) { var v = lsTarget(a.ctx), d = (v.pdows || []).slice(), i = d.indexOf(a.d); if (i >= 0) d.splice(i, 1); else d.push(a.d); v.pdows = d; lsCommit(a.ctx, v); };
document.addEventListener('change', function (e) { var c = e.target && e.target.dataset && e.target.dataset.lsrack; if (!c) return; var v = lsTarget(c); v.rack = e.target.checked; lsCommit(c, v); });
/* where it's asked: setup (with the goals), the questionnaire, the goals page and each goal page */
var _setup39b = VIEWS.setup;
VIEWS.setup = function () {
  var h = _setup39b(), z = App.wiz; if (!z || WIZ_STEPS[z.step] !== 'lgoals') return h;
  var dows = z.profile.sp && z.profile.sp.dows ? z.profile.sp.dows : null;
  return h.replace('<div class="wizfoot">', '<section class="card stack">' + lsQuestion('wiz', z.profile.liftSetup, dows) + '</section><div class="wizfoot">');
};
var _spForm39b = spForm;
spForm = function (ctx) { var h = _spForm39b(ctx); if (ctx !== 'page') return h; var c = '<section class="card stack">' + lsQuestion('page', lsGet(), spDraft('page').dows) + '</section>'; var i = h.indexOf('<p class="err" id="spErr">'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c; };
var _goals39b = VIEWS.goals;
VIEWS.goals = function () { var h = _goals39b.apply(this, arguments); if (!lgList().length) return h; var c = '<section class="card stack">' + lsQuestion('page', lsGet(), liftDows()) + '</section>', i = h.indexOf('</section>', h.indexOf('<h3>Lifting goals</h3>')); return i > 0 ? h.slice(0, i + 10) + c + h.slice(i + 10) : h; };
/* the goal page explains the route */
function lsRoute(g, S) {
  var ls = lsGet() || {}, risky = { bench: 1, squat: 1, frontsquat: 1, ohp: 1 }[g.k], P = E.programOf(st().profile || {}), pg = P && (P.goals || []).filter(function (x) { return x.id === g.id; })[0];
  if (S.reps) return null;
  var eq = function (r) { return Math.round(S.target / (1 + r / 30) / 5) * 5; };
  var equiv = 'You\'ve reached ' + S.target + ' lb when you can do about <b>' + eq(3) + ' × 3</b>, <b>' + eq(5) + ' × 5</b> or <b>' + eq(8) + ' × 8</b> with good form.';
  if (!risky) return ['How you\'ll get there', 'This lift is safe to train heavy alone: if a rep fails you just set the bar down. Heavy day 3–5 reps at RPE 8, volume day 6–8. ' + equiv];
  if (!ls.spot) return ['How do you usually lift?', 'Tell me on the Goals page whether you lift with a spotter, with safety bars, or alone. Until then, your plan keeps this lift at 6+ reps with 2 left in the tank, which is safe alone. ' + equiv];
  if (ls.spot === 'partner' && !(ls.pdows && ls.pdows.length)) return ['How you\'ll get there: heavy, with a spotter', 'Heavy day: sets of 3–5 at RPE 8 with your partner spotting. Every 6–8 weeks, or when you\'re close, test a heavy single with your spotter. ' + equiv];
  if (ls.spot === 'safeties' && g.k !== 'ohp') return ['How you\'ll get there: heavy, with safety bars', 'Set the safety bars just below the bottom of the lift (for bench, just below your chest) and you can train sets of 3–5 at RPE 8. ' + equiv];
  if (ls.spot === 'partner' && !pg) return ['How you\'ll get there', 'On days you lift with your partner, go heavy: sets of 3–5 at RPE 8 with them spotting, and test singles when you\'re close. On days you lift alone, keep this lift at 6+ reps with 2 left in the tank. ' + equiv];
  var some = ls.spot === 'partner' ? 'Your heavy day is on a partner day' + (pg && pg.heavyDi != null && P ? ' (' + ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][P.sp.dows[pg.heavyDi]] + ')' : '') + '; on your solo days, use the approach below. ' : '';
  return ['How you\'ll get there without a spotter', some + 'You never need to attempt a near-max lift alone. ' + equiv + '<ul class="plain wkl" style="margin-top:6px"><li><b>Reps, then weight.</b> Work in 6–12 rep sets and stop with 2 good reps left. Add a rep each session; when every set hits the top of the range, add 5 lb (2.5 lb plates help once jumps get hard).</li><li><b>More sets.</b> When progress slows, add a set before adding weight.</li><li><b>Slower reps.</b> Lower for 3 seconds, or pause 1 second at the bottom. It makes the same weight harder, which builds strength without more load.</li><li><b>Go hard where it\'s safe.</b> ' + (g.k === 'squat' || g.k === 'frontsquat' ? 'Leg press and dumbbell split squats can go close to failure: if a rep fails, nothing lands on you.' : 'Dumbbell presses can go close to failure: you can drop the dumbbells safely.') + (pg && pg.helper ? ' Your program adds ' + pg.helper + ' for this.' : '') + '</li><li><b>Test with reps, not a single.</b> When you\'re close, do one hard set of 5 with 1–2 reps left. The app estimates your max from it.</li></ul>'];
}
var _adv39 = lgAdvice;
lgAdvice = function (g, S) {
  var A = _adv39(g, S), r = lsRoute(g, S), ls = lsGet() || {};
  A = A.map(function (x) { if (x[0] === 'Ready to test it' && { bench: 1, squat: 1, frontsquat: 1, ohp: 1 }[g.k] && !(ls.spot === 'partner' || (ls.spot === 'safeties' && g.k !== 'ohp'))) return ['Ready to test it', 'You\'re within ' + (S.target - S.cur) + ' lb. Without a spotter, test with reps: on a fresh day, warm up and do one set of 5 at ' + Math.round(S.target / (1 + 5 / 30) / 5) * 5 + ' lb, stopping if the bar slows a lot. Five clean reps there means you\'ve reached ' + g.w + ' lb.']; return x; });
  if (r) { var i = A.findIndex(function (x) { return /^How your (program|plan) trains it/.test(x[0]); }); A.splice(i >= 0 ? i + 1 : 0, 0, r); }
  return A;
};
var _lgF39b = lgFindings;
lgFindings = function () {
  var out = _lgF39b(); if (lgList().some(function (g) { return { bench: 1, squat: 1, frontsquat: 1, ohp: 1 }[g.k]; }) && !lsGet() && !(st().prefs || {}).lsAsked) out.push({ id: 'lgsetup', pri: 4, tone: 'act', title: 'Do you lift with a spotter?', seen: 'You have a goal on a lift where heavy sets need a spotter or safety bars.', change: 'Tell me how your lift days usually look.', plan: 'With a spotter you train heavy sets of 3–5. Alone, you build with 6–12 reps and dumbbell or machine work, and still reach the same goal.', expect: 'A plan that\'s safe for how you actually lift.', act: { nav: '#/goals' }, label: 'Answer' });
  return out;
};
var _cfNo39b = ACTIONS['cf-no'];
ACTIONS['cf-no'] = function (a) { if (/^lgsetup/.test(a.id)) Store.edit('prefs', 'lsAsked', function (S) { S.prefs = S.prefs || {}; S.prefs.lsAsked = true; }); _cfNo39b(a); };
