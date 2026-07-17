/**
 * LoginScreen.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Split-panel sign-in (CONSOLIDATION_PLAN §6): navy brand panel + flat form.
 * No gradients, blobs, or glow — this should read like a product, not a demo.
 * Renders standalone (GlobalStyles isn't mounted pre-auth), so its layout CSS
 * lives in the local <style> block below. Fonts come from the app bundle
 * (@fontsource IBM Plex imports in main.jsx).
 *
 * Props (all state lives in hooks/useAuth.js):
 *   LOGO — base64 logo data URI
 *   showRegister / setShowRegister
 *   loginUsername/setLoginUsername · loginPassword/setLoginPassword
 *   loginError · onLogin
 *   regInviteCode/setRegInviteCode · regCenter/setRegCenter
 *   regUsername/setRegUsername · regPassword/setRegPassword
 *   regConfirm/setRegConfirm · regError · regLoading
 *   regSuccess/setRegSuccess — "account created, awaiting approval" banner
 *   onRegister
 */

import React from "react";
import { CENTERS } from "../config/centers.js";

const NAVY = "#1a2d4d";

const field = {
  label: { display: "block", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: "#6b6b6b", marginBottom: 6 },
  input: { width: "100%", boxSizing: "border-box", background: "#fff", border: "1px solid #d9d9d6", borderRadius: 6, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", color: "#1a1a1a", outline: "none", marginBottom: 16 },
};

function Field({ label, error, children }) {
  return (
    <div>
      <label style={field.label}>{label}</label>
      {React.cloneElement(children, {
        style: { ...field.input, ...(error ? { borderColor: "#f0a9a3", background: "#fffafa" } : {}), ...children.props.style },
      })}
    </div>
  );
}

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
  const submitBtn = (labelText, disabled) => (
    <button type="submit" disabled={disabled}
      style={{ width: "100%", background: disabled ? "#8a97ab" : NAVY, color: "#fff", border: "none", borderRadius: 6, padding: "11px", fontSize: 14, fontWeight: 600, cursor: disabled ? "default" : "pointer", fontFamily: "inherit", letterSpacing: "0.2px" }}>
      {labelText}
    </button>
  );

  return (
    <div className="login-root" style={{ minHeight: "100vh", display: "flex", fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        .login-root { flex-wrap: wrap; }
        .login-brand { background: ${NAVY}; color: #fff; flex: 1 1 340px; display: flex; flex-direction: column; justify-content: space-between; padding: 44px 48px; }
        .login-form-panel { background: #f7f7f5; flex: 1.4 1 380px; display: flex; align-items: center; justify-content: center; padding: 48px 24px; }
        .login-root input:focus, .login-root select:focus { border-color: #4a7ab5 !important; box-shadow: 0 0 0 3px rgba(74,122,181,0.15); }
        @media (max-width: 860px) {
          .login-brand { flex-direction: row; align-items: center; justify-content: flex-start; gap: 14px; padding: 18px 24px; }
          .login-brand .brand-mid, .login-brand .brand-foot { display: none; }
        }
      `}</style>

      {/* Brand panel */}
      <div className="login-brand">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={LOGO} alt="" style={{ width: 34, height: 34, borderRadius: 6 }} />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.3px", lineHeight: 1.1 }}>ECS Hub</div>
            <div style={{ fontSize: 11, color: "#8fb3d4", letterSpacing: "0.4px" }}>Internal operations platform</div>
          </div>
        </div>

        <div className="brand-mid" style={{ maxWidth: 380 }}>
          <div style={{ width: 34, height: 2, background: "#4a7ab5", marginBottom: 18 }} />
          <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.35, letterSpacing: "-0.2px" }}>
            All your tools — one place of work.
          </div>
        </div>

        <div className="brand-foot" style={{ fontSize: 11, letterSpacing: "1.2px", textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
          Empowered Community Services · © {new Date().getFullYear()}
        </div>
      </div>

      {/* Form panel */}
      <div className="login-form-panel">
        <div style={{ width: "100%", maxWidth: 360 }}>
          {!showRegister ? (
            <>
              <div style={{ fontSize: 21, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.3px", marginBottom: 4 }}>Sign in</div>
              <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: 26 }}>Use your ECS Hub account.</div>

              {regSuccess && (
                <div style={{ background: "#f2f9f4", border: "1px solid #bfe0c8", color: "#1e6b34", borderRadius: 6, padding: "11px 13px", fontSize: 13, lineHeight: 1.5, marginBottom: 18 }}>
                  <strong>Account created.</strong> {regSuccess.replace(/^Account created\.\s*/, "")}
                  <button onClick={() => setRegSuccess("")}
                    style={{ background: "none", border: "none", color: "#1e6b34", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", padding: 0, display: "block", marginTop: 6 }}>
                    Dismiss
                  </button>
                </div>
              )}

              <form onSubmit={e => { e.preventDefault(); onLogin(); }}>
                <Field label="Username" error={!!loginError}>
                  <input type="text" name="username" value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    autoFocus autoComplete="username" placeholder="username" />
                </Field>
                <Field label="Password" error={!!loginError}>
                  <input type="password" name="password" value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    autoComplete="current-password" placeholder="••••••••" />
                </Field>
                {loginError && <div style={{ fontSize: 13, color: "#b42318", marginBottom: 14, lineHeight: 1.45 }}>{loginError}</div>}
                {submitBtn("Sign in", false)}
              </form>

              <div style={{ marginTop: 20, fontSize: 13, color: "#6b6b6b" }}>
                New here?{" "}
                <button onClick={() => setShowRegister(true)}
                  style={{ background: "none", border: "none", color: "#2c5c94", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", padding: 0 }}>
                  Create an account with an invite code
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 21, fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.3px", marginBottom: 4 }}>Create your account</div>
              <div style={{ fontSize: 13, color: "#6b6b6b", marginBottom: 26, lineHeight: 1.5 }}>
                Enter the one-time invite code from your administrator. An admin approves the account before your first sign-in.
              </div>

              <form onSubmit={e => { e.preventDefault(); onRegister(); }}>
                <Field label="Invite code" error={!!regError && !regUsername}>
                  <input type="password" value={regInviteCode}
                    onChange={e => setRegInviteCode(e.target.value)}
                    autoFocus autoComplete="off" placeholder="ECS-•••••-••••" />
                </Field>
                <Field label="Your center" error={!!regError && !regCenter}>
                  <select value={regCenter} onChange={e => setRegCenter(e.target.value)}
                    style={{ color: regCenter ? "#1a1a1a" : "#9b9a97" }}>
                    <option value="">Select your center…</option>
                    {CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Username" error={!!regError}>
                  <input type="text" name="username" value={regUsername}
                    onChange={e => setRegUsername(e.target.value)}
                    autoComplete="username" placeholder="e.g. sarah_jones" />
                </Field>
                <Field label="Password" error={!!regError}>
                  <input type="password" name="new-password" value={regPassword}
                    onChange={e => setRegPassword(e.target.value)}
                    autoComplete="new-password" placeholder="At least 8 characters" />
                </Field>
                <Field label="Confirm password" error={!!regError}>
                  <input type="password" value={regConfirm}
                    onChange={e => setRegConfirm(e.target.value)}
                    autoComplete="new-password" placeholder="Re-enter your password" />
                </Field>
                {regError && <div style={{ fontSize: 13, color: "#b42318", marginBottom: 14, lineHeight: 1.45 }}>{regError}</div>}
                {submitBtn(regLoading ? "Creating account…" : "Create account", regLoading)}
              </form>

              <div style={{ marginTop: 20 }}>
                <button onClick={() => setShowRegister(false)}
                  style={{ background: "none", border: "none", color: "#6b6b6b", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", padding: 0 }}>
                  ← Back to sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
