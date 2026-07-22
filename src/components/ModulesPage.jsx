import React from "react";
import { MODULES, MODULE_CATEGORIES } from "../config/modules.js";

// The Home page: a friendly intro header followed by the module cards, grouped
// by category. This is the single landing page (Home + Modules merged) — no
// metrics, just a clear "pick what you need" launcher aimed at non-technical
// users. Text-first tiles (icons removed 2026-07-17, CONSOLIDATION_PLAN §6):
// the module NAME carries the scan weight, badges carry the state.
const badge = (bg, color, bordered) => ({
  position: "absolute", top: 14, right: 14, fontSize: 10, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: "0.5px", padding: "3px 8px",
  borderRadius: 4, background: bg, color,
  ...(bordered ? { border: "1px solid var(--border)", fontWeight: 600 } : {}),
});

export default function ModulesPage({ canAccessModule, onOpenModule }) {
  return (
    <div className="page-anim" style={{ padding: "44px 44px 56px", maxWidth: 1180, margin: "0 auto" }}>
      {/* Intro header */}
      <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "0 0 8px" }}>Empowered IS</p>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.5px", margin: "0 0 8px", lineHeight: 1.15 }}>Welcome back</h1>
      <p style={{ fontSize: 15, color: "var(--text-2)", margin: "0 0 34px", lineHeight: 1.5, maxWidth: 620 }}>
        All your tools in one place. Pick a module below to get started.
      </p>

      {[...MODULE_CATEGORIES, "Other"].map(cat => {
        // 2026-07-22 (Brock): modules you can't open are HIDDEN, not greyed out.
        // They used to render as "Locked" cards at 70% opacity, which made the
        // launcher look cluttered and advertised tools most people will never
        // be given. Coming Soon cards stay — those are deliberate previews.
        // A category whose modules are all hidden drops out entirely via the
        // length check below, so no empty section headers appear.
        const mods = MODULES.filter(
          m => (MODULE_CATEGORIES.includes(m.category) ? m.category : "Other") === cat
        ).filter(m => m.comingSoon || canAccessModule(m.id));
        if (!mods.length) return null;
        return (
          <div key={cat} style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.7px", color: "var(--text-3)", margin: "0 0 14px", paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>{cat}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {mods.map(m => {
                const comingSoon = !!m.comingSoon;
                const canAccess = !comingSoon && canAccessModule(m.id);
                const open = () => canAccess && onOpenModule(m.id);
                return (
                  <div key={m.id}
                    className={`mod-card${canAccess ? "" : " locked"}`}
                    onClick={open}
                    role={canAccess ? "button" : undefined}
                    tabIndex={canAccess ? 0 : undefined}
                    onKeyDown={e => { if (canAccess && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); open(); } }}
                  >
                    {/* "Locked" is gone with the filter above — nothing
                        unreachable renders here now. "Active" went with it: if
                        a card is on this page you can open it, so the badge was
                        stating the obvious on every single tile. Only Coming
                        Soon still carries a badge, because that one is real
                        information. */}
                    {comingSoon && <span style={badge("#eef2ff", "#4f46e5")}>Coming Soon</span>}

                    <div style={{ fontSize: 16, fontWeight: 700, color: canAccess ? "var(--navy)" : "var(--text-3)", letterSpacing: "-0.2px", marginBottom: 6, paddingRight: comingSoon ? 76 : 0 }}>{m.name}</div>
                    <div style={{ fontSize: 13, color: canAccess ? "var(--text-2)" : "var(--text-3)", lineHeight: 1.5 }}>{m.description}</div>

                    {canAccess && <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: "var(--steel)" }}>Open &rarr;</div>}
                    {comingSoon && <div style={{ marginTop: 14, fontSize: 12, fontWeight: 600, color: "var(--text-3)" }}>In development</div>}
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
