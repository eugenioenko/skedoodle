/**
 * Generate SVG charts from results/baseline.json for article embedding.
 *
 * Emits:
 *   results/charts/idle-cpu.svg  — 4 apps × idle CPU, min–max whiskers
 *   results/charts/draw-cpu.svg  — 4 apps × active-draw CPU
 *
 * Plain SVG, hand-rolled, no deps. Ships as-is into a blog post.
 */
import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Aggregate, AggregatedCell } from "../lib/aggregate";

const here = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = join(here, "..", "results", "baseline.json");
const CHARTS_DIR = join(here, "..", "results", "charts");

// Only the four apps in the article, in case future runs add variants.
const ARTICLE_APPS = new Set(["skedoodle", "tldraw", "excalidraw", "figma"]);

const COLOR = {
  default: "#94a3b8", // slate-400
  skedoodle: "#2563eb", // blue-600
  tldraw: "#0891b2", // cyan-600
  text: "#0f172a", // slate-900
  muted: "#64748b", // slate-500
  whisker: "#334155", // slate-700
  axis: "#cbd5e1", // slate-300
  footnote: "#94a3b8",
} as const;

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Round up to a visually "nice" axis max so ticks land on round numbers.
 */
function niceMax(v: number): number {
  const NICE = [1, 2, 3, 4, 5, 7.5, 10, 15, 20, 25, 30, 50, 75, 100];
  for (const n of NICE) if (v <= n) return n;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

interface ChartOptions {
  title: string;
  subtitle: string;
  cells: AggregatedCell[];
  highlight: Record<string, string>;
  xMax?: number;
  footnote: string;
}

function renderChart(opts: ChartOptions): string {
  // Sort ascending so Skedoodle lands at the top-left — reader sees the
  // small-number story first, scans down to the big numbers.
  const sorted = [...opts.cells].sort(
    (a, b) => a.cpuPct.median - b.cpuPct.median,
  );

  const W = 720;
  const padL = 110;
  const padR = 90;
  const padT = 62;
  const padB = 52;
  const rowH = 44;
  const H = padT + sorted.length * rowH + padB;

  const chartW = W - padL - padR;
  const xMax =
    opts.xMax ??
    niceMax(Math.max(...sorted.map((c) => c.cpuPct.max)) * 1.05);
  const xOf = (v: number) => padL + (v / xMax) * chartW;

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ` +
      `width="${W}" height="${H}" ` +
      `font-family="system-ui, -apple-system, 'Segoe UI', sans-serif">`,
  );

  // Title + subtitle.
  parts.push(
    `<text x="${padL}" y="26" font-size="17" font-weight="600" ` +
      `fill="${COLOR.text}">${escape(opts.title)}</text>`,
  );
  parts.push(
    `<text x="${padL}" y="46" font-size="12" ` +
      `fill="${COLOR.muted}">${escape(opts.subtitle)}</text>`,
  );

  // Gridlines behind bars (subtle).
  const tickCount = 5;
  for (let i = 1; i <= tickCount; i++) {
    const v = (xMax * i) / tickCount;
    const x = xOf(v);
    parts.push(
      `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + sorted.length * rowH}" ` +
        `stroke="${COLOR.axis}" stroke-width="1" stroke-dasharray="2,3" opacity="0.5" />`,
    );
  }

  // Bars + labels.
  sorted.forEach((c, i) => {
    const rowTop = padT + i * rowH + 8;
    const barH = rowH - 16;
    const barY = rowTop;
    const medX = xOf(c.cpuPct.median);
    const minX = xOf(c.cpuPct.min);
    const maxX = xOf(c.cpuPct.max);
    const fill = opts.highlight[c.app] ?? COLOR.default;

    // App label (left).
    parts.push(
      `<text x="${padL - 10}" y="${barY + barH / 2 + 4}" font-size="13" ` +
        `text-anchor="end" fill="${COLOR.text}">${escape(c.app)}</text>`,
    );

    // Main bar.
    parts.push(
      `<rect x="${padL}" y="${barY}" width="${medX - padL}" height="${barH}" ` +
        `fill="${fill}" rx="3" />`,
    );

    // Min–max whiskers.
    const wy = barY + barH / 2;
    parts.push(
      `<line x1="${minX}" y1="${wy}" x2="${maxX}" y2="${wy}" ` +
        `stroke="${COLOR.whisker}" stroke-width="1.5" />`,
    );
    parts.push(
      `<line x1="${minX}" y1="${wy - 4}" x2="${minX}" y2="${wy + 4}" ` +
        `stroke="${COLOR.whisker}" stroke-width="1.5" />`,
    );
    parts.push(
      `<line x1="${maxX}" y1="${wy - 4}" x2="${maxX}" y2="${wy + 4}" ` +
        `stroke="${COLOR.whisker}" stroke-width="1.5" />`,
    );

    // Median value label (right).
    const decimals = c.cpuPct.median < 10 ? 2 : 1;
    parts.push(
      `<text x="${Math.max(medX, maxX) + 8}" y="${barY + barH / 2 + 4}" ` +
        `font-size="13" font-weight="600" fill="${COLOR.text}">` +
        `${c.cpuPct.median.toFixed(decimals)}%</text>`,
    );
  });

  // X axis.
  const axisY = padT + sorted.length * rowH + 6;
  parts.push(
    `<line x1="${padL}" y1="${axisY}" x2="${padL + chartW}" y2="${axisY}" ` +
      `stroke="${COLOR.axis}" />`,
  );
  for (let i = 0; i <= tickCount; i++) {
    const v = (xMax * i) / tickCount;
    const x = xOf(v);
    parts.push(
      `<line x1="${x}" y1="${axisY}" x2="${x}" y2="${axisY + 4}" ` +
        `stroke="${COLOR.axis}" />`,
    );
    const tickDecimals = xMax <= 10 ? 0 : 0;
    parts.push(
      `<text x="${x}" y="${axisY + 18}" font-size="11" ` +
        `fill="${COLOR.muted}" text-anchor="middle">` +
        `${v.toFixed(tickDecimals)}%</text>`,
    );
  }

  // Footnote.
  parts.push(
    `<text x="${padL}" y="${H - 10}" font-size="10" ` +
      `fill="${COLOR.footnote}">${escape(opts.footnote)}</text>`,
  );

  parts.push(`</svg>`);
  return parts.join("\n");
}

/**
 * Rasterize an SVG to PNG at 2x DPI via headless Chromium. Useful for
 * platforms that don't reliably render uploaded/inline SVG (dev.to).
 */
async function rasterize(svgPath: string, pngPath: string): Promise<void> {
  const svg = await readFile(svgPath, "utf8");
  const m = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  if (!m) throw new Error(`Can't parse viewBox in ${svgPath}`);
  const w = parseInt(m[1], 10);
  const h = parseInt(m[2], 10);

  const html =
    `<!doctype html><html><body style="margin:0;padding:0;background:white;">` +
    svg +
    `</body></html>`;

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: w, height: h },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.screenshot({ path: pngPath, type: "png" });
    await context.close();
  } finally {
    await browser.close();
  }
}

async function main() {
  const raw = await readFile(BASELINE_PATH, "utf8");
  const baseline = JSON.parse(raw) as Aggregate;

  const idle = baseline.cells.filter(
    (c) => c.scenario === "idle" && ARTICLE_APPS.has(c.app),
  );
  const draw = baseline.cells.filter(
    (c) => c.scenario === "draw" && ARTICLE_APPS.has(c.app),
  );

  if (idle.length !== 4 || draw.length !== 4) {
    throw new Error(
      `Expected 4 idle + 4 draw cells in baseline; got ${idle.length} + ${draw.length}`,
    );
  }

  const runs = idle[0].runs;

  const idleSvg = renderChart({
    title: "Idle CPU on a blank canvas",
    subtitle: "30s window — page-attributed CDP Performance.metrics",
    cells: idle,
    highlight: { skedoodle: COLOR.skedoodle },
    footnote: `median of ${runs} runs, whiskers = min–max`,
  });

  const drawSvg = renderChart({
    title: "Active-draw CPU",
    subtitle: "15s scripted spiral, 60Hz pointer events",
    cells: draw,
    highlight: {
      skedoodle: COLOR.skedoodle,
      tldraw: COLOR.tldraw,
    },
    xMax: 100,
    footnote: `median of ${runs} runs, whiskers = min–max. Skedoodle + tldraw highlighted — the architectural tie.`,
  });

  await mkdir(CHARTS_DIR, { recursive: true });

  const idleSvgPath = join(CHARTS_DIR, "idle-cpu.svg");
  const drawSvgPath = join(CHARTS_DIR, "draw-cpu.svg");
  const idlePngPath = join(CHARTS_DIR, "idle-cpu.png");
  const drawPngPath = join(CHARTS_DIR, "draw-cpu.png");

  await writeFile(idleSvgPath, idleSvg);
  await writeFile(drawSvgPath, drawSvg);
  console.log(`Wrote SVG:\n  ${idleSvgPath}\n  ${drawSvgPath}`);

  if (process.argv.includes("--no-png")) return;

  console.log("Rasterizing to PNG @ 2x...");
  await rasterize(idleSvgPath, idlePngPath);
  await rasterize(drawSvgPath, drawPngPath);
  console.log(`Wrote PNG:\n  ${idlePngPath}\n  ${drawPngPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
