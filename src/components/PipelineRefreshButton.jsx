import React, { useState, useEffect, useRef } from "react";
import { API_BASE } from "../config/api.js";

// Admin-only "run the real script" button. Clicking POSTs a queued row to
// staging.pipeline_runs; a runner on the office PC (Task Scheduler, every
// minute) claims it and executes the actual pipeline — the scripts need
// Brittco / B:\ / the EMBS session, which the cloud backend can't reach.
// We poll the run row until it flips, then fire onSuccess so the caller can
// re-fetch its data. If the office PC is off, the run expires after 2 hours
// and the button says so.
export default function PipelineRefreshButton({ pipeline, label, onSuccess, showToast }) {
  const [run, setRun] = useState(null);
  const [posting, setPosting] = useState(false);

  // Latest callbacks without re-arming the poll effect every render.
  const onSuccessRef = useRef(onSuccess);
  const showToastRef = useRef(showToast);
  useEffect(() => { onSuccessRef.current = onSuccess; showToastRef.current = showToast; });

  const pending = !!run && (run.status === "queued" || run.status === "running");

  // Pick up an in-flight run on mount (e.g. the page was refreshed mid-run).
  useEffect(() => {
    fetch(`${API_BASE}/api/pipelines/runs`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const latest = d?.latest?.[pipeline];
        if (latest && (latest.status === "queued" || latest.status === "running")) setRun(latest);
      })
      .catch(() => {});
  }, [pipeline]);

  // Poll while a run is pending.
  useEffect(() => {
    if (!pending) return;
    const tid = setInterval(async () => {
      try {
        const r = await fetch(`${API_BASE}/api/pipelines/runs`, { credentials: "include" });
        if (!r.ok) return;
        const d = await r.json();
        const latest = d?.latest?.[pipeline];
        if (!latest || latest.id !== run.id) return;
        if (latest.status !== run.status) {
          setRun(latest);
          if (latest.status === "success") {
            showToastRef.current?.(`✅ ${label} finished — data refreshed`);
            onSuccessRef.current?.();
          } else if (latest.status === "failed" || latest.status === "expired") {
            showToastRef.current?.(`${label} failed — hover the button for details`);
          }
        }
      } catch { /* transient poll failure — keep polling */ }
    }, 8000);
    return () => clearInterval(tid);
  }, [pending, run, pipeline, label]);

  const start = async () => {
    setPosting(true);
    try {
      const r = await fetch(`${API_BASE}/api/pipelines/${pipeline}/run`, {
        method: "POST", credentials: "include",
      });
      if (!r.ok) throw new Error(String(r.status));
      setRun(await r.json());
    } catch {
      showToastRef.current?.("Could not queue the run — check your connection");
    }
    setPosting(false);
  };

  const failed = !!run && (run.status === "failed" || run.status === "expired");
  const text = posting ? "Queuing…"
    : run?.status === "queued" ? "Queued — starts within 1 min"
    : run?.status === "running" ? "Running… (a few minutes)"
    : failed ? `Retry: ${label}` : `⟳ ${label}`;

  return (
    <button
      onClick={start}
      disabled={posting || pending}
      title={failed
        ? (run.detail || "The last run failed")
        : "Runs the real pipeline on the office PC — it must be on"}
      style={{
        background: pending ? "#64748b" : failed ? "#dc2626" : "var(--text-1)",
        color: "white", border: "none", borderRadius: 6, padding: "6px 14px",
        fontSize: 13, fontWeight: 500, cursor: pending || posting ? "default" : "pointer",
        fontFamily: "inherit", whiteSpace: "nowrap",
      }}>
      {text}
    </button>
  );
}
