import React, { useState } from "react";
import { CopyIcon, CheckIcon, UsersIcon } from "lucide-react";

export function LobbyCreated({
  lobbyCode,
  maxPlayers = 4,
  onBack,
  onStartGame,
}) {
  const [copied, setCopied] = useState(false);
  const [players] = useState([
    { id: 1, name: localStorage.getItem("playerName") || "You" },
  ]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(lobbyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    console.log("Starting game with lobby code:", lobbyCode);
    if (onStartGame) {
      onStartGame();
    }
  };

  // Generate empty slots for remaining players
  const emptySlots = maxPlayers - players.length;

  return (
    <div className="lobby-created-container">
      <div className="lobby-created-card">
        <div className="lobby-created-header">
          <h2 className="lobby-created-title">Lobby Created!</h2>
          <p className="lobby-created-subtitle">
            Share this code with your friends
          </p>
        </div>

        <div className="code-section">
          <div className="code-header">
            <span className="code-label">Lobby Code</span>
            <button onClick={handleCopyCode} className="copy-button">
              {copied ? (
                <>
                  <CheckIcon className="copy-icon copy-icon-success" />
                  <span className="copy-text">Copied!</span>
                </>
              ) : (
                <>
                  <CopyIcon className="copy-icon" />
                  <span className="copy-text">Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="code-display">
            <span className="code-text">{lobbyCode}</span>
          </div>
        </div>

        <div className="players-section">
          <div className="players-header">
            <UsersIcon className="players-icon" />
            <h3 className="players-title">
              Players ({players.length}/{maxPlayers})
            </h3>
          </div>
          <div className="players-list">
            {players.map((player) => (
              <div key={player.id} className="player-item">
                <div className="player-avatar">
                  <span className="player-initial">
                    {player.name[0].toUpperCase()}
                  </span>
                </div>
                <span className="player-name">{player.name}</span>
              </div>
            ))}

            {Array.from({ length: emptySlots }).map((_, index) => (
              <div key={`empty-${index}`} className="waiting-placeholder">
                <span className="waiting-text">
                  Waiting for player {players.length + index + 1}...
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="action-buttons">
          <button onClick={onBack} className="cancel-button">
            Cancel
          </button>
          <button
            onClick={handleStartGame}
            className="start-button"
            disabled={players.length < 2}
          >
            Start Game
          </button>
        </div>

        {players.length < 2 && (
          <p
            style={{
              textAlign: "center",
              color: "rgba(255,255,255,0.6)",
              marginTop: "1rem",
              fontSize: "0.875rem",
            }}
          >
            Need at least 2 players to start
          </p>
        )}
      </div>
    </div>
  );
}
