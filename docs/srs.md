# SRS rút gọn – Luồng L4: Phân công kỹ thuật viên và lịch hẹn

| | |
|---|---|
| Sinh viên | *Nguyễn Ngô Ngọc Long - 2374802010281* |
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
Toàn bộ tài liệu, sơ đồ Use Case và API dùng đúng một tên cho mỗi khái niệm.

| Thuật ngữ | Định nghĩa | Tên bảng dữ liệu | Không dùng |
|---|---|---|---|
| Phiếu bảo hành | Một yêu cầu bảo hành của khách hàng, có mã dạng BH-#### | `ticket` | ticket, yêu cầu, phiếu yêu cầu |
| Kỹ thuật viên | Nhân viên sửa chữa của trung tâm, mã KTV-### | `technician` | thợ, technician |
| Tay nghề | Nhóm thiết bị mà kỹ thuật viên sửa được (máy giặt, tủ lạnh…) | `technician_skill` | kỹ năng, skill |
| Địa bàn | Khu vực (quận) kỹ thuật viên phụ trách | – | khu vực, vùng |
| Lịch hẹn | Khung giờ hẹn giao hoặc nhận máy gắn với một phiếu | `appointment` | cuộc hẹn, appointment |
| Phiếu đang mở | Phiếu có trạng thái "Đã phân công" hoặc "Đang xử lý" | – | phiếu tồn |
| Khối lượng công việc | Số phiếu đang mở của một kỹ thuật viên | – | tải, workload |
| Ngưỡng tối đa | Số phiếu đang mở tối đa của một kỹ thuật viên, mặc định 15 | – | giới hạn |
| Hạn cam kết | Thời hạn trung tâm cam kết hoàn tất phiếu | – | deadline |
| Trùng lịch | Hai lịch hẹn của cùng một kỹ thuật viên có khoảng thời gian giao nhau | – | xung đột lịch |
| Quản lý trung tâm | Người phân công và đặt lịch | – | admin, quản trị |

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
| Khách hàng | Người | Xác nhận lịch hẹn |
| Hệ thống thời gian | Không phải người | Kích hoạt cảnh báo phiếu sắp quá hạn |

### 2.3 Thực thể dữ liệu liên quan

| Thực thể | Thuộc tính chính (đề xuất) |
|---|---|
| `ticket` | mã phiếu, khách hàng, thiết bị, loại tay nghề cần, địa bàn, trạng thái, hạn cam kết, kỹ thuật viên phụ trách |
| `technician` | mã kỹ thuật viên, họ tên, địa bàn phụ trách, trạng thái hoạt động |
| `technician_skill` | mã kỹ thuật viên, loại tay nghề |
| `appointment` | mã lịch hẹn, mã phiếu, loại (nhận/giao), giờ bắt đầu, thời lượng, trạng thái |

Trạng thái phiếu: Chờ phân công → Đã phân công → Đang xử lý → Hoàn tất / Hủy.
Trạng thái lịch hẹn: Chờ xác nhận → Đã xác nhận.

### 2.4 Use Case Diagram

File gốc: [`usecase_L4.drawio`](usecase_L4.drawio). Ảnh xuất: ![Use Case Diagram L4](usecase_L4.png)

| Mã | Use case | Actor | Ghi chú |
|---|---|---|---|
| UC1 | Phân công kỹ thuật viên cho phiếu bảo hành | Quản lý trung tâm | MUST, đặc tả chi tiết ở mục 3.2 |
| UC2 | Xem khối lượng công việc của kỹ thuật viên | Quản lý trung tâm | MUST |
| UC3 | Đặt lịch hẹn giao – nhận máy | Quản lý trung tâm | MUST |
| UC4 | Kiểm tra trùng lịch hẹn | – | `<<include>>` của UC3 |
| UC5 | Gợi ý kỹ thuật viên phù hợp | – | `<<include>>` của UC1 |
| UC6 | Xem phiếu và lịch hẹn được giao | Kỹ thuật viên | |
| UC7 | Xác nhận lịch hẹn | Khách hàng | |
| UC8 | Phân công lại kỹ thuật viên | Quản lý trung tâm | `<<extend>>` của UC1 |
| UC9 | Cảnh báo phiếu sắp quá hạn cam kết | Hệ thống thời gian, Quản lý trung tâm | |

### 2.5 User Story

Chi tiết (INVEST, tiêu chí chấp nhận Given–When–Then) xem [`user_stories.md`](user_stories.md).

| Mã | Tóm tắt | MoSCoW |
|---|---|---|
| US1 | Quản lý phân công phiếu cho đúng một kỹ thuật viên | MUST |
| US2 | Quản lý xem số phiếu đang mở của từng kỹ thuật viên | MUST |
| US3 | Quản lý đặt lịch hẹn giao – nhận máy cho phiếu đã phân công | MUST |
| US4 | Quản lý xem kỹ thuật viên phù hợp tay nghề và địa bàn | SHOULD |
| US5 | Kỹ thuật viên xem phiếu và lịch hẹn được giao | SHOULD |
| US6 | Quản lý được cảnh báo khi phiếu còn dưới 24 giờ tới hạn cam kết | SHOULD |
| US7 | Khách hàng xác nhận lịch hẹn | COULD |
| US8 | Quản lý phân công lại phiếu cho kỹ thuật viên khác | COULD |
| US9 | Tự tối ưu tuyến đường di chuyển | WON'T |

---

## 3. Yêu cầu chức năng

### 3.1 Danh sách yêu cầu chức năng (FR)

| Mã | Yêu cầu | Ưu tiên |
|---|---|---|
| FR1 | Hệ thống cho phép quản lý phân công một phiếu bảo hành ở trạng thái "Chờ phân công" cho đúng một kỹ thuật viên, và từ chối nếu phiếu đã có người phụ trách. | MUST |
| FR2 | Hệ thống hiển thị số phiếu đang mở của từng kỹ thuật viên đang hoạt động, kể cả khi bằng 0. | MUST |
| FR3 | Hệ thống cho phép đặt lịch hẹn giao – nhận máy cho phiếu đã phân công và từ chối khi lịch hẹn mới giao nhau với lịch hẹn khác của cùng kỹ thuật viên. | MUST |
| FR4 | Hệ thống cảnh báo khi quản lý chọn kỹ thuật viên đã đạt ngưỡng tối đa 15 phiếu đang mở và chỉ phân công khi quản lý xác nhận lại. | MUST |
| FR5 | Hệ thống gợi ý danh sách kỹ thuật viên có tay nghề và địa bàn phù hợp với phiếu. | SHOULD |
| FR6 | Hệ thống cho kỹ thuật viên xem các phiếu và lịch hẹn được giao cho chính mình. | SHOULD |
| FR7 | Hệ thống tạo cảnh báo cho quản lý khi phiếu còn dưới 24 giờ tới hạn cam kết mà chưa hoàn tất. | SHOULD |
| FR8 | Hệ thống cho khách hàng xác nhận lịch hẹn, chuyển trạng thái sang "Đã xác nhận". | COULD |
| FR9 | Hệ thống cho quản lý phân công lại phiếu sang kỹ thuật viên khác và lưu lịch sử người phụ trách cũ. | COULD |

### 3.2 Đặc tả use case quan trọng nhất: UC1 – Phân công kỹ thuật viên cho phiếu bảo hành

| Mục | Nội dung |
|---|---|
| Actor chính | Quản lý trung tâm |
| Mục tiêu | Phiếu bảo hành có đúng một kỹ thuật viên phụ trách |
| Điều kiện trước | Quản lý đã đăng nhập; phiếu ở trạng thái "Chờ phân công" |
| Điều kiện sau (thành công) | Phiếu ở trạng thái "Đã phân công"; ghi nhận kỹ thuật viên, thời điểm và người phân công; kỹ thuật viên được thông báo |
| Điều kiện sau (thất bại) | Trạng thái phiếu không đổi |
| Truy vết | US1, US2, US4 – FR1, FR2, FR4, FR5 |

**Luồng chính**

1. Quản lý mở danh sách phiếu "Chờ phân công" và chọn một phiếu.
2. Hệ thống hiển thị thông tin phiếu (thiết bị, tay nghề cần, địa bàn, hạn cam kết).
3. Hệ thống gợi ý danh sách kỹ thuật viên phù hợp tay nghề và địa bàn, kèm số phiếu đang mở của từng người (UC5).
4. Quản lý chọn một kỹ thuật viên.
5. Hệ thống kiểm tra số phiếu đang mở của kỹ thuật viên so với ngưỡng tối đa.
6. Quản lý xác nhận phân công.
7. Hệ thống lưu phân công, đổi trạng thái phiếu sang "Đã phân công" và thông báo cho kỹ thuật viên.

**Luồng ngoại lệ (đánh số theo bước)**

- **3a.** Không có kỹ thuật viên nào phù hợp tay nghề và địa bàn: hệ thống thông báo "Không có kỹ thuật viên phù hợp" và cho phép quản lý bỏ bớt điều kiện lọc địa bàn. Quay lại bước 3.
- **5a.** Kỹ thuật viên đã đạt ngưỡng tối đa 15 phiếu đang mở: hệ thống cảnh báo vượt ngưỡng. Quản lý chọn người khác (quay lại bước 4) hoặc xác nhận vượt ngưỡng (sang bước 6).
- **6a.** Phiếu vừa được người khác phân công trong lúc quản lý đang thao tác: hệ thống từ chối, tải lại trạng thái phiếu và kết thúc use case.
- **7a.** Không thể lưu phân công do lỗi hệ thống: hệ thống giữ nguyên trạng thái phiếu, báo lỗi và cho phép quản lý thử lại từ bước 6.

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

**Giả định**
- Dữ liệu phiếu bảo hành đã có từ luồng L2; sinh viên tự tạo vài phiếu mẫu để thử.
- Dữ liệu tay nghề và địa bàn của kỹ thuật viên đã được nhập sẵn.
- Ngưỡng tối đa 15 phiếu đang mở và mốc cảnh báo 24 giờ là giá trị mặc định, có thể cấu hình.
- Hệ thống không tính thời gian di chuyển giữa hai lịch hẹn (tối ưu tuyến thuộc US9 – WON'T).
- Quản lý đã đăng nhập; việc xác thực nằm ngoài phạm vi tài liệu này.

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
| FR8 | US7 | UC7 | COULD |
| FR9 | US8 | UC8 | COULD |

Kiểm tra ngược: mọi US từ US1 đến US8 xuất hiện ít nhất một lần; US9 là WON'T nên không có FR. NFR1 truy vết tới FR5, NFR2 tới FR3, NFR3 tới FR1, NFR4 tới FR7.
