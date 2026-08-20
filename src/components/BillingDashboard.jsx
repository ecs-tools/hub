import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Billing Overview — a single-page financial view.
//
// The audience is people who do NOT work in the billing system, so every number
// here is a financial one. Operational exceptions (billing errors, early
// departures, missed revenue) were removed 2026-08-20: they are a different job
// for a different reader and get their own reconciliation screen.
//
// ONE PAGE, NO TABS. A tab is a place for a number to hide. The previous version
// put "By Center", "Daily Rate", "AR" and "Weekly Trend" behind four tabs, so no
// two of them were ever on screen together.
//
// Data: GET /api/billing/overview -> staging.fct_billing_overview (billed,
// centres, funding sources, attendance) + staging.fct_revenue_cycle
// (collections, sourced from the ODODD remittance files rather than Brittco's
// stale `Paid` column). ONE request; the rules live in dbt, not in this file.
//
// COLLECTIONS ARE ORGANISATION-LEVEL. Billed knows the cost centre; collected
// knows the Medicaid number and has never heard of one. Bridging the two by
// client name reaches ~89% of dollars today, so there is deliberately no
// per-centre "collected" column — a stakeholder page must not carry a number
// that is quietly 10% light.
// ─────────────────────────────────────────────────────────────────────────────

const API =
  import.meta.env.VITE_BILLING_API_URL ||
  "https://web-production-3b1f4.up.railway.app";

// ── Formatting ───────────────────────────────────────────────────────────────
const money0 = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD",
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});
const money2 = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD",
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const counter = new Intl.NumberFormat("en-US");

const fmt$ = (n) => (n == null ? "—" : money0.format(Number(n)));
const fmt$2 = (n) => (n == null ? "—" : money2.format(Number(n)));
const fmtN = (n) => (n == null ? "—" : counter.format(Number(n)));
const fmtPct = (n) => (n == null ? "—" : `${Number(n).toFixed(1)}%`);

// Parse as UTC. A bare `new Date("2026-08-01")` shifts backwards in western
// timezones, which silently renames the month on every label.
function ymd(v) {
  if (!v) return null;
  const [y, m, d] = String(v).slice(0, 10).split("-").map(Number);
  if (!y || !m) return null;
  return new Date(Date.UTC(y, m - 1, d || 1));
}
function monthLabel(v) {
  const d = ymd(v);
  return d ? d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }) : "";
}
function yearOf(v) {
  return v ? String(v).slice(0, 4) : "";
}
function dateLabel(v) {
  const d = ymd(v);
  return d
    ? d.toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
      })
    : "—";
}

// ── Measure the container so SVG text never scales with a viewBox ───────────
function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(720);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.width;
      if (next > 0) setW(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

// Round an axis top up so ticks land on numbers a person would say out loud.
function niceMax(v) {
  if (!v || v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * mag;
}

function EmptyPlot({ height }) {
  return (
    <div style={{
      height, display: "flex", alignItems: "center", justifyContent: "center",
      color: "var(--viz-muted)", fontSize: 13,
    }}>
      No data for this period
    </div>
  );
}

// ── Line chart: 1–2 series over time, crosshair + tooltip ───────────────────
// ONE y-axis, always. Two y-scales on one plot invent a correlation that is not
// in the data. Billed and collected are both dollars, so they share this axis
// honestly; anything on a different scale gets its own chart below.
function TrendChart({ rows, series, height = 260, format = fmt$ }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);

  const PAD = { top: 18, right: 20, bottom: 34, left: 70 };
  const plotW = Math.max(60, W - PAD.left - PAD.right);
  const plotH = Math.max(40, height - PAD.top - PAD.bottom);

  const max = useMemo(() => {
    const vals = rows.flatMap((r) => series.map((s) => Number(r[s.key]) || 0));
    return niceMax(Math.max(1, ...vals));
  }, [rows, series]);

  if (!rows.length) {
    return <div ref={ref}><EmptyPlot height={height} /></div>;
  }

  const x = (i) => (rows.length === 1 ? plotW / 2 : (i / (rows.length - 1)) * plotW);
  const y = (v) => plotH - ((Number(v) || 0) / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const last = rows.length - 1;

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left - PAD.left;
    const i = Math.round((px / plotW) * last);
    setHover(Math.max(0, Math.min(last, i)));
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <svg
        width="100%" height={height} role="img"
        aria-label={series.map((s) => s.label).join(" and ") + " by month"}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        style={{ display: "block" }}
      >
        <g transform={`translate(${PAD.left},${PAD.top})`}>
          {/* Solid hairline gridlines. Dashing reads as a threshold. */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={0} x2={plotW} y1={y(t)} y2={y(t)}
                stroke="var(--viz-grid)" strokeWidth="1" />
              <text x={-10} y={y(t)} dy="0.32em" textAnchor="end"
                fill="var(--viz-muted)" fontSize="11"
                style={{ fontVariantNumeric: "tabular-nums" }}>
                {format(t)}
              </text>
            </g>
          ))}

          {series.map((s) => (
            <polyline key={s.key} fill="none" stroke={s.color} strokeWidth="2"
              strokeLinejoin="round" strokeLinecap="round"
              points={rows.map((r, i) => `${x(i)},${y(r[s.key])}`).join(" ")} />
          ))}

          {/* Endpoint markers only. A dot with a number on every point is the
              classic unreadable chart — the axis and tooltip carry the rest. */}
          {series.map((s) => (
            <circle key={s.key} cx={x(last)} cy={y(rows[last][s.key])} r="4"
              fill={s.color} stroke="var(--viz-surface)" strokeWidth="2" />
          ))}

          {hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={0} y2={plotH}
                stroke="var(--viz-axis)" strokeWidth="1" />
              {series.map((s) => (
                <circle key={s.key} cx={x(hover)} cy={y(rows[hover][s.key])} r="5"
                  fill={s.color} stroke="var(--viz-surface)" strokeWidth="2" />
              ))}
            </g>
          )}

          <line x1={0} x2={plotW} y1={plotH} y2={plotH}
            stroke="var(--viz-axis)" strokeWidth="1" />
          {rows.map((r, i) => (
            <text key={i} x={x(i)} y={plotH + 18} textAnchor="middle"
              fill="var(--viz-muted)" fontSize="11">
              {monthLabel(r.service_month)}
            </text>
          ))}
        </g>
      </svg>

      {hover != null && (
        <div style={{
          position: "absolute",
          left: Math.max(8, Math.min(W - 196, PAD.left + x(hover) + 12)),
          top: PAD.top, pointerEvents: "none",
          background: "var(--viz-surface)", border: "1px solid var(--viz-border)",
          borderRadius: 8, padding: "8px 10px", fontSize: 12, minWidth: 156,
          boxShadow: "0 4px 14px rgba(0,0,0,.10)", zIndex: 5,
        }}>
          <div style={{ color: "var(--viz-text-2)", marginBottom: 6 }}>
            {monthLabel(rows[hover].service_month)} {yearOf(rows[hover].service_month)}
          </div>
          {series.map((s) => (
            <div key={s.key} style={{
              display: "flex", alignItems: "center", gap: 10,
              justifyContent: "space-between", marginTop: 3,
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 9, height: 9, borderRadius: 2, background: s.color,
                  display: "inline-block", flexShrink: 0,
                }} />
                <span style={{ color: "var(--viz-text-2)" }}>{s.label}</span>
              </span>
              <strong style={{
                color: "var(--viz-text-1)", fontVariantNumeric: "tabular-nums",
              }}>
                {format(rows[hover][s.key])}
              </strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ranked horizontal bars ───────────────────────────────────────────────────
// ONE colour for every bar. Shading each bar darker-where-bigger encodes the
// same number twice and spends the only free channel on nothing.
function RankedBars({ rows, labelKey, valueKey, extra }) {
  if (!rows || !rows.length) return <EmptyPlot height={120} />;
  const max = Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {rows.map((r) => {
        const v = Number(r[valueKey]) || 0;
        return (
          <div key={String(r[labelKey])}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "baseline", gap: 12, marginBottom: 4,
            }}>
              <span style={{
                fontSize: 13, color: "var(--viz-text-1)", fontWeight: 500,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {r[labelKey]}
              </span>
              <span style={{
                fontSize: 13, color: "var(--viz-text-1)", flexShrink: 0,
                fontVariantNumeric: "tabular-nums",
              }}>
                {fmt$(v)}
                {extra && (
                  <span style={{ color: "var(--viz-muted)", marginLeft: 8 }}>
                    {extra(r)}
                  </span>
                )}
              </span>
            </div>
            {/* Thin mark, 4px rounded data-end, anchored to the baseline. */}
            <div style={{
              height: 8, background: "var(--viz-track)", borderRadius: 4,
            }}>
              <div style={{
                width: `${Math.max((v / max) * 100, 0.5)}%`, height: "100%",
                background: "var(--viz-s1)", borderRadius: 4,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────
function Stat({ label, value, sub, tone }) {
  return (
    <div style={{
      background: "var(--viz-surface)", border: "1px solid var(--viz-border)",
      borderRadius: 12, padding: "16px 18px", minWidth: 0,
    }}>
      <div style={{
        fontSize: 11, color: "var(--viz-text-2)", fontWeight: 600,
        textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8,
      }}>
        {label}
      </div>
      {/* Proportional figures on purpose — tabular-nums makes a large
          standalone number look loose. Tabular is for columns, in tables. */}
      <div style={{
        fontSize: 27, fontWeight: 650, lineHeight: 1.12,
        color: tone || "var(--viz-text-1)", wordBreak: "break-word",
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: 12, color: "var(--viz-text-2)", marginTop: 6, lineHeight: 1.35,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function Card({ title, note, children }) {
  return (
    <section style={{
      background: "var(--viz-surface)", border: "1px solid var(--viz-border)",
      borderRadius: 12, padding: 18, minWidth: 0,
    }}>
      <header style={{ marginBottom: 14 }}>
        <h3 style={{
          margin: 0, fontSize: 14, fontWeight: 650, color: "var(--viz-text-1)",
        }}>
          {title}
        </h3>
        {note && (
          <p style={{
            margin: "5px 0 0", fontSize: 12, color: "var(--viz-text-2)",
            lineHeight: 1.45,
          }}>
            {note}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

// A legend is always present for 2+ series, so identity is never colour-alone.
// A single series needs none — the card title names it.
function Legend({ series }) {
  if (series.length < 2) return null;
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 10 }}>
      {series.map((s) => (
        <span key={s.key} style={{
          display: "flex", alignItems: "center", gap: 6,
          fontSize: 12, color: "var(--viz-text-2)",
        }}>
          <span style={{
            width: 10, height: 10, borderRadius: 2, background: s.color,
          }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function BillingDashboard({ onBack }) {
  const [data, setData] = useState(null);
  const [year, setYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const loadedOnce = useRef(false);

  const load = useCallback(async (y) => {
    // Hold the previous render while refetching. A skeleton flash on every year
    // change is a layout jump that carries no information.
    if (loadedOnce.current) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API}/api/billing/overview${y ? `?year=${y}` : ""}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json();
      setData(json);
      loadedOnce.current = true;
      if (y == null) setYear(json.year);
    } catch (e) {
      setError(
        e.message === "401" || e.message === "403"
          ? "Not signed in. Sign in, then refresh this page."
          : "Could not load billing data. If this persists, try a hard refresh."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(null); }, [load]);

  const trendSeries = useMemo(() => ([
    { key: "billed", label: "Billed", color: "var(--viz-s1)" },
    { key: "collected", label: "Collected", color: "var(--viz-s2)" },
  ]), []);
  const rateSeries = useMemo(() => ([
    { key: "daily_rate", label: "Revenue per day", color: "var(--viz-s1)" },
  ]), []);

  const k = data?.kpis || {};
  const c = data?.collections || {};
  const monthly = data?.monthly || [];
  const centers = data?.centers || [];
  const sourceTotal = (data?.sources || [])
    .reduce((a, s) => a + Number(s.billed || 0), 0);

  return (
    <div className="viz-root">
      <style>{`
        /* LIGHT ONLY, DELIBERATELY. The Hub has no dark theme — GlobalStyles
           defines a single light token set and nothing anywhere reads
           prefers-color-scheme. An earlier version of this file shipped a
           theme-aware palette, so on an OS set to dark this one page went black
           while the rest of the site stayed white. A page inside a
           single-theme app follows the app, not the operating system.

           Colours are the app's OWN tokens wherever one exists, so this page
           re-themes with the rest of the Hub instead of drifting from it. */
        .viz-root {
          color-scheme: light;
          --viz-plane:   var(--bg-soft, #f7f7f5);
          --viz-surface: var(--bg, #ffffff);
          --viz-text-1:  var(--text-1, #1a1a1a);
          --viz-text-2:  var(--text-2, #6b6b6b);
          --viz-muted:   var(--text-3, #9b9a97);
          --viz-grid:    var(--border, #e9e9e7);
          --viz-axis:    #d8d8d5;
          --viz-border:  var(--border, #e9e9e7);
          --viz-track:   var(--bg-hover, #f1f1ef);
          /* Series 1 is the Hub's own accent blue. Validated as a categorical
             pair against the #ffffff surface: all six checks pass, worst
             adjacent CVD dE 25.3, normal-vision 33.5 (targets 8 and 15). */
          --viz-s1:      var(--accent, #2383e2);
          --viz-s2:      #eb6834;
          --viz-good:    #006300;
          background: var(--viz-plane);
          color: var(--viz-text-1);
          min-height: 100vh;
          padding: 20px clamp(12px, 3vw, 32px) 48px;
          /* The app's own brand sans; the stack is the fallback for when this
             component renders standalone. One face everywhere, including the
             large stat values — a display or serif figure reads as off-brand. */
          font-family: var(--font-sans, "IBM Plex Sans"), system-ui,
                       -apple-system, "Segoe UI", sans-serif;
        }
        .viz-kpis {
          display: grid; gap: 12px; grid-template-columns: repeat(2, 1fr);
        }
        @media (min-width: 700px) {
          .viz-kpis { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1080px) {
          .viz-kpis { grid-template-columns: repeat(5, 1fr); }
        }
        .viz-two { display: grid; gap: 16px; grid-template-columns: 1fr; }
        @media (min-width: 900px) {
          .viz-two { grid-template-columns: 1fr 1fr; }
        }
        .viz-btn {
          background: var(--viz-surface); color: var(--viz-text-1);
          border: 1px solid var(--viz-border); border-radius: 8px;
          padding: 6px 12px; font-size: 13px; cursor: pointer;
          font-family: inherit;
        }
        .viz-btn:hover { background: var(--viz-track); }
        .viz-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .viz-table th, .viz-table td {
          padding: 8px 10px; text-align: right;
          border-bottom: 1px solid var(--viz-grid); white-space: nowrap;
        }
        .viz-table th:first-child, .viz-table td:first-child { text-align: left; }
        .viz-table td { font-variant-numeric: tabular-nums; color: var(--viz-text-1); }
        .viz-table th {
          color: var(--viz-text-2); font-weight: 600; font-size: 12px;
        }
      `}</style>

      {/* ── Header + the ONE filter row, above everything it scopes ────────── */}
      <header style={{
        display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end",
        justifyContent: "space-between", marginBottom: 20,
      }}>
        <div>
          {onBack && (
            <button onClick={onBack} className="viz-btn"
              style={{ marginBottom: 10, padding: "5px 11px" }}>
              ← Back
            </button>
          )}
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 680 }}>
            Billing Overview
          </h1>
          {data && (
            <p style={{
              margin: "6px 0 0", fontSize: 13, color: "var(--viz-text-2)",
            }}>
              {year} year to date
              {c.data_as_of && ` · payment data as of ${dateLabel(c.data_as_of)}`}
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {(data?.years || []).length > 1 && (
            <select
              className="viz-btn" value={year || ""}
              onChange={(e) => {
                const y = Number(e.target.value);
                setYear(y);
                load(y);
              }}
            >
              {data.years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <button className="viz-btn" onClick={() => setShowTable((v) => !v)}>
            {showTable ? "Hide table" : "Table view"}
          </button>
        </div>
      </header>

      {loading && (
        <p style={{ color: "var(--viz-text-2)", fontSize: 14 }}>
          Loading billing data…
        </p>
      )}

      {error && !loading && (
        <div style={{
          background: "var(--viz-surface)", border: "1px solid var(--viz-border)",
          borderRadius: 12, padding: 18, fontSize: 14,
        }}>
          {error}
        </div>
      )}

      {data && !error && (
        <div style={{
          opacity: refreshing ? 0.55 : 1, transition: "opacity .15s",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          {/* ── KPI row ─────────────────────────────────────────────────────── */}
          <div className="viz-kpis">
            <Stat label="Billed" value={fmt$(k.billed)}
              sub={`${fmtN(k.billed_lines)} service lines`} />
            <Stat label="Collected" value={fmt$(c.paid)}
              tone="var(--viz-good)"
              sub={k.collection_rate != null
                ? `${fmtPct(k.collection_rate)} of billed`
                : null} />
            <Stat label="Revenue per day" value={fmt$2(k.daily_rate)}
              sub="Billed ÷ attendance days" />
            <Stat label="Attendance days" value={fmtN(k.attendance_days)}
              sub="Client-days of adult day" />
            <Stat label="Past due" value={fmt$(c.chaseable)}
              sub={Number(c.awaiting_file) > 0
                ? `${fmt$(c.awaiting_file)} more not yet adjudicated`
                : "Payment is overdue"} />
          </div>

          {/* ── Hero chart ──────────────────────────────────────────────────── */}
          <Card
            title="Billed vs collected by month"
            note="Collected comes from the payer's own remittance files, not from the billing system's paid column. The most recent months are still inside the normal payment cycle, so a gap there is expected."
          >
            <Legend series={trendSeries} />
            <TrendChart rows={monthly} series={trendSeries} height={280} />
          </Card>

          <div className="viz-two">
            <Card title="Revenue per day"
              note="Billed excluding residential per-diem, divided by client-days attended.">
              <TrendChart rows={monthly} series={rateSeries} height={210}
                format={(v) => money0.format(v)} />
            </Card>

            <Card title="Where the money comes from"
              note="Funding source, by billed dollars.">
              <RankedBars
                rows={data.sources} labelKey="funding_source" valueKey="billed"
                extra={(r) => (sourceTotal
                  ? `${((Number(r.billed) / sourceTotal) * 100).toFixed(1)}%`
                  : "")} />
            </Card>
          </div>

          <div className="viz-two">
            <Card title="Billed by center"
              note="Revenue per day shown beside each center.">
              <RankedBars rows={centers} labelKey="center_name" valueKey="billed"
                extra={(r) => `${fmt$2(r.daily_rate)}/day`} />
            </Card>

            <Card title="Service mix" note="Gross billed by service type.">
              <RankedBars rows={data.service_mix} labelKey="service_family"
                valueKey="billed" />
            </Card>
          </div>

          {/* ── Collections ─────────────────────────────────────────────────── */}
          <Card
            title="Collections"
            note={`Submitted to the payer and adjudicated. Payment files run through ${dateLabel(c.paid_through)} — anything after that has not been downloaded yet and is not late.`}
          >
            <div className="viz-kpis" style={{ marginBottom: 16 }}>
              <Stat label="Submitted" value={fmt$(c.submitted)} />
              <Stat label="Paid" value={fmt$(c.paid)} tone="var(--viz-good)" />
              <Stat label="Denied" value={fmt$(c.denied)} />
              <Stat label="Not yet adjudicated" value={fmt$(c.awaiting_file)}
                sub="Inside the normal cycle" />
              <Stat label="Past due" value={fmt$(c.chaseable)}
                sub="Genuinely chaseable" />
            </div>

            {(data.aging || []).length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table className="viz-table">
                  <thead>
                    <tr>
                      <th>Age from due date</th><th>Lines</th><th>Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.aging.map((a) => (
                      <tr key={a.ar_bucket}>
                        <td>{a.ar_bucket}</td>
                        <td>{fmtN(a.lines)}</td>
                        <td>{fmt$2(a.outstanding)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ── Table view: every charted value, reachable without colour ──── */}
          {showTable && (
            <Card title="Table view" note="Every value shown above, as numbers.">
              <div style={{ overflowX: "auto" }}>
                <table className="viz-table">
                  <thead>
                    <tr>
                      <th>Month</th><th>Billed</th><th>Collected</th>
                      <th>Attendance days</th><th>Revenue per day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m) => (
                      <tr key={m.service_month}>
                        <td>{monthLabel(m.service_month)} {yearOf(m.service_month)}</td>
                        <td>{fmt$2(m.billed)}</td>
                        <td>{fmt$2(m.collected)}</td>
                        <td>{fmtN(m.attendance_days)}</td>
                        <td>{fmt$2(m.daily_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ overflowX: "auto", marginTop: 22 }}>
                <table className="viz-table">
                  <thead>
                    <tr>
                      <th>Center</th><th>Billed</th><th>Attendance days</th>
                      <th>Clients</th><th>Revenue per day</th>
                    </tr>
                  </thead>
                  <tbody>
                    {centers.map((r) => (
                      <tr key={r.center_name}>
                        <td>{r.center_name}</td>
                        <td>{fmt$2(r.billed)}</td>
                        <td>{fmtN(r.attendance_days)}</td>
                        <td>{fmtN(r.clients)}</td>
                        <td>{fmt$2(r.daily_rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <footer style={{
            fontSize: 12, color: "var(--viz-text-2)", padding: "4px 2px 0",
            lineHeight: 1.5,
          }}>
            Billed excludes residential per-diem ({fmt$(k.osl_billed)} in {year});
            gross billed including it is {fmt$(k.gross_billed)}. Collections are
            organisation-wide and are not split by center.
          </footer>
        </div>
      )}
    </div>
  );
}
