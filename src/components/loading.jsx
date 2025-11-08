import React from "react";
import "./loading.css";

function Loading() {
  return (
    <div className="loading-container">
      <div className="loading-content">
        {/* Animated Dice */}
        <div className="loading-dice">
          <div className="dice-face">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>

        {/* Snake Animation */}
        <div className="loading-snake">
          <div className="snake-body"></div>
          <div className="snake-body"></div>
          <div className="snake-body"></div>
          <div className="snake-body"></div>
        </div>

        {/* Loading Text */}
        <h2 className="loading-title">Loading Game</h2>
        <div className="loading-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>

        {/* Progress Bar */}
        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>
      </div>
    </div>
  );
}

export default Loading;
