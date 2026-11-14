"""Turns the Garmin responses from garmin_extra.py into garmin/extra.json (small, app-friendly)."""

import datetime as dt
import json
import os
import time

OUT = "garmin/extra.json"
KEEP = 120   # days of daily history to keep
TODAY = dt.date.today()


def iso(d):
    return d.isoformat()


def num(x, nd=None):
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return round(v, nd) if nd is not None else v


def walk(o):
    if isinstance(o, dict):
        yield o
        for v in o.values():
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)


def find(o, key):
    for d in walk(o):
        if isinstance(d, dict) and key in d and d[key] is not None:
            return d
    return None


def p_lt(r):
    sh, pw = (r or {}).get("speed_and_heart_rate") or {}, (r or {}).get("power") or {}
    sp = num(sh.get("speed"))
    if sp and sp < 1.5:
        sp *= 10            # Garmin reports tenths of m/s here
    return {"date": (sh.get("calendarDate") or "")[:10] or iso(TODAY), "speed": round(sp, 3) if sp else None,
            "pace": round(1609.344 / sp) if sp else None, "hr": num(sh.get("heartRate")), "ftp": num(pw.get("functionalThresholdPower")),
            "wkg": num(pw.get("powerToWeight"), 2)}


def p_readiness(r):
    x = r[0] if isinstance(r, list) and r else r if isinstance(r, dict) else None
    if not x or x.get("score") is None:
        return None
    f = {k: num(x.get(k + "FactorPercent")) for k in ("sleepScore", "recoveryTime", "acwr", "stressHistory", "hrv", "sleepHistory")}
    return {"score": num(x.get("score")), "level": x.get("level"), "feedback": x.get("feedbackShort"), "recoveryH": num(x.get("recoveryTime")),
            "acute": num(x.get("acuteLoad")), "sleepScore": num(x.get("sleepScore")), "hrvWeek": num(x.get("hrvWeeklyAverage")), "factors": f}


def p_hrv(r):
    s = (r or {}).get("hrvSummary") or {}
    b = s.get("baseline") or {}
    if not s:
        return None
    return {"last": num(s.get("lastNightAvg")), "week": num(s.get("weeklyAvg")), "lo": num(b.get("balancedLow")), "hi": num(b.get("balancedUpper")),
            "lowUpper": num(b.get("lowUpper")), "status": s.get("status")}


def p_status(r):
    d = find(r, "trainingStatusFeedbackPhrase") or find(r, "trainingStatus")
    a = find(r, "dailyTrainingLoadAcute") or {}
    if not d and not a:
        return None
    return {"phrase": (d or {}).get("trainingStatusFeedbackPhrase"), "code": (d or {}).get("trainingStatus"), "trend": (d or {}).get("fitnessTrend"),
            "acute": num(a.get("dailyTrainingLoadAcute")), "chronic": num(a.get("dailyTrainingLoadChronic")),
            "chronicMin": num(a.get("minTrainingLoadChronic"), 1), "chronicMax": num(a.get("maxTrainingLoadChronic"), 1),
            "acwr": num(a.get("dailyAcuteChronicWorkloadRatio")), "acwrStatus": a.get("acwrStatus")}


def p_balance(r):
    d = find(r, "monthlyLoadAerobicLow")
    if not d:
        return None
    g = lambda k: num(d.get(k), 1)
    return {"loads": {"low": g("monthlyLoadAerobicLow"), "high": g("monthlyLoadAerobicHigh"), "anaerobic": g("monthlyLoadAnaerobic")},
            "targets": {"low": [g("monthlyLoadAerobicLowTargetMin"), g("monthlyLoadAerobicLowTargetMax")],
                        "high": [g("monthlyLoadAerobicHighTargetMin"), g("monthlyLoadAerobicHighTargetMax")],
                        "anaerobic": [g("monthlyLoadAnaerobicTargetMin"), g("monthlyLoadAnaerobicTargetMax")]},
            "phrase": d.get("trainingBalanceFeedbackPhrase")}


def p_race(r):
    x = r[0] if isinstance(r, list) and r else r
    if not isinstance(x, dict) or not x.get("timeHalfMarathon"):
        return None
    return {"k5": num(x.get("time5K")), "k10": num(x.get("time10K")), "half": num(x.get("timeHalfMarathon")), "full": num(x.get("timeMarathon"))}


def p_endurance(r):
    d = (r or {}).get("enduranceScoreDTO") or {}
    if not d.get("overallScore"):
        return None
    lim = {k: num(d.get("classificationLowerLimit" + k)) for k in ("Intermediate", "Trained", "WellTrained", "Expert", "Superior", "Elite")}
    weeks = {k: num(v.get("groupAverage")) for k, v in ((r or {}).get("groupMap") or {}).items() if isinstance(v, dict)}
    return {"score": num(d.get("overallScore")), "class": d.get("classification"), "limits": lim, "weeks": weeks}


def p_hill(r):
    lst = (r or {}).get("hillScoreDTOList") or []
    if not lst:
        return None
    x = sorted(lst, key=lambda z: z.get("calendarDate") or "")[-1]
    return {"score": num(x.get("overallScore")), "strength": num(x.get("strengthScore")), "endurance": num(x.get("enduranceScore")),
            "series": {z["calendarDate"]: num(z.get("overallScore")) for z in lst if z.get("calendarDate") and z.get("overallScore")}}


def p_acclim(r):
    if not r:
        return None
    return {"heat": num(r.get("heatAcclimationPercentage")), "altitude": num(r.get("altitudeAcclimation")), "altTrend": r.get("altitudeTrend"),
            "heatTrend": r.get("heatTrend")}


def p_food(r):
    if not r:
        return None
    tot = {"kcal": 0.0, "carbs": 0.0, "protein": 0.0, "fat": 0.0}
    n = 0
    for f in r.get("loggedFoodsWithServingSizes") or []:
        info = f.get("nutritionContent") or f.get("foodNutrition") or f
        for k, keys in (("kcal", ("calories",)), ("carbs", ("carbs", "carbohydrates")), ("protein", ("protein",)), ("fat", ("fat",))):
            for kk in keys:
                v = num(info.get(kk))
                if v is not None:
                    tot[k] += v * (num(f.get("servingQty")) or 1)
                    break
        n += 1
    g = r.get("dailyNutritionGoals") or {}
    return {"items": n, "kcal": round(tot["kcal"]), "carbs": round(tot["carbs"]), "protein": round(tot["protein"]), "fat": round(tot["fat"]),
            "goalKcal": num(g.get("adjustedCalories") or g.get("calories"))}


def p_cycle(r):
    d = find(r, "currentPhase") or find(r, "phase") or find(r, "dayInCycle")
    if not d:
        return None
    return {"phase": d.get("currentPhase") or d.get("phase"), "day": num(d.get("dayInCycle") or d.get("cycleDay")), "length": num(d.get("cycleLength") or d.get("predictedCycleLength"))}


def p_laps(r):
    out = []
    for l in (r or {}).get("lapDTOs") or []:
        out.append({"d": num(l.get("distance"), 1), "t": num(l.get("movingDuration") or l.get("duration"), 1), "hr": num(l.get("averageHR")),
                    "cad": num(l.get("averageRunCadence"), 1), "gap": num(l.get("avgGradeAdjustedSpeed"), 3), "sp": num(l.get("averageMovingSpeed") or l.get("averageSpeed"), 3),
                    "up": num(l.get("elevationGain"), 1), "down": num(l.get("elevationLoss"), 1), "step": l.get("wktStepIndex"),
                    "type": l.get("intensityType"), "score": num(l.get("directWorkoutComplianceScore")), "gct": num(l.get("groundContactTime"), 1),
                    "vo": num(l.get("verticalOscillation"), 2), "temp": num(l.get("averageTemperature"))})
    return out


def p_sets(r):
    out = []
    for s in (r or {}).get("exerciseSets") or []:
        ex = (s.get("exercises") or [{}])[0] or {}
        w = num(s.get("weight"))
        out.append({"cat": ex.get("category"), "name": ex.get("name"), "reps": num(s.get("repetitionCount")),
                    "lb": round(w / 1000 / 0.45359237 * 2) / 2 if w else 0, "dur": num(s.get("duration"), 1),
                    "type": s.get("setType"), "step": s.get("wktStepIndex")})
    return out


def run(login, calls, recent_activities):
    try:
        with open(OUT) as f:
            ex = json.load(f)
    except (OSError, ValueError):
        ex = {}
    g = login()
    t = iso(TODAY)
    notes = []
    parsers = {"lt": p_lt, "readiness": p_readiness, "hrv": p_hrv, "status": p_status, "balance": p_balance, "race": p_race,
               "endurance": p_endurance, "hill": p_hill, "acclim": p_acclim, "food": p_food, "cycle": p_cycle}
    for name, fn in calls(g):
        if name in ("laps", "sets"):
            continue
        try:
            v = parsers[name](fn())
        except Exception as e:
            notes.append(f"{name}: {str(e)[:120]}")
            continue
        if v is None:
            continue
        if name in ("readiness", "hrv", "race"):            # daily history
            ex.setdefault(name, {})[t] = v
        elif name == "food":
            ex.setdefault("food", {})[iso(TODAY - dt.timedelta(days=1))] = v
        elif name == "lt":
            ex["lt"] = v
            ex.setdefault("ltHistory", {})[v["date"]] = {"pace": v["pace"], "hr": v["hr"]}
        else:
            v["date"] = t
            ex[name] = v
    # laps for recent runs and sets for recent lifts (only ones we don't have yet; a few per run of this job)
    runs, lifts = recent_activities()
    laps, sets = ex.setdefault("laps", {}), ex.setdefault("sets", {})
    n = 0
    for a in runs:
        k = str(a["id"])
        if k in laps or n >= 12:
            continue
        try:
            laps[k] = {"date": a.get("date"), "laps": p_laps(g.get_activity_splits(k))}
            n += 1
            time.sleep(0.5)
        except Exception as e:
            notes.append(f"laps {k}: {str(e)[:80]}")
    for a in lifts:
        k = str(a["id"])
        if k in sets or n >= 18:
            continue
        try:
            sets[k] = {"date": a.get("date"), "sets": p_sets(g.get_activity_exercise_sets(k))}
            n += 1
            time.sleep(0.5)
        except Exception as e:
            notes.append(f"sets {k}: {str(e)[:80]}")
    # trim old history
    cut = iso(TODAY - dt.timedelta(days=KEEP))
    for key in ("readiness", "hrv", "race", "food", "ltHistory"):
        if key in ex:
            ex[key] = {d: v for d, v in sorted(ex[key].items()) if d >= cut}
    for key in ("laps", "sets"):
        ex[key] = {k: v for k, v in ex[key].items() if (v.get("date") or "") >= iso(TODAY - dt.timedelta(days=400))}
    ex["updated"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    ex["notes"] = notes[:10]
    os.makedirs("garmin", exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(ex, f, separators=(",", ":"), sort_keys=True)
        f.write("\n")
    try:
        g.client.dump(os.environ.get("GARMIN_TOKEN_DIR", ".garmin_tokens"))
    except Exception:
        pass
    print("extra.json updated:", {k: (len(v) if isinstance(v, dict) else 1) for k, v in ex.items() if k not in ("updated", "notes")}, "notes:", notes)
    return 0
