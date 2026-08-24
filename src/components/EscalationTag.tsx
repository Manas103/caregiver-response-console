/** Rendered on an AlertCard when the alert has been unclaimed past the
 * escalation threshold (see App.tsx's ESCALATION_THRESHOLD_MS). Deliberately
 * loud (dark background, white text, bold) since it exists to catch a
 * caregiver's eye first. */
export function EscalationTag() {
  return <span className="escalation-tag">ESCALATED</span>;
}
