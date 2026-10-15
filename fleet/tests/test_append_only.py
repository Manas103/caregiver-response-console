import ast
import os
import tempfile

from fleet import generate_log, schema

FLEET_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def test_no_update_or_delete_statement_anywhere_in_fleet_source():
    """`vehicle_log` is append-only by construction, not by convention: no
    module in this package issues UPDATE or DELETE against it. This scans
    every .py file's string literals (where a SQL statement would live),
    not just greps for the words, so a comment mentioning "update" does
    not produce a false failure."""
    for name in os.listdir(FLEET_DIR):
        if not name.endswith(".py") or name.startswith("test_"):
            continue
        path = os.path.join(FLEET_DIR, name)
        tree = ast.parse(open(path, encoding="utf-8").read(), filename=name)
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, str):
                upper = node.value.strip().upper()
                assert not upper.startswith("UPDATE "), f"{name} contains an UPDATE statement"
                assert not upper.startswith("DELETE "), f"{name} contains a DELETE statement"


def test_row_count_only_grows_after_replay_and_attribution():
    path = os.path.join(tempfile.gettempdir(), "fleet_test_appendonly.db")
    for ext in ("", "-wal", "-shm"):
        if os.path.exists(path + ext):
            os.remove(path + ext)
    conn = schema.connect(path)
    generate_log.generate_readiness_episodes(conn, num_vehicles=5, episodes_per_vehicle=3, seed=1)
    before = conn.execute("SELECT COUNT(*) FROM vehicle_log").fetchone()[0]

    from fleet import attribution, readiness, timeline
    for vehicle_id in timeline.vehicle_ids(conn):
        events = timeline.rebuild_timeline(conn, vehicle_id)
        readiness.replay_readiness(events)
    attribution.oos_minutes_by_cause(conn)

    after = conn.execute("SELECT COUNT(*) FROM vehicle_log").fetchone()[0]
    assert after == before
    conn.close()
