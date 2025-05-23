import React from "react";
import PokerCard from "./PokerCard";
import "../css/poker-board.css";

/**
 * Renders a single row of poker cards (a complete board)
 * @param {Array<string|null>} cards - Array of card codes or null for empty spaces
 * @param {number} boardIndex - Index of this board
 */
const PokerBoard = ({ cards, boardIndex }) => {
  return (
    <div 
      className="poker-board"
      data-board-index={boardIndex}
    >
      {cards.map((card, idx) => (
        card ? (
          <PokerCard 
            key={`board-${boardIndex}-card-${idx}`} 
            card={card} 
          />
        ) : (
          <span
            key={`board-${boardIndex}-card-${idx}`}
            className="poker-board-empty-slot"
          />
        )
      ))}
    </div>
  );
};

export default PokerBoard;