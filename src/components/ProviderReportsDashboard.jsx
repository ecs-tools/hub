import React, { useState, useEffect, useMemo } from "react";

// Same backend base the BillingDashboard uses.
const API = import.meta.env.VITE_BILLING_API_URL || "https://web-production-3b1f4.up.railway.app";

const REPORT_ORDER = ["errors", "claims", "invoices", "denied"];

// Columns hidden from each report's table — VIEW ONLY. The API still returns
// them and the database is untouched; this just declutters the display. Keys are
// the backend column names (see PROVIDER_REPORTS in backend/main.py).
const HIDDEN_COLUMNS = {
  errors:   ["billing_number", "contract_number", "units_billed"],
  claims:   ["medicaid_billing_number"],
  invoices: ["code", "provider", "acuity"],
  denied:   ["medicaid_billing_number"],
};

// Cap how many rows we render to the DOM at once. A cycle can have thousands of
// rows; painting them all freezes the browser ("not responding"). The data is
// still all there — narrow with the cycle filter or the client search box.
const RENDER_CAP = 500;

// snake_case column name -> "Title Case" header.
function titleCase(s) {
  return String(s)
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bId\b/, "ID");
}

// Right-align numeric-looking columns; render money/number cleanly.
const NUMERIC_HINT = /(rate|amount|billed|units?|unit|count)/i;

function fmtCell(col, val) {
  if (val == null || val === "") return "—";
  if (/rate|amount|billed/i.test(col) && !isNaN(Number(val))) {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 2,
    }).format(Number(val));
  }
  return String(val);
}

function lastPulled(iso) {
  if (!iso) return "never";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function ProviderReportsDashboard({ onBack }) {
  const [meta, setMeta] = useState(null);
  const [report, setReport] = useState("errors");
  const [cycle, setCycle] = useState("");
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");

  // Load metadata (report types, cycles, last-pulled) once on mount.
  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/dashboards/provider-reports/meta`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => { if (alive) { setMeta(d); setLoadingMeta(false); } })
      .catch(() => { if (alive) { setError("Could not load report metadata. Are you signed in?"); setLoadingMeta(false); } });
    return () => { alive = false; };
  }, []);

  // Default the cycle selector to the newest available for the chosen report.
  useEffect(() => {
    if (!meta) return;
    const cycles = meta.reports?.[report]?.cycles || [];
    setCycle(cycles[0] || "");
  }, [report, meta]);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Fetch rows whenever report, cycle, or the (debounced) search term changes.
  useEffect(() => {
    if (!cycle) { setRows([]); return; }
    let alive = true;
    setLoadingData(true);
    setError("");
    const params = new URLSearchParams({ report });
    if (cycle !== "ALL") params.set("cycle", cycle);
    if (debouncedQ) params.set("q", debouncedQ);
    fetch(`${API}/api/dashboards/provider-reports/data?${params.toString()}`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(d => { if (alive) { setRows(Array.isArray(d) ? d : []); setLoadingData(false); } })
      .catch(() => { if (alive) { setError("Could not load report data."); setLoadingData(false); } });
    return () => { alive = false; };
  }, [report, cycle, debouncedQ]);

  const reports = meta?.reports || {};
  const tabs = REPORT_ORDER.filter(k => reports[k]);
  const info = reports[report];
  const cycles = info?.cycles || [];
  const hidden = HIDDEN_COLUMNS[report] || [];
  const columns = (rows.length ? Object.keys(rows[0]) : []).filter(c => !hidden.includes(c));

  const card = {
    background: "white", border: "1px solid var(--border)", borderRadius: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
  };

  return (
    <div className="page-anim" style={{ padding: "28px 36px", maxWidth: 1300, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "0 0 6px" }}>
          DODD · Provider Weekly Reports
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--navy)", letterSpacing: "-0.4px", margin: "0 0 6px" }}>
          Provider Reports
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
          Read-only view of the Medicaid billing reports loaded each cycle from the eMBS portal.
        </p>
      </div>

      {error && (
        <div style={{ ...card, borderColor: "#fca5a5", background: "#fef2f2", color: "#991b1b", padding: "12px 16px", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Report type tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(tabs.length ? tabs : REPORT_ORDER).map(k => {
          const active = k === report;
          const label = reports[k]?.label || titleCase(k);
          const count = reports[k]?.rows;
          return (
            <button
              key={k}
              onClick={() => setReport(k)}
              style={{
                background: active ? "var(--navy)" : "white",
                color: active ? "white" : "var(--text-1)",
                border: `1.5px solid ${active ? "var(--navy)" : "var(--border)"}`,
                borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {label}
              {typeof count === "number" && (
                <span style={{ marginLeft: 7, fontSize: 11, fontWeight: 500, opacity: 0.7 }}>
                  {new Intl.NumberFormat("en-US").format(count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cycle selector + last pulled */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        <label style={{ fontSize: 13, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 8 }}>
          Billing cycle
          <select
            value={cycle}
            onChange={e => setCycle(e.target.value)}
            disabled={!cycles.length}
            style={{ fontSize: 13, fontWeight: 600, border: "1.5px solid var(--border)", borderRadius: 6, padding: "5px 10px", background: "white", color: "var(--navy)", cursor: "pointer", fontFamily: "inherit" }}
          >
            {cycles.length === 0 && <option value="">—</option>}
            {cycles.length > 0 && <option value="ALL">All cycles</option>}
            {cycles.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        {/* Client search */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search client name…"
            style={{ fontSize: 13, border: "1.5px solid var(--border)", borderRadius: 6, padding: "5px 10px", width: 200, fontFamily: "inherit", color: "var(--text-1)" }}
          />
          {q && (
            <button
              onClick={() => setQ("")}
              title="Clear search"
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 9px", fontSize: 12, color: "var(--text-2)", cursor: "pointer", fontFamily: "inherit" }}
            >
              Clear
            </button>
          )}
        </div>

        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
          Last pulled: <strong style={{ color: "var(--text-2)", fontWeight: 600 }}>{lastPulled(info?.last_loaded)}</strong>
        </span>
        <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: "auto" }}>
          {loadingData
            ? "Loading…"
            : rows.length > RENDER_CAP
              ? `Showing ${RENDER_CAP.toLocaleString()} of ${rows.length.toLocaleString()} — narrow with cycle or search`
              : `${rows.length.toLocaleString()} row${rows.length === 1 ? "" : "s"}`}
        </span>
      </div>

      {/* Table */}
      <div style={{ ...card, overflow: "hidden" }}>
        {loadingMeta ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-2)", fontSize: 13 }}>Loading…</div>
        ) : rows.length === 0 && !loadingData ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No rows for this report and cycle.
          </div>
        ) : (
          <div style={{ overflow: "auto", maxHeight: "62vh" }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5 }}>
              <thead>
                <tr>
                  {columns.map(c => (
                    <th key={c} style={{
                      position: "sticky", top: 0, zIndex: 1,
                      background: "var(--bg-soft)", borderBottom: "1px solid var(--border)",
                      textAlign: NUMERIC_HINT.test(c) ? "right" : "left",
                      padding: "9px 12px", fontSize: 11, fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.4px", color: "var(--text-2)",
                      whiteSpace: "nowrap",
                    }}>
                      {titleCase(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, RENDER_CAP).map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                    {columns.map(c => (
                      <td key={c} style={{
                        padding: "8px 12px", color: "var(--text-1)",
                        textAlign: NUMERIC_HINT.test(c) ? "right" : "left",
                        whiteSpace: c === "error_text" ? "normal" : "nowrap",
                        maxWidth: c === "error_text" ? 360 : undefined,
                      }}>
                        {fmtCell(c, row[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
