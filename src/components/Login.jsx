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
          <img src="/logo.svg" alt="Logo" style={{ width: "80px", height: "80px", marginBottom: "1rem" }} />
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
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "0.95rem 2.8rem 0.95rem 0.95rem",
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
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "0.75rem",
              top: "25%",
              transform: "translateY(-50%)",
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: "0.3rem 0.2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#999",
              transition: "color 0.3s",
              width: "auto",
              height: "auto"
            }}
            onMouseOver={(e) => e.currentTarget.style.color = "#c41e3a"}
            onMouseOut={(e) => e.currentTarget.style.color = "#979797ff"}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            )}
          </button>
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
