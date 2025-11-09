import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CopyIcon, CheckIcon, UsersIcon, CrownIcon } from "lucide-react";
import {
  getLobby,
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

  // Fetch lobby data from database
  const fetchLobby = async (skipNavigate = false) => {
    try {
      console.log("🔄 Fetching fresh lobby data...");
      const data = await getLobby(code);
      console.log("✅ Fresh lobby data:", data);
      setLobby(data);

      // Check if game started (but skip navigation on initial load)
      if (data.status === "playing" && !skipNavigate) {
        console.log("🎮 Game has started! Navigating...");
        navigate("/game", {
          state: {
            mode: "multiplayer",
            lobbyCode: code,
            lobby: data,
          },
        });
      } else if (data.status === "playing" && skipNavigate) {
        console.log(
          "⚠️ Game already started but skipping navigation (initial load)"
        );
      }
    } catch (err) {
      console.error("❌ Error fetching lobby:", err);
      if (!lobby) {
        setError(err.message);
      }
    }
  };

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
      console.log("👤 Current user ID:", user?.id);
    };
    getCurrentUser();
  }, []);

  // Initial load + Realtime subscription
  useEffect(() => {
    let channel;
    let pollInterval;

    const setup = async () => {
      try {
        // Initial load
        await fetchLobby();
        setLoading(false);

        // Setup realtime subscription
        console.log("📡 Setting up realtime for lobby:", code);

        channel = supabase
          .channel(`public:lobbies:${code}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "lobbies",
              filter: `code=eq.${code}`,
            },
            async (payload) => {
              console.log("🔔 REALTIME EVENT:", payload.eventType);
              console.log("📦 Payload:", payload);

              if (payload.eventType === "UPDATE") {
                console.log("🔄 Lobby updated via realtime");
                // Fetch fresh data to ensure consistency
                await fetchLobby();
              } else if (payload.eventType === "DELETE") {
                console.log("❌ Lobby deleted");
                alert("Host closed the lobby");
                navigate("/lobby");
              }
            }
          )
          .subscribe(async (status) => {
            console.log("📡 Realtime status:", status);

            if (status === "SUBSCRIBED") {
              console.log("✅ Realtime connected!");
            } else if (status === "CHANNEL_ERROR") {
              console.error("❌ Realtime error - falling back to polling");
              // Fallback: Poll every 2 seconds if realtime fails
              pollInterval = setInterval(fetchLobby, 2000);
            } else if (status === "TIMED_OUT") {
              console.error("⏰ Realtime timeout - falling back to polling");
              pollInterval = setInterval(fetchLobby, 2000);
            }
          });
      } catch (err) {
        console.error("❌ Setup error:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    setup();

    // Cleanup
    return () => {
      console.log("🧹 Cleaning up...");
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [code, navigate]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = async () => {
    if (!lobby || !currentUserId) return;

    try {
      const currentPlayer = lobby.current_players.find(
        (p) => p.id === currentUserId
      );
      const newReadyStatus = !currentPlayer?.ready;

      console.log("🎯 Toggling ready to:", newReadyStatus);

      await togglePlayerReady(code, currentUserId, newReadyStatus);

      // Immediately fetch fresh data
      await fetchLobby();

      console.log("✅ Ready status updated");
    } catch (err) {
      console.error("❌ Error toggling ready:", err);
      alert(err.message);
    }
  };

  const handleStartGame = async () => {
    try {
      console.log("🚀 Starting game...");

      await startGame(code);

      // Immediately fetch to check status
      await fetchLobby();

      console.log("✅ Game start initiated");
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
      console.error("❌ Error leaving:", err);
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

  if (!lobby) {
    return (
      <div className="lobby-waiting-container">
        <div className="loading">Waiting for lobby data...</div>
      </div>
    );
  }

  const isHost = lobby.host_id === currentUserId;
  const currentPlayer = lobby.current_players?.find(
    (p) => p.id === currentUserId
  );
  const isReady = currentPlayer?.ready || false;
  const allPlayersReady = lobby.current_players?.every((p) => p.ready) || false;
  const canStart = lobby.current_players?.length >= 2 && allPlayersReady;

  return (
    <div className="lobby-waiting-container">
      <div className="lobby-waiting-card">
        <div className="lobby-header">
          <h1 className="lobby-title">Game Lobby</h1>
          {isHost && <span className="host-badge">You're the Host</span>}
        </div>

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

        <div className="players-section">
          <div className="players-header">
            <UsersIcon className="players-icon" />
            <h3>
              Players ({lobby.current_players?.length || 0}/{lobby.max_players})
            </h3>
          </div>
          <div className="players-list">
            {lobby.current_players?.map((player) => (
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

            {Array.from({
              length: lobby.max_players - (lobby.current_players?.length || 0),
            }).map((_, i) => (
              <div key={`empty-${i}`} className="empty-slot">
                <span>Waiting for player...</span>
              </div>
            ))}
          </div>
        </div>

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

        {isHost && !canStart && (
          <p className="status-message">
            {(lobby.current_players?.length || 0) < 2
              ? "Need at least 2 players to start"
              : "Waiting for all players to be ready..."}
          </p>
        )}
      </div>
    </div>
  );
}
