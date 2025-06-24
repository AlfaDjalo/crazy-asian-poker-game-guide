import React, { useEffect, useState, useCallback } from "react";
import useBaseUrl from '@docusaurus/useBaseUrl';
import PokerBoard from './PokerBoard';
import { generateDeck, isValidCard } from './deckUtils';
import "../css/poker-board-viewer.css";


/**
 * Main component that displays and controls poker boards based on a specific config format
 * @param {Object} props - Component props
 * @param {string} props.configPath - Path to config JSON
 * @param {Array<Array<string>>} [props.predefinedCards] - Optional array of arrays of card codes for each board
 * @param {number} [props.dealDelayMs] - Optional delay between dealing cards in ms
 */
const PokerBoardViewer = ({ 
  configPath = "/data/boards/double-board.json", 
  predefinedCards = null, 
  dealDelayMs = 1000 
}) => {
  const resolvedConfigPath = useBaseUrl(configPath);
  const [config, setConfig] = useState(null);
  const [deck, setDeck] = useState([]);
  const [step, setStep] = useState(0);
  const [dealtCount, setDealtCount] = useState(0);
  const [isDealing, setIsDealing] = useState(false);
  const [error, setError] = useState(null);
  const [boardStates, setBoardStates] = useState([]);
  
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
        
        // Initialize state
        setStep(0);
        setDealtCount(0);
        setIsDealing(false);
        setError(null);
        
        // Initialize board states based on config
        initializeBoards(data, newDeck);
      })
      .catch((err) => {
        console.error("Failed to load config:", err);
        setError(`Failed to load config: ${err.message}`);
      });
  }, [resolvedConfigPath]);

  // Debug predefined cards
  useEffect(() => {
    if (predefinedCards) {
      console.log("PredefinedCards provided:", predefinedCards);
      
      // Validate predefined cards
      const isValid = validatePredefinedCards(predefinedCards);
      if (!isValid) {
        setError("Invalid predefined cards format");
      }
    }
  }, [predefinedCards]);

  // Validate predefined cards format
  const validatePredefinedCards = (cards) => {
    if (!Array.isArray(cards)) return false;
    
    // Check each board's cards
    for (const board of cards) {
      if (!Array.isArray(board)) return false;
      
      // Check each card
      for (const card of board) {
        // Allow null cards (empty spaces)
        if (card !== null && !isValidCard(card)) {
          console.error("Invalid card found:", card);
          return false;
        }
      }
    }
    
    return true;
  };

  // Initialize board states based on config
  const initializeBoards = useCallback((configData, randomDeck) => {
    if (!configData || !configData.boardCardSchedule) return;
    
    // Find the maximum global index to determine board layout
    const allIndices = configData.boardCardSchedule.flat();
    if (allIndices.length === 0) {
      setError("No board cards defined in configuration");
      return;
    }

    // --- FIX: Group indices by 6s, starting from 1 (1-6, 7-12, ...)
    // Find min and max index
    const minIndex = Math.min(...allIndices);
    const maxIndex = Math.max(...allIndices);
    // Boards are: [1-6], [7-12], [13-18], ...
    const cardsPerBoard = 6;
    const numBoards = Math.ceil((maxIndex - minIndex + 1) / cardsPerBoard);
    const boards = [];
    for (let b = 0; b < numBoards; b++) {
      const start = minIndex + b * cardsPerBoard;
      const end = start + cardsPerBoard - 1;
      // Only include indices that are actually present in allIndices
      const boardIndices = [];
      for (let idx = start; idx <= end; idx++) {
        if (allIndices.includes(idx)) {
          boardIndices.push(idx);
        }
      }
      boards.push(boardIndices);
    }

    console.log("Detected board structure (by 6s):", boards);
    console.log(`Initializing ${boards.length} boards with ${cardsPerBoard} card slots each`);

    // Create empty boards with the right number of card slots
    const initialBoards = Array(boards.length).fill().map(() => Array(cardsPerBoard).fill(null));
    setBoardStates(initialBoards);

    // Check if predefined cards match the detected structure
    if (predefinedCards) {
      if (predefinedCards.length < boards.length) {
        console.warn(`Config requires ${boards.length} boards, but only ${predefinedCards.length} provided`);
      }
      // Additional validation - check cards per board
      predefinedCards.forEach((boardCards, i) => {
        if (boardCards.length < cardsPerBoard) {
          console.warn(`Board ${i+1} should have ${cardsPerBoard} cards, but only ${boardCards.length} provided`);
        }
      });
    }
  }, [predefinedCards]);

  // Get the current step's card indices from the board card schedule
  const getCurrentStepIndices = useCallback(() => {
    if (!config || !config.boardCardSchedule) return [];
    
    return step < config.boardCardSchedule.length ? config.boardCardSchedule[step] : [];
  }, [config, step]);

  // Get all indices that should be dealt up to the current step
  const getAllIndicesThroughCurrentStep = useCallback(() => {
    if (!config || !config.boardCardSchedule) return [];
    
    let allIndices = [];
    for (let s = 0; s <= step; s++) {
      if (s < config.boardCardSchedule.length) {
        allIndices = [...allIndices, ...config.boardCardSchedule[s]];
      }
    }
    return allIndices;
  }, [config, step]);

  // Animate dealing cards for the current street
  useEffect(() => {
    if (!config || !isDealing) return;
    
    // Get all indices that should be dealt up to this point
    const indicesToDeal = getAllIndicesThroughCurrentStep();
    
    // Get current step indices
    const currentStepIndices = getCurrentStepIndices();
    
    // Calculate how many cards we've already dealt from previous steps
    const previouslyDealt = indicesToDeal.length - currentStepIndices.length;
    
    // If we're still dealing cards for this step
    if (dealtCount < indicesToDeal.length) {
      const timer = setTimeout(() => {
        // Deal the next card
        const indexToDeal = indicesToDeal[dealtCount];
        dealCardToBoard(indexToDeal);
        setDealtCount(dealtCount + 1);
      }, dealDelayMs);
      return () => clearTimeout(timer);
    } else {
      setIsDealing(false);
    }
  }, [dealtCount, isDealing, config, step, dealDelayMs, getAllIndicesThroughCurrentStep, getCurrentStepIndices]);

  // Deal a specific card to the appropriate board position
  const dealCardToBoard = (globalIndex) => {
    if (!globalIndex) return;
    
    // Translate global index to board index and position
    // This requires analyzing the config to determine which board this index belongs to
    
    // Analyze groups in the configuration boardCardSchedule
    const allIndices = config.boardCardSchedule.flat();
    const sortedIndices = [...allIndices].sort((a, b) => a - b);
    
    // Group consecutive indices to detect board boundaries
    const boards = [];
    let currentBoard = [];
    
    sortedIndices.forEach((index, i) => {
      if (i === 0 || index === sortedIndices[i-1] + 1) {
        // Consecutive index, add to current board
        currentBoard.push(index);
      } else {
        // Non-consecutive index, start a new board
        if (currentBoard.length > 0) {
          boards.push(currentBoard);
        }
        currentBoard = [index];
      }
    });
    
    // Add the last board
    if (currentBoard.length > 0) {
      boards.push(currentBoard);
    }
    
    // Find which board this index belongs to
    let targetBoardIndex = -1;
    let positionInBoard = -1;
    
    for (let i = 0; i < boards.length; i++) {
      const boardIndices = boards[i];
      const indexPosition = boardIndices.indexOf(globalIndex);
      
      if (indexPosition !== -1) {
        targetBoardIndex = i;
        positionInBoard = indexPosition;
        break;
      }
    }
    
    if (targetBoardIndex === -1) {
      console.error(`Could not find board for index ${globalIndex}`);
      return;
    }
    
    setBoardStates(prevBoards => {
      // Create a deep copy of the board states
      const newBoards = JSON.parse(JSON.stringify(prevBoards));
      
      // Get the card to deal (either predefined or from random deck)
      let cardToDeal = null;
      
      if (predefinedCards && 
          predefinedCards[targetBoardIndex] && 
          positionInBoard < predefinedCards[targetBoardIndex].length) {
        cardToDeal = predefinedCards[targetBoardIndex][positionInBoard];
        console.log(`Dealing predefined card: ${cardToDeal} to board ${targetBoardIndex}, position ${positionInBoard}`);
      } else {
        // Use card from random deck
        // We use the global index as the index into the deck, with 1-based to 0-based conversion
        cardToDeal = deck[globalIndex - 1] || null;
        console.log(`Dealing random card: ${cardToDeal} to board ${targetBoardIndex}, position ${positionInBoard}`);
      }
      
      // Update the board state with the card
      if (newBoards[targetBoardIndex]) {
        newBoards[targetBoardIndex][positionInBoard] = cardToDeal;
      }
      
      return newBoards;
    });
  };

  // Deal next street (step) with animation
  const dealNextStreet = () => {
    if (!config || step >= config.boardCardSchedule.length - 1) return;
    
    const nextStep = step + 1;
    
    // Get all indices that will be dealt up to the next step
    const allIndices = [];
    for (let s = 0; s <= nextStep; s++) {
      allIndices.push(...config.boardCardSchedule[s]);
    }
    
    // Calculate how many cards we've already dealt
    const currentIndices = [];
    for (let s = 0; s <= step; s++) {
      currentIndices.push(...config.boardCardSchedule[s]);
    }
    
    setStep(nextStep);
    setIsDealing(true);
    setDealtCount(currentIndices.length); // Start from cards we've already dealt
  };

  // Reset hand (reshuffle deck if random mode)
  const resetHand = () => {
    if (!predefinedCards) {
      const newDeck = generateDeck();
      setDeck(newDeck);
      console.log("Reshuffled deck:", newDeck);
    }
    
    setStep(0);
    setDealtCount(0);
    setIsDealing(false);
    
    // Reset all boards to empty
    if (config) {
      initializeBoards(config, deck);
    }
  };

  if (error) {
    return <div className="error-message">Error: {error}</div>;
  }

  if (!config) {
    return <div className="loading">Loading poker board configuration...</div>;
  }

  return (
    <div className="poker-board-viewer">
      <h3>{config.name}</h3>
      
      {/* Display blinds if available */}
      {config.blinds && (
        <div className="blinds" style={{ marginBottom: "10px" }}>
          Blinds: {config.blinds.join('/')}
        </div>
      )}
      
      {boardStates.map((boardCards, idx) => (
        <PokerBoard 
          key={`board-${idx}`} 
          cards={boardCards} 
          boardIndex={idx} 
        />
      ))}
      
      <div className="controls" style={{ marginTop: "10px" }}>
        <button
          onClick={dealNextStreet}
          disabled={step >= config.boardCardSchedule.length - 1 || isDealing}
        >
          Deal Next Street
        </button>
        <button 
          onClick={resetHand} 
          style={{ marginLeft: "10px" }} 
          disabled={isDealing}
        >
          Replay Hand
        </button>
      </div>
      
      <div className="debug-info" style={{ marginTop: "15px", fontSize: "0.8em", color: "#666" }}>
        <div>Current step: {step + 1}/{config.boardCardSchedule.length}</div>
        <div>Cards dealt: {dealtCount}</div>
        <div>Mode: {predefinedCards ? "Predefined cards" : "Random deck"}</div>
      </div>
    </div>
  );
};

export default PokerBoardViewer;