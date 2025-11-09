import { supabase } from "./supabaseClient";

// Create initial game state when game starts
export const createGameState = async (lobbyCode, lobby) => {
  try {
    console.log("🎮 Creating game state for lobby:", lobbyCode);

    // ✅ First, check if game already exists
    try {
      const existingGame = await getGameState(lobbyCode);
      if (existingGame) {
        console.log("⚠️ Game already exists, returning existing game");
        return existingGame;
      }
    } catch (err) {
      // Game doesn't exist, continue with creation
      console.log("✅ No existing game found, creating new one");
    }

    // Map lobby players to game players with positions
    const gamePlayers = lobby.current_players.map((player, index) => ({
      id: player.id,
      name: player.name,
      position: 0,
      color: player.color,
      isBot: false,
      turnOrder: index,
    }));

    const { data, error } = await supabase
      .from("game_states")
      .insert({
        lobby_code: lobbyCode,
        current_turn_player_id: gamePlayers[0].id,
        current_turn_index: 0,
        dice_value: null,
        is_rolling: false,
        game_status: "playing",
        players: gamePlayers,
      })
      .select()
      .single();

    if (error) {
      // If still duplicate error, try to get existing game
      if (error.code === "23505") {
        console.log("⚠️ Duplicate key error, fetching existing game");
        const existingGame = await getGameState(lobbyCode);
        return existingGame;
      }
      throw error;
    }

    console.log("✅ Game state created:", data);
    return data;
  } catch (error) {
    console.error("❌ Error creating game state:", error);
    throw error;
  }
};

// Get current game state
export const getGameState = async (lobbyCode) => {
  try {
    const { data, error } = await supabase
      .from("game_states")
      .select("*")
      .eq("lobby_code", lobbyCode)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("❌ Error getting game state:", error);
    throw error;
  }
};

// ✅ Initialize or get existing game state
export const initializeGameState = async (lobbyCode, lobby) => {
  try {
    console.log("🎮 Initializing game state for lobby:", lobbyCode);

    // Try to get existing game first
    try {
      const existingGame = await getGameState(lobbyCode);
      console.log("✅ Found existing game, using it");
      return existingGame;
    } catch (err) {
      // Game doesn't exist, create new one
      console.log("📝 No existing game, creating new one");
      return await createGameState(lobbyCode, lobby);
    }
  } catch (error) {
    console.error("❌ Error initializing game:", error);
    throw error;
  }
};

// Update player position after dice roll (ONLY FINAL POSITION)
export const updatePlayerPosition = async (
  lobbyCode,
  playerId,
  newPosition
) => {
  try {
    console.log("🎯 Updating player position:", playerId, "to", newPosition);

    const gameState = await getGameState(lobbyCode);
    const updatedPlayers = gameState.players.map((p) =>
      p.id === playerId ? { ...p, position: newPosition } : p
    );

    const { data, error } = await supabase
      .from("game_states")
      .update({
        players: updatedPlayers,
        updated_at: new Date().toISOString(),
      })
      .eq("lobby_code", lobbyCode)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Player position updated");
    return data;
  } catch (error) {
    console.error("❌ Error updating position:", error);
    throw error;
  }
};

// Roll dice and update game state (with turn lock)
export const rollDice = async (lobbyCode, diceValue, expectedTurnIndex) => {
  try {
    console.log("🎲 Rolling dice:", diceValue, "for turn:", expectedTurnIndex);

    const { data, error } = await supabase
      .from("game_states")
      .update({
        dice_value: diceValue,
        is_rolling: true,
        updated_at: new Date().toISOString(),
      })
      .eq("lobby_code", lobbyCode)
      .eq("current_turn_index", expectedTurnIndex) // ✅ Turn lock
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      throw new Error("Turn has already passed - someone else rolled!");
    }

    console.log("✅ Dice rolled");
    return data;
  } catch (error) {
    console.error("❌ Error rolling dice:", error);
    throw error;
  }
};

// Move to next player's turn
export const nextTurn = async (lobbyCode) => {
  try {
    console.log("➡️ Moving to next turn");

    const gameState = await getGameState(lobbyCode);
    const nextIndex =
      (gameState.current_turn_index + 1) % gameState.players.length;
    const nextPlayer = gameState.players[nextIndex];

    console.log(
      `🔄 Current turn: ${gameState.current_turn_index}, Next turn: ${nextIndex}`
    );
    console.log(`👤 Next player: ${nextPlayer.name}`);

    const { data, error } = await supabase
      .from("game_states")
      .update({
        current_turn_index: nextIndex,
        current_turn_player_id: nextPlayer.id,
        dice_value: null,
        is_rolling: false,
        updated_at: new Date().toISOString(),
      })
      .eq("lobby_code", lobbyCode)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Next turn updated:", nextPlayer.name);
    return data;
  } catch (error) {
    console.error("❌ Error moving to next turn:", error);
    throw error;
  }
};

// Set winner when game ends
export const setWinner = async (lobbyCode, winnerId) => {
  try {
    console.log("🏆 Setting winner:", winnerId);

    const { data, error } = await supabase
      .from("game_states")
      .update({
        game_status: "won",
        winner_id: winnerId,
        updated_at: new Date().toISOString(),
      })
      .eq("lobby_code", lobbyCode)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Winner set");
    return data;
  } catch (error) {
    console.error("❌ Error setting winner:", error);
    throw error;
  }
};

// Reset game (play again)
export const resetGame = async (lobbyCode) => {
  try {
    console.log("🔄 Resetting game");

    const gameState = await getGameState(lobbyCode);
    const resetPlayers = gameState.players.map((p) => ({ ...p, position: 0 }));

    const { data, error } = await supabase
      .from("game_states")
      .update({
        players: resetPlayers,
        current_turn_index: 0,
        current_turn_player_id: resetPlayers[0].id,
        dice_value: null,
        is_rolling: false,
        game_status: "playing",
        winner_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("lobby_code", lobbyCode)
      .select()
      .single();

    if (error) throw error;

    console.log("✅ Game reset");
    return data;
  } catch (error) {
    console.error("❌ Error resetting game:", error);
    throw error;
  }
};

// Delete game state (when leaving)
export const deleteGameState = async (lobbyCode) => {
  try {
    const { error } = await supabase
      .from("game_states")
      .delete()
      .eq("lobby_code", lobbyCode);

    if (error) throw error;

    console.log("✅ Game state deleted");
  } catch (error) {
    console.error("❌ Error deleting game state:", error);
    throw error;
  }
};

// Subscribe to game state changes (real-time)
export const subscribeToGameState = (lobbyCode, callback) => {
  console.log("📡 Subscribing to game state:", lobbyCode);

  const channel = supabase
    .channel(`game:${lobbyCode}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "game_states",
        filter: `lobby_code=eq.${lobbyCode}`,
      },
      (payload) => {
        console.log("🔔 Game state changed:", payload.eventType);
        callback(payload);
      }
    )
    .subscribe((status) => {
      console.log("📡 Game subscription status:", status);
    });

  return channel;
};
