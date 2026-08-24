import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AlertBoard } from "../components/AlertBoard";
import type { Alert } from "../protocol";

function alert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: "alert-1",
    residentName: "Eleanor Voss",
    residentRoom: "12A",
    alertType: "fall",
    severity: "critical",
    state: "raised",
    claimedBy: null,
    raisedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    escalated: false,
    ...overrides,
  };
}

const noop = () => {};

describe("AlertBoard", () => {
  it("shows an empty state when there are no alerts to show", () => {
    render(
      <AlertBoard
        alerts={[]}
        currentUser="nurse-a"
        pendingAlertIds={new Set()}
        conflicts={{}}
        onClaim={noop}
        onConfirm={noop}
        onRequestResolve={noop}
        onDismissConflict={noop}
      />,
    );
    expect(screen.getByText(/no alerts match/i)).toBeInTheDocument();
  });

  it("renders one card per alert", () => {
    render(
      <AlertBoard
        alerts={[alert(), alert({ id: "alert-2", residentName: "Harold Kim" })]}
        currentUser="nurse-a"
        pendingAlertIds={new Set()}
        conflicts={{}}
        onClaim={noop}
        onConfirm={noop}
        onRequestResolve={noop}
        onDismissConflict={noop}
      />,
    );
    expect(screen.getByTestId("alert-card-alert-1")).toBeInTheDocument();
    expect(screen.getByTestId("alert-card-alert-2")).toBeInTheDocument();
  });
});
