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

export interface SamplerOptions {
  /**
   * When true (default), force full GC before the first and last sample
   * via CDP HeapProfiler.collectGarbage. Makes heap deltas reflect
   * retained memory rather than allocations-minus-collected-yet.
   * GC happens outside sampling windows so it doesn't bias CPU%.
   */
  endpointGc?: boolean;
}

type CdpMetric = { name: string; value: number };

// CDP's Performance.metrics reports *Duration values in seconds. We store ms
// throughout so downstream math and display are unit-consistent.
export async function startMetricsSampler(
  page: Page,
  intervalMs: number,
  options: SamplerOptions = {},
): Promise<MetricsSampler> {
  const { endpointGc = true } = options;
  const client = await page.context().newCDPSession(page);
  await client.send("Performance.enable");
  if (endpointGc) {
    await client.send("HeapProfiler.enable");
    await client.send("HeapProfiler.collectGarbage");
  }

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
        if (endpointGc) {
          await client.send("HeapProfiler.collectGarbage");
        }
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
  /** Mean CPU% over the full window. */
  cpuPct: number;
  /** Max CPU% over any single sampling interval (noisier, finer-grained). */
  peakCpuPct: number;
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

  // Per-interval peak: max of (ΔtaskDuration / Δt) over adjacent samples.
  // Noisy at short intervals; useful for spotting worst-case frame cost.
  let peakCpuPct = 0;
  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    const dt = curr.t - prev.t;
    if (dt <= 0) continue;
    const intervalPct =
      ((curr.taskDurationMs - prev.taskDurationMs) / dt) * 100;
    if (intervalPct > peakCpuPct) peakCpuPct = intervalPct;
  }

  return {
    app,
    scenario,
    durationMs,
    cpuPct: pct("taskDurationMs"),
    peakCpuPct,
    scriptPct: pct("scriptDurationMs"),
    layoutPct: pct("layoutDurationMs"),
    recalcStylePct: pct("recalcStyleDurationMs"),
    heapDeltaMb: (last.jsHeapUsedBytes - first.jsHeapUsedBytes) / (1024 * 1024),
    samples,
  };
}
