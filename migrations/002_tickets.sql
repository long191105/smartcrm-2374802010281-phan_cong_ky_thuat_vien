-- ticket, ticket_assignment, appointment, ticket_status_log.
-- customer_id, device_id, assigned_by, created_by, changed_by la BIGINT
-- KHONG khoa ngoai (TD-03: cac bang do thuoc luong L2).

CREATE TABLE IF NOT EXISTS ticket (
  ticket_id      BIGSERIAL PRIMARY KEY,
  ticket_code    VARCHAR(20) NOT NULL UNIQUE,         -- BH-####
  customer_id    BIGINT      NOT NULL,
  device_id      BIGINT      NOT NULL,
  center_id      BIGINT      NOT NULL REFERENCES service_center(center_id),
  issue_desc     TEXT,
  category_id    INT         REFERENCES issue_category(category_id),
  priority       VARCHAR(10) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'MOI',
  technician_id  BIGINT      REFERENCES technician(technician_id),
  received_at    TIMESTAMP   NOT NULL DEFAULT NOW(),
  due_date       TIMESTAMP   NOT NULL,
  closed_at      TIMESTAMP,
  is_warranty    BOOLEAN     NOT NULL DEFAULT TRUE,
  CONSTRAINT chk_ticket_priority CHECK (priority IN ('CAO','TRUNG_BINH','THAP')),
  -- Chinh danh sach nay cho KHOP voi TD-02 / SRS truoc khi chay.
  CONSTRAINT chk_ticket_status CHECK (status IN
    ('MOI','DA_PHAN_CONG','DANG_XU_LY','CHO_LINH_KIEN','HOAN_TAT','HUY')),
  CONSTRAINT chk_ticket_closed CHECK (closed_at IS NULL OR closed_at >= received_at)
);
CREATE INDEX IF NOT EXISTS idx_ticket_status ON ticket(status);
-- Dem "phieu dang mo" cua ky thuat vien (QT khoi luong, NFR1)
CREATE INDEX IF NOT EXISTS idx_ticket_tech_open ON ticket(technician_id)
  WHERE status IN ('DA_PHAN_CONG','DANG_XU_LY','CHO_LINH_KIEN');

CREATE TABLE IF NOT EXISTS ticket_assignment (
  assignment_id  BIGSERIAL PRIMARY KEY,
  ticket_id      BIGINT       NOT NULL REFERENCES ticket(ticket_id),
  technician_id  BIGINT       NOT NULL REFERENCES technician(technician_id),
  assigned_by    BIGINT       NOT NULL,
  assigned_at    TIMESTAMP    NOT NULL DEFAULT NOW(),
  ended_at       TIMESTAMP,
  reason         VARCHAR(255)
);
-- Moi phieu chi co MOT nguoi phu trach hien tai (NFR3)
CREATE UNIQUE INDEX IF NOT EXISTS uq_assignment_current
  ON ticket_assignment(ticket_id) WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS appointment (
  appointment_id    BIGSERIAL PRIMARY KEY,
  ticket_id         BIGINT      NOT NULL REFERENCES ticket(ticket_id),
  technician_id     BIGINT      NOT NULL REFERENCES technician(technician_id),
  appointment_type  VARCHAR(10) NOT NULL CHECK (appointment_type IN ('PICKUP','DELIVERY')),
  start_at          TIMESTAMP   NOT NULL,
  end_at            TIMESTAMP   NOT NULL,
  status            VARCHAR(15) NOT NULL DEFAULT 'CHO_XAC_NHAN'
                    CHECK (status IN ('CHO_XAC_NHAN','DA_XAC_NHAN')),
  confirmed_at      TIMESTAMP,
  created_by        BIGINT      NOT NULL,
  note              VARCHAR(255),
  CONSTRAINT chk_appt_time CHECK (end_at > start_at),
  -- Thoi luong 15..240 phut
  CONSTRAINT chk_appt_len CHECK (end_at - start_at BETWEEN INTERVAL '15 minutes'
                                                       AND INTERVAL '240 minutes'),
  -- Chong trung lich o tang CSDL (NFR2, NFR3)
  CONSTRAINT ex_appointment_no_overlap
    EXCLUDE USING gist (technician_id WITH =, tsrange(start_at, end_at) WITH &&)
);

CREATE TABLE IF NOT EXISTS ticket_status_log (
  log_id       BIGSERIAL PRIMARY KEY,
  ticket_id    BIGINT      NOT NULL REFERENCES ticket(ticket_id),
  from_status  VARCHAR(20),
  to_status    VARCHAR(20) NOT NULL,
  changed_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
  changed_by   BIGINT      NOT NULL,
  note         VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_status_log_ticket
  ON ticket_status_log(ticket_id, changed_at DESC);
