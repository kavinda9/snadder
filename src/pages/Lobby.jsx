import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UsersIcon,
  ComputerIcon,
  LogInIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react";
import { LobbyCreated } from "../components/LobbyCreated";
import { JoinLobby } from "../components/JoinLobby";
import "./Lobby.css";

export function Lobby() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("select");
  const [lobbyCode, setLobbyCode] = useState("");
  const [botCount, setBotCount] = useState(1);
  const [playerCount, setPlayerCount] = useState(2);
  const [showBotSelection, setShowBotSelection] = useState(false);
  const [showPlayerSelection, setShowPlayerSelection] = useState(false);

  const generateLobbyCode = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  };

  const handlePlayWithComputer = () => {
    setShowBotSelection(true);
  };

  const handleStartBotGame = () => {
    // Save game settings
    localStorage.setItem("gameMode", "bot");
    localStorage.setItem("botCount", botCount.toString());

    // Navigate to game
    navigate("/game", {
      state: {
        mode: "bot",
        botCount: botCount,
      },
    });
  };

  const handleCreateLobby = () => {
    setShowPlayerSelection(true);
  };

  const handleConfirmPlayerCount = () => {
    const code = generateLobbyCode();
    setLobbyCode(code);

    // Save lobby settings
    localStorage.setItem("gameMode", "multiplayer");
    localStorage.setItem("lobbyCode", code);
    localStorage.setItem("maxPlayers", playerCount.toString());
    localStorage.setItem("isHost", "true");

    setMode("createLobby");
    setShowPlayerSelection(false);
  };

  const handleJoinLobby = (code) => {
    // TODO: Verify lobby exists in backend
    console.log("Joining lobby with code:", code);

    // Save join settings
    localStorage.setItem("gameMode", "multiplayer");
    localStorage.setItem("lobbyCode", code);
    localStorage.setItem("isHost", "false");

    // Navigate to lobby waiting room
    navigate("/game", {
      state: {
        mode: "multiplayer",
        lobbyCode: code,
      },
    });
  };

  const handleBackToMenu = () => {
    setMode("select");
    setLobbyCode("");
    setShowBotSelection(false);
    setShowPlayerSelection(false);
  };

  // Bot selection modal
  if (showBotSelection) {
    return (
      <div className="lobby-container">
        <div className="computer-mode-card">
          <h2 className="computer-mode-title">Play with Computer</h2>
          <p className="computer-mode-text">
            How many bots do you want to play against?
          </p>

          <div className="bot-selection">
            <button
              onClick={() => setBotCount(Math.max(1, botCount - 1))}
              className="bot-button"
              disabled={botCount <= 1}
            >
              <MinusIcon className="icon" />
            </button>

            <div className="bot-count">
              <span className="bot-count-number">{botCount}</span>
              <span className="bot-count-label">
                Bot{botCount > 1 ? "s" : ""}
              </span>
            </div>

            <button
              onClick={() => setBotCount(Math.min(5, botCount + 1))}
              className="bot-button"
              disabled={botCount >= 5}
            >
              <PlusIcon className="icon" />
            </button>
          </div>

          <div className="bot-actions">
            <button onClick={handleBackToMenu} className="back-button">
              Cancel
            </button>
            <button onClick={handleStartBotGame} className="start-button">
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Player count selection modal
  if (showPlayerSelection) {
    return (
      <div className="lobby-container">
        <div className="computer-mode-card">
          <h2 className="computer-mode-title">Create Lobby</h2>
          <p className="computer-mode-text">
            How many players can join your lobby?
          </p>

          <div className="bot-selection">
            <button
              onClick={() => setPlayerCount(Math.max(2, playerCount - 1))}
              className="bot-button"
              disabled={playerCount <= 2}
            >
              <MinusIcon className="icon" />
            </button>

            <div className="bot-count">
              <span className="bot-count-number">{playerCount}</span>
              <span className="bot-count-label">
                Player{playerCount > 1 ? "s" : ""}
              </span>
            </div>

            <button
              onClick={() => setPlayerCount(Math.min(6, playerCount + 1))}
              className="bot-button"
              disabled={playerCount >= 6}
            >
              <PlusIcon className="icon" />
            </button>
          </div>

          <div className="bot-actions">
            <button onClick={handleBackToMenu} className="back-button">
              Cancel
            </button>
            <button onClick={handleConfirmPlayerCount} className="start-button">
              Create Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "createLobby" && lobbyCode) {
    return (
      <LobbyCreated
        lobbyCode={lobbyCode}
        maxPlayers={playerCount}
        onBack={handleBackToMenu}
        onStartGame={() =>
          navigate("/game", { state: { mode: "multiplayer", lobbyCode } })
        }
      />
    );
  }

  if (mode === "joinLobby") {
    return <JoinLobby onJoin={handleJoinLobby} onBack={handleBackToMenu} />;
  }

  return (
    <div className="lobby-container">
      <div className="lobby-content">
        <div className="lobby-header">
          <h1 className="lobby-title">Game Lobby</h1>
          <p className="lobby-subtitle">Choose your game mode</p>
        </div>

        <div className="mode-grid">
          <button onClick={handlePlayWithComputer} className="mode-card">
            <div className="mode-card-content">
              <div className="mode-icon mode-icon-blue">
                <ComputerIcon className="icon" />
              </div>
              <h3 className="mode-title">Play with Computer</h3>
              <p className="mode-description">
                Challenge the AI in a solo game
              </p>
            </div>
          </button>

          <button onClick={handleCreateLobby} className="mode-card">
            <div className="mode-card-content">
              <div className="mode-icon mode-icon-green">
                <UsersIcon className="icon" />
              </div>
              <h3 className="mode-title">Play with Friends</h3>
              <p className="mode-description">
                Create a lobby and invite friends
              </p>
            </div>
          </button>

          <button onClick={() => setMode("joinLobby")} className="mode-card">
            <div className="mode-card-content">
              <div className="mode-icon mode-icon-purple">
                <LogInIcon className="icon" />
              </div>
              <h3 className="mode-title">Join Lobby</h3>
              <p className="mode-description">
                Enter a code to join a friend's game
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
