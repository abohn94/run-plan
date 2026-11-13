/* Coach: a rule-based training assistant. No AI service, no cost.
   reply(text, ctx) -> { text, actions: [{label, act}] } */
(function (root) {
'use strict';
var E = root.ENGINE || (typeof require !== 'undefined' ? require('./engine.js') : null);
var DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function pz(z, ctx) { var p = ctx.zones && ctx.zones[z]; return p ? E.fmtPace(p[0]) + '–' + E.fmtPace(p[1]) + '/mi' : '—'; }
function hrz(z, ctx) { var h = ctx.zones && ctx.zones.hr && ctx.zones.hr[z]; return h ? ' (about ' + (h[0] ? h[0] + '–' : 'under ') + h[1] + ' bpm)' : ''; }
function A(label, act) { return { label: label, act: act }; }
function num(text) { var m = /(\d+)/.exec(text); return m ? +m[1] : null; }
function dayIn(text) { for (var i = 0; i < 7; i++) if (text.indexOf(DAYS[i]) >= 0 || new RegExp('\\b' + DAYS[i].slice(0, 3) + '\\b').test(text)) return i; return -1; }

function describeDay(day, ctx) {
  if (!day) return 'Nothing is scheduled.';
  return day.parts.map(function (p) {
    if (p.type === 'rest') return p.title;
    if (p.type === 'strength') return p.title + ' (' + p.min + ' min)';
    if (p.type === 'cross') return p.title + ' (' + p.min + ' min)';
    return p.title + ', ' + E.round1(p.mi) + ' mi';
  }).join(' + ');
}

var KB = [
  { id: 'zones', title: 'My training paces', keys: /\b(pace|paces|zones?|how fast|easy pace|tempo pace|threshold pace|interval pace)\b/,
    a: function (c) { return 'Your current paces (they update from your runs, time trials and threshold tests):\n• Easy: ' + pz('E', c) + hrz('E', c) + '\n• Steady: ' + pz('S', c) + '\n• Marathon pace: ' + pz('M', c) + '\n• Threshold: ' + pz('T', c) + hrz('T', c) + '\n• Intervals: ' + pz('I', c) + '\n• Goal race pace: ' + pz('G', c) + '\nEasy days should feel like you could chat in full sentences. If you can\'t, slow down — the pace is a ceiling, not a target.'; },
    actions: [A('Open pace & HR zones', { nav: '#/zones' })] },
  { id: 'threshold', title: 'Lactate threshold explained', keys: /\b(lactate|threshold|tempo|cruise)\b/,
    a: function (c) { return 'Lactate threshold is roughly the fastest pace you could hold for about an hour. Training right at it (not faster) teaches your body to clear lactate and is the single best way to turn your aerobic base into speed.\n\nYour threshold pace is ' + pz('T', c) + hrz('T', c) + '. It should feel "comfortably hard": you can say a short sentence. If the last rep is a fight, you went too fast.\n\nIf you get a new lactate threshold estimate from your watch or a lab test, add it under Pace & HR zones and your threshold workouts will use it.'; },
    actions: [A('Add a threshold or VO2max reading', { sheet: 'metrics' })] },
  { id: 'vo2', title: 'VO2max and intervals', keys: /\b(vo2|v02|vo2max|intervals?|repeats?)\b/,
    a: function (c) { return 'VO2max is the ceiling of your aerobic engine. Interval sessions at about 5K effort (' + pz('I', c) + ') push that ceiling up. Your Garmin estimates VO2max, but Garmin\'s personal API doesn\'t share it, so add it by hand when it changes. The app counts it at half weight because watch estimates wander; a race or time trial counts fully.'; },
    actions: [A('Update VO2max', { sheet: 'metrics' })] },
  { id: 'long', title: 'Long run tips', keys: /\b(long run|long runs|longest)\b/,
    a: function (c) { return 'Long runs build endurance, durability and fueling skills. Keep them conversational unless the plan adds a faster finish. Over 75 minutes, take 30–60 g of carbs per hour (a gel every 30–40 minutes) and drink to thirst. Practice your race breakfast and shoes on the big ones.' + (c.nextLong ? '\n\nYour next long run: ' + c.nextLong + '.' : ''); } },
  { id: 'shin', title: 'Shin splints', keys: /\b(shin|shins|tibia|splint)/,
    a: function () { return 'Shin pain is a load problem: the lower leg is getting more stress than it can adapt to yet.\n• Pain under 3/10 that fades as you warm up: run easy and shorter on soft ground, skip hills and speed for a few days, and do the shin routine daily.\n• Pain 4/10+, pain when walking, a sharp spot on the bone, or night pain: stop running, walk on the treadmill only if pain-free, and get it checked to rule out a stress injury.\nTell me how bad it is and I\'ll adjust the plan.'; },
    actions: [A('Mild — mark a niggle', { life: { kind: 'injured', level: 'modified' } }), A('Bad — stop running', { life: { kind: 'injured', level: 'out' } }), A('Open the shin routine', { nav: '#/shins' })] },
  { id: 'pain', title: 'Aches and pains', keys: /\b(pain|hurts?|injur|achilles|calf|knee|hip|foot|ankle|hamstring|it band|plantar|sore spot|tweak)/,
    a: function () { return 'Sorry it hurts. A quick rule: if pain is 3/10 or less, doesn\'t change how you run, and settles within 24 hours, run easy and short. If it\'s sharp, getting worse, makes you limp, or is on one spot of bone, stop running, walk only if it is pain-free, and see a clinician if it lasts more than a few days. I\'ll ease the plan either way.'; },
    actions: [A('Niggle: ease this week', { life: { kind: 'injured', level: 'modified' } }), A('No running for now', { life: { kind: 'injured', level: 'out' } }), A('Log a check-in', { sheet: 'checkin' })] },
  { id: 'sick', title: 'Running when sick', keys: /\b(sick|ill|cold|flu|covid|fever|virus|stomach|congest)/,
    a: function () { return 'The "neck check": symptoms only above the neck (stuffy nose, mild sore throat) — an easy run or walk is usually fine. Fever, chest symptoms, body aches or stomach bugs — rest completely and return 24 hours after the fever is gone. The plan ramps you back in afterwards; never try to make up missed runs.'; },
    actions: [A('Mild: a few easy days', { life: { kind: 'sick', level: 'mild' } }), A('Out for the week', { life: { kind: 'sick', level: 'severe' } })] },
  { id: 'missed', title: 'Missed a run', keys: /\b(missed|skip|skipped|didn.t run|couldn.t run|no time)\b/,
    a: function () { return 'Let it go — one missed run changes nothing. Don\'t double up or squeeze it into a rest day. If it was the key workout or long run and you have a free day later this week (not the day before the long run), move it there. Otherwise just carry on.'; },
    actions: [A('Open this week', { nav: '#/plan' })] },
  { id: 'tired', title: 'Feeling tired or flat', keys: /\b(tired|fatigue|exhausted|flat|heavy legs|drained|burn ?out|run down|overtrain)/,
    a: function (c) { return 'Tiredness is useful information. ' + (c.rd ? 'Today\'s readiness is ' + c.rd.level.toUpperCase() + (c.rd.reasons.length ? ': ' + c.rd.reasons.map(function (r) { return r.text; }).join(' ') : '.') + ' ' : '') + 'One flat day: keep easy runs easy and lift light. Several in a row, with low HRV or high resting heart rate: take a down day or two. Fitness is built during recovery, not during the run.'; },
    actions: [A('Do a check-in', { sheet: 'checkin' }), A('Make today easy', { override: 'easy' })] },
  { id: 'sleep', title: 'Sleep', keys: /\b(sleep|insomnia|night shift|nights|slept)/,
    a: function (c) { var s = c.rd && c.rd.metrics.sleep; return (s ? 'Last night: ' + E.round1(s.v) + ' h' + (s.score ? ', score ' + s.score : '') + '. ' : '') + 'Aim for 7–9 hours, most of all after long runs and hard days. On short nights, keep runs easy and caffeine before noon. Working nights? Anchor a regular sleep block, protect it with blackout curtains, and schedule key workouts on your best-rested days — tell me your shifts as "busy" days and the plan will move runs around them.'; },
    actions: [A('Mark busy days', { sheet: 'life' })] },
  { id: 'hrv', title: 'HRV', keys: /\bhrv|heart rate variability/,
    a: function (c) { var h = c.rd && c.rd.metrics.hrv; return (h ? 'Last night\'s HRV: ' + h.v + ' ms' + (h.lo ? ' (your normal range ' + h.lo + '–' + h.hi + ')' : '') + '. ' : '') + 'HRV reflects how recovered your nervous system is. One low night isn\'t a problem; a few in a row — especially with a higher resting heart rate — means back off. The app compares you only to your own baseline.'; } },
  { id: 'rhr', title: 'Resting heart rate', keys: /\b(resting heart|rhr|resting hr)/,
    a: function (c) { var r = c.rd && c.rd.metrics.rhr; return (r ? 'This morning: ' + r.v + ' bpm' + (r.base ? ' against a normal of about ' + Math.round(r.base) : '') + '. ' : '') + 'A resting heart rate 5+ bpm above your normal often means fatigue, illness, heat, alcohol or stress. The app eases the day when that happens.'; } },
  { id: 'bb', title: 'Body Battery', keys: /\bbody battery\b/,
    a: function (c) { var b = c.rd && c.rd.metrics.bb; return (b ? 'Your Body Battery peaked at ' + b.v + ' today. ' : '') + 'Below about 45, keep the day easy; below 25, rest. It\'s a blend of HRV, stress and sleep, so treat it as one input alongside how you feel.'; } },
  { id: 'fuel', title: 'Fueling and nutrition', keys: /\b(eat|food|fuel|gel|gels|carb|carbs|protein|nutrition|diet|breakfast|calories|macros|hungry)\b/,
    a: function (c) { var n = c.nutrition; return (n ? 'Today is a ' + n.tier.toLowerCase() + ' training day' + (n.carbG ? ': about ' + n.carbG[0] + '–' + n.carbG[1] + ' g carbs and ' + n.protG[0] + '–' + n.protG[1] + ' g protein' : ': about ' + n.carbGkg[0] + '–' + n.carbGkg[1] + ' g carbs per kg body weight') + '. ' : '') + 'Carbs fuel running; protein (spread over 3–4 meals) repairs muscle from lifting. Before runs over an hour, eat a familiar carb meal 2–3 hours ahead. During long runs, 30–60 g carbs per hour. After hard days, carbs plus 20–30 g protein within an hour.'; },
    actions: [A('Open nutrition', { nav: '#/nutrition' })] },
  { id: 'hydration', title: 'Hydration, heat and humidity', keys: /\b(water|hydrat|electrolyte|salt|sodium|heat|hot|humid|sweat)/,
    a: function () { return 'Drink to thirst on most runs. On runs over an hour or in heat, aim for 400–800 ml per hour with sodium (300–600 mg/h). In heat, slow easy and long-run paces by 15–30 s/mi or more and run by effort and heart rate.'; } },
  { id: 'winter', title: 'Cold, snow and treadmills', keys: /\b(cold|snow|ice|icy|winter|freez|treadmill|wind ?chill|dreadmill)/,
    a: function () { return 'Winter running: dress for 15–20 °F warmer than it is, cover hands and ears, and use traction devices on ice. Slippery footing raises shin and calf strain, so slow down or move speed work indoors. Treadmill: set a 1% incline to feel like outdoors, and run by effort if the speed seems off. Both count the same in the plan — your watch records them.'; } },
  { id: 'strength', title: 'Lifting and running together', keys: /\b(lift|lifting|gym|weights|strength|squat|deadlift|bench|press)\b/,
    a: function (c) { return 'Lifting heavy twice a week makes you a more durable, more economical runner. Rules of thumb:\n• Hard days hard: lift on your key-run day, after the run (or 6+ hours apart).\n• Keep the day before the long run free of heavy legs.\n• Leave 2–3 reps in the tank in run-heavy weeks; drop sets in taper and race weeks.\nYou currently lift ' + (c.profile ? c.profile.liftDays : 2) + ' days a week. Want to change it?'; },
    actions: [A('Lift 2 days', { profile: { liftDays: 2 } }), A('Lift 3 days', { profile: { liftDays: 3 } }), A('Lift 4 days', { profile: { liftDays: 4 } }), A('Open strength', { nav: '#/strength' })] },
  { id: 'cross', title: 'Gym days', keys: /\b(cross|gym day|gym days|treadmill run|bike|elliptical|rower)\b/,
    a: function () { return 'Your extra training days are gym days: a lifting session plus a short, easy treadmill run at 1% incline. They add strength and a few easy miles without another hard run. Keep the treadmill run conversational, and keep heavy legs away from the day before your long run.'; },
    actions: [A('1 gym day a week', { profile: { crossDays: 1 } }), A('2 gym days', { profile: { crossDays: 2 } }), A('Gym days guide', { nav: '#/cross' })] },
  { id: 'taper', title: 'Tapering', keys: /\b(taper|tapering)\b/,
    a: function () { return 'In the taper, mileage drops but some pace stays, so your legs stay sharp while fatigue drains away. Feeling restless, heavy or a bit flat is normal. Don\'t add extra runs, don\'t try new foods, and sleep as much as you can.'; } },
  { id: 'race', title: 'Race day', keys: /\b(race day|race morning|race plan|pacing strategy|start line|negative split|pace the race)/,
    a: function (c) { return 'Race plan: eat a familiar breakfast 2–3 hours before, warm up (shorter for longer races), and start 5–10 s/mi slower than goal pace for the first 2 miles. Settle into goal pace (' + pz('G', c) + '), then race the final third. Fuel early in the half and marathon. Nothing new on race day.'; } },
  { id: 'shoes', title: 'Shoes', keys: /\b(shoe|shoes|sneaker|super ?shoe|carbon plate)/,
    a: function () { return 'Rotate two pairs if you can, retire them around 300–500 miles or when the cushioning feels flat, and save carbon-plated shoes for races and a few key sessions. Rotating shoes slightly changes the loading pattern, which is kind to shins.'; } },
  { id: 'form', title: 'Cadence and form', keys: /\b(cadence|form|stride|overstrid|heel strike|foot strike)/,
    a: function () { return 'If you overstride, a cadence about 5% higher than your current number shortens each step and lowers load on the shins and knees. Run tall, land with your foot under you, and keep your arms relaxed. Strides twice a week are the easiest form drill.'; } },
  { id: 'tt', title: 'Time trials and fitness checks', keys: /\b(time trial|fitness test|5k test|test my fitness)/,
    a: function () { return 'A 5K time trial (or any race) resets every pace in the app. Warm up 1–2 miles with strides, run the 5K as evenly as you can, then log it as a race or time trial with the 5K time.'; } },
  { id: 'adapt', title: 'How the plan adapts', keys: /\b(adapt|adjust|garmin|sync|how does|how do you|recommend)/,
    a: function () { return 'Each morning the app reads your Garmin sleep, HRV, resting heart rate and Body Battery, plus your check-in and recent training load. If they look off, it suggests an easier version of today (you choose). Your logged runs tune your paces: effort ratings, heart rate on easy runs, time trials, and any threshold or VO2max values you add. Life events (travel, busy days, illness, niggles) reshape the week, and missed weeks ramp you back in gradually.'; } },
  { id: 'motivation', title: 'Motivation', keys: /\b(motivat|unmotivated|bored|lazy|don.t feel like|mental)/,
    a: function () { return 'Motivation follows action. Shrink the goal: put on your shoes and run 10 easy minutes — you can stop after that. Change the route, run with a friend or podcast, or swap an easy run for a gym day. And look at the Progress tab: the trend is the reward.'; } }
];

function intent(text, ctx) {
  var t = text.toLowerCase();
  /* plan feedback with direct changes */
  if (/\b(too hard|too much|overwhelm|can.t keep up|struggling|exhausting)\b/.test(t)) {
    return { text: 'Thanks for telling me — that matters more than any number. I can lower your planned mileage by about 10%, switch to a gentler training style, or ease just this week.', actions: [A('Lower mileage 10%', { profile: { volume: Math.max(0.7, E.round1(((ctx.profile && ctx.profile.volume) || 1) - 0.1)) } }), A('Ease this week', { life: { kind: 'busy', level: 'light' } }), A('Change training style', { nav: '#/style' })] };
  }
  if (/\b(too easy|more mileage|more miles|harder|not enough)\b/.test(t)) {
    return { text: 'Good sign! I can raise your planned mileage by about 10%. Increases are still ramped gradually and cutback weeks stay in, so it\'s safe for your shins.', actions: [A('Raise mileage 10%', { profile: { volume: Math.min(1.3, E.round1(((ctx.profile && ctx.profile.volume) || 1) + 0.1)) } }), A('Change training style', { nav: '#/style' })] };
  }
  if (/long run/.test(t) && /(move|change|switch|on|prefer)/.test(t) && dayIn(t) >= 0) {
    var d = dayIn(t);
    return { text: 'Move your long runs to ' + E.DOW_LONG[d] + '? The rest of the week rearranges around it.', actions: [A('Yes, long runs on ' + E.DOW[d], { profile: { longDay: d } })] };
  }
  if (/(run|runs|running)\b.*\b(days|times)\b.*\b(week|wk)\b|\b\d\s*(runs|run days)\b/.test(t) && num(t)) {
    var n = E.clamp(num(t), 3, 7);
    return { text: 'Set your plan to at most ' + n + ' runs a week? Mileage is spread across those days.', actions: [A(n + ' runs a week', { profile: { runDays: n } })] };
  }
  if (/(lift|gym|strength)/.test(t) && /(days|times|x)\b/.test(t) && num(t) != null) {
    var k = E.clamp(num(t), 0, 4);
    return { text: 'Lift ' + k + ' days a week? I\'ll place them on hard days first and keep heavy legs away from the day before your long run.', actions: [A('Lift ' + k + ' days', { profile: { liftDays: k } })] };
  }
  if (/\b(travel|trip|vacation|holiday|wedding|busy|work|shift|on call|conference|move day)\b/.test(t)) {
    return { text: 'Life happens — let\'s plan around it. Tell me the dates and I\'ll move key runs to your free days, or lighten the week if you\'re away for 3+ days.', actions: [A('Add dates', { sheet: 'life' })] };
  }
  if (/\b(race|event|marathon|half|5k|10k)\b/.test(t) && /\b(add|signed up|new|registered|another)\b/.test(t)) {
    return { text: 'Nice! Add it under Goals & races. A-races get a full build and taper; B- and C-races slot in as tune-ups without derailing the plan.', actions: [A('Add a race', { nav: '#/goals' })] };
  }
  if (/\b(today|todays|today.s)\b/.test(t) && /\b(what|workout|run|plan|do)\b/.test(t)) {
    return { text: 'Today: ' + describeDay(ctx.todayDay, ctx) + '.' + (ctx.rec && ctx.rec.headline ? '\n' + ctx.rec.headline + ' — ' + ctx.rec.body : ''), actions: [A('Open today', { nav: '#/today' })] };
  }
  if (/\btomorrow\b/.test(t)) return { text: 'Tomorrow: ' + describeDay(ctx.tomorrowDay, ctx) + '.', actions: [] };
  if (/\b(this week|week look|my week)\b/.test(t)) return { text: ctx.weekSummary || 'Open the Plan tab to see the week.', actions: [A('Open this week', { nav: '#/plan' })] };
  return null;
}

function reply(text, ctx) {
  var t = String(text || '').trim();
  if (!t) return { text: 'Ask me anything about your training, or tap a quick action below.', actions: [] };
  var i = intent(t, ctx);
  if (i) return i;
  var lower = t.toLowerCase();
  var hits = KB.filter(function (k) { return k.keys.test(lower); });
  if (hits.length) {
    var k = hits[0];
    var more = hits.slice(1, 3).map(function (h) { return A(h.title, { ask: h.title }); });
    return { text: k.a(ctx), actions: (k.actions || []).concat(more) };
  }
  return { text: 'I\'m a built-in coach, so I understand training topics like paces, threshold, long runs, shins, sickness, sleep, HRV, fueling, lifting, gym days, taper and race day — and I can change your plan when you tell me about schedule changes, how hard it feels, or how many days you want to run or lift.\n\nFor anything bigger, tap "Copy for Claude": it copies your plan and recent data so you can paste it into the Claude app.', actions: [A('Copy for Claude', { copy: true }), A('Do a check-in', { sheet: 'checkin' })] };
}

/* Reply after a check-in. */
function afterCheckin(c, rd, rec) {
  var lines = [];
  lines.push('Thanks for checking in. Readiness today: ' + rd.level.toUpperCase() + ' (' + rd.score + '/100).');
  if (rd.reasons.length) lines.push(rd.reasons.map(function (r) { return '• ' + r.text; }).join('\n'));
  if (rec && rec.headline) lines.push(rec.headline + ': ' + rec.body);
  if (c.note) lines.push('I\'ve noted: "' + c.note + '".');
  return lines.join('\n');
}

/* Weekly review message for Monday mornings. */
function weeklyReview(prev, done, plannedMi, actualMi, avgRd) {
  var pct = plannedMi ? Math.round(actualMi / plannedMi * 100) : 0;
  var s = 'Week ' + prev.n + ' review: ' + E.round1(actualMi) + ' of ' + E.round1(plannedMi) + ' planned miles (' + pct + '%), ' + done + (done === 1 ? ' training day' : ' training days') + ' completed.';
  if (pct >= 90) s += ' Excellent consistency — that\'s what builds fitness.';
  else if (pct >= 70) s += ' Solid week. Consistency over perfection.';
  else if (pct > 0) s += ' A lighter week than planned. If life got in the way, tell me about upcoming busy days so the plan fits around them.';
  if (avgRd != null) s += ' Average readiness ' + Math.round(avgRd) + '/100.';
  return s;
}

var api = { reply: reply, KB: KB, afterCheckin: afterCheckin, weeklyReview: weeklyReview };
root.COACH = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
