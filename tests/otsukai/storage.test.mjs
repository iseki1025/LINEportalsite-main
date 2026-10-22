import test from 'node:test';
import assert from 'node:assert/strict';
import { appendHistory, clearHistory, DEFAULT_SETTINGS, readHistory, readSettings, writeSettings } from '../../games/otsukai/core/storage.js';

function fakeStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('settings default to history OFF and survive a safe round trip', () => {
  const storage = fakeStorage();
  assert.deepEqual(readSettings(storage), DEFAULT_SETTINGS);
  assert.equal(writeSettings({ saveHistory: true, soundEnabled: true }, storage), true);
  assert.equal(readSettings(storage).saveHistory, true);
  assert.equal(readSettings(storage).soundEnabled, true);
});

test('history is capped at thirty records and can be deleted', () => {
  const storage = fakeStorage();
  for (let index = 0; index < 35; index += 1) appendHistory({ index }, storage);
  const history = readHistory(storage);
  assert.equal(history.length, 30);
  assert.equal(history[0].index, 5);
  assert.equal(clearHistory(storage), true);
  assert.deepEqual(readHistory(storage), []);
});

test('storage exceptions do not break gameplay', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  assert.deepEqual(readSettings(storage), DEFAULT_SETTINGS);
  assert.equal(writeSettings({ saveHistory: true }, storage), false);
  assert.equal(appendHistory({ index: 1 }, storage), false);
  assert.equal(clearHistory(storage), false);
});
