/* ================= features10: running form tips, race strategy, training-run strategy; offered by experience ================= */
TITLES.guides = 'Running guides';

var FORM_TIPS = [
  { t: 'Run tall', b: 'Stand tall with a slight forward lean from the ankles, not the waist. Imagine a string pulling the top of your head up. Slouching shortens your stride and tires your back.' },
  { t: 'Land under your body', b: 'Your foot should land close to under your hips, not out in front. Overstriding acts like a brake and sends more load into the shins and knees. Heel, midfoot or forefoot all work; where you land matters more than which part lands first.' },
  { t: 'Quicker, lighter steps', b: 'A slightly higher cadence (about 5% more steps per minute than you take now) shortens the stride and reduces impact on shins and knees. Change it gradually, a few steps per minute at a time, using your watch\'s cadence field or a metronome.' },
  { t: 'Relaxed arms', b: 'Elbows bent near 90°, hands loose as if holding a potato chip without breaking it. Swing forward and back from the shoulder, not across your chest. Drop your shoulders whenever you notice them creeping up.' },
  { t: 'Soft, quiet feet', b: 'If you can hear yourself slapping the ground, you are probably overstriding or landing stiff-legged. Aim for quiet, springy contact. This is one of the easiest form checks for shin splints.' },
  { t: 'Breathe from the belly', b: 'On easy runs you should be able to talk in full sentences. Try breathing low into the belly; many runners settle into a 3-steps-in, 2-steps-out rhythm, but whatever feels relaxed is fine.' },
  { t: 'Eyes up', b: 'Look 10–20 m ahead, not at your feet. Your head is heavy; letting it drop pulls your posture forward and down.' },
  { t: 'Hills: shorten and lean', b: 'Uphill, shorten your stride, keep the effort (not the pace) steady and drive your arms a little more. Downhill, lean slightly forward, quick light steps, and let gravity do the work rather than braking with your heels.' },
  { t: 'Strides teach good form', b: '6 × 20 seconds of fast, relaxed running with full recovery, once or twice a week after an easy run. Strides reinforce a quick, light, upright stride without fatigue.' },
  { t: 'Drills, 5 minutes', b: 'Before workouts: A-skips, high knees, butt kicks and leg swings, 2 × 20 m each. They wake up the hips and feet and rehearse good mechanics.' },
  { t: 'Change one thing at a time', b: 'Form changes load muscles differently. Work on one cue for a few weeks, mostly on easy runs, before adding another. Forcing a big change all at once is a common cause of new aches.' },
  { t: 'Treadmill form', b: 'Set a 1% incline, stay in the middle of the belt and don\'t hold the rails. Look ahead, not down at the console. The same cues apply: tall, quick, quiet.' }
];

var RACE_STRAT = {
  '5k': { name: '5K', head: 'Controlled start, steady middle, hard finish.', pts: [
    'Warm up 10–15 minutes easy plus 4 strides. A 5K is fast from the gun, so you need to be warm.',
    'First kilometre: no faster than goal pace. Adrenaline makes 10–15 s/mi too fast feel easy, and you pay for it in the third kilometre.',
    'Kilometres 2–4 are where the race is decided: hold pace as it starts to hurt. Focus on the runner ahead, not your watch.',
    'Last 800 m: start winding it up. Last 200 m: everything you have left.',
    'It should feel uncomfortable from about halfway. That is normal at 5K effort.'] },
  '10k': { name: '10K', head: 'Even pace, patient first half.', pts: [
    'Warm up 10–15 minutes easy plus a few strides.',
    'Mile 1: settle 3–5 s/mi slower than goal pace. You will gain it back.',
    'Miles 2–4: lock in goal pace. Effort rises while pace stays the same; that is the plan working.',
    'From mile 5: push if you have it. A slightly faster second half is the ideal 10K.',
    'Check pace by effort on hills: keep effort steady up, let pace come back down.'] },
  half: { name: 'Half marathon', head: 'Hold back for 10K, race the last 5K.', pts: [
    'Warm up lightly: 5–10 minutes easy jogging and a few strides. Save the rest.',
    'Miles 1–3: 5–10 s/mi slower than goal pace. The crowd will pull you faster; let them go.',
    'Miles 4–10: goal pace, relaxed and rhythmic. Run the tangents (shortest line through corners).',
    'Fuel: a gel (about 20–25 g carbs) around 40–45 minutes and another around 75 minutes if you will be out longer than 1:30. Water at most stations if warm.',
    'Miles 10–13.1: if you feel good, squeeze the pace down. If it is hard, hold form and count down the miles.',
    'Practice your race breakfast and gels on long runs first. Nothing new on race day.'] },
  full: { name: 'Marathon', head: 'Even or slightly negative split. The race starts at mile 20.', pts: [
    'Taper and carb-load the final 2–3 days (about 7–10 g carbs per kg of body weight per day), then a familiar breakfast 3 hours before.',
    'Miles 1–6: 5–10 s/mi slower than goal pace. Banking time early is the most common marathon mistake.',
    'Miles 7–20: goal pace by effort and pace together. Stay relaxed, run tangents, tuck in behind others in wind.',
    'Fuel from early: 30–60 g carbs per hour (60–90 g if you have trained your gut), starting at about 30–40 minutes. Drink to thirst; add sodium in heat.',
    'Heat and humidity slow everyone: start a little slower on a warm, muggy day. The app\'s race pacing adjusts your splits for the forecast.',
    'Miles 20–26.2: break it into small pieces (the next mile marker, the next aid station). Keep cadence quick and arms driving when legs tire.',
    'Expect a rough patch. It usually passes in a mile or two if you keep fueling.'] },
  trail: { name: 'Hilly or trail race', head: 'Race by effort, not pace.', pts: [
    'Ignore pace on climbs: hold the effort you could keep for the whole race. Hike steep climbs if it is faster for the same effort.',
    'Descents: quick light steps, eyes ahead, arms out for balance. This is where time is gained cheaply.',
    'Carry fuel and water: aid stations are farther apart.'] }
};

var RUN_STRAT = {
  easy: { name: 'Easy run', effort: '2–3 of 10 (Garmin scale)', why: 'Builds your aerobic base, capillaries and durable tendons, with little recovery cost. Most of your running should be here.', pts: ['Conversational: full sentences, breathing calm.', 'Slower than you think. If heart rate drifts high, slow down or walk briefly.', 'Most common mistake: running easy days too fast, which leaves hard days flat.'] },
  recovery: { name: 'Recovery run', effort: '1–2 of 10', why: 'Blood flow and loosening up after hard days.', pts: ['Very slow and short. Walking breaks are fine.', 'Skip it and rest if you are sore or tired.'] },
  long: { name: 'Long run', effort: '2–3 of 10, a bit more in the final miles of structured long runs', why: 'Endurance, fat burning and the mental practice of time on your feet.', pts: ['Start slower than your easy pace for the first 2–3 miles.', 'Fuel on anything over 75 minutes: practice your race gels and drinks here.', 'Plan a route with water or loop past your car or home.', 'For finishes at marathon or goal pace: hold back the early miles so the fast part is controlled.'] },
  tempo: { name: 'Tempo / threshold', effort: '5–6 of 10, "comfortably hard"', why: 'Raises the pace you can hold for about an hour, which is the engine of 10K-to-marathon racing.', pts: ['You can speak a few words, not sentences.', 'Even pace from the first minute: no surging.', 'Finish feeling you could have done a little more. If you are straining, slow down 5–10 s/mi.', 'On hills or in heat, run by effort and accept slower pace.'] },
  cruise: { name: 'Cruise intervals', effort: '5–6 of 10', why: 'Threshold work broken up with short jogs so you can do more of it at the right effort.', pts: ['Same pace as a tempo run, not faster because the reps are shorter.', 'Keep recoveries short and jogging, not standing.'] },
  intervals: { name: 'Intervals (VO2max)', effort: '7–8 of 10', why: 'Raises your aerobic ceiling and makes race pace feel easier.', pts: ['About 5K race effort. Hard, but every rep the same pace.', 'The first rep should feel almost too easy; the last should be hard but in control.', 'Jog the recoveries. If you cannot hit pace by the last rep, stop there.'] },
  reps: { name: 'Repetitions', effort: '7–8 of 10, fast and relaxed', why: 'Speed and running economy without much fatigue.', pts: ['About mile race pace, with full recovery between.', 'Think smooth and relaxed, not all-out. Good form is the point.'] },
  hills: { name: 'Hill repeats', effort: '7 of 10 up, easy jog down', why: 'Strength and power with less impact than flat speed work. Kind to shins on gentle grades.', pts: ['Choose a 4–6% grade. Drive the arms and knees, stay tall, short quick steps.', 'Jog or walk down slowly; that is the recovery.', 'Stop before form breaks down.'] },
  fartlek: { name: 'Fartlek', effort: 'Alternating 5–6 and 2–3 of 10', why: 'Playful speed changes that build fitness without the pressure of exact paces.', pts: ['Run the fast parts by feel, the slow parts genuinely easy.', 'Great on trails or roads; no track needed.'] },
  progression: { name: 'Progression run', effort: 'Starts at 2–3, ends at 5–6 of 10', why: 'Pacing discipline and finishing strong on tired legs.', pts: ['Start properly easy so there is room to build.', 'Speed up in small steps; the final part should be steady, not a sprint.'] },
  goal: { name: 'Race pace', effort: 'Your goal race effort', why: 'Rehearses the exact pace so it feels familiar on race day.', pts: ['Hit the pace, not faster. Being able to hold it controlled is the skill.', 'Practise race fueling and kit on these days.'] },
  strides: { name: 'Easy + strides', effort: 'Easy, with 20-second relaxed fast bursts', why: 'Quick legs and good form without fatigue.', pts: ['After the easy part: 6 × 20 s fast but relaxed, walk or jog 40 s between.', 'Accelerate smoothly; never sprint all-out.'] },
  steady: { name: 'Steady run', effort: '4 of 10', why: 'Comfortably brisk aerobic running that builds the engine at low cost.', pts: ['Faster than easy, clearly easier than tempo. Short sentences possible.'] },
  subt: { name: 'Sub-threshold', effort: '5 of 10', why: 'A lot of quality with little fatigue: just under threshold.', pts: ['Controlled. Finish feeling you could do two more reps.'] }
};
function stratKey(p) {
  if (!p) return null;
  if (p.type === 'long') return 'long'; if (p.type === 'recovery') return 'recovery';
  if (p.type === 'easy') return /strides/i.test(p.title) ? 'strides' : 'easy';
  var k = p.key || '';
  if (/tempo/.test(k)) return 'tempo'; if (/cruise/.test(k)) return 'cruise'; if (/intervals/.test(k)) return 'intervals'; if (/reps/.test(k)) return 'reps';
  if (/hills/.test(k)) return 'hills'; if (/fartlek/.test(k)) return 'fartlek'; if (/progression/.test(k)) return 'progression'; if (/goal|sharpener/.test(k)) return 'goal';
  if (/strides/.test(k)) return 'strides'; if (/steady/.test(k)) return 'steady'; if (/subt/.test(k)) return 'subt';
  return p.type === 'speed' ? 'tempo' : null;
}
function zoneHint(k) {
  var w = App.week, zz = w && w.zonesAdj; if (!zz) return '';
  var z = { easy: 'E', recovery: 'REC', long: 'E', tempo: 'T', cruise: 'T', intervals: 'I', reps: 'R', steady: 'S', subt: 'ST', goal: 'G' }[k];
  var r = z && zz[z]; return r ? ' Your pace now: ' + pace(r[0]) + '–' + pace(r[1]) + '/mi.' : '';
}
function stratBlock(k) {
  var s = RUN_STRAT[k]; if (!s) return '';
  return '<div class="strat"><div class="spread"><b>' + esc(s.name) + '</b><span class="tiny muted">effort ' + esc(s.effort) + '</span></div><p class="small" style="margin-top:4px">' + esc(s.why) + esc(zoneHint(k)) + '</p><ul class="tips">' + s.pts.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
}

VIEWS.guides = function () {
  var tab = App.args[0] || 'form', tabs = [['form', 'Form'], ['races', 'Race strategy'], ['runs', 'Training runs']];
  var html = '<div class="pagehead"><h1>Running guides</h1><p>Form tips, and how to run each kind of race and workout.</p></div><div class="segs gtabs">' + tabs.map(function (t) { return '<a href="#/guides/' + t[0] + '" class="seg' + (tab === t[0] ? ' on' : '') + '" aria-current="' + (tab === t[0]) + '">' + t[1] + '</a>'; }).join('') + '</div>';
  if (tab === 'form') html += '<div class="stack" style="margin-top:12px">' + FORM_TIPS.map(function (x, i) { return '<section class="card"><div class="eyebrow">Tip ' + (i + 1) + '</div><h3 style="margin-top:2px">' + esc(x.t) + '</h3><p class="small" style="margin-top:4px">' + esc(x.b) + '</p></section>'; }).join('') + '<p class="tiny muted">Pain that changes how you run, or sharp pain on the shin bone, is a reason to stop and get checked rather than adjust form.</p></div>';
  if (tab === 'races') {
    var next = (st().events || []).filter(function (e) { return e.date >= App.today; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
    if (next) { var dk = E.distOf(next).key, g = E.parseClock(next.goal), gp = g > 0 ? g / E.distOf(next).mi : null; html += '<section class="card glow" style="margin-top:12px"><div class="eyebrow">Your next race</div><h3 style="margin-top:2px">' + esc(next.name || E.distOf(next).label) + '</h3>' + (gp ? (function () { var o = { '5k': [3, 0], '10k': [5, 3], half: [10, 5], full: [10, 5] }[dk] || [8, 5]; return '<p class="small" style="margin-top:4px">Goal ' + E.clock(g) + ' = ' + pace(gp) + '/mi. Open at ' + (o[1] ? pace(gp + o[0]) + '–' + pace(gp + o[1]) : 'no faster than ' + pace(gp)) + '/mi, then settle to ' + pace(gp) + '.</p>'; })() : '') + (next.id ? '<div class="btns" style="margin-top:8px"><a class="btn sm" href="#/racepace/' + next.id + '">Mile-by-mile pacing for the course</a></div>' : '') + '</section>'; }
    html += '<div class="stack" style="margin-top:12px">' + Object.keys(RACE_STRAT).map(function (k) { var r = RACE_STRAT[k]; return '<details class="card gdet"' + (next && E.distOf(next).key === k ? ' open' : '') + '><summary><b>' + esc(r.name) + '</b><span class="small muted">' + esc(r.head) + '</span></summary><ul class="tips">' + r.pts.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>'; }).join('') + '</div>';
  }
  if (tab === 'runs') html += '<p class="small muted" style="margin-top:12px">Effort uses Garmin\'s 1–10 scale. Paces shown are your current ones.</p><div class="stack">' + Object.keys(RUN_STRAT).map(function (k) { return '<section class="card">' + stratBlock(k) + '</section>'; }).join('') + '</div>';
  return html;
};

/* session pages: how to run this workout */
var _day10 = VIEWS.day;
VIEWS.day = function () {
  var h = _day10(), d = dayOf(App.args[0] || App.today); if (!d) return h;
  var seen = {}, blocks = d.parts.map(function (p) { var k = stratKey(p); if (!k || seen[k] || p.type === 'race') return ''; seen[k] = 1; return stratBlock(k); }).join('');
  if (!blocks) return h;
  var c = '<details class="card gdet"><summary><b>How to run it</b><span class="small muted">effort, feel and common mistakes</span></summary>' + blocks + '<a class="tiny" href="#/guides/runs">All workout guides ›</a></details>';
  var i = h.indexOf('<section class="card"><h3>Day actions'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};

/* Today: offer tips by experience. New: form tips (and strategy). Regular: strategy. Experienced: say where they are. */
function tipOffer() {
  var pr = st().prefs || {}, lvl = (st().profile || {}).level || 'some', seen = st().seen || {};
  if (pr.tips || seen['tips-offer']) return '';
  var b = function (lbl, arg, cls) { return '<button class="btn sm ' + (cls || '') + '" data-act="tips-set" data-arg="' + jattr(arg) + '">' + lbl + '</button>'; };
  if (lvl === 'exp' || lvl === 'elite') return '<section class="card tipc"><div class="eyebrow">Good to know</div><p class="small" style="margin-top:4px">Running form tips and strategy for every race distance and workout type are in <b>More → Running guides</b>, and each session page has a "How to run it" section.</p><div class="btns" style="margin-top:8px">' + b('Got it', { off: 1 }, 'ghost') + '<a class="btn sm" href="#/guides">Open guides</a></div></section>';
  if (lvl === 'new') return '<section class="card tipc"><div class="eyebrow">New to running?</div><h3 style="margin-top:2px">Want a running-form tip each day?</h3><p class="small muted" style="margin-top:4px">Short, practical cues to run more easily and protect your shins, plus how to run each workout and race.</p><div class="btns" style="margin-top:8px">' + b('Yes, form and strategy tips', { form: 1, strat: 1 }, 'primary') + b('Just strategy', { strat: 1 }) + b('No thanks', { off: 1 }, 'ghost') + '</div></section>';
  return '<section class="card tipc"><div class="eyebrow">Tips</div><h3 style="margin-top:2px">Want a tip for each workout?</h3><p class="small muted" style="margin-top:4px">How today\'s run should feel and the common mistakes, plus race-day strategy as your race gets close.</p><div class="btns" style="margin-top:8px">' + b('Yes please', { strat: 1 }, 'primary') + b('Add form tips too', { form: 1, strat: 1 }) + b('No thanks', { off: 1 }, 'ghost') + '</div></section>';
}
ACTIONS['tips-set'] = function (a) {
  Store.editMany([['prefs', 'tips'], ['seen', 'tips-offer']], function (S) { S.prefs = S.prefs || {}; S.seen = S.seen || {}; S.seen['tips-offer'] = 1; S.prefs.tips = a.off ? { off: 1 } : { form: !!a.form, strat: !!a.strat }; });
  toast(a.off ? 'Guides stay in More → Running guides' : 'Tips on. Change this in More → Running guides');
};
function tipCard() {
  var t = (st().prefs || {}).tips; if (!t || t.off) return '';
  var out = '', d = dayOf(App.today), n = Math.floor(E.pd(App.today).getTime() / 864e5);
  if (t.strat) {
    var nr = (st().events || []).filter(function (e) { return e.date >= App.today && E.diffD(App.today, e.date) <= 14; })[0];
    var p = d && d.parts.filter(function (x) { return E.isRun(x) && x.type !== 'race'; })[0], k = stratKey(p);
    if (nr) { var r = RACE_STRAT[E.distOf(nr).key] || RACE_STRAT.half; out += '<section class="card tipc"><div class="eyebrow">Race strategy · ' + esc(nr.name || r.name) + '</div><p class="small" style="margin-top:4px"><b>' + esc(r.head) + '</b> ' + esc(r.pts[n % r.pts.length]) + '</p><a class="tiny" href="#/guides/races">Full race plan ›</a></section>'; }
    else if (k && RUN_STRAT[k]) { var s = RUN_STRAT[k]; out += '<section class="card tipc"><div class="eyebrow">Today\'s ' + esc(s.name.toLowerCase()) + '</div><p class="small" style="margin-top:4px">Effort ' + esc(s.effort) + '. ' + esc(s.pts[0]) + (s.pts[1] ? ' ' + esc(s.pts[1]) : '') + '</p><a class="tiny" href="#/day/' + App.today + '">How to run it ›</a></section>'; }
  }
  if (t.form) { var f = FORM_TIPS[n % FORM_TIPS.length]; out += '<section class="card tipc"><div class="eyebrow">Form tip</div><p class="small" style="margin-top:4px"><b>' + esc(f.t) + '.</b> ' + esc(f.b) + '</p><a class="tiny" href="#/guides/form">All form tips ›</a></section>'; }
  return out;
}
var _today10 = VIEWS.today;
VIEWS.today = function () {
  var h = _today10(); if (!st().profile) return h;
  var add = tipOffer() || tipCard(); if (!add) return h;
  var i = h.indexOf('<section class="card cond'); return i > 0 ? h.slice(0, i) + add + h.slice(i) : h + add;
};
/* You → Running guides, with the tip settings */
var _you10 = VIEWS.you;
VIEWS.you = function () { var h = _you10(), link = '<a href="#/guides">Running guides<span class="v">form, races, workouts</span><span class="chev">›</span></a>', i = h.indexOf('<a href="#/workouts"'); return i < 0 ? h : h.slice(0, i) + link + h.slice(i); };
var _guides10 = VIEWS.guides;
VIEWS.guides = function () {
  var t = (st().prefs || {}).tips || {}, h = _guides10();
  var tg = function (k, lbl) { return '<button class="segbtn" data-act="tips-toggle" data-arg="' + jattr({ k: k }) + '" aria-pressed="' + !!t[k] + '">' + lbl + '</button>'; };
  return h + '<section class="card stack" style="margin-top:12px"><h3>Tips on Today</h3><div class="segs">' + tg('form', 'Daily form tip') + tg('strat', 'Workout and race tips') + '</div></section>';
};
ACTIONS['tips-toggle'] = function (a) { Store.editMany([['prefs', 'tips'], ['seen', 'tips-offer']], function (S) { S.prefs = S.prefs || {}; S.seen = S.seen || {}; S.seen['tips-offer'] = 1; var t = Object.assign({}, S.prefs.tips || {}); delete t.off; t[a.k] = !t[a.k]; S.prefs.tips = t; }); };
Object.assign(TABOF, { table: 'plan', planctl: 'plan', preview: 'plan', calreview: 'plan', report: 'today', builder: 'plan', guides: 'you' });

/* ---------- Today, ordered by what matters right now ----------
   1 the day's workout · 2 readiness and how it felt · 3 anything that needs a decision · 4 this week and the weather ·
   5 tomorrow · 6 progress, fuel, coach notes. Every card stays; only the order changes. */
function todayRank(el, txt) {
  var c = ' ' + (el.className || '') + ' ', t = (txt || '').toUpperCase();
  if (/ greet /.test(c) || /pagehead/.test(c)) return 0;
  if (/ (herow|hero|venue|liftbub|restcard|crossbub) /.test(c) || /YOUR PLAN STARTS/.test(t)) return 10;
  if (/ lv-/.test(c) || /MORNING READINESS|READINESS/.test(t.slice(0, 40))) return 20;
  if (/HOW DID IT FEEL/.test(t.slice(0, 30))) return 22;
  if (/ tipc /.test(c) && !/WANT A TIP|GOOD TO KNOW|NEW TO RUNNING/.test(t)) return 24;
  if (/ btns /.test(c) && /ADD A WORKOUT/.test(t)) return 25;
  if (/ (calrev|missed|postrace|rpt|awayc|banner|tipc|offer) /.test(c) || /A NEW WEEK STARTS|WEEKLY REPORT/.test(t.slice(0, 40))) return 30;
  if (/ wkprog /.test(c)) return 38;
  if (/^THIS WEEK/.test(t)) return 40;
  if (/ cond /.test(c)) return 45;
  if (/^TOMORROW/.test(t)) return 50;
  if (/SLEEP/.test(t.slice(0, 30))) return 55;
  if (/ progc /.test(c)) return 58;
  if (/^FUEL|  fuel /.test(t) || / fuel /.test(c)) return 60;
  if (/^COACH NOTES/.test(t)) return 70;
  return 65;
}
var _today10b = VIEWS.today;
VIEWS.today = function () {
  var h = _today10b();
  try {
    var tpl = document.createElement('template'); tpl.innerHTML = h;
    var kids = [].slice.call(tpl.content.children), groups = [];
    for (var i = 0; i < kids.length; i++) {
      var el = kids[i], g = [el];
      if (/(^| )sechead( |$)/.test(el.className || '') && kids[i + 1]) { g.push(kids[i + 1]); i++; }
      groups.push({ els: g, rank: todayRank(g[g.length - 1], (el.textContent || '').trim()), i: groups.length });
    }
    groups.forEach(function (g) { if (/(^| )sechead( |$)/.test(g.els[0].className || '')) g.rank = todayRank(g.els[0], (g.els[0].textContent || '').trim()); });
    groups.sort(function (a, b) { return a.rank - b.rank || a.i - b.i; });
    var out = document.createElement('div'); groups.forEach(function (g) { g.els.forEach(function (e) { out.appendChild(e); }); });
    return out.innerHTML;
  } catch (e) { return h; }
};

/* ---------- You: grouped so each thing is where you'd look for it (nothing removed) ---------- */
var YOU_GROUPS = [
  ['Your plan', ['#/goals', '#/style', '#/planctl', '#/settings', '#/control', '#/preview', '#/zones']],
  ['Workouts', ['#/workouts', '#/watch', '#/table']],
  ['Fitness & gear', ['#/fitness', '#/shoes', '#/progress/strength']],
  ['Library', ['#/guides', '#/strength', '#/cross', '#/shins', '#/warmup', '#/nutrition']],
  ['Connections', ['#/sync', '#/calsync', '#/notify']],
  ['App', ['#/shareapp', '#/data', '#/about']]
];
var _you10b = VIEWS.you;
VIEWS.you = function () {
  var h = _you10b();
  try {
    var tpl = document.createElement('template'); tpl.innerHTML = h;
    var root = tpl.content, links = {}, firstMenu = null;
    [].slice.call(root.querySelectorAll('.menu a')).forEach(function (a) { var href = a.getAttribute('href') || ''; var key = href.replace(/\/\d{4}-\d{2}-\d{2}$/, ''); links[key] = a; });
    if (!links['#/table']) { var t = document.createElement('a'); t.setAttribute('href', '#/table'); t.innerHTML = 'Training log<span class="v">table & CSV</span><span class="chev">›</span>'; links['#/table'] = t; }
    var used = {}, html = '';
    /* keep the top block (title, tiles, dashboard links) as is */
    var kids = [].slice.call(root.children), topEnd = kids.findIndex(function (e) { return /sechead/.test(e.className || ''); });
    kids.slice(0, topEnd < 0 ? kids.length : topEnd).forEach(function (e) { html += e.outerHTML; });
    YOU_GROUPS.forEach(function (g) {
      var as = g[1].map(function (k) { var a = links[k]; if (a) used[k] = 1; return a ? a.outerHTML : ''; }).join('');
      if (as) html += '<div class="sechead"><h2>' + g[0] + '</h2></div><div class="menu">' + as + '</div>';
    });
    var rest = Object.keys(links).filter(function (k) { return !used[k] && !/#\/(dash|glance)$/.test(k); });
    if (rest.length) html += '<div class="sechead"><h2>More</h2></div><div class="menu">' + rest.map(function (k) { return links[k].outerHTML; }).join('') + '</div>';
    /* anything after the menus (cards, notes) stays at the end */
    kids.slice(topEnd < 0 ? kids.length : topEnd).forEach(function (e) { if (!/menu|sechead/.test(e.className || '')) html += e.outerHTML; });
    return html;
  } catch (e) { return h; }
};
