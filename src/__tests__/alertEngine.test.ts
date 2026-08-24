// @vitest-environment node
//
// Direct, deterministic tests of the exact transition/de-duplication logic
// the real mock WebSocket server runs (mock-server/alertEngine.mjs is
// imported unmodified, not re-implemented here).
import { describe, expect, it } from "vitest";
import { applyClientAction, createEngineState, createInitialAlerts, listAlerts } from "../../mock-server/alertEngine.mjs";

function action(overrides = {}) {
  return {
    clientActionId: "action-1",
    type: "claim",
    alertId: "alert-1",
    userId: "nurse-a",
    ...overrides,
  };
}

describe("alertEngine.applyClientAction", () => {
  it("applies a legal claim on a raised alert", () => {
    const state = createEngineState();
    const result = applyClientAction(state, action());
    expect(result.outcome).toBe("applied");
    expect(result.alert.state).toBe("claimed");
    expect(result.alert.claimedBy).toBe("nurse-a");
  });

  it("rejects a second claim from a different user on an already-claimed alert (the race case)", () => {
    const state = createEngineState();
    applyClientAction(state, action({ clientActionId: "a1", userId: "nurse-a" }));
    const second = applyClientAction(state, action({ clientActionId: "a2", userId: "nurse-b" }));

    expect(second.outcome).toBe("rejected");
    expect(second.alert.claimedBy).toBe("nurse-a");
    expect(second.reason).toMatch(/claimed by nurse-a/);
  });

  it("replaying the exact same clientActionId never double-applies, even from a different user", () => {
    const state = createEngineState();
    const first = applyClientAction(state, action({ clientActionId: "a1", userId: "nurse-a" }));
    expect(first.outcome).toBe("applied");

    // The client thinks this send never landed (socket dropped before the
    // ack arrived) and replays it, but attributes it to nurse-b by mistake.
    // Because the clientActionId already appears in processedActionIds,
    // the transition must not run a second time and must not switch the
    // claimant.
    const replay = applyClientAction(state, action({ clientActionId: "a1", userId: "nurse-b" }));

    expect(replay.outcome).toBe("already_processed");
    expect(replay.alert.claimedBy).toBe("nurse-a");
    expect(listAlerts(state).find((a) => a.id === "alert-1").claimedBy).toBe("nurse-a");
  });

  it("N distinct queued actions across different alerts each apply exactly once when replayed in order", () => {
    const state = createEngineState(createInitialAlerts());
    const actions = [
      action({ clientActionId: "q1", alertId: "alert-1", userId: "nurse-a" }),
      action({ clientActionId: "q2", alertId: "alert-2", userId: "nurse-a" }),
      action({ clientActionId: "q3", alertId: "alert-3", userId: "nurse-a" }),
    ];

    const firstPass = actions.map((a) => applyClientAction(state, a));
    expect(firstPass.every((r) => r.outcome === "applied")).toBe(true);

    // Reconnect replay: the exact same N actions are sent again.
    const secondPass = actions.map((a) => applyClientAction(state, a));
    expect(secondPass.every((r) => r.outcome === "already_processed")).toBe(true);

    // Invariant: each targeted alert changed state exactly once, not twice.
    for (const a of actions) {
      const alert = listAlerts(state).find((x) => x.id === a.alertId);
      expect(alert.state).toBe("claimed");
      expect(alert.claimedBy).toBe("nurse-a");
    }
  });

  it("rejects an action whose required prior state is not met", () => {
    const state = createEngineState();
    const result = applyClientAction(state, action({ type: "resolve" }));
    expect(result.outcome).toBe("rejected");
    expect(result.reason).toMatch(/requires confirmed/);
  });

  it("a replayed rejection stays a rejection, not a silent no-op", () => {
    const state = createEngineState();
    applyClientAction(state, action({ clientActionId: "a1", userId: "nurse-a" }));
    const rejected = applyClientAction(state, action({ clientActionId: "a2", type: "resolve", userId: "nurse-a" }));
    expect(rejected.outcome).toBe("rejected");

    const replay = applyClientAction(state, action({ clientActionId: "a2", type: "resolve", userId: "nurse-a" }));
    expect(replay.outcome).toBe("already_processed");
  });
});
