#!/usr/bin/env python3
"""Pull your own data from the Garmin Connect Personal API into garmin/data.json.

Runs in GitHub Actions every hour. Uses only the Python standard library.
The API key comes from the GARMIN_PERSONAL_API_KEY environment variable (a GitHub secret).
It never leaves GitHub and is never written to the repository.

Endpoints and the token exchange follow Garmin's official client:
https://github.com/garmin/connect-personal-api-python
"""

import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ.get("GARMIN_PERSONAL_API_BASE_URL", "https://personal.connectapi.garmin.com").rstrip("/")
TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token"
OUT = os.environ.get("GARMIN_OUT", "garmin/data.json")
CHUNK = 28              # Garmin caps several ranges at 28-31 days
FIRST_DAYS = 180        # health history (sleep, HRV...) pulled on the very first run
HISTORY_DAYS = 3650     # activity history pulled on the very first run: all your past runs, up to 10 years
REFRESH_DAYS = 10       # every later run re-reads this many recent days (late watch syncs)
KEEP_DAYS = 730         # older daily health rows are dropped to keep the file small; activities are kept forever
VERSION = 2            # bump to re-pull full history once when new fields are added
SPLITS = (("fastestSplit_1000", "1k"), ("fastestSplit_1609", "1mi"), ("fastestSplit_5000", "5k"), ("fastestSplit_10000", "10k"),
          ("fastestSplit_21098", "half"), ("fastestSplit_42195", "full"))
RUN_TYPES = ("running", "treadmill_running", "trail_running", "track_running", "indoor_running", "virtual_run", "street_running", "ultra_run")


class ApiError(Exception):
    def __init__(self, status, msg):
        super().__init__(f"HTTP {status}: {msg}")
        self.status = status


def request(method, path, headers, params=None, timeout=40):
    url = BASE + path + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, method=method, headers=headers)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8")
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:300]
            if e.code in (429, 500, 502, 503, 504) and attempt < 2:
                time.sleep(5 * (attempt + 1))
                continue
            raise ApiError(e.code, body)
        except urllib.error.URLError as e:
            if attempt < 2:
                time.sleep(5)
                continue
            raise ApiError(0, str(e.reason))
    raise ApiError(0, "no response")


def get_token(key):
    text = request("POST", TOKEN_PATH, {"Accept": "*/*", "Authorization": "ApiKey " + key})
    return text.strip().strip('"')


class Client:
    def __init__(self, token):
        self.h = {"Accept": "application/json", "Authorization": "Bearer " + token}
        self.calls = 0

    def get(self, path, params=None):
        self.calls += 1
        text = request("GET", path, self.h, params)
        return json.loads(text) if text.strip() else None


def iso(d):
    return d.isoformat()


def chunks(start, end, size=CHUNK):
    a = start
    while a <= end:
        b = min(end, a + dt.timedelta(days=size - 1))
        yield a, b
        a = b + dt.timedelta(days=1)


def num(x, nd=None):
    if isinstance(x, bool) or x is None:
        return None
    if isinstance(x, (int, float)):
        return round(x, nd) if nd is not None else x
    return None


def field(obj, *names):
    for n in names:
        if not isinstance(obj, dict):
            return None
        obj = obj.get(n)
    return obj


def first_list(obj):
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        for v in obj.values():
            if isinstance(v, list):
                return v
    return []


PROBE = os.environ.get("PROBE") == "1"


def keypaths(o, pre="", out=None):
    out = [] if out is None else out
    if isinstance(o, dict):
        for k, v in o.items():
            keypaths(v, pre + "." + k if pre else k, out)
    elif isinstance(o, list) and o:
        keypaths(o[0], pre + "[]", out)
    else:
        out.append(pre)
    return out


def summarize_activity(a):
    type_key = field(a, "activityType", "typeKey") or ""
    start = a.get("startTimeLocal") or ""
    o = {
        "id": a.get("activityId"),
        "name": a.get("activityName") or "",
        "type": type_key,
        "run": type_key in RUN_TYPES or "run" in type_key,
        "strength": type_key in ("strength_training", "indoor_cardio") or "strength" in type_key,
        "start": start,
        "date": start[:10],
        "distM": num(a.get("distance"), 1),
        "durS": num(a.get("duration"), 0),
        "movS": num(a.get("movingDuration"), 0),
        "avgHR": num(a.get("averageHR"), 0),
        "maxHR": num(a.get("maxHR"), 0),
        "cadence": num(a.get("averageRunningCadenceInStepsPerMinute"), 0),
        "elevM": num(a.get("elevationGain"), 0),
        "te": num(a.get("aerobicTrainingEffect"), 1),
        "ane": num(a.get("anaerobicTrainingEffect"), 1),
        "load": num(a.get("activityTrainingLoad"), 0),
        "race": field(a, "eventType", "typeKey") == "race",
        "vo2": num(a.get("vO2MaxValue"), 1),
        "calories": num(a.get("calories"), 0),
        "maxSpd": num(a.get("maxSpeed"), 3),
    }
    # "Rate your workout" on the watch: perceived effort (10-100 -> 1-10) and how you felt (0-100 -> 1-5)
    for src, dst, nd in (("avgPower", "pwr", 0), ("maxPower", "pwrMax", 0), ("avgStrideLength", "stride", 1), ("avgVerticalRatio", "vRatio", 1),
                         ("avgVerticalOscillation", "vOsc", 1), ("avgGroundContactTime", "gct", 0), ("avgGradeAdjustedSpeed", "gapSpd", 3),
                         ("maxRunningCadenceInStepsPerMinute", "cadMax", 0), ("minTemperature", "tMin", 0), ("maxTemperature", "tMax", 0),
                         ("workoutExecutionScore", "exec", 0), ("beginPotentialStamina", "stam0", 0), ("endPotentialStamina", "stam1", 0),
                         ("minAvailableStamina", "stamMin", 0), ("recoveryHeartRate", "recHR", 0), ("trainingEffectLabel", "teLabel", None)):
        v = a.get(src)
        if isinstance(v, str) and nd is None:
            o[dst] = v
        elif num(v) is not None:
            o[dst] = num(v, nd)
    rpe = num(a.get("directWorkoutRpe"))
    if rpe:
        o["rpe"] = round(rpe / 10) if rpe > 10 else round(rpe)
    feel = num(a.get("directWorkoutFeel"))
    if feel is not None:
        o["feel"] = int(round(feel / 25)) + 1 if feel <= 100 else None
    best = {}
    for src, dst in SPLITS:
        v = num(a.get(src), 1)
        if v and v > 0:
            best[dst] = v
    if best:
        o["best"] = best
    return {k: v for k, v in o.items() if v not in (None, "")}


def sync_activities(c, start, end, errors):
    out = {}
    for a, b in reversed(list(chunks(start, end, 90))):   # newest first, so recent runs land even if Garmin throttles
        page = 0
        while True:
            try:
                data = c.get("/activitylist-service/activities/search/activities",
                             {"start": page, "limit": 100, "startDate": iso(a), "endDate": iso(b)})
            except ApiError as e:
                errors.append(f"activities {a}..{b}: {e}")
                if e.status in (401, 403):
                    raise
                break
            rows = first_list(data)
            if PROBE and rows:
                print("probe activity keys:", ",".join(k for k in keypaths(rows[0]) if any(w in k.lower() for w in ("rpe", "feel", "calor", "kcal", "power", "stride", "vertical", "ground", "grade", "stamina", "execution", "recovery", "elevation", "temperature"))))
            for r in rows:
                if isinstance(r, dict) and r.get("activityId") is not None:
                    s = summarize_activity(r)
                    out[str(s["id"])] = s
            if len(rows) < 100:
                break
            page += 100
    return out


DETAIL_KEYS = (("directWorkoutRpe", "rpe"), ("directWorkoutFeel", "feel"), ("directWorkoutComplianceScore", "exec"),
               ("workoutExecutionScore", "exec"), ("beginPotentialStamina", "stam0"), ("endPotentialStamina", "stam1"),
               ("minAvailableStamina", "stamMin"), ("recoveryHeartRate", "recHR"), ("trainingEffectLabel", "teLabel"),
               ("avgGradeAdjustedSpeed", "gapSpd"))


def sync_details(c, acts, since, notes, limit=20):
    """Read each recent run's detail page once for the post-run self-evaluation (feel and perceived effort)."""
    todo = [a for a in acts.values() if a.get("run") and a.get("date", "") >= since and not a.get("detail")]
    todo.sort(key=lambda a: a.get("start", ""), reverse=True)
    for a in todo[:limit]:
        try:
            d = c.get(f"/activity-service/activity/{a['id']}")
        except ApiError as e:
            notes.append(f"activity detail: {e}")
            if e.status in (401, 403, 404):
                return
            continue
        sd = (d or {}).get("summaryDTO") or {}
        if PROBE:
            print("probe detail keys:", ",".join(k for k in keypaths(d) if any(w in k.lower() for w in ("rpe", "feel", "compliance", "execution", "stamina", "recovery", "label", "evaluation"))))
        for src, dst in DETAIL_KEYS:
            v = sd.get(src, (d or {}).get(src))
            if isinstance(v, str) and dst == "teLabel":
                a[dst] = v
            elif num(v) is not None:
                a[dst] = num(v, 3 if dst == "gapSpd" else 0)
        if "rpe" in a and a["rpe"] > 10:
            a["rpe"] = round(a["rpe"] / 10)
        if "feel" in a and a["feel"] > 5:
            a["feel"] = int(round(a["feel"] / 25)) + 1
        # done once your rating is in; unrated runs are re-checked for a week in case you rate them later
        if "rpe" in a or "feel" in a or a.get("date", "") < iso(dt.date.today() - dt.timedelta(days=7)):
            a["detail"] = 1


def sync_days(c, start, end, errors):
    days = {}

    def row(d):
        return days.setdefault(d, {})

    for a, b in chunks(start, end):
        q = {"startDate": iso(a), "endDate": iso(b)}
        # Sleep
        try:
            for n in first_list(c.get("/sleep-service/sleep/dailySleepSummariesByDate", q)):
                d = n.get("calendarDate") or field(n, "sleepNeed", "calendarDate")
                if not d:
                    continue
                r = row(d)
                for src, dst in (("sleepTimeSeconds", "sleepH"), ("deepSleepSeconds", "deepH"), ("remSleepSeconds", "remH"), ("awakeSleepSeconds", "awakeH")):
                    v = num(n.get(src))
                    if v is not None:
                        r[dst] = round(v / 3600, 2)
                sc = field(n, "sleepScores", "overall", "value")
                if num(sc) is not None:
                    r["sleepScore"] = sc
                q2 = field(n, "sleepScores", "overall", "qualifierKey")
                if q2:
                    r["sleepQ"] = q2
                need = num(field(n, "sleepNeed", "actual"))
                if need is not None:
                    r["needH"] = round(need / 60, 2)
        except ApiError as e:
            errors.append(f"sleep {a}..{b}: {e}")
            if e.status in (401, 403):
                raise
        # Daily summaries: resting HR, Body Battery, stress, steps
        try:
            data = c.get("/usersummary-service/v2/dailysummaries", q)
            if PROBE and first_list(data):
                print("probe daily keys:", ",".join(keypaths(first_list(data)[-1])))
            for s in first_list(data):
                d = s.get("calendarDate")
                if not d:
                    continue
                r = row(d)
                for path, dst in ((("heartRate", "restingValue"), "rhr"), (("bodyBattery", "maxValue"), "bbHigh"),
                                  (("bodyBattery", "minValue"), "bbLow"), (("stress", "avgLevel"), "stress"),
                                  (("movement", "steps", "value"), "steps"), (("calories", "burnedResting"), "kcalRest"),
                                  (("calories", "burnedActive"), "kcalActive"), (("calories", "burnedTotal"), "kcalTotal"),
                                  (("calories", "consumedGoal"), "kcalGoal"), (("intensityMinutes", "vigorous"), "imVig"),
                                  (("intensityMinutes", "moderate"), "imMod")):
                    v = num(field(s, *path))
                    if v is not None:
                        r[dst] = v
                cg, cr = num(field(s, "calories", "consumedGoal")), num(field(s, "calories", "consumedRemaining"))
                if cg and cr is not None and 0 < cg - cr < 9000:
                    r["kcalEaten"] = round(cg - cr)
        except ApiError as e:
            errors.append(f"daily summaries {a}..{b}: {e}")
            if e.status in (401, 403):
                raise
        # HRV
        try:
            data = c.get(f"/hrv-service/hrv/daily/{iso(a)}/{iso(b)}")
            for h in (field(data, "hrvSummaries") or []):
                d = h.get("calendarDate")
                if not d:
                    continue
                r = row(d)
                for src, dst in (("lastNightAvg", "hrv"), ("weeklyAvg", "hrvWeek")):
                    v = num(h.get(src))
                    if v is not None:
                        r[dst] = v
                if h.get("status"):
                    r["hrvStatus"] = h["status"]
                lo, hi = num(field(h, "baseline", "balancedLow")), num(field(h, "baseline", "balancedUpper"))
                if lo is not None:
                    r["hrvLow"] = lo
                if hi is not None:
                    r["hrvHigh"] = hi
        except ApiError as e:
            errors.append(f"hrv {a}..{b}: {e}")
            if e.status in (401, 403):
                raise
    return days


def _date_of(o):
    for k in ("calendarDate", "from", "startDate", "date", "until"):
        v = o.get(k) if isinstance(o, dict) else None
        if isinstance(v, str) and len(v) >= 10:
            return v[:10]
        if isinstance(v, (int, float)) and v > 1e11:   # epoch milliseconds
            return dt.datetime.utcfromtimestamp(v / 1000).date().isoformat()
    return None


def _walk(o):
    """Yield every dict inside a JSON value."""
    if isinstance(o, dict):
        yield o
        for v in o.values():
            yield from _walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from _walk(v)


def sync_fitness(c, start, end, notes):
    """VO2max, lactate threshold and weight. Optional: Garmin may not offer these to every key, so failures are only notes."""
    out = {"vo2": {}, "ltHr": {}, "ltSpeed": {}, "weight": {}}
    for a, b in chunks(start, end):
        try:
            for o in _walk(c.get(f"/metrics-service/metrics/maxmet/daily/{iso(a)}/{iso(b)}")):
                g = o.get("generic") if isinstance(o.get("generic"), dict) else None
                if g:
                    d = _date_of(g)
                    v = num(g.get("vo2MaxPreciseValue")) or num(g.get("vo2MaxValue"))
                    if d and v:
                        out["vo2"][d] = round(v, 1)
        except ApiError as e:
            notes.append(f"vo2max {a}..{b}: {e}")
            if e.status in (401, 403, 404):
                break
    for kind, path in (("ltHr", "lactateThresholdHeartRate"), ("ltSpeed", "lactateThresholdSpeed")):
        try:
            data = c.get(f"/biometric-service/stats/{path}/range/{iso(start)}/{iso(end)}",
                         {"sport": "RUNNING", "aggregation": "daily", "aggregationStrategy": "LATEST"})
            for o in _walk(data):
                v = num(o.get("value"))
                d = _date_of(o)
                if d and v:
                    out[kind][d] = v
        except ApiError as e:
            notes.append(f"{path}: {e}")
    # Current values from your Garmin user settings (VO2max, lactate threshold heart rate and speed).
    try:
        ud = field(c.get("/userprofile-service/userprofile/settings"), "userData") or {}
        d = iso(dt.date.today())
        v = num(ud.get("vo2MaxRunning"))
        if v:
            out["vo2"].setdefault(d, round(v, 1))
        v = num(ud.get("lactateThresholdHeartRate"))
        if v:
            out["ltHr"][d] = v
        v = num(ud.get("lactateThresholdSpeed"))
        if v:
            out["ltSpeed"][d] = v
    except ApiError as e:
        notes.append(f"user settings: {e}")
    # Heart-rate zones can carry the lactate threshold heart rate the watch uses.
    try:
        d = iso(dt.date.today())
        for o in _walk(c.get("/biometric-service/heartRateZones/v2")):
            if str(o.get("sport", "")).upper() not in ("", "DEFAULT", "RUNNING"):
                continue
            v = num(o.get("lactateThresholdHeartRateUsed"))
            if v and v > 80:
                out["ltHr"][d] = v
                break
    except ApiError as e:
        notes.append(f"heart rate zones: {e}")
    try:
        data = c.get(f"/weight-service/weight/range/{iso(start)}/{iso(end)}")
        for o in _walk(data):
            w = num(o.get("weight"))
            d = _date_of(o)
            if d and w and w > 1000:          # grams
                out["weight"][d] = round(w / 453.592, 1)
    except ApiError as e:
        notes.append(f"weight: {e}")
    return out


def sync_training_status(c, notes):
    """Garmin training status and 4-week load focus (low aerobic / high aerobic / anaerobic). Best effort."""
    d = iso(dt.date.today())
    try:
        data = c.get(f"/metrics-service/metrics/trainingstatus/aggregated/{d}")
    except ApiError as e:
        notes.append(f"training status: {e}")
        return None
    out = {"date": d}
    for o in _walk(data):
        if "monthlyLoadAerobicLow" in o:
            out["loads"] = {"low": num(o.get("monthlyLoadAerobicLow")), "high": num(o.get("monthlyLoadAerobicHigh")),
                            "anaerobic": num(o.get("monthlyLoadAnaerobic"))}
            out["targets"] = {
                "low": [num(o.get("monthlyLoadAerobicLowTargetMin")), num(o.get("monthlyLoadAerobicLowTargetMax"))],
                "high": [num(o.get("monthlyLoadAerobicHighTargetMin")), num(o.get("monthlyLoadAerobicHighTargetMax"))],
                "anaerobic": [num(o.get("monthlyLoadAnaerobicTargetMin")), num(o.get("monthlyLoadAnaerobicTargetMax"))]}
            fb = o.get("trainingBalanceFeedbackPhrase")
            if fb:
                out["balance"] = str(fb)
        if "trainingStatusFeedbackPhrase" in o or ("trainingStatus" in o and not isinstance(o.get("trainingStatus"), (dict, list))):
            ph = o.get("trainingStatusFeedbackPhrase")
            if ph:
                out["status"] = str(ph)
            if o.get("weeklyTrainingLoad") is not None:
                out["weekLoad"] = num(o.get("weeklyTrainingLoad"))
        if "dailyTrainingLoadAcute" in o:
            out["acute"] = num(o.get("dailyTrainingLoadAcute"))
            out["chronic"] = num(o.get("dailyTrainingLoadChronic"))
    return out if len(out) > 1 else None


APP_URL = os.environ.get("APP_URL", "https://abohn94.github.io/run-plan/")
STATE = os.environ.get("STATE_FILE", "user/state.json")
NOTIFY_LOG = "garmin/notify.json"


def weekly_notify(now_utc):
    """The day before a new training week starts, send one push via ntfy.sh (free) to review the coming week."""
    try:
        with open(STATE) as f:
            st = json.load(f)
    except (OSError, ValueError):
        return
    n = (st.get("prefs") or {}).get("notify") or {}
    topic = str(n.get("topic") or "").strip()
    if not n.get("on") or not topic:
        return
    try:
        from zoneinfo import ZoneInfo
        local = now_utc.astimezone(ZoneInfo(n.get("tz") or "UTC"))
    except Exception:
        local = now_utc
    ws = int(((st.get("profile") or {}).get("weekStart")) or 0)        # 0 = Monday, matches Python's weekday()
    if local.weekday() != (ws - 1) % 7 or local.hour < int(n.get("hour", 18)):
        return
    week = (local.date() + dt.timedelta(days=1)).isoformat()
    try:
        with open(NOTIFY_LOG) as f:
            log = json.load(f)
    except (OSError, ValueError):
        log = {}
    if log.get("week") == week:
        return
    body = "Your training week starts tomorrow. Take a minute to check the days and move anything that doesn't fit."
    req = urllib.request.Request(f"https://ntfy.sh/{urllib.parse.quote(topic)}", data=body.encode(), method="POST", headers={
        "Title": "Review next week's plan", "Click": APP_URL + "#/preview/" + week, "Tags": "runner", "Priority": "default"})
    try:
        urllib.request.urlopen(req, timeout=20).read()
        log = {"week": week, "sent": now_utc.isoformat(timespec="seconds")}
        os.makedirs("garmin", exist_ok=True)
        with open(NOTIFY_LOG, "w") as f:
            json.dump(log, f)
            f.write("\n")
        print("notify: weekly review sent for", week)
    except Exception as e:      # never fail the sync over a notification
        print("notify: failed", e)


def main():
    key = os.environ.get("GARMIN_PERSONAL_API_KEY", "").strip()
    now = dt.datetime.now(dt.timezone.utc)
    today = dt.date.today()
    try:
        with open(OUT) as f:
            old = json.load(f)
    except (OSError, ValueError):
        old = {}
    acts = {str(a["id"]): a for a in old.get("activities", []) if isinstance(a, dict) and "id" in a}
    days = dict(old.get("days", {}))
    first = not days and not acts
    upgrade = not first and int(old.get("version") or 1) < VERSION   # new fields: re-read history once
    force = int(os.environ.get("HISTORY_DAYS") or 0)   # set when you run the workflow by hand with a number of days
    back = FIRST_DAYS if first else REFRESH_DAYS
    act_back = force or (HISTORY_DAYS if first or upgrade else REFRESH_DAYS)
    fit_back = 730 if first or upgrade else max(REFRESH_DAYS, 21)
    start = today - dt.timedelta(days=max(back, min(force, 730)))
    act_start = today - dt.timedelta(days=act_back)
    end = today + dt.timedelta(days=1)   # the watch's local day can be ahead of UTC

    errors = []
    notes = []
    fitness = old.get("fitness") or {}
    status = "ok"
    calls = 0
    if not key:
        errors.append("GARMIN_PERSONAL_API_KEY secret is missing. Add it under Settings > Secrets and variables > Actions.")
        status = "error"
    else:
        try:
            c = Client(get_token(key))
            new_acts = sync_activities(c, act_start, end, errors)
            new_days = sync_days(c, start, end, errors)
            fit = sync_fitness(c, today - dt.timedelta(days=fit_back), end, notes)
            for k, series in fit.items():
                merged = dict(fitness.get(k) or {})
                merged.update(series)
                if merged:
                    fitness[k] = dict(sorted(merged.items()))
            ts = sync_training_status(c, notes)
            if ts:
                fitness["trainingStatus"] = ts
            calls = c.calls
            for k, v in new_acts.items():   # keep fields that only the detail call provides
                old_a = acts.get(k) or {}
                for f in ("rpe", "feel", "exec", "stam0", "stam1", "stamMin", "recHR", "teLabel", "detail"):
                    if f in old_a and f not in v:
                        v[f] = old_a[f]
            acts.update(new_acts)
            sync_details(c, acts, iso(today - dt.timedelta(days=14)), notes)
            calls = c.calls
            for d, r in new_days.items():
                merged = dict(days.get(d, {}))
                merged.update(r)
                days[d] = merged
            if errors:
                status = "partial"
        except ApiError as e:
            status = "error"
            if e.status in (401, 403):
                errors.append("Garmin rejected the API key (expired or revoked?). Create a new key in Garmin Connect and update the GARMIN_PERSONAL_API_KEY secret. " + str(e))
            else:
                errors.append(str(e))

    cutoff = iso(today - dt.timedelta(days=KEEP_DAYS))
    days = {d: r for d, r in days.items() if d >= cutoff and r}
    act_list = sorted(acts.values(), key=lambda a: a.get("start", ""), reverse=True)

    payload = {"activities": act_list, "days": dict(sorted(days.items())), "fitness": fitness}
    changed = (payload["activities"] != old.get("activities") or payload["days"] != old.get("days")
               or payload["fitness"] != (old.get("fitness") or {}) or int(old.get("version") or 1) < VERSION)
    out = {
        "version": VERSION,
        "updated": now.isoformat(timespec="seconds") if changed or not old.get("updated") else old["updated"],
        "status": status,
        "errors": errors[:10],
        "notes": notes[:10],
        **payload,
    }
    # Only rewrite the file when something meaningful changed, so the history stays tidy.
    if changed or status != old.get("status") or errors[:10] != old.get("errors"):
        os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
        with open(OUT, "w") as f:
            json.dump(out, f, separators=(",", ":"), sort_keys=False)
            f.write("\n")
    weekly_notify(now)
    print(f"status={status} calls={calls} activities={len(act_list)} days={len(days)} "
          f"vo2={len(fitness.get('vo2', {}))} lt={len(fitness.get('ltSpeed', {}))} weight={len(fitness.get('weight', {}))} changed={changed}")
    for n in notes:
        print("note:", n)
    for e in errors:
        print("warning:", e)
    # A failed run makes GitHub email you, which is how you hear about an expired key.
    return 1 if status == "error" else 0


if __name__ == "__main__":
    sys.exit(main())
