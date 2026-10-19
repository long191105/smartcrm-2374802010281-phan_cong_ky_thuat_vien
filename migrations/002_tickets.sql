CREATE INDEX IF NOT EXISTS idx_ticket_queue
  ON ticket(center_code, status, due_date);

CREATE INDEX IF NOT EXISTS idx_technician_active_center
  ON technician(center_code, technician_code)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_ticket_assignment_current
  ON ticket_assignment(technician_id, ticket_id)
  WHERE ended_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_assignment_current
  ON ticket_assignment(ticket_id)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_status_log_ticket
  ON ticket_status_log(ticket_id, changed_at DESC);
