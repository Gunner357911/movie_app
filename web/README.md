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

## Security checklist
- Never put `SUPABASE_DB_URL` or the `service_role` key in this app.
- If the DB password was ever shared or committed, rotate it in Supabase (Project Settings → Database).
- Test: signed out, `movie_rating` must return no rows; a signed-in user not in `allowed_users` must not be able to read or write.
