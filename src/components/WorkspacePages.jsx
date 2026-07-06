import React from "react";

// Static "Workspace" pages: Announcements, Reports, Operations Command Center.
export function AnnouncementsPage() {
  return (
        <div className="page-anim" style={{ padding: "52px 44px", maxWidth: 640 }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "0 0 8px" }}>Workspace</p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.4px", margin: "0 0 6px" }}>Announcements</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 32px" }}>Team updates and notices will appear here.</p>
          <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>No announcements yet.</div>
          </div>
        </div>
  );
}

export function ReportsPage() {
  return (
        <div className="page-anim" style={{ padding: "52px 44px", maxWidth: 640 }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "0 0 8px" }}>Workspace</p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.4px", margin: "0 0 6px" }}>Reports</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 32px" }}>Scheduled and on-demand reports will be available here.</p>
          <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10, padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>Coming soon.</div>
          </div>
        </div>
  );
}

export function OpsCommandPage() {
  return (
        <div className="page-anim" style={{ padding: "52px 44px", maxWidth: 640 }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "0 0 8px" }}>Workspace</p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.4px", margin: "0 0 6px" }}>Operations Command Center</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 32px" }}>Live operational data and reporting managed by the operations team. Access requires a Google account associated with ECS.</p>
          <a
            href="https://script.google.com/macros/s/AKfycbwqijyJOT4DDTX1VQ3FkP-eKltx1DIThL09QNL-IbK2glP25BNsIr26mR3ARHa5JUwkyg/exec"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "var(--navy)", color: "#fff", borderRadius: 8, padding: "12px 22px", fontSize: 14, fontWeight: 600, textDecoration: "none", letterSpacing: "-0.1px" }}
            onMouseOver={e => e.currentTarget.style.opacity = "0.85"}
            onMouseOut={e => e.currentTarget.style.opacity = "1"}
          >
            <span style={{ fontSize: 16 }}>&#x2197;</span>
            Open Operations Command Center
          </a>
          <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 16 }}>Opens in a new tab. Sign in with your ECS Google account if prompted.</p>
        </div>
  );
}
