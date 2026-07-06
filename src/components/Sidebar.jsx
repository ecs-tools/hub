import React from "react";
import { LOGO } from "../assets/logo.js";
import { MODULE_IDS } from "../config/modules.js";

// Left navigation rail.
export default function Sidebar({ activeTab, setActiveTab, userRole, onLogout }) {
  const sidebarActive = (tab) => {
    if (tab === "modules") return MODULE_IDS.includes(activeTab) || activeTab === "modules";
    if (tab === "faq") return activeTab === "faq";
    return activeTab === tab;
  };
  return (
      <nav style={{ width: "var(--sidebar-w)", flexShrink: 0, background: "var(--navy)", minHeight: "100vh", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>

        {/* Brand */}
        <button onClick={() => setActiveTab("home")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: "18px 16px 16px", width: "100%", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.1)", flexShrink: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
            <img src={LOGO} alt="ECS" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", letterSpacing: "-0.2px", lineHeight: 1.2 }}>Empowered IS</span>
        </button>

        {/* Nav items */}
        <div style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          <button className={`nav-item${sidebarActive("home") ? " active" : ""}`} onClick={() => setActiveTab("home")}>Home</button>
          <button className={`nav-item${sidebarActive("modules") ? " active" : ""}`} onClick={() => setActiveTab("modules")}>Modules</button>

          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(255,255,255,0.3)", padding: "16px 12px 6px" }}>Workspace</div>
          <button className={`nav-item${sidebarActive("announcements") ? " active" : ""}`} onClick={() => setActiveTab("announcements")}>Announcements</button>
          <button className={`nav-item${sidebarActive("faq") ? " active" : ""}`} onClick={() => setActiveTab("faq")}>Help Center</button>
          <button className={`nav-item${sidebarActive("reports") ? " active" : ""}`} onClick={() => setActiveTab("reports")}>Reports</button>
          <button className={`nav-item${sidebarActive("ops-command") ? " active" : ""}`} onClick={() => setActiveTab("ops-command")}>Operations Command Center</button>

          {userRole === "admin" && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: "rgba(255,255,255,0.3)", padding: "16px 12px 6px" }}>Admin</div>
              <button className={`nav-item${sidebarActive("admin-panel") ? " active" : ""}`} onClick={() => setActiveTab("admin-panel")}>Admin Panel</button>
            </>
          )}
        </div>

        {/* User card */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "14px 16px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--steel)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{userRole === "admin" ? "A" : "M"}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{userRole === "admin" ? "Admin" : "Manager"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.3, marginTop: 1 }}>ECS Staff</div>
            </div>
            <button onClick={onLogout} title="Log out" style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: 16, padding: 4, lineHeight: 1, display: "flex", alignItems: "center" }}
              onMouseOver={e => e.currentTarget.style.color = "#fff"} onMouseOut={e => e.currentTarget.style.color = "rgba(255,255,255,0.45)"}>
              &#x2192;
            </button>
          </div>
        </div>

      </nav>
  );
}
