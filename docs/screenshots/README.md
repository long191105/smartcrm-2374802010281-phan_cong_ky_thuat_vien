# BT3 screenshots

The seven `ui-*.png` files are genuine application screenshots from earlier workflow runs.
`ui-contact-sheet-1.png` and `ui-contact-sheet-2.png` group those originals to reduce report pages;
they are layouts of the original captures, not new application states.

`health-port3000.png` is a genuine browser capture of `http://localhost:3000/health`, returning
`{"status":"ok","db":"up"}`. This capture is from the currently reachable local service, not a fresh
clean clone, and is not presented as clean-clone evidence.

The public `v1.0` tag was previously freshly cloned and tested with `.env.example`. That run's
recorded startup, health, 78 container tests, repeated migration/seed checks, injection-style filter
check, and PostgreSQL outage/recovery results are in
[`../evidence/16-docker-validation.txt`](../evidence/16-docker-validation.txt).

`docker-compose-ps-bt3.png` is a genuine terminal capture from the clean clone. It shows the app
and database containers healthy, the app published on port 3000, and no host-published database
port. The command itself is not visible in the crop.

`npm-test-bt3.png` is a genuine clean-clone terminal capture showing the `npm test` command and
78 passed, 0 failed.

**Still missing:** a screenshot of the full clean-clone setup command sequence and a port-3000
`/health` capture from that same clean clone. The test image's health output is scrolled out of view.
Per-test-case screenshots are not required. Do not treat text logs or UI images as terminal
screenshots. Redact secrets, cookies, connection strings, and personal data before saving evidence.
