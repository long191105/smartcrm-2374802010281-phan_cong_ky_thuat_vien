# Security Checklist — BT3

Statuses are evidence-based. Docker checks ran on 2026-11-13; limitations found during the
database-outage test are recorded as incomplete rather than passed.

| # | Status | Evidence |
|---|---|---|
| 1. No repository secrets | **ĐÃ LÀM** | `git log --all --oneline -- .env` and `git ls-files .env` return no entries; `git check-ignore -v .env` confirms `.env` is ignored. |
| 2. Input validation and parameterized SQL | **ĐÃ LÀM** | Test case `BT3-07` returned HTTP 422 `VALIDATION_ERROR` for an empty ticket body; repository queries use PostgreSQL placeholders such as `$1`. The rubric's example asks for 400, so this contract discrepancy remains explicit. |
| 3. Owner-based access control | **CHƯA LÀM** | The status test returns 403 when `changed_by` differs from the assigned technician, but the client supplies that value and it is not bound to the authenticated session; this is not proof of owner authorization. |
| 4. Password hashing | **ĐÃ LÀM** | Live query `SELECT left(password_hash, 12) || '[REDACTED]' FROM auth_user LIMIT 1` returned `scrypt$9adf0[REDACTED]`; the stored value is a Node `scrypt` hash, not bcrypt `$2b$10$`. |
| 5. Sanitized errors | **ĐÃ LÀM** | Live Docker outage test: after `docker compose stop db`, `GET /health` returned HTTP 503 `{"status":"error","db":"down"}`; app stayed up. Malformed JSON returned HTTP 400 `INVALID_JSON`. Neither response exposed a stack. See `docs/evidence/16-docker-validation.txt`. |
| 6. Logs exclude secrets and personal data | **ĐÃ LÀM** | PowerShell scan for `password`, `token`, and `0[0-9]{9}` returned `LOG_SCAN=empty` after the outage test and recovery. The pool emits only a generic error message, not the PostgreSQL error object. |
| 7. Pinned dependencies and vulnerability scan | **ĐÃ LÀM** | Direct dependencies are exact-version pinned; `npm audit` and `npm audit --omit=dev` report 0 vulnerabilities after the upgrades recorded in the BT3 report. |

No item is marked not applicable. Owner-based access control remains incomplete because the actor
identifier is supplied by the client. Never include a real `.env` value, session cookie, or full
password hash in a screenshot.

Exact log-scan command:

```powershell
docker compose logs app | Select-String -Pattern 'password|token|0[0-9]{9}'
```
