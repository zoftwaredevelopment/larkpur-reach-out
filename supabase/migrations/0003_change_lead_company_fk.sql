-- larkspur-reach-out: allow removing triage companies without cascade-deleting their leads
-- Change leads.company_id FK from on delete cascade to on delete set null
-- so approved/disapproved companies can be purged from triage while keeping the lead record

alter table larkspur_leads
  drop constraint if exists larkspur_leads_company_id_fkey;

alter table larkspur_leads
  add constraint larkspur_leads_company_id_fkey
    foreign key (company_id) references larkspur_companies (id)
    on delete set null;
