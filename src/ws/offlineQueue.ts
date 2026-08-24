import type { ClientAction } from "../protocol";

const STORAGE_KEY = "caregiver-console:offline-queue";

/** Reads the persisted queue. Never throws: a corrupt or missing value is
 * treated as an empty queue, since losing a malformed queue is safer than
 * crashing the console on load. */
export function loadQueue(): ClientAction[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQueue(queue: ClientAction[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/** Appends an action to the persisted queue and returns the new queue. */
export function enqueue(queue: ClientAction[], action: ClientAction): ClientAction[] {
  const next = [...queue, action];
  saveQueue(next);
  return next;
}

/** Removes an action by clientActionId (used once the server has
 * acknowledged it, either with an alert_update or a claim_rejected).
 * Returns the new queue. */
export function removeFromQueue(queue: ClientAction[], clientActionId: string): ClientAction[] {
  const next = queue.filter((a) => a.clientActionId !== clientActionId);
  saveQueue(next);
  return next;
}

export function clearQueue(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}

/**
 * Replays a queued list of actions in original order through `send`.
 *
 * This is the client half of the offline-dead-zone guarantee: every queued
 * action is sent exactly once, in the order it was originally issued. It
 * does not itself dedupe against "already landed before the drop" (that
 * ledger lives server-side, see mock-server/alertEngine.mjs
 * processedActionIds), because the client cannot know what the server saw
 * before the socket dropped. What the client *can* guarantee, and what this
 * function is responsible for, is: never send the same queued action twice
 * from the client's own queue, and never skip one.
 */
export function drainQueue(
  queue: ClientAction[],
  send: (action: ClientAction) => void,
): void {
  for (const action of queue) {
    send(action);
  }
}
