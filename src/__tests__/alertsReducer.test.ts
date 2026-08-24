import { describe, expect, it } from "vitest";
import { alertsReducer, initialAlertsState } from "../state/alertsReducer";
import type { Alert, ClientAction } from "../protocol";

function alert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "alert-1",
    residentName: "Eleanor Voss",
    residentRoom: "12A",
    alertType: "fall",
    severity: "critical",
    state: "raised",
    claimedBy: null,
    raisedAt: "2026-08-24T10:00:00.000Z",
    updatedAt: "2026-08-24T10:00:00.000Z",
    escalated: false,
    ...overrides,
  };
}

function claimAction(overrides: Partial<ClientAction> = {}): ClientAction {
  return {
    clientActionId: "action-1",
    type: "claim",
    alertId: "alert-1",
    userId: "nurse-a",
    issuedAt: "2026-08-24T10:01:00.000Z",
    ...overrides,
  };
}

describe("alertsReducer", () => {
  it("loads a snapshot into keyed alerts state", () => {
    const state = alertsReducer(initialAlertsState, {
      kind: "SNAPSHOT_RECEIVED",
      alerts: [alert(), alert({ id: "alert-2" })],
    });
    expect(Object.keys(state.alerts)).toEqual(["alert-1", "alert-2"]);
  });

  it("applies an optimistic claim immediately and records it as pending", () => {
    const snapshot = alertsReducer(initialAlertsState, { kind: "SNAPSHOT_RECEIVED", alerts: [alert()] });
    const action = claimAction();
    const next = alertsReducer(snapshot, { kind: "OPTIMISTIC_ACTION", action });

    expect(next.alerts["alert-1"].state).toBe("claimed");
    expect(next.alerts["alert-1"].claimedBy).toBe("nurse-a");
    expect(next.pending["action-1"]).toEqual({
      clientActionId: "action-1",
      alertId: "alert-1",
      previousAlert: alert(),
    });
  });

  it("a server ack for the same clientActionId clears the pending entry and keeps the server truth", () => {
    let state = alertsReducer(initialAlertsState, { kind: "SNAPSHOT_RECEIVED", alerts: [alert()] });
    state = alertsReducer(state, { kind: "OPTIMISTIC_ACTION", action: claimAction() });

    const serverAlert = alert({ state: "claimed", claimedBy: "nurse-a", updatedAt: "2026-08-24T10:01:05.000Z" });
    state = alertsReducer(state, { kind: "SERVER_ALERT_UPDATE", alert: serverAlert, clientActionId: "action-1" });

    expect(state.alerts["alert-1"]).toEqual(serverAlert);
    expect(state.pending["action-1"]).toBeUndefined();
  });

  it("rolls back a rejected optimistic claim to the server's actual state, without touching other alerts or other pending actions", () => {
    let state = alertsReducer(initialAlertsState, {
      kind: "SNAPSHOT_RECEIVED",
      alerts: [alert(), alert({ id: "alert-2", state: "claimed", claimedBy: "nurse-b" })],
    });

    // nurse-a optimistically claims alert-1
    state = alertsReducer(state, { kind: "OPTIMISTIC_ACTION", action: claimAction() });
    // and, independently, also has a still-pending action on alert-2 (e.g. a confirm) that must survive untouched
    const otherAction = claimAction({ clientActionId: "action-2", type: "confirm", alertId: "alert-2", userId: "nurse-b" });
    state = alertsReducer(state, { kind: "OPTIMISTIC_ACTION", action: otherAction });

    expect(state.alerts["alert-1"].state).toBe("claimed");
    expect(state.alerts["alert-1"].claimedBy).toBe("nurse-a");

    // The server rejects nurse-a's claim: nurse-c actually won the race.
    const actualState = alert({ state: "claimed", claimedBy: "nurse-c", updatedAt: "2026-08-24T10:01:03.000Z" });
    state = alertsReducer(state, {
      kind: "CLAIM_REJECTED",
      alertId: "alert-1",
      clientActionId: "action-1",
      actualState,
      reason: "alert is claimed by nurse-c, not nurse-a",
    });

    // Invariant: the rejected alert now shows the true claimant, not nurse-a.
    expect(state.alerts["alert-1"]).toEqual(actualState);
    expect(state.pending["action-1"]).toBeUndefined();
    expect(state.conflicts["alert-1"].reason).toBe("alert is claimed by nurse-c, not nurse-a");

    // Invariant: alert-2 and its unrelated pending action are completely unaffected.
    expect(state.alerts["alert-2"].state).toBe("confirmed");
    expect(state.pending["action-2"]).toBeDefined();
  });

  it("dismissing a conflict removes only that alert's conflict entry", () => {
    let state = alertsReducer(initialAlertsState, { kind: "SNAPSHOT_RECEIVED", alerts: [alert(), alert({ id: "alert-2" })] });
    state = alertsReducer(state, {
      kind: "CLAIM_REJECTED",
      alertId: "alert-1",
      clientActionId: "action-1",
      actualState: alert({ state: "claimed", claimedBy: "someone-else" }),
      reason: "raced",
    });
    state = alertsReducer(state, {
      kind: "CLAIM_REJECTED",
      alertId: "alert-2",
      clientActionId: "action-2",
      actualState: alert({ id: "alert-2", state: "claimed", claimedBy: "someone-else" }),
      reason: "raced",
    });

    state = alertsReducer(state, { kind: "DISMISS_CONFLICT", alertId: "alert-1" });

    expect(state.conflicts["alert-1"]).toBeUndefined();
    expect(state.conflicts["alert-2"]).toBeDefined();
  });
});
