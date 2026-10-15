"""SQLite schema for the fleet event log.

`vehicle_log` is append-only: every writer in this package only ever
INSERTs into it. No module in this package issues UPDATE or DELETE against
it; `tests/test_append_only.py` scans the source for both keywords and
replays a full scenario to confirm the row count only grows.
"""

import sqlite3

SCHEMA = """
CREATE TABLE IF NOT EXISTS vehicle_log (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts REAL NOT NULL,
    vehicle_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    request_id TEXT,
    agent_id TEXT,
    cause TEXT
);

CREATE INDEX IF NOT EXISTS idx_vehicle_log_vehicle ON vehicle_log(vehicle_id, ts, log_id);

-- The exactly-once claim ledger. `request_id` is the primary key, so a
-- second INSERT for a request another agent already claimed fails with a
-- real sqlite3.IntegrityError rather than silently overwriting the winner.
CREATE TABLE IF NOT EXISTS claims (
    request_id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    claimed_at REAL NOT NULL
);
"""

CAUSES = [
    "low_battery",
    "sensor_fault",
    "cleaning_overdue",
    "flat_tire",
    "software_fault",
    "calibration_overdue",
    "collision_damage",
    "weather_hold",
    "passenger_incident",
    "remote_assistance_timeout",
    "depot_congestion",
]

assert len(CAUSES) == 11


def connect(path: str) -> sqlite3.Connection:
    """Opens a connection configured for real concurrent writers.

    WAL mode plus a busy_timeout let multiple threads/processes hold their
    own connection to the same file and race genuine INSERTs against the
    `claims` table's UNIQUE constraint instead of serializing in Python.
    """
    conn = sqlite3.connect(path, timeout=5.0, isolation_level=None)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA busy_timeout=5000;")
    conn.executescript(SCHEMA)
    return conn


def append(conn: sqlite3.Connection, ts: float, vehicle_id: str, event_type: str,
           request_id: str | None = None, agent_id: str | None = None,
           cause: str | None = None) -> int:
    cur = conn.execute(
        "INSERT INTO vehicle_log (ts, vehicle_id, event_type, request_id, agent_id, cause) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (ts, vehicle_id, event_type, request_id, agent_id, cause),
    )
    return cur.lastrowid
