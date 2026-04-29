import React, { useState, useEffect, useMemo } from "react";

const API = import.meta.env.VITE_BILLING_API_URL || "http://localhost:8000";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt$(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n);
}
function fmtNum(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}
function fmtPct(a, b) {
  if (!b || b === 0) return "—";
  const p = ((a - b) / Math.abs(b)) * 100;
  return (p >= 0 ? "+" : "") + p.toFixed(1) + "%";
}
function weekLabel(w) {
  if (!w) return "";
  const d = new Date(w);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#3b82f6", height = 40 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120, h = height;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ── Line chart ────────────────────────────────────────────────────────────────
function LineChart({ weeks, height = 220 }) {
  if (!weeks || weeks.length === 0) return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
      No data
    </div>
  );

  const W = "100%", H = height;
  const PAD = { top: 16, right: 16, bottom: 40, left: 64 };
  const billed = weeks.map(w => Number(w.total_billed) || 0);
  const missed = weeks.map(w => Number(w.missed_revenue) || 0);
  const allVals = [...billed, ...missed];
  const maxV = Math.max(...allVals) || 1;

  // Normalise to viewBox 0..1000 x 0..H
  const VW = 1000;
  const innerW = VW - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  function toX(i) { return PAD.left + (i / (weeks.length - 1)) * innerW; }
  function toY(v) { return PAD.top + innerH - (v / maxV) * innerH; }

  function polyPts(vals) {
    return vals.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  }

  // Y axis ticks
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    v: t * maxV,
    y: toY(t * maxV),
  }));

  // X axis labels (every ~4 weeks)
  const step = Math.max(1, Math.floor(weeks.length / 8));
  const xLabels = weeks
    .map((w, i) => ({ i, label: weekLabel(w.attendance_week) }))
    .filter((_, i) => i % step === 0);

  return (
    <svg viewBox={`0 0 ${VW} ${H}`} width="100%" height={H} style={{ overflow: "visible" }}>
      {/* Grid lines */}
      {ticks.map(t => (
        <g key={t.v}>
          <line x1={PAD.left} y1={t.y} x2={VW - PAD.right} y2={t.y}
            stroke="#e5e7eb" strokeWidth="1" />
          <text x={PAD.left - 8} y={t.y + 4} textAnchor="end"
            fontSize="11" fill="#9ca3af">
            {fmt$(t.v)}
          </text>
        </g>
      ))}

      {/* Missed revenue area */}
      <polyline points={polyPts(missed)} fill="none"
        stroke="#f87171" strokeWidth="2" strokeDasharray="4 3"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* Billed line */}
      <polyline points={polyPts(billed)} fill="none"
        stroke="#3b82f6" strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* X labels */}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={toX(i)} y={H - 8} textAnchor="middle"
          fontSize="11" fill="#9ca3af">
          {label}
        </text>
      ))}

      {/* Legend */}
      <circle cx={PAD.left + 12} cy={PAD.top - 4} r="4" fill="#3b82f6" />
      <text x={PAD.left + 20} y={PAD.top} fontSize="11" fill="#6b7280">Weekly Billed</text>
      <line x1={PAD.left + 100} y1={PAD.top - 4} x2={PAD.left + 116} y2={PAD.top - 4}
        stroke="#f87171" strokeWidth="2" strokeDasharray="4 3" />
      <text x={PAD.left + 120} y={PAD.top} fontSize="11" fill="#6b7280">Missed Rev</text>
    </svg>
  );
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, sparkData, sparkColor, accent }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "20px 24px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6",
      display: "flex", flexDirection: "column", gap: 4,
      borderTop: `3px solid ${accent || "#3b82f6"}`,
    }}>
      <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#111827", letterSpacing: "-0.5px" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af" }}>{sub}</div>}
      {sparkData && <div style={{ marginTop: 8 }}><Sparkline data={sparkData} color={sparkColor} /></div>}
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function BillingDashboard({ userRole = "manager" }) {
  const [summary, setSummary]     = useState(null);
  const [centers, setCenters]     = useState([]);
  const [weekly, setWeekly]       = useState([]);
  const [errors, setErrors]       = useState([]);
  const [earlyDepartures, setED]  = useState([]);   // admin-only review flag
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [tab, setTab]             = useState("overview");   // overview | weekly | errors | early-departures
  const [startDate, setStart]     = useState("");
  const [endDate, setEnd]         = useState("");

  function buildQS() {
    const p = new URLSearchParams();
    if (startDate) p.set("start", startDate);
    if (endDate)   p.set("end",   endDate);
    return p.toString() ? `?${p}` : "";
  }

  async function fetchAll() {
    setLoading(true);
    setError(null);
    const qs = buildQS();
    try {
      // Always-on endpoints
      const corePromises = [
        fetch(`${API}/api/billing/summary${qs}`).then(r => r.json()),
        fetch(`${API}/api/billing/by-center${qs}`).then(r => r.json()),
        fetch(`${API}/api/billing/weekly${qs}`).then(r => r.json()),
        fetch(`${API}/api/billing/errors${qs}`).then(r => r.json()),
      ];
      // Admin-only — skip the call entirely for non-admins so we don't
      // even hit the endpoint from staff browsers.
      if (userRole === "admin") {
        corePromises.push(fetch(`${API}/api/billing/early-departures${qs}`).then(r => r.json()));
      }
      const results = await Promise.all(corePromises);
      const [s, c, w, e, ed] = results;
      setSummary(s);
      setCenters(c);
      setWeekly(w);
      setErrors(e);
      setED(Array.isArray(ed) ? ed : []);
    } catch (err) {
      console.error("Billing API fetch failed:", err);
      setError("Could not reach billing API.");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAll(); }, []);

  // Rolling averages for the weekly chart KPIs
  const weeklyKPIs = useMemo(() => {
    if (!weekly.length) return null;
    const last = weekly[weekly.length - 1];
    const recent4 = weekly.slice(-4);
    const recent12 = weekly.slice(-12);
    const avg4  = recent4.reduce((s, w) => s + Number(w.total_billed), 0) / recent4.length;
    const avg12 = recent12.reduce((s, w) => s + Number(w.total_billed), 0) / recent12.length;
    const allAvg = weekly.reduce((s, w) => s + Number(w.total_billed), 0) / weekly.length;
    return { last: Number(last.total_billed), avg4, avg12, allAvg };
  }, [weekly]);

  const billedSparkline = weekly.map(w => Number(w.total_billed) || 0);
  const missedSparkline = weekly.map(w => Number(w.missed_revenue) || 0);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300, color: "#9ca3af" }}>
      Loading billing data…
    </div>
  );

  if (error) return (
    <div style={{ padding: 32, textAlign: "center", color: "#ef4444" }}>
      <div style={{ fontSize: 20, marginBottom: 8 }}>⚠️ {error}</div>
      <div style={{ fontSize: 13, color: "#9ca3af" }}>
        Start the backend: <code>uvicorn backend.main:app --reload</code> from the Dev folder.
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", background: "#f9fafb", minHeight: "100vh", padding: "24px 32px" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#111827" }}>Billing Overview</h1>
          <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
            {summary?.earliest_date && summary?.latest_date
              ? `${summary.earliest_date} — ${summary.latest_date}`
              : "All dates"}
          </div>
        </div>

        {/* Date filter */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={startDate} onChange={e => setStart(e.target.value)}
            style={inputStyle} />
          <span style={{ color: "#9ca3af" }}>to</span>
          <input type="date" value={endDate} onChange={e => setEnd(e.target.value)}
            style={inputStyle} />
          <button onClick={fetchAll} style={btnStyle}>Apply</button>
          <button onClick={() => { setStart(""); setEnd(""); setTimeout(fetchAll, 0); }}
            style={{ ...btnStyle, background: "#f3f4f6", color: "#374151" }}>
            Clear
          </button>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <KPICard label="Total Billed"     value={fmt$(summary?.total_billed)}
          sub={`${fmtNum(summary?.attendance_days)} service days`}
          sparkData={billedSparkline} sparkColor="#3b82f6" accent="#3b82f6" />
        <KPICard label="Attendance Days"  value={fmtNum(summary?.attendance_days)}
          sub={`${fmtNum(summary?.unique_clients)} unique clients`}
          accent="#10b981" />
        <KPICard label="Missed Revenue"   value={fmt$(summary?.total_missed_revenue)}
          sub="Unbilled 15-min units"
          sparkData={missedSparkline} sparkColor="#f87171" accent="#f87171" />
        <KPICard label="Billing Errors"   value={fmtNum(errors.length)}
          sub={`${errors.filter(e => e.error_type === "Transport Error").length} transport · ${errors.filter(e => e.error_type === "Invalid Units").length} invalid units`}
          accent="#f59e0b" />
        {userRole === "admin" && (
          <KPICard label="Early Departures" value={fmtNum(earlyDepartures.length)}
            sub="2 trips + 3-19 service units · review needed"
            accent="#a855f7" />
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: "2px solid #e5e7eb" }}>
        {[
          ["overview", "By Center"],
          ["weekly",   "Weekly Trend"],
          ...(userRole === "admin" ? [["errors", "Errors"], ["early-departures", "Early Departures"]] : []),
        ].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "8px 18px", fontSize: 14, fontWeight: tab === id ? 600 : 400,
            color: tab === id ? "#3b82f6" : "#6b7280",
            background: "none", border: "none", cursor: "pointer",
            borderBottom: tab === id ? "2px solid #3b82f6" : "2px solid transparent",
            marginBottom: -2,
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab: by-center table ── */}
      {tab === "overview" && (
        <div style={cardStyle}>
          <div style={cardHeadStyle}>Billing by Cost Center</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                  {["Center", "Total Billed", "Missed Rev", "RPC", "Att. Count"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {centers.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: "#111827" }}>{c.cost_center || "—"}</td>
                    <td style={tdStyle}>{fmt$(c.total_billed)}</td>
                    <td style={{ ...tdStyle, color: c.missed_revenue > 0 ? "#ef4444" : "#111827" }}>
                      {fmt$(c.missed_revenue)}
                    </td>
                    <td style={tdStyle}>{fmt$(c.rpc)}</td>
                    <td style={tdStyle}>{fmtNum(c.attendance_count)}</td>
                  </tr>
                ))}
                {/* Total row */}
                <tr style={{ borderTop: "2px solid #e5e7eb", fontWeight: 700, background: "#f9fafb" }}>
                  <td style={tdStyle}>Total</td>
                  <td style={tdStyle}>{fmt$(centers.reduce((s, c) => s + Number(c.total_billed), 0))}</td>
                  <td style={{ ...tdStyle, color: "#ef4444" }}>{fmt$(centers.reduce((s, c) => s + Number(c.missed_revenue), 0))}</td>
                  <td style={tdStyle}>—</td>
                  <td style={tdStyle}>{fmtNum(centers.reduce((s, c) => s + Number(c.attendance_count), 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Weekly tab ── */}
      {tab === "weekly" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Rolling avg KPI row */}
          {weeklyKPIs && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              <KPICard label="Last Week"        value={fmt$(weeklyKPIs.last)}  accent="#3b82f6" />
              <KPICard label="Avg Last Month"   value={fmt$(weeklyKPIs.avg4)}
                sub={fmtPct(weeklyKPIs.last, weeklyKPIs.avg4) + " vs last week"} accent="#8b5cf6" />
              <KPICard label="Avg Last 3 Months" value={fmt$(weeklyKPIs.avg12)} accent="#10b981" />
              <KPICard label="All-Time Avg"     value={fmt$(weeklyKPIs.allAvg)} accent="#f59e0b" />
            </div>
          )}

          {/* Line chart */}
          <div style={cardStyle}>
            <div style={cardHeadStyle}>Weekly Billing Trend</div>
            <LineChart weeks={weekly} height={220} />
          </div>

          {/* Weekly detail table */}
          <div style={cardStyle}>
            <div style={cardHeadStyle}>Week-by-Week Detail</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                    {["Week", "Total Billed", "Adult Day", "NMT", "Missed Rev", "Units", "Errors"].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...weekly].reverse().map((w, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{weekLabel(w.attendance_week)}</td>
                      <td style={tdStyle}>{fmt$(w.total_billed)}</td>
                      <td style={tdStyle}>{fmt$(w.adult_day_billed)}</td>
                      <td style={tdStyle}>{fmt$(w.nmt_billed)}</td>
                      <td style={{ ...tdStyle, color: Number(w.missed_revenue) > 0 ? "#ef4444" : "#111827" }}>
                        {fmt$(w.missed_revenue)}
                      </td>
                      <td style={tdStyle}>{fmtNum(w.total_units)}</td>
                      <td style={{ ...tdStyle, color: (Number(w.transport_errors) + Number(w.invalid_units)) > 0 ? "#f59e0b" : "#111827" }}>
                        {Number(w.transport_errors) + Number(w.invalid_units)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Errors tab ── */}
      {tab === "errors" && (
        <div style={cardStyle}>
          <div style={cardHeadStyle}>Billing Errors ({errors.length})</div>
          {errors.length === 0
            ? <div style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>No errors found ✅</div>
            : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                      {["Type", "Client", "Date", "Code", "Center", "Units", "Billed"].map(h => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((e, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}
                        onMouseEnter={r => r.currentTarget.style.background = "#fef9f0"}
                        onMouseLeave={r => r.currentTarget.style.background = ""}>
                        <td style={{ ...tdStyle }}>
                          <span style={{
                            padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: e.error_type === "Transport Error" ? "#fef3c7" : "#fee2e2",
                            color:      e.error_type === "Transport Error" ? "#92400e" : "#991b1b",
                          }}>
                            {e.error_type}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{e.client_name}</td>
                        <td style={tdStyle}>{e.attendance_date}</td>
                        <td style={tdStyle}><code>{e.service_code}</code></td>
                        <td style={tdStyle}>{e.cost_center}</td>
                        <td style={tdStyle}>{e.units}</td>
                        <td style={tdStyle}>{fmt$(e.billed_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* ── Early Departures tab (admin only) ── */}
      {tab === "early-departures" && userRole === "admin" && (() => {
        // Roll up by center for the summary strip
        const byCenter = earlyDepartures.reduce((acc, r) => {
          const k = r.cost_center || "Unknown";
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {});
        const byClient = earlyDepartures.reduce((acc, r) => {
          acc[r.client_name] = (acc[r.client_name] || 0) + 1;
          return acc;
        }, {});
        const topClients = Object.entries(byClient)
          .sort((a, b) => b[1] - a[1])
          .filter(([, n]) => n >= 2)   // surface repeat offenders only
          .slice(0, 5);

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Plain-language explainer */}
            <div style={{
              ...cardStyle, padding: "14px 20px", fontSize: 13, color: "#374151",
              borderLeft: "4px solid #a855f7",
            }}>
              <strong style={{ color: "#6b21a8" }}>Heads-up, not an error.</strong>{" "}
              These are client-days with a full round trip (2 NMT trips) but only
              3-19 units of day-service billed — meaning the client was likely
              picked up but driven home before the day was over. Worth a
              conversation with the driver or center manager, not a billing
              correction.
            </div>

            {/* By-center summary */}
            {earlyDepartures.length > 0 && (
              <div style={cardStyle}>
                <div style={cardHeadStyle}>Flags by Center</div>
                <div style={{ padding: "8px 12px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {Object.entries(byCenter)
                    .sort((a, b) => b[1] - a[1])
                    .map(([center, n]) => (
                      <span key={center} style={{
                        padding: "4px 12px", borderRadius: 16, fontSize: 12,
                        background: "#f3e8ff", color: "#6b21a8", fontWeight: 600,
                      }}>
                        {center}: {n}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Repeat-offender callout */}
            {topClients.length > 0 && (
              <div style={cardStyle}>
                <div style={cardHeadStyle}>Repeat Flags (2+ days in this window)</div>
                <div style={{ padding: "8px 12px" }}>
                  {topClients.map(([client, n]) => (
                    <div key={client} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "6px 8px", fontSize: 13,
                      borderBottom: "1px solid #f3f4f6",
                    }}>
                      <span style={{ fontWeight: 500 }}>{client}</span>
                      <span style={{ color: "#a855f7", fontWeight: 600 }}>{n} days</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detail table */}
            <div style={cardStyle}>
              <div style={cardHeadStyle}>
                Early Departures ({earlyDepartures.length})
              </div>
              {earlyDepartures.length === 0
                ? <div style={{ padding: 32, textAlign: "center", color: "#9ca3af" }}>
                    No flags in this window ✅
                  </div>
                : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                          {["Date", "Client", "Center", "Trip Units", "Service Units"].map(h => (
                            <th key={h} style={thStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {earlyDepartures.map((r, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}
                            onMouseEnter={ev => ev.currentTarget.style.background = "#faf5ff"}
                            onMouseLeave={ev => ev.currentTarget.style.background = ""}>
                            <td style={tdStyle}>{r.attendance_date}</td>
                            <td style={{ ...tdStyle, fontWeight: 500 }}>{r.client_name}</td>
                            <td style={tdStyle}>{r.cost_center}</td>
                            <td style={tdStyle}>{Number(r.trip_units)}</td>
                            <td style={tdStyle}>{Number(r.service_units)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const cardStyle = {
  background: "#fff", borderRadius: 12, overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f3f4f6",
};
const cardHeadStyle = {
  padding: "16px 20px", fontWeight: 600, fontSize: 15, color: "#374151",
  borderBottom: "1px solid #f3f4f6",
};
const thStyle = {
  padding: "10px 16px", textAlign: "left", fontSize: 12,
  fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em",
};
const tdStyle = {
  padding: "11px 16px", color: "#374151",
};
const inputStyle = {
  padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db",
  fontSize: 13, color: "#374151", background: "#fff",
};
const btnStyle = {
  padding: "6px 14px", borderRadius: 6,
  background: "#1a2d4d", color: "#fff", border: "none",
  fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};
