import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  Flag,
  LayoutDashboard,
  Lightbulb,
  Menu,
  Wallet,
  X,
} from "lucide-react";
import FinPilotLogo from "./FinPilotLogo";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

export default function Layout() {
  const { user, logout, updateCurrencyCode, supportedCurrencyCodes } =
    useAuth();
  const [currencyBusy, setCurrencyBusy] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleCurrencyChange(e) {
    const nextCode = e.target.value;
    if (!nextCode || nextCode === user?.currencyCode) return;
    setCurrencyBusy(true);
    try {
      await updateCurrencyCode(nextCode);
    } finally {
      setCurrencyBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <FinPilotLogo variant="full" className="sidebar-brand-logo" />
          <button
            type="button"
            className="icon-btn sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? "side-link active" : "side-link"
            }
            onClick={() => setMobileOpen(false)}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </NavLink>
          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              isActive ? "side-link active" : "side-link"
            }
            onClick={() => setMobileOpen(false)}
          >
            <Wallet size={16} />
            Transactions
          </NavLink>
          <NavLink
            to="/goals"
            className={({ isActive }) =>
              isActive ? "side-link active" : "side-link"
            }
            onClick={() => setMobileOpen(false)}
          >
            <Flag size={16} />
            Goals
          </NavLink>
          <NavLink
            to="/insights"
            className={({ isActive }) =>
              isActive ? "side-link active" : "side-link"
            }
            onClick={() => setMobileOpen(false)}
          >
            <Lightbulb size={16} />
            Insights
          </NavLink>
        </nav>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="backdrop"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu overlay"
        />
      ) : null}

      <div className="main-shell">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn only-mobile"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>
          <div className="topbar-right">
            <label
              className="muted currency-picker"
              htmlFor="currencyCodeSelect"
            >
              <span>Currency</span>
              <select
                id="currencyCodeSelect"
                value={user?.currencyCode || "USD"}
                disabled={currencyBusy}
                onChange={handleCurrencyChange}
              >
                {(supportedCurrencyCodes || []).map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
            <span className="user-email">{user?.email}</span>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Log out
            </button>
          </div>
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
