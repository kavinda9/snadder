const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Generate random room code
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Create a new game room
router.post("/create-room", async (req, res) => {
  try {
    const { hostId, maxPlayers = 4 } = req.body;
    const roomCode = generateRoomCode();

    // Create room
    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .insert([
        {
          room_code: roomCode,
          host_id: hostId,
          max_players: maxPlayers,
          status: "waiting",
        },
      ])
      .select()
      .single();

    if (roomError) throw roomError;

    // Add host as first player
    const { error: playerError } = await supabase.from("room_players").insert([
      {
        room_id: room.id,
        user_id: hostId,
        turn_order: 1,
      },
    ]);

    if (playerError) throw playerError;

    res.json({ success: true, room });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: error.message });
  }
});

// Join existing room
router.post("/join-room", async (req, res) => {
  try {
    const { roomCode, userId } = req.body;

    // Find room
    const { data: room, error: roomError } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("room_code", roomCode)
      .eq("status", "waiting")
      .single();

    if (roomError || !room) {
      return res
        .status(404)
        .json({ error: "Room not found or already started" });
    }

    // Check if room is full
    if (room.current_players >= room.max_players) {
      return res.status(400).json({ error: "Room is full" });
    }

    // Check if player already in room
    const { data: existingPlayer } = await supabase
      .from("room_players")
      .select("id")
      .eq("room_id", room.id)
      .eq("user_id", userId)
      .single();

    if (existingPlayer) {
      return res.status(400).json({ error: "Already in this room" });
    }

    // Add player to room
    const { error: playerError } = await supabase.from("room_players").insert([
      {
        room_id: room.id,
        user_id: userId,
        turn_order: room.current_players + 1,
      },
    ]);

    if (playerError) throw playerError;

    // Update player count
    const { error: updateError } = await supabase
      .from("game_rooms")
      .update({ current_players: room.current_players + 1 })
      .eq("id", room.id);

    if (updateError) throw updateError;

    res.json({ success: true, room });
  } catch (error) {
    console.error("Error joining room:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get room details
router.get("/room/:roomCode", async (req, res) => {
  try {
    const { roomCode } = req.params;

    const { data: room, error } = await supabase
      .from("game_rooms")
      .select(
        `
        *,
        room_players (
          id,
          user_id,
          position,
          turn_order,
          is_ready,
          users (username, avatar_url)
        )
      `
      )
      .eq("room_code", roomCode)
      .single();

    if (error) throw error;

    res.json({ success: true, room });
  } catch (error) {
    console.error("Error getting room:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start game
router.post("/start-game", async (req, res) => {
  try {
    const { roomId, hostId } = req.body;

    // Verify host
    const { data: room } = await supabase
      .from("game_rooms")
      .select("host_id, current_players")
      .eq("id", roomId)
      .single();

    if (room.host_id !== hostId) {
      return res.status(403).json({ error: "Only host can start game" });
    }

    if (room.current_players < 2) {
      return res.status(400).json({ error: "Need at least 2 players" });
    }

    // Update room status
    const { error } = await supabase
      .from("game_rooms")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error("Error starting game:", error);
    res.status(500).json({ error: error.message });
  }
});

// Save game move
router.post("/save-move", async (req, res) => {
  try {
    const { roomId, userId, diceRoll, fromPosition, toPosition, moveType } =
      req.body;

    const { error } = await supabase.from("game_moves").insert([
      {
        room_id: roomId,
        user_id: userId,
        dice_roll: diceRoll,
        from_position: fromPosition,
        to_position: toPosition,
        move_type: moveType,
      },
    ]);

    if (error) throw error;

    // Update player position
    const { error: updateError } = await supabase
      .from("room_players")
      .update({ position: toPosition })
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (updateError) throw updateError;

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving move:", error);
    res.status(500).json({ error: error.message });
  }
});

// End game
router.post("/end-game", async (req, res) => {
  try {
    const { roomId, winnerId } = req.body;

    // Update room status
    const { error: roomError } = await supabase
      .from("game_rooms")
      .update({
        status: "finished",
        finished_at: new Date().toISOString(),
      })
      .eq("id", roomId);

    if (roomError) throw roomError;

    // Update winner stats
    const { data: winner } = await supabase
      .from("users")
      .select("games_won, games_played, total_score")
      .eq("id", winnerId)
      .single();

    if (winner) {
      await supabase
        .from("users")
        .update({
          games_won: winner.games_won + 1,
          games_played: winner.games_played + 1,
          total_score: winner.total_score + 100,
        })
        .eq("id", winnerId);
    }

    // Update other players stats
    const { data: players } = await supabase
      .from("room_players")
      .select("user_id")
      .eq("room_id", roomId)
      .neq("user_id", winnerId);

    if (players) {
      for (const player of players) {
        const { data: userData } = await supabase
          .from("users")
          .select("games_played")
          .eq("id", player.user_id)
          .single();

        if (userData) {
          await supabase
            .from("users")
            .update({
              games_played: userData.games_played + 1,
            })
            .eq("id", player.user_id);
        }
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error ending game:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("*")
      .limit(100);

    if (error) throw error;

    res.json({ success: true, leaderboard: data });
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
