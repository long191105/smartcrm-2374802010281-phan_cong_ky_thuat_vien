# Minh chứng chạy module cốt lõi – Buổi 8

- **Sinh viên:** Nguyễn Ngô Ngọc Long · **MSSV:** 2374802010281
- **Track:** SE · **Luồng:** L4 – Phân công kỹ thuật viên và lịch hẹn
- **Môi trường kiểm thử:** Node.js 24.21.0 · Express 4 · PostgreSQL 18 cục bộ
**Thời điểm kiểm thử:** 20/10/2026

## Môi trường và an toàn dữ liệu

CSDL được cấu hình sẵn trong `.env` có các bảng legacy. Migration đã từ chối chạy trên CSDL đó; không
có bảng hoặc dữ liệu legacy nào bị sửa. Đã tạo CSDL phát triển riêng `smartcrm_l4_dataset`, chạy
migration và kiểm thử module trên CSDL này. Thông tin xác thực không được ghi vào mã nguồn hoặc minh
chứng.

## Migration, import dataset và seed

`npm run migrate` tạo đúng sáu bảng nghiệp vụ: `appointment`, `technician`, `technician_skill`,
`ticket`, `ticket_assignment`, `ticket_status_log`. Chạy migration lần hai xác nhận hai tệp được
`SKIP` theo checksum. Import dataset chạy lần thứ hai không thêm trùng bản ghi.

Đã import sáu CSV Track SE–L4:

| Nguồn | Dòng nguồn | Dòng được nạp |
|---|---:|---:|
| `service_centers.csv` (ánh xạ mã trung tâm) | 6 | – |
| `issue_categories.csv` (ánh xạ tên nhóm sự cố) | 6 | – |
| `technicians.csv` | 38 | 38 |
| `technician_skills.csv` | 159 | 159 |
| `tickets_history.csv` | 7.800 | 7.800 |
| `ticket_status_log.csv` | 38.112 | 38.112 |
| Phân công hiện hành tạo từ phiếu đang mở có kỹ thuật viên | – | 1.162 |

Sau đó `npm run seed` thêm phiếu fixture `BH-900001/2025` trạng thái `MOI`. Dữ liệu kiểm tra trước
khi phân công: 38 kỹ thuật viên, 159 kỹ năng, 7.801 phiếu, 38.113 dòng lịch sử trạng thái, 1 phiếu
`MOI`; kỹ thuật viên `KT002` có 17 phiếu đang mở. Dữ liệu CSV được giữ ở `data/raw/` (đã ignore),
không commit vào repository.

## Kiểm thử API trực tiếp

API được khởi động bằng `npm start`, kết nối CSDL PostgreSQL thật.

### 1. Liệt kê phiếu chờ phân công

```powershell
curl.exe "http://localhost:18444/api/tickets?status=MOI&center_code=TT04"
```

Kết quả: HTTP 200, `total: 1`, phiếu `BH-900001/2025`.

### 2. Từ chối phân công quá tải nếu chưa xác nhận

```powershell
curl.exe -X POST "http://localhost:18444/api/tickets/BH-900001%2F2025/assignment" `
  -H "Content-Type: application/json" `
  -d "{\"technician_code\":\"KT002\",\"assigned_by\":\"8\"}"
```

Kết quả: HTTP 409, `OVERLOAD_CONFIRMATION_REQUIRED` vì KT002 đang có 17 phiếu mở (ngưỡng 15).

### 3. Xác nhận vượt ngưỡng và phân công

```powershell
curl.exe -X POST "http://localhost:18444/api/tickets/BH-900001%2F2025/assignment" `
  -H "Content-Type: application/json" `
  -d "{\"technician_code\":\"KT002\",\"assigned_by\":\"8\",\"confirm_overload\":true}"
```

Kết quả: HTTP 201, trạng thái `DA_PHAN_CONG`, kỹ thuật viên `KT002`. Truy vấn CSDL xác nhận có một
phân công hiện hành và hai dòng lịch sử trạng thái của fixture: tạo fixture `MOI` và chuyển sang
`DA_PHAN_CONG`. Cập nhật phiếu, thêm phân công và ghi log diễn ra trong cùng transaction.

## Kiểm thử tự động

```text
npm run test:l4
tests 24
pass 24
fail 0
```

Kiểm thử bao gồm route/HTTP contract, xác thực đầu vào, CSV parser, transaction phân công, kiểm tra
quá tải, sáu bảng/schema, migration checksum và từ chối schema legacy.
`npm test` còn phát hiện hai test L2 cũ tham chiếu `src/services/ticket.service` và
`src/validators/ticket.validator`, các module không tồn tại trong codebase; chúng không thuộc phạm vi
L4 này nên được giữ nguyên, không thay bằng implementation khác hoặc xóa.

## Checklist Buổi 8

- [x] Đã chỉnh tài liệu/sơ đồ sau feedback BT1 và lưu quyết định tại
  [thay-doi-thiet-ke.md](./thay-doi-thiet-ke.md).
- [x] Cấu trúc chạy theo Controller → Route → Service → Repository.
- [x] Migration sáu bảng; import dữ liệu danh mục/phiếu/lịch sử từ Track SE–L4; seed fixture.
- [x] Hai endpoint chính chạy trên PostgreSQL thật và có kết quả quan sát được.
- [x] README có môi trường, lệnh chạy và trạng thái module.
- [ ] Docker Compose chưa được xác minh trong môi trường này.

Tạo/xóa phiếu không được thêm vào lát cắt L4: tiếp nhận phiếu thuộc L2, xóa phiếu phá hủy lịch sử.
Các endpoint gợi ý kỹ thuật viên, lịch hẹn và cập nhật trạng thái là các lát cắt tiếp theo, không được
tuyên bố hoàn tất trong báo cáo này.
