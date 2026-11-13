# Nhật ký gỡ lỗi — Bài tập 3

Mỗi bug có đủ bảy trường: mức độ, test/phép kiểm phát hiện, triệu chứng, cách tái lập, nguyên nhân,
cách sửa, và xác nhận kèm commit.

## BUG-01 — Bộ test cũ làm `npm test` thất bại

1. **Mã/mức độ:** BUG-01 — **Major**.
2. **Phát hiện bởi:** lần chạy đầy đủ `npm test` ngày 30/10/2026 trước khi tích hợp CRUD Buổi 12;
   các suite cũ `tests/ticket.service.test.js` và `tests/ticket.validator.test.js` không tải được module.
3. **Triệu chứng:** các test hiện hành khác chạy được nhưng hai suite dừng với `MODULE_NOT_FOUND`;
   mong đợi là lệnh test đầy đủ thoát mã 0.
4. **Tái lập:** chạy `npm test` ở thư mục gốc với dependencies đã cài.
5. **Nguyên nhân:** hai suite import API L2 đã bị loại (`src/services/ticket.service` và
   `src/validators/ticket.validator`), trong khi L4 dùng `ticket-l4.service.js` và Zod.
6. **Sửa:** chuyển suite sang hợp đồng CRUD L4 và dữ liệu sai; giữ chúng trong lệnh test đầy đủ.
7. **Xác nhận/commit:** lần chạy sau đạt 63/63; ngày 31/10/2026 đạt 67/67 và `npm run build` PASS.
   [Commit 408b196](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/commit/408b196)
   là commit chung, không phải commit riêng cho BUG-01. Phần sửa cụ thể nằm ở
   `tests/ticket.service.test.js` và `tests/ticket.validator.test.js`: các suite được chuyển khỏi import
   service/validator L2 đã xóa sang `ticket-l4.service.js`/Zod, đồng thời thay test bằng các case CRUD L4
   và validation hiện hành. Xác minh bằng
   `git show 408b196 -- tests/ticket.service.test.js tests/ticket.validator.test.js`.

## BUG-02 — JSON vượt giới hạn bị báo nhầm là lỗi hệ thống

1. **Mã/mức độ:** BUG-02 — **Major**.
2. **Phát hiện bởi:** BT3-10, test biên body lớn hơn giới hạn 1 MiB.
3. **Triệu chứng:** trước sửa, body-parser phát `entity.too.large` nhưng middleware trả HTTP 500
   `INTERNAL_ERROR` thay vì 413.
4. **Tái lập:** gửi `POST /api/auth/login` với `Content-Type: application/json` và body lớn hơn 1 MiB;
   hoặc chạy `node --test --test-name-pattern="oversized JSON requests" tests/app.test.js`.
5. **Nguyên nhân:** error middleware không ánh xạ lỗi kích thước từ `express.json({ limit: '1mb' })`.
6. **Sửa:** ánh xạ `type === 'entity.too.large'` và status 413 thành `PAYLOAD_TOO_LARGE`; thêm assertion HTTP.
7. **Xác nhận/commit:** test hồi quy trước sửa tái hiện 500; sau sửa test riêng và `npm test` PASS,
   response là 413. [Commit 3b52a0e](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/commit/3b52a0e).

## BUG-03 — PostgreSQL được publish trực tiếp ra host

1. **Mã/mức độ:** BUG-03 — **Major**.
2. **Phát hiện bởi:** kiểm tra cấu hình Compose khi rà tiêu chí đóng gói C1 ngày 12/11/2026;
   đây là kiểm tra cấu hình thủ công, không phải test tự động.
3. **Triệu chứng:** cấu hình trước sửa mở cổng PostgreSQL 5432 trên host, trái yêu cầu chỉ truy cập
   trong mạng Compose.
4. **Tái lập:** kiểm tra cấu hình `docker-compose.yml` trước sửa và thấy mapping
   `${DB_PORT:-5432}:5432` dưới dịch vụ `db`.
5. **Nguyên nhân:** cấu hình Compose khi đó có chủ đích cho phép kết nối PostgreSQL từ công cụ trên host
   bằng ánh xạ `ports: ["${DB_PORT:-5432}:5432"]`; cấu hình này không giới hạn quyền truy cập vào mạng
   Compose nội bộ.
6. **Sửa:** bỏ `ports` khỏi `db`, dùng dịch vụ API `app`, và thêm healthcheck `/health`.
7. **Xác nhận/commit:** clean-clone ngày 13/11 cho thấy `db` chỉ có `5432/tcp`, không có host mapping;
   cả `db` và `app` đều healthy. [Commit 8722b8a](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/commit/8722b8a).

## BUG-04 — Mất kết nối PostgreSQL làm tiến trình API thoát

1. **Mã/mức độ:** BUG-04 — **Major**.
2. **Phát hiện bởi:** BT3-11, phép thử outage/recovery trên clean-clone Docker ngày 13/11/2026.
3. **Triệu chứng:** trước sửa, dừng DB làm tiến trình app thoát mã 1; client nhận HTTP 000 và log có
   đối tượng lỗi pg thay vì lỗi được xử lý an toàn.
4. **Tái lập:** chạy `docker compose stop db`, sau đó gọi `GET /health`; trước sửa app thoát.
5. **Nguyên nhân:** sự kiện `error` của `pg.Pool` cho client idle không có listener; EventEmitter kết thúc Node.
6. **Sửa:** gắn listener pool chỉ ghi thông báo chung; health handler trả 503 JSON khi truy vấn DB lỗi.
7. **Xác nhận/commit:** sau sửa, `/health` trả HTTP 503 `{"status":"error","db":"down"}` khi DB dừng,
   app vẫn chạy và trả HTTP 200 sau khôi phục; `npm test` PASS 78/78.
   [Commit b80b682](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/commit/b80b682).
