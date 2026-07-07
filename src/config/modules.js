// `category` groups the cards on the Modules page. Order within a category
// follows this array; the category sections render in MODULE_CATEGORIES order.
export const MODULES = [
  { id: "tracker",     name: "Billing Error Detection", category: "Billing", description: "Log and track weekly billing errors across transportation and attendance.", available: true },
  { id: "billing",     name: "Billing Overview",        category: "Billing", description: "Weekly, monthly, and total billing metrics.", available: true },
  { id: "provider-reports", name: "Provider Reports",   category: "Billing", description: "DODD Medicaid billing reports (errors, claims, invoices, denied) by billing cycle.", available: true },
  { id: "invoices",    name: "Invoice Manager",         category: "Billing", description: "Every generated invoice with live open balance, aging buckets, and one-click payment tracking.", available: true },
  { id: "calculator",  name: "Saturday Calculator",     category: "Tools",   description: "Estimate staffing costs and profitability for Saturday programming.", available: false },
  { id: "fleet",       name: "Fleet Dashboard",         category: "Reports", description: "Monitor vehicle maintenance status and service history.", available: false },
  { id: "utilization", name: "Utilization Tracker",     category: "Reports", description: "Track PAWS funding utilization and alert when clients approach limits.", available: false },
  { id: "ops",         name: "Pipeline Health",         category: "Tools",   description: "What runs, what failed, and how fresh every dataset is — live status of all pipelines.", available: true },
];

// Section order on the Modules page. A module whose category isn't listed here
// falls into "Other" at the end, so nothing ever silently disappears.
export const MODULE_CATEGORIES = ["Billing", "Reports", "Tools"];

export const MODULE_IDS = MODULES.map(m => m.id);

// Breadcrumb / page-title labels for every tab.
export const PAGE_LABEL = { home: "Home", modules: "Modules", tracker: "Billing Error Detection", billing: "Billing Overview", calculator: "Saturday Calculator", fleet: "Fleet Dashboard", utilization: "Utilization Tracker", ops: "Pipeline Health", faq: "Help Center", announcements: "Announcements", reports: "Reports" };
