# Security Checklist — BT3

Statuses are evidence-based. Docker checks ran on 2026-11-13; limitations found during the
database-outage test are recorded as incomplete rather than passed.

| # | Status | Evidence |
|---|---|---|
| 1. No repository secrets | **ĐÃ LÀM** | The history scan `git log -p --all | grep -inE "password|secret|api_key" | head` (PowerShell equivalent) found only test/example references and placeholder values in dependency documentation; no live credential was identified. `git ls-files .env` returns no entry and `git check-ignore -v .env` confirms `.env` is ignored. |
| 2. Input validation and parameterized SQL | **ĐÃ LÀM** | `BT3-07` returned HTTP 422 `VALIDATION_ERROR` with message `Dữ liệu không hợp lệ.` for an empty ticket body; `BT3-12` rejected the injection-style filter with HTTP 422 and returned no ticket list. Repository queries use PostgreSQL placeholders such as `$1`. Buổi 15, slide 26, specifies invalid-data test evidence as “Test dữ liệu sai PASS (400/422)”; the observed 422 validation and 400 malformed-JSON responses are both recorded. |
| 3. Owner-based access control | **CHƯA LÀM** | The status test returns 403 when `changed_by` differs from the assigned technician, but the client supplies that value and it is not bound to the authenticated session; this is not proof of owner authorization. |
| 4. Password hashing | **ĐÃ LÀM** | Live query `SELECT left(password_hash, 12) || '[REDACTED]' FROM auth_user LIMIT 1` returned `scrypt$9adf0[REDACTED]`; the stored value is a Node `scrypt` hash, not bcrypt `$2b$10$`. |
| 5. Sanitized errors | **ĐÃ LÀM** | Live Docker outage test: after `docker compose stop db`, `GET /health` returned HTTP 503 `{"status":"error","db":"down"}`; app stayed up. Malformed JSON returned HTTP 400 `INVALID_JSON`. Neither response exposed a stack. See `docs/evidence/16-docker-validation.txt`. |
| 6. Logs exclude secrets and personal data | **ĐÃ LÀM** | PowerShell scan for `password`, `token`, and `0[0-9]{9}` returned `LOG_SCAN=empty` after the outage test and recovery. The pool emits only a generic error message, not the PostgreSQL error object. |
| 7. Pinned dependencies and vulnerability scan | **ĐÃ LÀM** | On 2026-11-14, `npm audit` and `npm audit --omit=dev` each exited 0 and printed `found 0 vulnerabilities`. Direct dependency versions are exact-pinned in `package.json` and `package-lock.json`. |

No item is marked not applicable. Owner-based access control remains incomplete because the actor
identifier is supplied by the client.

Exact log-scan command:

```powershell
docker compose logs app | Select-String -Pattern 'password|token|0[0-9]{9}'
```
