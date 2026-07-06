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

export default function FleetDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [rawEvents, setRawEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vinFilter, setVinFilter] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [vRes, mRes] = await Promise.all([fetch(VEHICLE_LIST_URL, { credentials: "include" }), fetch(MAINTENANCE_URL, { credentials: "include" })]);
        if (!vRes.ok) throw new Error(`Vehicle list: ${vRes.status}`);
        if (!mRes.ok) throw new Error(`Maintenance: ${mRes.status}`);
        const [vData, mData] = await Promise.all([vRes.json(), mRes.json()]);
        setVehicles(vData.map(row => ({ dcCard: row["DC-Card #"] || row["DC-Card#"] || "", year: row["Year"] || "", make: row["Make"] || "", model: row["Model"] || "", name: row["Name 2"] || "", vin: row["VIN"] || "", type: row["Type"] || "" })));
        setRawEvents(mData.map(row => ({ last5vin: (row["Last 5 of VIN #"] || "").trim().toUpperCase(), fullVin: (row["VIN# (Place Holder)"] || "").trim().toUpperCase(), date: parseDate(row["Date of Expense"]), odometer: parseFloat(String(row["Odometer at Service"] || "").replace(/,/g, "")) || null, location: row["Location of Service"] || "", cost: parseCost(row["Cost Amount"]), maintenanceType: row["Maintenance Type"] || "", notes: row["Notes"] || "" })));
      } catch (err) {
        console.error("Fleet load error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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

  return (
    <div style={S.body}>
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
    </div>
  );
}
