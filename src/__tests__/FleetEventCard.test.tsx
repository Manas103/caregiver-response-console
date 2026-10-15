import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FleetEventCard } from "../components/FleetEventCard";
import type { VehicleAssistanceEvent, VehicleReadiness } from "../fleet/protocol";

function event(overrides: Partial<VehicleAssistanceEvent> = {}): VehicleAssistanceEvent {
  return {
    id: "fleet-event-1",
    vehicleId: "veh-0142",
    reason: "blocked by double-parked vehicle",
    state: "requested",
    claimedBy: null,
    requestedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function readiness(overrides: Partial<VehicleReadiness> = {}): VehicleReadiness {
  return {
    vehicleId: "veh-0142",
    inService: true,
    cause: null,
    cleaningCleared: false,
    calibrationCleared: false,
    ...overrides,
  };
}

describe("FleetEventCard", () => {
  it("shows the vehicle id, reason, state, and a Claim button", () => {
    render(
      <FleetEventCard
        event={event()}
        readiness={readiness()}
        currentOperator="op-a"
        isPending={false}
        onClaim={() => {}}
        onResolve={() => {}}
      />,
    );
    expect(screen.getByText("veh-0142")).toBeInTheDocument();
    expect(screen.getByText("blocked by double-parked vehicle")).toBeInTheDocument();
    expect(screen.getByText("Requested")).toBeInTheDocument();
    expect(screen.getByText("In service")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Claim" })).toBeInTheDocument();
  });

  it("calls onClaim when Claim is clicked", async () => {
    const onClaim = vi.fn();
    render(
      <FleetEventCard
        event={event()}
        readiness={readiness()}
        currentOperator="op-a"
        isPending={false}
        onClaim={onClaim}
        onResolve={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Claim" }));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it("shows who holds the claim once claimed by another operator", () => {
    render(
      <FleetEventCard
        event={event({ state: "claimed", claimedBy: "op-b" })}
        readiness={readiness()}
        currentOperator="op-a"
        isPending={false}
        onClaim={() => {}}
        onResolve={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Claimed by op-b" })).toBeDisabled();
  });

  it("shows the out-of-service readiness badge with the named cause", () => {
    render(
      <FleetEventCard
        event={event()}
        readiness={readiness({ inService: false, cause: "sensor_fault" })}
        currentOperator="op-a"
        isPending={false}
        onClaim={() => {}}
        onResolve={() => {}}
      />,
    );
    expect(screen.getByText("Out of service: sensor fault")).toBeInTheDocument();
  });

  it("lets the current claimant resolve", async () => {
    const onResolve = vi.fn();
    render(
      <FleetEventCard
        event={event({ state: "claimed", claimedBy: "op-a" })}
        readiness={readiness()}
        currentOperator="op-a"
        isPending={false}
        onClaim={() => {}}
        onResolve={onResolve}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Resolve" }));
    expect(onResolve).toHaveBeenCalledTimes(1);
  });
});
