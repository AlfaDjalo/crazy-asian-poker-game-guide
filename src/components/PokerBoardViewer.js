
import React, { useEffect, useState } from "react";
import useBaseUrl from '@docusaurus/useBaseUrl';

const cardBack = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Card_back_01.svg/150px-Card_back_01.svg.png";
const cardBaseURL = "https://deckofcardsapi.com/static/img";

// Create a shuffled 52-card deck
const generateDeck = () => {
  const suits = ["H", "D", "C", "S"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck = suits.flatMap(suit => ranks.map(rank => `${rank}${suit}`));
  return deck.sort(() => Math.random() - 0.5);
};

// PokerCard: renders a single card image
const PokerCard = ({ card }) => {
  return (
    <img
      src={card ? `${cardBaseURL}/${card}.png` : cardBack}
      alt={card || "Card back"}
      className="poker-card"
    />
  );
};


// PokerBoard: renders a single board (one row of cards)
const PokerBoard = ({ cards }) => {
  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
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
const PokerBoardViewer = ({ configPath = "/data/boards/triple-board.json", predefinedCards = null }) => {
  const resolvedConfigPath = useBaseUrl(configPath);
  const [config, setConfig] = useState(null);
  const [deck, setDeck] = useState([]);
  const [step, setStep] = useState(0);

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
      })
      .catch((err) => {
        console.error("Failed to load config:", err);
      });
  }, [resolvedConfigPath]);


  // Deal next street (step)
  const dealNextStreet = () => {
    if (!config) return;
    setStep((prev) => Math.min(prev + 1, config.boardCardSchedule.length - 1));
  };

  // Reset hand (reshuffle deck if random mode)
  const resetHand = () => {
    if (!predefinedCards) setDeck(generateDeck());
    setStep(0);
  };

  // Show only cards dealt up to the current street (step)
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
    // Find the max index to determine number of boards
    const allIndices = config.boardCardSchedule.flat().filter(i => typeof i === "number");
    const maxIndex = allIndices.length > 0 ? Math.max(...allIndices) : -1;
    const numBoards = Math.ceil((maxIndex + 1) / cardsPerBoard);
    // For each board, show only cards that have been dealt
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
        <button onClick={dealNextStreet} disabled={step >= config.boardCardSchedule.length - 1}>
          Deal Next Street
        </button>
        <button onClick={resetHand} style={{ marginLeft: "10px" }}>
          Replay Hand
        </button>
      </div>
    </div>
  );
};

export default PokerBoardViewer;
