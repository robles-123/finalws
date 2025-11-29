import React, { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Admin from "./components/Admin";
import Profile from "./components/Profile";
import Participant from "./components/Participant";
import CreateSeminar from "./components/CreateSeminar";
import QRRedirect from "./components/QRRedirect";
import { supabase } from "./lib/supabaseClient";

function App() {
  const navigate = useNavigate();
  const [globalMessage, setGlobalMessage] = useState(null);

  // Listen for global in-app banner events from other components
  React.useEffect(() => {
    const timeoutRef = { id: null };
    const handler = (e) => {
      const msg = e?.detail || String(e);
      setGlobalMessage(msg);
      if (timeoutRef.id) clearTimeout(timeoutRef.id);
      timeoutRef.id = setTimeout(() => {
        setGlobalMessage(null);
        timeoutRef.id = null;
      }, 8000);
    };
    window.addEventListener('app-banner', handler);
    return () => {
      window.removeEventListener('app-banner', handler);
      if (timeoutRef.id) clearTimeout(timeoutRef.id);
    };
  }, []);

  const handleLogin = async (username, password) => {
    // Map simple usernames (e.g., "admin") to an email that exists in Supabase.
    // If the user typed a proper email (contains @), use it as-is.
    const email = username.includes("@") ? username : `${username}@example.com`;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Authentication error', error);
        const msg = (error.message && error.message.includes('Supabase keys'))
          ? 'Supabase keys are missing. App is running in local/offline mode. Check console for details.'
          : 'Authentication failed. Check your credentials.';
        setGlobalMessage(msg);
        return;
      }

      const userEmail = (data?.user?.email || email || "").toLowerCase();
      const userId = data?.user?.id;

      // Persist basic session info locally for app usage
      if (userEmail) localStorage.setItem("userEmail", userEmail);
      if (userId) localStorage.setItem("userId", userId);

      // Allow configuring one or more admin emails via env var `VITE_ADMIN_EMAILS`
      // Example: VITE_ADMIN_EMAILS="admin@example.com,admin@vpaa.com"
      const adminEmailsRaw = import.meta.env.VITE_ADMIN_EMAILS || import.meta.env.NEXT_PUBLIC_ADMIN_EMAILS || "admin@example.com";
      const adminEmails = adminEmailsRaw.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

      if (adminEmails.includes(userEmail)) {
        localStorage.setItem("userRole", "admin");
        navigate("/admin");
      } else {
        localStorage.setItem("userRole", "participant");
        // If participant has no stored name/profile, send them to profile setup
        const profileName = localStorage.getItem("participantName");
        if (!profileName) {
          navigate("/profile");
        } else {
          navigate("/participant");
        }
      }
    } catch (err) {
      console.error(err);
      setGlobalMessage('Login error. Check console for details.');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error', err);
    }
    localStorage.removeItem("userRole");
    navigate("/");
  };

  return (
    <>
      {globalMessage && (
        <div className="app-banner" role="status">
          <div className="app-banner-inner">
            <span>{globalMessage}</span>
            <button className="app-banner-close" onClick={() => setGlobalMessage(null)} aria-label="Dismiss">×</button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin onLogout={handleLogout} />} />
        <Route
          path="/participant"
          element={<Participant onLogout={handleLogout} />}
        />
        <Route
          path="/create-seminar"
          element={<CreateSeminar onLogout={handleLogout} />}
        />
        <Route
          path="/qr"
          element={<QRRedirect />}
        />
      </Routes>
      <footer className="footer">
        © 2025 VPAA Seminar Certificate Automation System
      </footer>
    </>
  );
}

export default App;
