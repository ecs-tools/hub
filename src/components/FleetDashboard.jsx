import React, { useState, useEffect, useMemo } from "react";
import { API_BASE } from "../config/api.js";

// Migrated off SheetDB → FastAPI backend (Postgres). Same JSON shape as before,
// so the parsing below is unchanged; only the source URL differs.
const VEHICLE_LIST_URL = `${API_BASE}/api/fleet/vehicles`;
const MAINTENANCE_URL  = `${API_BASE}/api/fleet/maintenance`;

const PM = { oilMiles: 5000, brakesMiles: 15000, liftMonths: 6, inspectionMonths: 12 };
const CORRECTIVE_KEYWORDS = ["repair","replace","fix","broken","fail","damage","leak","accident","body","tire","engine","transmission"];

function parseCost(val) {
  if (!val && val !== 0) return 0;
  const n = parseFloat(String(val).replace(/[$,\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseDate(val) {
  if (!val) return null;
  const s = String(val).trim().replace(/\./g, "/");
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function monthsAgo(date) {
  if (!date) return null;
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
}

function last5(vin) {
  if (!vin) return "";
  return String(vin).trim().slice(-5).toUpperCase();
}

function isCorrectiveMaintenance(type, notes) {
  const text = `${type || ""} ${notes || ""}`.toLowerCase();
  return CORRECTIVE_KEYWORDS.some(k => text.includes(k));
}

// Returns { status, reasons[] } — reasons are human-readable alert lines
function getVehicleAlerts(events) {
  if (!events || events.length === 0) return { status: "unknown", reasons: [] };
  const byType = (kw) => events.filter(e => kw.some(k => (e.maintenanceType || "").toLowerCase().includes(k))).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  const lastOil  = byType(["oil"])[0];
  const lastLift = byType(["lift"])[0];
  const lastInsp = byType(["inspect","annual"])[0];
  const odomReadings = events.map(e => e.odometer).filter(Boolean).sort((a, b) => b - a);
  const currentOdo = odomReadings[0] || null;

  let worst = "green";
  const reasons = [];
  const flag = (c) => { if (c === "red") worst = "red"; else if (c === "yellow" && worst !== "red") worst = "yellow"; };

  // Oil change
  if (!lastOil) {
    flag("yellow");
    reasons.push("No oil change on record");
  } else if (currentOdo && lastOil.odometer) {
    const milesSince = currentOdo - lastOil.odometer;
    const remaining = PM.oilMiles - milesSince;
    if (milesSince >= PM.oilMiles) {
      flag("red");
      reasons.push(`Oil change: ${(milesSince - PM.oilMiles).toLocaleString()} mi overdue`);
    } else if (milesSince >= PM.oilMiles * 0.85) {
      flag("yellow");
      reasons.push(`Oil change: ${remaining.toLocaleString()} mi remaining`);
    }
  } else if (currentOdo && !lastOil.odometer) {
    flag("yellow");
    reasons.push("Oil change: odometer at last service unknown");
  }

  // Lift inspection
  if (lastLift) {
    const mo = monthsAgo(lastLift.date);
    if (mo >= PM.liftMonths) {
      flag("red");
      reasons.push(`Lift inspection: ${mo} month${mo !== 1 ? "s" : ""} overdue`);
    } else if (mo >= PM.liftMonths - 1) {
      flag("yellow");
      reasons.push(`Lift inspection: due this month`);
    }
  }

  // Annual inspection
  if (!lastInsp) {
    flag("yellow");
    reasons.push("Annual inspection: no record found");
  } else {
    const mo = monthsAgo(lastInsp.date);
    if (mo >= PM.inspectionMonths) {
      flag("red");
      reasons.push(`Annual inspection: ${mo} month${mo !== 1 ? "s" : ""} since last (${lastInsp.date?.toLocaleDateString("en-US", { month: "short", year: "numeric" })})`);
    } else if (mo >= PM.inspectionMonths - 1) {
      flag("yellow");
      reasons.push("Annual inspection: due this month");
    }
  }

  return { status: worst, reasons };
}

function vehicleHealthStatus(events) {
  return getVehicleAlerts(events).status;
}

const S = {
  body:      { padding: "24px 32px", maxWidth: 1400, margin: "0 auto" },
  row:       { display: "grid", gap: 18, marginBottom: 18 },
  card:      { background: "#fff", borderRadius: 10, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,.08)" },
  cardTitle: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: "#64748b", marginBottom: 8 },
  kpiValue:  { fontSize: 36, fontWeight: 700, color: "#1a2d4d" },
  kpiSub:    { fontSize: 13, color: "#64748b", marginTop: 3 },
  badge:     (color) => ({ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: color === "red" ? "#fee2e2" : color === "yellow" ? "#fef9c3" : color === "green" ? "#dcfce7" : "#f1f5f9", color: color === "red" ? "#b91c1c" : color === "yellow" ? "#854d0e" : color === "green" ? "#166534" : "#475569" }),
  dot:       (color) => ({ width: 10, height: 10, borderRadius: "50%", background: color === "red" ? "#ef4444" : color === "yellow" ? "#eab308" : color === "green" ? "#22c55e" : "#94a3b8", display: "inline-block" }),
  th:        { textAlign: "left", padding: "8px 12px", background: "#f8fafc", color: "#475569", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid #e2e8f0" },
  td:        { padding: "9px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" },
  alertRow:  (urgency) => ({ borderLeft: `4px solid ${urgency === "red" ? "#ef4444" : "#eab308"}`, background: urgency === "red" ? "#fff5f5" : "#fffbeb", borderRadius: 6, padding: "10px 14px", marginBottom: 8 }),
};

function KpiCard({ title, value, sub, accent }) {
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>{title}</div>
      <div style={{ ...S.kpiValue, color: accent || "#1a2d4d" }}>{value}</div>
      {sub && <div style={S.kpiSub}>{sub}</div>}
    </div>
  );
}

function StoplightGrid({ vehicles, eventsMap }) {
  const counts = useMemo(() => {
    let red = 0, yellow = 0, green = 0, unknown = 0;
    vehicles.forEach(v => { const s = vehicleHealthStatus(eventsMap[last5(v.vin)] || []); if (s === "red") red++; else if (s === "yellow") yellow++; else if (s === "green") green++; else unknown++; });
    return { red, yellow, green, unknown };
  }, [vehicles, eventsMap]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {[{ label: "Needs Attention", count: counts.red, color: "red" }, { label: "Due Soon", count: counts.yellow, color: "yellow" }, { label: "OK", count: counts.green, color: "green" }, { label: "No Data", count: counts.unknown, color: "unknown" }].map(({ label, count, color }) => {
        const barColor = color === "red" ? "#ef4444" : color === "yellow" ? "#eab308" : color === "green" ? "#22c55e" : "#94a3b8";
        return (
          <div key={label} style={{ textAlign: "center", padding: "14px 10px", borderRadius: 8, background: S.badge(color).background, border: `1px solid ${color === "red" ? "#fca5a5" : color === "yellow" ? "#fde68a" : color === "green" ? "#86efac" : "#e2e8f0"}` }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: barColor, margin: "0 auto 6px" }} />
            <div style={{ fontSize: 26, fontWeight: 700, color: S.badge(color).color, lineHeight: 1.2 }}>{count}</div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: 500 }}>{label}</div>
          </div>
        );
      })}
    </div>
  );
}

function AlertList({ vehicles, eventsMap }) {
  const alerts = useMemo(() => {
    const list = [];
    vehicles.forEach(v => {
      const events = eventsMap[last5(v.vin)] || [];
      const { status, reasons } = getVehicleAlerts(events);
      if (status === "red" || status === "yellow") {
        const latest = [...events].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))[0];
        list.push({ v, status, reasons, lastService: latest?.date });
      }
    });
    list.sort((a, b) => { if (a.status !== b.status) return a.status === "red" ? -1 : 1; return (a.lastService?.getTime() || 0) - (b.lastService?.getTime() || 0); });
    return list.slice(0, 8);
  }, [vehicles, eventsMap]);
  if (alerts.length === 0) return <div style={{ color: "#64748b", fontSize: 13 }}>No alerts — fleet looks good.</div>;
  return (
    <div>
      {alerts.map(({ v, status, reasons, lastService }) => (
        <div key={v.vin || v.dcCard} style={S.alertRow(status)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{v.year} {v.make} {v.model}</span>
              <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>{v.name || v.dcCard}</span>
              {reasons.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: status === "red" ? "#991b1b" : "#92400e", marginTop: 3 }}>
                  {r}
                </div>
              ))}
            </div>
            <span style={{ ...S.badge(status), flexShrink: 0, marginLeft: 12 }}><span style={S.dot(status)} />{status === "red" ? "Overdue" : "Due Soon"}</span>
          </div>
          {lastService && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Last service: {lastService.toLocaleDateString()}</div>}
        </div>
      ))}
    </div>
  );
}

function CostTable({ vehicles, eventsMap }) {
  const rows = useMemo(() => vehicles.map(v => { const events = eventsMap[last5(v.vin)] || []; return { v, total: events.reduce((s, e) => s + e.cost, 0), count: events.length }; }).filter(r => r.total > 0).sort((a, b) => b.total - a.total).slice(0, 10), [vehicles, eventsMap]);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>{["Vehicle","Unit","Events","Total Spend"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map(({ v, total, count }) => (
            <tr key={v.vin || v.dcCard}>
              <td style={S.td}><span style={{ fontWeight: 500 }}>{v.year} {v.make} {v.model}</span></td>
              <td style={S.td}>{v.name || v.dcCard || "—"}</td>
              <td style={S.td}>{count}</td>
              <td style={{ ...S.td, fontWeight: 600, color: total > 10000 ? "#dc2626" : "#1a2d4d" }}>${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={4} style={{ ...S.td, color: "#94a3b8", textAlign: "center" }}>No cost data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function VendorBreakdown({ allEvents }) {
  const vendors = useMemo(() => { const map = {}; allEvents.forEach(e => { const v = (e.location || "Unknown").trim(); if (!map[v]) map[v] = { count: 0, total: 0 }; map[v].count++; map[v].total += e.cost; }); return Object.entries(map).sort((a, b) => b[1].count - a[1].count).slice(0, 6); }, [allEvents]);
  const totalEvents = allEvents.length || 1;
  return (
    <div>
      {vendors.map(([name, { count, total }]) => (
        <div key={name} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 13, fontWeight: 500 }}>{name}</span><span style={{ fontSize: 12, color: "#64748b" }}>{count} events · ${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span></div>
          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}><div style={{ height: "100%", width: `${(count / totalEvents) * 100}%`, background: "#1a2d4d", borderRadius: 4 }} /></div>
        </div>
      ))}
    </div>
  );
}

function CorrectivePieChart({ allEvents }) {
  const corrective = allEvents.filter(e => isCorrectiveMaintenance(e.maintenanceType, e.notes)).length;
  const preventive = allEvents.length - corrective;
  const ratio = allEvents.length > 0 ? Math.round((corrective / allEvents.length) * 100) : 0;
  const r = 52, cx = 64, cy = 64, circumference = 2 * Math.PI * r;
  const corr_dash = (corrective / (allEvents.length || 1)) * circumference;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <svg width={128} height={128} viewBox="0 0 128 128">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#dcfce7" strokeWidth={18} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth={18} strokeDasharray={`${corr_dash} ${circumference}`} strokeDashoffset={circumference * 0.25} strokeLinecap="butt" />
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={20} fontWeight={700} fill="#1e293b">{ratio}%</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize={10} fill="#64748b">corrective</text>
      </svg>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}><div style={{ width: 12, height: 12, borderRadius: 2, background: "#ef4444" }} /><span style={{ fontSize: 13 }}>Corrective: <strong>{corrective}</strong></span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}><div style={{ width: 12, height: 12, borderRadius: 2, background: "#22c55e" }} /><span style={{ fontSize: 13 }}>Preventive: <strong>{preventive}</strong></span></div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>Target: &lt;40% corrective</div>
      </div>
    </div>
  );
}

function InsightsPanel({ vehicles, eventsMap, allEvents }) {
  const insights = useMemo(() => {
    const list = [];
    const highCost = vehicles.map(v => ({ v, total: (eventsMap[last5(v.vin)] || []).reduce((s, e) => s + e.cost, 0) })).filter(r => r.total > 10000).sort((a, b) => b.total - a.total);
    if (highCost.length > 0) list.push({ type: "warning", text: `${highCost.length} vehicle${highCost.length > 1 ? "s" : ""} exceed $10,000 in spend — review for retirement.`, detail: highCost.slice(0, 3).map(r => `${r.v.year} ${r.v.make} ${r.v.model} ($${r.total.toLocaleString("en-US", { maximumFractionDigits: 0 })})`).join(", ") });
    const corrective = allEvents.filter(e => isCorrectiveMaintenance(e.maintenanceType, e.notes)).length;
    const ratio = allEvents.length > 0 ? Math.round((corrective / allEvents.length) * 100) : 0;
    if (ratio > 40) list.push({ type: "warning", text: `Corrective maintenance is ${ratio}% of all events (target: <40%).`, detail: "Increase preventive scheduling to reduce reactive costs." });
    else if (allEvents.length > 0) list.push({ type: "good", text: `Corrective maintenance is ${ratio}% — within the <40% target.`, detail: "" });
    const vendorMap = {}; allEvents.forEach(e => { const v = (e.location || "Unknown").trim(); vendorMap[v] = (vendorMap[v] || 0) + 1; });
    const topVendor = Object.entries(vendorMap).sort((a, b) => b[1] - a[1])[0];
    if (topVendor && allEvents.length > 0) { const pct = Math.round((topVendor[1] / allEvents.length) * 100); if (pct > 40) list.push({ type: "info", text: `${topVendor[0]} handles ${pct}% of all service events.`, detail: "Consider rate negotiation given volume." }); }
    return list;
  }, [vehicles, eventsMap, allEvents]);
  const colors = { warning: { bg: "#fff7ed", border: "#fb923c" }, good: { bg: "#f0fdf4", border: "#22c55e" }, info: { bg: "#eff6ff", border: "#3b82f6" } };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {insights.map((ins, i) => { const c = colors[ins.type]; return (<div key={i} style={{ background: c.bg, borderLeft: `4px solid ${c.border}`, borderRadius: 6, padding: "10px 14px" }}><div style={{ fontSize: 13, fontWeight: 600 }}>{ins.text}</div>{ins.detail && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{ins.detail}</div>}</div>); })}
      {insights.length === 0 && <div style={{ color: "#64748b", fontSize: 13 }}>No insights yet — add maintenance data to see analysis.</div>}
    </div>
  );
}

// ── Ticket system (Cognito Forms → staging.fleet_tickets sync) ────────────────
// Tickets are submitted + status-managed in Cognito Forms; the backend mirrors
// them every 30 min. repair_cost is OURS — edited right here, manager/admin only.
const TICKETS_URL = `${API_BASE}/api/fleet/tickets`;
const ROLLUP_URL  = `${API_BASE}/api/fleet/tickets/rollup`;

const STATUS_STYLE = {
  "Submitted":   { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" },
  "In Progress": { bg: "#fef9c3", color: "#854d0e", border: "#fde68a" },
  "Completed":   { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
};
const URGENCY_STYLE = {
  Urgent: { bg: "#fee2e2", color: "#b91c1c", border: "#fca5a5" },
  Medium: { bg: "#fef9c3", color: "#854d0e", border: "#fde68a" },
  Low:    { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
};

const chip = (style) => ({ display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: style?.bg || "#f1f5f9", color: style?.color || "#475569", border: `1px solid ${style?.border || "#e2e8f0"}`, whiteSpace: "nowrap" });

function fmtDay(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(n) {
  if (n === null || n === undefined || n === "") return null;
  const v = Number(n);
  return isNaN(v) ? null : v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Inline repair-cost editor. The PATCH stamps who set it and when; an empty
// value clears the cost.
function CostCell({ ticket, canEdit, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(false);

  const save = async () => {
    const cost = value.trim() === "" ? null : parseFloat(value.replace(/[$,\s]/g, ""));
    if (cost !== null && (isNaN(cost) || cost < 0)) { setErr(true); return; }
    setSaving(true);
    setErr(false);
    try {
      const res = await fetch(`${TICKETS_URL}/${ticket.entry_number}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repair_cost: cost }),
      });
      if (!res.ok) throw new Error(res.status);
      onSaved(ticket.entry_number, await res.json());
      setEditing(false);
    } catch { setErr(true); }
    setSaving(false);
  };

  if (!editing) {
    const money = fmtMoney(ticket.repair_cost);
    return (
      <button
        disabled={!canEdit}
        onClick={() => { setValue(ticket.repair_cost ?? ""); setEditing(true); setErr(false); }}
        title={canEdit ? (ticket.cost_updated_by ? `Set by ${ticket.cost_updated_by}` : "Add repair cost") : "Managers and admins can edit cost"}
        style={{ background: money ? "#f0fdf4" : "#f8fafc", color: money ? "#166534" : "#94a3b8", border: `1px solid ${money ? "#bbf7d0" : "#e2e8f0"}`, borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: money ? 600 : 400, cursor: canEdit ? "pointer" : "default", fontFamily: "inherit", whiteSpace: "nowrap" }}>
        {money || (canEdit ? "+ Add cost" : "—")}
      </button>
    );
  }
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      <input autoFocus value={value} onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        placeholder="0.00"
        style={{ width: 80, border: `1.5px solid ${err ? "#fca5a5" : "#93c5fd"}`, borderRadius: 6, padding: "3px 8px", fontSize: 12, fontFamily: "inherit", outline: "none" }} />
      <button onClick={save} disabled={saving} style={{ border: "none", background: "#1a2d4d", color: "#fff", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{saving ? "…" : "Save"}</button>
      <button onClick={() => setEditing(false)} style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", borderRadius: 6, padding: "3px 7px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕</button>
    </span>
  );
}

function TicketsView({ tickets, userRole, search, setSearch, onCostSaved }) {
  const [statusFilter, setStatusFilter] = useState("Open");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [centerFilter, setCenterFilter] = useState("All Centers");
  const canEdit = userRole === "admin" || userRole === "manager";

  const centers = useMemo(
    () => ["All Centers", ...Array.from(new Set(tickets.map(t => t.center).filter(Boolean))).sort()],
    [tickets]
  );

  const openTickets = tickets.filter(t => t.status !== "Completed");
  const totalCost = tickets.reduce((s, t) => s + (Number(t.repair_cost) || 0), 0);
  const newLast30 = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return tickets.filter(t => new Date(t.date_submitted) >= cutoff).length;
  }, [tickets]);

  const filtered = tickets.filter(t => {
    const statusMatch = statusFilter === "All" ? true
      : statusFilter === "Open" ? t.status !== "Completed"
      : t.status === statusFilter;
    if (!statusMatch) return false;
    if (urgencyFilter !== "All" && t.urgency !== urgencyFilter) return false;
    if (centerFilter !== "All Centers" && t.center !== centerFilter) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = `${t.vin_last5} ${t.requester} ${t.issue_description} ${t.maintenance_type} ${t.maintenance_other || ""} ${t.center}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sel = { border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, background: "white", color: "#1e293b", cursor: "pointer", fontFamily: "inherit" };

  return (
    <>
      <div style={{ ...S.row, gridTemplateColumns: "repeat(4, 1fr)" }}>
        <KpiCard title="Open Tickets" value={openTickets.length} sub={`${tickets.length} all time`} accent={openTickets.length > 10 ? "#dc2626" : "#1a2d4d"} />
        <KpiCard title="Urgent Open" value={openTickets.filter(t => t.urgency === "Urgent").length} sub="Needs attention now" accent={openTickets.some(t => t.urgency === "Urgent") ? "#dc2626" : "#166534"} />
        <KpiCard title="New (30 days)" value={newLast30} sub="Tickets submitted" />
        <KpiCard title="Repair Cost Logged" value={`$${totalCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} sub="Across all tickets" />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={sel}>
          {["Open", "All", "Submitted", "In Progress", "Completed"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)} style={sel}>
          {["All", "Urgent", "Medium", "Low"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={centerFilter} onChange={e => setCenterFilter(e.target.value)} style={sel}>
          {centers.map(c => <option key={c}>{c}</option>)}
        </select>
        <input
          type="text" placeholder="Search VIN, issue, requester…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: 13, width: 230, outline: "none", fontFamily: "inherit", background: search ? "#eff6ff" : "white" }}
        />
        <span style={{ fontSize: 12, color: "#64748b", marginLeft: "auto" }}>{filtered.length} of {tickets.length} tickets</span>
      </div>

      <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["#", "Submitted", "Status", "Urgency", "Center", "VIN", "Type", "Issue", "Requester", "Repair Cost", ""].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.entry_number} style={{ background: t.status !== "Completed" && t.urgency === "Urgent" ? "#fff5f5" : "white" }}>
                <td style={{ ...S.td, color: "#94a3b8", fontSize: 12 }}>{t.entry_number}</td>
                <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtDay(t.date_submitted)}</td>
                <td style={S.td}><span style={chip(STATUS_STYLE[t.status])}>{t.status || "—"}</span></td>
                <td style={S.td}><span style={chip(URGENCY_STYLE[t.urgency])}>{t.urgency || "—"}</span></td>
                <td style={{ ...S.td, whiteSpace: "nowrap" }}>{t.center}</td>
                <td style={{ ...S.td, fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{t.vin_last5 || <span style={{ color: "#cbd5e1" }}>none</span>}</td>
                <td style={{ ...S.td, whiteSpace: "nowrap" }}>{t.maintenance_type}{t.maintenance_other ? ` — ${t.maintenance_other}` : ""}</td>
                <td style={{ ...S.td, maxWidth: 320 }} title={t.issue_description}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.issue_description}</div>
                </td>
                <td style={{ ...S.td, whiteSpace: "nowrap" }}>{t.requester}</td>
                <td style={S.td}><CostCell ticket={t} canEdit={canEdit} onSaved={onCostSaved} /></td>
                <td style={S.td}>
                  {t.admin_link && (
                    <a href={t.admin_link} target="_blank" rel="noopener noreferrer"
                      title="Open in Cognito Forms (status is edited there)"
                      style={{ fontSize: 12, color: "#4a7ab5", textDecoration: "none", whiteSpace: "nowrap" }}>
                      Edit ↗
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={11} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: 32 }}>
                {tickets.length === 0 ? "No tickets synced yet — the sync runs every 30 minutes." : "No tickets match these filters."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function HealthView({ rollup, vehicleLookup, onSelectVin }) {
  // A vehicle is "recurring" on a type with 2+ tickets in the last 6 months.
  const rows = rollup.map(v => ({
    ...v,
    recurring: Object.entries(v.types || {})
      .filter(([, c]) => c.last_6mo >= 2)
      .sort((a, b) => b[1].last_6mo - a[1].last_6mo),
  }));
  return (
    <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>{["VIN", "Vehicle", "Open", "Tickets (6 mo)", "All Time", "Cost to Date", "Cost (90 d)", "Last Ticket", "Recurring Issues"].map(h => <th key={h} style={S.th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map(v => {
            const veh = vehicleLookup[v.vin];
            return (
              <tr key={v.vin} onClick={() => onSelectVin(v.vin)} title="Show this vehicle's tickets"
                style={{ cursor: "pointer", background: v.open_tickets > 0 ? "#fffbeb" : "white" }}>
                <td style={{ ...S.td, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{v.vin}</td>
                <td style={{ ...S.td, whiteSpace: "nowrap", color: veh ? "#1e293b" : "#cbd5e1" }}>{veh ? `${veh.year} ${veh.make} ${veh.model}` : "—"}</td>
                <td style={{ ...S.td, fontWeight: 700, color: v.open_tickets > 0 ? "#b45309" : "#94a3b8" }}>{v.open_tickets}</td>
                <td style={S.td}>{v.tickets_6mo}</td>
                <td style={S.td}>{v.total_tickets}</td>
                <td style={{ ...S.td, fontWeight: 600 }}>{fmtMoney(v.total_cost) || "$0.00"}</td>
                <td style={S.td}>{fmtMoney(v.cost_90d) || "—"}</td>
                <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtDay(v.last_ticket)}</td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {v.recurring.map(([type, c]) => (
                      <span key={type} style={chip(c.last_6mo >= 3 ? URGENCY_STYLE.Urgent : { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" })}>
                        {c.last_6mo}× {type} / 6 mo
                      </span>
                    ))}
                    {v.recurring.length === 0 && <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>}
                  </div>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={9} style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: 32 }}>No vehicle data yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function FleetDashboard({ userRole }) {
  const [vehicles, setVehicles] = useState([]);
  const [rawEvents, setRawEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [rollup, setRollup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("tickets"); // tickets | health | legacy service log
  const [search, setSearch] = useState("");   // tickets-tab search
  const [vinFilter, setVinFilter] = useState(""); // legacy-tab filter

  useEffect(() => {
    async function load() {
      try {
        const [tRes, rRes, vRes, mRes] = await Promise.all([
          fetch(TICKETS_URL, { credentials: "include" }),
          fetch(ROLLUP_URL, { credentials: "include" }),
          fetch(VEHICLE_LIST_URL, { credentials: "include" }),
          fetch(MAINTENANCE_URL, { credentials: "include" }),
        ]);
        if (!tRes.ok) throw new Error(`Tickets: ${tRes.status}`);
        const tData = await tRes.json();
        setTickets(Array.isArray(tData) ? tData : []);
        if (rRes.ok) {
          const rData = await rRes.json();
          setRollup(Array.isArray(rData) ? rData : []);
        }
        // Legacy service-log sources (tables may be empty) — never fatal.
        if (vRes.ok) {
          const vData = await vRes.json();
          setVehicles(vData.map(row => ({ dcCard: row["DC-Card #"] || row["DC-Card#"] || "", year: row["Year"] || "", make: row["Make"] || "", model: row["Model"] || "", name: row["Name 2"] || "", vin: row["VIN"] || "", type: row["Type"] || "" })));
        }
        if (mRes.ok) {
          const mData = await mRes.json();
          setRawEvents(mData.map(row => ({ last5vin: (row["Last 5 of VIN #"] || "").trim().toUpperCase(), fullVin: (row["VIN# (Place Holder)"] || "").trim().toUpperCase(), date: parseDate(row["Date of Expense"]), odometer: parseFloat(String(row["Odometer at Service"] || "").replace(/,/g, "")) || null, location: row["Location of Service"] || "", cost: parseCost(row["Cost Amount"]), maintenanceType: row["Maintenance Type"] || "", notes: row["Notes"] || "" })));
        }
      } catch (err) {
        console.error("Fleet load error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // After a cost save: patch the ticket in place, refresh the rollup quietly.
  const onCostSaved = (entryNumber, data) => {
    setTickets(prev => prev.map(t => (t.entry_number === entryNumber ? { ...t, ...data } : t)));
    fetch(ROLLUP_URL, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (Array.isArray(d)) setRollup(d); })
      .catch(() => {});
  };

  // year/make/model lookup for the health view, keyed by VIN last-5.
  // Empty until staging.fleet_vehicles gets loaded — the view degrades to VIN only.
  const vehicleLookup = useMemo(() => {
    const map = {};
    vehicles.forEach(v => { const k = last5(v.vin); if (k) map[k] = v; });
    return map;
  }, [vehicles]);

  const eventsMap = useMemo(() => { const map = {}; rawEvents.forEach(e => { const key = e.last5vin || last5(e.fullVin); if (!key) return; if (!map[key]) map[key] = []; map[key].push(e); }); return map; }, [rawEvents]);

  const filteredVehicles = useMemo(() => {
    if (!vinFilter.trim()) return vehicles;
    const q = vinFilter.trim().toUpperCase();
    return vehicles.filter(v => v.vin.toUpperCase().includes(q) || last5(v.vin).includes(q));
  }, [vehicles, vinFilter]);

  const totalSpend = useMemo(() => rawEvents.reduce((s, e) => s + e.cost, 0), [rawEvents]);
  const avgCost = rawEvents.length > 0 ? totalSpend / rawEvents.length : 0;
  const correctivePct = rawEvents.length > 0 ? Math.round((rawEvents.filter(e => isCorrectiveMaintenance(e.maintenanceType, e.notes)).length / rawEvents.length) * 100) : 0;

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, fontSize: 16, color: "#64748b" }}>Loading fleet data…</div>;
  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 10 }}>
        <div style={{ fontWeight: 600, color: "#dc2626" }}>Could not load fleet data</div>
      <div style={{ fontSize: 13, color: "#64748b" }}>{error}</div>
    </div>
  );

  const isFiltered = vinFilter.trim().length > 0;

  const tabBtn = (id, label) => (
    <button key={id} onClick={() => setTab(id)}
      style={{ border: "none", cursor: "pointer", fontFamily: "inherit", borderRadius: 8,
        padding: "7px 16px", fontSize: 13, fontWeight: 600, transition: "all 0.15s",
        background: tab === id ? "white" : "transparent",
        color: tab === id ? "#1a2d4d" : "#64748b",
        boxShadow: tab === id ? "0 1px 3px rgba(0,0,0,0.12)" : "none" }}>
      {label}
    </button>
  );

  return (
    <div style={S.body}>
      {/* Tab switcher: live ticket queue / vehicle rollup / legacy Excel-era view */}
      <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: 10, padding: 3, marginBottom: 18, border: "1.5px solid #e2e8f0" }}>
        {tabBtn("tickets", `Tickets (${tickets.filter(t => t.status !== "Completed").length} open)`)}
        {tabBtn("health", "Vehicle Health")}
        {tabBtn("legacy", "Service Log")}
      </div>

      {tab === "tickets" && (
        <TicketsView tickets={tickets} userRole={userRole} search={search} setSearch={setSearch} onCostSaved={onCostSaved} />
      )}

      {tab === "health" && (
        <>
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 14, lineHeight: 1.5 }}>
            One row per vehicle (VIN last-5), worst first. Click a row to see its tickets.
            Recurring-issue chips flag 2+ tickets of the same type within 6 months — those are the
            "get ahead of it" vehicles.
          </div>
          <HealthView rollup={rollup} vehicleLookup={vehicleLookup}
            onSelectVin={(vin) => { setSearch(vin === "(no VIN)" ? "" : vin); setTab("tickets"); }} />
        </>
      )}

      {tab === "legacy" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 11, color: "#64748b" }}>
              {isFiltered ? `${filteredVehicles.length} of ${vehicles.length} vehicles` : `${vehicles.length} vehicles`} · {rawEvents.length} maintenance events
            </div>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Filter by VIN..."
                value={vinFilter}
                onChange={e => setVinFilter(e.target.value)}
                style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 32px 7px 12px", fontSize: 13, width: 200, outline: "none", fontFamily: "inherit", background: isFiltered ? "#eff6ff" : "white", borderColor: isFiltered ? "#3b82f6" : "#e2e8f0" }}
              />
              {isFiltered && (
                <button onClick={() => setVinFilter("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#94a3b8", padding: 0, lineHeight: 1 }}>✕</button>
              )}
            </div>
          </div>

          {/* Row 1 — KPIs */}
          <div style={{ ...S.row, gridTemplateColumns: "repeat(4, 1fr)" }}>
            <KpiCard title="Total Maintenance Spend" value={`$${totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} sub="All time" />
            <KpiCard title="Vehicles Tracked" value={isFiltered ? filteredVehicles.length : vehicles.length} sub={isFiltered ? `filtered from ${vehicles.length} total` : `${rawEvents.length} events logged`} />
            <KpiCard title="Corrective Rate" value={`${correctivePct}%`} sub="Target: <40%" accent={correctivePct > 40 ? "#dc2626" : "#166534"} />
            <KpiCard title="Avg Cost / Event" value={`$${avgCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Per maintenance event" />
          </div>

          {/* Row 2 — Health + Alerts */}
          <div style={{ ...S.row, gridTemplateColumns: "1fr 2fr" }}>
            <div style={S.card}><div style={S.cardTitle}>Fleet Health{isFiltered && <span style={{ fontSize: 11, fontWeight: 400, color: "#3b82f6", marginLeft: 6 }}>(filtered)</span>}</div><StoplightGrid vehicles={filteredVehicles} eventsMap={eventsMap} /></div>
            <div style={S.card}><div style={S.cardTitle}>Priority Alerts{isFiltered && <span style={{ fontSize: 11, fontWeight: 400, color: "#3b82f6", marginLeft: 6 }}>(filtered)</span>}</div><AlertList vehicles={filteredVehicles} eventsMap={eventsMap} /></div>
          </div>

          {/* Row 3 — Cost Table + Charts */}
          <div style={{ ...S.row, gridTemplateColumns: "2fr 1fr" }}>
            <div style={S.card}><div style={S.cardTitle}>Top Costliest Vehicles</div><CostTable vehicles={filteredVehicles} eventsMap={eventsMap} /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={S.card}><div style={S.cardTitle}>Corrective vs Preventive</div><CorrectivePieChart allEvents={rawEvents} /></div>
              <div style={S.card}><div style={S.cardTitle}>Top Service Locations</div><VendorBreakdown allEvents={rawEvents} /></div>
            </div>
          </div>

          {/* Row 4 — Insights */}
          <div style={{ ...S.row, gridTemplateColumns: "1fr" }}>
            <div style={S.card}><div style={S.cardTitle}>Auto-Generated Insights</div><InsightsPanel vehicles={vehicles} eventsMap={eventsMap} allEvents={rawEvents} /></div>
          </div>
        </>
      )}
    </div>
  );
}
