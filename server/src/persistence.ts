import { Command } from './protocol';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DEBOUNCE_MS = 5000;

const writeQueue: Map<string, NodeJS.Timeout> = new Map();

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create data directory:', error);
  }
}

ensureDataDir();

export function scheduleWrite(sketchId: string, commands: Command[]) {
  if (writeQueue.has(sketchId)) {
    clearTimeout(writeQueue.get(sketchId));
  }

  const timeout = setTimeout(() => {
    const filePath = path.join(DATA_DIR, `${sketchId}.json`);
    console.log(`[Persistence] Writing ${commands.length} commands to ${filePath}`);
    fs.writeFile(filePath, JSON.stringify(commands, null, 2))
      .catch(err => console.error(`[Persistence] Failed to write ${sketchId}:`, err));
    writeQueue.delete(sketchId);
  }, DEBOUNCE_MS);

  writeQueue.set(sketchId, timeout);
}

export async function loadCommands(sketchId: string): Promise<Command[]> {
  try {
    const filePath = path.join(DATA_DIR, `${sketchId}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as Command[];
  } catch (error) {
    // If file doesn't exist or is invalid, return empty log.
    // ENOENT is the error code for "file not found".
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`[Persistence] Failed to load commands for ${sketchId}:`, error);
    }
    return [];
  }
}
