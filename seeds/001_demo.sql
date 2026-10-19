-- Du lieu mau de he thong khong len trong tron.
-- ON CONFLICT DO NOTHING de chay lai duoc ma khong loi trung khoa.

INSERT INTO service_centers (center_code, center_name, thanh_pho) VALUES
  ('TT-CT01','Trung tam bao hanh Can Tho 1','Can Tho'),
  ('TT-CT02','Trung tam bao hanh Can Tho 2','Can Tho'),
  ('TT-AG01','Trung tam bao hanh An Giang','An Giang'),
  ('TT-DT01','Trung tam bao hanh Dong Thap','Dong Thap'),
  ('TT-VL01','Trung tam bao hanh Vinh Long','Vinh Long'),
  ('TT-KG01','Trung tam bao hanh Kien Giang','Kien Giang')
ON CONFLICT (center_code) DO NOTHING;

INSERT INTO issue_categories (category_name, default_priority) VALUES
  ('MAN_HINH','CAO'), ('PIN','TRUNG_BINH'), ('SAC','TRUNG_BINH'),
  ('PHAN_MEM','THAP'), ('NUOC_VAO','CAO'), ('KHAC','TRUNG_BINH')
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO products (product_code, product_name, thuong_hieu, warranty_months) VALUES
  ('SP-0001','Dien thoai MM A12 64GB','MekongMobile',12),
  ('SP-0002','Dien thoai MM A32 128GB','MekongMobile',12),
  ('SP-0003','Dien thoai MM S9 256GB','MekongMobile',18),
  ('SP-0004','Tai nghe MM Buds 2','MekongMobile',6),
  ('SP-0005','Sac nhanh MM 33W','MekongMobile',6),
  ('SP-0006','May tinh bang MM Tab 10','MekongMobile',12),
  ('SP-0007','Dong ho MM Watch 3','MekongMobile',12),
  ('SP-0008','Loa MM Sound Mini','MekongMobile',6),
  ('SP-0009','Pin du phong MM 20000mAh','MekongMobile',6),
  ('SP-0010','Dien thoai MM Note 11 128GB','MekongMobile',24)
ON CONFLICT (product_code) DO NOTHING;

INSERT INTO customers (customer_id, ho_ten, so_dien_thoai, email, tinh_thanh) VALUES
  (1,'Phan Huu Binh','0763247885','binh72@example.com','Can Tho'),
  (2,'Do Duc Tam','0760833592',NULL,'Can Tho'),
  (3,'Dang Van Ngan','0838851552',NULL,'An Giang'),
  (4,'Nguyen Thi Lan','0912345678',NULL,'Can Tho'),
  (5,'Tran Minh Quan','0905112233',NULL,'Dong Thap'),
  (6,'Le Thi Hoa','0977553311',NULL,'Vinh Long'),
  (7,'Vo Tuan Ngan','0360571457',NULL,'Kien Giang'),
  (8,'Bui Xuan Thu','0896790293',NULL,'Can Tho'),
  (9,'Huynh Gia Bao','0933221144',NULL,'An Giang'),
  (10,'Ngo Kim Chi','0944778899','chi@example.com','Can Tho'),
  (11,'Ly Thanh Phong','0388112299',NULL,'Dong Thap'),
  (12,'Trinh Bao Han','0355667788',NULL,'Vinh Long')
ON CONFLICT (customer_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('customers','customer_id'),
              (SELECT MAX(customer_id) FROM customers));

INSERT INTO technicians (technician_id, technician_code, ho_ten, center_id, level) VALUES
  (1,'KTV-001','Nguyen Van An',1,'CAO'),
  (2,'KTV-002','Tran Thi Binh',1,'TRUNG'),
  (3,'KTV-003','Le Van Cuong',2,'CAO'),
  (4,'KTV-004','Pham Thi Dung',2,'MOI'),
  (5,'KTV-005','Hoang Van Em',3,'TRUNG'),
  (6,'KTV-006','Vu Thi Giang',4,'TRUNG'),
  (7,'KTV-007','Dang Van Hai',5,'CAO'),
  (8,'KTV-008','Bui Thi Kim',6,'MOI')
ON CONFLICT (technician_code) DO NOTHING;
SELECT setval(pg_get_serial_sequence('technicians','technician_id'),
              (SELECT MAX(technician_id) FROM technicians));

INSERT INTO app_users (user_id, ho_ten, vai_tro, center_id) VALUES
  (1,'Nhan vien tiep nhan TT1','NHAN_VIEN_TIEP_NHAN',1),
  (2,'Nhan vien tiep nhan TT2','NHAN_VIEN_TIEP_NHAN',2),
  (3,'Quan tri he thong','QUAN_TRI',NULL)
ON CONFLICT (user_id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('app_users','user_id'),
              (SELECT MAX(user_id) FROM app_users));

INSERT INTO tickets (ticket_code, customer_id, serial_no, product_id, center_id,
                     category_id, priority, status, technician_id, is_warranty,
                     sold_at, received_at, due_date)
VALUES
  ('PB-TT-CT01-000001',1,'SN-10001',1,1,1,'CAO','DANG_SUA',1,TRUE,
   '2026-03-01', NOW() - INTERVAL '6 hours',  NOW() + INTERVAL '18 hours'),
  ('PB-TT-CT01-000002',4,'SN-10002',3,1,2,'TRUNG_BINH','MOI_TIEP_NHAN',NULL,TRUE,
   '2025-11-15', NOW() - INTERVAL '2 hours',  NOW() + INTERVAL '70 hours'),
  ('PB-TT-CT02-000001',5,'SN-10003',5,2,4,'THAP','HOAN_TAT',3,FALSE,
   '2024-01-10', NOW() - INTERVAL '10 days',  NOW() - INTERVAL '5 days')
ON CONFLICT (ticket_code) DO NOTHING;
