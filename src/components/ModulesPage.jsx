import React from "react";
import { MODULES, MODULE_CATEGORIES } from "../config/modules.js";

// The Modules grid page.
export default function ModulesPage({ canAccessModule, onOpenModule }) {
  return (
        <div className="page-anim" style={{ padding: "40px 44px" }}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "0 0 8px" }}>Platform</p>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.4px", margin: "0 0 6px", lineHeight: 1.2 }}>Modules</h1>
          <p style={{ fontSize: 14, color: "var(--text-2)", margin: "0 0 32px", lineHeight: 1.5 }}>Tools and dashboards available to your team.</p>
          {[...MODULE_CATEGORIES, "Other"].map(cat => {
            const mods = MODULES.filter(
              m => (MODULE_CATEGORIES.includes(m.category) ? m.category : "Other") === cat
            );
            if (!mods.length) return null;
            return (
              <div key={cat} style={{ marginBottom: 28 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "0 0 12px", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>{cat}</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                  {mods.map(m => {
                    const canAccess = canAccessModule(m.id);
                    return (
                    <div key={m.id}
                      className={`mod-card${canAccess ? "" : " locked"}`}
                      onClick={() => canAccess && onOpenModule(m.id)}
                    >
                      {canAccess ? (
                        <span style={{ position: "absolute", top: 14, right: 14, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: 4 }}>Active</span>
                      ) : (
                        <span style={{ position: "absolute", top: 14, right: 14, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", background: "var(--bg-soft)", color: "var(--text-3)", padding: "3px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>Locked</span>
                      )}
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: canAccess ? "var(--navy)" : "var(--bg-soft)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 3, background: canAccess ? "rgba(143,179,212,0.7)" : "var(--border)" }} />
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)", marginBottom: 5 }}>{m.name}</div>
                      <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>{m.description}</div>
                      {canAccess && (
                        <div style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: "var(--navy)", letterSpacing: "-0.1px" }}>Open &rarr;</div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
  );
}
