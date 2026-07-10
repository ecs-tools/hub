import React, { useState, useEffect, useCallback } from "react";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import FleetDashboard from "./components/FleetDashboard.jsx";
import UtilizationDashboard from "./components/UtilizationDashboard.jsx";
import BillingDashboard from "./components/BillingDashboard.jsx";
import ProviderReportsDashboard from "./components/ProviderReportsDashboard.jsx";
import InvoicesDashboard from "./components/InvoicesDashboard.jsx";
import RebillingDashboard from "./components/RebillingDashboard.jsx";
import OpsDashboard from "./components/OpsDashboard.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import NoteModal from "./components/NoteModal.jsx";
import PipelineRefreshButton from "./components/PipelineRefreshButton.jsx";
import SaturdayCalculator from "./components/SaturdayCalculator.jsx";
import AdminPanel from "./components/AdminPanel.jsx";
import UnderConstruction from "./components/UnderConstruction.jsx";
import HelpCenter from "./components/HelpCenter.jsx";
import ErrorTracker from "./components/ErrorTracker.jsx";
import Sidebar from "./components/Sidebar.jsx";
import TopBar from "./components/TopBar.jsx";
import GlobalStyles from "./components/GlobalStyles.jsx";
import ModulesPage from "./components/ModulesPage.jsx";
import { AnnouncementsPage, ReportsPage, OpsCommandPage } from "./components/WorkspacePages.jsx";
import { LOGO } from "./assets/logo.js";
import { API_BASE } from "./config/api.js";
import { MODULES, MODULE_IDS } from "./config/modules.js";
import useAuth from "./hooks/useAuth.js";
import useErrorTracker from "./hooks/useErrorTracker.js";

// App is the composition layer: it owns the active tab, wires the auth and
// tracker hooks into the layout, and routes tabs to their page components.
// Auth logic lives in hooks/useAuth.js; tracker data in hooks/useErrorTracker.js.
export default function App() {
  const [activeTab, setActiveTab] = useState("home");

  const [toast, setToast] = useState(null);
  // Stable identity so the tracker hook's useCallbacks can list it as a dep
  // without being recreated every render.
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  const auth = useAuth(() => setActiveTab("home"));
  const tracker = useErrorTracker(auth.isAuthenticated, showToast);

  // Bumped after a provider-reports refresh so the dashboard remounts and
  // re-fetches its data.
  const [providerReloadKey, setProviderReloadKey] = useState(0);

  const [noteModal, setNoteModal] = useState(null); // { key, note }
  const [noteInput, setNoteInput] = useState("");
  const [sheetDbBannerVisible, setSheetDbBannerVisible] = useState(false);

  // Backend health check — fire-and-forget on mount
  useEffect(() => {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 5000);
    fetch(`${API_BASE}/api/health`, { signal: controller.signal })
      .then(res => {
        clearTimeout(tid);
        if (!res.ok) setSheetDbBannerVisible(true);
      })
      .catch(() => {
        clearTimeout(tid);
        setSheetDbBannerVisible(true);
      });
  }, []);

  // Still checking session — show nothing to avoid flash of login screen
  if (auth.isAuthenticated === null) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1a3a6b 55%, #0f172a 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <LoginScreen
        LOGO={LOGO}
        showRegister={auth.showRegister}
        setShowRegister={v => { auth.setShowRegister(v); auth.setLoginError(""); auth.setRegError(""); if (!v) { auth.setRegInviteCode(""); auth.setRegUsername(""); auth.setRegPassword(""); auth.setRegConfirm(""); } }}
        loginUsername={auth.loginUsername} setLoginUsername={v => { auth.setLoginUsername(v); auth.setLoginError(""); }}
        loginPassword={auth.loginPassword} setLoginPassword={v => { auth.setLoginPassword(v); auth.setLoginError(""); }}
        loginError={auth.loginError}
        onLogin={auth.handleLogin}
        regInviteCode={auth.regInviteCode} setRegInviteCode={v => { auth.setRegInviteCode(v); auth.setRegError(""); }}
        regCenter={auth.regCenter} setRegCenter={v => { auth.setRegCenter(v); auth.setRegError(""); }}
        regUsername={auth.regUsername} setRegUsername={v => { auth.setRegUsername(v); auth.setRegError(""); }}
        regPassword={auth.regPassword} setRegPassword={v => { auth.setRegPassword(v); auth.setRegError(""); }}
        regConfirm={auth.regConfirm} setRegConfirm={v => { auth.setRegConfirm(v); auth.setRegError(""); }}
        regError={auth.regError}
        regLoading={auth.regLoading}
        onRegister={auth.handleRegister}
      />
    );
  }

  const { userRole, userPermissions } = auth;

  // A module is accessible if: user is admin, OR their permissions explicitly
  // allow it. Any other module tab shows the Under Construction placeholder.
  // Workspace tabs (faq, modules, announcements, reports) remain accessible
  // so sidebar nav still works.
  const canAccessModule = (moduleId) => {
    if (userRole === "admin") return true;
    return userPermissions[moduleId] === true;
  };

  const showUnderConstruction =
    MODULE_IDS.includes(activeTab) &&
    !canAccessModule(activeTab);
  const underConstructionModuleName =
    (MODULES.find(m => m.id === activeTab) || {}).name || "This module";

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "var(--bg)", minHeight: "100vh", color: "var(--text-1)", display: "flex" }}>
      <GlobalStyles />

      {/* LEFT SIDEBAR */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} onLogout={auth.handleLogout} />

      {/* RIGHT COLUMN */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: "100vh" }}>

        {/* TOP BAR */}
        <TopBar activeTab={activeTab} setActiveTab={setActiveTab} saving={tracker.saving} />

      <main style={{ flex: 1, minWidth: 0 }}>

      {/* Backend health-check banner */}
      {sheetDbBannerVisible && (
        <div style={{
          background: "#fef9c3",
          border: "1.5px solid #fde68a",
          color: "#92400e",
          padding: "10px 24px",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}>
          <span>Data service may be unavailable — some information may not load correctly. If this persists, contact the System Admin.</span>
          <button
            onClick={() => setSheetDbBannerVisible(false)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#92400e",
              fontSize: 16,
              fontWeight: 700,
              padding: "0 4px",
              lineHeight: 1,
              flexShrink: 0,
            }}
            aria-label="Dismiss"
          >✕</button>
        </div>
      )}

      {/* ADMIN PANEL */}
      {activeTab === "admin-panel" && userRole === "admin" && (
        <AdminPanel apiBase={API_BASE} modules={MODULES} />
      )}

      {/* HOME — combined intro + module launcher (Home and Modules merged) */}
      {(activeTab === "home" || activeTab === "modules") && (
        <ModulesPage canAccessModule={canAccessModule} onOpenModule={setActiveTab} />
      )}

      {/* WORKSPACE PAGES */}
      {activeTab === "announcements" && <AnnouncementsPage />}
      {activeTab === "reports" && <ReportsPage />}
      {activeTab === "ops-command" && <OpsCommandPage />}

      {/* FAQ PAGE */}
      {activeTab === "faq" && <HelpCenter />}

      {/* Sub-page bar: unified back button for all module screens.
          Hidden when UnderConstruction is rendering — UC has its own back button. */}
      {MODULE_IDS.includes(activeTab) && !showUnderConstruction && (
        <div style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <button className="back-btn" onClick={() => setActiveTab("home")}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "5px 12px", fontSize: 13, fontWeight: 500, color: "var(--text-2)", cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}>
            ← Home
          </button>
          {(activeTab === "tracker" || activeTab === "calculator") && (
            <>
              <div style={{ width: 1, height: 16, background: "var(--border)", flexShrink: 0 }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-1)" }}>
                {activeTab === "tracker" ? "Error Tracker" : "Saturday Calculator"}
              </div>
            </>
          )}
          {activeTab === "tracker" && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              {!tracker.loaded && <span style={{ fontSize: 12, color: "var(--text-3)" }}>Loading…</span>}
              {userRole === "admin" && (
                <PipelineRefreshButton
                  pipeline="errors" label="Refresh Data"
                  onSuccess={tracker.reload} showToast={showToast}
                />
              )}
              <div style={{ background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "var(--text-2)" }}>
                {tracker.stats.open} open · {tracker.stats.fixed} fixed
              </div>
              {tracker.lastUpdated && (
                <div style={{ fontSize: 11, color: "var(--text-3)" }}>
                  Updated {new Date(tracker.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
              )}
            </div>
          )}
          {activeTab === "provider-reports" && userRole === "admin" && (
            <div style={{ marginLeft: "auto" }}>
              <PipelineRefreshButton
                pipeline="provider_reports" label="Refresh Reports"
                onSuccess={() => setProviderReloadKey(k => k + 1)} showToast={showToast}
              />
            </div>
          )}
        </div>
      )}

      {/* Under Construction placeholder — manager role on any non-permitted module.
          Renders in place of the actual module content. */}
      {showUnderConstruction && (
        <UnderConstruction
          moduleName={underConstructionModuleName}
          onBack={() => setActiveTab("modules")}
        />
      )}

      {activeTab === "calculator" && !showUnderConstruction && (
        <ErrorBoundary moduleName="Saturday Calculator">
          <div className="page-anim">
            <SaturdayCalculator />
          </div>
        </ErrorBoundary>
      )}

      {activeTab === "tracker" && !showUnderConstruction && (
        <ErrorBoundary moduleName="Error Tracker">
          <ErrorTracker
            tracker={tracker}
            userRole={userRole}
            onOpenNote={(key, note) => { setNoteModal({ key, note }); setNoteInput(note); }}
          />
        </ErrorBoundary>
      )}

      {/* Note Modal */}
      <NoteModal
        noteModal={noteModal}
        noteInput={noteInput}
        setNoteInput={setNoteInput}
        onSave={() => { tracker.saveNote(noteModal.key, noteInput !== undefined ? noteInput : noteModal.note); setNoteModal(null); }}
        onClose={() => setNoteModal(null)}
      />

      {activeTab === "billing" && !showUnderConstruction && (
        <div className="page-anim">
          <ErrorBoundary moduleName="Billing Overview">
            <BillingDashboard onBack={() => setActiveTab("home")} userRole={userRole} />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === "provider-reports" && !showUnderConstruction && (
        <div className="page-anim">
          <ErrorBoundary moduleName="Provider Reports">
            <ProviderReportsDashboard key={providerReloadKey} onBack={() => setActiveTab("home")} userRole={userRole} />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === "invoices" && !showUnderConstruction && (
        <div className="page-anim">
          <ErrorBoundary moduleName="Invoice Manager">
            <InvoicesDashboard onBack={() => setActiveTab("home")} userRole={userRole} />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === "rebilling" && !showUnderConstruction && (
        <div className="page-anim">
          <ErrorBoundary moduleName="Rebilling & Unpaids">
            <RebillingDashboard onBack={() => setActiveTab("home")} userRole={userRole} />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === "fleet" && !showUnderConstruction && (
        <div className="page-anim">
          <ErrorBoundary moduleName="Fleet Dashboard">
            <FleetDashboard onBack={() => setActiveTab("home")} userRole={userRole} />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === "ops" && !showUnderConstruction && (
        <div className="page-anim">
          <ErrorBoundary moduleName="Pipeline Health">
            <OpsDashboard />
          </ErrorBoundary>
        </div>
      )}

      {activeTab === "utilization" && !showUnderConstruction && (
        <div className="page-anim">
          <ErrorBoundary moduleName="Utilization Dashboard">
            <UtilizationDashboard onBack={() => setActiveTab("home")} userRole={userRole} />
          </ErrorBoundary>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "var(--navy)", color: "white", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 500, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 9999 }}>
          {toast}
        </div>
      )}

      </main>
      </div>
    </div>
  );
}
