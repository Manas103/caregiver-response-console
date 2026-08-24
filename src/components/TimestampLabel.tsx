import { useEffect, useState } from "react";

/** Formats an ISO timestamp as a relative time ("2m ago") and re-renders
 * itself once a second so the board's ages stay live without a server push
 * for every passing second. Exported standalone so it is unit-testable
 * without mounting an AlertCard. */
export function relativeTime(iso: string, now: number): string {
  const deltaMs = now - new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor(deltaMs / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function TimestampLabel({ iso }: { iso: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <time className="timestamp-label" dateTime={iso} title={new Date(iso).toLocaleString()}>
      {relativeTime(iso, now)}
    </time>
  );
}
