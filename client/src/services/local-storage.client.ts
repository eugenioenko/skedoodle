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
const DB_VERSION = 1;
const META_STORE = 'sketch-meta';
const COMMANDS_STORE = 'sketch-commands';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(COMMANDS_STORE)) {
        db.createObjectStore(COMMANDS_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
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

async function getCommands(id: string): Promise<Command[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COMMANDS_STORE, 'readonly');
    const store = tx.objectStore(COMMANDS_STORE);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

async function setCommands(id: string, commands: Command[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COMMANDS_STORE, 'readwrite');
    const store = tx.objectStore(COMMANDS_STORE);
    store.put(commands, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteCommands(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COMMANDS_STORE, 'readwrite');
    const store = tx.objectStore(COMMANDS_STORE);
    store.delete(id);
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
  setCommands,
  deleteCommands,
  deleteSketch,
};
