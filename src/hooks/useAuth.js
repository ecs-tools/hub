import { useState, useEffect, useRef } from "react";
import { API_BASE } from "../config/api.js";

const INACTIVITY_TIMEOUT = 60 * 60 * 1000;   // managers: 1 hour
const ADMIN_TIMEOUT = 4 * 60 * 60 * 1000;    // admins: 4 hours

// All auth state and session lifecycle: the login/register forms, the
// JWT-cookie session check on mount, and the inactivity auto-logout.
// `onSessionEnd` fires after any logout (manual or inactivity) so the app
// can reset UI state like the active tab.
export default function useAuth(onSessionEnd) {
  // Auth state: null = "not yet checked", false = "not logged in", true = "logged in".
  // On mount we call GET /auth/me to see if the browser already has a valid JWT cookie.
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [userRole, setUserRole] = useState("staff");
  const [userPermissions, setUserPermissions] = useState({});

  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Registration form state
  const [showRegister, setShowRegister] = useState(false);
  const [regInviteCode, setRegInviteCode] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regCenter, setRegCenter] = useState("");
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  // Set after a successful registration: accounts now start "pending" and
  // can't sign in until an admin approves them, so instead of auto-login we
  // show this message on the login card.
  const [regSuccess, setRegSuccess] = useState("");

  // Keep the latest callback in a ref so the inactivity effect only re-runs
  // when auth state or role changes, not on every render of the caller.
  const onSessionEndRef = useRef(onSessionEnd);
  useEffect(() => {
    onSessionEndRef.current = onSessionEnd;
  });

  // On mount: ask the backend if we already have a valid session cookie.
  // If yes, we skip the login screen entirely — this is what keeps managers
  // logged in after Chrome saves their credentials.
  useEffect(() => {
    fetch(`${API_BASE}/auth/me`, { credentials: "include" })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.username) {
          setIsAuthenticated(true);
          setUserRole(data.role || "staff");
          setUserPermissions(data.permissions || {});
        } else {
          setIsAuthenticated(false);
        }
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  // Inactivity timeout: after 1 hour of no activity (4 for admins), hit
  // /auth/logout so the cookie is cleared server-side and the user is
  // returned to the login screen.
  useEffect(() => {
    if (!isAuthenticated) return;
    let lastActive = Date.now();
    const updateActivity = () => { lastActive = Date.now(); };
    const timeoutMs = userRole === "admin" ? ADMIN_TIMEOUT : INACTIVITY_TIMEOUT;
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, updateActivity));

    const interval = setInterval(async () => {
      if (Date.now() - lastActive > timeoutMs) {
        await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
        setIsAuthenticated(false);
        setUserRole("manager");
        onSessionEndRef.current?.();
      }
    }, 30000);

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [isAuthenticated, userRole]);

  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    setIsAuthenticated(false);
    setUserRole("manager");
    onSessionEndRef.current?.();
  };

  const handleLogin = async () => {
    setLoginError("");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        credentials: "include",   // tells browser to accept + store the cookie
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      if (res.ok) {
        // Login only returns role — fetch full profile (with permissions) from /auth/me
        const meRes = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        const meData = await meRes.json();
        setIsAuthenticated(true);
        setUserRole(meData.role || "staff");
        setUserPermissions(meData.permissions || {});
        setLoginUsername("");
        setLoginPassword("");
      } else {
        // Surface the server's reason — "awaiting approval" and "too many
        // attempts" need different words than a wrong password.
        const data = await res.json().catch(() => null);
        setLoginError(data?.detail || "Incorrect username or password. Try again.");
      }
    } catch {
      setLoginError("Could not reach the server. Check your connection.");
    }
  };

  const handleRegister = async () => {
    setRegError("");
    if (!regCenter) { setRegError("Please select your center."); return; }
    if (regPassword !== regConfirm) { setRegError("Passwords do not match."); return; }
    if (regPassword.length < 8) { setRegError("Password must be at least 8 characters."); return; }
    if (regUsername.trim().length < 3) { setRegError("Username must be at least 3 characters."); return; }
    setRegLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register-self`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: regInviteCode, username: regUsername.trim(), password: regPassword, center: regCenter }),
      });
      const data = await res.json();
      if (res.ok) {
        // No auto-login anymore: the account is pending admin approval.
        setRegSuccess(data.detail || "Account created. An administrator must approve it before you can sign in.");
        setShowRegister(false);
        setRegInviteCode(""); setRegUsername(""); setRegPassword("");
        setRegConfirm(""); setRegCenter("");
      } else {
        setRegError(data.detail || "Registration failed. Try again.");
      }
    } catch {
      setRegError("Could not reach the server. Check your connection.");
    }
    setRegLoading(false);
  };

  return {
    isAuthenticated, userRole, userPermissions,
    loginUsername, setLoginUsername, loginPassword, setLoginPassword,
    loginError, setLoginError,
    showRegister, setShowRegister,
    regInviteCode, setRegInviteCode, regUsername, setRegUsername,
    regPassword, setRegPassword, regConfirm, setRegConfirm,
    regCenter, setRegCenter, regError, setRegError, regLoading,
    regSuccess, setRegSuccess,
    handleLogin, handleRegister, handleLogout,
  };
}
