CREATE SEQUENCE IF NOT EXISTS ticket_ticket_id_seq;

SELECT setval(
  'ticket_ticket_id_seq',
  COALESCE((SELECT MAX(ticket_id) FROM ticket), 0) + 1,
  FALSE
);

ALTER TABLE ticket
  ALTER COLUMN ticket_id SET DEFAULT nextval('ticket_ticket_id_seq');
