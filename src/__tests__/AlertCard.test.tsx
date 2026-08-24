import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AlertCard } from "../components/AlertCard";
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

describe("AlertCard", () => {
  it("shows resident info, state, and a Claim button on a raised alert", () => {
    render(
      <AlertCard
        alert={alert()}
        currentUser="nurse-a"
        isPending={false}
        conflictReason={null}
        onClaim={() => {}}
        onConfirm={() => {}}
        onRequestResolve={() => {}}
        onDismissConflict={() => {}}
      />,
    );
    expect(screen.getByText("Eleanor Voss")).toBeInTheDocument();
    expect(screen.getByText("Room 12A")).toBeInTheDocument();
    expect(screen.getByText("Raised")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Claim" })).toBeInTheDocument();
  });

  it("calls onClaim when the Claim button is clicked", async () => {
    const onClaim = vi.fn();
    render(
      <AlertCard
        alert={alert()}
        currentUser="nurse-a"
        isPending={false}
        conflictReason={null}
        onClaim={onClaim}
        onConfirm={() => {}}
        onRequestResolve={() => {}}
        onDismissConflict={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Claim" }));
    expect(onClaim).toHaveBeenCalledTimes(1);
  });

  it("shows an escalation tag when the alert is escalated", () => {
    render(
      <AlertCard
        alert={alert({ escalated: true })}
        currentUser="nurse-a"
        isPending={false}
        conflictReason={null}
        onClaim={() => {}}
        onConfirm={() => {}}
        onRequestResolve={() => {}}
        onDismissConflict={() => {}}
      />,
    );
    expect(screen.getByText("ESCALATED")).toBeInTheDocument();
  });

  it("renders a conflict banner with the reason and dismisses it on click", async () => {
    const onDismissConflict = vi.fn();
    render(
      <AlertCard
        alert={alert({ state: "claimed", claimedBy: "nurse-c" })}
        currentUser="nurse-a"
        isPending={false}
        conflictReason="alert is claimed by nurse-c, not nurse-a"
        onClaim={() => {}}
        onConfirm={() => {}}
        onRequestResolve={() => {}}
        onDismissConflict={onDismissConflict}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("alert is claimed by nurse-c, not nurse-a");
    await userEvent.click(screen.getByRole("button", { name: "Dismiss conflict notice" }));
    expect(onDismissConflict).toHaveBeenCalledTimes(1);
  });

  it("disables the primary action while a request is pending, and labels it accordingly", () => {
    render(
      <AlertCard
        alert={alert()}
        currentUser="nurse-a"
        isPending={true}
        conflictReason={null}
        onClaim={() => {}}
        onConfirm={() => {}}
        onRequestResolve={() => {}}
        onDismissConflict={() => {}}
      />,
    );
    const button = screen.getByRole("button", { name: "Claiming..." });
    expect(button).toBeDisabled();
  });
});
