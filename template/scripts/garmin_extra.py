#!/usr/bin/env python3
"""Garmin metrics the Personal API doesn't share, read with your Garmin sign-in (same as watch workouts).

Writes garmin/extra.json: lactate threshold, Training Readiness, HRV status, training status and
4-week load balance, race predictions, endurance and hill scores, heat/altitude acclimation, laps
for recent runs, exercise sets for recent strength sessions, daily food totals and cycle phase.

  python3 scripts/garmin_extra.py probe   # print the shape of each response (no values saved)
  python3 scripts/garmin_extra.py run     # update garmin/extra.json

Every call is best effort: anything Garmin refuses is skipped and noted.
"""

import datetime as dt
import json
import os
import sys

OUT = "garmin/extra.json"
DATA = "garmin/data.json"
TOKENS = os.environ.get("GARMIN_TOKEN_DIR", ".garmin_tokens")
TODAY = dt.date.today()


def iso(d):
    return d.isoformat()


def login():
    from garminconnect import Garmin
    g = Garmin(email=os.environ.get("GARMIN_EMAIL", "").strip(), password=os.environ.get("GARMIN_PASSWORD", ""))
    g.login(tokenstore=TOKENS)
    return g


def shape(o, pre="", out=None, depth=0):
    """Key paths with a type and, for numbers and short codes, the value (no names, ids or long text)."""
    out = out if out is not None else []
    if depth > 6 or len(out) > 160:
        return out
    if isinstance(o, dict):
        for k, v in o.items():
            shape(v, f"{pre}.{k}" if pre else k, out, depth + 1)
    elif isinstance(o, list):
        out.append(f"{pre}[] len={len(o)}")
        if o:
            shape(o[0], pre + "[0]", out, depth + 1)
    else:
        v = o
        if isinstance(v, str) and (len(v) > 40 or "@" in v):
            v = "<str>"
        out.append(f"{pre} = {v!r}")
    return out


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def walk(o):
    if isinstance(o, dict):
        yield o
        for v in o.values():
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)


def first(o, *keys):
    for d in walk(o):
        for k in keys:
            if k in d and d[k] not in (None, "", [], {}):
                return d[k]
    return None


def recent_activities():
    try:
        with open(DATA) as f:
            acts = json.load(f).get("activities", [])
    except (OSError, ValueError):
        return [], []
    since = iso(TODAY - dt.timedelta(days=120))
    runs = [a for a in acts if a.get("run") and (a.get("date") or "") >= since]
    lifts = [a for a in acts if a.get("strength") and (a.get("date") or "") >= since]
    return runs, lifts


def calls(g):
    t = iso(TODAY)
    runs, lifts = recent_activities()
    c = [
        ("lt", lambda: g.get_lactate_threshold()),
        ("readiness", lambda: g.get_training_readiness(t)),
        ("hrv", lambda: g.get_hrv_data(t)),
        ("status", lambda: g.get_training_status(t)),
        ("balance", lambda: g.get_training_four_week_load_balance(t)),
        ("race", lambda: g.get_race_predictions()),
        ("endurance", lambda: g.get_endurance_score(iso(TODAY - dt.timedelta(days=28)), t)),
        ("hill", lambda: g.get_hill_score(iso(TODAY - dt.timedelta(days=28)), t)),
        ("acclim", lambda: g.get_heat_altitude_acclimation(t)),
        ("food", lambda: g.get_nutrition_daily_food_log(iso(TODAY - dt.timedelta(days=1)))),
        ("cycle", lambda: g.get_menstrual_data_for_date(t)),
    ]
    if runs:
        c.append(("laps", lambda: g.get_activity_splits(str(runs[0]["id"]))))
    if lifts:
        c.append(("sets", lambda: g.get_activity_exercise_sets(str(lifts[0]["id"]))))
    return c


def probe():
    g = login()
    for name, fn in calls(g):
        try:
            res = fn()
            print(f"===== {name}")
            for line in shape(res)[:120]:
                print("  ", line)
        except Exception as e:
            print(f"===== {name}: ERROR {str(e)[:200]}")


def _last(arr, lo=0):
    """Last [ms, value] pair with a real value from a Garmin values array ([ts, v] or [ts, 'MEASURED', v, ver])."""
    for e in reversed(arr or []):
        if not isinstance(e, (list, tuple)) or len(e) < 2:
            continue
        v = next((x for x in e[1:] if isinstance(x, (int, float)) and not isinstance(x, bool)), None)
        if v is not None and v >= lo:
            return e[0], v
    return None, None


def _hourly(arr, tz, lo=0):
    out = {}
    for e in arr or []:
        if not isinstance(e, (list, tuple)) or len(e) < 2 or not isinstance(e[0], (int, float)):
            continue
        v = next((x for x in e[1:] if isinstance(x, (int, float)) and not isinstance(x, bool)), None)
        if v is None or v < lo:
            continue
        out[str(dt.datetime.fromtimestamp(e[0] / 1000, tz).hour)] = v
    return out


def now():
    """Live readings for the Today screen, refreshed through the day: Body Battery, stress, heart rate and
    Garmin's Training Readiness as it changes. Saved under "now" in garmin/extra.json."""
    from zoneinfo import ZoneInfo
    tzname = "America/Chicago"
    try:
        with open("user/state.json") as f:
            tzname = ((json.load(f).get("prefs") or {}).get("watch") or {}).get("tz") or tzname
    except (OSError, ValueError):
        pass
    tz = ZoneInfo(tzname)
    today = dt.datetime.now(tz).date()
    t = iso(today)
    g = login()
    out, notes = {"date": t}, []
    clock = lambda ms: dt.datetime.fromtimestamp(ms / 1000, tz).strftime("%H:%M") if ms else None
    try:
        r = g.get_training_readiness(t)
        lst = r if isinstance(r, list) else [r] if isinstance(r, dict) else []
        lst = [x for x in lst if isinstance(x, dict) and x.get("score") is not None]
        if lst:
            x = sorted(lst, key=lambda z: str(z.get("timestampLocal") or z.get("timestamp") or ""))[-1]
            ts = str(x.get("timestampLocal") or "")
            out["ready"] = {"score": num(x.get("score")), "level": x.get("level"), "feedback": x.get("feedbackShort"),
                            "recoveryH": num(x.get("recoveryTime")), "at": ts[11:16] or None, "n": len(lst)}
    except Exception as e:
        notes.append(f"readiness: {str(e)[:100]}")
    bb_arr = None
    try:
        s = g.get_stress_data(t) or {}
        ms, v = _last(s.get("stressValuesArray"), 0)
        if v is not None:
            out["stress"] = {"v": v, "at": clock(ms), "avg": num(s.get("avgStressLevel")), "max": num(s.get("maxStressLevel"))}
        bb_arr = s.get("bodyBatteryValuesArray")
    except Exception as e:
        notes.append(f"stress: {str(e)[:100]}")
    try:
        b = g.get_body_battery(t, t)
        day = b[0] if isinstance(b, list) and b else b if isinstance(b, dict) else {}
        arr = day.get("bodyBatteryValuesArray") or []
        if bb_arr and len(bb_arr) > len(arr):   # the stress feed carries Body Battery every few minutes
            arr = bb_arr
        ms, v = _last(arr, 0)
        if v is not None:
            out["bb"] = {"v": v, "at": clock(ms), "charged": num(day.get("charged")), "drained": num(day.get("drained")), "hours": _hourly(arr, tz)}
    except Exception as e:
        notes.append(f"battery: {str(e)[:100]}")
        ms, v = _last(bb_arr, 0)
        if v is not None:
            out["bb"] = {"v": v, "at": clock(ms), "hours": _hourly(bb_arr, tz)}
    try:
        h = g.get_heart_rates(t) or {}
        ms, v = _last(h.get("heartRateValues"), 1)
        out["hr"] = {"rest": num(h.get("restingHeartRate")), "v": v, "at": clock(ms)}
    except Exception as e:
        notes.append(f"heart: {str(e)[:100]}")
    out["updated"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    out["notes"] = notes[:5]
    try:
        with open(OUT) as f:
            ex = json.load(f)
    except (OSError, ValueError):
        ex = {}
    ex["now"] = out
    if out.get("ready"):   # keep the daily history current too
        ex.setdefault("readiness", {}).setdefault(t, {}).update({k: out["ready"][k] for k in ("score", "level", "recoveryH") if out["ready"].get(k) is not None})
    os.makedirs("garmin", exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(ex, f, separators=(",", ":"), sort_keys=True)
        f.write("\n")
    try:
        g.client.dump(TOKENS)
    except Exception:
        pass
    print("now:", {k: v for k, v in out.items() if k not in ("bb",)}, "bb:", (out.get("bb") or {}).get("v"))
    return 0


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "run"
    if mode == "probe":
        probe()
    elif mode == "now":
        sys.exit(now())
    else:
        import garmin_extra_parse
        sys.exit(garmin_extra_parse.run(login, calls, recent_activities))
