const UINT32_RANGE = 0x100000000;

export function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seed) {
  let state = Number(seed) >>> 0;
  return function rng() {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function shuffle(items, rng) {
  const result = [...items];
  const random = rng || createRng(1);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function randomSeed() {
  try {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(1);
      globalThis.crypto.getRandomValues(values);
      return values[0] >>> 0;
    }
  } catch (error) {
    // The fallback below still gives each normal session a fresh seed.
  }
  return (Date.now() ^ Math.floor(Math.random() * UINT32_RANGE)) >>> 0;
}

export function tokyoDateKey(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date).reduce((result, part) => {
      if (part.type !== 'literal') result[part.type] = part.value;
      return result;
    }, {});
    if (!parts.year || !parts.month || !parts.day) return null;
    return `${parts.year}-${parts.month}-${parts.day}`;
  } catch (error) {
    return null;
  }
}

export function dailySeed(dateKey, specVersion = 'spec-v1', salt = 'otsukai-biyori') {
  return hashString(`${dateKey}|${specVersion}|${salt}`);
}
