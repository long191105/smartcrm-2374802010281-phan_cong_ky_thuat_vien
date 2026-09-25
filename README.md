# Smart CRM – Phân công kỹ thuật viên và lịch hẹn

**Sinh viên:** Nguyễn Ngô Ngọc Long – MSSV: 2374802010281
**Track:** SE
**Học phần:** Chuyên đề Tốt nghiệp 1 – Trường ĐH Văn Lang

## 1. Mô tả bài toán
Quản lý trung tâm bảo hành phân công phiếu bảo hành đã tiếp nhận cho kỹ thuật viên phù hợp theo tay nghề, địa bàn và khối lượng công việc hiện tại, đồng thời đặt lịch hẹn giao – nhận máy với khách hàng có kiểm tra trùng lịch. Kết thúc khi kỹ thuật viên cập nhật kết quả xử lý và phiếu chuyển sang trạng thái hoàn tất.

## 2. Phạm vi
- Làm: xem phiếu chưa phân công, gợi ý/phân công kỹ thuật viên theo tay nghề và tải công việc, đặt lịch hẹn có kiểm tra trùng lịch, đổi kỹ thuật viên kèm lý do, xem khối lượng công việc theo kỹ thuật viên.
- Không làm: tiếp nhận/phân loại yêu cầu ban đầu (L2), quản lý tồn kho linh kiện (L5), báo cáo doanh thu (L6), khảo sát hài lòng (L8), tự động phân loại lỗi bằng AI (L10).

## 3. Công nghệ sử dụng
| Thành phần | Công nghệ |
|---|---|
| Frontend | ReactJS |
| Backend | Node.js (Express) |
| Cơ sở dữ liệu | PostgreSQL |
| Công cụ hỗ trợ | Postman, Git/GitHub |

## 4. Cấu trúc thư mục
docs/diagrams/ # SRS, sơ đồ, khai báo AI
src/backend/ # Mã nguồn backend
src/frontend/ # Mã nguồn frontend
tests/ # Test case
.env.example
.gitignore
README.md

## 5. Hướng dẫn cài đặt & chạy
(Hoàn thiện dần trong các buổi thực hành tiếp theo)

## 6. Khai báo sử dụng công cụ AI
| Công cụ | Dùng vào việc gì | Cách tự kiểm chứng |
|---|---|---|
