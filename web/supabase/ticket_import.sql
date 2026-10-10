-- Run once in the Supabase SQL Editor (after security.sql) to enable the Major Cineplex
-- email import (see apps-script/). Safe to re-run.

-- Both nullable: older rows and manually added movies have neither.
alter table movie_rating add column if not exists poster_url text;
alter table movie_rating add column if not exists booking_number text;
create unique index if not exists movie_rating_booking_number_key on movie_rating (booking_number);

-- "Forgotten  Island!" and "forgotten island" compare equal.
create or replace function norm_title(t text) returns text
language sql immutable
as $$ select lower(regexp_replace(t, '[[:space:][:punct:]]', '', 'g')) $$;

-- Decides what an email should do, without changing anything (used by dryRun and import):
--   already_imported  this booking number is already in the table
--   attach            a movie added by hand on the same date: same title, or the only
--                     unimported movie that day (catches titles typed differently)
--   ambiguous         several unimported movies that day, none with the same title: skipped
--   insert            nothing on that date: add a new movie
create or replace function match_major_ticket(
  p_name text,
  p_date date,
  p_booking text,
  out action text,
  out movie_id integer,
  out movie_name text
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select id, name into movie_id, movie_name from movie_rating where booking_number = p_booking;
  if found then
    action := 'already_imported';
    return;
  end if;

  select id, name into movie_id, movie_name from movie_rating
    where date = p_date and booking_number is null and norm_title(name) = norm_title(p_name)
    order by id limit 1;
  if found then
    action := 'attach';
    return;
  end if;

  select count(*) into v_count from movie_rating where date = p_date and booking_number is null;
  if v_count = 1 then
    select id, name into movie_id, movie_name from movie_rating where date = p_date and booking_number is null;
    action := 'attach';
  elsif v_count > 1 then
    action := 'ambiguous';
  else
    action := 'insert';
  end if;
end;
$$;

-- Called only by the Apps Script with the service_role key. Returns the movie id, or null
-- when ambiguous. Attaching never touches name, date, scores or comment.
create or replace function import_major_ticket(
  p_name text,
  p_date date,
  p_booking text,
  p_poster_url text
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  m record;
  v_id integer;
begin
  select * into m from match_major_ticket(p_name, p_date, p_booking);
  case m.action
    when 'already_imported' then
      return m.movie_id;
    when 'attach' then
      update movie_rating
        set booking_number = p_booking,
            poster_url = coalesce(poster_url, p_poster_url)
        where id = m.movie_id;
      return m.movie_id;
    when 'ambiguous' then
      return null;
    else
      insert into movie_rating (name, date, gun_score, team_score, comment, poster_url, booking_number)
        values (p_name, p_date, null, null, '', p_poster_url, p_booking)
        returning id into v_id;
      return v_id;
  end case;
end;
$$;

revoke execute on function match_major_ticket(text, date, text) from public, anon, authenticated;
revoke execute on function import_major_ticket(text, date, text, text) from public, anon, authenticated;
grant execute on function match_major_ticket(text, date, text) to service_role;
grant execute on function import_major_ticket(text, date, text, text) to service_role;

-- Posters are public promo images, so the bucket is public-read. There are no insert/update
-- policies, so only the service_role key (the Apps Script) can upload.
insert into storage.buckets (id, name, public)
  values ('posters', 'posters', true)
  on conflict (id) do nothing;
