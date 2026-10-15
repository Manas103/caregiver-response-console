import type { FleetEventState } from "../fleet/protocol";

// Reuses the same raised/claimed/resolved color tokens StateBadge already
// uses (see src/theme/colors.ts), so this badge is covered by the exact
// contrast pairs scripts/check-a11y.mjs already validates for StateBadge;
// no new color was introduced.
const LABEL: Record<FleetEventState, string> = {
  requested: "Requested",
  claimed: "Claimed",
  resolved: "Resolved",
};

const STATE_CLASS: Record<FleetEventState, string> = {
  requested: "raised",
  claimed: "claimed",
  resolved: "resolved",
};

/** Colored pill for a vehicle assistance event's lifecycle state. The
 * sibling of StateBadge for the fleet domain. */
export function FleetStateBadge({ state }: { state: FleetEventState }) {
  return <span className={`state-badge state-${STATE_CLASS[state]}`}>{LABEL[state]}</span>;
}
