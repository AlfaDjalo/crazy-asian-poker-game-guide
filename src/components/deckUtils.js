/**
 * Creates a shuffled 52-card deck
 * @returns {Array<string>} Shuffled array of card codes
 */
export const generateDeck = () => {
  const suits = ["H", "D", "C", "S"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "0", "J", "Q", "K"];
  const deck = suits.flatMap(suit => ranks.map(rank => `${rank}${suit}`));
  return shuffleArray([...deck]);
};

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} Shuffled array
 */
export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Validates a card code format
 * @param {string} card - Card code to validate
 * @returns {boolean} Whether the card code is valid
 */
export const isValidCard = (card) => {
  if (!card || typeof card !== 'string' || card.length !== 2) return false;
  
  const rank = card[0];
  const suit = card[1];
  
  const validRanks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "0", "J", "Q", "K"];
  const validSuits = ["H", "D", "C", "S"];
  
  return validRanks.includes(rank) && validSuits.includes(suit);
};