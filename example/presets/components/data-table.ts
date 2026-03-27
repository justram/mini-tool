import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyDataTableInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "data-table-stocks",
    columns: [
      { key: "symbol", label: "Symbol", priority: "primary" },
      { key: "name", label: "Company", priority: "primary" },
      {
        key: "price",
        label: "Price",
        align: "right",
        priority: "primary",
        format: { kind: "currency", currency: "USD", decimals: 2 },
      },
      {
        key: "change",
        label: "Change",
        align: "right",
        priority: "secondary",
        format: { kind: "delta", decimals: 2, upIsPositive: true, showSign: true },
      },
      {
        key: "changePercent",
        label: "Change %",
        align: "right",
        priority: "secondary",
        format: { kind: "percent", decimals: 2, showSign: true, basis: "unit" },
      },
      {
        key: "volume",
        label: "Volume",
        align: "right",
        priority: "secondary",
        format: { kind: "number", compact: true },
      },
    ],
    data: [
      {
        symbol: "IBM",
        name: "International Business Machines",
        price: 170.42,
        change: 1.12,
        changePercent: 0.66,
        volume: 18420000,
      },
      {
        symbol: "AAPL",
        name: "Apple",
        price: 178.25,
        change: 2.35,
        changePercent: 1.34,
        volume: 52430000,
      },
      {
        symbol: "MSFT",
        name: "Microsoft",
        price: 380.0,
        change: 1.24,
        changePercent: 0.33,
        volume: 31250000,
      },
      {
        symbol: "INTC",
        name: "Intel Corporation",
        price: 39.85,
        change: -0.42,
        changePercent: -1.04,
        volume: 29840000,
      },
      {
        symbol: "ORCL",
        name: "Oracle Corporation",
        price: 110.31,
        change: 0.78,
        changePercent: 0.71,
        volume: 14230000,
      },
    ],
    rowIdKey: "symbol",
  };
}
