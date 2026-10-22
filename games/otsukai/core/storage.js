export const SETTINGS_KEY = 'otsukai.settings.v1';
export const HISTORY_KEY = 'otsukai.history.v1';
export const MAX_HISTORY = 30;

export const DEFAULT_SETTINGS = Object.freeze({
  soundEnabled: false,
  reducedMotion: false,
  tutorialSeen: false,
  lastDifficulty: 'usual',
  saveHistory: false,
});

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch (error) {
    return null;
  }
}

function readJson(storage, key, fallback) {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

export function readSettings(storage) {
  const resolved = resolveStorage(storage);
  const saved = resolved ? readJson(resolved, SETTINGS_KEY, {}) : {};
  return { ...DEFAULT_SETTINGS, ...(saved && typeof saved === 'object' ? saved : {}) };
}

export function writeSettings(settings, storage) {
  const resolved = resolveStorage(storage);
  try {
    if (!resolved) return false;
    resolved.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }));
    return true;
  } catch (error) {
    return false;
  }
}

export function readHistory(storage) {
  const resolved = resolveStorage(storage);
  const history = resolved ? readJson(resolved, HISTORY_KEY, []) : [];
  return Array.isArray(history) ? history : [];
}

export function appendHistory(session, storage) {
  const resolved = resolveStorage(storage);
  try {
    if (!resolved) return false;
    const history = readHistory(resolved).concat(session).slice(-MAX_HISTORY);
    resolved.setItem(HISTORY_KEY, JSON.stringify(history));
    return true;
  } catch (error) {
    return false;
  }
}

export function clearHistory(storage) {
  const resolved = resolveStorage(storage);
  try {
    if (!resolved) return false;
    resolved.removeItem(HISTORY_KEY);
    return true;
  } catch (error) {
    return false;
  }
}

export function canUseStorage(storage) {
  const resolved = resolveStorage(storage);
  try {
    if (!resolved) return false;
    const key = '__otsukai_storage_probe__';
    resolved.setItem(key, '1');
    resolved.removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
}
