const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get user profile
router.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;

    res.json({ success: true, user: data });
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { username, avatar_url } = req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, user: data });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user stats
router.get("/stats/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select("games_played, games_won, total_score")
      .eq("id", userId)
      .single();

    if (error) throw error;

    const winRate =
      data.games_played > 0
        ? ((data.games_won / data.games_played) * 100).toFixed(2)
        : 0;

    res.json({
      success: true,
      stats: { ...data, win_rate: winRate },
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get user game history
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    const { data, error } = await supabase
      .from("game_moves")
      .select(
        `
        *,
        game_rooms (room_code, status, created_at)
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    res.json({ success: true, history: data });
  } catch (error) {
    console.error("Error getting history:", error);
    res.status(500).json({ error: error.message });
  }
});

// Search users by username
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res
        .status(400)
        .json({ error: "Query must be at least 2 characters" });
    }

    const { data, error } = await supabase
      .from("users")
      .select("id, username, avatar_url, games_played, games_won")
      .ilike("username", `%${query}%`)
      .limit(10);

    if (error) throw error;

    res.json({ success: true, users: data });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
np