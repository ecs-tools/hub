import React, { useState, useEffect, useCallback } from "react";
import { API_BASE } from "../config/api.js";

// Pipeline Health (admin): one screen showing every pipeline's status —
// what ran, what failed, how fresh the data is, and live progress of
// on-demand Refresh runs. Reads GET /api/ops/health (see backend
// ops_health.py); polls every 30s, tightening to 8s while a run is active.

const STATUS_STYLE = {
  ok:      { bg: "#dcfce7", fg: "#166534", label: "OK" },
  running: { bg: "#dbeafe", fg: "#1d4ed8", label: "Running" },
  due:     { bg: "#fef9c3", fg: "#92400e", label: "Due" },
  late:    { bg: "#fee2e2", fg: "#b91c1c", label: "Late" },
  failed:  { bg: "#fee2e2", fg: "#b91c1c", label: "Failed" },
  unknown: { bg: "var(--bg-soft)", fg: "var(--text-3)", label: "No data" },
};

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.unknown;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", background: s.bg, color: s.fg, padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function ago(iso) {
  if (!iso) return "never";
  const secs = (Date.now() - new Date(iso).getTime()) / 1000;
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.round(secs / 60)} min ago`;
  if (secs < 172800) return `${Math.round(secs / 3600)} h ago`;
  return `${Math.round(secs / 86400)} d ago`;
}

function fmtDur(secs) {
  if (secs == null) return "—";
  if (secs < 90) return `${Math.round(secs)}s`;
  return `${Math.round(secs / 60)} min`;
}

function fmtWhen(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const th = { textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-3)", padding: "8px 12px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
const td = { fontSize: 13, color: "var(--text-2)", padding: "8px 12px", borderBottom: "1px solid var(--border)", verticalAlign: "top" };

function SectionTitle({ children }) {
  return <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "28px 0 10px" }}>{children}</p>;
}

function ProgressBar({ value }) {
  return (
    <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 6, height: 8, overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${Math.round((value ?? 0) * 100)}%`, height: "100%", background: "#1d4ed8", transition: "width 1s ease" }} />
    </div>
  );
}

export default function OpsDashboard() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/ops/health`, { credentials: "include" });
      if (r.status === 401 || r.status === 403) { setError("admin"); return; }
      if (!r.ok) throw new Error(String(r.status));
      setHealth(await r.json());
      setError(null);
      setFetchedAt(Date.now());
    } catch {
      setError(prev => (prev === "admin" ? prev : "network"));
    }
  }, []);

  const hasActive = !!health?.refresh?.active?.length;
  useEffect(() => {
    load();
    const tid = setInterval(load, hasActive ? 8000 : 30000);
    return () => clearInterval(tid);
  }, [load, hasActive]);

  if (error === "admin") {
    return (
      <div className="page-anim" style={{ padding: "52px 44px", maxWidth: 640 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.4px", margin: "0 0 6px" }}>Pipeline Health</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)" }}>This dashboard is limited to administrators.</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="page-anim" style={{ padding: "52px 44px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.4px", margin: "0 0 6px" }}>Pipeline Health</h1>
        <p style={{ fontSize: 13, color: "var(--text-3)" }}>{error === "network" ? "Could not reach the server — retrying…" : "Loading…"}</p>
      </div>
    );
  }

  const { cards = [], refresh = {}, billing_history: billingHistory = [] } = health;
  const attention = health.overall === "attention";

  return (
    <div className="page-anim" style={{ padding: "36px 44px", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "0 0 8px" }}>Data Engineering</p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.4px", margin: "0 0 6px" }}>Pipeline Health</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: 0 }}>Every pipeline: what ran, what failed, and how fresh the data is.</p>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>
          Auto-refreshes · updated {fetchedAt ? ago(new Date(fetchedAt).toISOString()) : "…"}
        </div>
      </div>

      {attention && (
        <div style={{ marginTop: 18, background: "#fee2e2", border: "1.5px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 500 }}>
          Something needs attention — check the red/amber cards below.
          {refresh.stuck_queued > 0 && " A queued Refresh run has not been picked up — is the office PC on?"}
        </div>
      )}

      {/* Live runs */}
      {hasActive && (
        <>
          <SectionTitle>Running now</SectionTitle>
          {refresh.active.map(run => (
            <div key={run.id} style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <StatusPill status={run.status === "running" ? "running" : "due"} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>{run.pipeline}</span>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                  {run.status === "queued"
                    ? `queued ${ago(run.requested_at)} — waiting for the office PC runner`
                    : `started ${ago(run.started_at)}${run.expected_secs ? ` · usually takes ~${fmtDur(run.expected_secs)}` : ""}`}
                </span>
                {run.requested_by && <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: "auto" }}>by {run.requested_by}</span>}
              </div>
              {run.status === "running" && run.progress != null && <ProgressBar value={run.progress} />}
            </div>
          ))}
        </>
      )}

      {/* Health cards */}
      <SectionTitle>Pipelines</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {cards.map(c => (
          <div key={c.id} style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 10, padding: "16px 18px", position: "relative" }}>
            <div style={{ position: "absolute", top: 14, right: 14 }}><StatusPill status={c.status} /></div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 3, paddingRight: 70 }}>{c.label}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 10 }}>{c.cadence}</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{c.summary}</div>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>Last activity: {ago(c.last_event_at)}</div>
            {c.detail && (c.status === "failed" || !c.available) && (
              <div title={c.detail} style={{ marginTop: 8, fontSize: 12, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "6px 10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.detail}
              </div>
            )}
            {c.report_types && (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-3)", lineHeight: 1.7 }}>
                {Object.entries(c.report_types).map(([k, v]) => (
                  <div key={k}>{k}: {ago(v)}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent on-demand runs */}
      <SectionTitle>Recent Refresh runs (office-PC runner)</SectionTitle>
      {refresh.available === false ? (
        <p style={{ fontSize: 13, color: "var(--text-3)" }}>Run history is unavailable.</p>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 8 }}>
            Runner last picked up a job {ago(refresh.runner_last_pickup)}. Buttons queue a row; the office PC executes it within a minute while it is on.
          </div>
          <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
              <thead><tr>
                <th style={th}>Pipeline</th><th style={th}>Status</th><th style={th}>Requested</th>
                <th style={th}>By</th><th style={th}>Duration</th><th style={th}>Detail</th>
              </tr></thead>
              <tbody>
                {(refresh.recent || []).map(r => (
                  <tr key={r.id}>
                    <td style={{ ...td, fontWeight: 600, color: "var(--text-1)" }}>{r.pipeline}</td>
                    <td style={td}><StatusPill status={r.status === "success" ? "ok" : r.status === "expired" ? "late" : r.status === "queued" ? "due" : r.status} /></td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtWhen(r.requested_at)}</td>
                    <td style={td}>{r.requested_by || "—"}</td>
                    <td style={td}>{fmtDur(r.duration_secs)}</td>
                    <td style={{ ...td, maxWidth: 340 }} title={r.detail || ""}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340 }}>{r.detail || "—"}</div>
                    </td>
                  </tr>
                ))}
                {!(refresh.recent || []).length && (
                  <tr><td style={td} colSpan={6}>No runs yet — use the Refresh buttons in the Error Tracker or Provider Reports.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Weekly billing load history */}
      <SectionTitle>Weekly billing loads (last 10)</SectionTitle>
      <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 10 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
          <thead><tr>
            <th style={th}>Week of</th><th style={th}>Status</th><th style={th}>Rows</th>
            <th style={th}>Loaded</th><th style={th}>File</th>
          </tr></thead>
          <tbody>
            {billingHistory.map((b, i) => (
              <tr key={i}>
                <td style={{ ...td, fontWeight: 600, color: "var(--text-1)", whiteSpace: "nowrap" }}>{b.cycle_date}</td>
                <td style={td}><StatusPill status={b.status === "success" ? "ok" : b.status === "loading" ? "running" : "failed"} /></td>
                <td style={td}>{b.row_count != null ? b.row_count.toLocaleString() : "—"}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{fmtWhen(b.load_timestamp)}</td>
                <td style={{ ...td, maxWidth: 300 }} title={b.error_message || b.file_name}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 300 }}>{b.file_name}</div>
                </td>
              </tr>
            ))}
            {!billingHistory.length && <tr><td style={td} colSpan={5}>No billing loads recorded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 24, lineHeight: 1.6 }}>
        How to read this: the weekly pipelines run on the office PC via Task Scheduler and leave their results in the database — a card turns amber when a run is overdue and red when the last run failed or is very late. The fleet sync runs in the cloud every 30 minutes. The invoice generator is hand-run, so it never goes amber.
      </p>
    </div>
  );
}
