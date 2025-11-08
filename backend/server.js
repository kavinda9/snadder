const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Import routes
const gameRoutes = require("./routes/gameRoutes");
const userRoutes = require("./routes/userRoutes");

// Routes
app.use("/api/game", gameRoutes);
app.use("/api/users", userRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Socket.IO for real-time game events
const activeGames = new Map(); // Store active game states

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join a game room
  socket.on("join-room", ({ roomCode, userId, username }) => {
    socket.join(roomCode);
    console.log(`${username} joined room ${roomCode}`);

    // Notify other players
    socket.to(roomCode).emit("player-joined", {
      userId,
      username,
      timestamp: Date.now(),
    });

    // Send current game state
    const gameState = activeGames.get(roomCode);
    if (gameState) {
      socket.emit("game-state", gameState);
    }
  });

  // Player ready
  socket.on("player-ready", ({ roomCode, userId }) => {
    io.to(roomCode).emit("player-ready-update", { userId });
  });

  // Dice roll
  socket.on("roll-dice", ({ roomCode, userId, diceValue }) => {
    io.to(roomCode).emit("dice-rolled", {
      userId,
      diceValue,
      timestamp: Date.now(),
    });
  });

  // Move piece
  socket.on(
    "move-piece",
    ({ roomCode, userId, fromPosition, toPosition, moveType }) => {
      io.to(roomCode).emit("piece-moved", {
        userId,
        fromPosition,
        toPosition,
        moveType, // 'normal', 'ladder', 'snake'
        timestamp: Date.now(),
      });

      // Update game state
      const gameState = activeGames.get(roomCode);
      if (gameState) {
        const player = gameState.players.find((p) => p.userId === userId);
        if (player) {
          player.position = toPosition;
          activeGames.set(roomCode, gameState);
        }
      }
    }
  );

  // Game winner
  socket.on("game-won", ({ roomCode, userId, username }) => {
    io.to(roomCode).emit("game-over", {
      winnerId: userId,
      winnerName: username,
      timestamp: Date.now(),
    });

    // Clean up game state
    activeGames.delete(roomCode);
  });

  // Leave room
  socket.on("leave-room", ({ roomCode, userId, username }) => {
    socket.leave(roomCode);
    socket.to(roomCode).emit("player-left", {
      userId,
      username,
      timestamp: Date.now(),
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
});
