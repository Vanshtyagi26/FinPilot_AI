import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import FinPilotLogo from "../components/FinPilotLogo";
import { useAuth } from "../context/AuthContext";
import "../components/Layout.css";

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (loading) {
    return (
      <div className="center-screen">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  }

  return (
    <div className="center-screen auth-screen">
      <div className="auth-shell">
        <div className="auth-hero">
          <div className="auth-brand">
            <FinPilotLogo variant="full" className="auth-brand-logo" />
          </div>

          <div className="auth-hero-content">
            <span className="auth-pill">Secure sign-in</span>
            <h3>Run your finance operations with clarity and confidence.</h3>
            <p>
              Monitor cash flow, track goals, and turn everyday transactions
              into strategic decisions.
            </p>
            <ul className="auth-points">
              <li>Real-time transaction visibility</li>
              <li>Actionable AI-driven insights</li>
              <li>Trusted workspace for teams and founders</li>
            </ul>
          </div>
        </div>

        <div className="card auth-card">
          <div className="auth-card-head">
            <h1>Welcome back</h1>
            <p>Sign in to your FinPilot AI workspace</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="btn btn-primary auth-submit">
              Sign in
            </button>
          </form>
          <div className="auth-footer">
            <p>
              No account yet? <Link to="/register">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
