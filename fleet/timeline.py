"""Rebuilds a vehicle's event timeline from the append-only log alone.

There is no separate "current state" table anywhere in this package.
`rebuild_timeline` is a plain SELECT over `vehicle_log`; `readiness.py`
derives everything it reports by replaying exactly this list, in order,
every time it is asked.
"""

import sqlite3
from dataclasses import dataclass


@dataclass(frozen=True)
class LogEvent:
    log_id: int
    ts: float
    vehicle_id: str
    event_type: str
    request_id: str | None
    agent_id: str | None
    cause: str | None


def rebuild_timeline(conn: sqlite3.Connection, vehicle_id: str) -> list[LogEvent]:
    rows = conn.execute(
        "SELECT log_id, ts, vehicle_id, event_type, request_id, agent_id, cause "
        "FROM vehicle_log WHERE vehicle_id = ? ORDER BY ts, log_id",
        (vehicle_id,),
    ).fetchall()
    return [LogEvent(*row) for row in rows]


def vehicle_ids(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute("SELECT DISTINCT vehicle_id FROM vehicle_log ORDER BY vehicle_id").fetchall()
    return [r[0] for r in rows]
