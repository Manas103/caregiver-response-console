import type { VehicleAssistanceEvent } from "../fleet/protocol";

interface FleetClaimButtonProps {
  event: VehicleAssistanceEvent;
  currentOperator: string;
  pending: boolean;
  onClaim: () => void;
  onResolve: () => void;
}

/** The fleet-domain sibling of ClaimButton: Claim on a requested event,
 * Resolve once you hold the claim, disabled and labeled with the holder's
 * id once someone else holds it. Reuses ClaimButton's exact class names
 * (and therefore its already-validated color pairs). */
export function FleetClaimButton({ event, currentOperator, pending, onClaim, onResolve }: FleetClaimButtonProps) {
  if (event.state === "resolved") {
    return (
      <button className="claim-button" disabled>
        Resolved
      </button>
    );
  }

  const heldByOther = event.claimedBy !== null && event.claimedBy !== currentOperator;

  if (event.state === "requested") {
    return (
      <button className="claim-button claim-button-primary" onClick={onClaim} disabled={pending}>
        {pending ? "Claiming..." : "Claim"}
      </button>
    );
  }

  if (heldByOther) {
    return (
      <button className="claim-button" disabled>
        Claimed by {event.claimedBy}
      </button>
    );
  }

  return (
    <button className="claim-button claim-button-destructive" onClick={onResolve} disabled={pending}>
      {pending ? "Resolving..." : "Resolve"}
    </button>
  );
}
