import type { VehicleAssistanceEvent, VehicleReadiness } from "../fleet/protocol";
import { EmptyState } from "./EmptyState";
import { FleetEventCard } from "./FleetEventCard";

interface FleetEventBoardProps {
  events: VehicleAssistanceEvent[];
  readinessByVehicle: Record<string, VehicleReadiness>;
  currentOperator: string;
  pendingEventIds: Set<string>;
  onClaim: (eventId: string) => void;
  onResolve: (eventId: string) => void;
}

/** The fleet-domain sibling of AlertBoard: a grid of FleetEventCards, or an
 * EmptyState when there is nothing open. */
export function FleetEventBoard({
  events,
  readinessByVehicle,
  currentOperator,
  pendingEventIds,
  onClaim,
  onResolve,
}: FleetEventBoardProps) {
  if (events.length === 0) {
    return <EmptyState message="No vehicle assistance events are open." />;
  }

  return (
    <div className="alert-board">
      {events.map((event) => (
        <FleetEventCard
          key={event.id}
          event={event}
          readiness={readinessByVehicle[event.vehicleId] ?? null}
          currentOperator={currentOperator}
          isPending={pendingEventIds.has(event.id)}
          onClaim={() => onClaim(event.id)}
          onResolve={() => onResolve(event.id)}
        />
      ))}
    </div>
  );
}
