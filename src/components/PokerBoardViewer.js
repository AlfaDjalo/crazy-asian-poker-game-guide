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

/**
 * Parse position string (xyz format) into row, col, and offset
 * @param {string} positionStr - Position in xyz format (e.g., "341")
 * @returns {Object} { row, col, offset }
 */
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

/**
 * Get the display position for a card based on its offset
 * @param {number} row - Original row
 * @param {number} col - Original column  
 * @param {number} offset - Offset type (0=none, 1=up, 2=right)
 * @returns {Object} { displayRow, displayCol }
 */
const getDisplayPosition = (row, col, offset) => {
  // Keep cards in their original positions regardless of offset
  return { displayRow: row, displayCol: col };
};

/**
 * Calculate centering offsets for dealt cards
 * @param {Array} positions - Array of position strings
 * @returns {Object} { rowOffset, colOffset }
 */
const calculateCenteringOffsets = (positions) => {
  if (!positions || positions.length === 0) {
    return { rowOffset: 0, colOffset: 0 };
  }

  let minRow = BOARD_ROWS;
  let maxRow = -1;
  let minCol = BOARD_COLS;
  let maxCol = -1;

  // Find the bounding box of all dealt cards
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

  // Calculate the size of the bounding box
  const usedRows = maxRow - minRow + 1;
  const usedCols = maxCol - minCol + 1;

  // Calculate offsets to center the cards
  const rowOffset = Math.floor((BOARD_ROWS - usedRows) / 2) - minRow;
  const colOffset = Math.floor((BOARD_COLS - usedCols) / 2) - minCol;

  return { rowOffset, colOffset };
};

/**
 * Main poker board viewer component with 5x10 grid layout
 */
const PokerBoardViewer = ({ 
  configPath = "/data/boards/double-board.json", 
  predefinedCards = null, 
  dealDelayMs = DEFAULT_DEAL_DELAY,
  playerHandCards = null, // array of card codes for the player hand, or null for random
  playerHandSize = 2, // number of cards in the player hand (default 2)
  dealPlayerHand = false, // only deal player hand if true
  renderExtra = null // NEW: render prop for extra content
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
  
  // Player hand state - FIXED: Store the actual player hand cards persistently
  const [playerHand, setPlayerHand] = useState(Array(playerHandSize).fill(null));
  const [playerHandDealt, setPlayerHandDealt] = useState(dealPlayerHand ? 0 : playerHandSize);
  const [isDealingPlayerHand, setIsDealingPlayerHand] = useState(false);
  const [playerHandInitialized, setPlayerHandInitialized] = useState(false);
  
  // FIXED: Generate initial player hand cards and store them persistently
  const generateInitialPlayerHand = useCallback(() => {
    if (playerHandCards && Array.isArray(playerHandCards) && playerHandCards.length > 0) {
      return [
        ...playerHandCards.slice(0, playerHandSize),
        ...Array(Math.max(0, playerHandSize - playerHandCards.length)).fill(null)
      ];
    } else if (deck.length > 0) {
      // Generate random cards from the full deck (not filtered by board cards)
      const shuffledDeck = [...deck].sort(() => Math.random() - 0.5);
      return shuffledDeck.slice(0, playerHandSize);
    } else {
      return Array(playerHandSize).fill(null);
    }
  }, [playerHandCards, playerHandSize, deck]);

  // Flatten predefined cards if they're in nested array format
  const flattenedPredefinedCards = useMemo(() => {
    if (!predefinedCards) return null;
    
    // Check if it's a nested array structure
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
    // Don't reset player hand state here - handle it separately
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

  // Calculate centering offsets based on ALL cards that will be dealt (final layout)
  const centeringOffsets = useMemo(() => {
    if (!config?.boardCardSchedule) return { rowOffset: 0, colOffset: 0 };
    
    // Get all positions from all steps to calculate centering based on final layout
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
        
        // Initialize deck
        const newDeck = generateDeck();
        setDeck(newDeck);
        console.log("Generated random deck:", newDeck);
        
        // Reset state
        resetGameState();
      })
      .catch((err) => {
        console.error("Failed to load config:", err);
        setError(`Failed to load config: ${err.message}`);
      });
  }, [resolvedConfigPath, resetGameState]);

  // FIXED: Initialize player hand once when deck is available
  useEffect(() => {
    if (!dealPlayerHand) return;
    if (deck.length > 0 && !playerHandInitialized) {
      const initialHand = generateInitialPlayerHand();
      setPlayerHand(initialHand);
      setPlayerHandDealt(0);
      setPlayerHandInitialized(true);
      console.log("Initial player hand generated:", initialHand);
    }
  }, [dealPlayerHand, deck.length, playerHandInitialized]); // Remove generateInitialPlayerHand from deps

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
    
    // Apply centering offsets
    const centeredRow = Math.max(0, Math.min(BOARD_ROWS - 1, displayRow + offsets.rowOffset));
    const centeredCol = Math.max(0, Math.min(BOARD_COLS - 1, displayCol + offsets.colOffset));
    
    // Get card to deal
    let cardToDeal = null;
    if (flattenedPredefinedCards && cardIndex < flattenedPredefinedCards.length) {
      cardToDeal = flattenedPredefinedCards[cardIndex];
    } else {
      cardToDeal = deck[cardIndex] || null;
    }
    
    console.log(`Dealing card ${cardToDeal} to position ${positionStr} (${row},${col}) -> display (${displayRow},${displayCol}) -> centered (${centeredRow},${centeredCol})`);
    
    // Create card object with position info
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

    const { originalRow, originalCol, offset } = cardObj;
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
    
    // Update board state to reflect selection
    setBoardState(prevBoard => {
      const newBoard = prevBoard.map(row => [...row]);
      const cardKey = `${originalRow}-${originalCol}`;
      const isSelected = !cardObj.isSelected; // Toggle based on current state
      
      // Find and update the card in place
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

  // FIXED: Reset hand (generate new random cards)
  const resetHand = () => {
    console.log("Reset hand called");
    
    // Reset board state
    resetGameState();
    
    // Generate new deck if not using predefined cards
    if (!flattenedPredefinedCards) {
      const newDeck = generateDeck();
      setDeck(newDeck);
      console.log("Reshuffled deck:", newDeck);
    }
    
    // Reset and regenerate player hand
    if (dealPlayerHand) {
      setPlayerHandInitialized(false);
      setPlayerHandDealt(0);
      setIsDealingPlayerHand(false);
      
      // Generate new player hand immediately
      const newPlayerHand = generateInitialPlayerHand();
      setPlayerHand(newPlayerHand);
      setPlayerHandInitialized(true);
      console.log("New player hand generated:", newPlayerHand);
    }
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
            style={{
              position: 'absolute',
              left: `${idx * cardWidth * (1 - overlap)}px`,
              zIndex: idx,
              boxShadow: idx === visibleCards.length - 1 ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
              borderRadius: '4px',
            }}
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
              
              // Check if there should be a board name at this centered position
              // We need to reverse the centering to find the original position
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
                      className={`card-container ${cardObj.isSelected ? 'selected' : ''} ${cardObj.offset === OFFSET_UP ? 'offset-up' : ''} ${cardObj.offset === OFFSET_RIGHT ? 'offset-right' : ''}`}
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
    if (step !== 0) return; // Only auto-deal on step 0
    if (isDealing) return; // Don't start if already dealing
    if (dealtCount > 0) return; // Don't start if cards already dealt
    
    const hasPreflop = config.boardCardSchedule?.length > 0 && config.boardCardSchedule[0].length > 0;
    const shouldDealPlayerHand = dealPlayerHand && playerHandInitialized && playerHandDealt === 0;
    
    // Start dealing if there are preflop cards OR if we need to deal player hand
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
      {/* ...existing code for blinds and boards... */}
      {renderBoard()}
      {/* Player hand below the board */}
      {renderPlayerHand()}
      {/* Render extra content if provided (e.g., PokerHandEvaluator) */}
      {renderExtra && renderExtra({ playerHand, boardState })}
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