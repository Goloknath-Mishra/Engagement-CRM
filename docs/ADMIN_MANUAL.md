# Admin Manual

## 1. Admin Capabilities

- User management (create/edit, group assignment)
- Seed sample data (users + CRM records + gamification)
- Audit & RBAC governance screen (audit log browsing)

## 2. Setup (Local)

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

## 3. Creating Admin Users

Use Django admin or Django shell to create/modify users.

## 4. Groups / RBAC

- Groups represent roles/teams.
- Users are assigned to groups in User Management.
- Governance page shows a role table and audit log tab.

## 5. Seed Data

- Navigate to Dashboard and click seed action to generate sample data.
- Seed creates:
  - Accounts, subsidiaries, org structure (contacts + manager tree)
  - Campaigns/leads/opportunities
  - Cases/incidents
  - Gamification badges/challenges

## 6. Audit Logs

- Audit logs are generated on create/update/delete for most entity operations.
- Per-record audit panels display filtered audit history.

## 7. Email Configuration (Report Share)

Report sharing uses Django `send_mail`. Configure SMTP for production:

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `EMAIL_USE_TLS`
- `DEFAULT_FROM_EMAIL`

## 8. Backups

- For production, use managed Postgres backups and object storage versioning for media.

