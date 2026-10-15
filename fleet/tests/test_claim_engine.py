import os
import tempfile
import threading

import pytest

from fleet import claim_engine, schema


@pytest.fixture
def db_path():
    path = os.path.join(tempfile.gettempdir(), "fleet_test_claims.db")
    for ext in ("", "-wal", "-shm"):
        if os.path.exists(path + ext):
            os.remove(path + ext)
    conn = schema.connect(path)
    conn.close()
    return path


def test_second_claim_on_same_request_loses(db_path):
    conn = schema.connect(db_path)
    assert claim_engine.try_claim(conn, "req-1", "veh-1", "agent-a") is True
    assert claim_engine.try_claim(conn, "req-1", "veh-1", "agent-b") is False
    assert claim_engine.claimant_of(conn, "req-1") == "agent-a"
    conn.close()


def test_claim_appends_exactly_one_log_event(db_path):
    conn = schema.connect(db_path)
    claim_engine.try_claim(conn, "req-1", "veh-1", "agent-a")
    claim_engine.try_claim(conn, "req-1", "veh-1", "agent-b")
    rows = conn.execute(
        "SELECT COUNT(*) FROM vehicle_log WHERE request_id = ? AND event_type = 'assistance_claimed'",
        ("req-1",),
    ).fetchone()[0]
    assert rows == 1
    conn.close()


def test_concurrent_agents_real_threads_exactly_one_winner_per_request(db_path):
    """40 requests, 5 real threads racing each (each thread holds its own
    SQLite connection to the same file), synchronized with a Barrier so
    all 5 attempt the INSERT as close to simultaneously as the scheduler
    allows. Asserts every request ends with exactly one claimant and the
    claims table never holds more than one row per request_id."""
    num_requests = 40
    agents_per_request = 5

    conn = schema.connect(db_path)
    for i in range(num_requests):
        schema.append(conn, float(i), f"veh-{i}", "assistance_requested", request_id=f"req-{i}")
    conn.close()

    results = {"winners": {}, "lock": threading.Lock()}

    def race(request_id, vehicle_id, barrier):
        c = schema.connect(db_path)
        agent_id = f"agent-{threading.get_ident()}"
        barrier.wait()
        won = claim_engine.try_claim(c, request_id, vehicle_id, agent_id)
        c.close()
        if won:
            with results["lock"]:
                results["winners"].setdefault(request_id, []).append(agent_id)

    for i in range(num_requests):
        request_id = f"req-{i}"
        vehicle_id = f"veh-{i}"
        barrier = threading.Barrier(agents_per_request)
        threads = [
            threading.Thread(target=race, args=(request_id, vehicle_id, barrier))
            for _ in range(agents_per_request)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

    assert len(results["winners"]) == num_requests
    assert all(len(winners) == 1 for winners in results["winners"].values())

    conn = schema.connect(db_path)
    total_claims = conn.execute("SELECT COUNT(*) FROM claims").fetchone()[0]
    distinct = conn.execute("SELECT COUNT(DISTINCT request_id) FROM claims").fetchone()[0]
    assert total_claims == num_requests
    assert distinct == num_requests
    conn.close()
