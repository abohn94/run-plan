/* ================= Today, once the day's training is done: what you did, tonight, tomorrow ================= */
function dayAllDone(date) {
  var d = dayOf(date); if (!d) return false;
  var real = d.parts.filter(function (p) { return p.type !== 'rest'; });
  return real.length > 0 && real.every(function (p) { return partDone(date, p); });
}
/* the top card shows what you did instead of the plan */
function doneNums(x, date) {
  var l = logOf(date);
  if (E.isRun(x)) {
    if (l.run && l.run.skip) return '<div><b>Skipped</b><span>Planned ' + mi(x.mi) + ' mi</span></div>';
    var a = null; try { a = runActsOn(date)[0]; } catch (e) { a = null; }
    var r = a || (l.run ? { mi: +l.run.mi, sec: +l.run.sec, hr: l.run.hr } : null); if (!r || !r.mi) return '';
    var hr = r.hr || (r.g && r.g.avgHR);
    return '<div><b>' + mi(r.mi) + ' mi</b><span>Distance</span></div>' + (r.sec ? '<div><b>' + E.clock(r.sec) + '</b><span>Time</span></div><div><b>' + pace(r.sec / r.mi) + '</b><span>/mi</span></div>' : '') + (hr ? '<div><b>' + hr + '</b><span>bpm</span></div>' : '');
  }
  if (x.type === 'strength' && l.lift) { var n = l.lift.ex ? Object.keys(l.lift.ex).length : 0; return '<div><b>' + (l.lift.min ? l.lift.min + ' min' : 'Done') + '</b><span>Strength</span></div>' + (n ? '<div><b>' + n + '</b><span>exercises</span></div>' : ''); }
  return '';
}
/* tomorrow's weather at your usual run time, with what to wear */
function tomorrowWxHTML() {
  var t = E.addD(App.today, 1), hr = runHour(), w = null; try { w = wxAt(t, hr); } catch (e) { w = null; }
  if (!w || w.temp == null) return '';
  var d = dayOf(t), run = d && d.parts.filter(function (p) { return E.isRun(p); })[0], dl = ''; try { dl = run ? dressLine(t) : ''; } catch (e) { dl = ''; }
  var when = clockOf(hr * 60).replace(':00', '');
  return '<section class="card tmrwx"><div class="eyebrow">Tomorrow at ' + esc(when) + (run ? ' · ' + esc(run.title.toLowerCase()) : '') + '</div><p style="margin:4px 0 0"><b>' + Math.round(w.temp) + '°F</b> <span class="muted">feels ' + Math.round(w.feels) + '° · wind ' + Math.round(w.wind || 0) + ' mph' + (w.pop >= 20 ? ' · ' + Math.round(w.pop) + '% ' + (w.snow > 0 || w.temp <= 34 ? 'snow' : 'rain') : '') + '</span></p>' + dl + '</section>';
}
var _today22 = VIEWS.today;
VIEWS.today = function () {
  var h = _today22(); if (!st().profile || !dayAllDone(App.today)) return h;
  var box = document.createElement('div'); box.innerHTML = h;
  var d = dayOf(App.today), parts = d.parts.filter(function (p) { return p.type !== 'rest'; });
  var top = [], sleep = '', tomorrow = '', status = '', wx = '', rest = [];
  Array.prototype.forEach.call(box.children, function (el, i) {
    var cls = el.className || '', eb = ((el.querySelector('.eyebrow') || {}).textContent || '').toLowerCase();
    if (/\bgreet\b/.test(cls)) { top.push(el.outerHTML); return; }
    if (/\bherow\b/.test(cls)) {
      var title = (el.querySelector('h2') || {}).textContent || '', x = parts.filter(function (p) { return p.title === title; })[0] || parts[0];
      var nums = el.querySelector('.nums'), n = doneNums(x, App.today);
      if (nums && n) nums.innerHTML = n; else if (!nums && n) { var dv = document.createElement('div'); dv.className = 'nums'; dv.innerHTML = n; el.querySelector('h2').after(dv); }
      var s = el.querySelector('.structure'); if (s) s.remove();
      top.push(el.outerHTML); return;
    }
    if (/\bvenue\b/.test(cls)) return;                                   /* outdoors or treadmill: decided */
    if (/\btipc\b/.test(cls) && !/race strategy/.test(eb)) return;       /* today's how-to and the form tip */
    if (/\bcond\b/.test(cls)) { wx = tomorrowWxHTML(); return; }          /* today's run window: past */
    if (/\bdresscard\b/.test(cls)) return;
    if (el.tagName === 'SECTION' && /\blv-/.test(cls)) {
      /* readiness advice and its buttons were for this morning; keep Garmin's recovery clock and training status */
      var rv = null; try { rv = recoveryLeft(App.today); } catch (e) { rv = null; }
      var ts = el.querySelector('.tsbox'), inf = el.querySelector('.infold');
      status = '<section class="card donestat">' + (rv && rv.left > 0 && !ts ? '<p class="small" style="margin:0 0 ' + (ts ? '10px' : '0') + '"><b>Garmin recovery:</b> ' + Math.round(rv.left) + ' h left' + (rv.untilTxt ? ', ' + esc(rv.untilTxt) : '') + '.</p>' : '') + (ts ? ts.outerHTML : '') + (inf ? inf.outerHTML : '') + '</section>';
      return;
    }
    if (/\bsleepc\b/.test(cls)) { sleep = el.outerHTML; return; }
    if (el.tagName === 'DETAILS' && el.dataset.fold === 'today-tomorrow') {
      el.dataset.fold = 'today-tomorrow-eve'; if (foldOpen('today-tomorrow-eve', true)) el.setAttribute('open', ''); else el.removeAttribute('open');
      tomorrow = el.outerHTML; return;
    }
    rest.push(el.outerHTML);
  });
  /* what you did, tonight, tomorrow, then the week, status and the rest */
  var add = rest.filter(function (r) { return /\+ Add a workout/.test(r) && /^<div class="btns"/.test(r); }); rest = rest.filter(function (r) { return add.indexOf(r) < 0; }).concat(add);
  var fi = -1; rest.forEach(function (r, k) { if (fi < 0 && /^<details/.test(r)) fi = k; });
  if (status) { if (fi >= 0) rest.splice(fi, 0, status); else rest.push(status); }
  return top.join('') + sleep + tomorrow + wx + rest.join('');
};
App.p22 = { dayAllDone: dayAllDone };
