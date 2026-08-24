import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { relativeTime, TimestampLabel } from "../components/TimestampLabel";

describe("relativeTime", () => {
  const now = new Date("2026-08-24T10:05:00.000Z").getTime();

  it("shows 'just now' for very recent timestamps", () => {
    expect(relativeTime("2026-08-24T10:04:58.000Z", now)).toBe("just now");
  });

  it("shows seconds ago under a minute", () => {
    expect(relativeTime("2026-08-24T10:04:30.000Z", now)).toBe("30s ago");
  });

  it("shows minutes ago under an hour", () => {
    expect(relativeTime("2026-08-24T09:50:00.000Z", now)).toBe("15m ago");
  });

  it("shows hours ago beyond an hour", () => {
    expect(relativeTime("2026-08-24T07:05:00.000Z", now)).toBe("3h ago");
  });

  it("never goes negative for a timestamp that is (clock-skew) slightly in the future", () => {
    expect(relativeTime("2026-08-24T10:05:05.000Z", now)).toBe("just now");
  });
});

describe("TimestampLabel", () => {
  it("renders the ISO timestamp as a machine-readable dateTime attribute", () => {
    render(<TimestampLabel iso="2026-08-24T10:00:00.000Z" />);
    const el = screen.getByText(/ago|just now/);
    expect(el).toHaveAttribute("dateTime", "2026-08-24T10:00:00.000Z");
  });
});
