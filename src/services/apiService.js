const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "API request failed");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// Game API calls
export const gameAPI = {
  // Create a new game room
  createRoom: async (hostId, maxPlayers = 4) => {
    return apiCall("/game/create-room", {
      method: "POST",
      body: JSON.stringify({ hostId, maxPlayers }),
    });
  },

  // Join an existing room
  joinRoom: async (roomCode, userId) => {
    return apiCall("/game/join-room", {
      method: "POST",
      body: JSON.stringify({ roomCode, userId }),
    });
  },

  // Get room details
  getRoom: async (roomCode) => {
    return apiCall(`/game/room/${roomCode}`);
  },

  // Start the game
  startGame: async (roomId, hostId) => {
    return apiCall("/game/start-game", {
      method: "POST",
      body: JSON.stringify({ roomId, hostId }),
    });
  },

  // Save a move
  saveMove: async (moveData) => {
    return apiCall("/game/save-move", {
      method: "POST",
      body: JSON.stringify(moveData),
    });
  },

  // End the game
  endGame: async (roomId, winnerId) => {
    return apiCall("/game/end-game", {
      method: "POST",
      body: JSON.stringify({ roomId, winnerId }),
    });
  },

  // Get leaderboard
  getLeaderboard: async () => {
    return apiCall("/game/leaderboard");
  },
};

// User API calls
export const userAPI = {
  // Get user profile
  getProfile: async (userId) => {
    return apiCall(`/users/profile/${userId}`);
  },

  // Update user profile
  updateProfile: async (userId, updates) => {
    return apiCall(`/users/profile/${userId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  },

  // Get user stats
  getStats: async (userId) => {
    return apiCall(`/users/stats/${userId}`);
  },

  // Get user game history
  getHistory: async (userId, limit = 10) => {
    return apiCall(`/users/history/${userId}?limit=${limit}`);
  },

  // Search users
  searchUsers: async (query) => {
    return apiCall(`/users/search?query=${encodeURIComponent(query)}`);
  },
};

export default { gameAPI, userAPI };
