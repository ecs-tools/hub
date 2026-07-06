import React, { useState, useEffect, useMemo } from "react";
import { API_BASE } from "../config/api.js";

// Invoice Manager — the invoice side of AR (county / private-pay / flat-monthly
// PDFs recorded in raw.invoice_registry by the generator tools). The claim side
// (waiver/Medicaid paid-unpaid) lives in Billing Overview; don't conflate them.
//
// Reads /api/invoices + /api/invoices/summary; "mark paid/sent" PATCHes payment
// fields (admin-only server-side). The backend answers { ready: false } until
// the registry table has been created, and this component explains that state
// instead of erroring — so it is always safe to ship ahead of the database.

const S = {
  body:      { padding: "24px 32px", maxWidth: 1400, margin: "0 auto" },
  row:       { display: "grid", gap: 18, marginBottom: 18 },
  card:      { background: "#fff", borderRadius: 10, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,.08)" },
  cardTitle: { fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: "#64748b", marginBottom: 8 },
  kpiValue:  { fontSize: 30, fontWeight: 700, color: "#1a2d4d" },
  kpiSub:    { fontSize: 13, color: "#64748b", marginTop: 3 },
  th:        { textAlign: "left", padding: "8px 12px", background: "#f8fafc", color: "#475569", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid #e2e8f0" },
  td:        { padding: "9px 12px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle", fontSize: 13 },
  select:    { border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", fontFamily: "inherit", background: "white", color: "#1a2d4d" },
  actionBtn: { border: "1px solid #e2e8f0", background: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "#1a2d4d" },
};

const STATUS_STYLES = {
  generated: { bg: "#f1f5f9", text: "#475569", label: "Generated" },
  sent:      { bg: "#dbeafe", text: "#1e40af", label: "Sent" },
  paid:      { bg: "#dcfce7", text: "#166534", label: "Paid" },
  partial:   { bg: "#fef9c3", text: "#854d0e", label: "Partial" },
  void:      { bg: "#e2e8f0", text: "#334155", label: "Void" },
};

const AGING_STYLES = {
  "Paid":           { bg: "#dcfce7", text: "#166534" },
  "Current (0-30)": { bg: "#f0fdf4", text: "#15803d" },
  "31-60":          { bg: "#fef9c3", text: "#854d0e" },
  "61-90":          { bg: "#ffedd5", text: "#9a3412" },
  "90+":            { bg: "#fee2e2", text: "#b91c1c" },
};

const BUCKET_ORDER = ["Current (0-30)", "31-60", "61-90", "90+"];

const fmtMoney = (v) =>
  `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMonth = (iso) => {
  if (!iso) return "";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return isNaN(d) ? iso : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

function Badge({ styleDef, children }) {
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: styleDef.bg, color: styleDef.text, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

// Full-page notice used for the "not set up yet" and "backend pending" states.
function Notice({ title, children }) {
  return (
    <div style={{ ...S.card, maxWidth: 620, margin: "60px auto", textAlign: "center", padding: "40px 36px" }}>
      <div style={{ fontSize: 30, marginBottom: 12 }}>🧾</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#1a2d4d", marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

// Modal for recording a payment (full or partial) against one invoice.
function PaymentModal({ invoice, onSave, onClose, saving }) {
  const openBalance = Number(invoice.open_balance || 0);
  const [amount, setAmount] = useState(openBalance > 0 ? openBalance.toFixed(2) : Number(invoice.amount).toFixed(2));
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const amountNum = parseFloat(amount);
  const alreadyPaid = Number(invoice.paid_amount || 0);
  const willBePaid = alreadyPaid + (isNaN(amountNum) ? 0 : amountNum);
  const fullyPaid = willBePaid >= Number(invoice.amount) - 0.005;
  const valid = !isNaN(amountNum) && amountNum > 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ ...S.card, width: 380, padding: "26px 28px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1a2d4d", marginBottom: 2 }}>Record payment</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 18 }}>
          {invoice.client_name} · {fmtMonth(invoice.service_month)} · invoiced {fmtMoney(invoice.amount)}
          {alreadyPaid > 0 && <> · already paid {fmtMoney(alreadyPaid)}</>}
        </div>
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 }}>Payment amount</label>
        <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 14, fontFamily: "inherit", marginBottom: 14 }} />
        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 }}>Payment date</label>
        <input type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)}
          style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: 14, fontFamily: "inherit", marginBottom: 8 }} />
        <div style={{ fontSize: 12, color: fullyPaid ? "#166534" : "#854d0e", marginBottom: 18 }}>
          {valid ? (fullyPaid ? "This settles the invoice — status becomes Paid." : `Partial payment — ${fmtMoney(Number(invoice.amount) - willBePaid)} stays open.`) : "Enter a payment amount."}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...S.actionBtn, padding: "8px 16px" }}>Cancel</button>
          <button disabled={!valid || saving}
            onClick={() => onSave({ status: fullyPaid ? "paid" : "partial", paid_amount: Number(willBePaid.toFixed(2)), paid_date: paidDate })}
            style={{ ...S.actionBtn, padding: "8px 16px", background: valid ? "#1a2d4d" : "#94a3b8", color: "#fff", border: "none", cursor: valid ? "pointer" : "default" }}>
            {saving ? "Saving…" : "Save payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesDashboard({ onBack, userRole }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendPending, setBackendPending] = useState(false); // API route not deployed yet
  const [notReady, setNotReady] = useState(null);               // registry table missing
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState("open");     // open | all | one status
  const [payerFilter, setPayerFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [payModal, setPayModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const isAdmin = userRole === "admin";

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2600); };

  async function load() {
    try {
      const [listRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/api/invoices`, { credentials: "include" }),
        fetch(`${API_BASE}/api/invoices/summary`, { credentials: "include" }),
      ]);
      if (listRes.status === 404) { setBackendPending(true); return; }
      if (!listRes.ok) throw new Error(`Invoices: ${listRes.status}`);
      const listData = await listRes.json();
      if (listData.ready === false) { setNotReady(listData.detail || "Not set up yet."); return; }
      setInvoices(listData.invoices || []);
      if (sumRes.ok) {
        const sumData = await sumRes.json();
        if (sumData.ready !== false) setSummary(sumData);
      }
    } catch (err) {
      console.error("Invoices load error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const payers = useMemo(() => [...new Set(invoices.map(i => i.payer).filter(Boolean))].sort(), [invoices]);
  const months = useMemo(() => [...new Set(invoices.map(i => String(i.service_month).slice(0, 10)))].sort().reverse(), [invoices]);

  const filtered = useMemo(() => invoices.filter(i =>
    (statusFilter === "all" || (statusFilter === "open" ? (i.status !== "paid" && Number(i.open_balance) > 0) : i.status === statusFilter)) &&
    (payerFilter === "All" || i.payer === payerFilter) &&
    (monthFilter === "All" || String(i.service_month).slice(0, 10) === monthFilter)
  ), [invoices, statusFilter, payerFilter, monthFilter]);

  const bucketAmounts = useMemo(() => {
    const map = {};
    (summary?.buckets || []).forEach(b => { map[b.aging_bucket] = b; });
    return map;
  }, [summary]);

  async function patchInvoice(inv, body, successMsg) {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/invoices/${inv.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const detail = (await res.json().catch(() => ({}))).detail;
        throw new Error(detail || `Update failed (${res.status})`);
      }
      const updated = await res.json();
      setInvoices(list => list.map(i => (i.id === updated.id ? updated : i)));
      showToast(successMsg);
      // Refresh KPI cards in the background so buckets stay honest.
      fetch(`${API_BASE}/api/invoices/summary`, { credentials: "include" })
        .then(r => (r.ok ? r.json() : null)).then(d => { if (d && d.ready !== false) setSummary(d); })
        .catch(() => {});
      setPayModal(null);
    } catch (err) {
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, fontSize: 16, color: "#64748b" }}>Loading invoices…</div>;

  if (backendPending) return (
    <Notice title="Backend update pending">
      The Invoice Manager API isn't live yet — this module lights up automatically
      once the latest backend is deployed to Railway. Nothing is wrong with your data.
    </Notice>
  );

  if (notReady) return (
    <Notice title="One-time setup needed">
      {notReady}
      <div style={{ marginTop: 14, fontSize: 13, color: "#94a3b8" }}>
        After that, every invoice the generator tools produce is tracked here automatically.
      </div>
    </Notice>
  );

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 10 }}>
      <div style={{ fontWeight: 600, color: "#dc2626" }}>Could not load invoices</div>
      <div style={{ fontSize: 13, color: "#64748b" }}>{error}</div>
    </div>
  );

  if (!invoices.length) return (
    <Notice title="No invoices recorded yet">
      The registry is live and waiting. Invoices appear here automatically the next
      time a generator tool runs (PL, ECS, SOS so far) — nothing to upload by hand.
    </Notice>
  );

  return (
    <div style={S.body}>
      {/* KPI strip */}
      <div style={{ ...S.row, gridTemplateColumns: "repeat(5, 1fr)" }}>
        <div style={S.card}>
          <div style={S.cardTitle}>Total Open</div>
          <div style={S.kpiValue}>{fmtMoney(summary?.total_open)}</div>
          <div style={S.kpiSub}>{summary?.open_count ?? 0} open invoice{(summary?.open_count ?? 0) === 1 ? "" : "s"}</div>
        </div>
        {BUCKET_ORDER.map(b => (
          <div key={b} style={S.card}>
            <div style={S.cardTitle}>{b}</div>
            <div style={{ ...S.kpiValue, fontSize: 24, color: AGING_STYLES[b].text }}>{fmtMoney(bucketAmounts[b]?.open_amount)}</div>
            <div style={S.kpiSub}>{bucketAmounts[b]?.invoice_count ?? 0} invoice{(bucketAmounts[b]?.invoice_count ?? 0) === 1 ? "" : "s"}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={S.select}>
          <option value="open">Open only</option>
          <option value="all">All statuses</option>
          {Object.entries(STATUS_STYLES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </select>
        <select value={payerFilter} onChange={e => setPayerFilter(e.target.value)} style={S.select}>
          <option>All</option>
          {payers.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={S.select}>
          <option>All</option>
          {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
        </select>
        <div style={{ fontSize: 12, color: "#64748b", marginLeft: "auto" }}>
          {filtered.length} of {invoices.length} invoices
        </div>
      </div>

      {/* Invoice table */}
      <div style={{ ...S.card, padding: 0, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={S.th}>Invoice #</th>
              <th style={S.th}>Client</th>
              <th style={S.th}>Payer</th>
              <th style={S.th}>Month</th>
              <th style={{ ...S.th, textAlign: "right" }}>Amount</th>
              <th style={{ ...S.th, textAlign: "right" }}>Open</th>
              <th style={S.th}>Status</th>
              <th style={S.th}>Aging</th>
              {isAdmin && <th style={S.th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(inv => {
              const st = STATUS_STYLES[inv.status] || STATUS_STYLES.generated;
              const ag = AGING_STYLES[inv.aging_bucket] || AGING_STYLES["Current (0-30)"];
              return (
                <tr key={inv.id}>
                  <td style={{ ...S.td, fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{inv.invoice_no}</td>
                  <td style={{ ...S.td, fontWeight: 600, color: "#1a2d4d" }}>{inv.client_name}</td>
                  <td style={S.td}>{inv.payer}</td>
                  <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtMonth(inv.service_month)}</td>
                  <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap" }}>{fmtMoney(inv.amount)}</td>
                  <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap", fontWeight: 600, color: Number(inv.open_balance) > 0 ? "#b91c1c" : "#166534" }}>{fmtMoney(inv.open_balance)}</td>
                  <td style={S.td}><Badge styleDef={st}>{st.label}</Badge></td>
                  <td style={S.td}>
                    <Badge styleDef={ag}>{inv.aging_bucket}{inv.aging_bucket !== "Paid" && inv.days_outstanding > 0 ? ` · ${inv.days_outstanding}d` : ""}</Badge>
                  </td>
                  {isAdmin && (
                    <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                      {inv.status === "generated" && (
                        <button style={{ ...S.actionBtn, marginRight: 6 }} disabled={saving}
                          onClick={() => patchInvoice(inv, { status: "sent" }, `${inv.client_name} marked sent`)}>
                          Mark sent
                        </button>
                      )}
                      {inv.status !== "paid" && inv.status !== "void" && (
                        <button style={{ ...S.actionBtn, background: "#1a2d4d", color: "#fff", border: "none" }} disabled={saving}
                          onClick={() => setPayModal(inv)}>
                          Record payment
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 12, lineHeight: 1.5 }}>
        Aging is measured from the end of the service month. This page covers invoices the
        tools generate (county / private pay / flat-monthly); waiver-claim AR lives in Billing Overview.
      </div>

      {payModal && (
        <PaymentModal invoice={payModal} saving={saving} onClose={() => setPayModal(null)}
          onSave={(body) => patchInvoice(payModal, body, `Payment recorded for ${payModal.client_name}`)} />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#1a2d4d", color: "white", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
