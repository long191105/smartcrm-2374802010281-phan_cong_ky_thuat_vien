# Test Report — BT3, Track SE

**Updated:** 14/11/2026
**Target:** public repository tag `v1.0`, resolved to `d093b0d31dc27efd543e7ad3d64917f86b504cb8`
**Environment:** Docker Engine 29.9.3, Docker Compose v5.7.0, PostgreSQL 16 Alpine, Node.js 20 in the app container

## Execution summary

The public `v1.0` tag was cloned into a new temporary directory. The clean clone used `.env.example`
to create `.env`; no existing project volume was reused. `docker compose up -d --build` completed
successfully. Both services became healthy, the API health endpoint returned HTTP 200 on port 3000,
and `docker compose exec -T app npm test` exited 0 with **78 passed, 0 failed, 0 skipped**.

The Docker build completed its frontend build stage. Re-running `npm run migrate` and `npm run seed`
did not change PostgreSQL counts: 2 technicians, 7 technician-skill rows, 18 tickets, 17 assignments,
18 status-history rows, 0 appointments, 1 auth user, and 4 migrations. An authenticated
SQL-injection-style ticket filter returned HTTP 422 `VALIDATION_ERROR`. Stopping PostgreSQL left the
app running and returned sanitized HTTP 503; restarting PostgreSQL restored HTTP 200 and healthy
services.

## Representative test cases

| Test ID and rubric type | Preconditions | Steps | Test data | Expected result | Priority | Actual result | Status |
|---|---|---|---|---|---|---|---|
| BT3-01 Boundary — workload below threshold | Waiting ticket; `KT002` has 14 open tickets | Assign without overload confirmation | Workload 14; `confirm_overload=false` | Assignment commits without confirmation | High | `ticket.repository.test.js` accepted the assignment and asserted `COMMIT`; repository test double | PASS |
| BT3-02 Security — missing session | App running; no session cookie | Request `GET /api/tickets` | No cookie | HTTP 401; ticket service is not called | High | HTTP test returned 401; service call count remained zero | PASS |
| BT3-03 Happy path — assign ticket | Waiting ticket and eligible technician | Confirm assignment | `BH-900001/2025`, `KT002`, `confirm_overload=true` | HTTP 201; assignment and status/history are atomic | High | Repository test verified the assignment transaction using a test double | PASS |
| BT3-04 Boundary — confirmation threshold | Waiting ticket; `KT002` has 15 open tickets | Assign without overload confirmation | Workload 15; `confirm_overload=false` | HTTP 409 `OVERLOAD_CONFIRMATION_REQUIRED`; no assignment insert | High | `ticket.repository.test.js` asserted 409, rollback, and no insert; repository test double | PASS |
| BT3-05 Invalid data — overlapping appointment | Existing technician time slot | Create an overlapping appointment | 60-minute overlapping slot | HTTP 409 `APPOINTMENT_CONFLICT`; transaction rolled back; no duplicate reservation | High | Repository test verified rollback using test doubles; response message is “Khung giờ đã trùng với lịch hẹn của kỹ thuật viên.” | PASS |
| BT3-06 Security — actor mismatch | Ticket assigned to `KT002` | Submit a status update as another actor | `changed_by=KT999` | HTTP 403; no status/history change | High | HTTP test returned 403 with no side effects. Actor identity is client-supplied, so this is not session-bound ownership proof | PASS* |
| BT3-07 Invalid data — missing ticket fields | Authenticated API session | Create a ticket with an empty body | `{}` | HTTP 422 `VALIDATION_ERROR`; repository not called | High | API returned HTTP 422 `VALIDATION_ERROR`, message “Dữ liệu không hợp lệ.”, and field details; repository was not called | PASS |
| BT3-08 Reproducibility — migration and seed | Clean-clone PostgreSQL has completed initialization | Run migrate and seed again; compare counts | Seeded tables and migration ledger | Migrations skip and all row counts stay unchanged | High | Live Docker rerun: migrations 001–004 skipped; counts remained at 2 technicians, 7 skills, 18 tickets, 17 assignments, 18 status rows, 0 appointments, 1 auth user, 4 migrations | PASS |
| BT3-09 Invalid data — malformed JSON | JSON API route | Send malformed JSON | `{"ticket_code":` | HTTP 400 `INVALID_JSON`; no parser stack in response | Medium | HTTP regression test returned the sanitized 400 response | PASS |
| BT3-10 Boundary — request size | JSON parser limit is 1 MiB | Send a body larger than the limit | JSON body 1 MiB + 11 bytes | HTTP 413 `PAYLOAD_TOO_LARGE`; no parser details | Medium | HTTP regression test returned 413; the regression was 500 before BUG-02 was fixed | PASS |
| BT3-11 Security — database outage disclosure | Clean-clone app and PostgreSQL are healthy | Stop `db`, call `/health`, restart `db`, call `/health` again | PostgreSQL unavailable, then restored | App remains running; sanitized HTTP 503 then HTTP 200 after recovery | High | Live Docker run returned `{"status":"error","db":"down"}` then `{"status":"ok","db":"up"}`; the pool log was generic | PASS |
| BT3-12 Security — injection-style filter | Clean-clone app and demo session are healthy | Log in, then filter tickets using the encoded test value | `ticket_code=' OR '1'='1` | Reject invalid ticket code; do not broaden the query | High | Live authenticated request returned HTTP 422 `VALIDATION_ERROR`; no ticket list was returned | PASS |

`*` A different client-supplied `changed_by` is rejected, but the actor is not bound to the session.

Rubric type coverage: happy path — BT3-03; boundary — BT3-01, BT3-04, BT3-10; invalid data —
BT3-05, BT3-07, BT3-09; security — BT3-02, BT3-06, BT3-11, BT3-12; reproducibility — BT3-08.
S2 owner-based authorization remains unmet; BT3-06 is not an owner-authorization test.

## Requirement-to-test traceability

| Test ID | Implemented rule or criterion | Automated or live evidence |
|---|---|---|
| BT3-01 | FR4 — assignment is allowed below the 15-open-ticket threshold | `ticket.repository.test.js`: assignment at 14 open tickets commits |
| BT3-02 | Authenticated session required for business APIs | `app.test.js`: missing session returns 401 without calling the service |
| BT3-03 | FR1/FR4 — eligible assignment updates ticket and writes history atomically | `ticket.repository.test.js`: assignment transaction commits with status/history |
| BT3-04 | FR4 — at 15 open tickets, confirmation is required | `ticket.repository.test.js`: no confirmation rolls back without inserting an assignment |
| BT3-05 | FR3/FR12 — reject overlapping appointments | `l4-repositories.test.js`: HTTP-domain conflict and rollback; message recorded above |
| BT3-06 | FR10 — reject status changes naming a non-assigned technician | `app.test.js`: 403 with no update/history side effects; actor is not session-bound |
| BT3-07 | FR11 — validate required new-ticket fields | `app.test.js`: 422 response and repository is not called |
| BT3-08 | C8 — repeat migrations and seed without duplicating rows | Live clean-clone evidence in `docs/evidence/16-docker-validation.txt` |
| BT3-09 | API parser — malformed JSON is a client error | `app.test.js`: 400 `INVALID_JSON` without parser details |
| BT3-10 | API parser — reject bodies larger than 1 MiB | `app.test.js`: 413 `PAYLOAD_TOO_LARGE` |
| BT3-11 | S4 — database outage is reported safely and the app recovers | Live clean-clone evidence in `docs/evidence/16-docker-validation.txt` |
| BT3-12 | Input-validation/security criterion — reject an injection-style filter | Live authenticated clean-clone check returns 422 without a ticket list |

The automated suite also has successful-flow tests for ticket create/read/update/soft-close (FR11),
technician suggestions and assigned work (FR2/FR5/FR6), status/history updates (FR10), and appointment
create/read/update/cancel (FR3/FR12). See `tests/app.test.js`, `tests/ticket.repository.test.js`,
`tests/ticket.service.test.js`, `tests/l4-services.test.js`, `tests/l4-repositories.test.js`, and
`tests/crud.test.js`. The 12 representative report cases are not a count of the full automated suite.

## C8 initialization repeatability

On the clean clone, `npm run migrate` reported `SKIP` for migrations 001–004. The seed then completed.
PostgreSQL row counts before and after the repeated seed matched exactly:

| Table | Before | After |
|---|---:|---:|
| `technician` | 2 | 2 |
| `technician_skill` | 7 | 7 |
| `ticket` | 18 | 18 |
| `ticket_assignment` | 17 | 17 |
| `ticket_status_log` | 18 | 18 |
| `appointment` | 0 | 0 |
| `auth_user` | 1 | 1 |
| `schema_migrations` | 4 | 4 |

## Evidence and limitations

- Detailed live command output is recorded in [`docs/evidence/16-docker-validation.txt`](./evidence/16-docker-validation.txt).
- The database-backed API request/response samples are included in [`docs/api-reference-bt3.md`](./api-reference-bt3.md). The login response captured there used the disposable account `long`; the clean-clone deployment guide uses `manager`. The two captures used different isolated Compose projects.
- UI screenshots are grouped into two contact sheets under [`docs/screenshots/`](./screenshots/); the seven original captures remain available individually.
- [`health-port3000.png`](./screenshots/health-port3000.png) is a genuine browser capture of the local `/health` endpoint on port 3000. It is not from a fresh clean clone, so it does not replace the missing clean-clone command-sequence evidence.
- A genuine clean-clone terminal capture, [`docker-compose-ps-bt3.png`](./screenshots/docker-compose-ps-bt3.png), shows both services healthy, the app on port 3000, and no host-published DB port. The command text is not visible in the crop.
- The clean-clone [`npm-test-bt3.png`](./screenshots/npm-test-bt3.png) terminal capture shows the `npm test` command and 78 passed, 0 failed; the health response has scrolled out of that image.
- **Still missing:** a screenshot of the complete clean-clone setup commands and a clean-clone port-3000 `/health` capture. The clean-clone health result is recorded as text in the evidence file.
- The assignment does not require one screenshot per test case; the 12 cases are supported by the test and live-run results recorded above.
- Track SE section 4.2: **S1 not fully met** — all 21 endpoints are documented, but genuine request/response examples currently cover only 4/21 distinct endpoints. A capture script is provided, but has not been run against a disposable Compose deployment in this environment. **S2 not met** — session-bound owner authorization is absent; BT3-06 does not prove it. **S3 met** — the stored password is a scrypt hash. **S4 met** — malformed-JSON and database-outage responses/logging expose no stack trace, table name, or connection string.
