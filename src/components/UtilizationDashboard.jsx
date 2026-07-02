import React, { useState, useEffect, useMemo } from "react";

// Migrated off SheetDB → FastAPI backend (Postgres). Same JSON shape as before,
// so the parsing below is unchanged; only the source URL differs.
const API_BASE = import.meta.env.VITE_API_BASE || "https://web-production-3b1f4.up.railway.app";
const UTIL_URL = `${API_BASE}/api/utilization`;

function excelToDate(serial) {
  if (!serial) return null;
  const n = parseFloat(serial);
  if (isNaN(n) || n < 1) return null;
  return new Date(Math.round((n - 25569) * 86400 * 1000));
}

function parseDollar(val) {
  if (val === null || val === undefined || val === "") return null;
  const n = parseFloat(String(val).replace(/[$,\s]/g, ""));
  return isNaN(n) ? null : n;
}

function daysUntil(date) {
  if (!date) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - now.getTime()) / 86400000);
}

function alertLevel(pctUsed, dollarRemaining) {
  if (dollarRemaining !== null && dollarRemaining <= 200) return "red";
  if (pctUsed >= 0.75) return "red";
  if (pctUsed >= 0.60) return "yellow";
  return "green";
}

function worstLevel(services) {
  return services.reduce((w, svc) => {
    const l = alertLevel(svc.pctUsed, svc.dollarRemaining);
    if (l === "red") return "red";
    if (l === "yellow" && w !== "red") return "yellow";
    return w;
  }, "green");
}

function svcLabel(desc) {
  const d = (desc || "").toLowerCase();
  if (d.includes("transport")) return "NMT";
  if (d.includes("adult day") || d.includes("voc hab")) return "ADS";
  if (d.includes("shared living")) return "SL";
  if (d.includes("respite")) return "Respite";
  return desc || "Service";
}

const BADGE = (level) => ({
  display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px",
  borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0,
  background: level === "red" ? "#fee2e2" : level === "yellow" ? "#fef9c3" : "#dcfce7",
  color:      level === "red" ? "#b91c1c" : level === "yellow" ? "#854d0e" : "#166534",
});

// ── Service row inside a card ─────────────────────────────────────────────────
function ServiceRow({ svc }) {
  const level = alertLevel(svc.pctUsed, svc.dollarRemaining);
  const pct = Math.round(svc.pctUsed * 100);
  const days = daysUntil(svc.serviceEndDate);
  const lowDollar = svc.dollarRemaining !== null && svc.dollarRemaining <= 200;

  return (
    <div style={{ padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", background: "#f1f5f9", padding: "2px 7px", borderRadius: 4 }}>
            {svc.serviceLabel}
          </span>
          <span style={BADGE(level)}>{pct}% used</span>
          {lowDollar && (
            <span style={{ ...BADGE("red"), background: "#fff1f2" }}>${svc.dollarRemaining.toFixed(2)} remaining</span>
          )}
          {!lowDollar && svc.dollarRemaining !== null && (
            <span style={{ fontSize: 11, color: "#64748b" }}>
              ${svc.dollarRemaining.toLocaleString("en-US", { maximumFractionDigits: 0 })} remaining
            </span>
          )}
        </div>
        {svc.serviceEndDate && (
          <span style={{ fontSize: 11, fontWeight: days !== null && days <= 14 ? 700 : 400, color: days !== null && days <= 30 ? "#dc2626" : "#64748b" }}>
            Ends {svc.serviceEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {days !== null && ` · ${days}d`}
          </span>
        )}
      </div>
      <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 3, transition: "width 0.4s ease",
          width: `${Math.min(pct, 100)}%`,
          background: level === "red" ? "#ef4444" : level === "yellow" ? "#eab308" : "#22c55e",
        }} />
      </div>
    </div>
  );
}

// ── Active client card ────────────────────────────────────────────────────────
function ClientCard({ client }) {
  const level = worstLevel(client.services);
  const borderColor = level === "red" ? "#ef4444" : level === "yellow" ? "#eab308" : "#d1fae5";
  return (
    <div style={{
      background: "#fff", borderRadius: 10, padding: "16px 18px",
      boxShadow: "0 1px 4px rgba(0,0,0,.06)",
      border: `1px solid ${level === "red" ? "#fecaca" : level === "yellow" ? "#fde68a" : "#e2e8f0"}`,
      borderLeft: `4px solid ${borderColor}`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>{client.name}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{client.county}{client.waiverType ? ` · ${client.waiverType}` : ""}</div>
        </div>
        <span style={BADGE(level)}>
          {level === "red" ? "Action Needed" : level === "yellow" ? "Monitor" : "Good"}
        </span>
      </div>
      {client.services.map((svc, i) => <ServiceRow key={i} svc={svc} />)}
    </div>
  );
}

// ── Ended-with-unused-funds card ──────────────────────────────────────────────
function EndedCard({ client }) {
  return (
    <div style={{
      background: "#fafafa", borderRadius: 10, padding: "14px 18px",
      border: "1px solid #e2e8f0", borderLeft: "4px solid #94a3b8",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#475569" }}>{client.name}</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{client.county}{client.waiverType ? ` · ${client.waiverType}` : ""}</div>
        </div>
        <span style={{ ...BADGE("green"), background: "#f1f5f9", color: "#64748b" }}>Period Ended</span>
      </div>
      {client.services.map((svc, i) => {
        const pct = Math.round(svc.pctUsed * 100);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", background: "#f1f5f9", padding: "1px 6px", borderRadius: 4 }}>{svc.serviceLabel}</span>
            <span style={{ color: "#64748b" }}>{pct}% used</span>
            {svc.dollarRemaining !== null && (
              <span style={{ color: "#64748b" }}>${svc.dollarRemaining.toLocaleString("en-US", { maximumFractionDigits: 0 })} unspent</span>
            )}
            {svc.serviceEndDate && (
              <span style={{ color: "#94a3b8", marginLeft: "auto" }}>
                Ended {svc.serviceEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function UtilizationDashboard() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [countyFilter, setCountyFilter] = useState("All");
  const [nameSearch, setNameSearch]     = useState("");
  const [levelFilter, setLevelFilter]   = useState("all");
  const [showEnded, setShowEnded]       = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(UTIL_URL, { credentials: "include" });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Utilization load error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Parse + group rows into active clients and ended clients ─────────────────
  const { activeClients, endedClients } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeMap = {};
    const endedMap  = {};

    // Warn if column headers appear to be missing (likely a source-file format change)
    if (rows.length > 0) {
      const emptyNameCount = rows.filter(r => {
        const normalized = Object.fromEntries(
          Object.entries(r).map(([k, v]) => [k.trim(), v])
        );
        return !(normalized["Individual name"] || "").trim();
      }).length;
      if (emptyNameCount > rows.length * 0.5) {
        console.warn(
          "Utilization: most rows are missing 'Individual name' — check column headers in the source file."
        );
      }
    }

    rows.forEach(row => {
      // Normalize all keys by trimming whitespace so "% Remaining " === "% Remaining"
      const ut = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k.trim(), v])
      );

      const name = (ut["Individual name"] || "").trim();
      if (!name) return;

      // Derive pctUsed from % Remaining
      const pctRem = parseFloat(ut["% Remaining"] ?? "");
      if (isNaN(pctRem)) return;
      const pctUsed = 1 - pctRem;

      // Skip not-started (pctUsed ≤ 0) and fully exhausted (pctUsed ≥ 1)
      if (pctUsed <= 0.001 || pctUsed >= 0.999) return;

      const dollarRemaining = parseDollar(ut["Measure Values"]);
      const serviceEndDate  = excelToDate(ut["Service End Date"]);
      const label           = svcLabel(ut["Paws Service Code Desc"]);
      const hasEnded        = serviceEndDate && serviceEndDate < today;

      const svcEntry = { pctUsed, dollarRemaining, serviceEndDate, serviceLabel: label };
      const county   = (ut["PAWS County Name"] || "").trim();
      const waiver   = (ut["Waiver Type"] || "").trim();

      if (hasEnded) {
        // Ended period with unused funds
        if (!endedMap[name]) endedMap[name] = { name, county, waiverType: waiver, services: {} };
        // One row per service label — keep highest pctUsed
        const existing = endedMap[name].services[label];
        if (!existing || pctUsed > existing.pctUsed) endedMap[name].services[label] = svcEntry;
      } else {
        // Active period
        if (!activeMap[name]) activeMap[name] = { name, county, waiverType: waiver, services: {} };
        const existing = activeMap[name].services[label];
        if (!existing || pctUsed > existing.pctUsed) activeMap[name].services[label] = svcEntry;
      }
    });

    // Convert services map → sorted array (highest % used first)
    const toArray = (map) => Object.values(map).map(c => ({
      ...c,
      services: Object.values(c.services).sort((a, b) => b.pctUsed - a.pctUsed),
    }));

    return { activeClients: toArray(activeMap), endedClients: toArray(endedMap) };
  }, [rows]);

  const counties = useMemo(() => {
    const set = new Set(activeClients.map(c => c.county).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  }, [activeClients]);

  const stats = useMemo(() => {
    let red = 0, yellow = 0, green = 0;
    activeClients.forEach(c => {
      const l = worstLevel(c.services);
      if (l === "red") red++; else if (l === "yellow") yellow++; else green++;
    });
    return { red, yellow, green, total: activeClients.length };
  }, [activeClients]);

  const filtered = useMemo(() => {
    let list = activeClients;
    if (countyFilter !== "All") list = list.filter(c => c.county === countyFilter);
    if (nameSearch.trim()) {
      const q = nameSearch.trim().toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    if (levelFilter === "red")    list = list.filter(c => worstLevel(c.services) === "red");
    if (levelFilter === "yellow") list = list.filter(c => worstLevel(c.services) === "yellow");
    if (levelFilter === "green")  list = list.filter(c => worstLevel(c.services) === "green");

    list.sort((a, b) => {
      const rank = { red: 0, yellow: 1, green: 2 };
      const la = worstLevel(a.services), lb = worstLevel(b.services);
      if (rank[la] !== rank[lb]) return rank[la] - rank[lb];
      return Math.max(...b.services.map(s => s.pctUsed)) - Math.max(...a.services.map(s => s.pctUsed));
    });
    return list;
  }, [activeClients, countyFilter, nameSearch, levelFilter]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, fontSize: 16, color: "#64748b" }}>
      Loading utilization data…
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 10 }}>
      <div style={{ fontWeight: 600, color: "#dc2626" }}>Could not load utilization data</div>
      <div style={{ fontSize: 13, color: "#64748b" }}>{error}</div>
    </div>
  );

  const hasFilters = nameSearch || countyFilter !== "All";

  return (
    <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>

      {/* Filter buttons — Action Needed / Monitor / Good / All */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { key: "all",    label: "All",            count: stats.total,  level: null    },
          { key: "red",    label: "Action Needed",  count: stats.red,    level: "red"   },
          { key: "yellow", label: "Monitor",        count: stats.yellow, level: "yellow"},
          { key: "green",  label: "Good",           count: stats.green,  level: "green" },
        ].map(({ key, label, count, level }) => {
          const active = levelFilter === key;
          return (
            <button key={key} onClick={() => setLevelFilter(key)}
              style={{
                border: `1.5px solid ${active ? (level === "red" ? "#ef4444" : level === "yellow" ? "#eab308" : level === "green" ? "#22c55e" : "#3b82f6") : "#e2e8f0"}`,
                background: active ? (level === "red" ? "#fee2e2" : level === "yellow" ? "#fef9c3" : level === "green" ? "#dcfce7" : "#eff6ff") : "white",
                color: active ? (level === "red" ? "#b91c1c" : level === "yellow" ? "#854d0e" : level === "green" ? "#166534" : "#1d4ed8") : "#64748b",
                borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: active ? 700 : 500,
                cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
              }}>
              {label}
              <span style={{ fontWeight: 700 }}>{count}</span>
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>
          {filtered.length} of {stats.total} clients
        </span>
      </div>

      {/* Search + county filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search by name…"
          value={nameSearch}
          onChange={e => setNameSearch(e.target.value)}
          style={{
            border: `1.5px solid ${nameSearch ? "#3b82f6" : "#e2e8f0"}`,
            background: nameSearch ? "#eff6ff" : "white",
            borderRadius: 8, padding: "7px 12px", fontSize: 13, width: 210,
            fontFamily: "inherit", outline: "none",
          }}
        />
        <select value={countyFilter} onChange={e => setCountyFilter(e.target.value)}
          style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", background: "white", cursor: "pointer" }}>
          {counties.map(c => <option key={c}>{c}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setNameSearch(""); setCountyFilter("All"); }}
            style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: 13, background: "white", cursor: "pointer", color: "#64748b", fontFamily: "inherit" }}>
            Clear
          </button>
        )}
      </div>

      {/* Active client cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8", fontSize: 14 }}>
          No clients match the current filters.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(370px, 1fr))", gap: 14, marginBottom: 32 }}>
          {filtered.map(client => <ClientCard key={client.name} client={client} />)}
        </div>
      )}

      {/* Ended with unused funds — collapsible section */}
      {endedClients.length > 0 && (
        <div>
          <button onClick={() => setShowEnded(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 8, background: "none",
              border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 16px",
              fontSize: 13, fontWeight: 600, color: "#64748b", cursor: "pointer",
              fontFamily: "inherit", marginBottom: showEnded ? 14 : 0,
            }}>
            <span style={{ fontSize: 11 }}>{showEnded ? "▾" : "▸"}</span>
            Ended — Unused Funding ({endedClients.length} clients)
            <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>Service period ended, funding not fully used</span>
          </button>
          {showEnded && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(370px, 1fr))", gap: 12 }}>
              {endedClients.map(client => <EndedCard key={client.name} client={client} />)}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
