/**
 * Generate fixtures/spiral-15s.json.
 * Archimedean spiral from canvas center, 6 turns over ~15s at 60Hz.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TraceEvent } from "../lib/trace";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "..", "fixtures", "spiral-15s.json");

const DURATION_MS = 15_000;
const FPS = 60;
const FRAMES = Math.floor((DURATION_MS * FPS) / 1000);
const TURNS = 6;
const MAX_RADIUS = 0.4; // normalized — fits within 80% of the shorter canvas axis

const events: TraceEvent[] = [];
for (let i = 0; i <= FRAMES; i++) {
  const frac = i / FRAMES;
  const theta = frac * TURNS * 2 * Math.PI;
  const r = MAX_RADIUS * frac;
  const x = 0.5 + r * Math.cos(theta);
  const y = 0.5 + r * Math.sin(theta);
  const t = Math.round((i * 1000) / FPS);
  events.push({
    t,
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
    type: i === 0 ? "down" : "move",
  });
}

// Explicit pen-up at the final position so the stroke terminates cleanly.
const last = events[events.length - 1];
events.push({ t: last.t, x: last.x, y: last.y, type: "up" });

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(events, null, 2));
console.log(`Wrote ${events.length} events (${DURATION_MS}ms) to ${OUT}`);
