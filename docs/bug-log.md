# Nhật ký gỡ lỗi — Giai đoạn 2

## BUG-01 — Lệnh kiểm thử đầy đủ thất bại vì test còn trỏ tới mô-đun L2 đã bị loại khỏi repo

1. **Thời điểm:** 30/10/2026, khi chạy `npm test` trước khi tích hợp CRUD Buổi 12.
2. **Tái lập:** chạy `npm test` ở thư mục gốc với dependencies đã cài.
3. **Mức độ/Hiện tượng:** **Major** — 44 test hiện hành PASS nhưng `tests/ticket.service.test.js` và
   `tests/ticket.validator.test.js` dừng với `MODULE_NOT_FOUND`.
4. **Mong đợi:** một lệnh trong README chạy toàn bộ test của sản phẩm và trả mã thoát 0.
5. **Khoanh vùng/nguyên nhân:** hai test nhập `src/services/ticket.service` và
   `src/validators/ticket.validator`, là API tiếp nhận L2 cũ; kiến trúc hiện tại dùng
   `src/services/ticket-l4.service.js` và Zod qua `src/validation.js`.
6. **Sửa nguyên nhân:** chuyển hai bộ test sang xác nhận hợp đồng CRUD L4 và dữ liệu sai; giữ các
   test trong lệnh chạy đầy đủ, không bỏ qua hoặc lọc lỗi.
7. **Xác nhận:** lần chạy ban đầu `npm test` PASS 63/63; ngày 31/10/2026 chạy lại `npm test`
   PASS 67/67 (0 fail, 0 skipped) và `npm run build` PASS, cả hai lệnh có mã thoát 0.
   Migration/seed và CRUD được xác minh trên một PostgreSQL database riêng
   `smartcrm_l4_bt2_c5_20261031`, không chạy lặp trên database workshop. Phần cập nhật test nằm trong
   commit [408b196](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/commit/408b196), commit này cũng thay đổi nhiều file chức năng/tài liệu nên không phải commit riêng
   cho BUG-01.

## Cập nhật kiểm chứng C5 và CRUD — 31/10/2026

1. Tạo database PostgreSQL cô lập `smartcrm_l4_bt2_c5_20261031`.
2. Chạy `npm run migrate`, `npm run seed`, rồi chạy lại cả hai lệnh. Lượt migrate thứ hai bỏ qua
   đủ bốn migration theo checksum; số dòng sau seed lần 1 và lần 2 không đổi:
   technician 2, technician_skill 7, ticket 18, ticket_assignment 17,
   ticket_status_log 18, appointment 0; hai bảng xác thực vẫn rỗng trước bootstrap.
3. Qua API HTTP có xác thực, thực hiện create/read/update/soft-delete cho ticket và appointment.
   Ticket được lưu với trạng thái `DA_DONG`; appointment được lưu với trạng thái `KHACH_HUY`.
   Đọc lại từ PostgreSQL xác nhận các bản ghi vẫn tồn tại theo đúng trạng thái mềm.
4. Xóa database cô lập sau xác minh. Log kết quả và mã thoát 0 nằm tại
   `docs/evidence/09-c5-crud-validation.txt`.

## BUG-02 — JSON vượt giới hạn bị báo nhầm là lỗi hệ thống

1. **Thời điểm:** 11/11/2026, khi bổ sung kiểm thử giới hạn request HTTP.
2. **Tái lập:** gửi `POST /api/auth/login` với `Content-Type: application/json` và JSON body lớn hơn
   1 MiB; có thể tái lập bằng `node --test --test-name-pattern="oversized JSON requests" tests/app.test.js`.
3. **Mức độ/Hiện tượng trước sửa:** **Major** — body-parser báo `entity.too.large`, nhưng middleware trả HTTP 500
   `INTERNAL_ERROR` thay vì 413.
4. **Mong đợi:** HTTP 413 với lỗi JSON chung, không trả stack/chi tiết parser.
5. **Nguyên nhân:** error middleware chỉ ánh xạ JSON sai cú pháp và `AppError`; lỗi kích thước từ
   `express.json({ limit: '1mb' })` rơi vào nhánh lỗi hệ thống mặc định.
6. **Sửa nguyên nhân:** ánh xạ rõ `type === 'entity.too.large'` và status 413 thành
   `PAYLOAD_TOO_LARGE`; thêm assertion HTTP kiểm status/body.
7. **Xác nhận:** test hồi quy trước sửa tái hiện 500 (1 FAIL); sau sửa test riêng và `npm test`
   PASS, response là 413. Sửa code/test nằm riêng trong commit
   [3b52a0e](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/commit/3b52a0e).

## BUG-03 — PostgreSQL được publish trực tiếp ra host

1. **Thời điểm:** 12/11/2026, khi rà soát yêu cầu đóng gói BT3.
2. **Tái lập:** kiểm tra cấu hình Compose trước sửa; dịch vụ `db` có mapping
   `${DB_PORT:-5432}:5432`.
3. **Mức độ/Hiện tượng:** **Major** — PostgreSQL nhận kết nối từ host qua cổng 5432, trái với yêu cầu chỉ truy cập trong
   mạng nội bộ của Compose.
4. **Mong đợi:** không khai báo `ports` cho `db`; chỉ ứng dụng `app` được publish.
5. **Nguyên nhân:** cấu hình Compose phục vụ thử nghiệm local trước đây mở cổng database ra host.
6. **Sửa nguyên nhân:** bỏ mapping cổng DB, đổi dịch vụ API thành `app`, và thêm healthcheck dịch vụ
   ứng dụng qua `/health`.
7. **Xác nhận:** `docker-compose.yml` không khai báo `ports` cho `db`; lần chạy Docker ngày
   13/11/2026 xác nhận `db` chỉ hiện `5432/tcp` trong mạng Compose và cả `db`, `app` đều healthy.
   Phần thay đổi được ghi trong commit
   [8722b8a](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/commit/8722b8a).

## BUG-04 — PostgreSQL mất kết nối làm tiến trình API thoát

1. **Thời điểm:** 13/11/2026, khi kiểm thử tắt dịch vụ `db` trong lúc `app` đang chạy.
2. **Tái lập:** chạy `docker compose stop db`, sau đó gọi `GET /health`. Trước khi sửa, app thoát
   với mã 1; client nhận HTTP 000 và log có đối tượng lỗi pg.
3. **Mức độ/Hiện tượng:** **Major** — sự cố DB làm API ngừng phục vụ thay vì trả trạng thái lỗi có kiểm soát.
4. **Mong đợi:** tiến trình app tiếp tục chạy, `/health` trả HTTP 503 với
   `{"status":"error","db":"down"}`; không ghi chi tiết lỗi nội bộ; khôi phục DB thì app healthy lại.
5. **Nguyên nhân:** sự kiện `error` của `pg.Pool` cho client đang idle không có listener; EventEmitter
   phát sự kiện `error` không được xử lý và kết thúc tiến trình Node.
6. **Sửa nguyên nhân:** gắn listener `error` cho pool và chỉ ghi thông báo chung, không in đối tượng
   lỗi; health handler hiện có ánh xạ truy vấn DB thất bại thành 503 JSON.
7. **Xác nhận:** `npm test` PASS 78/78; chạy Docker thật ngày 13/11: tắt DB trả HTTP 503 đúng JSON,
   app vẫn chạy; bật DB lại thì `/health` trả 200 và hai dịch vụ healthy. Sửa code/test trong commit
   [b80b682](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/commit/b80b682).
