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
  // switch (offset) {
  //   case OFFSET_UP:
  //     return { displayRow: Math.max(0, row - 1), displayCol: col };
  //   case OFFSET_RIGHT:
  //     return { displayRow: row, displayCol: Math.min(BOARD_COLS - 1, col + 1) };
  //   default:
  //     return { displayRow: row, displayCol: col };
  // }
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
  dealDelayMs = DEFAULT_DEAL_DELAY 
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



    // Update board state to reflect selection
    // setBoardState(prevBoard => {
    //   const newBoard = prevBoard.map(row => [...row]);
      
    //   // Find and update the card
    //   for (let r = 0; r < BOARD_ROWS; r++) {
    //     for (let c = 0; c < BOARD_COLS; c++) {
    //       const cell = newBoard[r][c];
    //       if (cell && cell.originalRow === originalRow && cell.originalCol === originalCol) {
    //         // Toggle selection and update display position
    //         const isSelected = !cell.isSelected;
    //         const newOffset = isSelected ? OFFSET_UP : offset;
    //         const { displayRow, displayCol } = getDisplayPosition(originalRow, originalCol, newOffset);
            
    //         // Apply centering offsets
    //         const centeredRow = Math.max(0, Math.min(BOARD_ROWS - 1, displayRow + centeringOffsets.rowOffset));
    //         const centeredCol = Math.max(0, Math.min(BOARD_COLS - 1, displayCol + centeringOffsets.colOffset));
            
    //         // Clear old position
    //         newBoard[r][c] = null;
            
    //         // Set new position
    //         newBoard[centeredRow][centeredCol] = {
    //           ...cell,
    //           isSelected: isSelected,
    //           offset: newOffset,
    //           displayRow: centeredRow,
    //           displayCol: centeredCol
    //         };
    //         break;
    //       }
      //   }
      // }
      
    //   return newBoard;
    // });
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

  // Auto-deal preflop cards
  useEffect(() => {
    if (config && step === 0 && !isDealing && dealtCount === 0 && config.boardCardSchedule?.length > 0) {
      console.log("Auto-starting preflop deal");
      setIsDealing(true);
    }
  }, [config]);

  // useEffect(() => {
  //   if (config && step === 0 && !isDealing && dealtCount === 0) {
  //     setIsDealing(true);
  //   }
  // }, [config, step, isDealing, dealtCount]);

  // Reset hand
  const resetHand = () => {
    if (!flattenedPredefinedCards) {
      const newDeck = generateDeck();
      setDeck(newDeck);
      console.log("Reshuffled deck:", newDeck);
    }
    
    resetGameState();
  };

  // Render the 5x10 grid
  const renderBoard = () => {
    return (
      <div className="poker-grid">
        {Array(BOARD_ROWS).fill(null).map((_, rowIndex) => (
          <div key={rowIndex} className="poker-row">
            {Array(BOARD_COLS).fill(null).map((_, colIndex) => {
              const cardObj = boardState[rowIndex][colIndex];
              // const boardName = config?.boardNames?.[rowIndex]; // Get board name for this row
              const boardName = config?.boardNames?.[rowIndex.toString().padStart(2, '0')];
              console.log(`Row ${rowIndex}, looking for key "${rowIndex.toString().padStart(2, '0')}", boardNames:`, config?.boardNames, `found: "${boardName}"`);
              return (
                <div key={`${rowIndex}-${colIndex}`} className="poker-cell">
                  {colIndex === 0 && boardName && (
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

  // const renderBoard = () => {
  //   return (
  //     <div className="poker-grid">
  //       {Array(BOARD_ROWS).fill(null).map((_, rowIndex) => (
  //         <div key={rowIndex} className="poker-row">
  //           {Array(BOARD_COLS).fill(null).map((_, colIndex) => {
  //             const cardObj = boardState[rowIndex][colIndex];
  //             return (
  //               <div key={`${rowIndex}-${colIndex}`} className="poker-cell">
  //                 {cardObj && (
  //                   <div 
  //                     className={`card-container ${cardObj.isSelected ? 'selected' : ''} ${cardObj.offset === OFFSET_UP ? 'offset-up' : ''} ${cardObj.offset === OFFSET_RIGHT ? 'offset-right' : ''}`}
  //                     onClick={() => handleCardClick(cardObj)}
  //                   >
  //                     <PokerCard card={cardObj.card} />
  //                   </div>
  //                 )}
  //               </div>
  //             );
  //           })}
  //         </div>
  //       ))}
  //     </div>
  //   );
  // };

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (!config) {
    return <div className="loading">Loading poker board configuration...</div>;
  }

  return (
    <div className="poker-board-viewer">
      <h3>{config.name}</h3>
      
      {config.blinds && (
        <div className="blinds">
          Blinds: {config.blinds.join('/')}
        </div>
      )}
      
      {renderBoard()}
      
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
      
      <div className="debug-info">
        <div>Current step: {step + 1}/{config.boardCardSchedule?.length || 0}</div>
        <div>Cards dealt: {dealtCount}</div>
        <div>Selected cards: {selectedCards.size}</div>
        <div>Mode: {flattenedPredefinedCards ? "Predefined cards" : "Random deck"}</div>
        <div>Centering offsets: row={centeringOffsets.rowOffset}, col={centeringOffsets.colOffset}</div>
      </div>
    </div>
  );
};

export default PokerBoardViewer;