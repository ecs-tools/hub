// App-wide CSS: design tokens (:root variables) + shared classes, rendered
// once at the app root.
export default function GlobalStyles() {
  return (
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: var(--font-sans); color: var(--text-1); }
        /* Numbers are the product: keep digits column-aligned everywhere. */
        table, td, th { font-variant-numeric: tabular-nums; }
        .num { font-family: var(--font-mono); font-variant-numeric: tabular-nums; letter-spacing: -0.2px; }
        :root {
          --font-sans: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif;
          --font-mono: 'IBM Plex Mono', Consolas, monospace;
          --radius: 8px;
          --radius-sm: 6px;
          --bg: #ffffff;
          --bg-soft: #f7f7f5;
          --bg-hover: #f1f1ef;
          --border: #e9e9e7;
          --text-1: #1a1a1a;
          --text-2: #6b6b6b;
          --text-3: #9b9a97;
          --accent: #2383e2;
          --accent-soft: #e8f1fc;
          --navy: #1a2d4d;
          --steel: #4a7ab5;
          --powder: #8fb3d4;
          --light: #d6e8f5;
          --muted: #6b6b6b;
          --sidebar-w: 220px;
          --topbar-h: 52px;
        }
        select:focus, button:focus, input:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: 2px; }
        .error-row:hover { background: var(--bg-hover) !important; }
        .status-btn { cursor: pointer; border: 1px solid; border-radius: 4px; padding: 3px 10px; font-size: 12px; font-weight: 500; transition: opacity 0.1s; white-space: nowrap; font-family: inherit; }
        .status-btn:hover { opacity: 0.8; }
        .status-btn.active { box-shadow: 0 0 0 2px var(--accent); }
        .faq-a { display: none; }
        .faq-a.open { display: block; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .page-anim { animation: fadeIn 0.15s ease; }
        .back-btn:hover { background: var(--bg-soft) !important; border-color: var(--border) !important; }
        .nav-item { display: block; width: 100%; text-align: left; border: none; border-radius: 6px; padding: 8px 12px; margin-bottom: 1px; font-size: 13px; font-family: inherit; cursor: pointer; transition: background 0.1s, color 0.1s; background: none; color: rgba(255,255,255,0.65); font-weight: 400; }
        .nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .nav-item.active { background: rgba(255,255,255,0.14); color: #fff; font-weight: 600; }
        .mod-card { border: 1px solid var(--border); border-radius: var(--radius); padding: 20px 22px; background: var(--bg); position: relative; cursor: pointer; transition: border-color 0.15s, transform 0.15s; }
        .mod-card:hover { border-color: var(--steel); transform: translateY(-1px); }
        .mod-card.locked { cursor: default; opacity: 0.7; }
        .mod-card.locked:hover { border-color: var(--border); transform: none; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #d4d4d2; border-radius: 3px; }
      `}</style>
  );
}
