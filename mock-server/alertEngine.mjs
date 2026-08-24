// Plain-JS, dependency-free alert state machine shared by the real mock
// WebSocket server (server.mjs) and by the Vitest integration test
// (src/__tests__/mockServer.integration.test.ts), so the test exercises the
// exact transition and de-duplication logic the server actually runs, not a
// re-description of it.

const NEXT_STATE = { claim: "claimed", confirm: "confirmed", resolve: "resolved" };
const REQUIRED_PRIOR_STATE = { claim: "raised", confirm: "claimed", resolve: "confirmed" };

const RESIDENTS = [
  { residentName: "Eleanor Voss", residentRoom: "12A", alertType: "fall", severity: "critical" },
  { residentName: "Harold Kim", residentRoom: "04B", alertType: "medication", severity: "high" },
  { residentName: "Priya Nair", residentRoom: "07C", alertType: "vitals", severity: "medium" },
  { residentName: "Walter Osei", residentRoom: "15A", alertType: "call_button", severity: "low" },
  { residentName: "June Alvarado", residentRoom: "09D", alertType: "wander", severity: "high" },
  { residentName: "Desmond Farrow", residentRoom: "02A", alertType: "fall", severity: "critical" },
];

/** Builds the seeded starting board. Deterministic ids so tests and manual
 * runs can refer to "alert-1" etc. without reading the array first. */
export function createInitialAlerts(now = new Date()) {
  return RESIDENTS.map((r, i) => ({
    id: `alert-${i + 1}`,
    residentName: r.residentName,
    residentRoom: r.residentRoom,
    alertType: r.alertType,
    severity: r.severity,
    state: "raised",
    claimedBy: null,
    raisedAt: new Date(now.getTime() - i * 60_000).toISOString(),
    updatedAt: new Date(now.getTime() - i * 60_000).toISOString(),
    escalated: false,
  }));
}

/** Creates a fresh engine state: a Map of alerts by id, and a Set of every
 * clientActionId already applied (the de-duplication ledger that makes
 * offline-queue replay safe). */
export function createEngineState(seedAlerts = createInitialAlerts()) {
  const alerts = new Map(seedAlerts.map((a) => [a.id, a]));
  return { alerts, processedActionIds: new Set() };
}

/**
 * Applies one client action to the engine state.
 *
 * Returns one of three shapes:
 *  - { outcome: "already_processed", alert }        -- clientActionId was seen before; no
 *                                                        mutation happened, the current alert
 *                                                        is returned so a replayed action still
 *                                                        gets an idempotent, correct response.
 *  - { outcome: "rejected", alert, reason }          -- the transition is not legal from the
 *                                                        alert's current state (someone else
 *                                                        already claimed it, wrong state, etc).
 *  - { outcome: "applied", alert }                   -- the transition happened; `alert` is the
 *                                                        new authoritative state.
 */
export function applyClientAction(state, action) {
  const { alerts, processedActionIds } = state;
  const alert = alerts.get(action.alertId);
  if (!alert) {
    return { outcome: "rejected", alert: null, reason: "unknown alert id" };
  }

  if (processedActionIds.has(action.clientActionId)) {
    return { outcome: "already_processed", alert };
  }

  const requiredPriorState = REQUIRED_PRIOR_STATE[action.type];
  const legalActor =
    action.type === "claim" ? true : alert.claimedBy === action.userId;

  if (alert.state !== requiredPriorState || !legalActor) {
    // The action id is still recorded: a replay of a *rejected* action must
    // keep returning the same rejection, not be silently dropped as unknown.
    processedActionIds.add(action.clientActionId);
    return {
      outcome: "rejected",
      alert,
      reason:
        action.type === "claim" && alert.claimedBy
          ? `alert already claimed by ${alert.claimedBy}`
          : alert.state !== requiredPriorState
            ? `alert is ${alert.state}, ${action.type} requires ${requiredPriorState}`
            : `alert is claimed by ${alert.claimedBy}, not ${action.userId}`,
    };
  }

  const nextAlert = {
    ...alert,
    state: NEXT_STATE[action.type],
    claimedBy: action.type === "claim" ? action.userId : alert.claimedBy,
    updatedAt: new Date().toISOString(),
    escalated: false,
  };
  alerts.set(alert.id, nextAlert);
  processedActionIds.add(action.clientActionId);
  return { outcome: "applied", alert: nextAlert };
}

export function listAlerts(state) {
  return Array.from(state.alerts.values());
}
