-- One roster assignment per person, per team, per event (re-assigning a seat
-- label just updates the existing row instead of creating a duplicate).
alter table roster_slots
  add constraint roster_slots_unique unique (event_id, team_id, people_id);
