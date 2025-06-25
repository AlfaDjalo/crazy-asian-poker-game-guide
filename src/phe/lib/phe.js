/**
 * Converts an array of card codes to rank numbers for low hand evaluation.
 * e.g. ['AS', '2C', '3D', '4H', '5S'] => [14,2,3,4,5]
 * @param {Array<string>} cards
 * @returns {Array<number|null>}
 */
function cardCodesToRanks(cards) {
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
'use strict'

const { handRank, rankDescription, STRAIGHT_FLUSH, FOUR_OF_A_KIND, FULL_HOUSE, FLUSH, STRAIGHT, THREE_OF_A_KIND, TWO_PAIR, ONE_PAIR, HIGH_CARD } = require('./hand-rank.js');

const { cardCode, cardCodes, boardCodes, rankCodes, suitCodes, stringifyCardCode, stringifyRank, stringifySuit } = require('./hand-code.js');

const evaluate_5_cards = require('./evaluator5.js');
const evaluate_6_cards = require('./evaluator6.js');
const evaluate_7_cards = require('./evaluator7.js');

const { lowhand5 } = require('./lowtable.js');

/**
 * Evaluates the 5 - 7 card codes to arrive at a number representing the hand
 * strength, smaller is better.
 *
 * @name evaluateCardCodes
 * @function
 * @param {Array.<Number>} cards the cards, i.e. `[ 49, 36, 4, 48, 41 ]`
 * @return {Number} the strength of the hand comprised by the card codes
 */
function evaluateCardCodes(codes) {
  const len = codes.length
  if (len === 5) return evaluate_5_cards.apply(null, codes)
  if (len === 6) return evaluate_6_cards.apply(null, codes)
  if (len === 7) return evaluate_7_cards.apply(null, codes)
  throw new Error(`Can only evaluate 5, 6 or 7 cards, you gave me ${len}`)
}

/**
 * Evaluates the 5 - 7 cards to arrive at a number representing the hand
 * strength, smaller is better.
 *
 * @name evaluateCards
 * @function
 * @param {Array.<String>} cards the cards, i.e. `[ 'Ah', 'Ks', 'Td', '3c', 'Ad' ]`
 * @return {Number} the strength of the hand comprised by the cards
 */
function evaluateCards(cards) {
  if (!Array.isArray(cards)) {
    throw new Error('Need to supply an Array with 5,6 or 7 cards')
  }
  return evaluateCardsFast(cards)
}

/**
 * Same as `evaluateCards` but skips `cards` argument type check to be more
 * performant.
 */
function evaluateCardsFast(cards) {
  const codes = cardCodes(cards)
  return evaluateCardCodes(codes)
}

/**
 * Evaluates the given board of 5 to 7 cards provided as part of the board to
 * arrive at a number representing the hand strength, smaller is better.
 *
 * @name evaluateBoard
 * @function
 * @param {String} board the board, i.e. `'Ah Ks Td 3c Ad'`
 * @return {Number} the strength of the hand comprised by the cards of the board
 */
function evaluateBoard(board) {
  if (typeof board !== 'string') throw new Error('board needs to be a string')
  const cards = board.trim().split(/ /)
  return evaluateCardsFast(cards)
}

/**
 * Evaluates the 5 - 7 cards and then calculates the hand rank.
 *
 * @name rankCards
 * @function
 * @param {Array.<String>} cards the cards, i.e. `[ 'Ah', 'Ks', 'Td', '3c', 'Ad' ]`
 * @return {Number} the rank of the hand comprised by the cards, i.e. `1` for
 * `FOUR_OF_A_KIND` (enumerated in ranks)
 */
function rankCards(cards) {
  return handRank(evaluateCards(cards))
}

/**
 * Same as `rankCards` but skips `cards` argument type check to be more
 * performant.
 */
function rankCardsFast(cards) {
  return handRank(evaluateCardsFast(cards))
}

/**
 * Evaluates the 5 - 7 card codes and then calculates the hand rank.
 *
 * @name rankCardCodes
 * @function
 * @param {Array.<Number>} cardCodes the card codes whose ranking to determine
 * @return {Number} the rank of the hand comprised by the card codes, i.e. `1` for
 * `FOUR_OF_A_KIND` (enumerated in ranks)
 */
function rankCardCodes(cardCodes) {
  return handRank(evaluateCardCodes(cardCodes))
}

/**
 * Evaluates the given board of 5 to 7 cards provided as part of the board to
 * and then calculates the hand rank.
 *
 * @name rankBoard
 * @function
 * @param {String} board the board, i.e. `'Ah Ks Td 3c Ad'`
 * @return {Number} the rank of the hand comprised by the cards, i.e. `1` for
 * `FOUR_OF_A_KIND` (enumerated in ranks)
 */
function rankBoard(cards) {
  return handRank(evaluateBoard(cards))
}

/**
 * Converts a set of cards to card codes.
 *
 * @name setCardCodes
 * @function
 * @param {Set.<String>} set card strings set, i.e. `Set({'Ah', 'Ks', 'Td', '3c, 'Ad'})`
 * @return {Set.<Number>} card code set
 */
function setCardCodes(set) {
  const codeSet = new Set()
  for (const v of set) codeSet.add(cardCode(v))
  return codeSet
}

/* New Low evaluator
Created by Me !
*/

function evaluateLowHandRank(card_ranks) {
/*
Return the percentile of the best 5 card low hand made from these
cards, against an equivalent number of cards.
*/
  //console.log(card_ranks);
  if (card_ranks.length != 5) {
      console.log("Only 5 hole cards are supported");
  } else {
      //card_ranks[card_ranks.map((x, i) => [i, x]).filter(x => x[1] == 14)[0][0]] = 1;
      if (card_ranks.indexOf(14)>=0) {
        card_ranks.splice(card_ranks.indexOf(14), 1, 1);
      };
      //console.log(card_ranks);
      card_ranks.sort(function(a, b){return b-a});
      // console.log(card_ranks);
    
      let low_to_number = parseInt(card_ranks.join(""));
    //  console.log(low_to_number);
      //console.log(lowhand5.indexOf(low_to_number) + 1);

      let lowHandRank = lowhand5.indexOf(low_to_number) + 1;
      // console.log(lowHandRank);

      if (lowHandRank==0) {
        return 99;
      } else {
        return lowHandRank;
      }

  }
}

function handLowRank(val) {
  return lowhand5[val-1];
}

function evaluateLowHandCardNumbers(cardNumbers) {
  let rankArray = cardNumbers.map(val => Math.floor(val / 4) + 2);
  // console.log(rankArray);
  return evaluateLowHandRank(rankArray);
}

/* End Low evaluator */

/**
 * Converts a set of card codes to their string representations.
 *
 * @name setStringifyCardCodes
 * @function
 * @param {Set.<Number>} set card code set
 * @return {Set.<String>} set with string representations of the card codes,
 *                        i.e. `Set({'Ah', 'Ks', 'Td', '3c, 'Ad'})`
 */
function setStringifyCardCodes(set) {
  const stringSet = new Set()
  for (const v of set) stringSet.add(stringifyCardCode(v))
  return stringSet
}

/**
  * Enumeration of possible hand ranks, each rank is a number from 0-8.
  *
  * ```
  * STRAIGHT_FLUSH
  * FOUR_OF_A_KIND
  * FULL_HOUSE
  * FLUSH
  * STRAIGHT
  * THREE_OF_A_KIND
  * TWO_PAIR
  * ONE_PAIR
  * HIGH_CARD
  * ```
  *
  * @name ranks
  * @function
  */
const ranks = {
    STRAIGHT_FLUSH
  , FOUR_OF_A_KIND
  , FULL_HOUSE
  , FLUSH
  , STRAIGHT
  , THREE_OF_A_KIND
  , TWO_PAIR
  , ONE_PAIR
  , HIGH_CARD
}

// export default {
//     evaluateCards
//   , evaluateCardsFast
//   , evaluateCardCodes
//   , evaluateBoard
//   , rankCards
//   , rankCardsFast
//   , rankCardCodes
//   , rankBoard

//   // hand rank
//   , handRank
//   , rankDescription
//   , ranks

//   // hand code
//   , cardCode
//   , cardCodes
//   , setCardCodes
//   , setStringifyCardCodes
//   , boardCodes
//   , rankCodes
//   , suitCodes
//   , stringifyCardCode
//   , stringifyRank
//   , stringifySuit
// }

module.exports = {
  evaluateCards
  , evaluateCardsFast
  , evaluateCardCodes
  , evaluateBoard
  , evaluateLowHandRank
  , evaluateLowHandCardNumbers
  , rankCards
  , rankCardsFast
  , rankCardCodes
  , rankBoard
  , cardCodesToRanks

  // hand rank
  , handRank
  , rankDescription
  , ranks

  // hand code
  , cardCode
  , cardCodes
  , setCardCodes
  , setStringifyCardCodes
  , boardCodes
  , rankCodes
  , suitCodes
  , stringifyCardCode
  , stringifyRank
  , stringifySuit
}
