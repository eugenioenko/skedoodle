/**
 * CLI: aggregate results/raw/ into a summary JSON + terminal table.
 *
 * Usage: pnpm --filter skedoodle-perf aggregate [--runs N]
 *
 * Groups raw result files by (app, scenario), takes the most recent N
 * runs per cell, and reports median / min / max / p90.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { aggregate, readResults } from "../lib/aggregate";

const here = dirname(fileURLToPath(import.meta.url));
const RAW_DIR = join(here, "..", "results", "raw");
const OUT_DIR = join(here, "..", "results");

function parseRunsArg(): number {
  const idx = process.argv.indexOf("--runs");
  if (idx >= 0) {
    const v = Number(process.argv[idx + 1]);
    if (!Number.isFinite(v) || v <= 0) {
      throw new Error("--runs must be a positive number");
    }
    return v;
  }
  return Number(process.env.PERF_RUNS ?? "5");
}

const runsPerCell = parseRunsArg();

const results = await readResults(RAW_DIR);
if (results.length === 0) {
  console.error(`No result files found in ${RAW_DIR}`);
  process.exit(1);
}

const summary = aggregate(results, runsPerCell);

// Terminal summary table.
console.log(
  `\nAggregated ${summary.cells.length} cells (last ${runsPerCell} runs per cell):\n`,
);
const header = [
  "app",
  "scenario",
  "N",
  "CPU med",
  "CPU min–max",
  "peak med",
  "heap Δ MB med",
];
const rows: string[][] = [header];
for (const c of summary.cells) {
  rows.push([
    c.app,
    c.scenario,
    String(c.runs),
    `${c.cpuPct.median.toFixed(2)}%`,
    `${c.cpuPct.min.toFixed(2)}–${c.cpuPct.max.toFixed(2)}%`,
    `${c.peakCpuPct.median.toFixed(1)}%`,
    c.heapDeltaMb.median.toFixed(2),
  ]);
}
const widths = header.map((_, i) =>
  Math.max(...rows.map((r) => r[i].length)),
);
for (const r of rows) {
  console.log(r.map((cell, i) => cell.padEnd(widths[i])).join("  "));
}

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const outPath = join(OUT_DIR, `summary-${ts}.json`);
await mkdir(OUT_DIR, { recursive: true });
await writeFile(outPath, JSON.stringify(summary, null, 2));
console.log(`\nWrote ${outPath}`);
