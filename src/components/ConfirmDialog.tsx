interface ConfirmDialogProps {
  title: string;
  body: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Blocking confirmation modal, used before Resolve so a mis-tapped button
 * cannot close out an alert that still needs attention. Kept generic
 * (title/body/confirmLabel props) rather than resolve-specific in case a
 * future action needs the same guard. */
export function ConfirmDialog({ title, body, confirmLabel = "Confirm", onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p>{body}</p>
        <div className="confirm-dialog-actions">
          <button className="claim-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="claim-button claim-button-destructive" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
