/* ================= The weekly check-in: the coach's review of your week, and your side of it ================= */
TITLES.weekly = 'Weekly check-in'; TABOF.weekly = 'coach';
function reviewWeekStart() { var ws = wkStart(App.today), last = E.addD(ws, 6); return App.today === last ? ws : E.addD(ws, -7); }
function seriesBefore(obj, d) { var ks = Object.keys(obj || {}).filter(function (k) { return k <= d; }).sort(); return ks.length ? obj[ks[ks.length - 1]] : null; }
function weekFacts(ws) {
  var we = E.addD(ws, 6), w = App.plan ? E.weekOf(App.plan, ws) : null, R = weekRunStats(ws), Rp = weekRunStats(E.addD(ws, -7));
  var planned = w ? w.tot.mi : 0, keys = [], keyDone = 0, runsP = 0, runsD = 0;
  if (w) w.days.forEach(function (d) { if (d.date > App.today) return; d.parts.forEach(function (p) { if (E.isRun(p)) { runsP++; if (partDone(d.date, p) && !(logOf(d.date).run || {}).skip) runsD++; } if (p.type === 'speed' || p.type === 'long') { keys.push(p.title); if (partDone(d.date, p) && !(logOf(d.date).run || {}).skip) keyDone++; } }); });
  var sec = 0; activities().forEach(function (a) { if (a.kind === 'run' && a.date >= ws && a.date <= we) sec += a.sec || 0; });
  var gd = (Store.garmin && Store.garmin.days) || {}, rdy = GX().readiness || {}, sleep = [], ready = [];
  for (var d = ws; d <= we && d <= App.today; d = E.addD(d, 1)) { if (gd[d] && gd[d].sleepH) sleep.push(gd[d].sleepH); if (rdy[d] && rdy[d].score != null) ready.push(rdy[d].score); }
  var wel = wellnessSeries().filter(function (x) { return x.d >= ws && x.d <= we; });
  return { ws: ws, we: we, w: w, planned: planned, R: R, Rp: Rp, keys: keys, keyDone: keyDone, runsP: runsP, runsD: runsD, sec: sec, sleep: avg(sleep), ready: avg(ready), wel: avg(wel.map(function (x) { return x.v; })), welN: wel.length, mono: monoAt(we > App.today ? App.today : we), Z: weekZones(ws), I: weekIntensity(ws), eff: weekEffort(ws) };
}
function weeklyHTML(ws) {
  var f = weekFacts(ws), nws = E.addD(ws, 7), nw = App.plan ? E.weekOf(App.plan, nws) : null, prof = st().profile || {}, prefs = st().prefs || {};
  var pct = f.planned ? f.R.mi / f.planned : null, sig = []; try { sig = fatigueSignals(); } catch (e) { sig = []; }
  var good = [], seen = {};
  /* what went well: the best line from each run's review, then the week's own wins */
  activities().filter(function (a) { return a.kind === 'run' && a.date >= ws && a.date <= f.we; }).forEach(function (a) { try { runReview(a).good.forEach(function (g) { if (g.cat && !seen[g.cat] && g.cat !== 'dist' && good.length < 4) { seen[g.cat] = 1; good.push(fmtD(a.date, { weekday: 'short' }) + ': ' + g.txt); } }); } catch (e) {} });
  if (pct != null && pct >= 0.9) good.unshift('You ran ' + Math.round(pct * 100) + '% of the planned miles. Consistency is what builds fitness.');
  if (f.keys.length && f.keyDone === f.keys.length) good.unshift('Every key session done (' + f.keys.join(', ').toLowerCase() + ').');
  if (f.Z.low != null && f.Z.low >= 0.78) good.push('Easy running stayed easy: ' + Math.round(f.Z.low * 100) + '% of your time in zones 1–2.');
  /* opening */
  var tone = pct == null ? 'Here\'s your week.' : pct >= 0.9 && !sig.length ? 'Strong week. You did the work and your body is handling it.' : pct >= 0.9 ? 'You got the work done. A couple of recovery signals need watching, which I\'ll cover below.' : pct >= 0.65 ? 'A solid week, even if not every session happened. Consistency over perfection.' : 'A lighter week than planned. That\'s okay: the plan rebuilds from what you actually ran, not what was written.';
  var h = '<div class="pagehead"><div class="eyebrow">Week ' + (f.w ? f.w.n : '') + ' · ' + fmtD(ws, { month: 'short', day: 'numeric' }) + '–' + fmtD(f.we, { month: 'short', day: 'numeric' }) + '</div><h1>Weekly check-in</h1><p>' + esc(tone) + '</p></div>';
  /* the numbers */
  var tile = function (l, v, s) { return '<div class="tile"><span>' + l + '</span><b>' + v + '</b><em>' + s + '</em></div>'; };
  h += '<div class="tiles">' + tile('Miles', mi(f.R.mi), 'of ' + mi(f.planned) + ' planned') + tile('Runs', f.runsD + '/' + f.runsP, 'done') + tile('Key sessions', f.keyDone + '/' + f.keys.length, f.keys.length ? 'done' : 'none planned') + tile('Long run', mi(f.R.long) + ' mi', f.R.share ? Math.round(f.R.share * 100) + '% of the week' : '') + tile('Time running', clockS(f.sec), f.R.climbFt ? f.R.climbFt + ' ft climbed' : '') + tile('Avg readiness', f.ready != null ? Math.round(f.ready) : '–', f.sleep ? mi(f.sleep) + ' h sleep a night' : '') + '</div>';
  if (good.length) h += '<section class="card"><h3>What went well</h3><ul class="plain small wkl">' + good.slice(0, 5).map(function (g) { return '<li>✓ ' + esc(g) + '</li>'; }).join('') + '</ul></section>';
  /* training */
  var ramp = f.Rp.mi >= 3 ? (f.R.mi - f.Rp.mi) / f.Rp.mi : null;
  var tr = [];
  tr.push('Miles ' + mi(f.R.mi) + (ramp != null ? ' (' + (ramp >= 0 ? '+' : '') + Math.round(ramp * 100) + '% on the week before)' : '') + '.');
  if (f.Z.low != null) tr.push(Math.round(f.Z.low * 100) + '% of running time easy, ' + Math.round((f.Z.high || 0) * 100) + '% hard' + (f.Z.low < 0.7 ? ': easy runs are drifting hard.' : '.'));
  if (f.I.tot) tr.push(mi(f.I.hard) + ' mi at threshold pace or faster' + (f.I.M ? ', ' + mi(f.I.M) + ' at marathon pace' : '') + '.');
  if (f.mono.load) tr.push('Monotony ' + f.mono.mono.toFixed(1) + (f.mono.mono >= 2 ? ' (too samey: needs a real easy day)' : f.mono.mono >= 1.5 ? ' (getting samey)' : ' (good contrast between days)') + '.');
  if (f.eff.rated >= 2 && f.eff.garmin) tr.push('Effort ' + f.eff.srpe + ' points against Garmin load ' + f.eff.garmin + '.');
  h += '<section class="card"><h3>How training is going</h3><ul class="plain small wkl">' + tr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>';
  /* fitness */
  var fit = [], fo = (Store.garmin && Store.garmin.fitness) || {}, vo = fo.vo2 || {}, v0 = seriesBefore(vo, E.addD(f.we, -28)), v1 = seriesBefore(vo, f.we);
  if (v1) fit.push('VO2 max ' + v1 + (v0 && v0 !== v1 ? ' (' + (v1 > v0 ? '+' : '') + Math.round((v1 - v0) * 10) / 10 + ' in 4 weeks)' : '') + '.');
  var lt = GX().ltHistory || {}, l1 = seriesBefore(lt, f.we), l0 = seriesBefore(lt, E.addD(f.we, -28));
  if (l1 && l1.pace) fit.push('Threshold ' + pace(l1.pace) + '/mi' + (l0 && l0.pace && l0.pace !== l1.pace ? ' (' + (l1.pace < l0.pace ? Math.round(l0.pace - l1.pace) + ' s/mi faster' : Math.round(l1.pace - l0.pace) + ' s/mi slower') + ' than 4 weeks ago)' : '') + '.');
  var c1 = critSpeed(f.we), c0 = critSpeed(E.addD(f.we, -28)); if (c1) fit.push('Critical speed ' + pace(c1.pace) + '/mi' + (c0 ? ' (' + (c1.pace < c0.pace - 2 ? Math.round(c0.pace - c1.pace) + ' s/mi faster' : c1.pace > c0.pace + 2 ? 'slower' : 'steady') + ' over 4 weeks)' : '') + '.');
  var D = durabilitySeries().filter(function (x) { return x.d <= f.we; }); if (D.length) fit.push('Last long-run drift ' + D[D.length - 1].v + '%' + (D[D.length - 1].v <= 5 ? ': strong.' : '.'));
  var ev = App.plan && (App.plan.aEvents || []).filter(function (e) { return e.date >= App.today; })[0];
  if (ev && App.an && App.an.vNow) { var pr = E.predict(App.an.vNow, E.distOf(ev).mi), g = E.parseClock(ev.goal); fit.push(esc(ev.name || 'Next race') + ': predicted ' + E.clock(Math.round(pr)) + (g ? (pr <= g ? ', ahead of your ' + ev.goal + ' goal.' : ', ' + E.clock(Math.round(pr - g)) + ' off your ' + ev.goal + ' goal with ' + plural(Math.ceil(E.diffD(App.today, ev.date) / 7), 'week') + ' to go.') : '.')); }
  if (fit.length) h += '<section class="card"><h3>Fitness</h3><ul class="plain small wkl">' + fit.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></section>';
  /* form */
  try {
    var FR = formRuns(56), wk = FR.filter(function (r) { return r.date >= ws && r.date <= f.we; }), before = FR.filter(function (r) { return r.date < ws; });
    if (wk.length) {
      var fl = [], cadN = avg(wk.map(function (r) { return r.cad - r.x.cad; })), cadB = avg(before.map(function (r) { return r.cad - r.x.cad; })), vrN = avg(wk.map(function (r) { return r.vr; })), vrB = avg(before.map(function (r) { return r.vr; }));
      fl.push('Cadence ' + Math.round(avg(wk.map(function (r) { return r.cad; }))) + ' spm' + (cadB != null ? ' (' + (cadN - cadB > 1 ? 'quicker than' : cadN - cadB < -1 ? 'slower than' : 'same as') + ' your recent runs at the same pace)' : '') + '.');
      if (vrN) fl.push('Vertical ratio ' + vrN.toFixed(1) + '%' + (vrB ? (vrN < vrB - 0.2 ? ', less bounce than before.' : vrN > vrB + 0.2 ? ', a little more bounce than before.' : ', steady.') : '.'));
      var ff = prefs.formFocus; if (ff && FORM_FOCI[ff.k]) fl.push('Focus: ' + FORM_FOCI[ff.k].name.toLowerCase() + ', week ' + (Math.floor(E.diffD(ff.from, App.today) / 7) + 1) + '. Keep the cue: "' + FORM_FOCI[ff.k].cue + '"');
      h += '<section class="card"><div class="spread"><h3>Form</h3><a class="small" href="#/form">Running form ›</a></div><ul class="plain small wkl">' + fl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>';
    }
  } catch (e) {}
  /* recovery */
  var rec = [], H = hrvStability();
  if (H) rec.push('HRV 7-day average ' + Math.round(H.now.mean) + ' ms (normal ' + Math.round(H.normLo) + '–' + Math.round(H.normHi) + ')' + (H.suppressed ? ': suppressed.' : H.unsettled ? ': unsettled.' : '.'));
  if (f.sleep) rec.push(mi(f.sleep) + ' h of sleep a night on average.');
  if (f.welN) rec.push('Check-ins averaged ' + Math.round(f.wel) + '/100 over ' + plural(f.welN, 'day') + '.');
  var pains = (st().checkins || []).filter(function (c) { return c.date >= ws && c.date <= f.we && c.pain; }); if (pains.length) rec.push('Pain reported on ' + plural(pains.length, 'day') + ' (' + pains.map(function (c) { return c.where || 'unspecified'; }).join(', ') + ').');
  if (rec.length) h += '<section class="card"><h3>Recovery</h3><ul class="plain small wkl">' + rec.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></section>';
  /* follow-up on changes we made */
  var acc = prefs.cfAcc || {}, recent = Object.keys(acc).filter(function (k) { var a = acc[k]; return a.at >= E.addD(ws, -7) && a.at <= f.we; });
  if (recent.length) {
    var now = snapshotFor('x');
    h += '<section class="card"><h3>The changes we made</h3>' + recent.map(function (k) { var a = acc[k], b = a.before || {}, res = [];
      if (b.mono != null && now.mono != null) res.push('monotony ' + b.mono + ' → ' + now.mono);
      if (b.hrv != null && now.hrv != null) res.push('HRV ' + b.hrv + ' → ' + now.hrv + ' ms');
      if (b.easy != null && now.easy != null && /easycap/.test(k)) res.push('easy share ' + b.easy + '% → ' + now.easy + '%');
      if (b.drift != null && now.drift != null && /fuel/.test(k)) res.push('long-run drift ' + b.drift + '% → ' + now.drift + '%');
      if (b.well != null && now.well != null) res.push('check-in score ' + b.well + ' → ' + now.well);
      return '<p class="small"><b>' + esc(a.title) + '</b> (' + fmtD(a.at, { weekday: 'short' }) + '): ' + esc(a.change) + (res.length ? '<br><span class="muted">Since then: ' + esc(res.join(', ')) + '.</span>' : '') + '</p>'; }).join('') + '</section>';
  }
  /* what I'm noticing */
  var F = []; try { F = coachFindings(); } catch (e) { F = []; }
  h += '<section class="card"><h3>What I\'m noticing</h3>' + (F.length ? F.slice(0, 5).map(function (x) { return findingHTML(x, false); }).join('') : '<p class="small muted" style="margin-top:6px">Nothing worrying in your load, recovery or running data.</p>') + '</section>';
  /* next week */
  var nwMi = nw ? nw.tot.mi : 0, lighter = sig.length >= 2 || (f.welN >= 3 && wellnessNorm() && f.wel < wellnessNorm().mean - 12), already = nw && (st().status || {})[nw.start];
  var nxt = '<section class="card nextwk"><h3>Next week</h3>';
  if (!nw) nxt += '<p class="small muted">Your plan ends here.</p>';
  else if (lighter && !already) nxt += '<div class="cfind act"><div class="cf-h"><span class="cf-tag">Recommendation</span><b>Make next week lighter</b></div><p class="small"><b>Why:</b> ' + esc(sig.length ? sig.map(function (s) { return s.t; }).join('; ') : 'your check-ins this week ran well below your normal') + '.</p><p class="small"><b>How your plan changes:</b> Week ' + nw.n + ' drops from ' + mi(nwMi) + ' to about ' + mi(nwMi * 0.7) + ' mi. Key sessions stay but shorter; extras shrink. The week after returns to the plan.</p><p class="small"><b>What to expect:</b> You absorb the last few weeks instead of stacking more on top. Most runners come out of a lighter week feeling sharper, with HRV and check-ins back to normal.</p><div class="btns"><button class="btn sm primary" data-act="wk-light" data-arg="' + jattr({ w: nw.start }) + '">Make it lighter</button></div></div>';
  else nxt += '<p class="small"><b>No changes needed.</b> ' + (pct != null && pct < 0.7 ? 'You ran less than planned, so the plan builds next week from what you actually ran, not what was written: no catching up.' : 'Your load, recovery and check-ins support the plan as written.') + ' Week ' + nw.n + ': ' + mi(nwMi) + ' mi, ' + plural(nw.tot.runs, 'run') + (nw.days.some(function (d) { return d.parts.some(function (p) { return p.type === 'long'; }); }) ? ', long run ' + mi(Math.max.apply(null, nw.days.map(function (d) { return Math.max.apply(null, d.parts.filter(function (p) { return p.type === 'long'; }).map(function (p) { return p.mi; }).concat([0])); }))) + ' mi' : '') + '.</p>';
  if (nw) nxt += '<div class="btns"><a class="btn sm" href="#/preview/' + nw.start + '">See and arrange next week</a></div>';
  h += nxt + '</section>';
  /* your turn */
  var me = (st().weekly || {})[ws] || {};
  h += '<section class="card"><h3>Your turn</h3><p class="small muted">How did the week feel? Anything coming up I should plan around?</p><div class="chips" id="wk-feel">' + [[1, 'Rough'], [2, 'Hard'], [3, 'OK'], [4, 'Good'], [5, 'Great']].map(function (o) { return '<button type="button" class="chip" data-act="wk-feel" data-arg="' + jattr({ v: o[0] }) + '" aria-pressed="' + (me.feel === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>' +
    '<label class="f" style="margin-top:8px"><input class="i" id="wk-note" placeholder="e.g. night shifts Thu–Sat, legs heavy all week" value="' + esc(me.note || '') + '"></label><div class="btns"><button class="btn primary" data-act="wk-save" data-arg="' + jattr({ ws: ws }) + '">' + (me.at ? 'Update' : 'Send to coach') + '</button></div><div id="wk-reply">' + (me.reply ? '<div class="cfind ' + (me.replyTone || '') + '"><p class="small">' + esc(me.reply) + '</p></div>' : '') + '</div></section>';
  return h;
}
VIEWS.weekly = function () { if (!App.plan) return setupNeeded(); var ws = App.args[0] && /^\d{4}-\d\d-\d\d$/.test(App.args[0]) ? App.args[0] : reviewWeekStart(); return weeklyHTML(ws); };
ACTIONS['wk-feel'] = function (a) { App.ui.wkFeel = a.v; $$('#wk-feel .chip').forEach(function (b) { b.setAttribute('aria-pressed', String(JSON.parse(b.dataset.arg).v === a.v)); }); };
ACTIONS['wk-light'] = function (a) { Store.edit('status', a.w, function (S) { S.status = S.status || {}; S.status[a.w] = { kind: 'busy', level: 'light' }; }); coachSay('Next week is now a lighter week (about 70% of the planned miles, key sessions kept but shorter). The week after goes back to the plan. I\'ll check your HRV and check-ins at the next weekly check-in.', [{ label: 'See next week', act: { nav: '#/preview/' + a.w } }]); toast('Next week is lighter'); };
ACTIONS['wk-save'] = function (a) {
  var me = (st().weekly || {})[a.ws] || {}, feel = App.ui.wkFeel || me.feel || null, note = $('#wk-note').value.trim();
  if (!feel && !note) { toast('Pick how the week felt'); return; }
  var sig = []; try { sig = fatigueSignals(); } catch (e) { sig = []; }
  var reply, tone = '';
  if (feel && feel <= 2 && sig.length) { reply = 'Thanks for telling me. Your data agrees: ' + sig.map(function (s) { return s.t; }).join('; ') + '. I\'d take the lighter week above. Fitness comes from training you recover from, and one easier week costs nothing.'; tone = 'act'; }
  else if (feel && feel <= 2) { reply = 'Thanks. Your data looks okay, so this may be life load more than training load. Keep next week as planned, but run the easy days by feel and tell me in your daily check-ins if it doesn\'t lift by midweek.'; tone = 'watch'; }
  else if (feel && feel >= 4) { reply = 'Love that. Feeling good while the work goes up is exactly the pattern we want. Keep sleep and easy days protected and we keep building.'; tone = 'good'; }
  else reply = 'Got it. A steady week. Next week continues the plan.';
  if (/\b(shift|night|travel|trip|busy|wedding|vacation|sick|ill)\b/i.test(note)) reply += ' You mentioned something coming up: tap "Plan around it" and I\'ll move sessions to the days that work.';
  Store.edit('weekly', a.ws, function (S) { S.weekly = S.weekly || {}; S.weekly[a.ws] = { feel: feel, note: note, at: new Date().toISOString(), reply: reply, replyTone: tone }; });
  coachSay('Weekly check-in: ' + (feel ? ['', 'rough', 'hard', 'okay', 'good', 'great'][feel] + ' week' : '') + (note ? ' — "' + note + '"' : '') + '\n\n' + reply, /\b(shift|night|travel|trip|busy|wedding|vacation)\b/i.test(note) ? [{ label: 'Plan around it', act: { sheet: 'life' } }] : []);
  var el = $('#wk-reply'); if (el) el.innerHTML = '<div class="cfind ' + tone + '"><p class="small">' + esc(reply) + '</p></div>' + (/\b(shift|night|travel|trip|busy|wedding|vacation)\b/i.test(note) ? '<div class="btns"><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'life' }) + '">Plan around it</button></div>' : '');
  toast('Sent to your coach');
};
/* Today: on the last evening of the week (and the first day of the next), the check-in is waiting */
var _today29 = VIEWS.today;
VIEWS.today = function () {
  var h = _today29(); if (!App.plan || !st().profile) return h;
  var ws = wkStart(App.today), last = E.addD(ws, 6), show = (App.today === last && new Date().getHours() >= 15) || App.today === ws || App.today === E.addD(ws, 1), rws = reviewWeekStart();
  if (!show || ((st().weekly || {})[rws] || {}).at) return h;
  var f = null; try { f = weekFacts(rws); } catch (e) { f = null; }
  var c = '<a class="card wkcard" href="#/weekly"><div class="eyebrow">Weekly check-in</div><h3>' + (f ? 'Week ' + (f.w ? f.w.n : '') + ': ' + mi(f.R.mi) + ' of ' + mi(f.planned) + ' mi' : 'Your week in review') + '</h3><p class="small muted">What went well, how your fitness and form are moving, what I\'m noticing, and whether next week needs changes.</p><span class="btn sm primary" style="margin-top:8px">Open check-in</span></a>';
  h = h.replace(/<a class="card reviewcard"[\s\S]*?<\/a>/, '');   /* next week's preview is inside the check-in */
  var g = h.indexOf('class="greet"'), i = g >= 0 ? h.indexOf('</h1></div>', g) : -1;
  return i > 0 ? h.slice(0, i + 11) + c + h.slice(i + 11) : c + h;
};
App.p29 = { weekFacts: weekFacts, reviewWeekStart: reviewWeekStart };
