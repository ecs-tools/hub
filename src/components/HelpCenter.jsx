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
            { section: "Home Dashboard", items: [
              { q: "What does the Home page show?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}>The Home page is your billing-error command center — it's the first thing you see when you sign in.</li><li style={{ marginBottom: 4 }}>The four cards at the top show <strong>Open Billing Errors</strong>, errors logged <strong>This Week</strong> and <strong>This Month</strong>, and your overall <strong>Resolution Rate</strong>. Click any card to jump straight into the Error Tracker.</li><li style={{ marginBottom: 4 }}>Below the cards, the <strong>Billing Error Summary</strong> shows resolution progress plus a breakdown of errors by <strong>Center</strong> and by <strong>Type</strong>.</li></ul>) },
            ]},
            { section: "Error Tracker", items: [
              { q: "What do the error statuses mean?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}><strong>Open</strong> — Not yet reviewed. Default for all new errors.</li><li style={{ marginBottom: 4 }}><strong>Not an Error</strong> — Reviewed and found to be a dispute or not applicable (shown as “Disputed” in the counts).</li><li style={{ marginBottom: 4 }}><strong>Fixed</strong> — Resolved and corrected.</li></ul>) },
            ]},
            { section: "Saturday Calculator", items: [
              { q: "How do I use the Saturday Calculator?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}>Select your center — rates load automatically.</li><li style={{ marginBottom: 4 }}>Enter A, B, C, and C+ acuity client counts.</li><li style={{ marginBottom: 4 }}>Minimum required staff calculates automatically.</li><li style={{ marginBottom: 4 }}>Add extra staff if needed. Salary staff count toward ratio but not cost.</li><li style={{ marginBottom: 4 }}>Result shows ✅ Good to Go or ❌ Not Viable.</li></ul>) },
              { q: "What are the acuity staff ratios?", a: (<ul style={{ paddingLeft: 18, marginTop: 6 }}><li style={{ marginBottom: 4 }}><strong>A Acuity</strong> — 1 staff per 10 clients</li><li style={{ marginBottom: 4 }}><strong>B Acuity</strong> — 1 staff per 6 clients</li><li style={{ marginBottom: 4 }}><strong>C Acuity</strong> — 1 staff per 3 clients</li><li style={{ marginBottom: 4 }}><strong>C+ Acuity</strong> — 1:1 ratio · same rate as C</li></ul>) },
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
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 2 }}>Brock</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>Platform Administrator · Empowered IS</div>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>Questions? Reach out</span>
            </div>
          </div>
        </div>
  );
}
