import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import * as XLSX from "https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs";

const UPLOAD_PASSWORD = import.meta.env.VITE_UPLOAD_PASSWORD;
const SHEET_URL = "https://sheetdb.io/api/v1/t91e5epi82udj";
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hour in ms
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

function getWeekLabel(data) {
  const dates = data.map(r => r.date).filter(Boolean).sort();
  if (!dates.length) return "";

  const fmt = (date) => {
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
  };

  // Find the earliest date in the data
  const earliest = new Date(dates[0] + "T00:00:00Z");

  // Walk back to Monday (getUTCDay: 0=Sun, 1=Mon ... 6=Sat)
  const day = earliest.getUTCDay();
  const daysToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(earliest);
  monday.setUTCDate(monday.getUTCDate() - daysToMonday);

  // Sunday is 6 days after Monday
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);

  return `${fmt(monday)} – ${fmt(sunday)}`;
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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const auth = localStorage.getItem("ecs_auth");
    const lastActive = localStorage.getItem("ecs_last_active");
    if (auth === "true" && lastActive) {
      const elapsed = Date.now() - parseInt(lastActive);
      if (elapsed < INACTIVITY_TIMEOUT) return true;
    }
    localStorage.removeItem("ecs_auth");
    localStorage.removeItem("ecs_role");
    return false;
  });
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem("ecs_role") === "admin");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [rawData, setRawData] = useState(DEFAULT_DATA);
  const [selectedCenter, setSelectedCenter] = useState("All Centers");
  const [selectedCategory, setSelectedCategory] = useState("All Types");
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const [flags, setFlags] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedNote, setExpandedNote] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState(null);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [noteModal, setNoteModal] = useState(null); // { key, note }
  const [activeTab, setActiveTab] = useState("home");

  // Saturday Calculator state
  const [calcCenter, setCalcCenter] = useState("");
  const [calcCounts, setCalcCounts] = useState({ A: "", B: "", C: "", CP: "" });
  const [calcExtra, setCalcExtra] = useState(0);
  const [calcSalary, setCalcSalary] = useState(0);

  const CALC_CENTERS = {
    "Beavercreek":  { A: 59.00, B: 106.00, C: 176.75 },
    "Englewood":    { A: 59.00, B: 106.00, C: 176.75 },
    "Avon":         { A: 59.50, B: 107.00, C: 178.75 },
    "Eastgate":     { A: 59.50, B: 107.00, C: 178.75 },
    "Lorain":       { A: 59.50, B: 107.00, C: 178.75 },
    "Parma":        { A: 60.25, B: 108.00, C: 180.50 },
    "Springboro":   { A: 60.25, B: 108.00, C: 180.50 },
    "Fairfield":    { A: 60.25, B: 108.00, C: 180.50 },
    "Independence": { A: 60.25, B: 108.00, C: 180.50 },
    "Westwood":     { A: 60.75, B: 109.00, C: 182.25 },
  };
  const CALC_OVERHEAD = 250;
  const CALC_MIN_PROFIT = 500;
  const CALC_THRESHOLD = 750;
  const CALC_STAFF_COST = 17 * 7;
  const CALC_RATIOS = { A: 10, B: 6, C: 3, CP: 1 };
  const calcRates = calcCenter ? CALC_CENTERS[calcCenter] : null;
  const calcResult = (() => {
    if (!calcRates) return null;
    const cA = parseInt(calcCounts.A) || 0;
    const cB = parseInt(calcCounts.B) || 0;
    const cC = parseInt(calcCounts.C) || 0;
    const cCP = parseInt(calcCounts.CP) || 0;
    const total = cA + cB + cC + cCP;
    if (total === 0) return null;
    const minStaff = Math.ceil(cA / CALC_RATIOS.A) + Math.ceil(cB / CALC_RATIOS.B) + Math.ceil(cC / CALC_RATIOS.C) + cCP;
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
      } catch (e) {}

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
      } catch (e) {}

      setLoaded(true);
    }
    load();
  }, []);

  // Track activity and reset inactivity timer
  useEffect(() => {
    if (!isAuthenticated) return;
    const updateActivity = () => localStorage.setItem("ecs_last_active", Date.now().toString());
    updateActivity();
    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, updateActivity));

    const interval = setInterval(() => {
      const lastActive = parseInt(localStorage.getItem("ecs_last_active") || "0");
      if (Date.now() - lastActive > INACTIVITY_TIMEOUT) {
        localStorage.removeItem("ecs_auth");
        localStorage.removeItem("ecs_last_active");
        localStorage.removeItem("ecs_role");
        setIsAuthenticated(false);
        setIsAdmin(false);
      }
    }, 30000); // check every 30 seconds

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    localStorage.removeItem("ecs_auth");
    localStorage.removeItem("ecs_last_active");
    localStorage.removeItem("ecs_role");
    setIsAuthenticated(false);
    setIsAdmin(false);
    setActiveTab("home");
  };

  const handleLogin = () => {
    if (loginPassword === ADMIN_PASSWORD) {
      localStorage.setItem("ecs_auth", "true");
      localStorage.setItem("ecs_role", "admin");
      localStorage.setItem("ecs_last_active", Date.now().toString());
      setIsAuthenticated(true);
      setIsAdmin(true);
      setLoginError(false);
      setLoginPassword("");
    } else if (loginPassword === APP_PASSWORD) {
      localStorage.setItem("ecs_auth", "true");
      localStorage.setItem("ecs_role", "manager");
      localStorage.setItem("ecs_last_active", Date.now().toString());
      setIsAuthenticated(true);
      setIsAdmin(false);
      setLoginError(false);
      setLoginPassword("");
    } else {
      setLoginError(true);
    }
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

      // Clear old error_data rows and write new ones
      await fetch(SHEET_URL + "/all?sheet=error_data", { method: "DELETE" });

      // Write rows in batches of 50 using ?sheet= query param
      const batchSize = 50;
      for (let i = 0; i < newData.length; i += batchSize) {
        const batch = newData.slice(i, i + batchSize);
        const res = await fetch(SHEET_URL + "?sheet=error_data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: batch }),
        });
        if (!res.ok) {
          const err = await res.text();
          console.error("SheetDB write failed:", i, err);
          showToast("Warning: data may not have saved — check console");
        }
      }

      // Clear statuses and notes since it's a new week
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
      showToast("Error reading file — make sure it\'s a valid .xlsx");
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
    } catch (e) { showToast("Save failed"); }
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
    } catch (e) {}
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
    } catch (e) {}
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

  const KNOWN_CENTERS = ["Avon", "Beavercreek", "Eastgate", "Englewood", "Fairfield", "Independence", "Lorain", "Parma", "Springboro", "Westwood"];

  const centerStats = useMemo(() => {
    return KNOWN_CENTERS.map(center => {
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

  const weekLabel = getWeekLabel(rawData);

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
        <div style={{ background: "white", borderRadius: 16, border: "1.5px solid #e2e8f0", padding: "48px 40px", width: "100%", maxWidth: 400, boxShadow: "0 8px 32px rgba(0,0,0,0.08)", textAlign: "center" }}>
          <img src={LOGO} alt="ECS" style={{ width: 56, height: 56, borderRadius: 12, marginBottom: 20 }} />
          <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", letterSpacing: "-0.5px", marginBottom: 6 }}>ECS Hub</div>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 32 }}>Enter your password to continue</div>
          <input
            type="password"
            value={loginPassword}
            onChange={e => { setLoginPassword(e.target.value); setLoginError(false); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Password"
            autoFocus
            style={{ width: "100%", border: `1.5px solid ${loginError ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, marginBottom: 10, background: loginError ? "#fff8f8" : "white", outline: "none", textAlign: "center", letterSpacing: "2px" }}
          />
          {loginError && <div style={{ fontSize: 12, color: "#dc2626", marginBottom: 10 }}>Incorrect password. Try again.</div>}
          <button
            onClick={handleLogin}
            style={{ width: "100%", background: "#1e293b", color: "white", border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "\'DM Sans\', \'Segoe UI\', sans-serif", background: "#f8fafc", minHeight: "100vh", color: "#1e293b" }}>
      <style>{`
        @import url(\'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap\');
        * { box-sizing: border-box; }
        select:focus, button:focus, input:focus, textarea:focus { outline: 2px solid #3b82f6; outline-offset: 2px; }
        .error-row:hover { background: #f1f5f9 !important; }
        .status-btn { cursor: pointer; border: 1.5px solid; border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 500; transition: all 0.15s; white-space: nowrap; }
        .status-btn:hover { transform: scale(1.05); filter: brightness(0.95); }
        .status-btn.active { box-shadow: 0 0 0 2px rgba(59,130,246,0.4); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
      `}</style>
      <style>{`
        :root {
          --navy: #1a2d4d;
          --steel: #4a7ab5;
          --powder: #8fb3d4;
          --light: #d6e8f5;
          --bg: #f4f8fc;
          --border: #dce8f2;
          --muted: #64748b;
        }
        .module-card { transition: all 0.2s; }
        .module-card:hover { border-color: var(--steel) !important; box-shadow: 0 8px 24px rgba(74,122,181,0.12); transform: translateY(-2px); }
        .module-card:hover .module-arrow { transform: translateX(4px); }
        .module-arrow { transition: transform 0.2s; display: inline-block; }
        .faq-a { display: none; }
        .faq-a.open { display: block; }
        .nav-btn { transition: all 0.15s; }
        .nav-btn:hover { background: rgba(255,255,255,0.1) !important; color: white !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .page-anim { animation: fadeIn 0.2s ease; }
        .back-btn:hover { background: var(--bg) !important; border-color: var(--steel) !important; }
      `}</style>

      {/* Header */}
      <div style={{ background: "var(--navy)", padding: "0 32px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 2px 12px rgba(26,45,77,0.18)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "white", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <img src={LOGO} alt="ECS" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "white", letterSpacing: "-0.3px" }}>
            Empowered <span style={{ color: "var(--powder)" }}>IS</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {saving && <span style={{ fontSize: 12, color: "#94a3b8", marginRight: 8 }}>Saving…</span>}
          {["home", "faq"].map(id => (
            <button key={id} className="nav-btn" onClick={() => setActiveTab(id)}
              style={{ background: activeTab === id ? "rgba(255,255,255,0.15)" : "none", border: "none",
                color: activeTab === id ? "white" : "rgba(255,255,255,0.6)",
                fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                padding: "7px 14px", borderRadius: 8, cursor: "pointer" }}>
              {id === "home" ? "Home" : "Help & FAQ"}
            </button>
          ))}
          {isAdmin && (
            <button className="nav-btn" onClick={() => setActiveTab("admin")}
              style={{ background: activeTab === "admin" ? "rgba(255,255,255,0.15)" : "none", border: "none",
                color: activeTab === "admin" ? "white" : "rgba(255,255,255,0.6)",
                fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                padding: "7px 14px", borderRadius: 8, cursor: "pointer" }}>
              Admin
            </button>
          )}
          <button className="nav-btn" onClick={handleLogout}
            style={{ background: "none", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 8,
              color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, fontFamily: "inherit",
              padding: "6px 14px", cursor: "pointer", marginLeft: 4 }}>
            Log Out
          </button>
        </div>
      </div>

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
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Click to select your Excel file</div>
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

      {/* HOME PAGE */}
      {activeTab === "home" && (
        <div className="page-anim">
          {/* Hero */}
          <div style={{ background: "linear-gradient(135deg, var(--navy) 0%, #2a4a7a 60%, #3a6a9a 100%)", padding: "56px 32px 48px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 300, height: 300, background: "radial-gradient(circle, rgba(143,179,212,0.15) 0%, transparent 70%)", borderRadius: "50%" }} />
            <div style={{ position: "absolute", bottom: -40, left: -40, width: 200, height: 200, background: "radial-gradient(circle, rgba(74,122,181,0.2) 0%, transparent 70%)", borderRadius: "50%" }} />
            <div style={{ display: "inline-block", background: "rgba(143,179,212,0.2)", border: "1px solid rgba(143,179,212,0.3)", color: "var(--powder)", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", padding: "5px 14px", borderRadius: 100, marginBottom: 16 }}>Internal Platform</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: "white", letterSpacing: -1, lineHeight: 1.1, marginBottom: 12 }}>
              Empowered <span style={{ color: "var(--powder)" }}>Information Systems</span>
            </div>
            <div style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              Your internal toolkit for managing center operations, tracking errors, and planning events.
            </div>
          </div>

          {/* Module Cards */}
          <div style={{ padding: "40px 32px", maxWidth: 960, margin: "0 auto" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 20 }}>Available Modules</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>

              {/* Error Tracker Card */}
              <div className="module-card" onClick={() => setActiveTab("tracker")}
                style={{ background: "white", border: "1.5px solid var(--border)", borderRadius: 14, padding: 24, cursor: "pointer", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, var(--navy), var(--steel))" }} />
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "#e8f0fa", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>📋</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>Error Tracker</div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 16 }}>Log and track weekly transportation and attendance errors across all centers.</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", padding: "3px 8px", borderRadius: 100, background: "var(--light)", color: "var(--steel)" }}>Weekly</span>
                  <span className="module-arrow" style={{ color: "var(--steel)", fontSize: 16 }}>→</span>
                </div>
              </div>

              {/* Saturday Calculator Card — Under Construction */}
              <div className="module-card"
                style={{ background: "#f8fafc", border: "1.5px solid var(--border)", borderRadius: 14, padding: 24, cursor: "not-allowed", position: "relative", overflow: "hidden", opacity: 0.75 }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, #94a3b8, #cbd5e1)" }} />
                <div style={{ position: "absolute", top: 10, right: 10, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", padding: "3px 8px", borderRadius: 100, background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a" }}>Under Construction</div>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 16 }}>🚧</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Saturday Calculator</div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5, marginBottom: 16 }}>This module is temporarily unavailable while updates are being made.</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", padding: "3px 8px", borderRadius: 100, background: "#e2e8f0", color: "#94a3b8" }}>Locked</span>
                  <span style={{ color: "#94a3b8", fontSize: 16 }}>🔒</span>
                </div>
              </div>

              {/* Coming Soon */}
              <div style={{ background: "white", border: "1.5px dashed var(--border)", borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 160, opacity: 0.6 }}>
                <div style={{ fontSize: 28, marginBottom: 10, color: "var(--muted)" }}>＋</div>
                <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500 }}>More modules coming soon</div>
              </div>

            </div>
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
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 8, borderBottom: "1.5px solid var(--border)" }}>Contact</div>
            <div style={{ background: "linear-gradient(135deg, var(--navy), #2a4a7a)", borderRadius: 14, padding: "28px 32px", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(143,179,212,0.25)", border: "2px solid rgba(143,179,212,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>👤</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "white", marginBottom: 2 }}>Brock</div>
                <div style={{ fontSize: 12, color: "var(--powder)" }}>Platform Administrator · Empowered IS</div>
              </div>
              <div style={{ background: "rgba(143,179,212,0.2)", border: "1px solid rgba(143,179,212,0.3)", color: "var(--powder)", fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 100 }}>Questions? Reach out</div>
            </div>
          </div>
        </div>
      )}

      {/* Inner page back button for tracker and calculator */}
      {(activeTab === "tracker" || activeTab === "calculator") && (
        <div style={{ background: "white", borderBottom: "1.5px solid var(--border)", padding: "12px 32px", display: "flex", alignItems: "center", gap: 12 }}>
          <button className="back-btn" onClick={() => setActiveTab("home")}
            style={{ background: "none", border: "1.5px solid var(--border)", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontWeight: 600, color: "var(--navy)", cursor: "pointer", fontFamily: "inherit" }}>
            ← Home
          </button>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--navy)" }}>
            {activeTab === "tracker" ? "Error Tracker" : "Saturday Calculator"}
          </div>
          {activeTab === "tracker" && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              {!loaded && <span style={{ fontSize: 12, color: "#94a3b8" }}>Loading…</span>}
              <button
                onClick={() => { setShowUpload(true); setPasswordOk(false); setUploadPassword(""); setPasswordError(false); }}
                style={{ background: "var(--steel)", color: "white", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Upload New Week
              </button>
              <div style={{ background: "#f1f5f9", borderRadius: 8, padding: "4px 12px", fontSize: 12, color: "#64748b" }}>
                {stats.open} open · {stats.fixed} fixed
              </div>
              {lastUpdated && (
                <div style={{ fontSize: 11, color: "#94a3b8" }}>
                  Report updated {new Date(lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {new Date(lastUpdated).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "calculator" && (
        <div style={{ padding: "32px 24px" }}>
          <div style={{ maxWidth: 760, margin: "0 auto" }}>
            <div style={{ textAlign: "center", padding: "60px 24px", background: "white", borderRadius: 16, border: "1.5px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🚧</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", marginBottom: 8 }}>Under Construction</div>
              <div style={{ fontSize: 15, color: "#64748b", maxWidth: 380, margin: "0 auto", lineHeight: 1.6 }}>
                The Saturday Calculator is temporarily unavailable while we make improvements. Please check back soon.
              </div>
              <div style={{ marginTop: 24, display: "inline-block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", padding: "6px 14px", borderRadius: 100, background: "#fef9c3", color: "#92400e", border: "1px solid #fde68a" }}>
                Coming Back Soon
              </div>
            </div>
            <div style={{ display: "none" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.5px" }}>🗓️ Saturday Event Calculator</div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Select your center and enter client counts to see if a Saturday outing is financially viable.</div>
            </div>

            {/* Center selector */}
            <div style={{ background: "white", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "18px 20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>Select Your Center</div>
              <select value={calcCenter} onChange={e => setCalcCenter(e.target.value)}
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 15, fontWeight: 600, background: "white", cursor: "pointer" }}>
                <option value="">— Choose a center —</option>
                {["Beavercreek","Englewood","Avon","Eastgate","Lorain","Parma","Springboro","Fairfield","Independence","Westwood"].map(c => <option key={c}>{c}</option>)}
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
                        <div style={{ fontSize: 36, marginBottom: 12 }}>👆</div>
                        <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>Enter client counts to see your result</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ marginBottom: 20 }}>
                          <div style={{ fontSize: 32, marginBottom: 4 }}>{calcResult.viable ? "✅" : "❌"}</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: calcResult.viable ? "#16a34a" : "#dc2626" }}>{calcResult.viable ? "Good to Go!" : "Not Viable"}</div>
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
        </div>
      )}

      {activeTab === "tracker" && <div style={{ padding: "24px 32px" }}>
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
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "\'DM Mono\', monospace" }}>{s.val}</div>
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
                      <td style={{ padding: "10px 16px", color: "#475569", fontFamily: "\'DM Mono\', monospace", fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(row.date)}</td>
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
                              {opt.icon} {opt.label}
                            </button>
                          ))}
                          <button onClick={() => saveFlag(key)}
                            title={flagged ? "Remove flag" : "Flag this row"}
                            style={{ background: flagged ? "#fef2f2" : "white", color: flagged ? "#dc2626" : "#d1d5db",
                              border: `1.5px solid ${flagged ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 6,
                              padding: "3px 7px", fontSize: 13, cursor: "pointer", lineHeight: 1, transition: "all 0.15s" }}>
                            🚩
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
                          {note ? `📝 ${note}` : "+ Add note"}
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
      </div>}

      {/* Note Modal */}
      {noteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998 }}
          onClick={e => e.target === e.currentTarget && setNoteModal(null)}>
          <div style={{ background: "white", borderRadius: 16, padding: 28, width: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "#1e293b" }}>📝 Note</div>
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

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1e293b", color: "white", borderRadius: 10,
          padding: "10px 18px", fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}