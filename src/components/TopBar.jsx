import React from "react";
import { PAGE_LABEL } from "../config/modules.js";

// Top bar: breadcrumbs, the tracker saving indicator, and the search shell.
export default function TopBar({ activeTab, setActiveTab, saving }) {
  const breadcrumbs = () => {
    if (activeTab === "home" || activeTab === "modules") return [{ label: "Home" }];
    return [{ label: "Home", tab: "home" }, { label: PAGE_LABEL[activeTab] || activeTab }];
  };
  return (
        <header style={{ height: "var(--topbar-h)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "var(--bg)", position: "sticky", top: 0, zIndex: 100, flexShrink: 0 }}>
          {/* Breadcrumbs */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, minWidth: 0 }}>
            {breadcrumbs().map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span style={{ color: "var(--text-3)", fontSize: 12 }}>/</span>}
                {crumb.tab ? (
                  <button onClick={() => setActiveTab(crumb.tab)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 13, color: "var(--text-3)", fontFamily: "inherit" }}
                    onMouseOver={e => e.currentTarget.style.color = "var(--text-1)"} onMouseOut={e => e.currentTarget.style.color = "var(--text-3)"}>
                    {crumb.label}
                  </button>
                ) : (
                  <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
          {/* Right side: saving indicator + search shell */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            {saving && <span style={{ fontSize: 12, color: "var(--text-3)" }}>Saving…</span>}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 12px" }}>
              <span style={{ fontSize: 12, color: "var(--text-3)" }}>&#x2315;</span>
              <input placeholder="Search…" style={{ background: "none", border: "none", outline: "none", fontSize: 13, color: "var(--text-1)", fontFamily: "inherit", width: 160 }} />
            </div>
          </div>
        </header>
  );
}
