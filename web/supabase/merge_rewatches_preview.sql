-- One-off cleanup, step 1 of 2 (read-only): rewatches the email import added as separate rows before the 'rewatch'
-- rule existed. Run in the Supabase SQL Editor AFTER the updated ticket_import.sql and a
-- re-run of importBackfill (which fills ticket_title on imported rows).
--
-- A row is removed only if ALL of these hold:
--   - it was added by the import (has a booking number) and nobody scored or commented it
--   - an earlier row (by date) has the same title, by name or by Major's spelling,
--     within a year
-- Its poster is copied to the kept row if that one has none.

-- Lists each row that merge_rewatches_apply.sql would remove and the row it keeps.

select dup.id   as remove_id, dup.name  as remove_name, dup.date  as remove_date,
       keep.id  as keep_id,   keep.name as keep_name,   keep.date as keep_date,
       keep.gun_score, keep.team_score
from movie_rating dup
join lateral (
  select k.* from movie_rating k
  where (k.date, k.id) < (dup.date, dup.id)
    and abs(k.date - dup.date) <= 365
    and (norm_title(k.name) in (norm_title(dup.name), norm_title(dup.ticket_title))
         or norm_title(k.ticket_title) in (norm_title(dup.name), norm_title(dup.ticket_title)))
  order by k.date, k.id
  limit 1
) keep on true
where dup.booking_number is not null
  and dup.gun_score is null and dup.team_score is null
  and coalesce(dup.comment, '') = ''
order by keep.name, dup.date;
