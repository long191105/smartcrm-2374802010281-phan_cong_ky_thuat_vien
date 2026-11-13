# Smart CRM L4 Deployment Guide

## 1. Requirements

- Windows 10/11, macOS, or a 64-bit Linux distribution.
- Docker Engine or Docker Desktop **24 or newer**.
- Docker Compose **v2** (`docker compose`, not the legacy `docker-compose` binary).
- Git 2.30 or newer.
- At least **2 GB free disk space** for the application/database images and sample volume.
- Host TCP port **3000** available. PostgreSQL port 5432 is internal to the Compose network and is not published.

Check the installed tools:

```shell
docker --version
docker compose version
git --version
```

## 2. Setup steps

Run each command from the directory in which you want the repository:

1. Clone the repository:

   ```shell
   git clone --branch v1.0 https://github.com/long191105/smartcrm-2374802010281-phan_cong_ky_thuat_vien.git
   ```

2. Enter the project directory:

   ```shell
   cd smartcrm-2374802010281-phan_cong_ky_thuat_vien
   ```

3. Create the local environment file:

   ```shell
   cp .env.example .env
   ```

4. Start and build both services:

   ```shell
   docker compose up -d --build
   ```

The application waits for PostgreSQL to become healthy. On a new volume, the database init scripts
apply the schema and sample data. The application then runs the checksum-based migrations, repeats
the idempotent seed, and creates or updates the demo login before listening. Re-running the startup
does not add duplicate sample rows. Do not commit `.env`.

## 3. Environment variables

Copy the safe sample values from `.env.example`. Replace the sample database and account passwords
before exposing the service beyond a local development machine.

| Variable | Meaning | Example | Required |
|---|---|---|---|
| `DATABASE_URL` | Optional PostgreSQL connection URI; when set, it takes precedence over `DB_*`. | Leave blank | No |
| `DB_HOST` | Database hostname; Compose service name inside Docker. | `db` | Yes, unless `DATABASE_URL` is set |
| `DB_PORT` | PostgreSQL port inside the container network. | `5432` | No |
| `DB_NAME` | Database created by PostgreSQL. | `smartcrm_l4_workshop` | Yes, unless `DATABASE_URL` is set |
| `DB_USER` | PostgreSQL login. | `postgres` | Yes, unless `DATABASE_URL` is set |
| `DB_PASSWORD` | PostgreSQL password; use a unique value for a real deployment. | `change_me_locally` | Yes, unless `DATABASE_URL` is set |
| `APP_PORT` | Host port mapped to the API's container port 3000. | `3000` | No |
| `PORT` | Optional platform-provided port override. | Leave blank | No |
| `AUTH_BOOTSTRAP_USERNAME` | Initial login name; normalized to lowercase. | `manager` | Yes |
| `AUTH_BOOTSTRAP_PASSWORD` | Initial login password; 12–128 characters. | `change_me_to_a_unique_12_char_password` | Yes |
| `AUTH_BOOTSTRAP_DISPLAY_NAME` | Name shown for the initial account. | `Demo Manager` | Yes |
| `AUTH_COOKIE_SECURE` | Set to `true` when the service is behind HTTPS. | `false` for local HTTP | No |
| `VITE_API_BASE_URL` | Frontend API base path for local Vite development. | `/api` | No |
| `VITE_API_PROXY_TARGET` | Backend URL used by the local Vite proxy. | `http://localhost:3000` | No |

Compose sets `DB_HOST=db` for the application; do not change it to `localhost` in the container.
The database has no host `ports` mapping.

## 4. Sample data

The flat files `db/init/001_create_tables.sql` and `db/init/002_seed_demo.sql` invoke the checked-in
migration and seed SQL. The normal application startup also runs those idempotent scripts, including
when an existing volume skips PostgreSQL's one-time init directory.

After initialization, expect 2 technicians, 7 technician-skill rows, 18 tickets (one unassigned and
17 assigned open tickets), 17 assignments, and 18 initial status-history rows. These counts can be
used to check that initialization succeeded and that a repeated app startup did not add duplicates.

Demo sign-in:

- Username: `manager`
- Password: the current `AUTH_BOOTSTRAP_PASSWORD` value in `.env` (the sample value is shown above).

## 5. Verify it works

Check that both services report healthy:

```shell
docker compose ps
```

Expected: `db` and `app` show `Up` and `(healthy)`.

Check API and database readiness:

```shell
curl.exe -sS http://localhost:3000/health
```

Expected JSON when using the sample default `APP_PORT=3000`:

```json
{"status":"ok","db":"up"}
```

Run all tests inside the application container:

```shell
docker compose exec app npm test
```

Expected: `78` tests pass, `0` fail, `0` skip, with exit code 0.
If `APP_PORT` differs from 3000, use that host port for the health request.

## Troubleshooting

- If the selected host port is already in use, set `APP_PORT=3001` in `.env`, then run `docker compose up -d --build`
  again and use `http://localhost:3001/health`.
- To inspect startup output, run `docker compose logs app db`.
- `docker compose down` stops services and keeps database data.
- `docker compose down -v` **deletes the database volume and all data in it**. Use it only when a full
  local reset is intended, then run `docker compose up -d --build` again.
