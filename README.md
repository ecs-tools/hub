# ECS Hub

Internal web app for Empowered Community Services — billing, funding and fleet
operations. React + Vite, deployed to GitHub Pages.

This is the **frontend only**. It holds no data and no business logic of its
own: every screen reads an authenticated API, and unauthenticated visitors get
nothing but the shell.

## Develop

```bash
npm install
npx vite --port 5173 --strictPort   # must be 5173 — the API's CORS allowlist is exact
```

## Deploy

```bash
npm run deploy
```

Publishing is a deliberate, manual step — pushing to `main` backs the source up
but does **not** update the live site. After deploying, hard-refresh
(Ctrl+Shift+R); a stale browser cache is the most common reason a change
"didn't ship."

## Notes

- Anything prefixed `VITE_` is **baked into the public bundle** and visible in
  DevTools. Never put a secret behind that prefix.
- Framework filenames (`App.jsx`, `main.jsx`, `vite.config.js`) are kept as-is
  on purpose — renaming them breaks imports and tooling.
