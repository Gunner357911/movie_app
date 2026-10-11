-- One-off cleanup, step 2 of 2: removes exactly the rows merge_rewatches_preview.sql lists
-- (same conditions), copying their poster to the kept row if it has none. Run the preview first.

begin;

create temp table rewatch_dups on commit drop as
select dup.id as dup_id, keep.id as keep_id, dup.poster_url
from movie_rating dup
join lateral (
  select k.id from movie_rating k
  where (k.date, k.id) < (dup.date, dup.id)
    and abs(k.date - dup.date) <= 365
    and (norm_title(k.name) in (norm_title(dup.name), norm_title(dup.ticket_title))
         or norm_title(k.ticket_title) in (norm_title(dup.name), norm_title(dup.ticket_title)))
  order by k.date, k.id
  limit 1
) keep on true
where dup.booking_number is not null
  and dup.gun_score is null and dup.team_score is null
  and coalesce(dup.comment, '') = '';

update movie_rating k
  set poster_url = d.poster_url
  from rewatch_dups d
  where k.id = d.keep_id and k.poster_url is null and d.poster_url is not null;

delete from movie_rating where id in (select dup_id from rewatch_dups);

commit;
