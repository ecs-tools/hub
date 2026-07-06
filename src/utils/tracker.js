// Shared helpers for the billing-error tracker. Manager statuses are stored in
// a map keyed by makeKey's output, so every component that looks up a status
// MUST use these shared functions — a private copy with a different key format
// is exactly how the Home page's resolution rate silently broke.

// Stable, content-based row key. Including the date means manager statuses
// re-attach to the same errors across the day's repeated pipeline re-uploads,
// yet reset on their own when a new week's dated errors arrive. The `#n`
// suffix (assigned by assignRowKeys) disambiguates true duplicates.
export function makeKey(row, idx) {
  return row._key ?? `${row.location}|${row.name}|${row.date}|${row.reason}#${idx}`;
}

// Tag each row with a stable _key. Identical rows get an incrementing #n so
// two genuine duplicates don't collapse onto one shared status.
export function assignRowKeys(rows) {
  const seen = {};
  return rows.map(row => {
    const base = `${row.location}|${row.name}|${row.date}|${row.reason}`;
    const n = (seen[base] = (seen[base] || 0) + 1);
    return { ...row, _key: `${base}#${n}` };
  });
}

export function centerName(location) {
  return location ? String(location).split(" ")[0] : "";
}

// Red → yellow → green as pct goes 0 → 100.
export function progressColor(pct) {
  if (pct <= 50) {
    const t = pct / 50;
    const r = Math.round(239 + (234 - 239) * t);
    const g = Math.round(68 + (179 - 68) * t);
    const b = Math.round(68 + (8 - 68) * t);
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (pct - 50) / 50;
    const r = Math.round(234 + (34 - 234) * t);
    const g = Math.round(179 + (197 - 179) * t);
    const b = Math.round(8 + (94 - 8) * t);
    return `rgb(${r},${g},${b})`;
  }
}

export function parseExcelDate(val) {
  if (!val) return "";
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (typeof val === "string") {
    const parts = val.split("/");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[0].padStart(2,"0")}-${parts[1].padStart(2,"0")}`;
    }
    return val;
  }
  return String(val);
}

export function categorizeReason(reason) {
  if (!reason) return "Other";
  const r = String(reason).toLowerCase();
  if (r.includes("not found in attendance") || r.includes("transported but not found")) return "Not Found in Attendance";
  if (r.includes("nmt without adult day")) return "Transport Violation";
  if (r.includes("units billed")) return "Invalid Units";
  if (r.includes("arrival time is before pickup") || r.includes("before pickup end")) return "Arrival Before Pickup";
  if (r.includes("bus ended") && r.includes("checked in")) return "Bus/Check-in Time Mismatch";
  if (r.includes("takehome") || r.includes("bus departure")) return "Takehome Time Mismatch";
  if (r.includes("pickup start missing") || r.includes("pickup end exists")) return "Missing Pickup Time";
  if (r.includes("goal documentation")) return "Missing Goal Documentation";
  if (r.includes("invalid")) return "Invalid Time";
  return "Other";
}

// YYYY-MM-DD → MM/DD/YYYY for display; anything else passes through.
export function formatDate(d) {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length === 3 && parts[0].length === 4) return `${parts[1]}/${parts[2]}/${parts[0]}`;
  return d;
}

// Parse an uploaded .xlsx into tracker rows. Header detection is heuristic on
// purpose — the weekly export's column names drift. Returns [] when nothing
// usable is found. SheetJS is imported lazily so the CDN fetch only happens
// when someone actually uploads a file.
export async function parseErrorWorkbook(file) {
  const { read, utils } = await import("https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs");
  const buf = await file.arrayBuffer();
  const wb = read(buf);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json(ws, { defval: "" });

  return rows.map(row => {
    const keys = Object.keys(row);
    const nameKey = keys.find(k => /name/i.test(k)) || keys[0];
    const locKey = keys.find(k => /location|center|site/i.test(k)) || keys[1];
    const dateKey = keys.find(k => /date/i.test(k)) || keys[2];
    const reasonKey = keys.find(k => /reason|error|message|description/i.test(k)) || keys[3];
    const reason = String(row[reasonKey] || "");
    return {
      name: String(row[nameKey] || "").trim(),
      location: String(row[locKey] || "").trim(),
      date: parseExcelDate(row[dateKey]),
      reason,
      category: categorizeReason(reason),
    };
  }).filter(r => r.name && r.location);
}
