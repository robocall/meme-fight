const K_FACTOR = 32;

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function updateElo(
  winnerElo: number,
  loserElo: number,
): { winnerElo: number; loserElo: number } {
  const winnerExpected = expectedScore(winnerElo, loserElo);
  const loserExpected = expectedScore(loserElo, winnerElo);

  return {
    winnerElo: Math.round(winnerElo + K_FACTOR * (1 - winnerExpected)),
    loserElo: Math.round(loserElo + K_FACTOR * (0 - loserExpected)),
  };
}
