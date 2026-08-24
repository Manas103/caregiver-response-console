import { beforeEach, describe, expect, it } from "vitest";
import { clearQueue, drainQueue, enqueue, loadQueue, removeFromQueue, saveQueue } from "../ws/offlineQueue";
import type { ClientAction } from "../protocol";

function action(id: string): ClientAction {
  return {
    clientActionId: id,
    type: "claim",
    alertId: `alert-${id}`,
    userId: "nurse-a",
    issuedAt: "2026-08-24T10:00:00.000Z",
  };
}

describe("offlineQueue", () => {
  beforeEach(() => {
    clearQueue();
  });

  it("starts empty and persists nothing until enqueue is called", () => {
    expect(loadQueue()).toEqual([]);
  });

  it("persists enqueued actions across a fresh load (survives a building dead zone reload)", () => {
    let queue = loadQueue();
    queue = enqueue(queue, action("a1"));
    queue = enqueue(queue, action("a2"));

    // Simulate reloading the app: read straight from storage again.
    expect(loadQueue().map((a) => a.clientActionId)).toEqual(["a1", "a2"]);
  });

  it("replays N queued actions in original order exactly once each, none lost, none duplicated", () => {
    let queue = loadQueue();
    const ids = ["a1", "a2", "a3", "a4", "a5"];
    for (const id of ids) {
      queue = enqueue(queue, action(id));
    }

    const sent: string[] = [];
    drainQueue(queue, (a) => sent.push(a.clientActionId));

    expect(sent).toEqual(ids);
    expect(sent).toHaveLength(new Set(sent).size); // no duplicates
  });

  it("removeFromQueue drops only the acknowledged action, in place, and persists the removal", () => {
    let queue = loadQueue();
    queue = enqueue(queue, action("a1"));
    queue = enqueue(queue, action("a2"));
    queue = enqueue(queue, action("a3"));

    queue = removeFromQueue(queue, "a2");

    expect(queue.map((a) => a.clientActionId)).toEqual(["a1", "a3"]);
    expect(loadQueue().map((a) => a.clientActionId)).toEqual(["a1", "a3"]);
  });

  it("an action already acknowledged before reconnect is not replayed", () => {
    // a1 was sent, the server applied it, but the ack raced the socket
    // drop; the client acknowledges it out-of-band (e.g. it arrives just
    // after reconnect but before drain runs) and removes it from the queue.
    let queue = loadQueue();
    queue = enqueue(queue, action("a1"));
    queue = enqueue(queue, action("a2"));
    queue = removeFromQueue(queue, "a1");

    const sent: string[] = [];
    drainQueue(queue, (a) => sent.push(a.clientActionId));

    expect(sent).toEqual(["a2"]);
  });

  it("loadQueue tolerates corrupt storage instead of throwing", () => {
    window.localStorage.setItem("caregiver-console:offline-queue", "{not json");
    expect(loadQueue()).toEqual([]);
  });

  it("saveQueue/loadQueue round-trip is exact", () => {
    const queue = [action("a1"), action("a2")];
    saveQueue(queue);
    expect(loadQueue()).toEqual(queue);
  });
});
