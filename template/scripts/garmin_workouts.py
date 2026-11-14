#!/usr/bin/env python3
"""Put today's planned workouts on your Garmin watch, and remove past ones.

Reads the plain workout description that scripts/watch_plan.js writes, turns it into Garmin
workouts named like "11/16/26 Run" and "11/16/26 Lift", adds them to today in your Garmin
Connect calendar (the watch picks them up on its next sync), and deletes the ones it added
on earlier days. It only ever deletes workouts it created itself.

  python3 scripts/garmin_workouts.py check  spec.json   # is there anything to do? (no login)
  python3 scripts/garmin_workouts.py apply  spec.json   # log in to Garmin and do it

Garmin sign-in uses your email and password from the GARMIN_EMAIL and GARMIN_PASSWORD
GitHub secrets. This is not Garmin's official API, so Garmin can change it without notice.
"""

import difflib
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone

LOG = "garmin/watch.json"
TOKENS = os.environ.get("GARMIN_TOKEN_DIR", ".garmin_tokens")
MI = 1609.344
LB = 0.45359237

# Garmin IDs (from /workout-service/workout/types)
STEP = {"warmup": (1, "warmup"), "cooldown": (2, "cooldown"), "interval": (3, "interval"), "recovery": (4, "recovery"),
        "rest": (5, "rest"), "repeat": (6, "repeat")}
COND = {"lap": (1, "lap.button"), "time": (2, "time"), "distance": (3, "distance"), "iterations": (7, "iterations"), "reps": (10, "reps")}
RUN = {"sportTypeId": 1, "sportTypeKey": "running", "displayOrder": 1}
STRENGTH = {"sportTypeId": 5, "sportTypeKey": "strength_training", "displayOrder": 5}

# Your app's exercise names -> Garmin's exercise list. Anything missing falls back to the closest match.
EXERCISE_MAP = {
    "Back squat": "Barbell Back Squat", "Paused back squat": "Barbell Back Squat", "Front squat": "Barbell Front Squat",
    "Goblet squat, light": "Goblet Squat", "Goblet squat": "Goblet Squat", "Bodyweight squat": "Air Squat",
    "Barbell bench press": "Barbell Bench Press", "Dumbbell bench press": "Dumbbell Bench Press",
    "Incline dumbbell press": "Incline Dumbbell Bench Press", "Weighted push-up": "Weighted Push-up", "Push-up": "Push-up",
    "Pike push-up": "Pike Push-up", "One-arm dumbbell row": "Single-arm Neutral-grip Dumbbell Row",
    "Chest-supported dumbbell row": "Chest Supported Dumbbell Row", "Seated cable row": "Seated Cable Row",
    "Barbell bent-over row": "Bent-over Row with Barbell", "Inverted row": "Inverted Row",
    "Lat pulldown": "Lat Pull-down", "Neutral-grip lat pulldown": "Close-grip Lat Pull-down", "Pull-up": "Pull-up", "Chin-up": "Chin-up",
    "Standing barbell overhead press": "Barbell Overhead Press", "Seated dumbbell overhead press": "Seated Dumbbell Shoulder Press",
    "Dumbbell Arnold press": "Arnold Press", "Push press": "Barbell Push Press",
    "Trap-bar deadlift": "Trap-bar Deadlift", "Conventional deadlift": "Barbell Deadlift",
    "Barbell Romanian deadlift": "Romanian Deadlift", "Dumbbell Romanian deadlift": "Romanian Deadlift",
    "Dumbbell single-leg Romanian deadlift": "Single-leg Romanian Deadlift with Dumbbell",
    "Single-leg Romanian deadlift": "Single-leg Romanian Deadlift with Dumbbell",
    "Barbell hip thrust": "Barbell Hip Thrust with Bench", "Single-leg hip thrust": "Single-leg Hip Raise", "Glute bridge": "Hip Raise",
    "Barbell reverse lunge": "Barbell Reverse Lunge", "Dumbbell walking lunge": "Weighted Walking Lunge",
    "Dumbbell Bulgarian split squat": "Dumbbell Bulgarian Split Squat", "Front-foot-elevated split squat": "Dumbbell Split Squat",
    "Dumbbell step-up": "Dumbbell Step-up", "Box jump": "Box Jump", "Squat jump": "Jump Squat", "Split-squat jump": "Alternating Jump Lunge",
    "Lateral skater hops": "Lateral Leap and Hop", "Kettlebell swing": "Kettlebell Swing", "Medicine ball slam": "Medicine Ball Slam",
    "Medicine ball chest pass": "Medicine Ball Chest Pass", "Hanging knee raise": "Hanging Knee Raise", "Dead bug": "Dead Bug",
    "Pallof press": "Cable Core Press", "Hollow hold": "Hollow Rock", "Plank": "Plank", "Side plank": "Side Plank",
    "Side-lying hip abduction": "Side-lying Leg Raise", "Banded clamshell": "Banded Clam Shells",
    "Incline dumbbell curl": "Incline Dumbbell Biceps Curl", "Calf raise (single leg)": "Single-leg Standing Calf Raise",
    "Straight-knee calf raise": "Standing Calf Raise", "Deficit calf raise": "Standing Calf Raise",
    "Soleus raise (bent knee)": "Single-leg Bent-knee Calf Raise",
}
# No close Garmin equivalent: use the movement category and keep your exercise name in the step note.
CATEGORY_ONLY = {
    "Pogo hops": "PLYO", "Broad jump": "PLYO", "Alternate-leg bounds": "PLYO", "Cossack squat": "SQUAT", "Reverse lunge": "LUNGE",
    "Copenhagen plank": "PLANK", "Nordic hamstring curl": "LEG_CURL", "Landmine press": "SHOULDER_PRESS", "Dumbbell pullover": "FLYE",
    "Suitcase carry": "CARRY", "Tibialis raise (wall)": "CALF_RAISE", "Eccentric heel drop (single leg)": "CALF_RAISE",
    "Short-foot hold": "CALF_RAISE",
}
GUESS = [(r"squat", "SQUAT"), (r"lunge|split", "LUNGE"), (r"deadlift|rdl", "DEADLIFT"), (r"bench|chest press", "BENCH_PRESS"),
         (r"row", "ROW"), (r"pull-?up|chin|pulldown", "PULL_UP"), (r"overhead|shoulder|press", "SHOULDER_PRESS"), (r"curl", "CURL"),
         (r"calf|tibialis|heel", "CALF_RAISE"), (r"plank", "PLANK"), (r"bridge|thrust", "HIP_RAISE"), (r"jump|hop|bound", "PLYO"),
         (r"push-?up", "PUSH_UP"), (r"carry", "CARRY")]


def sig(w):
    return hashlib.sha1(json.dumps(w, sort_keys=True).encode()).hexdigest()[:12]


def load_log():
    try:
        with open(LOG) as f:
            return json.load(f)
    except (OSError, ValueError):
        return {"days": {}}


def save_log(log):
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, "w") as f:
        json.dump(log, f, indent=1, sort_keys=True)
        f.write("\n")


def plan_changes(spec, log):
    """What needs doing: workouts to add for today, and workouts we added earlier to delete."""
    today, days = spec["date"], log.get("days", {})
    want = [dict(w, sig=sig(w)) for w in spec["workouts"]] if spec.get("on") else []
    have = days.get(today, [])
    same = sorted(x["sig"] for x in want) == sorted(x.get("sig") for x in have)
    delete = [x for d, xs in days.items() if d != today for x in xs]          # past days (and stray future ones)
    if not same:
        delete += have
    return {"today": today, "add": [] if same else want, "delete": delete, "replace": not same}


# ---------- run workouts ----------
def end(s):
    if s.get("m"):
        return {"endCondition": cond("distance"), "endConditionValue": float(s["m"])}
    if s.get("s"):
        return {"endCondition": cond("time"), "endConditionValue": float(s["s"])}
    return {"endCondition": cond("lap"), "endConditionValue": None}


def cond(k):
    i, key = COND[k]
    return {"conditionTypeId": i, "conditionTypeKey": key, "displayOrder": i, "displayable": True}


def stype(k):
    i, key = STEP[k]
    return {"stepTypeId": i, "stepTypeKey": key, "displayOrder": i}


def target(pace):
    if not pace:
        return {"targetType": {"workoutTargetTypeId": 1, "workoutTargetTypeKey": "no.target", "displayOrder": 1}}
    slow, fast = pace          # seconds per mile -> metres per second (Garmin wants slower first)
    return {"targetType": {"workoutTargetTypeId": 6, "workoutTargetTypeKey": "pace.zone", "displayOrder": 6},
            "targetValueOne": round(MI / slow, 4), "targetValueTwo": round(MI / fast, 4)}


def run_workout(w):
    order = [0]

    def nxt():
        order[0] += 1
        return order[0]

    def step(kind, s):
        st = {"type": "ExecutableStepDTO", "stepOrder": nxt(), "stepType": stype(kind)}
        st.update(end(s))
        st.update(target(s.get("pace")))
        if s.get("desc"):
            st["description"] = s["desc"][:120]
        return {k: v for k, v in st.items() if v is not None}

    steps = []
    for s in w["steps"]:
        if s["kind"] in ("warmup", "cooldown"):
            steps.append(step(s["kind"], s))
        elif s["kind"] == "run":
            steps.append(step("interval", s))
        elif s["kind"] == "repeat":
            grp = {"type": "RepeatGroupDTO", "stepOrder": nxt(), "stepType": stype("repeat"), "numberOfIterations": int(s["n"]),
                   "endCondition": dict(cond("iterations"), displayable=False), "endConditionValue": float(s["n"]), "smartRepeat": False}
            grp["workoutSteps"] = [step("interval", s["work"]), step("recovery", s["rec"])]
            steps.append(grp)
    return {"workoutName": w["name"], "description": w.get("desc", "")[:500], "sportType": RUN, "estimatedDurationInSecs": 0,
            "workoutSegments": [{"segmentOrder": 1, "sportType": RUN, "workoutSteps": steps}]}


# ---------- strength workouts ----------
def exercise_ids(name):
    from garminconnect import exercises as gx
    hit = gx.resolve(EXERCISE_MAP.get(name, name))
    if hit:
        return hit["category"], hit["exercise"], False
    if name in CATEGORY_ONLY:
        return CATEGORY_ONLY[name], "", True
    names = [e["name"] for e in gx.EXERCISES]
    close = difflib.get_close_matches(name.title(), names, n=1, cutoff=0.82)
    if close:
        e = gx.resolve(close[0])
        return e["category"], e["exercise"], False
    for pat, c in GUESS:
        if re.search(pat, name, re.I):
            return c, "", True
    return "TOTAL_BODY", "", True


def lift_workout(w):
    order, steps = 0, []
    for e in w["exercises"]:
        cat, exn, generic = exercise_ids(e["name"])
        order += 1
        grp = {"type": "RepeatGroupDTO", "stepOrder": order, "stepType": stype("repeat"), "numberOfIterations": int(e["sets"]),
               "endCondition": dict(cond("iterations"), displayable=False), "endConditionValue": float(e["sets"]), "smartRepeat": False,
               "skipLastRestStep": True}
        order += 1
        note = (e["name"] + ": " if generic else "") + (("per " + e["per"] + ". ") if e.get("per") else "") + e.get("note", "")
        ex = {"type": "ExecutableStepDTO", "stepOrder": order, "stepType": stype("interval"), "category": cat, "exerciseName": exn,
              "description": note[:120]}
        if e.get("reps"):
            ex.update({"endCondition": cond("reps"), "endConditionValue": float(e["reps"])})
        elif e.get("sec"):
            ex.update({"endCondition": cond("time"), "endConditionValue": float(e["sec"])})
        else:
            ex.update({"endCondition": cond("lap")})
        ex.update(target(None))
        if e.get("lb"):
            ex["weightValue"] = round(float(e["lb"]) * LB * 1000.0, 1)       # Garmin stores grams
            ex["weightUnit"] = {"unitId": 8, "unitKey": "kilogram", "factor": 1000.0}
        order += 1
        rest = {"type": "ExecutableStepDTO", "stepOrder": order, "stepType": stype("rest"), "endCondition": cond("time"),
                "endConditionValue": float(e.get("rest") or 60)}
        rest.update(target(None))
        grp["workoutSteps"] = [ex, rest]
        steps.append(grp)
    return {"workoutName": w["name"], "description": w.get("desc", "")[:500], "sportType": STRENGTH, "estimatedDurationInSecs": 0,
            "workoutSegments": [{"segmentOrder": 1, "sportType": STRENGTH, "workoutSteps": steps}]}


def build(w):
    return run_workout(w) if w["kind"] == "run" else lift_workout(w)


# ---------- main ----------
def main():
    mode, spec_path = sys.argv[1], sys.argv[2]
    with open(spec_path) as f:
        spec = json.load(f)
    log = load_log()
    ch = plan_changes(spec, log)
    todo = bool(ch["add"] or ch["delete"])
    if mode == "check":
        print(f"date={ch['today']} on={spec.get('on')} add={[w['name'] for w in ch['add']]} delete={[x.get('name') for x in ch['delete']]}")
        if os.environ.get("GITHUB_OUTPUT"):
            with open(os.environ["GITHUB_OUTPUT"], "a") as f:
                f.write(f"todo={'1' if todo else '0'}\n")
        return 0
    if mode == "preview":           # print the Garmin JSON without logging in (for testing)
        print(json.dumps([build(w) for w in spec["workouts"]], indent=1))
        return 0
    if not todo:
        print("Nothing to change.")
        return 0

    email, password = os.environ.get("GARMIN_EMAIL", "").strip(), os.environ.get("GARMIN_PASSWORD", "")
    if not email or not password:
        print("GARMIN_EMAIL and GARMIN_PASSWORD secrets are missing. Add them under Settings > Secrets and variables > Actions.")
        return 1
    from garminconnect import Garmin
    g = Garmin(email=email, password=password)
    g.login(tokenstore=TOKENS)

    days = log.setdefault("days", {})
    errors = []
    for x in ch["delete"]:
        try:
            g.delete_workout(x["id"])
            print("deleted", x.get("name"), x["id"])
        except Exception as e:      # already gone is fine
            if "404" not in str(e):
                errors.append(f"delete {x.get('name')}: {e}")
        for d in list(days):
            days[d] = [y for y in days[d] if y.get("id") != x["id"]]
            if not days[d]:
                del days[d]
    added = []
    for w in ch["add"]:
        try:
            res = g.upload_workout(build(w))
            wid = res.get("workoutId")
            g.schedule_workout(wid, ch["today"])
            added.append({"id": wid, "name": w["name"], "sig": w["sig"], "title": w.get("title", "")})
            print("added", w["name"], wid)
            time.sleep(1)
        except Exception as e:
            errors.append(f"upload {w['name']}: {e}")
    if added:
        days[ch["today"]] = added
    log["updated"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    log["errors"] = errors[:5]
    save_log(log)
    try:
        g.client.dump(TOKENS)       # keep refreshed tokens for the next run
    except Exception:
        pass
    for e in errors:
        print("error:", e)
    return 1 if errors and not added and ch["add"] else 0


if __name__ == "__main__":
    sys.exit(main())
