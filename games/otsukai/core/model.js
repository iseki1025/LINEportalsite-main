import { createRng, dailySeed, shuffle } from './random.js';
import { SIGN_NAMES } from '../data/messages.js';

export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ id: 'easy', label: 'のんびり', count: 2, shelfSize: 6, description: '慌てず2つ覚える' }),
  usual: Object.freeze({ id: 'usual', label: 'いつもの', count: 3, shelfSize: 9, description: 'ほどよく3つ覚える' }),
  challenge: Object.freeze({ id: 'challenge', label: 'チャレンジ', count: 4, shelfSize: 12, description: '少し歯ごたえのある4つ' }),
});

function chooseTargets(products, count, usedIds, rng) {
  const available = shuffle(products.filter((product) => !usedIds.has(product.id)), rng);
  const minimumCategories = count === 4 ? 3 : count;
  const chosen = [];
  const categories = new Set();

  for (const product of available) {
    if (categories.has(product.category)) continue;
    chosen.push(product);
    categories.add(product.category);
    if (chosen.length === minimumCategories) break;
  }
  for (const product of available) {
    if (chosen.length >= count) break;
    if (!chosen.some((item) => item.id === product.id)) chosen.push(product);
  }
  if (chosen.length !== count || categories.size < minimumCategories) {
    throw new Error('買い物メモを作れませんでした。');
  }
  return chosen;
}

function chooseReplacement(products, originalTargets, usedIds, rng) {
  const originalIds = new Set(originalTargets.map((product) => product.id));
  const retainedCategories = new Set(originalTargets.slice(1).map((product) => product.category));
  const candidates = shuffle(products.filter((product) => !usedIds.has(product.id) && !originalIds.has(product.id)), rng);
  const diverseCandidates = candidates.filter((product) => new Set([...retainedCategories, product.category]).size >= 3);
  const validCandidates = diverseCandidates.length ? diverseCandidates : candidates;
  if (!validCandidates.length) throw new Error('変更する商品を作れませんでした。');
  return validCandidates[0];
}

function buildShelf(products, targetProducts, removedProduct, shelfSize, rng) {
  const targetIds = new Set(targetProducts.map((product) => product.id));
  const targetCategories = new Set(targetProducts.map((product) => product.category));
  const dummies = [];
  const addDummy = (product) => {
    if (!product || targetIds.has(product.id) || dummies.some((item) => item.id === product.id)) return;
    dummies.push(product);
  };

  addDummy(removedProduct);
  const candidates = shuffle(products.filter((product) => !targetIds.has(product.id)), rng);
  const preferred = candidates.filter((product) => targetCategories.has(product.category));
  const preferredMinimum = Math.ceil((shelfSize - targetProducts.length) / 2);
  for (const product of preferred) {
    if (dummies.length >= preferredMinimum) break;
    addDummy(product);
  }
  for (const product of candidates) {
    if (dummies.length >= shelfSize - targetProducts.length) break;
    addDummy(product);
  }
  if (dummies.length !== shelfSize - targetProducts.length) throw new Error('売り場の商品を揃えられませんでした。');
  return shuffle([...targetProducts, ...dummies], rng).map((product) => product.id);
}

function buildRound(products, difficulty, roundIndex, usedIds, rng) {
  const originalTargets = chooseTargets(products, difficulty.count, usedIds, rng);
  let targetProducts = originalTargets;
  let removedProduct = null;
  let addedProduct = null;
  if (difficulty.id === 'challenge' && roundIndex === 2) {
    removedProduct = originalTargets[0];
    addedProduct = chooseReplacement(products, originalTargets, usedIds, rng);
    targetProducts = originalTargets.slice(1).concat(addedProduct);
  }
  targetProducts.forEach((product) => usedIds.add(product.id));
  const targetIds = targetProducts.map((product) => product.id);
  const signOptions = shuffle(SIGN_NAMES, rng);
  const signAnswer = signOptions[Math.floor(rng() * signOptions.length)];
  return Object.freeze({
    roundIndex,
    originalTargetIds: Object.freeze(originalTargets.map((product) => product.id)),
    targetIds: Object.freeze(targetIds),
    memoOrder: Object.freeze(shuffle(targetProducts, rng).map((product) => product.id)),
    shelfIds: Object.freeze(buildShelf(products, targetProducts, removedProduct, difficulty.shelfSize, rng)),
    signOptions: Object.freeze(signOptions),
    signAnswer,
    changedFromId: removedProduct?.id || null,
    changedToId: addedProduct?.id || null,
  });
}

export function generateRounds(seed, difficultyId, products, mode = 'normal') {
  const difficulty = DIFFICULTIES[difficultyId];
  if (!difficulty) throw new Error('難易度が見つかりません。');
  if (!Array.isArray(products) || products.length < 12) throw new Error('商品データが不足しています。');
  const rng = createRng(seed);
  const usedIds = new Set();
  return Object.freeze([0, 1, 2].map((roundIndex) => buildRound(products, difficulty, roundIndex, usedIds, rng)).map((plan) => ({ ...plan, mode })));
}

export function generateDailyRounds(dateKey, products) {
  return generateRounds(dailySeed(dateKey), 'usual', products, 'daily');
}
