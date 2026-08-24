import type { Alert } from "../protocol";
import { ClaimButton } from "./ClaimButton";
import { ConflictBanner } from "./ConflictBanner";
import { EscalationTag } from "./EscalationTag";
import { ResidentInfo } from "./ResidentInfo";
import { StateBadge } from "./StateBadge";
import { TimestampLabel } from "./TimestampLabel";

interface AlertCardProps {
  alert: Alert;
  currentUser: string;
  isPending: boolean;
  conflictReason: string | null;
  onClaim: () => void;
  onConfirm: () => void;
  onRequestResolve: () => void;
  onDismissConflict: () => void;
}

/** One alert on the board. Composes the smaller display components
 * (ResidentInfo, StateBadge, EscalationTag, TimestampLabel) with the one
 * interactive element (ClaimButton) and an optional ConflictBanner when this
 * client's own optimistic claim on this alert was just rejected. */
export function AlertCard({
  alert,
  currentUser,
  isPending,
  conflictReason,
  onClaim,
  onConfirm,
  onRequestResolve,
  onDismissConflict,
}: AlertCardProps) {
  return (
    <article className={`alert-card severity-${alert.severity}`} data-testid={`alert-card-${alert.id}`}>
      <div className="alert-card-top">
        <ResidentInfo residentName={alert.residentName} residentRoom={alert.residentRoom} />
        <div className="alert-card-badges">
          <StateBadge state={alert.state} />
          {alert.escalated && <EscalationTag />}
        </div>
      </div>

      <p className="alert-type">{alert.alertType.replace("_", " ")}</p>

      {conflictReason && <ConflictBanner reason={conflictReason} onDismiss={onDismissConflict} />}

      <div className="alert-card-bottom">
        <TimestampLabel iso={alert.raisedAt} />
        <ClaimButton
          alert={alert}
          currentUser={currentUser}
          pending={isPending}
          onClaim={onClaim}
          onConfirm={onConfirm}
          onRequestResolve={onRequestResolve}
        />
      </div>
    </article>
  );
}
