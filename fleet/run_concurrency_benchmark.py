"""Measures exactly-once claiming of vehicle-initiated assistance requests
under real concurrent agents.

For each of a batch of unclaimed `assistance_requested` events, spawns
AGENTS_PER_REQUEST real Python threads, each holding its own SQLite
connection to the same database file, all racing `claim_engine.try_claim`
for that one request at (as close to) the same instant as `threading`
allows. Reports how many requests had exactly one winner.

Run: python -m fleet.run_concurrency_benchmark
"""

import os
import sys
import tempfile
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fleet import claim_engine, generate_log, schema

NUM_REQUESTS = 500
AGENTS_PER_REQUEST = 6


def race_one_request(db_path: str, request_id: str, vehicle_id: str, results: dict, barrier: threading.Barrier):
    conn = schema.connect(db_path)
    agent_id = f"agent-{threading.get_ident()}"
    barrier.wait()
    won = claim_engine.try_claim(conn, request_id, vehicle_id, agent_id)
    conn.close()
    if won:
        with results["lock"]:
            results["winners"].setdefault(request_id, []).append(agent_id)


def main():
    db_path = os.path.join(tempfile.gettempdir(), "fleet_concurrency_bench.db")
    if os.path.exists(db_path):
        os.remove(db_path)
    for ext in ("-wal", "-shm"):
        if os.path.exists(db_path + ext):
            os.remove(db_path + ext)

    conn = schema.connect(db_path)
    request_ids_and_vehicles = []
    rng_conn = conn
    request_ids = generate_log.generate_assistance_requests(rng_conn, NUM_REQUESTS, seed=7)
    for rid in request_ids:
        row = conn.execute("SELECT vehicle_id FROM vehicle_log WHERE request_id = ?", (rid,)).fetchone()
        request_ids_and_vehicles.append((rid, row[0]))
    conn.close()

    results = {"winners": {}, "lock": threading.Lock()}
    start = time.time()
    for request_id, vehicle_id in request_ids_and_vehicles:
        barrier = threading.Barrier(AGENTS_PER_REQUEST)
        threads = [
            threading.Thread(target=race_one_request, args=(db_path, request_id, vehicle_id, results, barrier))
            for _ in range(AGENTS_PER_REQUEST)
        ]
        for th in threads:
            th.start()
        for th in threads:
            th.join()
    elapsed = time.time() - start

    exactly_one = sum(1 for winners in results["winners"].values() if len(winners) == 1)
    zero_winners = NUM_REQUESTS - len(results["winners"])
    more_than_one = sum(1 for winners in results["winners"].values() if len(winners) > 1)

    print(f"requests raced: {NUM_REQUESTS}")
    print(f"agents per request: {AGENTS_PER_REQUEST}")
    print(f"requests with exactly 1 winner: {exactly_one}")
    print(f"requests with 0 winners: {zero_winners}")
    print(f"requests with >1 winner (duplicate claims): {more_than_one}")
    print(f"elapsed: {elapsed:.2f}s")

    conn = schema.connect(db_path)
    total_claims = conn.execute("SELECT COUNT(*) FROM claims").fetchone()[0]
    distinct_requests_claimed = conn.execute("SELECT COUNT(DISTINCT request_id) FROM claims").fetchone()[0]
    print(f"total claim rows: {total_claims}")
    print(f"distinct requests claimed: {distinct_requests_claimed}")
    conn.close()


if __name__ == "__main__":
    main()
