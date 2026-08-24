import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "../components/FilterBar";

describe("FilterBar", () => {
  it("marks the active filter pressed and the rest not", () => {
    render(<FilterBar active="claimed" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Claimed" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onChange with the clicked filter's key", async () => {
    const onChange = vi.fn();
    render(<FilterBar active="all" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Resolved" }));
    expect(onChange).toHaveBeenCalledWith("resolved");
  });
});
