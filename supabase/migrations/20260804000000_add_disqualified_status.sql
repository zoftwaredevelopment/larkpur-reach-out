-- `do_not_contact` means the business asked us to stop — an boundary we honour.
-- It was being overloaded to also mean "evaluated, not a fit", which would make
-- a genuine opt-out indistinguishable from a prioritisation call.
alter type lead_status add value if not exists 'disqualified';
