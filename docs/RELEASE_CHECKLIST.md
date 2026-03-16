# Release Checklist (GitHub-ready)

## 1. Sanity Checks

- Frontend: `npm run lint` and `npm run build` succeed.
- Backend: `manage.py check` succeeds.
- Migrations committed for any model changes.
- No secrets committed (no `.env`, keys, credentials).

## 2. Repository Hygiene

- Confirm `.gitignore` excludes:
  - `backend/.venv/`
  - `frontend/dist/`
  - `backend/db.sqlite3`
  - `__pycache__/` and `*.pyc`
  - `node_modules/`
- Remove temporary artifacts:
  - `__pycache__/`
  - local DB files
  - logs and dumps

## 3. Documentation

- `docs/FRD.md` up to date (functional scope).
- `docs/TRD.md` up to date (technical scope).
- `docs/INTEGRATION_DESIGN.md` matches implemented routes.
- `docs/USER_MANUAL.md` and `docs/ADMIN_MANUAL.md` reflect UI.
- `docs/DEPLOYMENT_GUIDE.md` includes the chosen cloud target.

## 4. Configuration

- Backend settings:
  - `DJANGO_DEBUG=false` for production
  - `DJANGO_ALLOWED_HOSTS` configured
  - CORS origins configured
  - SMTP configured if report share must send emails
- Database:
  - Use Postgres in production
  - Apply migrations during deploy

## 5. Build Artifacts

- Frontend build output must be generated in CI/deploy pipeline, not committed.
- Backend static/media storage must be configured per environment.

## 6. Post-Release

- Smoke test:
  - Login
  - Accounts → Account detail hierarchy
  - Contacts → tag + manager
  - Cases → templates + knowledge linking
  - Reports → preview + export

