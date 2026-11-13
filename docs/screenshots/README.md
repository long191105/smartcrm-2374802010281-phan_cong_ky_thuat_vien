# BT3 screenshots

The `ui-*.png` files are genuine application screenshots copied from earlier workflow evidence.
`health-endpoint.png` is a genuine browser capture from the Docker-backed run on 2026-11-13; it
shows `{"status":"ok","db":"up"}` at the host port configured in the existing `.env` (8000).

Docker validation results are recorded in `docs/evidence/16-docker-validation.txt`. A fresh clone of
the public `v1.0` tag passed startup, health, all 78 container tests, and repeated migration/seed
checks. The `docker compose ps` and test output were captured as command evidence but are not stored
as image screenshots in this folder.
Do not treat the health image or earlier UI images as terminal screenshots.

A fresh remote clone was tested after the tag was published; the tag page is publicly accessible.
The initial database outage test exposed an app-process failure; BUG-04 was fixed and the
outage/recovery was retested successfully. Terminal and per-test-case screenshots remain pending.

Do not synthesize terminal images. Redact secrets, cookies, connection strings, and personal data
before saving any additional screenshots.
