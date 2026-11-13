# Test Plan — BT3, Track SE

## 1. Scope and scenarios

Verify the L4 login/session flow, ticket and appointment CRUD, assignment decisions, technician
workload boundaries, status history, input validation, sanitized errors, migration/seed repeatability,
and container startup configuration. L2-to-L4 integration and production owner-based authorization
remain outside the implemented prototype.

## 2. Test data and methods

- Run the complete automated suite with the single command `npm test`.
- Use fixture technicians `KT002` and `KT999`, ticket `BH-900001/2025`, and the repeatable seed.
- Cover valid operations, invalid input, unauthorized requests, actor mismatch (403), not found (404),
  appointment overlap (409), workload values 14/15, malformed/oversized JSON (400/413), and repeat
  migration/seed behavior.
- The suite uses Node's test runner, HTTP test servers, fake repositories, and test-double database
  runners. The migration/seed repeatability tests are not a substitute for a fresh PostgreSQL run.

## 3. Environment and acceptance criteria

- Required runtime: Node.js 20 or newer. The latest local verification used Node.js 24.21.0 on Windows.
- `npm test` must exit 0 with every test passing; `npm run build` must exit 0.
- Invalid business data follows the current API contract and returns 422. The assignment checklist's
  requested 400 is recorded as a rubric discrepancy, not silently reported as compliant.
- The database health endpoint must return `{"status":"ok","db":"up"}` only when PostgreSQL answers.
- Docker Compose must show `db` and `app` healthy, with no database host port published.

## 4. Results and evidence

The current run passed `npm test` (78/78), `npm run build`, and the Docker-backed outage/recovery test.
The live health screenshot is `docs/screenshots/health-endpoint.png`; terminal screenshots for the
Compose status and test run, clean-clone proof, and per-case test screenshots are still missing and
must not be claimed. Detailed live results are in `docs/evidence/16-docker-validation.txt`.
`docs/api-reference-bt3.md` inventories the 21 Express routes and includes examples from a disposable
PostgreSQL Compose database. The original BT3 brief for items S2–S4 was not included, so those items
are not inferred.
