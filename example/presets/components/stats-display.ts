import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyStatsDisplayInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "stats-display-business-metrics",
    title: "Q4 Performance",
    description: "October through December 2024",
    stats: [
      {
        key: "revenue",
        label: "Revenue",
        value: 847300,
        format: { kind: "currency", currency: "USD", decimals: 0 },
        sparkline: {
          data: [72000, 68000, 74000, 81000, 78000, 85000, 89000, 91000, 86000, 94000, 97000, 102000],
          color: "var(--chart-1)",
        },
        diff: { value: 12.4, decimals: 1 },
      },
      {
        key: "active-users",
        label: "Active Users",
        value: 24890,
        format: { kind: "number", compact: true },
        sparkline: {
          data: [18200, 19100, 19800, 20400, 21200, 21900, 22600, 23100, 23800, 24200, 24500, 24890],
          color: "var(--chart-3)",
        },
        diff: { value: 8.2, decimals: 1 },
      },
      {
        key: "churn",
        label: "Churn Rate",
        value: 2.1,
        format: { kind: "percent", decimals: 1, basis: "unit" },
        sparkline: {
          data: [3.2, 3.0, 2.8, 2.9, 2.7, 2.5, 2.4, 2.3, 2.2, 2.1, 2.1, 2.1],
          color: "var(--chart-4)",
        },
        diff: { value: -0.8, decimals: 1, upIsPositive: false },
      },
      {
        key: "nps",
        label: "NPS Score",
        value: 72,
        format: { kind: "number" },
        sparkline: {
          data: [58, 61, 64, 62, 65, 68, 66, 69, 70, 71, 71, 72],
          color: "var(--chart-5)",
        },
        diff: { value: 5.0, decimals: 0 },
      },
    ],
  };
}
