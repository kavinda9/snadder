import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Board from "../components/Board";
import Dice from "../components/Dice";
import { supabase } from "../services/supabaseClient";
import {
  createGameState,
  getGameState,
  initializeGameState,
  updatePlayerPosition,
  rollDice,
  nextTurn,
  setWinner,
  resetGame as resetGameState,
  subscribeToGameState,
} from "../services/gameService";
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

  // Audio refs
  const jumpAudioRef = useRef(null);
  const snakeAudioRef = useRef(null);
  const ladderAudioRef = useRef(null);
  const winAudioRef = useRef(null);
  const musicRefs = useRef([]);
  const currentMusicIndexRef = useRef(0);

  // Audio control states
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [soundVolume, setSoundVolume] = useState(50);
  const [musicVolume, setMusicVolume] = useState(30);
  const [isSoundMuted, setIsSoundMuted] = useState(false);
  const [isMusicMuted, setIsMusicMuted] = useState(false);

  // Get game settings
  const gameMode =
    localStorage.getItem("gameMode") || location.state?.mode || "bot";
  const botCount =
    parseInt(localStorage.getItem("botCount")) || location.state?.botCount || 1;
  const lobbyCode =
    localStorage.getItem("lobbyCode") || location.state?.lobbyCode;
  const lobby = location.state?.lobby;
  const playerName = localStorage.getItem("playerName") || "Guest";

  // Get current user ID
  const [currentUserId, setCurrentUserId] = useState(null);

  // Player icons mapping
  const playerIcons = [
    redIcon,
    yellowIcon,
    greenIcon,
    pinkIcon,
    blackIcon,
    purpleIcon,
    blueIcon,
  ];

  // Game state
  const [players, setPlayers] = useState([]);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [diceValue, setDiceValue] = useState(null);
  const [isRolling, setIsRolling] = useState(false);
  const [gameStatus, setGameStatus] = useState("playing");
  const [isAnimating, setIsAnimating] = useState(false);
  const [disconnectMessage, setDisconnectMessage] = useState(""); // ✅ For toast messages

  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === currentUserId;

  // ✅ Debug: Log turn information
  useEffect(() => {
    if (gameMode === "multiplayer" && currentPlayer) {
      console.log("🎯 Current Turn Info:");
      console.log("  - Current Player:", currentPlayer.name, currentPlayer.id);
      console.log("  - My User ID:", currentUserId);
      console.log("  - Is My Turn?", isMyTurn);
      console.log("  - Turn Index:", currentPlayerIndex);
    }
  }, [currentPlayer, currentUserId, isMyTurn, currentPlayerIndex, gameMode]);

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
  const LADDERS = { 4: 25, 13: 46, 42: 63, 50: 69, 62: 81, 74: 92 };

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
      console.log("👤 Current user:", user?.id);
    };
    getCurrentUser();
  }, []);

  // Initialize game (BOT or MULTIPLAYER)
  useEffect(() => {
    const initializeGame = async () => {
      if (gameMode === "bot") {
        // Bot mode - local game
        const playerList = [
          {
            id: "p1",
            name: playerName,
            position: 0,
            color: "#e74c3c",
            icon: redIcon,
            isBot: false,
          },
        ];

        for (let i = 0; i < botCount; i++) {
          playerList.push({
            id: `bot${i + 1}`,
            name: `Bot ${i + 1}`,
            position: 0,
            color: [
              "#f1c40f",
              "#2ecc71",
              "#e91e63",
              "#34495e",
              "#9b59b6",
              "#3498db",
            ][i],
            icon: playerIcons[i + 1],
            isBot: true,
          });
        }

        setPlayers(playerList);
      } else {
        // Multiplayer mode - sync with Supabase
        if (!lobbyCode) {
          console.error("❌ No lobby code for multiplayer game");
          alert("No lobby code found!");
          navigate("/lobby", { replace: true }); // ✅ FIXED: Added replace: true
          return;
        }

        try {
          // Check if lobby data exists
          if (!lobby) {
            console.error("❌ No lobby data found!");
            console.log("Location state:", location.state);
            alert("No lobby data found! Please start from the lobby.");
            navigate("/lobby", { replace: true }); // ✅ FIXED: Added replace: true
            return;
          }

          // Validate lobby has players
          if (!lobby.current_players || lobby.current_players.length === 0) {
            throw new Error("Lobby has no players!");
          }

          // ✅ DEBUG: Log lobby players
          console.log("🎮 Lobby Players:", lobby.current_players);
          console.log("👤 Current User ID:", currentUserId);

          // ✅ Use initializeGameState instead of separate try/catch
          console.log("📝 Initializing game state...");
          const gameState = await initializeGameState(lobbyCode, lobby);

          console.log("✅ Game State Retrieved:", gameState);
          console.log(
            "🎲 Current Turn Player ID:",
            gameState.current_turn_player_id
          );
          console.log("🎲 Current Turn Index:", gameState.current_turn_index);

          // Map players with icons
          const mappedPlayers = gameState.players.map((p, index) => ({
            ...p,
            icon: playerIcons[index],
          }));

          console.log("👥 Mapped Players:", mappedPlayers);

          setPlayers(mappedPlayers);
          setCurrentPlayerIndex(gameState.current_turn_index);
          setDiceValue(gameState.dice_value);
          setIsRolling(gameState.is_rolling);
          setGameStatus(gameState.game_status);
        } catch (error) {
          console.error("❌ Error initializing multiplayer game:", error);
          console.error("Error details:", error.message);
          alert(`Failed to initialize game: ${error.message}`);
          navigate("/lobby", { replace: true }); // ✅ FIXED: Added replace: true
        }
      }
    };

    initializeGame();
  }, [gameMode, lobbyCode, botCount]);

  // ✅ FIXED: Subscribe to multiplayer game updates + Presence tracking
  useEffect(() => {
    if (gameMode !== "multiplayer" || !lobbyCode || !currentUserId) return;
    // Don't start presence tracking until players are loaded
    if (players.length === 0) return;

    let channel;
    let presenceChannel;

    const setupSubscription = () => {
      // Subscribe to game state changes
      channel = subscribeToGameState(lobbyCode, async (payload) => {
        if (payload.eventType === "UPDATE" && payload.new) {
          const gameState = payload.new;
          console.log("🔄 Game state updated:", gameState);

          // Map players with icons
          const mappedPlayers = gameState.players.map((p, index) => ({
            ...p,
            icon: playerIcons[index],
          }));

          // ✅ Update state immediately
          setPlayers(mappedPlayers);
          setCurrentPlayerIndex(gameState.current_turn_index);
          setDiceValue(gameState.dice_value);
          setIsRolling(gameState.is_rolling);
          setGameStatus(gameState.game_status);

          // ✅ If animation finished (is_rolling = false), reset animation state
          if (!gameState.is_rolling) {
            setIsAnimating(false);
          }
        } else if (payload.eventType === "DELETE") {
          // ✅ Game was deleted
          console.log("❌ Game deleted");
          setDisconnectMessage("The game has ended. Returning to lobby...");
          setTimeout(() => {
            localStorage.removeItem("gameMode");
            localStorage.removeItem("lobbyCode");
            navigate("/lobby", { replace: true });
          }, 3000);
        }
      });

      // ✅ FIXED: Track player presence (detect disconnects)
      presenceChannel = supabase
        .channel(`presence:game:${lobbyCode}`)
        .on("presence", { event: "leave" }, async ({ key, leftPresences }) => {
          console.log("👋 Player left presence:", leftPresences);
          const leftUserId = leftPresences[0]?.user_id;

          // Don't do anything if it's the current user leaving
          if (leftUserId === currentUserId) return;

          const leftPlayer = players.find((p) => p.id === leftUserId);

          if (leftPlayer) {
            console.log("🚪 Player disconnected:", leftPlayer.name);

            // Show toast message
            setDisconnectMessage(`${leftPlayer.name} has left the game`);
            setTimeout(() => setDisconnectMessage(""), 5000);

            // Get fresh game state
            const gameState = await getGameState(lobbyCode);
            const remainingPlayers = gameState.players.filter(
              (p) => p.id !== leftUserId
            );

            // If only 1 player left, end the game
            if (remainingPlayers.length === 1) {
              setDisconnectMessage("Not enough players. Returning to lobby...");
              setTimeout(() => {
                handleBack();
              }, 3000);
              return;
            }

            // Check if the leaving player was the host
            const wasHost =
              leftPlayer.id ===
              gameState.players.find((p) => p.id === leftUserId)?.id;

            // Promote first remaining player to host if needed
            if (wasHost && remainingPlayers.length > 0) {
              remainingPlayers[0].isHost = true;
              console.log("👑 New host:", remainingPlayers[0].name);

              // Update lobby to reflect new host
              try {
                await supabase
                  .from("lobbies")
                  .update({
                    host_id: remainingPlayers[0].id,
                    host_name: remainingPlayers[0].name,
                    current_players: remainingPlayers,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("code", lobbyCode);
                console.log("✅ Lobby host updated");
              } catch (error) {
                console.error("❌ Failed to update lobby host:", error);
              }
            }

            // Adjust turn index if needed
            const currentTurnPlayer =
              gameState.players[gameState.current_turn_index];
            let newTurnIndex = gameState.current_turn_index;

            // If the disconnected player was the current turn, move to next
            if (currentTurnPlayer?.id === leftUserId) {
              newTurnIndex =
                gameState.current_turn_index % remainingPlayers.length;
            } else {
              // Find the current player in the new array
              const currentPlayerInNew = remainingPlayers.findIndex(
                (p) => p.id === currentTurnPlayer?.id
              );
              if (currentPlayerInNew !== -1) {
                newTurnIndex = currentPlayerInNew;
              } else {
                newTurnIndex = 0;
              }
            }

            try {
              // Update game state in database
              const { error } = await supabase
                .from("game_states")
                .update({
                  players: remainingPlayers,
                  current_turn_index: newTurnIndex,
                  current_turn_player_id: remainingPlayers[newTurnIndex]?.id,
                  updated_at: new Date().toISOString(),
                })
                .eq("lobby_code", lobbyCode);

              if (error) throw error;
              console.log("✅ Player removed from game state");
            } catch (error) {
              console.error("❌ Failed to remove player:", error);
            }
          }
        })
        .subscribe(async (status) => {
          console.log("📡 Presence subscription status:", status);
          if (status === "SUBSCRIBED") {
            // Track current user's presence
            await presenceChannel.track({
              user_id: currentUserId,
              online_at: new Date().toISOString(),
            });
            console.log("✅ Presence tracked for:", currentUserId);
          }
        });
    };

    setupSubscription();

    return () => {
      console.log("🧹 Cleaning up subscriptions");
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (presenceChannel) {
        presenceChannel.untrack();
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [gameMode, lobbyCode, currentUserId, players.length]);

  // Initialize audio
  useEffect(() => {
    jumpAudioRef.current = new Audio(jumpSound);
    snakeAudioRef.current = new Audio(snakeSound);
    ladderAudioRef.current = new Audio(ladderSound);
    winAudioRef.current = new Audio(winSound);

    musicRefs.current = [
      new Audio(music1),
      new Audio(music2),
      new Audio(music3),
    ];

    musicRefs.current.forEach((audio, index) => {
      audio.volume = musicVolume / 100;
      audio.addEventListener("ended", () => {
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

    const firstTrack = musicRefs.current[0];
    if (firstTrack) {
      firstTrack
        .play()
        .catch((err) => console.log("Music autoplay blocked:", err));
    }

    return () => {
      musicRefs.current.forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
    };
  }, []);

  // Update volumes
  useEffect(() => {
    const volume = isSoundMuted ? 0 : soundVolume / 100;
    if (jumpAudioRef.current) jumpAudioRef.current.volume = volume * 0.3;
    if (snakeAudioRef.current) snakeAudioRef.current.volume = volume * 0.5;
    if (ladderAudioRef.current) ladderAudioRef.current.volume = volume * 0.5;
    if (winAudioRef.current) winAudioRef.current.volume = volume * 0.6;
  }, [soundVolume, isSoundMuted]);

  useEffect(() => {
    const volume = isMusicMuted ? 0 : musicVolume / 100;
    musicRefs.current.forEach((audio) => {
      if (audio) audio.volume = volume;
    });

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

  const playSound = (audioRef) => {
    if (audioRef && audioRef.current && !isSoundMuted) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((err) => console.log("Audio play failed:", err));
    }
  };

  // Bot auto-play
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

  const handleDiceRoll = async (value, isBot = false) => {
    if (gameStatus === "won") return;
    if (isAnimating) {
      console.log("⏳ Animation in progress, please wait");
      return;
    }
    if (isRolling) {
      console.log("⏳ Dice already rolling");
      return;
    }

    // Multiplayer: Only current player can roll
    if (gameMode === "multiplayer" && !isMyTurn && !isBot) {
      alert("It's not your turn!");
      return;
    }

    console.log("🎲 Rolling dice:", value);
    setDiceValue(value);
    setIsRolling(true);

    if (gameMode === "multiplayer") {
      // ✅ FIXED: Update dice in database with turn lock
      try {
        console.log("📤 Sending roll to database...");
        await rollDice(lobbyCode, value, currentPlayerIndex);
        console.log("✅ Roll saved to database");

        // ✅ Animate locally (no DB updates during animation)
        setIsAnimating(true);
        await movePlayerAnimationMultiplayer(value, currentPlayer.position);
      } catch (error) {
        console.error("❌ Roll dice failed:", error);
        alert("Failed to roll - it may not be your turn anymore!");
        setIsRolling(false);
        setIsAnimating(false);
      }
    } else {
      // Bot mode - local game
      if (isBot) {
        movePlayer(value);
      } else {
        setTimeout(() => {
          movePlayer(value);
        }, 2100);
      }
    }
  };

  // ✅ FIXED: Animation for multiplayer (local state only, then ONE DB update)
  const movePlayerAnimationMultiplayer = async (steps, startPosition) => {
    const targetPos = Math.min(startPosition + steps, 100);

    if (startPosition + steps > 100) {
      setIsRolling(false);
      setIsAnimating(false);
      await nextTurn(lobbyCode);
      return;
    }

    // ✅ Animate LOCALLY (update local state, not database)
    const updatedPlayers = [...players];
    const playerToMove = updatedPlayers.find((p) => p.id === currentPlayer.id);

    if (!playerToMove) {
      console.error("❌ Player not found for animation");
      setIsRolling(false);
      setIsAnimating(false);
      return;
    }

    // Animate step by step
    for (let i = startPosition + 1; i <= targetPos; i++) {
      playSound(jumpAudioRef);
      playerToMove.position = i;
      setPlayers([...updatedPlayers]); // ✅ Local state only
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    let finalPosition = targetPos;

    // Check for snake
    if (SNAKES[finalPosition]) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      playSound(snakeAudioRef);
      finalPosition = SNAKES[finalPosition];
      playerToMove.position = finalPosition;
      setPlayers([...updatedPlayers]); // ✅ Local state only
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Check for ladder
    if (LADDERS[finalPosition]) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      playSound(ladderAudioRef);
      finalPosition = LADDERS[finalPosition];
      playerToMove.position = finalPosition;
      setPlayers([...updatedPlayers]); // ✅ Local state only
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // ✅ NOW update database with FINAL position (ONE update)
    try {
      await updatePlayerPosition(lobbyCode, currentPlayer.id, finalPosition);
      console.log("✅ Final position updated in DB:", finalPosition);
    } catch (error) {
      console.error("❌ Failed to update position:", error);
      setIsRolling(false);
      setIsAnimating(false);
      return;
    }

    // Check for win
    if (finalPosition === 100) {
      playSound(winAudioRef);
      await setWinner(lobbyCode, currentPlayer.id);
      setIsRolling(false);
      setIsAnimating(false);
      return;
    }

    // Move to next turn
    try {
      await nextTurn(lobbyCode);
      console.log("✅ Turn moved to next player");
    } catch (error) {
      console.error("❌ Failed to move to next turn:", error);
    }

    setIsRolling(false);
    setIsAnimating(false);
  };

  // Local game player movement (bot mode)
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

  const handleResetGame = async () => {
    if (gameMode === "multiplayer") {
      await resetGameState(lobbyCode);
    } else {
      setPlayers(players.map((p) => ({ ...p, position: 0 })));
      setCurrentPlayerIndex(0);
      setDiceValue(null);
      setGameStatus("playing");
    }
  };

  // ✅ FIXED: Proper cleanup when leaving game
  const handleBack = async () => {
    try {
      console.log("👋 Leaving game...");

      // Clean up localStorage first
      localStorage.removeItem("gameMode");
      localStorage.removeItem("botCount");
      localStorage.removeItem("lobbyCode");
      localStorage.removeItem("maxPlayers");
      localStorage.removeItem("isHost");

      // Navigate immediately to prevent redirect loop
      navigate("/lobby", { replace: true });

      // ✅ ONLY delete if in bot mode or if you're the last player
      if (gameMode === "bot") {
        // Bot mode - just clean up
        return;
      }

      // For multiplayer, check if we're the last one before deleting
      if (gameMode === "multiplayer" && lobbyCode) {
        try {
          const gameState = await getGameState(lobbyCode);

          // Only delete if 1 or fewer players remain
          if (gameState.players.length <= 1) {
            console.log("🗑️ Last player leaving, cleaning up...");
            supabase.from("lobbies").delete().eq("code", lobbyCode);
            supabase.from("game_states").delete().eq("lobby_code", lobbyCode);
          } else {
            console.log("✅ Other players still in game, keeping lobby alive");
          }
        } catch (error) {
          console.error("Error checking game state:", error);
        }
      }
    } catch (error) {
      console.error("❌ Error during cleanup:", error);
      // Still navigate even if cleanup fails
      navigate("/lobby", { replace: true });
    }
  };

  const leaderboard = [...players].sort((a, b) => b.position - a.position);

  return (
    <div className="game-page">
      <div className="game-header">
        <button onClick={handleBack} className="back-home-btn">
          ← Back to Lobby
        </button>
        <h1>🐍 Snake & Ladder 🪜</h1>

        <button
          className="audio-control-btn"
          onClick={() => setShowAudioControls(!showAudioControls)}
        >
          🔊
        </button>

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
                : `👥 Multiplayer ${isMyTurn ? "(Your Turn!)" : ""}`}
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

          {gameMode === "bot" && !currentPlayer?.isBot && (
            <Dice
              onRoll={handleDiceRoll}
              disabled={isRolling || gameStatus === "won" || isAnimating}
              currentValue={diceValue}
            />
          )}

          {gameMode === "multiplayer" && isMyTurn && (
            <Dice
              onRoll={handleDiceRoll}
              disabled={isRolling || gameStatus === "won" || isAnimating}
              currentValue={diceValue}
            />
          )}

          {gameMode === "multiplayer" &&
            !isMyTurn &&
            gameStatus === "playing" && (
              <div className="waiting-turn">
                <p>⏳ Waiting for {currentPlayer?.name}'s turn...</p>
              </div>
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
                    {player.id === currentUserId && " (You)"}
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
              <button onClick={handleResetGame} className="reset-btn">
                Play Again
              </button>
              <button onClick={handleBack} className="back-lobby-btn">
                Back to Lobby
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification for Player Disconnect */}
      {disconnectMessage && (
        <div className="disconnect-toast">
          <p>{disconnectMessage}</p>
        </div>
      )}
    </div>
  );
};

export default Game;
