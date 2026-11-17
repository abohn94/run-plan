/* ================= Phase 2: comeback banner, and fitness · fatigue · form ================= */

/* ---------- comeback: one line on Today while the timed weeks run ---------- */
function comebackCard() {
  var w = App.week, cb = w && w.comeback; if (!cb) return '';
  var info = App.plan && App.plan.comeback;
  return '<section class="card offer cbcard"><div class="eyebrow">Comeback week ' + cb.week + ' of ' + cb.of + '</div><p class="small" style="margin:2px 0 0">' +
    (cb.walk ? 'Runs are by time with walk breaks, building toward continuous running.' : 'Runs are by time at an easy, chatty effort.') + ' Tendons and bones come back slower than your lungs, so the plan holds you back on purpose. ' +
    (cb.week === cb.of ? 'Next week: a 5K fitness check resets your paces.' : '') + '</p><div class="cbdots" aria-hidden="true">' + Array.from({ length: cb.of }, function (_, i) { return '<i class="' + (i < cb.week ? 'on' : '') + '"></i>'; }).join('') + '</div></section>';
}
var _today15 = VIEWS.today;
VIEWS.today = function () {
  var h = _today15(), c = ''; try { c = comebackCard(); } catch (e) { c = ''; }
  if (!c) return h; var i = h.indexOf('<section'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};

/* ---------- fitness (42-day load), fatigue (7-day load), form (fitness minus fatigue) ---------- */
function ffSeries(days) {
  var t = App.today, by = {};
  activities().forEach(function (a) { if (E.diffD(a.date, t) > days + 120 || a.date > t) return; var l = a.g && a.g.load ? a.g.load : a.kind === 'run' ? a.mi * 10 : a.kind === 'lift' ? 30 : 0; by[a.date] = (by[a.date] || 0) + l; });
  var out = [], ctl = 0, atl = 0;
  for (var i = days + 119; i >= 0; i--) { var d = E.addD(t, -i), l = by[d] || 0; ctl += (l - ctl) / 42; atl += (l - atl) / 7; if (i < days) out.push({ d: d, ctl: ctl, atl: atl, tsb: ctl - atl }); }
  return out;
}
function formWord(tsb, ctl) { var p = ctl > 1 ? tsb / ctl : 0; return p > 0.25 ? 'Very fresh (losing fitness if it lasts)' : p > 0.05 ? 'Fresh: race-ready' : p > -0.1 ? 'Neutral' : p > -0.4 ? 'Training hard: productive fatigue' : 'Very tired: ease off'; }
function ffChartHTML() {
  var s = ffSeries(90); if (s.length < 20 || !s.some(function (x) { return x.ctl > 1; })) return '';
  var W = 340, H = 168, pl = 26, top = 18, mid = 104, bot = 160;
  var hi = Math.max.apply(null, s.map(function (x) { return Math.max(x.ctl, x.atl); })) * 1.1 || 1;
  var tmax = Math.max.apply(null, s.map(function (x) { return Math.abs(x.tsb); })) || 1;
  var X = function (i) { return pl + i * (W - pl - 6) / (s.length - 1); }, Y = function (v) { return top + (mid - 14 - top) * (1 - v / hi); }, Z = (bot + mid) / 2 + 2, YT = function (v) { return Z - v / tmax * (bot - mid) / 2; };
  var line = function (k) { return s.map(function (x, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(x[k]).toFixed(1); }).join(' '); };
  var bars = s.map(function (x, i) { var y = YT(x.tsb); return '<rect x="' + (X(i) - 1.1).toFixed(1) + '" y="' + Math.min(y, Z).toFixed(1) + '" width="2.2" height="' + Math.max(0.6, Math.abs(y - Z)).toFixed(1) + '" fill="' + (x.tsb >= 0 ? 'var(--green)' : 'var(--amber)') + '" opacity=".85"/>'; }).join('');
  var last = s[s.length - 1], ago = s[Math.max(0, s.length - 29)];
  /* a % change only means something once there are 10+ weeks of history behind the 6-week average */
  var longHist = activities().some(function (a) { return a.date <= E.addD(App.today, -70); });
  var dFit = Math.round((last.ctl / Math.max(1, ago.ctl) - 1) * 100);
  /* race-ready band on the form strip: +5% to +25% of fitness */
  var bandTop = YT(last.ctl * 0.25), bandBot = YT(last.ctl * 0.05);
  var svg = '<svg class="chart ffchart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Fitness, fatigue and form, last 90 days">' +
    '<text x="' + pl + '" y="11" style="fill:var(--ink);font-weight:700">Fitness and fatigue</text>' +
    '<path d="' + line('atl') + '" fill="none" stroke="var(--amber)" stroke-width="1.6" stroke-dasharray="3 3" opacity=".9"/>' +
    '<path d="' + line('ctl') + '" fill="none" stroke="var(--green)" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<text x="' + Math.min(W - 4, X(s.length - 1)) + '" y="' + (Y(last.ctl) - 5).toFixed(1) + '" text-anchor="end" style="fill:var(--green);font-weight:700">' + Math.round(last.ctl) + '</text>' +
    '<text x="' + pl + '" y="' + (mid + 6) + '" style="fill:var(--ink);font-weight:700">Form</text>' +
    (bandTop < bandBot ? '<rect x="' + pl + '" y="' + bandTop.toFixed(1) + '" width="' + (W - pl - 6) + '" height="' + (bandBot - bandTop).toFixed(1) + '" fill="var(--green)" opacity=".1"/><text x="' + (W - 6) + '" y="' + (bandTop + 9).toFixed(1) + '" text-anchor="end" style="font-size:8px">race-ready</text>' : '') +
    '<line x1="' + pl + '" x2="' + (W - 6) + '" y1="' + Z + '" y2="' + Z + '" stroke="var(--line2)"/>' + bars +
    '<text x="0" y="' + (Z + 3) + '">0</text><text x="' + pl + '" y="' + H + '">' + E.fmtDate(s[0].d) + '</text><text x="' + W + '" y="' + H + '" text-anchor="end">Today</text></svg>';
  return '<section class="card"><h3>Fitness, fatigue and form</h3><p class="small muted" style="margin-top:4px">Fitness is your training load averaged over 6 weeks, fatigue over 1 week. Form is the gap between them: below zero while you build, above zero when you\'re fresh. Aim to arrive at a race in the shaded band.</p>' + svg +
    '<div class="legend"><span><i class="dot" style="background:var(--green)"></i>Fitness ' + Math.round(last.ctl) + (ago.ctl > 1 && longHist ? ' (' + (dFit >= 0 ? '+' : '') + dFit + '% in 4 weeks)' : '') + '</span><span><i class="dot" style="background:var(--amber)"></i>Fatigue ' + Math.round(last.atl) + '</span></div>' +
    '<p class="small" style="margin-top:6px"><b>Form ' + (last.tsb >= 0 ? '+' : '') + Math.round(last.tsb) + ':</b> ' + formWord(last.tsb, last.ctl) + '.</p></section>';
}
var _progress15 = VIEWS.progress;
VIEWS.progress = function () {
  var h = _progress15(); if ((App.args[0] || 'overview') !== 'performance') return h;
  var c = ''; try { c = ffChartHTML(); } catch (e) { c = ''; }
  if (!c) return h;
  var t = h.indexOf('class="tabs"'), i = t > 0 ? h.indexOf('</div>', t) : -1;
  return i > 0 ? h.slice(0, i + 6) + c + h.slice(i + 6) : h + c;
};
/* in taper and race weeks, one line on Today about form */
function formLine() {
  var w = App.week; if (!w || !/taper|race/.test(w.phase.key)) return '';
  var s = ffSeries(30); if (!s.length) return ''; var x = s[s.length - 1]; if (x.ctl < 1) return '';
  return '<section class="card offer insight"><a class="ins-main" href="#/progress/performance"><span class="ins-dot ' + (x.tsb >= 0 ? 'ok' : 'mid') + '" aria-hidden="true"></span><span><b>Form ' + (x.tsb >= 0 ? '+' : '') + Math.round(x.tsb) + ':</b> ' + (x.tsb < 0 ? 'freshness is still building. Keep these last runs short and easy and it rises every day.' : formWord(x.tsb, x.ctl) + '. The taper did its job.') + '</span></a></section>';
}
var _today15b = VIEWS.today;
VIEWS.today = function () { var h = _today15b(), c = ''; try { c = formLine(); } catch (e) { c = ''; } if (!c) return h; var i = h.indexOf('<section'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c; };
App.p15 = { ffSeries: ffSeries };
