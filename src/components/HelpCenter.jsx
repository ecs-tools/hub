import React from "react";

function FaqItem({ question, answer }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginBottom: 4 }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", textAlign: "left", background: "white", border: `1.5px solid ${open ? "var(--steel)" : "var(--border)"}`,
          borderRadius: open ? "10px 10px 0 0" : 10, padding: "14px 18px", fontSize: 14, fontWeight: 600,
          color: "var(--navy)", cursor: "pointer", fontFamily: "inherit", display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: open ? 0 : 4 }}>
        {question}
        <span style={{ transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none", color: "var(--muted)", fontSize: 12 }}>▼</span>
      </button>
      {open && (
        <div style={{ background: "#f8fbff", border: "1.5px solid var(--steel)", borderTop: "none", borderRadius: "0 0 10px 10px", padding: "14px 18px", fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 4 }}>
          {answer}
        </div>
      )}
    </div>
  );
}

// The Help Center / FAQ page.
export default function HelpCenter() {
  return (
        <div className="page-anim" style={{ maxWidth: 720, margin: "0 auto", padding: "40px 32px" }}>
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--navy)", letterSpacing: "-0.5px", marginBottom: 6 }}>Help & FAQ</div>
            <div style={{ fontSize: 14, color: "var(--muted)" }}>Everything you need to know about using ECS Hub.</div>
          </div>

          {[
            { section: "Getting Started", items: [
              { q: "How do I find my way around?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}>The <strong>Home</strong> page is your launcher — every tool lives there as a card, grouped into <strong>Billing &amp; Invoicing</strong>, <strong>Funding &amp; Fleet</strong>, and <strong>Tools</strong>. Click a card to open it.</li><li style={{ marginBottom: 4 }}>A green <strong>Active</strong> badge means you have access. <strong>Locked</strong> means your account doesn't have that module yet — ask your System Admin to enable it. <strong>Coming Soon</strong> means it's still being built.</li><li style={{ marginBottom: 4 }}>Use the <strong>← Home</strong> button at the top-left of any module to come back.</li></ul>) },
              { q: "Something didn't load — what should I do?", a: "Refresh the page first (Ctrl+F5). If a yellow banner says the data service may be unavailable, wait a minute and try again — the server may be waking up. If it persists, contact the System Admin." },
            ]},
            { section: "Billing Overview", items: [
              { q: "What's in Billing Overview?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}>Top-line billing at a glance: <strong>Daily Rate</strong> (revenue per person per day), <strong>Attendance Days</strong>, <strong>Missed Revenue</strong>, and <strong>Outstanding AR</strong>, year-to-date.</li><li style={{ marginBottom: 4 }}>Tabs break it down <strong>By Center</strong>, by <strong>Daily Rate</strong> (Mon–Sun weeks), and by <strong>AR bucket</strong> — Waiver (fixable in-system) vs. External county / private pay (waiting on a payer).</li></ul>) },
            ]},
            { section: "Provider Reports", items: [
              { q: "What are Provider Reports?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}>The weekly DODD Medicaid reports that come back after billing: <strong>Errors</strong>, <strong>Claims</strong>, <strong>Invoices</strong>, and <strong>Denied</strong> claims.</li><li style={{ marginBottom: 4 }}>Filter by <strong>billing cycle</strong> (e.g. JUL26A) and search by client name to see who errored or was denied, and why.</li></ul>) },
            ]},
            { section: "Invoice Manager", items: [
              { q: "How do I find and download an invoice?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}>Pick a <strong>tab</strong> for the invoice type — ECS, Lorain, OSL, Patient Liability, or SOS.</li><li style={{ marginBottom: 4 }}>Invoices are grouped into <strong>folders</strong> (county, Private Pay, …). Click a folder to expand it, then use the <strong>Download</strong> button to open that invoice's PDF.</li><li style={{ marginBottom: 4 }}>Search by <strong>name, amount, or month</strong> at the top of a tab.</li></ul>) },
              { q: "What do the statuses and aging colors mean?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}><strong>Generated → Sent → Paid</strong> (or Partial). Admins can mark an invoice sent or record a payment.</li><li style={{ marginBottom: 4 }}><strong>Aging</strong> is measured from the end of the service month: Current (0–30), 31–60, 61–90, or 90+ days.</li><li style={{ marginBottom: 4 }}>A red <strong>$0 with billing</strong> flag means an invoice came out $0 even though the client had billing that month — worth a look.</li></ul>) },
            ]},
            { section: "Utilization Tracker", items: [
              { q: "How do I read the Utilization cards?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}>Each client card shows their PAWS funding use per service, colored <strong>green / yellow / red</strong> as they approach their limit. Filter by Action Needed, Monitor, or Good.</li><li style={{ marginBottom: 4 }}>Each service shows the <strong>Current</strong> span and, where it applies, the just-ended <strong>Prior period</strong> — with dollars and units remaining.</li><li style={{ marginBottom: 4 }}>Right after a plan-year reset, current spans start near 0% used and fill in as billing posts.</li></ul>) },
            ]},
            { section: "Billing Error Detection", items: [
              { q: "What do the error statuses mean?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}><strong>Open</strong> — Not yet reviewed. Default for all new errors.</li><li style={{ marginBottom: 4 }}><strong>Not an Error</strong> — Reviewed and found to be a dispute or not applicable (shown as “Disputed” in the counts).</li><li style={{ marginBottom: 4 }}><strong>Fixed</strong> — Resolved and corrected.</li></ul>) },
            ]},
            { section: "Saturday Calculator", items: [
              { q: "How do I use the Saturday Calculator?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}>Select your center — rates load automatically.</li><li style={{ marginBottom: 4 }}>Enter A, B, C, and C+ acuity client counts.</li><li style={{ marginBottom: 4 }}>Minimum required staff calculates automatically.</li><li style={{ marginBottom: 4 }}>Add extra staff if needed. Salary staff count toward ratio but not cost.</li><li style={{ marginBottom: 4 }}>Result shows Good to Go or Not Viable.</li></ul>) },
              { q: "What are the acuity staff ratios?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}><strong>A Acuity</strong> — 1 staff per 10 clients</li><li style={{ marginBottom: 4 }}><strong>B Acuity</strong> — 1 staff per 6 clients</li><li style={{ marginBottom: 4 }}><strong>C Acuity</strong> — 1 staff per 3 clients</li><li style={{ marginBottom: 4 }}><strong>C+ Acuity</strong> — 1:1 ratio · same rate as C</li></ul>) },
            ]},
            { section: "Pipeline Health (Admin)", items: [
              { q: "What is Pipeline Health?", a: "A live status board of the behind-the-scenes data jobs — what ran, what failed, and how fresh each dataset is. Admins use it to confirm the weekly billing, provider-report, and utilization data all loaded." },
            ]},
            { section: "Reporting Issues", items: [
              { q: "How do I report a bug or request a feature?", a: "Reach out directly to the platform administrator. Please include a description of what happened, which page you were on, and what you expected to happen." },
            ]},
          ].map(({ section, items }) => (
            <div key={section} style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--steel)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 8, borderBottom: "1.5px solid var(--border)" }}>{section}</div>
              {items.map(({ q, a }) => (
                <FaqItem key={q} question={q} answer={a} />
              ))}
            </div>
          ))}

          {/* Contact */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>Contact</div>
            <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 2 }}>System Admin</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>Platform Administrator · Empowered IS</div>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>Questions? Reach out</span>
            </div>
          </div>
        </div>
  );
}
