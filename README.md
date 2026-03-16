# Engagement Manager CRM

Full-stack CRM-style demo application inspired by Dynamics 365 patterns.

- Frontend: React + TypeScript + Vite + MUI + React Query
- Backend: Django + DRF + SimpleJWT + drf-spectacular

## Repository Layout

- `backend/` Django API (SQLite by default)
- `frontend/` React web app
- `docs/` Functional + technical documentation, integration design, manuals

## Local Development

### Backend

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

### Default Login

- Username: `admin`
- Password: `Admin@12345`

## API Docs

- Swagger UI: `http://localhost:8000/api/docs/`
- OpenAPI schema: `http://localhost:8000/api/schema/`

## Notes

- For production deployments, use Postgres and object storage for uploads. See [Deployment Guide](file:///c:/Engagement%20Manager/docs/DEPLOYMENT_GUIDE.md).

