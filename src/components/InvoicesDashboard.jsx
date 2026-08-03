import React, { useState, useEffect, useMemo, useRef } from "react";
import { API_BASE } from "../config/api.js";
import Icon from "./Icon.jsx";

// Invoice Manager — the invoice side of AR (county / private-pay / flat-monthly
// PDFs recorded in raw.invoice_registry by the generator tools + backfill). The
// claim side (waiver/Medicaid paid-unpaid) lives in Billing Overview; don't
// conflate them.
//
// This is a PLACE OF WORK, not just a tracker (CONSOLIDATION_PLAN §7): each
// tool tab carries its own Generate card — upload the month's master file,
// queue a run (staging.pipeline_runs), and the local runner on Brock's PC
// executes the real generator. The visible billing month is an app-wide
// setting (staging.app_settings), not something buried in code. Every invoice
// row opens a detail drawer showing the billed lines behind the number
// (staging.stg_billing) plus the PDF.

const TOOLS = [
  { id: "ecs",    label: "ECS",               upload: "required", inputHint: "BillingByCostCenterDetail3 CSV" },
  { id: "lorain", label: "Lorain",            upload: "required", inputHint: "BillingByCostCenterDetail3 CSV (Lorain export) — output is one county workbook" },
  { id: "osl",    label: "OSL",               upload: "required", inputHint: "BillingByCostCenterDetail3 CSV (OSL export — ASA day counts)" },
  { id: "pl",     label: "Patient Liability", upload: "none",     inputHint: "Config-driven — no master file" },
  { id: "sos",    label: "SOS",               upload: "required", inputHint: "Month CSV" },
  { id: "sy",     label: "Summer Youth",      upload: "optional", inputHint: "Fresh Brittco export (recommended for a closed month); otherwise reads the warehouse" },
];

// County-scoped ECS re-runs (CONSOLIDATION_PLAN §7.1 — county cards INSIDE the
// ECS tab). They reuse the billing CSV already on the office PC from the
// month's main ECS run, so no master upload here.
const COUNTY_RUNS = [
  { id: "ecs_warren", label: "Warren County", transportUpload: true,
    hint: "Optional TransportByRoute CSV adds per-client pickup/drop-off pages to each invoice." },
  { id: "ecs_montgomery", label: "Montgomery County", transportUpload: false,
    hint: "Transport pages pull a fresh 211 TransportByRoute export from Brittco automatically." },
];

const S = {
  body:      { padding: "24px 32px", maxWidth: 1400, margin: "0 auto" },
  row:       { display: "grid", gap: 14, marginBottom: 16 },
  card:      { background: "#fff", borderRadius: 8, padding: "18px 20px", border: "1px solid var(--border)" },
  cardTitle: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--text-2)", marginBottom: 8 },
  kpiValue:  { fontSize: 28, fontWeight: 700, color: "var(--navy)", fontVariantNumeric: "tabular-nums" },
  kpiSub:    { fontSize: 13, color: "var(--text-2)", marginTop: 3 },
  th:        { textAlign: "left", padding: "8px 12px", background: "var(--bg-soft)", color: "var(--text-2)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid var(--border)" },
  td:        { padding: "9px 12px", borderBottom: "1px solid var(--bg-hover)", verticalAlign: "middle", fontSize: 13 },
  select:    { border: "1px solid var(--border)", borderRadius: 6, padding: "7px 10px", fontSize: 13, outline: "none", fontFamily: "inherit", background: "white", color: "var(--navy)" },
  actionBtn: { border: "1px solid var(--border)", background: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "var(--navy)" },
  mono:      { fontVariantNumeric: "tabular-nums" },
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

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const fmtMoney = (v) =>
  `$${Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtMonth = (iso) => {
  if (!iso) return "";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return isNaN(d) ? iso : d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

// Full "May 2026" form — what the generators take as --month and what the
// app-wide billing-month setting stores.
const monthLabel = (iso) => {
  if (!iso) return "";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  return isNaN(d) ? "" : `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

function Badge({ styleDef, children }) {
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: styleDef.bg, color: styleDef.text, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function Notice({ title, children }) {
  return (
    <div style={{ ...S.card, maxWidth: 620, margin: "60px auto", textAlign: "center", padding: "40px 36px" }}>
      <div style={{ marginBottom: 12, color: "#94a3b8", display: "flex", justifyContent: "center" }}><Icon name="receipt" size={30} strokeWidth={1.5} /></div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--navy)", marginBottom: 10 }}>{title}</div>
      <div style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

// ── Billing month bar ─────────────────────────────────────────────────────────
// The app-wide "what month are we invoicing" value — visible to everyone,
// settable by admins, carried into every queued generation run.
function BillingMonthBar({ month, isDefault, isAdmin, onSave, saving }) {
  const [editing, setEditing] = useState(false);
  const [selMonth, setSelMonth] = useState("");
  const [selYear, setSelYear] = useState("");

  const startEdit = () => {
    const [m, y] = (month || "").split(" ");
    setSelMonth(m || MONTH_NAMES[new Date().getMonth()]);
    setSelYear(y || String(new Date().getFullYear()));
    setEditing(true);
  };

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1].map(String);
  }, []);

  return (
    <div style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16, padding: "13px 20px" }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--text-2)" }}>Billing month</span>
      {!editing ? (
        <>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)" }}>{month || "—"}</span>
          {isDefault && <span style={{ fontSize: 12, color: "var(--text-3)" }}>(default — previous calendar month; not yet set by an admin)</span>}
          {isAdmin && (
            <button onClick={startEdit} style={{ ...S.actionBtn, marginLeft: "auto" }}>Change</button>
          )}
        </>
      ) : (
        <>
          <select value={selMonth} onChange={e => setSelMonth(e.target.value)} style={S.select}>
            {MONTH_NAMES.map(m => <option key={m}>{m}</option>)}
          </select>
          <select value={selYear} onChange={e => setSelYear(e.target.value)} style={S.select}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <button disabled={saving} onClick={async () => { await onSave(`${selMonth} ${selYear}`); setEditing(false); }}
            style={{ ...S.actionBtn, background: "var(--navy)", color: "#fff", border: "none" }}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} style={S.actionBtn}>Cancel</button>
        </>
      )}
      <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: editing ? 0 : "auto", flexBasis: "100%", marginTop: 2 }}>
        Generation runs use this month unless the uploaded file says otherwise — a mismatch warns before it runs.
      </span>
    </div>
  );
}

// ── Generate card (per tool tab, admin only) ──────────────────────────────────
function RunStatusLine({ run }) {
  const [showDetail, setShowDetail] = useState(false);
  if (!run) return null;
  const color = run.status === "success" ? "#166534"
    : run.status === "failed" ? "#b91c1c"
    : run.status === "expired" ? "#9a3412" : "#1e40af";
  const label = { queued: "Queued — waiting for the office PC runner",
    running: "Running…", success: "Succeeded", failed: "Failed", expired: "Expired (PC offline?)" }[run.status] || run.status;
  return (
    <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.5 }}>
      <span style={{ fontWeight: 700, color }}>{label}</span>
      <span style={{ color: "var(--text-2)" }}>
        {" "}· {run.billing_month || "—"} · requested {fmtDate(run.requested_at)} by {run.requested_by || "—"}
        {run.finished_at ? ` · finished ${fmtDate(run.finished_at)}` : ""}
      </span>
      {run.detail && (
        <>
          {" "}
          <button onClick={() => setShowDetail(s => !s)}
            style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 12, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", padding: 0 }}>
            {showDetail ? "hide output" : "show output"}
          </button>
          {showDetail && (
            <pre style={{ marginTop: 6, background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 6, padding: "10px 12px", fontSize: 11, fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 220, overflowY: "auto" }}>
              {run.detail}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

function GenerateCard({ tool, billingMonth, latestRun, busy, onGenerate }) {
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const cfg = TOOLS.find(t => t.id === tool);
  const runActive = latestRun && (latestRun.status === "queued" || latestRun.status === "running");

  if (!cfg?.upload) {
    return (
      <div style={{ ...S.card, marginBottom: 16, background: "var(--bg-soft)" }}>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          {cfg?.label} invoices can't be generated from the site yet — this tool still runs from
          its original folder until it's ported to the platform (CONSOLIDATION_PLAN Phase 4).
        </div>
      </div>
    );
  }

  const needsFile = cfg.upload === "required";
  const canRun = !busy && !runActive && (!needsFile || file);

  return (
    <div style={{ ...S.card, marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ minWidth: 220, flex: "1 1 260px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--navy)" }}>Generate {cfg.label} invoices — {billingMonth}</div>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3 }}>{cfg.inputHint}</div>
        </div>

        {cfg.upload !== "none" && (
          <>
            <input ref={fileRef} type="file" accept=".csv,.xlsx" style={{ display: "none" }}
              onChange={e => setFile(e.target.files?.[0] || null)} />
            <button onClick={() => fileRef.current?.click()} disabled={busy || runActive} style={S.actionBtn}>
              {file ? "Replace file" : (needsFile ? "Choose file" : "Choose file (optional)")}
            </button>
            {file && <span style={{ fontSize: 12, color: "var(--text-1)", maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>}
          </>
        )}

        <button disabled={!canRun}
          onClick={() => onGenerate(file).then(ok => { if (ok) { setFile(null); if (fileRef.current) fileRef.current.value = ""; } })}
          style={{ ...S.actionBtn, background: canRun ? "var(--navy)" : "#94a3b8", color: "#fff", border: "none", padding: "8px 18px", fontSize: 13 }}>
          {busy ? "Starting…" : runActive ? "Run in progress" : "Generate invoices"}
        </button>
      </div>
      <RunStatusLine run={latestRun} />
      {runActive && (
        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>
          Runs execute on the office PC (it has the Brittco + B:\ access) — if it's off, the run expires after 2 hours.
        </div>
      )}
    </div>
  );
}

// One county row inside the county-runs card.
function CountyRunRow({ county, latestRun, busy, anyEcsActive, onRun }) {
  const [clients, setClients] = useState("");
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const runActive = latestRun && (latestRun.status === "queued" || latestRun.status === "running");
  const canRun = !busy && !anyEcsActive;

  return (
    <div style={{ borderTop: "1px solid var(--bg-hover)", paddingTop: 12, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 200, flex: "1 1 240px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>{county.label}</div>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>{county.hint}</div>
        </div>

        <input type="text" placeholder="Only these clients (optional) — Last, First; Last, First"
          value={clients} onChange={e => setClients(e.target.value)}
          style={{ ...S.select, width: 250, fontSize: 12 }} />

        {county.transportUpload && (
          <>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
              onChange={e => setFile(e.target.files?.[0] || null)} />
            <button onClick={() => fileRef.current?.click()} disabled={!canRun} style={S.actionBtn}>
              {file ? "Replace transport CSV" : "Transport CSV (optional)"}
            </button>
            {file && <span style={{ fontSize: 12, color: "var(--text-1)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>}
          </>
        )}

        <button disabled={!canRun}
          onClick={() => onRun(county.id, file, clients).then(ok => {
            if (ok) { setFile(null); setClients(""); if (fileRef.current) fileRef.current.value = ""; }
          })}
          style={{ ...S.actionBtn, background: canRun ? "var(--navy)" : "#94a3b8", color: "#fff", border: "none", padding: "7px 14px" }}>
          {runActive ? "Run in progress" : `Run ${county.label.split(" ")[0]} only`}
        </button>
      </div>
      <RunStatusLine run={latestRun} />
    </div>
  );
}

// County-scoped re-runs card — shown inside the ECS tab only (admin).
// Collapsed by default: the core loop is upload → generate; this is the
// advanced control that sits AROUND it, not in front of it.
function CountyRunsCard({ runs, busy, onRun }) {
  const [open, setOpen] = useState(false);
  // Any run touching the shared ECS 1_INPUT blocks the whole family.
  const anyEcsActive = runs.some(r =>
    (r.tool === "ecs" || r.tool.startsWith("ecs_")) &&
    (r.status === "queued" || r.status === "running"));
  return (
    <div style={{ ...S.card, marginBottom: 16, paddingTop: 12, paddingBottom: open ? 18 : 12 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", border: "none", background: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{open ? "▾" : "▸"}</span>
        <span style={S.cardTitle}>County-scoped re-runs</span>
        <span style={{ fontSize: 12, color: "var(--text-3)", marginLeft: "auto" }}>
          {open ? "" : "Warren · Montgomery"}
        </span>
      </button>
      {open && (
        <>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8 }}>
            Regenerate ONE county without re-running the rest — replaces editing the
            old B:\ ad-hoc scripts. Uses the billing CSV already on the office PC
            from this month's main ECS run.
          </div>
          {COUNTY_RUNS.map(c => (
            <CountyRunRow key={c.id} county={c} busy={busy} anyEcsActive={anyEcsActive}
              latestRun={runs.find(r => r.tool === c.id) || null} onRun={onRun} />
          ))}
        </>
      )}
    </div>
  );
}

// ── Detail drawer: what was actually invoiced ────────────────────────────────
function DetailDrawer({ invoice, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);

  // Parent mounts this with key={invoice.id}, so a new invoice = fresh state.
  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/invoices/${invoice.id}/lines`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(`Lines: ${r.status}`); return r.json(); })
      .then(d => { if (alive) setData(d); })
      .catch(e => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [invoice.id]);

  const st = STATUS_STYLES[invoice.status] || STATUS_STYLES.generated;
  const delta = data?.ready && data.matched ? Number(invoice.amount) - Number(data.total_billed || 0) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "min(680px, 94vw)", height: "100%", background: "#fff", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "var(--navy)" }}>{invoice.client_name}</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 3 }}>
              {invoice.folder_name || "—"} · {fmtMonth(invoice.service_month)} · invoice {invoice.invoice_no || `#${invoice.id}`}
            </div>
          </div>
          <Badge styleDef={st}>{st.label}</Badge>
          <button onClick={onClose} style={{ ...S.actionBtn, padding: "4px 9px" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
            <div>
              <div style={S.cardTitle}>Invoiced</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)", ...S.mono }}>{fmtMoney(invoice.amount)}</div>
            </div>
            <div>
              <div style={S.cardTitle}>Paid</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#166534", ...S.mono }}>{fmtMoney(invoice.paid_amount)}</div>
            </div>
            <div>
              <div style={S.cardTitle}>Open</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: Number(invoice.open_balance) > 0 ? "#b91c1c" : "#166534", ...S.mono }}>{fmtMoney(invoice.open_balance)}</div>
            </div>
          </div>

          {invoice.has_pdf && (
            <a href={`${API_BASE}/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer"
              style={{ ...S.actionBtn, textDecoration: "none", display: "inline-block", marginBottom: 18 }}>
              {invoice.tool === "lorain" ? "Open workbook" : "Open PDF"}
            </a>
          )}

          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--navy)", marginBottom: 8 }}>Billed service lines</div>
          {err && <div style={{ fontSize: 13, color: "#b91c1c" }}>{err}</div>}
          {!data && !err && <div style={{ fontSize: 13, color: "var(--text-2)" }}>Loading lines…</div>}
          {data?.ready === false && <div style={{ fontSize: 13, color: "var(--text-2)" }}>{data.detail}</div>}
          {data?.ready && !data.matched && (
            <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
              No billing lines found in the warehouse for “{data.client_name}” in {fmtMonth(data.service_month)}.
              (The name may be spelled differently in Brittco, or the month isn't loaded yet.)
            </div>
          )}
          {data?.ready && data.matched && (
            <>
              <div style={{ overflowX: "auto", border: "1px solid var(--border)", borderRadius: 6 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={S.th}>Date</th>
                      <th style={S.th}>Code</th>
                      <th style={S.th}>Service</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Units</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Billed</th>
                      <th style={{ ...S.th, textAlign: "right" }}>Unpaid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.map((l, i) => (
                      <tr key={i}>
                        <td style={{ ...S.td, whiteSpace: "nowrap" }}>{l.attendance_date || "—"}</td>
                        <td style={{ ...S.td, fontFamily: "var(--font-mono)", fontSize: 12 }}>{l.service_code}</td>
                        <td style={S.td}>{l.service_description || "—"}</td>
                        <td style={{ ...S.td, textAlign: "right", ...S.mono }}>{l.units ?? "—"}</td>
                        <td style={{ ...S.td, textAlign: "right", ...S.mono }}>{l.billed_amount != null ? fmtMoney(l.billed_amount) : "—"}</td>
                        <td style={{ ...S.td, textAlign: "right", ...S.mono, color: Number(l.unpaid_amount) > 0 ? "#b91c1c" : "var(--text-2)" }}>
                          {l.unpaid_amount != null ? fmtMoney(l.unpaid_amount) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ fontSize: 13, marginTop: 10, color: "var(--text-1)" }}>
                {data.lines.length} lines · warehouse total <strong style={S.mono}>{fmtMoney(data.total_billed)}</strong>
                {delta != null && Math.abs(delta) > 0.005 && (
                  <span style={{ color: "#9a3412" }}>
                    {" "}· differs from the invoice by <strong style={S.mono}>{fmtMoney(Math.abs(delta))}</strong>
                    {" "}({delta > 0 ? "invoice higher" : "warehouse higher"} — late entries or a name mismatch are the usual causes)
                  </span>
                )}
                {delta != null && Math.abs(delta) <= 0.005 && (
                  <span style={{ color: "#166534" }}> · matches the invoice exactly</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const OVERLAY = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };

// ── Per-client re-run (ECS): regenerate ONE invoice; the old row auto-voids ──
function ReRunModal({ invoice, runs, billingMonth, busy, onRun, onClose }) {
  const [file, setFile] = useState(null);
  const fileRef = useRef(null);
  const anyEcsActive = runs.some(r =>
    (r.tool === "ecs" || r.tool.startsWith("ecs_")) &&
    (r.status === "queued" || r.status === "running"));
  const invoiceMonth = monthLabel(invoice.service_month);
  // The CSV sitting in the tool's input folder is the CURRENT billing month's
  // export. Re-running any other month with it would bill the wrong data, so
  // a fresh export for that month is mandatory in that case.
  const needsFile = !!billingMonth && invoiceMonth !== billingMonth;
  const canRun = !busy && !anyEcsActive && (!needsFile || file);

  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={{ ...S.card, width: 460, padding: "26px 28px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)", marginBottom: 2 }}>Re-run this client only</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 14 }}>
          {invoice.client_name} · {invoiceMonth}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.55, marginBottom: 14 }}>
          Regenerates this one invoice — nobody else's invoices are touched. When the
          new invoice registers, this version is voided automatically with a
          “superseded” note, so only one stays live.
        </div>
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 12 }}>
          {needsFile
            ? `This invoice is for ${invoiceMonth}, but the file on the office PC is the ${billingMonth} export — upload a fresh ${invoiceMonth} billing CSV so the right data is billed.`
            : "Uses the billing CSV already on the office PC. If you corrected the data in Brittco, upload a fresh export instead."}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }}
            onChange={e => setFile(e.target.files?.[0] || null)} />
          <button onClick={() => fileRef.current?.click()} style={S.actionBtn}>
            {file ? "Replace CSV" : needsFile ? "Choose billing CSV (required)" : "Fresh billing CSV (optional)"}
          </button>
          {file && <span style={{ fontSize: 12, color: "var(--text-1)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>}
        </div>
        {anyEcsActive && (
          <div style={{ fontSize: 12, color: "#9a3412", marginBottom: 12 }}>
            An ECS-family run is already queued or running — it has to finish first.
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...S.actionBtn, padding: "8px 16px" }}>Cancel</button>
          <button disabled={!canRun} onClick={() => onRun(invoice, file)}
            style={{ ...S.actionBtn, padding: "8px 16px", background: canRun ? "var(--navy)" : "#94a3b8", color: "#fff", border: "none" }}>
            {busy ? "Queuing…" : "Queue re-run"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rule-violation block on "Mark sent": fix by re-run, or override loudly ───
function OverrideModal({ blocked, saving, onReRun, onSend, onClose }) {
  const [reason, setReason] = useState("");
  const inv = blocked.invoice;
  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={{ ...S.card, width: 480, padding: "26px 28px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#b91c1c", marginBottom: 2 }}>Payer rules block this invoice</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 14 }}>
          {inv.client_name} · {fmtMonth(inv.service_month)}
        </div>
        <div style={{ border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 6, padding: "10px 14px", marginBottom: 14 }}>
          {blocked.violations.map((v, i) => (
            <div key={i} style={{ fontSize: 13, color: "#b91c1c", lineHeight: 1.6 }}>
              <strong>{v.category}</strong> — {fmtMoney(v.amount)} on the invoice
              {v.rule_note ? <span style={{ color: "#9a3412" }}> · rule: {v.rule_note}</span> : null}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-1)", lineHeight: 1.55, marginBottom: 14 }}>
          The clean fix is a re-run: the generator now excludes these items, and the
          corrected invoice replaces this one automatically. Sending anyway is allowed
          but recorded on the invoice with your reason.
        </div>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
          placeholder="Reason for sending anyway (required to override)"
          style={{ width: "100%", boxSizing: "border-box", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px", fontSize: 13, fontFamily: "inherit", marginBottom: 16, resize: "vertical" }} />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button onClick={onClose} style={{ ...S.actionBtn, padding: "8px 16px" }}>Cancel</button>
          <button disabled={saving} onClick={() => onReRun(inv)}
            style={{ ...S.actionBtn, padding: "8px 16px", background: "var(--navy)", color: "#fff", border: "none" }}>
            Re-run without these items
          </button>
          <button disabled={saving || !reason.trim()} onClick={() => onSend(inv, reason.trim())}
            style={{ ...S.actionBtn, padding: "8px 16px", background: reason.trim() ? "#b91c1c" : "#94a3b8", color: "#fff", border: "none" }}>
            {saving ? "Saving…" : "Send anyway"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invoice rules editor: the per-client "this payer disallows X" list ───────
function RulesModal({ clientNames, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const blankForm = { client_name: "", disallow_ads: false, disallow_nmt: false, disallow_miles: false, note: "" };
  const [form, setForm] = useState(blankForm);

  const loadRules = () =>
    fetch(`${API_BASE}/api/invoices/rules`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error(`Rules: ${r.status}`); return r.json(); })
      .then(setData)
      .catch(e => setErr(e.message));
  useEffect(() => { loadRules(); }, []);

  async function save(rule) {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/invoices/rules`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rule),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Save failed");
      setForm(blankForm);
      await loadRules();
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(rule) {
    if (!window.confirm(`Delete the rule for ${rule.client_name}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/invoices/rules/${rule.id}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Delete failed");
      await loadRules();
      onChanged?.();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const chk = (checked, onChange, label) => (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-1)", cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={onChange} /> {label}
    </label>
  );

  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={{ ...S.card, width: "min(680px, 94vw)", maxHeight: "86vh", overflowY: "auto", padding: "26px 28px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)" }}>Invoice rules</div>
          <button onClick={onClose} style={{ ...S.actionBtn, marginLeft: "auto", padding: "4px 9px" }}>✕</button>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 16 }}>
          What a client's payer agreement disallows on invoices. The generator leaves
          checked categories off the PDF, and “Mark sent” blocks any invoice that
          still carries one.
        </div>
        {err && <div style={{ fontSize: 13, color: "#b91c1c", marginBottom: 10 }}>{err}</div>}
        {!data && !err && <div style={{ fontSize: 13, color: "var(--text-2)" }}>Loading rules…</div>}
        {data?.ready === false && <div style={{ fontSize: 13, color: "var(--text-2)" }}>{data.detail}</div>}
        {data?.ready && (
          <>
            {data.rules.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 14 }}>No rules yet — add the first one below.</div>
            )}
            {data.rules.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderTop: "1px solid var(--bg-hover)", padding: "9px 0", opacity: r.active ? 1 : 0.55 }}>
                <div style={{ minWidth: 170, fontSize: 13, fontWeight: 600, color: "var(--navy)" }}>{r.client_name}</div>
                {chk(r.disallow_ads, () => save({ ...r, disallow_ads: !r.disallow_ads }), "No ADS")}
                {chk(r.disallow_nmt, () => save({ ...r, disallow_nmt: !r.disallow_nmt }), "No trips")}
                {chk(r.disallow_miles, () => save({ ...r, disallow_miles: !r.disallow_miles }), "No mileage")}
                <span style={{ fontSize: 12, color: "var(--text-2)", flex: 1, minWidth: 120 }}>{r.note || ""}</span>
                <button disabled={saving} onClick={() => save({ ...r, active: !r.active })} style={S.actionBtn}>
                  {r.active ? "Disable" : "Enable"}
                </button>
                <button disabled={saving} onClick={() => remove(r)} style={{ ...S.actionBtn, color: "#b91c1c" }}>Delete</button>
              </div>
            ))}
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 6, paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)", marginBottom: 8 }}>Add / update a rule</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <input list="rule-client-names" placeholder="Client (as shown in the invoice list)"
                  value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  style={{ ...S.select, width: 220 }} />
                <datalist id="rule-client-names">
                  {clientNames.map(n => <option key={n} value={n} />)}
                </datalist>
                {chk(form.disallow_ads, () => setForm(f => ({ ...f, disallow_ads: !f.disallow_ads })), "No ADS")}
                {chk(form.disallow_nmt, () => setForm(f => ({ ...f, disallow_nmt: !f.disallow_nmt })), "No trips")}
                {chk(form.disallow_miles, () => setForm(f => ({ ...f, disallow_miles: !f.disallow_miles })), "No mileage")}
                <input type="text" placeholder="Note, e.g. 'agreement excludes transport'"
                  value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  style={{ ...S.select, flex: 1, minWidth: 180 }} />
                <button disabled={saving || !form.client_name.trim() || !(form.disallow_ads || form.disallow_nmt || form.disallow_miles)}
                  onClick={() => save({ ...form, client_name: form.client_name.trim(), active: true })}
                  style={{ ...S.actionBtn, background: "var(--navy)", color: "#fff", border: "none", padding: "7px 14px" }}>
                  {saving ? "Saving…" : "Save rule"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// One invoice line inside an expanded folder.
function InvoiceRow({ inv, ruleFlag, isAdmin, saving, actions, onDetail }) {
  const st = STATUS_STYLES[inv.status] || STATUS_STYLES.generated;
  const ag = AGING_STYLES[inv.aging_bucket] || AGING_STYLES["Current (0-30)"];
  const pill = (bg, color, text, title) => (
    <span title={title} style={{ marginLeft: 8, display: "inline-block", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color }}>
      {text}
    </span>
  );
  return (
    <tr style={inv.status === "void" ? { opacity: 0.6 } : undefined}>
      <td style={{ ...S.td, fontWeight: 600, color: "var(--navy)" }}>
        <button onClick={() => onDetail(inv)} title="Review what was invoiced"
          style={{ background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 600, color: "var(--navy)", cursor: "pointer", textDecoration: "underline", textDecorationColor: "var(--light)", textUnderlineOffset: 3 }}>
          {inv.client_name}
        </button>
        {inv.flag === "zero_with_billing" &&
          pill("#fee2e2", "#b91c1c", "$0 with billing")}
        {ruleFlag && pill(
          ruleFlag.exact ? "#fee2e2" : "#fef9c3",
          ruleFlag.exact ? "#b91c1c" : "#854d0e",
          `⚠ ${ruleFlag.violations.map(v => v.category).join(", ")}`,
          (ruleFlag.exact
            ? "On the invoice but disallowed by this client's payer rules — re-run the client to fix"
            : "Warehouse billing suggests a disallowed category (older invoice — no stored breakdown to check exactly)")
          + (ruleFlag.rule_note ? ` · rule: ${ruleFlag.rule_note}` : "")
        )}
      </td>
      <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtMonth(inv.service_month)}</td>
      <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap", ...S.mono }}>{fmtMoney(inv.amount)}</td>
      <td style={{ ...S.td, textAlign: "right", whiteSpace: "nowrap", fontWeight: 600, ...S.mono, color: Number(inv.open_balance) > 0 ? "#b91c1c" : "#166534" }}>{fmtMoney(inv.open_balance)}</td>
      <td style={S.td}><Badge styleDef={st}>{st.label}</Badge></td>
      <td style={S.td}>
        <Badge styleDef={ag}>{inv.aging_bucket}{inv.aging_bucket !== "Paid" && inv.days_outstanding > 0 ? ` · ${inv.days_outstanding}d` : ""}</Badge>
      </td>
      <td style={{ ...S.td, whiteSpace: "nowrap" }}>
        <button style={{ ...S.actionBtn, marginRight: 6 }} onClick={() => onDetail(inv)}>Details</button>
        {inv.has_pdf ? (
          <a href={`${API_BASE}/api/invoices/${inv.id}/pdf`} target="_blank" rel="noopener noreferrer"
            style={{ ...S.actionBtn, textDecoration: "none", display: "inline-block" }}>
            {inv.tool === "lorain" ? "Workbook" : "PDF"}</a>
        ) : <span style={{ fontSize: 12, color: "var(--text-3)" }}>no file</span>}
      </td>
      {isAdmin && (
        <td style={{ ...S.td, whiteSpace: "nowrap" }}>
          {(() => {
            const btn = (label, onClick, opts = {}) => (
              <button key={label} disabled={saving}
                onClick={() => onClick(inv)}
                style={{ ...S.actionBtn, marginRight: 6,
                  ...(opts.primary ? { background: "var(--navy)", color: "#fff", border: "none" } : {}),
                  ...(opts.danger ? { color: "#b91c1c" } : {}) }}>
                {label}
              </button>
            );
            const out = [];
            if (inv.status === "generated") out.push(btn("Mark sent", actions.markSent, { primary: true }));
            if (inv.status === "sent") out.push(btn("Unsend", actions.unsend));
            if (["generated", "sent", "partial"].includes(inv.status))
              out.push(btn("Mark paid", actions.markPaid));
            if (["paid", "partial"].includes(inv.status))
              out.push(btn("Mark unpaid", actions.markUnpaid));
            if (inv.tool === "ecs" && inv.status !== "void")
              out.push(btn("Re-run", actions.reRun));
            if (!["void", "paid"].includes(inv.status))
              out.push(btn("Void", actions.void, { danger: true }));
            if (inv.status === "void") out.push(btn("Unvoid", actions.unvoid));
            return out;
          })()}
        </td>
      )}
    </tr>
  );
}

// A collapsible folder group (county / Private Pay / …) within a tool tab.
function FolderGroup({ folder, invoices, ruleFlags, isAdmin, saving, actions, onDetail, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const total = invoices.reduce((s, i) => s + Number(i.amount || 0), 0);
  const openBal = invoices.reduce((s, i) => s + Number(i.open_balance || 0), 0);
  return (
    <div style={{ ...S.card, padding: 0, marginBottom: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", border: "none", background: "var(--bg-soft)", padding: "12px 18px", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{open ? "▾" : "▸"}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--navy)" }}>{folder}</span>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{invoices.length} invoice{invoices.length === 1 ? "" : "s"}</span>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-2)", ...S.mono }}>
          {fmtMoney(total)} billed{openBal > 0 ? <span style={{ color: "#b91c1c", fontWeight: 600 }}> · {fmtMoney(openBal)} open</span> : ""}
        </span>
      </button>
      {open && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Client</th>
                <th style={S.th}>Month</th>
                <th style={{ ...S.th, textAlign: "right" }}>Amount</th>
                <th style={{ ...S.th, textAlign: "right" }}>Open</th>
                <th style={S.th}>Status</th>
                <th style={S.th}>Aging</th>
                <th style={S.th}>Review</th>
                {isAdmin && <th style={S.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <InvoiceRow key={inv.id} inv={inv} ruleFlag={ruleFlags[String(inv.id)]}
                  isAdmin={isAdmin} saving={saving} actions={actions} onDetail={onDetail} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function InvoicesDashboard({ userRole }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backendPending, setBackendPending] = useState(false);
  const [notReady, setNotReady] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeTool, setActiveTool] = useState("ecs");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [reRunInvoice, setReRunInvoice] = useState(null);   // invoice for the per-client re-run modal
  const [ruleBlocked, setRuleBlocked] = useState(null);     // {invoice, violations} from a blocked Mark sent
  const [showRules, setShowRules] = useState(false);
  const [ruleFlags, setRuleFlags] = useState({});           // invoice id -> {violations, exact, rule_note}
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [billingMonth, setBillingMonth] = useState(null); // {billing_month, is_default}
  const [monthSaving, setMonthSaving] = useState(false);
  const [runs, setRuns] = useState([]);
  const [runBusy, setRunBusy] = useState(false);
  const prevRunStatuses = useRef({});
  const isAdmin = userRole === "admin";

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const loadFlags = () =>
    fetch(`${API_BASE}/api/invoices/flags`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.ready) setRuleFlags(d.flags || {}); })
      .catch(() => {});

  async function load() {
    try {
      // include_void so the "Void" status filter has data; the default view
      // hides voids client-side.
      const [listRes, sumRes] = await Promise.all([
        fetch(`${API_BASE}/api/invoices?include_void=true`, { credentials: "include" }),
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

  const loadMonth = () =>
    fetch(`${API_BASE}/api/settings/billing-month`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null)).then(d => { if (d) setBillingMonth(d); })
      .catch(() => {});

  const loadRuns = () =>
    fetch(`${API_BASE}/api/invoices/runs`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.runs) setRuns(d.runs); })
      .catch(() => {});

  useEffect(() => { load(); loadFlags(); loadMonth(); loadRuns(); }, []);

  // Poll run status while anything is queued/running; refresh invoices when a
  // run flips to success (its registry rows are the new data).
  useEffect(() => {
    const flipped = runs.some(r => prevRunStatuses.current[r.id] &&
      prevRunStatuses.current[r.id] !== r.status && r.status === "success");
    prevRunStatuses.current = Object.fromEntries(runs.map(r => [r.id, r.status]));
    if (flipped) { showToast("Invoice run finished — refreshing"); load(); loadFlags(); }
    if (runs.some(r => r.status === "queued" || r.status === "running")) {
      const t = setTimeout(loadRuns, 8000);
      return () => clearTimeout(t);
    }
  }, [runs]);

  async function saveBillingMonth(value) {
    setMonthSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/billing-month`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing_month: value }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Save failed");
      setBillingMonth({ billing_month: value, is_default: false });
      showToast(`Billing month set to ${value}`);
    } catch (e) {
      showToast(e.message);
    } finally {
      setMonthSaving(false);
    }
  }

  async function generateInvoices(file) {
    setRunBusy(true);
    try {
      let uploadId = null;
      if (file) {
        const fd = new FormData();
        fd.append("tool", activeTool);
        fd.append("file", file);
        const upRes = await fetch(`${API_BASE}/api/invoices/upload`, {
          method: "POST", credentials: "include", body: fd,
        });
        if (!upRes.ok) throw new Error((await upRes.json().catch(() => ({}))).detail || "Upload failed");
        uploadId = (await upRes.json()).upload_id;
      }
      const runRes = await fetch(`${API_BASE}/api/invoices/run`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: activeTool, upload_id: uploadId }),
      });
      if (!runRes.ok) throw new Error((await runRes.json().catch(() => ({}))).detail || "Could not queue the run");
      const data = await runRes.json();
      showToast(`${TOOLS.find(t => t.id === activeTool)?.label} run queued for ${data.billing_month}`);
      loadRuns();
      return true;
    } catch (e) {
      showToast(e.message);
      return false;
    } finally {
      setRunBusy(false);
    }
  }

  async function runCounty(countyId, transportFile, clients) {
    setRunBusy(true);
    try {
      let transportUploadId = null;
      if (transportFile) {
        const fd = new FormData();
        fd.append("tool", countyId);
        fd.append("file", transportFile);
        const upRes = await fetch(`${API_BASE}/api/invoices/upload`, {
          method: "POST", credentials: "include", body: fd,
        });
        if (!upRes.ok) throw new Error((await upRes.json().catch(() => ({}))).detail || "Transport upload failed");
        transportUploadId = (await upRes.json()).upload_id;
      }
      const runRes = await fetch(`${API_BASE}/api/invoices/run`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: countyId,
          transport_upload_id: transportUploadId,
          clients: clients?.trim() || null,
        }),
      });
      if (!runRes.ok) throw new Error((await runRes.json().catch(() => ({}))).detail || "Could not queue the run");
      const data = await runRes.json();
      showToast(`${COUNTY_RUNS.find(c => c.id === countyId)?.label} run queued for ${data.billing_month}`);
      loadRuns();
      return true;
    } catch (e) {
      showToast(e.message);
      return false;
    } finally {
      setRunBusy(false);
    }
  }

  const byTool = useMemo(() => {
    const m = {};
    invoices.forEach(i => { (m[i.tool] = m[i.tool] || []).push(i); });
    return m;
  }, [invoices]);

  // Default to the first tool that actually has invoices.
  useEffect(() => {
    if (!invoices.length) return;
    if (!(byTool[activeTool] || []).length) {
      const firstWith = TOOLS.find(t => (byTool[t.id] || []).length);
      if (firstWith) setActiveTool(firstWith.id);
    }
  }, [invoices]); // eslint-disable-line react-hooks/exhaustive-deps

  const tabInvoices = useMemo(() => byTool[activeTool] || [], [byTool, activeTool]);

  const months = useMemo(
    () => [...new Set(tabInvoices.map(i => String(i.service_month).slice(0, 10)))].sort().reverse(),
    [tabInvoices]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tabInvoices.filter(i => {
      // Voided (incl. superseded) rows only show under the explicit Void filter.
      if (i.status === "void" && statusFilter !== "void") return false;
      if (statusFilter !== "all" && (statusFilter === "open"
        ? (i.status === "paid" || Number(i.open_balance) <= 0)
        : i.status !== statusFilter)) return false;
      if (monthFilter !== "All" && String(i.service_month).slice(0, 10) !== monthFilter) return false;
      if (q) {
        const hay = `${i.client_name} ${i.amount} ${fmtMonth(i.service_month)} ${i.folder_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tabInvoices, statusFilter, monthFilter, search]);

  const folders = useMemo(() => {
    const m = {};
    visible.forEach(i => { (m[i.folder_name || "—"] = m[i.folder_name || "—"] || []).push(i); });
    return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visible]);

  const bucketAmounts = useMemo(() => {
    const map = {};
    (summary?.buckets || []).forEach(b => { map[b.aging_bucket] = b; });
    return map;
  }, [summary]);

  const latestRunForTool = useMemo(
    () => runs.find(r => r.tool === activeTool) || null,
    [runs, activeTool]
  );

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
        // A blocked "Mark sent": the payer rules found disallowed items —
        // hand off to the override modal instead of a toast.
        if (detail && typeof detail === "object" && detail.rule_violations) {
          setRuleBlocked({ invoice: inv, violations: detail.rule_violations });
          return false;
        }
        throw new Error((typeof detail === "string" && detail) || `Update failed (${res.status})`);
      }
      const updated = await res.json();
      setInvoices(list => list.map(i => (i.id === updated.id ? updated : i)));
      showToast(successMsg);
      fetch(`${API_BASE}/api/invoices/summary`, { credentials: "include" })
        .then(r => (r.ok ? r.json() : null)).then(d => { if (d && d.ready !== false) setSummary(d); })
        .catch(() => {});
      loadFlags();
      setRuleBlocked(null);
      return true;
    } catch (err) {
      showToast(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Per-client re-run: queue an ECS run filtered to this one client, for the
  // invoice's own month. The registry auto-voids this invoice when the
  // regenerated one lands.
  async function queueClientRerun(inv, file) {
    setRunBusy(true);
    try {
      let uploadId = null;
      if (file) {
        const fd = new FormData();
        fd.append("tool", "ecs");
        fd.append("file", file);
        const upRes = await fetch(`${API_BASE}/api/invoices/upload`, {
          method: "POST", credentials: "include", body: fd,
        });
        if (!upRes.ok) throw new Error((await upRes.json().catch(() => ({}))).detail || "Upload failed");
        uploadId = (await upRes.json()).upload_id;
      }
      const runRes = await fetch(`${API_BASE}/api/invoices/run`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "ecs",
          upload_id: uploadId,
          clients: inv.client_name,
          billing_month: monthLabel(inv.service_month),
        }),
      });
      if (!runRes.ok) throw new Error((await runRes.json().catch(() => ({}))).detail || "Could not queue the run");
      showToast(`Re-run queued for ${inv.client_name} — this version is superseded when it finishes`);
      setReRunInvoice(null);
      setRuleBlocked(null);
      loadRuns();
    } catch (e) {
      showToast(e.message);
    } finally {
      setRunBusy(false);
    }
  }

  const rowActions = {
    markSent:   (inv) => patchInvoice(inv, { status: "sent" }, `${inv.client_name} marked sent`),
    unsend:     (inv) => patchInvoice(inv, { status: "generated" }, `${inv.client_name} unsent`),
    markPaid:   (inv) => patchInvoice(inv, {
      status: "paid", paid_amount: Number(inv.amount),
      paid_date: new Date().toISOString().slice(0, 10),
    }, `${inv.client_name} marked paid`),
    markUnpaid: (inv) => patchInvoice(inv, { status: "sent", paid_amount: null, paid_date: null },
      `${inv.client_name} marked unpaid`),
    void:       (inv) => {
      if (window.confirm(`Void the ${fmtMonth(inv.service_month)} invoice for ${inv.client_name} (${fmtMoney(inv.amount)})?\n\nIt stays visible under the "Void" status filter and can be unvoided.`))
        patchInvoice(inv, { status: "void" }, `${inv.client_name} voided`);
    },
    unvoid:     (inv) => patchInvoice(inv, { status: "generated" }, `${inv.client_name} unvoided`),
    reRun:      (inv) => setReRunInvoice(inv),
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, fontSize: 16, color: "var(--text-2)" }}>Loading invoices…</div>;

  if (backendPending) return (
    <Notice title="Backend update pending">
      The Invoice Manager API isn't live yet — this module lights up automatically
      once the latest backend is deployed to Railway. Nothing is wrong with your data.
    </Notice>
  );

  if (notReady) return (
    <Notice title="One-time setup needed">
      {notReady}
      <div style={{ marginTop: 14, fontSize: 13, color: "var(--text-3)" }}>
        After that, every invoice the generator tools produce is tracked here automatically.
      </div>
    </Notice>
  );

  if (error) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 10 }}>
      <div style={{ fontWeight: 600, color: "#dc2626" }}>Could not load invoices</div>
      <div style={{ fontSize: 13, color: "var(--text-2)" }}>{error}</div>
    </div>
  );

  // Non-admins with an empty registry get the explainer; admins always get the
  // full workbench (tabs + generate card) — that's how the first data arrives.
  if (!invoices.length && !isAdmin) return (
    <Notice title="No invoices recorded yet">
      The registry is live and waiting. Invoices appear here automatically the next
      time a generator tool runs.
    </Notice>
  );

  return (
    <div style={S.body}>
      {/* Billing month — the one visible, settable value */}
      <BillingMonthBar month={billingMonth?.billing_month} isDefault={billingMonth?.is_default}
        isAdmin={isAdmin} onSave={saveBillingMonth} saving={monthSaving} />

      {/* Tool tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "2px solid var(--border)", marginBottom: 16, flexWrap: "wrap" }}>
        {TOOLS.map(t => {
          const n = (byTool[t.id] || []).length;
          const active = activeTool === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTool(t.id)}
              style={{
                border: "none", background: "none", cursor: "pointer", fontFamily: "inherit",
                padding: "10px 16px", fontSize: 14, fontWeight: active ? 700 : 500,
                color: active ? "var(--navy)" : "var(--text-2)",
                borderBottom: active ? "3px solid var(--navy)" : "3px solid transparent", marginBottom: -2,
              }}>
              {t.label}
              <span style={{ marginLeft: 7, fontSize: 12, fontWeight: 600, color: active ? "var(--navy)" : "var(--text-3)", ...S.mono }}>{n}</span>
            </button>
          );
        })}
      </div>

      {/* Generate card — upload + run for this tool (admin only) */}
      {isAdmin && (
        <GenerateCard tool={activeTool} billingMonth={billingMonth?.billing_month || "…"}
          latestRun={latestRunForTool} busy={runBusy} onGenerate={generateInvoices} />
      )}

      {/* County-scoped re-runs — ECS tab only (§7.1: county cards inside the tab) */}
      {isAdmin && activeTool === "ecs" && (
        <CountyRunsCard runs={runs} busy={runBusy} onRun={runCounty} />
      )}

      {/* Per-tab controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input type="text" placeholder="Search name, amount, month…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...S.select, width: 240, border: `1px solid ${search ? "var(--steel)" : "var(--border)"}`, background: search ? "var(--accent-soft)" : "white" }} />
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={S.select}>
          <option>All</option>
          {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={S.select}>
          <option value="all">All statuses</option>
          <option value="open">Open only</option>
          {Object.entries(STATUS_STYLES).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
        </select>
        {isAdmin && (
          <button onClick={() => setShowRules(true)} style={S.actionBtn}>
            Invoice rules{Object.keys(ruleFlags).length > 0 ? ` · ${Object.keys(ruleFlags).length} flagged` : ""}
          </button>
        )}
        <div style={{ fontSize: 12, color: "var(--text-2)", marginLeft: "auto", ...S.mono }}>
          {visible.length} of {tabInvoices.length} invoices
        </div>
      </div>

      {/* Folder-grouped invoices for the active tool */}
      {tabInvoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "var(--text-3)", fontSize: 14 }}>
          No invoices recorded for {TOOLS.find(t => t.id === activeTool)?.label} yet.
          {isAdmin && " Generate a month above, or run the registry backfill to load history."}
        </div>
      ) : folders.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 0", color: "var(--text-3)", fontSize: 14 }}>
          No invoices match the current filters.
        </div>
      ) : (
        folders.map(([folder, list], idx) => (
          <FolderGroup key={folder} folder={folder} invoices={list} ruleFlags={ruleFlags}
            isAdmin={isAdmin} saving={saving} actions={rowActions}
            defaultOpen={folders.length <= 3 || idx === 0}
            onDetail={setDetailInvoice} />
        ))
      )}

      {/* AR overview — support info below the work area, not in front of it */}
      <div style={{ ...S.row, gridTemplateColumns: "repeat(5, 1fr)", marginTop: 20 }}>
        <div style={S.card}>
          <div style={S.cardTitle}>Total Open (all tools)</div>
          <div style={S.kpiValue}>{fmtMoney(summary?.total_open)}</div>
          <div style={S.kpiSub}>{summary?.open_count ?? 0} open invoice{(summary?.open_count ?? 0) === 1 ? "" : "s"}</div>
        </div>
        {BUCKET_ORDER.map(b => (
          <div key={b} style={S.card}>
            <div style={S.cardTitle}>{b}</div>
            <div style={{ ...S.kpiValue, fontSize: 22, color: AGING_STYLES[b].text }}>{fmtMoney(bucketAmounts[b]?.open_amount)}</div>
            <div style={S.kpiSub}>{bucketAmounts[b]?.invoice_count ?? 0} invoice{(bucketAmounts[b]?.invoice_count ?? 0) === 1 ? "" : "s"}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 12, lineHeight: 1.5 }}>
        Aging is measured from the end of the service month. This page covers invoices the
        tools generate (county / private pay / patient-liability / vouchers); waiver-claim AR lives in Billing Overview.
      </div>

      {detailInvoice && <DetailDrawer key={detailInvoice.id} invoice={detailInvoice} onClose={() => setDetailInvoice(null)} />}

      {reRunInvoice && (
        <ReRunModal invoice={reRunInvoice} runs={runs} billingMonth={billingMonth?.billing_month}
          busy={runBusy} onRun={queueClientRerun} onClose={() => setReRunInvoice(null)} />
      )}

      {ruleBlocked && (
        <OverrideModal blocked={ruleBlocked} saving={saving}
          onReRun={(inv) => { setRuleBlocked(null); setReRunInvoice(inv); }}
          onSend={(inv, reason) => patchInvoice(inv,
            { status: "sent", override_rules: true, override_reason: reason },
            `${inv.client_name} marked sent — override recorded`)}
          onClose={() => setRuleBlocked(null)} />
      )}

      {showRules && (
        <RulesModal clientNames={[...new Set(invoices.map(i => i.client_name))].sort()}
          onChanged={loadFlags} onClose={() => setShowRules(false)} />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "var(--navy)", color: "white", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
