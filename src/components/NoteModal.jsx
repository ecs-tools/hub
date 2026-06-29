/**
 * NoteModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal for viewing/editing a note on an error row.
 *
 * Props:
 *   noteModal    — { key, note } | null — if null the modal is not shown
 *   noteInput    — current textarea value (controlled by parent via onChange)
 *   setNoteInput — fn(string)
 *   onSave       — fn() — called when Save is clicked
 *   onClose      — fn() — called when Cancel or backdrop is clicked
 */

import React from "react";

export default function NoteModal({ noteModal, noteInput, setNoteInput, onSave, onClose }) {
  if (!noteModal) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: "white", borderRadius: 16, padding: 28, width: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "#1e293b" }}>Note</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>Click outside to close without saving</div>
        <textarea
          autoFocus
          rows={5}
          defaultValue={noteModal.note}
          onChange={e => setNoteInput(e.target.value)}
          placeholder="Add a note..."
          style={{ width: "100%", border: "1.5px solid #3b82f6", borderRadius: 8, padding: "10px 12px", fontSize: 14, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={onSave}
            style={{ flex: 1, background: "#3b82f6", color: "white", border: "none", borderRadius: 8, padding: "9px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Save
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "9px", fontSize: 14, cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
