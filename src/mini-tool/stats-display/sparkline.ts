import { type CSSResultGroup, nothing, svg, type TemplateResult, unsafeCSS } from "lit";
import sparklineStylesText from "./sparkline.css?inline";

export interface SparklineProps {
  id: string;
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  showFill?: boolean;
  fillOpacity?: number;
  animationDelayMs?: number;
}

export const sparklineStyles: CSSResultGroup = unsafeCSS(sparklineStylesText);

export function Sparkline({
  id,
  data,
  color = "currentColor",
  width = 64,
  height = 24,
  showFill = false,
  fillOpacity = 0.09,
  animationDelayMs = 0,
}: SparklineProps): TemplateResult {
  if (data.length < 2) {
    return svg``;
  }

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const linePoints = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - minVal) / range) * height;
    return { x, y };
  });

  const linePointsString = linePoints.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPointsString = [
    `0,${height}`,
    ...linePoints.map((point) => `${point.x},${point.y}`),
    `${width},${height}`,
  ].join(" ");
  const gradientId = `sparkline-gradient-${id}`;

  const baseStrokeOpacity = Math.min(0.2, Math.max(0.12, fillOpacity * 1.6));
  const overlayStrokeOpacity = Math.min(0.26, Math.max(baseStrokeOpacity + 0.02, fillOpacity * 2.2));

  return svg`
    <svg
      viewBox=${`0 0 ${width} ${height}`}
      aria-hidden="true"
      preserveAspectRatio="none"
      class="sparkline"
      style=${`--sparkline-base-delay: ${animationDelayMs}ms;`}
    >
      ${
        showFill
          ? svg`
            <defs>
              <linearGradient id=${gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color=${color} stop-opacity=${String(fillOpacity)} />
                <stop offset="100%" stop-color=${color} stop-opacity="0" />
              </linearGradient>
            </defs>
            <polygon points=${areaPointsString} fill=${`url(#${gradientId})`} class="sparkline-fill" />
          `
          : nothing
      }
      <polyline
        points=${linePointsString}
        fill="none"
        stroke=${color}
        stroke-width="1"
        stroke-opacity=${String(baseStrokeOpacity)}
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
      <polyline
        points=${linePointsString}
        fill="none"
        stroke=${color}
        stroke-width="0.9"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
        stroke-opacity=${String(overlayStrokeOpacity)}
        class="sparkline-line"
      />
    </svg>
  `;
}
