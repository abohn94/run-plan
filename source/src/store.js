/* Storage: your private GitHub repository (phone + computer stay in sync), or this device only.
   The access token stays in this browser's storage and is only ever sent to api.github.com. */
(function (root) {
'use strict';
var LS = {
  get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage off */ } },
  del: function (k) { try { localStorage.removeItem(k); } catch (e) { /* storage off */ } }
};
var K = { conn: 'rp-conn', state: 'rp-state', garmin: 'rp-garmin', sha: 'rp-sha', touched: 'rp-touched' };
var STATE_PATH = 'user/state.json', GARMIN_PATH = 'garmin/data.json', WORKFLOW = 'garmin-sync.yml';

function b64enc(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64dec(b64) { return decodeURIComponent(escape(atob(String(b64).replace(/\s/g, '')))); }
function emptyState() {
  return { v: 1, profile: null, events: [], logs: {}, status: {}, life: [], overrides: {}, moves: {}, checkins: [], metrics: [], coach: [], seen: {}, shoes: [], gear: {}, orm: [], anotes: {}, prefs: {}, arr: {}, subs: {}, liftmix: {}, updatedAt: null };
}
function normalize(s) {
  var e = emptyState();
  s = s && typeof s === 'object' ? s : {};
  Object.keys(e).forEach(function (k) { if (s[k] == null) s[k] = e[k]; });
  return s;
}

var Store = {
  mode: 'local',          /* 'github' | 'local' */
  conn: null,             /* {owner, repo, token, branch} */
  state: normalize(null),
  garmin: null,
  sha: null,
  status: 'idle',         /* idle | loading | saving | ok | error | offline */
  error: '',
  touched: {},            /* 'key' or 'key|sub' -> true, for merging after a conflict */
  onchange: null,
  onstatus: null,
  _timer: null,
  _saving: null,

  init: function () {
    var c = null;
    try { c = JSON.parse(LS.get(K.conn) || 'null'); } catch (e) { c = null; }
    this.conn = c && c.owner && c.repo && c.token ? c : null;
    this.mode = this.conn ? 'github' : 'local';
    try { this.state = normalize(JSON.parse(LS.get(K.state) || 'null')); } catch (e) { this.state = normalize(null); }
    try { this.garmin = JSON.parse(LS.get(K.garmin) || 'null'); } catch (e) { this.garmin = null; }
    this.sha = LS.get(K.sha);
    /* edits made just before the app was closed and not yet saved to GitHub */
    try { this.touched = this.mode === 'github' ? (JSON.parse(LS.get(K.touched) || '{}') || {}) : {}; } catch (e) { this.touched = {}; }
    return this.mode === 'github' ? this.pull() : Promise.resolve();
  },
  setStatus: function (s, err) { this.status = s; this.error = err || ''; if (this.onstatus) this.onstatus(s, err); },

  api: function (path, opts) {
    var c = this.conn;
    opts = opts || {};
    var headers = { Authorization: 'Bearer ' + c.token, Accept: opts.accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch('https://api.github.com/repos/' + encodeURIComponent(c.owner) + '/' + encodeURIComponent(c.repo) + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' });
  },
  getFile: function (path, raw) {
    var self = this;
    return this.api('/contents/' + path + (this.conn.branch ? '?ref=' + encodeURIComponent(this.conn.branch) : ''), { accept: raw ? 'application/vnd.github.raw+json' : undefined }).then(function (r) {
      if (r.status === 404) return null;
      if (r.status === 401 || r.status === 403) throw new Error('GitHub refused the token (' + r.status + '). Check it has access to ' + self.conn.repo + ' with Contents and Actions permissions, and has not expired.');
      if (!r.ok) throw new Error('GitHub error ' + r.status);
      if (raw) return r.text().then(function (t) { return { text: t }; });
      return r.json().then(function (j) {
        if (!j.content && j.size > 0) return self.getFile(path, true).then(function (x) { return { text: x.text, sha: j.sha }; });
        return { text: j.content ? b64dec(j.content) : '', sha: j.sha };
      });
    });
  },
  pull: function () {
    var self = this;
    if (this.mode !== 'github') return Promise.resolve();
    this.setStatus('loading');
    return Promise.all([this.getFile(STATE_PATH), this.getFile(GARMIN_PATH, true).catch(function () { return null; })]).then(function (res) {
      var s = res[0], g = res[1];
      if (s) {
        var remote = normalize(JSON.parse(s.text || '{}'));
        if (Object.keys(self.touched).length) remote = self.merge(remote);
        self.state = remote; self.sha = s.sha;
        LS.set(K.state, JSON.stringify(self.state)); LS.set(K.sha, s.sha || '');
      } else { self.sha = null; }
      if (g && g.text) { try { self.garmin = JSON.parse(g.text); LS.set(K.garmin, g.text); } catch (e) { /* keep the old copy */ } }
      self.setStatus('ok');
      if (self.onchange) self.onchange('pull');
      if (Object.keys(self.touched).length || !s) self.queueSave(0);
    }).catch(function (e) {
      self.setStatus(navigator.onLine === false ? 'offline' : 'error', e.message);
      if (self.onchange) self.onchange('cache');
    });
  },
  refreshGarmin: function () {
    var self = this;
    if (this.mode !== 'github') return Promise.resolve(false);
    return this.getFile(GARMIN_PATH, true).then(function (g) {
      if (!g || !g.text) return false;
      var changed = !self.garmin || JSON.stringify(self.garmin) !== g.text.trim() && g.text !== JSON.stringify(self.garmin);
      try { var parsed = JSON.parse(g.text); changed = !self.garmin || parsed.updated !== self.garmin.updated || parsed.status !== self.garmin.status; self.garmin = parsed; } catch (e) { return false; }
      LS.set(K.garmin, g.text);
      if (changed && self.onchange) self.onchange('garmin');
      return changed;
    }).catch(function () { return false; });
  },
  /* Change state through here so a conflicting save from another device can be merged. */
  edit: function (key, sub, fn) {
    var s = this.state;
    fn(s);
    this.touched[sub != null ? key + '|' + sub : key] = true;
    this.keepTouched();
    s.updatedAt = new Date().toISOString();
    LS.set(K.state, JSON.stringify(s));
    this.queueSave(1200);
    if (this.onchange) this.onchange('edit');
  },
  /* Several touches at once: touches = [[key, sub], ...] */
  editMany: function (touches, fn) {
    var self = this, s = this.state;
    fn(s);
    touches.forEach(function (t) { self.touched[t[1] != null ? t[0] + '|' + t[1] : t[0]] = true; });
    this.keepTouched();
    s.updatedAt = new Date().toISOString();
    LS.set(K.state, JSON.stringify(s));
    this.queueSave(1200);
    if (this.onchange) this.onchange('edit');
  },
  merge: function (remote) {
    var local = this.state;
    Object.keys(this.touched).forEach(function (t) {
      var p = t.split('|'), k = p[0], sub = p.length > 1 ? p.slice(1).join('|') : null;
      if (sub == null) { remote[k] = local[k]; return; }
      if (Array.isArray(local[k])) {
        var loc = local[k].filter(function (x) { return x && x.id === sub; })[0];
        remote[k] = (remote[k] || []).filter(function (x) { return x && x.id !== sub; });
        if (loc) remote[k].push(loc);
        if (k === 'coach' || k === 'checkins') remote[k].sort(function (a, b) { return (a.t || a.date || '') < (b.t || b.date || '') ? -1 : 1; });
      } else {
        remote[k] = remote[k] || {};
        if (local[k] && local[k][sub] !== undefined) remote[k][sub] = local[k][sub]; else delete remote[k][sub];
      }
    });
    return remote;
  },
  keepTouched: function () { LS.set(K.touched, JSON.stringify(this.touched)); },
  queueSave: function (ms) {
    var self = this;
    clearTimeout(this._timer);
    if (this.mode !== 'github') { this.setStatus('ok'); return; }
    this._timer = setTimeout(function () { self.save(); }, ms == null ? 1200 : ms);
  },
  save: function () {
    var self = this;
    if (this.mode !== 'github') return Promise.resolve();
    if (this._saving) { this._again = true; return this._saving; }
    var touchedNow = this.touched;
    this.touched = {};
    this.setStatus('saving');
    var body = { message: 'Run Plan update ' + new Date().toISOString().slice(0, 16), content: b64enc(JSON.stringify(this.state, null, 1)) };
    if (this.sha) body.sha = this.sha;
    if (this.conn.branch) body.branch = this.conn.branch;
    this._saving = this.api('/contents/' + STATE_PATH, { method: 'PUT', body: body }).then(function (r) {
      if (r.status === 409 || r.status === 422) {
        /* someone else saved first: re-read, merge our changes on top, then save again */
        Object.keys(touchedNow).forEach(function (k) { self.touched[k] = true; });
        return self.getFile(STATE_PATH).then(function (s) {
          if (s) { self.state = self.merge(normalize(JSON.parse(s.text || '{}'))); self.sha = s.sha; }
          self._again = true;
        });
      }
      if (!r.ok) throw new Error('Could not save to GitHub (' + r.status + ')');
      return r.json().then(function (j) { self.sha = j.content && j.content.sha; LS.set(K.sha, self.sha || ''); self.keepTouched(); self.setStatus('ok'); });
    }).catch(function (e) {
      Object.keys(touchedNow).forEach(function (k) { self.touched[k] = true; });
      self.keepTouched();
      self.setStatus(navigator.onLine === false ? 'offline' : 'error', e.message);
    }).then(function () {
      self._saving = null;
      if (self._again) { self._again = false; return self.save(); }
    });
    return this._saving;
  },
  connect: function (conn) {
    var self = this;
    var prev = this.conn;
    this.conn = conn;
    return this.api('').then(function (r) {
      if (!r.ok) throw new Error(r.status === 404 ? 'Repository not found, or the token cannot see it.' : 'GitHub said ' + r.status + '. Check the token.');
      return r.json();
    }).then(function (j) {
      if (j.private === false) throw new Error('That repository is public. Use a private repository so your health data stays private.');
      LS.set(K.conn, JSON.stringify(conn));
      self.mode = 'github';
      /* first connection: keep whatever was entered on this device, then merge with the repository */
      if (self.state && (self.state.profile || self.state.events.length)) { Object.keys(emptyState()).forEach(function (k) { self.touched[k] = true; }); }
      return self.pull();
    }).catch(function (e) { self.conn = prev; throw e; });
  },
  disconnect: function () { LS.del(K.conn); LS.del(K.sha); LS.del(K.touched); this.conn = null; this.mode = 'local'; this.sha = null; this.setStatus('ok'); },
  syncNow: function () {
    var self = this;
    if (this.mode !== 'github') return Promise.reject(new Error('Connect GitHub first.'));
    return this.api('/actions/workflows/' + WORKFLOW + '/dispatches', { method: 'POST', body: { ref: this.conn.branch || 'main' } }).then(function (r) {
      if (r.status === 204) return true;
      if (r.status === 403 || r.status === 404) throw new Error('The token needs the Actions (read and write) permission to start a sync.');
      throw new Error('GitHub said ' + r.status);
    });
  },
  lastRun: function () {
    if (this.mode !== 'github') return Promise.resolve(null);
    return this.api('/actions/workflows/' + WORKFLOW + '/runs?per_page=1').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      var w = j && j.workflow_runs && j.workflow_runs[0];
      return w ? { status: w.status, conclusion: w.conclusion, at: w.updated_at || w.created_at, url: w.html_url, event: w.event } : null;
    }).catch(function () { return null; });
  },
  replaceAll: function (s) {
    this.state = normalize(s);
    Object.keys(emptyState()).forEach(function (k) { Store.touched[k] = true; });
    LS.set(K.state, JSON.stringify(this.state));
    this.queueSave(0);
    if (this.onchange) this.onchange('edit');
  },
  setGarminLocal: function (g) { this.garmin = g; LS.set(K.garmin, JSON.stringify(g)); if (this.onchange) this.onchange('garmin'); }
};
Store.emptyState = emptyState;
Store.normalize = normalize;
Store.LS = LS;
root.Store = Store;
if (typeof module !== 'undefined' && module.exports) module.exports = Store;
})(typeof globalThis !== 'undefined' ? globalThis : this);
