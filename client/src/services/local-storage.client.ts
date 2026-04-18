import { Command } from '@/sync/sync.model';

export interface LocalSketchMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  color?: string;
  positionX?: number;
  positionY?: number;
  zoom?: number;
}

const DB_NAME = 'skedoodle-local';
const DB_VERSION = 2;
const META_STORE = 'sketch-meta';
const COMMANDS_STORE = 'sketch-commands';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' });
      }

      // v1 → v2: migrate from blob store to individual command records
      if (oldVersion < 2) {
        if (db.objectStoreNames.contains(COMMANDS_STORE)) {
          db.deleteObjectStore(COMMANDS_STORE);
        }
        const store = db.createObjectStore(COMMANDS_STORE, { keyPath: 'id' });
        store.createIndex('sketchId', 'sketchId', { unique: false });
      }
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onclose = () => { dbInstance = null; };
      resolve(dbInstance);
    };
    request.onerror = () => reject(request.error);
  });
}

async function getAllMeta(): Promise<LocalSketchMeta[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getMeta(id: string): Promise<LocalSketchMeta | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readonly');
    const store = tx.objectStore(META_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function setMeta(meta: LocalSketchMeta): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    store.put(meta);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteMeta(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(META_STORE, 'readwrite');
    const store = tx.objectStore(META_STORE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getCommands(sketchId: string): Promise<Command[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COMMANDS_STORE, 'readonly');
    const store = tx.objectStore(COMMANDS_STORE);
    const index = store.index('sketchId');
    const request = index.getAll(sketchId);
    request.onsuccess = () => {
      const commands = request.result as (Command & { sketchId: string })[];
      commands.sort((a, b) => a.ts - b.ts);
      resolve(commands);
    };
    request.onerror = () => reject(request.error);
  });
}

async function appendCommand(sketchId: string, command: Command): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COMMANDS_STORE, 'readwrite');
    const store = tx.objectStore(COMMANDS_STORE);
    store.put({ ...command, sketchId });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteCommands(sketchId: string): Promise<void> {
  const db = await openDB();
  // Collect all keys for this sketchId, then delete in a single transaction
  const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
    const tx = db.transaction(COMMANDS_STORE, 'readonly');
    const index = tx.objectStore(COMMANDS_STORE).index('sketchId');
    const request = index.getAllKeys(sketchId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (keys.length === 0) return;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(COMMANDS_STORE, 'readwrite');
    const store = tx.objectStore(COMMANDS_STORE);
    for (const key of keys) {
      store.delete(key);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteSketch(id: string): Promise<void> {
  await deleteMeta(id);
  await deleteCommands(id);
}

export const localStorageClient = {
  getAllMeta,
  getMeta,
  setMeta,
  deleteMeta,
  getCommands,
  appendCommand,
  deleteCommands,
  deleteSketch,
};
