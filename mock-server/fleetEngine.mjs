// Plain-JS, dependency-free vehicle-assistance-event state machine, the
// same shape as alertEngine.mjs but for a different domain: a
// vehicle-initiated request claimed by a remote operator instead of a
// resident-initiated alert claimed by a caregiver. Shared by the mock
// WebSocket server and by fleetEngine.test.ts.

const NEXT_STATE = { claim: "claimed", resolve: "resolved" };
const REQUIRED_PRIOR_STATE = { claim: "requested", resolve: "claimed" };

const VEHICLES = [
  { vehicleId: "veh-0142", reason: "blocked by double-parked vehicle" },
  { vehicleId: "veh-0219", reason: "rider requests pickup confirmation" },
  { vehicleId: "veh-0087", reason: "unprotected left turn, request guidance" },
  { vehicleId: "veh-0304", reason: "construction detour not on map" },
  { vehicleId: "veh-0055", reason: "rider left a bag in the vehicle" },
];

export function createInitialEvents(now = new Date()) {
  return VEHICLES.map((v, i) => ({
    id: `fleet-event-${i + 1}`,
    vehicleId: v.vehicleId,
    reason: v.reason,
    state: "requested",
    claimedBy: null,
    requestedAt: new Date(now.getTime() - i * 30_000).toISOString(),
    updatedAt: new Date(now.getTime() - i * 30_000).toISOString(),
  }));
}

export function createEngineState(seedEvents = createInitialEvents()) {
  const events = new Map(seedEvents.map((e) => [e.id, e]));
  return { events, processedActionIds: new Set() };
}

/**
 * Applies one client action to the engine state. Same three-shape return
 * contract as alertEngine's applyClientAction: "already_processed",
 * "rejected", or "applied". A `claim` action is legal only while the event
 * is still `requested`; the second of two concurrent claim attempts on the
 * same event is always rejected, which is what makes claiming
 * exactly-once rather than merely idempotent.
 */
export function applyClientAction(state, action) {
  const { events, processedActionIds } = state;
  const event = events.get(action.eventId);
  if (!event) {
    return { outcome: "rejected", event: null, reason: "unknown event id" };
  }

  if (processedActionIds.has(action.clientActionId)) {
    return { outcome: "already_processed", event };
  }

  const requiredPriorState = REQUIRED_PRIOR_STATE[action.type];
  const legalActor = action.type === "claim" ? true : event.claimedBy === action.operatorId;

  if (event.state !== requiredPriorState || !legalActor) {
    processedActionIds.add(action.clientActionId);
    return {
      outcome: "rejected",
      event,
      reason:
        action.type === "claim" && event.claimedBy
          ? `event already claimed by ${event.claimedBy}`
          : event.state !== requiredPriorState
            ? `event is ${event.state}, ${action.type} requires ${requiredPriorState}`
            : `event is claimed by ${event.claimedBy}, not ${action.operatorId}`,
    };
  }

  const nextEvent = {
    ...event,
    state: NEXT_STATE[action.type],
    claimedBy: action.type === "claim" ? action.operatorId : event.claimedBy,
    updatedAt: new Date().toISOString(),
  };
  events.set(event.id, nextEvent);
  processedActionIds.add(action.clientActionId);
  return { outcome: "applied", event: nextEvent };
}

export function listEvents(state) {
  return Array.from(state.events.values());
}
