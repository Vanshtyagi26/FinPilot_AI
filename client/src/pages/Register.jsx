import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import FinPilotLogo from "../components/FinPilotLogo";
import { useAuth } from "../context/AuthContext";
import "../components/Layout.css";

export default function Register() {
  const { register, isAuthenticated, loading } = useAuth();
  const [name, setName] = useState("");
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
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    try {
      await register({ name, email, password });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
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
            <span className="auth-pill">New account</span>
            <h3>Create a premium workspace for your finance operations.</h3>
            <p>Bring clarity to expenses, goals, and forecasts from day one.</p>
            <ul className="auth-points">
              <li>Launch in minutes with a secure profile</li>
              <li>Track spending and savings seamlessly</li>
              <li>Connect your workflow to AI insights</li>
            </ul>
          </div>
        </div>

        <div className="card auth-card">
          <div className="auth-card-head">
            <h1>Create account</h1>
            <p>Start tracking your finances with a premium experience</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name (optional)</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="btn btn-primary auth-submit">
              Sign up
            </button>
          </form>
          <div className="auth-footer">
            <p>
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
