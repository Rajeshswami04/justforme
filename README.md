# linkvault

A tiny, password-locked link vault with a terminal look. Save a URL from your
laptop, phone, anywhere — it's the same list everywhere because it lives in a
real database, not just your browser.

## Deploy it (no local setup needed)

1. Create a free GitHub repo and push this folder to it (or use GitHub's
   "upload files" button in the browser — no git required).
2. Go to [vercel.com](https://vercel.com), sign in, click **Add New → Project**,
   and import that repo. Leave all build settings on their defaults.
3. Before the first deploy finishes, open **Settings → Environment Variables**
   and add:
   - `APP_PASSWORD` — any passphrase you'll remember (this is what locks your
     vault from strangers).
4. Attach a database: **Storage → Create Database → KV** (this is Vercel's
   free Redis-backed store, plenty for a personal bookmark list). Once
   created, click **Connect Project** and pick this project — Vercel fills in
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` for you automatically.
5. Redeploy (Settings → Deployments → ⋯ → Redeploy) so the new env vars take
   effect.
6. Visit your `*.vercel.app` URL, enter the passphrase from step 3, and save
   your first link. Add the page to your phone's home screen for one-tap
   access.

That's it — no server to maintain, no code to touch.

## Running locally (optional)

```bash
npm install
cp .env.example .env.local   # fill in APP_PASSWORD; KV vars optional locally
npm run dev
```

Without KV vars set locally, `@vercel/kv` will throw when you try to save —
local dev is really just for tweaking the UI. Real use happens on the
deployed Vercel URL, where KV is attached.

## How it works

- `app/page.tsx` — the whole UI: passphrase gate, add-link form, filterable list.
- `app/api/links/route.ts` — list and create links; also fetches each page's
  `<title>` server-side so you don't have to type one.
- `app/api/links/[id]/route.ts` — delete a link.
- `lib/store.ts` — thin wrapper around Vercel KV, plus the passphrase check.

Every API request must include the `x-app-password` header matching your
`APP_PASSWORD`, so the vault stays private even though the URL is public.
