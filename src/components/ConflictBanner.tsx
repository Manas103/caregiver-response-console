interface ConflictBannerProps {
  reason: string;
  onDismiss: () => void;
}

/** Shown on an AlertCard when this client's optimistic claim was rejected by
 * the server (someone else claimed it first). Explains what actually
 * happened and lets the caregiver dismiss it once they have read it. */
export function ConflictBanner({ reason, onDismiss }: ConflictBannerProps) {
  return (
    <div className="conflict-banner" role="alert">
      <span>{reason}</span>
      <button className="conflict-dismiss" onClick={onDismiss} aria-label="Dismiss conflict notice">
        Dismiss
      </button>
    </div>
  );
}
