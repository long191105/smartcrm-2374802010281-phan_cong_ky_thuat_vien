# Nhật ký thay đổi thiết kế

Mọi sai lệch so với thiết kế Bài tập 1 đều ghi ở đây, mỗi thay đổi bốn dòng:
phản hồi · quyết định · lý do · ảnh hưởng. File này được nối tiếp ở BT3.

## Sau phản hồi Bài tập 1 (buổi 6, ngày 9/10/2026)

Điểm BT1: 6/10 (Đầy đủ 7,5 · Kỹ thuật 4,75 · Nhất quán 5,5 · Trình bày 5,0).

### TD-01 Chốt một bộ thuật ngữ duy nhất: `issue_category`, `ticket_status_log`, `priority` dạng chữ

- **Phản hồi của GV:** Bảng thuật ngữ trong SRS ghi `issue_group`, `ticket_log`, `priority` lưu số 1–3;
  ERD và DDL lại dùng `issue_category`, `ticket_status_log`, `priority` CAO / TRUNG_BINH / THAP.
- **Quyết định:** SỬA (theo ERD, DDL và case study).
- **Lý do:** Case study (bảng thuật ngữ, từ điển dữ liệu) dùng `issue_category` và `ticket_status_log`;
  QT-04 gắn hạn cam kết với CAO / TRUNG_BINH / THAP. Sửa một chỗ trong SRS rẻ hơn đổi tên ở cả ERD,
  DDL, mã nguồn và test. Sắp xếp theo mức ưu tiên sẽ dùng biểu thức `CASE` ở tầng truy vấn.
- **Ảnh hưởng:** `docs/srs.md` mục 1.1; `docs/erd.drawio`; `migrations/`; toàn bộ tên biến, mã lỗi,
  test trong `src/` và `tests/` dùng đúng các tên này.

### TD-02 Đủ bảy trạng thái phiếu và định nghĩa "phiếu đang mở"

- **Phản hồi của GV:** Bảng thuật ngữ chỉ nêu 4 trạng thái (MOI, DA_PHAN_CONG, DANG_XU_LY, HOAN_TAT)
  trong khi DDL có 7; mục 5.4 tính "phiếu đang mở" chỉ gồm "Đã phân công" và "Đang xử lý".
- **Quyết định:** SỬA.
- **Lý do:** Vòng đời ở case study (Hình 6.2) có 7 trạng thái. Kỹ thuật viên vẫn đang giữ phiếu ở
  CHO_LINH_KIEN nên phải tính vào khối lượng công việc, nếu không ngưỡng 15 phiếu bị đếm thiếu.
- **Ảnh hưởng:** `docs/srs.md` mục 1.1 và 5.4: phiếu đang mở = DA_PHAN_CONG, DANG_XU_LY, CHO_LINH_KIEN;
  hàm đếm khối lượng ở `TicketRepository` và quy tắc ngưỡng ở tầng nghiệp vụ.

### TD-03 Rút số bảng từ 11 xuống 8

- **Phản hồi của GV:** ERD và DDL có 11 bảng, vượt mức 4–6; nên rút các bảng tham chiếu.
- **Quyết định:** SỬA (một phần).
- **Lý do:** Bỏ `customer`, `device`, `employee` vì thuộc luồng L2 / hệ thống người dùng, không phải L4;
  các cột `customer_id`, `device_id`, `assigned_by`, `created_by`, `changed_by` giữ kiểu BIGINT, không
  khoá ngoại. Giữ `service_center` và `issue_category` vì QT-08 (cùng trung tâm, tay nghề theo nhóm
  sự cố) cần chúng và bộ dữ liệu mẫu có sẵn `service_centers.csv`, `technician_skills.csv`.
  Còn 8 bảng: 6 bảng lõi (`ticket`, `technician`, `technician_skill`, `appointment`,
  `ticket_assignment`, `ticket_status_log`) + 2 bảng danh mục.
- **Ảnh hưởng:** `docs/erd.drawio` (bỏ 3 bảng tham chiếu), `docs/srs.md` mục 4.2, `migrations/001_init.sql`,
  `seeds/`.

### TD-04 Viết lại hai câu lập luận thiếu đánh đổi; sửa mã NFR trong chú thích chỉ mục

- **Phản hồi của GV:** Câu 2 (NFR2) và câu 3 (NFR3) không nêu đánh đổi; chú thích chỉ mục ghi NFR5
  nhưng SRS chỉ có NFR1–NFR4.
- **Quyết định:** SỬA.
- **Lý do:** Đề yêu cầu mỗi câu đủ ba thành phần "Vì NFRx… tôi chọn… đánh đổi là…". Chú thích chỉ mục
  phải trỏ đúng NFR đang tồn tại thì mới truy vết được.
- **Ảnh hưởng:** `docs/srs.md` mục 3.2 (hai câu viết lại ở phụ lục dưới đây); chú thích chỉ mục trong
  `migrations/002_indexes.sql` ghi NFR1 / NFR2.

### TD-05 Thu hẹp phạm vi User Story còn 7 trong phạm vi

- **Phản hồi của GV:** Có 9 User Story (8 không phải WON'T), vượt mức 5–7 của khuôn SRS.
- **Quyết định:** SỬA.
- **Lý do:** Chỉ còn 6 buổi cho Giai đoạn 2. US7 (khách xác nhận lịch hẹn, COULD) cần kênh liên lạc với
  khách, ngoài phạm vi prototype. Giữ US1–US6 và US8 (phân công lại, gắn với QT-07) → 7 story trong
  phạm vi; US7 chuyển xuống backlog, US9 vẫn WON'T.
- **Ảnh hưởng:** `docs/srs.md` mục 1.3 và bảng truy vết (dòng FR8 ghi "backlog"); `docs/wireframe.drawio`
  (bỏ khối "Xác nhận của khách" ở M2); cột `appointment.confirmed_at` giữ nguyên nhưng chưa dùng.

### TD-06 Thống nhất mã FR / US / UC và chú thích dưới hình wireframe

- **Phản hồi của GV:** Chú thích FR dưới Hình 5.2 và 5.3 khác bảng truy vết 5.5; mã viết lẫn FR01 / FR1.
- **Quyết định:** SỬA.
- **Lý do:** Phép kiểm 2 và 4 của buổi 6: mọi mã phải khớp giữa SRS, sơ đồ và wireframe. Dùng dạng không
  đệm số 0 (FR1, US1, UC1) như bảng truy vết.
- **Ảnh hưởng:** `docs/srs.md` mục 1.3, 5.5; `docs/usecase.drawio`; chú thích hình trong
  `docs/wireframe.drawio`; mã quy tắc trong comment của `src/services/`.

### TD-07 Sửa tên bài toán và phạm vi mục 1.1

- **Phản hồi của GV:** Tên bài toán ghi "tiếp nhận và phân loại yêu cầu bảo hành" (đó là luồng L2);
  phạm vi liệt kê "thông báo lịch hẹn, cập nhật trạng thái, lọc phiếu" nhưng không có User Story / FR tương ứng.
- **Quyết định:** SỬA.
- **Lý do:** Bài làm ở luồng L4. Phạm vi viết trong SRS phải khớp đúng danh sách FR đã có.
- **Ảnh hưởng:** `README.md` (tên đề tài), `docs/srs.md` mục 1.1; các mục thừa chuyển xuống backlog.

<!-- Chỉ giữ mục này nếu em chuyển sang SQLite vì lỗi môi trường (sau phút 60 của buổi 8):

### TD-08 Dùng SQLite thay PostgreSQL

- **Phản hồi của GV:** (không có — quyết định của em vì lỗi môi trường)
- **Quyết định:** SỬA
- **Lý do:** Không cài được PostgreSQL sau 60 phút; SQLite không có ràng buộc EXCLUDE.
- **Ảnh hưởng:** `ex_appointment_no_overlap` không dựng được; kiểm tra trùng lịch chỉ còn ở
  `AppointmentService`; `migrations/`; README mục 2 và 6.
-->

## Việc hoàn thiện hồ sơ (không phải thay đổi thiết kế)

- Gỡ `node_modules` khỏi theo dõi Git, thêm vào `.gitignore` (phản hồi: repo commit cả `node_modules`).
- Thêm `docs/ai-disclosure.md`; ghi link GitHub đầy đủ trong README và trang bìa các bản PDF sau.

## Phụ lục: hai câu lập luận đã viết lại (thay cho câu 2 và 3 ở SRS mục 3.2)

2. Vì NFR2 yêu cầu kiểm tra trùng lịch ≤ 1 giây với 500 lịch hẹn và không có hai yêu cầu đồng thời cùng
   vượt qua bước kiểm tra, tôi chọn đặt ràng buộc `EXCLUDE` (`ex_appointment_no_overlap`) trên
   `(technician_id, tsrange(start_at, end_at))` với chỉ mục GiST, ngoài việc kiểm tra ở `AppointmentService`;
   đánh đổi là phụ thuộc tính năng riêng của PostgreSQL (extension `btree_gist`), nên chuyển sang CSDL khác
   phải viết lại phần chống trùng ở tầng nghiệp vụ.
3. Vì NFR3 yêu cầu 20 quản lý thao tác đồng thời mà không phiếu nào có hai kỹ thuật viên phụ trách, tôi chọn
   cập nhật phiếu có điều kiện `status = 'MOI'` trong một transaction, kèm unique index
   `uq_assignment_current` (QT-07); đánh đổi là yêu cầu đến sau bị từ chối (409) nên giao diện phải tải lại
   dữ liệu, và transaction giữ khoá dòng thêm vài mili giây.
