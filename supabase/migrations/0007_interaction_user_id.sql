-- Attribute interactions to the logged-in user for contribution tracking.
-- Shared data stays shared; user_id is optional so historical rows remain valid.

alter table larkspur_interactions
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists larkspur_interactions_user_id_idx
  on larkspur_interactions (user_id);
