export type ToastKind = "success" | "error" | "info";

export interface ToastData {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

/** One transient notification. ToastContainer owns the list and the
 * auto-dismiss timers; this component is a pure render of one entry. */
export function Toast({ toast, onDismiss }: ToastProps) {
  return (
    <div className={`toast toast-${toast.kind}`} role="status">
      <span>{toast.message}</span>
      <button className="toast-dismiss" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
        &times;
      </button>
    </div>
  );
}
