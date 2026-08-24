import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { ClientAction, ClientActionType, ServerMessage } from "../protocol";
import { alertsReducer, initialAlertsState } from "../state/alertsReducer";
import { drainQueue, enqueue, loadQueue, removeFromQueue } from "./offlineQueue";

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "closed";

const RECONNECT_DELAY_MS = 2000;

function makeClientActionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Owns the WebSocket connection lifecycle, the optimistic-update reducer,
 * and the offline queue, and wires them together:
 *
 *  - while connected, actions are sent immediately and applied optimistically
 *  - while disconnected, actions are still applied optimistically but are
 *    persisted to the offline queue instead of sent
 *  - on reconnect, the queue is drained in order before anything new
 *  - every server message (snapshot, alert_update, claim_rejected) both
 *    updates the reducer and clears the corresponding queue entry, so a
 *    queued action that turns out to have already landed is never resent
 *    on a later reconnect
 *
 * `wsFactory` defaults to the real `WebSocket` constructor; tests inject a
 * fake so the hook can be exercised in jsdom without a real socket.
 */
export function useAlertSocket(
  url: string,
  userId: string,
  wsFactory: (url: string) => WebSocket = (u) => new WebSocket(u),
) {
  const [state, dispatch] = useReducer(alertsReducer, initialAlertsState);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [queueLength, setQueueLength] = useState(() => loadQueue().length);
  const socketRef = useRef<WebSocket | null>(null);
  const queueRef = useRef(loadQueue());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const sendOrQueue = useCallback(
    (action: ClientAction) => {
      const socket = socketRef.current;
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "action", action }));
      } else {
        queueRef.current = enqueue(queueRef.current, action);
        setQueueLength(queueRef.current.length);
      }
    },
    [],
  );

  const dispatchClientAction = useCallback(
    (type: ClientActionType, alertId: string) => {
      const action: ClientAction = {
        clientActionId: makeClientActionId(),
        type,
        alertId,
        userId,
        issuedAt: new Date().toISOString(),
      };
      dispatch({ kind: "OPTIMISTIC_ACTION", action });
      sendOrQueue(action);
    },
    [sendOrQueue, userId],
  );

  const dismissConflict = useCallback((alertId: string) => {
    dispatch({ kind: "DISMISS_CONFLICT", alertId });
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      setStatus((prev) => (prev === "closed" ? "reconnecting" : "connecting"));
      const socket = wsFactory(url);
      socketRef.current = socket;

      socket.onopen = () => {
        if (!mountedRef.current) return;
        setStatus("open");
        const toReplay = queueRef.current;
        drainQueue(toReplay, (action) => {
          socket.send(JSON.stringify({ type: "action", action }));
        });
      };

      socket.onmessage = (event) => {
        if (!mountedRef.current) return;
        let message: ServerMessage;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }

        if (message.type === "snapshot") {
          dispatch({ kind: "SNAPSHOT_RECEIVED", alerts: message.alerts });
        } else if (message.type === "alert_update") {
          dispatch({ kind: "SERVER_ALERT_UPDATE", alert: message.alert, clientActionId: message.clientActionId });
          if (message.clientActionId) {
            queueRef.current = removeFromQueue(queueRef.current, message.clientActionId);
            setQueueLength(queueRef.current.length);
          }
        } else if (message.type === "claim_rejected") {
          dispatch({
            kind: "CLAIM_REJECTED",
            alertId: message.alertId,
            clientActionId: message.clientActionId,
            actualState: message.actualState,
            reason: message.reason,
          });
          queueRef.current = removeFromQueue(queueRef.current, message.clientActionId);
          setQueueLength(queueRef.current.length);
        }
      };

      socket.onclose = () => {
        if (!mountedRef.current) return;
        setStatus("closed");
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS);
      };

      socket.onerror = () => {
        socket.close();
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return {
    alerts: Object.values(state.alerts).sort((a, b) => a.raisedAt.localeCompare(b.raisedAt)),
    pending: state.pending,
    conflicts: state.conflicts,
    status,
    queueLength,
    claim: (alertId: string) => dispatchClientAction("claim", alertId),
    confirm: (alertId: string) => dispatchClientAction("confirm", alertId),
    resolve: (alertId: string) => dispatchClientAction("resolve", alertId),
    dismissConflict,
  };
}
