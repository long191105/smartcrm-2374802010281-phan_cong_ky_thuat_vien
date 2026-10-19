Phiếu đăng ký phạm vi 

Họ tên: Nguyễn Ngô Ngọc Long MSSV: 2374802010281  Track: [ ✓] SE [ ] DA [ ] AI

1. LUỒNG NGHIỆP VỤ CHỌN
(Chọn 1 trong danh mục L1–L10 của case study)
Mã luồng: L4  Tên luồng: Phân công kỹ thuật viên và lịch hẹn

2. PHẠM VI DIỄN ĐẠT BẰNG MỘT CÂU
Quản lý phân công kỹ thuật viên và đặt lịch hẹn bảo hành: quản lý trung tâm chọn phiếu bảo hành đã tiếp nhận, hệ thống gợi ý kỹ thuật viên phù hợp theo tay nghề (nhóm sự cố), địa bàn (trung tâm làm việc) và khối lượng phiếu đang xử lý, quản lý xác nhận phân công và đặt lịch hẹn giao – nhận máy với khách hàng có kiểm tra trùng lịch của kỹ thuật viên, kết thúc khi kỹ thuật viên cập nhật kết quả xử lý và chuyển phiếu về trạng thái hoàn tất.

3. DANH SÁCH SƠ BỘ 5–7 USER STORY DỰ KIẾN
US1. Là quản lý trung tâm bảo hành, tôi muốn xem danh sách phiếu bảo hành chưa được phân công để phân việc kịp thời cho kỹ thuật viên, tránh phiếu bị bỏ sót trong khay chờ.
US2. Là quản lý trung tâm bảo hành, tôi muốn hệ thống gợi ý kỹ thuật viên phù hợp theo nhóm sự cố (tay nghề ≥ mức yêu cầu), cùng trung tâm và số phiếu đang xử lý, để phân công đúng chuyên môn và cân bằng khối lượng công việc giữa các kỹ thuật viên.
US3. Là kỹ thuật viên, tôi muốn xem danh sách phiếu được gán cho tôi sắp theo hạn cam kết để ưu tiên xử lý phiếu sắp quá hạn trước.
US4. Là quản lý trung tâm bảo hành, tôi muốn đặt lịch hẹn giao – nhận máy với khách hàng và được hệ thống cảnh báo nếu trùng lịch của kỹ thuật viên, để tránh chồng chéo thời gian giữa các cuộc hẹn.
US5. Là quản lý trung tâm bảo hành, tôi muốn đổi kỹ thuật viên phụ trách một phiếu kèm lý do khi cần thiết, để xử lý các trường hợp phát sinh như nghỉ việc hoặc quá tải công việc.
US6. Là quản lý trung tâm bảo hành, tôi muốn xem bảng tổng hợp số phiếu đang xử lý của từng kỹ thuật viên để phát hiện và điều chỉnh tình trạng lệch khối lượng công việc.
US7. Là khách hàng, tôi muốn nhận thông báo nhắc lịch hẹn giao – nhận máy để chủ động sắp xếp thời gian đến trung tâm bảo hành.


4. DỮ LIỆU SẼ LÀM VIỆC
[✓] Sinh mô phỏng  [✓] Dùng dữ liệu mẫu của case study
Ước lượng số bản ghi cần thiết: khoảng 1.000–1.500 bản ghi (kỹ thuật viên, tay nghề, trung tâm, phiếu mẫu và lịch hẹn sinh thêm).

5. CÔNG NGHỆ DỰ KIẾN
(Ngôn ngữ / framework / CSDL hoặc công cụ chính)
Prototype buổi 8: Backend Node.js 20+ (Express 4), PostgreSQL 16+ và API REST/JSON; frontend chưa thuộc lát cắt triển khai. Dùng Postman/curl kiểm thử API, Git/GitHub quản lý mã nguồn.

## Chạy backend (Bước 2)

### Yêu cầu môi trường

Node.js 20 LTS, npm 10 và PostgreSQL 16 (có thể chạy PostgreSQL bằng Docker; dùng SQLite nếu cần).
Cấu hình biến môi trường theo `.env.example`, gồm `DATABASE_URL` và `PORT`.

Backend dùng Express. Điểm khởi chạy là `src/server.js`;
`src/app.js` cấu hình HTTP routes/middleware, còn `src/db/pool.js` tạo connection pool.

### Chạy API cục bộ

1. Cài Node.js 20 LTS, npm 10 và khởi động PostgreSQL 16 (hoặc PostgreSQL bằng Docker).
2. Sao chép `.env.example` thành `.env` và cấu hình `DATABASE_URL` cùng `PORT`. Không commit `.env`.
3. Tại thư mục gốc repository, tạo schema:

   ```powershell
   npm install
   npm run migrate
   ```

4. Khởi chạy API:

   ```powershell
   npm start
   ```

5. API dùng cổng `PORT` (mặc định `8000`). Kiểm tra
   `http://localhost:<cổng>/health` để xác nhận API đang chạy và
   `http://localhost:<cổng>/health/ready` để kiểm tra kết nối PostgreSQL.

Lệnh `npm run test:l4` chạy bộ kiểm thử module L4; `npm test` chạy toàn bộ test trong repository.
`npm run migrate` chạy các tệp SQL trong `migrations/` theo thứ tự tên tệp và ghi checksum để phát
hiện migration đã áp dụng bị sửa. `npm run seed` nạp bộ fixture demo, có
thể chạy lại mà không tạo trùng dữ liệu. Chỉ chạy các lệnh này trên cơ sở dữ liệu phát triển/kiểm thử;
không chạy migration chưa xác minh lên dữ liệu cần giữ.

Để dùng dữ liệu Track SE–L4, giải nén ZIP dataset sao cho sáu tệp `service_centers.csv`,
`issue_categories.csv`, `technicians.csv`, `technician_skills.csv`, `tickets_history.csv` và
`ticket_status_log.csv` nằm trong `data/raw/dataset/`, rồi chạy `npm run import:dataset` trước
`npm run seed`. Có thể đặt `DATASET_DIR` để chỉ tới thư mục CSV khác. Dữ liệu thô không được commit;
script ánh xạ ID trung tâm/nhóm sự cố sang mã/tên nguồn và chỉ sinh phân công hiện hành cho các phiếu
đang mở. Lệnh seed thêm một phiếu `MOI` để thử UC1; chỉ tạo 17 phiếu workload tổng hợp khi chưa có
phiếu lịch sử nguồn. Timestamp nguồn không kèm múi giờ được hiểu là giờ Việt Nam UTC+07.

### Chạy bằng Docker Compose

Sau khi cấu hình `.env`, chạy `docker compose up --build`. API được publish ở cổng `API_PORT`
(mặc định 8000); PostgreSQL ở `DB_PORT` (mặc định 5432). Dữ liệu PostgreSQL được giữ trong volume
`db_data`; khi volume mới được tạo, PostgreSQL tự chạy schema và fixture. `docker compose down -v`
sẽ xóa volume và dữ liệu đó.

### Trạng thái tại Buổi 8

- [✓] Đã xử lý feedback BT1 → `docs/thay-doi-thiet-ke.md`.
- [✓] Cấu trúc `src/` theo kiến trúc 4 lớp.
- [✓] Migration + seed chạy được.
- [✓] CRUD Ticket qua 3 lớp.
- [ ] AssignService (phân công kỹ thuật viên) – Buổi 9–10.
- [ ] Appointment + kiểm tra trùng lịch.
- [ ] Tối thiểu 3 test case.

Việc tiếp nhận/tạo phiếu và xóa phiếu thuộc L2 hoặc thao tác phá hủy dữ liệu, không đưa vào API L4;
module hiện cung cấp đọc danh sách phiếu và các thao tác phân công đúng phạm vi SRS.
`schema_migrations` là bảng metadata phục vụ theo dõi checksum, không phải thực thể nghiệp vụ trong
ERD sáu bảng. Migration dừng nếu phát hiện bảng từ schema cũ; cần backup và dùng CSDL phát triển L4
mới thay vì tự động xóa hoặc chuyển dữ liệu.
