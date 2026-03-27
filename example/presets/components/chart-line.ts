import type { MiniToolUiExamplePayloadTarget } from "../types.js";

export function applyChartLineInitialPayload(element: MiniToolUiExamplePayloadTarget) {
  element.payload = {
    id: "chart-performance",
    type: "line",
    title: "System Performance",
    description: "CPU and Memory usage over time",
    data: [
      { time: "00:00", cpu: 45, memory: 62 },
      { time: "04:00", cpu: 32, memory: 58 },
      { time: "08:00", cpu: 67, memory: 71 },
      { time: "12:00", cpu: 89, memory: 85 },
      { time: "16:00", cpu: 76, memory: 79 },
      { time: "20:00", cpu: 54, memory: 68 },
    ],
    xKey: "time",
    series: [
      { key: "cpu", label: "CPU %" },
      { key: "memory", label: "Memory %" },
    ],
    showLegend: true,
    showGrid: true,
  };
}
