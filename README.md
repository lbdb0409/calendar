# Hours for Dad

Tiny timesheet app for working for family. Two views:

- `/me` — log hours, plan the week around uni, get burnout-aware suggestions.
- `/dad/[token]` — read-only weekly summary your dad opens from a bookmark.

Built with Next.js + TypeScript + Tailwind. Optional Supabase for sync across
devices, optional Resend for emailing the weekly summary. Works with neither
configured (data lives in your browser).

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/me`. Data lives in
`localStorage` until you wire up Supabase.

## Connect Supabase (so dad's view sees your data)

1. Make a free project at https://supabase.com.
2. SQL Editor → paste `supabase/schema.sql` → Run.
3. Settings → API → copy the **Project URL** and **anon public** key.
4. `cp .env.local.example .env.local` and fill in the two `NEXT_PUBLIC_*` vars.
5. Restart `npm run dev`.

The app auto-migrates anything that was in localStorage on first cloud load.

## Weekly email to dad

1. Sign up at https://resend.com (free tier: 100 emails/day).
2. Create an API key → paste into `.env.local` as `RESEND_API_KEY`.
3. In the app, go to **Settings** and set Dad's email + name.
4. Hit **Send weekly summary** on the dashboard. (Or `/api/send-summary`
   from cron later, if you want it automatic.)

Without Resend configured, the **Send** button copies the summary as text
so you can paste it into a message yourself.

## Dad's view

In **Settings**, click **Copy dad's link**. It looks like
`https://yourapp/dad/abc123…`. Bookmark it on his phone.

## Deploy (no custom domain needed)

1. Push the folder to a GitHub repo.
2. Import it on https://vercel.com — accept defaults.
3. In the project's Vercel settings → Environment Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `RESEND_API_KEY`, `SUMMARY_FROM_EMAIL` (optional)
4. Redeploy. You'll get a free `something.vercel.app` URL — pick an obscure
   project name so it isn't guessable.

## Who can see what

- `/me`, `/me/schedule`, `/me/settings`, `/api/*` — open URLs. Anyone who finds
  the deployed URL can see and edit your timesheet, so keep the Vercel project
  name obscure.
- `/dad/<token>` — open URL. The 32-char token is randomly generated and
  acts as the soft secret. Don't paste the URL anywhere public.
