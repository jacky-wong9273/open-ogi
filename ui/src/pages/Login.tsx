import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError((err as Error).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--color-bg)",
      }}
    >
      <div className="card" style={{ width: 400, maxWidth: "90vw" }}>
        <h1
          style={{
            textAlign: "center",
            marginBottom: "0.5rem",
            color: "var(--color-primary)",
          }}
        >
          🧠 Open-OGI
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "var(--color-text-muted)",
            marginBottom: "2rem",
            fontSize: "0.875rem",
          }}
        >
          Organizational General Intelligence
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p
              style={{
                color: "var(--color-error)",
                fontSize: "0.875rem",
                marginBottom: "1rem",
              }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: "0.75rem",
            color: "var(--color-text-muted)",
          }}
        >
          Contact your administrator for credentials.
        </p>
      </div>
    </div>
  );
}
