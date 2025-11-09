import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithGoogle,
  signInWithDiscord,
  signUpWithEmail,
  signInWithEmail,
} from "../services/supabaseAuth";
import googleLogo from "../assets/google.png";
import discordLogo from "../assets/discord.png";
import "./AuthModal.css";

function AuthModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!isLogin && !formData.username.trim()) {
      newErrors.username = "Username is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!isLogin && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setLoading(true);
      try {
        if (isLogin) {
          // LOGIN
          const user = await signInWithEmail(formData.email, formData.password);
          console.log("✅ Login successful:", user);

          // Save user info
          const username =
            user.user_metadata?.username ||
            user.email.split("@")[0] ||
            "Player";
          localStorage.setItem("playerName", username);
          localStorage.setItem("userId", user.id);

          // Just close modal - DON'T navigate anywhere!
          // User stays on home page
          onClose();
          console.log("🏠 Staying on home page after login");
        } else {
          // SIGNUP
          const user = await signUpWithEmail(
            formData.email,
            formData.password,
            formData.username
          );
          console.log("✅ Signup successful:", user);

          // Save user info
          localStorage.setItem("playerName", formData.username);
          localStorage.setItem("userId", user.id);

          // Just close modal - DON'T navigate anywhere!
          // User stays on home page
          onClose();
          console.log("🏠 Staying on home page after signup");
        }

        // Clear form
        setFormData({
          username: "",
          email: "",
          password: "",
          confirmPassword: "",
        });
      } catch (error) {
        console.error("Auth error:", error);

        // Better error messages
        let errorMessage = error.message;
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Invalid email or password. Please try again.";
        } else if (error.message.includes("User already registered")) {
          errorMessage =
            "This email is already registered. Please sign in instead.";
        }

        alert(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // OAuth will redirect to /auth/callback, then back to home
      console.log("🔄 Redirecting to Google OAuth...");
    } catch (error) {
      console.error("Google sign in error:", error);
      alert(error.message);
      setLoading(false);
    }
  };

  const handleDiscordSignIn = async () => {
    setLoading(true);
    try {
      await signInWithDiscord();
      // OAuth will redirect to /auth/callback, then back to home
      console.log("🔄 Redirecting to Discord OAuth...");
    } catch (error) {
      console.error("Discord sign in error:", error);
      alert(error.message);
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setFormData({ username: "", email: "", password: "", confirmPassword: "" });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <div className="modal-header">
          <h2>{isLogin ? "Welcome Back!" : "Create Account"}</h2>
          <p>{isLogin ? "Sign in to continue" : "Join the game today"}</p>
        </div>

        <div className="auth-form">
          {!isLogin && (
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter username"
                className={errors.username ? "error" : ""}
                disabled={loading}
              />
              {errors.username && (
                <span className="error-text">{errors.username}</span>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
              className={errors.email ? "error" : ""}
              disabled={loading}
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
              className={errors.password ? "error" : ""}
              disabled={loading}
            />
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm password"
                className={errors.confirmPassword ? "error" : ""}
                disabled={loading}
              />
              {errors.confirmPassword && (
                <span className="error-text">{errors.confirmPassword}</span>
              )}
            </div>
          )}

          {isLogin && (
            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" disabled={loading} />
                <span>Remember me</span>
              </label>
              <a href="#" className="forgot-password">
                Forgot password?
              </a>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="submit-btn"
            disabled={loading}
          >
            {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </button>

          <div className="divider">
            <span>or continue with</span>
          </div>

          <div className="social-buttons">
            <button
              onClick={handleGoogleSignIn}
              className="social-btn google-btn"
              disabled={loading}
            >
              <img src={googleLogo} alt="Google" className="social-icon" />
              Google
            </button>

            <button
              onClick={handleDiscordSignIn}
              className="social-btn discord-btn"
              disabled={loading}
            >
              <img src={discordLogo} alt="Discord" className="social-icon" />
              Discord
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={switchMode}
              className="switch-btn"
              disabled={loading}
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
