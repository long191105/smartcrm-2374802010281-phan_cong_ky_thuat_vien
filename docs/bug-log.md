# Nhật ký gỡ lỗi — Giai đoạn 2

## BUG-01 — Lệnh kiểm thử đầy đủ thất bại vì test còn trỏ tới mô-đun L2 đã bị loại khỏi repo

1. **Thời điểm:** 30/10/2026, khi chạy `npm test` trước khi tích hợp CRUD Buổi 12.
2. **Tái lập:** chạy `npm test` ở thư mục gốc với dependencies đã cài.
3. **Hiện tượng:** 44 test hiện hành PASS nhưng `tests/ticket.service.test.js` và
   `tests/ticket.validator.test.js` dừng với `MODULE_NOT_FOUND`.
4. **Mong đợi:** một lệnh trong README chạy toàn bộ test của sản phẩm và trả mã thoát 0.
5. **Khoanh vùng/nguyên nhân:** hai test nhập `src/services/ticket.service` và
   `src/validators/ticket.validator`, là API tiếp nhận L2 cũ; kiến trúc hiện tại dùng
   `src/services/ticket-l4.service.js` và Zod qua `src/validation.js`.
6. **Sửa nguyên nhân:** chuyển hai bộ test sang xác nhận hợp đồng CRUD L4 và dữ liệu sai; giữ các
   test trong lệnh chạy đầy đủ, không bỏ qua hoặc lọc lỗi.
7. **Xác nhận:** `npm test` PASS 63/63; `npm run test:l4` PASS 55/55; `npm run build` PASS.
   Migration `004_ticket_crud.sql` và seed `001_demo.sql` đã chạy hai lần trên database PostgreSQL
   phát triển `smartcrm_l4_workshop`; lần thứ hai migration được bỏ qua đúng checksum và seed chạy
   lại thành công. Kiểm thử CRUD thật qua PostgreSQL PASS cho tạo/đọc/sửa/đóng mềm phiếu và
   tạo/đọc/sửa/hủy mềm lịch hẹn; các bản ghi chỉ dùng cho kiểm thử đã được dọn. Không tạo commit
   riêng trong lượt này.
