// Add missing imports and fix the auto-selection logic
import React, { useEffect, useState, useCallback, useMemo } from "react";
import useBaseUrl from '@docusaurus/useBaseUrl';
import PokerCard from './PokerCard';
import { generateDeck, isValidCard } from './deckUtils';
import "../css/poker-board-viewer.css";

// Constants
const BOARD_ROWS = 5;
const BOARD_COLS = 10;
const DEFAULT_DEAL_DELAY = 1000;

// Offset types
const OFFSET_NONE = 0;
const OFFSET_UP = 1;
const OFFSET_RIGHT = 2;

const PokerBoardViewer = ({ 
  configPath = "/data/boards/double-board.json", 
  predefinedCards = null, 
  dealDelayMs = DEFAULT_DEAL_DELAY,
  playerHandCards = null,
  playerHandSize = 2,
  dealPlayerHand = false,
  renderExtra = null,
  mode = 'high' // NEW: mode prop for high/low hand evaluation
}) => {
  const resolvedConfigPath = useBaseUrl(configPath);
  
  // State management
  const [config, setConfig] = useState(null);
  const [deck, setDeck] = useState([]);
  const [step, setStep] = useState(0);
  const [dealtCount, setDealtCount] = useState(0);
  const [isDealing, setIsDealing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCards, setSelectedCards] = useState(new Set());
  
  // Board state: 5x10 grid where each cell can contain a card object
  const [boardState, setBoardState] = useState(() => 
    Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null))
  );
  
  // Player hand state
  const [playerHand, setPlayerHand] = useState(Array(playerHandSize).fill(null));
  const [playerHandDealt, setPlayerHandDealt] = useState(dealPlayerHand ? 0 : playerHandSize);
  const [isDealingPlayerHand, setIsDealingPlayerHand] = useState(false);
  const [playerHandInitialized, setPlayerHandInitialized] = useState(false);
  
  // Player hand selection state
  const [selectedPlayerHand, setSelectedPlayerHand] = useState([]);
  
  // Track selected indices for auto-selection of best hand
  const [autoSelectedPlayerHand, setAutoSelectedPlayerHand] = useState([]);
  const [autoSelectedBoardCards, setAutoSelectedBoardCards] = useState([]);

  // Helper to flatten boardState to a list of card objects with their positions
  const getFlatBoardCards = () => {
    const cards = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const cell = boardState[r][c];
        if (cell && cell.card) {
          cards.push({ ...cell, row: r, col: c });
        }
      }
    }
    return cards;
  };

  // Helper to get the flat index of a board card for auto-selection
  const flatBoardCardsIndex = useCallback((row, col) => {
    let idx = 0;
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        if (boardState[r][c] && boardState[r][c].card) {
          if (r === row && c === col) return idx;
          idx++;
        }
      }
    }
    return -1;
  }, [boardState]);

  // Auto-select best hand when all board cards are dealt
  useEffect(() => {
    if (!dealPlayerHand || !playerHand || !playerHand.filter(Boolean).length) return;
    if (!config || !config.boardCardSchedule) return;
    // All board cards dealt?
    const totalBoardCards = config.boardCardSchedule.flat().length;
    const flatBoardCards = getFlatBoardCards();
    if (flatBoardCards.length !== totalBoardCards) {
      setAutoSelectedPlayerHand([]);
      setAutoSelectedBoardCards([]);
      return;
    }
    try {
      const { evaluateCards, evaluateLowHandRank, cardCodesToRanks } = require('../phe/lib/phe.js');
      const normalizeCard = (card) => {
        if (!card || typeof card !== 'string') return null;
        let c = card.trim();
        let rank = c[0].toUpperCase();
        let suit = c[1] ? c[1].toLowerCase() : '';
        if (rank === '0') rank = 'T';
        return rank + suit;
      };
      const validPlayerHand = playerHand.filter(Boolean).map(normalizeCard);
      const validBoardCards = flatBoardCards.map(obj => normalizeCard(obj.card));
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
      const handCombos = k_combinations(validPlayerHand, 2);
      const boardCombos = k_combinations(validBoardCards, 3);
      let best = null;
      for (let hi = 0; hi < handCombos.length; hi++) {
        for (let bi = 0; bi < boardCombos.length; bi++) {
          const combo = [...handCombos[hi], ...boardCombos[bi]];
          if (combo.length !== 5 || combo.some(card => !card)) continue;
          let value;
          if (mode === 'low') {
            const ranks = cardCodesToRanks(combo);
            if (ranks.some(rank => rank === null || isNaN(rank))) {
              value = 99;
            } else {
              value = evaluateLowHandRank(ranks);
            }
          } else {
            value = evaluateCards(combo);
          }
          if (!value || value === 0 || typeof value !== 'number') continue;
          if (!best || value < best.value) {
            const playerIdxs = handCombos[hi].map(card => validPlayerHand.findIndex(c => c === card));
            const boardIdxs = boardCombos[bi].map(card => validBoardCards.findIndex(c => c === card));
            best = { value, playerIdxs, boardIdxs };
          }
        }
      }
      if (best && !(mode === "low" && best.value === 99)) {
        setAutoSelectedPlayerHand(best.playerIdxs);
        setAutoSelectedBoardCards(best.boardIdxs);
      } else {
        setAutoSelectedPlayerHand([]);
        setAutoSelectedBoardCards([]);
      }
    } catch (e) {
      console.error('Error in auto-selection:', e);
      setAutoSelectedPlayerHand([]);
      setAutoSelectedBoardCards([]);
    }
  }, [dealPlayerHand, playerHand, boardState, config, mode]);

  // Generate initial player hand cards and store them persistently
  const generateInitialPlayerHandAndDeck = useCallback(() => {
    let hand = [];
    let deckCopy = [...deck];
    if (playerHandCards && Array.isArray(playerHandCards) && playerHandCards.length > 0) {
      hand = [
        ...playerHandCards.slice(0, playerHandSize),
        ...Array(Math.max(0, playerHandSize - playerHandCards.length)).fill(null)
      ];
      // Remove these cards from the deck
      hand.forEach(card => {
        if (card) {
          const idx = deckCopy.indexOf(card);
          if (idx !== -1) deckCopy.splice(idx, 1);
        }
      });
    } else if (deck.length > 0) {
      // Generate random cards from the full deck
      const shuffledDeck = [...deckCopy].sort(() => Math.random() - 0.5);
      hand = shuffledDeck.slice(0, playerHandSize);
      // Remove these cards from the deck
      hand.forEach(card => {
        const idx = deckCopy.indexOf(card);
        if (idx !== -1) deckCopy.splice(idx, 1);
      });
    } else {
      hand = Array(playerHandSize).fill(null);
    }
    return { hand, deckWithoutHand: deckCopy };
  }, [playerHandCards, playerHandSize, deck]);

  // Parse position string (xyz format) into row, col, and offset
  const parsePosition = (positionStr) => {
    const str = positionStr.toString();
    if (str.length !== 3) {
      console.error(`Invalid position format: ${positionStr}. Expected xyz format.`);
      return null;
    }
    
    const row = parseInt(str[0], 10);
    const col = parseInt(str[1], 10);
    const offset = parseInt(str[2], 10);
    
    if (row >= BOARD_ROWS || col >= BOARD_COLS || ![0, 1, 2].includes(offset)) {
      console.error(`Invalid position values: row=${row}, col=${col}, offset=${offset}`);
      return null;
    }
    
    return { row, col, offset };
  };

  // Get the display position for a card based on its offset
  const getDisplayPosition = (row, col, offset) => {
    return { displayRow: row, displayCol: col };
  };

  // Calculate centering offsets for dealt cards
  const calculateCenteringOffsets = (positions) => {
    if (!positions || positions.length === 0) {
      return { rowOffset: 0, colOffset: 0 };
    }

    let minRow = BOARD_ROWS;
    let maxRow = -1;
    let minCol = BOARD_COLS;
    let maxCol = -1;

    positions.forEach(positionStr => {
      const position = parsePosition(positionStr);
      if (position) {
        const { displayRow, displayCol } = getDisplayPosition(position.row, position.col, position.offset);
        minRow = Math.min(minRow, displayRow);
        maxRow = Math.max(maxRow, displayRow);
        minCol = Math.min(minCol, displayCol);
        maxCol = Math.max(maxCol, displayCol);
      }
    });

    const usedRows = maxRow - minRow + 1;
    const usedCols = maxCol - minCol + 1;

    const rowOffset = Math.floor((BOARD_ROWS - usedRows) / 2) - minRow;
    const colOffset = Math.floor((BOARD_COLS - usedCols) / 2) - minCol;

    return { rowOffset, colOffset };
  };

  // Flatten predefined cards if they're in nested array format
  const flattenedPredefinedCards = useMemo(() => {
    if (!predefinedCards) return null;
    
    if (Array.isArray(predefinedCards) && predefinedCards.length > 0 && Array.isArray(predefinedCards[0])) {
      return predefinedCards.flat();
    }
    
    return predefinedCards;
  }, [predefinedCards]);

  // Reset game state
  const resetGameState = useCallback(() => {
    setStep(0);
    setDealtCount(0);
    setIsDealing(false);
    setSelectedCards(new Set());
    setBoardState(Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null)));
  }, []);

  // Validate predefined cards format
  const validatePredefinedCards = (cards) => {
    if (!Array.isArray(cards)) return false;
    return cards.every(card => card === null || isValidCard(card));
  };

  // Get all positions that should be dealt up to current step
  const getPositionsThroughStep = useCallback((targetStep) => {
    if (!config?.boardCardSchedule) return [];
    
    let allPositions = [];
    for (let s = 0; s <= targetStep; s++) {
      if (s < config.boardCardSchedule.length) {
        allPositions = [...allPositions, ...config.boardCardSchedule[s]];
      }
    }
    return allPositions;
  }, [config]);

  // Calculate centering offsets based on ALL cards that will be dealt
  const centeringOffsets = useMemo(() => {
    if (!config?.boardCardSchedule) return { rowOffset: 0, colOffset: 0 };
    
    const allPositions = config.boardCardSchedule.flat();
    return calculateCenteringOffsets(allPositions);
  }, [config]);

  // Load configuration
  useEffect(() => {
    console.log("Fetching config from:", resolvedConfigPath);
    
    fetch(resolvedConfigPath)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status} — URL: ${resolvedConfigPath}`);
        }
        return res.json();
      })
      .then((data) => {
        console.log("Config loaded:", data);
        setConfig(data);
        
        const newDeck = generateDeck();
        setDeck(newDeck);
        console.log("Generated random deck:", newDeck);
        
        resetGameState();
      })
      .catch((err) => {
        console.error("Failed to load config:", err);
        setError(`Failed to load config: ${err.message}`);
      });
  }, [resolvedConfigPath, resetGameState]);

  // Initialize player hand and update deck to remove those cards
  useEffect(() => {
    if (!dealPlayerHand) return;
    if (deck.length > 0 && !playerHandInitialized) {
      const { hand: initialHand, deckWithoutHand } = generateInitialPlayerHandAndDeck();
      setPlayerHand(initialHand);
      setDeck(deckWithoutHand);
      setPlayerHandDealt(0);
      setPlayerHandInitialized(true);
      console.log("Initial player hand generated:", initialHand);
      console.log("Deck after removing player hand:", deckWithoutHand);
    }
  }, [dealPlayerHand, deck.length, playerHandInitialized, generateInitialPlayerHandAndDeck]);

  // Validate predefined cards if provided
  useEffect(() => {
    if (flattenedPredefinedCards && !validatePredefinedCards(flattenedPredefinedCards)) {
      setError("Invalid predefined cards format");
    }
  }, [flattenedPredefinedCards]);

  // Deal animation effect
  useEffect(() => {
    if (!config || !isDealing) return;
    
    const positionsToDeal = getPositionsThroughStep(step);
    
    if (dealtCount < positionsToDeal.length) {
      const timer = setTimeout(() => {
        const positionToDeal = positionsToDeal[dealtCount];
        dealCardToPosition(positionToDeal, dealtCount, centeringOffsets);
        setDealtCount(dealtCount + 1);
      }, dealDelayMs);
      
      return () => clearTimeout(timer);
    } else {
      setIsDealing(false);
    }
  }, [dealtCount, isDealing, config, step, dealDelayMs, getPositionsThroughStep, centeringOffsets]);

  // Animate dealing player hand
  useEffect(() => {
    if (!dealPlayerHand) return;
    if (!isDealingPlayerHand) return;
    if (playerHandDealt < playerHand.filter(Boolean).length) {
      const timeout = setTimeout(() => {
        setPlayerHandDealt(playerHandDealt + 1);
      }, dealDelayMs);
      return () => clearTimeout(timeout);
    } else {
      setIsDealingPlayerHand(false);
    }
  }, [isDealingPlayerHand, playerHandDealt, playerHand, dealDelayMs, dealPlayerHand]);

  // Deal a card to a specific position
  const dealCardToPosition = (positionStr, cardIndex, offsets) => {
    const position = parsePosition(positionStr);
    if (!position) return;
    
    const { row, col, offset } = position;
    const { displayRow, displayCol } = getDisplayPosition(row, col, offset);
    
    const centeredRow = Math.max(0, Math.min(BOARD_ROWS - 1, displayRow + offsets.rowOffset));
    const centeredCol = Math.max(0, Math.min(BOARD_COLS - 1, displayCol + offsets.colOffset));
    
    let cardToDeal = null;
    if (flattenedPredefinedCards && cardIndex < flattenedPredefinedCards.length) {
      cardToDeal = flattenedPredefinedCards[cardIndex];
    } else {
      cardToDeal = deck[cardIndex] || null;
    }
    
    console.log(`Dealing card ${cardToDeal} to position ${positionStr} (${row},${col}) -> display (${displayRow},${displayCol}) -> centered (${centeredRow},${centeredCol})`);
    
    const cardObj = {
      card: cardToDeal,
      originalRow: row,
      originalCol: col,
      offset: offset,
      displayRow: centeredRow,
      displayCol: centeredCol,
      positionStr: positionStr,
      isSelected: false
    };
    
    setBoardState(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      newBoard[centeredRow][centeredCol] = cardObj;
      return newBoard;
    });
  };

  // Handle card selection
  const handleCardClick = (cardObj) => {
    if (!cardObj) return;
    
    console.log(`Card clicked: ${cardObj.card} at (${cardObj.originalRow},${cardObj.originalCol}), currently selected: ${cardObj.isSelected}`);

    const { originalRow, originalCol } = cardObj;
    const cardKey = `${originalRow}-${originalCol}`;
    
    setSelectedCards(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(cardKey)) {
        newSelected.delete(cardKey);
      } else {
        newSelected.add(cardKey);
      }
      console.log(`Selection toggled. New selection state:`, newSelected);
      return newSelected;
    });
    
    setBoardState(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      const isSelected = !cardObj.isSelected;
      
      for (let r = 0; r < BOARD_ROWS; r++) {
        for (let c = 0; c < BOARD_COLS; c++) {
          const cell = newBoard[r][c];
          if (cell && cell.originalRow === originalRow && cell.originalCol === originalCol) {
            newBoard[r][c] = {
              ...cell,
              isSelected: isSelected
            };
            break;
          }
        }
      }
      
      return newBoard;
    });
  };

  // Deal next street
  const dealNextStreet = () => {
    console.log("dealNextStreet called, current step:", step, "config length:", config?.boardCardSchedule?.length);
    if (!config || step >= config.boardCardSchedule.length - 1) return;
    
    const nextStep = step + 1;
    const currentPositions = getPositionsThroughStep(step);
    
    setStep(nextStep);
    setIsDealing(true);
    setDealtCount(currentPositions.length);
  };

  // Reset hand
  const resetHand = () => {
    console.log("Reset hand called");
    resetGameState();
    
    if (!flattenedPredefinedCards) {
      let newDeck = generateDeck();
      newDeck = [...newDeck].sort(() => Math.random() - 0.5);
      let newPlayerHand = Array(playerHandSize).fill(null);
      let deckWithoutHand = [...newDeck];
      
      if (dealPlayerHand) {
        setPlayerHandInitialized(false);
        setPlayerHandDealt(0);
        setIsDealingPlayerHand(false);
        
        const result = (() => {
          let hand = [];
          let deckCopy = [...newDeck];
          if (playerHandCards && Array.isArray(playerHandCards) && playerHandCards.length > 0) {
            hand = [
              ...playerHandCards.slice(0, playerHandSize),
              ...Array(Math.max(0, playerHandSize - playerHandCards.length)).fill(null)
            ];
            hand.forEach(card => {
              if (card) {
                const idx = deckCopy.indexOf(card);
                if (idx !== -1) deckCopy.splice(idx, 1);
              }
            });
          } else {
            const shuffledDeck = [...deckCopy];
            hand = shuffledDeck.slice(0, playerHandSize);
            hand.forEach(card => {
              const idx = deckCopy.indexOf(card);
              if (idx !== -1) deckCopy.splice(idx, 1);
            });
          }
          return { hand, deckWithoutHand: deckCopy };
        })();
        
        newPlayerHand = result.hand;
        deckWithoutHand = result.deckWithoutHand;
        setPlayerHand(newPlayerHand);
        setPlayerHandInitialized(true);
        console.log("New player hand generated:", newPlayerHand);
        console.log("Deck after removing player hand:", deckWithoutHand);
      }
      
      setDeck(deckWithoutHand);
      console.log("Deck for board dealing:", deckWithoutHand);
    } else {
      if (dealPlayerHand) {
        setPlayerHandInitialized(false);
        setPlayerHandDealt(0);
        setIsDealingPlayerHand(false);
        const { hand: newPlayerHand, deckWithoutHand } = generateInitialPlayerHandAndDeck();
        setPlayerHand(newPlayerHand);
        setDeck(deckWithoutHand);
        setPlayerHandInitialized(true);
        console.log("New player hand generated:", newPlayerHand);
        console.log("Deck after removing player hand:", deckWithoutHand);
      }
    }
  };

  // Deselect all player hand cards on hand reset
  useEffect(() => {
    setSelectedPlayerHand([]);
  }, [playerHand]);

  // Toggle selection of a player hand card
  const togglePlayerHandCard = (idx) => {
    setSelectedPlayerHand(sel =>
      sel.includes(idx) ? sel.filter(i => i !== idx) : [...sel, idx]
    );
  };

  // Render the player hand below the board
  const renderPlayerHand = () => {
    if (!dealPlayerHand) return null;
    const visibleCards = playerHand.filter(Boolean).slice(0, playerHandDealt);
    const overlap = 0.6;
    const cardWidth = 42;
    const cardHeight = 60;

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        margin: '20px 0 0 0',
        height: `${cardHeight}px`,
        position: 'relative',
        justifyContent: 'center',
      }}>
        {visibleCards.map((card, idx) => (
          <div
            key={`player-card-${idx}`}
            className={`player-hand-card${selectedPlayerHand.includes(idx) || autoSelectedPlayerHand.includes(idx) ? ' selected' : ''}`}
            style={{
              position: 'absolute',
              left: `${idx * cardWidth * (1 - overlap)}px`,
              zIndex: idx,
              boxShadow: idx === visibleCards.length - 1 ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            onClick={() => togglePlayerHandCard(idx)}
          >
            <PokerCard card={card} />
          </div>
        ))}
        <div style={{ width: `${(playerHandSize - 1) * cardWidth * (1 - overlap) + cardWidth}px`, height: `${cardHeight}px`, visibility: 'hidden' }} />
      </div>
    );
  };

  // Render the 5x10 grid
  const renderBoard = () => {
    return (
      <div className="poker-grid">
        {Array(BOARD_ROWS).fill(null).map((_, rowIndex) => (
          <div key={rowIndex} className="poker-row">
            {Array(BOARD_COLS).fill(null).map((_, colIndex) => {
              const cardObj = boardState[rowIndex][colIndex];
              
              const originalRow = rowIndex - centeringOffsets.rowOffset;
              const originalCol = colIndex - centeringOffsets.colOffset;
              const cellKey = `${originalRow}${originalCol}`;
              const boardName = (originalRow >= 0 && originalCol >= 0) ? config?.boardNames?.[cellKey] : null;
              
              return (
                <div key={`${rowIndex}-${colIndex}`} className="poker-cell">
                  {boardName && (
                    <div className="board-name">{boardName}</div>
                  )}
                  {cardObj && (
                    <div 
                      className={`card-container ${cardObj.isSelected ? 'selected' : ''} ${autoSelectedBoardCards.includes(flatBoardCardsIndex(rowIndex, colIndex)) ? 'selected' : ''} ${cardObj.offset === OFFSET_UP ? 'offset-up' : ''} ${cardObj.offset === OFFSET_RIGHT ? 'offset-right' : ''}`}
                      onClick={() => handleCardClick(cardObj)}
                    >
                      <PokerCard card={cardObj.card} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // Auto-deal preflop cards and player hand
  useEffect(() => {
    if (!config) return;
    if (step !== 0) return;
    if (isDealing) return;
    if (dealtCount > 0) return;
    
    const hasPreflop = config.boardCardSchedule?.length > 0 && config.boardCardSchedule[0].length > 0;
    const shouldDealPlayerHand = dealPlayerHand && playerHandInitialized && playerHandDealt === 0;
    
    if (hasPreflop || shouldDealPlayerHand) {
      console.log("Auto-starting deal - hasPreflop:", hasPreflop, "shouldDealPlayerHand:", shouldDealPlayerHand);
      
      if (hasPreflop) {
        setIsDealing(true);
      }
      
      if (shouldDealPlayerHand) {
        setIsDealingPlayerHand(true);
      }
    }
  }, [config, step, isDealing, dealtCount, dealPlayerHand, playerHandInitialized, playerHandDealt]);

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (!config) {
    return <div className="loading">Loading poker board configuration...</div>;
  }

  return (
    <div className="poker-board-viewer">
      <h3>{config.name}</h3>
      {renderBoard()}
      {renderPlayerHand()}
      {renderExtra && renderExtra({ playerHand, boardState, mode })}
      <div className="controls">
        <button
          onClick={dealNextStreet}
          disabled={step >= config.boardCardSchedule.length - 1 || isDealing}
        >
          Deal Next Street
        </button>
        <button 
          onClick={resetHand} 
          disabled={isDealing}
        >
          Replay Hand
        </button>
      </div>
    </div>
  );
};

export default PokerBoardViewer;