/** Single source of truth for every text/background color pair the console
 * renders. `index.css` hand-mirrors these hex values in its rules (CSS
 * cannot import a TS module without a build step), and `scripts/check-a11y.mjs`
 * imports this file directly and checks every pair against WCAG AA. If you
 * change a color here, change it in `index.css` too, or the a11y check will
 * be validating colors the app no longer renders. */

export const colors = {
  appBg: "#f8fafc",
  cardBg: "#ffffff",
  border: "#d8dee6",

  textPrimary: "#0f172a",
  textMuted: "#475569",

  headerBg: "#0f172a",
  headerText: "#ffffff",

  primaryBg: "#1d4ed8",
  primaryText: "#ffffff",

  destructiveBg: "#b91c1c",
  destructiveText: "#ffffff",

  neutralBg: "#e2e8f0",
  neutralText: "#334155",

  state: {
    raised: { bg: "#fee2e2", text: "#991b1b" },
    claimed: { bg: "#fef3c7", text: "#92400e" },
    confirmed: { bg: "#dbeafe", text: "#1e40af" },
    resolved: { bg: "#dcfce7", text: "#166534" },
  },

  connection: {
    open: { bg: "#dcfce7", text: "#166534" },
    reconnecting: { bg: "#fef3c7", text: "#92400e" },
    closed: { bg: "#fee2e2", text: "#991b1b" },
  },

  escalationBg: "#7f1d1d",
  escalationText: "#ffffff",

  conflictBg: "#fef2f2",
  conflictText: "#7f1d1d",

  queueBg: "#fef3c7",
  queueText: "#92400e",

  toast: {
    success: { bg: "#166534", text: "#ffffff" },
    error: { bg: "#991b1b", text: "#ffffff" },
    info: { bg: "#1e3a8a", text: "#ffffff" },
  },
} as const;
