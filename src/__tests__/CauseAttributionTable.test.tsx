import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CauseAttributionTable } from "../components/CauseAttributionTable";

describe("CauseAttributionTable", () => {
  it("renders one row per cause with its share of the total", () => {
    render(
      <CauseAttributionTable
        rows={[
          { cause: "sensor_fault", minutes: 60, episodes: 10 },
          { cause: "low_battery", minutes: 30, episodes: 5 },
          { cause: "flat_tire", minutes: 10, episodes: 2 },
        ]}
      />,
    );
    expect(screen.getByText("sensor fault")).toBeInTheDocument();
    expect(screen.getByText("60.0%")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
    expect(screen.getByText("10.0%")).toBeInTheDocument();
  });

  it("marks the top N rows as highlighted", () => {
    render(
      <CauseAttributionTable
        rows={[
          { cause: "sensor_fault", minutes: 60, episodes: 10 },
          { cause: "low_battery", minutes: 30, episodes: 5 },
          { cause: "flat_tire", minutes: 10, episodes: 2 },
        ]}
        highlightTopN={2}
      />,
    );
    const rows = screen.getAllByRole("row").slice(1); // skip header row
    expect(rows[0]).toHaveClass("cause-row-top");
    expect(rows[1]).toHaveClass("cause-row-top");
    expect(rows[2]).not.toHaveClass("cause-row-top");
  });
});
