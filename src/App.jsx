import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Login from "./components/Login";
import Admin from "./components/Admin";
import Participant from "./components/Participant";
import CreateSeminar from "./components/CreateSeminar";
import { supabase } from "./lib/supabaseClient";

function App() {
  const navigate = useNavigate();

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
        alert(error.message || "Authentication failed");
        return;
      }

      const userEmail = data?.user?.email || email;

      if (userEmail === "admin@example.com") {
        localStorage.setItem("userRole", "admin");
        navigate("/admin");
      } else {
        localStorage.setItem("userRole", "participant");
        navigate("/participant");
      }
    } catch (err) {
      console.error(err);
      alert("Login error");
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
      <Routes>
        <Route path="/" element={<Login onLogin={handleLogin} />} />
        <Route path="/admin" element={<Admin onLogout={handleLogout} />} />
        <Route
          path="/participant"
          element={<Participant onLogout={handleLogout} />}
        />
        <Route
          path="/create-seminar"
          element={<CreateSeminar onLogout={handleLogout} />}
        />
      </Routes>
      <footer className="footer">
        © 2025 VPAA Seminar Certificate Automation System
      </footer>
    </>
  );
}

export default App;
