INSERT INTO technician (
  technician_id, technician_code, full_name, center_code, level, is_active
) VALUES
  (1, 'KT001', 'Phạm Minh Quyên', 'TT01', 'TRUNG_CAP', FALSE),
  (2, 'KT002', 'Trần Hoài Giang', 'TT04', 'TRUNG_CAP', TRUE)
ON CONFLICT (technician_id) DO NOTHING;

INSERT INTO technician_skill (technician_id, category_name, proficiency) VALUES
  (1, 'NUOC_VAO', 3),
  (1, 'PHAN_MEM', 5),
  (2, 'MAN_HINH', 3),
  (2, 'PIN', 5),
  (2, 'SAC', 3),
  (2, 'PHAN_MEM', 3),
  (2, 'KHAC', 2)
ON CONFLICT (technician_id, category_name) DO NOTHING;

INSERT INTO ticket (
  ticket_id, ticket_code, customer_id, product_id, serial_no, center_code,
  category_name, priority, status, issue_desc, received_at, due_date, is_warranty
) VALUES (
  900001, 'BH-900001/2025', 14159, 21, 'SN541017338391', 'TT04',
  'MAN_HINH', 'TRUNG_BINH', 'MOI',
  'Fixture L4 chờ phân công, dùng để kiểm tra luồng UC1.',
  NOW() - INTERVAL '1 hour', NOW() + INTERVAL '71 hours', TRUE
)
ON CONFLICT (ticket_id) DO NOTHING;

INSERT INTO ticket (
  ticket_id, ticket_code, customer_id, product_id, serial_no, center_code,
  category_name, priority, status, issue_desc, received_at, due_date, is_warranty
)
SELECT
  900010 + n,
  'BH-' || LPAD((900010 + n)::TEXT, 6, '0') || '/2025',
  20000 + n,
  21,
  'SN-DEMO-' || LPAD(n::TEXT, 3, '0'),
  'TT04',
  (ARRAY['MAN_HINH', 'PIN', 'SAC', 'PHAN_MEM', 'KHAC'])[1 + (n % 5)],
  'TRUNG_BINH',
  (ARRAY['DA_PHAN_CONG', 'DANG_XU_LY', 'CHO_LINH_KIEN'])[1 + (n % 3)],
  'Fixture tải công việc của kỹ thuật viên KT002.',
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '2 days',
  TRUE
FROM GENERATE_SERIES(0, 16) AS series(n)
WHERE NOT EXISTS (
  SELECT 1 FROM ticket WHERE ticket_id < 900000
)
ON CONFLICT (ticket_id) DO NOTHING;

INSERT INTO ticket_assignment (ticket_id, technician_id, assigned_by, assigned_at)
SELECT t.ticket_id, 2, '8', NOW() - INTERVAL '1 day'
FROM ticket AS t
WHERE t.ticket_id BETWEEN 900010 AND 900026
  AND NOT EXISTS (
    SELECT 1
    FROM ticket_assignment AS current_assignment
    WHERE current_assignment.ticket_id = t.ticket_id
      AND current_assignment.ended_at IS NULL
  );

INSERT INTO ticket_status_log (ticket_id, from_status, to_status, changed_by, note)
SELECT t.ticket_id, NULL, t.status, '8', 'Khởi tạo dữ liệu fixture workshop.'
FROM ticket AS t
WHERE t.ticket_id BETWEEN 900001 AND 900026
  AND NOT EXISTS (
    SELECT 1
    FROM ticket_status_log AS history
    WHERE history.ticket_id = t.ticket_id
  );

SELECT setval(
  'ticket_ticket_id_seq',
  GREATEST(
    COALESCE((SELECT MAX(ticket_id) FROM ticket), 0) + 1,
    (SELECT last_value + CASE WHEN is_called THEN 1 ELSE 0 END FROM ticket_ticket_id_seq)
  ),
  FALSE
);
