import { supabase } from "./supabaseClient";

// Sign up with Email and Password
export const signUpWithEmail = async (email, password, username) => {
  try {
    // Sign up user
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          username: username,
          display_name: username,
        },
      },
    });

    if (error) throw error;

    // Create user profile in database
    if (data.user) {
      const { error: profileError } = await supabase.from("users").insert([
        {
          id: data.user.id,
          username: username,
          email: email,
          created_at: new Date().toISOString(),
          games_played: 0,
          games_won: 0,
        },
      ]);

      if (profileError) {
        console.error("Error creating profile:", profileError);
      }
    }

    return data.user;
  } catch (error) {
    console.error("Error signing up:", error);
    throw error;
  }
};

// Sign in with Email and Password
export const signInWithEmail = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error("Error signing in:", error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

// Sign in with Discord
export const signInWithDiscord = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error signing in with Discord:", error);
    throw error;
  }
};

// Sign out
export const logOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
};
