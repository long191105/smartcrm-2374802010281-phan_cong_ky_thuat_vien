# API Contract – Luồng L4 (Track SE)

Phạm vi: các endpoint phục vụ story MUST (US1, US2, US3) và US4 dùng chung endpoint của US2.

- Base URL: `/api`
- Định dạng: JSON, UTF-8. Thời gian theo ISO 8601 có múi giờ (ví dụ `2026-10-05T14:00:00+07:00`).
- Thuật ngữ theo `srs.md` mục 1.3.

## 1. Mã trạng thái nghiệp vụ

| Mã trong API | Hiển thị |
|---|---|
| `PENDING_ASSIGNMENT` | Chờ phân công |
| `ASSIGNED` | Đã phân công |
| `IN_PROGRESS` | Đang xử lý |
| `PENDING_CONFIRMATION` | Chờ xác nhận (lịch hẹn) |
| `CONFIRMED` | Đã xác nhận (lịch hẹn) |

Mã tay nghề: `MAY_GIAT`, `TU_LANH`, `DIEU_HOA`. Mã địa bàn: `Q1`, `Q4`, `Q7`…

## 2. Danh sách endpoint

| # | Phương thức | Đường dẫn | Mục đích | Truy vết |
|---|---|---|---|---|
| E1 | GET | `/api/tickets?status=PENDING_ASSIGNMENT` | Lấy danh sách phiếu chờ phân công | US1 |
| E2 | POST | `/api/tickets/{ticket_id}/assignment` | Phân công phiếu cho một kỹ thuật viên | US1 |
| E3 | GET | `/api/technicians?skill=&area=&status=ACTIVE` | Danh sách kỹ thuật viên kèm số phiếu đang mở, lọc theo tay nghề và địa bàn | US2, US4 |
| E4 | POST | `/api/appointments` | Đặt lịch hẹn giao – nhận máy | US3 |

## 3. Định dạng lỗi chung

```json
{
  "error_code": "MÃ_LỖI",
  "message": "Mô tả lỗi cho người dùng",
  "details": {}
}
```

---

## E1. GET /api/tickets?status=PENDING_ASSIGNMENT

Truy vết: US1 (luồng chính bước 1, UC1).

**Response 200 OK**

```json
{
  "items": [
    {
      "ticket_id": "BH-0231",
      "customer_name": "Lê Thị Hoa",
      "device": "Máy giặt LG FV1409S4W",
      "required_skill": "MAY_GIAT",
      "area": "Q7",
      "status": "PENDING_ASSIGNMENT",
      "due_at": "2026-10-07T17:00:00+07:00"
    }
  ],
  "total": 1
}
```

| Mã | Khi nào |
|---|---|
| 200 | Thành công (danh sách rỗng vẫn trả 200) |
| 400 | `status` không thuộc các giá trị hợp lệ |

---

## E2. POST /api/tickets/{ticket_id}/assignment

Truy vết: US1 – FR1, FR4 – UC1.

**Request**

```json
{
  "technician_id": "KTV-007",
  "assigned_by": "QL-001",
  "confirm_overload": false
}
```

**Response 201 Created**

```json
{
  "ticket_id": "BH-0231",
  "status": "ASSIGNED",
  "technician_id": "KTV-007",
  "assigned_by": "QL-001",
  "assigned_at": "2026-10-02T09:30:00+07:00"
}
```

**Response 400 Bad Request** (dữ liệu sai)

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ.",
  "details": { "technician_id": "Phải có định dạng KTV-###" }
}
```

**Response 404 Not Found** (không thấy phiếu hoặc kỹ thuật viên)

```json
{
  "error_code": "TECHNICIAN_NOT_FOUND",
  "message": "Không tìm thấy kỹ thuật viên KTV-999.",
  "details": {}
}
```

**Response 409 Conflict – phiếu đã có người phụ trách** (ngoại lệ 6a, tiêu chí US1-AC2)

```json
{
  "error_code": "TICKET_ALREADY_ASSIGNED",
  "message": "Phiếu BH-0231 đã được phân công cho KTV-003.",
  "details": { "current_technician_id": "KTV-003" }
}
```

**Response 409 Conflict – vượt ngưỡng** (ngoại lệ 5a, tiêu chí US1-AC3; gửi lại với `confirm_overload: true` để xác nhận)

```json
{
  "error_code": "TECHNICIAN_OVER_LIMIT",
  "message": "KTV-012 đã có 15 phiếu đang mở (ngưỡng tối đa 15).",
  "details": { "open_tickets": 15, "limit": 15 }
}
```

| Mã | Khi nào | Ngoại lệ liên quan |
|---|---|---|
| 201 | Phân công thành công | Luồng chính |
| 400 | `technician_id` hoặc `assigned_by` sai định dạng, thiếu trường bắt buộc | – |
| 404 | Không có phiếu hoặc kỹ thuật viên với mã đã cho | – |
| 409 | `TICKET_ALREADY_ASSIGNED`: phiếu đã có người, hoặc người khác vừa phân công trước | 6a |
| 409 | `TECHNICIAN_OVER_LIMIT`: kỹ thuật viên đạt ngưỡng và `confirm_overload` là `false` | 5a |

Ghi chú triển khai: việc kiểm tra trạng thái phiếu và ghi phân công phải nằm trong cùng một giao dịch (hoặc dùng khóa lạc quan) để đảm bảo NFR3.

**Bảng validation**

| Trường | Vị trí | Bắt buộc | Kiểu | Độ dài / dải giá trị |
|---|---|---|---|---|
| `ticket_id` | path | Có | string | Mẫu `BH-` + 4 chữ số trở lên |
| `technician_id` | body | Có | string | Mẫu `KTV-###` (3 chữ số) |
| `assigned_by` | body | Có | string | Mẫu `QL-###` (3 chữ số) |
| `confirm_overload` | body | Không | boolean | Mặc định `false` |

---

## E3. GET /api/technicians?skill=MAY_GIAT&area=Q7&status=ACTIVE

Truy vết: US2 (số phiếu đang mở), US4 (lọc tay nghề và địa bàn) – FR2, FR5 – UC2, UC5.

**Response 200 OK**

```json
{
  "items": [
    {
      "technician_id": "KTV-007",
      "full_name": "Nguyễn Văn Hùng",
      "skills": ["MAY_GIAT", "TU_LANH"],
      "areas": ["Q7", "Q4"],
      "open_tickets": 12,
      "at_limit": false
    },
    {
      "technician_id": "KTV-012",
      "full_name": "Trần Minh Khoa",
      "skills": ["MAY_GIAT"],
      "areas": ["Q7"],
      "open_tickets": 15,
      "at_limit": true
    },
    {
      "technician_id": "KTV-020",
      "full_name": "Phạm Thu Trang",
      "skills": ["MAY_GIAT", "DIEU_HOA"],
      "areas": ["Q7"],
      "open_tickets": 0,
      "at_limit": false
    }
  ],
  "total": 3
}
```

**Response 400 Bad Request**

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Tham số không hợp lệ.",
  "details": { "skill": "Giá trị phải thuộc MAY_GIAT, TU_LANH, DIEU_HOA" }
}
```

| Mã | Khi nào |
|---|---|
| 200 | Thành công. Không có ai phù hợp vẫn trả 200 với `items` rỗng (ngoại lệ 3a ở UC1) |
| 400 | `skill`, `area`, `status` hoặc `limit` sai giá trị |

Kỹ thuật viên nghỉ (không hoạt động) không xuất hiện khi `status=ACTIVE` (tiêu chí US2-AC3). Kỹ thuật viên chưa có phiếu trả `open_tickets: 0` (tiêu chí US2-AC2).

**Bảng validation**

| Trường | Bắt buộc | Kiểu | Độ dài / dải giá trị |
|---|---|---|---|
| `skill` | Không | string | Một trong `MAY_GIAT`, `TU_LANH`, `DIEU_HOA` |
| `area` | Không | string | Mẫu `Q` + số, 1–2 chữ số |
| `status` | Không | string | `ACTIVE` (mặc định) hoặc `INACTIVE` |
| `limit` | Không | integer | 1–100, mặc định 100 |

Hiệu năng yêu cầu (NFR1): phản hồi ≤ 2 giây ở ít nhất 95% lần gọi với 100 kỹ thuật viên.

---

## E4. POST /api/appointments

Truy vết: US3 – FR3 – UC3, UC4.

**Request**

```json
{
  "ticket_id": "BH-0231",
  "appointment_type": "PICKUP",
  "scheduled_start": "2026-10-05T14:00:00+07:00",
  "duration_minutes": 60,
  "note": "Khách ở chung cư, gọi trước 15 phút"
}
```

Kỹ thuật viên được lấy từ phiếu (kỹ thuật viên đang phụ trách), không truyền trong request.

**Response 201 Created**

```json
{
  "appointment_id": "LH-0088",
  "ticket_id": "BH-0231",
  "technician_id": "KTV-007",
  "appointment_type": "PICKUP",
  "scheduled_start": "2026-10-05T14:00:00+07:00",
  "scheduled_end": "2026-10-05T15:00:00+07:00",
  "status": "PENDING_CONFIRMATION"
}
```

**Response 400 Bad Request**

```json
{
  "error_code": "VALIDATION_ERROR",
  "message": "Dữ liệu không hợp lệ.",
  "details": { "scheduled_start": "Phải ở tương lai" }
}
```

**Response 404 Not Found**

```json
{
  "error_code": "TICKET_NOT_FOUND",
  "message": "Không tìm thấy phiếu BH-9999.",
  "details": {}
}
```

**Response 409 Conflict – trùng lịch** (tiêu chí US3-AC2)

```json
{
  "error_code": "APPOINTMENT_OVERLAP",
  "message": "KTV-007 đã có lịch hẹn LH-0079 từ 13:30 đến 14:30 cùng ngày.",
  "details": { "conflicting_appointment_id": "LH-0079" }
}
```

**Response 409 Conflict – phiếu chưa phân công** (tiêu chí US3-AC3)

```json
{
  "error_code": "TICKET_NOT_ASSIGNED",
  "message": "Phiếu BH-0240 chưa được phân công kỹ thuật viên.",
  "details": { "ticket_status": "PENDING_ASSIGNMENT" }
}
```

| Mã | Khi nào |
|---|---|
| 201 | Đặt lịch thành công |
| 400 | Thiếu trường, sai kiểu hoặc sai dải giá trị |
| 404 | Không có phiếu với mã đã cho |
| 409 | `APPOINTMENT_OVERLAP`: trùng lịch với lịch hẹn khác của cùng kỹ thuật viên |
| 409 | `TICKET_NOT_ASSIGNED`: phiếu chưa ở trạng thái `ASSIGNED` |

Quy tắc trùng lịch: lịch A và B trùng nếu `A.start < B.end` và `B.start < A.end`, cùng một kỹ thuật viên.

**Bảng validation**

| Trường | Bắt buộc | Kiểu | Độ dài / dải giá trị |
|---|---|---|---|
| `ticket_id` | Có | string | Mẫu `BH-` + 4 chữ số trở lên |
| `appointment_type` | Có | string | `PICKUP` (nhận máy) hoặc `DELIVERY` (giao máy) |
| `scheduled_start` | Có | datetime ISO 8601 | Phải ở tương lai |
| `duration_minutes` | Có | integer | 15–240 |
| `note` | Không | string | Tối đa 255 ký tự |

Hiệu năng yêu cầu (NFR2): kiểm tra trùng lịch ≤ 1 giây với 500 lịch hẹn.

---

## 4. Tự kiểm truy vết

| Endpoint | User Story | FR | Use Case |
|---|---|---|---|
| E1 GET tickets | US1 | FR1 | UC1 |
| E2 POST assignment | US1 | FR1, FR4 | UC1 |
| E3 GET technicians | US2, US4 | FR2, FR5 | UC2, UC5 |
| E4 POST appointments | US3 | FR3 | UC3, UC4 |

Mọi story MUST (US1, US2, US3) đều có endpoint; mọi endpoint truy vết được về một User Story.
