import React, { useState, useEffect } from "react";

// ── Admin Panel Component ─────────────────────────────────────────────────────
function AdminPanel({ apiBase, modules }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [resetModal, setResetModal] = useState(null); // username being reset
  const [resetPw, setResetPw] = useState("");
  const [resetSaving, setResetSaving] = useState(false);

  // Invite codes (single-use, expiring — replaces the old shared code)
  const [invites, setInvites] = useState([]);
  const [inviteDays, setInviteDays] = useState(7);
  const [inviteCreating, setInviteCreating] = useState(false);
  const [newInvite, setNewInvite] = useState(null); // {code, expires_at} — shown ONCE
  const [showAllInvites, setShowAllInvites] = useState(false);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  // Surface the server's actual reason (e.g. "You cannot demote your own
  // account") instead of a generic failure message.
  const detailOf = async (res, fallback) => {
    try { return (await res.json()).detail || fallback; } catch { return fallback; }
  };

  const fetchUsers = () => {
    // loading starts true; only ever flips false here (fetchUsers runs on mount)
    fetch(`${apiBase}/admin/users`, { credentials: "include" })
      .then(r => r.json())
      .then(data => { setUsers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { showToast("Failed to load users", false); setLoading(false); });
  };

  const fetchInvites = () => {
    fetch(`${apiBase}/admin/invites`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setInvites(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { fetchUsers(); fetchInvites(); }, []);

  const createInvite = async () => {
    setInviteCreating(true);
    const res = await fetch(`${apiBase}/admin/invites`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expires_days: inviteDays }),
    });
    if (res.ok) {
      const data = await res.json();
      setNewInvite(data);   // plaintext code — the server never shows it again
      fetchInvites();
    } else { showToast(await detailOf(res, "Failed to create invite"), false); }
    setInviteCreating(false);
  };

  const revokeInvite = async (id) => {
    const res = await fetch(`${apiBase}/admin/invites/${id}`, {
      method: "DELETE", credentials: "include",
    });
    if (res.ok) { showToast("Invite revoked"); fetchInvites(); }
    else { showToast(await detailOf(res, "Failed to revoke invite"), false); }
  };

  const approveUser = async (username) => {
    setSaving(s => ({ ...s, [username]: true }));
    const res = await fetch(`${apiBase}/admin/users/${username}/approve`, {
      method: "POST", credentials: "include",
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.username === username ? { ...u, status: "active" } : u));
      showToast(`${username} approved — they can now sign in`);
    } else { showToast(await detailOf(res, "Failed to approve user"), false); }
    setSaving(s => ({ ...s, [username]: false }));
  };

  const setRole = async (username, role) => {
    setSaving(s => ({ ...s, [username]: true }));
    const res = await fetch(`${apiBase}/admin/users/${username}/role`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(prev => prev.map(u => u.username === username
        ? { ...u, role: data.role, permissions: data.permissions } : u));
      showToast(`${username} is now ${role}`);
    } else { showToast(await detailOf(res, "Failed to update role"), false); }
    setSaving(s => ({ ...s, [username]: false }));
  };

  const resetPassword = async () => {
    setResetSaving(true);
    const res = await fetch(`${apiBase}/admin/users/${resetModal}/password`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPw }),
    });
    if (res.ok) { showToast(`Password reset for ${resetModal}`); setResetModal(null); setResetPw(""); }
    else { showToast(await detailOf(res, "Failed to reset password"), false); }
    setResetSaving(false);
  };

  const togglePermission = async (username, moduleId, current) => {
    setSaving(s => ({ ...s, [`${username}-${moduleId}`]: true }));
    const res = await fetch(`${apiBase}/admin/users/${username}/permissions`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: { [moduleId]: !current } }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(prev => prev.map(u => u.username === username
        ? { ...u, permissions: data.permissions } : u));
    } else { showToast("Failed to update permission", false); }
    setSaving(s => ({ ...s, [`${username}-${moduleId}`]: false }));
  };

  const deleteUser = async (username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    const res = await fetch(`${apiBase}/admin/users/${username}`, {
      method: "DELETE", credentials: "include",
    });
    if (res.ok) { setUsers(prev => prev.filter(u => u.username !== username)); showToast(`${username} deleted`); }
    else { showToast(await detailOf(res, "Failed to delete user"), false); }
  };

  const visibleUsers = users.filter(u => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return u.username.toLowerCase().includes(q)
      || (u.center || "").toLowerCase().includes(q)
      || u.role.toLowerCase().includes(q);
  });

  const ROLE_COLORS = {
    admin:   { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
    manager: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
    staff:   { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  };

  return (
    <div className="page-anim" style={{ padding: "32px 40px", maxWidth: 1100, margin: "0 auto" }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: toast.ok ? "#0f172a" : "#dc2626", color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 500, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}>
          {toast.msg}
        </div>
      )}

      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--navy)", margin: "0 0 4px", letterSpacing: "-0.3px" }}>Admin Panel</h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>Manage user accounts, roles, and module access. Changes save instantly.</p>
        </div>
        <input
          type="text" placeholder="Search users…" value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ border: "1.5px solid var(--border)", borderRadius: 8, padding: "8px 14px", fontSize: 13, width: 220, outline: "none", fontFamily: "inherit", background: search ? "#eff6ff" : "white" }}
        />
      </div>

      {/* Reset-password modal */}
      {resetModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setResetModal(null)}>
          <div style={{ background: "white", borderRadius: 12, padding: "26px 28px", width: 360, boxShadow: "0 8px 30px rgba(0,0,0,0.2)" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)", marginBottom: 2 }}>Reset password</div>
            <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 16 }}>Set a new password for <strong>{resetModal}</strong>. Share it with them privately — they can't recover the old one.</div>
            <input
              type="text" placeholder="New password (min 8 characters)" value={resetPw}
              onChange={e => setResetPw(e.target.value)} autoFocus
              style={{ width: "100%", boxSizing: "border-box", border: "1.5px solid var(--border)", borderRadius: 8, padding: "9px 12px", fontSize: 14, fontFamily: "inherit", marginBottom: 16 }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setResetModal(null); setResetPw(""); }}
                style={{ background: "white", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "var(--text-2)" }}>
                Cancel
              </button>
              <button onClick={resetPassword} disabled={resetPw.length < 8 || resetSaving}
                style={{ background: resetPw.length >= 8 ? "var(--navy)" : "#94a3b8", color: "white", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: resetPw.length >= 8 ? "pointer" : "default", fontFamily: "inherit" }}>
                {resetSaving ? "Saving…" : "Reset password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "flex", gap: 14, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { label: "Total Users", value: users.length },
          { label: "Admins", value: users.filter(u => u.role === "admin").length },
          { label: "Managers", value: users.filter(u => u.role === "manager").length },
          { label: "Staff", value: users.filter(u => u.role === "staff").length },
          { label: "Pending Approval", value: users.filter(u => u.status === "pending").length, alert: users.some(u => u.status === "pending") },
        ].map(s => (
          <div key={s.label} style={{ background: s.alert ? "#fffbeb" : "white", border: `1px solid ${s.alert ? "#fde68a" : "var(--border)"}`, borderRadius: 10, padding: "14px 20px", minWidth: 110 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.alert ? "#92400e" : "var(--navy)" }}>{s.value}</div>
            <div style={{ fontSize: 12, color: s.alert ? "#92400e" : "var(--text-2)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Invite codes — single-use, expiring; replaces the old shared code */}
      <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--navy)" }}>Invite Codes</div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
              Each code works once, then dies. New accounts still wait for your approval below.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select value={inviteDays} onChange={e => setInviteDays(Number(e.target.value))}
              style={{ border: "1.5px solid var(--border)", borderRadius: 6, padding: "7px 10px", fontSize: 12, fontFamily: "inherit", outline: "none" }}>
              <option value={3}>Expires in 3 days</option>
              <option value={7}>Expires in 7 days</option>
              <option value={14}>Expires in 14 days</option>
            </select>
            <button onClick={createInvite} disabled={inviteCreating}
              style={{ background: "var(--navy)", color: "white", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {inviteCreating ? "Generating…" : "Generate invite"}
            </button>
          </div>
        </div>

        {newInvite && (
          <div style={{ marginTop: 14, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <code style={{ fontSize: 16, fontWeight: 700, letterSpacing: "1px", color: "#166534" }}>{newInvite.code}</code>
            <button onClick={() => { navigator.clipboard?.writeText(newInvite.code); showToast("Invite code copied"); }}
              style={{ background: "white", border: "1px solid #bbf7d0", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: "#166534", cursor: "pointer", fontFamily: "inherit" }}>
              Copy
            </button>
            <span style={{ fontSize: 12, color: "#166534" }}>
              Share it privately — this is the only time it's shown.
            </span>
            <button onClick={() => setNewInvite(null)}
              style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 12, color: "#166534", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline" }}>
              Done
            </button>
          </div>
        )}

        {invites.length > 0 && (
          <div style={{ marginTop: 14 }}>
            {(showAllInvites ? invites : invites.filter(i => i.status === "active")).map(inv => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderTop: "1px solid var(--bg-hover)", fontSize: 12, flexWrap: "wrap" }}>
                <code style={{ color: "var(--text-1)", minWidth: 130 }}>{inv.hint}</code>
                <span style={{
                  fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", padding: "2px 8px", borderRadius: 4,
                  background: inv.status === "active" ? "#dcfce7" : inv.status === "used" ? "#dbeafe" : "var(--bg-soft)",
                  color: inv.status === "active" ? "#166534" : inv.status === "used" ? "#1e40af" : "var(--text-3)",
                }}>{inv.status}</span>
                <span style={{ color: "var(--text-2)" }}>
                  {inv.status === "used" && inv.used_by
                    ? `used by ${inv.used_by}`
                    : `expires ${inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : "—"}`}
                </span>
                {inv.status === "active" && (
                  <button onClick={() => revokeInvite(inv.id)}
                    style={{ marginLeft: "auto", background: "none", border: "1px solid #fca5a5", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}>
                    Revoke
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setShowAllInvites(v => !v)}
              style={{ marginTop: 8, background: "none", border: "none", fontSize: 12, color: "var(--accent)", cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", padding: 0 }}>
              {showAllInvites ? "Show active only" : `Show all (${invites.length})`}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ color: "var(--text-2)", padding: 40, textAlign: "center" }}>Loading users…</div>
      ) : (
        <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.9fr 1fr auto", gap: 12, padding: "11px 20px", background: "var(--bg-soft)", borderBottom: "1px solid var(--border)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--text-2)" }}>
            <span>User</span><span>Role</span><span>Center</span><span>Module Access</span><span></span>
          </div>

          {visibleUsers.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "var(--text-2)", fontSize: 13 }}>
              {search ? `No users match "${search}".` : "No users found."}
            </div>
          )}

          {visibleUsers.map((user, idx) => {
            const rc = ROLE_COLORS[user.role] || ROLE_COLORS.staff;
            const joinDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : "—";
            return (
              <div key={user.username} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.9fr 1fr auto", gap: 12, padding: "14px 20px", borderBottom: idx < visibleUsers.length - 1 ? "1px solid var(--border)" : "none", alignItems: "start" }}>

                {/* User info */}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
                    {user.username}
                    {user.status === "pending" && (
                      <span style={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.5px", padding: "2px 8px", borderRadius: 4, background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
                        Pending
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2 }}>Joined {joinDate}</div>
                </div>

                {/* Role selector */}
                <div>
                  <select
                    value={user.role}
                    onChange={e => setRole(user.username, e.target.value)}
                    disabled={saving[user.username]}
                    style={{ fontSize: 12, fontWeight: 600, border: `1.5px solid ${rc.border}`, borderRadius: 6, padding: "4px 8px", background: rc.bg, color: rc.text, cursor: "pointer", outline: "none", width: "100%" }}
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {/* Center */}
                <div style={{ fontSize: 13, color: "var(--text-1)", paddingTop: 4 }}>
                  {user.center || <span style={{ color: "var(--text-3)" }}>—</span>}
                </div>

                {/* Module permission toggles */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {modules.map(mod => {
                    const on = user.permissions[mod.id] === true;
                    const key = `${user.username}-${mod.id}`;
                    return (
                      <label key={mod.id} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12 }}>
                        <div
                          onClick={() => togglePermission(user.username, mod.id, on)}
                          style={{
                            width: 32, height: 18, borderRadius: 9, background: on ? "#3b82f6" : "#d1d5db",
                            position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
                            opacity: saving[key] ? 0.5 : 1,
                          }}
                        >
                          <div style={{ position: "absolute", top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                        </div>
                        <span style={{ color: on ? "var(--text-1)" : "var(--text-3)" }}>{mod.name}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Row actions */}
                <div style={{ paddingTop: 2, display: "flex", flexDirection: "column", gap: 6 }}>
                  {user.status === "pending" && (
                    <button
                      onClick={() => approveUser(user.username)}
                      disabled={saving[user.username]}
                      title="Approve this account so they can sign in"
                      style={{ background: "#166534", color: "white", border: "none", borderRadius: 6, padding: "5px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                    >
                      {saving[user.username] ? "Approving…" : "Approve"}
                    </button>
                  )}
                  <button
                    onClick={() => { setResetModal(user.username); setResetPw(""); }}
                    title="Set a new password for this user"
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "var(--text-2)", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
                    onMouseOver={e => { e.currentTarget.style.background = "var(--bg-soft)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "none"; }}
                  >
                    Reset password
                  </button>
                  <button
                    onClick={() => deleteUser(user.username)}
                    title="Delete user"
                    style={{ background: "none", border: "1px solid #fca5a5", borderRadius: 6, padding: "4px 8px", fontSize: 11, color: "#dc2626", cursor: "pointer", fontFamily: "inherit" }}
                    onMouseOver={e => { e.currentTarget.style.background = "#fef2f2"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "none"; }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminPanel;
