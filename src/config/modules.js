// `category` groups the cards on the Home page. Order within a category follows
// this array; the category sections render in MODULE_CATEGORIES order.
// `icon` is a line-icon name resolved by components/Icon.jsx (no emojis).
// `comingSoon: true` marks a planned module with no page yet — its card shows
// "Coming Soon" and is not clickable (and it's excluded from MODULE_IDS so it
// never routes anywhere).
export const MODULES = [
  // ── Billing & Invoicing ────────────────────────────────────────────────────
  { id: "billing",          name: "Billing Overview",        category: "Billing & Invoicing", icon: "chart", description: "Weekly, monthly, and year-to-date billing — daily rate, attendance, and outstanding AR.", available: true },
  { id: "provider-reports", name: "Provider Reports",        category: "Billing & Invoicing", icon: "clipboard", description: "DODD Medicaid reports — errors, claims, invoices, and denials by billing cycle.", available: true },
  { id: "invoices",         name: "Invoice Manager",         category: "Billing & Invoicing", icon: "receipt", description: "Browse invoices by tool and folder, download the PDFs, and track payments and aging.", available: true },
  { id: "tracker",          name: "Billing Error Detection", category: "Billing & Invoicing", icon: "alert", description: "Log and track weekly billing errors across transportation and attendance.", available: true },
  { id: "rebilling",        name: "Rebilling & Unpaids",     category: "Billing & Invoicing", icon: "refresh", description: "Unpaid Medicaid lines grouped by client and tagged with why they stalled — the live unpaid worklist.", available: true },

  // ── Funding & Fleet ────────────────────────────────────────────────────────
  { id: "utilization",      name: "Utilization Tracker",     category: "Funding & Fleet", icon: "trending", description: "PAWS funding use per client, with red / yellow / green alerts as authorizations run low.", available: true },
  { id: "fleet",            name: "Fleet Dashboard",         category: "Funding & Fleet", icon: "truck", description: "Vehicle maintenance status, service history, and repair tickets.", available: true },

  // ── Tools ──────────────────────────────────────────────────────────────────
  { id: "ops",              name: "Pipeline Health",         category: "Tools", icon: "activity", description: "What runs, what failed, and how fresh every dataset is — live status of all pipelines.", available: true },
  { id: "calculator",       name: "Saturday Calculator",     category: "Tools", icon: "calculator", description: "Estimate staffing costs and profitability for Saturday programming.", available: true },
];

// Section order on the Home page. A module whose category isn't listed here falls
// into "Other" at the end, so nothing ever silently disappears.
export const MODULE_CATEGORIES = ["Billing & Invoicing", "Funding & Fleet", "Tools"];

// Routable module ids — excludes Coming Soon placeholders (no page to route to).
export const MODULE_IDS = MODULES.filter(m => !m.comingSoon).map(m => m.id);

// Breadcrumb / page-title labels for every tab.
export const PAGE_LABEL = {
  home: "Home", modules: "Home",
  billing: "Billing Overview", "provider-reports": "Provider Reports",
  invoices: "Invoice Manager", rebilling: "Rebilling & Unpaids", tracker: "Billing Error Detection",
  utilization: "Utilization Tracker", fleet: "Fleet Dashboard",
  ops: "Pipeline Health", calculator: "Saturday Calculator",
  faq: "Help Center", "ops-command": "Operations Command Center",
};
