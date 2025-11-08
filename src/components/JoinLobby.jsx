import React, { useState } from "react";
import { ArrowLeftIcon } from "lucide-react";

export function JoinLobby({ onJoin, onBack }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Lobby code must be 6 characters");
      return;
    }
    setError("");
    onJoin(code.toUpperCase());
  };

  const handleCodeChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (value.length <= 6) {
      setCode(value);
      setError("");
    }
  };

  return (
    <div className="join-lobby-container">
      <div className="join-lobby-card">
        <button onClick={onBack} className="back-link">
          <ArrowLeftIcon className="back-icon" />
          <span>Back</span>
        </button>

        <div className="join-header">
          <h2 className="join-title">Join Lobby</h2>
          <p className="join-subtitle">Enter the 6-character lobby code</p>
        </div>

        <form onSubmit={handleSubmit} className="join-form">
          <div>
            <input
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="ABC123"
              className="code-input"
              maxLength={6}
            />
            {error && <p className="error-message">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={code.length !== 6}
            className="join-button"
          >
            Join Game
          </button>
        </form>

        <div className="join-info">
          <p className="join-info-text">
            Ask your friend for their lobby code to join their game
          </p>
        </div>
      </div>
    </div>
  );
}
