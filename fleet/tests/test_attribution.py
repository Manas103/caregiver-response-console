import os
import tempfile

import pytest

from fleet import attribution, generate_log, schema


@pytest.fixture
def conn():
    path = os.path.join(tempfile.gettempdir(), "fleet_test_attribution.db")
    for ext in ("", "-wal", "-shm"):
        if os.path.exists(path + ext):
            os.remove(path + ext)
    c = schema.connect(path)
    yield c
    c.close()


def test_attribution_sums_match_known_hand_built_episodes(conn):
    # veh-1: a 100-minute low_battery episode
    schema.append(conn, 0.0, "veh-1", "out_of_service", cause="low_battery")
    schema.append(conn, 100 * 60.0, "veh-1", "back_in_service")
    # veh-2: a 50-minute flat_tire episode, plus an unresolved episode (no
    # back_in_service yet) that must not be counted
    schema.append(conn, 0.0, "veh-2", "out_of_service", cause="flat_tire")
    schema.append(conn, 50 * 60.0, "veh-2", "back_in_service")
    schema.append(conn, 60 * 60.0, "veh-2", "out_of_service", cause="flat_tire")

    rows = attribution.oos_minutes_by_cause(conn)
    by_cause = {cause: minutes for cause, minutes, _ in rows}
    assert by_cause["low_battery"] == pytest.approx(100.0)
    assert by_cause["flat_tire"] == pytest.approx(50.0)
    assert sum(episodes for _, _, episodes in rows) == 2


def test_top_n_share_of_dominant_causes():
    rows = [("a", 60.0, 1), ("b", 30.0, 1), ("c", 9.0, 1), ("d", 1.0, 1)]
    assert attribution.top_n_share(rows, 3) == pytest.approx(0.99)


def test_measured_attribution_on_the_full_generated_log(conn):
    """The real measurement this project's claim is checked against: 300
    vehicles, 8 episodes each, 11 named causes, one real SQL
    window-function query. Reports (does not force) the top-3 share."""
    generate_log.generate_readiness_episodes(conn, num_vehicles=300, episodes_per_vehicle=8, seed=42)
    rows = attribution.oos_minutes_by_cause(conn)
    assert len(rows) == 11
    total_episodes = sum(episodes for _, _, episodes in rows)
    assert total_episodes == 300 * 8
    share = attribution.top_n_share(rows, 3)
    assert 0.0 < share < 1.0
