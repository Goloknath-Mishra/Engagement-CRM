# Functional Requirements Document (FRD)

## 1. Purpose

Engagement Manager CRM is a web-based engagement platform that supports Sales, Customer Service, and Marketing workflows. It provides record management (Accounts, Contacts, Campaigns, Leads, Opportunities, Cases, Products), an Incident War Room, Audit & Governance, attachments, and gamification features. It also includes Knowledge Articles, Templates, and Reports.

## 2. Scope

### In Scope

- Authentication (JWT)
- Sales:
  - Campaigns
  - Leads
  - Opportunities (kanban + list)
  - Accounts (company directory)
  - Contacts (employees)
- Customer Service:
  - Cases with SLA indicators and Business Process Flow UI
  - Incidents with War Room chat
- Product:
  - Catalog / products
- Governance:
  - Audit log and RBAC concepts
- Attachments:
  - Upload/list/delete attachments linked to multiple entities
- Gamification:
  - Individual and team challenges
  - Leaderboards
  - Reward badges and shareable badge cards
- Knowledge Articles:
  - Create/edit articles
  - Link/unlink articles to Cases, Leads, Campaigns
- Templates:
  - Email templates
  - Signature templates
  - Mail merge templates
  - Word templates
  - Template “use” inside Case edit (insert/copy)
- Reports:
  - Create report definitions with criteria/filters
  - Preview and export (CSV/Excel/Word/PDF)
  - Share report by email (link to export)

### Out of Scope (for current version)

- Real email sending infrastructure configuration UI
- Advanced workflow automation engine
- Full drag-and-drop org chart editing and tagging UX parity with Dynamics
- Multi-tenant isolation
- Enterprise SSO (SAML/OIDC IdP integration)

## 3. Personas

- Sales Rep: manages campaigns/leads/opportunities; attaches documents; views pipeline
- Sales Manager: views team performance; uses dashboards and reports
- Support Agent: manages cases; links knowledge; uses templates; tracks SLA
- Support Manager: manages escalations/incidents; audits changes
- Marketing Specialist: manages campaigns, lead flow, and reports
- Admin: manages users/groups, governance, seed data, audit logs

## 4. Functional Requirements

### 4.1 Authentication

- FR-AUTH-01: Users can log in and obtain JWT access/refresh tokens.
- FR-AUTH-02: Frontend stores JWT and uses it for API calls.

### 4.2 Accounts (Companies)

- FR-ACC-01: List/create/edit accounts.
- FR-ACC-02: View account detail page with:
  - Company hierarchy (parent → subsidiaries).
  - Org chart (manager → direct reports) for employees in that company.
  - Attachments and audit history.
- FR-ACC-03: “Employees” quick navigation from account list.

### 4.3 Contacts (Employees)

- FR-CON-01: List/create/edit contacts.
- FR-CON-02: Contacts link to an Account (company) and optionally a manager (another contact).
- FR-CON-03: Contacts show a relationship tag:
  - Decision maker / Influencer / Blocker / Unknown
- FR-CON-04: Contacts can be filtered by account (employees of a company).

### 4.4 Campaigns / Leads / Opportunities

- FR-CAM-01: Create and manage campaigns with status indicators.
- FR-LEAD-01: Create and manage leads with status, conversion to contact/opportunity.
- FR-OPP-01: Opportunity kanban with color-coded stage chips.
- FR-SALES-ATT-01: Attachments supported on all major entities.

### 4.5 Cases / SLA / Knowledge / Templates

- FR-CASE-01: Create and manage cases with SLA indicators and progress.
- FR-CASE-02: Link/unlink Knowledge Articles to a Case.
- FR-CASE-03: Insert/copy templates into case description.

### 4.6 Incidents & War Room

- FR-INC-01: Create/manage incidents with severity/status.
- FR-INC-02: Post messages in a War Room conversation.
- FR-INC-03: Attachments and audit history available on incident records.

### 4.7 Audit & Governance

- FR-AUD-01: System stores audit logs for create/update/delete actions.
- FR-AUD-02: Admin can browse audit logs with filters.
- FR-AUD-03: Entity pages show audit history panels.

### 4.8 Gamification

- FR-GAM-01: Challenges (individual/team) with point rules based on audit events.
- FR-GAM-02: Leaderboards for team and individual challenges.
- FR-GAM-03: Badge awards when points reach targets.
- FR-GAM-04: Share badges via copy and downloadable badge card.

### 4.9 Reports

- FR-REP-01: Create report definitions with:
  - entity type
  - columns
  - multiple criteria filters
- FR-REP-02: Preview report results.
- FR-REP-03: Export reports as CSV, Excel, Word, PDF.
- FR-REP-04: Share report via email (link).

## 5. Non-Functional Requirements (NFRs)

- NFR-01: Responsive UI (desktop-first, functional on tablet).
- NFR-02: API secured by JWT; no anonymous access to data APIs.
- NFR-03: Avoid storing secrets in repo; environment-based configuration.
- NFR-04: Maintainable codebase with clear module boundaries and documentation.

