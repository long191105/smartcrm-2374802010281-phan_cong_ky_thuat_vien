# Test Plan — BT2, Track SE

## 1. Phạm vi

Kiểm thử các luồng L4 hiện có: đăng nhập và bảo vệ API; gợi ý/phân công kỹ thuật viên theo kỹ năng
và tải việc; đặt lịch và ngăn lịch trùng; cập nhật trạng thái và ghi lịch sử; CRUD phiếu/lịch hẹn;
migration, seed và ánh xạ dữ liệu. Kiểm tra đầu vào sai, dữ liệu biên, lỗi không lộ chi tiết nội bộ
và việc chạy lặp migration/seed.

Không kiểm thử trực tiếp tích hợp L2→L4: repo không chứa mã nguồn, endpoint hoặc đặc tả payload L2.
POST `/api/tickets` chỉ kiểm hợp đồng API nhận payload ở ranh giới L4. Không kiểm thử production,
tải lớn, khôi phục backup hoặc phân quyền kỹ thuật viên gắn với danh tính đăng nhập; prototype hiện
chỉ có tài khoản quản lý.

## 2. Tầng kiểm thử, số lượng và dữ liệu

Lần chạy hiện tại có **72 test tự động**:

- **55 unit/service/repository/schema/date-time/dataset/migration/seed:** logic chạy với test doubles;
  migration và seed được kiểm bằng runner giả lập, không phải PostgreSQL thật.
- **17 HTTP/API:** server Express trên cổng ngẫu nhiên; session, service và repository được thay bằng
  fixture hoặc fake DB có kiểm soát. Các ca bổ sung xác nhận 403, 404, 422 và tác dụng phụ.
- **0 integration PostgreSQL chạy trong phiên này:** `docker` và `psql` không có sẵn; log database
  cô lập ngày 31/10/2026 là bằng chứng lịch sử, không được tính là lần chạy hiện tại.

Dữ liệu đại diện và biên:

- API fixture: username `manager`, cookie `smartcrm_session=test-session`.
- Phiếu: `BH-900001/2025` (có phân công), `BH-900099/2025` (mã hợp lệ nhưng không có bản ghi).
- Kỹ thuật viên: `KT002` (được giao), `KT999` (actor khác); quản lý `assigned_by="8"`.
- Tải việc: **14** phiếu mở (ngay dưới ngưỡng 15) và **15** phiếu mở (đúng ngưỡng); ở 15 cần
  xác nhận quá tải, nếu không request bị rollback.
- Lịch: `2026-10-20T14:00:00+07:00`, thời lượng 60 phút; khoảng lịch dùng quy ước half-open `[start,end)`.
- Validation: POST `/api/tickets` với body `{}`; status hợp lệ `DANG_XU_LY`, status nhảy bước
  `HOAN_TAT`; mã phiếu tìm kiếm hợp lệ nhưng không tồn tại `BH-900099/2025`.
- Giới hạn request: body JSON lớn hơn **1 MiB** phải trả 413, không phải lỗi 500.

## 3. Tiêu chí thành công

1. `npm test` thoát mã 0: **72 PASS, 0 FAIL, 0 SKIP**.
2. `npm run build` thoát mã 0.
3. API trả đúng status/body theo hợp đồng; validation không gọi repository, actor không khớp bị từ
   chối, ticket không tồn tại trả 404; lỗi không làm thay đổi dữ liệu.
4. Tải việc 14 cho phép phân công; tải việc 15 yêu cầu xác nhận, không ghi phân công khi bị từ chối.
5. Payload sai nghiệp vụ trả **422 `VALIDATION_ERROR`** theo `docs/api_contract.md`, không phải 400.
   Khác biệt so với checklist/rubric đã ghi tại `docs/thay-doi-thiet-ke.md` (TD-12).
6. Migration/seed chạy lặp không đổi số dòng theo test doubles. Không tuyên bố PostgreSQL thật đã
   được chạy lại trong phiên này.
7. Không đánh dấu tích hợp trực tiếp L2→L4 PASS khi chưa có L2 thật và kiểm thử đối chiếu hai đầu.

## 4. Môi trường và cách chạy

- Windows, Node.js 24.21.0 trong phiên xác minh; dự án yêu cầu Node.js ≥20; dependencies khóa tại
  `package-lock.json`.
- Cài dependencies lần đầu: `npm ci`; toàn bộ test: `npm test`; build: `npm run build`.
- PostgreSQL integration cần PostgreSQL 16 hoặc Docker Compose. Dùng database test riêng, chạy
  `npm run migrate` và `npm run seed`; không dùng database workshop có dữ liệu cần giữ.
- Không có Docker daemon/`psql` trong phiên xác minh. Không có browser automation hoặc test Playwright.
- File chạy thủ công qua VS Code REST Client: `tests/api-smoke.http`. Nó dùng placeholder, không chứa
  mật khẩu/cookie thật.

## 5. Minh chứng

Kết quả lệnh được ghi trong `docs/test-report.md`; ảnh giao diện tại `docs/evidence/` chỉ là ảnh luồng
UI, không thay thế ảnh terminal cho từng test case. Chụp ảnh terminal TC-01…TC-15 và OWASP vẫn là
việc còn thiếu; không tạo ảnh giả hoặc gán ảnh giao diện làm ảnh chạy test.
