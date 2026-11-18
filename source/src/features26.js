/* ================= The new metrics on Progress: a chart, what it measures, why it matters, and where you are ================= */
function wkLab(ws) { return fmtD(ws, { month: 'numeric', day: 'numeric' }); }
/* stacked weekly bars; rows: [{ label, vals: [..], line }]; keys/colors for the stack */
function stackSVG(rows, colors, o) {
  o = o || {}; if (!rows.length) return '';
  var W = 320, H = o.h || 120, pl = 26, pb = 16, top = 8, n = rows.length, bw = (W - pl - 4) / n;
  var tot = rows.map(function (r) { return r.vals.reduce(function (a, b) { return a + (b || 0); }, 0); }), mx = o.max || Math.max.apply(null, tot.concat([1]));
  var Y = function (v) { return top + (H - top - pb) * (1 - v / mx); };
  var s = '<svg class="chart msvg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'Chart') + '">';
  [0, 0.5, 1].forEach(function (f) { var y = Y(mx * f); s += '<line x1="' + pl + '" x2="' + W + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--line)" stroke-width=".6"/><text x="' + (pl - 3) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end">' + (o.pct ? Math.round(mx * f * 100) + '%' : Math.round(mx * f)) + '</text>'; });
  rows.forEach(function (r, i) {
    var x = pl + i * bw + bw * 0.15, w = bw * 0.7, acc = 0;
    r.vals.forEach(function (v, k) { if (!v) return; var y1 = Y(acc + v), y0 = Y(acc); s += '<rect x="' + x.toFixed(1) + '" y="' + y1.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(0.8, y0 - y1).toFixed(1) + '" rx="1.5" fill="' + colors[k] + '"' + (r.dim ? ' opacity=".45"' : '') + '/>'; acc += v; });
    if (i % Math.ceil(n / 6) === 0 || i === n - 1) s += '<text x="' + (x + w / 2).toFixed(1) + '" y="' + (H - 3) + '" text-anchor="middle">' + esc(r.label) + '</text>';
  });
  if (o.line) { var pts = rows.map(function (r, i) { return r.line == null ? null : [pl + i * bw + bw / 2, Y(r.line)]; }); s += '<path d="' + pts.filter(Boolean).map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ') + '" fill="none" stroke="var(--ink)" stroke-width="1.6"/>'; }
  if (o.ref != null) { var yr = Y(o.ref); s += '<line x1="' + pl + '" x2="' + W + '" y1="' + yr.toFixed(1) + '" y2="' + yr.toFixed(1) + '" stroke="var(--amber)" stroke-dasharray="4 3"/>'; }
  return s + '</svg>';
}
/* a line over dates: pts [{d, v}], optional band [lo, hi], ref line, inverted (faster pace up) */
function lineSVG(pts, o) {
  o = o || {}; pts = pts.filter(function (p) { return p.v != null && !isNaN(p.v); }); if (pts.length < 2) return '';
  var W = 320, H = o.h || 110, pl = 30, pb = 16, top = 8, d0 = pts[0].d, span = Math.max(1, E.diffD(d0, pts[pts.length - 1].d));
  var vals = pts.map(function (p) { return p.v; }).concat(o.band || []).concat(o.ref != null ? [o.ref] : []), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
  var X = function (d) { return pl + E.diffD(d0, d) / span * (W - pl - 6); }, Y = function (v) { var f = (v - lo) / (hi - lo); return top + (H - top - pb) * (o.invert ? f : 1 - f); };
  var fmt = o.fmt || function (v) { return Math.round(v); };
  var s = '<svg class="chart msvg" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'Trend') + '">';
  if (o.band) { var a = Y(o.band[0]), b = Y(o.band[1]); s += '<rect x="' + pl + '" y="' + Math.min(a, b).toFixed(1) + '" width="' + (W - pl - 6) + '" height="' + Math.abs(a - b).toFixed(1) + '" fill="var(--green)" opacity=".12"/>'; }
  if (o.ref != null) { var yr = Y(o.ref); s += '<line x1="' + pl + '" x2="' + (W - 6) + '" y1="' + yr.toFixed(1) + '" y2="' + yr.toFixed(1) + '" stroke="var(--amber)" stroke-dasharray="4 3"/>'; }
  [hi - pad, lo + pad].forEach(function (v) { s += '<text x="' + (pl - 3) + '" y="' + (Y(v) + 3).toFixed(1) + '" text-anchor="end">' + esc(fmt(v)) + '</text>'; });
  s += '<path d="' + pts.map(function (p, i) { return (i ? 'L' : 'M') + X(p.d).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join(' ') + '" fill="none" stroke="' + (o.color || 'var(--blue)') + '" stroke-width="1.8" stroke-linejoin="round"/>';
  if (o.dots !== false) s += pts.map(function (p) { return '<circle cx="' + X(p.d).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="' + (pts.length > 40 ? 1.5 : 2.6) + '" fill="' + (p.c || o.color || 'var(--blue)') + '"/>'; }).join('');
  if (o.line2) { var l2 = o.line2.filter(function (p) { return p.v != null; }); if (l2.length > 1) s += '<path d="' + l2.map(function (p, i) { return (i ? 'L' : 'M') + X(p.d).toFixed(1) + ' ' + Y(p.v).toFixed(1); }).join(' ') + '" fill="none" stroke="var(--ink)" stroke-width="1.5" opacity=".8"/>'; }
  s += '<text x="' + pl + '" y="' + (H - 3) + '">' + esc(fmtD(d0, { month: 'short', day: 'numeric' })) + '</text><text x="' + (W - 6) + '" y="' + (H - 3) + '" text-anchor="end">' + esc(fmtD(pts[pts.length - 1].d, { month: 'short', day: 'numeric' })) + '</text>';
  return s + '</svg>';
}
function mlegend(items) { return '<div class="legend">' + items.map(function (x) { return '<span><i class="dot" style="background:' + x[1] + '"></i>' + esc(x[0]) + '</span>'; }).join('') + '</div>'; }
/* the card: title, what it measures, a verdict on where you are, the chart, and why it matters */
function mcard(id, title, measure, verdict, tone, chart, why, foot) {
  return '<section class="card mcard" id="m-' + id + '"><h3>' + esc(title) + '</h3><p class="small muted" style="margin-top:2px">' + measure + '</p>' +
    (verdict ? '<div class="mverd ' + (tone || '') + '"><span class="ins-dot ' + (tone === 'bad' ? 'low' : tone === 'warn' ? 'mid' : 'ok') + '" aria-hidden="true"></span><p class="small">' + verdict + '</p></div>' : '') +
    (chart || '<p class="small muted">Not enough data yet.</p>') + (foot || '') +
    '<details class="mwhy"><summary>Why it matters</summary><p class="small">' + why + '</p></details></section>';
}

/* ---------- Load ---------- */
function effortCard() {
  var W = lastWeeks(8).map(weekEffort), rated = W.filter(function (w) { return w.rated; });
  var cur = W[W.length - 1], prev = W.slice(0, -1).filter(function (w) { return w.rated >= 2 && w.garmin; });
  var ratio = function (w) { return w.garmin ? w.srpe / w.garmin : null; }, base = avg(prev.map(ratio)), now = cur.rated >= 2 ? ratio(cur) : null;
  var verdict = !rated.length ? 'Rate how hard each run felt (1–10) and this fills in.' : now && base ? (now > base * 1.3 ? '<b>Runs are feeling harder than the work.</b> This week\'s effort per unit of Garmin load is ' + Math.round((now / base - 1) * 100) + '% above your normal. Heat, poor sleep, stress or building fatigue usually explain it.' : now < base * 0.8 ? '<b>Runs are feeling easier than the work</b>: a sign of fitness or freshness.' : '<b>Effort matches the work.</b> How hard it felt lines up with what Garmin measured.') : 'This week: ' + cur.srpe + ' effort points from ' + plural(cur.rated, 'rated session') + '.';
  var tone = now && base && now > base * 1.3 ? 'warn' : 'ok';
  var mx = Math.max.apply(null, W.map(function (w) { return Math.max(w.srpe, w.garmin); }).concat([1]));
  var rows = W.map(function (w) { return { label: wkLab(w.ws), vals: [w.srpe], line: w.garmin, dim: w.ws === wkStart(App.today) }; });
  return mcard('effort', 'Session effort load', 'Your 1–10 effort for each session × its minutes, added up for the week. The line is Garmin\'s heart-rate based load for the same week.', verdict, tone,
    stackSVG(rows, ['var(--violet)'], { label: 'Effort load by week', max: mx * 1.1, line: true }) + mlegend([['Your effort × minutes', 'var(--violet)'], ['Garmin load', 'var(--ink)']]),
    'Heart rate measures what the work cost your heart; your effort rating captures everything else: legs, sleep, heat, stress. Coaches have used effort × minutes for decades because it often moves before heart-rate data does. When the two split apart, something besides training is draining you.');
}
function monoCard() {
  var S = monoSeries(), now = S[S.length - 1], past = S.slice(0, -1).filter(function (x) { return x.load; });
  var avgStrain = avg(past.slice(-4).map(function (x) { return x.strain; }));
  var verdict = !now.load ? 'No training logged in the last 7 days.' : now.mono >= 2 ? '<b>Monotony ' + now.mono.toFixed(1) + ': your days are too alike.</b> Above 2.0, the week has no real easy days, which is linked with illness and overuse injury even at normal mileage.' : now.mono >= 1.5 ? '<b>Monotony ' + now.mono.toFixed(1) + ': getting samey.</b> Keep easy days truly easy and keep your rest day.' : '<b>Monotony ' + now.mono.toFixed(1) + ': good variety.</b> Hard days hard, easy days easy.';
  if (now.load && avgStrain && now.strain > avgStrain * 1.4) verdict += ' Strain is ' + Math.round((now.strain / avgStrain - 1) * 100) + '% above your last 4 weeks.';
  var tone = now.mono >= 2 || (avgStrain && now.strain > avgStrain * 1.5) ? 'bad' : now.mono >= 1.5 ? 'warn' : 'ok';
  var mx = Math.max.apply(null, S.map(function (x) { return x.strain; }).concat([1]));
  var rows = S.map(function (x) { return { label: wkLab(E.addD(x.end, -6)), vals: [x.strain], line: x.mono / 3 * mx }; });
  return mcard('mono', 'Monotony and strain', 'Monotony is how similar your daily training loads are over 7 days (average ÷ variation). Strain is the week\'s total load × monotony. Bars: strain. Line: monotony (dashed line marks 2.0).', verdict, tone,
    stackSVG(rows, ['var(--blue)'], { label: 'Strain by week with monotony', max: mx * 1.1, line: true, ref: 2 / 3 * mx }) + mlegend([['Strain', 'var(--blue)'], ['Monotony', 'var(--ink)'], ['Monotony 2.0', 'var(--amber)']]),
    'Bodies adapt to stress followed by recovery. A week where every day is medium-hard gives neither: research by Carl Foster found illnesses and overuse injuries cluster when monotony climbs above about 2.0 and strain spikes. The fix is rarely less training; it\'s more contrast: a true rest day and easier easy days.');
}
function rampCard() {
  var W = weekRunSeries(10), cur = W[W.length - 1], last = W[W.length - 2] || {}, inj = (st().profile || {}).injuryProne, cap = inj ? 0.3 : 0.33;
  var lastFull = last.mi ? last : null, share = lastFull && lastFull.share, ramp = lastFull && lastFull.ramp;
  var parts = [];
  if (share != null) parts.push(share > cap && lastFull.n >= 4 ? '<b>Last week\'s long run was ' + Math.round(share * 100) + '% of your miles</b>, above the ~' + Math.round(cap * 100) + '% guardrail.' : 'Last week\'s long run was ' + Math.round(share * 100) + '% of your miles: inside the guardrail.');
  if (ramp != null) parts.push(ramp > 0.2 ? '<b>Mileage jumped ' + Math.round(ramp * 100) + '%</b> from the week before.' : 'Mileage changed ' + (ramp >= 0 ? '+' : '') + Math.round(ramp * 100) + '% week to week.');
  var tone = (share != null && share > cap) || (ramp != null && ramp > 0.25) ? 'warn' : 'ok';
  var rows = W.map(function (w) { return { label: wkLab(w.ws), vals: [w.mi - w.long, w.long], line: null, dim: w.ws === wkStart(App.today) }; });
  return mcard('ramp', 'Long-run share and weekly jump', 'Each bar is a week\'s miles, with the long run in a lighter shade. The long run should stay under about 30% of the week, and weekly miles shouldn\'t jump more than about 10–20%.', parts.join(' '), tone,
    stackSVG(rows, ['var(--green)', 'color-mix(in srgb, var(--green) 45%, var(--card2))'], { label: 'Weekly miles with long run' }) + mlegend([['Other runs', 'var(--green)'], ['Long run', 'color-mix(in srgb, var(--green) 45%, var(--card2))']]),
    'Both are simple injury guardrails. A long run that is most of your week means a big jump in load in one day, which bones and tendons (and shins) handle worst. Big week-to-week jumps outrun how fast tissue adapts, even when your heart and lungs feel fine.');
}
function climbCard() {
  var W = weekRunSeries(10); if (!W.some(function (w) { return w.climbFt; })) return '';
  var cur = W[W.length - 2] || W[W.length - 1];
  return mcard('climb', 'Weekly climbing', 'Feet of elevation gain on your runs, by week.', 'Last full week: ' + cur.climbFt + ' ft over ' + mi(cur.mi) + ' mi (' + (cur.mi ? Math.round(cur.climbFt / cur.mi) : 0) + ' ft per mile).', 'ok',
    stackSVG(W.map(function (w) { return { label: wkLab(w.ws), vals: [w.climbFt], dim: w.ws === wkStart(App.today) }; }), ['var(--slate)'], { label: 'Climbing by week' }),
    'Hills are strength work in disguise: they build power with less pounding than speed on the flat, but the downhills load shins and quads. A sudden jump in climbing counts like a jump in miles, and a hilly race needs some hills in the weeks before.');
}

/* ---------- Running ---------- */
function intensityCard() {
  var W = lastWeeks(8).map(weekIntensity), last2 = W.slice(-2), tot = last2.reduce(function (t, w) { return t + w.tot; }, 0), hard = last2.reduce(function (t, w) { return t + w.hard; }, 0), mp = last2.reduce(function (t, w) { return t + w.M; }, 0);
  var cur = W[W.length - 1];
  var verdict = !tot ? 'No runs in the last two weeks.' : '<b>' + Math.round(hard * 10) / 10 + ' mi at threshold pace or faster</b> in the last two weeks (' + Math.round(hard / tot * 100) + '% of your miles)' + (mp ? ', plus ' + mi(mp) + ' mi at marathon pace' : '') + '. ' + (hard / tot > 0.2 ? 'That\'s a lot of hard running: easy runs may be drifting fast.' : hard / tot < 0.04 && tot > 15 ? 'Very little quality: fine in a base phase.' : 'A healthy share.');
  var tone = tot && hard / tot > 0.2 ? 'warn' : 'ok';
  return mcard('intensity', 'Miles at each intensity', 'Each lap is placed by its pace (grade-adjusted) against your training zones: easy, marathon pace, threshold, interval and repetition. Runs without laps count as easy, or threshold for a key workout.', verdict, tone,
    stackSVG(W.map(function (w) { return { label: wkLab(w.ws), vals: ZK.map(function (k) { return w[k]; }), dim: w.ws === wkStart(App.today) }; }), ZK.map(function (k) { return ZC[k]; }), { label: 'Miles by intensity' }) + legend(ZK.map(function (k) { return [ZN[k], ZC[k]]; })) +
    '<p class="tiny muted">This week so far: ' + ZK.filter(function (k) { return cur[k]; }).map(function (k) { return mi(cur[k]) + ' ' + ZN[k].toLowerCase(); }).join(' · ') + '</p>',
    'Total miles hide what kind of miles they were. Elite groups plan the week by miles at each intensity, especially threshold, because that is what drives race fitness, and too much of it is what tires you out. Watching it keeps hard days purposeful and easy days easy.');
}
function zonesCard() {
  var W = lastWeeks(8).map(weekZones), two = W.slice(-2), t = [0, 0, 0, 0, 0]; two.forEach(function (w) { w.t.forEach(function (s, i) { t[i] += s; }); });
  var tot = t.reduce(function (a, b) { return a + b; }, 0), low = tot ? easyShareOf(t) : null, exact = W.reduce(function (a, w) { return a + w.exact; }, 0), n = W.reduce(function (a, w) { return a + w.n; }, 0);
  var lows = zoneLows(), top2 = easyCapHR();
  var verdict = low == null ? 'Needs runs with heart rate.' : low >= 0.78 ? '<b>' + Math.round(low * 100) + '% of your running time was easy</b> (under ' + top2 + ' bpm) over the last two weeks: right on the 80/20 pattern.' : '<b>Only ' + Math.round(low * 100) + '% of your running time was easy</b> over the last two weeks. Most coaches aim for about 80%' + (top2 ? '. Keep easy runs under ' + top2 + ' bpm' : '') + '.';
  var tone = low != null && low < 0.7 ? 'warn' : 'ok';
  var C5 = ['var(--gray)', 'var(--blue)', 'var(--green)', 'var(--amber)', 'var(--red)'];
  return mcard('zones', 'Time in heart-rate zones (80/20)', 'Share of your running time in each Garmin heart-rate zone, by week. "Easy" here means under your plan\'s easy ceiling of ' + (top2 || '–') + ' bpm (set from your lactate threshold), which falls inside Garmin\'s zone ' + (lows && top2 ? (lows.filter(function (l) { return top2 >= l; }).length) : 2) + '.', verdict, tone,
    stackSVG(W.map(function (w) { return { label: wkLab(w.ws), vals: w.tot ? w.t.map(function (s) { return s / w.tot; }) : [0, 0, 0, 0, 0], dim: w.ws === wkStart(App.today) }; }), C5, { label: 'Heart-rate zone share by week', max: 1, pct: true, ref: 0.8 }) +
    mlegend([['Zone 1', C5[0]], ['Zone 2', C5[1]], ['Zone 3', C5[2]], ['Zone 4', C5[3]], ['Zone 5', C5[4]]]) + (n && exact < n ? '<p class="tiny muted">' + exact + ' of ' + n + ' runs have Garmin\'s zone times; the rest are placed by average heart rate.</p>' : ''),
    'Across sports, the best endurance athletes spend about 80% of their training time easy and 20% hard. Most recreational runners drift into the moderate middle, which is too hard to recover from and too easy to improve speed. Holding easy runs truly easy is the single most common fix coaches make.');
}
function csCard() {
  var c = critSpeed(), S = csSeries(), zz = _zonesAt7(App.today), tp = zz && zz.T ? (zz.T[0] + zz.T[1]) / 2 : null;
  var verdict = !c ? 'Needs best efforts at two or more distances between about 2 and 45 minutes (a fast mile and a 5K or 10K) in the last four months.' :
    '<b>Critical speed ' + pace(c.pace) + '/mi</b>' + (tp ? ', against your threshold training pace of ' + pace(tp) + '/mi.' + (c.pace > tp + 10 ? ' It reads slower than your threshold because your best recent efforts at these distances weren\'t all-out; a race or time trial will sharpen it.' : '') : '.') + (S.length >= 2 ? ' ' + (S[S.length - 1].pace < S[0].pace - 3 ? 'Faster by ' + Math.round(S[0].pace - S[S.length - 1].pace) + ' s/mi since ' + fmtD(S[0].d, { month: 'short' }) + '.' : S[S.length - 1].pace > S[0].pace + 3 ? 'Slower than in ' + fmtD(S[0].d, { month: 'short' }) + '.' : 'Steady over the last months.') : '') + ' Anaerobic reserve (D′): ' + c.dprime + ' m.';
  var tone = c && tp && c.pace < tp - 0.04 * tp ? 'warn' : 'ok';
  return mcard('cs', 'Critical speed', 'Estimated from your fastest efforts at different distances: the boundary pace you could hold for roughly 30–40 minutes. Above it you burn through a limited reserve (D′); below it you can go a long time.', verdict, tone,
    S.length >= 2 ? lineSVG(S.map(function (x) { return { d: x.d, v: x.pace }; }), { invert: true, fmt: function (v) { return pace(v); }, ref: tp, color: 'var(--amber)', label: 'Critical speed pace' }) + (tp ? mlegend([['Critical speed', 'var(--amber)'], ['Threshold training pace', 'var(--amber)']]) : '') : '',
    'It\'s a second, independent read on your threshold that comes straight from what you have run, not from a watch estimate. If critical speed is well faster than your training paces, your paces are probably too cautious; if it is slower, workouts may be too hard. It\'s only as good as your hardest efforts, so it sharpens after races and time trials.');
}
function durCard() {
  var D = durabilitySeries(); if (!D.length) return mcard('dur', 'Durability', 'Heart-rate drift on runs over an hour: how much your heart rate rises against pace from the first half to the second.', 'Needs runs over an hour with laps.', 'ok', '', 'Durability is how well you hold your fitness when tired: it decides the last miles of a half or full marathon.');
  var last = D[D.length - 1], prev = avg(D.slice(0, -1).slice(-3).map(function (x) { return x.v; }));
  var verdict = '<b>Last long run: ' + last.v + '% drift</b> (' + mi(last.mi) + ' mi, ' + fmtD(last.d, { month: 'short', day: 'numeric' }) + '). ' + (last.v <= 5 ? 'Under 5% means your aerobic base held up well.' : last.v <= 8 ? 'A little drift.' : 'High drift: pacing, fuel, fluids or heat.') + (prev != null ? ' ' + (last.v < prev - 1.5 ? 'Better than your recent average (' + Math.round(prev * 10) / 10 + '%).' : last.v > prev + 2 ? 'Worse than your recent average (' + Math.round(prev * 10) / 10 + '%).' : '') : '');
  return mcard('dur', 'Durability (heart-rate drift)', 'On each run of an hour or more: how much your heart rate rose against your pace from the first half to the second. Lower is better; under 5% is strong.', verdict, last.v > 8 ? 'warn' : 'ok',
    lineSVG(D.map(function (x) { return { d: x.d, v: x.v, c: x.v <= 5 ? 'var(--green)' : x.v <= 8 ? 'var(--amber)' : 'var(--red)' }; }), { ref: 5, fmt: function (v) { return Math.round(v) + '%'; }, color: 'var(--violet)', label: 'Drift by long run' }),
    'Marathons are decided late. Two runners with the same fitness when fresh can be minutes apart in the last 10K because one fades. Drift falling over a training block is one of the clearest signs your long runs are working; drift staying high usually means the pace is too ambitious or fueling is short.');
}
function peCard() {
  var P = powerEff(); if (P.length < 3) return '';
  var roll = P.map(function (p, i) { var w = P.slice(Math.max(0, i - 3), i + 1); return { d: p.d, v: avg(w.map(function (x) { return x.v; })) }; });
  var now = roll[roll.length - 1].v, then = roll[Math.max(0, roll.length - 9)].v, ch = (now / then - 1) * 100;
  return mcard('pe', 'Power efficiency', 'Speed per watt per kilogram on easy runs (from your watch\'s running power and your weight). Rising means you cover more ground for the same power.', '<b>' + now.toFixed(3) + '</b> m/s per W/kg' + (Math.abs(ch) >= 1 ? ', ' + (ch > 0 ? 'up ' : 'down ') + Math.abs(ch).toFixed(1) + '% over your last runs.' : ', steady.'), ch < -6 ? 'warn' : 'ok',
    lineSVG(P.map(function (x) { return { d: x.d, v: x.v, c: x.tread ? 'var(--slate)' : 'var(--gold)' }; }), { line2: roll, fmt: function (v) { return v.toFixed(2); }, color: 'var(--gold)', label: 'Power efficiency' }) + mlegend([['Outdoor', 'var(--gold)'], ['Treadmill', 'var(--slate)'], ['4-run average', 'var(--ink)']]),
    'Running economy (how much energy each mile costs) is as important as VO2 max for distance racing and the hardest to measure. Power efficiency is a practical stand-in: strength work, strides and good form show up here as a slow rise. A sudden drop on easy runs can be a fatigue signal. Garmin\'s wrist power reads higher than other power meters, so compare against yourself only.');
}
function pcCard() {
  var x = GX().pc || {}, P = Object.keys(x).map(function (k) { return { d: x[k].date, v: x[k].v }; }).filter(function (p) { return p.d; }).sort(function (a, b) { return a.d < b.d ? -1 : 1; });
  if (P.length < 2) return '';
  var last = P[P.length - 1];
  return mcard('pc', 'Performance condition', 'Garmin\'s read of your fitness on the day, 6–20 minutes into a run: your pace and heart rate against your VO2 max. +5 means about 5% better than your normal; −5 about 5% worse.', '<b>' + (last.v > 0 ? '+' : '') + last.v + '</b> on your last outdoor run (' + fmtD(last.d, { month: 'short', day: 'numeric' }) + ').', last.v <= -5 ? 'warn' : 'ok',
    lineSVG(P.map(function (p) { return { d: p.d, v: p.v, c: p.v >= 0 ? 'var(--green)' : p.v <= -5 ? 'var(--red)' : 'var(--amber)' }; }), { ref: 0, fmt: function (v) { return (v > 0 ? '+' : '') + Math.round(v); }, color: 'var(--green)', label: 'Performance condition' }),
    'It is a same-day freshness check from your own data. Repeated readings of −5 or lower on easy runs often show up before you feel tired, and steady positive readings before a race mean the taper is working.');
}

/* ---------- Recovery ---------- */
function hrvStabCard() {
  var H = hrvStability(); if (!H) return '';
  var n = H.now, verdict = H.suppressed ? '<b>HRV has been below your normal range for ' + H.belowDays + ' of the last 4 days</b> (7-day average ' + Math.round(n.mean) + ' ms, normal ' + Math.round(H.normLo) + '–' + Math.round(H.normHi) + ').' : H.unsettled ? '<b>Your HRV is swinging more than usual</b> (day-to-day variation ' + n.cv.toFixed(1) + '% against your normal ' + H.baseCV.toFixed(1) + '%). That often comes before a dip.' : (H.elevatedLow ? '<b>Above your normal range</b>, usually a sign you\'re absorbing training well. ' : '<b>Stable.</b> ') + '7-day average ' + Math.round(n.mean) + ' ms (normal ' + Math.round(H.normLo) + '–' + Math.round(H.normHi) + '), day-to-day swing ' + n.cv.toFixed(1) + '%.';
  return mcard('hrvstab', 'HRV stability', 'The 7-day average of your overnight HRV (line) against your own normal range (shaded), and how much it swings from day to day (dots: daily readings).', verdict, H.suppressed ? 'bad' : H.unsettled ? 'warn' : 'ok',
    lineSVG(hrvDaily().filter(function (p) { return p.d >= H.roll[0].d; }).map(function (p) { return { d: p.d, v: p.v, c: 'var(--violet)' }; }), { band: [H.normLo, H.normHi], line2: H.roll.map(function (r) { return { d: r.d, v: r.mean }; }), color: 'var(--violet)', dots: true, label: 'HRV with 7-day average' }) +
    lineSVG(H.roll.map(function (r) { return { d: r.d, v: r.cv }; }), { h: 70, ref: H.baseCV, fmt: function (v) { return v.toFixed(1) + '%'; }, color: 'var(--amber)', dots: false, label: 'Day-to-day swing' }) + mlegend([['7-day average', 'var(--ink)'], ['Daily HRV', 'var(--violet)'], ['Day-to-day swing', 'var(--amber)']]),
    'One night\'s HRV is noisy. Sports scientists (Plews and colleagues) found the 7-day average and its day-to-day swing far more useful: a falling average or a widening swing tends to appear a few days before performance drops or illness, while a steady average with a small swing means you\'re absorbing training well.');
}
function wellnessCard() {
  var W = wellnessSeries(), N = wellnessNorm(), last = W[W.length - 1];
  var verdict = !W.length ? 'Fill in the daily check-in and this becomes your trend.' : '<b>' + (last.d === App.today ? 'Today' : fmtD(last.d, { weekday: 'short' })) + ': ' + last.v + '/100</b>' + (N ? ' against your 4-week normal of ' + Math.round(N.mean) + '.' + (last.v < N.mean - 20 ? ' A clearly low day.' : last.v > N.mean + 10 ? ' A strong day.' : '') : '.');
  return mcard('wellness', 'Daily wellness', 'From your morning check-in: sleep quality, energy, soreness, stress, mood and motivation, combined into one 0–100 score.', verdict, last && N && last.v < N.mean - 20 ? 'warn' : 'ok',
    W.length >= 2 ? lineSVG(W.map(function (x) { return { d: x.d, v: x.v, c: N && x.v < N.mean - 20 ? 'var(--amber)' : 'var(--green)' }; }), { band: N ? [N.mean - N.sd, N.mean + N.sd] : null, fmt: function (v) { return Math.round(v); }, color: 'var(--green)', label: 'Wellness score' }) : '',
    'How you feel is data. A short daily questionnaire like this (the Hooper index and its cousins) is used by professional teams because it catches fatigue, poor sleep and stress that a watch misses, and it is often the first thing to change before an illness or injury.',
    '<div class="btns"><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'checkin' }) + '">' + (last && last.d === App.today ? 'Update today\'s check-in' : 'Do today\'s check-in') + '</button></div>');
}
function bloodCard() {
  var b = bloodLatest(), low = bloodLow(b), due = !b || E.diffD(b.date, App.today) > 120;
  var rows = b ? BLOOD.map(function (m) { var v = +b[m[0]]; if (!(v > 0)) return ''; var lo = m[0] === 'hgb' && (st().profile || {}).sex === 'F' ? 12 : m[3]; return '<div class="strow"><span>' + m[1] + '</span><b class="' + (v < lo ? 'warnt' : '') + '">' + v + ' ' + m[2] + '</b></div>'; }).join('') : '';
  var verdict = !b ? 'No results logged yet. A baseline (ferritin, vitamin D, hemoglobin) is worth asking your doctor for.' : low.length ? '<b>' + low.map(function (m) { return m[1]; }).join(' and ') + ' below the usual target for runners</b> on ' + fmtD(b.date, { month: 'short', day: 'numeric' }) + '. Worth a conversation with your doctor.' : 'All in range on ' + fmtD(b.date, { month: 'short', day: 'numeric', year: 'numeric' }) + '.' + (due ? ' Due for a recheck.' : '');
  return mcard('blood', 'Bloodwork', 'Your lab results for the three markers that matter most for distance runners. Entered by you; not medical advice.', verdict, low.length ? 'warn' : 'ok', '<div class="stats" style="margin-top:6px">' + rows + '</div>',
    BLOOD.map(function (m) { return '<b>' + m[1] + ':</b> ' + m[5]; }).join(' ') + ' Low iron and vitamin D are common in runners, especially through northern winters, and both quietly cap how well you train. Many sports doctors suggest checking every 3–6 months during heavy training.',
    '<div class="btns"><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'blood' }) + '">Add results</button></div>');
}
SHEETS.blood = function () {
  var b = bloodLatest() || {};
  return '<h3>Add bloodwork</h3><p class="small muted">From your lab report. Leave blank anything you didn\'t have tested.</p><label class="f">Date of the test<input class="i" type="date" id="bl-date" value="' + App.today + '"></label>' +
    BLOOD.map(function (m) { return '<label class="f">' + m[1] + ' (' + m[2] + ')<input class="i" type="number" inputmode="decimal" step="0.1" id="bl-' + m[0] + '" placeholder="' + (b[m[0]] ? 'last: ' + b[m[0]] : '') + '"></label>'; }).join('') +
    '<label class="f">Note<input class="i" id="bl-note" placeholder="e.g. taking iron since March"></label><div class="btns"><button class="btn primary" data-act="blood-save">Save</button><button class="btn ghost" data-act="sheet-close">Cancel</button></div>';
};
ACTIONS['blood-save'] = function () {
  var r = { date: $('#bl-date').value || App.today, note: $('#bl-note').value.trim() }, any = false;
  BLOOD.forEach(function (m) { var v = +$('#bl-' + m[0]).value; if (v > 0) { r[m[0]] = v; any = true; } });
  if (!any) { toast('Enter at least one value'); return; }
  Store.edit('blood', null, function (S) { S.blood = (S.blood || []).filter(function (x) { return x.date !== r.date; }).concat([r]); });
  closeSheet(); toast('Saved');
};
function extrasCards() {
  var x = runExtras(), out = '';
  if (x.bal.length >= 2) { var b = x.bal[x.bal.length - 1]; out += mcard('bal', 'Left/right balance', 'Ground-contact time split between your left and right foot (left %).', '<b>' + b.v.toFixed(1) + '% left</b>. ' + (Math.abs(b.v - 50) > 1.5 ? 'More than 1.5% off center: worth single-leg strength work on the weaker side.' : 'Within the normal ±1.5%.'), Math.abs(b.v - 50) > 1.5 ? 'warn' : 'ok', lineSVG(x.bal, { band: [48.5, 51.5], fmt: function (v) { return v.toFixed(1) + '%'; }, color: 'var(--blue)' }), 'A lasting imbalance often points to a weak or sore side and is a common thread in overuse injuries; it usually improves with single-leg strength and mobility work.'); }
  if (x.resp.length >= 2) out += mcard('resp', 'Breathing rate on runs', 'Average breaths per minute during runs.', 'Last run: ' + Math.round(x.resp[x.resp.length - 1].v) + ' breaths/min.', 'ok', lineSVG(x.resp, { color: 'var(--slate)' }), 'At a set pace, a rising breathing rate is another early sign of fatigue or illness.');
  return out;
}

/* ---------- placing them in Progress ---------- */
var _progress26 = VIEWS.progress;
VIEWS.progress = function () {
  var h = _progress26(), tab = App.args[0] || 'overview'; tab = PT_ALIAS[tab] || tab;
  if (['running', 'load', 'recovery'].indexOf(tab) < 0) return h;
  var box = document.createElement('div'); box.innerHTML = h;
  var root = box.querySelector('.pdash'); if (!root) return h;
  var frag = function (html) { var d = document.createElement('div'); d.innerHTML = html; return Array.prototype.slice.call(d.childNodes); };
  var folder = function (key, title, teaser, cards) { var body = cards.filter(Boolean).map(function (c) { return '<div class="c12">' + c + '</div>'; }).join(''); return body ? '<div class="c12">' + foldWrap('pg-' + key, title, teaser, '<div class="dash pdin">' + body + '</div>', false) + '</div>' : ''; };
  var safe = function (f) { try { return f(); } catch (e) { console.warn(e); return ''; } };
  var firstFold = root.querySelector(':scope > .c12 > details.fold');
  var before = function (html) { frag(html).forEach(function (n) { firstFold ? root.insertBefore(n, firstFold.parentNode) : root.appendChild(n); }); };
  var after = function (html) { frag(html).forEach(function (n) { root.appendChild(n); }); };
  var into = function (foldKey, html) { var f = root.querySelector('details[data-fold="pg-' + foldKey + '"] .pdin'); if (!f) { after(folder(foldKey, 'More', '', [html])); return; } frag('<div class="c12">' + html + '</div>').forEach(function (n) { f.appendChild(n); }); };
  if (tab === 'load') {
    before('<div class="c12">' + safe(monoCard) + '</div>');
    after(folder('load-effort', 'Effort and feel', 'Your effort ratings against Garmin\'s load', [safe(effortCard)]));
    after(folder('load-safety', 'Volume guardrails', 'Long-run share · weekly jump · climbing', [safe(rampCard), safe(climbCard)]));
  }
  if (tab === 'running') {
    var fit = root.querySelector('details[data-fold="pg-run-fit"]');
    var intensity = folder('run-int', 'Intensity', 'Miles at each intensity · time in heart-rate zones (80/20)', [safe(intensityCard), safe(zonesCard)]);
    if (fit) frag(intensity).forEach(function (n) { root.insertBefore(n, fit.parentNode); }); else after(intensity);
    [safe(csCard), safe(durCard), safe(peCard), safe(pcCard)].forEach(function (c) { if (c) into('run-fit', c); });
    var x = safe(extrasCards); if (x) into('run-form', x);
  }
  if (tab === 'recovery') {
    var first = root.querySelector(':scope > *:not(.pagehead):not(.tabs):not(.cdstrip)');
    var w = frag('<div class="c12">' + safe(wellnessCard) + '</div>'), hs = safe(hrvStabCard);
    var ptabs = root.querySelector('.ptabs'); w.forEach(function (n) { ptabs && ptabs.nextSibling ? root.insertBefore(n, ptabs.nextSibling) : root.appendChild(n); });
    if (hs) { var hrvCard = Array.prototype.filter.call(root.children, function (c) { return /^HRV/i.test(((c.querySelector('h3,.eyebrow,.hm-l') || {}).textContent || '').trim()) || /HRV \(OVERNIGHT\)/i.test(c.textContent.slice(0, 80)); })[0]; frag('<div class="c12">' + hs + '</div>').forEach(function (n) { hrvCard && hrvCard.nextSibling ? root.insertBefore(n, hrvCard.nextSibling) : root.appendChild(n); }); }
    after(folder('rec-blood', 'Bloodwork', 'Ferritin · vitamin D · hemoglobin', [safe(bloodCard)]));
  }
  return box.innerHTML;
};
App.p26 = { effortCard: effortCard, monoCard: monoCard, zonesCard: zonesCard, intensityCard: intensityCard, csCard: csCard, durCard: durCard, hrvStabCard: hrvStabCard, wellnessCard: wellnessCard };
