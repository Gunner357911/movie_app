-- Run once in the Supabase SQL Editor before using the React app.
-- The frontend uses the public anon key, so these policies are what protect the data.

-- Table (moved out of the app; the client must not run DDL)
create table if not exists movie_rating (
  id serial primary key,
  name text not null,
  date date not null,
  gun_score integer,
  team_score integer,
  comment text not null
);

-- Scores must be 0-10. Fails if existing rows are out of range: fix those first.
alter table movie_rating
  add constraint gun_score_range check (gun_score between 0 and 10),
  add constraint team_score_range check (team_score between 0 and 10);

-- Only users listed here can touch movie_rating.
create table if not exists allowed_users (
  user_id uuid primary key references auth.users on delete cascade
);
alter table allowed_users enable row level security;
-- Users may only see their own row (needed: the movie_rating policy's subquery is itself
-- subject to RLS). Nobody can insert/update/delete it from the client.
create policy "read own allowlist row" on allowed_users
  for select to authenticated
  using (user_id = (select auth.uid()));

alter table movie_rating enable row level security;

create policy "members full access" on movie_rating
  for all to authenticated
  using ((select auth.uid()) in (select user_id from allowed_users))
  with check ((select auth.uid()) in (select user_id from allowed_users));

-- After creating the 3 users in Authentication > Users, add them:
-- insert into allowed_users (user_id)
--   select id from auth.users where email in ('a@example.com', 'b@example.com', 'c@example.com');
