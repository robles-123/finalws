import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin(username, password);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleSubmit}>
        <div style={{ 
          textAlign: "center",
          marginBottom: "2rem",
          paddingBottom: "1.5rem",
          borderBottom: "2px solid #e0e0e0"
        }}>
          <img src="/logo.png"
  alt="System Logo"
  style={{ width: "200px", marginBottom: "1rem" }} />
          <h1 style={{ fontSize: "1.5rem", color: "#1a3a52", margin: "0 0 0.5rem 0", fontWeight: "700" }}>
            VPAA Seminar System
          </h1>
          <p style={{ color: "#666", fontSize: "0.95rem", margin: 0 }}>
            Certificate Automation & Event Management
          </p>
        </div>

        <h2 style={{ fontSize: "1.6rem", color: "#1a3a52", marginBottom: "0.5rem", fontWeight: "700" }}>Sign In</h2>
        <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
          Enter your credentials to continue
        </p>
        
        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.95rem",
              border: "2px solid #e0e0e0",
              borderRadius: "10px",
              fontSize: "1rem",
              transition: "all 0.3s",
              boxSizing: "border-box"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#c41e3a";
              e.target.style.boxShadow = "0 0 10px rgba(196, 30, 58, 0.2)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e0e0e0";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        <div style={{ position: "relative", marginBottom: "1.5rem" }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              width: "100%",
              padding: "0.95rem",
              border: "2px solid #e0e0e0",
              borderRadius: "10px",
              fontSize: "1rem",
              transition: "all 0.3s",
              boxSizing: "border-box"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#c41e3a";
              e.target.style.boxShadow = "0 0 10px rgba(196, 30, 58, 0.2)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e0e0e0";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          style={{
            width: "100%",
            padding: "1rem",
            marginTop: "1.2rem",
            border: "none",
            borderRadius: "12px",
            background: isLoading ? "#ccc" : "linear-gradient(135deg, #c41e3a, #a01831)",
            color: "white",
            fontWeight: "600",
            fontSize: "1rem",
            cursor: isLoading ? "not-allowed" : "pointer",
            transition: "all 0.3s",
            boxShadow: "0 4px 15px rgba(196, 30, 58, 0.3)"
          }}
          onMouseOver={(e) => !isLoading && (e.target.style.boxShadow = "0 6px 20px rgba(196, 30, 58, 0.4)")}
          onMouseOut={(e) => !isLoading && (e.target.style.boxShadow = "0 4px 15px rgba(196, 30, 58, 0.3)")}
        >
          {isLoading ? "Signing in..." : "Sign In"}
        </button>

        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <small>Don't have an account? <Link to="/register">Create one</Link></small>
        </div>
      </form>
    </div>
  );
}

export default Login;
