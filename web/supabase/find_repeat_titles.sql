-- Read-only: every title that appears more than once within a year, scored or not.
-- merge_rewatches_* only handles unscored imported rows; decide on these by hand,
-- e.g. keep the first row and `delete from movie_rating where id = ...` the others.
select k.title,
       count(*) as rows,
       string_agg(
         format('#%s %s (Gun %s / Team %s)%s', m.id, m.date,
                coalesce(m.gun_score::text, '–'), coalesce(m.team_score::text, '–'),
                case when coalesce(m.comment, '') <> '' then ' 💬' else '' end),
         ',  ' order by m.date, m.id) as viewings
from movie_rating m
cross join lateral (select norm_title(coalesce(m.ticket_title, m.name)) as key,
                           coalesce(m.ticket_title, m.name) as title) k
where exists (
  select 1 from movie_rating o
  where o.id <> m.id
    and norm_title(coalesce(o.ticket_title, o.name)) = k.key
    and abs(o.date - m.date) <= 365
)
group by k.key, k.title
order by k.title;
