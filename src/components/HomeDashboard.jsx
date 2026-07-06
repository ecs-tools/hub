import React, { useMemo } from "react";
// makeKey MUST come from utils/tracker.js: statuses are keyed by its output
// (the rows' assigned _key). The private copy this file used to have built
// keys in a different format, so every status lookup missed and the Home
// cards counted all errors as open regardless of what managers marked.
import { makeKey, centerName } from "../utils/tracker.js";

// ── Local helpers ─────────────────────────────────────────────────────────────
function startOfWeek() {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); return d;
}
function startOfMonth() {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
}

// ── Tiny sub-components ───────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent, onClick }) {
  return (
    <div onClick={onClick} style={{ background: "#fff", border: "1px solid #e9e9e7", borderRadius: 10, padding: "18px 20px", cursor: onClick ? "pointer" : "default", transition: "box-shadow 0.12s" }}
      onMouseOver={e => { if(onClick) e.currentTarget.style.boxShadow = "0 2px 12px rgba(26,45,77,0.1)"; }}
      onMouseOut={e => { e.currentTarget.style.boxShadow = "none"; }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", color: "#9b9a97", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent || "#1a2d4d", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#6b6b6b", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2d4d", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</div>
      {action && <button onClick={onAction} style={{ background: "none", border: "none", fontSize: 12, color: "#4a7ab5", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>{action} →</button>}
    </div>
  );
}

// Horizontal "label · bar · count" row used for both Centers and Error Types.
function BarRow({ label, count, max, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a", width: 110, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ flex: 1, height: 6, background: "#e9e9e7", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${max > 0 ? Math.round((count / max) * 100) : 0}%`, background: color, borderRadius: 3 }} />
      </div>
      <div style={{ fontSize: 12, color: "#6b6b6b", width: 24, textAlign: "right", flexShrink: 0 }}>{count}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HomeDashboard({ rawData, statuses, onNavigate }) {

  // ── Billing-error metrics (the whole home is built on these) ───────────────
  const m = useMemo(() => {
    if (!rawData || !rawData.length) return null;
    const weekStart = startOfWeek();
    const monthStart = startOfMonth();
    const totalErrors = rawData.length;
    let weekErrors = 0, monthErrors = 0, openErrors = 0, fixedErrors = 0, disputedErrors = 0;
    const centerCounts = {}, categoryCounts = {};
    const weekClients = new Set(), monthClients = new Set();

    rawData.forEach((row, idx) => {
      const status = statuses[makeKey(row, idx)] || "open";
      if (status === "open") openErrors++;
      else if (status === "fixed") fixedErrors++;
      else if (status === "disputed") disputedErrors++;

      const date = row.date ? new Date(row.date) : null;
      if (date) {
        if (date >= weekStart) { weekErrors++; weekClients.add(row.name); }
        if (date >= monthStart) { monthErrors++; monthClients.add(row.name); }
      }

      const center = centerName(row.location) || "Unknown";
      centerCounts[center] = (centerCounts[center] || 0) + 1;

      const cat = row.reason ? (row.reason.length > 32 ? row.reason.slice(0, 32) + "…" : row.reason) : "Other";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    // "fixed" + "disputed" both count as worked/resolved, matching the tracker.
    const resolved = fixedErrors + disputedErrors;
    const resolutionRate = totalErrors > 0 ? Math.round((resolved / totalErrors) * 100) : 0;
    const topCenters = Object.entries(centerCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      totalErrors, weekErrors, monthErrors, openErrors, fixedErrors, disputedErrors,
      resolved, resolutionRate, topCenters, topCategories,
      weekClients: weekClients.size, monthClients: monthClients.size,
    };
  }, [rawData, statuses]);

  const goTracker = () => onNavigate("tracker");

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1100 }}>

      {/* ── Top: error-focused stat cards ─────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <StatCard label="Open Billing Errors" value={m ? m.openErrors : "—"}
          accent={m && m.openErrors > 10 ? "#dc2626" : "#1a2d4d"}
          sub={m ? `${m.totalErrors} total logged` : ""}
          onClick={goTracker} />
        <StatCard label="This Week" value={m ? m.weekErrors : "—"}
          sub={m ? `${m.weekClients} clients affected` : ""}
          onClick={goTracker} />
        <StatCard label="This Month" value={m ? m.monthErrors : "—"}
          sub={m ? `${m.monthClients} clients affected` : ""}
          onClick={goTracker} />
        <StatCard label="Resolution Rate" value={m ? `${m.resolutionRate}%` : "—"}
          accent={m ? (m.resolutionRate >= 70 ? "#166534" : "#d97706") : "#1a2d4d"}
          sub={m ? `${m.resolved} of ${m.totalErrors} resolved` : ""}
          onClick={goTracker} />
      </div>

      {/* ── Billing error summary ─────────────────────────────────────────── */}
      <div style={{ background: "#fff", border: "1px solid #e9e9e7", borderRadius: 10, padding: "22px 24px" }}>
        <SectionHeader title="Billing Error Summary" action="Open Tracker" onAction={goTracker} />

        {!m ? (
          <div style={{ color: "#9b9a97", fontSize: 13 }}>
            No billing data loaded yet. Upload a weekly report in the Error Tracker to see the summary.
          </div>
        ) : (
          <div>
            {/* Resolution bar */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: "#6b6b6b", fontWeight: 500 }}>Resolution progress</span>
                <span style={{ fontWeight: 700, color: m.resolutionRate >= 70 ? "#166534" : "#d97706" }}>{m.resolutionRate}%</span>
              </div>
              <div style={{ height: 6, background: "#e9e9e7", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${m.resolutionRate}%`, background: m.resolutionRate >= 70 ? "#22c55e" : "#f59e0b", borderRadius: 3, transition: "width 0.4s ease" }} />
              </div>
              <div style={{ fontSize: 11, color: "#9b9a97", marginTop: 5 }}>
                {m.openErrors} open · {m.disputedErrors} disputed · {m.fixedErrors} fixed
              </div>
            </div>

            {/* Two columns: Errors by Center / Top Error Types */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", color: "#9b9a97", marginBottom: 10 }}>Errors by Center</div>
                {m.topCenters.length === 0 ? (
                  <div style={{ color: "#9b9a97", fontSize: 13 }}>No errors logged.</div>
                ) : (
                  m.topCenters.map(([center, count]) => (
                    <BarRow key={center} label={center} count={count} max={m.topCenters[0][1]} color="#1a2d4d" />
                  ))
                )}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.6px", color: "#9b9a97", marginBottom: 10 }}>Top Error Types</div>
                {m.topCategories.length === 0 ? (
                  <div style={{ color: "#9b9a97", fontSize: 13 }}>No errors logged.</div>
                ) : (
                  m.topCategories.map(([cat, count]) => (
                    <BarRow key={cat} label={cat} count={count} max={m.topCategories[0][1]} color="#4a7ab5" />
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
