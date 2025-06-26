import React, { useMemo, useState, useEffect } from "react";

import { evaluateCards, evaluateLowHandRank, cardCodesToRanks } from '../phe/lib/phe.js';

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
 * Normalize card code to consistent format: 'RankSuit' (Rank uppercase, Suit lowercase)
 * e.g. 'as' -> 'As', '0h' -> 'Th', 'jh' -> 'Jh', 'QS' -> 'Qs'
 * @param {string} card - Card code like "AS", "0H", "th", "jh"
 * @returns {string} Normalized card code
 */
const normalizeCard = (card) => {
  if (!card || typeof card !== 'string') return null;
  let c = card.trim();
  let rank = c[0].toUpperCase();
  let suit = c[1] ? c[1].toLowerCase() : '';
  if (rank === '0') rank = 'T';
  return rank + suit;
};

/**
 * Check if two cards are the same after normalization
 * @param {string} card1 
 * @param {string} card2 
 * @returns {boolean}
 */
const cardsEqual = (card1, card2) => {
  const norm1 = normalizeCard(card1);
  const norm2 = normalizeCard(card2);
  return norm1 && norm2 && norm1 === norm2;
};

/**
 * PokerHandEvaluator
 * @param {Array<string>} playerHand - Array of player hand card codes (e.g., ["AS", "KH"])
 * @param {Array<string>} boardCards - Array of board card codes (e.g., ["2C", "3D", "4S", ...])
 * @returns JSX with best hand and all evaluated hands
 */
const PokerHandEvaluator = ({ 
  playerHand, 
  boardCards, 
  onReset, 
  isShowdown, 
  mode = 'high',
  onCardSelection = null // Callback to notify parent of selected cards
}) => {
  // Selection state for player and board cards
  const [selectedPlayer, setSelectedPlayer] = useState([]); // indices of selected player cards
  const [selectedBoard, setSelectedBoard] = useState([]);   // indices of selected board cards

  // Filter out null/undefined cards and normalize
  const validPlayerHand = useMemo(() => {
    if (!playerHand || !Array.isArray(playerHand)) return [];
    return playerHand
      .map(normalizeCard)
      .filter(card => card !== null);
  }, [playerHand]);

  const validBoardCards = useMemo(() => {
    if (!boardCards || !Array.isArray(boardCards)) return [];
    return boardCards
      .map(normalizeCard)
      .filter(card => card !== null);
  }, [boardCards]);

  // Compute all 2-card combos from hand and 3-card combos from board
  const allHands = useMemo(() => {
    if (validPlayerHand.length < 2 || validBoardCards.length < 3) return [];

    const handCombos = k_combinations(validPlayerHand, 2);
    const boardCombos = k_combinations(validBoardCards, 3);
    const hands = [];

    for (let hi = 0; hi < handCombos.length; hi++) {
      for (let bi = 0; bi < boardCombos.length; bi++) {
        const handCards = handCombos[hi];
        const boardCardsCombo = boardCombos[bi];
        // Normalize all cards to 'RankSuit' (Rank uppercase, Suit lowercase)
        const combo = [...handCards, ...boardCardsCombo].map(normalizeCard);

        // Double-check all cards are valid
        if (combo.length !== 5 || combo.some(card => !card)) {
          continue;
        }

        let value;
        try {
          if (mode === 'low') {
            const ranks = cardCodesToRanks(combo);
            if (ranks.some(rank => rank === null || isNaN(rank))) {
              value = 99; // Invalid low hand
            } else {
              value = evaluateLowHandRank(ranks);
            }
          } else {
            value = evaluateCards(combo);
            // Debug: log hands that evaluate as 0 or invalid
            if (!value || value === 0 || typeof value !== 'number') {
              console.warn('[DEBUG] High hand evaluated as zero/invalid:', {
                combo,
                evalResult: value
              });
              value = 'Invalid';
            }
          }
        } catch (e) {
          console.error('Error evaluating hand:', combo, e);
          value = 'Invalid';
        }

        hands.push({ 
          cards: combo, 
          value, 
          handIdx: hi, 
          boardIdx: bi,
          handCards: handCards.map(normalizeCard),
          boardCardsUsed: boardCardsCombo.map(normalizeCard)
        });
      }
    }
    return hands;
  }, [validPlayerHand, validBoardCards, mode]);

  // Find the best hand (lowest value for both high and low)
  const bestHand = useMemo(() => {
    if (!allHands.length) return null;
    
    const validHands = allHands.filter(h => 
      typeof h.value === 'number' && h.value > 0 && h.value !== 99
    );
    
    if (validHands.length === 0) return null;
    
    return validHands.reduce((best, current) => {
      if (mode === 'low') {
        // For low hands, lower value is better, but 99 means no qualifying low
        return (current.value < best.value) ? current : best;
      } else {
        // For high hands, lower value is better (in most poker evaluators)
        return (current.value < best.value) ? current : best;
      }
    }, validHands[0]);
  }, [allHands, mode]);

  // Auto-select best hand at showdown
  useEffect(() => {
    if (isShowdown && bestHand) {
      const playerIndices = [];
      const boardIndices = [];
      
      // Find indices of hand cards in player hand
      bestHand.handCards.forEach(card => {
        const index = validPlayerHand.findIndex((playerCard, i) => 
          cardsEqual(playerCard, card) && !playerIndices.includes(i)
        );
        if (index !== -1) {
          playerIndices.push(index);
        }
      });
      
      // Find indices of board cards used
      bestHand.boardCardsUsed.forEach(card => {
        const index = validBoardCards.findIndex((boardCard, i) => 
          cardsEqual(boardCard, card) && !boardIndices.includes(i)
        );
        if (index !== -1) {
          boardIndices.push(index);
        }
      });
      
      setSelectedPlayer(playerIndices);
      setSelectedBoard(boardIndices);
      
      // Notify parent component if callback provided
      if (onCardSelection) {
        onCardSelection({
          playerIndices,
          boardIndices,
          bestHand: bestHand
        });
      }
      
      console.log('Auto-selected cards:', { playerIndices, boardIndices, bestHand });
    }
  }, [isShowdown, bestHand, validPlayerHand, validBoardCards, onCardSelection]);

  // Deselect all on reset
  useEffect(() => {
    if (onReset) {
      setSelectedPlayer([]);
      setSelectedBoard([]);
    }
  }, [onReset]);

  // Handlers for manual selection
  const togglePlayerCard = (idx) => {
    setSelectedPlayer(sel => 
      sel.includes(idx) ? sel.filter(i => i !== idx) : [...sel, idx]
    );
  };
  
  const toggleBoardCard = (idx) => {
    setSelectedBoard(sel => 
      sel.includes(idx) ? sel.filter(i => i !== idx) : [...sel, idx]
    );
  };

  // Get description of hand strength
  const getHandDescription = (hand) => {
    if (!hand || hand.value === 'Invalid') return 'Invalid hand';
    if (mode === 'low') {
      if (hand.value === 99) return 'No qualifying low';
      return `Low hand rank: ${hand.value}`;
    } else {
      return `High hand value: ${hand.value}`;
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h4>Best 5-card Hand ({mode === 'low' ? 'Low' : 'High'})</h4>
      {mode === 'low' && bestHand && bestHand.value === 99 ? (
        <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>No low possible</div>
      ) : bestHand ? (
        <div>
          <b>Cards:</b> {bestHand.cards.join(" ")}<br />
          <b>Value:</b> {bestHand.value}<br />
          <b>Description:</b> {getHandDescription(bestHand)}<br />
          <b>Hand cards used:</b> {bestHand.handCards.join(" ")}<br />
          <b>Board cards used:</b> {bestHand.boardCardsUsed.join(" ")}
        </div>
      ) : (
        <div>No valid 5-card hand found.</div>
      )}
      
      <div style={{ marginTop: 10 }}>
        <b>Player Hand:</b>
        {validPlayerHand.map((card, idx) => (
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
          >
            {card}
          </span>
        ))}
      </div>
      
      <div style={{ marginTop: 10 }}>
        <b>Board Cards:</b>
        {validBoardCards.map((card, idx) => (
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
          >
            {card}
          </span>
        ))}
      </div>
      
      <details style={{ marginTop: 10 }}>
        <summary>All combinations ({allHands.length} total)</summary>
        <ul style={{ fontSize: '0.95em', maxHeight: '200px', overflowY: 'auto' }}>
          {allHands.map((h, i) => (
            <li key={i}>
              {h.cards.join(" ")} — {h.value} 
              {h === bestHand && <strong> (BEST)</strong>}
            </li>
          ))}
        </ul>
      </details>
      
      {/* Debug info */}
      <details style={{ marginTop: 10 }}>
        <summary>Debug Info</summary>
        <div style={{ fontSize: '0.85em', fontFamily: 'monospace' }}>
          <div>Valid player cards: {validPlayerHand.length} / {playerHand?.length || 0}</div>
          <div>Valid board cards: {validBoardCards.length} / {boardCards?.length || 0}</div>
          <div>Total combinations: {allHands.length}</div>
          <div>Valid combinations: {allHands.filter(h => typeof h.value === 'number' && h.value > 0 && h.value !== 99).length}</div>
          <div>Selected player indices: [{selectedPlayer.join(', ')}]</div>
          <div>Selected board indices: [{selectedBoard.join(', ')}]</div>
        </div>
      </details>
    </div>
  );
};

export default PokerHandEvaluator;