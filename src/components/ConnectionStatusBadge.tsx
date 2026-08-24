import type { ConnectionStatus } from "../ws/useAlertSocket";

const LABEL: Record<ConnectionStatus, string> = {
  connecting: "Connecting",
  open: "Connected",
  reconnecting: "Reconnecting",
  closed: "Offline",
};

const CLASS: Record<ConnectionStatus, string> = {
  connecting: "conn-badge conn-reconnecting",
  open: "conn-badge conn-open",
  reconnecting: "conn-badge conn-reconnecting",
  closed: "conn-badge conn-closed",
};

/** Live indicator of the WebSocket connection to the alert backend. This is
 * what tells a caregiver they are looking at a stale board during a
 * building dead zone, before the offline queue even becomes relevant. */
export function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  return (
    <span className={CLASS[status]} role="status">
      {LABEL[status]}
    </span>
  );
}
