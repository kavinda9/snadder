import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
} from "react-router-dom";
import { useState, useEffect } from "react";
import SignIn from "./pages/SignIn";
import Game from "./pages/Game";
import { Lobby } from "./pages/Lobby";
import AuthModal from "./components/AuthModal";
import snadderLogo from "./assets/snadder.svg";

function Home() {
  const [playerName, setPlayerName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0); // Add key to force reset
  const navigate = useNavigate();

  useEffect(() => {
    // Simulate loading animation
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handlePlay = () => {
    if (playerName.trim()) {
      // Save player name to localStorage
      localStorage.setItem("playerName", playerName);

      // Navigate to LOBBY page (not game!)
      navigate("/lobby");
    } else {
      alert("Please enter your name!");
    }
  };

  const handleOpenModal = () => {
    setModalKey((prev) => prev + 1); // Force modal to reset
    setIsAuthModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAuthModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="home">
        {/* Top Navigation Bar */}
        <nav className="top-nav">
          <Link to="/store" className="nav-link">
            <button className="nav-btn">Store</button>
          </Link>
          <button className="nav-btn" onClick={handleOpenModal}>
            Sign In
          </button>
        </nav>

        {/* Main Content */}
        <div className="main-content">
          <img src={snadderLogo} alt="Snadder Logo" className="logo fade-in" />

          <div className="play-section fade-in-delay">
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="name-input"
              maxLength={20}
              onKeyPress={(e) => {
                if (e.key === "Enter") handlePlay();
              }}
            />

            <button onClick={handlePlay} className="play-btn">
              Play Now
            </button>
          </div>
        </div>
      </div>

      {/* Auth Modal - Shows when isAuthModalOpen is true */}
      <AuthModal
        key={modalKey}
        isOpen={isAuthModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}

function Store() {
  return (
    <div className="store-page">
      <h1>Store</h1>
      <p>Coming soon...</p>
      <Link to="/">
        <button className="back-btn">Back to Home</button>
      </Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/store" element={<Store />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
