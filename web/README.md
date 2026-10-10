# Movie Rating App (React)

React + Vite frontend replacing the Streamlit `main.py`. It talks to Supabase directly with the public anon key; **Row Level Security is what protects the data**, so do the Supabase setup before anything else.

## 1. Supabase setup (once)
1. SQL Editor → run [`supabase/security.sql`](supabase/security.sql) (enables RLS, adds the allowlist and score checks).
2. Authentication → Users → **Add user** for each of the 3 people (email + password).
3. Authentication → Sign In / Providers → turn **off** "Allow new users to sign up".
4. Run the `insert into allowed_users ...` line at the bottom of `security.sql` with your real emails.
5. Advisors → Security: should show no "RLS disabled" warning.

## 2. Local dev
```bash
cp .env.example .env.local   # fill in URL + anon key from Project Settings → API
npm install
npm run dev
```

## 3. Deploy to Netlify
- Import the repo, set **Base directory** to `web` (build settings come from `netlify.toml`).
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Nothing else: anything starting with `VITE_` ends up in the public JS.

## 4. Auto-import from Major Cineplex emails (optional)
A Google Apps Script reads Major Cineplex booking confirmations in Gmail and adds the movie (title, watch date, poster) with empty scores. Files: [`apps-script/`](apps-script/), [`supabase/ticket_import.sql`](supabase/ticket_import.sql).

1. SQL Editor → run `supabase/ticket_import.sql` (adds `poster_url` / `booking_number`, the `import_major_ticket` function and the public `posters` bucket).
2. Go to [script.google.com](https://script.google.com) → New project, signed in to the Gmail that receives the tickets.
3. Project Settings → tick **Show "appsscript.json"**, then paste in `apps-script/appsscript.json`. Paste `majorTicketImport.gs` into `Code.gs`.
4. Project Settings → Script Properties: add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API).
5. Run `dryRun` and check the log: it should list your Major emails with title / date / booking. If it finds nothing, fix the `from:` domain in `QUERY`.
6. Run `importTickets` once, then `installTrigger` (runs every 10 minutes).

What the script can access: Gmail **read-only** (it can't send, delete or change mail), and it only searches with the fixed `QUERY`. Google has no per-sender permission, so for full isolation use a separate Gmail account that receives the Major emails via a forwarding filter.

The service_role key bypasses RLS: it lives only in Script Properties, never in this repo or a `VITE_` variable.

## Security checklist
- Never put `SUPABASE_DB_URL` or the `service_role` key in this app.
- If the DB password was ever shared or committed, rotate it in Supabase (Project Settings → Database).
- Test: signed out, `movie_rating` must return no rows; a signed-in user not in `allowed_users` must not be able to read or write.
