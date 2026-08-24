/** Placeholder cards shown between mount and the first snapshot message
 * arriving over the WebSocket. Fixed count keeps the layout from jumping
 * once real cards replace it. */
export function LoadingSkeleton() {
  return (
    <div className="loading-skeleton" aria-busy="true" aria-label="Loading alerts">
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton-card" />
      ))}
    </div>
  );
}
