/**
 * Canonical ordered list of ECS center names.
 * Add or rename centers here — every part of the app that uses this list
 * will update automatically.
 */
export const CENTERS = [
  "Avon",
  "Beavercreek",
  "Eastgate",
  "Englewood",
  "Fairfield",
  "Independence",
  "Lorain",
  "Parma",
  "Springboro",
  "Westwood",
];

/** Convenience: includes "All Centers" as the first option for filter dropdowns. */
export const CENTERS_WITH_ALL = ["All Centers", ...CENTERS];
