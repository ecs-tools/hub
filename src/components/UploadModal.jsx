/**
 * UploadModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Modal overlay for the weekly data upload flow.
 * Two steps: (1) password entry, (2) file picker.
 *
 * Props:
 *   uploadPassword / setUploadPassword
 *   passwordError / setPasswordError
 *   passwordOk
 *   uploading          — bool: file is being processed
 *   fileRef            — React ref for the hidden <input type="file">
 *   onPasswordCheck    — fn() — validate the upload password
 *   onFileChange       — fn(event) — handle file selection
 *   onClose            — fn() — close the modal
 */

import React from "react";

export default function UploadModal({
  uploadPassword, setUploadPassword,
  passwordError, setPasswordError,
  passwordOk,
  uploading,
  fileRef,
  onPasswordCheck,
  onFileChange,
  onClose,
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999,
    }}>
      <div style={{ background: "white", borderRadius: 16, padding: 32, width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Upload New Week</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 24 }}>
          This will replace all current data and reset all statuses.
        </div>

        {!passwordOk ? (
          <>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
              Enter upload password
            </label>
            <input
              type="password"
              value={uploadPassword}
              onChange={e => { setUploadPassword(e.target.value); setPasswordError(false); }}
              onKeyDown={e => e.key === "Enter" && onPasswordCheck()}
              placeholder="Password"
              style={{ width: "100%", border: `1.5px solid ${passwordError ? "#ef4444" : "#e2e8f0"}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, marginBottom: 6, boxSizing: "border-box" }}
            />
            {passwordError && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>Incorrect password</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={onPasswordCheck} style={{ flex: 1, background: "#3b82f6", color: "white", border: "none", borderRadius: 8, padding: "9px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Continue</button>
              <button onClick={onClose} style={{ flex: 1, background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "9px", fontSize: 14, cursor: "pointer" }}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <div
              style={{ border: "2px dashed #cbd5e1", borderRadius: 12, padding: 32, textAlign: "center", cursor: "pointer", background: "#f8fafc" }}
              onClick={() => fileRef.current?.click()}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 4 }}>Click to select your Excel file</div>
              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>.xlsx files only</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={onFileChange} />
            </div>
            {uploading && <div style={{ textAlign: "center", marginTop: 16, color: "#3b82f6", fontSize: 14 }}>Processing file…</div>}
            <button onClick={onClose} style={{ width: "100%", marginTop: 12, background: "#f1f5f9", color: "#374151", border: "none", borderRadius: 8, padding: "9px", fontSize: 14, cursor: "pointer" }}>Cancel</button>
          </>
        )}
      </div>
    </div>
  );
}
