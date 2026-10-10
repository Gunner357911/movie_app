-- Run once in the Supabase SQL Editor (after security.sql) to enable the Major Cineplex
-- email import (see apps-script/). Safe to re-run.

-- Both nullable: older rows and manually added movies have neither.
alter table movie_rating add column if not exists poster_url text;
alter table movie_rating add column if not exists booking_number text;
create unique index if not exists movie_rating_booking_number_key on movie_rating (booking_number);

-- Called only by the Apps Script with the service_role key. One booking = one movie row.
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
  v_id integer;
begin
  select id into v_id from movie_rating where booking_number = p_booking;
  if found then
    return v_id; -- already imported
  end if;

  -- Same movie on the same day already added by hand: attach the poster to it instead.
  select id into v_id from movie_rating
    where lower(name) = lower(p_name) and date = p_date and booking_number is null
    order by id limit 1;
  if found then
    update movie_rating
      set booking_number = p_booking,
          poster_url = coalesce(poster_url, p_poster_url)
      where id = v_id;
    return v_id;
  end if;

  insert into movie_rating (name, date, gun_score, team_score, comment, poster_url, booking_number)
    values (p_name, p_date, null, null, '', p_poster_url, p_booking)
    returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function import_major_ticket(text, date, text, text) from public, anon, authenticated;
grant execute on function import_major_ticket(text, date, text, text) to service_role;

-- Posters are public promo images, so the bucket is public-read. There are no insert/update
-- policies, so only the service_role key (the Apps Script) can upload.
insert into storage.buckets (id, name, public)
  values ('posters', 'posters', true)
  on conflict (id) do nothing;
