# Nhật ký thay đổi thiết kế

Mọi sai lệch so với thiết kế Bài tập 1 đều ghi ở đây, mỗi thay đổi bốn dòng:
phản hồi · quyết định · lý do · ảnh hưởng. File này được nối tiếp ở BT3.

Quy ước: dòng "Phản hồi của GV" chỉ chép điều GV đã nhận xét. Điều tự phát hiện
khi rà soát được ghi rõ là "Tự phát hiện".

## Sau phản hồi Bài tập 1 (buổi 8, ngày 19/10/2026)

Điểm BT1: 6/10 (Đầy đủ 7,5 · Kỹ thuật 4,75 · Nhất quán 5,5 · Trình bày 5,0).

### TD-01 Chốt một bộ thuật ngữ duy nhất: `issue_category`, `ticket_status_log`, `priority` dạng chữ

- **Phản hồi của GV:** Bảng thuật ngữ trong SRS ghi `issue_group`, `ticket_log`, `priority` lưu số 1–3;
  ERD và DDL lại dùng `issue_category`, `ticket_status_log`, `priority` CAO / TRUNG_BINH / THAP.
- **Quyết định:** SỬA (theo ERD, DDL và case study).
- **Lý do:** Case study (bảng thuật ngữ, từ điển dữ liệu) dùng `issue_category` và `ticket_status_log`;
  QT-04 gắn hạn cam kết với CAO / TRUNG_BINH / THAP. Sửa một chỗ trong SRS rẻ hơn đổi tên ở cả ERD,
  DDL, mã nguồn và test. Sắp xếp theo mức ưu tiên dùng biểu thức `CASE` ở tầng truy vấn.
- **Ảnh hưởng:** `docs/srs.md` mục 1.1; `docs/erd.drawio`; `migrations/`; mọi tên biến, mã lỗi và
  test trong `src/` và `tests/` dùng đúng các tên này.

### TD-02 Đủ bảy trạng thái phiếu và định nghĩa "phiếu đang mở"

- **Tự phát hiện:** Bảng thuật ngữ chỉ nêu 4 trạng thái (MOI, DA_PHAN_CONG, DANG_XU_LY, HOAN_TAT)
  trong khi DDL có 7; mục 5.4 tính "phiếu đang mở" chỉ gồm "Đã phân công" và "Đang xử lý".
- **Quyết định:** SỬA.
- **Lý do:** Kỹ thuật viên vẫn đang giữ phiếu ở CHO_LINH_KIEN nên phải tính vào khối lượng công việc,
  nếu không ngưỡng 15 phiếu (FR4) bị đếm thiếu.
- **Ảnh hưởng:** `docs/srs.md` mục 1.1 và 5.4: phiếu đang mở = DA_PHAN_CONG, DANG_XU_LY, CHO_LINH_KIEN;
  hàm đếm khối lượng ở `TicketRepository` và quy tắc ngưỡng ở `AssignService`.

### TD-03 Rút ERD từ 11 xuống 6 bảng

- **Phản hồi của GV:** ERD và DDL có 11 bảng (6 lõi + 5 tham chiếu), vượt mức 4–6; nên rút các bảng
  tham chiếu về mức tối thiểu hoặc gộp lại.
- **Quyết định:** SỬA (đủ 6 bảng).
- **Lý do:** Năm bảng `customer`, `device`, `employee`, `service_center`, `issue_category` thuộc L2 hoặc
  hệ thống người dùng, ngoài phạm vi L4. L4 chỉ cần giá trị để hiển thị và lọc, nên chuyển thành cột:
  `ticket` thêm `customer_name`, `customer_phone`, `device_serial`, `center_code`; `technician` thêm
  `full_name`, `center_code`; `issue_category` thành cột VARCHAR có CHECK ở `ticket` và
  `technician_skill`; `assigned_by`, `created_by`, `changed_by` thành VARCHAR(100) lưu tên người thực
  hiện. Như vậy QT-08 (cùng trung tâm, tay nghề theo nhóm sự cố) vẫn lọc được bằng cột, và màn hình M2
  vẫn hiển thị đủ tên khách, số điện thoại, thiết bị. Còn 6 bảng: `ticket`, `technician`,
  `technician_skill`, `appointment`, `ticket_assignment`, `ticket_status_log`.
- **Ảnh hưởng:** `docs/erd.drawio` (6 bảng); `docs/srs.md` mục 4.2 và 5.4; `docs/architecture.drawio`
  (khung "Bảng tham chiếu" bỏ đi); `migrations/001_init.sql`; `seeds/`.

### TD-04 Viết lại hai câu lập luận thiếu đánh đổi; sửa mã NFR

- **Phản hồi của GV:** Câu 2 (NFR2) và câu 3 (NFR3) không nêu đánh đổi nên mới có 2 câu đạt khuôn
  (đề yêu cầu ít nhất 3); chú thích chỉ mục ghi NFR5 nhưng SRS chỉ có NFR1–NFR4.
- **Quyết định:** SỬA.
- **Lý do:** Mỗi câu phải đủ ba thành phần "Vì NFRx… tôi chọn… đánh đổi là…". Chú thích phải trỏ đúng
  NFR đang tồn tại thì mới truy vết được.
- **Ảnh hưởng:** `docs/srs.md` mục 3.2 (thay câu 2 và 3 bằng bản ở phụ lục dưới đây);
  `migrations/` (chú thích chỉ mục ghi NFR1 hoặc NFR2); `docs/architecture.drawio` (bỏ "NFR4" gắn với
  kiểm tra `center_id` và "NFR5" gắn với bộ lập lịch, đổi thành NFR4 đúng nghĩa của SRS).

### TD-05 Thu hẹp phạm vi User Story: US7 chuyển xuống backlog

- **Phản hồi của GV:** Có 9 User Story, trong đó 8 không phải WON'T.
- **Quyết định:** SỬA.
- **Lý do:** Chỉ còn 5 buổi cho Giai đoạn 2. US7 (khách xác nhận lịch hẹn, COULD) cần kênh liên lạc với
  khách, ngoài phạm vi prototype. Giữ US1–US6 và US8 (phân công lại, gắn với QT-07); US7 xuống backlog,
  US9 vẫn WON'T.
- **Ảnh hưởng:** `docs/srs.md` mục 1.3 và bảng truy vết (FR8 ghi "backlog"); `docs/usecase.drawio` (bỏ
  UC7); `docs/architecture.drawio` (bỏ "Trang xác nhận lịch hẹn"); `docs/wireframe.drawio` (bỏ khối
  "Xác nhận của khách" ở M2). Cột `appointment.confirmed_at` và trạng thái DA_XAC_NHAN giữ nguyên trong
  DDL nhưng chưa dùng.

### TD-06 Thống nhất mã FR / US / UC và chú thích dưới hình wireframe

- **Phản hồi của GV:** Chú thích FR dưới Hình 5.2 và 5.3 khác bảng truy vết 5.5.
  **Tự phát hiện:** mã viết lẫn FR01 và FR1.
- **Quyết định:** SỬA (lấy bảng truy vết 5.5 làm chuẩn, dùng dạng FR1, US1, UC1).
- **Lý do:** Mọi mã phải khớp giữa SRS, sơ đồ và wireframe. Theo bảng 5.5: M1 gồm FR1, FR2, FR7;
  M2 gồm FR1, FR3, FR4, FR5, FR9; M3 gồm FR6.
- **Ảnh hưởng:** `docs/srs.md` mục 1.3 và 5.5; `docs/usecase.drawio`; chú thích hình trong
  `docs/wireframe.drawio`; mã quy tắc trong comment của `src/services/`.

### TD-07 Sửa tên bài toán; thêm FR10 cập nhật trạng thái; gọn lại phạm vi mục 1.1

- **Tự phát hiện:** Tên bài toán ghi "tiếp nhận và phân loại yêu cầu bảo hành" (đó là luồng L2).
  Phạm vi mục 1.1 liệt kê "cập nhật trạng thái", "thông báo lịch hẹn", "lọc phiếu" nhưng không có FR
  tương ứng, trong khi UC10, màn M3, `TicketStatusService` và `ticket_status_log` đều có.
- **Quyết định:** SỬA.
- **Lý do:** Tên bài toán phải đúng luồng L4. Cập nhật trạng thái đã có trong sơ đồ và dữ liệu nên bổ
  sung FR10 (SHOULD, thuộc US5, theo QT-06) để khớp, thay vì bỏ. "Thông báo lịch hẹn" chuyển xuống
  backlog cùng US7. "Lọc phiếu" là bộ lọc của M1 nên ghi trong mô tả FR1.
- **Ảnh hưởng:** `README.md` (tên đề tài); `docs/srs.md` mục 1.1, 1.3 (thêm FR10) và bảng truy vết 5.5
  (FR10 – US5 – UC10 – M3).

### TD-08 Bổ sung phụ lục khai báo sử dụng công cụ AI

- **Phản hồi của GV:** Bài không có phụ lục khai báo sử dụng công cụ AI và dòng cam kết (lỗi C7).
- **Quyết định:** SỬA.
- **Lý do:** Đây là phụ lục bắt buộc theo quy định học phần, kể cả khi không dùng AI.
- **Ảnh hưởng:** Tạo mới `docs/ai-disclosure.md`; cập nhật tiếp mỗi khi dùng AI để viết mã.

### TD-09 Gỡ `node_modules` khỏi Git; ghi rõ link GitHub

- **Phản hồi của GV:** Link GitHub ở trang 2 chỉ là chữ "link github" (siêu liên kết ẩn), bìa thiếu
  lớp và ngày nộp; repo còn commit cả `node_modules`.
- **Quyết định:** SỬA.
- **Lý do:** Người chấm phải thấy được địa chỉ repo; lịch sử commit không chứa thư mục sinh tự động.
  `.gitignore` đã có `node_modules/` nhưng thư mục đã bị theo dõi từ trước nên dòng đó không có tác dụng.
- **Ảnh hưởng:** Chạy `git rm -r --cached src/backend/node_modules`; ghi địa chỉ repo đầy đủ ở README;
  trang bìa PDF BT2 ghi link, tên tag v0.2, lớp và ngày nộp.

## Phụ lục: hai câu lập luận đã viết lại (thay cho câu 2 và 3 ở SRS mục 3.2)

2. Vì NFR2 yêu cầu kiểm tra trùng lịch ≤ 1 giây với 500 lịch hẹn, tôi chọn đặt ràng buộc `EXCLUDE`
   (`ex_appointment_no_overlap`) trên `(technician_id, tsrange(start_at, end_at))` với chỉ mục GiST, để
   phép kiểm tra trùng đi qua chỉ mục thay vì quét toàn bộ lịch của kỹ thuật viên; đánh đổi là phụ thuộc
   tính năng riêng của PostgreSQL (extension `btree_gist`) và mỗi lần ghi phải cập nhật thêm chỉ mục, nên
   đổi sang CSDL khác phải viết lại phần chống trùng ở tầng nghiệp vụ. Ngoài ra, `AppointmentService`
   bắt lỗi `23P01` và trả mã nghiệp vụ `LICH_HEN_TRUNG`, để hai yêu cầu đồng thời không cùng vượt qua
   bước kiểm tra.
3. Vì NFR3 yêu cầu 20 quản lý thao tác đồng thời mà không phiếu nào có hai kỹ thuật viên phụ trách, tôi
   chọn cập nhật phiếu có điều kiện trong một transaction: phân công lần đầu chỉ ghi khi `status = 'MOI'`;
   phân công lại (US8) chỉ ghi khi `technician_id` vẫn bằng giá trị quản lý đã nhìn thấy; kèm unique
   index `uq_assignment_current` (QT-07) làm lưới an toàn. Đánh đổi là yêu cầu đến sau bị từ chối (409)
   nên giao diện phải tải lại dữ liệu, và transaction giữ khoá dòng thêm vài mili giây.
