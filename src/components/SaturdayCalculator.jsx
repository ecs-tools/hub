/**
 * SaturdayCalculator.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full calculator UI + logic for Saturday outing viability.
 * All state is managed here — the parent only needs to render this when the
 * "calculator" tab is active.
 *
 * Props: none (self-contained)
 */

import React, { useState } from "react";
import { CENTERS } from "../config/centers.js";
import { CENTER_RATES, ACUITY_RATIOS } from "../config/rates.js";

const OVERHEAD    = 250;
const MIN_PROFIT  = 500;
const THRESHOLD   = 750;
const STAFF_COST  = 17 * 7;  // $17/hr × 7 hrs = $119

export default function SaturdayCalculator() {
  const [calcCenter, setCalcCenter] = useState("");
  const [calcCounts, setCalcCounts] = useState({ A: "", B: "", C: "", CP: "" });
  const [calcExtra,  setCalcExtra]  = useState(0);
  const [calcSalary, setCalcSalary] = useState(0);

  const calcRates  = calcCenter ? CENTER_RATES[calcCenter] : null;
  const calcResult = (() => {
    if (!calcRates) return null;
    const cA  = parseInt(calcCounts.A)  || 0;
    const cB  = parseInt(calcCounts.B)  || 0;
    const cC  = parseInt(calcCounts.C)  || 0;
    const cCP = parseInt(calcCounts.CP) || 0;
    const total = cA + cB + cC + cCP;
    if (total === 0) return null;
    const minStaff      = Math.ceil(cA / ACUITY_RATIOS.A) + Math.ceil(cB / ACUITY_RATIOS.B) + Math.ceil(cC / ACUITY_RATIOS.C) + cCP;
    const totalStaff    = minStaff + (parseInt(calcExtra) || 0);
    const salary        = parseInt(calcSalary) || 0;
    const hourlyStaff   = Math.max(0, totalStaff - salary);
    const revenue       = cA * calcRates.A + cB * calcRates.B + (cC + cCP) * calcRates.C;
    const staffCostTotal = hourlyStaff * STAFF_COST;
    const totalExp      = OVERHEAD + staffCostTotal;
    const profit        = revenue - totalExp;
    const viable        = profit >= MIN_PROFIT;
    const pct           = Math.min(100, Math.round((profit / THRESHOLD) * 100));
    return { cA, cB, cC, cCP, total, minStaff, totalStaff, salary, hourlyStaff, revenue, staffCostTotal, totalExp, profit, viable, pct };
  })();

  return (
    <div style={{ padding: "32px 24px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", color: "var(--text-1)" }}>Saturday Calculator</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
            Select your center and enter client counts to see if a Saturday outing is financially viable.
          </div>
        </div>

        {/* Center selector */}
        <div style={{ background: "white", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "18px 20px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>Select Your Center</div>
          <select value={calcCenter} onChange={e => setCalcCenter(e.target.value)}
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", fontSize: 15, fontWeight: 600, background: "white", cursor: "pointer" }}>
            <option value="">— Choose a center —</option>
            {CENTERS.map(c => <option key={c}>{c}</option>)}
          </select>
          {calcRates && (
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {[["A","#0369a1","#f0f9ff","#bae6fd"],["B","#d97706","#fffbeb","#fde68a"],["C","#dc2626","#fff1f2","#fecdd3"]].map(([a, color, bg, border]) => (
                <div key={a} style={{ flex: 1, background: bg, borderRadius: 8, padding: "8px 12px", textAlign: "center", border: `1px solid ${border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.5px" }}>{a} Acuity</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#1e293b", marginTop: 2 }}>${calcRates[a].toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>per client</div>
                </div>
              ))}
              <div style={{ flex: 1, background: "#f5f3ff", borderRadius: 8, padding: "8px 12px", textAlign: "center", border: "1px solid #ddd6fe" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.5px" }}>C+ Acuity</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#7c3aed", marginTop: 2 }}>${calcRates.C.toFixed(2)}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>per client · 1:1</div>
              </div>
            </div>
          )}
        </div>

        {calcCenter && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            {/* Left column */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Client counts */}
              <div style={{ background: "white", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Client Counts</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { key: "A",  label: "A Acuity",  desc: "1 staff per 10 clients", color: "#0369a1", bg: "#f0f9ff",  border: "#bae6fd" },
                    { key: "B",  label: "B Acuity",  desc: "1 staff per 6 clients",  color: "#d97706", bg: "#fffbeb",  border: "#fde68a" },
                    { key: "C",  label: "C Acuity",  desc: "1 staff per 3 clients",  color: "#dc2626", bg: "#fff1f2",  border: "#fecdd3" },
                    { key: "CP", label: "C+ Acuity", desc: "1:1 ratio · same rate as C", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
                  ].map(({ key, label, desc, color, bg, border }) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 12, background: bg, border: `1.5px solid ${border}`, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color }}>{label}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{desc}</div>
                      </div>
                      <input type="number" min="0" placeholder="0" value={calcCounts[key]}
                        onChange={e => setCalcCounts(prev => ({ ...prev, [key]: e.target.value }))}
                        style={{ width: 64, border: `1.5px solid ${border}`, borderRadius: 8, padding: 8, fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace", color, textAlign: "center", background: "white" }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Staffing */}
              <div style={{ background: "white", borderRadius: 12, border: "1.5px solid #e2e8f0", padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 14 }}>Staffing</div>
                {calcResult && (
                  <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", marginBottom: 12, border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Minimum required staff based on client ratios</div>
                    <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'DM Mono', monospace", color: "#1e293b", marginTop: 2 }}>{calcResult.minStaff} staff</div>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Additional staff</div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Beyond the minimum</div>
                  </div>
                  <input type="number" min="0" value={calcExtra} onChange={e => setCalcExtra(e.target.value)}
                    style={{ width: 64, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: 8, fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#1e293b", textAlign: "center" }} />
                </div>
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>Salary / Non-hourly staff</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>Fills ratio requirement — no $119 cost</div>
                    </div>
                    <input type="number" min="0" value={calcSalary} onChange={e => setCalcSalary(e.target.value)}
                      style={{ width: 64, border: "1.5px solid #ddd6fe", borderRadius: 8, padding: 8, fontSize: 18, fontWeight: 700, fontFamily: "'DM Mono', monospace", color: "#7c3aed", textAlign: "center", background: "#f5f3ff" }} />
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 10 }}>$17/hr × 7 hrs = $119 per hourly staff member</div>
              </div>
            </div>

            {/* Right column — result */}
            <div style={{ position: "sticky", top: 24 }}>
              <div style={{ background: "white", borderRadius: 16, border: `2px solid ${!calcResult ? "#e2e8f0" : calcResult.viable ? "#86efac" : "#fca5a5"}`, padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", textAlign: "center" }}>
                {!calcResult ? (
                  <div style={{ padding: "40px 0" }}>
                    <div style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>Enter client counts to see your result</div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: "inline-block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", padding: "3px 10px", borderRadius: 4, marginBottom: 8, background: calcResult.viable ? "#dcfce7" : "#fee2e2", color: calcResult.viable ? "#166534" : "#991b1b" }}>
                        {calcResult.viable ? "Viable" : "Not Viable"}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: calcResult.viable ? "#16a34a" : "#dc2626" }}>
                        {calcResult.viable ? "Good to Go!" : "Doesn't Clear Minimum"}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        {calcResult.viable
                          ? `Clears the $500 minimum by $${(calcResult.profit - 500).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
                          : `$${(500 - calcResult.profit).toLocaleString("en-US", { minimumFractionDigits: 2 })} short of the $500 minimum`}
                      </div>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
                        <span>$0</span><span>$750 target</span>
                      </div>
                      <div style={{ background: "#f1f5f9", borderRadius: 100, height: 10, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 100, width: `${calcResult.pct}%`, background: calcResult.viable ? "#16a34a" : "#ef4444", transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", fontSize: 13, textAlign: "left", marginBottom: 14 }}>
                      {[
                        { label: `Revenue (${calcResult.total} clients)`, val: calcResult.revenue, color: "#0369a1" },
                        { label: "Overhead", val: -250, color: "#dc2626" },
                        { label: `Staff (${calcResult.hourlyStaff} hourly${calcResult.salary > 0 ? ` + ${calcResult.salary} salary` : ""} × $119)`, val: -calcResult.staffCostTotal, color: "#dc2626" },
                      ].map(({ label, val, color }) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                          <span style={{ color: "#64748b" }}>{label}</span>
                          <span style={{ fontFamily: "'DM Mono', monospace", color, fontWeight: 500 }}>{val < 0 ? "-" : ""}${Math.abs(val).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: "1px solid #e2e8f0", margin: "8px 0" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                        <span style={{ color: "#64748b", fontWeight: 700 }}>Net Profit</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", color: calcResult.viable ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                          ${calcResult.profit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[["A", calcResult.cA, "#0369a1", "#f0f9ff"], ["B", calcResult.cB, "#d97706", "#fffbeb"], ["C", calcResult.cC, "#dc2626", "#fff1f2"], ["C+", calcResult.cCP, "#7c3aed", "#f5f3ff"]].map(([label, count, color, bg]) => (
                        <div key={label} style={{ flex: 1, background: bg, borderRadius: 8, padding: 8, textAlign: "center" }}>
                          <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'DM Mono', monospace", color }}>{count}</div>
                          <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
