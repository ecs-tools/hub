import React from "react";
import { makeKey, centerName, progressColor, formatDate } from "../utils/tracker.js";
import OutstandingGoals from "./OutstandingGoals.jsx";

const STATUS_OPTIONS = [
  { value: "fixed", label: "Fixed", color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  { value: "disputed", label: "Not an Error", color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
  { value: "open", label: "Open", color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" },
];

const CATEGORY_COLORS = {
  "Not Found in Attendance": { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
  "Arrival Before Pickup": { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa" },
  "Bus/Check-in Time Mismatch": { bg: "#fefce8", text: "#854d0e", border: "#fef08a" },
  "Takehome Time Mismatch": { bg: "#f0f9ff", text: "#0c4a6e", border: "#bae6fd" },
  "Missing Pickup Time": { bg: "#fdf4ff", text: "#6b21a8", border: "#e9d5ff" },
  "Missing Goal Documentation": { bg: "#f0fdf4", text: "#14532d", border: "#bbf7d0" },
  "Invalid Time": { bg: "#faf5ff", text: "#4c1d95", border: "#ddd6fe" },
};

// The Billing Error Detection page: view switcher, center progress row,
// filters, and the error table. All state lives in useErrorTracker; this
// component only renders what the hook returns.
export default function ErrorTracker({ tracker, isAdmin = false, onOpenNote }) {
  const {
    rawData, history, carryoverRows, outstanding, goalsMeta,
    trackerView, setTrackerView,
    selectedWeek, setSelectedWeek, selectedCenter, setSelectedCenter,
    selectedCategory, setSelectedCategory, weeks, locations, categories,
    centerStats, stats, filtered, sortField, sortDir, handleSort,
    effStatus, effFlag, notes, saveStatus, saveFlag,
  } = tracker;
  return (
    <div style={{ padding: "24px 32px" }}>
        {/* View switcher: This Week / Backlog / Carryover — visible to every
            role since 2026-07-17. The server decides what each view contains;
            there is no category gating in this component.
            2026-07-21: staff now receive EVERY category in "This week".
            Transport Violation and Invalid Units are excluded from Backlog and
            Carryover for ALL roles — billing is blocked until they're fixed, so
            they cannot legitimately carry over and only ever appeared there as
            noise. They get worked in "This week". */}
        {(history.length > 0 || outstanding.length > 0) && (
          <div style={{ display: "inline-flex", background: "#f1f5f9", borderRadius: 10, padding: 3, marginBottom: 18, border: "1.5px solid #e2e8f0" }}>
            {[
              { id: "week", label: "This Week", count: rawData.length },
              // 2026-07-22 (Brock): Backlog and Carryover are ADMIN ONLY.
              // Everyone else works "This week" and "Outstanding Goals"; the
              // year-long views were more history than a center manager can
              // act on. Enforced at the API too — /api/errors/history is
              // admin-gated, so `history` is empty for non-admins and these
              // tabs would collapse to 0 even without this check. Both layers
              // on purpose: this one makes the UI right, that one makes it
              // secure.
              ...(isAdmin ? [
                { id: "backlog", label: "Backlog 2026", count: history.length },
                { id: "carryover", label: "Carryover", count: carryoverRows.length },
              ] : []),
              // Separate pull, separate table, no manager state — see
              // OutstandingGoals.jsx. Hidden until the loader has run once.
              ...(outstanding.length > 0
                ? [{ id: "goals", label: "Outstanding Goals", count: outstanding.length }]
                : []),
            ].map(v => {
              const active = trackerView === v.id;
              const alert = v.id === "carryover" && v.count > 0;
              return (
                <button key={v.id} onClick={() => { setTrackerView(v.id); setSelectedWeek("All Weeks"); }}
                  style={{ border: "none", cursor: "pointer", fontFamily: "inherit", borderRadius: 8,
                    padding: "7px 16px", fontSize: 13, fontWeight: 600, transition: "all 0.15s",
                    background: active ? "white" : "transparent",
                    color: active ? "var(--navy, #1a2d4d)" : "#64748b",
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none" }}>
                  {v.label}
                  <span style={{ marginLeft: 7, fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "1px 7px",
                    background: alert ? "#fee2e2" : active ? "#eef2f7" : "#e2e8f0",
                    color: alert ? "#b91c1c" : "#64748b" }}>
                    {v.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {trackerView === "goals" ? (
          <OutstandingGoals rows={outstanding} meta={goalsMeta} />
        ) : (
          <>

        {/* Explainer line for the history views */}
        {trackerView !== "week" && (
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 1.5 }}>
            {trackerView === "backlog"
              ? "Every error uploaded in 2026, across all weeks. Statuses are shared with the weekly view — fixing it here fixes it everywhere."
              : "Errors whose week ended (the Mon–Wed pipeline runs finished) without being marked Fixed or Not an Error. This is the catch-up list."}
          </div>
        )}

        {/* Center Progress Bar Row — weekly progress, so weekly view only */}
        {trackerView === "week" && centerStats.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
            {centerStats.map(({ center, total, resolved, pct, noErrors }) => {
              const color = progressColor(pct);
              const isActive = selectedCenter === center;
              return (
                <div key={center} onClick={() => setSelectedCenter(isActive ? "All Centers" : center)}
                  style={{ flex: "0 0 auto", cursor: "pointer", background: "white", border: `1.5px solid ${isActive ? color : "#e2e8f0"}`,
                    borderRadius: 8, padding: "6px 10px", minWidth: 90, boxShadow: isActive ? `0 0 0 2px ${color}40` : "none",
                    transition: "all 0.15s" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#374151", marginBottom: 4, whiteSpace: "nowrap" }}>{center}</div>
                  <div style={{ background: "#f1f5f9", borderRadius: 100, height: 5, overflow: "hidden", marginBottom: 3 }}>
                    <div style={{ height: "100%", borderRadius: 100, width: `${pct}%`, background: color, transition: "width 0.4s ease" }} />
                  </div>
                  <div style={{ fontSize: 10, color: noErrors ? "#16a34a" : "#94a3b8", fontWeight: noErrors ? 600 : 400, whiteSpace: "nowrap" }}>
                    {noErrors ? "✓ No Errors" : `${resolved}/${total} · ${pct}%`}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          {trackerView !== "week" && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Week</label>
              <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}
                style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "white", color: "#1e293b", cursor: "pointer", minWidth: 140 }}>
                {weeks.map(w => <option key={w}>{w}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Center</label>
            <select value={selectedCenter} onChange={e => setSelectedCenter(e.target.value)}
              style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "white", color: "#1e293b", cursor: "pointer", minWidth: 200 }}>
              {locations.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>Error Type</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, background: "white", color: "#1e293b", cursor: "pointer", minWidth: 220 }}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { label: "Open", val: stats.open, color: "#6b7280", bg: "#f3f4f6" },
              { label: "Disputed", val: stats.disputed, color: "#dc2626", bg: "#fee2e2" },
              { label: "Fixed", val: stats.fixed, color: "#16a34a", bg: "#dcfce7" },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1.5px solid ${s.color}30`, borderRadius: 8, padding: "6px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: "'DM Mono', monospace" }}>{s.val}</div>
                <div style={{ fontSize: 11, color: s.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "white", borderRadius: 12, border: "1.5px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1.5px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>{filtered.length} errors</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>
              {selectedCenter !== "All Centers" ? selectedCenter : "All Centers"}{selectedCategory !== "All Types" ? ` · ${selectedCategory}` : ""}
            </span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {[
                    ...(trackerView !== "week" ? [{ label: "Week", field: "week" }] : []),
                    { label: "Client Name", field: "name" },
                    { label: "Center", field: null },
                    { label: "Date", field: "date" },
                    { label: "Error", field: null },
                    { label: "Type", field: null },
                    { label: "Status", field: null },
                    { label: "Notes", field: null },
                  ].map(({ label, field }) => (
                    <th key={label} onClick={() => field && handleSort(field)}
                      style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
                        color: sortField === field ? "#3b82f6" : "#64748b", textTransform: "uppercase",
                        letterSpacing: "0.5px", borderBottom: "1.5px solid #e2e8f0", whiteSpace: "nowrap",
                        cursor: field ? "pointer" : "default", userSelect: "none",
                        position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                      {label}
                      {field && <span style={{ marginLeft: 5, fontSize: 10, opacity: sortField === field ? 1 : 0.35 }}>
                        {sortField === field ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
                      </span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const key = row._key ?? makeKey(row, i);
                  const status = effStatus(key);
                  const note = notes[key] ?? "";
                  const flagged = effFlag(key);
                  const catStyle = CATEGORY_COLORS[row.category] || { bg: "#f9fafb", text: "#374151", border: "#e5e7eb" };
                  const rowBg = status === "fixed" ? "#f0fdf4" : status === "disputed" ? "#fff8f8" : "white";
                  return (
                    <tr key={key + i} className="error-row" style={{ borderBottom: "1px solid #f1f5f9", background: rowBg,
                      transition: "background 0.1s" }}>
                      {trackerView !== "week" && (
                        <td style={{ padding: "10px 16px", color: "#64748b", fontFamily: "'DM Mono', monospace", fontSize: 12, whiteSpace: "nowrap" }}>{row.week}</td>
                      )}
                      <td style={{ padding: "10px 16px", fontWeight: 500, color: "#1e293b", whiteSpace: "nowrap" }}>{row.name}</td>
                      <td style={{ padding: "10px 16px", color: "#475569", whiteSpace: "nowrap" }}>{centerName(row.location)}</td>
                      <td style={{ padding: "10px 16px", color: "#475569", fontFamily: "'DM Mono', monospace", fontSize: 12, whiteSpace: "nowrap" }}>{formatDate(row.date)}</td>
                      <td style={{ padding: "10px 16px", color: "#374151", minWidth: 260, maxWidth: 400, whiteSpace: "normal", wordBreak: "break-word" }}>
                        {row.reason}
                      </td>
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                        <span style={{ background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}`, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                          {row.category}
                        </span>
                      </td>
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                          {STATUS_OPTIONS.map(opt => (
                            <button key={opt.value} className={`status-btn ${status === opt.value ? "active" : ""}`}
                              onClick={() => saveStatus(key, opt.value)}
                              style={{ background: status === opt.value ? opt.bg : "white", color: status === opt.value ? opt.color : "#9ca3af",
                                borderColor: status === opt.value ? opt.border : "#e5e7eb", opacity: status === opt.value ? 1 : 0.7 }}>
                              {opt.label}
                            </button>
                          ))}
                          <button onClick={() => saveFlag(key)}
                            title={flagged ? "Remove flag" : "Flag this row"}
                            style={{ background: flagged ? "#fef2f2" : "white", color: flagged ? "#dc2626" : "#d1d5db",
                              border: `1px solid ${flagged ? "#fca5a5" : "#e5e7eb"}`, borderRadius: 4,
                              padding: "3px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", lineHeight: 1, transition: "all 0.15s", fontFamily: "inherit" }}>
                            {flagged ? "Flagged" : "Flag"}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "10px 16px", whiteSpace: "nowrap" }}>
                        <button onClick={() => onOpenNote(key, note)}
                          style={{ background: note ? "#f0f9ff" : "#f8fafc", color: note ? "#0369a1" : "#94a3b8",
                            border: `1px solid ${note ? "#bae6fd" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 10px",
                            fontSize: 12, cursor: "pointer", maxWidth: 180, textAlign: "left", whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis", display: "block" }}
                          title={note || "Add note"}>
                          {note ? note : "+ Add note"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={trackerView === "week" ? 7 : 8} style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                    {trackerView === "carryover" && selectedWeek === "All Weeks" && selectedCenter === "All Centers" && selectedCategory === "All Types"
                      ? "Nothing carried over — every closed week's errors were resolved."
                      : "No errors found for this selection."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

          </>
        )}
    </div>
  );
}
