import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "../components/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders the title and body, and calls onConfirm/onCancel", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="Resolve this alert?" body="This cannot be undone." onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByText("Resolve this alert?")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("clicking the backdrop cancels, but clicking inside the dialog does not", async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog title="t" body="b" onConfirm={() => {}} onCancel={onCancel} />);

    await userEvent.click(screen.getByText("b"));
    expect(onCancel).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("presentation"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
