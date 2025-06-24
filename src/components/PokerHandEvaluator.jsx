import React, { useMemo, useState, useEffect } from "react";
import { evaluateCards, evaluateLowHandRank } from '../phe/lib/phe.js';
import { cardCodesToRanks } from './evaluateLowHand.js';

// Helper to get all k-combinations of an array
function k_combinations(arr, k) {
  const results = [];
  function comb(current, start) {
    if (current.length === k) {
      results.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      comb(current, i + 1);
      current.pop();
    }
  }
  comb([], 0);
  return results;
}

/**
 * PokerHandEvaluator
 * @param {Array<string>} playerHand - Array of player hand card codes (e.g., ["AS", "KH"])
 * @param {Array<string>} boardCards - Array of board card codes (e.g., ["2C", "3D", "4S", ...])
 * @returns JSX with best hand and all evaluated hands
 */
const PokerHandEvaluator = ({ playerHand, boardCards, onReset, isShowdown, mode = 'high' }) => {
  // Selection state for player and board cards
  const [selectedPlayer, setSelectedPlayer] = useState([]); // indices of selected player cards
  const [selectedBoard, setSelectedBoard] = useState([]);   // indices of selected board cards

  // Compute all 2-card combos from hand and 3-card combos from board
  const allHands = useMemo(() => {
    if (!playerHand || !boardCards || playerHand.length < 2 || boardCards.length < 3) return [];
    const handCombos = k_combinations(playerHand, 2);
    const boardCombos = k_combinations(boardCards, 3);
    const hands = [];
    for (let hi = 0; hi < handCombos.length; hi++) {
      for (let bi = 0; bi < boardCombos.length; bi++) {
        const h = handCombos[hi];
        const b = boardCombos[bi];
        // Normalize card codes
        const combo = [...h, ...b].map(card => {
          if (!card) return card;
          let c = card.toUpperCase();
          if (c[0] === '0') c = 'T' + c[1];
          return c;
        });
        let value;
        try {
          if (mode === 'low') {
            // Convert to rank numbers for low hand evaluation
            const ranks = cardCodesToRanks(combo);
            value = evaluateLowHandRank(ranks);
          } else {
            value = evaluateCards(combo);
          }
        } catch (e) {
          value = 'Invalid';
        }
        hands.push({ cards: combo, value, handIdx: hi, boardIdx: bi });
      }
    }
    return hands;
  }, [playerHand, boardCards, mode]);

  // Find the best hand (lowest value)
  const bestHand = useMemo(() => {
    if (!allHands.length) return null;
    return allHands.reduce((best, h) => (best === null || (typeof h.value === 'number' && h.value < best.value)) ? h : best, null);
  }, [allHands]);

  // Auto-select best hand at showdown
  useEffect(() => {
    if (isShowdown && bestHand) {
      // Find indices of best hand cards in playerHand and boardCards
      const playerIdxs = [];
      const boardIdxs = [];
      bestHand.cards.forEach(card => {
        const pIdx = playerHand.findIndex((c, i) => c && card && c.toUpperCase().replace(/^0/, 'T') === card && !playerIdxs.includes(i));
        if (pIdx !== -1) {
          playerIdxs.push(pIdx);
        } else {
          const bIdx = boardCards.findIndex((c, i) => c && card && c.toUpperCase().replace(/^0/, 'T') === card && !boardIdxs.includes(i));
          if (bIdx !== -1) boardIdxs.push(bIdx);
        }
      });
      setSelectedPlayer(playerIdxs);
      setSelectedBoard(boardIdxs);
    }
  }, [isShowdown, bestHand, playerHand, boardCards]);

  // Deselect all on reset
  useEffect(() => {
    if (onReset) {
      setSelectedPlayer([]);
      setSelectedBoard([]);
    }
  }, [onReset]);

  // Handlers for manual selection
  const togglePlayerCard = idx => {
    setSelectedPlayer(sel => sel.includes(idx) ? sel.filter(i => i !== idx) : [...sel, idx]);
  };
  const toggleBoardCard = idx => {
    setSelectedBoard(sel => sel.includes(idx) ? sel.filter(i => i !== idx) : [...sel, idx]);
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h4>Best 5-card Hand ({mode === 'low' ? 'Low' : 'High'})</h4>
      {bestHand ? (
        <div>
          <b>Cards:</b> {bestHand.cards.join(" ")}<br />
          <b>Value:</b> {bestHand.value}
        </div>
      ) : (
        <div>No valid 5-card hand.</div>
      )}
      <div style={{ marginTop: 10 }}>
        <b>Player Hand:</b>
        {playerHand.map((card, idx) => (
          <span
            key={idx}
            onClick={() => togglePlayerCard(idx)}
            style={{
              margin: '0 6px',
              padding: '2px 6px',
              border: selectedPlayer.includes(idx) ? '2px solid #198754' : '1px solid #ccc',
              borderRadius: 4,
              cursor: 'pointer',
              background: selectedPlayer.includes(idx) ? '#d1e7dd' : 'transparent',
              fontWeight: selectedPlayer.includes(idx) ? 'bold' : 'normal',
            }}
          >{card}</span>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <b>Board Cards:</b>
        {boardCards.map((card, idx) => (
          <span
            key={idx}
            onClick={() => toggleBoardCard(idx)}
            style={{
              margin: '0 6px',
              padding: '2px 6px',
              border: selectedBoard.includes(idx) ? '2px solid #198754' : '1px solid #ccc',
              borderRadius: 4,
              cursor: 'pointer',
              background: selectedBoard.includes(idx) ? '#d1e7dd' : 'transparent',
              fontWeight: selectedBoard.includes(idx) ? 'bold' : 'normal',
            }}
          >{card}</span>
        ))}
      </div>
      <details style={{ marginTop: 10 }}>
        <summary>All combinations</summary>
        <ul style={{ fontSize: '0.95em' }}>
          {allHands.map((h, i) => (
            <li key={i}>{h.cards.join(" ")} &mdash; {h.value}</li>
          ))}
        </ul>
      </details>
    </div>
  );
};

export default PokerHandEvaluator;
