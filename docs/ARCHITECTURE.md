# Architecture

## 1. Component Diagram

```mermaid
flowchart TB
  subgraph Browser
    UI[React SPA]
  end

  subgraph Backend
    API[DRF API]
    Auth[JWT Auth]
    CRM[crm app]
    GAM[gamification app]
    CH[contenthub app]
  end

  subgraph Data
    DB[(SQL Database)]
    Media[(Media Storage)]
  end

  UI -->|JWT| API
  API --> Auth
  API --> CRM
  API --> GAM
  API --> CH
  CRM --> DB
  GAM --> DB
  CH --> DB
  CRM --> Media
```

## 2. Module Responsibilities

### 2.1 Frontend

- `src/layout/AppShell.tsx`: navigation shell + top bar
- `src/pages/*`: business pages
- `src/components/*`: reusable UI
- `src/api/*`: API client and type definitions

### 2.2 Backend

- `crm`:
  - Core entities
  - Attachments (GenericForeignKey)
  - Audit log generation and query
  - Seed data endpoint
- `gamification`:
  - Challenges, rules, progress calculation via AuditLog
  - Badge awards
  - Leaderboards
- `contenthub`:
  - Knowledge articles
  - Templates
  - Reports (definitions + preview + export)

## 3. Data Flow Examples

### 3.1 Audit Logging Flow

```mermaid
sequenceDiagram
  participant UI as UI
  participant API as API
  participant DB as DB

  UI->>API: PATCH /api/cases/:id (JWT)
  API->>DB: Update Case
  API->>DB: Insert AuditLog(action=update, entity_type=case, entity_id=:id)
  API-->>UI: 200 OK (updated case)
```

### 3.2 Gamification Points Flow

```mermaid
sequenceDiagram
  participant UI as UI
  participant GAM as Gamification API
  participant DB as DB

  UI->>GAM: GET /api/gamification/challenges/:id/progress
  GAM->>DB: Query AuditLog within challenge window
  GAM->>GAM: Apply rules -> sum points
  GAM-->>UI: points, percent, badge_awarded
```

## 4. Deployment Architecture (Recommended)

- Frontend: static hosting (CDN + object storage) or containerized Nginx
- Backend: containerized API behind HTTPS ingress (ALB/Ingress/Cloud Load Balancer)
- Database: managed Postgres
- Media: object storage (S3/Azure Blob/GCS/OSS)

