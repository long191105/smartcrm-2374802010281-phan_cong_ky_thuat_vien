# API Contract – Luồng L4 (Track SE)

Phạm vi endpoint: US1–US6, US8 và UC10 được hỗ trợ trong prototype;
US7 xác nhận lịch hẹn của khách hàng nằm ngoài phạm vi.

- Base URL: `/api`
- Định dạng: JSON, UTF-8. Thời gian nhận/trả theo ISO 8601.
- Các endpoint nghiệp vụ yêu cầu phiên đăng nhập hợp lệ. Cookie phiên `smartcrm_session` được
  server đặt với `HttpOnly`, `SameSite=Lax`; bật `AUTH_COOKIE_SECURE=true` khi chạy qua HTTPS.
- Thuật ngữ, mã trạng thái và định dạng ID theo `srs.md` mục 1.3.
- L4 sử dụng mã nguồn từ dataset: mã phiếu dạng `BH-000001/2025`, mã kỹ thuật viên dạng `KT001`,
  mã trung tâm dạng `TT01`, nhóm sự cố như `MAN_HINH`. Các ví dụ có mã `BH-900001/2025` là fixture
  tổng hợp riêng vì dataset hiện không có phiếu `MOI`.

## 1. Mã trạng thái

| Trường | Giá trị | Diễn giải |
|---|---|---|
| `ticket.status` | `MOI` | Chờ phân công |
| `ticket.status` | `DA_PHAN_CONG` | Đã phân công |
| `ticket.status` | `DANG_XU_LY` | Đang xử lý |
| `ticket.status` | `CHO_LINH_KIEN` | Chờ linh kiện; vẫn tính là đang mở |
| `ticket.status` | `HOAN_TAT` | Hoàn tất |
| `ticket.status` | `DA_DONG` | Đã đóng |
| `appointment.status` | `DA_DAT`, `DA_XAC_NHAN`, `HOAN_TAT`, `KHACH_HUY`, `KHACH_KHONG_DEN` | Trạng thái theo mẫu lịch hẹn; xác nhận của khách không thuộc chức năng BT2 |
| `appointment.appointment_type` | `GIAO_MAY`, `NHAN_MAY`, `KIEM_TRA_TAI_CHO` | Loại lịch hẹn trong dataset |

Nhóm sự cố hợp lệ: `MAN_HINH`, `PIN`, `SAC`, `PHAN_MEM`, `NUOC_VAO`, `KHAC`.
Trung tâm được nhận diện bằng `center_code`, ví dụ `TT01`; trạng thái kỹ thuật viên là `ACTIVE` hoặc
`INACTIVE`.

## 2. Đăng nhập và phiên

| Phương thức | Đường dẫn | Mục đích |
|---|---|---|
| POST | `/api/auth/login` | Kiểm tra thông tin đăng nhập và tạo phiên |
| GET | `/api/auth/me` | Lấy người dùng của phiên hiện tại |
| POST | `/api/auth/logout` | Thu hồi phiên và xóa cookie |

Đăng nhập nhận JSON `{ "username": "...", "password": "..." }`. Thành công trả `200` với
`{ "user": { "username": "...", "displayName": "..." } }` và cookie phiên HttpOnly; thông tin mật
khẩu hoặc mã phiên không nằm trong response JSON. Thông tin không hợp lệ trả `401 INVALID_CREDENTIALS`
với cùng thông báo để không tiết lộ username có tồn tại hay không. Body sai định dạng trả `422`.
Phiên hết hạn sau 8 giờ. `GET /api/auth/me` trả `401 UNAUTHORIZED` nếu chưa đăng nhập hoặc phiên hết
hạn; `POST /api/auth/logout` trả `204` sau khi thu hồi phiên.

Tài khoản ban đầu do quản trị viên tạo bằng `npm run auth:bootstrap` từ biến môi trường; không có
endpoint đăng ký công khai. Mật khẩu được lưu dưới dạng hash scrypt. Các endpoint nghiệp vụ bên dưới
đều yêu cầu cookie phiên hợp lệ; phiên hiện chưa phân quyền theo vai trò.

## 3. Danh sách endpoint

| # | Phương thức | Đường dẫn | Mục đích | Truy vết |
|---|---|---|---|---|
| E0 | POST/GET/POST | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` | Đăng nhập, xem phiên, đăng xuất | Bảo vệ luồng L4 |
| E1 | GET | `/api/tickets?status=MOI&center_code=TT04` | Lấy và lọc phiếu | US1, FR1 |
| E2 | POST | `/api/tickets/{ticket_code}/assignment` | Phân công một phiếu | US1, FR1, FR4 |
| E3 | GET | `/api/technicians?category_name=MAN_HINH&center_code=TT04&status=ACTIVE` | Gợi ý kỹ thuật viên và khối lượng | US2, US4; FR2, FR5 |
| E4 | POST | `/api/appointments` | Đặt lịch cho phiếu đã phân công | US3, FR3 |
| E5 | GET | `/api/technicians/{technician_code}/tickets` | Xem phiếu và lịch gần nhất của kỹ thuật viên | US5, FR6 |
| E6 | PATCH | `/api/tickets/{ticket_code}/status` | Chuyển trạng thái phiếu theo tiến trình | US5, FR10 |
| E7 | GET | `/api/appointments?technician_code=KT002&date=2026-10-20` | Xem lịch theo kỹ thuật viên/ngày | US3, FR3 |
| E8 | GET | `/api/tickets/{ticket_code}/history` | Xem lịch sử phân công/trạng thái | UC1, UC10 |

## 3. Định dạng lỗi chung

```json
{
  "error": "MÃ_LỖI",
  "message": "Mô tả lỗi cho người dùng",
  "fields": {}
}
```

## E1. GET /api/tickets?status=MOI&center_code=TT04

Truy vết: US1 – FR1 – UC1. Bộ lọc `ticket_code`, `status`, `center_code`, `category_name` là tùy chọn;
`ticket_code` lọc chính xác một phiếu để điều hướng tiếp tục luồng giữa các màn hình. Không truyền
`status` thì trả danh sách theo phân trang.

**Response 200 OK**

```json
{
  "items": [],
  "total": 0
}
```

`customer_id`, `product_id`, `serial_no` và `due_date` là các giá trị lấy từ phiếu lịch sử; API không
tra cứu hồ sơ khách hàng hoặc danh mục thiết bị trong L4. Dataset có 0 phiếu `MOI`, nên truy vấn này
trả rỗng nếu chỉ nạp dữ liệu nguồn; tạo fixture `BH-900001/2025` ở trạng thái `MOI` để kiểm thử UC1.

| Mã | Khi nào |
|---|---|
| 200 | Thành công; không có kết quả trả `items: []` |
| 422 | Mã phiếu, trạng thái, trung tâm hoặc nhóm sự cố không hợp lệ; `fields` nêu trường sai |

## E2. POST /api/tickets/{ticket_code}/assignment

Truy vết: US1 – FR1, FR4 – UC1. Chỉ phân công phiếu đang ở `MOI`. `assigned_by` là mã người thực hiện
nguồn dạng chuỗi, không phải khóa ngoại sang hệ thống người dùng.
Do mã phiếu chứa dấu `/`, client phải URL-encode giá trị path parameter, ví dụ
`BH-900001%2F2025`.

Fixture `BH-900001/2025` dùng kỹ thuật viên `KT002`, đang có 17 phiếu mở; vì vượt ngưỡng 15, quản lý
xác nhận tiếp tục phân công.

**Request**

```json
{
  "technician_code": "KT002",
  "assigned_by": "8",
  "confirm_overload": true
}
```

**Response 201 Created**

```json
{
  "ticket_code": "BH-900001/2025",
  "status": "DA_PHAN_CONG",
  "technician_code": "KT002",
  "assigned_by": "8",
  "assigned_at": "2026-10-19T09:30:00+07:00"
}
```

**Response 422 Unprocessable Entity**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ.",
  "fields": { "technician_code": "Phải có định dạng KT và 3 chữ số." }
}
```

**Response 404 Not Found** nếu không tìm thấy phiếu hoặc kỹ thuật viên.

**Response 409 Conflict** nếu phiếu đã được phân công (bao gồm trường hợp quản lý khác vừa phân công)
hoặc kỹ thuật viên đạt ngưỡng 15 phiếu đang mở mà `confirm_overload` là `false`.

Việc kiểm tra `MOI` và ghi phân công phải nằm trong cùng một transaction; unique index trên phiếu đang
có người phụ trách là lớp bảo vệ cuối cùng cho NFR3.

| Trường | Vị trí | Bắt buộc | Kiểu / quy tắc |
|---|---|---|---|
| `ticket_code` | path | Có | Mã từ dataset; fixture UC1 dùng `BH-900001/2025` |
| `technician_code` | body | Có | `KT` + 3 chữ số |
| `assigned_by` | body | Có | ID nguồn dạng chuỗi |
| `confirm_overload` | body | Không | boolean, mặc định `false` |

## E3. GET /api/technicians?category_name=MAN_HINH&center_code=TT04&status=ACTIVE

Truy vết: US2, US4 – FR2, FR5 – UC2, UC5. Response minh họa kỹ thuật viên `KT002` trong dataset
(đang hoạt động tại `TT04`, có tay nghề `MAN_HINH` mức 3); khối lượng đang mở là 17 phiếu.

**Response 200 OK**

```json
{
  "items": [
    {
      "technician_id": 2,
      "technician_code": "KT002",
      "full_name": "Trần Hoài Giang",
      "center_code": "TT04",
      "skills": [
        { "category_name": "MAN_HINH", "proficiency": 3 },
        { "category_name": "PIN", "proficiency": 5 },
        { "category_name": "SAC", "proficiency": 3 },
        { "category_name": "PHAN_MEM", "proficiency": 3 },
        { "category_name": "KHAC", "proficiency": 2 }
      ],
      "is_active": true,
      "open_tickets": 17,
      "max_open_tickets": 15,
      "at_limit": true
    }
  ],
  "total": 1
}
```

Danh sách kỹ thuật viên có thể lọc theo `category_name`, `center_code` và `status`. Nếu lọc
`status=ACTIVE`, kỹ thuật viên nghỉ không xuất hiện. Một kỹ thuật viên không có phiếu đang mở vẫn
được trả `open_tickets: 0`. `max_open_tickets` là ngưỡng được trả cùng kết quả; ứng viên sắp
theo số phiếu đang mở tăng dần. Chỉ proficiency từ 3/5 mới đủ điều kiện phân công.

| Mã | Khi nào |
|---|---|
| 200 | Thành công; không có người phù hợp trả `items: []` |
| 422 | `category_name`, `center_code`, `status` hoặc `limit` không hợp lệ |

| Trường | Bắt buộc | Kiểu / quy tắc |
|---|---|---|
| `category_name` | Không | Một trong sáu nhóm sự cố |
| `center_code` | Không | Mã trung tâm có trong danh mục |
| `status` | Không | `ACTIVE` mặc định hoặc `INACTIVE` |
| `limit` | Không | Số nguyên 1–100, mặc định 100 |

## E4. POST /api/appointments

Truy vết: US3 – FR3 – UC3, UC4. `technician_id` được lấy từ phân công hiện hành của phiếu, không
nhận từ client. Trạng thái lịch mới là `DA_DAT`; lịch đã xác nhận/hủy là dữ liệu lịch sử, không phải
luồng xác nhận của khách hàng.

**Request**

```json
{
  "ticket_code": "BH-900001/2025",
  "appointment_type": "NHAN_MAY",
  "scheduled_start": "2026-10-20T14:00:00+07:00",
  "duration_minutes": 60,
  "note": "Gọi trước khi đến"
}
```

**Response 201 Created**

```json
{
  "appointment_id": 1201,
  "ticket_code": "BH-900001/2025",
  "technician_code": "KT002",
  "center_code": "TT04",
  "appointment_type": "NHAN_MAY",
  "scheduled_start": "2026-10-20T14:00:00+07:00",
  "scheduled_end": "2026-10-20T15:00:00+07:00",
  "status": "DA_DAT"
}
```

| Mã | Khi nào |
|---|---|
| 201 | Đặt lịch thành công |
| 422 | Thiếu trường, sai kiểu, loại lịch không hợp lệ hoặc thời lượng ngoài 15–240 phút |
| 404 | Không tìm thấy phiếu |
| 409 | Phiếu chưa phân công hoặc lịch giao nhau với lịch khác của cùng kỹ thuật viên |

Lịch A và B trùng khi `A.start < B.end` và `B.start < A.end` với cùng `technician_id`. Ràng buộc
PostgreSQL `EXCLUDE` là lớp bảo vệ đồng thời ở DB.

## E5. GET /api/technicians/{technician_code}/tickets

Trả phiếu hiện hành của kỹ thuật viên đang hoạt động, kèm mã khách hàng tham chiếu, serial,
hạn cam kết và lịch hẹn sắp tới (nếu có). Danh sách sắp theo `due_date` tăng dần.
Query `status` là tùy chọn để lọc một trạng thái.

## E6. PATCH /api/tickets/{ticket_code}/status

Request gồm `status` (`DANG_XU_LY`, `CHO_LINH_KIEN` hoặc `HOAN_TAT`), `changed_by` (mã
`KT` + 3 chữ số) và `note` tùy chọn tối đa 255 ký tự. Chỉ kỹ thuật viên đang được phân công
mới cập nhật được; đổi trạng thái và ghi `ticket_status_log` trong cùng transaction.
Trạng thái sai luồng trả 409; dữ liệu đầu vào sai trả 422 kèm `fields`.

## E7. GET /api/appointments

`technician_code` và `date` (`YYYY-MM-DD`, theo ngày Việt Nam UTC+07) là query tùy chọn.
Trả tối đa 100 lịch, sắp theo `start_at`.

## E8. GET /api/tickets/{ticket_code}/history

Trả lịch sử phân công và đổi trạng thái theo thứ tự mới nhất trước. Phiếu không tồn tại trả 404.

## 4. Ánh xạ dữ liệu mẫu

| CSV nguồn | Bảng/thuộc tính đích | Ghi chú |
|---|---|---|
| `service_centers.csv` | `center_code` trên `ticket`, `technician`, `appointment` | Ánh xạ `center_id` nguồn sang mã trung tâm |
| `issue_categories.csv` | `category_name` trên `ticket`, `technician_skill` | Ánh xạ `category_id` sang tên nhóm |
| `technicians.csv` | `technician` | Giữ `technician_id` và `technician_code` nguồn |
| `technician_skills.csv` | `technician_skill` | Giữ proficiency 1–5 |
| `tickets_history.csv` | `ticket`, `ticket_assignment` | Phiếu lịch sử dùng làm fixture; mã khách/sản phẩm không join ở L4 |
| `ticket_status_log.csv` | `ticket_status_log` | `changed_by` là ID nguồn dạng chuỗi |
| `appointments.csv` sinh với seed cố định | `appointment` | Chuẩn hóa/kiểm tra lại kỹ thuật viên, trung tâm và trùng lịch trước nạp |

Không dùng `customers_raw.csv`, `products.csv`, `parts.csv`, `part_stock.csv` hoặc dữ liệu đơn hàng
trong phạm vi L4.

## 5. Tự kiểm truy vết

| Endpoint | User Story | FR | Use Case |
|---|---|---|---|
| E1 GET tickets | US1 | FR1 | UC1 |
| E2 POST assignment | US1 | FR1, FR4 | UC1 |
| E3 GET technicians | US2, US4 | FR2, FR5 | UC2, UC5 |
| E4 POST appointments | US3 | FR3 | UC3, UC4 |
| E5 GET technician tickets | US5 | FR6 | UC6 |
| E6 PATCH ticket status | US5 | FR10 | UC10 |
| E7 GET appointments | US3 | FR3 | UC3 |
| E8 GET ticket history | US1, US5 | FR1, FR10 | UC1, UC10 |
