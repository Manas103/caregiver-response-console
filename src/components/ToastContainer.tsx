import { Toast, type ToastData } from "./Toast";

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

/** Stacks active toasts in a fixed corner. App.tsx owns the actual toast
 * list (added on conflicts and connection changes, auto-expired on a
 * timer); this component only lays them out. */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
