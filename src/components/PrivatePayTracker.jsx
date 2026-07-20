import React from "react";

// Private Pay Voucher Tracker — FRAME ONLY (2026-07-20).
//
// Intended purpose: show how close each private-pay / voucher client is to
// exhausting their authorized amount, alongside the existing county/waiver
// billing views. Nothing here is wired to real data yet — see the open
// questions in the footnote below (mirrored in
// C:\Projects\ecs-platform\backend\PRIVATE_PAY_TRACKER_NOTES.md) and the stub
// calculation layer in C:\Projects\ecs-platform\backend\private_pay_tracker.py.
//
// Scope is fixed to three client groups for now — two named private-pay
// clients plus the SWOCOG / SOS voucher clients (grouped). The names are NOT
// in this file on purpose: this repo is public, so client names only ever
// arrive from the authenticated backend at runtime. The scoped client list
// lives in the private repo (PRIVATE_PAY_TRACKER_NOTES.md).

const S = {
  body:      { padding: "24px 32px", maxWidth: 1400, margin: "0 auto" },
  card:      { background: "#fff", borderRadius: 8, padding: "18px 20px", border: "1px solid var(--border)" },
  cardTitle: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--text-2)", marginBottom: 8 },
  th:        { textAlign: "left", padding: "8px 12px", background: "var(--bg-soft)", color: "var(--text-2)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1px solid var(--border)" },
  td:        { padding: "9px 12px", borderBottom: "1px solid var(--bg-hover)", verticalAlign: "middle", fontSize: 13 },
  mono:      { fontVariantNumeric: "tabular-nums" },
};

// Status pill vocabulary — same three states the calc layer will produce
// (see calculate_remaining() in private_pay_tracker.py).
const STATUS_STYLES = {
  ok:         { bg: "#dcfce7", text: "#166534", label: "OK" },
  approaching:{ bg: "#fef9c3", text: "#854d0e", label: "Approaching limit" },
  exhausted:  { bg: "#fee2e2", text: "#b91c1c", label: "Exhausted" },
};

// Placeholder rows only — three fixed entries, scope locked (see module note
// above). Generic labels here; the real names come from the backend once
// wired (never hardcoded — public repo).
const PLACEHOLDER_ROWS = [
  { client: "Private-pay client 1",          program: "Private Pay",   status: "ok" },
  { client: "Private-pay client 2",          program: "Private Pay",   status: "approaching" },
  { client: "SWOCOG / SOS voucher clients",  program: "SWOCOG / SOS",  status: "exhausted" },
];

function Badge({ styleDef, children }) {
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: styleDef.bg, color: styleDef.text, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function NoticeBanner() {
  return (
    <div style={{ ...S.card, marginBottom: 16, background: "#fef9c3", border: "1px solid #fde68a" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#854d0e" }}>
        Frame only — placeholder data. Voucher totals and billed amounts are not wired to billing yet.
      </div>
    </div>
  );
}

export default function PrivatePayTracker() {
  return (
    <div style={S.body}>
      <NoticeBanner />

      <div style={{ ...S.card, padding: 0, marginBottom: 12, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={S.th}>Client</th>
                <th style={S.th}>Program</th>
                <th style={{ ...S.th, textAlign: "right" }}>Voucher total authorized</th>
                <th style={{ ...S.th, textAlign: "right" }}>Billed to date</th>
                <th style={{ ...S.th, textAlign: "right" }}>Remaining balance</th>
                <th style={{ ...S.th, textAlign: "right" }}>% used</th>
                <th style={S.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER_ROWS.map((row) => {
                const st = STATUS_STYLES[row.status];
                return (
                  <tr key={row.client}>
                    <td style={{ ...S.td, fontWeight: 600, color: "var(--navy)" }}>{row.client}</td>
                    <td style={S.td}>{row.program}</td>
                    <td style={{ ...S.td, textAlign: "right", ...S.mono }}>—</td>
                    <td style={{ ...S.td, textAlign: "right", ...S.mono }}>—</td>
                    <td style={{ ...S.td, textAlign: "right", ...S.mono }}>—</td>
                    <td style={{ ...S.td, textAlign: "right", ...S.mono }}>—</td>
                    <td style={S.td}><Badge styleDef={st}>{st.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 12, lineHeight: 1.6 }}>
        Open questions (flag back, do not guess):
        <br />1. Where does the voucher total/authorization amount actually live — Brittco, CenterTracker, or somewhere manual/offline?
        <br />2. Is "billed to date" the same billed data already flowing through the existing reporting infra (raw.billing → stg_billing), or a different pull specific to these clients?
        <br />3. Does SWOCOG/SOS need separate handling from straight private pay, or can they share the same table structure with a "program" field?
      </div>
    </div>
  );
}
