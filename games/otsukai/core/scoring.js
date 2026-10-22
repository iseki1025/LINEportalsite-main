export function scoreRound(selectedIds, targetIds) {
  const selected = new Set(selectedIds);
  const correctCount = targetIds.filter((id) => selected.has(id)).length;
  const targetCount = targetIds.length;
  return {
    correctCount,
    targetCount,
    score: targetCount ? Math.round((100 * correctCount) / targetCount) : 0,
    wrongCount: Math.max(0, targetCount - correctCount),
  };
}

export function scoreFinal(roundResults) {
  const scores = roundResults.map((round) => round.score || 0);
  const totalScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0;
  return {
    totalScore: Math.max(0, Math.min(100, totalScore)),
    correctCount: roundResults.reduce((sum, round) => sum + (round.correctCount || 0), 0),
    totalTargets: roundResults.reduce((sum, round) => sum + (round.targetCount || 0), 0),
  };
}

export function starsForScore(score) {
  if (score >= 90) return 3;
  if (score >= 60) return 2;
  return 1;
}

export function titleForScore(score) {
  if (score >= 90) return 'おつかい名人！';
  if (score >= 60) return 'いいおつかいでした！';
  return '今日もおつかれさま！';
}
