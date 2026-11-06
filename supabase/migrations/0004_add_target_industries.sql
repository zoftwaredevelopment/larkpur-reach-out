-- larkspur-reach-out: add target business-function industries and exclusions
-- Target industries for triage: sales, marketing, customer_service, administration, operations, management
-- Excluded industries: oil_gas, blue_collar

alter type larkspur_industry add value if not exists 'sales';
alter type larkspur_industry add value if not exists 'marketing';
alter type larkspur_industry add value if not exists 'customer_service';
alter type larkspur_industry add value if not exists 'administration';
alter type larkspur_industry add value if not exists 'operations';
alter type larkspur_industry add value if not exists 'management';
alter type larkspur_industry add value if not exists 'oil_gas';
alter type larkspur_industry add value if not exists 'blue_collar';
