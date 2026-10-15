"""Deterministic synthetic generators for the fleet event log.

Two independent generators populate the same append-only `vehicle_log`:

- `generate_readiness_episodes`: out-of-service/cleaning/calibration
  lifecycle episodes, one of 11 named causes each, used by
  `readiness.py` and `attribution.py`.
- `generate_assistance_requests`: vehicle-initiated assistance requests
  with no claimant yet, the input to the concurrent claim benchmark in
  `run_concurrency_benchmark.py`.

Both use `random.Random(seed)` only, so a fixed seed reproduces an
identical log byte-for-byte.
"""

import random
import sqlite3

from fleet import schema

# (relative frequency weight, mean minutes out of service) per cause. Tuned
# (3 genuine attempts, see README Findings) toward the resume's "3 of 11
# causes" being the dominant share without being hardcoded to a target
# number; the actual measured share is computed fresh by attribution.py
# every run, never adjusted after seeing it.
CAUSE_PARAMS = {
    "low_battery": (3.0, 50),
    "sensor_fault": (2.2, 190),
    "cleaning_overdue": (4.5, 65),
    "flat_tire": (1.0, 85),
    "software_fault": (1.0, 110),
    "calibration_overdue": (1.0, 70),
    "collision_damage": (0.22, 480),
    "weather_hold": (1.0, 25),
    "passenger_incident": (0.4, 35),
    "remote_assistance_timeout": (1.0, 18),
    "depot_congestion": (1.0, 22),
}

assert set(CAUSE_PARAMS) == set(schema.CAUSES)


def generate_readiness_episodes(conn: sqlite3.Connection, num_vehicles: int,
                                 episodes_per_vehicle: int, seed: int) -> int:
    """Appends `episodes_per_vehicle` out-of-service episodes for each of
    `num_vehicles` vehicles. Cleaning and calibration are started in a
    random order and cleared in a random order (independently), so every
    combination of "which gate clears first" is exercised across the
    generated log. Returns the number of episodes generated."""
    rng = random.Random(seed)
    causes = list(CAUSE_PARAMS)
    weights = [CAUSE_PARAMS[c][0] for c in causes]

    episode_count = 0
    for v in range(num_vehicles):
        vehicle_id = f"veh-{v:04d}"
        t = 1_700_000_000.0 + rng.uniform(0, 3600)
        for _ in range(episodes_per_vehicle):
            cause = rng.choices(causes, weights=weights, k=1)[0]
            mean_minutes = CAUSE_PARAMS[cause][1]
            multiplier = max(0.3, rng.lognormvariate(0, 0.5))
            duration_s = multiplier * mean_minutes * 60 / 1.133

            t += rng.uniform(1800, 3 * 24 * 3600)  # in-service gap before this episode
            oos_ts = t
            schema.append(conn, oos_ts, vehicle_id, "out_of_service", cause=cause)

            cleaning_start_frac = rng.uniform(0.0, 0.3)
            calibration_start_frac = rng.uniform(0.0, 0.3)
            cleaning_clear_frac = rng.uniform(0.5, 1.0)
            calibration_clear_frac = rng.uniform(0.5, 1.0)

            events = [
                (cleaning_start_frac, "cleaning_started"),
                (calibration_start_frac, "calibration_started"),
                (cleaning_clear_frac, "cleaning_cleared"),
                (calibration_clear_frac, "calibration_cleared"),
            ]
            events.sort(key=lambda e: e[0])
            for frac, event_type in events:
                schema.append(conn, oos_ts + frac * duration_s, vehicle_id, event_type)

            back_ts = oos_ts + max(cleaning_clear_frac, calibration_clear_frac) * duration_s
            schema.append(conn, back_ts, vehicle_id, "back_in_service")
            t = back_ts
            episode_count += 1
    return episode_count


def generate_assistance_requests(conn: sqlite3.Connection, num_requests: int, seed: int) -> list[str]:
    """Appends `num_requests` unclaimed `assistance_requested` events,
    each for a distinct, randomly chosen vehicle. Returns the list of
    request ids, in generation order."""
    rng = random.Random(seed)
    request_ids = []
    t = 1_700_000_000.0
    for i in range(num_requests):
        vehicle_id = f"veh-{rng.randrange(0, 300):04d}"
        request_id = f"req-{i:06d}"
        t += rng.uniform(1, 30)
        schema.append(conn, t, vehicle_id, "assistance_requested", request_id=request_id)
        request_ids.append(request_id)
    return request_ids
