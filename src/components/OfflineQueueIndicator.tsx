/** Shows how many actions are waiting in the local offline queue to be
 * replayed once the connection returns. Renders nothing when the queue is
 * empty, so it does not clutter the header during normal operation. */
export function OfflineQueueIndicator({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="queue-indicator" role="status">
      {count} queued action{count === 1 ? "" : "s"} waiting to sync
    </span>
  );
}
