# Contributing

## 1. Repo Structure

- `frontend/`: React + TypeScript web app
- `backend/`: Django REST API
- `docs/`: FRD/TRD/architecture/integration/manuals

## 2. Local Setup

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

## 3. Quality Gates

Run these before opening a PR:

### Frontend

```powershell
cd frontend
npm run lint
npm run build
```

### Backend

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
```

## 4. Coding Guidelines

- Prefer small, focused PRs.
- Match existing patterns (React Query for data fetching; DRF viewsets for APIs).
- Avoid committing build artifacts (`frontend/dist`) or local DB (`backend/db.sqlite3`).
- Prefer doc-level “where to modify” guidance over adding many inline comments.

## 5. Adding Features

- Backend:
  - Add model + migration
  - Add serializer + viewset + URL route
  - Add seed data (if useful for demo)
- Frontend:
  - Add types in `src/api/types.ts`
  - Add page in `src/pages/`
  - Wire route in `src/App.tsx`
  - Add nav item in `src/layout/AppShell.tsx`

