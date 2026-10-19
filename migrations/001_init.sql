-- L4 Phan cong ky thuat vien: bang danh muc + ky thuat vien + tay nghe.
-- Moi lenh deu IF NOT EXISTS de chay lai khong loi.
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- can cho EXCLUDE o 002

CREATE TABLE IF NOT EXISTS service_center (
  center_id    BIGSERIAL PRIMARY KEY,
  center_code  VARCHAR(20)  NOT NULL UNIQUE,
  center_name  VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS issue_category (
  category_id    SERIAL PRIMARY KEY,
  category_name  VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS technician (
  technician_id    BIGSERIAL PRIMARY KEY,
  technician_code  VARCHAR(20)  NOT NULL UNIQUE,      -- KTV-###
  full_name        VARCHAR(120) NOT NULL,
  center_id        BIGINT       NOT NULL REFERENCES service_center(center_id),
  level            VARCHAR(10)  NOT NULL,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS technician_skill (
  technician_id  BIGINT   NOT NULL REFERENCES technician(technician_id),
  category_id    INT      NOT NULL REFERENCES issue_category(category_id),
  proficiency    SMALLINT NOT NULL CHECK (proficiency BETWEEN 1 AND 5),
  PRIMARY KEY (technician_id, category_id)
);
