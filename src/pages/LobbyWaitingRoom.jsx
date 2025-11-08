import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CopyIcon, CheckIcon, UsersIcon, CrownIcon } from "lucide-react";
import {
  getLobby,
  subscribeLobbyChanges,
  unsubscribeLobby,
  startGame,
  leaveLobby,
  togglePlayerReady,
} from "../services/lobbyService";
import { supabase } from "../services/supabaseClient";
import "./LobbyWaitingRoom.css";

export function LobbyWaitingRoom() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [lobby, setLobby] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    let channel;

    const setupLobby = async () => {
      try {
        setLoading(true);
        const lobbyData = await getLobby(code);
        setLobby(lobbyData);
        setLoading(false);

        console.log("🎮 Setting up real-time subscription for lobby:", code);

        // Subscribe to real-time updates
        channel = supabase
          .channel(`lobby-${code}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "lobbies",
              filter: `code=eq.${code}`,
            },
            (payload) => {
              console.log("🔔 Realtime update received:", payload);

              if (payload.eventType === "UPDATE" && payload.new) {
                console.log("✅ Lobby updated:", payload.new);
                setLobby(payload.new);

                // If game started, navigate to game
                if (payload.new.status === "playing") {
                  console.log("🎮 Game starting, navigating...");
                  navigate("/game", {
                    state: {
                      mode: "multiplayer",
                      lobbyCode: code,
                      lobby: payload.new,
                    },
                  });
                }
              } else if (payload.eventType === "DELETE") {
                console.log("❌ Lobby deleted");
                alert("Host closed the lobby");
                navigate("/lobby");
              }
            }
          )
          .subscribe((status) => {
            console.log("📡 Subscription status:", status);
            if (status === "SUBSCRIBED") {
              console.log("✅ Successfully subscribed to realtime updates");
            } else if (status === "CHANNEL_ERROR") {
              console.error("❌ Channel subscription error");
            } else if (status === "TIMED_OUT") {
              console.error("⏰ Subscription timed out");
            }
          });
      } catch (err) {
        console.error("Error loading lobby:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    setupLobby();

    return () => {
      console.log("🔌 Cleaning up subscription");
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [code, navigate]);

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = async () => {
    try {
      const currentPlayer = lobby.current_players.find(
        (p) => p.id === currentUserId
      );
      const newReadyStatus = !currentPlayer?.ready;
      console.log("🎯 Toggling ready status to:", newReadyStatus);
      await togglePlayerReady(code, currentUserId, newReadyStatus);
      // State will update via real-time subscription
    } catch (err) {
      console.error("❌ Error toggling ready:", err);
      alert(err.message);
    }
  };

  const handleStartGame = async () => {
    try {
      console.log("🚀 Starting game...");
      await startGame(code);
      // Real-time subscription will handle navigation
    } catch (err) {
      console.error("❌ Error starting game:", err);
      alert(err.message);
    }
  };

  const handleLeave = async () => {
    try {
      console.log("👋 Leaving lobby...");
      await leaveLobby(code, currentUserId);
      navigate("/lobby");
    } catch (err) {
      console.error("❌ Error leaving lobby:", err);
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="lobby-waiting-container">
        <div className="loading">Loading lobby...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lobby-waiting-container">
        <div className="error-box">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate("/lobby")} className="back-button">
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!lobby) return null;

  const isHost = lobby.host_id === currentUserId;
  const currentPlayer = lobby.current_players.find(
    (p) => p.id === currentUserId
  );
  const isReady = currentPlayer?.ready || false;
  const allPlayersReady = lobby.current_players.every((p) => p.ready);
  const canStart = lobby.current_players.length >= 2 && allPlayersReady;

  return (
    <div className="lobby-waiting-container">
      <div className="lobby-waiting-card">
        <div className="lobby-header">
          <h1 className="lobby-title">Game Lobby</h1>
          {isHost && <span className="host-badge">You're the Host</span>}
        </div>

        {/* Lobby Code Section */}
        <div className="code-section">
          <div className="code-header">
            <span className="code-label">Lobby Code</span>
            <button onClick={handleCopyCode} className="copy-button">
              {copied ? (
                <>
                  <CheckIcon className="copy-icon success" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <CopyIcon className="copy-icon" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="code-display">
            <span className="code-text">{code}</span>
          </div>
        </div>

        {/* Players Section */}
        <div className="players-section">
          <div className="players-header">
            <UsersIcon className="players-icon" />
            <h3>
              Players ({lobby.current_players.length}/{lobby.max_players})
            </h3>
          </div>
          <div className="players-list">
            {lobby.current_players.map((player) => (
              <div key={player.id} className="player-item">
                <div
                  className="player-avatar"
                  style={{ backgroundColor: player.color }}
                >
                  <span className="player-initial">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="player-info">
                  <span className="player-name">
                    {player.name}
                    {player.isHost && <CrownIcon className="host-icon" />}
                    {player.id === currentUserId && " (You)"}
                  </span>
                  <span
                    className={`ready-status ${
                      player.ready ? "ready" : "not-ready"
                    }`}
                  >
                    {player.ready ? "✅ Ready" : "⏳ Not Ready"}
                  </span>
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({
              length: lobby.max_players - lobby.current_players.length,
            }).map((_, i) => (
              <div key={`empty-${i}`} className="empty-slot">
                <span>Waiting for player...</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          {!isHost && (
            <button
              onClick={handleToggleReady}
              className={`ready-button ${isReady ? "ready" : ""}`}
            >
              {isReady ? "✅ Ready!" : "Ready Up"}
            </button>
          )}

          {isHost && (
            <button
              onClick={handleStartGame}
              className="start-button"
              disabled={!canStart}
            >
              Start Game
            </button>
          )}

          <button onClick={handleLeave} className="leave-button">
            {isHost ? "Close Lobby" : "Leave Lobby"}
          </button>
        </div>

        {/* Status Messages */}
        {isHost && !canStart && (
          <p className="status-message">
            {lobby.current_players.length < 2
              ? "Need at least 2 players to start"
              : "Waiting for all players to be ready..."}
          </p>
        )}
      </div>
    </div>
  );
}
