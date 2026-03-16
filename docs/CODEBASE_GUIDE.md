# Codebase Guide (Best Practices + “Where to Modify” Map)

This document replaces adding excessive inline comments across the entire repository, while still making the code easy to navigate and modify later.

## 1. Folder Structure

- `backend/`
  - `config/` Django settings + URL routing
  - `crm/` core CRM domain
  - `gamification/` challenges, leaderboards, badges
  - `contenthub/` knowledge articles, templates, reports
- `frontend/`
  - `src/layout/` application shell/navigation
  - `src/pages/` route pages
  - `src/components/` reusable UI blocks
  - `src/api/` axios client + TypeScript API types
- `docs/` documentation set for functional and technical deliverables

## 2. Key Entry Points

### Frontend

- Routing: [App.tsx](file:///c:/Engagement%20Manager/frontend/src/App.tsx)
- Navigation: [AppShell.tsx](file:///c:/Engagement%20Manager/frontend/src/layout/AppShell.tsx)
- API client: [apiClient.ts](file:///c:/Engagement%20Manager/frontend/src/api/apiClient.ts)
- Types: [types.ts](file:///c:/Engagement%20Manager/frontend/src/api/types.ts)

### Backend

- Django settings: [settings.py](file:///c:/Engagement%20Manager/backend/config/settings.py)
- Root URLs: [urls.py](file:///c:/Engagement%20Manager/backend/config/urls.py)
- CRM API: [crm/views.py](file:///c:/Engagement%20Manager/backend/crm/views.py)
- CRM models: [crm/models.py](file:///c:/Engagement%20Manager/backend/crm/models.py)
- ContentHub API: [contenthub/views.py](file:///c:/Engagement%20Manager/backend/contenthub/views.py)
- Gamification API: [gamification/views.py](file:///c:/Engagement%20Manager/backend/gamification/views.py)

## 3. Best Practices Used

- API pagination for list endpoints.
- `select_related` / `prefetch_related` on heavy endpoints to reduce N+1 queries.
- React Query caching and invalidation after mutations.
- Reusable panels:
  - attachments, audit timeline, knowledge linking, templates use.

## 4. Best Practice Checklist (Recommended Enhancements)

- Backend:
  - Add a `requirements.txt` and CI `manage.py check` step
  - Add environment-based DB config (Postgres in prod)
  - Add health check endpoint (`/healthz`)
  - Add structured logging
- Frontend:
  - Split large routes via dynamic import to reduce bundle size
  - Add component-level tests for critical flows

## 5. “Where to Modify Later” Map

- Accounts/Contacts hierarchy:
  - Models: [crm/models.py](file:///c:/Engagement%20Manager/backend/crm/models.py)
  - Account org UI: [AccountDetailPage.tsx](file:///c:/Engagement%20Manager/frontend/src/pages/AccountDetailPage.tsx)
  - Contacts list UI: [ContactsPage.tsx](file:///c:/Engagement%20Manager/frontend/src/pages/ContactsPage.tsx)
- Audit:
  - Audit panel: [AuditTimelinePanel.tsx](file:///c:/Engagement%20Manager/frontend/src/components/AuditTimelinePanel.tsx)
  - Audit filters: [crm/views.py](file:///c:/Engagement%20Manager/backend/crm/views.py)
- Knowledge:
  - Page: [KnowledgeArticlesPage.tsx](file:///c:/Engagement%20Manager/frontend/src/pages/KnowledgeArticlesPage.tsx)
  - Linking panel: [RelatedKnowledgePanel.tsx](file:///c:/Engagement%20Manager/frontend/src/components/RelatedKnowledgePanel.tsx)
  - API: [contenthub/views.py](file:///c:/Engagement%20Manager/backend/contenthub/views.py)
- Templates:
  - Page: [TemplatesPage.tsx](file:///c:/Engagement%20Manager/frontend/src/pages/TemplatesPage.tsx)
  - Use panel: [TemplatesUsePanel.tsx](file:///c:/Engagement%20Manager/frontend/src/components/TemplatesUsePanel.tsx)
- Reports:
  - Page: [ReportsPage.tsx](file:///c:/Engagement%20Manager/frontend/src/pages/ReportsPage.tsx)
  - API export/share: [contenthub/views.py](file:///c:/Engagement%20Manager/backend/contenthub/views.py)

## 6. GitHub Cleanup Rules

Ensure these are not committed:

- `backend/.venv/`
- `frontend/dist/`
- `__pycache__/`, `*.pyc`
- `backend/db.sqlite3`

See repo [gitignore](file:///c:/Engagement%20Manager/.gitignore).

