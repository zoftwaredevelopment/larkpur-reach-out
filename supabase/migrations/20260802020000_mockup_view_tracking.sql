-- When a view happened matters more than how many: it tells you whether a
-- prospect opened the link you sent, and when to follow up.
alter table mockups add column last_viewed_at timestamptz;

create or replace function increment_mockup_views(mockup_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update mockups
  set view_count = view_count + 1,
      last_viewed_at = now()
  where slug = mockup_slug;
$$;

revoke all on function increment_mockup_views(text) from public;
grant execute on function increment_mockup_views(text) to anon, authenticated;
