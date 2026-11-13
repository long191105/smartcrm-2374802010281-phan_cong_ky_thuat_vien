# Bảng khai báo sử dụng công cụ AI — Bài tập 3

Bốn cột: công cụ · dùng vào việc gì · áp dụng ở tệp / hàm nào · em đã kiểm chứng thế nào.

| Công cụ | Dùng vào việc gì | Áp dụng ở tệp / hàm nào | Em đã kiểm chứng thế nào |
|---|---|---|---|
| GitHub Copilot (Copilot SDK trong VS Code) | Rà soát checklist BT3; cập nhật cấu hình Docker/startup; sửa xử lý sự kiện lỗi PostgreSQL pool; chuẩn bị tài liệu, API evidence và báo cáo Word | `src/db/pool.js`, `tests/db.pool.test.js`, `Dockerfile`, `docker-compose.yml`, `src/config.js`, `src/db/initialize.js`, `src/app.js`, `tests/`, `docs/` | `npm test` 78/78, `npm run build` PASS; Docker test chạy thật, DB outage trả HTTP 503, recovery healthy, log scan rỗng; API examples được chụp từ một Compose DB tạm, rồi stack và volume thử nghiệm được xóa. |
**Cam kết:** Tôi xác nhận đã đọc, hiểu và chịu trách nhiệm về toàn bộ nội dung nộp.

Họ tên: Nguyễn Ngô Ngọc Long · MSSV: 2374802010281 · Ngày cập nhật: 13/11/2026
