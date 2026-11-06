-- Anonymous visitors can read a mockup by slug but must not be able to write to
-- the table. This security-definer function is the one narrow exception: it
-- bumps the view counter and nothing else, so we can tell whether a prospect
-- actually opened the link we sent them.
create or replace function increment_mockup_views(mockup_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update mockups
  set view_count = view_count + 1
  where slug = mockup_slug;
$$;

revoke all on function increment_mockup_views(text) from public;
grant execute on function increment_mockup_views(text) to anon, authenticated;
