# Smart CRM — Track SE, Luồng L4

Prototype quản lý **phân công kỹ thuật viên và lịch hẹn bảo hành**. Dự án gồm API Node.js/Express,
cơ sở dữ liệu PostgreSQL và giao diện Vite. Giao diện desktop có ba màn hình:

1. **Phân công** — xem phiếu mới, lọc theo trung tâm/nhóm sự cố, xem gợi ý kỹ thuật viên, xác nhận phân công.
2. **Lịch hẹn** — chọn phiếu đã phân công, đặt lịch giao/nhận, xem lịch trong ngày và cảnh báo trùng lịch.
3. **Công việc của tôi** — chọn kỹ thuật viên, xem phiếu theo hạn cam kết, cập nhật trạng thái hợp lệ và xem lịch sử.

Nguồn dữ liệu nghiệp vụ, tên trường và quy tắc được mô tả trong [`docs/srs.md`](./docs/srs.md),
[`docs/api_contract.md`](./docs/api_contract.md) và các wireframe trong [`docs/wireframe/`](./docs/wireframe/).

## 1. Yêu cầu môi trường

- Node.js **20 trở lên** và npm đi kèm Node.js.
- PostgreSQL **16 trở lên**, hoặc Docker Desktop đã cài và đang chạy.
- Git để lấy mã nguồn.
- Windows PowerShell (các lệnh bên dưới dùng cú pháp PowerShell).

Kiểm tra Node.js/npm:

```powershell
node --version
npm --version
```

## 2. Cài đặt lần đầu

Mở PowerShell tại thư mục gốc dự án (thư mục có `package.json`), sau đó cài các package:

```powershell
npm install
```

Tạo file cấu hình riêng từ mẫu:

```powershell
Copy-Item .env.example .env
```

Mở `.env`, thay cấu hình cơ sở dữ liệu cho máy của bạn. Không commit hoặc gửi file `.env` vì file có
thể chứa mật khẩu local.

```dotenv
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smartcrm_l4_workshop
DB_USER=postgres
DB_PASSWORD=mat_khau_postgres_cua_ban

APP_PORT=8000
AUTH_COOKIE_SECURE=false
AUTH_BOOTSTRAP_USERNAME=manager
AUTH_BOOTSTRAP_PASSWORD=mat_khau_rieng_it_nhat_12_ky_tu
AUTH_BOOTSTRAP_DISPLAY_NAME=Quan ly trung tam

VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8000
```

API nhận cấu hình DB qua `DATABASE_URL` nếu biến này được khai báo; nếu không, API dùng nhóm
`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. Cổng API local là `APP_PORT` (hoặc `PORT`),
mặc định `8000`. Frontend dùng `VITE_API_BASE_URL`; khi phát triển, Vite chuyển tiếp `/api` đến
`VITE_API_PROXY_TARGET`. `AUTH_COOKIE_SECURE` đặt `true` khi chạy qua HTTPS; để `false` khi chạy local
qua HTTP. Mật khẩu bootstrap tối thiểu 12 ký tự; không dùng mật khẩu ví dụ ở trên làm mật khẩu thật.

## 3. Chạy bằng PostgreSQL cài trên máy

### 3.1 Khởi động PostgreSQL

Đảm bảo PostgreSQL đang chạy và database/user/mật khẩu tương ứng với `.env` đã được tạo. Ví dụ nếu
đã cài PostgreSQL với user `postgres`, tạo database rỗng tên `smartcrm_l4_workshop` nếu database đó
chưa tồn tại.

### 3.2 Tạo cấu trúc bảng và dữ liệu mẫu

Chỉ chạy các lệnh migrate/seed trên database phát triển hoặc kiểm thử:

```powershell
npm run migrate
npm run seed
```

- `npm run migrate` áp dụng các SQL trong `migrations/` theo thứ tự tên tệp. Migration lưu checksum
  để phát hiện migration đã áp dụng bị sửa; khi cần thay đổi schema, hãy thêm migration mới thay vì
  sửa migration cũ.
- `npm run seed` nạp fixture trong `seeds/`. Có thể chạy lại seed; các fixture demo được viết để
  tránh tạo trùng dữ liệu.

### 3.3 Tạo tài khoản đăng nhập ban đầu

Đặt `AUTH_BOOTSTRAP_USERNAME`, `AUTH_BOOTSTRAP_PASSWORD` và `AUTH_BOOTSTRAP_DISPLAY_NAME` trong
`.env`, sau đó tạo tài khoản:

```powershell
npm run auth:bootstrap
```

Lệnh này tạo hoặc cập nhật tài khoản, chỉ lưu hash scrypt của mật khẩu và thu hồi phiên cũ nếu đặt
lại mật khẩu. Không có đăng ký công khai; không commit hoặc gửi file `.env`.

### 3.4 Khởi động backend

Mở terminal thứ nhất ở thư mục gốc:

```powershell
npm start
```

API mặc định chạy tại `http://localhost:8000`. Có thể xác nhận API và database:

```powershell
curl.exe http://localhost:8000/health
curl.exe http://localhost:8000/health/ready
```

`/health` kiểm tra tiến trình API; `/health/ready` kiểm tra khả năng kết nối PostgreSQL.

### 3.5 Khởi động giao diện

Giữ backend đang chạy. Mở terminal thứ hai cũng ở thư mục gốc:

```powershell
npm run dev
```

Mở địa chỉ Vite được in ra trong terminal, thường là `http://localhost:5173`. Khi phát triển, trình
duyệt gọi API qua Vite proxy; backend phải được chạy trước. Nếu backend không ở cổng 8000, cập nhật
`VITE_API_PROXY_TARGET` trong `.env` rồi khởi động lại Vite.

Thanh menu đầu trang có ba mục điều hướng: **Phân công**, **Lịch hẹn** và **Công việc của tôi**.
Luồng thao tác chính đi theo thứ tự: phân công phiếu ở M1 → liên kết **Tiếp tục: đặt lịch hẹn** mở
đúng phiếu ở M2 → sau khi đặt lịch, liên kết **Tiếp tục: cập nhật công việc** mở phiếu cùng kỹ thuật
viên ở M3 → cập nhật trạng thái. Mã phiếu được truyền qua bộ lọc chính xác của API, vì vậy bước M2
không phụ thuộc phiếu nằm ở trang phân trang nào. Sau khi cập nhật, có thể quay lại M1 để xử lý phiếu
tiếp theo.

### 3.6 Dừng ứng dụng

- Backend và Vite: nhấn `Ctrl+C` trong từng terminal.
- PostgreSQL cài trên máy: dừng dịch vụ bằng công cụ/Services của PostgreSQL, nếu muốn.

## 4. Cách chạy PostgreSQL bằng Docker Compose

Docker Compose khởi chạy PostgreSQL và API. Cần Docker Desktop hoạt động trước khi chạy lệnh.

1. Tạo/cập nhật `.env` như mục 2. Giá trị DB trong compose được đọc từ `DB_NAME`, `DB_USER`,
   `DB_PASSWORD`; cổng host có thể đặt qua `DB_PORT` và `API_PORT`.
2. Khởi động dịch vụ:

   ```powershell
   docker compose up --build -d
   ```

3. Xem trạng thái container và log:

   ```powershell
   docker compose ps
   docker compose logs -f db api
   ```

4. Chờ database healthy, sau đó kiểm tra API:

   ```powershell
   curl.exe http://localhost:8000/health
   curl.exe http://localhost:8000/health/ready
   ```

   `API_PORT` mặc định là `8000`; nếu đổi cổng, thay URL tương ứng.

5. Để chạy giao diện khi backend ở Docker, mở terminal thứ hai và chạy Vite:

   ```powershell
   npm run dev
   ```

   Mặc định Vite proxy đến `http://localhost:8000`. Nếu đổi `API_PORT`, cập nhật
   `VITE_API_PROXY_TARGET` trong `.env` cho đúng.

6. Dừng container nhưng vẫn giữ dữ liệu PostgreSQL:

   ```powershell
   docker compose down
   ```

   PostgreSQL giữ dữ liệu trong volume `db_data`. Lệnh
   `docker compose down -v` **xóa volume và toàn bộ dữ liệu trong volume đó**; chỉ dùng khi chủ động
   muốn khởi tạo database Docker lại từ đầu.

Khi Docker tạo volume database mới, PostgreSQL tự chạy các tệp init được mount từ `migrations/` và
`seeds/`. Nếu volume đã có dữ liệu, init script không tự chạy lại.
Nếu dùng volume được tạo trước migration xác thực, chạy `npm run migrate` từ host sau khi PostgreSQL
Docker khởi động; sau đó cấu hình tài khoản trong `.env` và chạy `npm run auth:bootstrap`.

## 5. Nạp dataset Track SE–L4

Dataset nguồn không đi kèm trong Git. Nếu được cung cấp ZIP, giải nén sáu tệp sau vào thư mục
`data/raw/dataset/`:

- `service_centers.csv`
- `issue_categories.csv`
- `technicians.csv`
- `technician_skills.csv`
- `tickets_history.csv`
- `ticket_status_log.csv`

Sau khi database đã migrate, chạy:

```powershell
npm run import:dataset
npm run seed
```

Có thể đặt `DATASET_DIR` để trỏ tới thư mục CSV khác trước khi chạy import:

```powershell
$env:DATASET_DIR = "D:\du-lieu\dataset"
npm run import:dataset
Remove-Item Env:DATASET_DIR
```

Không commit dữ liệu thô hoặc thông tin khách hàng. Dữ liệu timestamp nguồn không có múi giờ được
hiểu là giờ Việt Nam UTC+07. Bộ CSV lịch sử có thể không có phiếu `MOI`; seed demo tạo fixture chờ
phân công để thử luồng M1. Seed chỉ thêm workload tổng hợp khi chưa có phiếu lịch sử nguồn.

## 6. Build giao diện và chạy production local

Tạo bản build frontend:

```powershell
npm run build
```

Vite ghi bản build vào `dist/`. Khi thư mục build tồn tại, Express phục vụ giao diện ở
`http://localhost:8000/`. Chạy `npm start` để mở API và bản build. Các lệnh `npm run dev` và
`npm run build` cần dependency phát triển Vite từ `npm install`.

## 7. Kiểm thử

Chạy bộ kiểm thử L4 được cấu hình cho API, service, repository, schema, import dữ liệu và hợp đồng
mapper:

```powershell
npm run test:l4
```

Chạy toàn bộ test Node.js:

```powershell
npm test
```

Các test cần database giả lập cho repository/API và không yêu cầu database PostgreSQL chạy. Test
end-to-end với database thật cần PostgreSQL đã cấu hình và migrate trước. Hiện `npm test` còn chạy
hai test L2 cũ đang import các module không có trong codebase (`src/services/ticket.service` và
`src/validators/ticket.validator`), nên lệnh này chưa thể xanh toàn bộ. Dùng `npm run test:l4` để
kiểm tra phạm vi L4; không xóa hoặc bỏ qua hai test cũ để che lỗi.

## 8. API chính

Base path là `/api`:

| Method | Endpoint | Mục đích |
|---|---|---|
| `GET` | `/api/tickets` | Danh sách phiếu; hỗ trợ lọc trạng thái, trung tâm, nhóm sự cố, phân trang |
| `POST` | `/api/tickets/{ticket_code}/assignment` | Phân công phiếu đang chờ |
| `GET` | `/api/tickets/{ticket_code}/history` | Lịch sử phân công và trạng thái |
| `PATCH` | `/api/tickets/{ticket_code}/status` | Cập nhật trạng thái phiếu |
| `GET` | `/api/technicians` | Gợi ý kỹ thuật viên và workload |
| `GET` | `/api/technicians/{technician_code}/tickets` | Phiếu được giao cho kỹ thuật viên |
| `GET` | `/api/appointments` | Xem lịch hẹn theo ngày/kỹ thuật viên |
| `POST` | `/api/appointments` | Đặt lịch hẹn và kiểm tra trùng lịch |

Mã phiếu có dấu `/`, nên client phải URL-encode mã khi gọi endpoint có path parameter. Lỗi API có
dạng `{ "error": "...", "message": "...", "fields": {} }`; dữ liệu đầu vào sai trả HTTP 422.
Chi tiết request/response xem trong [`docs/api_contract.md`](./docs/api_contract.md).

## 9. Cấu trúc thư mục cần biết

```text
src/
  api/            Client HTTP, API modules và mapper view
  components/     DataState, badge, pagination và tiện ích hiển thị
  controllers/    Bộ điều khiển HTTP Express
  db/             Kết nối PostgreSQL, migration và import/seed
  hooks/          Quản lý trạng thái tải dữ liệu
  pages/          Màn hình đăng nhập và ba màn hình M1, M2, M3
  repositories/   Truy vấn PostgreSQL
  routes/         Định tuyến API
  services/       Quy tắc nghiệp vụ và kiểm tra dữ liệu
  styles.css      Giao diện desktop và responsive
migrations/       SQL schema/index
seeds/            Fixture phát triển/kiểm thử
tests/            Kiểm thử Node.js
docs/wireframe/   Wireframe giao diện L4
```

## 10. Lưu ý về xác thực và dữ liệu

- Đăng nhập được xác thực bởi API backend; API nghiệp vụ yêu cầu phiên hợp lệ. Cookie phiên có
  `HttpOnly`, `SameSite=Lax`, hết hạn sau 8 giờ. Khi triển khai HTTPS, đặt `AUTH_COOKIE_SECURE=true`.
- Nếu `.env` được tạo trước khi thêm cấu hình xác thực, hãy thêm thủ công các biến
  `AUTH_COOKIE_SECURE`, `AUTH_BOOTSTRAP_USERNAME`, `AUTH_BOOTSTRAP_PASSWORD` và
  `AUTH_BOOTSTRAP_DISPLAY_NAME` vào file đó, rồi chạy `npm run auth:bootstrap`.
- Tài khoản do quản trị viên cấp bằng `npm run auth:bootstrap`; không có đăng ký công khai. Mật khẩu
  được lưu bằng hash scrypt, phiên được lưu dạng hash trong PostgreSQL và bị thu hồi khi đăng xuất
  hoặc đặt lại mật khẩu.
- Hiện chỉ xác thực danh tính, chưa phân quyền vai trò. Cookie HttpOnly hạn chế JavaScript đọc cắp
  phiên nhưng không thay thế HTTPS và các biện pháp chống XSS/CSRF cho môi trường triển khai thật.
- Schema L4 chỉ có mã khách hàng tham chiếu, không quản lý hồ sơ khách hàng/số điện thoại. Giao diện
  không tạo dữ liệu khách hàng giả.
- Không chạy migrate/seed trên database chứa dữ liệu cần giữ nếu chưa backup và xác minh.
