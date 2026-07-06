import React from "react";

// Placeholder shown to manager-role users on modules that aren't ready yet.
// Per spec: matches navy/steel palette, includes a construction icon, module
// name as heading, the standardized "← Back to Modules" button, and short copy.
function UnderConstruction({ moduleName, onBack }) {
  return (
    <div className="page-anim" style={{ padding: "32px 40px", maxWidth: 760, margin: "0 auto" }}>
      <button
        className="back-btn"
        onClick={onBack}
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "5px 12px",
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-2)",
          cursor: "pointer",
          fontFamily: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 24,
        }}
      >
        ← Back to Modules
      </button>
      <div style={{
        background: "white",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "56px 48px",
        textAlign: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}>
        <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }} aria-hidden="true">🚧</div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--steel)", marginBottom: 8 }}>
          Coming Soon
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--navy)", margin: "0 0 8px", letterSpacing: "-0.4px" }}>
          {moduleName}
        </h2>
        <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 14, fontWeight: 500 }}>
          This module is coming soon.
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
          We're working on making this available. Check back soon or contact your administrator.
        </div>
      </div>
    </div>
  );
}

export default UnderConstruction;
