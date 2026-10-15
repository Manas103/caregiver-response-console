import type { VehicleAssistanceEvent, VehicleReadiness } from "../fleet/protocol";
import { FleetClaimButton } from "./FleetClaimButton";
import { FleetStateBadge } from "./FleetStateBadge";
import { ReadinessBadge } from "./ReadinessBadge";
import { TimestampLabel } from "./TimestampLabel";

interface FleetEventCardProps {
  event: VehicleAssistanceEvent;
  readiness: VehicleReadiness | null;
  currentOperator: string;
  isPending: boolean;
  onClaim: () => void;
  onResolve: () => void;
}

/** One vehicle-initiated assistance event on the fleet board. The
 * ReadinessBadge is shown alongside the event, not instead of it: a
 * vehicle can request assistance while still in service, and a vehicle
 * already out of service for cleaning/calibration is shown as such even
 * with no open assistance event. */
export function FleetEventCard({ event, readiness, currentOperator, isPending, onClaim, onResolve }: FleetEventCardProps) {
  return (
    <article className="alert-card" data-testid={`fleet-event-card-${event.id}`}>
      <div className="alert-card-top">
        <div>
          <p className="fleet-vehicle-id">{event.vehicleId}</p>
          <p className="alert-type">{event.reason}</p>
        </div>
        <div className="alert-card-badges">
          <FleetStateBadge state={event.state} />
          {readiness && <ReadinessBadge readiness={readiness} />}
        </div>
      </div>

      <div className="alert-card-bottom">
        <TimestampLabel iso={event.requestedAt} />
        <FleetClaimButton
          event={event}
          currentOperator={currentOperator}
          pending={isPending}
          onClaim={onClaim}
          onResolve={onResolve}
        />
      </div>
    </article>
  );
}
