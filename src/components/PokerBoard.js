import React, { useState, useEffect } from "react";

const cardBack =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Card_back_01.svg/150px-Card_back_01.svg.png";
const cardBaseURL = "https://deckofcardsapi.com/static/img";

const SUITS = ["H", "D", "C", "S"];
const RANKS = [
  "A", "2", "3", "4", "5", "6", "7",
  "8", "9", "10", "J", "Q", "K"
];

// Generate full deck
const generateDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const code = rank === "10" ? "0" + suit : rank + suit;
      deck.push(code);
    }
  }
  return deck;
};

// Fisher-Yates Shuffle
const shuffle = (deck) => {
  const array = [...deck];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};


const PokerBoard = () => {
  const [deck, setDeck] = useState([]);
  const [board, setBoard] = useState([null, null, null, null, null]);
  const [step, setStep] = useState(0);

  const initializeDeck = () => {
    const newDeck = shuffle(generateDeck());
    setDeck(newDeck);
    setBoard([null, null, null, null, null]);
    setStep(0);
  };

  useEffect(() => {
    initializeDeck();
  }, []);

  const dealNextStreet = () => {
    if (step === 0) {
      setBoard([deck[0], deck[1], deck[2], null, null]); // Flop
    } else if (step === 1) {
      setBoard((prev) => [prev[0], prev[1], prev[2], deck[3], null]); // Turn
    } else if (step === 2) {
      setBoard((prev) => [prev[0], prev[1], prev[2], prev[3], deck[4]]); // River
    }
    setStep((prev) => prev + 1);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        {board.map((card, index) => (
          <img
            key={index}
            className="poker-card"
            src={card ? `${cardBaseURL}/${card}.png` : cardBack}
            alt="Card"
            style={{ width: "80px", height: "auto" }}
          />
        ))}
      </div>
      <button onClick={dealNextStreet} disabled={step >= 3}>
        Deal Next Street
      </button>
      <button onClick={initializeDeck}>
        Replay Hand
      </button>
    </div>
  );
};

export default PokerBoard;
