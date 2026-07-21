import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { API_BASE } from "../config/api.js";

// Rebilling & Unpaids — the live version of the "Unpaid Analysis": every client ×
// service reason with unpaid > 0, reconciled against the invoice flat file, and
// worked to resolution with a per-item Status (Open / In Progress / Paid) and a
// note. Reads /api/rebilling/worklist; status + notes persist via PUT
// /api/rebilling/item.
//
// Organised BY CENTER (Brock, 2026-07-21) — that is how the work is divided and
// how the weekly workbook is tabbed. Expand a center to see its clients; click a
// client to see every billing line they have this year, paid AND unpaid, from
// /api/rebilling/client. Seeing 180 paid lines next to 6 unpaid ones is a very
// different situation from 6 out of 6, and the worklist alone cannot show that.

const fmtMoney = (v) => `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso) => { if (!iso) return ""; const d = new Date(`${String(iso).slice(0,10)}T00:00:00`); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }); };

// Bucket display order + accent color. "fixable" = we can correct + resubmit.
// The color IS the label here: the grey reason subtitle was removed 2026-07-21
// (Brock: "the red/yellow text does just fine").
const BUCKETS = [
  { name: "Invalid Medicaid #",       group: "fixable", color: "#b91c1c" },
  { name: "Eligibility Denials",      group: "fixable", color: "#be123c" },
  { name: "ODM Denials",              group: "fixable", color: "#c2410c" },
  { name: "PAWS Record Mismatch",     group: "fixable", color: "#a16207" },
  { name: "Cost Limit Exceeded",      group: "fixable", color: "#ca8a04" },
  { name: "Unit Limit Exceeded",      group: "fixable", color: "#ca8a04" },
  { name: "Submitted - Not Yet Paid", group: "pending", color: "#64748b" },
];
const BUCKET_COLOR = Object.fromEntries(BUCKETS.map(b => [b.name, b.color]));
const FIXABLE = new Set(BUCKETS.filter(b => b.group === "fixable").map(b => b.name));

const STATUSES = [
  { key: "open",        label: "Open",        color: "#475569", bg: "#f1f5f9", border: "#cbd5e1" },
  { key: "in_progress", label: "In Progress", color: "#854d0e", bg: "#fef9c3", border: "#fde68a" },
  { key: "paid",        label: "Paid",        color: "#166534", bg: "#dcfce7", border: "#86efac" },
];
const STATUS_META = Object.fromEntries(STATUSES.map(s => [s.key, s]));

const RENDER_CAP = 300;

const S = {
  body:  { padding: "24px 32px", maxWidth: 1440, margin: "0 auto" },
  card:  { background: "#fff", borderRadius: 10, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,.08)" },
  title: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.7, color: "#64748b", marginBottom: 8 },
  kpi:   { fontSize: 28, fontWeight: 700, color: "#1a2d4d" },
  sub:   { fontSize: 12, color: "#64748b", marginTop: 3 },
  th:    { textAlign: "left", padding: "8px 12px", background: "#f8fafc", color: "#475569", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" },
  td:    { padding: "9px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "middle" },
  miniTh: { textAlign: "left", padding: "5px 9px", color: "#64748b", fontWeight: 600, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" },
  miniTd: { padding: "5px 9px", fontSize: 12, borderBottom: "1px solid #f8fafc", whiteSpace: "nowrap" },
};

// Inline, auto-saving note cell (saves on blur / Enter).
function NoteCell({ row, onSave }) {
  const [val, setVal] = useState(row.note || "");
  const [saving, setSaving] = useState(false);
  const orig = useRef(row.note || "");
  useEffect(() => { setVal(row.note || ""); orig.current = row.note || ""; }, [row.item_key, row.note]);
  const commit = async () => {
    if (val === orig.current) return;
    setSaving(true);
    const ok = await onSave(row.item_key, { note: val });
    if (ok) orig.current = val; else setVal(orig.current);
    setSaving(false);
  };
  return (
    <input
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setVal(orig.current); e.currentTarget.blur(); } }}
      placeholder="Add note…"
      style={{
        width: "100%", minWidth: 150, boxSizing: "border-box", fontFamily: "inherit", fontSize: 13,
        border: "1px solid transparent", borderRadius: 6, padding: "5px 8px", background: val ? "#f8fafc" : "transparent",
        color: "#334155", outline: "none",
      }}
      onFocus={e => { e.target.style.borderColor = "#93c5fd"; e.target.style.background = "#fff"; }}
      title={saving ? "Saving…" : ""}
    />
  );
}

// Per-row status control (Open / In Progress / Paid).
function StatusCell({ row, onSave }) {
  const meta = STATUS_META[row.status] || STATUS_META.open;
  return (
    <select
      value={row.status}
      onChange={e => onSave(row.item_key, { status: e.target.value })}
      onClick={e => e.stopPropagation()}
      style={{
        fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
        color: meta.color, background: meta.bg, border: `1.5px solid ${meta.border}`,
        borderRadius: 20, padding: "5px 10px", outline: "none",
      }}
    >
      <option value="open">Open</option>
      <option value="in_progress">In Progress</option>
      <option value="paid">Paid</option>
    </select>
  );
}

// Every billing line for one client this year — the "what HAS and HAS NOT been
// paid" panel. Fetched on demand, then cached by the parent.
function ClientLines({ state }) {
  const [view, setView] = useState("unpaid");   // unpaid | paid | all

  if (state?.loading) return <div style={{ padding: "14px 18px", fontSize: 13, color: "#64748b" }}>Loading this year's billing…</div>;
  if (state?.error)   return <div style={{ padding: "14px 18px", fontSize: 13, color: "#b91c1c" }}>Could not load billing: {state.error}</div>;
  const data = state?.data;
  if (!data) return null;
  if (!data.ready) return <div style={{ padding: "14px 18px", fontSize: 13, color: "#94a3b8" }}>No billing snapshot has been loaded yet.</div>;

  const t = data.totals || {};
  const rows = (data.rows || []).filter(r =>
    view === "all" ? true : view === "unpaid" ? r.unpaid > 0 : r.unpaid <= 0
  );
  const shown = rows.slice(0, RENDER_CAP);

  const chip = (key, label, count) => {
    const active = view === key;
    return (
      <button key={key} onClick={() => setView(key)}
        style={{ border: `1.5px solid ${active ? "#1a2d4d" : "#e2e8f0"}`, background: active ? "#1a2d4d" : "white",
                 color: active ? "#fff" : "#475569", borderRadius: 7, padding: "4px 10px", fontSize: 12,
                 fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>
        {label} <span style={{ fontWeight: 700 }}>{count}</span>
      </button>
    );
  };

  return (
    <div style={{ background: "#fbfcfe", borderTop: "1px solid #e2e8f0", padding: "12px 16px 14px 34px" }}>
      <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, color: "#475569" }}>
          <strong style={{ color: "#1a2d4d" }}>{t.lines?.toLocaleString() || 0}</strong> billing lines this year ·{" "}
          <strong style={{ color: "#166534" }}>{fmtMoney(t.paid)}</strong> paid ·{" "}
          <strong style={{ color: "#b91c1c" }}>{fmtMoney(t.unpaid)}</strong> unpaid
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {chip("unpaid", "Unpaid", t.unpaid_lines || 0)}
          {chip("paid", "Paid", t.paid_lines || 0)}
          {chip("all", "All", t.lines || 0)}
        </div>
      </div>

      <div style={{ maxHeight: 340, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
            <tr>
              <th style={S.miniTh}>Service date</th>
              <th style={S.miniTh}>Code</th>
              <th style={S.miniTh}>Service</th>
              <th style={S.miniTh}>Cost center</th>
              <th style={{ ...S.miniTh, textAlign: "right" }}>Units</th>
              <th style={{ ...S.miniTh, textAlign: "right" }}>Billed</th>
              <th style={{ ...S.miniTh, textAlign: "right" }}>Paid</th>
              <th style={{ ...S.miniTh, textAlign: "right" }}>Unpaid</th>
              <th style={S.miniTh}>Paid on</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => {
              const open = r.unpaid > 0;
              return (
                <tr key={i} style={{ background: open ? "#fffbfa" : "transparent" }}>
                  <td style={S.miniTd}>{fmtDate(r.attendance)}</td>
                  <td style={{ ...S.miniTd, fontFamily: "ui-monospace, monospace" }}>{r.code}</td>
                  <td style={{ ...S.miniTd, color: "#475569", maxWidth: 190, overflow: "hidden", textOverflow: "ellipsis" }}>{r.service}</td>
                  <td style={{ ...S.miniTd, color: "#64748b" }}>{r.cost_center}</td>
                  <td style={{ ...S.miniTd, textAlign: "right" }}>{r.units}</td>
                  <td style={{ ...S.miniTd, textAlign: "right" }}>{fmtMoney(r.billed)}</td>
                  <td style={{ ...S.miniTd, textAlign: "right", color: r.paid > 0 ? "#166534" : "#cbd5e1" }}>{fmtMoney(r.paid)}</td>
                  <td style={{ ...S.miniTd, textAlign: "right", fontWeight: open ? 700 : 400, color: open ? "#b91c1c" : "#cbd5e1" }}>{open ? fmtMoney(r.unpaid) : "—"}</td>
                  <td style={{ ...S.miniTd, color: "#64748b" }}>
                    {r.paid_date ? fmtDate(r.paid_date)
                      : r.not_billed ? <span style={{ color: "#a16207", fontWeight: 600 }}>not billed</span>
                      : "—"}
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr><td colSpan={9} style={{ padding: 22, textAlign: "center", color: "#94a3b8", fontSize: 12.5 }}>No lines in this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {shown.length < rows.length && (
        <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 6 }}>Showing first {shown.length} of {rows.length} lines.</div>
      )}
      <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 6 }}>
        Brittco billing as of {fmtDate(data.snapshot_date)}. This is Brittco's own paid/unpaid flag —
        the worklist above reconciles against the DODD invoice file instead, so the two can differ.
      </div>
    </div>
  );
}

export default function RebillingDashboard({ userRole }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("open"); // open | in_progress | paid | all
  const [bucketFilter, setBucketFilter] = useState("fixable"); // fixable | all
  const [reasonFilter, setReasonFilter] = useState("");        // "" = every reason
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [openCenters, setOpenCenters] = useState(() => new Set());
  const [openClient, setOpenClient] = useState(null);          // client_key
  const [clientData, setClientData] = useState({});            // client_key -> {loading,data,error}

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/rebilling/worklist`, { credentials: "include" });
        if (!res.ok) throw new Error(`Rebilling: ${res.status}`);
        const data = await res.json();
        setRows(Array.isArray(data.rows) ? data.rows : []);
        setMeta({ graceDays: data.grace_days, cutoff: data.cutoff, snapshot: data.snapshot_date });
      } catch (err) {
        console.error("Rebilling load error:", err);
        setError(err.message);
      } finally { setLoading(false); }
    })();
  }, []);

  // Optimistic status/note update; reverts on failure.
  async function updateItem(itemKey, patch) {
    const prev = rows;
    setRows(list => list.map(r => (r.item_key === itemKey ? { ...r, ...patch } : r)));
    try {
      const res = await fetch(`${API_BASE}/api/rebilling/item`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_key: itemKey, ...patch }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      if (patch.status) showToast(`Marked ${STATUS_META[patch.status]?.label || patch.status}`);
      return true;
    } catch (err) {
      setRows(prev);
      showToast(err.message);
      return false;
    }
  }

  // Client drill-down: fetch once, then serve from cache.
  const toggleClient = useCallback(async (clientKey) => {
    if (openClient === clientKey) { setOpenClient(null); return; }
    setOpenClient(clientKey);
    if (clientData[clientKey]) return;
    setClientData(d => ({ ...d, [clientKey]: { loading: true } }));
    try {
      const res = await fetch(`${API_BASE}/api/rebilling/client?key=${encodeURIComponent(clientKey)}`,
                              { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setClientData(d => ({ ...d, [clientKey]: { data } }));
    } catch (err) {
      setClientData(d => ({ ...d, [clientKey]: { error: err.message } }));
    }
  }, [openClient, clientData]);

  const byStatus = useMemo(() => {
    const m = { open: 0, in_progress: 0, paid: 0 };
    rows.forEach(r => { m[r.status] = (m[r.status] || 0) + 1; });
    return m;
  }, [rows]);

  const statusRows = useMemo(
    () => (statusFilter === "all" ? rows : rows.filter(r => r.status === statusFilter)),
    [rows, statusFilter]
  );

  // KPIs reflect what's still owed = everything not marked Paid.
  const totals = useMemo(() => {
    let open = 0, openAmt = 0, fixable = 0, fixableCount = 0;
    rows.forEach(r => {
      if (r.status === "paid") return;
      open++; openAmt += r.total_unpaid;
      if (FIXABLE.has(r.bucket)) { fixable += r.total_unpaid; fixableCount++; }
    });
    return { open, openAmt, fixable, fixableCount };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = statusRows;
    if (bucketFilter === "fixable") list = list.filter(r => FIXABLE.has(r.bucket));
    if (reasonFilter) list = list.filter(r => r.bucket === reasonFilter);
    if (q) list = list.filter(r => `${r.client} ${r.center} ${r.county} ${r.service_codes} ${r.bucket} ${r.note || ""}`.toLowerCase().includes(q));
    return list;
  }, [statusRows, bucketFilter, reasonFilter, search]);

  // Group into the centers Brock works by, biggest balance first.
  const centers = useMemo(() => {
    const m = new Map();
    filtered.forEach(r => {
      const c = r.center || "Unknown";
      if (!m.has(c)) m.set(c, { rows: [], amount: 0, clients: new Set() });
      const g = m.get(c);
      g.rows.push(r);
      g.amount += r.total_unpaid;
      g.clients.add(r.client_key);
    });
    return [...m.entries()]
      .map(([name, g]) => ({ name, ...g, clients: g.clients.size }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  // Searching should reveal its own hits rather than leaving every center shut.
  const searching = search.trim().length > 0 || !!reasonFilter;
  const isOpen = (name) => searching || openCenters.has(name);
  const toggleCenter = (name) => setOpenCenters(s => {
    const n = new Set(s);
    n.has(name) ? n.delete(name) : n.add(name);
    return n;
  });

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, fontSize: 16, color: "#64748b" }}>Loading unpaid worklist…</div>;
  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 10 }}>
      <div style={{ fontWeight: 600, color: "#dc2626" }}>Could not load the rebilling worklist</div>
      <div style={{ fontSize: 13, color: "#64748b" }}>{error}</div>
    </div>
  );

  const reasonsPresent = BUCKETS.map(b => b.name).filter(n => statusRows.some(r => r.bucket === n));

  return (
    <div style={S.body}>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 18 }}>
        <div style={S.card}><div style={S.title}>Outstanding (not Paid)</div><div style={S.kpi}>{fmtMoney(totals.openAmt)}</div><div style={S.sub}>{totals.open.toLocaleString()} open item{totals.open === 1 ? "" : "s"}</div></div>
        <div style={S.card}><div style={S.title}>Fixable (errors &amp; denials)</div><div style={{ ...S.kpi, color: "#b91c1c" }}>{fmtMoney(totals.fixable)}</div><div style={S.sub}>{totals.fixableCount} groups to correct &amp; resubmit</div></div>
        <div style={S.card}><div style={S.title}>Cleared</div><div style={{ ...S.kpi, color: "#166534" }}>{byStatus.paid || 0}</div><div style={S.sub}>marked paid</div></div>
      </div>

      {/* Status tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #e2e8f0", marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { key: "open", label: "Open", count: byStatus.open || 0 },
          { key: "in_progress", label: "In Progress", count: byStatus.in_progress || 0 },
          { key: "paid", label: "Paid", count: byStatus.paid || 0 },
          { key: "all", label: "All", count: rows.length },
        ].map(t => {
          const active = statusFilter === t.key;
          return (
            <button key={t.key} onClick={() => setStatusFilter(t.key)}
              style={{ border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", padding: "9px 15px", fontSize: 14, fontWeight: active ? 700 : 500, color: active ? "#1a2d4d" : "#64748b", borderBottom: active ? "3px solid #1a2d4d" : "3px solid transparent", marginBottom: -2 }}>
              {t.label}<span style={{ marginLeft: 7, fontSize: 12, fontWeight: 600, color: active ? "#1a2d4d" : "#94a3b8" }}>{t.count}</span>
            </button>
          );
        })}
      </div>

      {/* Scope + filters. The old per-bucket chip row is gone (Brock 2026-07-21:
          "those tabs can go, I can go to the all reasons tab and filter there") —
          the reason dropdown does the same job in one control. */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        {[{ key: "fixable", label: "Fixable" }, { key: "all", label: "All reasons" }].map(({ key, label }) => {
          const active = bucketFilter === key;
          return (
            <button key={key} onClick={() => { setBucketFilter(key); if (key === "fixable") setReasonFilter(""); }}
              style={{ border: `1.5px solid ${active ? "#1a2d4d" : "#e2e8f0"}`, background: active ? "#1a2d4d" : "white", color: active ? "#fff" : "#475569", borderRadius: 8, padding: "6px 13px", fontSize: 13, fontWeight: active ? 700 : 500, cursor: "pointer", fontFamily: "inherit" }}>
              {label}
            </button>
          );
        })}
        <select value={reasonFilter} onChange={e => setReasonFilter(e.target.value)}
          style={{ fontFamily: "inherit", fontSize: 13, padding: "7px 10px", borderRadius: 8,
                   border: `1.5px solid ${reasonFilter ? "#1a2d4d" : "#e2e8f0"}`, background: "#fff",
                   color: reasonFilter ? "#1a2d4d" : "#475569", fontWeight: reasonFilter ? 600 : 400, cursor: "pointer", outline: "none" }}>
          <option value="">Every reason</option>
          {reasonsPresent.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <input type="text" placeholder="Search client, center, county, code…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ border: `1.5px solid ${search ? "#3b82f6" : "#e2e8f0"}`, background: search ? "#eff6ff" : "white", borderRadius: 8, padding: "8px 12px", fontSize: 13, width: 280, fontFamily: "inherit", outline: "none" }} />
        <span style={{ fontSize: 12, color: "#64748b", marginLeft: "auto" }}>
          {filtered.length.toLocaleString()} group{filtered.length === 1 ? "" : "s"} · {centers.length} center{centers.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Worklist, by center */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {centers.map(c => {
          const open = isOpen(c.name);
          const shown = c.rows.slice(0, RENDER_CAP);
          return (
            <div key={c.name} style={{ ...S.card, padding: 0, overflow: "hidden" }}>
              <button onClick={() => toggleCenter(c.name)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 18px",
                         background: open ? "#f8fafc" : "#fff", border: "none", borderBottom: open ? "1px solid #e2e8f0" : "none",
                         cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <span style={{ fontSize: 11, color: "#94a3b8", width: 10, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>▶</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#1a2d4d" }}>{c.name}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  {c.clients} client{c.clients === 1 ? "" : "s"} · {c.rows.length} group{c.rows.length === 1 ? "" : "s"}
                </span>
                <span style={{ marginLeft: "auto", fontSize: 15, fontWeight: 700, color: "#b91c1c" }}>{fmtMoney(c.amount)}</span>
              </button>

              {open && (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={S.th}>Client</th>
                      <th style={S.th}>Reason</th>
                      <th style={S.th}>Codes</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Unpaid</th>
                      <th style={S.th}>Status</th>
                      <th style={{ ...S.th, minWidth: 200 }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => {
                      const expanded = openClient === r.client_key;
                      return (
                        <React.Fragment key={r.item_key}>
                          <tr style={{ opacity: r.status === "paid" ? 0.6 : 1, background: expanded ? "#f8fafc" : "transparent" }}>
                            <td style={{ ...S.td, minWidth: 160 }}>
                              <button onClick={() => toggleClient(r.client_key)}
                                title="Show every billing line this year"
                                style={{ border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: "inherit",
                                         textAlign: "left", fontWeight: 600, fontSize: 13,
                                         color: expanded ? "#2563eb" : "#1a2d4d", textDecoration: "underline", textDecorationColor: "#cbd5e1", textUnderlineOffset: 3 }}>
                                {r.client}
                              </button>
                              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>{r.county || "—"}</div>
                            </td>
                            <td style={S.td}>
                              {/* Colour carries the severity; the grey reason
                                  subtitle that used to sit here was removed. */}
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600, color: BUCKET_COLOR[r.bucket] || "#475569", fontSize: 12.5 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: BUCKET_COLOR[r.bucket] || "#94a3b8", flexShrink: 0 }} />
                                {r.bucket}
                              </span>
                            </td>
                            <td style={{ ...S.td, fontSize: 12, color: "#475569", fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>{r.service_codes}</td>
                            <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>
                              <span style={{ fontWeight: 700, color: "#b91c1c" }}>{fmtMoney(r.total_unpaid)}</span>
                              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>{r.items} item{r.items === 1 ? "" : "s"} · {fmtDate(r.first_date)}{r.last_date && r.last_date !== r.first_date ? `–${fmtDate(r.last_date)}` : ""}</div>
                            </td>
                            <td style={S.td}><StatusCell row={r} onSave={updateItem} /></td>
                            <td style={S.td}><NoteCell row={r} onSave={updateItem} /></td>
                          </tr>
                          {expanded && (
                            <tr>
                              <td colSpan={6} style={{ padding: 0 }}>
                                <ClientLines state={clientData[r.client_key]} />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {open && shown.length < c.rows.length && (
                <div style={{ fontSize: 12, color: "#94a3b8", padding: "8px 18px" }}>Showing {shown.length} of {c.rows.length} groups.</div>
              )}
            </div>
          );
        })}
        {centers.length === 0 && (
          <div style={{ ...S.card, padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Nothing here — no items match this view.</div>
        )}
      </div>

      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 12, lineHeight: 1.5 }}>
        Unpaid is reconciled against the invoice flat file — a service counts as paid only when it appears there, so anything rebilled and later paid
        drops off automatically and nothing is double-counted. Mark an item <strong>Paid</strong> to clear it from Open (e.g. when the payment isn't in the file yet),
        or <strong>In Progress</strong> while you work it; notes save automatically. Click a client to see every billing line they have this year, paid and unpaid.
        Summer Youth (SYD/SYT) is private pay and excluded.
        {meta.graceDays != null && ` Services from the last ${meta.graceDays} days are held back — too recent to judge${meta.cutoff ? ` (service dates on or before ${fmtDate(meta.cutoff)})` : ""}.`}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1a2d4d", color: "white", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
