import type { AlertState } from "../protocol";

const LABEL: Record<AlertState, string> = {
  raised: "Raised",
  claimed: "Claimed",
  confirmed: "Confirmed",
  resolved: "Resolved",
};

/** Colored pill for an alert's lifecycle state. Purely presentational; the
 * state machine itself lives in alertsReducer.ts and mock-server/alertEngine.mjs. */
export function StateBadge({ state }: { state: AlertState }) {
  return <span className={`state-badge state-${state}`}>{LABEL[state]}</span>;
}
