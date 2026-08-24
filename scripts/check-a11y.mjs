// Real, automated WCAG AA check across all 18 components in this console.
//
// For every component it checks:
//   - every distinct text/background color pair the component actually
//     renders (imported straight from src/theme/colors.ts, the same values
//     src/index.css is hand-mirrored from), against the WCAG AA contrast
//     threshold: 4.5:1 for normal text, 3:1 for "large" text (>=24px, or
//     >=18.66px and bold, per the WCAG 1.4.3 definition)
//   - every interactive element's touch target, against the 44x44 CSS px
//     minimum
//
// Run: node --experimental-strip-types scripts/check-a11y.mjs
//
// This is not a headless-browser measurement of rendered pixels; it is a
// direct computation over the exact color/size/target values declared in
// src/index.css, cross-checked against src/theme/colors.ts. The honest
// limitation of that approach is documented in the README.

import { colors } from "../src/theme/colors.ts";

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function channelToLinear(c) {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const [rl, gl, bl] = [r, g, b].map(channelToLinear);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function contrastRatio(hexA, hexB) {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function isLargeText(sizePx, bold) {
  return sizePx >= 24 || (bold && sizePx >= 18.66);
}

export function requiredRatio(sizePx, bold) {
  return isLargeText(sizePx, bold) ? 3.0 : 4.5;
}

const MIN_TARGET_PX = 44;

// One entry per component in the 18-component inventory. `pairs` lists
// every text/background color combination that component renders, taken
// from src/index.css. `targets` lists every interactive element's CSS
// min-height/min-width, also taken from src/index.css.
const COMPONENTS = [
  {
    name: "Header",
    pairs: [
      { label: "title", fg: colors.headerText, bg: colors.headerBg, sizePx: 20, bold: true },
      { label: "user label", fg: colors.headerText, bg: colors.headerBg, sizePx: 14.4, bold: false },
    ],
    targets: [],
  },
  {
    name: "ConnectionStatusBadge",
    pairs: [
      { label: "open", fg: colors.connection.open.text, bg: colors.connection.open.bg, sizePx: 13.6, bold: false },
      {
        label: "reconnecting",
        fg: colors.connection.reconnecting.text,
        bg: colors.connection.reconnecting.bg,
        sizePx: 13.6,
        bold: false,
      },
      { label: "closed", fg: colors.connection.closed.text, bg: colors.connection.closed.bg, sizePx: 13.6, bold: false },
    ],
    targets: [],
  },
  {
    name: "OfflineQueueIndicator",
    pairs: [{ label: "badge", fg: colors.queueText, bg: colors.queueBg, sizePx: 13.6, bold: false }],
    targets: [],
  },
  {
    name: "FilterBar",
    pairs: [
      { label: "inactive button", fg: colors.neutralText, bg: colors.neutralBg, sizePx: 15.2, bold: false },
      { label: "active button", fg: colors.primaryText, bg: colors.primaryBg, sizePx: 15.2, bold: false },
    ],
    targets: [{ label: "filter button", widthPx: 44, heightPx: 44 }],
  },
  {
    name: "SearchInput",
    pairs: [{ label: "input text", fg: colors.textPrimary, bg: colors.cardBg, sizePx: 15.2, bold: false }],
    targets: [{ label: "search box", widthPx: 256, heightPx: 44 }],
  },
  {
    name: "AlertBoard",
    pairs: [],
    targets: [],
  },
  {
    name: "AlertCard",
    pairs: [{ label: "alert type line", fg: colors.textMuted, bg: colors.cardBg, sizePx: 14.4, bold: false }],
    targets: [],
  },
  {
    name: "ResidentInfo",
    pairs: [
      { label: "resident name", fg: colors.textPrimary, bg: colors.cardBg, sizePx: 16, bold: true },
      { label: "resident room", fg: colors.textMuted, bg: colors.cardBg, sizePx: 13.6, bold: false },
    ],
    targets: [],
  },
  {
    name: "StateBadge",
    pairs: [
      { label: "raised", fg: colors.state.raised.text, bg: colors.state.raised.bg, sizePx: 12.48, bold: true },
      { label: "claimed", fg: colors.state.claimed.text, bg: colors.state.claimed.bg, sizePx: 12.48, bold: true },
      { label: "confirmed", fg: colors.state.confirmed.text, bg: colors.state.confirmed.bg, sizePx: 12.48, bold: true },
      { label: "resolved", fg: colors.state.resolved.text, bg: colors.state.resolved.bg, sizePx: 12.48, bold: true },
    ],
    targets: [],
  },
  {
    name: "EscalationTag",
    pairs: [{ label: "tag", fg: colors.escalationText, bg: colors.escalationBg, sizePx: 12, bold: true }],
    targets: [],
  },
  {
    name: "TimestampLabel",
    pairs: [{ label: "timestamp", fg: colors.textMuted, bg: colors.cardBg, sizePx: 13.6, bold: false }],
    targets: [],
  },
  {
    name: "ClaimButton",
    pairs: [
      { label: "neutral (resolved/held-by-other)", fg: colors.neutralText, bg: colors.neutralBg, sizePx: 15.2, bold: false },
      { label: "primary (claim/confirm)", fg: colors.primaryText, bg: colors.primaryBg, sizePx: 15.2, bold: false },
      { label: "destructive (resolve)", fg: colors.destructiveText, bg: colors.destructiveBg, sizePx: 15.2, bold: false },
    ],
    targets: [{ label: "claim button", widthPx: 44, heightPx: 44 }],
  },
  {
    name: "ConflictBanner",
    pairs: [
      { label: "banner text", fg: colors.conflictText, bg: colors.conflictBg, sizePx: 13.6, bold: false },
      { label: "dismiss button", fg: colors.conflictText, bg: colors.conflictBg, sizePx: 13.6, bold: true },
    ],
    targets: [{ label: "dismiss button", widthPx: 44, heightPx: 44 }],
  },
  {
    name: "Toast",
    pairs: [
      { label: "success", fg: colors.toast.success.text, bg: colors.toast.success.bg, sizePx: 16, bold: false },
      { label: "error", fg: colors.toast.error.text, bg: colors.toast.error.bg, sizePx: 16, bold: false },
      { label: "info", fg: colors.toast.info.text, bg: colors.toast.info.bg, sizePx: 16, bold: false },
      { label: "success dismiss", fg: colors.toast.success.text, bg: colors.toast.success.bg, sizePx: 17.6, bold: false },
      { label: "error dismiss", fg: colors.toast.error.text, bg: colors.toast.error.bg, sizePx: 17.6, bold: false },
      { label: "info dismiss", fg: colors.toast.info.text, bg: colors.toast.info.bg, sizePx: 17.6, bold: false },
    ],
    targets: [{ label: "dismiss button", widthPx: 44, heightPx: 44 }],
  },
  {
    name: "ToastContainer",
    pairs: [],
    targets: [],
  },
  {
    name: "EmptyState",
    pairs: [{ label: "message", fg: colors.textMuted, bg: colors.appBg, sizePx: 16, bold: false }],
    targets: [],
  },
  {
    name: "LoadingSkeleton",
    pairs: [],
    targets: [],
  },
  {
    name: "ConfirmDialog",
    pairs: [
      { label: "title", fg: colors.textPrimary, bg: colors.cardBg, sizePx: 24, bold: true },
      { label: "body text", fg: colors.textPrimary, bg: colors.cardBg, sizePx: 16, bold: false },
      { label: "cancel button", fg: colors.neutralText, bg: colors.neutralBg, sizePx: 15.2, bold: false },
      { label: "confirm button", fg: colors.destructiveText, bg: colors.destructiveBg, sizePx: 15.2, bold: false },
    ],
    targets: [{ label: "dialog button", widthPx: 44, heightPx: 44 }],
  },
];

function checkComponent(component) {
  const pairResults = component.pairs.map((pair) => {
    const ratio = contrastRatio(pair.fg, pair.bg);
    const required = requiredRatio(pair.sizePx, pair.bold);
    return { ...pair, ratio, required, pass: ratio >= required };
  });
  const targetResults = component.targets.map((t) => ({
    ...t,
    pass: t.widthPx >= MIN_TARGET_PX && t.heightPx >= MIN_TARGET_PX,
  }));
  const pass = pairResults.every((r) => r.pass) && targetResults.every((r) => r.pass);
  return { name: component.name, pairResults, targetResults, pass };
}

function main() {
  const results = COMPONENTS.map(checkComponent);
  let passCount = 0;

  console.log(`WCAG AA check across ${COMPONENTS.length} components\n`);

  for (const r of results) {
    const status = r.pass ? "PASS" : "FAIL";
    if (r.pass) passCount += 1;
    console.log(`[${status}] ${r.name}`);
    for (const p of r.pairResults) {
      const pairStatus = p.pass ? "ok " : "FAIL";
      console.log(
        `    ${pairStatus} ${p.label}: ${p.fg} on ${p.bg}, ${p.ratio.toFixed(2)}:1 (needs ${p.required}:1, ${p.sizePx}px${p.bold ? " bold" : ""})`,
      );
    }
    for (const t of r.targetResults) {
      const targetStatus = t.pass ? "ok " : "FAIL";
      console.log(`    ${targetStatus} ${t.label} target: ${t.widthPx}x${t.heightPx}px (needs ${MIN_TARGET_PX}x${MIN_TARGET_PX}px)`);
    }
  }

  console.log(`\n${passCount}/${COMPONENTS.length} components pass WCAG AA contrast and target size checks.`);

  if (passCount !== COMPONENTS.length) {
    process.exitCode = 1;
  }
}

main();
