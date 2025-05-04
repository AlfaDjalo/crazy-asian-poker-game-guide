import React, { useEffect, useState } from "react";

const cardBack = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Card_back_01.svg/150px-Card_back_01.svg.png";
const cardBaseURL = "https://deckofcardsapi.com/static/img";

// Create a shuffled 52-card deck
const generateDeck = () => {
  const suits = ["H", "D", "C", "S"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck = suits.flatMap(suit => ranks.map(rank => `${rank}${suit}`));
  return deck.sort(() => Math.random() - 0.5);
};

const PokerBoardViewer = ({ configPath = "/data/boards/single-board.json" }) => {
  const [config, setConfig] = useState(null);
  const [deck, setDeck] = useState([]);
  const [step, setStep] = useState(0);

  useEffect(() => {
    fetch(configPath)
      .then((res) => res.json())
      .then((data) => {
        setConfig(data);
        setDeck(generateDeck());
        setStep(0);
      })
      .catch((err) => console.error("Failed to load config", err));
  }, [configPath]);

  const dealNextStreet = () => {
    setStep((prev) => Math.min(prev + 1, config.boardCardSchedule.length - 1));
  };

  const resetHand = () => {
    setDeck(generateDeck());
    setStep(0);
  };

  const getBoardCards = () => {
    if (!config) return [];

    // Flatten the boardCardSchedule up to the current step
    const indices = config.boardCardSchedule
      .slice(0, step + 1)
      .flat()
      .filter((i) => typeof i === "number");

    return indices.map((cardIndex) => deck[cardIndex] || null);
  };

  const renderBoards = () => {
    if (!config) return null;

    // Get each board as its own list of indices
    const fullSchedule = config.boardCardSchedule
      .slice(0, step + 1)
      .flat()
      .filter((i) => typeof i === "number");

    // Group cards by street (based on original config)
    const boards = config.boardCardSchedule.map((street, i) =>
      i <= step
        ? street.map((index) => deck[index] || null)
        : []
    );

    return boards.map((streetCards, i) => (
      <div key={i} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        {streetCards.map((card, idx) => (
          <img
            key={idx}
            src={card ? `${cardBaseURL}/${card}.png` : cardBack}
            alt={`Card ${idx}`}
            className="poker-card"
          />
        ))}
      </div>
    ));
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
