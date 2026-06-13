type BrowserStorageArea = "local" | "session";

function getBrowserStorage(area: BrowserStorageArea) {
  if (typeof window === "undefined") return null;

  try {
    return area === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function safeGetStorageItem(area: BrowserStorageArea, key: string) {
  const storage = getBrowserStorage(area);
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetStorageItem(
  area: BrowserStorageArea,
  key: string,
  value: string
) {
  const storage = getBrowserStorage(area);
  if (!storage) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function safeRemoveStorageItem(area: BrowserStorageArea, key: string) {
  const storage = getBrowserStorage(area);
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function safeClearStorage(area: BrowserStorageArea) {
  const storage = getBrowserStorage(area);
  if (!storage) return false;

  try {
    storage.clear();
    return true;
  } catch {
    return false;
  }
}

export function safeStorageLength(area: BrowserStorageArea) {
  const storage = getBrowserStorage(area);
  if (!storage) return 0;

  try {
    return storage.length;
  } catch {
    return 0;
  }
}

export function safeStorageKey(area: BrowserStorageArea, index: number) {
  const storage = getBrowserStorage(area);
  if (!storage) return null;

  try {
    return storage.key(index);
  } catch {
    return null;
  }
}
