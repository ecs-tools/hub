/**
 * Update CENTER_RATES when billing rates change.
 * Rates are per-client per session.
 * A center must also be in src/config/centers.js to appear in the app.
 */
export const CENTER_RATES = {
  "Beavercreek":  { A: 59.00, B: 106.00, C: 176.75 },
  "Englewood":    { A: 59.00, B: 106.00, C: 176.75 },
  "Avon":         { A: 59.50, B: 107.00, C: 178.75 },
  "Eastgate":     { A: 59.50, B: 107.00, C: 178.75 },
  "Lorain":       { A: 59.50, B: 107.00, C: 178.75 },
  "Parma":        { A: 60.25, B: 108.00, C: 180.50 },
  "Springboro":   { A: 60.25, B: 108.00, C: 180.50 },
  "Fairfield":    { A: 60.25, B: 108.00, C: 180.50 },
  "Independence": { A: 60.25, B: 108.00, C: 180.50 },
  "Westwood":     { A: 60.75, B: 109.00, C: 182.25 },
};

/**
 * Staff-to-client ratios for each acuity level.
 * Value = number of clients per 1 staff member.
 */
export const ACUITY_RATIOS = { A: 10, B: 6, C: 3, CP: 1 };
