# Fairway

A mobile-first golf scorekeeping app — pick a course, choose any combination of stroke / match / Stableford / skins, score hole-by-hole with live net leaderboards, and import GHIN profiles by snapping a screenshot.

Stack:

- React 18 + Vite + TypeScript
- Tailwind CSS, lucide-react icons, Fraunces / Inter typography
- React Router, TanStack Query
- Supabase (Auth, Postgres + RLS, Realtime, Edge Functions)
- Deploy: Vercel

## Local development

### 1. Install

```bash
npm install
cp .env.example .env
```

Fill `.env`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

### 2. Supabase project

Create a new project at [supabase.com](https://supabase.com). Then either:

**Option A — via Supabase CLI (recommended):**

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

**Option B — paste SQL:** open the project's SQL editor and run each file in order:

1. `supabase/migrations/0001_init.sql` (tables + indexes)
2. `supabase/migrations/0002_rls.sql` (row level security)
3. `supabase/migrations/0003_profile_trigger.sql` (auto-create a profile on signup)
4. `supabase/migrations/0004_realtime.sql` (enable realtime on `scores` + `rounds`)

### 3. Configure Auth redirect URLs

In the Supabase Dashboard → **Authentication → URL configuration**, add these **Additional Redirect URLs** so magic links can hand off back to the SPA:

- `http://localhost:5173/auth/callback`
- `https://<your-vercel-domain>/auth/callback`

Also set the **Site URL** to your production domain (`https://<your-vercel-domain>`).

### 4. Deploy the GHIN extraction Edge Function

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy extract-ghin
```

The function verifies the caller's Supabase JWT, calls `gpt-4o-mini` with `response_format: { type: "json_object" }`, and returns the parsed `{ name, ghin_number, handicap_index, low_hi, home_club, confidence }` payload. The screenshot itself is never persisted.

### 5. Run

```bash
npm run dev
```

Visit http://localhost:5173, request a magic link, then start a round.

## Deploying to Vercel

```bash
vercel link
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel --prod
```

`vercel.json` rewrites every path to `/index.html` so client-side routes (including `/auth/callback`) resolve correctly.

After the first production deploy, copy the production URL into the Supabase Auth redirect URLs (see step 3 above).

## Project layout

```
src/
  routes/        # LoginPage, AuthCallbackPage, Home, NewRound, Round, RoundSummary, Profile
  components/    # ui, layout, courses, players, scoring, leaderboard
  hooks/         # useRound, useRoundRealtime, useScores, useCourses, useFriends
  scoring/       # strokesReceived, stroke, matchPlay, stableford, skins
  lib/           # supabase client, queryClient, OpenGolfAPI wrappers
  utils/         # image downscaling, formatting
  auth/          # AuthProvider + RequireAuth
supabase/
  migrations/    # schema, RLS, profile trigger, realtime publication
  functions/extract-ghin/  # Deno edge function for GHIN screenshot OCR
```

## Scoring rules

- **Net scoring everywhere.** Strokes-received per hole come from each player's snapshotted **course handicap** and the hole's HCP rating (1 = hardest, 18 = easiest). Negative handicaps ("plus" players) subtract strokes from the easiest holes.
- **Course handicap simplification:** because OpenGolfAPI does not reliably return slope/CR, we use `round(handicap_index)` as the course handicap. The value is editable per-player in the round setup, and is snapshotted into `round_players.course_handicap` so retroactive changes to a player's handicap never alter a completed round.
- **Stroke:** standard gross + net totals.
- **Stableford:** standard scale on net par. Eagle 4 / Birdie 3 / Par 2 / Bogey 1 / Double+ 0.
- **Skins:** lowest net per hole wins (`carry + 1` skins); ties carry to the next hole.
- **Match play:** pairwise round-robin on net hole-by-hole; pair winner = more holes won; overall winner = best W-L-T, with holes-won differential as the tiebreak.

## GHIN import flow

1. User selects a screenshot from `<input type="file">`.
2. The image is downsized client-side to `<=1024px` on the long edge as JPEG ~0.85, minimizing tokens.
3. The base64 data URL is POSTed to the `extract-ghin` Edge Function with the user's bearer token.
4. The function calls `gpt-4o-mini` with `response_format: { type: "json_object" }`, validates the response, and returns the JSON.
5. The client shows a confirm dialog with editable fields and a confidence indicator before writing to `profiles`.

The image is never persisted on the server or in any database.

## Realtime

`scores` and `rounds` are in the `supabase_realtime` publication. On the round screen, the client subscribes to `postgres_changes` filtered by `round_id`, so any score upsert refetches the round bundle and updates the live leaderboard. This is the foundation for future multiplayer scoring — flipping RLS to "participants can edit their own scores" is a small change.

## Design

- Palette: forest `#1B3B2F`, cream `#F5F1E8`, brass `#B08D57`, charcoal `#1F1F1F`, hairline `#E6DFCC`.
- Typography: Fraunces (display), Inter (body).
- Icons: lucide-react only.
- No emoji, no gradient buttons, no purple.
