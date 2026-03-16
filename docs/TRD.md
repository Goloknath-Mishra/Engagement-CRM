# Technical Requirements Document (TRD)

## 1. System Overview

The system is a two-tier application:

- Frontend SPA (React) served by Vite in development and static hosting in production.
- Backend REST API (Django REST Framework) secured with JWT.

## 2. Technology Stack

### Frontend

- React + TypeScript
- Vite
- Material UI
- TanStack React Query
- React Router

### Backend

- Django
- Django REST Framework
- SimpleJWT (JWT auth)
- django-filter
- drf-spectacular (OpenAPI)
- SQLite for local dev (recommended Postgres in production)

## 3. Architecture

### 3.1 High-Level Architecture

```mermaid
flowchart LR
  U[User Browser] -->|HTTPS| FE[Frontend (React SPA)]
  FE -->|JWT| API[Django REST API]
  API --> DB[(Database)]
  API --> FS[(Media storage)]
  API --> SMTP[(Email/SMTP)]
```

### 3.2 Backend Apps

- `accounts`: authentication helpers, admin user management endpoints
- `crm`: core CRM entities + audit log + attachments + seed data
- `gamification`: challenges, badges, leaderboards, awards
- `contenthub`: knowledge articles, templates, reports

## 4. Data Requirements

### 4.1 Core Entities

- Account (Company)
  - parent_account for subsidiaries
- Contact (Employee)
  - account FK
  - manager FK (org chart)
  - relationship_tag (decision maker / influencer / blocker / unknown)
- Campaign / Lead / Opportunity / Case / Product / Incident
- Attachment (generic foreign key)
- AuditLog (actor, action, entity_type, entity_id, changes)

### 4.2 Content Entities

- KnowledgeArticle
- ArticleLink (generic link to CRM entities)
- Template
- ReportDefinition

## 5. Security Requirements

- JWT access + refresh tokens
- Default permissions: authenticated required
- Audit logs are admin-only in the governance screen, but entity-level audit panels handle permission errors gracefully.
- No secrets in code or logs.

## 6. Performance Requirements

- Paginated APIs for list views.
- Frontend caching with React Query.
- Avoid N+1 in backend with `select_related`/`prefetch_related` as needed.

## 7. Operational Requirements

- Environment variables for:
  - Django secret key, debug flags, allowed hosts
  - CORS configuration
  - SMTP settings (for report sharing)
  - Database URL (production)
- Static assets built via `npm run build`.
- Database migrations required on deploy.

## 8. Logging & Monitoring

- Django logs to stdout (12-factor style).
- Health check endpoint can be added (recommended in production).

