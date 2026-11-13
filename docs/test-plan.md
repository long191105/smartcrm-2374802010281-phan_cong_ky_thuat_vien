# Test Plan — BT3, Track SE

## 1. Scope and deliberate exclusions

Test the implemented L4 ticket intake, assignment, workload confirmation, appointment constraints,
session checks, input validation, sanitized errors, database startup, and repeatable migrations/seeds.
The L2-to-L4 integration is not tested because this prototype contains no L2 connector. Owner-based
authorization is not claimed or tested as passing: the API accepts actor IDs from the client rather
than binding them to the session, so S2 is not met. Load testing and penetration testing are outside
the assignment scope and were not performed.

## 2. Test types and counts

- Automated suite: **78 tests in 17 files** via `npm test`: 18 HTTP/API contract tests in
  `tests/app.test.js`; 60 unit, service, repository, validation, schema, configuration, and
  test-double database-runner tests in the other suites.
- Live PostgreSQL checks outside the 78-test suite: **3 scenarios** — repeat migration/seed with
  unchanged row counts, invalid ticket-filter rejection, and database outage/recovery.
- The 12 representative report cases cover the five rubric types: 1 happy path, 3 boundary,
  3 invalid-data, 4 security/error-disclosure, and 1 reproducibility case. BT3-06 is an actor-mismatch
  check only; it is not evidence that S2 owner authorization passes.
- The representative cases link to the implemented rules in `docs/srs.md` (FR1–FR6, FR10–FR12)
  and to the relevant security and initialization criteria. Positive flows for ticket CRUD,
  assignment, appointment creation/update/cancellation, technician lookup, session management, and
  status history are also exercised by the automated suite; the case summary remains capped at 12.

## 3. Measurable acceptance criteria

- `npm test` exits 0 and reports 78 tests, 78 passed, 0 failed, and 0 skipped.
- `npm run build` exits 0.
- The workload boundary pair is demonstrated on both sides: 14 open tickets permits assignment
  without confirmation; 15 requires explicit confirmation. These automated repository tests use
  test doubles and are identified as such in the report.
- The clean-clone PostgreSQL repeatability check leaves counts unchanged after another migrate/seed
  run: technicians 2, skills 7, tickets 18, assignments 17, status rows 18, appointments 0,
  auth users 1, and migrations 4.
- Compose reports `app` and `db` healthy; `/health` returns `{"status":"ok","db":"up"}`; PostgreSQL
  has no published host port. Outage returns sanitized HTTP 503 and recovery returns HTTP 200.
- Slide 26 of the Buổi 15 lecture labels invalid-input testing as **“Test dữ liệu sai PASS
  (400/422)”**. The report records the implemented HTTP 422 validation response and HTTP 400 malformed
  JSON response separately as outcomes for different error types.
- Every result and the known S2 authorization gap are reported without claiming compliance where
  evidence is absent.

## 4. Environment and test data

- Runtime: Node.js 20 in the app container, PostgreSQL 16 Alpine, Docker Engine 29.9.3, Compose 5.7.0.
- Automated tests use Node's test runner, an in-process HTTP server, fixtures, and test-double
  repositories/database runners. The live checks use a clean clone of tag `v1.0` and its disposable
  Compose database.
- Fixtures include technicians `KT002` and `KT999`, ticket `BH-900001/2025`, and demo seed data.
  The clean database starts with 2 technicians, 7 skill rows, 18 tickets, and 17 assignments.
- Unit/API tests create their own fixtures and do not require a manually prepared database. The live
  checks reuse the isolated Compose database for the repeatability assertions, then stop and remove
  the test stack and volume with `docker compose down -v`.
- Detailed live output: `docs/evidence/16-docker-validation.txt`.
