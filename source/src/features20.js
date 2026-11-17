/* ================= Running form (one focus at a time, judged against your height, weight and pace)
   and the completed-run page: what went well, one thing to improve, and charts from Garmin ================= */

/* ---------- biometrics ---------- */
function bio() {
  var p = st().profile || {}, w = GX().who || {};
  var h = +p.heightCm || +w.h || null, kg = +p.weightKg || +w.kg || null;
  return { h: h, kg: kg, bmi: h && kg ? kg / Math.pow(h / 100, 2) : null, hSrc: p.heightCm ? 'you' : w.h ? 'garmin' : null, injury: !!p.injuryProne };
}
function ftIn(cm) { var t = Math.round(cm / 2.54); return Math.floor(t / 12) + '′' + (t % 12) + '″'; }
function inch(cm, d) { return (cm / 2.54).toFixed(d == null ? 1 : d); }
function lbOf(kg) { return Math.round(kg * 2.20462); }
/* height and weight fields, shared by the runner-type sheet and the biometrics sheet */
function bodyFields(pre, noWeight) {
  var b = bio(), hc = b.h ? Math.round(b.h / 2.54) : 0, opts = '<option value="">Not set</option>';
  for (var i = 56; i <= 82; i++) opts += '<option value="' + i + '"' + (i === hc ? ' selected' : '') + '>' + Math.floor(i / 12) + '′ ' + (i % 12) + '″</option>';
  return '<div class="grid2"><label class="f">Height<select class="i" id="' + pre + '-h">' + opts + '</select></label>' + (noWeight ? '' : '<label class="f">Weight (lb)<input class="i" id="' + pre + '-w" type="number" inputmode="decimal" min="70" max="400" value="' + (b.kg ? lbOf(b.kg) : '') + '" placeholder="e.g. 165"></label>') + '</div>';
}
function readBody(pre) { var h = $('#' + pre + '-h'), w = $('#' + pre + '-w'); if (!h) return null; var hi = +h.value, lb = w ? +w.value : 0; return { heightCm: hi ? Math.round(hi * 2.54 * 10) / 10 : null, weightKg: lb >= 70 && lb <= 400 ? Math.round(lb / 2.20462 * 10) / 10 : null }; }
function saveBody(v) { if (!v) return; Store.edit('profile', null, function (S) { if (!S.profile) return; if (v.heightCm) S.profile.heightCm = v.heightCm; if (v.weightKg) S.profile.weightKg = v.weightKg; }); }
SHEETS.bio = function () {
  var w = GX().who || {};
  return '<h3>Height and weight</h3><p class="small muted">Taller runners take longer steps and bounce a little higher; heavier runners spend a little longer on the ground. Your form is compared with what\'s typical for your body at your pace.' + (w.h ? ' Filled in from Garmin; change it if it\'s off.' : '') + '</p>' + bodyFields('bio') +
    '<div class="btns"><button class="btn primary" data-act="bio-save">Save</button><button class="btn ghost" data-act="sheet-close">Cancel</button></div>';
};
ACTIONS['bio-save'] = function () { saveBody(readBody('bio')); closeSheet(); toast('Saved'); };
/* the runner-type sheet's "About you" gets height and weight too */
var _aboutYou20 = aboutYouFields;
aboutYouFields = function (p, pre) { return _aboutYou20(p, pre) + (pre === 'rt' ? bodyFields('rtb') : ''); };
var _rtSave20 = ACTIONS['rt-save'];
ACTIONS['rt-save'] = function () { var v = readBody('rtb'); var r = _rtSave20.apply(this, arguments); if (v && !$('.askd')) saveBody(v); return r; };
/* height and weight from Garmin fill in a profile that has none, once */
var _bodySynced = false;
var _todayBody20 = VIEWS.today;
VIEWS.today = function () {
  var p = st().profile, w = GX().who;
  if (!_bodySynced && p && w && ((!p.heightCm && w.h) || (!p.weightKg && w.kg))) { _bodySynced = true; setTimeout(function () { Store.edit('profile', null, function (S) { if (!S.profile) return; if (!S.profile.heightCm && w.h) S.profile.heightCm = w.h; if (!S.profile.weightKg && w.kg) S.profile.weightKg = w.kg; }); }, 80); }
  return _todayBody20();
};

/* ---------- what's typical for your body at a given speed (m/s) ----------
   Cadence rises with speed and falls with height (longer legs, longer steps). Ground contact shortens with speed and is a little longer for heavier
   runners. Vertical oscillation scales with height; vertical ratio (bounce per step length) is already scaled, and under about 8.6% is efficient. */
function formExpect(v, b) {
  var h = b.h || 175, bmi = b.bmi || 23;
  var cad = 158 + 10 * (v - 2.9) - 0.3 * (h - 175);
  return { cad: cad, gct: 300 - 45 * (v - 2.9) + 1.5 * Math.max(0, bmi - 23), vo: 0.054 * h + 0.6 * (v - 2.9), vr: 8.6, sl: v * 6000 / cad };
}
function formRuns(days) {
  var g = Store.garmin, t = App.today, b = bio(), out = []; if (!g || !g.activities) return out;
  g.activities.forEach(function (a) {
    if (!a.run || !a.cadence || !(a.distM >= 1600) || a.date > t || E.diffD(a.date, t) > (days || 56)) return;
    var v = a.distM / (a.movS || a.durS || 1); if (v < 1.6 || v > 7) return;
    var x = formExpect(v, b);
    out.push({ date: a.date, id: a.id, v: v, tread: isTread(a), cad: a.cadence, gct: a.gct || null, vo: a.vOsc || null, vr: a.vRatio || null, sl: a.stride || null, x: x });
  });
  return out.sort(function (p, q) { return p.date < q.date ? -1 : 1; });
}
/* the last 8 weeks against what's typical for your body, each run judged at its own pace */
function formSummary() {
  var runs = formRuns(56), b = bio(); if (runs.length < 3) return { n: runs.length, runs: runs, b: b };
  var last = runs.slice(-8), mv = median(last.map(function (r) { return r.v; })), x = formExpect(mv, b);
  var d = function (k) { var rs = last.filter(function (r) { return r[k] != null; }); return rs.length >= 3 ? { now: median(rs.map(function (r) { return r[k]; })), dev: median(rs.map(function (r) { return r[k] - r.x[k]; })), n: rs.length } : null; };
  return { n: runs.length, runs: runs, b: b, v: mv, x: x, cad: d('cad'), gct: d('gct'), vo: d('vo'), vr: d('vr'), sl: d('sl'), dyn: last.some(function (r) { return r.gct; }), treadOnly: last.every(function (r) { return r.tread; }) };
}
/* the three things worth working on, in the order they matter for you */
var FORM_FOCI = {
  cadence: { name: 'Quicker, lighter steps', metric: 'cad', cue: 'Quick, light feet that land under your hips.',
    why: function (s) { var tg = cadTarget(s); return 'Your cadence is about ' + Math.round(s.cad.now) + ' steps a minute, ' + Math.round(-s.cad.dev) + ' below what\'s typical for someone ' + ftIn(s.b.h || 175) + ' at your usual pace' + (s.sl ? ', so each step is long (' + inch(s.sl.now) + ' in, ' + Math.round(s.sl.now / (s.b.h || 175) * 100) + '% of your height)' : '') + '. Long, slow steps usually mean landing ahead of your body, which brakes you and loads the shins and knees. Raising cadence about 5% cuts that load noticeably.' + (s.b.injury ? ' With your shin history, this is the most useful change you can make.' : '') + (tg ? '' : ''); },
    practice: function (s) { var tg = cadTarget(s); return ['Set the watch metronome to <b>' + tg + ' spm</b> (Run settings → Metronome) and run with it for 1 minute out of every 5 on easy runs. Build to the whole run over 2–3 weeks.', 'Keep the pace the same: the steps get shorter, not faster.', '4–6 relaxed strides after easy runs twice a week: 20 seconds, quick and light.']; },
    target: function (s) { return 'About ' + cadTarget(s) + ' spm on easy runs (+5%). Not more for now: bigger jumps move the load to your calves and Achilles.'; } },
  bounce: { name: 'Run tall, travel forward', metric: 'vr', cue: 'Push the ground back, not down. Head level, run tall.',
    why: function (s) { return 'You bounce a lot for your stride: vertical ratio ' + (s.vr ? s.vr.now.toFixed(1) + '%' : '') + (s.vo ? ' (' + inch(s.vo.now) + ' in of bounce, typical for your height is about ' + inch(s.x.vo) + ' in)' : '') + '. Energy that goes up isn\'t moving you forward, and every bounce is a bigger landing.'; },
    practice: function () { return ['On easy runs, 3–4 times per run, spend a minute keeping your head at the same height, like there\'s a low ceiling.', 'A slight lean from the ankles (not the waist), arms swinging back, not across.', 'Twice a week: 2 × 20 m of quick skips and 2 × 20 m of A-skips before a run.']; },
    target: function (s) { return 'Vertical ratio under 8.6%' + (s.vo ? ', bounce near ' + inch(s.x.vo) + ' in' : '') + '.'; } },
  contact: { name: 'Springier feet', metric: 'gct', cue: 'Off the ground quickly, like it\'s hot.',
    why: function (s) { return 'Your feet stay on the ground about ' + Math.round(s.gct.now) + ' ms per step, longer than typical for your pace and build (about ' + Math.round(s.x.gct) + ' ms). Long contact usually means less spring from the calves and feet, which costs energy late in runs.'; },
    practice: function () { return ['Twice a week before a run: 2 × 20 pogo hops (small, stiff ankles) and 2 × 30 seconds of jump rope.', '3 × 15 slow calf raises off a step after runs, then the same on one leg as it gets easy.', 'Strides after easy runs: think "pop" off each foot.']; },
    target: function (s) { return 'Ground contact near ' + Math.round(s.x.gct) + ' ms at easy pace. It improves slowly, so look at the trend over a month.'; } }
};
function cadTarget(s) { return Math.round(s.cad.now * 1.05 / 2) * 2; }
function formIssues(s) {
  if (!s || !s.x) return [];
  var out = [], b = s.b;
  if (s.cad && s.cad.dev < -4) out.push({ k: 'cadence', sev: (-s.cad.dev - 4) / s.x.cad * 100 * (1.3 + (b.injury ? 0.4 : 0) + (b.bmi >= 27 ? 0.3 : 0)) });
  var vrS = s.vr ? (s.vr.now - 8.6) / 8.6 * 100 : -1, voS = s.vo ? (s.vo.dev - 0.12 * s.x.vo) / s.x.vo * 100 : -1;
  if (vrS > 0 || voS > 0) out.push({ k: 'bounce', sev: Math.max(vrS, voS) });
  if (s.gct && s.gct.dev > 15) out.push({ k: 'contact', sev: (s.gct.dev - 15) / s.x.gct * 100 * 0.8 });
  return out.sort(function (p, q) { return q.sev - p.sev; });
}
function formFocus() { return (st().prefs || {}).formFocus || null; }

/* ---------- small trend chart for one metric, with the typical range shaded ---------- */
function trendSVG(runs, k, band, fmt) {
  var pts = runs.filter(function (r) { return r[k] != null; }); if (pts.length < 2) return '';
  var W = 300, H = 64, pl = 4, pr = 4, t0 = pts[0].date, span = Math.max(1, E.diffD(t0, pts[pts.length - 1].date));
  var vals = pts.map(function (r) { return r[k]; }).concat(band ? band : []), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * 0.15 || 1; lo -= pad; hi += pad;
  var X = function (d) { return pl + E.diffD(t0, d) / span * (W - pl - pr); }, Y = function (v) { return 6 + (H - 12) * (1 - (v - lo) / (hi - lo)); };
  var s = '<svg class="chart ftrend" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Trend">';
  if (band) s += '<rect x="0" y="' + Y(band[1]).toFixed(1) + '" width="' + W + '" height="' + Math.max(1, Y(band[0]) - Y(band[1])).toFixed(1) + '" fill="var(--green)" opacity=".12"/>';
  s += '<path d="' + pts.map(function (r, i) { return (i ? 'L' : 'M') + X(r.date).toFixed(1) + ' ' + Y(r[k]).toFixed(1); }).join(' ') + '" fill="none" stroke="var(--line2)" stroke-width="1.4"/>';
  s += pts.map(function (r) { var ok = !band || (r[k] >= band[0] && r[k] <= band[1]); return '<circle cx="' + X(r.date).toFixed(1) + '" cy="' + Y(r[k]).toFixed(1) + '" r="3" fill="' + (ok ? 'var(--green)' : 'var(--amber)') + '"/>'; }).join('');
  return s + '</svg>';
}

/* ---------- #/form ---------- */
TITLES.form = 'Running form'; TABOF.form = 'progress';
VIEWS.form = function () {
  var s = formSummary(), b = s.b, f = formFocus();
  var h = '<div class="pagehead"><h1>Running form</h1><p>From your watch\'s running dynamics over the last 8 weeks, compared with what\'s typical for your height, weight and pace on each run.</p></div>';
  h += '<button class="card biocard" data-act="sheet" data-arg="' + jattr({ sheet: 'bio' }) + '"><div><span class="eyebrow">Your body</span><b>' + (b.h ? ftIn(b.h) : 'Height not set') + (b.kg ? ' · ' + lbOf(b.kg) + ' lb' : '') + '</b>' + (b.h ? '' : '<span class="small muted">Add it so the comparisons fit you</span>') + '</div><span class="btn sm">' + (b.h ? 'Edit' : 'Add') + '</span></button>';
  if (s.n < 3) return h + '<section class="card"><h3>Not enough runs yet</h3><p class="small muted" style="margin-top:4px">Form analysis needs at least 3 runs of a mile or more from the last 8 weeks. Cadence and step length come from the watch itself; ground contact time, bounce and vertical ratio need a Garmin HRM-Pro, HRM-Fit or Running Dynamics Pod.</p></section>';
  var iss = formIssues(s), pick = f && FORM_FOCI[f.k] ? f.k : iss.length ? iss[0].k : null;
  /* the one focus */
  if (pick) {
    var F = FORM_FOCI[pick], active = f && f.k === pick, weeks = active ? Math.floor(E.diffD(f.from, App.today) / 7) : 0;
    var since = active ? s.runs.filter(function (r) { return r.date >= f.from; }) : [];
    var cur = since.length && F.metric !== 'vr' ? median(since.map(function (r) { return r[F.metric]; })) : since.length ? median(since.map(function (r) { return r.vr; })) : null;
    h += '<section class="card focuscard"><div class="eyebrow">' + (active ? 'Your focus · week ' + (weeks + 1) : 'Suggested focus') + '</div><h2>' + esc(F.name) + '</h2>' +
      '<p class="small" style="margin-top:6px">' + F.why(s) + '</p>' +
      '<div class="fcue"><span aria-hidden="true">🎯</span><b>' + esc(F.cue) + '</b></div>' +
      '<h4>How to practice</h4><ul class="plain small fpr">' + F.practice(s).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
      '<p class="small"><b>Target:</b> ' + F.target(s) + '</p>' +
      (active && f.base != null && cur != null ? '<p class="small"><b>So far:</b> ' + fmtMetric(F.metric, f.base) + ' → ' + fmtMetric(F.metric, cur) + ' over ' + plural(since.length, 'run') + '.</p>' : '') +
      '<div class="banner info small onething"><b>One thing at a time.</b> Changing several things at once makes running feel awkward and can move stress somewhere new. Give this 3–4 weeks until it feels natural, then move on.</div>' +
      '<div class="btns">' + (active ? (weeks >= 3 ? '<button class="btn sm primary" data-act="ff-done">It feels natural now</button>' : '') + '<button class="btn sm ghost" data-act="ff-stop">Stop this focus</button>' : '<button class="btn primary" data-act="ff-start" data-arg="' + jattr({ k: pick }) + '">Start this focus</button>') + '</div></section>';
  } else {
    h += '<section class="card focuscard"><div class="eyebrow">Your form</div><h2>Looking good</h2><p class="small" style="margin-top:6px">Your cadence' + (s.dyn ? ', bounce and ground contact are' : ' is') + ' in a typical range for your height and pace. Keep strides in your week (4–6 × 20 seconds, twice a week) to hold on to it.</p></section>';
  }
  /* the numbers */
  var row = function (lab, k, unit, band, note) {
    var m = s[k]; if (!m) return '';
    var ok = band ? m.now >= band[0] && m.now <= band[1] : true;
    return '<div class="fmet"><div class="spread"><span><b>' + lab + '</b>' + (note ? '<span class="tiny muted"> ' + note + '</span>' : '') + '</span><span class="pill ' + (ok ? 'good' : 'warn') + '">' + fmtMetric(k, m.now) + '</span></div>' +
      (band ? '<div class="tiny muted">Typical for you at ' + pace(E.MI_M / s.v) + '/mi: ' + rangeTxt(k, band) + '</div>' : '') + trendSVG(s.runs, k, band) + '</div>';
  };
  var x = s.x;
  h += '<div class="sechead"><h2>Your numbers</h2></div><section class="card stack fnums">' +
    row('Cadence', 'cad', 'spm', [x.cad - 4, x.cad + 12]) +
    row('Step length', 'sl', 'in', [x.sl * 0.88, x.sl * 1.05], b.h ? Math.round((s.sl ? s.sl.now : 0) / b.h * 100) + '% of your height' : '') +
    row('Ground contact', 'gct', 'ms', [x.gct - 40, x.gct + 15]) +
    row('Bounce (vertical oscillation)', 'vo', 'in', [x.vo * 0.8, x.vo * 1.12]) +
    row('Vertical ratio', 'vr', '%', [5, 8.6]) +
    (s.dyn ? '' : '<p class="tiny muted">Ground contact, bounce and vertical ratio need a Garmin HRM-Pro, HRM-Fit or Running Dynamics Pod.</p>') +
    (s.treadOnly ? '<p class="tiny muted">These are all treadmill runs, where the watch\'s step length depends on its calibration. An outdoor run gives a truer picture.</p>' : '') +
    '<p class="tiny muted">Shaded: the typical range for your body at your usual pace. Amber dots sit outside it.</p></section>';
  /* what comes after */
  var later = iss.filter(function (i) { return i.k !== pick; });
  if (later.length) h += '<div class="sechead"><h2>Later</h2></div><section class="card"><p class="small muted">Worth a look once your current focus feels natural. Not now.</p><ul class="plain small" style="margin-top:6px">' + later.map(function (i) { return '<li><b>' + esc(FORM_FOCI[i.k].name) + '</b></li>'; }).join('') + '</ul></section>';
  return h;
};
function rangeTxt(k, b) { return fmtMetric(k, b[0]).replace(/\s?(spm|ms|in|%)$/, '') + '–' + fmtMetric(k, b[1]); }
function fmtMetric(k, v) {
  if (v == null) return '–';
  return k === 'cad' ? Math.round(v) + ' spm' : k === 'gct' ? Math.round(v) + ' ms' : k === 'vr' ? v.toFixed(1) + '%' : k === 'vo' ? inch(v) + ' in' : k === 'sl' ? inch(v) + ' in' : String(v);
}
ACTIONS['ff-start'] = function (a) {
  var s = formSummary(), F = FORM_FOCI[a.k], m = F && s[F.metric];
  Store.edit('prefs', 'formFocus', function (S) { S.prefs = S.prefs || {}; S.prefs.formFocus = { k: a.k, from: App.today, base: m ? Math.round(m.now * 10) / 10 : null }; });
  toast('Focus set. Your cue shows on easy-run days.');
};
ACTIONS['ff-stop'] = function () {
  if (!ASK({ title: 'Stop this focus?', text: 'Form changes take 3–4 weeks to stick. You can pick it up again any time.', ok: 'Stop it', cancel: 'Keep going' }, ACTIONS['ff-stop'], this, arguments)) return;
  Store.edit('prefs', 'formFocus', function (S) { S.prefs = S.prefs || {}; delete S.prefs.formFocus; });
};
ACTIONS['ff-done'] = function () {
  var f = formFocus(); Store.edit('prefs', 'formFocus', function (S) { S.prefs = S.prefs || {}; S.prefs.formDone = (S.prefs.formDone || []).concat([{ k: f.k, from: f.from, to: App.today }]); delete S.prefs.formFocus; });
  toast('Nice work. Check back for what\'s next.');
};
/* on easy and long run days, the cue sits in today's session card */
var _today20 = VIEWS.today;
VIEWS.today = function () {
  var h = _today20(), f = formFocus(), F = f && FORM_FOCI[f.k], d = dayOf(App.today);
  if (!F || !d || !d.parts.some(function (p) { return E.isRun(p) && (p.type === 'easy' || p.type === 'long' || p.type === 'recovery'); })) return h;
  var s = null; try { s = formSummary(); } catch (e) { s = null; }
  var l = '<a class="dress fline" href="#/form"><span aria-hidden="true">🎯</span><span><b>Form focus:</b> ' + esc(F.cue) + (f.k === 'cadence' && s && s.cad ? ' Metronome ' + cadTarget(s) + ' spm.' : '') + '</span></a>';
  var i = h.indexOf('</section>'); return i > 0 ? h.slice(0, i) + l + h.slice(i) : h;
};
/* entry points: Progress → Running, and You */
var _progress20 = VIEWS.progress;
VIEWS.progress = function () {
  var h = _progress20(); if ((App.args[0] || 'overview') !== 'running') return h;
  var s = null; try { s = formSummary(); } catch (e) { s = null; }
  if (!s || s.n < 1) return h;
  var f = formFocus(), iss = formIssues(s), txt = f && FORM_FOCI[f.k] ? 'Focus: ' + FORM_FOCI[f.k].name.toLowerCase() : iss.length ? 'Suggested focus: ' + FORM_FOCI[iss[0].k].name.toLowerCase() : s.n >= 3 ? 'In a good range for your height and pace' : 'Needs a few more runs';
  var c = '<a class="card formlink" href="#/form"><div><span class="eyebrow">Running form</span><b>' + esc(txt) + '</b>' + (s.cad ? '<span class="small muted">Cadence ' + Math.round(s.cad.now) + ' spm' + (s.vr ? ' · vertical ratio ' + s.vr.now.toFixed(1) + '%' : '') + (s.gct ? ' · contact ' + Math.round(s.gct.now) + ' ms' : '') + '</span>' : '') + '</div><span class="chev">›</span></a>';
  var t = h.indexOf('class="seg"'), i = t > 0 ? h.indexOf('</div>', t) : -1;
  return i > 0 ? h.slice(0, i + 6) + c + h.slice(i + 6) : h + c;
};
var _you20 = VIEWS.you;
VIEWS.you = function () { var h = _you20(), i = h.indexOf('href="#/guides"'); if (i < 0) return h; var a = h.lastIndexOf('<a', i); return h.slice(0, a) + '<a href="#/form">Running form<span class="v">cadence, bounce, one focus</span><span class="chev">›</span></a>' + h.slice(a); };

/* ================= the completed-run page ================= */
/* chart data: garmin/series/<id>.json, fetched once per run and kept for the session (and the last few on the device) */
var SERIES = {};
function seriesFor(id, cb) {
  id = String(id);
  if (SERIES[id] !== undefined) return cb(SERIES[id]);
  try { var c = LS.get('rp-ser-' + id); if (c) { SERIES[id] = JSON.parse(c); return cb(SERIES[id]); } } catch (e) {}
  if (Store.mode !== 'github') { SERIES[id] = null; return cb(null); }
  SERIES[id] = undefined; seriesFor.wait = seriesFor.wait || {};
  if (seriesFor.wait[id]) { seriesFor.wait[id].push(cb); return; }
  seriesFor.wait[id] = [cb];
  Store.getFile('garmin/series/' + id + '.json', true).then(function (f) {
    var v = null; try { v = f && f.text ? JSON.parse(f.text) : null; } catch (e) { v = null; }
    if (v && v.none) v = null;
    SERIES[id] = v;
    if (v) { try { var keys = (JSON.parse(LS.get('rp-ser-keys') || '[]')).filter(function (k) { return k !== id; }).concat([id]); while (keys.length > 12) LS.del ? LS.del('rp-ser-' + keys.shift()) : keys.shift(); LS.set('rp-ser-keys', JSON.stringify(keys)); LS.set('rp-ser-' + id, JSON.stringify(v)); } catch (e) {} }
    var w = seriesFor.wait[id]; delete seriesFor.wait[id]; w.forEach(function (f2) { f2(v); });
  }, function () { SERIES[id] = null; var w = seriesFor.wait[id]; delete seriesFor.wait[id]; w.forEach(function (f2) { f2(null); }); });
}
/* series from laps when there's no chart data: one point per lap, drawn as steps */
function seriesFromLaps(laps) {
  if (!laps || laps.length < 2) return null;
  var d = 0, s = { d: [], sp: [], hr: [], cad: [], gct: [], vo: [], vr: [], sl: [], pw: [] };
  laps.forEach(function (l) { if (!(l.d > 0)) return; d += l.d; s.d.push(d); s.sp.push(l.sp || null); s.hr.push(l.hr || null); s.cad.push(l.cad || null); s.gct.push(l.gct || null); s.vo.push(l.vo || null); s.vr.push(l.vr || null); s.sl.push(l.sl || null); s.pw.push(l.pw || null); });
  return { s: s, laps: true };
}
var RCH = {};
var RCH_DEF = [
  ['sp', 'Pace', function (v) { return pace(E.MI_M / v); }, '/mi', 'var(--blue)', true],
  ['hr', 'Heart rate', function (v) { return Math.round(v); }, 'bpm', 'var(--red)'],
  ['el', 'Elevation', function (v) { return Math.round(v * 3.28084); }, 'ft', 'var(--slate)'],
  ['cad', 'Cadence', function (v) { return Math.round(v); }, 'spm', 'var(--violet)'],
  ['sl', 'Step length', function (v) { return inch(v); }, 'in', 'var(--gold)'],
  ['gct', 'Ground contact', function (v) { return Math.round(v); }, 'ms', 'var(--amber)'],
  ['vo', 'Vertical oscillation', function (v) { return inch(v); }, 'in', 'var(--green)'],
  ['vr', 'Vertical ratio', function (v) { return v.toFixed(1); }, '%', 'var(--green)'],
  ['pw', 'Power', function (v) { return Math.round(v); }, 'W', 'var(--gold)'],
  ['stam', 'Stamina', function (v) { return Math.round(v); }, '%', 'var(--blue)']
];
function smooth(a, n) { return a.map(function (_, i) { var t = 0, c = 0; for (var j = Math.max(0, i - n); j <= Math.min(a.length - 1, i + n); j++) if (a[j] != null) { t += a[j]; c++; } return c ? t / c : null; }); }
function runChartsHTML(id, ser) {
  if (!ser || !ser.s || !ser.s.d) return '';
  var s = ser.s, xs = s.d.map(function (m) { return m / E.MI_M; }), tot = xs[xs.length - 1] || 1, W = 340, H = 78, step = !!ser.laps;
  RCH[id] = { x: xs, tot: tot, k: {} };
  var out = '';
  RCH_DEF.forEach(function (def) {
    var k = def[0], raw = s[k]; if (!raw || raw.filter(function (v) { return v != null; }).length < 2) return;
    var v = k === 'sp' ? raw.map(function (x) { return x != null && x > 0.8 ? x : null; }) : raw.slice();
    if (!step && k !== 'el' && k !== 'stam') v = smooth(v, k === 'sp' ? 3 : 2);
    var ok = v.filter(function (x) { return x != null; }); if (ok.length < 2) return;
    var sorted = ok.slice().sort(function (p, q) { return p - q; }), lo = sorted[Math.floor(sorted.length * 0.02)], hi = sorted[Math.ceil(sorted.length * 0.98) - 1];
    if (k === 'sp') { lo = Math.max(lo, sorted[0]); }
    var pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
    var avg = k === 'sp' && s.d.length ? (s.d[s.d.length - 1] / ((s.t && s.t[s.t.length - 1]) || 1)) : ok.reduce(function (p, q) { return p + q; }, 0) / ok.length;
    if (k === 'sp' && !(s.t && s.t[s.t.length - 1])) avg = ok.reduce(function (p, q) { return p + q; }, 0) / ok.length;
    var X = function (i) { return (step && i > 0 ? xs[i - 1] : 0) / tot * W; }, Xe = function (i) { return xs[i] / tot * W; };
    var Y = function (val) { var c = Math.max(lo, Math.min(hi, val)); return 4 + (H - 8) * (1 - (c - lo) / (hi - lo)); };
    var path = '', pen = false;
    v.forEach(function (val, i) {
      if (val == null) { pen = false; return; }
      if (step) { path += (pen ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(val).toFixed(1) + 'L' + Xe(i).toFixed(1) + ' ' + Y(val).toFixed(1); }
      else path += (pen ? 'L' : 'M') + Xe(i).toFixed(1) + ' ' + Y(val).toFixed(1);
      pen = true;
    });
    var area = k === 'el' ? path + 'L' + W + ' ' + H + 'L0 ' + H + 'Z' : '';
    RCH[id].k[k] = v;
    var sumH = k === 'el' ? '+' + Math.round(v.reduce(function (t, x, i2) { return i2 && x != null && v[i2 - 1] != null && x > v[i2 - 1] ? t + x - v[i2 - 1] : t; }, 0) * 3.28084) + ' <small>ft gain</small>' : k === 'stam' ? 'end ' + esc(def[2](ok[ok.length - 1])) + ' <small>' + def[3] + '</small>' : 'avg ' + esc(def[2](avg)) + ' <small>' + def[3] + '</small>';
    out += '<div class="rch" data-k="' + k + '"><div class="rch-h"><span>' + def[1] + '</span><span class="rch-v" data-sum="' + esc(sumH) + '">' + sumH + '</span></div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" class="rch-svg" aria-label="' + def[1] + ' over the run">' +
      (area ? '<path d="' + area + '" fill="' + def[4] + '" opacity=".18"/>' : '') +
      (k !== 'el' && k !== 'stam' ? '<line x1="0" x2="' + W + '" y1="' + Y(avg).toFixed(1) + '" y2="' + Y(avg).toFixed(1) + '" stroke="var(--line2)" stroke-dasharray="3 3"/>' : '') +
      '<path d="' + path + '" fill="none" stroke="' + def[4] + '" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
      '<line class="rch-cur" x1="-5" x2="-5" y1="0" y2="' + H + '" stroke="var(--ink)" stroke-width="1" vector-effect="non-scaling-stroke"/></svg></div>';
  });
  if (!out) return '';
  var ticks = [0, 0.25, 0.5, 0.75, 1].map(function (f) { return '<span>' + (f ? mi(tot * f) : '0') + '</span>'; }).join('');
  return '<div class="rcharts" data-id="' + esc(id) + '">' + out + '<div class="rch-x">' + ticks + '</div><p class="tiny muted rch-at">' + (step ? 'Per lap. Second-by-second charts appear within the hour for new runs.' : 'Drag across a chart to read every line at that point.') + '</p></div>';
}
/* drag across any chart: every chart shows its value at that distance */
function rchMove(e) {
  var box = e.target.closest && e.target.closest('.rcharts'); if (!box) return;
  var id = box.dataset.id, R = RCH[id]; if (!R) return;
  var svg = e.target.closest('.rch') ? e.target.closest('.rch').querySelector('svg') : box.querySelector('svg'); if (!svg) return;
  var r = svg.getBoundingClientRect(), cx = (e.touches ? e.touches[0].clientX : e.clientX), f = Math.max(0, Math.min(1, (cx - r.left) / r.width)), at = f * R.tot;
  var i = 0; while (i < R.x.length - 1 && R.x[i] < at) i++;
  box.querySelectorAll('.rch').forEach(function (c) {
    var k = c.dataset.k, def = RCH_DEF.filter(function (d) { return d[0] === k; })[0], v = R.k[k] && R.k[k][i];
    var ln = c.querySelector('.rch-cur'); ln.setAttribute('x1', (f * 340).toFixed(1)); ln.setAttribute('x2', (f * 340).toFixed(1));
    c.querySelector('.rch-v').innerHTML = v != null ? esc(def[2](v)) + ' <small>' + def[3] + '</small>' : '–';
  });
  var t = box.querySelector('.rch-at'); if (t) t.textContent = 'At ' + mi(at) + ' mi';
}
function rchEnd(e) {
  var box = e.target && e.target.classList && e.target.classList.contains('rcharts') ? e.target : null; if (!box) return;
  box.querySelectorAll('.rch').forEach(function (c) { var ln = c.querySelector('.rch-cur'); ln.setAttribute('x1', -5); ln.setAttribute('x2', -5); var v = c.querySelector('.rch-v'); v.innerHTML = v.dataset.sum; });
  var t = box.querySelector('.rch-at'); if (t) t.textContent = 'Drag across a chart to read every line at that point.';
}
document.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || e.buttons || e.pointerType === 'touch') rchMove(e); }, { passive: true });
document.addEventListener('pointerdown', rchMove, { passive: true });
document.addEventListener('pointerleave', rchEnd, true);
document.addEventListener('pointerup', function (e) { var box = e.target.closest && e.target.closest('.rcharts'); if (box && e.pointerType !== 'mouse') setTimeout(function () { rchEnd({ target: box }); }, 1800); }, { passive: true });

/* ---------- what went well, and one thing to work on ---------- */
function runReview(a) {
  var g = a.g || {}, good = [], fix = [], R = null;
  try { R = a.log ? recapData(a.date, a.slot || 'run') : null; } catch (e) { R = null; }
  var kind = (R && R.kind) || (a.log && a.log.ptype) || 'easy', p = R && R.p, laps = g.id ? lapsFor(g.id) : null, zz = _zonesAt7(a.date) || {};
  var paceS = a.sec && a.mi ? a.sec / a.mi : null, hr = a.hr || g.avgHR, hrE = zz.hr && zz.hr.E, eP = zz.E;
  var easyish = kind === 'easy' || kind === 'recovery' || kind === 'long';
  var add = function (arr, sc, cat, txt, tip) { arr.push({ sc: sc, cat: cat, txt: txt, tip: tip }); };
  /* records and comparisons */
  if (R && R.recs) R.recs.forEach(function (x) { add(good, 9, 'rec', x + '.'); });
  if (R && R.ex && R.ex.of && kind === 'speed') { var r = R.ex.hit / R.ex.of; if (r >= 0.7) add(good, 8, 'exec', 'Hit ' + R.ex.hit + ' of ' + R.ex.of + ' work laps on target.'); else add(fix, 7, 'exec', 'Only ' + R.ex.hit + ' of ' + R.ex.of + ' work laps were on target.', 'Check the pace range before each rep and settle into it in the first 20 seconds. If the targets felt out of reach, the plan may need easier paces; the app will suggest that if it keeps happening.'); }
  if (R && R.cmp && R.cmp.d <= -3) add(good, 8, 'cmp', Math.abs(R.cmp.d) + ' s/mi faster at the same heart rate than your last similar run' + (R.cmp.n > 1 ? 's' : '') + '. Fitness is building.');
  /* effort control on easy days */
  if (easyish && hr && hrE) {
    if (hr <= hrE[1]) add(good, kind === 'long' ? 5 : 6, 'easy', 'Kept it truly easy: ' + hr + ' bpm average, inside your easy zone (up to ' + hrE[1] + ').');
    else if (hr > hrE[1] + 3) add(fix, 6 + Math.min(3, (hr - hrE[1]) / 4), 'easy', 'Heart rate averaged ' + hr + ' bpm, above your easy zone (up to ' + hrE[1] + ').', 'Slow down 15–30 s/mi, and walk the steep hills if you need to. Easy runs build the aerobic engine; running them hard leaves less for the next workout.');
  } else if (easyish && paceS && eP && kind !== 'long' && paceS < eP[0] - 20) add(fix, 5, 'easy', 'A bit quick for an easy day (' + pace(paceS) + '/mi against ' + pace(eP[0]) + '–' + pace(eP[1]) + ').', 'Start the first mile at the slow end of the easy range and let it come to you. Easy days make the hard days work.');
  /* durability and pacing from laps */
  if (R && R.du && a.sec >= 2700) { if (R.du.decouple <= 5) add(good, 6, 'drift', R.du.decouple <= 1 ? 'Steady to the end: no heart-rate drift from the first half to the second.' : 'Steady to the end: heart rate drifted only ' + R.du.decouple + '% from the first half to the second.'); else if (R.du.decouple > 8) add(fix, 6, 'drift', 'Heart rate drifted ' + R.du.decouple + '% in the second half.', 'Start the first third a little slower, drink early (every 15–20 minutes when it\'s warm), and take carbs on runs over 75 minutes.'); }
  var L = (laps || []).filter(function (l) { return l.d >= 1000 && l.t > 0 && (l.gap || l.sp); });
  if (L.length >= 3 && kind !== 'speed') {
    var half = Math.floor(L.length / 2), sp = function (arr) { var d = 0, t = 0; arr.forEach(function (l) { d += l.d; t += l.d / (l.gap || l.sp); }); return t / d * E.MI_M; };
    var p1 = sp(L.slice(0, half)), p2 = sp(L.slice(L.length - half)), dd = Math.round(p2 - p1);
    var ps = L.map(function (l) { return E.MI_M / (l.gap || l.sp); }), mean = ps.reduce(function (x, y) { return x + y; }, 0) / ps.length, spread = Math.round(Math.max.apply(null, ps.map(function (x) { return Math.abs(x - mean); })));
    if (dd <= -5) add(good, 6, 'split', 'Negative split: the second half was ' + (-dd) + ' s/mi faster than the first.');
    else if (spread <= 12) add(good, 5, 'split', 'Even pacing: every lap within ' + spread + ' s/mi of your average.');
    else if (dd >= 20 && easyish) add(fix, 5, 'split', 'You faded: the second half was ' + dd + ' s/mi slower than the first.', 'Start 10–15 s/mi slower than you think you should. The goal is to finish feeling like you could keep going.');
  }
  /* workouts: how the fast reps went, first to last */
  var all = laps || [], hasRec = all.some(function (l) { return /RECOVERY|REST/.test(l.type || ''); });
  var reps = hasRec ? all.filter(function (l) { return /ACTIVE|INTERVAL/.test(l.type || '') && l.d >= 100 && l.t >= 20 && (l.gap || l.sp); }) : [];
  if (kind === 'speed' && reps.length >= 3) {
    /* each rep's pace adjusted for its own grade (about 3.3% slower per 1% uphill, 1.8% faster per 1% downhill), from the lap's climb and descent */
    var grd = function (l) { return ((l.up || 0) - (l.down || 0)) / l.d * 100; }, hilly = reps.some(function (l) { return Math.abs(grd(l)) >= 1.5; });
    var raw = reps.map(function (l) { return E.MI_M / l.sp; }), rp = reps.map(function (l, n) { var gr = grd(l); return raw[n] / (1 + (gr > 0 ? 0.033 : 0.018) * gr); });
    var avgR = raw.reduce(function (x2, y) { return x2 + y; }, 0) / raw.length;
    var f0 = (rp[0] + rp[1]) / 2, lastR = rp[rp.length - 1], fade = (lastR - f0) / f0, rawFade = (raw[raw.length - 1] - (raw[0] + raw[1]) / 2) / ((raw[0] + raw[1]) / 2);
    var hillTip = hilly ? ' On the climbs, run by effort, not pace: shorter, quicker steps, a slight lean from the ankles, and drive the arms. Ease into the first uphill rep; it sets the heart rate for the rest.' : '';
    add(good, 5, 'reps', reps.length + ' fast segments averaging ' + pace(avgR) + '/mi' + (hilly ? ' on rolling ground' : '') + '.');
    if (fade <= 0.015) add(good, 7, 'hold', hilly && rawFade > 0.05 ? 'Your slower reps were on the climbs. Adjusted for the grade, you held steady.' : 'Held it together: your last rep was as fast as the first.');
    else if (fade > 0.05) add(fix, 6 + Math.min(2, fade * 20), 'fade', 'Your last rep was ' + Math.round(lastR - f0) + ' s/mi slower than your first two' + (hilly ? ', even after adjusting for the hills' : '') + '.', 'Start the first reps a touch slower (about 5 s/mi, or by effort on a climb) so the last one is the fastest. A workout is won in the second half.' + hillTip);
    else if (hilly) add(fix, 3, 'hill', 'Rolling terrain makes pace hard to read.', hillTip.trim());
  }
  /* planned distance */
  if (p && p.mi && a.mi) { if (a.mi >= p.mi * 0.95) add(good, 4, 'dist', 'Did the full ' + mi(p.mi) + ' mi planned.'); else if (a.mi < p.mi * 0.8 && !p.timed) add(fix, 4, 'dist', 'Ran ' + mi(a.mi) + ' of ' + mi(p.mi) + ' planned miles.', 'If it was time, plan the route before you start. If something hurt or felt off, stopping was the right call; tell the app with "How are your legs?" on Today.'); }
  /* form on this run, judged for your body at this pace (only what you're focusing on, if you have a focus) */
  var b = bio(), v = g.distM && (g.movS || g.durS) ? g.distM / (g.movS || g.durS) : null, x = v ? formExpect(v, b) : null, ff = formFocus();
  if (x && g.cadence && !isTread(g)) {
    var cd = g.cadence - x.cad;
    if (cd >= -2) add(good, ff && ff.k === 'cadence' ? 7 : 3, 'form', 'Cadence ' + Math.round(g.cadence) + ' spm, right where it should be for your height and pace.');
    else if (cd < -6 && (!ff || ff.k === 'cadence')) add(fix, 4 + Math.min(2, -cd / 6), 'form', 'Cadence ' + Math.round(g.cadence) + ' spm is low for your height at this pace (typical about ' + Math.round(x.cad) + ').', 'Shorter, quicker steps at the same pace: try the watch metronome at ' + (Math.round(g.cadence * 1.05 / 2) * 2) + ' spm for 1 minute in every 5. ' + (ff ? 'This is your current focus, so keep at it.' : 'See Running form for a full plan, and work on just this one thing.'));
  }
  if (g.vRatio && x) { if (g.vRatio <= 7.8) add(good, 3, 'form2', 'Efficient stride: vertical ratio ' + g.vRatio + '%.'); else if (g.vRatio > 9 && (!ff || ff.k === 'bounce')) add(fix, 4, 'form2', 'Vertical ratio ' + g.vRatio + '%: a lot of bounce for your stride.', 'Think "push the ground back, not down" and keep your head level. ' + (ff ? 'Stick with your current focus.' : 'Work on this alone for a few weeks; see Running form.')); }
  if (p && p.timed && a.sec >= (p.min || 0) * 60 * 0.9) add(good, 7, 'done', 'All ' + Math.round(a.sec / 60) + ' minutes done. That\'s the whole job this week.');
  if (kind === 'race') add(good, 9, 'race', 'Race done: ' + mi(a.mi) + ' mi in ' + E.clock(a.sec) + '.');
  if (g.te >= 3 && kind === 'speed') add(good, 4, 'te', 'Real training stimulus: aerobic training effect ' + g.te + (g.ane ? ', anaerobic ' + g.ane : '') + '.');
  /* pick two different strengths and the single most useful fix */
  good.sort(function (p1, q) { return q.sc - p1.sc; }); fix.sort(function (p1, q) { return q.sc - p1.sc; });
  var picked = [], cats = {};
  good.forEach(function (x2) { if (picked.length < 2 && !cats[x2.cat] && !(cats.form && x2.cat === 'form2') && !(cats.form2 && x2.cat === 'form')) { picked.push(x2); cats[x2.cat] = 1; } });
  if (!picked.length) picked.push({ txt: 'You got it done. Consistency is what builds fitness.' });
  if (picked.length < 2 && a.mi) picked.push({ txt: mi(a.mi) + ' mi in the bank' + (paceS ? ' at ' + pace(paceS) + '/mi' : '') + '.' });
  return { good: picked, fix: fix[0] || null };
}
function reviewHTML(a) {
  var r = runReview(a);
  return '<section class="card rreview"><div class="eyebrow">How it went</div>' +
    r.good.map(function (x) { return '<div class="rr-line good"><span aria-hidden="true">✓</span><p>' + esc(x.txt) + '</p></div>'; }).join('') +
    (r.fix ? '<div class="rr-line fix"><span aria-hidden="true">↗</span><div><p><b>Work on:</b> ' + esc(r.fix.txt) + '</p><p class="small muted rr-tip">' + esc(r.fix.tip) + '</p></div></div>' : '<div class="rr-line good"><span aria-hidden="true">✓</span><p>Nothing to fix from this one. Keep doing exactly this.</p></div>') + '</section>';
}
/* form on this run, against what's typical for you at this pace */
function runFormHTML(a) {
  var g = a.g || {}; if (!g.cadence || !(g.distM > 1000)) return '';
  var b = bio(), v = g.distM / (g.movS || g.durS || 1), x = formExpect(v, b), rows = [];
  var r = function (lab, val, band, k) { if (!val) return; var ok = val >= band[0] && val <= band[1]; rows.push('<tr><td>' + lab + '</td><td class="num"><b>' + fmtMetric(k, val) + '</b></td><td class="num tiny muted">' + rangeTxt(k, band) + '</td><td><span class="fdot ' + (ok ? 'ok' : 'mid') + '"></span></td></tr>'); };
  r('Cadence', g.cadence, [x.cad - 4, x.cad + 12], 'cad'); r('Step length', g.stride, [x.sl * 0.88, x.sl * 1.05], 'sl'); r('Ground contact', g.gct, [x.gct - 40, x.gct + 15], 'gct'); r('Bounce', g.vOsc, [x.vo * 0.8, x.vo * 1.12], 'vo'); r('Vertical ratio', g.vRatio, [5, 8.6], 'vr');
  if (!rows.length) return '';
  return '<section class="card"><div class="spread"><h3>Form on this run</h3><a class="small" href="#/form">Running form ›</a></div><p class="tiny muted" style="margin-top:2px">Against what\'s typical for ' + (b.h ? 'someone ' + ftIn(b.h) + (b.kg ? ', ' + lbOf(b.kg) + ' lb' : '') : 'your build') + ' at ' + pace(E.MI_M / v) + '/mi.' + (isTread(g) ? ' Treadmill step length depends on the watch\'s calibration.' : '') + '</p><div class="scroll"><table class="t fit fform"><thead><tr><th></th><th class="num">This run</th><th class="num">Typical for you</th><th></th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div></section>';
}
var _activity20 = VIEWS.activity;
VIEWS.activity = function () {
  var h = _activity20(), a = actByKey(App.args[0]);
  if (!a || a.kind !== 'run' || a.date > App.today) return h;
  var rv = '', fm = '', ch = '';
  try { rv = reviewHTML(a); } catch (e) { console.warn(e); }
  try { fm = runFormHTML(a); } catch (e) { fm = ''; }
  /* charts: chart data if we have it, laps meanwhile */
  var g = a.g || {}, id = g.id;
  if (id) {
    var cached = SERIES[String(id)], ser = cached || seriesFromLaps(lapsFor(id));
    ch = '<section class="card rchcard" id="rch-' + esc(id) + '"><h3>Charts</h3>' + (runChartsHTML(String(id), ser) || '<p class="small muted">Charts appear once Garmin sends this run\'s details (usually within the hour).</p>') + '</section>';
    if (cached === undefined) seriesFor(id, function (s) {
      if (!s) return; var el = document.getElementById('rch-' + id); if (!el) return;
      el.innerHTML = '<h3>Charts</h3>' + runChartsHTML(String(id), s);
    });
  }
  /* review at the very top (under the title), then the tiles, charts and form; Garmin's full stats table stays below */
  var t = h.indexOf('<div class="tiles">'); if (t < 0) t = h.indexOf('<section');
  h = t > 0 ? h.slice(0, t) + rv + h.slice(t) : rv + h;
  var after = h.indexOf('</div>', h.indexOf('<div class="tiles">'));
  if (h.indexOf('<div class="tiles">') >= 0) { var end = h.indexOf('<section', after); h = end > 0 ? h.slice(0, end) + ch + fm + h.slice(end) : h + ch + fm; }
  else h += ch + fm;
  return h;
};
App.p20 = { acts: function () { return activities(); }, formSummary: formSummary, formIssues: formIssues, runReview: runReview, bio: bio, formExpect: formExpect, seriesFromLaps: seriesFromLaps, SERIES: SERIES };

/* the daily form tip on Today follows your form analysis: your focus while you have one, never a tip you don't need */
var _tipCard20 = tipCard;
tipCard = function () {
  var h = _tipCard20(); if (h.indexOf('>Form tip<') < 0) return h;
  var f = formFocus(), s = null, iss = []; try { s = formSummary(); iss = formIssues(s); } catch (e) { s = null; }
  var re = /<section class="card tipc"><div class="eyebrow">Form tip<\/div>[\s\S]*?<\/section>/;
  if (f && FORM_FOCI[f.k]) return h.replace(re, '<section class="card tipc"><div class="eyebrow">Your form focus · week ' + (Math.floor(E.diffD(f.from, App.today) / 7) + 1) + '</div><p class="small" style="margin-top:4px"><b>' + esc(FORM_FOCI[f.k].name) + '.</b> ' + esc(FORM_FOCI[f.k].cue) + ' Just this one thing until it feels natural.</p><a class="tiny" href="#/form">Running form ›</a></section>');
  if (iss.length) return h.replace(re, '<section class="card tipc"><div class="eyebrow">Form check</div><p class="small" style="margin-top:4px">Your watch data points to one thing worth working on: <b>' + esc(FORM_FOCI[iss[0].k].name.toLowerCase()) + '</b>.</p><a class="tiny" href="#/form">See why and how ›</a></section>');
  /* form is in range: skip the cadence and overstriding tips you don't need */
  if (s && s.x && /Quicker, lighter steps|Land under your body/.test(h)) { var n = Math.floor(E.pd(App.today).getTime() / 864e5), ok = FORM_TIPS.filter(function (t) { return !/Quicker, lighter steps|Land under your body/.test(t.t); }), t = ok[n % ok.length]; return h.replace(re, '<section class="card tipc"><div class="eyebrow">Form tip</div><p class="small" style="margin-top:4px"><b>' + esc(t.t) + '.</b> ' + esc(t.b) + '</p><a class="tiny" href="#/form">Your running form ›</a></section>'); }
  return h;
};
