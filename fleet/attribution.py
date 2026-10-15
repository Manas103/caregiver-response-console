"""SQL attribution of out-of-service minutes to a named cause.

Computed by one real SQLite SQL statement (a window-function self-pairing
of each `out_of_service` row with the `back_in_service` row that follows
it for the same vehicle), not by a Python loop over the rows.
"""

import sqlite3

ATTRIBUTION_SQL = """
WITH paired AS (
    SELECT
        vehicle_id,
        ts AS oos_ts,
        cause,
        event_type,
        LEAD(ts) OVER (PARTITION BY vehicle_id ORDER BY ts, log_id) AS next_ts,
        LEAD(event_type) OVER (PARTITION BY vehicle_id ORDER BY ts, log_id) AS next_type
    FROM vehicle_log
    WHERE event_type IN ('out_of_service', 'back_in_service')
)
SELECT cause, SUM(next_ts - oos_ts) / 60.0 AS oos_minutes, COUNT(*) AS episodes
FROM paired
WHERE event_type = 'out_of_service' AND next_type = 'back_in_service'
GROUP BY cause
ORDER BY oos_minutes DESC;
"""


def oos_minutes_by_cause(conn: sqlite3.Connection) -> list[tuple[str, float, int]]:
    return conn.execute(ATTRIBUTION_SQL).fetchall()


def top_n_share(rows: list[tuple[str, float, int]], n: int) -> float:
    """Fraction of total OOS minutes held by the top `n` causes by minutes."""
    total = sum(r[1] for r in rows)
    if total == 0:
        return 0.0
    top = sum(r[1] for r in rows[:n])
    return top / total
