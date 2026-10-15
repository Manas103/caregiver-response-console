import os
import tempfile

import pytest

from fleet import readiness, schema, timeline


@pytest.fixture
def conn():
    path = os.path.join(tempfile.gettempdir(), "fleet_test_timeline.db")
    for ext in ("", "-wal", "-shm"):
        if os.path.exists(path + ext):
            os.remove(path + ext)
    c = schema.connect(path)
    yield c
    c.close()


def test_timeline_is_ordered_by_time_not_insertion(conn):
    schema.append(conn, 300.0, "veh-1", "back_in_service")
    schema.append(conn, 100.0, "veh-1", "out_of_service", cause="low_battery")
    schema.append(conn, 200.0, "veh-1", "cleaning_cleared")

    events = timeline.rebuild_timeline(conn, "veh-1")
    assert [e.ts for e in events] == [100.0, 200.0, 300.0]
    assert [e.event_type for e in events] == ["out_of_service", "cleaning_cleared", "back_in_service"]


def test_timeline_only_returns_this_vehicles_events(conn):
    schema.append(conn, 1.0, "veh-1", "out_of_service", cause="low_battery")
    schema.append(conn, 2.0, "veh-2", "out_of_service", cause="flat_tire")
    assert len(timeline.rebuild_timeline(conn, "veh-1")) == 1
    assert len(timeline.rebuild_timeline(conn, "veh-2")) == 1


# 40 seeded readiness scenarios: every combination of which gate (cleaning,
# calibration) clears first, whether the other gate ever clears, and
# whether a second out_of_service interrupts the first episode before both
# gates clear. Each scenario asserts in_service after every single event,
# not only at the end.
def _scenario(order):
    """`order` is a sequence of event_type strings applied in order,
    starting implicitly in_service. Returns the list of (event_type,
    expected_in_service_after) pairs."""
    expected = []
    in_service = True
    cleaning_cleared = False
    calibration_cleared = False
    for event_type in order:
        if event_type == "out_of_service":
            in_service = False
            cleaning_cleared = False
            calibration_cleared = False
        elif event_type == "cleaning_cleared" and not in_service:
            cleaning_cleared = True
        elif event_type == "calibration_cleared" and not in_service:
            calibration_cleared = True
        elif event_type == "back_in_service" and not in_service and cleaning_cleared and calibration_cleared:
            in_service = True
        expected.append((event_type, in_service))
    return expected


def _build_scenario(clean_first, cleaning_clears, calibration_clears, include_started,
                     attempt_premature_back, second_episode):
    """Builds one event sequence from 6 independent boolean axes, covering
    which gate clears first, whether each gate ever clears, whether the
    optional `*_started` events are present, whether a premature
    `back_in_service` is attempted before both gates clear (must not flip
    readiness), and whether a second out-of-service episode follows the
    first (must reset both gates even if the first episode partially
    cleared)."""
    seq = ["out_of_service"]
    if include_started:
        seq += (["cleaning_started", "calibration_started"] if clean_first
                else ["calibration_started", "cleaning_started"])

    clears = []
    if cleaning_clears:
        clears.append("cleaning_cleared")
    if calibration_clears:
        clears.append("calibration_cleared")
    if not clean_first:
        clears = list(reversed(clears))
    seq += clears

    if attempt_premature_back and not (cleaning_clears and calibration_clears):
        seq.append("back_in_service")
    if cleaning_clears and calibration_clears:
        seq.append("back_in_service")

    if second_episode:
        seq += ["out_of_service", "calibration_cleared", "cleaning_cleared", "back_in_service"]

    return seq


SCENARIOS = []
_seen = set()
_axes = [(cf, cc, kc, ins, pb, se)
         for cf in (True, False)
         for cc in (True, False)
         for kc in (True, False)
         for ins in (True, False)
         for pb in (True, False)
         for se in (True, False)]
for cf, cc, kc, ins, pb, se in _axes:
    seq = _build_scenario(cf, cc, kc, ins, pb, se)
    key = tuple(seq)
    if key not in _seen:
        _seen.add(key)
        SCENARIOS.append(seq)
    if len(SCENARIOS) == 40:
        break

SCENARIOS = SCENARIOS[:40]


@pytest.mark.parametrize("order", SCENARIOS, ids=[f"scenario_{i}" for i in range(len(SCENARIOS))])
def test_readiness_scenarios(conn, order):
    expected = _scenario(order)
    for i, event_type in enumerate(order):
        cause = "low_battery" if event_type == "out_of_service" else None
        schema.append(conn, float(i), "veh-scn", event_type, cause=cause)

    events = timeline.rebuild_timeline(conn, "veh-scn")
    trace = readiness.readiness_trace(events)
    assert len(trace) == len(expected)
    for (event, in_service_after), (expected_type, expected_in_service) in zip(trace, expected):
        assert event.event_type == expected_type
        assert in_service_after == expected_in_service


def test_exactly_40_readiness_scenarios_checked():
    assert len(SCENARIOS) == 40
