import React, { useMemo, useState } from "react";

// Outstanding Goals — ISP goals still not documented, 2026-01-01 to the last
// completed week, grouped by center.
//
// Deliberately read-only. Every other tracker view carries status buttons,
// flags and notes because a manager has to tell the system when an error is
// dealt with. This list does not work that way: it is rebuilt weekly from
// Brittco report 140, which is a current-state report, so a goal that has been
// documented simply stops appearing. Adding Fixed/Open buttons here would ask
// managers to hand-maintain state the source system already knows, and would
// go stale the moment the next pull lands.
//
// So the only interaction is: find your center, open it, read the list.

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).slice(0, 10).split("-");
  return `${Number(m)}/${Number(d)}/${String(y).slice(2)}`;
}

function daysSince(iso) {
  if (!iso) return null;
  const then = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((Date.now() - then.getTime()) / 86400000);
}

// Older than a month is the signal worth surfacing — anything that has sat
// that long is not going to resolve itself in the normal weekly rhythm.
function ageColor(days) {
  if (days == null) return { bg: "#f3f4f6", text: "#6b7280" };
  if (days >= 90) return { bg: "#fee2e2", text: "#b91c1c" };
  if (days >= 30) return { bg: "#fff7ed", text: "#9a3412" };
  return { bg: "#f0fdf4", text: "#14532d" };
}

export default function OutstandingGoals({ rows, meta }) {
  const [openCenter, setOpenCenter] = useState(null);

  const groups = useMemo(() => {
    const by = new Map();
    for (const r of rows) {
      const c = r.center || "(unknown)";
      if (!by.has(c)) by.set(c, []);
      by.get(c).push(r);
    }
    return Array.from(by.entries())
      .map(([center, items]) => ({
        center,
        items: items.slice().sort((a, b) => (a.goal_date < b.goal_date ? 1 : -1)),
        clients: new Set(items.map(i => i.name)).size,
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [rows]);

  if (!rows.length) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14,
        background: "white", borderRadius: 12, border: "1.5px solid #e2e8f0" }}>
        No outstanding goals — every ISP goal in the window is documented.
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
        ISP goals with no documentation, {fmtDate(meta?.window?.start)} to{" "}
        {fmtDate(meta?.window?.end)}. Rebuilt weekly from Brittco — once a goal is
        documented it drops off this list on its own, so there is nothing to mark
        off here.
        {meta?.loaded_at && (
          <span style={{ color: "#94a3b8" }}>
            {" "}Last pulled {new Date(meta.loaded_at).toLocaleString()}.
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {groups.map(({ center, items, clients }) => {
          const isOpen = openCenter === center;
          const oldest = items.reduce((mx, r) => Math.max(mx, daysSince(r.goal_date) ?? 0), 0);
          const age = ageColor(oldest);
          return (
            <div key={center} style={{ background: "white", borderRadius: 12,
              border: `1.5px solid ${isOpen ? "#cbd5e1" : "#e2e8f0"}`, overflow: "hidden",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <button
                onClick={() => setOpenCenter(isOpen ? null : center)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 20px", background: isOpen ? "#f8fafc" : "white",
                  border: "none", borderBottom: isOpen ? "1.5px solid #e2e8f0" : "none",
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                <span style={{ fontSize: 11, color: "#94a3b8", width: 10 }}>
                  {isOpen ? "▼" : "▶"}
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", flex: 1 }}>
                  {center}
                </span>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  {clients} client{clients === 1 ? "" : "s"}
                </span>
                <span style={{ background: age.bg, color: age.text, borderRadius: 20,
                  padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                  oldest {oldest}d
                </span>
                <span style={{ background: "#eef2f7", color: "#475569", borderRadius: 20,
                  padding: "2px 10px", fontSize: 12, fontWeight: 700,
                  fontFamily: "'DM Mono', monospace" }}>
                  {items.length}
                </span>
              </button>

              {isOpen && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        {["Client Name", "Date", "Age", "Service", "Program"].map(h => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left",
                            fontSize: 11, fontWeight: 700, color: "#64748b",
                            textTransform: "uppercase", letterSpacing: "0.5px",
                            borderBottom: "1.5px solid #e2e8f0", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((r, i) => {
                        const d = daysSince(r.goal_date);
                        const c = ageColor(d);
                        return (
                          <tr key={`${r.name}|${r.goal_date}|${i}`}
                            style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "10px 16px", fontWeight: 500,
                              color: "#1e293b", whiteSpace: "nowrap" }}>{r.name}</td>
                            <td style={{ padding: "10px 16px", color: "#475569",
                              fontFamily: "'DM Mono', monospace", fontSize: 12,
                              whiteSpace: "nowrap" }}>{fmtDate(r.goal_date)}</td>
                            <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                              <span style={{ background: c.bg, color: c.text, borderRadius: 6,
                                padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                                {d == null ? "—" : `${d}d`}
                              </span>
                            </td>
                            <td style={{ padding: "10px 16px", color: "#475569",
                              whiteSpace: "nowrap" }}>{r.service}</td>
                            <td style={{ padding: "10px 16px", color: "#94a3b8",
                              whiteSpace: "nowrap" }}>{r.program}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
