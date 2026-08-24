import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastContainer } from "../components/ToastContainer";

describe("ToastContainer", () => {
  it("renders nothing when there are no toasts", () => {
    const { container } = render(<ToastContainer toasts={[]} onDismiss={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders every toast and dismisses the clicked one by id", async () => {
    const onDismiss = vi.fn();
    render(
      <ToastContainer
        toasts={[
          { id: "t1", kind: "success", message: "Resolution submitted." },
          { id: "t2", kind: "error", message: "Claim rejected." },
        ]}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByText("Resolution submitted.")).toBeInTheDocument();
    expect(screen.getByText("Claim rejected.")).toBeInTheDocument();

    const dismissButtons = screen.getAllByRole("button", { name: "Dismiss notification" });
    await userEvent.click(dismissButtons[1]);
    expect(onDismiss).toHaveBeenCalledWith("t2");
  });
});
