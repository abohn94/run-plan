#!/usr/bin/env python3
"""Read your Google Calendar (its private iCal address) and work out your schedule for the plan.

The private address(es) come from the GCAL_ICS_URLS secret (one per line). Saved per day in garmin/calendar.json
(your private data repository):
  shifts  {date: "day" | "eve" | "night"}   work shifts (by keyword and length)
  busy    {date: [[startMin, endMin], ...]}  timed events, minutes after local midnight
  away    {date: "travel" | "vacation"}     trips and time off
  starts  {date: minutes}                   when a day shift starts (for wake-up times)
  events  {date: [{s, e, t, a, f}]}         personal events to show beside your training: start/end minutes,
                                           title (shortened), a = all day, f = marked free; work shifts are left out
Keywords are read from user/state.json (prefs.cal), with sensible defaults.
"""

import datetime as dt
import json
import os
import re
import sys
import urllib.request
from zoneinfo import ZoneInfo

OUT = "garmin/calendar.json"
STATE = "user/state.json"
DAYS_BACK, DAYS_AHEAD = 7, 70   # your schedule comes 6 weeks at a time; look 10 weeks ahead
DEFAULT_WORK = ["work", "shift", "cvicu", "icu", "hospital", "on call", "on-call", "charge"]
DEFAULT_VAC = ["vacation", "pto", "holiday", "day off", "time off"]
DEFAULT_TRAVEL = ["flight", "fly ", "travel", "trip", "airport", "hotel", "conference"]


def prefs():
    try:
        with open(STATE) as f:
            p = (json.load(f).get("prefs") or {})
    except (OSError, ValueError):
        p = {}
    c = p.get("cal") or {}
    words = lambda k, d: [w.strip().lower() for w in (c.get(k) or d) if str(w).strip()]
    tz = (p.get("watch") or {}).get("tz") or (p.get("notify") or {}).get("tz") or "America/Chicago"
    return words("work", DEFAULT_WORK), words("vacation", DEFAULT_VAC), words("travel", DEFAULT_TRAVEL), ZoneInfo(tz)


def unfold(text):
    return re.sub(r"\r?\n[ \t]", "", text).splitlines()


def parse_dt(val, params, tz):
    """-> (datetime in local tz, is_all_day)"""
    if "VALUE=DATE" in params or re.fullmatch(r"\d{8}", val):
        d = dt.datetime.strptime(val[:8], "%Y%m%d")
        return d.replace(tzinfo=tz), True
    m = re.search(r"TZID=([^;:]+)", params)
    base = dt.datetime.strptime(val[:15], "%Y%m%dT%H%M%S")
    if val.endswith("Z"):
        base = base.replace(tzinfo=dt.timezone.utc)
    else:
        try:
            base = base.replace(tzinfo=ZoneInfo(m.group(1)) if m else tz)
        except Exception:
            base = base.replace(tzinfo=tz)
    return base.astimezone(tz), False


def events(text, tz):
    out, cur = [], None
    for line in unfold(text):
        if line == "BEGIN:VEVENT":
            cur = {"ex": []}
        elif line == "END:VEVENT" and cur is not None:
            if "start" in cur:
                out.append(cur)
            cur = None
        elif cur is not None and ":" in line:
            head, val = line.split(":", 1)
            name, _, params = head.partition(";")
            try:
                if name == "DTSTART":
                    cur["start"], cur["allday"] = parse_dt(val, params, tz)
                elif name == "DTEND":
                    cur["end"], _ = parse_dt(val, params, tz)
                elif name == "SUMMARY":
                    cur["title"] = val.replace("\\,", ",").replace("\\n", " ")
                elif name == "RRULE":
                    cur["rrule"] = dict(kv.split("=", 1) for kv in val.split(";") if "=" in kv)
                elif name == "EXDATE":
                    for v in val.split(","):
                        cur["ex"].append(parse_dt(v, params, tz)[0].date())
                elif name == "STATUS" and val.upper() == "CANCELLED":
                    cur["cancel"] = True
                elif name == "TRANSP" and val.upper() == "TRANSPARENT":
                    cur["free"] = True
            except ValueError:
                pass
    return [e for e in out if not e.get("cancel")]


DAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]


def occurrences(e, lo, hi):
    """Start datetimes of an event between lo and hi (dates), expanding simple daily/weekly/monthly rules."""
    s = e["start"]
    r = e.get("rrule")
    if not r:
        return [s] if lo <= s.date() <= hi else []
    freq, step = r.get("FREQ", ""), int(r.get("INTERVAL", "1") or 1)
    until = None
    if "UNTIL" in r:
        try:
            until = dt.datetime.strptime(r["UNTIL"][:8], "%Y%m%d").date()
        except ValueError:
            until = None
    count = int(r["COUNT"]) if r.get("COUNT", "").isdigit() else None
    byday = [d[-2:] for d in r.get("BYDAY", "").split(",") if d]
    out, n, d = [], 0, s
    limit = hi if not until else min(hi, until)
    for _ in range(2000):
        if d.date() > limit or (count is not None and n >= count):
            break
        if freq == "WEEKLY" and byday:
            week0 = d - dt.timedelta(days=d.weekday())
            for wd in sorted(DAYS.index(b) for b in byday if b in DAYS):
                x = week0 + dt.timedelta(days=wd)
                if x < s or x.date() > limit or (count is not None and n >= count):
                    continue
                n += 1
                if x.date() >= lo and x.date() not in e["ex"]:
                    out.append(x)
            d = week0 + dt.timedelta(weeks=step) + dt.timedelta(days=s.weekday())
            continue
        n += 1
        if d.date() >= lo and d.date() not in e["ex"]:
            out.append(d)
        if freq == "DAILY":
            d += dt.timedelta(days=step)
        elif freq == "WEEKLY":
            d += dt.timedelta(weeks=step)
        elif freq == "MONTHLY":
            m = d.month - 1 + step
            try:
                d = d.replace(year=d.year + m // 12, month=m % 12 + 1)
            except ValueError:
                break
        elif freq == "YEARLY":
            try:
                d = d.replace(year=d.year + step)
            except ValueError:
                break
        else:
            break
    return out


def has(words, title):
    t = " " + (title or "").lower() + " "
    return any(w in t for w in words)


def main():
    urls = [u.strip() for u in re.split(r"[\n,]+", os.environ.get("GCAL_ICS_URLS", "")) if u.strip()]
    if not urls:
        print("calendar: no GCAL_ICS_URLS secret; skipping")
        return 0
    work, vac, trav, tz = prefs()
    today = dt.datetime.now(tz).date()
    lo, hi = today - dt.timedelta(days=DAYS_BACK), today + dt.timedelta(days=DAYS_AHEAD)
    res = {"shifts": {}, "busy": {}, "away": {}, "starts": {}, "ends": {}, "events": {}}
    n = 0
    for i, u in enumerate(urls):
        if u.startswith("webcal://"):
            u = "https://" + u[len("webcal://"):]
        try:
            text = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "run-plan"}), timeout=30).read().decode("utf-8", "replace")
        except Exception as e:
            print(f"calendar {i + 1}: could not download ({type(e).__name__})")
            continue
        evs = events(text, tz)
        n += len(evs)
        for e in evs:
            dur = (e.get("end") or e["start"] + dt.timedelta(hours=1)) - e["start"]
            title = e.get("title", "")
            for s in occurrences(e, lo, hi):
                d0 = s.date().isoformat()
                is_work = has(work, title) and not e.get("allday") and dur.total_seconds() >= 5 * 3600
                if not is_work and s.date() >= today - dt.timedelta(days=DAYS_BACK):
                    t = re.sub(r"\s+", " ", title or "Busy").strip()[:60] or "Busy"
                    if e.get("allday"):
                        days = max(1, round(dur.total_seconds() / 86400))
                        for k in range(days):
                            res["events"].setdefault((s.date() + dt.timedelta(days=k)).isoformat(), []).append({"t": t, "a": 1})
                    else:
                        en = s + dur
                        ev = {"t": t, "s": s.hour * 60 + s.minute, "e": (en.hour * 60 + en.minute) if en.date() == s.date() else 1440}
                        if e.get("free"):
                            ev["f"] = 1
                        res["events"].setdefault(d0, []).append(ev)
                if e.get("allday"):
                    days = max(1, round(dur.total_seconds() / 86400))
                    kind = "vacation" if has(vac, title) else "travel" if has(trav, title) else None
                    if kind:
                        for k in range(days):
                            res["away"][(s.date() + dt.timedelta(days=k)).isoformat()] = kind
                    continue
                end = s + dur
                hours = dur.total_seconds() / 3600
                if has(work, title) and hours >= 5:
                    night = s.hour >= 19 or (end.date() > s.date() and end.hour >= 3)
                    eve = not night and s.hour >= 11
                    res["shifts"][d0] = "night" if night else "eve" if eve else "day"
                    if not night and not eve:
                        res["starts"][d0] = s.hour * 60 + s.minute
                        res["ends"][d0] = end.hour * 60 + end.minute
                if e.get("free"):
                    continue
                if has(trav, title) and hours >= 2:
                    res["away"].setdefault(d0, "travel")
                # busy minutes on each local day the event touches
                cur = s
                while cur < end:
                    day_end = (cur + dt.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
                    seg_end = min(end, day_end)
                    a = cur.hour * 60 + cur.minute
                    b = 1440 if seg_end == day_end else seg_end.hour * 60 + seg_end.minute
                    if b > a:
                        res["busy"].setdefault(cur.date().isoformat(), []).append([a, b])
                    cur = seg_end
    for d in list(res["busy"]):
        iv = sorted(res["busy"][d])
        merged = []
        for a, b in iv:
            if merged and a <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], b)
            else:
                merged.append([a, b])
        res["busy"][d] = merged
    for d in res["events"]:
        seen, out = set(), []
        for ev in sorted(res["events"][d], key=lambda x: (0 if x.get("a") else 1, x.get("s", 0), x["t"])):
            k = (ev["t"], ev.get("s"), ev.get("a"))
            if k not in seen:
                seen.add(k)
                out.append(ev)
        res["events"][d] = out
    res = {k: dict(sorted(v.items())) for k, v in res.items()}
    try:
        with open(OUT) as f:
            old = json.load(f)
    except (OSError, ValueError):
        old = {}
    same = {k: old.get(k) for k in res} == res
    # did today or tomorrow change? then the watch workouts should be re-sent right away
    soon = [today.isoformat(), (today + dt.timedelta(days=1)).isoformat()]
    pick = lambda r: [(r.get("shifts") or {}).get(d) for d in soon] + [(r.get("away") or {}).get(d) for d in soon]
    if old and pick(old) != pick(res) and os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a") as f:
            f.write("soon=1\n")
        print("calendar: today or tomorrow changed")
    res["updated"] = old.get("updated") if same and old.get("updated") else dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    res["calendars"] = len(urls)
    os.makedirs("garmin", exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(res, f, separators=(",", ":"))
        f.write("\n")
    print(f"calendar: {n} events read; personal days={len(res['events'])} shifts={len(res['shifts'])} away={len(res['away'])} busy days={len(res['busy'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
