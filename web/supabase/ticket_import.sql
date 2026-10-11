-- Run once in the Supabase SQL Editor (after security.sql) to enable the Major Cineplex
-- email import (see apps-script/). Safe to re-run.

-- All nullable: older rows and manually added movies have none of them.
alter table movie_rating add column if not exists poster_url text;
alter table movie_rating add column if not exists booking_number text;
-- The title as Major spelled it, so a rewatch still matches a row whose name was typed differently.
alter table movie_rating add column if not exists ticket_title text;
create unique index if not exists movie_rating_booking_number_key on movie_rating (booking_number);

-- "Forgotten  Island!" and "forgotten island" compare equal.
create or replace function norm_title(t text) returns text
language sql immutable
as $$ select lower(regexp_replace(t, '[[:space:][:punct:]]', '', 'g')) $$;

-- Decides what an email should do, without changing anything (used by dryRun and import).
-- Checked in this order:
--   already_imported  this booking number is already in the table
--   attach            an unimported movie on the same date with the same title
--   rewatch           the same title within a year (another date, or another booking for the
--                     same show): kept as one movie, no new row
--   attach            the only unimported movie on that date (catches titles typed differently)
--   ambiguous         several unimported movies that day, none with the same title: skipped
--   insert            otherwise: add a new movie
drop function if exists match_major_ticket(text, date, text);
create function match_major_ticket(
  p_name text,
  p_date date,
  p_booking text,
  out action text,
  out movie_id integer,
  out movie_name text,
  out has_poster boolean
)
language plpgsql stable
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select id, name, poster_url is not null into movie_id, movie_name, has_poster
    from movie_rating where booking_number = p_booking;
  if found then
    action := 'already_imported';
    return;
  end if;

  select id, name, poster_url is not null into movie_id, movie_name, has_poster from movie_rating
    where date = p_date and booking_number is null and norm_title(name) = norm_title(p_name)
    order by id limit 1;
  if found then
    action := 'attach';
    return;
  end if;

  select id, name, poster_url is not null into movie_id, movie_name, has_poster from movie_rating
    where norm_title(p_name) in (norm_title(name), norm_title(ticket_title))
      and abs(date - p_date) <= 365
    order by date, id limit 1;
  if found then
    action := 'rewatch';
    return;
  end if;

  select count(*) into v_count from movie_rating where date = p_date and booking_number is null;
  if v_count = 1 then
    select id, name, poster_url is not null into movie_id, movie_name, has_poster
      from movie_rating where date = p_date and booking_number is null;
    action := 'attach';
  elsif v_count > 1 then
    action := 'ambiguous';
  else
    action := 'insert';
  end if;
end;
$$;

-- Called only by the Apps Script with the service_role key. Returns the movie id, or null
-- when ambiguous. Never touches name, date, scores or comment of an existing movie.
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
      -- Backfills ticket_title for rows imported before that column existed.
      update movie_rating set ticket_title = coalesce(ticket_title, p_name) where id = m.movie_id;
      return m.movie_id;
    when 'attach', 'rewatch' then
      -- A rewatch keeps the first booking number; its own booking stays unrecorded and simply
      -- matches 'rewatch' again next time.
      update movie_rating
        set booking_number = coalesce(booking_number, p_booking),
            ticket_title = coalesce(ticket_title, p_name),
            poster_url = coalesce(poster_url, p_poster_url)
        where id = m.movie_id;
      return m.movie_id;
    when 'ambiguous' then
      return null;
    else
      insert into movie_rating (name, date, gun_score, team_score, comment, poster_url, booking_number, ticket_title)
        values (p_name, p_date, null, null, '', p_poster_url, p_booking, p_name)
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
