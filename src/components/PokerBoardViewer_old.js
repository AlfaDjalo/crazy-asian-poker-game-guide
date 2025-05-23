
import React, { useEffect, useState } from "react";
import useBaseUrl from '@docusaurus/useBaseUrl';

const cardBack = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Card_back_01.svg/150px-Card_back_01.svg.png";
const cardBaseURL = "https://deckofcardsapi.com/static/img";

// Create a shuffled 52-card deck
const generateDeck = () => {
  const suits = ["H", "D", "C", "S"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "0", "J", "Q", "K"];
  const deck = suits.flatMap(suit => ranks.map(rank => `${rank}${suit}`));
  return deck.sort(() => Math.random() - 0.5);
};

// PokerCard: renders a single card image or empty space if not dealt
const CARD_HEIGHT = 60; // px, adjust as needed
const EMPTY_CARD_STYLE = {
  display: "inline-block",
  width: `${Math.round(CARD_HEIGHT * 0.7)}px`, // typical card aspect ratio
  height: `${CARD_HEIGHT}px`,
  background: "none",
};
const PokerCard = ({ card }) => {
  if (!card) {
    // Render empty space for undealt card
    return <span style={EMPTY_CARD_STYLE} />;
  }
  // Log the card to the console when it is rendered
  console.log("Dealt card:", card);
  return (
    <img
      src={`${cardBaseURL}/${card}.png`}
      alt={card}
      className="poker-card"
      style={{ height: `${CARD_HEIGHT}px`, width: "auto" }}
    />
  );
};


// PokerBoard: renders a single board (one row of cards)
const PokerBoard = ({ cards }) => {
  // 25% of card height = 15px (if CARD_HEIGHT=60)
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: `${Math.round(CARD_HEIGHT * 0.25)}px` }}>
      {cards.map((card, idx) => (
        <PokerCard key={idx} card={card} />
      ))}
    </div>
  );
};

/**
 * PokerBoardViewer
 * @param {string} configPath - Path to config JSON
 * @param {Array<Array<string>>} [predefinedCards] - Optional: array of arrays of card codes for each board/street
 */
const PokerBoardViewer = ({ configPath = "/data/boards/triple-board.json", predefinedCards = null, dealDelayMs = 1000 }) => {
  const resolvedConfigPath = useBaseUrl(configPath);
  const [config, setConfig] = useState(null);
  const [deck, setDeck] = useState([]);
  const [step, setStep] = useState(0);
  const [dealtCount, setDealtCount] = useState(0); // Number of cards currently shown (animated)
  const [isDealing, setIsDealing] = useState(false);

//   useEffect(() => {
//     fetch(configPath)
//       .then((res) => res.json())
//       .then((data) => {
//         setConfig(data);
//         setDeck(generateDeck());
//         setStep(0);
//       })
//       .catch((err) => console.error("Failed to load config", err));
//   }, [configPath]);

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
        setConfig(data);
        setDeck(generateDeck());
        setStep(0);
        setDealtCount(0);
        setIsDealing(false);
      })
      .catch((err) => {
        console.error("Failed to load config:", err);
      });
  }, [resolvedConfigPath]);

  // Animate dealing cards for the current street
  useEffect(() => {
    if (!config || !isDealing) return;
    // Get the indices to deal for the current step
    const indicesToDeal = [];
    for (let s = 0; s <= step; s++) {
      if (config.boardCardSchedule[s]) {
        indicesToDeal.push(...config.boardCardSchedule[s]);
      }
    }
    if (dealtCount < indicesToDeal.length) {
      const timer = setTimeout(() => {
        setDealtCount(dealtCount + 1);
      }, dealDelayMs);
      return () => clearTimeout(timer);
    } else {
      setIsDealing(false);
    }
  }, [dealtCount, isDealing, config, step, dealDelayMs]);


  // Deal next street (step) with animation
  const dealNextStreet = () => {
    if (!config) return;
    // Calculate how many cards will be shown after this street
    const nextStep = Math.min(step + 1, config.boardCardSchedule.length - 1);
    let indicesToDeal = [];
    for (let s = 0; s <= nextStep; s++) {
      if (config.boardCardSchedule[s]) {
        indicesToDeal = indicesToDeal.concat(config.boardCardSchedule[s]);
      }
    }
    setStep(nextStep);
    setIsDealing(true);
    setDealtCount(indicesToDeal.length - config.boardCardSchedule[nextStep].length);
  };

  // Reset hand (reshuffle deck if random mode)
  const resetHand = () => {
    if (!predefinedCards) setDeck(generateDeck());
    setStep(0);
    setDealtCount(0);
    setIsDealing(false);
  };

  // Show only cards dealt up to the current animation (dealtCount)
  const getBoardsToShow = () => {
    if (!config) return [];
    if (predefinedCards) {
      // If using predefinedCards, only show up to the current step for each board
      // Assume predefinedCards is an array of arrays, each array is the full set of cards for a board
      // and config.boardCardSchedule defines which cards are dealt at each step
      return predefinedCards.map((boardCards, boardIdx) => {
        // For each board, get the indices to show up to current step
        let indicesToShow = [];
        for (let s = 0; s <= step; s++) {
          if (config.boardCardSchedule[s]) {
            indicesToShow = indicesToShow.concat(config.boardCardSchedule[s]);
          }
        }
        // Only show cards for this board that are in indicesToShow (adjusted for board offset)
        const offset = boardIdx * boardCards.length;
        return boardCards.map((card, i) =>
          indicesToShow.includes(i + 1 + offset) ? card : null
        );
      });
    }
    // Otherwise, use the deck and boardCardSchedule
    // Determine how many boards there are by the highest index in boardCardSchedule
    const cardsPerBoard = 6;
    // Get all indices to show up to the current step
    let indicesToShow = [];
    for (let s = 0; s <= step; s++) {
      if (config.boardCardSchedule[s]) {
        indicesToShow = indicesToShow.concat(config.boardCardSchedule[s]);
      }
    }
    indicesToShow = indicesToShow.slice(0, dealtCount);
    // Otherwise, use the deck and boardCardSchedule
    // const cardsPerBoard = 6;
    // Find the max index to determine number of boards
    const allIndices = config.boardCardSchedule.flat().filter(i => typeof i === "number");
    const maxIndex = allIndices.length > 0 ? Math.max(...allIndices) : -1;
    const numBoards = Math.ceil((maxIndex + 1) / cardsPerBoard);
    // For each board, show only cards that have been dealt (in order)
    const boards = [];
    for (let b = 0; b < numBoards; b++) {
      const boardCards = [];
      for (let i = 1; i <= cardsPerBoard; i++) {
        const cardIdx = b * cardsPerBoard + i;
        boardCards.push(indicesToShow.includes(cardIdx) ? deck[cardIdx] || null : null);
      }
      boards.push(boardCards);
    }
    return boards;
  };

  // Render all boards (each as a row)
  const renderBoards = () => {
    const boards = getBoardsToShow();
    return boards.map((cards, i) => <PokerBoard key={i} cards={cards} />);
  };

  if (!config) return <p>Loading...</p>;

  return (
    <div>
      <h3>{config.name}</h3>
      {renderBoards()}
      <div style={{ marginTop: "10px" }}>
        <button
          onClick={dealNextStreet}
          disabled={step >= config.boardCardSchedule.length - 1 || isDealing}
        >
          Deal Next Street
        </button>
        <button onClick={resetHand} style={{ marginLeft: "10px" }} disabled={isDealing}>
          Replay Hand
        </button>
      </div>
    </div>
  );
};

export default PokerBoardViewer;
