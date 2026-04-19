import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ScenarioResult } from "./measure";

export interface Stats {
  median: number;
  min: number;
  max: number;
  p90: number;
}

export interface AggregatedCell {
  app: string;
  scenario: string;
  runs: number;
  durationMs: number;
  cpuPct: Stats;
  peakCpuPct: Stats;
  scriptPct: Stats;
  layoutPct: Stats;
  recalcStylePct: Stats;
  heapDeltaMb: Stats;
  sourceFiles: string[];
}

export interface Aggregate {
  generatedAt: string;
  runsPerCell: number;
  cells: AggregatedCell[];
}

function statsOf(values: number[]): Stats {
  if (values.length === 0) {
    throw new Error("statsOf: empty input");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  // Nearest-rank p90 (fine for small N where linear-interpolated p90 is
  // barely meaningful anyway).
  const p90Idx = Math.min(n - 1, Math.ceil(n * 0.9) - 1);
  return {
    median,
    min: sorted[0],
    max: sorted[n - 1],
    p90: sorted[Math.max(0, p90Idx)],
  };
}

type LoadedResult = ScenarioResult & { _file: string };

export async function readResults(dir: string): Promise<LoadedResult[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const out: LoadedResult[] = [];
  for (const f of files) {
    const raw = await readFile(join(dir, f), "utf8");
    const parsed = JSON.parse(raw) as ScenarioResult;
    out.push({ ...parsed, _file: f });
  }
  return out;
}

/**
 * Group results by (app, scenario), take the most recent `runsPerCell`
 * per cell (by filename timestamp), compute stats.
 */
export function aggregate(
  results: LoadedResult[],
  runsPerCell: number,
): Aggregate {
  const groups = new Map<string, LoadedResult[]>();
  for (const r of results) {
    const key = `${r.app}|${r.scenario}`;
    const list = groups.get(key) ?? [];
    list.push(r);
    groups.set(key, list);
  }

  const cells: AggregatedCell[] = [];
  for (const [key, list] of groups.entries()) {
    const [app, scenario] = key.split("|");
    // Filenames encode ISO timestamps, so lexical sort = chronological.
    list.sort((a, b) => a._file.localeCompare(b._file));
    const recent = list.slice(-runsPerCell);
    const pick = (k: keyof ScenarioResult) =>
      statsOf(recent.map((r) => Number(r[k] ?? 0)));
    cells.push({
      app,
      scenario,
      runs: recent.length,
      durationMs: recent[recent.length - 1].durationMs,
      cpuPct: pick("cpuPct"),
      peakCpuPct: pick("peakCpuPct"),
      scriptPct: pick("scriptPct"),
      layoutPct: pick("layoutPct"),
      recalcStylePct: pick("recalcStylePct"),
      heapDeltaMb: pick("heapDeltaMb"),
      sourceFiles: recent.map((r) => r._file),
    });
  }

  // Stable order: scenario first (idle before draw alphabetically), then app.
  cells.sort((a, b) =>
    a.scenario !== b.scenario
      ? a.scenario.localeCompare(b.scenario)
      : a.app.localeCompare(b.app),
  );

  return {
    generatedAt: new Date().toISOString(),
    runsPerCell,
    cells,
  };
}
