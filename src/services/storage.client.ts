import { Command } from "@/canvas/history.store";

// --- Generic helpers ---

const storagePrefix = "Sketch: ";
const generateKey = (key: string): string => `${storagePrefix}${key}`;

export function get<T>(key: string): T | null {
  const item = localStorage.getItem(generateKey(key));
  if (item) {
    try {
      return JSON.parse(item) as T;
    } catch (e) {
      console.error("Failed to parse localStorage item", e);
      return null;
    }
  }
  return null;
}

export function set<T>(key: string, value: T): void {
  try {
    const stringifiedValue = JSON.stringify(value);
    localStorage.setItem(generateKey(key), stringifiedValue);
  } catch (e) {
    console.error("Failed to stringify or set localStorage item", e);
  }
}

export function remove(key: string): void {
  localStorage.removeItem(generateKey(key));
}

export function keys(): string[] {
  const result: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(storagePrefix)) {
      result.push(key.substring(storagePrefix.length));
    }
  }
  return result;
}

// --- Sketch-specific storage ---

export interface SketchMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

const SKETCH_COMMANDS_PREFIX = "sketches:";
const SKETCH_META_PREFIX = "sketches:";

function commandsKey(id: string): string {
  return `${SKETCH_COMMANDS_PREFIX}${id}:commands`;
}

function metaKey(id: string): string {
  return `${SKETCH_META_PREFIX}${id}:meta`;
}

export function getSketchCommands(id: string): Command[] | null {
  return get<Command[]>(commandsKey(id));
}

export function setSketchCommands(id: string, commands: Command[]): void {
  set(commandsKey(id), commands);
}

export function getSketchMeta(id: string): SketchMeta | null {
  return get<SketchMeta>(metaKey(id));
}

export function setSketchMeta(id: string, meta: SketchMeta): void {
  set(metaKey(id), meta);
}

export function deleteSketch(id: string): void {
  remove(commandsKey(id));
  remove(metaKey(id));
}

export function getAllSketchIds(): string[] {
  const ids: string[] = [];
  const prefix = generateKey(`${SKETCH_META_PREFIX}`);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix) && key.endsWith(":meta")) {
      // Key format: "Sketch: sketches:{id}:meta"
      const inner = key.substring(prefix.length);
      const id = inner.replace(/:meta$/, "");
      if (id) {
        ids.push(id);
      }
    }
  }
  return ids;
}
