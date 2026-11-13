# BT3 screenshots

The `ui-*.png` files are genuine application screenshots copied from earlier workflow evidence.
`health-endpoint.png` is a genuine browser capture from the Docker-backed run on 2026-11-13; it
shows `{"status":"ok","db":"up"}` at the host port configured in the existing `.env` (8000).

Docker validation results are recorded in `docs/evidence/16-docker-validation.txt`. The latest
container run passed 78/78 tests; a clean local clone of the merged `main` also passed startup,
health, container tests, and repeated migration/seed checks. The `docker compose ps` and test output
were captured as command evidence but are not stored as image screenshots in this folder.
Do not treat the health image or earlier UI images as terminal screenshots.

A fresh clone of the remote `v1.0` tag is still pending because the tag has not been created or
verified; the clean clone tested was from local merged `main` before push. The initial database
outage test exposed an app-process failure; BUG-04 was fixed and the outage/recovery was retested
successfully. The clean-clone and tag checks remain pending.

Do not synthesize terminal images. Redact secrets, cookies, connection strings, and personal data
before saving any additional screenshots.
