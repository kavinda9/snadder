import { supabase } from "./supabaseClient";

// Generate unique 6-character lobby code
function generateCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Get color for player based on position
function getPlayerColor(index) {
  const colors = [
    "#e74c3c",
    "#3498db",
    "#2ecc71",
    "#f39c12",
    "#9b59b6",
    "#e67e22",
  ];
  return colors[index % colors.length];
}

// Create a new lobby
export const createLobby = async (hostName, maxPlayers) => {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be logged in to create a lobby");
    }

    // Generate unique code (retry if duplicate)
    let code = generateCode();
    let attempts = 0;

    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("lobbies")
        .select("code")
        .eq("code", code)
        .maybeSingle();

      if (!existing) break;
      code = generateCode();
      attempts++;
    }

    // Create lobby with host as first player
    const { data, error } = await supabase
      .from("lobbies")
      .insert({
        code,
        host_id: user.id,
        host_name: hostName,
        max_players: maxPlayers,
        current_players: [
          {
            id: user.id,
            name: hostName,
            color: getPlayerColor(0),
            ready: true,
            isHost: true,
          },
        ],
        status: "waiting",
        game_mode: "multiplayer",
      })
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Lobby created:", data);
    return data;
  } catch (error) {
    console.error("❌ Error creating lobby:", error);
    throw error;
  }
};

// Join an existing lobby
export const joinLobby = async (code, playerName) => {
  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be logged in to join a lobby");
    }

    console.log("🔍 Searching for lobby with code:", code.toUpperCase());

    // Get lobby
    const { data: lobbies, error: lobbyError } = await supabase
      .from("lobbies")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("status", "waiting");

    if (lobbyError) {
      console.error("❌ Lobby fetch error:", lobbyError);
      throw new Error("Error fetching lobby: " + lobbyError.message);
    }

    if (!lobbies || lobbies.length === 0) {
      throw new Error("Lobby not found or already started");
    }

    if (lobbies.length > 1) {
      console.warn("⚠️ Multiple lobbies found! Using most recent.");
      lobbies.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const lobby = lobbies[0];

    // Check if already in lobby
    const alreadyJoined = lobby.current_players.some((p) => p.id === user.id);
    if (alreadyJoined) {
      console.log("✅ Already in lobby");
      return lobby;
    }

    // Check if lobby is full
    if (lobby.current_players.length >= lobby.max_players) {
      throw new Error("Lobby is full");
    }

    // Add new player
    const newPlayer = {
      id: user.id,
      name: playerName,
      color: getPlayerColor(lobby.current_players.length),
      ready: false,
      isHost: false,
    };

    const updatedPlayers = [...lobby.current_players, newPlayer];

    console.log("👥 Adding player:", newPlayer);

    // Update lobby
    const { data: updated, error: updateError } = await supabase
      .from("lobbies")
      .update({
        current_players: updatedPlayers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lobby.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Update error:", updateError);
      throw updateError;
    }

    console.log("✅ Joined lobby:", updated);
    return updated;
  } catch (error) {
    console.error("❌ Error joining lobby:", error);
    throw error;
  }
};

// Get lobby by code
export const getLobby = async (code) => {
  try {
    console.log("🔍 Getting lobby:", code.toUpperCase());

    const { data: lobbies, error } = await supabase
      .from("lobbies")
      .select("*")
      .eq("code", code.toUpperCase());

    if (error) {
      console.error("❌ Fetch error:", error);
      throw error;
    }

    if (!lobbies || lobbies.length === 0) {
      throw new Error("Lobby not found");
    }

    if (lobbies.length > 1) {
      console.warn("⚠️ Multiple lobbies found! Using most recent.");
      lobbies.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    console.log("✅ Lobby found:", lobbies[0]);
    return lobbies[0];
  } catch (error) {
    console.error("❌ Error getting lobby:", error);
    throw error;
  }
};

// Update player ready status
export const togglePlayerReady = async (code, playerId, ready) => {
  try {
    console.log("🎯 Toggling ready for player:", playerId, "to:", ready);

    const lobby = await getLobby(code);

    const updatedPlayers = lobby.current_players.map((p) =>
      p.id === playerId ? { ...p, ready } : p
    );

    const { data, error } = await supabase
      .from("lobbies")
      .update({
        current_players: updatedPlayers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lobby.id)
      .select()
      .single();

    if (error) {
      console.error("❌ Ready toggle error:", error);
      throw error;
    }

    console.log("✅ Ready status updated:", data);
    return data;
  } catch (error) {
    console.error("❌ Error updating ready status:", error);
    throw error;
  }
};

// Start game (change status to 'playing')
export const startGame = async (code) => {
  try {
    console.log("🚀 Starting game for lobby:", code);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const lobby = await getLobby(code);

    // Only host can start
    if (lobby.host_id !== user.id) {
      throw new Error("Only the host can start the game");
    }

    // Check if minimum players
    if (lobby.current_players.length < 2) {
      throw new Error("Need at least 2 players to start");
    }

    const { data, error } = await supabase
      .from("lobbies")
      .update({
        status: "playing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", lobby.id)
      .select()
      .single();

    if (error) {
      console.error("❌ Start game error:", error);
      throw error;
    }

    console.log("✅ Game started:", data);
    return data;
  } catch (error) {
    console.error("❌ Error starting game:", error);
    throw error;
  }
};

// Leave lobby
export const leaveLobby = async (code, userId) => {
  try {
    console.log("👋 Player leaving lobby:", userId);

    const lobby = await getLobby(code);

    // If host leaves, delete entire lobby
    if (lobby.host_id === userId) {
      const { error } = await supabase
        .from("lobbies")
        .delete()
        .eq("id", lobby.id);

      if (error) {
        console.error("❌ Delete error:", error);
        throw error;
      }

      console.log("✅ Host left, lobby deleted");
      return null;
    }

    // Remove player
    const updatedPlayers = lobby.current_players.filter((p) => p.id !== userId);

    const { data, error } = await supabase
      .from("lobbies")
      .update({
        current_players: updatedPlayers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lobby.id)
      .select()
      .single();

    if (error) {
      console.error("❌ Leave error:", error);
      throw error;
    }

    console.log("✅ Player left lobby:", data);
    return data;
  } catch (error) {
    console.error("❌ Error leaving lobby:", error);
    throw error;
  }
};

// Delete lobby (host only)
export const deleteLobby = async (code) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const lobby = await getLobby(code);

    // Only host can delete
    if (lobby.host_id !== user.id) {
      throw new Error("Only the host can delete the lobby");
    }

    const { error } = await supabase
      .from("lobbies")
      .delete()
      .eq("id", lobby.id);

    if (error) throw error;

    console.log("✅ Lobby deleted");
    return true;
  } catch (error) {
    console.error("❌ Error deleting lobby:", error);
    throw error;
  }
};

// Subscribe to lobby changes (real-time) - NOT USED ANYMORE
// Kept for backwards compatibility
export const subscribeLobbyChanges = (code, callback) => {
  console.warn(
    "⚠️ subscribeLobbyChanges is deprecated. Use direct supabase.channel() instead."
  );
  const channel = supabase
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
        console.log("🔔 Lobby changed:", payload);
        callback(payload);
      }
    )
    .subscribe();

  return channel;
};

// Unsubscribe from lobby changes
export const unsubscribeLobby = (channel) => {
  supabase.removeChannel(channel);
};
