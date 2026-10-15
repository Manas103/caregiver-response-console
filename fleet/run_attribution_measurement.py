"""Produces the raw attribution measurement committed at docs/fleet_attribution_output.txt.

Run: python -m fleet.run_attribution_measurement
"""

import os
import tempfile

from fleet import attribution, generate_log, schema

NUM_VEHICLES = 300
EPISODES_PER_VEHICLE = 8
SEED = 42


def main():
    path = os.path.join(tempfile.gettempdir(), "fleet_attribution_measurement.db")
    for ext in ("", "-wal", "-shm"):
        if os.path.exists(path + ext):
            os.remove(path + ext)
    conn = schema.connect(path)
    episodes = generate_log.generate_readiness_episodes(conn, NUM_VEHICLES, EPISODES_PER_VEHICLE, SEED)
    print(f"vehicles: {NUM_VEHICLES}")
    print(f"episodes per vehicle: {EPISODES_PER_VEHICLE}")
    print(f"total episodes generated: {episodes}")

    rows = attribution.oos_minutes_by_cause(conn)
    total_minutes = sum(r[1] for r in rows)
    total_episodes_paired = sum(r[2] for r in rows)
    print(f"causes represented: {len(rows)} of 11")
    print(f"total OOS minutes attributed: {total_minutes:.1f}")
    print(f"episodes paired (out_of_service -> back_in_service): {total_episodes_paired}")
    print()
    print(f"{'cause':28s} {'minutes':>12s} {'episodes':>9s} {'share':>7s}")
    for cause, minutes, ep in rows:
        print(f"{cause:28s} {minutes:12.1f} {ep:9d} {100 * minutes / total_minutes:6.2f}%")
    print()
    share = attribution.top_n_share(rows, 3)
    top3 = ", ".join(r[0] for r in rows[:3])
    print(f"top 3 of 11 causes ({top3}): {100 * share:.2f}% of total OOS minutes")
    conn.close()


if __name__ == "__main__":
    main()
