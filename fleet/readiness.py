"""Readiness gating, computed purely by replaying a vehicle's timeline.

A vehicle that goes out of service stays out of service until BOTH a
cleaning_cleared and a calibration_cleared event are observed after the
out_of_service event that most recently took it down. Clearing only one of
the two does not return it to service; a second out_of_service event before
both clear resets both flags, since whatever the vehicle needed before is
no longer provably true.
"""

from dataclasses import dataclass

from fleet.timeline import LogEvent


@dataclass(frozen=True)
class ReadinessState:
    in_service: bool
    cause: str | None
    cleaning_cleared: bool
    calibration_cleared: bool
    oos_since: float | None


def replay_readiness(events: list[LogEvent]) -> ReadinessState:
    """Returns the readiness state after replaying every event in order."""
    in_service = True
    cause = None
    cleaning_cleared = False
    calibration_cleared = False
    oos_since = None

    for e in events:
        if e.event_type == "out_of_service":
            in_service = False
            cause = e.cause
            cleaning_cleared = False
            calibration_cleared = False
            oos_since = e.ts
        elif e.event_type == "cleaning_cleared" and not in_service:
            cleaning_cleared = True
        elif e.event_type == "calibration_cleared" and not in_service:
            calibration_cleared = True
        elif e.event_type == "back_in_service" and not in_service:
            # A back_in_service event is only ever emitted by the generator
            # (and only ever valid) once both gates have cleared; this
            # replay does not trust the event's mere presence, it recomputes
            # the gate from the cleaning/calibration events already seen.
            if cleaning_cleared and calibration_cleared:
                in_service = True
                cause = None
                oos_since = None

    return ReadinessState(in_service, cause, cleaning_cleared, calibration_cleared, oos_since)


def readiness_trace(events: list[LogEvent]) -> list[tuple[LogEvent, bool]]:
    """Returns (event, in_service_after_this_event) for every event, for
    tests that need to assert readiness held at every intermediate step,
    not only at the end."""
    trace = []
    for i in range(len(events)):
        state = replay_readiness(events[: i + 1])
        trace.append((events[i], state.in_service))
    return trace
