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


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "run"
    if mode == "probe":
        probe()
    else:
        import garmin_extra_parse
        sys.exit(garmin_extra_parse.run(login, calls, recent_activities))
