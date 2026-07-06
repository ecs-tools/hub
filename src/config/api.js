// Single source of truth for the FastAPI backend base URL. Several dashboards
// used to re-declare this same constant + fallback; import it from here instead.
// (BillingDashboard and ProviderReportsDashboard read VITE_BILLING_API_URL,
// a different env var, so they intentionally do not use this.)
export const API_BASE = import.meta.env.VITE_API_BASE || "https://web-production-3b1f4.up.railway.app";
