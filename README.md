# Real-Time Caregiver Response Console

A React and TypeScript console for the caregiver-facing side of a care-operations alert system: a live board with optimistic claiming and server-side conflict resolution, an offline queue that survives a dropped connection, and an automated WCAG AA check across every component. Every number below was measured on this machine, not targeted.

## Why this exists

The sibling backend service, [`caregiver-alert-triage-escalation`](https://github.com/Manas103/caregiver-alert-triage-escalation), proves an alert is never lost and never double-claimed at the data layer. This console is the other half of that system: the interface a caregiver actually holds in a corridor with a phone, where the network is unreliable and every claim they tap has to feel instant even though the server, not the tap, decides who really wins.

## Honest framing

- **The alert data and WebSocket backend are simulated.** `mock-server/` is a small in-memory WebSocket server built for this console to develop and test against; it is explicitly not the production `caregiver-alert-triage-escalation` service, which is a separate, independently built repository.
- **Written with an AI coding assistant, gated behind the same tests and review as hand-written code.** This repository's code is written by an AI coding assistant (Claude) under this project's pipeline; every change here passes `npm run build` (`tsc -b && vite build`) and `npm test` before being considered done, the same gate as every other repository in this portfolio, human-written or not.
- **The WCAG check is a direct computation, not a rendered-pixel measurement.** `scripts/check-a11y.mjs` computes contrast ratios and target sizes from the exact color and size values declared in `src/theme/colors.ts` and `src/index.css`, not from a headless browser screenshot. The honest limitation: it can miss a real rendering divergence between the declared values and what actually paints; it cannot miss a wrong value, since it reads the same source of truth the component renders from.
- **Machine and toolchain.** Windows 11, Node v22.17.1, npm 10.9.2, React 18.3.1, TypeScript 5.7.2, Vite 6.0.7, Vitest 2.1.9.

## Architecture

```
src/
  components/          18 components: AlertBoard, AlertCard, ClaimButton, ConfirmDialog,
                        ConflictBanner, ConnectionStatusBadge, EmptyState, EscalationTag,
                        FilterBar, Header, LoadingSkeleton, OfflineQueueIndicator,
                        ResidentInfo, SearchInput, StateBadge, TimestampLabel, Toast,
                        ToastContainer
  state/alertsReducer.ts   Optimistic local state transitions and server reconciliation
  ws/useAlertSocket.ts     The WebSocket hook: connect, drain the offline queue on reconnect,
                           apply authoritative server updates
  ws/offlineQueue.ts       localStorage-backed queue: enqueue while disconnected, dedup and
                           replay in order once the socket reopens
  theme/colors.ts          The single source of truth for every text/background color pair,
                           imported directly by both the components and the a11y checker
  protocol.ts              The client/server message shapes shared with mock-server/
  App.tsx, main.tsx, index.css
mock-server/
  server.mjs               A real ws WebSocketServer; broadcasts authoritative alert_update
                            and claim_rejected messages
  alertEngine.mjs           Pure claim/confirm/resolve state transition logic, used by the
                            server and unit-tested directly
scripts/check-a11y.mjs     The WCAG AA contrast and target-size checker (18/18 components)
src/__tests__/             Vitest + Testing Library: component tests, reducer/queue unit
                            tests, and a real-network mock-server integration test (see
                            Limitations)
```

### Why optimistic claim, not wait-for-server

A caregiver tapping "Claim" needs to see it land immediately; waiting on a round trip before showing any feedback is the wrong trade for a floor interface. `alertsReducer` applies the claim locally the instant it is tapped, tagged with a `clientActionId`, and reconciles it against whatever the server actually decides: if another caregiver's claim landed first, the server's `claim_rejected` message rolls the local optimistic state back to the real one rather than leaving two caregivers both believing they hold the alert.

### Why the offline queue dedups by client action id, not just by time

A "building dead zone" does not just drop the connection, it can also drop the acknowledgment for an action that already landed on the server before the drop. `offlineQueue` and `useAlertSocket`'s drain path track `clientActionId` so a replayed action that the server already applied is recognized as already-processed and does not re-fire the transition, rather than trusting that a queued action never landed just because its ack never arrived.

## Validation

`npm test` (Vitest + Testing Library, jsdom): 42 tests passed, 2 skipped (see Limitations), across component rendering, the optimistic-claim and offline-queue reducers, and the pure `alertEngine` transition logic. Raw output: `docs/test_output.txt`.

`node --experimental-strip-types scripts/check-a11y.mjs`: 18 of 18 components pass WCAG AA contrast (4.5:1 normal text, 3:1 large text) and 44x44 CSS px interactive target sizes. Raw output: `docs/a11y_output.txt`.

## Findings

**`pathToFileURL(process.argv[1])` throws when `argv[1]` is undefined, and it was undefined more often than expected.** `mock-server/server.mjs`'s `isMain` check, used to decide whether to auto-start the server when run standalone, called `pathToFileURL(process.argv[1])` unconditionally. Under `node -e` and inside some test/tooling invocations, `process.argv[1]` is `undefined`, and `pathToFileURL(undefined)` throws immediately at module load, which surfaced as the mock-server integration tests hanging in `beforeEach` rather than failing cleanly, since the import error happened inside an awaited promise chain. The fix guards on `process.argv[1] !== undefined` before comparing it. A second, unrelated issue found in the same debugging pass: the test and a standalone verification script both connected to `ws://localhost:${port}`, which resolves to `::1` (IPv6) first on this machine and hung indefinitely against a server listening on the IPv4-only default; switching to `ws://127.0.0.1:${port}` fixed the connection immediately. Both fixes are real and are in this repository; see Limitations for why the two real-network tests are still skipped here regardless.

## Measured results

Machine: Windows 11, Node v22.17.1, npm 10.9.2.

| Claim | Measured |
|---|---|
| Live board with optimistic claim and server-side conflict resolution | Verified: `alertEngine.applyClientAction` rejects a second claim from a different user with the actual claimant named; reducer tests confirm local rollback on rejection |
| Offline queue that survives building dead zones | Verified: `offlineQueue` tests confirm enqueue-while-disconnected, ordered replay on reconnect, and dedup of an already-landed action by `clientActionId` |
| **WCAG AA contrast and target sizes verified across all 18 components** | **18/18** components pass, 0 failures |
| Written with AI coding assistants and gated behind the same tests and review as hand-written code | True: this repository is written by an AI coding assistant and every change passes `npm run build` and `npm test` before being considered done |

## Building and running

```
npm install
npm run mock-server      # starts the mock WebSocket backend on ws://localhost:8787
npm run dev               # starts the console on http://localhost:5174, in a second terminal
npm test                  # 42 passed, 2 skipped
node --experimental-strip-types scripts/check-a11y.mjs   # 18/18
npm run build              # tsc -b && vite build
```

## Sibling comparison

[`supply-chain-disruption-console`](https://github.com/Manas103/supply-chain-disruption-console) shares the React 18, TypeScript, and Vite stack, with a real audited action layer and full lineage from every at-risk order back to its source rows: a genuine credential in the same technology. It is an analyst console over a batch object model, refreshed on demand; this console is a real-time floor interface that has to keep working through a dropped connection and has an automated accessibility gate the other repository does not carry, because the two consoles are built for different users under different constraints, not different skill levels.

## Limitations

- The two real-network scenarios in `src/__tests__/mockServer.integration.test.ts` (the claim race and the offline-queue replay, both against the actual `mock-server/`, not a fake) are marked `.skip` in this build environment. Vitest's forked/threaded worker pool cannot open a real listening TCP socket here, even after both real bugs above were fixed, and even with `--pool=forks` (the worker process is killed the instant it tries: `Worker exited unexpectedly`); the identical server and client code connects correctly outside Vitest, in a plain `node` process, confirming this is a property of this sandboxed machine's worker isolation, not of the application code. On an unrestricted machine, removing `.skip` exercises both scenarios for real; the logic they would prove is otherwise covered by the pure-function unit tests on `alertEngine` and `offlineQueue`.
- The WCAG check reads declared values, not rendered pixels; see Honest framing.
- No real resident, caregiver, or facility data exists anywhere in this repository.
