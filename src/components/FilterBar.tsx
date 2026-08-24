import type { AlertState } from "../protocol";

const FILTERS: Array<{ key: AlertState | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "raised", label: "Raised" },
  { key: "claimed", label: "Claimed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "resolved", label: "Resolved" },
];

interface FilterBarProps {
  active: AlertState | "all";
  onChange: (state: AlertState | "all") => void;
}

/** State filter row above the board. A plain button group rather than a
 * <select>, since the caregiver is expected to switch views often during a
 * shift and buttons are one tap instead of two. */
export function FilterBar({ active, onChange }: FilterBarProps) {
  return (
    <div className="filter-bar" role="group" aria-label="Filter alerts by state">
      {FILTERS.map((f) => (
        <button
          key={f.key}
          className={`filter-button${active === f.key ? " filter-button-active" : ""}`}
          onClick={() => onChange(f.key)}
          aria-pressed={active === f.key}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
