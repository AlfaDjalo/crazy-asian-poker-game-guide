import React, { useState } from "react";

const cardBack = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Card_back_01.svg/150px-Card_back_01.svg.png";

const PokerBoard = () => {
  const [board, setBoard] = useState(Array(5).fill(null));
  const [step, setStep] = useState(0);
  const deck = ["AH", "KH", "QH", "JH", "10H", "9H", "8H", "7H", "6H", "5H", "4H", "3H", "2H"]; // Example deck

  const dealNextStreet = () => {
    if (step === 0) setBoard([deck[0], deck[1], deck[2], null, null]); // Flop
    if (step === 1) setBoard([deck[0], deck[1], deck[2], deck[3], null]); // Turn
    if (step === 2) setBoard([deck[0], deck[1], deck[2], deck[3], deck[4]]); // River
    setStep(step + 1);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "10px" }}>
        {board.map((card, index) => (
          <img key={index} src={card ? `https://example.com/cards/${card}.png` : cardBack} alt="Card" width="50" />
        ))}
      </div>
      <button onClick={dealNextStreet} disabled={step >= 3}>Deal Next Street</button>
    </div>
  );
};

export default PokerBoard;