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
import { LobbyWaitingRoom } from "./pages/LobbyWaitingRoom";
import AuthModal from "./components/AuthModal";
import Loading from "./components/loading"; // Import custom loading
import { supabase } from "./services/supabaseClient";
import snadderLogo from "./assets/snadder.svg";

function Home() {
  const [playerName, setPlayerName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handlePlay = () => {
    if (playerName.trim()) {
      localStorage.setItem("playerName", playerName);
      navigate("/lobby");
    } else {
      alert("Please enter your name!");
    }
  };

  const handleOpenModal = () => {
    setModalKey((prev) => prev + 1);
    setIsAuthModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAuthModalOpen(false);
  };

  if (isLoading) {
    return <Loading />; // Use custom loading component
  }

  return (
    <>
      <div className="home">
        <nav className="top-nav">
          <Link to="/store" className="nav-link">
            <button className="nav-btn">Store</button>
          </Link>
          <button className="nav-btn" onClick={handleOpenModal}>
            Sign In
          </button>
        </nav>

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

// Auth Callback Component - handles OAuth redirects
function AuthCallback() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log("🔐 Handling OAuth callback...");

        // Get the session from Supabase
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          navigate("/");
          return;
        }

        if (data.session) {
          const user = data.session.user;
          console.log("✅ OAuth login successful:", user);

          // Extract username from OAuth provider data
          const username =
            user.user_metadata?.username ||
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Player";

          // Save user info to localStorage
          localStorage.setItem("playerName", username);
          localStorage.setItem("userId", user.id);

          // Check if user exists in database
          const { data: existingUser } = await supabase
            .from("users")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          // Create user profile if it doesn't exist
          if (!existingUser) {
            console.log("📝 Creating new user profile...");
            const { error: insertError } = await supabase.from("users").insert([
              {
                id: user.id,
                username: username,
                email: user.email,
                created_at: new Date().toISOString(),
                games_played: 0,
                games_won: 0,
              },
            ]);

            if (insertError) {
              console.error("Error creating user profile:", insertError);
            } else {
              console.log("✅ User profile created");
            }
          }

          // Redirect to lobby (NOT game!)
          console.log("🎮 Redirecting to lobby...");
          setIsLoading(false);
          navigate("/lobby");
        } else {
          console.log("❌ No session found, redirecting to home");
          navigate("/");
        }
      } catch (error) {
        console.error("Error in OAuth callback:", error);
        navigate("/");
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  if (isLoading) {
    return <Loading />; // Use custom loading component
  }

  return null;
}

function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Check for existing session on app load
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          console.log("✅ Found existing session:", session.user.email);
          // Restore user info from session if available
          const username =
            session.user.user_metadata?.username ||
            session.user.user_metadata?.full_name ||
            session.user.email?.split("@")[0] ||
            localStorage.getItem("playerName") ||
            "Player";

          localStorage.setItem("playerName", username);
          localStorage.setItem("userId", session.user.id);
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsAuthReady(true);
      }
    };

    checkSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("🔔 Auth state changed:", event);

      if (event === "SIGNED_IN" && session) {
        console.log("✅ User signed in:", session.user.email);
      } else if (event === "SIGNED_OUT") {
        console.log("👋 User signed out");
        localStorage.removeItem("playerName");
        localStorage.removeItem("userId");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!isAuthReady) {
    return <Loading />; // Use custom loading component
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/store" element={<Store />} />
        <Route path="/lobby" element={<Lobby />} />
        <Route path="/lobby/:code" element={<LobbyWaitingRoom />} />
        <Route path="/game" element={<Game />} />
        {/* Auth callback route for OAuth redirects */}
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
