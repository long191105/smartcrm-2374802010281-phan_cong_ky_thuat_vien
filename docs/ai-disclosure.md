# Bảng khai báo sử dụng công cụ AI — Bài tập 2

Bốn cột: công cụ · dùng vào việc gì · áp dụng ở tệp / hàm nào · em đã kiểm chứng thế nào.

| Công cụ | Dùng vào việc gì | Áp dụng ở tệp / hàm nào | Em đã kiểm chứng thế nào |
|---|---|---|---|
| Claude (trợ lý AI dạng chat) | Đọc phản hồi BT1, đề BT2 và repo mẫu; đề xuất quyết định SỬA / GIỮ và soạn nháp nhật ký thay đổi | `docs/thay-doi-thiet-ke.md` (TD-01…TD-07) | Các quyết định được ghi lại trong nhật ký thay đổi; cần đối chiếu với phản hồi gốc của giảng viên trước khi nộp. |
| GitHub Copilot (AI assistant trong VS Code) | Đọc và đối chiếu toàn bộ tài liệu Workshop Buổi 12 với repo; hỗ trợ hiện thực API CRUD an toàn cho phiếu/lịch hẹn, migration, test và tài liệu báo cáo | `src/services/ticket-l4.service.js`, `src/repositories/ticket.repository.js`, `src/services/appointment.service.js`, `src/repositories/appointment.repository.js`, `migrations/004_ticket_crud.sql`, `tests/`, README/docs | Đã rà soát mã nguồn; chạy `npm test`, `npm run test:l4`, `npm run build`; chạy migration và seed hai lần trên PostgreSQL local; kiểm thử CRUD phiếu/lịch hẹn thật qua PostgreSQL, gồm đóng/hủy mềm, rồi dọn các bản ghi kiểm thử. |
**Cam kết:** Tôi xác nhận đã đọc, hiểu và chịu trách nhiệm về toàn bộ nội dung nộp.

Họ tên: Nguyễn Ngô Ngọc Long · MSSV: 2374802010281 · Ngày cập nhật: 30/10/2026
