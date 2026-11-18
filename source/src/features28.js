/* ================= Right after the daily check-in: what the coach makes of it, and what (if anything) to change today ================= */
var CI_PARTS = [['sleepQ', 'sleep', 5, true], ['feel', 'energy', 5, true], ['mood', 'mood', 5, true], ['motiv', 'motivation', 5, true], ['stress', 'stress', 3, false], ['sore', 'soreness', 2, false]];
function ciLowest(c) {
  var worst = null;
  CI_PARTS.forEach(function (p) { var v = c[p[0]]; if (v == null) return; var f = p[3] ? (v - 1) / (p[2] - 1) : p[0] === 'sore' ? 1 - v / 2 : 1 - (v - 1) / 2; if (!worst || f < worst.f) worst = { k: p[1], f: f }; });
  return worst && worst.f <= 0.34 ? worst.k : null;
}
function planEffect(action, p) {
  if (!p) return '';
  var m = p.mi || 0;
  return action === 'easy' ? 'Today\'s ' + p.title + ' becomes an easy run of about ' + mi(m * (p.type === 'long' ? 0.8 : 0.85)) + ' mi. The key session is skipped, not moved; the rest of the week stays.' :
    action === 'short' ? 'Today\'s run drops to about ' + mi(m * 0.7) + ' mi at easy effort. The rest of the week stays.' :
    action === 'rest' ? 'Today becomes a rest day; this week loses ' + mi(m) + ' mi. Nothing is added later to make it up.' :
    action === 'cross' || action === 'tread' ? 'Today\'s run becomes a brisk treadmill walk at a 4–8% incline: aerobic work with almost no impact.' : '';
}
function expectFor(action, why) {
  return action === 'rest' ? 'One day off costs no fitness. Expect to feel noticeably better within 24–48 hours.' :
    action === 'cross' || action === 'tread' ? 'The sore spot gets a break while you keep your aerobic base. Most niggles calm within 3–7 days when load drops early.' :
    action === 'easy' ? 'You keep the aerobic benefit without digging the hole deeper. If tomorrow\'s check-in is back to normal, the plan continues as written.' :
    action === 'short' ? 'A short, easy run often leaves you feeling better than none at all, and it keeps the week\'s rhythm.' : '';
}
function ciFeedback(c) {
  if (!App.plan) return;
  openSheet('cifb', { c: c || E.checkinFor(Store.state, App.today) });
}
SHEETS.cifb = function (a) {
  var c = a.c || {}, w = wellnessOf(c), N = wellnessNorm(), low = ciLowest(c), rd = App.rd || {}, rec = App.rec || {};
  var day = dayOf(App.today), todo = day ? day.parts.filter(function (p) { return p.type !== 'rest' && !partDone(App.today, p); }) : [], runP = todo.filter(E.isRun)[0];
  var h = '<h3>Coach</h3>';
  /* how you are */
  var line = 'Your check-in scores <b>' + w + '/100</b>' + (N ? ' (your normal is about ' + Math.round(N.mean) + ')' : '') + '. ';
  line += N && w < N.mean - 20 ? 'That\'s a clearly low day' + (low ? ', mostly ' + low : '') + '. ' : N && w > N.mean + 8 ? 'Better than usual. ' : low ? 'Your lowest score is ' + low + '. ' : 'Nothing stands out. ';
  if (rd.score != null) line += 'Readiness is <b>' + rd.score + '</b>' + (rd.reasons && rd.reasons.length ? ': ' + esc(rd.reasons.slice(0, 2).map(function (r) { return r.text.replace(/\.$/, ''); }).join('; ')) + '.' : '.');
  h += '<p class="small">' + line + '</p>';
  /* what to do today */
  var acts = (rec.actions || []).filter(function (x) { return x.action && x.action !== 'keep' && x.action !== 'sick' && x.action !== 'injured'; });
  var wellLow = N && w < N.mean - 20, hard = runP && (runP.type === 'speed' || runP.type === 'long');
  if (!acts.length && wellLow && runP) acts = hard ? [{ action: 'easy', label: 'Make it easy' }, { action: 'short', label: 'Shorten it' }] : [{ action: 'short', label: 'Shorten it' }];
  if (todo.length && acts.length) {
    var x0 = acts[0].action;
    h += '<div class="cfind act"><div class="cf-h"><span class="cf-tag">For today</span><b>' + esc(rec.headline && rec.headline !== 'Good to go' ? rec.headline : 'Take it easier today') + '</b></div>' +
      '<p class="small"><b>Why:</b> ' + esc(rec.body && rec.headline !== 'Good to go' ? rec.body : 'Your check-in is well below your normal even though your watch data looks fine. How you feel is data too.') + '</p>' +
      '<p class="small"><b>How your plan changes:</b> ' + esc(planEffect(x0, runP)) + '</p><p class="small"><b>What to expect:</b> ' + esc(expectFor(x0)) + '</p>' +
      '<div class="btns">' + acts.slice(0, 3).map(function (x, i) { return '<button class="btn sm ' + (i ? '' : 'primary') + '" data-act="cifb-do" data-arg="' + jattr({ action: x.action }) + '">' + esc(x.label) + '</button>'; }).join('') + '<button class="btn sm ghost" data-act="sheet-close">Keep the plan</button></div></div>';
  } else if (todo.length) {
    h += '<div class="cfind good"><div class="cf-h"><span class="cf-tag">For today</span><b>Good to go</b></div><p class="small">' + esc(todo.map(function (p) { return p.title + (p.mi ? ' ' + mi(p.mi) + ' mi' : ''); }).join(' + ')) + ' as planned. ' + (hard ? 'Warm up well and run the first rep by feel.' : 'Keep it conversational.') + '</p></div>';
  } else h += '<div class="cfind good"><div class="cf-h"><span class="cf-tag">Today</span><b>' + (day && day.parts.every(function (p) { return p.type === 'rest'; }) ? 'Rest day' : 'Training done') + '</b></div><p class="small">' + (day && day.parts.every(function (p) { return p.type === 'rest'; }) ? 'Recovery is training too. ' + ((st().profile || {}).injuryProne ? 'Ten minutes of the shin routine is the one job today.' : 'An easy walk is fine.') : 'Eat, hydrate and sleep: that\'s when the adaptation happens.') + '</p></div>';
  /* anything else the check-in triggered */
  var F = []; try { F = coachFindings().filter(function (f) { return f.tone === 'act'; }).slice(0, 2); } catch (e) { F = []; }
  F.forEach(function (f) { h += findingHTML(f, false); });
  if (c.note) h += '<p class="small muted" style="margin-top:10px">Noted: "' + esc(c.note) + '"' + (/\b(travel|trip|shift|busy|wedding|vacation)\b/i.test(c.note) ? ' <a href="#" data-act="sheet" data-arg="' + jattr({ sheet: 'life' }) + '">Plan around it</a>' : '') + '</p>';
  return h + '<div class="btns" style="margin-top:12px"><button class="btn ghost" data-act="sheet-close">Done</button></div>';
};
ACTIONS['cifb-do'] = function (a) {
  var day = dayOf(App.today), runP = day && day.parts.filter(E.isRun)[0];
  setOverride(App.today, a.action, 'from your check-in');
  coachSay('Changed today: ' + planEffect(a.action, runP) + '\n\nWhat to expect: ' + expectFor(a.action) + ' I\'ll look at tomorrow\'s check-in before deciding anything else.', []);
  closeSheet(); toast('Today adjusted');
};
App.p28 = { ciFeedback: ciFeedback };
