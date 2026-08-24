// A mock WebSocket backend for the Caregiver Response Console. This is NOT
// the production alert-triage-escalation service (that is a separate sibling
// repo, built independently); it exists purely to give this console a real
// WebSocket endpoint to develop and test against, using the same message
// protocol described in src/protocol.ts.
//
// Run standalone: node mock-server/server.mjs [port]
// Default port: 8787.

import { pathToFileURL } from "node:url";
import { WebSocketServer } from "ws";
import { createEngineState, applyClientAction, listAlerts } from "./alertEngine.mjs";

export function startServer(port = 8787) {
  const state = createEngineState();
  const wss = new WebSocketServer({ port });
  const clients = new Set();

  wss.on("connection", (socket) => {
    clients.add(socket);
    socket.send(JSON.stringify({ type: "snapshot", alerts: listAlerts(state) }));

    socket.on("message", (raw) => {
      let message;
      try {
        message = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (message.type !== "action") return;

      const result = applyClientAction(state, message.action);

      if (result.outcome === "rejected") {
        const rejection = {
          type: "claim_rejected",
          alertId: message.action.alertId,
          clientActionId: message.action.clientActionId,
          actualState: result.alert,
          reason: result.reason,
        };
        socket.send(JSON.stringify(rejection));
        return;
      }

      // "applied" and "already_processed" both broadcast the current
      // authoritative alert to every connected client, so a second console
      // watching the same board sees the claim land too.
      const update = {
        type: "alert_update",
        alert: result.alert,
        clientActionId: message.action.clientActionId,
      };
      for (const client of clients) {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify(update));
        }
      }
    });

    socket.on("close", () => clients.delete(socket));
  });

  return wss;
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const port = Number(process.argv[2]) || 8787;
  startServer(port);
  console.log(`caregiver-response-console mock server listening on ws://localhost:${port}`);
}
