import type { Alert } from "../protocol";

interface ClaimButtonProps {
  alert: Alert;
  currentUser: string;
  pending: boolean;
  onClaim: () => void;
  onConfirm: () => void;
  onRequestResolve: () => void;
}

/** The single primary action button on an AlertCard. Its label and handler
 * change with the alert's lifecycle state: Claim on a raised alert, Confirm
 * once you hold the claim, Resolve (via a ConfirmDialog, not directly) once
 * confirmed. Disabled once someone else holds the claim, or while resolved. */
export function ClaimButton({ alert, currentUser, pending, onClaim, onConfirm, onRequestResolve }: ClaimButtonProps) {
  if (alert.state === "resolved") {
    return (
      <button className="claim-button" disabled>
        Resolved
      </button>
    );
  }

  const heldByOther = alert.claimedBy !== null && alert.claimedBy !== currentUser;

  if (alert.state === "raised") {
    return (
      <button className="claim-button claim-button-primary" onClick={onClaim} disabled={pending}>
        {pending ? "Claiming..." : "Claim"}
      </button>
    );
  }

  if (heldByOther) {
    return (
      <button className="claim-button" disabled>
        Claimed by {alert.claimedBy}
      </button>
    );
  }

  if (alert.state === "claimed") {
    return (
      <button className="claim-button claim-button-primary" onClick={onConfirm} disabled={pending}>
        {pending ? "Confirming..." : "Confirm"}
      </button>
    );
  }

  // confirmed, held by currentUser
  return (
    <button className="claim-button claim-button-destructive" onClick={onRequestResolve} disabled={pending}>
      {pending ? "Resolving..." : "Resolve"}
    </button>
  );
}
