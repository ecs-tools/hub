# This frontend has moved

**As of 2026-08-20, the source of truth for the Hub is
`C:\Projects\ecs-platform\frontend\`.** Do not edit the files here — changes in
this folder go nowhere.

## What this repo is now

`ecs-tools/hub` is a **publish target, not a source repo.** GitHub Pages still
serves empoweredis.com from its `gh-pages` branch, exactly as before — that path
was deliberately left untouched. What changed is only where the code is edited
and versioned.

The source moved into `ecs-platform`, which is **private**. This repo is
**public**, so that also takes the source out of public view — worth keeping in
mind given the standing rule that client names and PII never go in this codebase.

## How to ship a frontend change now

```powershell
cd C:\Projects\ecs-platform\frontend
npm run dev        # local preview at http://localhost:5173
npm run deploy     # build + publish to ecs-tools/hub gh-pages
```

`npm run deploy` passes `-r https://github.com/ecs-tools/hub.git` explicitly.
Without that flag `gh-pages` would infer the remote from the enclosing repo and
publish to `ecs-platform` — deploying nothing, and leaving a stray `gh-pages`
branch behind.

⚠️ If you create `frontend\.env.local` for a local preview, **delete it before
`npm run deploy`** — Vite bakes the value into the bundle at build time, and a
deployed site pointing at localhost is a dead site.

## Why this folder still exists

`Dev\` as a whole is not retired: `Dev\data_pipeline\` still runs four live
scheduled tasks, and `Dev\.env` holds credentials that exist nowhere else. See
`docs/CONSOLIDATION_PLAN.md` step 8 in the platform repo for the decommission
order.
