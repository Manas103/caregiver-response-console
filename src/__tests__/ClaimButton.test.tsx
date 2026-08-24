import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClaimButton } from "../components/ClaimButton";
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

describe("ClaimButton", () => {
  it("shows Claim on a raised alert", () => {
    render(<ClaimButton alert={alert()} currentUser="nurse-a" pending={false} onClaim={noop} onConfirm={noop} onRequestResolve={noop} />);
    expect(screen.getByRole("button", { name: "Claim" })).toBeEnabled();
  });

  it("shows Confirm when the current user holds the claim", () => {
    render(
      <ClaimButton
        alert={alert({ state: "claimed", claimedBy: "nurse-a" })}
        currentUser="nurse-a"
        pending={false}
        onClaim={noop}
        onConfirm={noop}
        onRequestResolve={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();
  });

  it("shows a disabled 'Claimed by <other>' when someone else holds it", () => {
    render(
      <ClaimButton
        alert={alert({ state: "claimed", claimedBy: "nurse-b" })}
        currentUser="nurse-a"
        pending={false}
        onClaim={noop}
        onConfirm={noop}
        onRequestResolve={noop}
      />,
    );
    const button = screen.getByRole("button", { name: "Claimed by nurse-b" });
    expect(button).toBeDisabled();
  });

  it("shows Resolve once confirmed by the current user", () => {
    render(
      <ClaimButton
        alert={alert({ state: "confirmed", claimedBy: "nurse-a" })}
        currentUser="nurse-a"
        pending={false}
        onClaim={noop}
        onConfirm={noop}
        onRequestResolve={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Resolve" })).toBeEnabled();
  });

  it("shows a disabled Resolved state once resolved", () => {
    render(
      <ClaimButton
        alert={alert({ state: "resolved", claimedBy: "nurse-a" })}
        currentUser="nurse-a"
        pending={false}
        onClaim={noop}
        onConfirm={noop}
        onRequestResolve={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "Resolved" })).toBeDisabled();
  });
});
