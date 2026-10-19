# Nhật ký thay đổi thiết kế

Mọi sai lệch so với thiết kế Bài tập 1 đều ghi ở đây, mỗi thay đổi bốn dòng:
phản hồi · quyết định · lý do · ảnh hưởng. File này được nối tiếp ở BT3.

Quy ước: dòng "Phản hồi của GV" chỉ chép điều GV đã nhận xét. Điều tự phát hiện
khi rà soát được ghi rõ là "Tự phát hiện".

## Sau phản hồi Bài tập 1 (buổi 8, ngày 19/10/2026)

Điểm BT1: 6/10 (Đầy đủ 7,5 · Kỹ thuật 4,75 · Nhất quán 5,5 · Trình bày 5,0).

### TD-01 Chốt một bộ thuật ngữ duy nhất theo dataset: `category_name`, `ticket_status_log`, `priority` dạng chữ

- **Phản hồi của GV:** Bảng thuật ngữ trong SRS ghi `issue_group`, `ticket_log`, `priority` lưu số 1–3;
  ERD và DDL lại dùng `issue_category`, `ticket_status_log`, `priority` CAO / TRUNG_BINH / THAP.
- **Quyết định:** SỬA (theo dataset và mô hình L4 sáu bảng).
- **Lý do:** Dataset L4 có `issue_categories.csv` và `ticket_status_log.csv`; `tickets_history.csv`
  lưu `priority` bằng CAO / TRUNG_BINH / THAP. Ánh xạ `category_id` sang `category_name` trên các bảng
  nghiệp vụ, không tạo bảng tham chiếu riêng; SRS, ERD, DDL, seed, API và test dùng cùng thuật ngữ.
  Sắp xếp theo mức ưu tiên dùng biểu thức `CASE` ở tầng truy vấn.
- **Ảnh hưởng:** `docs/srs.md` mục 1.1; `docs/erd.drawio`; `migrations/`; mọi tên biến, mã lỗi và
  test trong `src/` và `tests/` dùng đúng các tên này.

### TD-02 Chốt sáu trạng thái nguồn và định nghĩa "phiếu đang mở"

- **Tự phát hiện:** `tickets_history.csv` và `gen_dataset.py` định nghĩa sáu trạng thái
  `MOI`, `DA_PHAN_CONG`, `DANG_XU_LY`, `CHO_LINH_KIEN`, `HOAN_TAT`, `DA_DONG`; SRS chỉ nêu bốn,
  còn DDL cũ dùng một tập trạng thái khác.
- **Quyết định:** SỬA.
- **Lý do:** Giữ đúng trạng thái trong nguồn để nạp được mẫu; `CHO_LINH_KIEN` vẫn là phiếu đang mở,
  còn `DA_DONG` là trạng thái kết thúc trong lịch sử dữ liệu.
- **Ảnh hưởng:** `docs/srs.md`, `docs/erd.drawio`, API contract, migration, seed và test dùng đúng sáu
  trạng thái; phiếu đang mở = `DA_PHAN_CONG`, `DANG_XU_LY`, `CHO_LINH_KIEN`.

### TD-03 Rút ERD từ 11 xuống 6 bảng

- **Phản hồi của GV:** ERD và DDL có 11 bảng (6 lõi + 5 tham chiếu), vượt mức 4–6; nên rút các bảng
  tham chiếu về mức tối thiểu hoặc gộp lại.
- **Quyết định:** SỬA (đủ 6 bảng).
- **Lý do:** Theo hướng dẫn Track SE, L4 dùng danh mục trung tâm, kỹ thuật viên, tay nghề và nhóm sự cố;
  `tickets_history.csv` là nguồn phiếu kiểm thử. Để đáp ứng giới hạn 4–6 bảng mà vẫn lọc theo trung tâm
  và nhóm sự cố, giữ `center_code` và `category_name` trực tiếp ở các bảng nghiệp vụ, không tạo bảng
  riêng cho trung tâm/nhóm sự cố. `customer_id`, `product_id` và `changed_by` là mã tham chiếu nguồn,
  không phải khóa ngoại vì hồ sơ khách hàng/sản phẩm/người dùng thuộc luồng khác; không nạp
  `customers_raw.csv` hay `products.csv` cho L4. `serial_no` là snapshot từ phiếu, không tạo bảng
  `device` vì dataset xác nhận mã này không liên kết với bảng thiết bị. Sáu bảng là `ticket`,
  `technician`, `technician_skill`, `appointment`, `ticket_assignment`, `ticket_status_log`.
- **Ảnh hưởng:** `docs/erd.drawio` (đúng 6 bảng); `docs/srs.md`, API contract, migration, seed và sơ đồ
  kiến trúc ghi rõ các mã ngoài phạm vi không có FK. Dữ liệu lịch hẹn được sinh riêng; trước khi nạp
  phải kiểm tra `ticket_id`, `technician_id`, `center_code` và trùng lịch.

### TD-04 Viết lại các câu lập luận thiếu đánh đổi; sửa mã NFR

- **Phản hồi của GV:** Câu 2 (NFR2) và câu 3 (NFR3) không nêu đánh đổi nên mới có 2 câu đạt khuôn
  (đề yêu cầu ít nhất 3); chú thích chỉ mục ghi NFR5 nhưng SRS chỉ có NFR1–NFR4.
- **Quyết định:** SỬA.
- **Lý do:** Mỗi câu phải đủ ba thành phần "Vì NFRx… tôi chọn… đánh đổi là…". Chú thích phải trỏ đúng
  NFR đang tồn tại thì mới truy vết được.
- **Ảnh hưởng:** `docs/srs.md` mục 3.3 (ba quyết định đều nêu lựa chọn và đánh đổi);
  `migrations/` (chú thích chỉ mục ghi NFR1 hoặc NFR2); `docs/architecture.drawio` (bỏ "NFR4" gắn với
  kiểm tra `center_id` và "NFR5" gắn với bộ lập lịch, đổi thành NFR4 đúng nghĩa của SRS).

### TD-05 Thu hẹp phạm vi User Story: US7 chuyển xuống backlog

- **Phản hồi của GV:** Có 9 User Story, trong đó 8 không phải WON'T.
- **Quyết định:** SỬA.
- **Lý do:** Chỉ còn 5 buổi cho Giai đoạn 2. US7 (khách xác nhận lịch hẹn, COULD) cần kênh liên lạc với
  khách, ngoài phạm vi prototype. Giữ US1–US6 và US8 (phân công lại, gắn với QT-07); US7 xuống backlog,
  US9 vẫn WON'T.
- **Ảnh hưởng:** `docs/srs.md` và API contract đánh dấu FR8 là backlog; trạng thái `DA_XAC_NHAN`
  chỉ được giữ nếu xuất hiện ở dữ liệu lịch sử, không mở tính năng cho khách xác nhận trong BT2.
  `docs/usecase_L4.drawio`
  (bỏ UC7 khỏi phạm vi hiện thực); `docs/architecture.drawio` (bỏ trang xác nhận lịch khách hàng);
  `docs/wireframe.drawio` bỏ chức năng này khỏi phạm vi hiện thực. Không lưu cột/trạng thái xác nhận
  của khách trong mô hình tối thiểu L4.

### TD-06 Thống nhất mã FR / US / UC và truy vết wireframe

- **Phản hồi của GV:** Chú thích FR dưới Hình 5.2 và 5.3 khác bảng truy vết 5.5.
  **Tự phát hiện:** mã viết lẫn FR01 và FR1; UC7 còn xuất hiện ở wireframe dù đã chuyển xuống backlog.
- **Quyết định:** SỬA; dùng dạng FR1, US1, UC1 và ghi truy vết theo chức năng thực tế của từng màn.
- **Lý do:** M1 hỗ trợ phân công, khối lượng, gợi ý, cảnh báo và phân công lại; M2 chỉ đặt/kiểm tra
  lịch; M3 cho kỹ thuật viên xem và cập nhật phiếu. Vì vậy M1 = FR1, FR2, FR4, FR5, FR7, FR9;
  M2 = FR3; M3 = FR6, FR10.
- **Ảnh hưởng:** Bảng truy vết màn hình trong `docs/srs.md`; sơ đồ `docs/usecase_L4.drawio`;
  nhãn UC/FR trong `docs/wireframe.drawio`; mã quy tắc trong comment của `src/services/`.

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

## Sau kiểm tra dataset Mekong Mobile (buổi 8, ngày 19/10/2026)

### TD-10 Chọn nguồn dữ liệu đúng cho Track SE – L4

- **Tự phát hiện:** ZIP dataset có các tệp cho nhiều luồng; không phải toàn bộ tệp Track SE đều thuộc
  L4, và dữ liệu lịch hẹn không có sẵn trong bộ CSV chính.
- **Quyết định:** SỬA (dùng đúng các nguồn L4, giữ nguyên mã nguồn khi có thể).
- **Lý do:** `dataset/README.md` chỉ định cho Track SE các danh mục trung tâm, kỹ thuật viên, tay nghề,
  nhóm sự cố và phiếu lịch sử. Đối với L4, dùng `service_centers.csv` (6 trung tâm),
  `technicians.csv` (38 kỹ thuật viên), `technician_skills.csv` (159 kỹ năng),
  `issue_categories.csv` (6 nhóm), `tickets_history.csv` (7.800 phiếu) và
  `ticket_status_log.csv` (38.112 lịch sử). Tệp `parts.csv` và `part_stock.csv` thuộc luồng kho linh
  kiện, không nạp cho L4. `appointments.csv` được sinh bằng `tools/gen_sample.py` với seed cố định;
  vì generator chọn kỹ thuật viên/trung tâm độc lập với phiếu, dữ liệu phải được kiểm tra/chuẩn hóa
  trước khi nạp để bảo đảm khóa và quy tắc chống trùng lịch.
- **Tác động dữ liệu:** `tickets_history.csv` hiện không có phiếu nào ở `MOI`; có 1.162 phiếu đang mở
  (`DA_PHAN_CONG`, `DANG_XU_LY`, `CHO_LINH_KIEN`) và 6.638 phiếu ở `HOAN_TAT`/`DA_DONG`. Vì vậy phải
  tạo fixture phân công mới có thể tái lập, không được giả định lịch sử cung cấp sẵn hàng đợi `MOI`.
- **Ảnh hưởng:** `docs/srs.md`, `docs/erd.drawio`, API contract, migration, seed và README ghi rõ ánh xạ
  CSV → bảng; không commit các CSV nguồn lớn. Dữ liệu khách hàng thô, đơn hàng, sản phẩm và linh kiện
  không thuộc phạm vi L4.
