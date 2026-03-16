# Integration Design Document (IDD) — APIs

## 1. Overview

The backend exposes REST APIs under `/api/` and uses JWT for authentication. OpenAPI and Swagger UI are available:

- OpenAPI: `/api/schema/`
- Swagger UI: `/api/docs/`

## 2. Authentication

### Obtain Token

- `POST /api/auth/token/`
- Body:
  - `username`
  - `password`
- Returns: `{ access, refresh }`

### Refresh Token

- `POST /api/auth/token/refresh/`
- Body:
  - `refresh`
- Returns: `{ access }`

## 3. CRM APIs (selected)

All CRM APIs require Authorization header:

`Authorization: Bearer <access_token>`

### Accounts

- `GET /api/accounts/` (pagination, search, filter)
- `POST /api/accounts/`
- `GET /api/accounts/:id/`
- `PATCH /api/accounts/:id/`
- `DELETE /api/accounts/:id/`

### Contacts

- `GET /api/contacts/` (supports `account=<id>` filter for employees)
- `POST /api/contacts/`
- `GET /api/contacts/:id/`
- `PATCH /api/contacts/:id/`
- `DELETE /api/contacts/:id/`

### Attachments

- `GET /api/attachments/?entity_type=<type>&entity_id=<id>`
- `POST /api/attachments/` (multipart file upload)
- `DELETE /api/attachments/:id/`

### Audit Logs

- `GET /api/audit-logs/?entity_type=<type>&entity_id=<id>&ordering=-created_at`
  - Notes: UI panels show permission error if user lacks access.

## 4. Gamification APIs

- `GET /api/gamification/challenges/?module=sales|service|marketing`
- `POST /api/gamification/challenges/:id/join/`
- `GET /api/gamification/challenges/:id/progress/`
- `GET /api/gamification/challenges/:id/leaderboard/`
- `GET /api/gamification/my-badges/`
- `GET /api/gamification/badges/?module=sales|service|marketing`

## 5. Content Hub APIs

### Knowledge Articles

- `GET /api/contenthub/articles/?status=draft|published|archived`
- `POST /api/contenthub/articles/`
- `PATCH /api/contenthub/articles/:id/`

### Article Links (attach knowledge to records)

- `GET /api/contenthub/article-links/?entity_type=case|lead|campaign&entity_id=<id>`
- `POST /api/contenthub/article-links/`
  - Body: `{ article_id, entity_type, entity_id }`
- `DELETE /api/contenthub/article-links/:id/`

### Templates

- `GET /api/contenthub/templates/?type=email|signature|mailmerge|word`
- `POST /api/contenthub/templates/`
- `PATCH /api/contenthub/templates/:id/`

### Reports

- `GET /api/contenthub/reports/`
- `POST /api/contenthub/reports/`
- `PATCH /api/contenthub/reports/:id/`
- `GET /api/contenthub/reports/:id/preview/`
- `GET /api/contenthub/reports/:id/export/?format=csv|excel|word|pdf`
- `POST /api/contenthub/reports/:id/share/`

## 6. Integration Considerations

- CORS is enabled for local dev ports (see backend settings).
- Email sending for report sharing depends on SMTP settings in Django.
- For external integrations, prefer API Gateway + JWT validation and rate limits.

