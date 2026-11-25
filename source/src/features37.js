/* ================= Tailored strength programs, weight suggestions and cardio swaps =================
   A questionnaire (goal, emphasis, experience and history, equipment, weights or calisthenics, days, session length,
   limits) builds a program in the engine (_prog.js). Sessions replace the standard lifts on the days you pick.
   Double progression with starting weights from your body weight, bodyweight ladders, a deload every 5th week (6th
   for new lifters), and coach suggestions that keep adjusting it, the same way the running plan adapts.
   Any cardio or cross-training session can be swapped: from the week, on the day, or mid-session. */
TITLES.sp = 'Strength program'; TABOF.sp = 'more'; TITLES.program = 'Your program'; TABOF.program = 'more';
/* ---- exercise library entries for the program's exercises ---- */
(function () {
  var PAT = { squat: 'squat', hinge: 'hinge', glute: 'thrust', lunge: 'lunge', hpush: 'pushH', vpush: 'pushV', hpull: 'pullH', vpull: 'pullV', arms_b: 'curl', arms_t: 'triceps', delts: 'shoulder', rear: 'shoulder', chest_iso: 'pushH', quad_iso: 'squat', ham_iso: 'hinge', abd: 'thrust', calf: 'calf', core: 'core', power: 'jump', upower: 'throw' };
  var MUS = { squat: 'quads glutes', hinge: 'hams glutes', glute: 'glutes', lunge: 'quads glutes', hpush: 'chest triceps', vpush: 'delts triceps', hpull: 'lats upperback', vpull: 'lats biceps', arms_b: 'biceps', arms_t: 'triceps', delts: 'delts', rear: 'delts upperback', chest_iso: 'chest', quad_iso: 'quads', ham_iso: 'hams', abd: 'glutes', calf: 'calves', core: 'abs', power: 'glutes quads', upower: 'chest delts' };
  var EQL = { gym: 'Gym equipment', db: 'Dumbbells', band: 'Resistance band', bw: 'None', bar: 'Pull-up bar' };
  Object.keys(E.SP_POOL).forEach(function (pat) {
    var pool = E.SP_POOL[pat];
    pool.forEach(function (e) {
      if (EXDB[e.n]) return;
      var subs = pool.filter(function (x) { return x.n !== e.n; }).slice(0, 4).map(function (x) { return x.n; }).join('|');
      var eqn = e.eq === 'gym' ? (/cable|face pull/i.test(e.n) ? 'Cable machine' : /barbell|trap-bar|landmine|push press/i.test(e.n) ? 'Barbell' : /medicine/i.test(e.n) ? 'Medicine ball' : /back extension|assisted/i.test(e.n) ? 'Bench or station' : 'Machine') : e.eq === 'db' ? (/kettlebell/i.test(e.n) ? 'Kettlebell or dumbbell' : 'Dumbbells') : EQL[e.eq] || 'None';
      X(e.n, PAT[pat] || pat, eqn, MUS[pat] || 'core', '', e.cue + '|Control the lowering: about 2 s down.|Stop 1–2 reps before your form breaks.', e.cue, subs);
    });
  });
})();

/* ---- questionnaire ---- */
var SPQ_EQUIP = [['gym', 'Full gym', 'Barbells, machines, cables and dumbbells'], ['db', 'Dumbbells at home', 'A set of dumbbells and a bench'], ['band', 'Bands & light weights', 'Resistance bands, maybe a kettlebell or light dumbbells'], ['bw', 'Bodyweight only', 'No equipment: calisthenics anywhere']];
var SPQ_GOALS = ['muscle', 'lean', 'recomp', 'strength', 'power', 'endurance', 'health'];
var SPQ_DOW = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
function spDraft(ctx) {
  if (ctx === 'wiz') { var z = App.wiz, p = z.profile; return p.sp || (p.sp = spSeed(p)); }
  return App.spd || (App.spd = spSeed(st().profile || {}));
}
function spSeed(p) {
  var cur = p.sp ? JSON.parse(JSON.stringify(p.sp)) : null; if (cur) return cur;
  var n = clampN(+p.liftDays || 3, 2, 6);
  return { goal: null, emph: null, sex: p.sex === 'F' ? 'F' : p.sex === 'M' ? 'M' : null, exp: null, equip: null, style: 'weights', len: 45, limits: [], bar: false, dows: E.spDefaults({ days: n }).dows, hist: '' };
}
function clampN(x, a, b) { return Math.max(a, Math.min(b, x)); }
function spChip(ctx, k, v, label, cur, multi) { var on = multi ? (cur || []).indexOf(v) >= 0 : cur === v; return '<button type="button" class="chip" data-act="sp-set" data-arg="' + jattr({ ctx: ctx, k: k, v: v, m: multi ? 1 : 0 }) + '" aria-pressed="' + on + '">' + label + '</button>'; }
function spCard(ctx, k, v, title, sub, cur, pill) { return '<button type="button" class="opt" data-act="sp-set" data-arg="' + jattr({ ctx: ctx, k: k, v: v }) + '" aria-pressed="' + (cur === v) + '"><span class="spread"><span class="k">' + title + '</span>' + (pill ? '<span class="pill good">' + pill + '</span>' : '') + '</span><span class="s">' + sub + '</span></button>'; }
function spForm(ctx) {
  var d = spDraft(ctx), f = d.sex === 'F', m = d.sex === 'M';
  var h = '<section class="card stack"><h3>1. Your main goal</h3>' + SPQ_GOALS.map(function (g) { var G = E.SP_GOALS[g]; return spCard(ctx, 'goal', g, G.short, G.d, d.goal); }).join('') + '</section>';
  h += '<section class="card stack"><h3>2. About you</h3><p class="small muted">Used for starting weights and to suggest a plan style. You choose the style either way.</p><div class="chips">' + spChip(ctx, 'sex', 'F', 'Female', d.sex) + spChip(ctx, 'sex', 'M', 'Male', d.sex) + spChip(ctx, 'sex', 'X', 'Prefer not to say', d.sex) + '</div></section>';
  h += '<section class="card stack"><h3>3. What to focus on</h3>' +
    spCard(ctx, 'emph', 'balanced', 'Balanced full body', 'Every muscle group trained evenly.', d.emph) +
    spCard(ctx, 'emph', 'glutes', 'Glutes & legs (booty focus)', 'A glute exercise first in every session, hip thrusts, Romanian deadlifts, abductions. Based on Strong Curves.', d.emph, f ? 'Popular with women' : '') +
    spCard(ctx, 'emph', 'upper', 'Upper body', 'Extra chest, back, shoulders and arms, with legs kept strong.', d.emph, m ? 'Popular with men' : '') +
    spCard(ctx, 'emph', 'legs', 'Legs', 'Quads, hamstrings and glutes get extra sessions.', d.emph) + '</section>';
  h += '<section class="card stack"><h3>4. Your lifting history</h3><div class="chips">' + spChip(ctx, 'exp', 'new', 'New (under 6 months)', d.exp) + spChip(ctx, 'exp', 'some', '6 months to 2 years', d.exp) + spChip(ctx, 'exp', 'exp', '2+ years', d.exp) + '</div>' +
    '<label class="f">Anything I should know? (optional)<textarea class="i" rows="2" data-sphist="' + ctx + '" placeholder="Programs you\'ve done, best lifts, what you enjoy">' + esc(d.hist || '') + '</textarea></label></section>';
  h += '<section class="card stack"><h3>5. Equipment you can use</h3>' + SPQ_EQUIP.map(function (e) { return spCard(ctx, 'equip', e[0], e[1], e[2], d.equip); }).join('') +
    (d.equip && d.equip !== 'gym' ? '<div class="chips">' + spChip(ctx, 'bar', true, 'I have a pull-up bar', d.bar) + spChip(ctx, 'bar', false, 'No pull-up bar', d.bar) + '</div>' : '') + '</section>';
  h += '<section class="card stack"><h3>6. Weights or calisthenics?</h3><div class="chips">' + spChip(ctx, 'style', 'weights', 'Weights', d.style) + spChip(ctx, 'style', 'calis', 'Calisthenics', d.style) + spChip(ctx, 'style', 'mix', 'A mix', d.style) + '</div><p class="small muted">Calisthenics uses bodyweight ladders: master 3×8, then move to the harder version.</p></section>';
  h += '<section class="card stack"><h3>7. When and how long</h3><label class="f">Days you want to lift (' + d.dows.length + ' a week)<div class="chips">' + SPQ_DOW.map(function (x) { return spChip(ctx, 'dows', x[0], x[1], d.dows, true); }).join('') + '</div></label>' +
    '<label class="f">Minutes per session<div class="chips">' + [30, 45, 60, 75, 90].map(function (n) { return spChip(ctx, 'len', n, n + ' min', d.len); }).join('') + '</div></label></section>';
  h += '<section class="card stack"><h3>8. Anything to work around?</h3><div class="chips">' + spChip(ctx, 'limits', 'knees', 'Knees', d.limits, true) + spChip(ctx, 'limits', 'back', 'Lower back', d.limits, true) + spChip(ctx, 'limits', 'shoulders', 'Shoulders', d.limits, true) + '</div><p class="small muted">Exercises that commonly bother these are left out. See a clinician for pain that persists.</p></section>';
  var ready = d.goal && d.emph && d.exp && d.equip && d.dows.length >= 2 && d.dows.length <= 6;
  if (ready) { var P = E.buildProgram(Object.assign({}, d, { on: true }), st().profile || {}); h += '<section class="card stack"><div class="eyebrow">Your program</div><h3>' + esc(P.name) + '</h3><p class="small muted">' + d.dows.length + ' days · ' + d.len + ' min · ' + P.days.map(function (x) { return esc(x.name); }).join(', ') + '</p></section>'; }
  else h += '<p class="small muted">' + (d.dows.length < 2 || d.dows.length > 6 ? 'Pick 2 to 6 days. ' : '') + 'Answer each question to see your program.</p>';
  h += '<p class="err" id="spErr"></p>';
  return h;
}
ACTIONS['sp-set'] = function (a) {
  var d = spDraft(a.ctx);
  if (a.m) { var arr = d[a.k] || (d[a.k] = []), i = arr.indexOf(a.v); if (i >= 0) arr.splice(i, 1); else arr.push(a.v); if (a.k === 'dows') arr.sort(function (x, y) { return ((x + 6) % 7) - ((y + 6) % 7); }); }
  else d[a.k] = a.v;
  if (a.k === 'sex' && !d.emph) d.emph = a.v === 'F' ? 'glutes' : a.v === 'M' ? 'upper' : 'balanced';
  if (a.k === 'equip' && a.v === 'bw' && d.style === 'weights') d.style = 'calis';
  keepScroll(render);
};
document.addEventListener('input', function (e) { var c = e.target && e.target.dataset && e.target.dataset.sphist; if (c) spDraft(c).hist = e.target.value.slice(0, 400); });
function spValid(d) { return d.goal && d.emph && d.exp && d.equip && d.dows.length >= 2 && d.dows.length <= 6; }
VIEWS.sp = function () {
  var has = (st().profile || {}).sp;
  return '<div class="pagehead"><h1>Strength program</h1><p>Eight quick questions. Your answers build a program for your goal, equipment and schedule, and it keeps adjusting as you log sessions.</p></div>' + spForm('page') +
    '<div class="btns"><button class="btn primary" data-act="sp-save">' + (has ? 'Rebuild my program' : 'Build my program') + '</button><button class="btn ghost" data-act="nav" data-arg="' + jattr({ to: has ? '#/program' : '#/more' }) + '">Cancel</button></div>';
};
ACTIONS['sp-save'] = function () {
  var d = spDraft('page'); if (!spValid(d)) { var e = $('#spErr'); if (e) e.textContent = 'Answer every question, and pick 2 to 6 days.'; return; }
  var old = (st().profile || {}).sp;
  Store.edit('profile', null, function (S) { var sp = Object.assign({}, d, { on: true, start: old && old.on && old.goal === d.goal ? old.start : E.monday(App.today), block: old ? old.block || 0 : 0, vol: old && old.goal === d.goal ? old.vol || 0 : 0 }); delete sp.deload; S.profile.sp = sp; S.profile.liftDays = Math.min(4, d.dows.length); if (d.sex === 'F' || d.sex === 'M') S.profile.sex = S.profile.sex || d.sex; });
  App.spd = null; recompute(); toast('Program built'); go('#/program');
};
/* ---- the program page ---- */
var SP_SRC = [['ACSM position stand: progression models in resistance training', 'https://pubmed.ncbi.nlm.nih.gov/19204579/'], ['ACSM resistance training guideline (2026)', 'https://acsm.org/resistance-training-guideline/'], ['Schoenfeld on hypertrophy volume (BarBend)', 'https://barbend.com/brad-schoenfeld-hypertrophy/'], ['Lean mass sparing during calorie restriction (Roth et al. 2022)', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9012799'], ['Strong Curves program structure (Liftosaur)', 'https://liftosaur.com/programs/strongcurves'], ['r/bodyweightfitness Recommended Routine (Liftosaur)', 'https://www.liftosaur.com/programs/recommended-routine'], ['How to progress (RippedBody)', 'https://rippedbody.com/progression/']];
var DOWN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
VIEWS.program = function () {
  var prof = st().profile || {}, P = E.programOf(prof);
  if (!P) return '<div class="pagehead"><h1>Strength program</h1><p>Answer eight questions and get a program built around your goal, equipment and week.</p></div><a class="btn primary block" href="#/sp">Start the questionnaire</a>';
  var sp = P.sp, hyp = /muscle|lean|recomp/.test(sp.goal), wk = App.week, light = wk && wk.progLight;
  var h = '<div class="pagehead"><h1>' + esc(P.name) + '</h1><p>' + esc(P.desc) + '</p></div>';
  h += '<div class="chips" style="margin-bottom:8px"><span class="pill">' + sp.days + ' days a week</span><span class="pill">' + sp.len + ' min</span><span class="pill">' + esc((SPQ_EQUIP.filter(function (e) { return e[0] === sp.equip; })[0] || [0, ''])[1]) + '</span><span class="pill">' + ({ weights: 'Weights', calis: 'Calisthenics', mix: 'Weights + bodyweight' })[sp.style] + '</span>' + (sp.limits.length ? '<span class="pill">Avoiding: ' + esc(sp.limits.join(', ')) + '</span>' : '') + '</div>';
  if (light) h += '<div class="banner info small"><b>Deload week.</b> One fewer set and about 10% lighter. You come back stronger next week.</div>';
  h += '<section class="card stack"><h3>Your week</h3><ul class="plain small wkl">' + sp.dows.map(function (dw, j) { return '<li class="spread"><span><b>' + DOWN[dw] + '</b></span><span>' + esc(P.days[j].name) + '</span></li>'; }).join('') + '</ul></section>';
  P.days.forEach(function (d) {
    h += '<section class="card stack"><div class="spread"><h3>' + esc(d.name) + '</h3><span class="small muted">' + sp.len + ' min</span></div>' + d.blocks.map(function (b) { if (b.t === 'Warm-up') return '<p class="small muted">Warm-up: ' + b.min + ' min of dynamic stretches (shown in the workout).</p>'; return '<div><div class="eyebrow">' + esc(b.t) + (b.ex[0] && b.ex[0].rest && b.ex[0].rest[0] !== '–' ? ' · rest ' + esc(b.ex[0].rest[0]) : '') + '</div><ul class="plain small wkl">' + b.ex.map(function (x) { var n = (st().subs || {})[x.n] || x.n; return '<li class="spread"><span>' + (EXDB[n] ? exBtn(n) : esc(n)) + '</span><span class="muted" style="white-space:nowrap">' + esc(x.rx[light ? 3 : 0]) + '</span></li>'; }).join('') + '</ul></div>'; }).join('') + '</section>';
  });
  var V = P.vol, keys = Object.keys(V).filter(function (k) { return k !== 'core' && k !== 'calves'; }).sort(function (a, b) { return V[b] - V[a]; });
  h += '<section class="card stack"><h3>Weekly sets per muscle</h3><p class="small muted">' + (hyp ? 'For growth, aim for 10–20 hard sets per muscle a week (compound lifts count for each muscle they work).' : 'Every major muscle gets trained at least twice a week.') + (sp.exp === 'new' && hyp ? ' New lifters grow well on fewer sets; the coach adds sets once you\'re consistent and recovering well.' : '') + '</p><ul class="plain small wkl">' + keys.map(function (k) { var v = V[k], tone = hyp ? (v < 10 ? ' style="color:var(--gold)"' : v > 22 ? ' style="color:var(--gold)"' : '') : ''; return '<li class="spread"><span>' + k.charAt(0).toUpperCase() + k.slice(1) + '</span><b' + tone + '>' + v + '</b></li>'; }).join('') + '</ul></section>';
  h += '<section class="card stack"><h3>How you progress</h3><ul class="plain small wkl">' +
    '<li><b>Double progression.</b> Each exercise has a rep range, like 3×8–12. Keep the weight until every set reaches the top of the range, then add weight (+10 lb on big lower-body lifts, +5 lb elsewhere, the next dumbbell up) and build back up.</li>' +
    '<li><b>Effort.</b> Stop each set with 1–2 good reps left. The workout screen suggests a weight for every set.</li>' +
    (sp.style !== 'weights' || sp.equip === 'bw' ? '<li><b>Bodyweight ladders.</b> At 3×8 (3×12 for core), move to the next harder version. The app offers the switch when you get there.</li>' : '') +
    '<li><b>Deloads.</b> Every ' + (sp.exp === 'new' ? '6th' : '5th') + ' week is lighter. Race weeks are lighter too.</li>' +
    '<li><b>Adjusting.</b> If you miss sessions, stall, or find it too easy, the coach suggests a change. You decide.</li></ul></section>';
  if (sp.hist) h += '<section class="card"><h3>Your notes</h3><p class="small muted">' + esc(sp.hist) + '</p></section>';
  h += '<section class="card stack"><h3>Change it</h3><div class="btns"><a class="btn sm primary" href="#/sp">Edit my answers</a><button class="btn sm" data-act="sp-rotate">New exercise variations</button><button class="btn sm ghost" data-act="sp-off">Turn off</button></div><p class="tiny muted">"New exercise variations" keeps the structure and swaps in close cousins, which is worth doing every 8–12 weeks. You can also swap any single exercise from the workout screen.</p></section>';
  h += '<section class="card"><h3>What it\'s based on</h3><ul class="plain small wkl">' + SP_SRC.map(function (s) { return '<li><a href="' + s[1] + '" target="_blank" rel="noopener">' + esc(s[0]) + '</a></li>'; }).join('') + '</ul></section>';
  return h;
};
ACTIONS['sp-rotate'] = function () { Store.edit('profile', null, function (S) { S.profile.sp = Object.assign({}, S.profile.sp, { block: (+S.profile.sp.block || 0) + 1, rotAt: App.today }); }); recompute(); render(); toast('New variations in'); };
ACTIONS['sp-off'] = function () { ASK({ title: 'Turn off your program?', text: 'Your plan goes back to the standard lifting sessions. Your answers are kept, so you can turn it back on.', ok: 'Turn off', cancel: 'Keep it' }, function () { Store.edit('profile', null, function (S) { S.profile.sp = Object.assign({}, S.profile.sp, { on: false }); }); recompute(); go('#/sp'); toast('Program off'); }); };

/* ---- setup: the questionnaire as a wizard step (fitness or both, with lifting days) ---- */
if (WIZ_STEPS.indexOf('program') < 0) WIZ_STEPS.splice(WIZ_STEPS.indexOf('gym') + 1, 0, 'program');
var _wizSkip37 = wizSkip;
wizSkip = function (name, p) { if (name === 'program') return focusOf(p) === 'race' || !p.focus || +p.liftDays === 0; return _wizSkip37(name, p); };
var _setup37 = VIEWS.setup;
VIEWS.setup = function () {
  var h = _setup37(), z = App.wiz; if (!z || WIZ_STEPS[z.step] !== 'program') return h;
  var bar = (h.match(/^<div class="wizard-steps"[\s\S]*?<\/div>/) || [''])[0];
  return bar + '<div class="q"><h1>Your strength program</h1><p class="lead">Eight quick questions, and your lifting days get a program built for your goal, equipment and schedule.</p></div>' + spForm('wiz') +
    '<div class="wizfoot"><button type="button" class="btn ghost" data-act="wiz-back">Back</button><button class="btn primary" data-act="sp-wiz-next">Continue</button></div><button type="button" class="btn ghost block" style="margin-top:8px" data-act="sp-wiz-skip">Skip: use the standard sessions</button>';
};
ACTIONS['sp-wiz-next'] = function () { var z = App.wiz, d = spDraft('wiz'); if (!spValid(d)) { var e = $('#spErr'); if (e) e.textContent = 'Answer every question, and pick 2 to 6 days.'; return; } d.on = true; d.start = E.monday(App.today); z.profile.liftDays = Math.min(4, d.dows.length); if (d.sex === 'F' || d.sex === 'M') z.profile.sex = z.profile.sex || d.sex; z.step++; render(); window.scrollTo(0, 0); };
ACTIONS['sp-wiz-skip'] = function () { var z = App.wiz; delete z.profile.sp; z.step++; render(); window.scrollTo(0, 0); };

/* ---- weight suggestions: starting weights, double progression, deloads, bodyweight ladders ---- */
function spBodyLb() { var p = st().profile || {}, kg = +p.weightKg || (GX().who && +GX().who.weightKg) || 0; return kg ? kg * 2.2046 : 0; }
function spCtx() { var sp = (st().profile || {}).sp || {}; return { bwLb: spBodyLb(), sex: sp.sex, exp: sp.exp }; }
function spStartW(n) { return E.spStartLb(n, spCtx()); }
function ladderNext(n) { return E.ladderNext(n); }
var _ov37 = overload;
overload = function (n, rx, date, lp) {
  if (!/(\d+)\s*×\s*(\d+)\s*[–-]\s*(\d+)/.test(String(rx || ''))) return _ov37(n, rx, date, lp);
  var m = /(\d+)\s*×\s*(\d+)/.exec(rx), o = E.progNext(n, rx, liftHistory(n, date), lp, Object.assign(spCtx(), { weighted: needsWeight(n) }));
  o.plateau = _ov37(n, m[1] + '×' + m[2], date, 0).plateau; return o;
};
var _oh37 = overloadHTML;
overloadHTML = function (x, i, date, lp) {
  var h = _oh37(x, i, date, lp), o = overload(x.n, x.rx, date, lp);
  return o.next ? h.replace('</b>', '</b><button class="btn sm" data-act="sp-grad" data-arg="' + jattr({ i: i, from: x.orig || x.n, cur: x.n, to: o.next }) + '">Switch to ' + esc(o.next) + '</button>') : h;
};
ACTIONS['sp-grad'] = function (a) {
  Store.edit('subs', a.from, function (S) { S.subs = S.subs || {}; S.subs[a.from] = a.to; });
  if (App.wk && App.wk.ex[a.i]) { var x = App.wk.ex[a.i]; x.n = a.to; x.orig = a.from; x.sets.forEach(function (s) { if (!s.done) { s.w = ''; } }); App.wk.touched = true; wkSave(); }
  toast('Moved up to ' + a.to); keepScroll(render);
};

/* ---- coach: keep the program adjusting ---- */
function spFindings() {
  var out = [], prof = st().profile || {}, P = E.programOf(prof); if (!P || !App.plan) return out;
  var sp = P.sp, logs = st().logs || {}, ws = App.week ? App.week.start : E.monday(App.today), next = E.addD(ws, 7);
  var planned = [], from = E.addD(App.today, -14);
  App.plan.weeks.forEach(function (w) { w.days.forEach(function (d) { if (d.date >= from && d.date < App.today) d.parts.forEach(function (p) { if (p.prog) planned.push(d.date); }); }); });
  var done = planned.filter(function (d) { return logs[d] && logs[d].lift; }).length;
  if (planned.length >= 3 && done / planned.length < 0.6 && sp.days > 2) out.push({ id: 'spmiss-' + ws, pri: 4, tone: 'act', title: 'Fewer lifting days might fit better', seen: 'You did ' + done + ' of ' + planned.length + ' program sessions in the last two weeks.', change: 'Drop to ' + (sp.days - 1) + ' days a week. The program rebuilds around the days you keep.', plan: 'Your ' + DOWN[sp.dows[sp.dows.length - 1]] + ' session goes. Each remaining session still trains every key muscle at least twice a week across the program.', expect: 'Consistency beats ambition: a plan you complete builds more than one you half-finish.', act: { spDays: sp.days - 1 }, label: 'Drop to ' + (sp.days - 1) + ' days' });
  /* stalls across the program's weighted lifts */
  var stalls = [], grads = [];
  P.days.forEach(function (d) { d.blocks.forEach(function (b) { b.ex.forEach(function (x) { if (x.wu || !x.pat) return; var n = (st().subs || {})[x.n] || x.n, o = overload(n, x.rx[0], App.today, 0); if (o.kind === 'reset' || o.plateau) stalls.push(n); if (o.next) grads.push([x.n, n, o.next]); }); }); });
  if (stalls.length >= 2 && !(sp.deload && sp.deload >= ws)) out.push({ id: 'spstall-' + ws, pri: 3, tone: 'act', title: 'Several lifts have stalled', seen: esc(stalls.slice(0, 3).join(', ')) + (stalls.length > 3 ? ' and ' + (stalls.length - 3) + ' more' : '') + ' haven\'t moved for a few sessions.', change: 'Take a deload next week: one fewer set, about 10% lighter.', plan: 'Next week\'s sessions get lighter; the week after, you pick up where you left off.', expect: 'A short deload usually clears accumulated fatigue, and most lifters set new bests within two weeks of one.', act: { spDeload: next }, label: 'Deload next week' });
  if (grads.length) { var g = grads[0]; out.push({ id: 'spgrad-' + g[1].replace(/\W+/g, '').toLowerCase(), pri: 4, tone: 'good', title: 'Ready for a harder version', seen: 'You hit the top of the range on ' + g[1].toLowerCase() + '.', change: 'Switch to ' + g[2] + ' and restart at the bottom of the rep range.', plan: 'Only that exercise changes.', expect: 'Moving up a rung keeps the challenge high enough to keep getting stronger.', act: { sub: { from: g[0], to: g[2] } }, label: 'Switch to ' + g[2] }); }
  /* consistent and finding it easy: more volume */
  var wkDone = 0, rpes = [], wks = 0;
  App.plan.weeks.forEach(function (w) { if (w.start >= E.addD(ws, -21) && w.start < ws) { wks++; var pl = 0, dn = 0; w.days.forEach(function (d) { d.parts.forEach(function (p) { if (p.prog) { pl++; var l = logs[d.date] && logs[d.date].lift; if (l) { dn++; if (+l.rpe) rpes.push(+l.rpe); } } }); }); if (pl && dn >= pl) wkDone++; } });
  var avg = rpes.length ? rpes.reduce(function (a, b) { return a + b; }, 0) / rpes.length : null;
  if (wks >= 3 && wkDone >= 3 && avg != null && avg <= 7 && (+sp.vol || 0) < 2 && sp.goal !== 'endurance') out.push({ id: 'spup-' + ws, pri: 4, tone: 'good', title: 'Ready for a little more', seen: 'Every session done for three weeks, and they\'ve averaged ' + avg.toFixed(1) + '/10 effort.', change: 'Add one set to each main lift.', plan: 'Sessions run about 5 minutes longer. Accessories stay the same.', expect: 'More hard sets is the most reliable way to keep growing once you recover well, up to about 20 per muscle a week.', act: { spVol: (+sp.vol || 0) + 1 }, label: 'Add a set' });
  var since = sp.rotAt || sp.start; if (since && E.diffD(since, App.today) >= 70) out.push({ id: 'sprot-' + (sp.block || 0), pri: 5, tone: 'watch', title: 'Time for new exercise variations', seen: 'You\'ve run the same exercises for ' + Math.round(E.diffD(since, App.today) / 7) + ' weeks.', change: 'Swap in close cousins of your current lifts (same structure and rep ranges).', plan: 'Movement patterns stay the same; the exact exercises change.', expect: 'A fresh stimulus every 8–12 weeks helps avoid plateaus and keeps training interesting.', act: { spBlock: (+sp.block || 0) + 1 }, label: 'New variations' });
  return out;
}
var _pnF37 = pnFindings;
pnFindings = function () { var out = _pnF37(); try { out = out.concat(spFindings()); } catch (e) { console.warn(e); } return out; };
var _apply37 = applyCoachAct;
applyCoachAct = function (f) {
  var a = f.act || {};
  if ('spDays' in a) Store.edit('profile', null, function (S) { var sp = Object.assign({}, S.profile.sp); sp.dows = sp.dows.slice(0, a.spDays); sp.days = sp.dows.length; S.profile.sp = sp; S.profile.liftDays = Math.min(4, sp.days); });
  if ('spDeload' in a) Store.edit('profile', null, function (S) { S.profile.sp = Object.assign({}, S.profile.sp, { deload: a.spDeload }); });
  if ('spVol' in a) Store.edit('profile', null, function (S) { S.profile.sp = Object.assign({}, S.profile.sp, { vol: a.spVol }); });
  if ('spBlock' in a) Store.edit('profile', null, function (S) { S.profile.sp = Object.assign({}, S.profile.sp, { block: a.spBlock, rotAt: App.today }); });
  if (a.sub) Store.edit('subs', a.sub.from, function (S) { S.subs = S.subs || {}; S.subs[a.sub.from] = a.sub.to; });
  if ('spDays' in a || 'spDeload' in a || 'spVol' in a || 'spBlock' in a) recompute();
  return _apply37(f);
};

/* ---- menus ---- */
var _more37 = VIEWS.more;
VIEWS.more = function () { var h = _more37(), P = E.programOf(st().profile || {}), i = h.indexOf('<a href="#/features"'); if (i < 0) return h; return h.slice(0, i) + '<a href="' + (P ? '#/program' : '#/sp') + '">Strength program<span class="v">' + (P ? esc(P.name) : 'get one built') + '</span><span class="chev">›</span></a>' + h.slice(i); };
var _feat37 = VIEWS.features;
VIEWS.features = function () { var h = _feat37(), P = E.programOf(st().profile || {}); return h.replace('<section class="card stack"><h3>Show in the app</h3>', '<section class="card stack"><h3>Strength program</h3><p class="small muted">' + (P ? esc(P.name) + ', ' + P.sp.days + ' days a week.' : 'A program built from eight questions: your goal (muscle, lean, strength, power, endurance or health), focus (balanced, glutes & legs, upper body or legs), equipment and schedule.') + '</p><a class="btn sm' + (P ? '' : ' primary') + '" href="' + (P ? '#/program' : '#/sp') + '">' + (P ? 'See my program' : 'Take the questionnaire') + '</a></section><section class="card stack"><h3>Show in the app</h3>'); };

/* ---- cardio swaps: week review, day of, and mid-session ---- */
function swappable(p) { if (!p || p.type === 'strength' || p.type === 'rest' || p.type === 'race') return false; return !!(p.cardio || p.type === 'cross' || (isFitOnly() && E.isRun(p))); }
function swapRows(days) {
  var rows = []; days.forEach(function (d) { d.parts.forEach(function (p) { if (swappable(p)) rows.push({ d: d, p: p }); }); });
  return rows;
}
function swapBtn(d, p, label) { return '<button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'cswap', date: d.date, role: p.role || p.type }) + '">' + (label || 'Swap') + '</button>'; }
function partAt(date, role) { var d = dayOf(date); if (!d) return null; return d.parts.filter(function (p) { return (p.role || p.type) === role; })[0] || null; }
SHEETS.cswap = function (a) {
  var p = partAt(a.date, a.role), prof = st().profile || {}, mine = (prof.cardio || []).slice(), all = Object.keys(E.CARDIO), cur = (prof.cswap || {})[a.date + '|' + a.role];
  var order = mine.concat(all.filter(function (k) { return mine.indexOf(k) < 0; })), lbl = function (k) { return (CARDIO_OPTS.filter(function (o) { return o[0] === k; })[0] || [0, E.CARDIO[k].t])[1]; };
  var curK = p && p.ckind;
  return '<h2>Swap this session</h2><p class="small muted">' + (p ? esc(p.title) + ' · ' + (p.min ? p.min + ' min' : mi(p.mi) + ' mi') + ' on ' + fmtD(a.date) : '') + '. The new session keeps the same time and effort.</p>' +
    (mine.length ? '<div class="eyebrow">Your favorites</div>' : '') + '<div class="chips">' + order.map(function (k, i) { return (i === mine.length && mine.length ? '</div><div class="eyebrow" style="margin-top:8px">Everything else</div><div class="chips">' : '') + '<button class="chip" data-act="cs-set" data-arg="' + jattr({ date: a.date, role: a.role, k: k }) + '" aria-pressed="' + (curK === k) + '">' + esc(lbl(k)) + '</button>'; }).join('') + '</div>' +
    '<div class="btns" style="margin-top:10px">' + (cur ? '<button class="btn" data-act="cs-set" data-arg="' + jattr({ date: a.date, role: a.role, k: null }) + '">Back to the plan</button>' : '') + '<button class="btn ghost" data-act="sheet-close">Cancel</button></div>' +
    '<p class="tiny muted" style="margin-top:6px">Want this every week? Change your cardio list under More → Features.</p>';
};
ACTIONS['cs-set'] = function (a) {
  Store.edit('profile', null, function (S) { var c = Object.assign({}, S.profile.cswap || {}), k = a.date + '|' + a.role; if (a.k) c[k] = a.k; else delete c[k]; Object.keys(c).forEach(function (x) { if (x.slice(0, 10) < E.addD(App.today, -60)) delete c[x]; }); if (Object.keys(c).length) S.profile.cswap = c; else delete S.profile.cswap; });
  closeSheet(); recompute(); render(); toast(a.k ? 'Swapped' : 'Back to the plan');
};
function swapCard(rows, title, sub) {
  if (!rows.length) return '';
  return '<section class="card stack cswapcard"><h3>' + title + '</h3>' + (sub ? '<p class="small muted">' + sub + '</p>' : '') + rows.map(function (r) { return '<div class="spread"><span class="small"><b>' + esc(r.d.dow || fmtD(r.d.date, { weekday: 'short' })) + '</b> · ' + esc(r.p.title) + ' <span class="muted">' + (r.p.min ? r.p.min + ' min' : mi(r.p.mi) + ' mi') + (r.p.swapped ? ' · swapped' : '') + '</span></span>' + swapBtn(r.d, r.p) + '</div>'; }).join('') + '</section>';
}
var _plan37 = VIEWS.plan;
VIEWS.plan = function () {
  var h = _plan37.apply(this, arguments); if (!App.plan) return h;
  var sel = +((h.match(/<h2>Week (\d+) /) || [])[1]) || 1, w = App.plan.weeks[sel - 1]; if (!w) return h;
  var rows = swapRows(w.days.filter(function (d) { return d.date >= App.today; })); if (!rows.length) return h;
  var c = swapCard(rows, 'Swap cardio this week', 'Not in the mood for a machine, or the weather changed? Swap any session for another kind of cardio.');
  var i = h.indexOf('</section>', h.indexOf('class="pager"')); return i > 0 ? h.slice(0, i + 10) + c + h.slice(i + 10) : h + c;
};
var _day37 = VIEWS.day;
VIEWS.day = function () {
  var h = _day37.apply(this, arguments), date = App.args && App.args[0], d = date && dayOf(date); if (!d || date < App.today) return h;
  var rows = swapRows([d]); if (!rows.length) return h;
  var c = swapCard(rows, 'Swap it', 'Swap for another kind of cardio, same time and effort. Works mid-session too: log what you actually did.');
  var j = h.lastIndexOf('<section', h.indexOf('Day actions')); return j > 0 ? h.slice(0, j) + c + h.slice(j) : h + c;
};
var _today37 = VIEWS.today;
VIEWS.today = function () {
  var h = _today37(), d = dayOf(App.today); if (!d) return h;
  var rows = swapRows([d]).filter(function (r) { return !partDone(App.today, r.p); }); if (!rows.length) return h;
  var c = '<section class="card stack cswapcard"><div class="spread"><span class="small">Not feeling <b>' + esc(rows[0].p.title.toLowerCase()) + '</b> today?</span>' + swapBtn(rows[0].d, rows[0].p, 'Swap it') + '</div></section>';
  var i = h.indexOf('<section', h.indexOf('class="greet"') > 0 ? h.indexOf('TODAY') : 0);
  var k = h.indexOf('</section>', h.search(/class="(hero|card hero)/)); return k > 0 ? h.slice(0, k + 10) + c + h.slice(k + 10) : h + c;
};
App.p37 = { spFindings: spFindings, overload: function () { return overload.apply(null, arguments); }, spStartW: spStartW, ladderNext: ladderNext };
