/**
 * LoginScreen.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen login/registration card shown when the user is not authenticated.
 *
 * Props:
 *   LOGO              — base64 logo data URI
 *   showRegister      — bool: show registration tab instead of login
 *   setShowRegister   — fn(bool)
 *   loginUsername / setLoginUsername
 *   loginPassword / setLoginPassword
 *   loginError
 *   onLogin           — fn() — called on form submit
 *   regInviteCode / setRegInviteCode
 *   regCenter / setRegCenter
 *   regUsername / setRegUsername
 *   regPassword / setRegPassword
 *   regConfirm / setRegConfirm
 *   regError
 *   regLoading
 *   regSuccess        — string: "account created, awaiting approval" banner
 *   setRegSuccess     — fn(string)
 *   onRegister        — fn() — called on registration form submit
 */

import React from "react";
import { CENTERS } from "../config/centers.js";

export default function LoginScreen({
  LOGO,
  showRegister,
  setShowRegister,
  loginUsername, setLoginUsername,
  loginPassword, setLoginPassword,
  loginError,
  onLogin,
  regInviteCode, setRegInviteCode,
  regCenter, setRegCenter,
  regUsername, setRegUsername,
  regPassword, setRegPassword,
  regConfirm, setRegConfirm,
  regError,
  regLoading,
  regSuccess, setRegSuccess,
  onRegister,
}) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1a3a6b 55%, #0f172a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      {/* Decorative background blobs */}
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "rgba(59,130,246,0.07)", top: -150, right: -150, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", background: "rgba(99,179,237,0.06)", bottom: -100, left: -100, pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "rgba(147,197,253,0.05)", top: "38%", left: "12%", pointerEvents: "none" }} />
      <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "rgba(59,130,246,0.06)", bottom: "25%", right: "14%", pointerEvents: "none" }} />

      {/* Card */}
      <div style={{
        background: "white", borderRadius: 20, border: "1px solid rgba(226,232,240,0.8)",
        padding: "44px 40px 36px", width: "100%", maxWidth: 420,
        boxShadow: "0 30px 80px rgba(0,0,0,0.45)", textAlign: "center",
        position: "relative", zIndex: 1,
      }}>
        {/* Logo + branding */}
        <img src={LOGO} alt="ECS" style={{ width: 68, height: 68, borderRadius: 16, marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} />
        <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", marginBottom: 4 }}>ECS Hub</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 28 }}>Empowered Community Services</div>

        {!showRegister ? (
          <>
            {regSuccess && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 10, padding: "12px 14px", fontSize: 13, textAlign: "left", marginBottom: 18, lineHeight: 1.5 }}>
                <strong>Account created.</strong> {regSuccess.replace(/^Account created\.\s*/, "")}
                <button
                  onClick={() => setRegSuccess("")}
                  style={{ background: "none", border: "none", color: "#166534", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", padding: 0, marginTop: 6, display: "block" }}
                >
                  Dismiss
                </button>
              </div>
            )}
            <form onSubmit={e => { e.preventDefault(); onLogin(); }} style={{ textAlign: "left" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Username</label>
              <input
                type="text" name="username"
                value={loginUsername}
                onChange={e => { setLoginUsername(e.target.value); }}
                placeholder="Enter your username"
                autoFocus autoComplete="username"
                style={{ width: "100%", border: `1.5px solid ${loginError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 12, background: loginError ? "#fff8f8" : "#f8fafc", outline: "none", boxSizing: "border-box" }}
              />
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Password</label>
              <input
                type="password" name="password"
                value={loginPassword}
                onChange={e => { setLoginPassword(e.target.value); }}
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ width: "100%", border: `1.5px solid ${loginError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 10, background: loginError ? "#fff8f8" : "#f8fafc", outline: "none", boxSizing: "border-box" }}
              />
              {loginError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10 }}>{loginError}</div>}
              <button
                type="submit"
                style={{ width: "100%", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "white", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(59,130,246,0.4)", marginTop: 4 }}
              >
                Sign In
              </button>
            </form>
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button
                onClick={() => setShowRegister(true)}
                style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
              >
                First time? Create your account
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Create Your Account</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>Enter the one-time invite code from your administrator. After you sign up, an admin approves your account before you can sign in.</div>
            <form onSubmit={e => { e.preventDefault(); onRegister(); }} style={{ textAlign: "left" }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Invite Code</label>
              <input
                type="password" value={regInviteCode}
                onChange={e => { setRegInviteCode(e.target.value); }}
                placeholder="Enter invite code"
                autoFocus autoComplete="off"
                style={{ width: "100%", border: `1.5px solid ${regError && !regUsername ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 12, background: "#f8fafc", outline: "none", boxSizing: "border-box" }}
              />
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Your Center</label>
              <select
                value={regCenter} onChange={e => { setRegCenter(e.target.value); }}
                style={{ width: "100%", border: `1.5px solid ${regError && !regCenter ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 12, background: "#f8fafc", outline: "none", boxSizing: "border-box", color: regCenter ? "#1e293b" : "#94a3b8" }}
              >
                <option value="">Select your center...</option>
                {CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Choose a Username</label>
              <input
                type="text" name="username" value={regUsername}
                onChange={e => { setRegUsername(e.target.value); }}
                placeholder="e.g. sarah_jones" autoComplete="username"
                style={{ width: "100%", border: `1.5px solid ${regError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 12, background: "#f8fafc", outline: "none", boxSizing: "border-box" }}
              />
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Choose a Password</label>
              <input
                type="password" name="new-password" value={regPassword}
                onChange={e => { setRegPassword(e.target.value); }}
                placeholder="At least 8 characters" autoComplete="new-password"
                style={{ width: "100%", border: `1.5px solid ${regError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 12, background: "#f8fafc", outline: "none", boxSizing: "border-box" }}
              />
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Confirm Password</label>
              <input
                type="password" value={regConfirm}
                onChange={e => { setRegConfirm(e.target.value); }}
                placeholder="Re-enter your password" autoComplete="new-password"
                style={{ width: "100%", border: `1.5px solid ${regError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 10, background: "#f8fafc", outline: "none", boxSizing: "border-box" }}
              />
              {regError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10 }}>{regError}</div>}
              <button
                type="submit" disabled={regLoading}
                style={{ width: "100%", background: regLoading ? "#93c5fd" : "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "white", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: regLoading ? "default" : "pointer", boxShadow: "0 4px 14px rgba(59,130,246,0.4)", marginTop: 4 }}
              >
                {regLoading ? "Creating account…" : "Create Account"}
              </button>
            </form>
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <button
                onClick={() => { setShowRegister(false); }}
                style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
              >
                ← Back to Sign In
              </button>
            </div>
          </>
        )}

        <div style={{ marginTop: 24, fontSize: 11, color: "#94a3b8" }}>Empowered Community Services © 2025</div>
      </div>
    </div>
  );
}
