/* ================= Intensity by weekly mileage (from the research review, Nov 2026) =================
   Under ~30 mi a week: most running easy by effort (talk test, RPE 2–3) rather than a strict heart-rate ceiling,
   with one threshold-type session a week (steady/tempo/cruise) plus strides or hills. Threshold-focused training gave
   similar gains in less time in recreational runners (Festa 2020); mostly-easy training is not harmful (Muñoz 2014).
   30+ mi a week: keep the mostly-easy pattern with the plan's varied quality sessions. */
function mpwBand() { var m = recentMpw(); return m == null ? null : { mpw: Math.round(m * 10) / 10, low: m < 30 }; }
function mixFindings() {
  var out = [], p = st().profile || {}, prefs = st().prefs || {}, b = mpwBand(), mix = p.ctl && p.ctl.mix; if (!b || !App.plan) return out;
  if (b.low && !mix && !prefs.mixAsked) out.push({ id: 'mixlow', pri: 3, tone: 'act', title: 'Make your weekly workout a threshold session', seen: 'You\'re averaging ' + b.mpw + ' mi a week. At this volume, studies of recreational runners found steady and tempo-type sessions give similar gains to faster intervals in less training time, and easy running isn\'t holding you back.', change: 'Swap fartleks and fast intervals for steady, tempo and cruise-interval sessions. Keep strides and hills, and keep easy days truly easy by effort.', plan: 'One quality session a week becomes threshold-style. Easy runs and long runs don\'t change. You can switch back in Plan settings.', expect: 'Threshold pace and your race predictions improve steadily, with less fatigue than hard intervals. Once you\'re above about 30 mi a week, I\'ll suggest adding variety back.', act: { mix: 'threshold' }, label: 'Switch to threshold sessions' });
  if (!b.low && mix === 'threshold' && prefs.mixByCoach) { var W = lastWeeks(4).map(weekRunStats), hi = W.filter(function (w) { return w.mi >= 30; }).length; if (hi >= 3) out.push({ id: 'mixhigh', pri: 3, tone: 'act', title: 'Ready for more variety', seen: 'You\'ve run 30+ mi in ' + hi + ' of the last 4 weeks.', change: 'Go back to the plan\'s mix: mostly easy miles, plus fartleks, intervals and hills alongside threshold work.', plan: 'Quality sessions rotate again; easy volume stays the main ingredient.', expect: 'At higher volume, the extra easy miles carry your aerobic fitness, and the varied sessions sharpen speed and economy.', act: { mix: null }, label: 'Go back to the full mix' }); }
  return out;
}
var _pnF35 = pnFindings;
pnFindings = function () { var out = _pnF35(); try { out = out.concat(mixFindings()); } catch (e) { console.warn(e); } return out; };
var _apply35 = applyCoachAct;
applyCoachAct = function (f) {
  var a = f.act || {};
  if ('mix' in a) {
    Store.editMany([['profile', null], ['prefs', 'mixByCoach'], ['prefs', 'mixAsked']], function (S) { var c = Object.assign({}, S.profile.ctl || {}); if (a.mix) c.mix = a.mix; else delete c.mix; if (Object.keys(c).length) S.profile.ctl = c; else delete S.profile.ctl; S.prefs = S.prefs || {}; S.prefs.mixByCoach = !!a.mix; S.prefs.mixAsked = true; });
    if (typeof recompute === 'function') recompute();
  }
  return _apply35(f);
};
var _cfNo35 = ACTIONS['cf-no'];
ACTIONS['cf-no'] = function (a) { if (/^mixlow/.test(a.id)) Store.edit('prefs', 'mixAsked', function (S) { S.prefs = S.prefs || {}; S.prefs.mixAsked = true; }); _cfNo35(a); };

/* easy runs by effort under 30 mi a week: heart rate is a guide, not a hard stop */
var _crl35 = coachRunLines;
coachRunLines = function (x, date) {
  var h = _crl35(x, date), b = mpwBand();
  if (b && b.low) h = h.replace(/<p class="small capline">Keep heart rate under <b>(\d+) bpm<\/b>\. Slow down or walk hills to stay there\.<\/p>/, function (m, bpm) { return '<p class="small capline">Easy by feel: <b>RPE 2–3</b>, full sentences. Heart rate around <b>' + bpm + ' bpm</b> is a guide, not a hard stop. No need to walk hills to stay under it.</p>'; });
  if (x && x.spikeCap && !partDone(date, x)) h += '<p class="small capline"><b>Capped at ' + x.mi + ' mi</b> (planned ' + x.spikeCap.from + '): no run more than 10% longer than your longest in the last 30 days (' + x.spikeCap.longest + ' mi). A single run that jumps past that was the clearest injury signal in a 5,200-runner study. <a href="#" data-act="spike-off">Turn this guard off</a></p>';
  return h;
};
ACTIONS['spike-off'] = function () {
  ASK({ title: 'Turn off the single-run guard?', text: 'Runs will no longer be capped at 10% over your longest run in the last 30 days. You can turn it back on in Plan settings.', ok: 'Turn it off', cancel: 'Keep it' }, function () {
    Store.edit('prefs', 'spikeCap', function (S) { S.prefs = S.prefs || {}; S.prefs.spikeCap = false; }); toast('Guard off'); recompute(); render();
  });
};
/* Plan settings: switches for the guard */
var _planctl35 = VIEWS.planctl;
if (_planctl35) VIEWS.planctl = function () {
  var h = _planctl35(), on = (st().prefs || {}).spikeCap !== false;
  return h + '<section class="card stack"><h3>Single-run guard</h3><label class="check"><input type="checkbox" id="spk-on"' + (on ? ' checked' : '') + '> <span><b>Cap each run at 10% over my longest in the last 30 days</b><br><span class="small muted">Applies to easy and long runs in the next two weeks. Based on a 2025 study of 5,200 runners, where one-off long jumps, not weekly mileage, predicted injury.</span></span></label></section>';
};
document.addEventListener('change', function (e) { if (e.target && e.target.id === 'spk-on') { var v = e.target.checked; Store.edit('prefs', 'spikeCap', function (S) { S.prefs = S.prefs || {}; if (v) delete S.prefs.spikeCap; else S.prefs.spikeCap = false; }); recompute(); toast(v ? 'Guard on' : 'Guard off'); } });
App.p35 = { mixFindings: mixFindings, mpwBand: mpwBand };
