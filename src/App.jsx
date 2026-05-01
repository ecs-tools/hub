import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs";
import { CENTERS, CENTERS_WITH_ALL } from "./config/centers.js";
import { CENTER_RATES, ACUITY_RATIOS } from "./config/rates.js";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import FleetDashboard from "./components/FleetDashboard.jsx";
import UtilizationDashboard from "./components/UtilizationDashboard.jsx";
import HomeDashboard from "./components/HomeDashboard.jsx";
import BillingDashboard from "./components/BillingDashboard.jsx";

const MODULES = [
  { id: "tracker",     name: "Billing Error Detection", description: "Log and track weekly billing errors across transportation and attendance.", available: true },
  { id: "billing",     name: "Billing Overview",        description: "Weekly, monthly, and total billing metrics.", available: true },
  { id: "calculator",  name: "Saturday Calculator",     description: "Estimate staffing costs and profitability for Saturday programming.", available: false },
  { id: "fleet",       name: "Fleet Dashboard",         description: "Monitor vehicle maintenance status and service history.", available: false },
  { id: "utilization", name: "Utilization Tracker",     description: "Track PAWS funding utilization and alert when clients approach limits.", available: false },
];

const UPLOAD_PASSWORD = import.meta.env.VITE_UPLOAD_PASSWORD;
const SHEET_URL = "https://sheetdb.io/api/v1/t91e5epi82udj";
// Auth is now handled by the FastAPI backend (JWT cookie).
// VITE_APP_PASSWORD and VITE_ADMIN_PASSWORD are no longer used here.
const API_BASE = import.meta.env.VITE_API_BASE || "https://web-production-3b1f4.up.railway.app";
const INACTIVITY_TIMEOUT = 60 * 60 * 1000;
const ADMIN_TIMEOUT = 4 * 60 * 60 * 1000;
const LOGO = "data:image/png;base64,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";

const DEFAULT_DATA = [];

const STATUS_OPTIONS = [
  { value: "fixed", label: "Fixed", icon: "✅", color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  { value: "disputed", label: "Not an Error", icon: "❌", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  { value: "open", label: "Open", icon: "⚪", color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
];

const CATEGORY_COLORS = {
  "Not Found in Attendance": { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  "Arrival Before Pickup": { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
  "Bus/Check-in Time Mismatch": { bg: "#fefce8", text: "#854d0e", border: "#fef08a" },
  "Takehome Time Mismatch": { bg: "#f0f9ff", text: "#0c4a6e", border: "#bae6fd" },
  "Missing Pickup Time": { bg: "#fdf4ff", text: "#6b21a8", border: "#e9d5ff" },
  "Missing Goal Documentation": { bg: "#f0fdf4", text: "#14532d", border: "#bbf7d0" },
  "Invalid Time": { bg: "#faf5ff", text: "#4c1d95", border: "#ddd6fe" },
};

function makeKey(row, idx) {
  return `${row.location}-${row.name}-${row.date}-${idx}`;
}

function centerName(location) {
  return location ? location.split(" ")[0] : "";
}

function progressColor(pct) {
  if (pct <= 50) {
    const t = pct / 50;
    const r = Math.round(239 + (234 - 239) * t);
    const g = Math.round(68 + (179 - 68) * t);
    const b = Math.round(68 + (8 - 68) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (pct - 50) / 50;
    const r = Math.round(234 + (34 - 234) * t);
    const g = Math.round(179 + (197 - 179) * t);
    const b = Math.round(8 + (94 - 8) * t);
    return `rgb(${r},${g},${b})`;
  }
}

function parseExcelDate(val) {
  if (!val) return "";
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (typeof val === "string") {
    const parts = val.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[0].padStart(2,"0")}-${parts[1].padStart(2,"0")}`;
    }
    return val;
  }
  return String(val);
}

function categorizeReason(reason) {
  if (!reason) return "Other";
  const r = String(reason).toLowerCase();
  if (r.includes("not found in attendance") || r.includes("transported but not found")) return "Not Found in Attendance";
  if (r.includes("nmt without adult day")) return "Transport Violation";
  if (r.includes("units billed")) return "Invalid Units";
  if (r.includes("arrival time is before pickup") || r.includes("before pickup end")) return "Arrival Before Pickup";
  if (r.includes("bus ended") && r.includes("checked in")) return "Bus/Check-in Time Mismatch";
  if (r.includes("takehome") || r.includes("bus departure")) return "Takehome Time Mismatch";
  if (r.includes("pickup start missing") || r.includes("pickup end exists")) return "Missing Pickup Time";
  if (r.includes("goal documentation")) return "Missing Goal Documentation";
  if (r.includes("invalid")) return "Invalid Time";
  return "Other";
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginBottom: 4 }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", textAlign: "left", background: "white", border: `1.5px solid ${open ? "var(--steel)" : "var(--border)"}`,
          borderRadius: open ? "10px 10px 0 0" : 10, padding: "14px 18px", fontSize: 14, fontWeight: 600,
          color: "var(--navy)", cursor: "pointer", fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: open ? 0 : 4 }}>
        {question}
        <span style={{ transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none", color: "var(--muted)", fontSize: 12 }}>▼</span>
      </button>
      {open && (
        <div style={{ background: "#f8fbff", border: "1.5px solid var(--steel)", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "14px 18px", fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 4 }}>
          {answer}
        </div>
      )}
    </div>
  );
}

// Placeholder shown to manager-role users on modules that aren't ready yet.
// Per spec: matches navy/steel palette, includes a construction icon, module
// name as heading, the standardized "← Back to Home" button, and short copy.
function UnderConstruction({ moduleName, onBack }) {
  return (
    <div className="page-anim" style={{ padding: "32px 40px", maxWidth: 760, margin: "0 auto" }}>
      <button
        className="back-btn"
        onClick={onBack}
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "5px 12px",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-2)",
          cursor: "pointer",
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 24,
        }}
      >
        ← Back to Home
      </button>
      <div style={{
        background: "white",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "56px 48px",
        textAlign: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }} aria-hidden="true">🚧</div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--steel)", marginBottom: 8 }}>
          Coming Soon
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--navy)", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
          {moduleName}
        </h2>
        <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 14, fontWeight: 500 }}>
          This module is coming soon.
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
          We're working on making this available. Check back soon or contact your administrator.
        </div>
      </div>
    </div>
  );
}

// ── Admin Panel Component ─────────────────────────────────────────────────────
function AdminPanel({ apiBase, modules }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  const fetchUsers = () => {
    setLoading(true);
    fetch(`${apiBase}/admin/users`, { credentials: "include" })
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { showToast("Failed to load users", false); setLoading(false); });
  };

  useEffect(() => { fetchUsers(); }, []);

  const setRole = async (username, role) => {
    setSaving(s => ({ ...s, [username]: true }));
    const res = await fetch(`${apiBase}/admin/users/${username}/role`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(prev => prev.map(u => u.username === username
        ? { ...u, role: data.role, permissions: data.permissions } : u));
      showToast(`${username} is now ${role}`);
    } else { showToast("Failed to update role", false); }
    setSaving(s => ({ ...s, [username]: false }));
  };

  const togglePermission = async (username, moduleId, current) => {
    setSaving(s => ({ ...s, [`${username}-${moduleId}`]: true }));
    const res = await fetch(`${apiBase}/admin/users/${username}/permissions`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: { [moduleId]: !current } }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(prev => prev.map(u => u.username === username
        ? { ...u, permissions: data.permissions } : u));
    } else { showToast("Failed to update permission", false); }
    setSaving(s => ({ ...s, [`${username}-${moduleId}`]: false }));
  };

  const deleteUser = async (username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    const res = await fetch(`${apiBase}/admin/users/${username}`, {
      method: "DELETE", credentials: "include",
    });
    if (res.ok) { setUsers(prev => prev.filter(u => u.username !== username)); showToast(`${username} deleted`); }
    else { showToast("Failed to delete user", false); }
  };

  const ROLE_COLORS = {
    admin:   { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
    manager: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
    staff:   { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  };

  return (
    <div className="page-anim" style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.ok ? "#0f172a" : "#dc2626", color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)", margin: "0 0 4px", letterSpacing: "-0.3px" }}>Admin Panel</h1>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>Manage user accounts, roles, and module access. Changes save instantly.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { label: "Total Users", value: users.length },
          { label: "Admins", value: users.filter(u => u.role === "admin").length },
          { label: "Managers", value: users.filter(u => u.role === "manager").length },
          { label: "Staff", value: users.filter(u => u.role === "staff").length },
        ].map(s => (
          <div key={s.label} style={{ background: "white", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 20px", minWidth: 110 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ color: "var(--text-2)", padding: 40, textAlign: "center" }}>Loading users…</div>
      ) : (
        <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.9fr 1fr auto", gap: 12, padding: "11px 20px", background: "var(--bg-soft)", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--text-2)" }}>
            <span>User</span><span>Role</span><span>Center</span><span>Module Access</span><span></span>
          </div>

          {users.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-2)", fontSize: 13 }}>No users found.</div>
          )}

          {users.map((user, idx) => {
            const rc = ROLE_COLORS[user.role] || ROLE_COLORS.staff;
            const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : "—";
            return (
              <div key={user.username} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.9fr 1fr auto", gap: 12, padding: "14px 20px", borderBottom: idx < users.length - 1 ? "1px solid var(--border)" : "none", alignItems: "start" }}>

                {/* User info */}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--navy)" }}>{user.username}</div>
                  <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>Joined {joinDate}</div>
                </div>

                {/* Role selector */}
                <div>
                  <select
                    value={user.role}
                    onChange={e => setRole(user.username, e.target.value)}
                    disabled={saving[user.username]}
                    style={{ fontSize: 12, fontWeight: 600, border: `1.5px solid ${rc.border}`, borderRadius: 6, padding: "4px 8px", background: rc.bg, color: rc.text, cursor: "pointer", outline: "none", width: "100%" }}
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Center */}
                <div style={{ fontSize: 13, color: "var(--text-1)", paddingTop: 4 }}>
                  {user.center || <span style={{ color: "var(--text-3)" }}>—</span>}
                </div>

                {/* Module permission toggles */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {modules.map(mod => {
                    const on = user.permissions[mod.id] === true;
                    const key = `${user.username}-${mod.id}`;
                    return (
                      <label key={mod.id} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12 }}>
                        <div
                          onClick={() => togglePermission(user.username, mod.id, on)}
                          style={{
                            width: 32, height: 18, borderRadius: 9, background: on ? "#3b82f6" : "#d1d5db",
                            position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
                            opacity: saving[key] ? 0.5 : 1,
                          }}
                        >
                          <div style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                        </div>
                        <span style={{ color: on ? "var(--text-1)" : "var(--text-3)" }}>{mod.name}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Delete */}
                <div style={{ paddingTop: 2 }}>
                  <button
                    onClick={() => deleteUser(user.username)}
                    title="Delete user"
                    style={{ background: "none", border: "1px solid #fca5a5", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}
                    onMouseOver={e => { e.currentTarget.style.background = "#fef2f2"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "none"; }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function App() {
  // Auth state: null = "not yet checked", false = "not logged in", true = "logged in".
  // On mount we call GET /auth/me to see if the browser already has a valid JWT cookie.
  const [isAuthenticated, setIsAuthenticated] = useState(null);
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

  const ECS_CENTERS = [
    "Avon", "Beavercreek", "Eastgate", "Englewood", "Fairfield",
    "Independence", "Lorain", "Parma", "Springboro", "Westwood", "Overhead",
  ];
  const [rawData, setRawData] = useState(DEFAULT_DATA);
  const [selectedCenter, setSelectedCenter] = useState("All Centers");
  const [selectedCategory, setSelectedCategory] = useState("All Types");
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const [flags, setFlags] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [noteModal, setNoteModal] = useState(null); // { key, note }
  const [activeTab, setActiveTab] = useState("home");
  const [userRole, setUserRole] = useState("staff");
  const [userPermissions, setUserPermissions] = useState({});

  // Saturday Calculator state
  const [calcCenter, setCalcCenter] = useState("");
  const [calcCounts, setCalcCounts] = useState({ A: "", B: "", C: "", CP: "" });
  const [calcExtra, setCalcExtra] = useState(0);
  const [calcSalary, setCalcSalary] = useState(0);

  const CALC_OVERHEAD = 250;
  const CALC_MIN_PROFIT = 500;
  const CALC_THRESHOLD = 750;
  const CALC_STAFF_COST = 17 * 7;
  const calcRates = calcCenter ? CENTER_RATES[calcCenter] : null;
  const calcResult = (() => {
    if (!calcRates) return null;
    const cA = parseInt(calcCounts.A) || 0;
    const cB = parseInt(calcCounts.B) || 0;
    const cC = parseInt(calcCounts.C) || 0;
    const cCP = parseInt(calcCounts.CP) || 0;
    const total = cA + cB + cC + cCP;
    if (total === 0) return null;
    const minStaff = Math.ceil(cA / ACUITY_RATIOS.A) + Math.ceil(cB / ACUITY_RATIOS.B) + Math.ceil(cC / ACUITY_RATIOS.C) + cCP;
    const totalStaff = minStaff + (parseInt(calcExtra) || 0);
    const salary = parseInt(calcSalary) || 0;
    const hourlyStaff = Math.max(0, totalStaff - salary);
    const revenue = cA * calcRates.A + cB * calcRates.B + (cC + cCP) * calcRates.C;
    const staffCostTotal = hourlyStaff * CALC_STAFF_COST;
    const totalExp = CALC_OVERHEAD + staffCostTotal;
    const profit = revenue - totalExp;
    const viable = profit >= CALC_MIN_PROFIT;
    const pct = Math.min(100, Math.max(0, (profit / CALC_THRESHOLD) * 100));
    return { cA, cB, cC, cCP, total, minStaff, totalStaff, salary, hourlyStaff, revenue, staffCostTotal, totalExp, profit, viable, pct };
  })();
  const [showUpload, setShowUpload] = useState(false);
  const [uploadPassword, setUploadPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [passwordOk, setPasswordOk] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const [sheetDbBannerVisible, setSheetDbBannerVisible] = useState(false);

  const locations = ["All Centers", ...Array.from(new Set(rawData.map(r => centerName(r.location)))).filter(Boolean).sort()];
  const categories = ["All Types", ...Array.from(new Set(rawData.map(r => r.category))).filter(Boolean).sort()];

  useEffect(() => {
    async function load() {
      // Load statuses and notes
      try {
        const res = await fetch(SHEET_URL);
        const rows = await res.json();
        if (Array.isArray(rows)) {
          const s = {}, n = {}, f = {};
          rows.forEach(row => {
            if (row.key === "__meta__") {
              if (row.updatedAt) setLastUpdated(row.updatedAt);
            } else if (row.key) {
              if (row.status) s[row.key] = row.status;
              if (row.note) n[row.key] = row.note;
              if (row.flag === "true") f[row.key] = true;
            }
          });
          setStatuses(s);
          setNotes(n);
          setFlags(f);
        }
      } catch { /* ignore */ }

      // Load error data from SheetDB — fall back to hardcoded if empty
      try {
        const res = await fetch(SHEET_URL + "?sheet=error_data");
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0) {
          setRawData(rows.map(r => ({
            name: r.name || "",
            location: r.location || "",
            date: r.date || "",
            reason: r.reason || "",
            category: r.category || "",
          })));
        }
      } catch { /* ignore */ }

      setLoaded(true);
    }
    load();
  }, []);

  // Inactivity timeout: after 1 hour of no activity, hit /auth/logout so the
  // cookie is cleared server-side and the user is returned to the login screen.
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
        setActiveTab("home");
      }
    }, 30000);

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [isAuthenticated, userRole]);

  // SheetDB health check — fire-and-forget on mount
  useEffect(() => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    fetch(SHEET_URL, { signal: controller.signal })
      .then(res => {
        clearTimeout(tid);
        if (!res.ok) setSheetDbBannerVisible(true);
      })
      .catch(() => {
        clearTimeout(tid);
        setSheetDbBannerVisible(true);
      });
  }, []);

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

  const handleLogout = async () => {
    await fetch(`${API_BASE}/auth/logout`, { method: "POST", credentials: "include" });
    setIsAuthenticated(false);
    setUserRole("manager");
    setActiveTab("home");
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
        setLoginError("Incorrect username or password. Try again.");
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
        setIsAuthenticated(true);
        setUserRole(data.role || "staff");
        setUserPermissions(data.permissions || {});
        setShowRegister(false);
      } else {
        setRegError(data.detail || "Registration failed. Try again.");
      }
    } catch {
      setRegError("Could not reach the server. Check your connection.");
    }
    setRegLoading(false);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handlePasswordCheck = () => {
    if (uploadPassword === UPLOAD_PASSWORD) {
      setPasswordOk(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    let deleteHappened = false;
    try {
      const { read, utils } = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
      const buf = await file.arrayBuffer();
      const wb = read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = utils.sheet_to_json(ws, { defval: "" });

      const newData = rows.map(row => {
        const keys = Object.keys(row);
        const nameKey = keys.find(k => /name/i.test(k)) || keys[0];
        const locKey = keys.find(k => /location|center|site/i.test(k)) || keys[1];
        const dateKey = keys.find(k => /date/i.test(k)) || keys[2];
        const reasonKey = keys.find(k => /reason|error|message|description/i.test(k)) || keys[3];
        const reason = String(row[reasonKey] || "");
        return {
          name: String(row[nameKey] || "").trim(),
          location: String(row[locKey] || "").trim(),
          date: parseExcelDate(row[dateKey]),
          reason,
          category: categorizeReason(reason),
        };
      }).filter(r => r.name && r.location);

      if (newData.length === 0) {
        showToast("No data found in file — check column names");
        setUploading(false);
        return;
      }

      const batchSize = 50;

      // Write first batch as a connectivity test — existing data is NOT touched yet.
      // If this fails, the user can safely re-try without any data loss.
      const firstRes = await fetch(SHEET_URL + "?sheet=error_data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: newData.slice(0, batchSize) }),
      });
      if (!firstRes.ok) {
        const err = await firstRes.text();
        console.error("SheetDB write failed: batch 0", err);
        showToast("Warning: data may not have saved — check console");
        setUploading(false);
        return;
      }

      // First batch confirmed live — now safe to clear the old data.
      // (The test write above is removed along with the old data.)
      await fetch(SHEET_URL + "/all?sheet=error_data", { method: "DELETE" });
      deleteHappened = true;

      // Write all batches (batch 0 included again since DELETE removed it).
      for (let i = 0; i < newData.length; i += batchSize) {
        const batch = newData.slice(i, i + batchSize);
        const res = await fetch(SHEET_URL + "?sheet=error_data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: batch }),
        });
        if (!res.ok) {
          const err = await res.text();
          console.error(`SheetDB write failed: batch ${Math.floor(i / batchSize)}`, err);
          showToast("Upload failed mid-way — your error data may be incomplete. Please re-upload the file.");
          setUploading(false);
          return;
        }
      }

      // All batches succeeded — clear statuses/notes and write __meta__.
      await fetch(SHEET_URL + "/all", { method: "DELETE" });
      const uploadedAt = new Date().toISOString();
      await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { key: "__meta__", updatedAt: uploadedAt } }),
      });
      setLastUpdated(uploadedAt);
      setStatuses({});
      setNotes({});
      setFlags({});
      setRawData(newData);
      setSelectedCenter("All Centers");
      setSelectedCategory("All Types");
      setShowUpload(false);
      setPasswordOk(false);
      setUploadPassword("");
      showToast(`✅ Loaded ${newData.length} errors from ${file.name}`);
    } catch (err) {
      console.error("Upload error:", err);
      if (deleteHappened) {
        showToast("Upload failed mid-way — your error data may be incomplete. Please re-upload the file.");
      } else {
        showToast("Error reading file — make sure it's a valid .xlsx");
      }
    }
    setUploading(false);
  };

  const saveStatus = useCallback(async (key, value) => {
    setStatuses(prev => ({ ...prev, [key]: value }));
    setSaving(true);
    try {
      const checkRes = await fetch(`${SHEET_URL}/search?key=${encodeURIComponent(key)}`);
      const checkData = await checkRes.json();
      if (Array.isArray(checkData) && checkData.length > 0) {
        await fetch(`${SHEET_URL}/key/${encodeURIComponent(key)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { status: value, note: notes[key] || "", flag: String(flags[key] || false) } }),
        });
      } else {
        await fetch(SHEET_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { key, status: value, note: notes[key] || "", flag: "false", updatedAt: new Date().toISOString() } }),
        });
      }
      showToast("Saved");
    } catch { showToast("Save failed"); }
    setSaving(false);
  }, [notes, flags]);

  const saveNote = useCallback(async (key, value) => {
    setNotes(prev => ({ ...prev, [key]: value }));
    try {
      const checkRes = await fetch(`${SHEET_URL}/search?key=${encodeURIComponent(key)}`);
      const checkData = await checkRes.json();
      if (Array.isArray(checkData) && checkData.length > 0) {
        await fetch(`${SHEET_URL}/key/${encodeURIComponent(key)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { note: value, status: statuses[key] || "open", flag: String(flags[key] || false) } }),
        });
      } else {
        await fetch(SHEET_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { key, status: statuses[key] || "open", note: value, flag: "false", updatedAt: new Date().toISOString() } }),
        });
      }
    } catch { /* ignore */ }
    showToast("Note saved");
  }, [statuses, flags]);

  const saveFlag = useCallback(async (key) => {
    const newFlag = !(flags[key] ?? false);
    setFlags(prev => ({ ...prev, [key]: newFlag }));
    try {
      const checkRes = await fetch(`${SHEET_URL}/search?key=${encodeURIComponent(key)}`);
      const checkData = await checkRes.json();
      if (Array.isArray(checkData) && checkData.length > 0) {
        await fetch(`${SHEET_URL}/key/${encodeURIComponent(key)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { flag: String(newFlag), status: statuses[key] || "open", note: notes[key] || "" } }),
        });
      } else {
        await fetch(SHEET_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { key, status: statuses[key] || "open", note: notes[key] || "", flag: String(newFlag), updatedAt: new Date().toISOString() } }),
        });
      }
    } catch { /* ignore */ }
  }, [flags, statuses, notes]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const effStatus = (key) => statuses[key] ?? "open";
  const effFlag = (key) => flags[key] ?? false;

  const filtered = rawData.filter(row => {
    const locMatch = selectedCenter === "All Centers" || centerName(row.location) === selectedCenter;
    const catMatch = selectedCategory === "All Types" || row.category === selectedCategory;
    return locMatch && catMatch;
  }).sort((a, b) => {
    const aKey = makeKey(a, rawData.indexOf(a));
    const bKey = makeKey(b, rawData.indexOf(b));
    const aResolved = effStatus(aKey) !== "open";
    const bResolved = effStatus(bKey) !== "open";
    if (aResolved !== bResolved) return aResolved ? 1 : -1;
    if (!sortField) return 0;
    let aVal = a[sortField], bVal = b[sortField];
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const stats = {
    total: filtered.length,
    fixed: filtered.filter(r => effStatus(makeKey(r, rawData.indexOf(r))) === "fixed").length,
    disputed: filtered.filter(r => effStatus(makeKey(r, rawData.indexOf(r))) === "disputed").length,
    open: filtered.filter(r => effStatus(makeKey(r, rawData.indexOf(r))) === "open").length,
  };

  const centerStats = useMemo(() => {
    return CENTERS.map(center => {
      const rows = rawData.filter(r => centerName(r.location) === center);
      const total = rows.length;
      const resolved = rows.filter(r => {
        const s = statuses[makeKey(r, rawData.indexOf(r))] ?? "open";
        return s === "fixed" || s === "disputed";
      }).length;
      const pct = total > 0 ? Math.round((resolved / total) * 100) : 100;
      return { center, total, resolved, pct, noErrors: total === 0 };
    });
  }, [rawData, statuses]);

  const formatDate = (d) => {
    if (!d) return "";
    const parts = d.split("-");
    if (parts.length === 3 && parts[0].length === 4) return `${parts[1]}/${parts[2]}/${parts[0]}`;
    return d;
  };


  // Still checking session — show nothing to avoid flash of login screen
  if (isAuthenticated === null) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1a3a6b 55%, #0f172a 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1a3a6b 55%, #0f172a 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", position: "relative", overflow: "hidden" }}>
        {/* Decorative background blobs */}
        <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "rgba(59,130,246,0.07)", top: -150, right: -150, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 350, height: 350, borderRadius: "50%", background: "rgba(99,179,237,0.06)", bottom: -100, left: -100, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: "rgba(147,197,253,0.05)", top: "38%", left: "12%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "rgba(59,130,246,0.06)", bottom: "25%", right: "14%", pointerEvents: "none" }} />

        {/* Card */}
        <div style={{ background: "white", borderRadius: 20, border: "1px solid rgba(226,232,240,0.8)", padding: "44px 40px 36px", width: "100%", maxWidth: 420, boxShadow: "0 30px 80px rgba(0,0,0,0.45)", textAlign: "center", position: "relative", zIndex: 1 }}>

          {/* Logo + branding */}
          <img src={LOGO} alt="ECS" style={{ width: 68, height: 68, borderRadius: 16, marginBottom: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }} />
          <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px", marginBottom: 4 }}>ECS Hub</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 28 }}>Empowered Community Services</div>

          {!showRegister ? (
            <>
              {/*
                autocomplete="username" and autocomplete="current-password" are the
                magic attributes that tell Chrome/Edge/Safari to offer to save these
                credentials and autofill them on the next visit.
              */}
              <form onSubmit={e => { e.preventDefault(); handleLogin(); }} style={{ textAlign: "left" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Username</label>
                <input
                  type="text"
                  name="username"
                  value={loginUsername}
                  onChange={e => { setLoginUsername(e.target.value); setLoginError(""); }}
                  placeholder="Enter your username"
                  autoFocus
                  autoComplete="username"
                  style={{ width: "100%", border: `1.5px solid ${loginError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 12, background: loginError ? "#fff8f8" : "#f8fafc", outline: "none", boxSizing: "border-box" }}
                />
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Password</label>
                <input
                  type="password"
                  name="password"
                  value={loginPassword}
                  onChange={e => { setLoginPassword(e.target.value); setLoginError(""); }}
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
                  onClick={() => { setShowRegister(true); setLoginError(""); }}
                  style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}
                >
                  First time? Create your account
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Create Your Account</div>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>Enter the invite code from your manager, then pick a username and password.</div>
              <form onSubmit={e => { e.preventDefault(); handleRegister(); }} style={{ textAlign: "left" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Invite Code</label>
                <input
                  type="password"
                  value={regInviteCode}
                  onChange={e => { setRegInviteCode(e.target.value); setRegError(""); }}
                  placeholder="Enter invite code"
                  autoFocus
                  autoComplete="off"
                  style={{ width: "100%", border: `1.5px solid ${regError && !regUsername ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 12, background: "#f8fafc", outline: "none", boxSizing: "border-box" }}
                />
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Your Center</label>
                <select
                  value={regCenter}
                  onChange={e => { setRegCenter(e.target.value); setRegError(""); }}
                  style={{ width: "100%", border: `1.5px solid ${regError && !regCenter ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 12, background: "#f8fafc", outline: "none", boxSizing: "border-box", color: regCenter ? "#1e293b" : "#94a3b8" }}
                >
                  <option value="">Select your center...</option>
                  {ECS_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Choose a Username</label>
                <input
                  type="text"
                  name="username"
                  value={regUsername}
                  onChange={e => { setRegUsername(e.target.value); setRegError(""); }}
                  placeholder="e.g. sarah_jones"
                  autoComplete="username"
                  style={{ width: "100%", border: `1.5px solid ${regError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 12, background: "#f8fafc", outline: "none", boxSizing: "border-box" }}
                />
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Choose a Password</label>
                <input
                  type="password"
                  name="new-password"
                  value={regPassword}
                  onChange={e => { setRegPassword(e.target.value); setRegError(""); }}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  style={{ width: "100%", border: `1.5px solid ${regError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 12, background: "#f8fafc", outline: "none", boxSizing: "border-box" }}
                />
                <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 5 }}>Confirm Password</label>
                <input
                  type="password"
                  value={regConfirm}
                  onChange={e => { setRegConfirm(e.target.value); setRegError(""); }}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  style={{ width: "100%", border: `1.5px solid ${regError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, marginBottom: 10, background: "#f8fafc", outline: "none", boxSizing: "border-box" }}
                />
                {regError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10 }}>{regError}</div>}
                <button
                  type="submit"
                  disabled={regLoading}
                  style={{ width: "100%", background: regLoading ? "#93c5fd" : "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "white", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: regLoading ? "default" : "pointer", boxShadow: "0 4px 14px rgba(59,130,246,0.4)", marginTop: 4 }}
                >
                  {regLoading ? "Creating account…" : "Create Account"}
                </button>
              </form>
              <div style={{ marginTop: 16, textAlign: "center" }}>
                <button
                  onClick={() => { setShowRegister(false); setRegError(""); setRegInviteCode(""); setRegUsername(""); setRegPassword(""); setRegConfirm(""); }}
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

  const MODULE_IDS = MODULES.map(m => m.id);

  // Manager role can only access the tracker module. Any other module tab
  // shows the Under Construction placeholder. Workspace tabs (faq, modules,
  // announcements, reports) remain accessible so sidebar nav still works.
  // A module is accessible if: user is admin, OR their permissions explicitly allow it.
  const canAccessModule = (moduleId) => {
    if (userRole === "admin") return true;
    return userPermissions[moduleId] === true;
  };

  const showUnderConstruction =
    MODULE_IDS.includes(activeTab) &&
    !canAccessModule(activeTab);
  const underConstructionModuleName =
    (MODULES.find(m => m.id === activeTab) || {}).name || "This module";

  const sidebarActive = (tab) => {
    if (tab === "modules") return MODULE_IDS.includes(activeTab) || activeTab === "modules";
    if (tab === "faq") return activeTab === "faq";
    return activeTab === tab;
  };
  const PAGE_LABEL = { home: "Home", modules: "Modules", tracker: "Billing Error Detection", billing: "Billing Overview", calculator: "Saturday Calculator", fleet: "Fleet Dashboard", utilization: "Utilization Tracker", faq: "Help Center", announcements: "Announcements", reports: "Reports" };
  const breadcrumbs = () => {
    if (activeTab === "home") return [{ label: "Home" }];
    if (activeTab === "modules") return [{ label: "Home", tab: "home" }, { label: "Modules" }];
    if (MODULE_IDS.includes(activeTab)) return [{ label: "Home", tab: "home" }, { label: "Modules", tab: "modules" }, { label: PAGE_LABEL[activeTab] || activeTab }];
    return [{ label: "Home", tab: "home" }, { label: PAGE_LABEL[activeTab] || activeTab }];
  };

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "var(--bg)", minHeight: "100vh", color: "var(--text-1)", display: "flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; }
        :root {
          --bg: #ffffff;
          --bg-soft: #f7f7f5;
          --bg-hover: #f1f1ef;
          --border: #e9e9e7;
          --text-1: #1a1a1a;
          --text-2: #6b6b6b;
          --text-3: #9b9a97;
          --accent: #2383e2;
          --accent-soft: #e8f1fc;
          --navy: #1a2d4d;
          --steel: #4a7ab5;
          --powder: #8fb3d4;
          --light: #d6e8f5;
          --muted: #6b6b6b;
          --sidebar-w: 220px;
          --topbar-h: 52px;
        }
        select:focus, button:focus, input:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 2px; }
        .error-row:hover { background: var(--bg-hover) !important; }
        .status-btn { cursor: pointer; border: 1px solid; border-radius: 4px; padding: 3px 10px; font-size: 12px; font-weight: 500; transition: opacity 0.1s; white-space: nowrap; font-family: inherit; }
        .status-btn:hover { opacity: 0.8; }
        .status-btn.active { box-shadow: 0 0 0 2px var(--accent); }
        .faq-a { display: none; }
        .faq-a.open { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .page-anim { animation: fadeIn 0.15s ease; }
        .back-btn:hover { background: var(--bg-soft) !important; border-color: var(--border) !important; }
        .nav-item { display: block; width: 100%; text-align: left; border: none; border-radius: 6px; padding: 8px 12px; margin-bottom: 1px; font-size: 13px; font-family: inherit; cursor: pointer; transition: background 0.1s, color 0.1s; background: none; color: rgba(255,255,255,0.65); font-weight: 400; }
        .nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .nav-item.active { background: rgba(255,255,255,0.14); color: #fff; font-weight: 600; }
        .mod-card { border: 1px solid var(--border); border-radius: 10px; padding: 20px 22px; background: var(--bg); position: relative; cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s; }
        .mod-card:hover { box-shadow: 0 2px 14px rgba(26,45,77,0.1); border-color: var(--powder); }
        .mod-card.locked { cursor: default; opacity: 0.75; }
        .mod-card.locked:hover { box-shadow: none; border-color: var(--border); }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d4d4d2; border-radius: 3px; }
      `}</style>

      {/* LEFT SIDEBAR */}
      <nav style={{ width: "var(--sidebar-w)", flexShrink: 0, background: "var(--navy)", minHeight: "100vh", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>

        {/* Brand */}
        <button onClick={() => setActiveTab("home")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: "18px 16px 16px", width: "100%", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            <img src={LOGO} alt="ECS" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.2px", lineHeight: 1.2 }}>Empowered IS</span>
        </button>

        {/* Nav items */}
        <div style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          <button className={`nav-item${sidebarActive("home") ? " active" : ""}`} onClick={() => setActiveTab("home")}>Home</button>
          <button className={`nav-item${sidebarActive("modules") ? " active" : ""}`} onClick={() => setActiveTab("modules")}>Modules</button>

          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(255,255,255,0.3)", padding: "16px 12px 6px" }}>Workspace</div>
          <button className={`nav-item${sidebarActive("announcements") ? " active" : ""}`} onClick={() => setActiveTab("announcements")}>Announcements</button>
          <button className={`nav-item${sidebarActive("faq") ? " active" : ""}`} onClick={() => setActiveTab("faq")}>Help Center</button>
          <button className={`nav-item${sidebarActive("reports") ? " active" : ""}`} onClick={() => setActiveTab("reports")}>Reports</button>

          {userRole === "admin" && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(255,255,255,0.3)", padding: "16px 12px 6px" }}>Admin</div>
              <button className={`nav-item${sidebarActive("admin-panel") ? " active" : ""}`} onClick={() => setActiveTab("admin-panel")}>Admin Panel</button>
            </>
          )}
        </div>

        {/* User card */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "14px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--steel)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{userRole === "admin" ? "A" : "M"}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{userRole === "admin" ? "Admin" : "Manager"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.3, marginTop: 1 }}>ECS Staff</div>
            </div>
            <button onClick={handleLogout} title="Log out" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: 16, padding: 4, lineHeight: 1, display: "flex", alignItems: "center" }}
              onMouseOver={e => e.currentTarget.style.color = "#fff"} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}>
              &#x2192;
            </button>
          </div>
        </div>

      </nav>

      {/* RIGHT COLUMN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: "100vh" }}>

        {/* TOP BAR */}
        <header style={{ height: "var(--topbar-h)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "var(--bg)", position: "sticky", top: 0, zIndex: 100, flexShrink: 0 }}>
          {/* Breadcrumbs */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, minWidth: 0 }}>
            {breadcrumbs().map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ color: "var(--text-3)", fontSize: 12 }}>/</span>}
                {crumb.tab ? (
                  <button onClick={() => setActiveTab(crumb.tab)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13, color: "var(--text-3)", fontFamily: "inherit" }}
                    onMouseOver={e => e.currentTarget.style.color = "var(--text-1)"} onMouseOut={e => e.currentTarget.style.color = "var(--text-3)"}>
                    {crumb.label}
                  </button>
                ) : (
                  <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
          {/* Right side: saving indicator + search shell */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {saving && <span style={{ fontSize: 12, color: "var(--text-3)" }}>Saving…</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 12px" }}>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>&#x2315;</span>
              <input placeholder="Search…" style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "var(--text-1)", fontFamily: "inherit", width: 160 }} />
            </div>
          </div>
        </header>

      <main style={{ flex: 1, minWidth: 0 }}>

      {/* SheetDB health-check banner */}
      {sheetDbBannerVisible && (
        <div style={{
          background: "#fef9c3",
          border: "1.5px solid #fde68a",
          color: "#92400e",
          padding: "10px 24px",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}>
          <span>Data service may be unavailable — some information may not load correctly. If this persists, contact Brock.</span>
          <button
            onClick={() => setSheetDbBannerVisible(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#92400e",
              fontSize: 16,
              fontWeight: 700,
              padding: "0 4px",
              lineHeight: 1,
              flexShrink: 0,
            }}
            aria-label="Dismiss"
          >✕</button>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "white", borderRadius: 16, padding: 32, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Upload New Week</div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>This will replace all current data and reset all statuses.</div>
            {!passwordOk ? (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Enter upload password</label>
                <input
                  type="password"
                  value={uploadPassword}
                  onChange={e => { setUploadPassword(e.target.value); setPasswordError(false); }}
                  onKeyDown={e => e.key === "Enter" && handlePasswordCheck()}
                  placeholder="Password"
                  style={{ width: "100%", border: `1.5px solid ${passwordError ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, marginBottom: 6 }}
                />
                {passwordError && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>Incorrect password</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button onClick={handlePasswordCheck} style={{ flex: 1, background: "#3b82f6", color: "white", border: "none", borderRadius: 8, padding: "9px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Continue</button>
                  <button onClick={() => setShowUpload(false)} style={{ flex: 1, background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "9px", fontSize: 14, cursor: "pointer" }}>Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ border: "2px dashed #cbd5e1", borderRadius: 12, padding: 32, textAlign: "center", cursor: "pointer", background: "#f8fafc" }}
                  onClick={() => fileRef.current?.click()}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Click to select your Excel file</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>.xlsx files only</div>
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFileUpload} />
                </div>
                {uploading && <div style={{ textAlign: "center", marginTop: 16, color: "#3b82f6", fontSize: 14 }}>Processing file…</div>}
                <button onClick={() => setShowUpload(false)} style={{ width: "100%", marginTop: 12, background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "9px", fontSize: 14, cursor: "pointer" }}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ADMIN PANEL */}
      {activeTab === "admin-panel" && userRole === "admin" && (
        <AdminPanel apiBase={API_BASE} modules={MODULES} />
      )}

      {/* HOME PAGE */}
      {activeTab === "home" && (
        <div className="page-anim">
          <div style={{ borderBottom: "1px solid var(--border)", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-1)", margin: 0, letterSpacing: "-0.3px" }}>Overview</h1>
              <p style={{ fontSize: 13, color: "var(--text-2)", margin: "3px 0 0" }}>Live snapshot across billing, funding, and fleet.</p>
            </div>
            <button onClick={() => setActiveTab("modules")} style={{ background: "var(--navy)", color: "#fff", border: "none", borderRadius: 7, padding: "8px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              All Modules
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <HomeDashboard rawData={rawData} statuses={statuses} onNavigate={setActiveTab} />
            {userRole !== "admin" && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.82)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 20, minHeight: 300 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--steel)", marginBottom: 10 }}>Coming Soon</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.5px" }}>Under Construction</div>
                <div style={{ fontSize: 14, color: "var(--text-2)", marginTop: 10, maxWidth: 320, textAlign: "center", lineHeight: 1.6 }}>The overview dashboard is being prepared. Check back soon.</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODULES PAGE */}
      {activeTab === "modules" && (
        <div className="page-anim" style={{ padding: "40px 44px" }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "0 0 8px" }}>Platform</p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.4px", margin: "0 0 6px", lineHeight: 1.2 }}>Modules</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 32px", lineHeight: 1.5 }}>Tools and dashboards available to your team.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {MODULES.map(m => {
              const canAccess = canAccessModule(m.id);
              return (
              <div key={m.id}
                className={`mod-card${canAccess ? "" : " locked"}`}
                onClick={() => canAccess && setActiveTab(m.id)}
              >
                {canAccess ? (
                  <span style={{ position: "absolute", top: 14, right: 14, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: 4 }}>Active</span>
                ) : (
                  <span style={{ position: "absolute", top: 14, right: 14, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", background: "var(--bg-soft)", color: "var(--text-3)", padding: "3px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>Locked</span>
                )}
                <div style={{ width: 36, height: 36, borderRadius: 8, background: canAccess ? "var(--navy)" : "var(--bg-soft)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: canAccess ? "rgba(143,179,212,0.7)" : "var(--border)" }} />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 5 }}>{m.name}</div>
                <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{m.description}</div>
                {canAccess && (
                  <div style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: "var(--navy)", letterSpacing: "-0.1px" }}>Open &rarr;</div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ANNOUNCEMENTS PAGE */}
      {activeTab === "announcements" && (
        <div className="page-anim" style={{ padding: "52px 44px", maxWidth: 640 }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "0 0 8px" }}>Workspace</p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.4px", margin: "0 0 6px" }}>Announcements</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 32px" }}>Team updates and notices will appear here.</p>
          <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>No announcements yet.</div>
          </div>
        </div>
      )}

      {/* REPORTS PAGE */}
      {activeTab === "reports" && (
        <div className="page-anim" style={{ padding: "52px 44px", maxWidth: 640 }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "0 0 8px" }}>Workspace</p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.4px", margin: "0 0 6px" }}>Reports</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 32px" }}>Scheduled and on-demand reports will be available here.</p>
          <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>Coming soon.</div>
          </div>
        </div>
      )}

      {/* FAQ PAGE */}
      {activeTab === "faq" && (
        <div className="page-anim" style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.5px", marginBottom: 6 }}>Help & FAQ</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>Everything you need to know about using ECS Hub.</div>
          </div>

          {[
            { section: "Error Tracker", items: [
              { q: "What do the error statuses mean?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}><strong>Open</strong> — Not yet reviewed. Default for all new errors.</li><li style={{ marginBottom: 4 }}><strong>In Progress</strong> — You are actively working on resolving this.</li><li style={{ marginBottom: 4 }}><strong>Not an Error</strong> — Reviewed and disputed or not applicable.</li><li style={{ marginBottom: 4 }}><strong>Fixed</strong> — Resolved and corrected.</li></ul>) },
            ]},
            { section: "Saturday Calculator", items: [
              { q: "How do I use the Saturday Calculator?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}>Select your center — rates load automatically.</li><li style={{ marginBottom: 4 }}>Enter A, B, C, and C+ acuity client counts.</li><li style={{ marginBottom: 4 }}>Minimum required staff calculates automatically.</li><li style={{ marginBottom: 4 }}>Add extra staff if needed. Salary staff count toward ratio but not cost.</li><li style={{ marginBottom: 4 }}>Result shows ✅ Good to Go or ❌ Not Viable.</li></ul>) },
              { q: "What are the acuity staff ratios?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}><strong>A Acuity</strong> — 1 staff per 10 clients</li><li style={{ marginBottom: 4 }}><strong>B Acuity</strong> — 1 staff per 6 clients</li><li style={{ marginBottom: 4 }}><strong>C Acuity</strong> — 1 staff per 3 clients</li><li style={{ marginBottom: 4 }}><strong>C+ Acuity</strong> — 1:1 ratio · same rate as C</li></ul>) },
            ]},
            { section: "Reporting Issues", items: [
              { q: "How do I report a bug or request a feature?", a: "Reach out directly to the platform administrator. Please include a description of what happened, which page you were on, and what you expected to happen." },
            ]},
          ].map(({ section, items }) => (
            <div key={section} style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 8, borderBottom: "1.5px solid var(--border)" }}>{section}</div>
              {items.map(({ q, a }) => (
                <FaqItem key={q} question={q} answer={a} />
              ))}
            </div>
          ))}

          {/* Contact */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>Contact</div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 2 }}>Brock</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>Platform Administrator · Empowered IS</div>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>Questions? Reach out</span>
            </div>
          </div>
        </div>
      )}

      {/* Sub-page bar: unified back button for all module screens.
          Hidden when UnderConstruction is rendering — UC has its own back button. */}
      {MODULE_IDS.includes(activeTab) && !showUnderConstruction && (
        <div style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <button className="back-btn" onClick={() => setActiveTab("home")}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 500, color: "var(--text-2)", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
            ← Back to Home
          </button>
          {(activeTab === "tracker" || activeTab === "calculator") && (
            <>
              <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>
                {activeTab === "tracker" ? "Error Tracker" : "Saturday Calculator"}
              </div>
            </>
          )}
          {activeTab === "tracker" && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              {!loaded && <span style={{ fontSize: 12, color: "var(--text-3)" }}>Loading…</span>}
              <button
                onClick={() => { setShowUpload(true); setPasswordOk(false); setUploadPassword(""); setPasswordError(false); }}
                style={{ background: "var(--text-1)", color: "white", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}
              >
                Upload New Week
              </button>
              <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "var(--text-2)" }}>
                {stats.open} open · {stats.fixed} fixed
              </div>
              {lastUpdated && (
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                  Updated {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Under Construction placeholder — manager role on any non-tracker module.
          Renders in place of the actual module content. Per spec, includes its
          own back button to Home. */}
      {showUnderConstruction && (
        <UnderConstruction
          moduleName={underConstructionModuleName}
          onBack={() => setActiveTab("home")}
        />
      )}

      {activeTab === "calculator" && !showUnderConstruction && (
        <ErrorBoundary moduleName="Saturday Calculator">
        <div style={{ padding: "32px 24px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--text-1)" }}>Saturday Calculator</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Select your center and enter client counts to see if a Saturday outing is financially viable.</div>
            </div>

            {/* Center selector */}
            <div style={{ background: "white", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "18px 20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>Select Your Center</div>
              <select value={calcCenter} onChange={e => setCalcCenter(e.target.value)}
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 15, fontWeight: 600, background: "white", cursor: "pointer" }}>
                <option value="">— Choose a center —</option>
                {CENTERS.map(c => <option key={c}>{c}</option>)}
              </select>
              {calcRates && (
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  {[["A","#0369a1","#f0f9ff","#bae6fd"],["B","#d97706","#fffbeb","#fde68a"],["C","#dc2626","#fff1f2","#fecdd3"]].map(([a,color,bg,border]) => (
                    <div key={a} style={{ flex: 1, background: bg, borderRadius: 8, padding: "8px 12px", textAlign: "center", border: `1px solid ${border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{a} Acuity</div>
                      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#1e293b", marginTop: 2 }}>${calcRates[a].toFixed(2)}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>per client</div>
                    </div>
                  ))}
                  <div style={{ flex: 1, background: "#f5f3ff", borderRadius: 8, padding: "8px 12px", textAlign: "center", border: "1px solid #ddd6fe" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.5px" }}>C+ Acuity</div>
                    <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#7c3aed", marginTop: 2 }}>${calcRates.C.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>per client · 1:1</div>
                  </div>
                </div>
              )}
            </div>

            {calcCenter && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                {/* Left column */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Client counts */}
                  <div style={{ background: "white", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Client Counts</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        { key: "A", label: "A Acuity", desc: "1 staff per 10 clients", color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
                        { key: "B", label: "B Acuity", desc: "1 staff per 6 clients", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
                        { key: "C", label: "C Acuity", desc: "1 staff per 3 clients", color: "#dc2626", bg: "#fff1f2", border: "#fecdd3" },
                        { key: "CP", label: "C+ Acuity", desc: "1:1 ratio · same rate as C", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
                      ].map(({ key, label, desc, color, bg, border }) => (
                        <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, background: bg, border: `1.5px solid ${border}`, borderRadius: 10, padding: "12px 14px" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{desc}</div>
                          </div>
                          <input type="number" min="0" placeholder="0" value={calcCounts[key]}
                            onChange={e => setCalcCounts(prev => ({ ...prev, [key]: e.target.value }))}
                            style={{ width: 64, border: `1.5px solid ${border}`, borderRadius: 8, padding: 8, fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace", color, textAlign: "center", background: "white" }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Staffing */}
                  <div style={{ background: "white", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Staffing</div>
                    {calcResult && (
                      <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 12, color: "#64748b" }}>Minimum required staff based on client ratios</div>
                        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: "#1e293b", marginTop: 2 }}>{calcResult.minStaff} staff</div>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Additional staff</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Beyond the minimum</div>
                      </div>
                      <input type="number" min="0" value={calcExtra} onChange={e => setCalcExtra(e.target.value)}
                        style={{ width: 64, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: 8, fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#1e293b", textAlign: "center" }} />
                    </div>
                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Salary / Non-hourly staff</div>
                          <div style={{ fontSize: 11, color: "#94a3b8" }}>Fills ratio requirement — no $119 cost</div>
                        </div>
                        <input type="number" min="0" value={calcSalary} onChange={e => setCalcSalary(e.target.value)}
                          style={{ width: 64, border: "1.5px solid #ddd6fe", borderRadius: 8, padding: 8, fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#7c3aed", textAlign: "center", background: "#f5f3ff" }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10 }}>$17/hr × 7 hrs = $119 per hourly staff member</div>
                  </div>
                </div>

                {/* Right column — result */}
                <div style={{ position: "sticky", top: 24 }}>
                  <div style={{ background: "white", borderRadius: 16, border: `2px solid ${!calcResult ? "#e2e8f0" : calcResult.viable ? "#86efac" : "#fca5a5"}`, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", textAlign: "center" }}>
                    {!calcResult ? (
                      <div style={{ padding: "40px 0" }}>
                        <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>Enter client counts to see your result</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", padding: "3px 10px", borderRadius: 4, marginBottom: 8, background: calcResult.viable ? "#dcfce7" : "#fee2e2", color: calcResult.viable ? "#166534" : "#991b1b" }}>{calcResult.viable ? "Viable" : "Not Viable"}</div>
                          <div style={{ fontSize: 20, fontWeight: 700, color: calcResult.viable ? "#16a34a" : "#dc2626" }}>{calcResult.viable ? "Good to Go!" : "Doesn't Clear Minimum"}</div>
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                            {calcResult.viable
                              ? `Clears the $500 minimum by $${(calcResult.profit - 500).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                              : `$${(500 - calcResult.profit).toLocaleString("en-US", { minimumFractionDigits: 2 })} short of the $500 minimum`}
                          </div>
                        </div>
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                            <span>$0</span><span>$750 target</span>
                          </div>
                          <div style={{ background: "#f1f5f9", borderRadius: 100, height: 10, overflow: "hidden" }}>
                            <div style={{ height: "100%", borderRadius: 100, width: `${calcResult.pct}%`, background: calcResult.viable ? "#16a34a" : "#ef4444", transition: "width 0.4s ease" }} />
                          </div>
                        </div>
                        <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", fontSize: 13, textAlign: "left", marginBottom: 14 }}>
                          {[
                            { label: `Revenue (${calcResult.total} clients)`, val: calcResult.revenue, color: "#0369a1" },
                            { label: "Overhead", val: -250, color: "#dc2626" },
                            { label: `Staff (${calcResult.hourlyStaff} hourly${calcResult.salary > 0 ? ` + ${calcResult.salary} salary` : ""} × $119)`, val: -calcResult.staffCostTotal, color: "#dc2626" },
                          ].map(({ label, val, color }) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                              <span style={{ color: "#64748b" }}>{label}</span>
                              <span style={{ fontFamily: "'DM Mono', monospace", color, fontWeight: 500 }}>{val < 0 ? "-" : ""}${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            </div>
                          ))}
                          <div style={{ borderTop: "1px solid #e2e8f0", margin: "8px 0" }} />
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                            <span style={{ color: "#64748b", fontWeight: 700 }}>Net Profit</span>
                            <span style={{ fontFamily: "'DM Mono', monospace", color: calcResult.viable ? "#16a34a" : "#dc2626", fontWeight: 700 }}>${calcResult.profit.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {[["A", calcResult.cA, "#0369a1", "#f0f9ff"], ["B", calcResult.cB, "#d97706", "#fffbeb"], ["C", calcResult.cC, "#dc2626", "#fff1f2"], ["C+", calcResult.cCP, "#7c3aed", "#f5f3ff"]].map(([label, count, color, bg]) => (
                            <div key={label} style={{ flex: 1, background: bg, borderRadius: 8, padding: 8, textAlign: "center" }}>
                              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'DM Mono', monospace", color }}>{count}</div>
                              <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{label}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </ErrorBoundary>
      )}

      {activeTab === "tracker" && !showUnderConstruction && <ErrorBoundary moduleName="Error Tracker"><div style={{ padding: "24px 32px" }}>
        {/* Center Progress Bar Row */}
        {centerStats.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
            {centerStats.map(({ center, total, resolved, pct, noErrors }) => {
              const color = progressColor(pct);
              const isActive = selectedCenter === center;
              return (
                <div key={center} onClick={() => setSelectedCenter(isActive ? "All Centers" : center)}
                  style={{ flex: "0 0 auto", cursor: "pointer", background: "white", border: `1.5px solid ${isActive ? color : "#e2e8f0"}`,
                    borderRadius: 8, padding: "6px 10px", minWidth: 90, boxShadow: isActive ? `0 0 0 2px ${color}40` : "none",
                    transition: "all 0.15s" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 4, whiteSpace: "nowrap" }}>{center}</div>
                  <div style={{ background: "#f1f5f9", borderRadius: 100, height: 5, overflow: "hidden", marginBottom: 3 }}>
                    <div style={{ height: "100%", borderRadius: 100, width: `${pct}%`, background: color, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ fontSize: 10, color: noErrors ? "#16a34a" : "#94a3b8", fontWeight: noErrors ? 600 : 400, whiteSpace: "nowrap" }}>
                    {noErrors ? "✓ No Errors" : `${resolved}/${total} · ${pct}%`}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Center</label>
            <select value={selectedCenter} onChange={e => setSelectedCenter(e.target.value)}
              style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "white", color: "#1e293b", cursor: "pointer", minWidth: 200 }}>
              {locations.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Error Type</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "white", color: "#1e293b", cursor: "pointer", minWidth: 220 }}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "Open", val: stats.open, color: "#6b7280", bg: "#f3f4f6" },
              { label: "Disputed", val: stats.disputed, color: "#dc2626", bg: "#fee2e2" },
              { label: "Fixed", val: stats.fixed, color: "#16a34a", bg: "#dcfce7" },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1.5px solid ${s.color}30`, borderRadius: 8, padding: "6px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.val}</div>
                <div style={{ fontSize: 11, color: s.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "white", borderRadius: 12, border: "1.5px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1.5px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>{filtered.length} errors</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {selectedCenter !== "All Centers" ? selectedCenter : "All Centers"}{selectedCategory !== "All Types" ? ` · ${selectedCategory}` : ""}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    { label: "Client Name", field: "name" },
                    { label: "Center", field: null },
                    { label: "Date", field: "date" },
                    { label: "Error", field: null },
                    { label: "Type", field: null },
                    { label: "Status", field: null },
                    { label: "Notes", field: null },
                  ].map(({ label, field }) => (
                    <th key={label} onClick={() => field && handleSort(field)}
                      style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
                        color: sortField === field ? "#3b82f6" : "#64748b", textTransform: "uppercase",
                        letterSpacing: "0.5px", borderBottom: "1.5px solid #e2e8f0", whiteSpace: "nowrap",
                        cursor: field ? "pointer" : "default", userSelect: "none" }}>
                      {label}
                      {field && <span style={{ marginLeft: 5, fontSize: 10, opacity: sortField === field ? 1 : 0.35 }}>
                        {sortField === field ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                      </span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const key = makeKey(row, rawData.indexOf(row));
                  const status = effStatus(key);
                  const note = notes[key] ?? "";
                  const flagged = effFlag(key);
                  const catStyle = CATEGORY_COLORS[row.category] || { bg: "#f9fafb", text: "#374151", border: "#e5e7eb" };
                  const rowBg = status === "fixed" ? "#f0fdf4" : status === "disputed" ? "#fff8f8" : "white";
                  return (
                    <tr key={key + i} className="error-row" style={{ borderBottom: "1px solid #f1f5f9", background: rowBg,
                      transition: "background 0.1s" }}>
                      <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1e293b", whiteSpace: "nowrap" }}>{row.name}</td>
                      <td style={{ padding: "10px 16px", color: "#475569", whiteSpace: "nowrap" }}>{centerName(row.location)}</td>
                      <td style={{ padding: "10px 16px", color: "#475569", fontFamily: "'DM Mono', monospace", fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(row.date)}</td>
                      <td style={{ padding: "10px 16px", color: "#374151", minWidth: 260, maxWidth: 400, whiteSpace: "normal", wordBreak: "break-word" }}>
                        {row.reason}
                      </td>
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                        <span style={{ background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                          {row.category}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                          {STATUS_OPTIONS.map(opt => (
                            <button key={opt.value} className={`status-btn ${status === opt.value ? "active" : ""}`}
                              onClick={() => saveStatus(key, opt.value)}
                              style={{ background: status === opt.value ? opt.bg : "white", color: status === opt.value ? opt.color : "#9ca3af",
                                borderColor: status === opt.value ? opt.border : "#e5e7eb", opacity: status === opt.value ? 1 : 0.7 }}>
                              {opt.label}
                            </button>
                          ))}
                          <button onClick={() => saveFlag(key)}
                            title={flagged ? "Remove flag" : "Flag this row"}
                            style={{ background: flagged ? "#fef2f2" : "white", color: flagged ? "#dc2626" : "#d1d5db",
                              border: `1px solid ${flagged ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 4,
                              padding: "3px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", lineHeight: 1, transition: "all 0.15s", fontFamily: "inherit" }}>
                            {flagged ? "Flagged" : "Flag"}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                        <button onClick={() => { setNoteModal({ key, note }); setNoteInput(note); }}
                          style={{ background: note ? "#f0f9ff" : "#f8fafc", color: note ? "#0369a1" : "#94a3b8",
                            border: `1px solid ${note ? "#bae6fd" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px",
                            fontSize: 12, cursor: "pointer", maxWidth: 180, textAlign: "left", whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis", display: "block" }}
                          title={note || "Add note"}>
                          {note ? note : "+ Add note"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                    No errors found for this selection.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div></ErrorBoundary>}

      {/* Note Modal */}
      {noteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998 }}
          onClick={e => e.target === e.currentTarget && setNoteModal(null)}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "#1e293b" }}>Note</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>Click outside to close without saving</div>
            <textarea
              autoFocus
              rows={5}
              defaultValue={noteModal.note}
              onChange={e => setNoteInput(e.target.value)}
              placeholder="Add a note..."
              style={{ width: "100%", border: "1.5px solid #3b82f6", borderRadius: 8, padding: "10px 12px", fontSize: 14, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => { saveNote(noteModal.key, noteInput !== undefined ? noteInput : noteModal.note); setNoteModal(null); }}
                style={{ flex: 1, background: "#3b82f6", color: "white", border: "none", borderRadius: 8, padding: "9px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save</button>
              <button onClick={() => setNoteModal(null)}
                style={{ flex: 1, background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "9px", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "billing" && !showUnderConstruction && (
        <div className="page-anim">
          <ErrorBoundary moduleName="Billing Overview">
            <BillingDashboard onBack={() => setActiveTab("home")} userRole={userRole} />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === "fleet" && !showUnderConstruction && (
        <div className="page-anim">
          <ErrorBoundary moduleName="Fleet Dashboard">
            <FleetDashboard onBack={() => setActiveTab("home")} userRole={userRole} />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === "utilization" && !showUnderConstruction && (
        <div className="page-anim">
          <ErrorBoundary moduleName="Utilization Dashboard">
            <UtilizationDashboard onBack={() => setActiveTab("home")} userRole={userRole} />
          </ErrorBoundary>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "var(--navy)", color: "white", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 9999 }}>
          {toast}
        </div>
      )}

      </main>
      </div>
    </div>
  );
}
