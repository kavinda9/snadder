import React, { useState, useRef, useEffect } from "react";
import diceIcon from "../assets/icons/dice.png";
import diceSound from "../assets/sounds/dice.mp3";
import "./DicePopup.css";

const DicePopup = ({ onRoll, currentPlayer, disabled, show }) => {
  const [isRolling, setIsRolling] = useState(false);
  const [diceValue, setDiceValue] = useState(null);
  const diceAudioRef = useRef(null);

  useEffect(() => {
    diceAudioRef.current = new Audio(diceSound);
    diceAudioRef.current.volume = 0.5;
  }, []);

  const playDiceSound = () => {
    if (diceAudioRef.current) {
      diceAudioRef.current.currentTime = 0;
      diceAudioRef.current
        .play()
        .catch((err) => console.log("Dice audio play failed:", err));
    }
  };

  const handleClick = () => {
    if (disabled || isRolling) return;

    setIsRolling(true);
    playDiceSound();

    // Generate dice value
    const randomValue = Math.floor(Math.random() * 6) + 1;
    setDiceValue(randomValue);

    // Animate for 1 second, then call parent's onRoll
    setTimeout(() => {
      onRoll(randomValue);
      setIsRolling(false);

      // Hide popup after rolling
      setTimeout(() => {
        setDiceValue(null);
      }, 500);
    }, 1000);
  };

  // Don't show popup if not player's turn
  if (!show) return null;

  return (
    <div className={`dice-popup-overlay ${show ? "show" : ""}`}>
      <div className="dice-popup-container">
        {/* Animated glow rings */}
        <div className="dice-popup-glow-ring ring-1"></div>
        <div className="dice-popup-glow-ring ring-2"></div>
        <div className="dice-popup-glow-ring ring-3"></div>

        {/* Main dice button */}
        <button
          className={`dice-popup-button ${isRolling ? "rolling" : ""} ${
            disabled ? "disabled" : ""
          }`}
          onClick={handleClick}
          disabled={disabled || isRolling}
        >
          <div className="dice-popup-inner">
            <img
              src={diceIcon}
              alt="Dice"
              className={`dice-popup-icon ${isRolling ? "spinning" : ""}`}
            />
            {diceValue && !isRolling && (
              <div className="dice-value-display">{diceValue}</div>
            )}
          </div>
        </button>

        {/* Info text */}
        <div className="dice-popup-info">
          <p className="dice-popup-text">
            {isRolling ? "🎲 Rolling..." : "🎲 Click to Roll!"}
          </p>
          <p className="dice-popup-player">
            <span
              className="player-indicator"
              style={{ backgroundColor: currentPlayer?.color }}
            ></span>
            {currentPlayer?.name}'s Turn
          </p>
        </div>

        {/* Sparkle effects */}
        <div className="sparkle sparkle-1">✨</div>
        <div className="sparkle sparkle-2">✨</div>
        <div className="sparkle sparkle-3">✨</div>
        <div className="sparkle sparkle-4">✨</div>
      </div>
    </div>
  );
};

export default DicePopup;
