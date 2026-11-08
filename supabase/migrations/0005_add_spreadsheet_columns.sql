-- larkspur-reach-out: add spreadsheet columns
-- Companies: years_established, monthly_salary, deal_value, potential_talent, touch_point
-- Leads: objections, next_action

alter table larkspur_companies add column if not exists years_established integer;
alter table larkspur_companies add column if not exists monthly_salary numeric;
alter table larkspur_companies add column if not exists deal_value numeric GENERATED ALWAYS AS (0.15 * monthly_salary * 12) STORED;
alter table larkspur_companies add column if not exists potential_talent text;
alter table larkspur_companies add column if not exists touch_point text;

alter table larkspur_leads add column if not exists objections text;
alter table larkspur_leads add column if not exists next_action text;