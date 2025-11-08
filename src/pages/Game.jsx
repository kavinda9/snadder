import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Board from "../components/Board";
import Dice from "../components/Dice";
import boardImage from "../assets/board.png";
// Import sound files
import jumpSound from "../assets/sounds/jump.mp3";
import snakeSound from "../assets/sounds/snake.mp3";
import ladderSound from "../assets/sounds/ladder.mp3";
import winSound from "../assets/sounds/win.mp3";
// Import background music files
import music1 from "../assets/sounds/music1.mp3";
import music2 from "../assets/sounds/music2.mp3";
import music3 from "../assets/sounds/music3.mp3";
// Import player icons
import redIcon from "../assets/icons/red.png";
import yellowIcon from "../assets/icons/yellow.png";
import greenIcon from "../assets/icons/green.png";
import pinkIcon from "../assets/icons/pink.png";
import blackIcon from "../assets/icons/black.png";
import purpleIcon from "../assets/icons/purple.png";
import blueIcon from "../assets/icons/blue.png";
import "./Game.css";

const Game = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Audio refs for sound effects
  const jumpAudioRef = useRef(null);
  const snakeAudioRef = useRef(null);
  const ladderAudioRef = useRef(null);
  const winAudioRef = useRef(null);

  // Background music refs
  const musicRefs = useRef([]);
  const currentMusicIndexRef = useRef(0);

  // Audio control states
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [soundVolume, setSoundVolume] = useState(50);
  const [musicVolume, setMusicVolume] = useState(30);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(false);

  // Get game settings from localStorage or location state
  const gameMode =
    localStorage.getItem("gameMode") || location.state?.mode || "bot";
  const botCount =
    parseInt(localStorage.getItem("botCount")) || location.state?.botCount || 1;
  const lobbyCode =
    localStorage.getItem("lobbyCode") || location.state?.lobbyCode;
  const maxPlayers = parseInt(localStorage.getItem("maxPlayers")) || 4;
  const isHost = localStorage.getItem("isHost") === "true";

  // Get player name from localStorage
  const playerName = localStorage.getItem("playerName") || "Guest";

  // Player colors and icons mapping
  const playerAssets = [
    { color: "#e74c3c", icon: redIcon, name: "Red" },
    { color: "#f1c40f", icon: yellowIcon, name: "Yellow" },
    { color: "#2ecc71", icon: greenIcon, name: "Green" },
    { color: "#e91e63", icon: pinkIcon, name: "Pink" },
    { color: "#34495e", icon: blackIcon, name: "Black" },
    { color: "#9b59b6", icon: purpleIcon, name: "Purple" },
    { color: "#3498db", icon: blueIcon, name: "Blue" },
  ];

  // Initialize players based on game mode
  const initializePlayers = () => {
    if (gameMode === "bot") {
      const playerList = [
        {
          id: "p1",
          name: playerName,
          position: 0,
          color: playerAssets[0].color,
          icon: playerAssets[0].icon,
          isBot: false,
        },
      ];

      // Add bots
      for (let i = 0; i < botCount; i++) {
        playerList.push({
          id: `bot${i + 1}`,
          name: `Bot ${i + 1}`,
          position: 0,
          color: playerAssets[i + 1].color,
          icon: playerAssets[i + 1].icon,
          isBot: true,
        });
      }

      return playerList;
    } else {
      // Multiplayer mode: Real players (for now, placeholder until backend)
      return [
        {
          id: "p1",
          name: playerName,
          position: 0,
          color: playerAssets[0].color,
          icon: playerAssets[0].icon,
          isBot: false,
        },
        {
          id: "p2",
          name: "Waiting...",
          position: 0,
          color: playerAssets[1].color,
          icon: playerAssets[1].icon,
          isBot: false,
        },
      ];
    }
  };

  const [players, setPlayers] = useState(initializePlayers());
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [gameStatus, setGameStatus] = useState("playing");

  const currentPlayer = players[currentPlayerIndex];

  // Snakes and Ladders
  const SNAKES = {
    99: 41,
    95: 77,
    89: 53,
    66: 45,
    54: 31,
    43: 18,
    40: 3,
    27: 5,
  };

  const LADDERS = {
    4: 25,
    13: 46,
    42: 63,
    50: 69,
    62: 81,
    74: 92,
  };

  // Get sorted leaderboard (players sorted by position, descending)
  const getLeaderboard = () => {
    return [...players].sort((a, b) => b.position - a.position);
  };

  // Initialize audio objects
  useEffect(() => {
    // Sound effects
    jumpAudioRef.current = new Audio(jumpSound);
    snakeAudioRef.current = new Audio(snakeSound);
    ladderAudioRef.current = new Audio(ladderSound);
    winAudioRef.current = new Audio(winSound);

    // Background music
    musicRefs.current = [
      new Audio(music1),
      new Audio(music2),
      new Audio(music3),
    ];

    // Set up music playlist - auto play next track when one ends
    musicRefs.current.forEach((audio, index) => {
      audio.volume = musicVolume / 100;
      audio.addEventListener("ended", () => {
        // Play next track
        currentMusicIndexRef.current = (index + 1) % musicRefs.current.length;
        const nextAudio = musicRefs.current[currentMusicIndexRef.current];
        if (nextAudio && !isMusicMuted) {
          nextAudio.currentTime = 0;
          nextAudio
            .play()
            .catch((err) => console.log("Music play failed:", err));
        }
      });
    });

    // Start first music track
    const firstTrack = musicRefs.current[0];
    if (firstTrack) {
      firstTrack
        .play()
        .catch((err) => console.log("Music autoplay blocked:", err));
    }

    return () => {
      // Cleanup: stop all music
      musicRefs.current.forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    };
  }, []);

  // Update sound effects volume
  useEffect(() => {
    const volume = isSoundMuted ? 0 : soundVolume / 100;
    if (jumpAudioRef.current) jumpAudioRef.current.volume = volume * 0.3;
    if (snakeAudioRef.current) snakeAudioRef.current.volume = volume * 0.5;
    if (ladderAudioRef.current) ladderAudioRef.current.volume = volume * 0.5;
    if (winAudioRef.current) winAudioRef.current.volume = volume * 0.6;
  }, [soundVolume, isSoundMuted]);

  // Update music volume and mute state
  useEffect(() => {
    const volume = isMusicMuted ? 0 : musicVolume / 100;
    musicRefs.current.forEach((audio) => {
      if (audio) {
        audio.volume = volume;
      }
    });

    // Handle mute/unmute
    const currentAudio = musicRefs.current[currentMusicIndexRef.current];
    if (currentAudio) {
      if (isMusicMuted) {
        currentAudio.pause();
      } else {
        currentAudio
          .play()
          .catch((err) => console.log("Music play failed:", err));
      }
    }
  }, [musicVolume, isMusicMuted]);

  // Play sound helper
  const playSound = (audioRef) => {
    if (audioRef && audioRef.current && !isSoundMuted) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((err) => console.log("Audio play failed:", err));
    }
  };

  // Auto-play for bots
  useEffect(() => {
    if (
      gameMode === "bot" &&
      currentPlayer?.isBot &&
      !isRolling &&
      gameStatus === "playing"
    ) {
      const botDelay = setTimeout(() => {
        const randomDice = Math.floor(Math.random() * 6) + 1;
        handleDiceRoll(randomDice, true);
      }, 1500);

      return () => clearTimeout(botDelay);
    }
  }, [currentPlayerIndex, isRolling, gameStatus, currentPlayer, gameMode]);

  const handleDiceRoll = (value, isBot = false) => {
    if (gameStatus === "won") return;

    setDiceValue(value);
    setIsRolling(true);

    if (isBot) {
      movePlayer(value);
    } else {
      setTimeout(() => {
        movePlayer(value);
      }, 2100);
    }
  };

  const movePlayer = async (steps) => {
    const updatedPlayers = [...players];
    const player = updatedPlayers[currentPlayerIndex];
    let currentPos = player.position;
    const targetPos = Math.min(currentPos + steps, 100);

    if (currentPos + steps > 100) {
      setIsRolling(false);
      setTimeout(() => {
        setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
      }, 500);
      return;
    }

    for (let i = currentPos + 1; i <= targetPos; i++) {
      playSound(jumpAudioRef);
      player.position = i;
      setPlayers([...updatedPlayers]);
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    let finalPosition = targetPos;

    if (SNAKES[finalPosition]) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      playSound(snakeAudioRef);
      finalPosition = SNAKES[finalPosition];
      player.position = finalPosition;
      setPlayers([...updatedPlayers]);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (LADDERS[finalPosition]) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      playSound(ladderAudioRef);
      finalPosition = LADDERS[finalPosition];
      player.position = finalPosition;
      setPlayers([...updatedPlayers]);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (finalPosition === 100) {
      setGameStatus("won");
      playSound(winAudioRef);
      setIsRolling(false);
      return;
    }

    setTimeout(() => {
      setCurrentPlayerIndex((currentPlayerIndex + 1) % players.length);
      setIsRolling(false);
    }, 500);
  };

  const resetGame = () => {
    setPlayers(players.map((p) => ({ ...p, position: 0 })));
    setCurrentPlayerIndex(0);
    setDiceValue(null);
    setGameStatus("playing");
  };

  const handleBack = () => {
    localStorage.removeItem("gameMode");
    localStorage.removeItem("botCount");
    localStorage.removeItem("lobbyCode");
    localStorage.removeItem("maxPlayers");
    localStorage.removeItem("isHost");
    navigate("/lobby");
  };

  const leaderboard = getLeaderboard();

  return (
    <div className="game-page">
      <div className="game-header">
        <button onClick={handleBack} className="back-home-btn">
          ← Back to Lobby
        </button>
        <h1>🐍 Snake & Ladder 🪜</h1>

        {/* Audio Control Button */}
        <button
          className="audio-control-btn"
          onClick={() => setShowAudioControls(!showAudioControls)}
        >
          🔊
        </button>

        {/* Audio Controls Modal */}
        {showAudioControls && (
          <div
            className="audio-modal-overlay"
            onClick={() => setShowAudioControls(false)}
          >
            <div className="audio-modal" onClick={(e) => e.stopPropagation()}>
              <div className="audio-modal-header">
                <h2>🎵 Audio Controls</h2>
                <button
                  className="close-modal-btn"
                  onClick={() => setShowAudioControls(false)}
                >
                  ✕
                </button>
              </div>

              <div className="audio-modal-content">
                {/* Sound Effects Control */}
                <div className="audio-control-section">
                  <div className="audio-control-header">
                    <span className="audio-icon">🔔</span>
                    <h3>Sound Effects</h3>
                    <button
                      className={`mute-btn ${isSoundMuted ? "muted" : ""}`}
                      onClick={() => setIsSoundMuted(!isSoundMuted)}
                    >
                      {isSoundMuted ? "🔇" : "🔊"}
                    </button>
                  </div>
                  <div className="volume-slider-container">
                    <span className="volume-label">0</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={soundVolume}
                      onChange={(e) => setSoundVolume(Number(e.target.value))}
                      className="volume-slider"
                      disabled={isSoundMuted}
                    />
                    <span className="volume-label">100</span>
                  </div>
                  <div className="volume-value">{soundVolume}%</div>
                </div>

                {/* Background Music Control */}
                <div className="audio-control-section">
                  <div className="audio-control-header">
                    <span className="audio-icon">🎵</span>
                    <h3>Background Music</h3>
                    <button
                      className={`mute-btn ${isMusicMuted ? "muted" : ""}`}
                      onClick={() => setIsMusicMuted(!isMusicMuted)}
                    >
                      {isMusicMuted ? "🔇" : "🔊"}
                    </button>
                  </div>
                  <div className="volume-slider-container">
                    <span className="volume-label">0</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={musicVolume}
                      onChange={(e) => setMusicVolume(Number(e.target.value))}
                      className="volume-slider"
                      disabled={isMusicMuted}
                    />
                    <span className="volume-label">100</span>
                  </div>
                  <div className="volume-value">{musicVolume}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {gameMode === "multiplayer" && lobbyCode && (
          <div className="lobby-code-display">
            <span className="lobby-label">Lobby:</span>
            <span className="lobby-code">{lobbyCode}</span>
          </div>
        )}
      </div>

      <div className="game-content">
        <div className="board-section">
          <Board
            players={players}
            currentPlayer={currentPlayer?.id}
            boardImage={boardImage}
          />
        </div>

        <div className="controls-section">
          <div className="game-mode-info">
            <span className="mode-badge">
              {gameMode === "bot"
                ? `🤖 Bot Game (${botCount} bot${botCount > 1 ? "s" : ""})`
                : `👥 Multiplayer`}
            </span>
          </div>

          <div className="current-player">
            <h3>Current Turn</h3>
            <div className="player-info">
              <div className="player-avatar-with-icon">
                <img
                  src={currentPlayer?.icon}
                  alt={currentPlayer?.name}
                  className="player-icon"
                />
              </div>
              <span className="player-name">{currentPlayer?.name}</span>
              {currentPlayer?.isBot && (
                <span className="bot-indicator">🤖</span>
              )}
            </div>
          </div>

          {!currentPlayer?.isBot && (
            <Dice
              onRoll={handleDiceRoll}
              disabled={isRolling || gameStatus === "won"}
              currentValue={diceValue}
            />
          )}

          {currentPlayer?.isBot && isRolling && (
            <div className="bot-thinking">
              <div className="thinking-dots">
                <span>●</span>
                <span>●</span>
                <span>●</span>
              </div>
              <p>Bot is thinking...</p>
            </div>
          )}

          {/* Leaderboard */}
          <div className="leaderboard">
            <h3>🏆 Leaderboard</h3>
            {leaderboard.map((player, index) => (
              <div
                key={player.id}
                className={`leaderboard-item ${
                  player.id === currentPlayer?.id ? "active" : ""
                } ${index === 0 ? "first-place" : ""}`}
              >
                <div className="leaderboard-rank">
                  {index === 0
                    ? "🥇"
                    : index === 1
                    ? "🥈"
                    : index === 2
                    ? "🥉"
                    : `#${index + 1}`}
                </div>
                <div className="leaderboard-icon">
                  <img
                    src={player.icon}
                    alt={player.name}
                    className="leaderboard-player-icon"
                  />
                </div>
                <div className="leaderboard-info">
                  <span className="leaderboard-name">
                    {player.name} {player.isBot && "🤖"}
                  </span>
                  <span className="leaderboard-position">
                    Square {player.position}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {gameStatus === "won" && (
            <div className="game-over-actions">
              <div className="winner-announcement">
                <h2>🎉 Winner! 🎉</h2>
                <div className="winner-info">
                  <img
                    src={leaderboard[0]?.icon}
                    alt={leaderboard[0]?.name}
                    className="winner-icon"
                  />
                  <p className="winner-name">{leaderboard[0]?.name}</p>
                </div>
              </div>
              <button onClick={resetGame} className="reset-btn">
                Play Again
              </button>
              <button onClick={handleBack} className="back-lobby-btn">
                Back to Lobby
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game;
