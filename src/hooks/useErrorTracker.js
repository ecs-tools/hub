import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { API_BASE } from "../config/api.js";
import { CENTERS } from "../config/centers.js";
import { makeKey, assignRowKeys, centerName } from "../utils/tracker.js";

// All state and data flow for the billing-error tracker: the live week's rows,
// the year backlog, per-row manager statuses/notes/flags (with race-safe
// saves), the active filters/sort, and every stat derived from them.
// Rendering lives in components/ErrorTracker.jsx; this hook never touches the DOM.
export default function useErrorTracker(isAuthenticated, showToast) {
  const [rawData, setRawData] = useState([]);
  const [history, setHistory] = useState([]);            // year backlog (staging.error_history)
  const [trackerView, setTrackerView] = useState("week"); // week | backlog | carryover
  const [selectedWeek, setSelectedWeek] = useState("All Weeks");
  const [selectedCenter, setSelectedCenter] = useState("All Centers");
  const [selectedCategory, setSelectedCategory] = useState("All Types");
  const [statuses, setStatuses] = useState({});
  const [notes, setNotes] = useState({});
  const [flags, setFlags] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  // Per-key save mutex: tracks keys currently being written to the backend.
  // If a second save arrives for the same key while one is in-flight, the
  // latest value is stored here and applied as soon as the in-flight write
  // finishes — eliminating the search-then-write race condition.
  const saveInFlight = useRef({}); // key → true if a write is running
  const savePending  = useRef({}); // key → { type, value } of the latest queued value

  // ── Tracker datasets ─────────────────────────────────────────────────────────
  // This Week = the live working set (replaced by each pipeline upload).
  // Backlog   = every 2026 error ever uploaded (error_history; never deleted).
  // Carryover = backlog rows that aged out of the live set (their week's
  //             Mon-Wed pipeline runs are over) without a manager resolving
  //             them — i.e. "still not fixed by Wednesday".
  // Statuses are keyed by row content, so one status map serves all views.
  const liveKeys = useMemo(() => new Set(rawData.map(r => r._key)), [rawData]);
  const carryoverRows = useMemo(
    () => history.filter(r => !liveKeys.has(r._key) && !["fixed", "disputed"].includes(statuses[r._key])),
    [history, liveKeys, statuses]
  );
  const activeData = trackerView === "backlog" ? history : trackerView === "carryover" ? carryoverRows : rawData;

  const locations = ["All Centers", ...Array.from(new Set(activeData.map(r => centerName(r.location)))).filter(Boolean).sort()];
  const categories = ["All Types", ...Array.from(new Set(activeData.map(r => r.category))).filter(Boolean).sort()];
  const weeks = ["All Weeks", ...Array.from(new Set(history.map(r => r.week))).filter(Boolean).sort().reverse()];

  // Load error rows + per-row states from the FastAPI backend.
  // Requires a valid login cookie, so it runs once the user is authenticated.
  useEffect(() => {
    if (!isAuthenticated) return;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/errors`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const s = {}, n = {}, f = {};
          Object.entries(data.states || {}).forEach(([key, st]) => {
            if (st.status) s[key] = st.status;
            if (st.note) n[key] = st.note;
            if (st.flag) f[key] = true;
          });
          setStatuses(s);
          setNotes(n);
          setFlags(f);
          if (data.updatedAt) setLastUpdated(data.updatedAt);
          if (Array.isArray(data.rows)) {
            setRawData(assignRowKeys(data.rows.map(r => ({
              name: r.name || "",
              location: r.location || "",
              date: r.date || "",
              reason: r.reason || "",
              category: r.category || "",
            }))));
          }
        }
      } catch { /* ignore */ }

      // Year backlog — served by /api/errors/history. Keys come from the
      // server (same content-key scheme), so statuses join with no extra work.
      // If the endpoint isn't deployed yet, the Backlog/Carryover views simply
      // stay hidden.
      try {
        const hres = await fetch(`${API_BASE}/api/errors/history`, { credentials: "include" });
        if (hres.ok) {
          const hdata = await hres.json();
          if (Array.isArray(hdata.rows)) {
            setHistory(hdata.rows.map(r => ({
              name: r.name || "", location: r.location || "", date: r.date || "",
              reason: r.reason || "", category: r.category || "",
              _key: r.row_key, week: r.week_label || "",
            })));
          }
        }
      } catch { /* history unavailable — weekly view still works */ }

      setLoaded(true);
    }
    load();
  }, [isAuthenticated]);

  // ── Shared state write helper ────────────────────────────────────────────────
  // Upserts {status, note, flag} for a single row key via the backend.
  const _writeErrorState = useCallback(async (key, status, note, flag) => {
    const res = await fetch(`${API_BASE}/api/errors/state`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, status, note, flag: Boolean(flag) }),
    });
    if (!res.ok) throw new Error(`state save failed: ${res.status}`);
  }, []);

  // ── Race-safe save executor ──────────────────────────────────────────────────
  // Runs the write for `key`. If another save for the same key arrives while
  // this one is in-flight, it lands in savePending and is picked up automatically
  // when this write completes — no two writes ever race for the same key.
  const _flushSave = useCallback(async (key, statusVal, noteVal, flagVal) => {
    if (saveInFlight.current[key]) {
      // A write is already running — store latest values and bail.
      savePending.current[key] = { status: statusVal, note: noteVal, flag: flagVal };
      return;
    }
    saveInFlight.current[key] = true;
    setSaving(true);
    try {
      await _writeErrorState(key, statusVal, noteVal, flagVal);
      // If another value arrived while we were writing, flush it now.
      if (savePending.current[key]) {
        const next = savePending.current[key];
        delete savePending.current[key];
        // Run inline (still inside the in-flight lock) to preserve ordering.
        await _writeErrorState(key, next.status, next.note, next.flag);
      }
    } catch {
      showToast("Save failed");
    } finally {
      delete saveInFlight.current[key];
      setSaving(false);
    }
  }, [_writeErrorState, showToast]);

  const saveStatus = useCallback(async (key, value) => {
    const currentNote = notes[key] || "";
    const currentFlag = flags[key] ?? false;
    setStatuses(prev => ({ ...prev, [key]: value }));
    setSaving(true);
    await _flushSave(key, value, currentNote, currentFlag);
    showToast("Saved");
  }, [notes, flags, _flushSave, showToast]);

  const saveNote = useCallback(async (key, value) => {
    const currentStatus = statuses[key] || "open";
    const currentFlag   = flags[key] ?? false;
    setNotes(prev => ({ ...prev, [key]: value }));
    await _flushSave(key, currentStatus, value, currentFlag);
    showToast("Note saved");
  }, [statuses, flags, _flushSave, showToast]);

  const saveFlag = useCallback(async (key) => {
    const newFlag       = !(flags[key] ?? false);
    const currentStatus = statuses[key] || "open";
    const currentNote   = notes[key] || "";
    setFlags(prev => ({ ...prev, [key]: newFlag }));
    await _flushSave(key, currentStatus, currentNote, newFlag);
  }, [flags, statuses, notes, _flushSave]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const effStatus = (key) => statuses[key] ?? "open";
  const effFlag = (key) => flags[key] ?? false;

  const filtered = activeData.filter(row => {
    const locMatch = selectedCenter === "All Centers" || centerName(row.location) === selectedCenter;
    const catMatch = selectedCategory === "All Types" || row.category === selectedCategory;
    const weekMatch = trackerView === "week" || selectedWeek === "All Weeks" || row.week === selectedWeek;
    return locMatch && catMatch && weekMatch;
  }).sort((a, b) => {
    const aResolved = effStatus(a._key) !== "open";
    const bResolved = effStatus(b._key) !== "open";
    if (aResolved !== bResolved) return aResolved ? 1 : -1;
    if (!sortField) return 0;
    let aVal = a[sortField], bVal = b[sortField];
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const stats = {
    total: filtered.length,
    fixed: filtered.filter(r => effStatus(r._key) === "fixed").length,
    disputed: filtered.filter(r => effStatus(r._key) === "disputed").length,
    open: filtered.filter(r => effStatus(r._key) === "open").length,
  };

  const centerStats = useMemo(() => {
    return CENTERS.map(center => {
      const rows = rawData.filter(r => centerName(r.location) === center);
      const total = rows.length;
      const resolved = rows.filter(r => {
        const s = statuses[makeKey(r, rawData.indexOf(r))] ?? "open";
        return s === "fixed" || s === "disputed";
      }).length;
      const pct = total > 0 ? Math.round((resolved / total) * 100) : 100;
      return { center, total, resolved, pct, noErrors: total === 0 };
    });
  }, [rawData, statuses]);

  // Replaces the live week's rows on the server, then resets local state and
  // filters. Returns the server response, or null when the server rejected the
  // upload (previous data is unchanged — the backend replaces atomically).
  const uploadErrors = async (newData) => {
    const res = await fetch(`${API_BASE}/api/errors/upload`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: newData }),
    });
    if (!res.ok) {
      console.error("Upload failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const result = await res.json();
    setLastUpdated(result.updatedAt || new Date().toISOString());
    setStatuses({});
    setNotes({});
    setFlags({});
    setRawData(assignRowKeys(newData));
    setSelectedCenter("All Centers");
    setSelectedCategory("All Types");
    return result;
  };

  return {
    rawData, history,
    trackerView, setTrackerView,
    selectedWeek, setSelectedWeek,
    selectedCenter, setSelectedCenter,
    selectedCategory, setSelectedCategory,
    statuses, notes, flags,
    lastUpdated, saving, loaded,
    sortField, sortDir, handleSort,
    effStatus, effFlag,
    carryoverRows, locations, categories, weeks,
    filtered, stats, centerStats,
    saveStatus, saveNote, saveFlag,
    uploadErrors,
  };
}
