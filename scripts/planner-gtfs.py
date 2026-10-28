#!/usr/bin/env python3
"""Cut one planner town's buses out of a GTFS timetable (Bus Open Data).

Keeps the stops inside the town's bbox and every trip that runs on one
chosen day and calls at two or more of them, with each call's time. The
result is small enough for src/planner/buses.js to work out how often buses
run and how long a bus trip to a service takes.

    curl -L -o wm_gtfs.zip https://data.bus-data.dft.gov.uk/timetable/download/gtfs-file/west_midlands/
    python3 scripts/planner-gtfs.py wm_gtfs.zip 52.155,-2.285,52.235,-2.155 2026-11-03 public/planner/worcester/buses.json

Pick an ordinary weekday (not a bank holiday) inside the feed's dates.
"""
import csv
import datetime
import io
import json
import sys
import zipfile


def rows(zf, name):
    with zf.open(name) as f:
        yield from csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))


def minutes(hms):
    h, m, s = (int(x) for x in hms.split(":"))
    return h * 60 + m + s / 60


def active_services(zf, day):
    weekday = day.strftime("%A").lower()
    ymd = day.strftime("%Y%m%d")
    active = set()
    for r in rows(zf, "calendar.txt"):
        if r["start_date"] <= ymd <= r["end_date"] and r[weekday] == "1":
            active.add(r["service_id"])
    for r in rows(zf, "calendar_dates.txt"):
        if r["date"] != ymd:
            continue
        if r["exception_type"] == "1":
            active.add(r["service_id"])
        elif r["exception_type"] == "2":
            active.discard(r["service_id"])
    return active


def main():
    if len(sys.argv) != 5:
        sys.exit(__doc__)
    path, bbox, date, out = sys.argv[1:]
    s, w, n, e = (float(x) for x in bbox.split(","))
    day = datetime.date.fromisoformat(date)
    zf = zipfile.ZipFile(path)

    stops = {}
    for r in rows(zf, "stops.txt"):
        lat, lon = float(r["stop_lat"] or 0), float(r["stop_lon"] or 0)
        if s <= lat <= n and w <= lon <= e:
            stops[r["stop_id"]] = {"id": r["stop_id"], "name": r["stop_name"], "lon": round(lon, 5), "lat": round(lat, 5)}

    services = active_services(zf, day)
    routes = {r["route_id"]: r.get("route_short_name") or r.get("route_long_name") or r["route_id"] for r in rows(zf, "routes.txt")}
    trips = {r["trip_id"]: routes.get(r["route_id"], r["route_id"]) for r in rows(zf, "trips.txt") if r["service_id"] in services}

    calls = {}
    for r in rows(zf, "stop_times.txt"):
        if r["trip_id"] in trips and r["stop_id"] in stops:
            t = r["departure_time"] or r["arrival_time"]
            if t:
                calls.setdefault(r["trip_id"], []).append((int(r["stop_sequence"]), r["stop_id"], minutes(t)))

    used = sorted({sid for cs in calls.values() if len(cs) >= 2 for _, sid, _ in cs})
    index = {sid: i for i, sid in enumerate(used)}
    out_trips = []
    for trip_id, cs in calls.items():
        if len(cs) < 2:
            continue
        cs.sort()
        out_trips.append({"route": trips[trip_id], "calls": [[index[sid], round(t, 1)] for _, sid, t in cs]})

    with open(out, "w") as f:
        json.dump({
            "source": "Bus Open Data Service (GTFS), DfT",
            "date": date,
            "stops": [stops[sid] for sid in used],
            "trips": out_trips,
        }, f)
    print(f"[planner-gtfs] {date}: {len(services)} services running, {len(used)} stops, {len(out_trips)} trips -> {out}")


if __name__ == "__main__":
    main()
