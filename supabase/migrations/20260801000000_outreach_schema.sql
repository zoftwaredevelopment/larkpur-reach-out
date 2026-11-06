-- Outreach CRM schema: companies, contacts, website_audits, interactions, mockups

create type lead_status as enum (
  'new',
  'researched',
  'contacted',
  'replied',
  'mockup_sent',
  'negotiating',
  'closed_won',
  'closed_lost',
  'do_not_contact'
);

create type interaction_type as enum (
  'email',
  'dm',
  'call',
  'whatsapp',
  'note',
  'status_change'
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website_url text,
  has_existing_website boolean not null default false,
  industry text,
  city text,
  state text,
  country text not null default 'Nigeria',
  source text,
  status lead_status not null default 'new',
  warmth text,
  notes text,
  draft_outreach_script text,
  draft_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text,
  role text,
  email text,
  phone text,
  whatsapp text,
  linkedin_url text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table website_audits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  audited_at timestamptz not null default now(),
  load_time_seconds numeric,
  mobile_friendly boolean,
  has_cta boolean,
  has_ssl boolean,
  design_dated boolean,
  lighthouse_performance_score smallint,
  lighthouse_seo_score smallint,
  screenshot_url text,
  summary text,
  raw_notes text,
  created_at timestamptz not null default now()
);

create table interactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  type interaction_type not null,
  channel text,
  direction text,
  subject text,
  body text,
  status_before lead_status,
  status_after lead_status,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table mockups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  slug text unique not null,
  company_name_display text,
  logo_url text,
  primary_color text,
  secondary_color text,
  hero_headline text,
  hero_subheadline text,
  sections_config jsonb,
  status text not null default 'draft',
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interactions_company_id_idx on interactions(company_id);
create index contacts_company_id_idx on contacts(company_id);
create index website_audits_company_id_idx on website_audits(company_id);
create index mockups_company_id_idx on mockups(company_id);
create index mockups_slug_idx on mockups(slug);

-- RLS: single-operator internal tool. Sign-up is disabled at the Auth level
-- (one manually-created user), so "authenticated" always means the operator.
alter table companies enable row level security;
alter table contacts enable row level security;
alter table website_audits enable row level security;
alter table interactions enable row level security;
alter table mockups enable row level security;

create policy "authenticated full access" on companies
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on contacts
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on website_audits
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on interactions
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on mockups
  for all to authenticated using (true) with check (true);

-- Deliberate carve-out: anyone with the unlisted slug can view a mockup
-- (no auth required) so it works as a shareable prospect link. Writes stay
-- authenticated-only via the policy above.
create policy "public read by slug" on mockups
  for select to anon using (true);

-- keep updated_at current
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger companies_set_updated_at
  before update on companies
  for each row execute function set_updated_at();

create trigger mockups_set_updated_at
  before update on mockups
  for each row execute function set_updated_at();
