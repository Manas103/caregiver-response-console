/** Shared wire protocol for the fleet event response extension, mirrored
 * by hand in `mock-server/fleetEngine.mjs` for the same reason
 * `protocol.ts` is mirrored by `alertEngine.mjs`: a dependency-free Node
 * mock server cannot import a TypeScript module without a build step.
 *
 * This is a second, independent domain alongside the resident alert board
 * above it: a vehicle-initiated assistance request, claimed by a remote
 * operator, instead of a resident-initiated alert claimed by a caregiver.
 * The exactly-once claim semantics are the same property proven for
 * alerts, applied to a different real console. */

export type FleetEventState = "requested" | "claimed" | "resolved";

export interface VehicleAssistanceEvent {
  id: string;
  vehicleId: string;
  reason: string;
  state: FleetEventState;
  claimedBy: string | null;
  requestedAt: string;
  updatedAt: string;
}

export type FleetClientActionType = "claim" | "resolve";

export interface FleetClientAction {
  clientActionId: string;
  type: FleetClientActionType;
  eventId: string;
  operatorId: string;
  issuedAt: string;
}

export const FLEET_NEXT_STATE: Record<FleetClientActionType, FleetEventState> = {
  claim: "claimed",
  resolve: "resolved",
};

export const FLEET_REQUIRED_PRIOR_STATE: Record<FleetClientActionType, FleetEventState> = {
  claim: "requested",
  resolve: "claimed",
};

/** Readiness, as computed by `fleet/readiness.py`'s replay over the
 * append-only log; this console only ever renders a value computed there,
 * never recomputes it independently, so the two can never disagree about
 * what "ready" means. */
export interface VehicleReadiness {
  vehicleId: string;
  inService: boolean;
  cause: string | null;
  cleaningCleared: boolean;
  calibrationCleared: boolean;
}

export interface CauseAttributionRow {
  cause: string;
  minutes: number;
  episodes: number;
}
