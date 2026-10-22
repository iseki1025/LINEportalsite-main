import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDailyRounds, generateRounds, DIFFICULTIES } from '../../games/otsukai/core/model.js';
import { dailySeed, tokyoDateKey } from '../../games/otsukai/core/random.js';
import { scoreFinal, scoreRound, starsForScore, titleForScore } from '../../games/otsukai/core/scoring.js';
import { PRODUCTS } from '../../games/otsukai/data/products.js';

function planSignature(rounds) {
  return rounds.map((round) => ({
    originalTargetIds: round.originalTargetIds,
    targetIds: round.targetIds,
    memoOrder: round.memoOrder,
    shelfIds: round.shelfIds,
    signOptions: round.signOptions,
    signAnswer: round.signAnswer,
    changedFromId: round.changedFromId,
    changedToId: round.changedToId,
  }));
}

test('generates every difficulty safely for 1,200 seeds', () => {
  for (let seed = 0; seed < 1200; seed += 1) {
    for (const difficulty of Object.keys(DIFFICULTIES)) {
      const rounds = generateRounds(seed, difficulty, PRODUCTS);
      assert.equal(rounds.length, 3);
      const allTargets = [];
      rounds.forEach((round, index) => {
        const settings = DIFFICULTIES[difficulty];
        assert.equal(round.targetIds.length, settings.count);
        assert.equal(round.shelfIds.length, settings.shelfSize);
        assert.equal(new Set(round.shelfIds).size, settings.shelfSize);
        assert.ok(round.targetIds.every((id) => round.shelfIds.includes(id)));
        assert.equal(new Set(round.signOptions).size, 6);
        assert.ok(round.signOptions.includes(round.signAnswer));
        if (difficulty === 'challenge' && index === 2) assert.ok(round.changedFromId);
        else assert.equal(round.changedFromId, null);
        allTargets.push(...round.targetIds);
        const categoryCount = new Set(round.targetIds.map((id) => PRODUCTS.find((item) => item.id === id).category)).size;
        assert.ok(categoryCount >= (settings.count === 4 ? 3 : settings.count));
      });
      assert.equal(new Set(allTargets).size, allTargets.length);
      if (difficulty === 'challenge') {
        const changed = rounds[2];
        assert.ok(changed.changedFromId);
        assert.ok(changed.changedToId);
        assert.ok(changed.targetIds.includes(changed.changedToId));
        assert.ok(changed.shelfIds.includes(changed.changedFromId));
        assert.ok(!changed.targetIds.includes(changed.changedFromId));
      } else {
        assert.ok(rounds.every((round) => round.changedFromId === null && round.changedToId === null));
      }
    }
  }
});

test('target positions are distributed across the shelf', () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const counts = Array(DIFFICULTIES[difficulty].shelfSize).fill(0);
    for (let seed = 0; seed < 1200; seed += 1) {
      for (const round of generateRounds(seed, difficulty, PRODUCTS)) {
        round.targetIds.forEach((id) => counts[round.shelfIds.indexOf(id)] += 1);
      }
    }
    assert.ok(counts.every((count) => count > 0), `${difficulty} has an unreachable shelf position`);
  }
});

test('daily seed is stable by Tokyo date and fixed specification salt', () => {
  const first = generateDailyRounds('2026-10-22', PRODUCTS);
  const second = generateRounds(dailySeed('2026-10-22'), 'usual', PRODUCTS, 'daily');
  assert.deepEqual(planSignature(first), planSignature(second));
  assert.notEqual(dailySeed('2026-10-22'), dailySeed('2026-10-23'));
  assert.equal(tokyoDateKey(new Date('2026-10-21T15:00:00.000Z')), '2026-10-22');
});

test('scoring stays between zero and one hundred and does not depend on hints', () => {
  const perfect = scoreRound(['a', 'b', 'c'], ['a', 'b', 'c']);
  const empty = scoreRound([], ['a', 'b', 'c']);
  assert.deepEqual(perfect, { correctCount: 3, targetCount: 3, score: 100, wrongCount: 0 });
  assert.equal(empty.score, 0);
  assert.deepEqual(scoreFinal([{ ...perfect, hintUsed: true }, empty]), { totalScore: 50, correctCount: 3, totalTargets: 6 });
  assert.equal(starsForScore(0), 1);
  assert.equal(starsForScore(60), 2);
  assert.equal(starsForScore(90), 3);
  assert.equal(titleForScore(59), '今日もおつかれさま！');
});
