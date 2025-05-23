import React, { useEffect } from "react";
import "../css/poker-card.css";

const cardBaseURL = "https://deckofcardsapi.com/static/img";

/**
 * Renders a single poker card or empty space
 * @param {string|null} card - Card code (e.g., "AH") or null for empty space
 */
const PokerCard = ({ card }) => {
  useEffect(() => {
    // Log the card to console whenever it changes to a valid value
    if (card) {
      console.log("Card rendered:", card);
    }
  }, [card]);

  if (!card) {
    // Render empty space for undealt card
    return <span className="poker-card-empty" />;
  }

  return (
    <img
      src={`${cardBaseURL}/${card}.png`}
      alt={card}
      className="poker-card"
      onError={(e) => {
        console.error(`Failed to load card image for ${card}`);
        e.target.className = "poker-card-error";
        e.target.alt = card;
        // Replace the image with a text fallback
        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
        e.target.insertAdjacentHTML("afterend", `<div style="position:absolute;">${card}</div>`);
      }}
    />
  );
};

export default PokerCard;