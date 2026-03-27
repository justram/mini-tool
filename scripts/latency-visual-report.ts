import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

type WorkRow = {
  component: string;
  contractSourceUs: string;
  contractMiniUs: string;
  contractDiffPct: string;
  contractGate: string;
  setupSourceMs: string;
  setupMiniMs: string;
  setupDiffPct: string;
  firstPaintWorkSourceMs: string;
  firstPaintWorkMiniMs: string;
  firstPaintWorkDiffPct: string;
  refreshWorkSourceMs: string;
  refreshWorkMiniMs: string;
  refreshWorkDiffPct: string;
};

type TotalRow = {
  component: string;
  setupSourceMs: number | null;
  setupMiniMs: number | null;
  setupDiffPct: number | null;
  firstPaintTotalSourceMs: number | null;
  firstPaintTotalMiniMs: number | null;
  firstPaintTotalDiffPct: number | null;
  refreshTotalSourceMs: number | null;
  refreshTotalMiniMs: number | null;
  refreshTotalDiffPct: number | null;
};

type Args = {
  input?: string;
  output?: string;
  open: boolean;
};

type RuntimeArtifact = {
  metrics?: {
    defineReadyMs?: { mean?: number };
    mountTotalAvgMs?: { mean?: number };
    updateTotalAvgMs?: { mean?: number };
  };
};

function parseArgs(argv: string[]): Args {
  const map = new Map<string, string>();
  const flags = new Set<string>();

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token?.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      flags.add(key);
      continue;
    }

    map.set(key, next);
    index += 1;
  }

  return {
    input: map.get("input"),
    output: map.get("output"),
    open: !flags.has("no-open"),
  };
}

function latestOverviewPath(): string {
  const dir = resolve(process.cwd(), "docs", "migrations", "artifacts");
  const files = readdirSync(dir)
    .filter((name) => /^overview-latency-breakdown-\d+\.md$/.test(name))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    throw new Error(`No overview latency artifact found in ${dir}`);
  }

  return join(dir, files[files.length - 1]);
}

function parseWorkRows(markdown: string): WorkRow[] {
  const rows: WorkRow[] = [];

  for (const line of markdown.split("\n")) {
    if (!line.startsWith("| ") || line.startsWith("|---") || line.includes("Component |")) {
      continue;
    }

    const columns = line
      .split("|")
      .slice(1, -1)
      .map((part) => part.trim());

    if (columns.length !== 14) {
      continue;
    }

    rows.push({
      component: columns[0],
      contractSourceUs: columns[1],
      contractMiniUs: columns[2],
      contractDiffPct: columns[3],
      contractGate: columns[4],
      setupSourceMs: columns[5],
      setupMiniMs: columns[6],
      setupDiffPct: columns[7],
      firstPaintWorkSourceMs: columns[8],
      firstPaintWorkMiniMs: columns[9],
      firstPaintWorkDiffPct: columns[10],
      refreshWorkSourceMs: columns[11],
      refreshWorkMiniMs: columns[12],
      refreshWorkDiffPct: columns[13],
    });
  }

  return rows;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function latestRuntimeArtifactPath(runtimeDir: string, variant: "mini" | "source", component: string): string | null {
  const escaped = escapeRegex(component);
  const files = readdirSync(runtimeDir)
    .filter((name) => new RegExp(`^runtime-${variant}-${escaped}-\\d+\\.json$`).test(name))
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    return null;
  }

  return join(runtimeDir, files[files.length - 1]);
}

function numericOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pctDiff(miniValue: number | null, sourceValue: number | null): number | null {
  if (miniValue === null || sourceValue === null || sourceValue === 0) {
    return null;
  }

  return ((miniValue - sourceValue) / sourceValue) * 100;
}

function collectTotalRows(workRows: WorkRow[]): TotalRow[] {
  const runtimeDir = resolve(process.cwd(), "benchmarks", "results", "runtime");

  return workRows.map((row) => {
    const miniPath = latestRuntimeArtifactPath(runtimeDir, "mini", row.component);
    const sourcePath = latestRuntimeArtifactPath(runtimeDir, "source", row.component);

    const miniData: RuntimeArtifact | null = miniPath ? JSON.parse(readFileSync(miniPath, "utf8")) : null;
    const sourceData: RuntimeArtifact | null = sourcePath ? JSON.parse(readFileSync(sourcePath, "utf8")) : null;

    const setupMiniMs = numericOrNull(miniData?.metrics?.defineReadyMs?.mean);
    const setupSourceMs = numericOrNull(sourceData?.metrics?.defineReadyMs?.mean);

    const firstPaintTotalMiniMs = numericOrNull(miniData?.metrics?.mountTotalAvgMs?.mean);
    const firstPaintTotalSourceMs = numericOrNull(sourceData?.metrics?.mountTotalAvgMs?.mean);

    const refreshTotalMiniMs = numericOrNull(miniData?.metrics?.updateTotalAvgMs?.mean);
    const refreshTotalSourceMs = numericOrNull(sourceData?.metrics?.updateTotalAvgMs?.mean);

    return {
      component: row.component,
      setupSourceMs,
      setupMiniMs,
      setupDiffPct: pctDiff(setupMiniMs, setupSourceMs),
      firstPaintTotalSourceMs,
      firstPaintTotalMiniMs,
      firstPaintTotalDiffPct: pctDiff(firstPaintTotalMiniMs, firstPaintTotalSourceMs),
      refreshTotalSourceMs,
      refreshTotalMiniMs,
      refreshTotalDiffPct: pctDiff(refreshTotalMiniMs, refreshTotalSourceMs),
    };
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMaybe(value: number | null, digits = 3): string {
  if (value === null) {
    return "n/a";
  }

  return value.toFixed(digits);
}

function diffPill(value: string | number | null): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (numeric === null || !Number.isFinite(numeric)) {
    return '<span class="pill na">n/a</span>';
  }

  const className = numeric < -5 ? "good" : numeric <= 5 ? "neutral" : "bad";
  const label = `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
  return `<span class="pill ${className}">${label}</span>`;
}

function renderWorkTable(rows: WorkRow[]): string {
  return rows
    .map((row) => {
      const gateClass = row.contractGate === "PASS" ? "good" : "bad";
      return [
        "<tr>",
        `<td class="sticky component"><code>${escapeHtml(row.component)}</code></td>`,
        `<td class="num group-contract">${escapeHtml(row.contractSourceUs)}</td>`,
        `<td class="num group-contract">${escapeHtml(row.contractMiniUs)}</td>`,
        `<td class="num group-contract">${diffPill(row.contractDiffPct)}</td>`,
        `<td class="group-contract"><span class="pill ${gateClass}">${escapeHtml(row.contractGate)}</span></td>`,
        `<td class="num group-setup">${escapeHtml(row.setupSourceMs)}</td>`,
        `<td class="num group-setup">${escapeHtml(row.setupMiniMs)}</td>`,
        `<td class="num group-setup">${diffPill(row.setupDiffPct)}</td>`,
        `<td class="num group-paint">${escapeHtml(row.firstPaintWorkSourceMs)}</td>`,
        `<td class="num group-paint">${escapeHtml(row.firstPaintWorkMiniMs)}</td>`,
        `<td class="num group-paint">${diffPill(row.firstPaintWorkDiffPct)}</td>`,
        `<td class="num group-refresh">${escapeHtml(row.refreshWorkSourceMs)}</td>`,
        `<td class="num group-refresh">${escapeHtml(row.refreshWorkMiniMs)}</td>`,
        `<td class="num group-refresh">${diffPill(row.refreshWorkDiffPct)}</td>`,
        "</tr>",
      ].join("");
    })
    .join("\n");
}

function renderTotalTable(rows: TotalRow[]): string {
  return rows
    .map((row) => {
      return [
        "<tr>",
        `<td class="sticky component"><code>${escapeHtml(row.component)}</code></td>`,
        `<td class="num group-setup">${formatMaybe(row.setupSourceMs)}</td>`,
        `<td class="num group-setup">${formatMaybe(row.setupMiniMs)}</td>`,
        `<td class="num group-setup">${diffPill(row.setupDiffPct)}</td>`,
        `<td class="num group-paint">${formatMaybe(row.firstPaintTotalSourceMs)}</td>`,
        `<td class="num group-paint">${formatMaybe(row.firstPaintTotalMiniMs)}</td>`,
        `<td class="num group-paint">${diffPill(row.firstPaintTotalDiffPct)}</td>`,
        `<td class="num group-refresh">${formatMaybe(row.refreshTotalSourceMs)}</td>`,
        `<td class="num group-refresh">${formatMaybe(row.refreshTotalMiniMs)}</td>`,
        `<td class="num group-refresh">${diffPill(row.refreshTotalDiffPct)}</td>`,
        "</tr>",
      ].join("");
    })
    .join("\n");
}

function renderHtml(inputPath: string, workRows: WorkRow[], totalRows: TotalRow[]): string {
  const workTableRows = renderWorkTable(workRows);
  const totalTableRows = renderTotalTable(totalRows);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mini-Tool Lifecycle Benchmark Report</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
:root { --bg:#0b1020; --panel:#121933; --line:#2a3763; --text:#ecf1ff; --muted:#9eb0dd; --contract:#7aa2ff22; --setup:#36d39922; --paint:#f59e0b22; --refresh:#f472b622; --good:#22c55e; --goodbg:#123b27; --bad:#fb7185; --badbg:#4a1f2a; --neutral:#fbbf24; --neutralbg:#4a3a17; --na:#9ca3af; --nabd:#374151; }
@media (prefers-color-scheme: light) {
  :root { --bg:#f4f7ff; --panel:#ffffff; --line:#dbe4ff; --text:#0f1730; --muted:#5e6f96; --contract:#dbe8ff; --setup:#ddf8ef; --paint:#fff2d8; --refresh:#ffe1ef; --good:#0f8f5f; --goodbg:#def7eb; --bad:#c33d4a; --badbg:#fde8eb; --neutral:#a16207; --neutralbg:#fff1cc; --na:#6b7280; --nabd:#eef2f7; }
}
* { box-sizing: border-box; }
body { margin:0; background:radial-gradient(1100px 420px at 12% -12%, #5b7cfa33, transparent), var(--bg); color:var(--text); font-family:Manrope,system-ui,sans-serif; }
.wrap { max-width:1560px; margin:0 auto; padding:24px; }
.hero { background:var(--panel); border:1px solid var(--line); border-radius:18px; padding:16px 18px; }
.hero h1 { margin:0; font-size:1.42rem; letter-spacing:.2px; }
.hero p { margin:.35rem 0 0; color:var(--muted); }
.legend { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.chip { padding:4px 10px; border-radius:999px; font-size:.78rem; font-weight:700; border:1px solid var(--line); }
.chip.contract { background:var(--contract); }
.chip.setup { background:var(--setup); }
.chip.paint { background:var(--paint); }
.chip.refresh { background:var(--refresh); }
.tabs { margin-top:12px; display:flex; gap:8px; }
.tab-button { border:1px solid var(--line); background:transparent; color:var(--text); border-radius:10px; padding:8px 12px; font-weight:700; cursor:pointer; }
.tab-button.active { background:var(--contract); }
.tab-panel { display:none; }
.tab-panel.active { display:block; }
.table-wrap { margin-top:14px; background:var(--panel); border:1px solid var(--line); border-radius:18px; overflow:auto; }
table { width:100%; border-collapse:separate; border-spacing:0; }
table.work { min-width:1760px; }
table.total { min-width:1360px; }
th, td { padding:9px 10px; border-bottom:1px solid var(--line); }
thead tr.group th { position:sticky; top:0; z-index:4; font-size:.8rem; text-transform:uppercase; letter-spacing:.04em; background:var(--panel); }
.unit-inline { text-transform:none; }
thead tr.cols th { position:sticky; top:35px; z-index:3; font-size:.76rem; background:var(--panel); color:var(--muted); }
.group-contract-header { background:linear-gradient(0deg,var(--contract),transparent); }
.group-setup-header { background:linear-gradient(0deg,var(--setup),transparent); }
.group-paint-header { background:linear-gradient(0deg,var(--paint),transparent); }
.group-refresh-header { background:linear-gradient(0deg,var(--refresh),transparent); }
.group-contract { background:color-mix(in oklab,var(--contract) 65%, transparent); }
.group-setup { background:color-mix(in oklab,var(--setup) 65%, transparent); }
.group-paint { background:color-mix(in oklab,var(--paint) 65%, transparent); }
.group-refresh { background:color-mix(in oklab,var(--refresh) 65%, transparent); }
.num { text-align:right; font-variant-numeric:tabular-nums; }
.component code { font-family:'JetBrains Mono',monospace; font-size:.84rem; }
.sticky { position:sticky; left:0; background:var(--panel); z-index:2; }
.pill { display:inline-block; padding:2px 8px; border-radius:999px; font-size:.72rem; font-weight:800; }
.pill.good { color:var(--good); background:var(--goodbg); }
.pill.bad { color:var(--bad); background:var(--badbg); }
.pill.neutral { color:var(--neutral); background:var(--neutralbg); }
.pill.na { color:var(--na); background:var(--nabd); }
.note { margin-top:10px; color:var(--muted); font-size:.84rem; }
.methodology-wrap { margin-top:14px; background:var(--panel); border:1px solid var(--line); border-radius:18px; overflow:auto; }
table.method { min-width:980px; }
.method-col { color:var(--muted); font-size:.8rem; }
</style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>Lifecycle Benchmark Report</h1>
      <p>Tool-UI vs Mini-Tool with grouped latency phases.<br>Artifact: <code>${escapeHtml(inputPath)}</code></p>
      <div class="legend">
        <span class="chip contract">Input Contract Check</span>
        <span class="chip setup">Setup Ready</span>
        <span class="chip paint">First Paint</span>
        <span class="chip refresh">Data Refresh</span>
      </div>
      <div class="tabs">
        <button type="button" class="tab-button active" data-tab="work">Work View (default)</button>
        <button type="button" class="tab-button" data-tab="total">Total Latency View</button>
        <button type="button" class="tab-button" data-tab="methodology">Methodology</button>
      </div>
    </section>

    <section id="tab-work" class="tab-panel active">
      <div class="table-wrap">
        <table class="work">
          <thead>
            <tr class="group">
              <th rowspan="2" class="sticky">Component</th>
              <th colspan="4" class="group-contract-header">Input Contract Check (<span class="unit-inline">μs</span>)</th>
              <th colspan="3" class="group-setup-header">Setup Ready (ms)</th>
              <th colspan="3" class="group-paint-header">First Paint Work (ms)</th>
              <th colspan="3" class="group-refresh-header">Data Refresh Work (ms)</th>
            </tr>
            <tr class="cols">
              <th class="group-contract num">Tool-UI</th>
              <th class="group-contract num">Mini-Tool</th>
              <th class="group-contract num">Diff (%)</th>
              <th class="group-contract">Gate</th>
              <th class="group-setup num">Tool-UI</th>
              <th class="group-setup num">Mini-Tool</th>
              <th class="group-setup num">Diff (%)</th>
              <th class="group-paint num">Tool-UI</th>
              <th class="group-paint num">Mini-Tool</th>
              <th class="group-paint num">Diff (%)</th>
              <th class="group-refresh num">Tool-UI</th>
              <th class="group-refresh num">Mini-Tool</th>
              <th class="group-refresh num">Diff (%)</th>
            </tr>
          </thead>
          <tbody>
${workTableRows}
          </tbody>
        </table>
      </div>
      <p class="note">Work View is the primary code-level comparison. Input Contract Check columns are in μs; Setup/First Paint/Data Refresh columns are in ms. Frame-cadence wait is excluded for First Paint and Data Refresh Work.</p>
    </section>

    <section id="tab-total" class="tab-panel">
      <div class="table-wrap">
        <table class="total">
          <thead>
            <tr class="group">
              <th rowspan="2" class="sticky">Component</th>
              <th colspan="3" class="group-setup-header">Setup Ready Total (ms)</th>
              <th colspan="3" class="group-paint-header">First Paint Total (ms)</th>
              <th colspan="3" class="group-refresh-header">Data Refresh Total (ms)</th>
            </tr>
            <tr class="cols">
              <th class="group-setup num">Tool-UI</th>
              <th class="group-setup num">Mini-Tool</th>
              <th class="group-setup num">Diff (%)</th>
              <th class="group-paint num">Tool-UI</th>
              <th class="group-paint num">Mini-Tool</th>
              <th class="group-paint num">Diff (%)</th>
              <th class="group-refresh num">Tool-UI</th>
              <th class="group-refresh num">Mini-Tool</th>
              <th class="group-refresh num">Diff (%)</th>
            </tr>
          </thead>
          <tbody>
${totalTableRows}
          </tbody>
        </table>
      </div>
      <p class="note">Total View includes frame scheduling wait and is the closest proxy for user-perceived settle latency.</p>
    </section>

    <section id="tab-methodology" class="tab-panel">
      <div class="methodology-wrap">
        <table class="method">
          <thead>
            <tr class="group">
              <th>Report item</th>
              <th>What it measures</th>
              <th>How it is measured</th>
              <th>Unit</th>
              <th>Why it matters</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="group-contract"><strong>Input Contract Check</strong></td>
              <td>Schema parse/validation only (no import/render/layout/paint).</td>
              <td class="method-col">Measured by <code>benchmark:compare</code> with hyperfine. Each run executes <code>contract-task.ts</code>; per-iteration latency = command mean runtime / iterations.</td>
              <td class="num group-contract">μs</td>
              <td>Isolates contract safety overhead.</td>
            </tr>
            <tr>
              <td class="group-setup"><strong>Setup Ready (defineReadyMs)</strong></td>
              <td>Runtime setup readiness (module import/evaluation and registration), not schema validation.</td>
              <td class="method-col">Measured in browser runtime harness before benchmark sampling begins.</td>
              <td class="num group-setup">ms</td>
              <td>Captures cold-start readiness before first instance render.</td>
            </tr>
            <tr>
              <td class="group-paint"><strong>First Paint Work</strong></td>
              <td>Mount/update work only for the first render cycle.</td>
              <td class="method-col">In-page <code>performance.now()</code> bracket around render work; excludes frame wait.</td>
              <td class="num group-paint">ms</td>
              <td>Primary implementation-level signal for initial render efficiency.</td>
            </tr>
            <tr>
              <td class="group-paint"><strong>First Paint Frame Wait</strong></td>
              <td>Delay from work completion to next frame boundary.</td>
              <td class="method-col">Measured via next-frame scheduling in runtime harness.</td>
              <td class="num group-paint">ms</td>
              <td>Separates scheduler/frame-cadence effects from component work.</td>
            </tr>
            <tr>
              <td class="group-paint"><strong>First Paint Total</strong></td>
              <td>User-visible settle latency for initial render.</td>
              <td class="method-col">Computed as <code>First Paint Work + First Paint Frame Wait</code>.</td>
              <td class="num group-paint">ms</td>
              <td>Best proxy for perceived first render latency.</td>
            </tr>
            <tr>
              <td class="group-refresh"><strong>Data Refresh Work</strong></td>
              <td>Work-only latency for update/render after payload change.</td>
              <td class="method-col">In-page <code>performance.now()</code> bracket around update work; excludes frame wait.</td>
              <td class="num group-refresh">ms</td>
              <td>Primary implementation-level signal for steady-state updates.</td>
            </tr>
            <tr>
              <td class="group-refresh"><strong>Data Refresh Frame Wait</strong></td>
              <td>Delay from update work completion to next frame boundary.</td>
              <td class="method-col">Measured via next-frame scheduling in runtime harness.</td>
              <td class="num group-refresh">ms</td>
              <td>Shows environment/scheduler jitter impact during updates.</td>
            </tr>
            <tr>
              <td class="group-refresh"><strong>Data Refresh Total</strong></td>
              <td>User-visible settle latency for updates.</td>
              <td class="method-col">Computed as <code>Data Refresh Work + Data Refresh Frame Wait</code>.</td>
              <td class="num group-refresh">ms</td>
              <td>Best proxy for perceived update responsiveness.</td>
            </tr>
            <tr>
              <td><strong>Diff (%)</strong></td>
              <td>Relative change of Mini-Tool vs Tool-UI baseline.</td>
              <td class="method-col"><code>(mini - source) / source * 100</code></td>
              <td class="num">%</td>
              <td>Negative values indicate Mini-Tool is faster.</td>
            </tr>
            <tr>
              <td><strong>Contract Gate</strong></td>
              <td>Threshold decision for parse/validation overhead.</td>
              <td class="method-col">PASS/FAIL from compare gate policy threshold on contract diff.</td>
              <td class="num">status</td>
              <td>Quick policy signal for migration readiness.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="note">Interpretation rule: compare Work metrics first for implementation decisions; then use Total metrics for perceived latency trade-offs.</p>
    </section>

    <p class="note">Diff (%) = (mini - source) / source * 100. Negative means Mini-Tool is faster.</p>
  </div>
<script>
  const buttons = [...document.querySelectorAll('.tab-button')];
  const panels = {
    work: document.getElementById('tab-work'),
    total: document.getElementById('tab-total'),
    methodology: document.getElementById('tab-methodology'),
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const tab = button.getAttribute('data-tab');
      if (!tab || !(tab in panels)) {
        return;
      }

      for (const other of buttons) {
        other.classList.toggle('active', other === button);
      }

      for (const [name, panel] of Object.entries(panels)) {
        panel?.classList.toggle('active', name === tab);
      }
    });
  }
</script>
</body>
</html>`;
}

function openFile(path: string): void {
  const command = process.platform === "darwin" ? "open" : process.platform === "linux" ? "xdg-open" : null;
  if (!command) {
    return;
  }

  spawnSync(command, [path], { stdio: "ignore" });
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = args.input ? resolve(process.cwd(), args.input) : latestOverviewPath();

  const markdown = readFileSync(inputPath, "utf8");
  const workRows = parseWorkRows(markdown);

  if (workRows.length === 0) {
    throw new Error(`No benchmark rows found in ${inputPath}`);
  }

  const totalRows = collectTotalRows(workRows);

  const defaultOutputDir = join(homedir(), ".agent", "diagrams");
  mkdirSync(defaultOutputDir, { recursive: true });

  const outputPath = args.output
    ? resolve(process.cwd(), args.output)
    : join(defaultOutputDir, `mini-tool-benchmark-lifecycle-${Date.now()}.html`);

  writeFileSync(outputPath, renderHtml(inputPath, workRows, totalRows));

  if (args.open) {
    openFile(outputPath);
  }

  console.log(`Wrote visual report: ${outputPath}`);
}

main();
