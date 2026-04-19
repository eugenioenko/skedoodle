import type { Page } from "@playwright/test";

export interface MetricSample {
  /** Wall clock ms since sampler started. */
  t: number;
  /** Cumulative CPU time attributed to the page, in ms (all tasks). */
  taskDurationMs: number;
  /** Cumulative JS execution time, in ms. */
  scriptDurationMs: number;
  /** Cumulative layout time, in ms. */
  layoutDurationMs: number;
  /** Cumulative style recalc time, in ms. */
  recalcStyleDurationMs: number;
  /** JS heap used at sample time. */
  jsHeapUsedBytes: number;
}

export interface MetricsSampler {
  stop(): Promise<MetricSample[]>;
}

type CdpMetric = { name: string; value: number };

// CDP's Performance.metrics reports *Duration values in seconds. We store ms
// throughout so downstream math and display are unit-consistent.
export async function startMetricsSampler(
  page: Page,
  intervalMs: number,
): Promise<MetricsSampler> {
  const client = await page.context().newCDPSession(page);
  await client.send("Performance.enable");

  const samples: MetricSample[] = [];
  const startedAt = Date.now();

  const takeSample = async () => {
    const { metrics } = (await client.send("Performance.getMetrics")) as {
      metrics: CdpMetric[];
    };
    const byName = new Map(metrics.map((m) => [m.name, m.value]));
    const sec = (name: string) => (byName.get(name) ?? 0) * 1000;
    samples.push({
      t: Date.now() - startedAt,
      taskDurationMs: sec("TaskDuration"),
      scriptDurationMs: sec("ScriptDuration"),
      layoutDurationMs: sec("LayoutDuration"),
      recalcStyleDurationMs: sec("RecalcStyleDuration"),
      jsHeapUsedBytes: byName.get("JSHeapUsedSize") ?? 0,
    });
  };

  await takeSample();

  let stopped = false;
  const loop = async () => {
    if (stopped) return;
    try {
      await takeSample();
    } catch {
      // Page may close mid-sample during teardown; ignore.
    }
    if (stopped) return;
    timer = setTimeout(loop, intervalMs);
  };
  let timer: ReturnType<typeof setTimeout> = setTimeout(loop, intervalMs);

  return {
    async stop() {
      stopped = true;
      clearTimeout(timer);
      try {
        await takeSample();
        await client.detach();
      } catch {
        // Best-effort cleanup.
      }
      return samples;
    },
  };
}

export interface ScenarioResult {
  app: string;
  scenario: string;
  durationMs: number;
  cpuPct: number;
  scriptPct: number;
  layoutPct: number;
  recalcStylePct: number;
  heapDeltaMb: number;
  samples: MetricSample[];
}

export function summarize(
  app: string,
  scenario: string,
  samples: MetricSample[],
): ScenarioResult {
  if (samples.length < 2) {
    throw new Error(
      `summarize: need at least 2 samples, got ${samples.length}`,
    );
  }
  const first = samples[0];
  const last = samples[samples.length - 1];
  const durationMs = last.t - first.t;
  const pct = (key: keyof MetricSample) =>
    (((last[key] as number) - (first[key] as number)) / durationMs) * 100;
  return {
    app,
    scenario,
    durationMs,
    cpuPct: pct("taskDurationMs"),
    scriptPct: pct("scriptDurationMs"),
    layoutPct: pct("layoutDurationMs"),
    recalcStylePct: pct("recalcStyleDurationMs"),
    heapDeltaMb: (last.jsHeapUsedBytes - first.jsHeapUsedBytes) / (1024 * 1024),
    samples,
  };
}
