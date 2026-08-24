import type { Alert } from "../protocol";
import { AlertCard } from "./AlertCard";
import { EmptyState } from "./EmptyState";

interface AlertBoardProps {
  alerts: Alert[];
  currentUser: string;
  pendingAlertIds: Set<string>;
  conflicts: Record<string, string>;
  onClaim: (alertId: string) => void;
  onConfirm: (alertId: string) => void;
  onRequestResolve: (alertId: string) => void;
  onDismissConflict: (alertId: string) => void;
}

/** Renders the filtered/searched alert list as a grid of AlertCards, or an
 * EmptyState when nothing matches. All actual state (which alerts, which
 * are pending, which have a conflict) is computed by App.tsx; this
 * component just lays the result out. */
export function AlertBoard({
  alerts,
  currentUser,
  pendingAlertIds,
  conflicts,
  onClaim,
  onConfirm,
  onRequestResolve,
  onDismissConflict,
}: AlertBoardProps) {
  if (alerts.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="alert-board">
      {alerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          currentUser={currentUser}
          isPending={pendingAlertIds.has(alert.id)}
          conflictReason={conflicts[alert.id] ?? null}
          onClaim={() => onClaim(alert.id)}
          onConfirm={() => onConfirm(alert.id)}
          onRequestResolve={() => onRequestResolve(alert.id)}
          onDismissConflict={() => onDismissConflict(alert.id)}
        />
      ))}
    </div>
  );
}
