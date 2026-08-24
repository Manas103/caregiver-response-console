import type { Alert, ClientAction } from "../protocol";
import { NEXT_STATE } from "../protocol";

export interface PendingAction {
  clientActionId: string;
  alertId: string;
  /** The alert exactly as it was before this optimistic update, so a
   * rejection can restore it precisely rather than guessing. */
  previousAlert: Alert;
}

export interface ConflictInfo {
  alertId: string;
  reason: string;
  at: string;
}

export interface AlertsState {
  alerts: Record<string, Alert>;
  pending: Record<string, PendingAction>;
  conflicts: Record<string, ConflictInfo>;
}

export const initialAlertsState: AlertsState = {
  alerts: {},
  pending: {},
  conflicts: {},
};

export type AlertsEvent =
  | { kind: "SNAPSHOT_RECEIVED"; alerts: Alert[] }
  | { kind: "OPTIMISTIC_ACTION"; action: ClientAction }
  | { kind: "SERVER_ALERT_UPDATE"; alert: Alert; clientActionId?: string }
  | { kind: "CLAIM_REJECTED"; alertId: string; clientActionId: string; actualState: Alert; reason: string }
  | { kind: "DISMISS_CONFLICT"; alertId: string };

/** Pure state machine for the alert board. Every branch here is unit-tested
 * directly (no WebSocket, no timers) in alertsReducer.test.ts, which is
 * where the optimistic-claim-then-conflict invariant and the
 * "one alert changes, the rest of the board does not" invariant live. */
export function alertsReducer(state: AlertsState, event: AlertsEvent): AlertsState {
  switch (event.kind) {
    case "SNAPSHOT_RECEIVED": {
      const alerts: Record<string, Alert> = {};
      for (const alert of event.alerts) alerts[alert.id] = alert;
      return { alerts, pending: {}, conflicts: {} };
    }

    case "OPTIMISTIC_ACTION": {
      const { action } = event;
      const current = state.alerts[action.alertId];
      if (!current) return state;

      const optimisticAlert: Alert = {
        ...current,
        state: NEXT_STATE[action.type],
        claimedBy: action.type === "claim" ? action.userId : current.claimedBy,
        updatedAt: action.issuedAt,
      };

      return {
        ...state,
        alerts: { ...state.alerts, [current.id]: optimisticAlert },
        pending: {
          ...state.pending,
          [action.clientActionId]: {
            clientActionId: action.clientActionId,
            alertId: action.alertId,
            previousAlert: current,
          },
        },
      };
    }

    case "SERVER_ALERT_UPDATE": {
      const nextPending = { ...state.pending };
      if (event.clientActionId) delete nextPending[event.clientActionId];
      return {
        ...state,
        alerts: { ...state.alerts, [event.alert.id]: event.alert },
        pending: nextPending,
      };
    }

    case "CLAIM_REJECTED": {
      // Roll back to the server's authoritative state. Only the rejected
      // alert and its own pending entry are touched; every other alert and
      // every other in-flight optimistic action is left exactly as it was.
      const nextPending = { ...state.pending };
      delete nextPending[event.clientActionId];
      return {
        alerts: { ...state.alerts, [event.alertId]: event.actualState },
        pending: nextPending,
        conflicts: {
          ...state.conflicts,
          [event.alertId]: { alertId: event.alertId, reason: event.reason, at: new Date().toISOString() },
        },
      };
    }

    case "DISMISS_CONFLICT": {
      const nextConflicts = { ...state.conflicts };
      delete nextConflicts[event.alertId];
      return { ...state, conflicts: nextConflicts };
    }

    default:
      return state;
  }
}
