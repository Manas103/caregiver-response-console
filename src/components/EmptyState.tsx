/** Shown when the board has no alerts matching the current filter/search,
 * including the true "zero alerts at all" case. */
export function EmptyState({ message = "No alerts match the current view." }: { message?: string }) {
  return <p className="empty-state">{message}</p>;
}
