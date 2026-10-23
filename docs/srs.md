# SRS rút gọn – Luồng L4: Phân công kỹ thuật viên và lịch hẹn

| | |
|---|---|
| Sinh viên | Nguyễn Ngô Ngọc Long - 2374802010281 |
| Track | SE |
| Luồng | L4 |
| Phiên bản | 1.0 – 10/2026 |

---

## 1. Giới thiệu

### 1.1 Mục đích
Tài liệu mô tả yêu cầu cho chức năng phân công kỹ thuật viên cho phiếu bảo hành và đặt lịch hẹn giao – nhận máy tại trung tâm bảo hành.

### 1.2 Phạm vi
Hệ thống cho **quản lý trung tâm** phân công kỹ thuật viên cho phiếu bảo hành theo tay nghề, địa bàn và khối lượng công việc, đồng thời đặt lịch hẹn giao – nhận máy không trùng lịch.

**Ngoài phạm vi:** tạo và nhập phiếu bảo hành (luồng L2, giả định đã có), tối ưu tuyến đường di chuyển (US9 – WON'T), thanh toán.

### 1.3 Bảng thuật ngữ
Toàn bộ tài liệu, sơ đồ Use Case, API và cơ sở dữ liệu dùng một tên cho mỗi khái niệm. Mã phiếu
và mã kỹ thuật viên được giữ theo định dạng trong dataset.

| Thuật ngữ | Định nghĩa | Tên bảng dữ liệu | Không dùng |
|---|---|---|---|
| Phiếu bảo hành | Yêu cầu bảo hành, mã như `BH-000001/2025` | `ticket` | yêu cầu, phiếu yêu cầu |
| Kỹ thuật viên | Nhân viên sửa chữa, mã như `KT001` | `technician` | thợ |
| Nhóm sự cố / tay nghề | Một trong `MAN_HINH`, `PIN`, `SAC`, `PHAN_MEM`, `NUOC_VAO`, `KHAC` | `technician_skill.category_name`, `ticket.category_name` | issue_group, skill |
| Trung tâm | Mã trung tâm như `TT01` | `technician.center_code`, `ticket.center_code` | center_id ở API |
| Lịch sử trạng thái | Một lần chuyển trạng thái của phiếu | `ticket_status_log` | ticket_log |
| Lịch sử phân công | Một giai đoạn kỹ thuật viên phụ trách phiếu | `ticket_assignment` | assignment hiện tại |
| Mã khách hàng nguồn | Mã tham chiếu từ luồng L2, không quản lý hồ sơ khách trong L4 | `ticket.customer_id` | customer FK |
| Mã sản phẩm nguồn | Mã tham chiếu sản phẩm trên phiếu, không quản lý danh mục trong L4 | `ticket.product_id` | product FK |
| Lịch hẹn | Khung giờ hẹn giao hoặc nhận máy gắn với một phiếu | `appointment` | cuộc hẹn |
| Phiếu đang mở | Phiếu có trạng thái `DA_PHAN_CONG`, `DANG_XU_LY` hoặc `CHO_LINH_KIEN` | – | phiếu tồn |
| Khối lượng công việc | Số phiếu đang mở của một kỹ thuật viên | – | tải, workload |
| Ngưỡng tối đa | Số phiếu đang mở tối đa của một kỹ thuật viên, mặc định 15 | – | giới hạn |
| Hạn cam kết | Thời hạn trung tâm cam kết hoàn tất phiếu | – | deadline |
| Trùng lịch | Hai lịch hẹn của cùng một kỹ thuật viên có khoảng thời gian giao nhau | – | xung đột lịch |
| Quản lý trung tâm | Người phân công và đặt lịch | – | admin, quản trị |

Giá trị `priority` dùng `CAO`, `TRUNG_BINH`, `THAP`. Trạng thái phiếu lấy theo dataset:
`MOI`, `DA_PHAN_CONG`, `DANG_XU_LY`, `CHO_LINH_KIEN`, `HOAN_TAT`, `DA_DONG`.
`HOAN_TAT` và `DA_DONG` là trạng thái kết thúc; tập đang mở như định nghĩa ở bảng trên.
Lịch hẹn dùng các trạng thái nguồn `DA_DAT`, `DA_XAC_NHAN`, `HOAN_TAT`, `KHACH_HUY`,
`KHACH_KHONG_DEN`; việc khách hàng xác nhận là dữ liệu lịch sử, không phải tính năng BT2.

---

## 2. Mô tả tổng quan

### 2.1 Vấn đề cần giải quyết

| Mã | Vấn đề hiện tại | Hệ quả đo được | Luồng liên quan |
|---|---|---|---|
| V2 | Yêu cầu bảo hành ghi trên phiếu giấy, mỗi trung tâm lưu một cách | Không ai biết phiếu đang ở bước nào, ai xử lý, đã quá hạn chưa; khoảng 15% phiếu quá hạn mà không được cảnh báo | L2, L4, L6 |
| V3 | Việc phân công kỹ thuật viên do quản lý làm thủ công theo trí nhớ | Khối lượng lệch nhau: có kỹ thuật viên nhận 40 phiếu/tháng, người khác chỉ 12 phiếu | L4 |

### 2.2 Tác nhân (actor)

| Actor | Loại | Vai trò trong L4 |
|---|---|---|
| Quản lý trung tâm | Người | Phân công, đặt lịch hẹn, theo dõi khối lượng và cảnh báo |
| Kỹ thuật viên | Người | Xem phiếu và lịch hẹn được giao |
| Hệ thống thời gian | Không phải người | Kích hoạt cảnh báo phiếu sắp quá hạn |

### 2.3 Thực thể dữ liệu liên quan

Mô hình L4 có đúng sáu bảng nghiệp vụ:

| Thực thể | Thuộc tính chính |
|---|---|
| `ticket` | mã phiếu, `customer_id`, `product_id`, `serial_no`, `center_code`, `category_name`, `priority`, trạng thái, hạn cam kết |
| `technician` | mã kỹ thuật viên nguồn, mã hiển thị, họ tên, `center_code`, bậc tay nghề, trạng thái hoạt động |
| `technician_skill` | mã kỹ thuật viên, `category_name`, proficiency 1–5 |
| `ticket_assignment` | phiếu, kỹ thuật viên, người phân công, thời điểm bắt đầu/kết thúc, lý do |
| `appointment` | phiếu, kỹ thuật viên, trung tâm, loại, ngày/giờ bắt đầu-kết thúc, trạng thái |
| `ticket_status_log` | phiếu, trạng thái trước/sau, thời điểm, mã người thực hiện |

`customer_id`, `product_id` và mã người thực hiện là giá trị tham chiếu nguồn, không có FK tới
hệ thống L2/người dùng. `center_code` và `category_name` được chụp trực tiếp trên các bảng cần lọc,
không tạo bảng tham chiếu thứ bảy. Chi tiết ánh xạ CSV được ghi tại mục 5.

### 2.4 Use Case Diagram

File gốc: [usecase_L4.drawio](usecase_L4.drawio). UC7 xác nhận lịch hẹn của khách thuộc backlog và
không xuất hiện trong sơ đồ phạm vi BT2.

| Mã | Use case | Actor | Ghi chú |
|---|---|---|---|
| UC1 | Phân công kỹ thuật viên cho phiếu bảo hành | Quản lý trung tâm | MUST, đặc tả chi tiết ở mục 3.2 |
| UC2 | Xem khối lượng công việc của kỹ thuật viên | Quản lý trung tâm | MUST |
| UC3 | Đặt lịch hẹn giao – nhận máy | Quản lý trung tâm | MUST |
| UC4 | Kiểm tra trùng lịch hẹn | – | `<<include>>` của UC3 |
| UC5 | Gợi ý kỹ thuật viên phù hợp | – | `<<include>>` của UC1 |
| UC6 | Xem phiếu và lịch hẹn được giao | Kỹ thuật viên | |
| UC8 | Phân công lại kỹ thuật viên | Quản lý trung tâm | `<<extend>>` của UC1 |
| UC9 | Cảnh báo phiếu sắp quá hạn cam kết | Hệ thống thời gian, Quản lý trung tâm | |
| UC10 | Cập nhật trạng thái phiếu | Kỹ thuật viên | SHOULD |

UC7 (khách hàng xác nhận lịch hẹn) được giữ trong backlog, không thuộc prototype BT2.

### 2.5 User Story

| Mã | Tóm tắt | MoSCoW |
|---|---|---|
| US1 | Quản lý phân công phiếu cho đúng một kỹ thuật viên | MUST |
| US2 | Quản lý xem số phiếu đang mở của từng kỹ thuật viên | MUST |
| US3 | Quản lý đặt lịch hẹn giao – nhận máy cho phiếu đã phân công | MUST |
| US4 | Hệ thống gợi ý kỹ thuật viên phù hợp theo tay nghề, trung tâm và khối lượng | SHOULD |
| US5 | Kỹ thuật viên xem phiếu được giao và cập nhật trạng thái xử lý | SHOULD |
| US6 | Quản lý nhận cảnh báo khi phiếu sắp quá hạn cam kết | SHOULD |
| US7 | Khách hàng xác nhận lịch hẹn | COULD — backlog |
| US8 | Quản lý phân công lại phiếu và lưu lịch sử người phụ trách | COULD |
| US9 | Tối ưu tuyến đường di chuyển | WON'T |

---

## 3. Yêu cầu chức năng

### 3.1 Danh sách yêu cầu chức năng (FR)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR1 | Hệ thống cho phép quản lý phân công một phiếu ở trạng thái `MOI` cho đúng một kỹ thuật viên; từ chối nếu phiếu đã có người phụ trách. | MUST |
| FR2 | Hệ thống hiển thị số phiếu đang mở của từng kỹ thuật viên đang hoạt động, kể cả khi bằng 0. | MUST |
| FR3 | Hệ thống cho phép đặt lịch hẹn giao – nhận máy cho phiếu đã phân công và từ chối khi lịch hẹn mới giao nhau với lịch hẹn khác của cùng kỹ thuật viên. | MUST |
| FR4 | Hệ thống cảnh báo khi quản lý chọn kỹ thuật viên đã đạt ngưỡng tối đa 15 phiếu đang mở và chỉ phân công khi quản lý xác nhận lại. | MUST |
| FR5 | Hệ thống gợi ý kỹ thuật viên đang hoạt động, cùng trung tâm với phiếu và có proficiency đạt mức yêu cầu cho `category_name`. | SHOULD |
| FR6 | Hệ thống cho kỹ thuật viên xem các phiếu và lịch hẹn được giao cho chính mình. | SHOULD |
| FR7 | Hệ thống tạo cảnh báo cho quản lý khi phiếu còn dưới 24 giờ tới hạn cam kết mà chưa hoàn tất. | SHOULD |
| FR8 | Khách hàng xác nhận lịch hẹn. | COULD — backlog, chưa hiện thực trong BT2 |
| FR9 | Quản lý phân công lại phiếu sang kỹ thuật viên khác và lưu lịch sử người phụ trách cũ. | COULD |
| FR10 | Kỹ thuật viên cập nhật trạng thái phiếu theo các chuyển trạng thái hợp lệ và hệ thống ghi vào `ticket_status_log`. | SHOULD |

### 3.2 Đặc tả use case quan trọng nhất: UC1 – Phân công kỹ thuật viên cho phiếu bảo hành

| Mục | Nội dung |
|---|---|
| Actor chính | Quản lý trung tâm |
| Mục tiêu | Phiếu bảo hành có đúng một kỹ thuật viên phụ trách |
| Điều kiện trước | Quản lý đã đăng nhập; phiếu ở trạng thái `MOI` (hiển thị "Chờ phân công") |
| Điều kiện sau (thành công) | Phiếu ở trạng thái `DA_PHAN_CONG`; ghi nhận kỹ thuật viên, thời điểm và mã người phân công |
| Điều kiện sau (thất bại) | Trạng thái phiếu không đổi |
| Truy vết | US1, US2, US4 – FR1, FR2, FR4, FR5 |

**Luồng chính**

1. Quản lý mở danh sách phiếu `MOI` ("Chờ phân công") và chọn một phiếu.
2. Hệ thống hiển thị thông tin phiếu (`serial_no`, `product_id`, nhóm sự cố, trung tâm, hạn cam kết).
3. Hệ thống gợi ý kỹ thuật viên cùng `center_code`, có tay nghề phù hợp và kèm số phiếu đang mở (UC5).
4. Quản lý chọn một kỹ thuật viên.
5. Hệ thống kiểm tra số phiếu đang mở của kỹ thuật viên so với ngưỡng tối đa.
6. Quản lý xác nhận phân công.
7. Hệ thống lưu phân công, đổi trạng thái phiếu sang `DA_PHAN_CONG` và ghi lịch sử trạng thái.

**Luồng ngoại lệ (đánh số theo bước)**

- **3a.** Không có kỹ thuật viên nào phù hợp tay nghề và trung tâm: hệ thống thông báo "Không có kỹ thuật viên phù hợp"; quản lý có thể chọn lại phiếu/trung tâm hoặc dừng phân công. Quay lại bước 3.
- **5a.** Kỹ thuật viên đã đạt ngưỡng tối đa 15 phiếu đang mở: hệ thống cảnh báo vượt ngưỡng. Quản lý chọn người khác (quay lại bước 4) hoặc xác nhận vượt ngưỡng (sang bước 6).
- **6a.** Phiếu vừa được người khác phân công trong lúc quản lý đang thao tác: hệ thống từ chối, tải lại trạng thái phiếu và kết thúc use case.
- **7a.** Không thể lưu phân công do lỗi hệ thống: hệ thống giữ nguyên trạng thái phiếu, báo lỗi và cho phép quản lý thử lại từ bước 6.

### 3.3 Lập luận kiến trúc và đánh đổi

1. Vì NFR1 yêu cầu danh sách gợi ý phản hồi trong ≤ 2 giây với 100 kỹ thuật viên, chọn lập chỉ mục
   cho trung tâm/trạng thái hoạt động và đếm phiếu đang mở bằng truy vấn có điều kiện; đánh đổi là
   mỗi lần cập nhật trạng thái cần duy trì chỉ mục, còn bộ lọc nhiều tiêu chí vẫn phải được đo bằng
   dữ liệu kiểm thử thay vì giả định rằng chỉ mục luôn nhanh hơn.
2. Vì NFR2 yêu cầu kiểm tra trùng lịch ≤ 1 giây với 500 lịch hẹn, chọn ràng buộc PostgreSQL
   `EXCLUDE` trên kỹ thuật viên và khoảng thời gian `tsrange` kèm GiST/`btree_gist`; đánh đổi là phụ
   thuộc tính năng PostgreSQL, tăng chi phí ghi và cần thay thế bằng kiểm tra giao dịch nếu đổi DB.
3. Vì NFR3 yêu cầu không có hai kỹ thuật viên cùng phụ trách một phiếu khi 20 quản lý thao tác đồng
   thời, chọn cập nhật có điều kiện trong transaction cùng unique index trên phân công hiện hành;
   đánh đổi là yêu cầu cạnh tranh đến sau bị từ chối (409), giao diện phải tải lại và transaction giữ
   khóa dòng trong thời gian ngắn.

---

## 4. Yêu cầu phi chức năng (NFR)

| Mã | Nhóm | Yêu cầu có ngưỡng số | Cách đo |
|---|---|---|---|
| NFR1 | Hiệu năng | Danh sách gợi ý kỹ thuật viên hiển thị trong ≤ 2 giây ở ít nhất 95% lần gọi, với dữ liệu 100 kỹ thuật viên. | Test tải 100 kỹ thuật viên, đo thời gian phản hồi |
| NFR2 | Hiệu năng | Kiểm tra trùng lịch hẹn phản hồi trong ≤ 1 giây với 500 lịch hẹn trong hệ thống. | Test với 500 lịch hẹn mẫu |
| NFR3 | Toàn vẹn dữ liệu | Khi 20 quản lý thao tác đồng thời, 0 phiếu bị phân công cho nhiều hơn một kỹ thuật viên. | Test đồng thời 20 luồng cùng phân công một phiếu |
| NFR4 | Độ tin cậy | Cảnh báo phiếu sắp quá hạn được tạo trong ≤ 5 phút kể từ lúc phiếu còn 24 giờ tới hạn. | So sánh thời điểm ngưỡng và thời điểm tạo cảnh báo |

Các giá trị trên là đề xuất của nhóm cho phạm vi học phần.

---

## 5. Ràng buộc và giả định

**Ràng buộc**
- Mỗi phiếu chỉ có một kỹ thuật viên phụ trách tại một thời điểm.
- Mỗi kỹ thuật viên không có hai lịch hẹn giao nhau về thời gian.
- Thời lượng một lịch hẹn từ 15 đến 240 phút.
- Hệ thống cung cấp API dạng REST/JSON (xem [`api_contract.md`](api_contract.md)).

**Nguồn dữ liệu Track SE – L4**
- Danh mục lấy từ `service_centers.csv` (6 trung tâm), `technicians.csv` (38 kỹ thuật viên),
  `technician_skills.csv` (159 quan hệ tay nghề) và `issue_categories.csv` (6 nhóm sự cố).
- Dữ liệu kiểm thử phiếu/lịch sử lấy từ `tickets_history.csv` (7.800 phiếu) và
  `ticket_status_log.csv` (38.112 lần chuyển trạng thái). Mẫu lịch hẹn không có sẵn; sinh bằng
  `tools/gen_sample.py --entity appointment --rows 1200 --seed 42 --link tickets_history.csv
  --out appointments.csv`, sau đó kiểm tra/chuẩn hóa quan hệ phiếu-kỹ thuật viên-trung tâm và lịch
  chồng trước khi nạp.
- Không nạp `customers_raw.csv`, `products.csv`, `parts.csv`, `part_stock.csv` hoặc dữ liệu đơn hàng
  vào mô hình L4. `customer_id`, `product_id`, `serial_no`, `changed_by` giữ như snapshot/mã nguồn;
  `serial_no` không được coi là FK tới bảng thiết bị.
- Dữ liệu là mô phỏng. `due_date` nguồn được tính theo giờ lịch đơn giản (24/72/120 giờ), không phải
  QT-04 tính ngày làm việc; dùng để kiểm thử hiển thị/lịch sử, không làm bằng chứng đã hiện thực SLA.
- `tickets_history.csv` hiện không có phiếu nào ở `MOI`; cần tạo fixture `MOI` riêng để kiểm thử phân
  công, không coi các phiếu nguồn đã được phân công/xử lý là hàng đợi chờ phân công.

**Giả định**
- Dữ liệu phiếu bảo hành đã có từ luồng L2; bộ CSV lịch sử được dùng làm fixture kiểm thử.
- Mã trung tâm và nhóm sự cố được ánh xạ về `center_code`/`category_name`, không nạp thành bảng riêng.
- Ngưỡng tối đa 15 phiếu đang mở và mốc cảnh báo 24 giờ là giá trị mặc định, có thể cấu hình.
- Hệ thống không tính thời gian di chuyển giữa hai lịch hẹn (tối ưu tuyến thuộc US9 – WON'T).
- Quản lý đã đăng nhập bằng tài khoản được cấp bởi quản trị viên; xác thực dùng phiên cookie HttpOnly.

---

## 6. Bảng truy vết

| FR | US | Use Case | MoSCoW |
|---|---|---|---|
| FR1 | US1 | UC1 | MUST |
| FR2 | US2 | UC2 | MUST |
| FR3 | US3 | UC3, UC4 | MUST |
| FR4 | US1, US2 | UC1 | MUST |
| FR5 | US4 | UC5 | SHOULD |
| FR6 | US5 | UC6 | SHOULD |
| FR7 | US6 | UC9 | SHOULD |
| FR8 | US7 | Backlog (UC7) | COULD – chưa hiện thực |
| FR9 | US8 | UC8 | COULD |
| FR10 | US5 | UC10 | SHOULD |

| Màn wireframe | Phạm vi FR | Use Case |
|---|---|---|
| M1 – Phân công kỹ thuật viên | FR1, FR2, FR4, FR5, FR7, FR9 | UC1, UC2, UC5, UC8, UC9 |
| M2 – Đặt lịch hẹn | FR3 | UC3, UC4 |
| M3 – Công việc của tôi | FR6, FR10 | UC6, UC10 |

Kiểm tra ngược: US1–US6 và US8 có FR trong phạm vi; US7 ở backlog, US9 là WON'T. NFR1 truy vết
tới FR5, NFR2 tới FR3, NFR3 tới FR1, NFR4 tới FR7.
