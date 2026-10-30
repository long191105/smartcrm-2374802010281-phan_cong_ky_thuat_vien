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
7. **Xác nhận:** lần chạy ban đầu `npm test` PASS 63/63; ngày 31/10/2026 chạy lại `npm test`
   PASS 67/67 (0 fail, 0 skipped) và `npm run build` PASS, cả hai lệnh có mã thoát 0.
   Migration/seed và CRUD được xác minh trên một PostgreSQL database riêng
   `smartcrm_l4_bt2_c5_20261031`, không chạy lặp trên database workshop.

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
