/** Shared wire protocol between this console and the (mocked here) caregiver
 * alert backend. Mirrored by hand in `mock-server/alertEngine.mjs`, which is
 * plain JS so the standalone Node mock server can run it without a build
 * step. Keep the two in sync; `alertsReducer.test.ts` and the mock-server
 * integration test both exercise real messages shaped exactly like this. */

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export type AlertState = "raised" | "claimed" | "confirmed" | "resolved";

export type AlertType = "fall" | "medication" | "vitals" | "call_button" | "wander";

export interface Alert {
  id: string;
  residentName: string;
  residentRoom: string;
  alertType: AlertType;
  severity: AlertSeverity;
  state: AlertState;
  claimedBy: string | null;
  raisedAt: string;
  updatedAt: string;
  escalated: boolean;
}

export type ClientActionType = "claim" | "confirm" | "resolve";

export interface ClientAction {
  clientActionId: string;
  type: ClientActionType;
  alertId: string;
  userId: string;
  issuedAt: string;
}

export type ClientMessage = { type: "action"; action: ClientAction };

export type ServerMessage =
  | { type: "snapshot"; alerts: Alert[] }
  | { type: "alert_update"; alert: Alert; clientActionId?: string }
  | {
      type: "claim_rejected";
      alertId: string;
      clientActionId: string;
      actualState: Alert;
      reason: string;
    };

/** The next state in the raised -> claimed -> confirmed -> resolved chain
 * that each client action type advances the alert to. Used by both the
 * client's optimistic-update code and the mock server's authoritative
 * transition logic so the two never disagree about what a "claim" means. */
export const NEXT_STATE: Record<ClientActionType, AlertState> = {
  claim: "claimed",
  confirm: "confirmed",
  resolve: "resolved",
};

/** The state an alert must be in, and who must hold the claim, for a given
 * action type to be legal. `null` for `requiredClaimant` means "nobody needs
 * to hold it yet" (only true for `claim` itself). */
export const REQUIRED_PRIOR_STATE: Record<ClientActionType, AlertState> = {
  claim: "raised",
  confirm: "claimed",
  resolve: "confirmed",
};
