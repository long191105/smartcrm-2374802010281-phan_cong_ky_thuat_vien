# Historical Test Report — BT2, Track SE

This section records the earlier BT2 baseline only. Current BT3 runtime evidence is in the
13/11/2026 sections near the end of this file; older results below must not be interpreted as the
current Docker or application status.

**Cập nhật:** 11/11/2026

**Commit đã push lên `dev`:** [3b52a0e](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/commit/3b52a0e)
(fix BUG-02), [abd0c17](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/commit/abd0c17)
(boundary/auth tests), [ea7d840](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/commit/ea7d840)
(Test Plan/Report, Test Design, README, CI, `.http`, báo cáo Word). Bản report được cập nhật tiếp
trong các commit metadata. Bản Word và test suite được cập nhật sau đó; commit mới nhất là
[aa13379](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/commit/aa133794aa2d8e4b6cc6e0422c0315debc996f08).

**Lệnh:** `npm test` — exit code 0; **72 PASS, 0 FAIL, 0 SKIP**.

**Build:** `npm run build` — PASS (Vite 6.4.5).
**Tầng chạy:** 55 unit/service/repository/schema/dataset/migration/seed test doubles; 17 HTTP/API test;
0 PostgreSQL integration test chạy trong phiên này.

## 15 ca nghiệp vụ

| Mã | Tiền điều kiện | Các bước | Dữ liệu thử | Kết quả mong đợi | Ưu tiên | Kết quả thực tế | PASS/FAIL |
|---|---|---|---|---|---|---|---|
| TC-01 | API test server; auth fixture trả session | POST login → GET `/api/auth/me` → POST logout | `manager` / `not-returned`; cookie test `smartcrm_session=test-session` | Login/me 200; cookie HttpOnly; logout 204, xóa cookie | Cao | Test HTTP xác nhận 200, user `{username:"manager", displayName:"Test Manager"}`, cookie HttpOnly/SameSite=Lax, logout 204 | PASS |
| TC-02 | API test server; chưa có session | GET `/api/tickets` không gửi Cookie | Không cookie | 401 `UNAUTHORIZED`; service không được gọi | Cao | HTTP 401; JSON lỗi chuẩn; `ticketServiceCalls.length` vẫn 0 | PASS |
| TC-03 | Repository fake có phiếu `MOI`, KT002 đủ tay nghề, tải 17 | Gọi phân công với xác nhận quá tải | `BH-900001/2025`, `KT002`, `assigned_by="8"`, `confirm_overload=true` | 201; trạng thái `DA_PHAN_CONG`; ghi assignment | Cao | Unit/repository test xác nhận assignment và status/history cùng transaction | PASS |
| TC-04 | Repository fake; KT002 có proficiency 2, thấp hơn mức tối thiểu 3 | Thử phân công | `BH-900001/2025`, `KT002`, proficiency 2 | 409 `SKILL_MISMATCH`; không insert assignment | Trung bình | Repository rollback; không có lệnh insert assignment | PASS |
| TC-05 | Test doubles cho lịch; phiếu đã phân công cho KT002 | Tạo lịch đang overlap; kiểm tra DDL constraint chống overlap | Bắt đầu `2026-10-20T14:00:00+07:00`, dài 60 phút; fixture conflict `BH-900002/2025` | Overlap trả 409 và rollback; DDL khai báo range `[start,end)`; insert liền kề phải được kiểm trên PostgreSQL | Cao | Test repository xác nhận rollback khi overlap; schema test xác nhận exclusion constraint half-open. Chưa chạy insert lịch liền kề trên PostgreSQL thật | PASS |
| TC-06 | Repository fake; ticket `DA_PHAN_CONG`, người phụ trách KT002 | PATCH status; kiểm tra status log và transaction | `DANG_XU_LY`, `changed_by=KT002`, note `Bắt đầu kiểm tra` | Cập nhật status và history atomic | Cao | Test repository thấy UPDATE + INSERT history + COMMIT | PASS |
| TC-07 | HTTP server với TicketService/Repository thật và DB fake; người phụ trách KT002 | PATCH status với actor không khớp | Ticket `BH-900001/2025`; `changed_by=KT999` | 403; không đổi status/history | Cao | HTTP 403 `FORBIDDEN`; transaction ROLLBACK; không UPDATE/INSERT | PASS* |
| TC-08 | Test doubles; phiếu đã phân công, không có lịch overlap | Tạo lịch, đọc, cập nhật, hủy mềm | `BH-900001/2025`, `NHAN_MAY`, `2026-10-20T14:00:00+07:00`, 60 phút | Tạo 201; đọc/cập nhật thành công; hủy mềm giữ row | Trung bình | Repository test tạo lịch, kiểm conflict; CRUD test xác nhận trạng thái mềm/row còn lại | PASS |
| TC-09 | Ticket fixture `MOI`, chưa phân công | Tạo → đọc → cập nhật → đóng mềm | `BH-900099/2025`, `priority=CAO`, `closed_by="manager"` | 201/200; đóng mềm `DA_DONG`, không xóa vật lý | Trung bình | HTTP CRUD test xác nhận response/status và route soft-close | PASS |
| TC-10 | API test server; service dùng repository spy | POST ticket với body thiếu trường; kiểm status, fields, số lần gọi repository | `{}` | 422 `VALIDATION_ERROR`, `fields.ticket_code`; repository không chạy | Cao | HTTP 422; `fields.ticket_code` có mặt; số lần gọi repository = 0. Rubric yêu cầu 400, sai khác ghi ở TD-12 | PASS** |
| TC-11 | Fake migration runner/seed runner | Chạy lần hai; so checksum/số dòng mô phỏng | Migration 001–004; fixture demo | Không lỗi; không tạo dữ liệu trùng | Trung bình | Test doubles PASS. PostgreSQL thật có log ngày 31/10: số dòng không đổi; chưa chạy lại DB thật lần này | PASS*** |
| TC-12 | HTTP server, TicketRepository thật với query fake trả 0 phiếu | GET mã hợp lệ không tồn tại | `BH-900099/2025` | HTTP 404, JSON chung, không lộ stack | Trung bình | HTTP 404 `NOT_FOUND`, thông báo không tìm thấy; body khớp contract | PASS |
| TC-13 | Repository fake; tải hiện tại 14, không bật xác nhận quá tải | Phân công fixture | 14 phiếu mở; ngưỡng 15 | Phân công được; COMMIT | Cao | Test boundary xác nhận insert assignment và COMMIT ở tải 14 | PASS |
| TC-14 | Repository fake; tải hiện tại 15, không bật xác nhận quá tải | Thử phân công fixture | 15 phiếu mở; ngưỡng 15 | 409 `OVERLOAD_CONFIRMATION_REQUIRED`; rollback, không insert | Cao | Test boundary xác nhận lỗi 409, ROLLBACK, không insert | PASS |
| TC-15 | Express JSON parser giới hạn 1 MiB; API test server | POST body lớn hơn giới hạn; kiểm status/body | `{"data":"x…x"}`; body JSON 1 MiB + 11 bytes | 413 `PAYLOAD_TOO_LARGE`, không lộ chi tiết parser | Trung bình | Trước sửa trả 500 (test đỏ); sau sửa HTTP 413 và body JSON chung | PASS |

`*` TC-07 chỉ xác nhận mã actor khác với kỹ thuật viên được giao bị từ chối. Nó **không** chứng minh
actor được xác thực: `changed_by` do client gửi, không bind với session. Giới hạn này được công khai
ở TD-12; không coi đây là kiểm soát phân quyền production.

`**` PASS theo hợp đồng API 422 đã chọn; không có nghĩa đạt rubric 400.

`***` PASS cho test doubles hiện tại; bằng chứng PostgreSQL ngày 31/10 là lịch sử, không phải lần chạy
trong phiên này.

## 5 ca ánh xạ OWASP

| Mã | Tiền điều kiện | Các bước | Dữ liệu thử | Kết quả mong đợi | Ưu tiên | Kết quả thực tế | PASS/FAIL |
|---|---|---|---|---|---|---|---|
| OWASP-A01 | Prototype chỉ có tài khoản quản lý, chưa có tài khoản/vai trò kỹ thuật viên | Xem test TC-02 và TC-07; đối chiếu session với `changed_by` | Cookie session quản lý; `changed_by=KT999` | Không tuyên bố kiểm soát danh tính hoàn chỉnh; ghi rõ giới hạn | Cao | TC-07 chặn actor code không khớp bằng 403; identity binding không được triển khai/không kiểm thử | N/A — giới hạn thiết kế |
| OWASP-A02 | AuthService dùng scrypt và lưu hash phiên | Bootstrap/login; so sánh mật khẩu/hash/token; kiểm tra response login | `manager`, mật khẩu fixture `a-strong-password` | Không lưu mật khẩu rõ; hash/token không trả trong body | Cao | `auth.service.test.js` xác nhận hash scrypt, hash phiên khác token; HTTP response chỉ chứa user | PASS |
| OWASP-A04 | Ticket đã phân công; repo fake trả `DA_PHAN_CONG`; JSON parser giới hạn 1 MiB | Thử nhảy bước trạng thái và gửi body quá giới hạn | `BH-900001/2025`, KT002→`HOAN_TAT`; JSON 1 MiB + 11 bytes | 409 cho chuyển trạng thái sai; 413 cho request quá lớn | Trung bình | Test repository xác nhận rollback/không UPDATE; HTTP regression trước sửa 500, sau sửa 413 | PASS |
| OWASP-A05 | Express app chạy test server | Gọi route không tồn tại; kiểm headers/body | `GET /not-found` | JSON 404; không có `X-Powered-By`; không lộ stack | Thấp | HTTP test xác nhận JSON 404, `X-Powered-By` vắng mặt | PASS |
| OWASP-A07 | AuthService có tài khoản manager fixture | Login với sai mật khẩu; login với username không tồn tại | `manager/incorrect-password`; `missing/incorrect-password` | Cùng HTTP error code/message, không tiết lộ username có tồn tại | Cao | Test xác nhận hai lỗi cùng status 401, code `INVALID_CREDENTIALS`, message giống nhau | PASS |

## Minh chứng, lỗi và việc còn lại

- Chưa có ảnh terminal `docs/screenshots/TC-01.png`…`TC-15.png` và ảnh riêng cho 5 ca OWASP. Ảnh
  trong `docs/evidence/` là ảnh giao diện; không dùng thay ảnh chạy test. Không tạo ảnh giả.
- BUG-01 được sửa trước đây trong commit `408b196`, nhưng commit này gộp nhiều thay đổi chức năng/tài
  liệu, không phải commit riêng chỉ cho BUG-01. Phiên này chỉ tái hiện và sửa thêm BUG-02; các ca 403,
  404, 422 và biên 14/15 đều khớp hành vi đã thiết kế, không phải bug mới. Chưa có căn cứ để ghi nhận
  thêm hai lỗi ứng dụng thật; không bịa bug để đủ số lượng.
- Lần chạy CI đầu tiên phát hiện hai test bị khai báo lồng trong test khác và bị Node hủy trước khi
  chạy độc lập. Đã tách test và xác nhận lại thành công trong hai commit `041c0a5` và `aa13379`.
  Đây là lỗi cấu trúc test/CI, không tính là bug chức năng thứ ba của ứng dụng.
- Không có Docker daemon/`psql`; PostgreSQL integration thật chưa chạy lại. Không kiểm thử tích hợp
  trực tiếp L2→L4 vì mã/endpoint L2 không có trong repo.
- REST Client smoke file: `tests/api-smoke.http`. CI workflow mới thêm tại `.github/workflows/ci.yml`;
  GitHub Actions run [#4](https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien/actions/runs/42958347352)
  đã PASS trên Node 20 với `npm ci`, `npm test` và `npm run build`.
- Chưa tạo GitHub Release v0.2. Branch hiện là `dev`; cần chốt commit/tag sau khi ảnh terminal được
  tạo và tài liệu được review.

**Kết luận:** `npm test` PASS (72/72), `npm run build` PASS và CI PASS. Checklist nộp vẫn
**CHƯA ĐẠT ĐỦ** vì thiếu ảnh test case, PostgreSQL integration hiện tại, ≥3 bug ứng dụng thật đã sửa
bằng commit tách biệt (hiện có BUG-01 và BUG-02; BUG-01 không có commit riêng), và GitHub Release
v0.2 hoặc quyết định phát hành cuối.

## Historical BT3 evidence snapshot — 12/11/2026

The BT2 conclusion above is retained as a historical snapshot. After the BT3 packaging and dependency
changes, the current Windows/Node.js 24.21.0 run completed `npm test` with **77 PASS, 0 FAIL, 0 SKIP**;
`npm run build`, `npm ci`, `npm audit`, and `npm audit --omit=dev` also passed. Docker/PostgreSQL live
integration was not run because Docker and `psql` are unavailable here. The following 12 representative
cases are selected from the 77-test run; they cover functional, validation, authorization, error-handling,
boundary, and database-runner behavior.

| Mã | Tiền điều kiện | Các bước | Dữ liệu thử | Kết quả mong đợi | Ưu tiên | Kết quả thực tế | PASS/FAIL |
|---|---|---|---|---|---|---|---|
| BT3-01 | Functional: auth test server and manager fixture | Login, inspect response and cookie | Valid manager fixture | 200; user returned; HttpOnly session cookie | High | HTTP test verified user response and cookie attributes | PASS |
| BT3-02 | Authorization: no session cookie | Request `GET /api/tickets` | No cookie | 401; ticket service is not called | High | HTTP test returned 401; service call count remained zero | PASS |
| BT3-03 | Functional: waiting ticket and overloaded technician | Confirm assignment | `BH-900001/2025`, `KT002`, `confirm_overload=true` | 201; assignment and status/history are atomic | High | Repository test-double verified assignment transaction | PASS |
| BT3-04 | Validation: technician skill below minimum | Attempt assignment | `KT002`, proficiency 2 | 409 `SKILL_MISMATCH`; no assignment insert | High | Repository test verified conflict and no insert | PASS |
| BT3-05 | Functional/error: existing technician time slot | Create overlapping appointment | 60-minute overlapping slot | 409; rollback; no duplicate reservation | High | Appointment repository test verified rollback using test doubles | PASS |
| BT3-06 | Authorization: assigned technician is KT002 | Update status as another actor | `changed_by=KT999` | 403; no status/history change | High | HTTP test returned 403 with no side effects; actor is client-supplied, so this is not identity-bound ownership proof | PASS* |
| BT3-07 | Validation: API session established | Create ticket with missing required fields | `{}` | 422 `VALIDATION_ERROR`; repository not called | High | API returned 422 and identified invalid fields; rubric's 400 expectation remains a discrepancy | PASS** |
| BT3-08 | Error handling: authenticated API; valid but absent ticket code | Read ticket | `BH-900099/2025` | 404; sanitized JSON without stack | Medium | HTTP test returned 404 with the common error envelope | PASS |
| BT3-09 | Error handling: JSON endpoint | Send malformed JSON | `{"ticket_code":` | 400 `INVALID_JSON`; no parser stack in response | Medium | HTTP regression test passed with sanitized response | PASS |
| BT3-10 | Boundary: 1 MiB JSON parser limit | Send body larger than limit | JSON body 1 MiB + 11 bytes | 413 `PAYLOAD_TOO_LARGE`; no parser details | Medium | HTTP regression returned 413; regression was 500 before BUG-02 fix | PASS |
| BT3-11 | Database behavior: migration runner with test database double | Apply migrations twice | Migration files 001–004 | Second run skips unchanged checksums | Medium | Runner test passed; not a live PostgreSQL run | PASS*** |
| BT3-12 | Database behavior: seed runner with test database double | Run seed twice | Demo fixtures | Second run does not duplicate records | Medium | Runner and SQL guard tests passed; not a live PostgreSQL count | PASS*** |

`*` A different client-supplied `changed_by` is rejected, but the actor is not bound to the session.
`**` PASS is against the implemented 422 contract; it does not satisfy the rubric's requested 400.
`***` Test-double result only; fresh Docker/PostgreSQL evidence remains outstanding.

Each test-case screenshot is still pending. The existing UI images under `docs/evidence/` are not
terminal test evidence. To rerun an individual case, for example:

```shell
node --test --test-name-pattern="oversized JSON requests" tests/app.test.js
```

Docker packaging is prepared but not runtime-verified; capture `docker compose ps`, `/health`, and
`docker compose exec app npm test` under `docs/screenshots/` after running on a machine with Docker.

## Initial live Docker validation — 13/11/2026 (before BUG-04 fix)

Docker Desktop was available for this run (Engine 29.9.3, Compose v5.7.0). The existing `.env` was
left unchanged and configured host port 8000, so the live health URL was
`http://localhost:8000/health` rather than the sample default 3000.

| Check | Actual result |
|---|---|
| `docker compose up -d --build` | PASS, exit code 0; `postgres:16-alpine` pulled and app image built. |
| `docker compose ps` | PASS; both `db` and `app` Up (healthy). DB publishes no host port; Compose shows only internal `5432/tcp`. |
| `curl.exe -sS -i http://localhost:8000/health` | PASS; HTTP 200 and `{"status":"ok","db":"up"}`. A real browser screenshot is saved as `docs/screenshots/health-endpoint.png`. |
| `docker compose exec -T app npm test` | PASS; 77 tests, 77 passed, 0 failed, 0 skipped; exit code 0. |
| Repeat application startup | PASS; after restarting only `app`, the database counts were unchanged: 2 technicians, 7 technician-skill rows, 18 tickets, 17 assignments, 18 status-history rows, 0 appointments, 1 auth user, and 4 migrations. |
| Malformed JSON | PASS; POST with body `{` returned HTTP 400 `INVALID_JSON` with a generic JSON response. |
| Log scan | NOT PASS; the grep-like scan found internal identifiers `authenticationCleartextPassword` and `authenticationMD5Password` (not secret values); logs also contained an internal pg error object during the outage test. |
| PostgreSQL outage | FAIL; stopping `db` caused the app process to exit with code 1. `/health` received HTTP 000 (connection refused), not the sanitized 503 tested by the HTTP test double. The database and app were restarted and returned to healthy. |

At the time of this initial run, checklist items 5 and 6 were **CHƯA LÀM**. That pre-fix result is
historical; the BUG-04 retest below supersedes it and passes the live database-down and log checks.
The current app container is running again and healthy. The full command output is recorded in
`docs/evidence/16-docker-validation.txt`.

This was a run in the existing working directory and volume, not a clean clone of the `v1.0` tag.
At that point, the tag was still unverified. Only the health endpoint screenshot is stored as a new
image; `docker compose ps` and test output are real command results but do not have saved terminal
screenshots.

## Live retest — 13/11/2026 (after BUG-04 fix)

The PostgreSQL pool now has a sanitized `error` listener. The original outage result above is
historical and was re-tested after the change:

| Check | Actual result |
|---|---|
| `npm test` | PASS; 78 tests, 78 passed, 0 failed, 0 skipped; exit code 0. |
| `npm run build` | PASS. |
| `docker compose up -d --build` | PASS; rebuilt the app image and both services became healthy. |
| PostgreSQL outage | PASS; after stopping `db`, app remained running and `GET /health` returned HTTP 503 with `{"status":"error","db":"down"}`. |
| PostgreSQL recovery | PASS; after starting `db`, `/health` returned `{"status":"ok","db":"up"}` and both services returned healthy. |
| Log scan | PASS; `docker compose logs app` piped through the case-insensitive `password|token|0[0-9]{9}` pattern returned no matches. The pool wrote only `Unexpected database pool error.` |
| Auth hash | The live query returned the prefix `scrypt$9adf0`; the rest of the hash is redacted. This is scrypt, not bcrypt `$2b$10$`. |
| API examples | Login, ticket creation, assignment, 403, 409 and 422 examples were captured from a separate disposable PostgreSQL Compose project. Its ticket data and volume were removed after capture. |

Checklist items 5 and 6 are now **ĐÃ LÀM** based on these retests. Owner-based access control remains
**CHƯA LÀM** because the actor identifier is client-supplied. The public `v1.0` tag has been
clean-clone tested; terminal/test-case screenshots remain outstanding.

## Clean-clone validation — public `v1.0` tag, 13/11/2026

The published repository was cloned into a new temporary directory using branch/tag `v1.0`.
`.env` was created from `.env.example`; no existing project database volume was reused. The tag page
was accessible without authentication.

| Check | Actual result |
|---|---|
| `docker compose up -d --build` | PASS, exit code 0; image built and both services started. |
| `docker compose ps` | PASS; `app` and `db` were `Up (healthy)`. The app mapped host port 3000; PostgreSQL showed only internal `5432/tcp`. |
| `GET http://localhost:3000/health` | PASS; HTTP 200, `{"status":"ok","db":"up"}`. |
| `docker compose exec -T app npm test` | PASS, exit code 0; 78 passed, 0 failed, 0 skipped. |
| Re-run `npm run migrate` and `npm run seed` in the app container | PASS; migrations 001–004 were skipped by checksum; seed completed. Counts before/after matched: 0 appointments, 1 auth user, 4 migrations, 2 technicians, 7 technician-skill rows, 18 tickets, 17 assignments, and 18 status-history rows. |

The fresh clone resolved tag `v1.0` to the published release commit and passed the checks above.
The health screenshot remains available, but terminal screenshots for `docker compose ps` and
`npm test`, and per-test-case screenshots, have not been saved.
