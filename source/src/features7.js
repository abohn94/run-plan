/* ===================== features 7: Garmin metrics, weather, execution, auto lifts, shifts, sleep, goals, race pacing, season ===================== */

/* ---------- Garmin metrics (garmin/extra.json, written by the "Garmin metrics" job) ---------- */
App.extra = (function () { try { return JSON.parse(LS.get('rp-gextra') || 'null'); } catch (e) { return null; } })();
function GX() { return App.extra || {}; }
function lastOf(o) { var ks = Object.keys(o || {}).sort(); return ks.length ? o[ks[ks.length - 1]] : null; }
function loadExtra() {
  if (Store.mode !== 'github' || loadExtra.busy) return;
  loadExtra.busy = true;
  Store.getFile('garmin/extra.json').then(function (f) {
    loadExtra.busy = false;
    if (!f || !f.text) return;
    var changed = !App.extra || JSON.parse(f.text).updated !== App.extra.updated;
    App.extra = JSON.parse(f.text); LS.set('rp-gextra', f.text);
    if (changed) { recompute(); if ($('#sheet').hidden) render(); }
  }, function () { loadExtra.busy = false; });
}
/* fold Garmin's threshold and load balance into the data the engine already reads */
function mergeExtra() {
  var g = Store.garmin, x = App.extra; if (!g || !x) return;
  g.fitness = g.fitness || {};
  if (x.ltHistory) Object.keys(x.ltHistory).forEach(function (d) { var r = x.ltHistory[d]; if (r.pace) { g.fitness.ltSpeed = g.fitness.ltSpeed || {}; g.fitness.ltSpeed[d] = E.MI_M / r.pace; } if (r.hr) { g.fitness.ltHr = g.fitness.ltHr || {}; g.fitness.ltHr[d] = r.hr; } });
  if (x.balance) g.fitness.trainingStatus = { loads: x.balance.loads, targets: x.balance.targets, status: x.status && x.status.phrase, balance: x.balance.phrase };
}
var _recompute7 = recompute;
recompute = function () { mergeExtra(); _recompute7(); };
var _onchange7 = Store.onchange;
Store.onchange = function (why) { _onchange7(why); if (why === 'init' || why === 'pull' || why === 'garmin') setTimeout(loadExtra, 400); };
setTimeout(loadExtra, 1500);
setInterval(function () { if (document.visibilityState === 'visible') loadExtra(); }, 15 * 60 * 1000);
/* with Garmin's threshold coming in automatically, the weekly "update your readings" prompt is only needed if the job stops */
var _fpn7 = fitnessPromptNeeded;
fitnessPromptNeeded = function () { var x = GX(); if (x.updated && (Date.now() - new Date(x.updated).getTime()) < 3 * 864e5 && x.lt && x.lt.pace) return null; return _fpn7(); };
function phraseText(p) { return String(p || '').replace(/_\d+$/, '').replace(/_/g, ' ').toLowerCase().replace(/^\w/, function (c) { return c.toUpperCase(); }); }

/* ---------- weather (Open-Meteo, free, no key) ---------- */
App.wx = (function () { try { return JSON.parse(LS.get('rp-wx') || 'null'); } catch (e) { return null; } })();
function loc() { return (st().prefs || {}).loc || null; }
function runHour() { var h = (st().prefs || {}).runHour; return h == null ? 17 : +h; }
function loadWx(force) {
  var L = loc(); if (!L) return;
  if (!force && App.wx && App.wx.lat === L.lat && Date.now() - App.wx.at < 45 * 60 * 1000) return;
  if (loadWx.busy) return; loadWx.busy = true;
  var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + L.lat + '&longitude=' + L.lon + '&hourly=temperature_2m,dew_point_2m,apparent_temperature,wind_speed_10m,precipitation_probability,snowfall,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=16';
  fetch(u).then(function (r) { return r.json(); }).then(function (j) {
    loadWx.busy = false;
    var h = j.hourly, H = {};
    (h.time || []).forEach(function (t, i) { H[t.slice(0, 13)] = { temp: h.temperature_2m[i], dew: h.dew_point_2m[i], feels: h.apparent_temperature[i], wind: h.wind_speed_10m[i], pop: h.precipitation_probability[i], snow: h.snowfall[i], code: h.weather_code[i] }; });
    App.wx = { at: Date.now(), lat: L.lat, H: H }; try { LS.set('rp-wx', JSON.stringify(App.wx)); } catch (e) { /* storage full */ }
    recompute(); if ($('#sheet').hidden) render();
  }).catch(function () { loadWx.busy = false; });
}
setTimeout(function () { loadWx(); }, 800);
function wxAt(date, hr) { var H = App.wx && App.wx.H; if (!H) return null; return H[date + 'T' + (hr < 10 ? '0' : '') + hr] || null; }
function heatFor(date) {
  if ((st().prefs || {}).heatAdj === false) return 0;
  var w = wxAt(date, runHour()); if (!w) return 0;
  var p = E.heatPct(w.dew, w.temp, (GX().acclim || {}).heat || 0);
  return p >= 0.01 ? p : 0;
}
var _zonesAt7 = zonesAt;
zonesAt = function (date) { var z = _zonesAt7(date), p = date >= App.today ? heatFor(date) : 0; return p ? E.heatZones(z, p) : z; };
var WX_ICON = function (c) { return c >= 95 ? '⛈' : c >= 71 && c <= 86 ? '❄' : c >= 51 && c <= 67 ? '🌧' : c >= 45 && c <= 48 ? '🌫' : c >= 2 ? '⛅' : '☀'; };
function bestHour(date) {
  var best = null, cold = (wxAt(date, 12) || {}).temp < 40;
  var L0 = loc(), sun0 = L0 && E.sunTimes(date, L0.lat, L0.lon), dayOnly = (st().prefs || {}).darkRun === false;
  for (var h = 5; h <= 20; h++) { var w = wxAt(date, h); if (!w) continue; if (dayOnly && sun0 && (h * 60 < sun0.rise || h * 60 + 45 > sun0.set)) continue; var sc = cold ? -(w.feels) + (w.pop || 0) / 10 : E.heatPct(w.dew, w.temp) * 100 + (w.pop || 0) / 20 + (w.temp > 80 ? (w.temp - 80) / 4 : 0); if (!best || sc < best.sc) best = { h: h, sc: sc, w: w }; }
  return best;
}
function hrLabel(h) { return (h % 12 || 12) + (h < 12 ? 'a' : 'p'); }
function conditionsCard() {
  var t = App.today, day = dayOf(t), runs = day ? day.parts.filter(function (p) { return E.isRun(p) && p.mi > 0; }) : [];
  if (!loc()) return '<section class="card cond"><div class="spread"><div><div class="eyebrow">Conditions</div><h3 style="margin-top:2px">Weather-smart paces</h3></div><span class="wxic">⛅</span></div><p class="small muted" style="margin-top:4px">Add your location and paces adjust for heat and humidity, and icy or bitter days get a treadmill option.</p><div class="btns" style="margin-top:10px"><button class="btn sm primary" data-act="loc-gps">Use my location</button><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'loc' }) + '">Enter a city</button></div></section>';
  var h0 = runHour(), w = wxAt(t, h0); if (!w) { loadWx(); return ''; }
  var pct = heatFor(t), win = E.winterCheck(w), best = bestHour(t), zz = zonesAt(t), base = _zonesAt7(t);
  var hours = []; for (var h = Math.max(5, h0 - 3); h <= Math.min(21, h0 + 3); h++) { var x = wxAt(t, h); if (x) hours.push([h, x]); }
  var html = '<section class="card cond"><div class="spread"><div><div class="eyebrow">Conditions · ' + esc(loc().name || '') + '</div><h3 style="margin-top:2px">' + Math.round(w.temp) + '°F at ' + hrLabel(h0) + (Math.abs(w.feels - w.temp) >= 4 ? ' <span class="muted" style="font-weight:600">feels ' + Math.round(w.feels) + '°</span>' : '') + '</h3></div><span class="wxic">' + WX_ICON(w.code) + '</span></div>';
  html += '<div class="hrs">' + hours.map(function (p) { return '<button class="hrc' + (p[0] === h0 ? ' on' : '') + (best && best.h === p[0] ? ' best' : '') + '" data-act="run-hour" data-arg="' + jattr({ h: p[0] }) + '"><span>' + hrLabel(p[0]) + '</span><b>' + Math.round(p[1].temp) + '°</b><em>' + (p[1].pop >= 30 ? p[1].pop + '%' : 'dew ' + Math.round(p[1].dew)) + '</em></button>'; }).join('') + '</div>';
  var notes = [];
  if (pct) notes.push('<b>Paces ' + Math.round(pct * 100) + '% slower</b> for the humidity (dew point ' + Math.round(w.dew) + '°F)' + (base && base.E ? ': easy ' + pace(zz.E[0]) + '–' + pace(zz.E[1]) + ' instead of ' + pace(base.E[0]) + '–' + pace(base.E[1]) : '') + '. Same effort, same training.');
  else if (runs.length) notes.push('No pace adjustment needed: dew point ' + Math.round(w.dew) + '°F.');
  if (best && best.h !== h0 && runs.length) notes.push('Best window: <b>' + hrLabel(best.h) + '</b> (' + Math.round(best.w.temp) + '°F' + (best.w.temp < 40 ? ', the warmest daylight hour' : ', the least humid') + ').');
  var fw = freeWindows(t); if (fw && runs.length) notes.push('Your calendar is free ' + fw + '.');
  var sun = E.sunTimes(t, loc().lat, loc().lon);
  if (sun && runs.length) { var dark = h0 * 60 + 40 > sun.set || h0 * 60 < sun.rise; notes.push('Daylight ' + E.clockMin(sun.rise) + '–' + E.clockMin(sun.set) + '.' + (dark && (st().prefs || {}).darkRun === false && !runs.some(function (p) { return p.treadmill; }) ? ' <b>Your usual time is after dark</b>: run earlier or use the treadmill.' : '')); }
  if (w.temp <= 32 && !win && runs.length) notes.push('Below freezing: wear layers and watch for ice on bridges and shaded corners.');
  html += notes.length ? '<p class="small" style="margin-top:10px">' + notes.join(' ') + '</p>' : '';
  var ov = (st().overrides || {})[t];
  if (win && runs.length && !(ov && ov.action === 'tread')) html += '<div class="banner warn small" style="margin-top:10px"><b>Treadmill day?</b> ' + esc(win.why[0].toUpperCase() + win.why.slice(1)) + ' at your run time.<div class="btns" style="margin-top:8px"><button class="btn sm primary" data-act="tread-swap">Move today\'s run indoors</button></div></div>';
  if (ov && ov.action === 'tread') html += '<p class="small muted" style="margin-top:8px">Today\'s run is on the treadmill. <button class="linkbtn" data-act="undo-override" data-arg="' + jattr({ date: t }) + '">Undo</button></p>';
  return html + '</section>';
}
ACTIONS['run-hour'] = function (a) { Store.edit('prefs', 'runHour', function (S) { S.prefs = S.prefs || {}; S.prefs.runHour = a.h; }); };
ACTIONS['tread-swap'] = function () { var t = App.today, w = E.winterCheck(wxAt(t, runHour())); Store.edit('overrides', t, function (S) { S.overrides[t] = { action: 'tread', reason: w ? w.why : 'weather', at: new Date().toISOString() }; }); toast('Moved indoors'); };
ACTIONS['loc-gps'] = function () {
  if (!navigator.geolocation) { openSheet('loc', {}); return; }
  navigator.geolocation.getCurrentPosition(function (p) { saveLoc({ lat: Math.round(p.coords.latitude * 100) / 100, lon: Math.round(p.coords.longitude * 100) / 100, name: 'Your location' }); }, function () { openSheet('loc', {}); }, { timeout: 8000 });
};
function saveLoc(L) { Store.edit('prefs', 'loc', function (S) { S.prefs = S.prefs || {}; S.prefs.loc = L; }); App.wx = null; setTimeout(function () { loadWx(true); }, 50); toast('Location set: ' + L.name); }
SHEETS.loc = function () {
  return '<h3>Your location</h3><p class="small muted">Used only for the weather forecast. A town or ZIP code is plenty.</p><div class="row2"><input class="i" id="locQ" placeholder="City, e.g. Eden Prairie" autocomplete="off"><button class="btn primary" data-act="loc-search">Search</button></div><div id="locRes" class="stack tight"></div><div class="btns"><button class="btn ghost" data-act="sheet-close">Cancel</button></div>';
};
ACTIONS['loc-search'] = function () {
  var q = ($('#locQ') || {}).value || ''; if (!q.trim()) return;
  fetch('https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=' + encodeURIComponent(q.trim())).then(function (r) { return r.json(); }).then(function (j) {
    var r = j.results || []; $('#locRes').innerHTML = r.length ? r.map(function (x) { var nm = x.name + (x.admin1 ? ', ' + x.admin1 : '') + (x.country_code && x.country_code !== 'US' ? ', ' + x.country_code : ''); return '<button class="alt" data-act="loc-pick" data-arg="' + jattr({ lat: Math.round(x.latitude * 100) / 100, lon: Math.round(x.longitude * 100) / 100, name: x.name }) + '"><b>' + esc(nm) + '</b></button>'; }).join('') : '<p class="small muted">No match. Try a nearby city.</p>';
  }).catch(function () { $('#locRes').innerHTML = '<p class="small muted">Could not reach the weather service.</p>'; });
};
ACTIONS['loc-pick'] = function (a) { closeSheet(); saveLoc(a); };

/* ---------- Garmin readiness next to ours ---------- */
var _readinessCard7 = readinessCard;
readinessCard = function (rd, rec, date) {
  var h = _readinessCard7(rd, rec, date), x = GX(), r = x.readiness && x.readiness[date], v = x.hrv && x.hrv[date];
  if (!r && !v) return h;
  var row = '<div class="gready">' + (r ? '<div><span>Garmin readiness</span><b>' + r.score + '</b><em>' + esc(phraseText(r.level)) + (r.recoveryH ? ' · ' + r.recoveryH + ' h recovery' : '') + '</em></div>' : '') +
    (v ? '<div><span>HRV status</span><b class="' + (v.status === 'BALANCED' ? 'ok' : 'warn') + '">' + esc(phraseText(v.status)) + '</b><em>' + v.last + ' ms · normal ' + v.lo + '–' + v.hi + '</em></div>' : '') +
    (x.status && x.status.acwr ? '<div><span>Load ratio</span><b>' + x.status.acwr + '</b><em>' + esc(phraseText(x.status.acwrStatus)) + '</em></div>' : '') + '</div>';
  var i = h.lastIndexOf('</section>');
  return i > 0 ? h.slice(0, i) + row + h.slice(i) : h + row;
};

/* ---------- sleep target ---------- */
function minOf(s, d) { var m = /^(\d{1,2}):(\d{2})/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : d; }
function clockOf(m) { var h = Math.floor(m / 60) % 24, mm = m % 60; return (h % 12 || 12) + ':' + (mm < 10 ? '0' : '') + mm + ' ' + (h < 12 ? 'AM' : 'PM'); }
function sleepCard() {
  var hr = new Date().getHours(); if (hr < 15 || !App.plan) return '';
  var t = App.today, tm = E.addD(t, 1), d2 = dayOf(tm), pr = st().prefs || {}, shift = allShifts()[tm], cs = App.cal && App.cal.starts && App.cal.starts[tm];
  var wake = cs ? cs - (+pr.commute || 40) - 30 : minOf(shift === 'day' ? pr.shiftWake || '05:15' : pr.wake || '06:30', 390);
  if (shift === 'night') return '';
  var g = (Store.garmin && Store.garmin.days || {})[t] || {}, need = g.needH || 8, debt = g.sleepH ? Math.max(0, need - g.sleepH) : 0;
  var hard = d2 && d2.parts.some(function (p) { return p.type === 'speed' || p.type === 'long' || p.type === 'race'; });
  var s = E.sleepTarget(need, wake, hard, debt);
  return '<section class="card sleepc"><div class="spread"><div><div class="eyebrow">Tonight</div><h3 style="margin-top:2px">In bed by ' + clockOf(s.bedMin) + '</h3></div><span class="wxic">🌙</span></div><p class="small muted" style="margin-top:4px">' + s.needH + ' h of sleep before a ' + clockOf(wake) + ' wake-up' + (shift === 'day' ? ' for your shift' : '') + (hard ? '; tomorrow is a key session' : '') + (debt >= 0.75 ? '; you ran ' + E.round1(debt) + ' h short last night' : '') + '.</p><button class="linkbtn small" data-act="sheet" data-arg="' + jattr({ sheet: 'wake' }) + '">Change wake times</button></section>';
}
SHEETS.wake = function () { var p = st().prefs || {}; return '<h3>Wake-up times</h3><div class="grid2"><label class="f">Usual<input class="i" type="time" id="wkU" value="' + esc(p.wake || '06:30') + '"></label><label class="f">Day-shift mornings<input class="i" type="time" id="wkS" value="' + esc(p.shiftWake || '05:15') + '"></label></div>' + sheetBtns('Save'); };
SAVE2.wake = function () { var u = $('#wkU').value, s2 = $('#wkS').value; Store.edit('prefs', 'wake', function (S) { S.prefs = S.prefs || {}; S.prefs.wake = u; S.prefs.shiftWake = s2; }); closeSheet(); return true; };

/* ---------- work shifts ---------- */
var SHIFT_NEXT = { '': 'day', day: 'eve', eve: 'night', night: 'off', off: '' };
ACTIONS['shift-cycle'] = function (a) { Store.edit('shifts', a.d, function (S) { S.shifts = S.shifts || {}; var cur = S.shifts[a.d] || ((App.cal && App.cal.shifts || {})[a.d]) || ''; var n = SHIFT_NEXT[cur]; if (n === 'off' && !(App.cal && App.cal.shifts && App.cal.shifts[a.d])) n = ''; if (n) S.shifts[a.d] = n; else delete S.shifts[a.d]; }); };
function shiftRow(w) {
  var sh = allShifts(), cal = (App.cal && App.cal.shifts) || {}, mine = st().shifts || {};
  return '<section class="card shiftrow"><div class="spread"><h3>Work shifts</h3><span class="tiny muted">' + (App.cal ? 'from your calendar · tap to change' : 'tap: day → evening → night → off') + '</span></div><div class="shchips">' + w.days.map(function (d) { var v = sh[d.date] || ''; return '<button class="shc ' + v + (cal[d.date] && !mine[d.date] ? ' cal' : '') + '" data-act="shift-cycle" data-arg="' + jattr({ d: d.date }) + '"' + (d.date < App.today ? ' disabled' : '') + '><span>' + d.dow.charAt(0) + '</span><b>' + (v === 'day' ? '☀' : v === 'night' ? '☾' : '·') + '</b></button>'; }).join('') + '</div><p class="tiny muted" style="margin-top:8px">Key sessions move off day and night shifts; on evening shifts you run in the morning. Runs on shift days get shorter, and the day after a night shift stays easy.</p></section>';
}
var _preview7 = VIEWS.preview;
VIEWS.preview = function () {
  var h = _preview7(), w = pvWeek(); if (!w || !App.plan) return h;
  var add = shiftRow(w);
  if (w.shinCap) add += '<div class="banner info small"><b>Shin-load cap.</b> This week is held to ' + w.shinCap + ' mi, your personal ceiling from recent weeks. It rises as you handle more. <a href="#/fitness">Details</a></div>';
  var i = h.indexOf('<p class="tiny muted pvhint">');
  return i > 0 ? h.slice(0, i) + add + h.slice(i) : h + add;
};

/* ---------- execution score and durability for a run ---------- */
function lapsFor(gid) { var l = GX().laps && GX().laps[String(gid)]; return l ? l.laps : null; }
function plannedRunOn(date) { var d = dayOf(date); return d ? d.parts.filter(function (p) { return E.isRun(p) && p.steps; })[0] : null; }
function executionCard(date, gid) {
  var laps = lapsFor(gid); if (!laps) return '';
  var p = plannedRunOn(date), zz = _zonesAt7(date), ex = E.execution(p || { title: 'Splits', steps: [{ k: 'run', z: null }] }, p ? zz : null, laps), du = E.durability(laps);
  if (!ex && !du) return '';
  var html = '<section class="card exec"><div class="spread"><h3>' + (p ? 'How it went' : 'Splits') + '</h3>' + (ex && ex.score != null ? '<span class="score ' + (ex.score >= 80 ? 'ok' : ex.score >= 50 ? 'mid' : 'low') + '">' + ex.score + '%</span>' : '') + '</div>';
  if (ex) {
    html += '<p class="small muted" style="margin-top:2px">' + (ex.of ? ex.hit + ' of ' + ex.of + ' work laps on target' : p ? 'Planned: ' + esc(p.title) : 'No planned workout that day, so no targets') + (ex.fade != null && ex.fade > 8 ? '; the second half faded ' + ex.fade + ' s/mi' : ex.fade != null && ex.fade < -5 ? '; you finished stronger than you started' : '') + '.</p>';
    html += '<div class="laps">' + ex.rows.slice(0, 24).map(function (r) { return '<div class="lap ' + (r.ok === true ? 'ok' : r.ok === false ? 'off' : '') + '"><span class="ln">' + r.i + '</span><span class="lt">' + esc(phraseText(r.type)) + '</span><b>' + (r.pace ? pace(r.pace) : '–') + '</b><em>' + (r.target ? pace(r.target[0]) + '–' + pace(r.target[1]) : '') + '</em><span class="lh">' + (r.hr ? Math.round(r.hr) : '') + '</span></div>'; }).join('') + '</div>';
  }
  if (du) html += '<p class="small" style="margin-top:10px"><b>Durability:</b> heart-rate drift ' + du.decouple + '% from the first half to the second. ' + (du.decouple <= 5 ? 'Under 5% means your aerobic base held up well.' : du.decouple <= 8 ? 'A little drift; more easy volume and steady finishes will tighten this.' : 'High drift: build long runs gradually and practise fueling.') + '</p>';
  return html + '</section>';
}
var _activity7 = VIEWS.activity;
VIEWS.activity = function () {
  var h = _activity7(), a = actByKey(App.args[0]);
  if (!a || a.kind !== 'run' || !a.g || !a.g.id) return h;
  var c = executionCard(a.date, a.g.id); if (!c) return h;
  var i = h.indexOf('<section'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};
var _day7 = VIEWS.day;
VIEWS.day = function () {
  var h = _day7(), date = App.args[0] || App.today, l = logOf(date), gid = l.run && l.run.gid;
  var c = gid ? executionCard(date, gid) : '';
  return c ? h + c : h;
};

/* ---------- lifts logged automatically from the watch ---------- */
var GCAT = { SQUAT: /squat|goblet/i, DEADLIFT: /deadlift|rdl/i, BENCH_PRESS: /bench/i, ROW: /row/i, PULL_UP: /pull-?up|chin|pulldown/i, SHOULDER_PRESS: /overhead|push press|arnold|shoulder/i, LUNGE: /lunge|split/i, PLYO: /jump|hop|bound/i, HIP_RAISE: /bridge|thrust|swing/i, CALF_RAISE: /calf|soleus|tibialis|heel/i, PUSH_UP: /push-up|chest pass/i, PLANK: /plank/i, CORE: /pallof|dead bug|hollow|knee raise|carry/i, CURL: /curl/i, CARRY: /carry/i, HIP_STABILITY: /abduction|clamshell|dead bug/i, LEG_CURL: /nordic|hamstring/i, FLYE: /pullover|fly/i };
function autoLiftLogs() {
  var x = GX(); if (!x.sets || !App.plan) return [];
  var logs = st().logs || {}, seen = st().seen || {}, out = [];
  Object.keys(x.sets).forEach(function (gid) {
    var e = x.sets[gid], d = e.date; if (!d || seen['sets:' + gid]) return;
    var l = logs[d] && logs[d].lift; if (l && l.ex && Object.keys(l.ex).length) return;
    var day = dayOf(d), part = day && day.parts.filter(function (p) { return p.type === 'strength'; })[0]; if (!part) return;
    var act = (e.sets || []).filter(function (s) { return s.type === 'ACTIVE' && s.reps; }); if (!act.length) return;
    var known = act.filter(function (s) { return s.cat && s.cat !== 'UNKNOWN'; }).length; if (known / act.length < 0.6) return;
    var m = E.liftMod(part.key, part.v, part.mix), subs = st().subs || {}, plan = [];
    m.blocks.forEach(function (b) { if (/stretch|mobility|warm/i.test(b.t)) return; b.ex.forEach(function (x2) { if (!x2.wu) plan.push(subs[x2.n] || x2.n); }); });
    var groups = []; act.forEach(function (s) { var g = groups[groups.length - 1]; if (g && g.cat === s.cat) g.sets.push(s); else groups.push({ cat: s.cat, sets: [s] }); });
    var used = {}, ex = {};
    groups.forEach(function (g) {
      var name = plan.filter(function (n) { return !used[n] && GCAT[g.cat] && GCAT[g.cat].test(n); })[0] || phraseText(g.cat);
      used[name] = 1;
      ex[name] = { s: (ex[name] ? ex[name].s : []).concat(g.sets.map(function (s) { return { w: s.lb || 0, r: s.reps }; })) };
    });
    out.push({ gid: gid, date: d, key: part.key, v: part.v, mix: part.mix || null, lp: part.lp, ex: ex });
  });
  return out;
}
var _applyGarmin7 = applyGarmin;
applyGarmin = function () {
  var r = _applyGarmin7(), adds = autoLiftLogs();
  if (!adds.length) return r;
  Store.editMany(adds.map(function (a) { return ['logs', a.date]; }).concat(adds.map(function (a) { return ['seen', 'sets:' + a.gid]; })), function (S) {
    S.seen = S.seen || {};
    adds.forEach(function (a) {
      S.logs[a.date] = S.logs[a.date] || {};
      var old = S.logs[a.date].lift || {}, vol = 0;
      Object.keys(a.ex).forEach(function (n) { a.ex[n].s.forEach(function (s) { vol += (+s.w || 0) * (+s.r || 0); }); });
      S.logs[a.date].lift = Object.assign({}, old, { key: a.key, v: a.v, mix: a.mix, lp: a.lp, ex: a.ex, vol: Math.round(vol), src: 'watch', gid: old.gid || a.gid });
      S.seen['sets:' + a.gid] = 1;
    });
  });
  toast(adds.length === 1 ? 'Lift logged from your watch' : adds.length + ' lifts logged from your watch');
  return true;
};

/* ---------- goal odds ---------- */
function oddsFor(ev) { if (!App.plan || !App.an) return null; try { return E.goalOdds(App.plan, App.an, ev, lastOf(GX().race)); } catch (e) { return null; } }
function oddsHTML(ev, compact) {
  var o = oddsFor(ev); if (!o) return '';
  var col = o.p >= 70 ? 'var(--green)' : o.p >= 40 ? 'var(--gold)' : 'var(--amber)';
  return '<div class="odds' + (compact ? ' sm' : '') + '"><div class="ring" style="--p:' + o.p + ';--c:' + col + '"><b>' + o.p + '%</b></div><div><b>Chance of ' + E.clock(o.goal) + '</b><p class="small muted">On track for about ' + E.clock(o.expected) + ' in ' + plural(o.weeks, 'week') + (o.garmin ? '. Garmin predicts ' + E.clock(o.garmin) + ' today' : '') + '.' + (o.tips.length && !compact ? ' To raise it: ' + esc(o.tips.join('; ')) + '.' : '') + '</p></div></div>';
}
var _goals7 = VIEWS.goals;
VIEWS.goals = function () {
  var h = _goals7(), evs = (st().events || []).filter(function (e) { return e.date >= App.today; });
  evs.forEach(function (e) {
    var name = esc(e.name || E.distOf(e).label), i = h.indexOf('>' + name + '</h2>'); if (i < 0) return;
    var j = h.indexOf('</section>', i); if (j < 0) return;
    var add = oddsHTML(e) + '<div class="btns" style="margin-top:10px"><a class="btn sm" href="#/racepace/' + encodeURIComponent(e.id) + '">Race-day pacing plan</a></div>';
    h = h.slice(0, j) + add + h.slice(j);
  });
  return h;
};

/* ---------- race-day pacing plan ---------- */
TITLES.racepace = 'Race-day pacing'; TABOF.racepace = 'you';
function evById(id) { return (st().events || []).filter(function (e) { return String(e.id) === String(id); })[0]; }
function raceHeat(ev) {
  var hr = +(ev.hour || 7), w = wxAt(ev.date, hr); if (!w) return { pct: 0, w: null };
  return { pct: E.heatPct(w.dew, w.temp, (GX().acclim || {}).heat || 0), w: w };
}
function elevSVG(elev) {
  if (!elev || elev.length < 2) return '';
  var mn = Math.min.apply(null, elev), mx = Math.max.apply(null, elev), rg = Math.max(20, mx - mn), W = 600, H = 90;
  var pts = elev.map(function (e, i) { return (i / (elev.length - 1) * W).toFixed(1) + ',' + (H - 6 - (e - mn) / rg * (H - 16)).toFixed(1); });
  return '<svg class="elev" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-label="Elevation profile"><polygon points="0,' + H + ' ' + pts.join(' ') + ' ' + W + ',' + H + '" /><polyline points="' + pts.join(' ') + '"/></svg><div class="spread tiny muted"><span>Low ' + Math.round(mn) + ' ft</span><span>High ' + Math.round(mx) + ' ft</span></div>';
}
VIEWS.racepace = function () {
  var ev = evById(App.args[0]); if (!ev) return '<section class="card"><p>Race not found.</p></section>';
  var d = E.distOf(ev), g = E.parseClock(ev.goal), c = ev.course || null;
  if (!(g > 0)) return '<section class="card"><h2>Add a goal time first</h2><p class="small muted">The pacing plan is built from your goal.</p><div class="btns"><a class="btn" href="#/goals">Goals</a></div></section>';
  var hz = raceHeat(ev), rp = E.racePacing(d.mi, g, c && c.elev, hz.pct), days = E.diffD(App.today, ev.date);
  var html = '<div class="pagehead"><div class="eyebrow">' + E.fmtDate(ev.date, { weekday: 'long', month: 'long', day: 'numeric' }) + ' · ' + esc(d.label) + '</div><h1>' + esc(ev.name || d.label) + '</h1><p>Even effort for a ' + E.clock(g) + ' finish' + (c ? ' on this course' : ' on a flat course') + ': slower up the hills, a little quicker down them.</p></div>';
  html += '<div class="pvstats"><div><b>' + E.clock(rp.total) + '</b><span>finish</span></div><div><b>' + pace(rp.avgPace) + '</b><span>avg /mi</span></div><div><b>' + (c ? Math.round(rp.segs.reduce(function (a, s) { return a + s.up; }, 0)) : 0) + '</b><span>ft climb</span></div><div><b>' + (hz.pct ? '+' + Math.round(hz.pct * 100) + '%' : '0%') + '</b><span>heat</span></div></div>';
  html += oddsHTML(ev, true);
  if (c && c.elev) html += '<section class="card">' + elevSVG(c.elev) + '<p class="tiny muted" style="margin-top:6px">' + esc(c.name || 'Course') + ' · ' + E.round1(c.mi) + ' mi from your file</p></section>';
  html += '<section class="card stack"><div class="spread"><h3>Course</h3>' + (c ? '<button class="btn sm ghost" data-act="course-clear" data-arg="' + jattr({ id: ev.id }) + '">Remove</button>' : '') + '</div><p class="small muted">Upload the race\'s GPX file (from the race website, Strava or Garmin Connect courses). Hills are then built into every mile.</p><label class="btn sm filebtn">Choose GPX file<input type="file" accept=".gpx,application/gpx+xml" data-course="' + esc(ev.id) + '" hidden></label>' +
    '<div class="grid2"><label class="f">Start time<select class="i" data-evhour="' + esc(ev.id) + '">' + [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(function (h) { return '<option value="' + h + '"' + (+(ev.hour || 7) === h ? ' selected' : '') + '>' + clockOf(h * 60) + '</option>'; }).join('') + '</select></label><div class="metric"><span>Forecast</span><b style="font-size:1rem">' + (hz.w ? Math.round(hz.w.temp) + '°F · dew ' + Math.round(hz.w.dew) + '°' : days > 15 ? 'in ' + (days - 15) + ' days' : 'add location') + '</b></div></div></section>';
  html += '<div class="sechead"><h2>Mile by mile</h2><button class="btn sm" data-act="print-band">Print pace band</button></div><div class="miles">' + rp.segs.map(function (s) { var fl = Math.abs(s.grade) < 0.5; return '<div class="mile' + (s.grade >= 0.5 ? ' up' : s.grade <= -0.5 ? ' down' : '') + '"><span class="mn">' + (s.len < 1 ? E.round1(d.mi) : s.mile) + '</span><b>' + pace(s.pace) + '</b><em>' + E.clock(s.cum) + '</em><span class="gr">' + (fl ? 'flat' : (s.grade > 0 ? '↗ ' : '↘ ') + Math.abs(s.grade) + '%') + '</span></div>'; }).join('') + '</div>';
  var sent = ev.splits && ev.splits.goal === g && ev.splits.n === rp.segs.length;
  html += '<div class="btns pvfoot"><button class="btn ' + (sent ? '' : 'primary') + '" data-act="race-save" data-arg="' + jattr({ id: ev.id }) + '">' + (sent ? 'Update watch plan' : 'Use on my watch on race day') + '</button></div><p class="tiny muted">' + (sent ? 'Saved: on race morning your watch gets a mile-by-mile workout with these paces.' : 'Saves these paces so race morning\'s watch workout guides you mile by mile.') + ' Heat comes from the forecast once the race is within about two weeks.</p>';
  html += '<div class="band" id="paceBand"><div class="bh">' + esc(ev.name || d.label) + ' · ' + E.clock(rp.total) + '</div>' + rp.segs.map(function (s) { return '<div><b>' + (s.len < 1 ? E.round1(d.mi) : s.mile) + '</b> ' + E.clock(s.cum) + '</div>'; }).join('') + '</div>';
  return html;
};
document.addEventListener('change', function (e) {
  var f = e.target;
  if (f.dataset && f.dataset.evhour) { var id = f.dataset.evhour; Store.edit('events', null, function (S) { S.events.forEach(function (x) { if (String(x.id) === id) x.hour = +f.value; }); }); return; }
  if (!f.dataset || !f.dataset.course || !f.files || !f.files[0]) return;
  var id = f.dataset.course, rd = new FileReader();
  rd.onload = function () {
    try {
      var c = parseGpx(String(rd.result)); if (!c) { toast('No track found in that file'); return; }
      Store.edit('events', null, function (S) { S.events.forEach(function (x) { if (String(x.id) === id) x.course = c; }); });
      toast('Course added: ' + E.round1(c.mi) + ' mi');
    } catch (err) { toast('Could not read that GPX file'); }
  };
  rd.readAsText(f.files[0]);
});
function parseGpx(txt) {
  var doc = new DOMParser().parseFromString(txt, 'application/xml'), pts = doc.getElementsByTagName('trkpt');
  if (!pts.length) pts = doc.getElementsByTagName('rtept');
  if (pts.length < 2) return null;
  var R = 3958.8, rad = Math.PI / 180, cum = 0, prev = null, P = [];
  for (var i = 0; i < pts.length; i++) {
    var la = +pts[i].getAttribute('lat'), lo = +pts[i].getAttribute('lon'), el = pts[i].getElementsByTagName('ele')[0], ft = el ? +el.textContent * 3.28084 : 0;
    if (prev) { var dla = (la - prev[0]) * rad, dlo = (lo - prev[1]) * rad, a = Math.sin(dla / 2) * Math.sin(dla / 2) + Math.cos(prev[0] * rad) * Math.cos(la * rad) * Math.sin(dlo / 2) * Math.sin(dlo / 2); cum += 2 * R * Math.asin(Math.sqrt(a)); }
    P.push([cum, ft]); prev = [la, lo];
  }
  var out = [], j = 0;
  for (var m = 0; m <= cum + 1e-9; m += 0.1) { while (j < P.length - 2 && P[j + 1][0] < m) j++; var a2 = P[j], b2 = P[Math.min(j + 1, P.length - 1)], f2 = b2[0] > a2[0] ? (m - a2[0]) / (b2[0] - a2[0]) : 0; out.push(Math.round(a2[1] + (b2[1] - a2[1]) * Math.max(0, Math.min(1, f2)))); }
  /* smooth GPS elevation noise */
  var sm = out.map(function (v, i) { var s = 0, n = 0; for (var k = -2; k <= 2; k++) { if (out[i + k] != null) { s += out[i + k]; n++; } } return Math.round(s / n); });
  var nm = doc.getElementsByTagName('name')[0];
  return { mi: Math.round(cum * 100) / 100, elev: sm, name: nm ? nm.textContent.slice(0, 60) : 'Course' };
}
ACTIONS['course-clear'] = function (a) { Store.edit('events', null, function (S) { S.events.forEach(function (x) { if (String(x.id) === String(a.id)) delete x.course; }); }); };
ACTIONS['race-save'] = function (a) {
  var ev = evById(a.id), d = E.distOf(ev), g = E.parseClock(ev.goal), rp = E.racePacing(d.mi, g, ev.course && ev.course.elev, raceHeat(ev).pct);
  Store.edit('events', null, function (S) { S.events.forEach(function (x) { if (String(x.id) === String(a.id)) x.splits = { goal: g, n: rp.segs.length, heat: raceHeat(ev).pct, miles: rp.segs.map(function (s) { return [E.round1(s.len), s.pace]; }) }; }); });
  toast('Race-day watch plan saved');
};
ACTIONS['print-band'] = function () { document.body.classList.add('printband'); setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove('printband'); }, 500); }, 50); };

/* ---------- season timeline on the plan ---------- */
var PH_COLOR = { base: 'var(--green)', build: 'var(--blue)', thr: 'var(--gold)', spec: 'var(--amber)', peak: 'var(--red)', taper: 'var(--violet)', race: 'var(--violet)', recov: 'var(--slate)', maint: 'var(--gray)' };
function seasonCard() {
  var p = App.plan; if (!p) return '';
  var segs = [], t = App.today;
  p.weeks.forEach(function (w) { var k = w.phase.key, last = segs[segs.length - 1]; if (last && last.k === k && last.name === w.phase.name) last.n++; else segs.push({ k: k, name: w.phase.name, n: 1, start: w.start }); });
  var N = p.weeks.length, cur = App.week ? App.week.n : 0;
  var flags = (st().events || []).filter(function (e) { return e.date >= p.start; }).map(function (e) { var w = E.weekOf(p, e.date); return w ? '<span class="flag" style="left:' + ((w.n - 0.5) / N * 100).toFixed(1) + '%" title="' + esc(e.name || '') + '">🏁</span>' : ''; }).join('');
  return '<section class="card season"><div class="spread"><h3>Your season</h3><span class="tiny muted">' + N + ' weeks</span></div><div class="sbar">' + segs.map(function (s) { return '<i style="flex:' + s.n + ';background:' + (PH_COLOR[s.k] || 'var(--gray)') + '" title="' + esc(s.name) + '"></i>'; }).join('') + (cur ? '<span class="now" style="left:' + ((cur - 0.5) / N * 100).toFixed(1) + '%"></span>' : '') + flags + '</div>' +
    '<div class="slegend">' + segs.filter(function (s, i, a) { return a.findIndex(function (x) { return x.name === s.name; }) === i; }).map(function (s) { return '<span><i style="background:' + (PH_COLOR[s.k] || 'var(--gray)') + '"></i>' + esc(s.name) + '</span>'; }).join('') + '</div></section>';
}
/* (the season chart lives on the Plan page itself; see ui.js) */

/* ---------- fitness page: Garmin metrics, shin load, recovery profile, durability ---------- */
function gTile(label, val, sub, cls) { return '<div class="tile ' + (cls || '') + '"><span>' + label + '</span><b>' + val + '</b><em>' + (sub || '&nbsp;') + '</em></div>'; }
function garminMetricsCard() {
  var x = GX(); if (!x.updated) return '<section class="card"><h3>Garmin metrics</h3><p class="small muted">Waiting for the first "Garmin metrics" run. It reads your threshold, readiness, HRV status and more a few times a day.</p></section>';
  var t = [];
  if (x.lt && x.lt.pace) t.push(gTile('Threshold', pace(x.lt.pace) + '<small>/mi</small>', (x.lt.hr ? x.lt.hr + ' bpm · ' : '') + fmtD(x.lt.date, { month: 'short', day: 'numeric' })));
  var rr = lastOf(x.readiness); if (rr) t.push(gTile('Readiness', rr.score, phraseText(rr.level)));
  var hv = lastOf(x.hrv); if (hv) t.push(gTile('HRV status', hv.last + '<small> ms</small>', phraseText(hv.status) + ' · ' + hv.lo + '–' + hv.hi));
  if (x.status) t.push(gTile('Training status', phraseText(x.status.phrase), x.status.acwr ? 'load ratio ' + x.status.acwr : ''));
  if (x.endurance) { var lim = x.endurance.limits || {}, cls = x.endurance.score >= lim.Elite ? 'Elite' : x.endurance.score >= lim.Superior ? 'Superior' : x.endurance.score >= lim.Expert ? 'Expert' : x.endurance.score >= lim.WellTrained ? 'Well trained' : x.endurance.score >= lim.Trained ? 'Trained' : 'Intermediate'; t.push(gTile('Endurance score', Math.round(x.endurance.score).toLocaleString(), cls)); }
  if (x.hill) t.push(gTile('Hill score', x.hill.score, 'strength ' + x.hill.strength + ' · endurance ' + x.hill.endurance));
  if (x.acclim) t.push(gTile('Heat acclimation', (x.acclim.heat || 0) + '%', x.acclim.altTrend ? 'altitude ' + phraseText(x.acclim.altTrend) : ''));
  var html = '<section class="card"><div class="spread"><h3>Garmin metrics</h3><span class="tiny muted">updated ' + new Date(x.updated).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' }) + '</span></div><div class="tiles k3" style="margin-top:8px">' + t.join('') + '</div>';
  var race = lastOf(x.race), an = App.an;
  if (race && an && an.proj) html += '<div class="sechead" style="margin-top:14px"><h2 style="font-size:1rem">Race predictions</h2></div><div class="predcmp">' + [['5K', 'k5'], ['10K', 'k10'], ['Half', 'half'], ['Marathon', 'full']].map(function (r) { return '<div><span>' + r[0] + '</span><b>' + E.clock(race[r[1]]) + '</b><em>app ' + E.clock(an.proj[r[1]]) + '</em></div>'; }).join('') + '</div><p class="tiny muted" style="margin-top:6px">Garmin on top, the app\'s VDOT estimate below. Goal odds blend both.</p>';
  return html + '</section>';
}
function shinCard() {
  var sh = App.an && App.an.shin; if (!sh) return '';
  var w = App.week, max = Math.max.apply(null, sh.weeks.map(function (x) { return x.mi; }).concat([sh.ceiling, w ? w.tot.mi : 0])) * 1.1 || 10;
  var bars = sh.weeks.map(function (x) { return '<div class="sb"><i style="height:' + Math.max(2, x.mi / max * 100) + '%"></i><span>' + Math.round(x.mi) + '</span></div>'; }).join('') + (w ? '<div class="sb next"><i style="height:' + Math.max(2, w.tot.mi / max * 100) + '%"></i><span>' + Math.round(w.tot.mi) + '</span></div>' : '');
  return '<section class="card"><div class="spread"><h3>Shin load</h3><span class="pill ' + (sh.thisWeek && sh.thisWeek.risk !== 'ok' ? 'warn' : 'good') + '">Ceiling ' + sh.ceiling + ' mi</span></div><p class="small muted" style="margin-top:4px">Your personal weekly limit: about 10% above the ' + sh.a4 + ' mi you have averaged for 4 weeks, never far past the biggest week you handled without pain (' + sh.safe + ' mi). It rises as you do.</p>' +
    '<div class="shinbars" style="--ceil:' + (sh.ceiling / max * 100).toFixed(1) + '%">' + bars + '<div class="ceil"><span>' + sh.ceiling + '</span></div></div><p class="tiny muted">Last 10 weeks, then this week as planned. The dashed line is your ceiling.</p>' +
    (sh.reasons.length ? '<ul class="plain small" style="margin-top:8px">' + sh.reasons.map(function (r) { return '<li>' + esc(r[0].toUpperCase() + r.slice(1)) + '</li>'; }).join('') + '</ul>' : '') +
    '<label class="check small" style="margin-top:8px"><input type="checkbox" data-shincap' + ((st().prefs || {}).shinCap !== false ? ' checked' : '') + '> Automatically trim weeks that go over the ceiling</label></section>';
}
document.addEventListener('change', function (e) { if (e.target.hasAttribute && e.target.hasAttribute('data-shincap')) { var on = e.target.checked; Store.edit('prefs', 'shinCap', function (S) { S.prefs = S.prefs || {}; S.prefs.shinCap = on; }); toast(on ? 'Shin cap on' : 'Shin cap off'); } });
function recoveryCard() {
  var r = App.an && App.an.recovery; if (!r || !Object.keys(r).length) return '';
  var lab = { long: 'Long runs', hard: 'Hard runs', lift: 'Lifts' };
  return '<section class="card"><h3>Your recovery</h3><p class="small muted" style="margin-top:4px">How long your HRV and resting heart rate take to settle after each kind of session, from your own Garmin history.</p><div class="recov">' + ['long', 'hard', 'lift'].filter(function (k) { return r[k]; }).map(function (k) { var x = r[k]; return '<div><span>' + lab[k] + '</span><b>' + x.days + '<small> days</small></b><em>' + (x.hrvDrop != null ? 'HRV ' + (x.hrvDrop > 0 ? '+' : '') + x.hrvDrop + '% next day · ' : '') + x.n + ' sessions</em></div>'; }).join('') + '</div>' + (r.long && r.long.n < 3 ? '<p class="tiny muted" style="margin-top:6px">Long-run recovery needs a few more long runs to be reliable.</p>' : '') + '</section>';
}
function durabilityCard() {
  var x = GX(), rows = [];
  Object.keys(x.laps || {}).forEach(function (k) { var e = x.laps[k], du = E.durability(e.laps), tot = (e.laps || []).reduce(function (a, l) { return a + (l.d || 0); }, 0) / E.MI_M; if (du && tot >= 6) rows.push({ date: e.date, mi: tot, d: du.decouple }); });
  if (!rows.length) return '';
  rows.sort(function (a, b) { return a.date < b.date ? 1 : -1; });
  return '<section class="card"><h3>Durability</h3><p class="small muted" style="margin-top:4px">Heart-rate drift on runs of 6+ miles. Under 5% means your aerobic engine holds steady late in a run, the base a marathon needs.</p><div class="durs">' + rows.slice(0, 6).map(function (r) { return '<div><span>' + fmtD(r.date, { month: 'short', day: 'numeric' }) + ' · ' + mi(r.mi) + ' mi</span><b class="' + (r.d <= 5 ? 'ok' : r.d <= 8 ? 'mid' : 'low') + '">' + r.d + '%</b></div>'; }).join('') + '</div></section>';
}
var _fitness7 = VIEWS.fitness;
VIEWS.fitness = function () { var h = _fitness7(); if (!App.plan) return h; var i = h.indexOf('</div>', h.indexOf('class="pagehead"')); var add = garminMetricsCard() + shinCard() + recoveryCard() + durabilityCard(); return i > 0 ? h.slice(0, i + 6) + add + h.slice(i + 6) : add + h; };

/* ---------- nutrition: sweat rate and Garmin food log ---------- */
function sweatHTML() {
  var sw = ((st().prefs || {}).sweat || []).slice(-3), last = sw[sw.length - 1];
  return '<section class="card"><div class="spread"><h3>Sweat rate</h3><button class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'sweat' }) + '">Test</button></div>' +
    (last ? '<p class="small" style="margin-top:4px">You lose about <b>' + last.ozh + ' oz an hour</b> (' + fmtD(last.date, { month: 'short', day: 'numeric' }) + ', ' + last.temp + '). Aim to drink ' + Math.round(last.ozh * 0.6) + '–' + Math.round(last.ozh * 0.8) + ' oz an hour on runs over 75 minutes and on race day.</p>' : '<p class="small muted" style="margin-top:4px">Weigh yourself before and after a 60-minute run, note what you drank, and the app works out how much to drink on long runs and race day.</p>') + '</section>';
}
SHEETS.sweat = function () { return '<h3>Sweat-rate test</h3><p class="small muted">Weigh yourself nude, dry, right before and right after the run.</p><div class="grid2"><label class="f">Before (lb)<input class="i" type="number" step="0.1" id="swA" inputmode="decimal"></label><label class="f">After (lb)<input class="i" type="number" step="0.1" id="swB" inputmode="decimal"></label><label class="f">Drank (oz)<input class="i" type="number" id="swC" value="0" inputmode="decimal"></label><label class="f">Run time (min)<input class="i" type="number" id="swD" value="60" inputmode="numeric"></label></div><label class="f">Conditions<select class="i" id="swE"><option>cool</option><option selected>mild</option><option>warm</option><option>hot and humid</option></select></label>' + sheetBtns('Save'); };
SAVE2.sweat = function () {
  var a = +$('#swA').value, b = +$('#swB').value, c = +$('#swC').value || 0, d = +$('#swD').value || 60;
  if (!(a > 0 && b > 0 && a >= b && d > 0)) { $('#shErr').textContent = 'Enter both weights (after should be the same or lower).'; return false; }
  var ozh = Math.round(((a - b) * 16 + c) / (d / 60));
  Store.edit('prefs', 'sweat', function (S) { S.prefs = S.prefs || {}; S.prefs.sweat = (S.prefs.sweat || []).concat([{ date: App.today, ozh: ozh, temp: $('#swE').value }]).slice(-10); });
  closeSheet(); toast('About ' + ozh + ' oz an hour'); return true;
};
function foodHTML() {
  var f = GX().food, y = E.addD(App.today, -1), r = f && f[y];
  if (!r) return '';
  if (!r.items) return '<section class="card"><h3>Food log</h3><p class="small muted" style="margin-top:4px">Log meals in Garmin Connect and the app compares your carbs and protein with what yesterday\'s training needed.</p></section>';
  var nu = null; try { var d0 = dayOf(y); nu = E.nutrition(d0, st().profile.weightKg, zonesAt(y), dayOf(App.today), null, null); } catch (e) { nu = null; }
  var row = function (lab, got, rng) { return '<div><span>' + lab + '</span><b>' + got + ' g</b><em>' + (rng ? 'target ' + rng[0] + '–' + rng[1] + ' g' : '') + '</em></div>'; };
  return '<section class="card"><h3>Yesterday\'s food (Garmin)</h3><div class="recov" style="margin-top:8px">' + row('Carbs', r.carbs, nu && nu.carbG) + row('Protein', r.protein, nu && nu.protG) + '<div><span>Calories</span><b>' + r.kcal + '</b><em>' + (r.goalKcal ? 'goal ' + Math.round(r.goalKcal) : '') + '</em></div></div></section>';
}
var _nutrition7 = VIEWS.nutrition;
VIEWS.nutrition = function () { return _nutrition7() + foodHTML() + sweatHTML(); };

/* ---------- cycle phase (shown only when Garmin has cycle data) ---------- */
var CYCLE_NOTE = { MENSTRUAL: 'Menstrual phase: train as planned if you feel good; iron-rich food and extra sleep help.', FOLLICULAR: 'Follicular phase: often the best window for hard sessions and heavier lifts.', OVULATION: 'Around ovulation: strength is high; warm up well.', LUTEAL: 'Luteal phase: heat feels harder and effort runs higher; slow easy paces a little, add carbs and fluids.' };
function cycleChip() { var c = GX().cycle; if (!c || !c.phase) return ''; var k = String(c.phase).toUpperCase().replace(/_.*/, ''); var n = CYCLE_NOTE[k] || ''; return n ? '<div class="banner info small"><b>Cycle day ' + (c.day || '?') + '.</b> ' + esc(n) + '</div>' : ''; }

/* ---------- Today: conditions, sleep, shift and cycle notes ---------- */
var _today7 = VIEWS.today;
VIEWS.today = function () {
  var h = _today7(); if (!App.plan) return h;
  var sh = allShifts()[App.today], day = dayOf(App.today);
  var shiftNote = sh ? '<div class="banner small"><b>' + (sh === 'night' ? 'Night shift tonight.' : sh === 'eve' ? 'Evening shift today.' : 'Work day.') + '</b> ' + (day && day.parts.some(function (p) { return p.note && /shift/i.test(p.note); }) ? 'Today\'s plan is adjusted around it.' : 'Keep today easy and fuel well.') + '</div>' : '';
  var add = shiftNote + conditionsCard() + cycleChip();
  var i = h.indexOf('<section class="card lv-');
  if (i < 0) i = h.indexOf('<div class="sechead"><h2>This week');
  h = i > 0 ? h.slice(0, i) + add + h.slice(i) : h + add;
  var s = sleepCard(); if (s) { var j = h.indexOf('<div class="sechead"><h2>Fuel today'); h = j > 0 ? h.slice(0, j) + s + h.slice(j) : h + s; }
  return h;
};

/* ---------- dashboard: goal odds, Garmin metrics, shin load ---------- */
var _dash7 = VIEWS.dash;
VIEWS.dash = function () {
  var h = _dash7(); if (!App.plan) return h;
  var evs = (st().events || []).filter(function (e) { return e.date >= App.today && E.parseClock(e.goal) > 0; });
  var odds = evs.length ? '<section class="card c6"><h3>Goal odds</h3><div class="stack tight" style="margin-top:8px">' + evs.slice(0, 3).map(function (e) { return '<div><div class="tiny muted" style="margin-bottom:4px">' + esc(e.name || E.distOf(e).label) + '</div>' + oddsHTML(e, true) + '</div>'; }).join('') + '</div></section>' : '';
  var add = odds + '<div class="c6">' + garminMetricsCard() + '</div><div class="c6">' + shinCard() + '</div>';
  var i = h.lastIndexOf('<section', h.indexOf('<h3>Recent runs'));
  return i > 0 ? h.slice(0, i) + add + h.slice(i) : h.replace(/<\/div>$/, add + '</div>');
};

/* ---------- share the app: a kit for friends and family ---------- */
TITLES.shareapp = 'Set up for someone else';
VIEWS.shareapp = function () {
  var kit = 'https://github.com/abohn94/run-plan/tree/main/template';
  return '<div class="pagehead"><h1>Set it up for someone else</h1><p>Each person gets their own private copy of the data, their own plan and their own Garmin sync. The app itself is shared.</p></div><section class="card stack">' +
    '<div class="step"><span>1</span><div><b>Create a private GitHub repository</b><p class="small muted">On their GitHub account: New repository, any name (for example <code>run-plan-data</code>), set to <b>Private</b>.</p></div></div>' +
    '<div class="step"><span>2</span><div><b>Add the setup files</b><p class="small muted">Copy the files from the <a href="' + kit + '" target="_blank" rel="noopener">template folder</a> into it, keeping the folders (<code>.github/workflows</code> and <code>scripts</code>).</p></div></div>' +
    '<div class="step"><span>3</span><div><b>Add their Garmin keys as secrets</b><p class="small muted"><code>GARMIN_PERSONAL_API_KEY</code> for the hourly sync; <code>GARMIN_EMAIL</code> and <code>GARMIN_PASSWORD</code> for watch workouts and Garmin metrics.</p></div></div>' +
    '<div class="step"><span>4</span><div><b>Connect on their phone</b><p class="small muted">Open this app on their phone, go to You → Garmin & sync, and connect their repository with their own GitHub token. Their plan, races and data stay separate from yours.</p></div></div></section>' +
    '<p class="tiny muted">For anyone who tracks their cycle in Garmin Connect, Today shows a short phase note and paces adjust for heat as usual.</p>';
};
var _you7 = VIEWS.you;
VIEWS.you = function () { var h = _you7(), link = '<a href="#/shareapp">Set up for someone else<span class="v"></span><span class="chev">›</span></a>', i = h.indexOf('<a href="#/sync"'); return i < 0 ? h : h.slice(0, i) + link + h.slice(i); };


/* ---------- Google Calendar (private iCal address, read by the hourly sync) ---------- */
App.cal = (function () { try { return JSON.parse(LS.get('rp-gcal') || 'null'); } catch (e) { return null; } })();
function loadCal() {
  if (Store.mode !== 'github' || loadCal.busy) return; loadCal.busy = true;
  Store.getFile('garmin/calendar.json').then(function (f) {
    loadCal.busy = false; if (!f || !f.text) return;
    var j = JSON.parse(f.text), changed = !App.cal || j.updated !== App.cal.updated;
    App.cal = j; LS.set('rp-gcal', f.text);
    if (changed) { recompute(); if ($('#sheet').hidden) render(); }
  }, function () { loadCal.busy = false; });
}
setTimeout(loadCal, 1700);
var _onchange7c = Store.onchange;
Store.onchange = function (why) { _onchange7c(why); if (why === 'init' || why === 'pull' || why === 'garmin') setTimeout(loadCal, 600); };
/* your own taps win over the calendar; "off" clears a calendar shift */
function allShifts() {
  var out = Object.assign({}, (App.cal && App.cal.shifts) || {}), mine = st().shifts || {};
  Object.keys(mine).forEach(function (d) { if (mine[d] === 'off') delete out[d]; else out[d] = mine[d]; });
  return out;
}
var _recompute7c = recompute;
recompute = function () {
  try { Object.defineProperty(Store.state, 'shiftsAll', { value: allShifts(), configurable: true, enumerable: false, writable: true }); } catch (e) { /* no state yet */ }
  try { Object.defineProperty(Store.state, 'shiftEnds', { value: (App.cal && App.cal.ends) || {}, configurable: true, enumerable: false, writable: true }); } catch (e) { /* no state yet */ }
  _recompute7c();
};
function fmtMin(m) { var h = Math.floor(m / 60), mm = m % 60; return (h % 12 || 12) + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '') + (h < 12 ? 'a' : 'p'); }
/* free stretches of 45+ minutes between 5 AM and 9 PM */
function freeWindows(date) {
  var b = App.cal && App.cal.busy && App.cal.busy[date]; if (!App.cal) return '';
  var lo = 300, hi = 1260, cur = lo, out = [];
  (b || []).forEach(function (iv) { if (iv[1] <= lo || iv[0] >= hi) return; if (iv[0] - cur >= 45) out.push([cur, iv[0]]); cur = Math.max(cur, iv[1]); });
  if (hi - cur >= 45) out.push([cur, hi]);
  if (!out.length) return '';
  if (out.length === 1 && out[0][0] === lo && out[0][1] === hi) return 'all day';
  return out.slice(0, 3).map(function (x) { return x[1] === hi ? 'after ' + fmtMin(x[0]) : x[0] === lo ? 'until ' + fmtMin(x[1]) : fmtMin(x[0]) + '–' + fmtMin(x[1]); }).join(', ');
}
/* trips and time off on the calendar -> offer to plan around them */
function awayBlocks() {
  var a = (App.cal && App.cal.away) || {}, ds = Object.keys(a).filter(function (d) { return d >= App.today && d <= E.addD(App.today, 28); }).sort(), out = [];
  ds.forEach(function (d) { var last = out[out.length - 1]; if (last && last.kind === a[d] && E.addD(last.to, 1) === d) last.to = d; else out.push({ kind: a[d], from: d, to: d }); });
  var life = st().life || [], seen = (st().prefs || {}).calSeen || {};
  return out.filter(function (b) { return !seen[b.from + b.kind] && !life.some(function (l) { return l.from <= b.to && l.to >= b.from; }); });
}
function awayCard() {
  var b = awayBlocks()[0]; if (!b) return '';
  var span = b.from === b.to ? fmtD(b.from, { weekday: 'short', month: 'short', day: 'numeric' }) : fmtD(b.from, { month: 'short', day: 'numeric' }) + '–' + fmtD(b.to, { month: 'short', day: 'numeric' });
  return '<section class="card awayc"><div class="eyebrow">From your calendar</div><h3 style="margin-top:2px">' + (b.kind === 'vacation' ? 'Time off ' : 'Travel ') + span + '</h3><p class="small muted" style="margin-top:4px">Want the plan to work around it? Runs can stay light and short, or pause, and the week after ramps back gently.</p><div class="btns" style="margin-top:10px">' +
    (b.kind === 'vacation' ? '<button class="btn sm primary" data-act="away-add" data-arg="' + jattr({ b: b, level: 'light' }) + '">Keep running, lighter</button><button class="btn sm" data-act="away-add" data-arg="' + jattr({ b: b, level: 'off' }) + '">No running</button>' : '<button class="btn sm primary" data-act="away-add" data-arg="' + jattr({ b: b, level: null }) + '">Plan around the trip</button>') +
    '<button class="btn sm ghost" data-act="away-skip" data-arg="' + jattr({ k: b.from + b.kind }) + '">No change</button></div></section>';
}
ACTIONS['away-add'] = function (a) { var b = a.b, id = 'cal' + b.from; Store.edit('life', null, function (S) { S.life = (S.life || []).concat([{ id: id, kind: b.kind === 'vacation' ? 'vacation' : 'travel', level: a.level || null, from: b.from, to: b.to, note: 'from your calendar' }]); }); toast('Plan adjusted for ' + (b.kind === 'vacation' ? 'your time off' : 'your trip')); };
ACTIONS['away-skip'] = function (a) { Store.edit('prefs', 'calSeen', function (S) { S.prefs = S.prefs || {}; S.prefs.calSeen = S.prefs.calSeen || {}; S.prefs.calSeen[a.k] = 1; }); };
var _today7c = VIEWS.today;
VIEWS.today = function () {
  var h = _today7c(), c = App.plan ? awayCard() : ''; if (!c) return h;
  var i = h.indexOf('<section class="card cond'); return i > 0 ? h.slice(0, i) + c + h.slice(i) : h + c;
};
var _preview7c = VIEWS.preview;
VIEWS.preview = function () {
  var h = _preview7c(), w = pvWeek(); if (!w || !App.cal) return h;
  /* busy evenings and mornings under each day */
  w.days.forEach(function (d) { var fw = freeWindows(d.date); if (!fw || fw === 'all day') return; var tag = '<div class="pvfree">Free ' + esc(fw) + '</div>'; var k = 'data-pvday="' + d.date + '"'; var i = h.indexOf(k); if (i < 0) return; var j = h.indexOf('<div class="pvitems', i); if (j < 0) return; var e = h.indexOf('>', j) + 1; h = h.slice(0, e) + tag + h.slice(e); });
  return h;
};

TITLES.calsync = 'Google Calendar';
VIEWS.calsync = function () {
  var c = App.cal, p = (st().prefs || {}).cal || {}, gh = Store.mode === 'github';
  var nextShifts = c ? Object.keys(allShifts()).filter(function (d) { return d >= App.today && d <= E.addD(App.today, 13); }).sort() : [];
  var html = '<div class="pagehead"><h1>Google Calendar</h1><p>Your work shifts, trips and busy times shape the plan: key runs land on days off, wake-up times follow your shifts, and runs are suggested in your free windows.</p></div>';
  html += '<section class="card stack"><div class="spread"><h3>Status</h3><span class="pill ' + (c ? 'good' : '') + '">' + (c ? 'Connected' : 'Not connected') + '</span></div>' +
    (c ? '<p class="small">' + plural(c.calendars || 1, 'calendar') + ' · ' + (nextShifts.length ? plural(nextShifts.length, 'shift') + ' in the next 2 weeks: ' + nextShifts.map(function (d) { return fmtD(d, { weekday: 'short', month: 'numeric', day: 'numeric' }) + (allShifts()[d] === 'night' ? ' ☾' : allShifts()[d] === 'eve' ? ' (evening)' : ''); }).join(', ') : 'no work shifts found in the next 2 weeks (check the keywords below)') + '</p><p class="tiny muted">Checked every hour with your Garmin sync. Last change ' + new Date(c.updated).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) + '.</p>' : '<p class="small muted">' + (gh ? 'Follow the steps below; the first read happens at the next hourly sync, or tap Sync now.' : 'Connect your data repository first (You → Garmin & sync).') + '</p>') +
    (gh ? '<div class="btns"><button class="btn sm" data-act="syncnow">Sync now</button></div>' : '') + '</section>';
  html += '<div class="sechead"><h2>One-time setup</h2></div><section class="card stack">' +
    '<div class="step"><span>1</span><div><b>Copy your calendar\'s private address</b><p class="small muted">On a computer, open Google Calendar → ⚙ Settings → under "Settings for my calendars" pick the calendar with your shifts → <b>Integrate calendar</b> → copy <b>Secret address in iCal format</b>. (The phone app doesn\'t show it.) Repeat for a second calendar if your shifts and personal events are separate.</p></div></div>' +
    '<div class="step"><span>2</span><div><b>Save it as a GitHub secret</b><p class="small muted">In your data repository: Settings → Secrets and variables → Actions → New repository secret. Name: <code>GCAL_ICS_URLS</code>. Secret: the address (several addresses go one per line). Treat it like a password: anyone with it can see that calendar.</p></div></div>' +
    '<div class="step"><span>3</span><div><b>Tap Sync now</b><p class="small muted">In a minute or two your shifts appear in the week preview and the plan adjusts.</p></div></div></section>';
  var v = function (k, d) { return esc((p[k] || d).join(', ')); };
  html += '<section class="card stack"><h3>How events are read</h3><p class="small muted">Only what the plan needs is saved: shift days, busy times and trip dates. Event titles never leave the sync job.</p>' +
    '<label class="f">Work shift words<input class="i" id="calW" value="' + v('work', ['work', 'shift', 'cvicu', 'icu', 'hospital', 'on call', 'charge']) + '"></label>' +
    '<label class="f">Time-off words (all-day events)<input class="i" id="calV" value="' + v('vacation', ['vacation', 'pto', 'holiday', 'day off', 'time off']) + '"></label>' +
    '<label class="f">Travel words<input class="i" id="calT" value="' + v('travel', ['flight', 'travel', 'trip', 'airport', 'hotel', 'conference']) + '"></label>' +
    '<label class="check"><input type="checkbox" id="calWk"' + ((st().prefs || {}).weekendDayOff !== false ? ' checked' : '') + '> No training on weekends when I work a day shift (evening-shift weekends are fine)</label>' +
    '<label class="f">Commute to work (minutes)<input class="i" id="calC" type="number" inputmode="numeric" value="' + esc((st().prefs || {}).commute || 40) + '"></label>' +
    '<p class="tiny muted">A work event 5+ hours long counts as a shift: starting before 11 AM is a day shift, 11 AM to 7 PM an evening shift, and after 7 PM (or running past 3 AM) a night shift. You can still tap any day in the week preview to change it.</p><div class="btns"><button class="btn primary sm" data-act="cal-save">Save</button></div></section>';
  return html;
};
ACTIONS['cal-save'] = function () {
  var sp = function (id) { return $(id).value.split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(Boolean); };
  var cal = { work: sp('#calW'), vacation: sp('#calV'), travel: sp('#calT') }, com = +$('#calC').value || 40;
  var wk = $('#calWk').checked; Store.edit('prefs', 'cal', function (S) { S.prefs = S.prefs || {}; S.prefs.cal = cal; S.prefs.commute = com; S.prefs.weekendDayOff = wk; });
  toast('Saved. Applies at the next sync');
};
var _you7c = VIEWS.you;
VIEWS.you = function () { var h = _you7c(), link = '<a href="#/calsync">Google Calendar<span class="v">' + (App.cal ? 'Connected' : 'Off') + '</span><span class="chev">›</span></a>', i = h.indexOf('<a href="#/notify"'); return i < 0 ? h : h.slice(0, i) + link + h.slice(i); };


/* ---------- where you train, daylight comfort and usual time (setup step + settings card) ---------- */
if (WIZ_STEPS.indexOf('place') < 0) WIZ_STEPS.splice(WIZ_STEPS.indexOf('match'), 0, 'place');
function placeBody(compact) {
  var pr = st().prefs || {}, L = pr.loc, sun = L && E.sunTimes(App.today, L.lat, L.lon), dk = pr.darkRun, rh = pr.runHour;
  var chip = function (act, arg, on, label) { return '<button type="button" class="chip" data-act="' + act + '" data-arg="' + jattr(arg) + '" aria-pressed="' + !!on + '">' + label + '</button>'; };
  return '<div class="card stack"><label class="f">Where do you do most of your running?' + (L ? '<div class="locpick"><b>' + esc(L.name) + '</b><button type="button" class="btn sm ghost" data-act="sheet" data-arg="' + jattr({ sheet: 'loc' }) + '">Change</button></div>' : '<div class="btns"><button type="button" class="btn sm primary" data-act="loc-gps">Use my location</button><button type="button" class="btn sm" data-act="sheet" data-arg="' + jattr({ sheet: 'loc' }) + '">Enter a city</button></div>') + '</label>' +
    (sun ? '<p class="small muted">Today there: sunrise ' + E.clockMin(sun.rise) + ', sunset ' + E.clockMin(sun.set) + '.</p>' : '') +
    '<label class="f">Are you comfortable running outside in the dark?<div class="chips">' + chip('pl-dark', { v: true }, dk === true, 'Yes, that\'s fine') + chip('pl-dark', { v: false }, dk === false, 'No, daylight only') + '</div></label>' +
    '<label class="f">When do you usually train?<div class="chips">' + [[6, 'Early morning'], [9, 'Mid-morning'], [12, 'Midday'], [17, 'After work'], [19, 'Evening']].map(function (o) { return chip('pl-hour', { v: o[0] }, +rh === o[0], o[1]); }).join('') + '</div></label>' +
    '<p class="tiny muted">Your location is used for sunrise and sunset times and the weather forecast, so runs land in daylight' + (dk === false ? ' (after-work runs move to the treadmill once it\'s dark)' : '') + ' and paces adjust for heat. It stays in your private data.</p></div>';
}
ACTIONS['pl-dark'] = function (a) { Store.edit('prefs', 'darkRun', function (S) { S.prefs = S.prefs || {}; S.prefs.darkRun = a.v; }); };
ACTIONS['pl-hour'] = function (a) { Store.edit('prefs', 'runHour', function (S) { S.prefs = S.prefs || {}; S.prefs.runHour = a.v; }); };
var _setup7p = VIEWS.setup;
VIEWS.setup = function () {
  var h = _setup7p(), z = App.wiz;
  if (!z || WIZ_STEPS[z.step] !== 'place') return h;
  var ok = (st().prefs || {}).darkRun != null;
  return h + '<div class="stack"><div class="q"><h1>Where and when do you train?</h1><p class="lead">This tailors your plan to daylight and weather where you live.</p></div>' + placeBody() + '<p class="err" id="wizErr">' + (ok ? '' : '') + '</p>' + wizFoot('Continue', ok, false) + '</div>';
};
var _settings7p = VIEWS.settings;
VIEWS.settings = function () {
  var h = _settings7p();
  return h.replace('<section class="card stack"><h3>App</h3>', '<section class="card stack"><h3>Location & daylight</h3>' + placeBody(true).replace(/^<div class="card stack">/, '').replace(/<\/div>$/, '') + '</section><section class="card stack"><h3>App</h3>');
};


/* ---------- indoor / outdoor switch on every run ---------- */
function venueKey(date, x) { return x.akey || E.partKey(x.moved || date, x); }
function venueBar(x, date) {
  if (!E.isRun(x) || x.type === 'race' || date < App.today) return '';
  var tm = !!x.treadmill, L = loc(), sun = L && E.sunTimes(date, L.lat, L.lon);
  return '<div class="venue" role="group" aria-label="Where you run"><button class="vbtn" data-act="venue" data-arg="' + jattr({ k: venueKey(date, x), v: 'out', date: date }) + '" aria-pressed="' + !tm + '">☀ Outdoors</button><button class="vbtn" data-act="venue" data-arg="' + jattr({ k: venueKey(date, x), v: 'in', date: date }) + '" aria-pressed="' + tm + '">🏃 Treadmill</button>' + (sun ? '<span class="vsun">' + E.clockMin(sun.rise).replace(' AM', 'a') + '–' + E.clockMin(sun.set).replace(' PM', 'p') + '</span>' : '') + '</div>';
}
ACTIONS.venue = function (a) {
  Store.edit('venue', a.k, function (S) { S.venue = S.venue || {}; S.venue[a.k] = a.v; var cut = E.addD(App.today, -14); Object.keys(S.venue).forEach(function (k) { if (k.split('|')[0] < cut) delete S.venue[k]; }); });
  toast(a.v === 'in' ? 'Moved to the treadmill' : 'Running outdoors');
};
var _hero7v = heroHTML;
heroHTML = function (x, date, zz) { return _hero7v(x, date, zz) + venueBar(x, date); };
var _partDetail7v = partDetail;
partDetail = function (x, date, w, zz, l, idx) { var h = _partDetail7v(x, date, w, zz, l, idx), b = venueBar(x, date); if (!b) return h; var i = h.indexOf('</section>'); return i > 0 ? h.slice(0, i) + b + h.slice(i) : h + b; };
