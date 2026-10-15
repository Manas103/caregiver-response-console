"""Exactly-once claiming of a vehicle-initiated assistance request.

The guarantee is not "the Python process serializes claims"; it is "the
database rejects every claim but the first". `try_claim` is safe to call
from multiple threads or processes, each holding its own connection to the
same SQLite file, racing for the same `request_id`.
"""

import sqlite3
import time

from fleet import schema


def try_claim(conn: sqlite3.Connection, request_id: str, vehicle_id: str, agent_id: str) -> bool:
    """Attempts to claim `request_id` for `agent_id`.

    Returns True if this call won the claim, False if another agent (or an
    earlier call from this same agent) already holds it. On a win, also
    appends an `assistance_claimed` event to the append-only log, so the
    log and the claim ledger never disagree about who holds a request.
    """
    now = time.time()
    try:
        conn.execute(
            "INSERT INTO claims (request_id, vehicle_id, agent_id, claimed_at) VALUES (?, ?, ?, ?)",
            (request_id, vehicle_id, agent_id, now),
        )
    except sqlite3.IntegrityError:
        return False
    schema.append(conn, now, vehicle_id, "assistance_claimed", request_id=request_id, agent_id=agent_id)
    return True


def claimant_of(conn: sqlite3.Connection, request_id: str) -> str | None:
    row = conn.execute("SELECT agent_id FROM claims WHERE request_id = ?", (request_id,)).fetchone()
    return row[0] if row else None
