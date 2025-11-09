import React from "react";
import "./loading.css";
import logo from "../assets/logo.png"; // Adjust path if needed

function Loading() {
  return (
    <div className="loading-container">
      {/* Subtle Background Patterns */}
      <div className="bg-patterns">
        <div className="ladder-outline left-ladder"></div>
        <div className="ladder-outline right-ladder"></div>
        <div className="snake-outline"></div>
      </div>

      <div className="loading-content">
        {/* Logo */}
        <img src={logo} alt="Snadder Logo" className="game-logo" />

        {/* Loading Text */}
        <h2 className="loading-title">Loading Game</h2>
        <div className="loading-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </div>

        {/* Sleek Progress Bar with Glow */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill"></div>
            <div className="progress-glow"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Loading;
