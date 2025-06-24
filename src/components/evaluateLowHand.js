// Helper to convert card codes to rank numbers for low hand evaluation
// e.g. ['AS', '2C', '3D', '4H', '5S'] => [14,2,3,4,5]
export function cardCodesToRanks(cards) {
  return cards.map(card => {
    if (!card) return null;
    let rank = card[0].toUpperCase();
    if (rank === 'T' || rank === '0') return 10;
    if (rank === 'J') return 11;
    if (rank === 'Q') return 12;
    if (rank === 'K') return 13;
    if (rank === 'A') return 14;
    return parseInt(rank, 10);
  });
}
