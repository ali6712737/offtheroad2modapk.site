# Blog + Admin Panel (Cloudflare Pages + D1)

## Setup (one time)
1. Cloudflare → Workers & Pages → D1 → Create database `blogdb`. Open its Console and paste ALL of `schema.sql`, run.
2. Pages project → Settings → Bindings → Add D1 binding: variable name `DB` → `blogdb`.
3. Settings → Variables and Secrets: `ADMIN_USER`, `ADMIN_PASS`, `SESSION_SECRET` (any long random text) — add them as Secrets.
4. Replace the repo files with this project (keep `functions/` and `public/` folders), push to GitHub. Build output directory: `public`, no build command.
5. Open `/admin`, login, then Settings → set Site URL, Ads Manager → paste ads.
6. deploy
