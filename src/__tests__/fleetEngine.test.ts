import { describe, expect, it } from "vitest";
import { applyClientAction, createEngineState, createInitialEvents, listEvents } from "../../mock-server/fleetEngine.mjs";

function action(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    clientActionId: "action-1",
    type: "claim",
    eventId: "fleet-event-1",
    operatorId: "operator-a",
    issuedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("fleetEngine exactly-once claiming", () => {
  it("claims a requested event", () => {
    const state = createEngineState();
    const result = applyClientAction(state, action());
    expect(result.outcome).toBe("applied");
    expect(result.event.state).toBe("claimed");
    expect(result.event.claimedBy).toBe("operator-a");
  });

  it("rejects a second claim from a different operator on the same event", () => {
    const state = createEngineState();
    applyClientAction(state, action({ clientActionId: "a1", operatorId: "operator-a" }));
    const result = applyClientAction(state, action({ clientActionId: "a2", operatorId: "operator-b" }));
    expect(result.outcome).toBe("rejected");
    expect(result.reason).toContain("already claimed by operator-a");
    expect(result.event.claimedBy).toBe("operator-a");
  });

  it("replaying the winning action's own clientActionId is idempotent, not a second win", () => {
    const state = createEngineState();
    const a = action({ clientActionId: "a1", operatorId: "operator-a" });
    applyClientAction(state, a);
    const replay = applyClientAction(state, a);
    expect(replay.outcome).toBe("already_processed");
    expect(replay.event.claimedBy).toBe("operator-a");
  });

  it("20 concurrent operators racing the same event: exactly one wins, 19 rejected", () => {
    const state = createEngineState();
    const outcomes = [];
    for (let i = 0; i < 20; i++) {
      outcomes.push(
        applyClientAction(state, action({ clientActionId: `race-${i}`, operatorId: `operator-${i}` })),
      );
    }
    const applied = outcomes.filter((o) => o.outcome === "applied");
    const rejected = outcomes.filter((o) => o.outcome === "rejected");
    expect(applied).toHaveLength(1);
    expect(rejected).toHaveLength(19);
    expect(listEvents(state).find((e) => e.id === "fleet-event-1").claimedBy).toBe(applied[0].event.claimedBy);
  });

  it("every seeded event starts requested and unclaimed", () => {
    const events = createInitialEvents();
    expect(events.length).toBeGreaterThan(0);
    for (const e of events) {
      expect(e.state).toBe("requested");
      expect(e.claimedBy).toBeNull();
    }
  });

  it("resolve requires holding the claim", () => {
    const state = createEngineState();
    applyClientAction(state, action({ clientActionId: "a1", operatorId: "operator-a" }));
    const wrongOperator = applyClientAction(
      state,
      action({ clientActionId: "a2", type: "resolve", operatorId: "operator-b" }),
    );
    expect(wrongOperator.outcome).toBe("rejected");
    const rightOperator = applyClientAction(
      state,
      action({ clientActionId: "a3", type: "resolve", operatorId: "operator-a" }),
    );
    expect(rightOperator.outcome).toBe("applied");
    expect(rightOperator.event.state).toBe("resolved");
  });
});
