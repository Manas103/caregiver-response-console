import type { VehicleReadiness } from "../fleet/protocol";

/** Renders a vehicle's readiness exactly as computed by fleet/readiness.py's
 * replay over the append-only log (passed in as props); this component
 * never recomputes "in service" itself. Reuses the resolved/raised color
 * tokens StateBadge already validates for contrast. */
export function ReadinessBadge({ readiness }: { readiness: VehicleReadiness }) {
  if (readiness.inService) {
    return <span className="state-badge state-resolved">In service</span>;
  }

  const gates = [
    readiness.cleaningCleared ? "cleaning clear" : "cleaning pending",
    readiness.calibrationCleared ? "calibration clear" : "calibration pending",
  ].join(", ");

  return (
    <span className="state-badge state-raised" title={gates}>
      Out of service{readiness.cause ? `: ${readiness.cause.replace(/_/g, " ")}` : ""}
    </span>
  );
}
