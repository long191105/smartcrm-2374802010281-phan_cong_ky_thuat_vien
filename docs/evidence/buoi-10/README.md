# Minh chứng giao diện và luồng end-to-end Buổi 10

## Ảnh trạng thái giao diện

| Ảnh | Nội dung |
|---|---|
| `01-trang-thai-chua-co-du-lieu.png` | Danh sách chưa có dữ liệu |
| `02-trang-thai-rong-loc.png` | Bộ lọc không trả kết quả |
| `03-cong-viec-da-cap-nhat.png` | Công việc có trạng thái đã cập nhật |
| `04-trang-thai-loi.png` | Lỗi API và hành động Thử lại |

## Ảnh luồng nghiệp vụ chạy tuần tự

Các ảnh sau được chụp ở desktop 1600×1000 trong lần chạy trên PostgreSQL database tạm, đã nạp migration và fixture demo. Luồng thực tế được thực hiện qua cookie phiên và API:

1. `05-dang-nhap.png` — màn hình đăng nhập trước khi xác thực.
2. `06-m1-phan-cong-thanh-cong.png` — đăng nhập thành công, phân công `BH-900001/2025` cho `KT002` sau khi xác nhận quá tải; CTA mở phiếu đó ở M2.
3. `07-m2-dat-lich-thanh-cong.png` — đặt lịch cho cùng phiếu; CTA chuyển sang M3 với đúng phiếu và kỹ thuật viên.
4. `08-m3-cap-nhat-thanh-cong.png` — cập nhật phiếu sang `DANG_XU_LY`.

Sau khi hoàn tất, trạng thái phiếu và lịch hẹn được đọc lại từ PostgreSQL để xác minh đã lưu. Database kiểm thử tạm được xóa; database cấu hình của người dùng không bị dùng cho các thao tác ghi của lần chạy này.

Các ảnh 01–04 minh họa từng trạng thái riêng, không phải ảnh chụp liên tiếp của cùng một luồng. Các ảnh 05–08 là bộ minh chứng tuần tự của luồng đăng nhập → phân công → đặt lịch → cập nhật công việc.
