# Test Report — BT2, Track SE

**Cập nhật:** 11/11/2026

**Commit local:** `3b52a0e` (fix BUG-02), `abd0c17` (boundary/auth tests), `ea7d840`
(Test Plan/Report, Test Design, README, CI, `.http` và báo cáo Word); chưa push.

**Lệnh:** `npm test` — exit code 0; **72 PASS, 0 FAIL, 0 SKIP**.

**Build:** `npm run build` — PASS (Vite 6.4.5).
**Tầng chạy:** 55 unit/service/repository/schema/dataset/migration/seed test doubles; 17 HTTP/API test;
0 PostgreSQL integration test chạy trong phiên này.

## 15 ca nghiệp vụ

| Mã | Tiền điều kiện | Các bước | Dữ liệu thử | Kết quả mong đợi | Ưu tiên | Kết quả thực tế | PASS/FAIL |
|---|---|---|---|---|---|---|---|
| TC-01 | API test server; auth fixture trả session | POST login → GET `/api/auth/me` → POST logout | `manager` / `not-returned`; cookie test `smartcrm_session=test-session` | Login/me 200; cookie HttpOnly; logout 204, xóa cookie | Cao | Test HTTP xác nhận 200, user `{username:"manager", displayName:"Test Manager"}`, cookie HttpOnly/SameSite=Lax, logout 204 | PASS |
| TC-02 | API test server; chưa có session | GET `/api/tickets` không gửi Cookie | Không cookie | 401 `UNAUTHORIZED`; service không được gọi | Cao | HTTP 401; JSON lỗi chuẩn; `ticketServiceCalls.length` vẫn 0 | PASS |
| TC-03 | Repository fake có phiếu `MOI`, KT002 đủ tay nghề, tải 17 | Gọi phân công với xác nhận quá tải | `BH-900001/2025`, `KT002`, `assigned_by="8"`, `confirm_overload=true` | 201; trạng thái `DA_PHAN_CONG`; ghi assignment | Cao | Unit/repository test xác nhận assignment và status/history cùng transaction | PASS |
| TC-04 | Repository fake; KT002 có proficiency 2, thấp hơn mức tối thiểu 3 | Thử phân công | `BH-900001/2025`, `KT002`, proficiency 2 | 409 `SKILL_MISMATCH`; không insert assignment | Trung bình | Repository rollback; không có lệnh insert assignment | PASS |
| TC-05 | Test doubles cho lịch; phiếu đã phân công cho KT002 | Tạo lịch đang overlap; kiểm tra DDL constraint chống overlap | Bắt đầu `2026-10-20T14:00:00+07:00`, dài 60 phút; fixture conflict `BH-900002/2025` | Overlap trả 409 và rollback; DDL khai báo range `[start,end)`; insert liền kề phải được kiểm trên PostgreSQL | Cao | Test repository xác nhận rollback khi overlap; schema test xác nhận exclusion constraint half-open. Chưa chạy insert lịch liền kề trên PostgreSQL thật | PASS |
| TC-06 | Repository fake; ticket `DA_PHAN_CONG`, người phụ trách KT002 | PATCH status; kiểm tra status log và transaction | `DANG_XU_LY`, `changed_by=KT002`, note `Bắt đầu kiểm tra` | Cập nhật status và history atomic | Cao | Test repository thấy UPDATE + INSERT history + COMMIT | PASS |
| TC-07 | HTTP server với TicketService/Repository thật và DB fake; người phụ trách KT002 | PATCH status với actor không khớp | Ticket `BH-900001/2025`; `changed_by=KT999` | 403; không đổi status/history | Cao | HTTP 403 `FORBIDDEN`; transaction ROLLBACK; không UPDATE/INSERT | PASS* |
| TC-08 | Test doubles; phiếu đã phân công, không có lịch overlap | Tạo lịch, đọc, cập nhật, hủy mềm | `BH-900001/2025`, `NHAN_MAY`, `2026-10-20T14:00:00+07:00`, 60 phút | Tạo 201; đọc/cập nhật thành công; hủy mềm giữ row | Trung bình | Repository test tạo lịch, kiểm conflict; CRUD test xác nhận trạng thái mềm/row còn lại | PASS |
| TC-09 | Ticket fixture `MOI`, chưa phân công | Tạo → đọc → cập nhật → đóng mềm | `BH-900099/2025`, `priority=CAO`, `closed_by="manager"` | 201/200; đóng mềm `DA_DONG`, không xóa vật lý | Trung bình | HTTP CRUD test xác nhận response/status và route soft-close | PASS |
| TC-10 | API test server; service dùng repository spy | POST ticket với body thiếu trường; kiểm status, fields, số lần gọi repository | `{}` | 422 `VALIDATION_ERROR`, `fields.ticket_code`; repository không chạy | Cao | HTTP 422; `fields.ticket_code` có mặt; số lần gọi repository = 0. Rubric yêu cầu 400, sai khác ghi ở TD-12 | PASS** |
| TC-11 | Fake migration runner/seed runner | Chạy lần hai; so checksum/số dòng mô phỏng | Migration 001–004; fixture demo | Không lỗi; không tạo dữ liệu trùng | Trung bình | Test doubles PASS. PostgreSQL thật có log ngày 31/10: số dòng không đổi; chưa chạy lại DB thật lần này | PASS*** |
| TC-12 | HTTP server, TicketRepository thật với query fake trả 0 phiếu | GET mã hợp lệ không tồn tại | `BH-900099/2025` | HTTP 404, JSON chung, không lộ stack | Trung bình | HTTP 404 `NOT_FOUND`, thông báo không tìm thấy; body khớp contract | PASS |
| TC-13 | Repository fake; tải hiện tại 14, không bật xác nhận quá tải | Phân công fixture | 14 phiếu mở; ngưỡng 15 | Phân công được; COMMIT | Cao | Test boundary xác nhận insert assignment và COMMIT ở tải 14 | PASS |
| TC-14 | Repository fake; tải hiện tại 15, không bật xác nhận quá tải | Thử phân công fixture | 15 phiếu mở; ngưỡng 15 | 409 `OVERLOAD_CONFIRMATION_REQUIRED`; rollback, không insert | Cao | Test boundary xác nhận lỗi 409, ROLLBACK, không insert | PASS |
| TC-15 | Express JSON parser giới hạn 1 MiB; API test server | POST body lớn hơn giới hạn; kiểm status/body | `{"data":"x…x"}`; body JSON 1 MiB + 11 bytes | 413 `PAYLOAD_TOO_LARGE`, không lộ chi tiết parser | Trung bình | Trước sửa trả 500 (test đỏ); sau sửa HTTP 413 và body JSON chung | PASS |

`*` TC-07 chỉ xác nhận mã actor khác với kỹ thuật viên được giao bị từ chối. Nó **không** chứng minh
actor được xác thực: `changed_by` do client gửi, không bind với session. Giới hạn này được công khai
ở TD-12; không coi đây là kiểm soát phân quyền production.

`**` PASS theo hợp đồng API 422 đã chọn; không có nghĩa đạt rubric 400.

`***` PASS cho test doubles hiện tại; bằng chứng PostgreSQL ngày 31/10 là lịch sử, không phải lần chạy
trong phiên này.

## 5 ca ánh xạ OWASP

| Mã | Tiền điều kiện | Các bước | Dữ liệu thử | Kết quả mong đợi | Ưu tiên | Kết quả thực tế | PASS/FAIL |
|---|---|---|---|---|---|---|---|
| OWASP-A01 | Prototype chỉ có tài khoản quản lý, chưa có tài khoản/vai trò kỹ thuật viên | Xem test TC-02 và TC-07; đối chiếu session với `changed_by` | Cookie session quản lý; `changed_by=KT999` | Không tuyên bố kiểm soát danh tính hoàn chỉnh; ghi rõ giới hạn | Cao | TC-07 chặn actor code không khớp bằng 403; identity binding không được triển khai/không kiểm thử | N/A — giới hạn thiết kế |
| OWASP-A02 | AuthService dùng scrypt và lưu hash phiên | Bootstrap/login; so sánh mật khẩu/hash/token; kiểm tra response login | `manager`, mật khẩu fixture `a-strong-password` | Không lưu mật khẩu rõ; hash/token không trả trong body | Cao | `auth.service.test.js` xác nhận hash scrypt, hash phiên khác token; HTTP response chỉ chứa user | PASS |
| OWASP-A04 | Ticket đã phân công; repo fake trả `DA_PHAN_CONG`; JSON parser giới hạn 1 MiB | Thử nhảy bước trạng thái và gửi body quá giới hạn | `BH-900001/2025`, KT002→`HOAN_TAT`; JSON 1 MiB + 11 bytes | 409 cho chuyển trạng thái sai; 413 cho request quá lớn | Trung bình | Test repository xác nhận rollback/không UPDATE; HTTP regression trước sửa 500, sau sửa 413 | PASS |
| OWASP-A05 | Express app chạy test server | Gọi route không tồn tại; kiểm headers/body | `GET /not-found` | JSON 404; không có `X-Powered-By`; không lộ stack | Thấp | HTTP test xác nhận JSON 404, `X-Powered-By` vắng mặt | PASS |
| OWASP-A07 | AuthService có tài khoản manager fixture | Login với sai mật khẩu; login với username không tồn tại | `manager/incorrect-password`; `missing/incorrect-password` | Cùng HTTP error code/message, không tiết lộ username có tồn tại | Cao | Test xác nhận hai lỗi cùng status 401, code `INVALID_CREDENTIALS`, message giống nhau | PASS |

## Minh chứng, lỗi và việc còn lại

- Chưa có ảnh terminal `docs/screenshots/TC-01.png`…`TC-15.png` và ảnh riêng cho 5 ca OWASP. Ảnh
  trong `docs/evidence/` là ảnh giao diện; không dùng thay ảnh chạy test. Không tạo ảnh giả.
- BUG-01 được sửa trước đây trong commit `408b196`, nhưng commit này gộp nhiều thay đổi chức năng/tài
  liệu, không phải commit riêng chỉ cho BUG-01. Phiên này chỉ tái hiện và sửa thêm BUG-02; các ca 403,
  404, 422 và biên 14/15 đều khớp hành vi đã thiết kế, không phải bug mới. Chưa có căn cứ để ghi nhận
  thêm hai lỗi ứng dụng thật; không bịa bug để đủ số lượng.
- Không có Docker daemon/`psql`; PostgreSQL integration thật chưa chạy lại. Không kiểm thử tích hợp
  trực tiếp L2→L4 vì mã/endpoint L2 không có trong repo.
- REST Client smoke file: `tests/api-smoke.http`. CI workflow mới thêm tại `.github/workflows/ci.yml`;
  chưa có GitHub Actions run để xác nhận.
- Chưa tạo GitHub Release v0.2. Branch hiện là `dev`; cần chốt commit/tag sau khi ảnh terminal được
  tạo và tài liệu được review.

**Kết luận:** npm test PASS (72/72) và build PASS. Checklist nộp vẫn **CHƯA ĐẠT ĐỦ** vì thiếu ảnh test
case, PostgreSQL integration hiện tại, ≥3 bug thật đã sửa bằng commit tách biệt, link commit/push bản
cuối và GitHub Release hoặc quyết định phát hành.
