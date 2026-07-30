import React, { useState, useEffect, useMemo, useCallback } from "react";
import { API_BASE } from "../config/api.js";

// Private Pay Tracking — a prepaid PUNCH-CARD for family private-pay clients.
//
// Families mail checks that buy N service days, before the service happens. A
// branch manager must not schedule past what's been paid for. The number that
// matters is DAYS REMAINING = days bought (the check ledger) − private-pay
// service days used (from billing). It rolls over month to month and never
// resets. See ecs-platform docs/specs/PRIVATE_PAY_TRACKER_SPEC.md.
//
// Everything on screen is DERIVED from the backend except the checks themselves,
// which are the one human input (a check is a physical object no system can see).
// No client names are ever hardcoded here — the roster arrives from the API.

const BAL_URL   = `${API_BASE}/api/private-pay/balances`;
const CHECKS_URL = `${API_BASE}/api/private-pay/checks`;

const ENTRY_TYPES = [
  { value: "check",           label: "Check" },
  { value: "opening_balance", label: "Opening balance" },
  { value: "adjustment",      label: "Adjustment" },
  { value: "refund",          label: "Refund" },
];

// Alert colors are SEMANTIC (how close to running out) — literal on purpose.
const STATE_STYLE = {
  "OK":               { bg: "#dcfce7", text: "#166534", dot: "#22c55e" },
  "Approaching":      { bg: "#fef9c3", text: "#854d0e", dot: "#eab308" },
  "Exhausted":        { bg: "#ffedd5", text: "#9a3412", dot: "#f97316" },
  "Over-delivered":   { bg: "#fee2e2", text: "#b91c1c", dot: "#ef4444" },
  "No checks logged": { bg: "var(--bg-soft)", text: "var(--text-2)", dot: "var(--text-3)" },
};

const S = {
  body:  { padding: "24px 32px", maxWidth: 1200, margin: "0 auto" },
  card:  { background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)" },
  th:    { textAlign: "left", padding: "8px 12px", background: "var(--bg-soft)", color: "var(--text-2)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" },
  td:    { padding: "9px 12px", borderBottom: "1px solid var(--bg-hover)", verticalAlign: "middle", fontSize: 13 },
  num:   { fontVariantNumeric: "tabular-nums" },
  input: { border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "7px 10px", fontSize: 13, fontFamily: "inherit", outline: "none", background: "var(--bg)" },
  label: { fontSize: 11, fontWeight: 600, color: "var(--text-2)", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4, display: "block" },
};

// ── formatting ────────────────────────────────────────────────────────────────
const fmtDays = (n) => {
  if (n === null || n === undefined) return "—";
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};
const fmtMoney = (n) => {
  if (n === null || n === undefined || n === "") return "—";
  return `$${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

function StateBadge({ state }) {
  const st = STATE_STYLE[state] || STATE_STYLE["No checks logged"];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: st.bg, color: st.text, whiteSpace: "nowrap" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: st.dot, flexShrink: 0 }} />
      {state}
    </span>
  );
}

// ── Log-a-check form (managers/admins) ────────────────────────────────────────
function LogCheckForm({ roster, onLogged }) {
  const today = new Date().toISOString().slice(0, 10);
  const [client, setClient]   = useState("");
  const [when, setWhen]       = useState(today);
  const [days, setDays]       = useState("");
  const [amount, setAmount]   = useState("");
  const [entryType, setEntryType] = useState("check");
  const [memo, setMemo]       = useState("");
  const [busy, setBusy]       = useState(false);
  const [msg, setMsg]         = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!client.trim()) { setMsg({ err: true, text: "Pick a client." }); return; }
    if (days === "" || isNaN(Number(days))) { setMsg({ err: true, text: "Days is required." }); return; }
    setBusy(true);
    try {
      const res = await fetch(CHECKS_URL, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: client.trim(),
          check_date: when,
          days: Number(days),
          amount: amount === "" ? null : Number(amount),
          entry_type: entryType,
          memo: memo.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Failed (${res.status})`);
      }
      setMsg({ err: false, text: `Logged ${fmtDays(days)} day(s) for ${client.trim()}.` });
      setClient(""); setDays(""); setAmount(""); setMemo(""); setEntryType("check"); setWhen(today);
      onLogged();
    } catch (err) {
      setMsg({ err: true, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ ...S.card, padding: "16px 18px", marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", marginBottom: 12 }}>Log a check</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "2 1 200px" }}>
          <label style={S.label}>Client</label>
          <input list="pp-roster" value={client} onChange={e => setClient(e.target.value)}
            placeholder="Last, First" style={{ ...S.input, width: "100%" }} />
          <datalist id="pp-roster">
            {roster.map(name => <option key={name} value={name} />)}
          </datalist>
        </div>
        <div style={{ flex: "1 1 120px" }}>
          <label style={S.label}>Date received</label>
          <input type="date" value={when} onChange={e => setWhen(e.target.value)} style={{ ...S.input, width: "100%" }} />
        </div>
        <div style={{ flex: "0 1 90px" }}>
          <label style={S.label}>Days</label>
          <input type="number" step="0.5" value={days} onChange={e => setDays(e.target.value)}
            placeholder="10" style={{ ...S.input, width: "100%" }} />
        </div>
        <div style={{ flex: "0 1 120px" }}>
          <label style={S.label}>Amount (opt.)</label>
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder="602.50" style={{ ...S.input, width: "100%" }} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label style={S.label}>Type</label>
          <select value={entryType} onChange={e => setEntryType(e.target.value)} style={{ ...S.input, width: "100%", cursor: "pointer" }}>
            {ENTRY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ flex: "2 1 160px" }}>
          <label style={S.label}>Memo (opt.)</label>
          <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="check #, note…" style={{ ...S.input, width: "100%" }} />
        </div>
        <button type="submit" disabled={busy}
          style={{ background: "var(--navy)", color: "#fff", border: "none", borderRadius: "var(--radius-sm)", padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1, fontFamily: "inherit", flexShrink: 0 }}>
          {busy ? "Adding…" : "Add"}
        </button>
      </div>
      {entryType === "opening_balance" && (
        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 10 }}>
          Opening balance = days already paid for but not yet used at go-live. Use the same date as the tracker start.
        </div>
      )}
      {msg && (
        <div style={{ fontSize: 13, marginTop: 10, color: msg.err ? "#b91c1c" : "#166534" }}>{msg.text}</div>
      )}
    </form>
  );
}

// ── Expanded per-client ledger (view + delete) ────────────────────────────────
function ClientLedger({ client, canWrite, onChanged }) {
  const [rows, setRows]     = useState(null);
  const [error, setError]   = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${CHECKS_URL}?client=${encodeURIComponent(client)}`, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setRows(await res.json());
    } catch (err) { setError(err.message); }
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!window.confirm("Delete this ledger entry? This can't be undone.")) return;
    const res = await fetch(`${CHECKS_URL}/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok || res.status === 204) { await load(); onChanged(); }
  };

  if (error) return <div style={{ ...S.td, color: "#b91c1c" }}>Could not load ledger: {error}</div>;
  if (rows === null) return <div style={{ ...S.td, color: "var(--text-2)" }}>Loading ledger…</div>;
  if (rows.length === 0) return <div style={{ ...S.td, color: "var(--text-2)" }}>No checks logged for this client yet.</div>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", background: "var(--bg-soft)" }}>
      <thead>
        <tr>
          <th style={S.th}>Date</th>
          <th style={{ ...S.th, textAlign: "right" }}>Days</th>
          <th style={{ ...S.th, textAlign: "right" }}>Amount</th>
          <th style={S.th}>Type</th>
          <th style={S.th}>Memo</th>
          {canWrite && <th style={{ ...S.th, textAlign: "right" }} />}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td style={S.td}>{fmtDate(r.check_date)}</td>
            <td style={{ ...S.td, textAlign: "right", ...S.num }}>{fmtDays(r.days)}</td>
            <td style={{ ...S.td, textAlign: "right", ...S.num }}>{fmtMoney(r.amount)}</td>
            <td style={{ ...S.td, textTransform: "capitalize" }}>{String(r.entry_type).replace("_", " ")}</td>
            <td style={{ ...S.td, color: "var(--text-2)" }}>{r.memo || "—"}</td>
            {canWrite && (
              <td style={{ ...S.td, textAlign: "right" }}>
                <button onClick={() => del(r.id)} title="Delete entry"
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "3px 9px", fontSize: 12, color: "#b91c1c", cursor: "pointer", fontFamily: "inherit" }}>
                  Delete
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PrivatePayTracker({ userRole }) {
  const canWrite = userRole === "admin" || userRole === "manager";
  const [configured, setConfigured] = useState(true);
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(BAL_URL, { credentials: "include" });
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      setConfigured(data.configured !== false);
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setError(null);
    } catch (err) {
      console.error("Private pay load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const roster = useMemo(
    () => Array.from(new Set(rows.map(r => r.client_name))).sort(),
    [rows]
  );

  const asOf = rows.find(r => r.billing_as_of)?.billing_as_of;

  const summary = useMemo(() => {
    const s = { "Over-delivered": 0, "Exhausted": 0, "Approaching": 0 };
    rows.forEach(r => { if (r.state in s) s[r.state] += 1; });
    return s;
  }, [rows]);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, fontSize: 16, color: "var(--text-2)" }}>
      Loading private pay balances…
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 10 }}>
      <div style={{ fontWeight: 600, color: "#dc2626" }}>Could not load private pay data</div>
      <div style={{ fontSize: 13, color: "var(--text-2)" }}>{error}</div>
    </div>
  );

  if (!configured) return (
    <div style={S.body}>
      <div style={{ ...S.card, padding: "20px 22px", background: "#fef9c3", border: "1px solid #fde68a" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#854d0e", marginBottom: 6 }}>Not set up yet</div>
        <div style={{ fontSize: 13, color: "#854d0e", lineHeight: 1.6 }}>
          The <code>staging.private_pay_balance</code> view isn't on this database yet. Deploy the data layer first:
          run <code>004_create_private_pay_checks.sql</code>, then <code>dbt build -s private_pay_balance</code>, then seed opening balances. See the spec in ecs-platform.
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.body}>
      <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 14, lineHeight: 1.6 }}>
        Prepaid days per family. <strong>Remaining = days bought − days used.</strong> Rolls over month to month.
        {asOf && <> Usage current through <strong>{fmtDate(asOf)}</strong> — late attendance can only lower it, so treat remaining as a ceiling.</>}
      </div>

      {/* Attention strip — only shows the states that need action */}
      {(summary["Over-delivered"] + summary["Exhausted"] + summary["Approaching"]) > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {summary["Over-delivered"] > 0 && <Pill state="Over-delivered" n={summary["Over-delivered"]} />}
          {summary["Exhausted"] > 0 && <Pill state="Exhausted" n={summary["Exhausted"]} />}
          {summary["Approaching"] > 0 && <Pill state="Approaching" n={summary["Approaching"]} />}
        </div>
      )}

      {canWrite && <LogCheckForm roster={roster} onLogged={load} />}

      <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Client</th>
                <th style={{ ...S.th, textAlign: "right" }}>Days bought</th>
                <th style={{ ...S.th, textAlign: "right" }}>Days used</th>
                <th style={{ ...S.th, textAlign: "right" }}>Remaining</th>
                <th style={S.th}>Status</th>
                <th style={{ ...S.th, textAlign: "right" }}>$ received</th>
                <th style={{ ...S.th, textAlign: "right" }}>Last check</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td style={{ ...S.td, color: "var(--text-2)", textAlign: "center", padding: "30px" }} colSpan={7}>
                  No private-pay clients yet. Log a check, or wait for private-pay billing to appear.
                </td></tr>
              )}
              {rows.map(r => {
                const open = expanded === r.client_name;
                const neg = Number(r.days_remaining) < 0;
                return (
                  <React.Fragment key={r.client_name}>
                    <tr onClick={() => setExpanded(open ? null : r.client_name)}
                      style={{ cursor: "pointer", background: open ? "var(--bg-soft)" : "transparent" }}>
                      <td style={{ ...S.td, fontWeight: 600, color: "var(--navy)" }}>
                        <span style={{ display: "inline-block", width: 12, color: "var(--text-3)" }}>{open ? "▾" : "▸"}</span>
                        {r.client_name}
                      </td>
                      <td style={{ ...S.td, textAlign: "right", ...S.num }}>{fmtDays(r.days_bought)}</td>
                      <td style={{ ...S.td, textAlign: "right", ...S.num }}>{fmtDays(r.days_used)}</td>
                      <td style={{ ...S.td, textAlign: "right", ...S.num, fontWeight: 700, color: neg ? "#b91c1c" : "var(--text-1)" }}>{fmtDays(r.days_remaining)}</td>
                      <td style={S.td}><StateBadge state={r.state} /></td>
                      <td style={{ ...S.td, textAlign: "right", ...S.num, color: "var(--text-2)" }}>{fmtMoney(r.dollars_received)}</td>
                      <td style={{ ...S.td, textAlign: "right", color: "var(--text-2)" }}>{fmtDate(r.last_check_date)}</td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0, borderBottom: "1px solid var(--border)" }}>
                          <ClientLedger client={r.client_name} canWrite={canWrite} onChanged={load} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Pill({ state, n }) {
  const st = STATE_STYLE[state];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, background: st.bg, color: st.text, borderRadius: "var(--radius-sm)", padding: "8px 14px", fontSize: 13, fontWeight: 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: st.dot }} />
      {n} {state}
    </div>
  );
}
