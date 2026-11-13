# API Reference — BT3

This reference inventories every Express route in `src/app.js` and the route modules: **21 routes**
(18 under `/api`, plus `/`, `/health`, and `/health/ready`). All routes have contract documentation
below; genuine database-backed examples currently cover only four distinct endpoints, so Track SE
criterion S1 is not fully met. No role-based authorization is implemented: business API routes
require an authenticated session, but the prototype has no technician/manager role enforcement.

## Common rules

- JSON request bodies are limited to **1 MiB**. Invalid JSON returns `400 INVALID_JSON`; oversized
  JSON returns `413 PAYLOAD_TOO_LARGE`.
- Validation failures return `422 VALIDATION_ERROR`; conflicts use `409`; missing records use `404`.
- Business endpoints use the `smartcrm_session` cookie. Login is the only way to create a session;
  logout revokes a presented session and returns `204`.
- Responses on API errors have `{ "error": "...", "message": "...", "fields": {} }`.
- URL-encode ticket codes containing `/`, for example `BH-900001%2F2025`.

## Routes

| Method and path | Description | Authentication | Parameters | Success response | Error codes | Limits |
|---|---|---|---|---|---|---|
| `GET /` | Serve the built frontend; if no build is present, return service status JSON. | Not required. | Not applicable; route has no input. | `200` HTML when `dist/` exists; otherwise JSON with `service` and `status`. | None beyond generic `500`. | No request body. |
| `GET /health` | Check API and PostgreSQL connectivity. | Not required. | Not applicable; route has no input. | `200 {"status":"ok","db":"up"}`. | `503` with `{"status":"error","db":"down"}`. | No body. |
| `GET /health/ready` | Compatibility readiness probe for PostgreSQL. | Not required. | Not applicable; route has no input. | `200 {"status":"ok","database":"connected"}`. | `503 DATABASE_UNAVAILABLE`. | No body. |
| `POST /api/auth/login` | Verify credentials and issue an HttpOnly session cookie. | Not required. | JSON `username`, `password`. | `200 {"user":{"username":"…","displayName":"…"}}`; cookie expires after 8 hours. | `400 INVALID_JSON`, `401 INVALID_CREDENTIALS`, `413`, `422`, `500`. | Body ≤1 MiB; username 1–64 chars, password 1–128 chars. |
| `GET /api/auth/me` | Return the authenticated user. | Valid session cookie required. | Cookie `smartcrm_session`; no query/body. | `200 {"user":{…}}`. | `401 UNAUTHORIZED`, `500`. | Session lifetime 8 hours. |
| `POST /api/auth/logout` | Revoke the supplied session and clear its cookie. | No active session required; a cookie is optional. | Optional session cookie; no query/body. | `204` empty response. | `500`. | One cookie; no body. |
| `GET /api/tickets` | List and filter tickets. | Valid session cookie required. | Query: `ticket_code`, `status`, `center_code`, `category_name`, `limit`, `offset`. | `200 {"items":[…],"total":n}`. | `401`, `422`, `500`. | `limit` 1–100, default 100; `offset` ≥0. |
| `POST /api/tickets` | Create a new `MOI` ticket. | Valid session cookie required. | JSON fields: `ticket_code`, `customer_id`, `product_id`, `serial_no`, `center_code`, `category_name`, `priority`, `issue_desc`, `received_at`, `due_date`, `is_warranty`, `created_by`. | `201` with `ticket_id`, ticket fields, and initial status. | `400`, `401`, `409 TICKET_CODE_EXISTS`, `413`, `422`, `500`. | Body ≤1 MiB; issue description ≤2,000 chars. |
| `GET /api/tickets/{ticketCode}` | Read a ticket by code. | Valid session cookie required. | Path `ticketCode`; no query/body. | `200` with ticket. | `401`, `404`, `422`, `500`. | Code format `BH-######/YYYY`; URL-encode `/`. |
| `PATCH /api/tickets/{ticketCode}` | Update editable fields on an unassigned `MOI` ticket. | Valid session cookie required. | Path code; at least one editable ticket field in JSON. | `200` with updated ticket. | `400`, `401`, `404`, `409`, `413`, `422`, `500`. | Body ≤1 MiB; fields are restricted by the service schema. |
| `DELETE /api/tickets/{ticketCode}` | Soft-close an eligible new ticket; preserves history. | Valid session cookie required. | Path code; JSON `closed_by`, optional `note`. | `200` with `status:"DA_DONG"`. | `400`, `401`, `404`, `409`, `413`, `422`, `500`. | Body ≤1 MiB; note ≤255 chars. |
| `POST /api/tickets/{ticketCode}/assignment` | Assign a waiting ticket to a technician. | Valid session cookie required; no role check. | Path code; JSON `technician_code`, `assigned_by`, optional `confirm_overload`. | `201` assignment and ticket status. | `400`, `401`, `404`, `409`, `413`, `422`, `500`. | Body ≤1 MiB; overload confirmation required at 15 open tickets. |
| `GET /api/tickets/{ticketCode}/history` | Read assignment/status history. | Valid session cookie required. | Path code; no query/body. | `200` history list. | `401`, `404`, `422`, `500`. | No request body. |
| `PATCH /api/tickets/{ticketCode}/status` | Change status and write history atomically. | Valid session cookie required; technician identity is not session-bound. | Path code; JSON `status`, `changed_by`, optional `note`. | `200` with updated ticket. | `400`, `401`, `403`, `404`, `409`, `413`, `422`, `500`. | Body ≤1 MiB; note ≤255 chars; only documented next states. |
| `GET /api/technicians` | List/filter technicians and workload. | Valid session cookie required. | Query `category_name`, `center_code`, `status`, `limit`. | `200 {"items":[…],"total":n}`. | `401`, `422`, `500`. | `limit` 1–100, default 100. |
| `GET /api/technicians/{technicianCode}/tickets` | List assigned work for a technician. | Valid session cookie required; no role check. | Path `technicianCode`; optional query `status`. | `200` assigned-work list (empty when no rows match). | `401`, `422`, `500`. | Technician code `KT` plus 3 digits. |
| `GET /api/appointments` | List appointments by technician/date. | Valid session cookie required. | Optional query `technician_code`, `date` (`YYYY-MM-DD`). | `200` appointment list. | `401`, `422`, `500`. | Maximum 100 appointments. |
| `POST /api/appointments` | Create a reservation for an assigned ticket. | Valid session cookie required. | JSON fields: `ticket_code`, `appointment_type`, `scheduled_start`, `duration_minutes`, optional `note`. Technician is taken from the current assignment. | `201` with `appointment_id`, ticket/technician/center codes, type, start/end times, and status. | `400`, `401`, `404`, `409`, `413`, `422`, `500`. | Body ≤1 MiB; duration 15–240 minutes; overlaps rejected. |
| `GET /api/appointments/{appointmentId}` | Read an appointment. | Valid session cookie required. | Positive integer path `appointmentId`; no body. | `200` with appointment. | `401`, `404`, `422`, `500`. | Positive integer identifier. |
| `PATCH /api/appointments/{appointmentId}` | Change an active appointment. | Valid session cookie required. | Path ID; at least one editable appointment field in JSON. | `200` with updated appointment. | `400`, `401`, `404`, `409`, `413`, `422`, `500`. | Body ≤1 MiB; duration 15–240 minutes; overlaps rejected. |
| `DELETE /api/appointments/{appointmentId}` | Soft-cancel an active appointment. | Valid session cookie required. | Positive integer path ID; no query/body. | `200` with status `KHACH_HUY`. | `401`, `404`, `409`, `422`, `500`. | No request body; row is retained. |

## Live request and response examples

Captured on 13/11/2026 against a disposable PostgreSQL Compose project on port 8001. The project and
its test volume were removed after capture. Login credentials and the session cookie are omitted.
The captured response shows the disposable run's `long` account; the clean-clone deployment guide
uses the `manager` account from `.env.example`. These were separate isolated Compose projects.
`ticket_id` and timestamps below are from the disposable API-example run.

### Login

Request:

```http
POST /api/auth/login
Content-Type: application/json

{"username":"long","password":"[REDACTED]"}
```

Actual response: `200 OK`

```json
{"user":{"username":"long","displayName":"long"}}
```

### Create a ticket

Request:

```http
POST /api/tickets
Content-Type: application/json
Cookie: smartcrm_session=[REDACTED]

{"ticket_code":"BH-990101/2026","customer_id":14159,"product_id":21,"serial_no":"BT3PROOF20261113","center_code":"TT04","category_name":"MAN_HINH","priority":"CAO","issue_desc":"BT3 isolated API evidence record","received_at":"2026-11-13T10:00:00+07:00","due_date":"2026-11-14T10:00:00+07:00","created_by":"BT3 demo"}
```

Actual response: `201 Created`

```json
{"ticket_id":"900027","ticket_code":"BH-990101/2026","customer_id":"14159","product_id":21,"serial_no":"BT3PROOF20261113","center_code":"TT04","category_name":"MAN_HINH","priority":"CAO","status":"MOI","issue_desc":"BT3 isolated API evidence record","received_at":"2026-11-13T03:00:00.000Z","due_date":"2026-11-14T03:00:00.000Z","is_warranty":true}
```

### Assign the ticket

Request:

```http
POST /api/tickets/BH-990101%2F2026/assignment
Content-Type: application/json
Cookie: smartcrm_session=[REDACTED]

{"technician_code":"KT002","assigned_by":"8","confirm_overload":true}
```

Actual response: `201 Created`

```json
{"ticket_code":"BH-990101/2026","status":"DA_PHAN_CONG","technician_code":"KT002","assigned_by":"8","assigned_at":"2026-11-13T11:29:16.058Z"}
```

### Error responses

The following actual responses came from the same run:

| Case | HTTP | Response |
|---|---:|---|
| Update as a different technician (`changed_by: "KT999"`) | 403 | `{"error":"FORBIDDEN","message":"Chỉ kỹ thuật viên đang phụ trách mới được cập nhật phiếu.","fields":{}}` |
| Assign the already-assigned ticket again | 409 | `{"error":"TICKET_NOT_ASSIGNABLE","message":"Phiếu không còn ở trạng thái chờ phân công.","fields":{}}` |
| Create a ticket with `{}` | 422 | `{"error":"VALIDATION_ERROR","message":"Dữ liệu không hợp lệ.","fields":{"ticket_code":"Invalid input: expected string, received undefined", "...":"additional required fields omitted"}}` |

These are real database-backed examples, not just fixture contracts. Owner identity is still supplied
by the client for status updates; the 403 example does not prove session-bound ownership control.

## Capture all 21 routes

The route inventory above is counted from `src/app.js` and `src/routes/`: 3 service routes and 18
`/api` routes. To capture request/response examples for all 21 distinct routes, start a disposable
Compose stack with `.env`, then run:

```shell
npm run docs:api
```

The script uses the bootstrap credentials from `.env`, redacts password/cookie fields, and writes the
live examples below this section. It creates two test tickets, assigns one, updates its status, and
creates/updates/cancels an appointment; use a disposable database and remove its Compose volume after
the capture. Do not include an actual `.env` value or session cookie in submitted evidence.

<!-- BEGIN GENERATED LIVE API EXAMPLES -->
<!-- END GENERATED LIVE API EXAMPLES -->
