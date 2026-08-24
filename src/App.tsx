import { useCallback, useMemo, useState } from "react";
import type { AlertState } from "./protocol";
import { useAlertSocket } from "./ws/useAlertSocket";
import { AlertBoard } from "./components/AlertBoard";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { ConnectionStatusBadge } from "./components/ConnectionStatusBadge";
import { FilterBar } from "./components/FilterBar";
import { Header } from "./components/Header";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { OfflineQueueIndicator } from "./components/OfflineQueueIndicator";
import { SearchInput } from "./components/SearchInput";
import { ToastContainer, type ToastData, type ToastKind } from "./components/ToastContainer";

const WS_URL = (import.meta as unknown as { env?: { VITE_WS_URL?: string } }).env?.VITE_WS_URL ?? "ws://localhost:8787";
const CURRENT_USER = "M. Vudugula, RN";
const ESCALATION_THRESHOLD_MS = 5 * 60 * 1000;

let toastCounter = 0;

/** Top-level shell. Holds the two client-only UI filters (state, search
 * text) and the pending-resolve confirmation target; everything about
 * alerts themselves, the connection, and the offline queue comes from
 * useAlertSocket, which is the one place the WebSocket lifecycle lives. */
export default function App() {
  const socket = useAlertSocket(WS_URL, CURRENT_USER);
  const [stateFilter, setStateFilter] = useState<AlertState | "all">("all");
  const [search, setSearch] = useState("");
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [resolveTarget, setResolveTarget] = useState<string | null>(null);

  const pushToast = useCallback((kind: ToastKind, message: string) => {
    const id = `toast-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleClaim = useCallback(
    (alertId: string) => {
      socket.claim(alertId);
    },
    [socket],
  );

  const handleConfirm = useCallback(
    (alertId: string) => {
      socket.confirm(alertId);
    },
    [socket],
  );

  const handleDismissConflict = useCallback(
    (alertId: string) => {
      socket.dismissConflict(alertId);
    },
    [socket],
  );

  const handleResolveConfirmed = useCallback(() => {
    if (resolveTarget) {
      socket.resolve(resolveTarget);
      pushToast("info", "Resolution submitted.");
    }
    setResolveTarget(null);
  }, [resolveTarget, socket, pushToast]);

  const now = Date.now();
  const alertsWithEscalation = useMemo(
    () =>
      socket.alerts.map((alert) => ({
        ...alert,
        escalated:
          alert.escalated ||
          (alert.state === "raised" && now - new Date(alert.raisedAt).getTime() > ESCALATION_THRESHOLD_MS),
      })),
    [socket.alerts, now],
  );

  const visibleAlerts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return alertsWithEscalation.filter((alert) => {
      if (stateFilter !== "all" && alert.state !== stateFilter) return false;
      if (!query) return true;
      return (
        alert.residentName.toLowerCase().includes(query) || alert.residentRoom.toLowerCase().includes(query)
      );
    });
  }, [alertsWithEscalation, stateFilter, search]);

  const pendingAlertIds = useMemo(() => new Set(Object.values(socket.pending).map((p) => p.alertId)), [socket.pending]);
  const conflictReasons = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [alertId, info] of Object.entries(socket.conflicts)) map[alertId] = info.reason;
    return map;
  }, [socket.conflicts]);

  const hasReceivedSnapshot = socket.alerts.length > 0 || socket.status !== "connecting";

  return (
    <div className="app">
      <Header currentUser={CURRENT_USER} />
      <div className="status-row">
        <ConnectionStatusBadge status={socket.status} />
        <OfflineQueueIndicator count={socket.queueLength} />
      </div>

      <div className="controls-row">
        <FilterBar active={stateFilter} onChange={setStateFilter} />
        <SearchInput value={search} onChange={setSearch} />
      </div>

      {!hasReceivedSnapshot ? (
        <LoadingSkeleton />
      ) : (
        <AlertBoard
          alerts={visibleAlerts}
          currentUser={CURRENT_USER}
          pendingAlertIds={pendingAlertIds}
          conflicts={conflictReasons}
          onClaim={handleClaim}
          onConfirm={handleConfirm}
          onRequestResolve={setResolveTarget}
          onDismissConflict={handleDismissConflict}
        />
      )}

      {resolveTarget && (
        <ConfirmDialog
          title="Resolve this alert?"
          body="This marks the alert closed for every caregiver on this board. This cannot be undone from here."
          confirmLabel="Resolve"
          onConfirm={handleResolveConfirmed}
          onCancel={() => setResolveTarget(null)}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
