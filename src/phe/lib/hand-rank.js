'use strict'

const STRAIGHT_FLUSH  = 0
const FOUR_OF_A_KIND  = 1
const FULL_HOUSE      = 2
const FLUSH           = 3
const STRAIGHT        = 4
const THREE_OF_A_KIND = 5
const TWO_PAIR        = 6
const ONE_PAIR        = 7
const HIGH_CARD       = 8

/**
 * Provides a description of a hand rank number.
 * It's an {Array} which can be indexed into with the hand rank
 * in order to retrieve the matching description.
 *
 * Example: `rankDescription[rank.FULL_HOUSE] === 'Full House'`
 *
 * @name rankDescription
 */
const rankDescription = [
    'Straight Flush'
  , 'Four of a Kind'
  , 'Full House'
  , 'Flush'
  , 'Straight'
  , 'Three of a Kind'
  , 'Two Pair'
  , 'One Pair'
  , 'High Card'
]

/**
 * Converts a hand strength number into a hand rank number
 * `0 - 8` for `STRAIGHT_FLUSH - HIGH_CARD`.
 *
 * @name handRank
 * @function
 * @param {Number} val hand strength (result of an `evaluate` function)
 * @return {Number} the hand rank
 */
function handRank(val) {
  if (val > 6185) return HIGH_CARD        // 1277 high card
  if (val > 3325) return ONE_PAIR         // 2860 one pair
  if (val > 2467) return TWO_PAIR         //  858 two pair
  if (val > 1609) return THREE_OF_A_KIND  //  858 three-kind
  if (val > 1599) return STRAIGHT         //   10 straights
  if (val > 322)  return FLUSH            // 1277 flushes
  if (val > 166)  return FULL_HOUSE       //  156 full house
  if (val > 10)   return FOUR_OF_A_KIND   //  156 four-kind
  return STRAIGHT_FLUSH                   //   10 straight-flushes
}

  // const _rankDescription = rankDescription
  // export { _rankDescription as rankDescription }
  // const _handRank = handRank
  // export { _handRank as handRank }

  // const _STRAIGHT_FLUSH = STRAIGHT_FLUSH
  // export { _STRAIGHT_FLUSH as STRAIGHT_FLUSH }
  // const _FOUR_OF_A_KIND = FOUR_OF_A_KIND
  // export { _FOUR_OF_A_KIND as FOUR_OF_A_KIND }
  // const _FULL_HOUSE = FULL_HOUSE
  // export { _FULL_HOUSE as FULL_HOUSE }
  // const _FLUSH = FLUSH
  // export { _FLUSH as FLUSH }
  // const _STRAIGHT = STRAIGHT
  // export { _STRAIGHT as STRAIGHT }
  // const _THREE_OF_A_KIND = THREE_OF_A_KIND
  // export { _THREE_OF_A_KIND as THREE_OF_A_KIND }
  // const _TWO_PAIR = TWO_PAIR
  // export { _TWO_PAIR as TWO_PAIR }
  // const _ONE_PAIR = ONE_PAIR
  // export { _ONE_PAIR as ONE_PAIR }
  // const _HIGH_CARD = HIGH_CARD
  // export { _HIGH_CARD as HIGH_CARD }

module.exports = {
  rankDescription,
  handRank,
  STRAIGHT_FLUSH,
  FOUR_OF_A_KIND,
  FULL_HOUSE,
  FLUSH,
  STRAIGHT,
  THREE_OF_A_KIND,
  TWO_PAIR,
  ONE_PAIR,
  HIGH_CARD
}