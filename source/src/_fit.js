var FIT_CRC = [0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401, 0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400];
function fitCrc(bytes, from, to) {
  var crc = 0;
  for (var i = from; i < to; i++) {
    var b = bytes[i], t = FIT_CRC[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF; crc = crc ^ t ^ FIT_CRC[b & 0xF];
    t = FIT_CRC[crc & 0xF]; crc = (crc >> 4) & 0x0FFF; crc = crc ^ t ^ FIT_CRC[(b >> 4) & 0xF];
  }
  return crc;
}
function BW() { this.a = []; }
BW.prototype.u8 = function (v) { this.a.push(v & 255); };
BW.prototype.u16 = function (v) { this.a.push(v & 255, (v >> 8) & 255); };
BW.prototype.u32 = function (v) { v = v >>> 0; this.a.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255); };
BW.prototype.str = function (s, n) {
  var b = [], i;
  for (i = 0; i < s.length && b.length < n - 1; i++) { var c = s.charCodeAt(i); b.push(c < 128 ? c : 63); }
  while (b.length < n) b.push(0);
  this.a = this.a.concat(b);
};
var FIT_INV32 = 0xFFFFFFFF;

function flattenSteps(items) {
  var flat = [];
  items.forEach(function (it) {
    if (it.repeat) {
      var from = flat.length;
      it.steps.forEach(function (s) { flat.push(s); });
      flat.push({ repeatFrom: from, count: it.repeat });
    } else flat.push(it);
  });
  return flat;
}
var INTENS = { active: 0, rest: 1, warmup: 2, cooldown: 3, recovery: 4, interval: 5 };

function workoutFit(items, name, when) {
  var flat = flattenSteps(items);
  var body = new BW();
  function def(local, num, fields) {
    body.u8(0x40 | local); body.u8(0); body.u8(0); body.u16(num); body.u8(fields.length);
    fields.forEach(function (f) { body.u8(f[0]); body.u8(f[1]); body.u8(f[2]); });
  }
  /* file_id (0) */
  def(0, 0, [[0, 1, 0x00], [1, 2, 0x84], [2, 2, 0x84], [3, 4, 0x8C], [4, 4, 0x86]]);
  body.u8(0); body.u8(5); body.u16(255); body.u16(0); body.u32(1); body.u32(Math.floor((when || Date.now()) / 1000) - 631065600);
  /* workout (26): sport, num_valid_steps, wkt_name */
  def(1, 26, [[4, 1, 0x00], [6, 2, 0x84], [8, 24, 0x07]]);
  body.u8(1); body.u8(1); body.u16(flat.length); body.str(name, 24);
  /* workout_step (27) */
  def(2, 27, [[254, 2, 0x84], [0, 16, 0x07], [1, 1, 0x00], [2, 4, 0x86], [3, 1, 0x00], [4, 4, 0x86], [5, 4, 0x86], [6, 4, 0x86], [7, 1, 0x00], [8, 50, 0x07]]);
  flat.forEach(function (s, idx) {
    body.u8(2); body.u16(idx);
    if (s.repeatFrom != null) {
      body.str('Repeat', 16); body.u8(6); body.u32(s.repeatFrom); body.u8(2); body.u32(s.count); body.u32(FIT_INV32); body.u32(FIT_INV32); body.u8(0xFF); body.str('', 50);
      return;
    }
    body.str(s.name || '', 16);
    var dt, dv;
    if (s.dm != null) { dt = 1; dv = s.dm * 100; } else if (s.ds != null) { dt = 0; dv = s.ds * 1000; } else { dt = 5; dv = 0; }
    body.u8(dt); body.u32(dv);
    if (s.pace) {
      body.u8(0); body.u32(0);
      body.u32(Math.round(MI_M / s.pace.hi * 1000)); body.u32(Math.round(MI_M / s.pace.lo * 1000));
    } else { body.u8(2); body.u32(0); body.u32(FIT_INV32); body.u32(FIT_INV32); }
    body.u8(INTENS[s.kind] != null ? INTENS[s.kind] : 0);
    body.str((s.pace ? fmtPace(s.pace.lo) + '–' + fmtPace(s.pace.hi) + '/mi ' : '') + (s.notes || ''), 50);
  });
  var size = body.a.length, out = new Uint8Array(14 + size + 2), i;
  out[0] = 14; out[1] = 0x20; out[2] = 2100 & 255; out[3] = 2100 >> 8;
  out[4] = size & 255; out[5] = (size >> 8) & 255; out[6] = (size >> 16) & 255; out[7] = (size >>> 24) & 255;
  out[8] = 0x2E; out[9] = 0x46; out[10] = 0x49; out[11] = 0x54;
  var hc = fitCrc(out, 0, 12); out[12] = hc & 255; out[13] = hc >> 8;
  for (i = 0; i < size; i++) out[14 + i] = body.a[i];
  var c = fitCrc(out, 0, 14 + size); out[14 + size] = c & 255; out[15 + size] = c >> 8;
  return out;
}

/* Store-only ZIP writer. files: [{name, data:Uint8Array}] */
var ZIP_T = null;
function crc32(b) {
  if (!ZIP_T) { ZIP_T = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; ZIP_T[n] = c >>> 0; } }
  var crc = 0xFFFFFFFF;
  for (var i = 0; i < b.length; i++) crc = ZIP_T[(crc ^ b[i]) & 255] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
function zipFiles(files) {
  var w = new BW(), cd = new BW(), offs = [];
  function bytes(arr) { for (var i = 0; i < arr.length; i++) w.a.push(arr[i]); }
  files.forEach(function (f) {
    var nm = []; for (var i = 0; i < f.name.length; i++) nm.push(f.name.charCodeAt(i) & 127);
    var crc = crc32(f.data), off = w.a.length;
    w.u32(0x04034b50); w.u16(20); w.u16(0); w.u16(0); w.u16(0); w.u16(0x21); w.u32(crc); w.u32(f.data.length); w.u32(f.data.length); w.u16(nm.length); w.u16(0);
    bytes(nm); bytes(f.data);
    cd.u32(0x02014b50); cd.u16(20); cd.u16(20); cd.u16(0); cd.u16(0); cd.u16(0); cd.u16(0x21); cd.u32(crc); cd.u32(f.data.length); cd.u32(f.data.length);
    cd.u16(nm.length); cd.u16(0); cd.u16(0); cd.u16(0); cd.u16(0); cd.u32(0); cd.u32(off); cd.a = cd.a.concat(nm);
  });
  var start = w.a.length, csize = cd.a.length;
  w.a = w.a.concat(cd.a);
  w.u32(0x06054b50); w.u16(0); w.u16(0); w.u16(files.length); w.u16(files.length); w.u32(csize); w.u32(start); w.u16(0);
  return new Uint8Array(w.a);
}

/* ---------- Week builder ---------- */
