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

export function keys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(storagePrefix)) {
      keys.push(key.substring(storagePrefix.length)); // Remove the prefix
    }
  }
  return keys;
}
