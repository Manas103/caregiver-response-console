import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FleetEventBoard } from "../components/FleetEventBoard";
import type { VehicleAssistanceEvent } from "../fleet/protocol";

function event(id: string, vehicleId: string): VehicleAssistanceEvent {
  return {
    id,
    vehicleId,
    reason: "test reason",
    state: "requested",
    claimedBy: null,
    requestedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("FleetEventBoard", () => {
  it("shows an EmptyState when there are no events", () => {
    render(
      <FleetEventBoard
        events={[]}
        readinessByVehicle={{}}
        currentOperator="op-a"
        pendingEventIds={new Set()}
        onClaim={() => {}}
        onResolve={() => {}}
      />,
    );
    expect(screen.getByText("No vehicle assistance events are open.")).toBeInTheDocument();
  });

  it("renders one card per event", () => {
    render(
      <FleetEventBoard
        events={[event("e1", "veh-1"), event("e2", "veh-2")]}
        readinessByVehicle={{}}
        currentOperator="op-a"
        pendingEventIds={new Set()}
        onClaim={() => {}}
        onResolve={() => {}}
      />,
    );
    expect(screen.getByTestId("fleet-event-card-e1")).toBeInTheDocument();
    expect(screen.getByTestId("fleet-event-card-e2")).toBeInTheDocument();
  });

  it("passes readiness for a card's vehicle only, leaving others unaffected", () => {
    render(
      <FleetEventBoard
        events={[event("e1", "veh-1"), event("e2", "veh-2")]}
        readinessByVehicle={{
          "veh-1": { vehicleId: "veh-1", inService: false, cause: "low_battery", cleaningCleared: false, calibrationCleared: false },
          "veh-2": { vehicleId: "veh-2", inService: true, cause: null, cleaningCleared: false, calibrationCleared: false },
        }}
        currentOperator="op-a"
        pendingEventIds={new Set()}
        onClaim={() => {}}
        onResolve={() => {}}
      />,
    );
    expect(screen.getByText("Out of service: low battery")).toBeInTheDocument();
    expect(screen.getByText("In service")).toBeInTheDocument();
  });
});
