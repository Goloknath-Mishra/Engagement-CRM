# Security Policy

## Reporting a Vulnerability

If you find a security issue, do not open a public GitHub issue. Share details privately with the repository owner/maintainer.

## Operational Security Guidelines

- Do not commit secrets:
  - `.env`, API keys, SMTP passwords, JWT signing keys
- Use environment variables for runtime configuration.
- Use HTTPS in production.
- Prefer managed Postgres and object storage in production.

